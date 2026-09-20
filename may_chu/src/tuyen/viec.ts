// API cong viec: giao viec, nop ket qua, duyet, huy, hanh dong con (checklist),
// nhom viec (chien dich / viec chung), mau dinh ky va cau hinh workflow he thong.
//
// Bang cong_viec DUNG CHUNG voi ho so nhan su (nhom 'cong_viec' trong tuyen/ho_so.ts).
// Dong nao co `nguon != 'ho_so'` chi duoc quan ly qua cac route o day; route ho so
// da chan khong sua/xoa duoc nhung dong do.
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { can_dang_nhap, can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import {
  bat_dau_viec, duyet_viec, hanh_dong_cua_viec, huy_viec, nop_ket_qua, doi_hanh_dong,
  tao_viec, viec_theo_id, type DongViec,
} from '../viec/cong_viec.ts';
import {
  nguon_khi_giao, pham_vi_doc, pham_vi_giao, khoa_pham_vi_doc, type NguoiXem,
} from '../viec/quyen.ts';
import { la_nguoi_duyet } from '../bao_mat/quyen_ho_so.ts';
import { CAC_SU_KIEN, type MaSuKien } from '../viec/workflow.ts';
import { moc_thoi_gian } from '../tien_ich/thoi_gian.ts';
import {
  chuoi, chuoi_bat_buoc, gio, khoang_ngay, luan_ly, ngay, ngay_bat_buoc, phan_trang,
  so_thuc, trong_tap, uuid, uuid_bat_buoc, LoiDauVao, LoiKhongQuyen, LoiKhongTim,
} from '../tien_ich/kiem_tra.ts';

const TT_VIEC = ['moi', 'dang_lam', 'cho_duyet', 'hoan_thanh', 'khong_hoan_thanh', 'huy'] as const;
const UU_TIEN = ['thap', 'thuong', 'cao', 'khan'] as const;
const LOAI_NHOM = ['chien_dich', 'viec_chung'] as const;
const QUY_TAC = ['hang_ngay', 'hang_tuan', 'hang_thang', 'khoang_ngay'] as const;
const NGUOI_NHAN_KIEU = ['co_dinh', 'truong_phong_lien_quan'] as const;
const TT_NHOM = ['dang_chuan_bi', 'dang_chay', 'ket_thuc'] as const;
const TOI_DA_HANH_DONG = 20;

/** Doi NoiDungToken (bao_mat/xac_thuc) sang NguoiXem cua module viec. */
function nd_hien_tai(req: FastifyRequest): NguoiXem {
  const nd = nguoi_dung_hien_tai(req);
  return { sub: nd.sub, vai_tro: nd.vai_tro, nv: nd.nv };
}

/**
 * True neu nguoi xem co quyen quan ly nhom + mau dinh ky (giao viec cho tap the).
 * Nhan vien thuong chi tu tao viec cho minh, khong duoc tao nhom hay mau.
 */
function duoc_quan_ly(nd: NguoiXem): boolean {
  return la_nguoi_duyet(nd.vai_tro);
}

/** Khoa pham vi cho truy van doc danh sach — kem tham so [nv, sub]. */
function khoa_doc(nd: NguoiXem): string {
  return khoa_pham_vi_doc(pham_vi_doc(nd));
}

/**
 * Kiem tra nguoi nhan co trong pham vi giao cua nguoi dang nhap khong.
 * Tra ve nguon cua viec sap tao.
 */
async function kiem_giao_duoc(
  nd: NguoiXem, nhan_vien_id: string,
): Promise<string> {
  if (pham_vi_giao(nd) === 'chi_minh') {
    if (nd.nv === null || nd.nv !== nhan_vien_id) {
      throw new LoiKhongQuyen('Bạn chỉ được tạo việc cho chính mình.');
    }
    return 'tu_tao';
  }
  // Admin / nhan su / truong phong: giao duoc cho bat ky ai. Nguon phan biet cung phong
  // hay khac phong (truong phong giao nguoi phong khac = viec lien phong ban).
  const dong = await truy_van_mot<{ cung_phong: boolean }>(
    `select (nv.phong_ban_id is not null
             and nv.phong_ban_id = (select nv2.phong_ban_id from nhan_vien nv2 where nv2.id = $2))
            as cung_phong
       from nhan_vien nv
      where nv.id = $1`,
    [nhan_vien_id, nd.nv],
  );
  // Khong tim thay nhan vien -> nguon theo quy tac chung (cung_phong false).
  const cung_phong = dong?.cung_phong === true;
  return nguon_khi_giao(nd.vai_tro, cung_phong);
}

/** Kiem tra nhom_id hop le va nguoi goi duoc phep dung nhom do. */
async function kiem_nhom_duoc(nhom_id: string | null, nd: NguoiXem): Promise<void> {
  if (nhom_id === null) return;
  const dong = await truy_van_mot<{ id: string }>(
    `select cn.id from cong_viec_nhom cn
      where cn.id = $3 and (${khoa_doc_nhom(nd)})`,
    [nd.nv, nd.sub, nhom_id],
  );
  if (dong === null) throw new LoiKhongTim('Không tìm thấy nhóm công việc thuộc phạm vi của bạn.');
}

/** Khoa pham vi doc cho bang cong_viec_nhom (cn). Tham so [nv, sub]. */
function khoa_doc_nhom(nd: NguoiXem): string {
  const pv = pham_vi_doc(nd);
  if (pv === 'tat_ca') return 'true';
  if (pv === 'cua_minh') {
    return `exists (select 1 from cong_viec v2
                      where v2.nhom_id = cn.id and (v2.nhan_vien_id = $1 or v2.giao_boi = $2))`;
  }
  return `(cn.tao_boi = $2 or exists (
            select 1 from cong_viec v2 join nhan_vien nv2 on nv2.id = v2.nhan_vien_id
             where v2.nhom_id = cn.id and nv2.phong_ban_id in (
               select pb.id from phong_ban pb where pb.truong_phong_id = $1
             )
          ))`;
}

/** Doc viec theo id kem pham vi — tra 404 neu ngoai pham vi (khong tiet lo su ton tai). */
async function viec_trong_pham_vi(id: string, nd: NguoiXem): Promise<DongViec> {
  const dong = await truy_van_mot<DongViec>(
    `select ${COT_VIEC_CONG_KHAI} ${TU_VIEC_CONG_KHAI}
      where v.id = $3 and (${khoa_doc(nd)})`,
    [nd.nv, nd.sub, id],
  );
  if (dong === null) throw new LoiKhongTim('Không tìm thấy công việc.');
  return dong;
}

// Cot / bang dung chung cho cac cau lenh doc viec. Giu o day de moi route doc giong nhau.
const COT_VIEC_CONG_KHAI = `
  v.id, v.nhan_vien_id, v.tieu_de, v.mo_ta, v.giao_boi,
  to_char(v.han, 'YYYY-MM-DD') as han,
  to_char(v.han_gio, 'HH24:MI') as han_gio,
  v.han_moc, v.bat_dau, v.uu_tien, v.nguon, v.trang_thai,
  v.ket_qua, v.phan_hoi, v.ly_do_huy, v.nop_luc, v.hoan_thanh_luc,
  v.nhom_id, v.mau_dinh_ky_id, v.tao_luc,
  nv.ho_ten, nv.ma_nv, pb.ten as ten_phong_ban,
  coalesce(nd2.ho_ten, nd.ten_dang_nhap) as ten_nguoi_giao, cn.ten as ten_nhom,
  (select count(*) from cong_viec_hanh_dong hd where hd.cong_viec_id = v.id)::int as so_hanh_dong,
  (select count(*) from cong_viec_hanh_dong hd where hd.cong_viec_id = v.id and hd.xong)::int
    as so_hanh_dong_xong`;

const TU_VIEC_CONG_KHAI = `
  from cong_viec v
  left join nhan_vien nv on nv.id = v.nhan_vien_id
  left join phong_ban pb on pb.id = nv.phong_ban_id
  left join nguoi_dung nd on nd.id = v.giao_boi
  left join nhan_vien nd2 on nd2.id = nd.nhan_vien_id
  left join cong_viec_nhom cn on cn.id = v.nhom_id`;

/** Thu tu sap xep mac dinh: qua han truoc, roi han gan, roi uu tien nguon, roi muc uu tien. */
const SAP_XEP_VIEC = `
  order by case when v.han_moc is not null and v.han_moc < now()
                 and v.trang_thai in ('moi','dang_lam') then 0 else 1 end,
           coalesce(v.han_moc, v.han::timestamptz) asc nulls last,
           case v.nguon when 'giam_doc' then 0 when 'he_thong' then 1 when 'truong_phong' then 2
                         when 'lien_phong' then 3 when 'tu_tao' then 4 else 5 end,
           case v.uu_tien when 'khan' then 0 when 'cao' then 1 when 'thuong' then 2 else 3 end,
           v.tao_luc desc`;

export async function tuyen_viec(app: FastifyInstance): Promise<void> {
  // ================================================================ DANH SACH
  app.get('/toi', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nd_hien_tai(req);
    const q = req.query as Record<string, unknown>;
    const trang_thai = trong_tap(q, 'trang_thai', TT_VIEC);
    const tim_kiem = chuoi(q, 'tim_kiem', { toi_da: 120 });
    const nhan_vien_id = uuid(q, 'nhan_vien_id');
    const phong_ban_id = uuid(q, 'phong_ban_id');
    const han_den = ngay(q, 'han_den');
    const nhom_id = uuid(q, 'nhom_id');
    const { gioi_han, bo_qua } = phan_trang(q, 50, 200);

    // Tai khoan khong noi voi ho so nhan vien nao thi khong co viec nao ca.
    if (nd.nv === null && pham_vi_doc(nd) === 'cua_minh') return { danh_sach: [], tong: 0 };

    const dk: string[] = [`(${khoa_doc(nd)})`];
    const ts: unknown[] = [nd.nv, nd.sub];
    const them = (sql: string, gia_tri: unknown): void => {
      ts.push(gia_tri);
      dk.push(sql.replaceAll('?', `$${ts.length}`));
    };
    if (trang_thai !== null) them('v.trang_thai = ?', trang_thai);
    if (nhan_vien_id !== null) them('v.nhan_vien_id = ?', nhan_vien_id);
    if (phong_ban_id !== null) them('nv.phong_ban_id = ?', phong_ban_id);
    if (nhom_id !== null) them('v.nhom_id = ?', nhom_id);
    if (han_den !== null) them('v.han <= ?::date', han_den);
    if (tim_kiem !== null) {
      ts.push(`%${tim_kiem}%`);
      dk.push(`(v.tieu_de ilike $${ts.length} or nv.ho_ten ilike $${ts.length})`);
    }

    const danh_sach = await truy_van<DongViec>(
      `select ${COT_VIEC_CONG_KHAI} ${TU_VIEC_CONG_KHAI}
        where ${dk.join(' and ')} ${SAP_XEP_VIEC}
        limit ${String(gioi_han)} offset ${String(bo_qua)}`,
      ts,
    );
    const dem = await truy_van_mot<{ tong: number }>(
      `select count(*)::int as tong from cong_viec v
        left join nhan_vien nv on nv.id = v.nhan_vien_id
        where ${dk.join(' and ')}`,
      ts,
    );
    return { danh_sach, tong: dem?.tong ?? 0 };
  });

  // ================================================================ GANTT
  app.get('/gantt', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nd_hien_tai(req);
    const { tu, den } = khoang_ngay(req.query as Record<string, unknown>, 400);
    const nhom_id = uuid(req.query as Record<string, unknown>, 'nhom_id');
    if (nd.nv === null && pham_vi_doc(nd) === 'cua_minh') return [];

    // Moc khoang xem theo mui gio may cham cong (khong phu thuoc mui gio may chu).
    const tu_moc = moc_thoi_gian(tu, '00:00').toISOString();
    const den_moc = moc_thoi_gian(den, '23:59').toISOString();

    const dk: string[] = [
      `(${khoa_doc(nd)})`,
      // Thanh gantt nam giua bat_dau va han; quet theo khoang xem.
      `coalesce(v.bat_dau, v.tao_luc) <= $4::timestamptz`,
      `coalesce(v.han_moc, v.han::timestamptz) >= $3::timestamptz`,
    ];
    const ts: unknown[] = [nd.nv, nd.sub, tu_moc, den_moc];
    if (nhom_id !== null) {
      ts.push(nhom_id);
      dk.push(`v.nhom_id = $${ts.length}`);
    }
    return truy_van<DongViec>(
      `select ${COT_VIEC_CONG_KHAI} ${TU_VIEC_CONG_KHAI}
        where ${dk.join(' and ')}
        order by nv.ho_ten, coalesce(v.bat_dau, v.tao_luc), v.tao_luc
        limit 1000`,
      ts,
    );
  });

  // ================================================================ CHI TIET
  app.get('/:id', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nd_hien_tai(req);
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    const viec = await viec_trong_pham_vi(id, nd);
    return { viec, hanh_dong: await hanh_dong_cua_viec(id) };
  });

  // ================================================================ TAO VIEC
  app.post('/', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nd_hien_tai(req);
    const b = req.body as Record<string, unknown>;
    const nhan_vien_id = uuid_bat_buoc(b, 'nhan_vien_id');
    const nguon = await kiem_giao_duoc(nd, nhan_vien_id);

    const hanh_dong: string[] = [];
    const th = b['hanh_dong'];
    if (th !== undefined && th !== null) {
      if (!Array.isArray(th)) throw new LoiDauVao('Trường hanh_dong phải là danh sách.');
      if (th.length > TOI_DA_HANH_DONG) {
        throw new LoiDauVao(`Tối đa ${TOI_DA_HANH_DONG} hành động cho một việc.`);
      }
      for (const x of th) {
        if (typeof x !== 'string' || x.trim() === '' || x.trim().length > 250) {
          throw new LoiDauVao('Mỗi hành động phải là chuỗi từ 1 đến 250 ký tự.');
        }
        hanh_dong.push(x.trim());
      }
    }

    const nhom_id = uuid(b, 'nhom_id');
    await kiem_nhom_duoc(nhom_id, nd);

    const dong = await tao_viec(
      {
        nhan_vien_id,
        tieu_de: chuoi_bat_buoc(b, 'tieu_de', { toi_da: 250, toi_thieu: 3 }),
        mo_ta: chuoi(b, 'mo_ta', { toi_da: 10000 }),
        han: ngay_bat_buoc(b, 'han'),
        han_gio: gio(b, 'han_gio') ?? '18:00',
        bat_dau: ngay(b, 'bat_dau'),
        uu_tien: trong_tap(b, 'uu_tien', UU_TIEN, { mac_dinh: 'thuong' }) ?? 'thuong',
        nhom_id,
        hanh_dong,
      },
      nguon,
      nd.sub,
    );
    if (dong === null) throw new LoiDauVao('Không thể tạo công việc.');
    return dong;
  });

  // ================================================================ BAT DAU LAM
  app.patch('/:id/trang-thai', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nd_hien_tai(req);
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    const trang_thai = trong_tap(req.body as Record<string, unknown>, 'trang_thai',
      ['dang_lam'], { bat_buoc: true });
    if (trang_thai === 'dang_lam') await bat_dau_viec(id, nd);
    return { ok: true };
  });

  // ================================================================ NOP KET QUA
  app.patch('/:id/nop', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nd_hien_tai(req);
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    const ket_qua = chuoi_bat_buoc(req.body as Record<string, unknown>, 'ket_qua',
      { toi_da: 10000, toi_thieu: 3 });
    await nop_ket_qua(id, ket_qua, nd);
    return { ok: true };
  });

  // ================================================================ DUYET / TU CHOI
  app.patch('/:id/duyet', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nd_hien_tai(req);
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    const b = req.body as Record<string, unknown>;
    const chap_nhan = luan_ly(b, 'chap_nhan', false) === true;
    const phan_hoi = chuoi(b, 'phan_hoi', { toi_da: 5000 });
    if (!chap_nhan && (phan_hoi === null || phan_hoi.trim() === '')) {
      throw new LoiDauVao('Từ chối kết quả phải kèm lý do để người nhận làm lại.');
    }
    await duyet_viec(id, chap_nhan, phan_hoi, nd);
    return { ok: true };
  });

  // ================================================================ HUY VIEC
  app.patch('/:id/huy', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nd_hien_tai(req);
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    const ly_do = chuoi_bat_buoc(req.body as Record<string, unknown>, 'ly_do',
      { toi_da: 500, toi_thieu: 3 });
    await huy_viec(id, ly_do, nd);
    return { ok: true };
  });

  // ================================================================ HANH DONG CON
  app.patch('/:id/hanh-dong/:hid', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nd_hien_tai(req);
    const p = req.params as Record<string, unknown>;
    const id = uuid_bat_buoc(p, 'id');
    const hid = uuid_bat_buoc(p, 'hid');
    const xong = luan_ly(req.body as Record<string, unknown>, 'xong', false) === true;
    await doi_hanh_dong(id, hid, xong, nd);
    return { ok: true };
  });

  // ================================================================ NHOM (chien dich / viec chung)
  app.get('/nhom', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nd_hien_tai(req);
    const loai = trong_tap(req.query as Record<string, unknown>, 'loai', LOAI_NHOM);
    const dk: string[] = [`(${khoa_doc_nhom(nd)})`];
    const ts: unknown[] = [nd.nv, nd.sub];
    if (loai !== null) {
      ts.push(loai);
      dk.push(`cn.loai = $${ts.length}`);
    }
    return truy_van(
      `select cn.id, cn.loai, cn.ten, cn.mo_ta,
              to_char(cn.ngay_bat_dau, 'YYYY-MM-DD') as ngay_bat_dau,
              to_char(cn.ngay_ket_thuc, 'YYYY-MM-DD') as ngay_ket_thuc,
              cn.tao_boi, cn.trang_thai, cn.tao_luc,
              coalesce(nd3.ho_ten, nd2.ten_dang_nhap) as ten_nguoi_tao,
              (select count(*) from cong_viec v where v.nhom_id = cn.id)::int as so_viec
         from cong_viec_nhom cn
         left join nguoi_dung nd2 on nd2.id = cn.tao_boi
         left join nhan_vien nd3 on nd3.id = nd2.nhan_vien_id
        where ${dk.join(' and ')}
        order by cn.tao_luc desc`,
      ts,
    );
  });

  app.post('/nhom', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nd_hien_tai(req);
    if (!duoc_quan_ly(nd)) {
      throw new LoiKhongQuyen('Chỉ trưởng phòng hoặc nhân sự mới được tạo nhóm công việc.');
    }
    const b = req.body as Record<string, unknown>;
    const ngay_bat_dau = ngay(b, 'ngay_bat_dau');
    const ngay_ket_thuc = ngay(b, 'ngay_ket_thuc');
    if (ngay_bat_dau !== null && ngay_ket_thuc !== null && ngay_ket_thuc < ngay_bat_dau) {
      throw new LoiDauVao('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.');
    }
    const dong = await truy_van_mot<{ id: string }>(
      `insert into cong_viec_nhom(loai, ten, mo_ta, ngay_bat_dau, ngay_ket_thuc, tao_boi,
                                  trang_thai)
       values ($1,$2,$3,$4,$5,$6,$7) returning id`,
      [trong_tap(b, 'loai', LOAI_NHOM, { mac_dinh: 'viec_chung' }),
        chuoi_bat_buoc(b, 'ten', { toi_da: 250, toi_thieu: 3 }),
        chuoi(b, 'mo_ta', { toi_da: 5000 }),
        ngay_bat_dau, ngay_ket_thuc, nd.sub,
        trong_tap(b, 'trang_thai', TT_NHOM, { mac_dinh: 'dang_chay' })],
    );
    return dong;
  });

  // ================================================================ MAU DINH KY
  app.get('/mau-dinh-ky', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nd_hien_tai(req);
    const pv = pham_vi_doc(nd);
    if (pv === 'cua_minh') {
      // Nhan vien thuong khong tao mau — tra danh sach rong thay vi loi.
      return [];
    }
    const dk = pv === 'tat_ca'
      ? 'true'
      : `(md.nguoi_giao = $2 or md.nhan_vien_id = $1 or md.nhan_vien_id in (
           select nv2.id from nhan_vien nv2
            where nv2.phong_ban_id in (
              select pb.id from phong_ban pb where pb.truong_phong_id = $1
            )
         ))`;
    return truy_van(
      `select md.id, md.ten, md.mo_ta, md.nguoi_giao, md.nhan_vien_id, md.nguon, md.quy_tac,
              md.cac_thu, md.ngay_trong_thang, md.so_ngay,
              to_char(md.gio_han, 'HH24:MI') as gio_han,
              to_char(md.bat_dau, 'YYYY-MM-DD') as bat_dau,
              to_char(md.ket_thuc, 'YYYY-MM-DD') as ket_thuc,
              md.uu_tien, md.dang_bat, md.tao_luc,
              nv.ho_ten, coalesce(nd3.ho_ten, nd2.ten_dang_nhap) as ten_nguoi_giao
         from cong_viec_mau_dinh_ky md
         join nhan_vien nv on nv.id = md.nhan_vien_id
         left join nguoi_dung nd2 on nd2.id = md.nguoi_giao
         left join nhan_vien nd3 on nd3.id = nd2.nhan_vien_id
        where ${dk}
        order by md.tao_luc desc`,
      [nd.nv, nd.sub],
    );
  });

  app.post('/mau-dinh-ky', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nd_hien_tai(req);
    if (!duoc_quan_ly(nd)) {
      throw new LoiKhongQuyen('Chỉ trưởng phòng hoặc nhân sự mới được tạo việc định kỳ.');
    }
    const b = req.body as Record<string, unknown>;
    const nhan_vien_id = uuid_bat_buoc(b, 'nhan_vien_id');
    const nguon = await kiem_giao_duoc(nd, nhan_vien_id);

    const quy_tac = trong_tap(b, 'quy_tac', QUY_TAC, { bat_buoc: true }) as string;
    const cac_thu = doc_mang_nguyen(b, 'cac_thu', 0, 6);
    const ngay_trong_thang = doc_mang_nguyen(b, 'ngay_trong_thang', 1, 31);
    const so_ngay_tho = so_thuc(b, 'so_ngay', { min: 1 });
    const so_ngay = so_ngay_tho === null ? null : Math.trunc(so_ngay_tho);
    if (quy_tac === 'hang_tuan' && cac_thu.length === 0) {
      throw new LoiDauVao('Lặp hằng tuần phải chọn ít nhất một thứ.');
    }
    if (quy_tac === 'hang_thang' && ngay_trong_thang.length === 0) {
      throw new LoiDauVao('Lặp hằng tháng phải chọn ít nhất một ngày.');
    }
    if (quy_tac === 'khoang_ngay' && so_ngay === null) {
      throw new LoiDauVao('Lặp theo khoảng ngày phải nhập số ngày.');
    }
    const bat_dau = ngay(b, 'bat_dau') ?? new Date().toISOString().slice(0, 10);
    const ket_thuc = ngay(b, 'ket_thuc');
    if (ket_thuc !== null && ket_thuc < bat_dau) {
      throw new LoiDauVao('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.');
    }

    const dong = await truy_van_mot<{ id: string }>(
      `insert into cong_viec_mau_dinh_ky
         (ten, mo_ta, nguoi_giao, nhan_vien_id, nguon, quy_tac, cac_thu, ngay_trong_thang,
          so_ngay, gio_han, bat_dau, ket_thuc, uu_tien, sinh_den)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, $11::date - 1)
       returning id`,
      [chuoi_bat_buoc(b, 'ten', { toi_da: 250, toi_thieu: 3 }),
        chuoi(b, 'mo_ta', { toi_da: 5000 }),
        nd.sub, nhan_vien_id, nguon, quy_tac, cac_thu, ngay_trong_thang, so_ngay,
        gio(b, 'gio_han') ?? '18:00', bat_dau, ket_thuc,
        trong_tap(b, 'uu_tien', UU_TIEN, { mac_dinh: 'thuong' })],
    );
    return dong;
  });

  app.patch('/mau-dinh-ky/:id', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nd_hien_tai(req);
    const id = uuid_bat_buoc(req.params as Record<string, unknown>, 'id');
    const b = req.body as Record<string, unknown>;
    const dang_bat = luan_ly(b, 'dang_bat');
    if (dang_bat === null) throw new LoiDauVao('Thiếu trường dang_bat.');
    const pv = pham_vi_doc(nd);
    const dk = pv === 'tat_ca' ? 'md.id = $1' : `md.id = $1 and (
      md.nguoi_giao = $2 or md.nhan_vien_id in (
        select nv2.id from nhan_vien nv2
         where nv2.phong_ban_id in (
           select pb.id from phong_ban pb where pb.truong_phong_id = $3
         )
      ))`;
    const kq = await thuc_thi(
      `update cong_viec_mau_dinh_ky md set dang_bat = $4 where ${dk}`,
      [id, nd.sub, nd.nv, dang_bat],
    );
    if (kq === 0) throw new LoiKhongTim('Không tìm thấy mẫu định kỳ thuộc phạm vi của bạn.');
    return { ok: true };
  });

  // ================================================================ WORKFLOW HE THONG
  app.get('/workflow', { preHandler: can_dang_nhap }, async () => {
    const dong = await truy_van<{
      ma: string; dang_bat: boolean; nguoi_nhan_kieu: string; nhan_vien_id: string | null;
      han_sau_gio: number; uu_tien: string; ghi_chu: string | null; ho_ten: string | null;
    }>(
      `select wf.ma, wf.dang_bat, wf.nguoi_nhan_kieu, wf.nhan_vien_id,
              wf.han_sau_gio::float8 as han_sau_gio, wf.uu_tien, wf.ghi_chu, nv.ho_ten
         from cong_viec_workflow wf
         left join nhan_vien nv on nv.id = wf.nhan_vien_id`,
    );
    const theo_ma = new Map(dong.map((d) => [d.ma, d]));
    return CAC_SU_KIEN.map((sk) => {
      const d = theo_ma.get(sk.ma);
      return {
        ma: sk.ma,
        ten: sk.ten,
        mo_ta: sk.mo_ta,
        kieu_duoc_chon: sk.nguoi_nhan_kieu as readonly string[],
        dang_bat: d?.dang_bat ?? false,
        nguoi_nhan_kieu: d?.nguoi_nhan_kieu ?? 'co_dinh',
        nhan_vien_id: d?.nhan_vien_id ?? null,
        ho_ten: d?.ho_ten ?? null,
        han_sau_gio: d?.han_sau_gio ?? 4,
        uu_tien: d?.uu_tien ?? 'cao',
        ghi_chu: d?.ghi_chu ?? null,
      };
    });
  });

  app.patch('/workflow/:ma', { preHandler: can_nhan_su }, async (req) => {
    const p = req.params as Record<string, unknown>;
    const ma = chuoi(p, 'ma', { bat_buoc: true, toi_da: 60 }) as string;
    const sk = CAC_SU_KIEN.find((x) => x.ma === ma);
    if (sk === undefined) throw new LoiKhongTim('Không tìm thấy sự kiện workflow.');
    const b = req.body as Record<string, unknown>;
    const nguoi_nhan_kieu = trong_tap(b, 'nguoi_nhan_kieu', NGUOI_NHAN_KIEU,
      { mac_dinh: 'co_dinh' }) ?? 'co_dinh';
    if (!(sk.nguoi_nhan_kieu as readonly string[]).includes(nguoi_nhan_kieu)) {
      throw new LoiDauVao(`Sự kiện này không hỗ trợ kiểu người nhận "${nguoi_nhan_kieu}".`);
    }
    const nhan_vien_id = uuid(b, 'nhan_vien_id');
    const dang_bat = luan_ly(b, 'dang_bat', false) === true;
    if (nguoi_nhan_kieu === 'co_dinh' && nhan_vien_id === null) {
      throw new LoiDauVao('Kiểu người nhận cố định phải chọn nhân viên phụ trách.');
    }
    await thuc_thi(
      `insert into cong_viec_workflow(ma, dang_bat, nguoi_nhan_kieu, nhan_vien_id,
                                      han_sau_gio, uu_tien, ghi_chu)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (ma) do update
         set dang_bat = excluded.dang_bat,
             nguoi_nhan_kieu = excluded.nguoi_nhan_kieu,
             nhan_vien_id = excluded.nhan_vien_id,
             han_sau_gio = excluded.han_sau_gio,
             uu_tien = excluded.uu_tien,
             ghi_chu = excluded.ghi_chu`,
      [ma, dang_bat, nguoi_nhan_kieu, nhan_vien_id,
        so_thuc(b, 'han_sau_gio', { min: 0 }) ?? 4,
        trong_tap(b, 'uu_tien', UU_TIEN, { mac_dinh: 'cao' }),
        chuoi(b, 'ghi_chu', { toi_da: 1000 })],
    );
    return { ok: true };
  });
}

/** Doc mang so nguyen nho (vd cac_thu, ngay_trong_thang) — loai phan tu khong hop le. */
function doc_mang_nguyen(
  b: Record<string, unknown>, khoa: string, min: number, max: number,
): number[] {
  const v = b[khoa];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new LoiDauVao(`Trường ${khoa} phải là danh sách số.`);
  const kq: number[] = [];
  for (const x of v) {
    const n = typeof x === 'number' ? x : Number(String(x));
    if (!Number.isInteger(n) || n < min || n > max) {
      throw new LoiDauVao(`Trường ${khoa} chỉ nhận số từ ${min} đến ${max}.`);
    }
    kq.push(n);
  }
  return [...new Set(kq)].sort((a, b2) => a - b2);
}
