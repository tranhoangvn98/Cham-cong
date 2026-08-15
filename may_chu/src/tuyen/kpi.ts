// API KPI: danh muc chi so, ky, tinh diem, ket qua tung nguoi.
//
// Diem KPI KHONG dong vao bang luong. Muon gan voi thu nhap thi phai qua quy che thuong
// rieng, do nguoi quyet dinh, di qua o "thuong" trong phieu luong — khong phai mot phep
// nhan tu dong o day (BLLD 2019 Dieu 127).
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import {
  can_dang_nhap, can_nhan_su, can_nguoi_duyet, nguoi_dung_hien_tai, xem_duoc_tat_ca,
} from '../bao_mat/xac_thuc.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { tinh_ky_kpi } from '../kpi/tinh_kpi.ts';
import { loi_khai_bao } from '../kpi/cham_diem.ts';
import {
  chuoi, chuoi_bat_buoc, luan_ly, than, trong_tap, uuid,
  LoiDauVao, LoiKhongTim, LoiXungDot,
} from '../tien_ich/kiem_tra.ts';

const NHOM = ['cham_cong', 'ky_luat', 'cong_viec', 'bao_cao', 'khac'] as const;
const NGUON = ['cham_cong', 'vi_pham', 'cong_viec', 'bao_cao', 'nhap_tay'] as const;
const CHIEU = ['cao_tot', 'thap_tot'] as const;
const CHI_SO = [
  'ty_le_du_cong', 'so_ngay_co_mat', 'so_ngay_vang', 'so_lan_di_muon',
  'tong_phut_muon', 'so_lan_ve_som', 'gio_ot', 'so_ngay_nghi_phep',
  'so_vi_pham', 'diem_tru_vi_pham',
  'so_cong_viec_hoan_thanh', 'so_cong_viec_dung_han', 'ty_le_dung_han',
  'so_bao_cao_da_nop',
] as const;

function so_thuc(nguon: Record<string, unknown>, khoa: string, mac_dinh: number | null = null): number | null {
  const v = nguon[khoa];
  if (v === undefined || v === null || v === '') return mac_dinh;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new LoiDauVao(`Trường ${khoa} phải là số.`);
  return n;
}

function lay_id(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}

export async function tuyen_kpi(app: FastifyInstance): Promise<void> {
  // ============================================================ danh muc chi so
  app.get('/danh-muc-kpi', { preHandler: can_nguoi_duyet }, async () =>
    truy_van(
      `select d.*, pb.ten as ten_phong_ban
         from danh_muc_kpi d
         left join phong_ban pb on pb.id = d.ap_dung_phong_ban
        order by d.nhom, d.ma`,
    ),
  );

  app.post('/danh-muc-kpi', { preHandler: can_nhan_su }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const truong = doc_chi_so(b);

    const dong = await truy_van_mot<{ id: string }>(
      `insert into danh_muc_kpi
         (ma, ten, mo_ta, nhom, nguon, chi_so, chieu, don_vi,
          muc_toi_thieu, muc_muc_tieu, diem_toi_da, trong_so, ap_dung_phong_ban, dang_bat)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning id`,
      [
        chuoi_bat_buoc(b, 'ma', { toi_da: 40 }).toUpperCase(),
        truong.ten, chuoi(b, 'mo_ta', { toi_da: 1000 }),
        trong_tap(b, 'nhom', NHOM, { mac_dinh: 'khac' }),
        truong.nguon, truong.chi_so, truong.chieu, chuoi(b, 'don_vi', { toi_da: 30 }),
        truong.muc_toi_thieu, truong.muc_muc_tieu, truong.diem_toi_da, truong.trong_so,
        uuid(b, 'ap_dung_phong_ban'), luan_ly(b, 'dang_bat', true),
      ],
    );
    await ghi_nhat_ky(nd.sub, 'tao_chi_so_kpi', 'danh_muc_kpi', dong!.id, b, req.ip);
    return res.code(201).send(dong);
  });

  app.patch('/danh-muc-kpi/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);

    const cu = await truy_van_mot<Record<string, unknown>>(
      'select * from danh_muc_kpi where id = $1', [id],
    );
    if (cu === null) throw new LoiKhongTim('Không tìm thấy chỉ số.');

    // Ghep gia tri moi len gia tri cu roi kiem lai TOAN BO: sua mot truong van co the lam
    // ca bo tro nen mau thuan (vd doi chieu ma quen doi hai moc).
    const gop = {
      ten: chuoi(b, 'ten', { toi_da: 200 }) ?? String(cu['ten']),
      chieu: trong_tap(b, 'chieu', CHIEU) ?? String(cu['chieu']),
      muc_toi_thieu: so_thuc(b, 'muc_toi_thieu', Number(cu['muc_toi_thieu']))!,
      muc_muc_tieu: so_thuc(b, 'muc_muc_tieu', Number(cu['muc_muc_tieu']))!,
      diem_toi_da: so_thuc(b, 'diem_toi_da', Number(cu['diem_toi_da']))!,
      trong_so: so_thuc(b, 'trong_so', Number(cu['trong_so']))!,
    };
    const loi = loi_khai_bao({ ma: String(cu['ma']), ...gop } as never);
    if (loi !== null) throw new LoiDauVao(loi);

    await thuc_thi(
      `update danh_muc_kpi set
         ten = $2, mo_ta = coalesce($3, mo_ta), chieu = $4,
         muc_toi_thieu = $5, muc_muc_tieu = $6, diem_toi_da = $7, trong_so = $8,
         don_vi = coalesce($9, don_vi), dang_bat = coalesce($10, dang_bat),
         cap_nhat_luc = now()
       where id = $1`,
      [
        id, gop.ten, chuoi(b, 'mo_ta', { toi_da: 1000 }), gop.chieu,
        gop.muc_toi_thieu, gop.muc_muc_tieu, gop.diem_toi_da, gop.trong_so,
        chuoi(b, 'don_vi', { toi_da: 30 }),
        Object.hasOwn(b, 'dang_bat') ? luan_ly(b, 'dang_bat', true) : null,
      ],
    );
    await ghi_nhat_ky(nd.sub, 'sua_chi_so_kpi', 'danh_muc_kpi', id, b, req.ip);
    return { ok: true };
  });

  // ============================================================ ky KPI
  app.get('/ky-kpi', { preHandler: can_nguoi_duyet }, async () =>
    truy_van(
      `select k.*,
              (select count(*) from tong_hop_kpi where ky_kpi_id = k.id)::int as so_nguoi,
              (select round(avg(tong_diem), 2) from tong_hop_kpi where ky_kpi_id = k.id) as diem_tb
         from ky_kpi k order by k.thang desc limit 60`,
    ),
  );

  app.get('/ky-kpi/:id', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const k = await truy_van_mot<Record<string, unknown>>(
      'select * from ky_kpi where id = $1', [id],
    );
    if (k === null) throw new LoiKhongTim('Không tìm thấy kỳ KPI.');
    const chi_phong_minh = !xem_duoc_tat_ca(nd);

    const ds = await truy_van(
      `select t.*, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban
         from tong_hop_kpi t
         join nhan_vien nv on nv.id = t.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where t.ky_kpi_id = $1
          and ($2::boolean is not true
               or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $3))
        order by t.tong_diem desc, nv.ma_nv`,
      [id, chi_phong_minh, nd.nv],
    );
    return { ...k, ds };
  });

  /** Chi tiet tung chi so cua MOT nguoi trong ky — de doi chieu voi du lieu goc. */
  app.get('/ky-kpi/:id/nhan-vien/:nhan_vien_id', { preHandler: can_nguoi_duyet }, async (req) => {
    const p = req.params as Record<string, string>;
    const nhan_vien_id = uuid({ id: p['nhan_vien_id'] }, 'id', { bat_buoc: true });
    return truy_van(
      `select kq.*, d.ma, d.ten, d.nhom, d.don_vi, d.chieu,
              d.muc_toi_thieu, d.muc_muc_tieu, d.diem_toi_da, d.trong_so
         from ket_qua_kpi kq join danh_muc_kpi d on d.id = kq.danh_muc_kpi_id
        where kq.ky_kpi_id = $1 and kq.nhan_vien_id = $2
        order by d.nhom, d.ma`,
      [lay_id(req), nhan_vien_id],
    );
  });

  app.post('/ky-kpi', { preHandler: can_nhan_su }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const thang = chuoi_bat_buoc(b, 'thang', { toi_da: 7 });
    if (!/^\d{4}-\d{2}$/.test(thang)) throw new LoiDauVao('Tháng phải có dạng YYYY-MM.');

    const co = await truy_van_mot<{ id: string }>('select id from ky_kpi where thang = $1', [thang]);
    if (co !== null) throw new LoiXungDot(`Đã có kỳ KPI tháng ${thang}.`);

    const dong = await truy_van_mot<{ id: string }>(
      'insert into ky_kpi(thang) values ($1) returning id', [thang],
    );
    await ghi_nhat_ky(nd.sub, 'tao_ky_kpi', 'ky_kpi', dong!.id, { thang }, req.ip);
    return res.code(201).send({ ...dong, thang, trang_thai: 'nhap' });
  });

  app.post('/ky-kpi/:id/tinh', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const k = await truy_van_mot<{ thang: string; trang_thai: string }>(
      'select thang, trang_thai from ky_kpi where id = $1', [id],
    );
    if (k === null) throw new LoiKhongTim('Không tìm thấy kỳ KPI.');
    if (k.trang_thai === 'da_chot') {
      throw new LoiXungDot('Kỳ đã chốt. Mở chốt trước khi tính lại.');
    }
    const so = await tinh_ky_kpi(id, k.thang);
    await ghi_nhat_ky(nd.sub, 'tinh_ky_kpi', 'ky_kpi', id, { so_nguoi: so }, req.ip);
    return { ok: true, so_nguoi: so };
  });

  app.post('/ky-kpi/:id/chot', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    // `?? {}`: chot ky thuong duoc goi KHONG kem than yeu cau.
    const b = than(req.body ?? {});
    const mo = luan_ly(b, 'mo', false) as boolean;

    await thuc_thi(
      mo
        ? `update ky_kpi set trang_thai = 'nhap', chot_luc = null, nguoi_chot = null where id = $1`
        : `update ky_kpi set trang_thai = 'da_chot', chot_luc = now(), nguoi_chot = $2 where id = $1`,
      mo ? [id] : [id, nd.sub],
    );
    await ghi_nhat_ky(nd.sub, mo ? 'mo_chot_ky_kpi' : 'chot_ky_kpi', 'ky_kpi', id, null, req.ip);
    return { ok: true };
  });

  /**
   * Sua tay diem mot chi so.
   *
   * Giu ca diem may tinh lan diem sua tay: sau nay con biet ai doi, doi bao nhieu, va vi
   * sao. Tinh lai ky se KHONG ghi de len diem da sua tay.
   */
  app.patch('/ket-qua-kpi/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const diem = so_thuc(b, 'diem_sua_tay');
    const ly_do = chuoi(b, 'ly_do_sua', { toi_da: 500 });

    if (diem !== null && ly_do === null) {
      throw new LoiDauVao('Sửa tay điểm KPI phải nêu lý do — người bị chấm có quyền biết vì sao.');
    }

    const kq = await truy_van_mot<{ ky_kpi_id: string; trang_thai: string }>(
      `select kq.ky_kpi_id, k.trang_thai from ket_qua_kpi kq
         join ky_kpi k on k.id = kq.ky_kpi_id where kq.id = $1`,
      [id],
    );
    if (kq === null) throw new LoiKhongTim('Không tìm thấy kết quả KPI.');
    if (kq.trang_thai === 'da_chot') throw new LoiXungDot('Kỳ đã chốt, không sửa được.');

    await thuc_thi(
      `update ket_qua_kpi set diem_sua_tay = $2, ly_do_sua = $3, sua_boi = $4, sua_luc = now(),
              diem = coalesce($2, diem)
        where id = $1`,
      [id, diem, ly_do, nd.sub],
    );

    const k = await truy_van_mot<{ thang: string }>(
      'select thang from ky_kpi where id = $1', [kq.ky_kpi_id],
    );
    await tinh_ky_kpi(kq.ky_kpi_id, k!.thang);
    await ghi_nhat_ky(nd.sub, 'sua_diem_kpi', 'ket_qua_kpi', id, b, req.ip);
    return { ok: true };
  });

  // ============================================================ phia nguoi lao dong
  /** KPI cua CHINH MINH, chi khi ky da chot — diem dang tinh co the con doi. */
  app.get('/toi/kpi', { preHandler: can_dang_nhap }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    if (nd.nv === null) return [];
    return truy_van(
      `select k.thang, t.tong_diem, t.xep_loai, t.tinh_luc
         from tong_hop_kpi t join ky_kpi k on k.id = t.ky_kpi_id
        where t.nhan_vien_id = $1 and k.trang_thai = 'da_chot'
        order by k.thang desc limit 24`,
      [nd.nv],
    );
  });
}

/** Doc va kiem tra mot bo chi so tu than yeu cau. Nem loi neu khai mau thuan. */
function doc_chi_so(b: Record<string, unknown>) {
  const nguon = trong_tap(b, 'nguon', NGUON, { bat_buoc: true })!;
  const chi_so = trong_tap(b, 'chi_so', CHI_SO);

  // Rang buoc nay cung co o CSDL; kiem o day de bao loi doc duoc thay vi loi Postgres.
  if (nguon === 'nhap_tay' && chi_so !== null) {
    throw new LoiDauVao('Chỉ số nhập tay không được khai nguồn dữ liệu tự động.');
  }
  if (nguon !== 'nhap_tay' && chi_so === null) {
    throw new LoiDauVao('Chỉ số tự động phải khai lấy số liệu từ đâu.');
  }

  const truong = {
    ten: chuoi_bat_buoc(b, 'ten', { toi_da: 200 }),
    nguon,
    chi_so,
    chieu: trong_tap(b, 'chieu', CHIEU, { mac_dinh: 'cao_tot' })!,
    muc_toi_thieu: so_thuc(b, 'muc_toi_thieu', 0)!,
    muc_muc_tieu: so_thuc(b, 'muc_muc_tieu', 100)!,
    diem_toi_da: so_thuc(b, 'diem_toi_da', 100)!,
    trong_so: so_thuc(b, 'trong_so', 1)!,
  };

  const loi = loi_khai_bao({ ma: '', ...truong } as never);
  if (loi !== null) throw new LoiDauVao(loi);
  return truong;
}
