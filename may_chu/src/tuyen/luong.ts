// API bang luong: tham so phap ly, ky luong, phieu luong, quy trinh gui duyet.
//
// Quy trinh: nhap -> cho_duyet -> da_duyet -> da_tra. Khoa sua tu buoc cho_duyet tro di,
// vi so lieu da gui len cho nguoi khac xem thi khong duoc phep tu doi duoi chan ho.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import {
  can_admin, can_dang_nhap, can_nhan_su, nguoi_dung_hien_tai,
} from '../bao_mat/xac_thuc.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { tinh_ky_luong } from '../luong/ky_luong.ts';
import {
  ban_chot_theo_id, chot_ky, danh_sach_ban_chot, type KetQuaChot,
} from '../luong/ban_chot.ts';
import { bang_luong_xuat } from '../luong/bang_xuat.ts';
import { doc_tep_ho_so } from '../tien_ich/luu_tep.ts';
import { ghi_nhan_am_tham } from '../sharepoint/dong_bo.ts';
import { khoang_thang } from '../tien_ich/thoi_gian.ts';
import { ghi_xlsx } from '../tien_ich/ghi_xlsx.ts';
import {
  chuoi, chuoi_bat_buoc, luan_ly, ngay_bat_buoc, so_nguyen, so_thuc, than, trong_tap, uuid,
  LoiDauVao, LoiKhongTim, LoiXungDot,
} from '../tien_ich/kiem_tra.ts';

/** Trang thai cho phep sua so lieu. Tu cho_duyet tro di la khoa. */
const SUA_DUOC = new Set(['nhap']);

function so_tien(nguon: Record<string, unknown>, khoa: string, mac_dinh = 0): number {
  const v = nguon[khoa];
  if (v === undefined || v === null || v === '') return mac_dinh;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new LoiDauVao(`Trường ${khoa} phải là số tiền.`);
  if (n < 0) throw new LoiDauVao(`Trường ${khoa} không được âm.`);
  // Tien Viet khong co don vi nho hon dong.
  return Math.round(n);
}

async function lay_ky(id: string): Promise<{ id: string; thang: string; trang_thai: string }> {
  const k = await truy_van_mot<{ id: string; thang: string; trang_thai: string }>(
    'select id, thang, trang_thai from ky_luong where id = $1', [id],
  );
  if (k === null) throw new LoiKhongTim('Không tìm thấy kỳ lương.');
  return k;
}

export async function tuyen_luong(app: FastifyInstance): Promise<void> {
  // ============================================================ tham so phap ly
  app.get('/tham-so-luong', { preHandler: can_nhan_su }, async () => {
    const ds = await truy_van<Record<string, unknown>>(
      'select * from tham_so_luong order by hieu_luc_tu desc',
    );
    const bac = await truy_van<Record<string, unknown>>(
      'select * from bac_thue_tncn order by tham_so_id, bac',
    );
    return ds.map((t) => ({
      ...t,
      bac_thue: bac.filter((b) => b['tham_so_id'] === t['id']),
    }));
  });

  // Chi admin: doi mot con so o day la doi tien luong cua ca cong ty.
  app.post('/tham-so-luong', { preHandler: can_admin }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const hieu_luc_tu = ngay_bat_buoc(b, 'hieu_luc_tu');

    const dong = await truy_van_mot<{ id: string }>(
      `insert into tham_so_luong (
         hieu_luc_tu, ten, luong_co_so, luong_toi_thieu_vung, vung,
         ty_le_bhxh_nld, ty_le_bhyt_nld, ty_le_bhtn_nld,
         ty_le_bhxh_nsdld, ty_le_bhyt_nsdld, ty_le_bhtn_nsdld,
         giam_tru_ban_than, giam_tru_phu_thuoc, can_cu, ghi_chu,
         cong_chuan_thang, lam_tron_den
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) returning id`,
      [
        hieu_luc_tu,
        chuoi_bat_buoc(b, 'ten', { toi_da: 200 }),
        so_tien(b, 'luong_co_so'),
        so_tien(b, 'luong_toi_thieu_vung'),
        so_nguyen(b, 'vung', { min: 1, max: 4 }) ?? 1,
        so_tien(b, 'ty_le_bhxh_nld', 8), so_tien(b, 'ty_le_bhyt_nld', 1.5),
        so_tien(b, 'ty_le_bhtn_nld', 1),
        so_tien(b, 'ty_le_bhxh_nsdld', 17.5), so_tien(b, 'ty_le_bhyt_nsdld', 3),
        so_tien(b, 'ty_le_bhtn_nsdld', 1),
        so_tien(b, 'giam_tru_ban_than'), so_tien(b, 'giam_tru_phu_thuoc'),
        chuoi(b, 'can_cu', { toi_da: 1000 }), chuoi(b, 'ghi_chu', { toi_da: 1000 }),
        // 0 = dem cong chuan theo lich that cua thang. Khai mot so > 0 la an dinh cong chuan
        // co dinh cho MOI NGUOI — tien loi, nhung thang it ngay va thang nhieu ngay se tra
        // nhu nhau, nen phai la lua chon co y thuc chu khong phai mac dinh.
        so_thuc(b, 'cong_chuan_thang', { min: 0, max: 31 }) ?? 0,
        so_thuc(b, 'lam_tron_den', { min: 0, max: 1_000_000 }) ?? 0,
      ],
    );

    // Sao chep bieu thue tu bo gan nhat truoc do — thue suat it doi hon giam tru gia canh,
    // bat nguoi dung go lai 7 bac moi lan la moi cho de sai.
    await thuc_thi(
      `insert into bac_thue_tncn (tham_so_id, bac, tu_muc, den_muc, thue_suat)
       select $1, bac, tu_muc, den_muc, thue_suat from bac_thue_tncn
        where tham_so_id = (
          select id from tham_so_luong where id <> $1 and hieu_luc_tu <= $2
          order by hieu_luc_tu desc limit 1
        )`,
      [dong!.id, hieu_luc_tu],
    );

    await ghi_nhat_ky(nd.sub, 'tao_tham_so_luong', 'tham_so_luong', dong!.id, b, req.ip);
    return res.code(201).send(dong);
  });

  // ============================================================ danh muc khoan
  //
  // Danh sach phu cap / khoan tru cua cong ty. La DU LIEU chu khong phai cot trong bang:
  // bang luong that doi danh sach nay gan nhu hang thang.

  app.get('/khoan-luong', { preHandler: can_nhan_su }, async (req) => {
    const b = than((req as { query?: unknown }).query ?? {});
    const ca = luan_ly(b, 'ca', false) === true;
    return truy_van(
      `select * from khoan_luong ${ca ? '' : 'where dang_dung = true'}
        order by loai desc, thu_tu, ten`,
    );
  });

  // Chi admin: them mot khoan la them mot cot vao bang luong cua ca cong ty.
  app.post('/khoan-luong', { preHandler: can_admin }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const ma = chuoi_bat_buoc(b, 'ma', { toi_da: 40 });
    if (!/^[a-z][a-z0-9_]*$/.test(ma)) {
      throw new LoiDauVao('Mã khoản chỉ gồm chữ thường, số và gạch dưới, bắt đầu bằng chữ.');
    }
    const cach_tinh = trong_tap(
      b, 'cach_tinh', ['nhap_tay', 'so_luong_x_don_gia', 'nua_ngay_luong'] as const,
    ) ?? 'nhap_tay';
    const don_gia = so_thuc(b, 'don_gia', { min: 0 });
    if (cach_tinh === 'so_luong_x_don_gia' && (don_gia === null || don_gia <= 0)) {
      throw new LoiDauVao('Khoản tính theo "số lượng × đơn giá" phải có đơn giá lớn hơn 0.');
    }

    const co = await truy_van_mot<{ ma: string }>(
      'select ma from khoan_luong where ma = $1', [ma],
    );
    if (co !== null) throw new LoiXungDot(`Đã có khoản mã "${ma}".`);

    await thuc_thi(
      `insert into khoan_luong (ma, ten, loai, cach_tinh, don_gia, chiu_thue,
                                thu_tu, canh_bao, ghi_chu)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        ma,
        chuoi_bat_buoc(b, 'ten', { toi_da: 200 }),
        trong_tap(b, 'loai', ['thu_nhap', 'tru'] as const, { bat_buoc: true }),
        cach_tinh,
        don_gia,
        luan_ly(b, 'chiu_thue', true),
        so_nguyen(b, 'thu_tu', { min: 0, max: 9999 }) ?? 100,
        chuoi(b, 'canh_bao', { toi_da: 1000 }),
        chuoi(b, 'ghi_chu', { toi_da: 1000 }),
      ],
    );
    await ghi_nhat_ky(nd.sub, 'tao_khoan_luong', 'khoan_luong', ma, b, req.ip);
    return res.code(201).send({ ma });
  });

  /**
   * Sua mot khoan trong danh muc.
   *
   * KHONG cho doi `loai` va `cach_tinh`: cac phieu da tinh dang mang so tien ra theo cach cu,
   * doi o day la lang le lam mot khoan cong thanh mot khoan tru trong lich su. Muon doi thi
   * tat khoan cu (`dang_dung = false`) va tao khoan moi.
   */
  app.patch('/khoan-luong/:ma', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const ma = String((req.params as Record<string, string>)['ma'] ?? '');
    const b = than(req.body);

    const cu = await truy_van_mot<{ ma: string }>(
      'select ma from khoan_luong where ma = $1', [ma],
    );
    if (cu === null) throw new LoiKhongTim('Không tìm thấy khoản lương.');

    await thuc_thi(
      `update khoan_luong set ten = coalesce($2, ten), don_gia = $3,
              chiu_thue = coalesce($4, chiu_thue), thu_tu = coalesce($5, thu_tu),
              dang_dung = coalesce($6, dang_dung), canh_bao = $7, ghi_chu = $8
        where ma = $1`,
      [
        ma,
        chuoi(b, 'ten', { toi_da: 200 }),
        so_thuc(b, 'don_gia', { min: 0 }),
        luan_ly(b, 'chiu_thue'),
        so_nguyen(b, 'thu_tu', { min: 0, max: 9999 }),
        luan_ly(b, 'dang_dung'),
        chuoi(b, 'canh_bao', { toi_da: 1000 }),
        chuoi(b, 'ghi_chu', { toi_da: 1000 }),
      ],
    );
    await ghi_nhat_ky(nd.sub, 'sua_khoan_luong', 'khoan_luong', ma, b, req.ip);
    return { ok: true };
  });

  // ============================================================ ky luong
  app.get('/ky-luong', { preHandler: can_nhan_su }, async () =>
    truy_van(
      `select k.*,
              (select count(*) from phieu_luong where ky_luong_id = k.id)::int as so_phieu,
              (select coalesce(sum(thuc_linh), 0) from phieu_luong where ky_luong_id = k.id) as tong_thuc_linh
         from ky_luong k order by k.thang desc limit 60`,
    ),
  );

  app.get('/ky-luong/:id', { preHandler: can_nhan_su }, async (req) => {
    const k = await lay_ky(lay_id(req));
    const phieu = await truy_van<Record<string, unknown>>(
      `select p.*, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban
         from phieu_luong p
         join nhan_vien nv on nv.id = p.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where p.ky_luong_id = $1
        order by pb.ten nulls last, nv.ma_nv`,
      [k.id],
    );

    // Gan cac khoan vao dung phieu cua no. Mot truy van cho ca ky, khong phai mot truy van
    // moi dong: 50 nguoi la 50 vong tuan tu, va so do chi tang.
    const khoan = await truy_van<Record<string, unknown>>(
      `select pk.*, d.ten, d.loai, d.cach_tinh, d.chiu_thue, d.canh_bao, d.thu_tu
         from phieu_luong_khoan pk
         join khoan_luong d on d.ma = pk.khoan_ma
         join phieu_luong p on p.id = pk.phieu_luong_id
        where p.ky_luong_id = $1
        order by d.loai desc, d.thu_tu, d.ten`,
      [k.id],
    );
    const theo_phieu = new Map<string, Record<string, unknown>[]>();
    for (const x of khoan) {
      const id = String(x['phieu_luong_id']);
      const ds = theo_phieu.get(id);
      if (ds === undefined) theo_phieu.set(id, [x]); else ds.push(x);
    }

    return {
      ...k,
      phieu: phieu.map((p) => ({ ...p, khoan: theo_phieu.get(String(p['id'])) ?? [] })),
    };
  });

  app.post('/ky-luong', { preHandler: can_nhan_su }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const thang = chuoi_bat_buoc(b, 'thang', { toi_da: 7 });
    if (!/^\d{4}-\d{2}$/.test(thang)) throw new LoiDauVao('Tháng phải có dạng YYYY-MM.');

    const co = await truy_van_mot<{ id: string }>(
      'select id from ky_luong where thang = $1', [thang],
    );
    if (co !== null) throw new LoiXungDot(`Đã có kỳ lương tháng ${thang}.`);

    const dong = await truy_van_mot<{ id: string }>(
      'insert into ky_luong(thang, ten, nguoi_tao) values ($1,$2,$3) returning id',
      [thang, chuoi(b, 'ten', { toi_da: 200 }), nd.sub],
    );
    await ghi_nhat_ky(nd.sub, 'tao_ky_luong', 'ky_luong', dong!.id, { thang }, req.ip);
    return res.code(201).send({ ...dong, thang, trang_thai: 'nhap' });
  });

  /** Tinh (hoac tinh lai) toan bo phieu luong cua ky tu du lieu cham cong. */
  app.post('/ky-luong/:id/tinh', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const k = await lay_ky(lay_id(req));
    if (!SUA_DUOC.has(k.trang_thai)) {
      throw new LoiXungDot(
        `Kỳ lương đang ở trạng thái "${k.trang_thai}" nên không tính lại được. `
        + 'Hãy thu hồi về nháp trước.',
      );
    }
    const so = await tinh_ky_luong(k.id, k.thang);
    await ghi_nhat_ky(nd.sub, 'tinh_ky_luong', 'ky_luong', k.id, { so_phieu: so }, req.ip);
    return { ok: true, so_phieu: so };
  });

  app.post('/ky-luong/:id/gui-duyet', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const k = await lay_ky(lay_id(req));
    if (k.trang_thai !== 'nhap') {
      throw new LoiXungDot(`Kỳ lương đang ở trạng thái "${k.trang_thai}", không gửi duyệt được.`);
    }
    const so = await truy_van_mot<{ so: number }>(
      'select count(*)::int as so from phieu_luong where ky_luong_id = $1', [k.id],
    );
    if ((so?.so ?? 0) === 0) {
      throw new LoiDauVao('Kỳ lương chưa có phiếu nào. Bấm "Tính lương" trước khi gửi duyệt.');
    }

    await thuc_thi(
      `update ky_luong set trang_thai = 'cho_duyet', gui_duyet_luc = now(),
              cap_nhat_luc = now() where id = $1`,
      [k.id],
    );
    await ghi_nhat_ky(nd.sub, 'gui_duyet_ky_luong', 'ky_luong', k.id, null, req.ip);
    return { ok: true };
  });

  /** Duyet hoac tra lai. Chi admin — day la buoc chot so tien tra cho nguoi that. */
  app.post('/ky-luong/:id/quyet', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const k = await lay_ky(lay_id(req));
    const b = than(req.body);
    const quyet = trong_tap(b, 'quyet_dinh', ['da_duyet', 'tra_lai'] as const, { bat_buoc: true });
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 500 });

    if (k.trang_thai !== 'cho_duyet') {
      throw new LoiXungDot(`Kỳ lương đang ở trạng thái "${k.trang_thai}", không quyết được.`);
    }

    let ban_chot: KetQuaChot[] = [];

    if (quyet === 'da_duyet') {
      await thuc_thi(
        `update ky_luong set trang_thai = 'da_duyet', nguoi_duyet = $2, duyet_luc = now(),
                ghi_chu_duyet = $3, cap_nhat_luc = now() where id = $1`,
        [k.id, nd.sub, ghi_chu],
      );

      // KHOA BANG CONG CUA THANG DO. Bang luong vua duyet duoc tinh TU bang cong, nen de
      // bang cong con sua duoc sau khi duyet la de ton tai mot bang luong da chot dua tren
      // nhung con so da doi. `mo-chot-thang` cung bi chan — xem tuyen/bang_cong.ts.
      const { tu, den } = khoang_thang(k.thang);
      await thuc_thi(
        'update bang_cong_ngay set da_chot = true where ngay >= $1 and ngay <= $2',
        [tu, den],
      );

      // Sinh ban chot: bang cham cong thang VA bang luong thang.
      //
      // Duyet la moc duy nhat sinh ra chung, va do la co y: yeu cau la "bang chot cuoi cung
      // SAU KHI DUOC DUYET thi luu SharePoint". Sinh som hon la day len mot ban chua ai chiu
      // trach nhiem.
      ban_chot = await chot_ky(k.thang, nd.sub);
      for (const bc of ban_chot) await ghi_nhan_am_tham(bc.id);
    } else {
      // Tra lai ve nhap de nhan su sua roi gui lai.
      await thuc_thi(
        `update ky_luong set trang_thai = 'nhap', gui_duyet_luc = null,
                ghi_chu_duyet = $2, cap_nhat_luc = now() where id = $1`,
        [k.id, ghi_chu],
      );
    }
    await ghi_nhat_ky(nd.sub, `ky_luong_${quyet}`, 'ky_luong', k.id,
      { ghi_chu, ban_chot: ban_chot.map((x) => ({ loai: x.loai, so_dong: x.so_dong })) },
      req.ip);
    return { ok: true, ban_chot };
  });

  app.post('/ky-luong/:id/da-tra', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const k = await lay_ky(lay_id(req));
    if (k.trang_thai !== 'da_duyet') {
      throw new LoiXungDot('Chỉ kỳ đã duyệt mới đánh dấu đã trả được.');
    }
    await thuc_thi(
      `update ky_luong set trang_thai = 'da_tra', tra_luc = now(), cap_nhat_luc = now()
        where id = $1`,
      [k.id],
    );
    await ghi_nhat_ky(nd.sub, 'ky_luong_da_tra', 'ky_luong', k.id, null, req.ip);
    return { ok: true };
  });

  /** Thu hoi ve nhap de sua. Chi tu cho_duyet — da duyet roi thi phai tra lai truoc. */
  app.post('/ky-luong/:id/thu-hoi', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const k = await lay_ky(lay_id(req));
    if (k.trang_thai !== 'cho_duyet') {
      throw new LoiXungDot(`Chỉ thu hồi được kỳ đang chờ duyệt (hiện: "${k.trang_thai}").`);
    }
    await thuc_thi(
      `update ky_luong set trang_thai = 'nhap', gui_duyet_luc = null, cap_nhat_luc = now()
        where id = $1`,
      [k.id],
    );
    await ghi_nhat_ky(nd.sub, 'thu_hoi_ky_luong', 'ky_luong', k.id, null, req.ip);
    return { ok: true };
  });

  // ============================================================ sua tay mot phieu
  //
  // Chi cho sua THUONG / PHU CAP KHAC / TRU KHAC / GHI CHU. Cac con so con lai deu suy ra
  // tu cham cong va tham so phap ly — cho sua tay la mo duong cho so lieu khong con doi
  // chieu duoc voi bat cu cai gi.
  app.patch('/phieu-luong/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);

    const p = await truy_van_mot<{ ky_luong_id: string; trang_thai: string }>(
      `select p.ky_luong_id, k.trang_thai from phieu_luong p
         join ky_luong k on k.id = p.ky_luong_id where p.id = $1`,
      [id],
    );
    if (p === null) throw new LoiKhongTim('Không tìm thấy phiếu lương.');
    if (!SUA_DUOC.has(p.trang_thai)) {
      throw new LoiXungDot(`Kỳ lương đang ở trạng thái "${p.trang_thai}" nên phiếu đã khóa sửa.`);
    }

    await thuc_thi(
      `update phieu_luong set
         thuong = $2, phu_cap_khac = $3, tru_khac = $4,
         ly_do_tru_khac = $5, ghi_chu = $6, sua_boi = $7, sua_luc = now()
       where id = $1`,
      [
        id, so_tien(b, 'thuong'), so_tien(b, 'phu_cap_khac'), so_tien(b, 'tru_khac'),
        chuoi(b, 'ly_do_tru_khac', { toi_da: 500 }),
        chuoi(b, 'ghi_chu', { toi_da: 500 }), nd.sub,
      ],
    );

    // Tinh lai ca ky de tong khop voi tung dong.
    const k = await lay_ky(p.ky_luong_id);
    await tinh_ky_luong(k.id, k.thang);
    await ghi_nhat_ky(nd.sub, 'sua_phieu_luong', 'phieu_luong', id, b, req.ip);
    return { ok: true };
  });

  // ============================================================ cac khoan cua mot phieu
  //
  // Thay CA danh sach cung mot luc chu khong sua tung dong: ke toan nhin bang luong theo
  // dong nguoi, khong theo tung o. Gui len {khoan: [...]} la trang thai MONG MUON cua dong
  // do — khoan khong co trong danh sach thi bi xoa khoi phieu.
  app.put('/phieu-luong/:id/khoan', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);

    const p = await truy_van_mot<{ ky_luong_id: string; trang_thai: string }>(
      `select p.ky_luong_id, k.trang_thai from phieu_luong p
         join ky_luong k on k.id = p.ky_luong_id where p.id = $1`,
      [id],
    );
    if (p === null) throw new LoiKhongTim('Không tìm thấy phiếu lương.');
    if (!SUA_DUOC.has(p.trang_thai)) {
      throw new LoiXungDot(`Kỳ lương đang ở trạng thái "${p.trang_thai}" nên phiếu đã khóa sửa.`);
    }

    const gui = b['khoan'];
    if (!Array.isArray(gui)) throw new LoiDauVao('Thiếu danh sách "khoan".');
    if (gui.length > 100) throw new LoiDauVao('Một phiếu lương không nhận quá 100 khoản.');

    const danh_muc = await truy_van<{ ma: string; cach_tinh: string; dang_dung: boolean }>(
      'select ma, cach_tinh, dang_dung from khoan_luong',
    );
    const theo_ma = new Map(danh_muc.map((d) => [d.ma, d]));

    const dong: { ma: string; so_luong: number | null; so_tien: number; ghi_chu: string | null }[] = [];
    for (const raw of gui) {
      const k = than(raw);
      const ma = chuoi_bat_buoc(k, 'ma', { toi_da: 40 });
      const dm = theo_ma.get(ma);
      if (dm === undefined) throw new LoiDauVao(`Không có khoản mã "${ma}" trong danh mục.`);
      if (dong.some((x) => x.ma === ma)) {
        throw new LoiDauVao(`Khoản "${ma}" xuất hiện hai lần trong cùng một phiếu.`);
      }
      if (!dm.dang_dung) {
        // Khoan da tat thi khong THEM moi duoc — nhung dong da co san van sua/giu duoc:
        // tat mot khoan la de khong dung tiep, khong phai de khoa cac phieu dang do.
        const dang_co = await truy_van_mot<{ khoan_ma: string }>(
          'select khoan_ma from phieu_luong_khoan where phieu_luong_id = $1 and khoan_ma = $2',
          [id, ma],
        );
        if (dang_co === null) {
          throw new LoiDauVao(`Khoản "${ma}" đã ngừng dùng nên không thêm mới được.`);
        }
      }
      dong.push({
        ma,
        so_luong: dm.cach_tinh === 'nhap_tay' ? null : so_thuc(k, 'so_luong', { min: 0, max: 999 }),
        // Chi khoan `nhap_tay` moi lay so tien tu nguoi dung; hai cach con lai deu do bo tinh
        // ra so, nen nhan so tien tu client la mo duong cho mot con so khong ai giai thich duoc.
        so_tien: dm.cach_tinh === 'nhap_tay' ? so_tien(k, 'so_tien') : 0,
        ghi_chu: chuoi(k, 'ghi_chu', { toi_da: 500 }),
      });
    }

    await thuc_thi(
      'delete from phieu_luong_khoan where phieu_luong_id = $1 and khoan_ma <> all($2::text[])',
      [id, dong.map((d) => d.ma)],
    );
    for (const d of dong) {
      // `thanh_tien` o day chi la gia tri tam — `tinh_ky_luong` ngay duoi se tinh lai het
      // theo dung `cach_tinh` cua danh muc.
      await thuc_thi(
        `insert into phieu_luong_khoan (phieu_luong_id, khoan_ma, so_luong, thanh_tien, ghi_chu)
         values ($1,$2,$3,$4,$5)
         on conflict (phieu_luong_id, khoan_ma) do update set
           so_luong = excluded.so_luong, thanh_tien = excluded.thanh_tien,
           ghi_chu = excluded.ghi_chu`,
        [id, d.ma, d.so_luong, d.so_tien, d.ghi_chu],
      );
    }

    await thuc_thi('update phieu_luong set sua_boi = $2, sua_luc = now() where id = $1',
      [id, nd.sub]);

    // Tinh lai ca ky de tong khop voi tung dong.
    const k = await lay_ky(p.ky_luong_id);
    await tinh_ky_luong(k.id, k.thang);
    await ghi_nhat_ky(nd.sub, 'sua_khoan_phieu_luong', 'phieu_luong', id,
      { so_khoan: dong.length }, req.ip);

    return {
      ok: true,
      khoan: await truy_van(
        `select pk.*, d.ten, d.loai, d.cach_tinh, d.chiu_thue, d.canh_bao
           from phieu_luong_khoan pk join khoan_luong d on d.ma = pk.khoan_ma
          where pk.phieu_luong_id = $1 order by d.loai desc, d.thu_tu, d.ten`,
        [id],
      ),
    };
  });

  // ============================================================ phieu luong cua toi
  //
  // Nhan vien chi thay phieu cua CHINH MINH, va chi khi ky da duoc duyet: so lieu dang
  // nhap co the con sai, bay ra roi sua lai la nguon khieu nai.
  app.get('/toi/phieu-luong', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    if (nd.nv === null) return [];
    const phieu = await truy_van<Record<string, unknown>>(
      `select p.*, k.thang, k.trang_thai as trang_thai_ky
         from phieu_luong p
         join ky_luong k on k.id = p.ky_luong_id
        where p.nhan_vien_id = $1 and k.trang_thai in ('da_duyet','da_tra')
        order by k.thang desc limit 24`,
      [nd.nv],
    );
    if (phieu.length === 0) return [];

    // Nguoi lao dong phai doc duoc TUNG khoan cua minh, khong phai mot con so "phu cap" gop.
    // Mot bang luong khong giai thich duoc la mot don khieu nai.
    const khoan = await truy_van<Record<string, unknown>>(
      `select pk.phieu_luong_id, pk.khoan_ma, pk.so_luong, pk.don_gia, pk.thanh_tien,
              pk.ghi_chu, d.ten, d.loai, d.chiu_thue
         from phieu_luong_khoan pk
         join khoan_luong d on d.ma = pk.khoan_ma
        where pk.phieu_luong_id = any($1::uuid[])
        order by d.loai desc, d.thu_tu, d.ten`,
      [phieu.map((p) => String(p['id']))],
    );
    return phieu.map((p) => ({
      ...p,
      khoan: khoan.filter((x) => String(x['phieu_luong_id']) === String(p['id'])),
    }));
  });

  // ============================================================ xuat bang
  //
  // Ca hai dinh dang deu dung `bang_luong_xuat` — cung mot bang voi ban chot duoc duyet.

  app.get('/ky-luong/:id/xuat-csv', { preHandler: can_nhan_su }, async (req, res) => {
    const k = await lay_ky(lay_id(req));
    const b = await bang_luong_xuat({ ky_luong_id: k.id });

    // BOM UTF-8: khong co no thi Excel tren Windows doc tieng Viet thanh ky tu la.
    const csv = '﻿' + [b.tieu_de, ...b.hang]
      .map((r) => r.map(o_csv).join(',')).join('\r\n');

    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'xuat_bang_luong', 'ky_luong',
      k.id, { thang: k.thang, dinh_dang: 'csv', so_dong: b.so_dong }, req.ip);

    return res
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="bang_luong_${k.thang}.csv"`)
      .send(csv);
  });

  app.get('/ky-luong/:id/xuat-xlsx', { preHandler: can_nhan_su }, async (req, res) => {
    const k = await lay_ky(lay_id(req));
    const b = await bang_luong_xuat({ ky_luong_id: k.id });

    const tep = ghi_xlsx({
      ten_sheet: `Bảng lương ${k.thang}`,
      tieu_de: b.tieu_de,
      hang: b.hang,
    });

    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'xuat_bang_luong', 'ky_luong',
      k.id, { thang: k.thang, dinh_dang: 'xlsx', so_dong: b.so_dong }, req.ip);

    return res
      .header('content-type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('content-disposition', `attachment; filename="bang_luong_${k.thang}.xlsx"`)
      .send(tep);
  });

  // ------------------------------------------------------------ ban chot

  /**
   * Danh sach ban chot da duyet. Nhan su xem duoc.
   *
   * Day la thu tra loi cau "bang thang 8 chot luc nao, ai chot" ma khong phai doc log.
   */
  app.get('/ban-chot', { preHandler: can_nhan_su }, async () => ({
    danh_sach: await danh_sach_ban_chot(),
  }));

  /**
   * Tai mot ban chot ve.
   *
   * LUON tra ve dang tai xuong, khong bao gio mo trong tab — cung ly do nhu tep ho so:
   * webapp va tep dung chung mot goc, nen mot tep mo inline chay duoc script trong ngu canh
   * cua chinh webapp.
   */
  app.get('/ban-chot/:id/tai', { preHandler: can_nhan_su },
    async (req: FastifyRequest, res: FastifyReply) => {
      const b = await ban_chot_theo_id(lay_id(req));
      if (b === null) throw new LoiKhongTim('Không tìm thấy bản chốt.');
      const du_lieu = await doc_tep_ho_so(b.ten_luu);
      if (du_lieu === null) {
        throw new LoiKhongTim('Bản chốt có dòng trong cơ sở dữ liệu nhưng tệp không còn trên đĩa.');
      }
      await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'tai_ban_chot', 'ban_chot',
        lay_id(req), {}, req.ip);
      return res
        .header('content-type', b.kieu_mime)
        .header('content-disposition',
          `attachment; filename="${b.ten_goc.replace(/[^\w.-]/g, '_')}"`)
        .send(du_lieu);
    });
}

function o_csv(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  const an_toan = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(an_toan) ? `"${an_toan.replace(/"/g, '""')}"` : an_toan;
}

function lay_id(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;


}
