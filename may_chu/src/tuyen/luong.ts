// API bang luong: tham so phap ly, ky luong, phieu luong, quy trinh gui duyet.
//
// Quy trinh: nhap -> cho_duyet -> da_duyet -> da_tra. Khoa sua tu buoc cho_duyet tro di,
// vi so lieu da gui len cho nguoi khac xem thi khong duoc phep tu doi duoi chan ho.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi, trong_giao_dich } from '../csdl/ket_noi.ts';
import {
  can_admin, can_dang_nhap, can_nhan_su, nguoi_dung_hien_tai, xem_duoc_tat_ca,
} from '../bao_mat/xac_thuc.ts';
import { gui_ngam, tai_khoan_cua_nhan_vien } from '../su_kien/thong_bao_day.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { tinh_ky_luong } from '../luong/ky_luong.ts';
import { tinh_ky_luong_cny } from '../luong/ky_luong_cny.ts';
import {
  ban_chot_theo_id, chot_ky, danh_sach_ban_chot, type KetQuaChot,
} from '../luong/ban_chot.ts';
import { lech_luong_ky } from '../luong/kiem_lech_luong.ts';
import { KHOAN_GIAM_THUONG } from '../ky_luat/xu_ly.ts';
import {
  chi_tiet_ky_luat_theo_phieu, chi_tiet_di_muon_theo_phieu, type DongLietKe,
} from '../luong/chi_tiet_ky_luat.ts';
import { bang_luong_xuat } from '../luong/bang_xuat.ts';
import { xuat_bang_luong_erp } from '../luong/xuat_mau_erp.ts';
import { gui_phieu_luong_ky } from '../luong/phieu_luong_email.ts';
import { email_hr_tra_loi, email_hr_xu_ly } from '../luong/khieu_nai_email.ts';
import { doc_tep_ho_so } from '../tien_ich/luu_tep.ts';
import { ghi_nhan_am_tham } from '../sharepoint/dong_bo.ts';
import { khoang_thang } from '../tien_ich/thoi_gian.ts';
import { ghi_xlsx } from '../tien_ich/ghi_xlsx.ts';
import {
  chuoi, chuoi_bat_buoc, gio, luan_ly, ngay_bat_buoc, so_nguyen, so_thuc, than, trong_tap,
  uuid, uuid_bat_buoc,
  LoiDauVao, LoiKhongTim, LoiXungDot, LoiKhongQuyen,
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

/**
 * Mo mot dong chinh sach phu cap cho mot nguoi, dong dong cu lai neu co.
 *
 * Dung chung cho ca hai tuyen: gan mot nguoi va gan hang loat. Tach ra vi quy tac "dong dong
 * cu truoc" la phan de sai nhat, va co hai ban sao cua no la co hai co hoi sai khac nhau.
 */
async function mo_chinh_sach(
  nguoi: string, nhan_vien_id: string, hieu_luc_tu: string, b: Record<string, unknown>,
): Promise<{ id: string }> {
  const khoan_ma = chuoi_bat_buoc(b, 'khoan_ma', { toi_da: 40 });

  const dm = await truy_van_mot<{ cach_tinh: string; dang_dung: boolean; ten: string }>(
    'select cach_tinh, dang_dung, ten from khoan_luong where ma = $1', [khoan_ma],
  );
  if (dm === null) throw new LoiDauVao(`Không có khoản mã "${khoan_ma}" trong danh mục.`);
  if (!dm.dang_dung) {
    throw new LoiDauVao(`Khoản "${dm.ten}" đã ngừng dùng nên không mở chính sách mới được.`);
  }

  const nv = await truy_van_mot<{ ho_ten: string }>(
    'select ho_ten from nhan_vien where id = $1', [nhan_vien_id],
  );
  if (nv === null) throw new LoiKhongTim('Không tìm thấy nhân viên.');

  const nguon = trong_tap(b, 'nguon_so_luong', ['co_dinh', 'theo_cong'] as const) ?? 'co_dinh';
  const so_luong = so_thuc(b, 'so_luong', { min: 0, max: 999 });
  const so_tien_thang = so_thuc(b, 'so_tien', { min: 0 });

  if (dm.cach_tinh === 'nhap_tay') {
    if (so_tien_thang === null || so_tien_thang <= 0) {
      throw new LoiDauVao(
        `Khoản "${dm.ten}" gõ thẳng số tiền, nên chính sách phải nói số tiền mỗi tháng.`,
      );
    }
  } else if (nguon === 'co_dinh' && (so_luong === null || so_luong <= 0)) {
    throw new LoiDauVao(
      `Khoản "${dm.ten}" tính theo số lượng. Hãy điền số lượng cố định, `
      + 'hoặc chọn nguồn "theo công thực tế".',
    );
  }

  // Dong dong dang hieu luc lai TRUOC, vi chi so bo phan (`... where hieu_luc_den is null`)
  // chi cho phep mot dong mo cho moi cap (nguoi, khoan). Dong vao ngay TRUOC ngay hieu luc
  // moi de hai khoang khong chong len nhau.
  await thuc_thi(
    `update chinh_sach_phu_cap
        set hieu_luc_den = ($3::date - interval '1 day')::date
      where nhan_vien_id = $1 and khoan_ma = $2 and hieu_luc_den is null
        and hieu_luc_tu < $3::date`,
    [nhan_vien_id, khoan_ma, hieu_luc_tu],
  );
  // Dong cu bat dau DUNG hoac SAU ngay moi thi dong lui la ra khoang am. Truong hop do la
  // nhap nham, phai bao chu khong duoc lang le sua.
  const con_mo = await truy_van_mot<{ hieu_luc_tu: string }>(
    `select to_char(hieu_luc_tu, 'YYYY-MM-DD') as hieu_luc_tu from chinh_sach_phu_cap
      where nhan_vien_id = $1 and khoan_ma = $2 and hieu_luc_den is null`,
    [nhan_vien_id, khoan_ma],
  );
  if (con_mo !== null) {
    throw new LoiXungDot(
      `${nv.ho_ten} đã có chính sách "${dm.ten}" hiệu lực từ ${con_mo.hieu_luc_tu} — `
      + `ngày mới (${hieu_luc_tu}) không sau ngày đó nên không nối tiếp được. `
      + 'Hãy chọn ngày hiệu lực sau, hoặc đóng chính sách cũ trước.',
    );
  }

  const dong = await truy_van_mot<{ id: string }>(
    `insert into chinh_sach_phu_cap
       (nhan_vien_id, khoan_ma, nguon_so_luong, so_luong, so_tien, don_gia,
        hieu_luc_tu, ly_do, ghi_chu, tao_boi)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
    [
      nhan_vien_id, khoan_ma, nguon,
      dm.cach_tinh === 'nhap_tay' ? null : so_luong,
      dm.cach_tinh === 'nhap_tay' ? so_tien_thang : null,
      so_thuc(b, 'don_gia', { min: 0 }),
      hieu_luc_tu,
      chuoi(b, 'ly_do', { toi_da: 500 }),
      chuoi(b, 'ghi_chu', { toi_da: 500 }),
      nguoi,
    ],
  );
  return dong!;
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
         cong_chuan_thang, lam_tron_den, t7_nua_cong,
         phat_di_muon_bat, di_muon_gio_vao, di_muon_moc_50k, di_muon_muc_50k,
         di_muon_moc_nua_ngay, di_muon_mien_moi_thang, di_muon_han_don, ty_le_thu_viec
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
                 $19,$20,$21,$22,$23,$24,$25,$26) returning id`,
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
        // Thu Bay tinh nua cong (ca cong chuan lan cong thuc). Mac dinh bat theo chinh sach cong ty.
        luan_ly(b, 't7_nua_cong', true),
        // Phat di muon: bat/tat + 4 moc gio + muc phat + so lan mien. Mac dinh = tat, dung
        // mau mac dinh (08:00/08:11/08:30, 50k, 3 lan/thang, don truoc 07:30).
        // Moc 50k = 08:11 (BC 01, L2): 08:10:00-08:10:59 KHONG phat, chi tu 08:11 tro di.
        luan_ly(b, 'phat_di_muon_bat', false),
        gio(b, 'di_muon_gio_vao') ?? '08:00:00',
        gio(b, 'di_muon_moc_50k') ?? '08:11:00',
        so_tien(b, 'di_muon_muc_50k', 50000),
        gio(b, 'di_muon_moc_nua_ngay') ?? '08:30:00',
        so_nguyen(b, 'di_muon_mien_moi_thang', { min: 0, max: 31 }) ?? 3,
        gio(b, 'di_muon_han_don') ?? '07:30:00',
        so_thuc(b, 'ty_le_thu_viec', { min: 0.5, max: 1 }) ?? 0.85,
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

  // ============================================================ chinh sach phu cap
  //
  // "Chi A duoc ho tro gui xe 200.000/thang tu 01/8" la mot THOA THUAN, khong phai mot o tren
  // bang luong thang 8. Nen no co hieu luc tu-den, khong sua tai cho, khong xoa — dong cu dong
  // lai va mo dong moi. Ky luong doc chinh sach cua thang do va tu sinh cac dong khoan.

  /** Chinh sach cua toan cong ty, hoac cua mot nguoi neu truyen `nhan_vien_id`. */
  app.get('/chinh-sach-phu-cap', { preHandler: can_nhan_su }, async (req) => {
    const q = than((req as { query?: unknown }).query ?? {});
    const nv = uuid(q, 'nhan_vien_id');
    const con_hieu_luc = luan_ly(q, 'con_hieu_luc', true) === true;

    return truy_van(
      `select cs.*, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              d.ten as khoan_ten, d.loai, d.cach_tinh, d.chiu_thue, d.canh_bao,
              d.don_gia as don_gia_danh_muc, d.dang_dung as khoan_dang_dung,
              u.ten_dang_nhap as nguoi_tao
         from chinh_sach_phu_cap cs
         join nhan_vien nv on nv.id = cs.nhan_vien_id
         join khoan_luong d on d.ma = cs.khoan_ma
         left join phong_ban pb on pb.id = nv.phong_ban_id
         left join nguoi_dung u on u.id = cs.tao_boi
        where ($1::uuid is null or cs.nhan_vien_id = $1)
          and ($2::boolean is false or cs.hieu_luc_den is null)
        order by nv.ma_nv, d.thu_tu, cs.hieu_luc_tu desc`,
      [nv, con_hieu_luc],
    );
  });

  /**
   * Mo mot chinh sach.
   *
   * Da co chinh sach dang hieu luc cho cung khoan thi DONG dong cu lai truoc (ngay truoc ngay
   * hieu luc cua dong moi) — khong ghi de, khong xoa. Nho vay cau "tu bao gio nguoi nay huong
   * muc nay" luon co cau tra loi.
   */
  app.post('/chinh-sach-phu-cap', { preHandler: can_nhan_su }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const nhan_vien_id = uuid_bat_buoc(b, 'nhan_vien_id');
    const hieu_luc_tu = ngay_bat_buoc(b, 'hieu_luc_tu');
    const dong = await mo_chinh_sach(nd.sub, nhan_vien_id, hieu_luc_tu, b);
    await ghi_nhat_ky(nd.sub, 'tao_chinh_sach_phu_cap', 'chinh_sach_phu_cap',
      dong.id, b, req.ip);
    return res.code(201).send(dong);
  });

  /**
   * Gan cung mot chinh sach cho NHIEU nguoi.
   *
   * 53 nguoi cung huong phu cap an trua thi khong ai nen phai mo 53 hop thoai. Moi nguoi van
   * ra mot dong rieng co hieu luc rieng — day chi la cach nhap nhanh, khong phai mot tang
   * "chinh sach chung" thu hai de sau nay khong biet so cua ai den tu dau.
   */
  app.post('/chinh-sach-phu-cap/hang-loat', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const hieu_luc_tu = ngay_bat_buoc(b, 'hieu_luc_tu');

    const ds_nv = b['nhan_vien_ids'];
    if (!Array.isArray(ds_nv) || ds_nv.length === 0) {
      throw new LoiDauVao('Chưa chọn nhân viên nào.');
    }
    if (ds_nv.length > 500) throw new LoiDauVao('Mỗi lần gán tối đa 500 người.');

    const ket_qua: { nhan_vien_id: string; id: string }[] = [];
    for (const raw of ds_nv) {
      const nhan_vien_id = uuid_bat_buoc({ id: raw }, 'id');
      const dong = await mo_chinh_sach(nd.sub, nhan_vien_id, hieu_luc_tu, b);
      ket_qua.push({ nhan_vien_id, id: dong.id });
    }

    await ghi_nhat_ky(nd.sub, 'gan_chinh_sach_hang_loat', 'chinh_sach_phu_cap', null,
      { khoan_ma: b['khoan_ma'], hieu_luc_tu, so_nguoi: ket_qua.length }, req.ip);
    return { ok: true, so_nguoi: ket_qua.length, danh_sach: ket_qua };
  });

  /**
   * Dong mot chinh sach lai tu mot ngay.
   *
   * KHONG xoa: bang luong thang truoc duoc tinh tu dong nay, va xoa no la lam mat can cu cua
   * mot so tien da tra. Xoa han chi cho phep khi chinh sach CHUA tung anh huong ky nao — xem
   * `DELETE` ben duoi.
   */
  app.post('/chinh-sach-phu-cap/:id/dong', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const den = ngay_bat_buoc(b, 'hieu_luc_den');

    const cs = await truy_van_mot<{ hieu_luc_tu: string; hieu_luc_den: string | null }>(
      `select to_char(hieu_luc_tu, 'YYYY-MM-DD') as hieu_luc_tu,
              to_char(hieu_luc_den, 'YYYY-MM-DD') as hieu_luc_den
         from chinh_sach_phu_cap where id = $1`,
      [id],
    );
    if (cs === null) throw new LoiKhongTim('Không tìm thấy chính sách phụ cấp.');
    if (cs.hieu_luc_den !== null) throw new LoiXungDot('Chính sách này đã đóng rồi.');
    if (den < cs.hieu_luc_tu) {
      throw new LoiDauVao(
        `Ngày kết thúc (${den}) không được trước ngày hiệu lực (${cs.hieu_luc_tu}).`,
      );
    }

    await thuc_thi('update chinh_sach_phu_cap set hieu_luc_den = $2 where id = $1', [id, den]);
    await ghi_nhat_ky(nd.sub, 'dong_chinh_sach_phu_cap', 'chinh_sach_phu_cap', id,
      { hieu_luc_den: den }, req.ip);
    return { ok: true };
  });

  /**
   * Xoa han mot chinh sach — chi khi no CHUA tung vao mot ky luong nao.
   *
   * Day la duong sua mot dong vua go nham, khong phai duong huy bo mot thoa thuan. Da co ky
   * luong nao trong khoang hieu luc thi phai DONG lai, vi so tien da tra can can cu.
   */
  app.delete('/chinh-sach-phu-cap/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);

    const cs = await truy_van_mot<{ nhan_vien_id: string; khoan_ma: string }>(
      'select nhan_vien_id, khoan_ma from chinh_sach_phu_cap where id = $1', [id],
    );
    if (cs === null) throw new LoiKhongTim('Không tìm thấy chính sách phụ cấp.');

    const da_dung = await truy_van_mot<{ so: number }>(
      `select count(*)::int as so
         from phieu_luong_khoan pk
         join phieu_luong p on p.id = pk.phieu_luong_id
        where p.nhan_vien_id = $1 and pk.khoan_ma = $2 and pk.tu_chinh_sach = true`,
      [cs.nhan_vien_id, cs.khoan_ma],
    );
    if ((da_dung?.so ?? 0) > 0) {
      throw new LoiXungDot(
        'Chính sách này đã sinh ra khoản trên phiếu lương nên không xóa được. '
        + 'Hãy ĐÓNG nó lại từ một ngày — số tiền đã trả phải giữ được căn cứ.',
      );
    }

    await thuc_thi('delete from chinh_sach_phu_cap where id = $1', [id]);
    await ghi_nhat_ky(nd.sub, 'xoa_chinh_sach_phu_cap', 'chinh_sach_phu_cap', id, cs, req.ip);
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
      `select p.*, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              nv.khoi_id, kh.ten as khoi
         from phieu_luong p
         join nhan_vien nv on nv.id = p.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
         left join khoi kh on kh.id = nv.khoi_id
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
    // Chi tiet tung LAN phat co NGAY + GIO (tu ho_so_ky_luat da_ap_dung + bang_cong_ngay), CHI
    // DOC. Dinh kem vao dung dong khoan: giam thuong ky luat, phat di muon, tru nua ngay do muon.
    const ids = phieu.map((p) => String(p['id']));
    const ct_ky_luat = await chi_tiet_ky_luat_theo_phieu(ids);
    const ct_di_muon = await chi_tiet_di_muon_theo_phieu(ids);
    const lan_thanh_dong = (id: string, cac_lan: string[], so_tien: unknown): DongLietKe[] =>
      (cac_lan.length === 0 ? [] : [{
        id: `${id}:lan`, ly_do: '', so_tien: String(so_tien ?? '0'), thu_tu: 0, cac_lan,
      }]);

    const theo_phieu = new Map<string, Record<string, unknown>[]>();
    for (const x of khoan) {
      const id = String(x['phieu_luong_id']);
      const ma = x['khoan_ma'];
      let chi_tiet: DongLietKe[] = [];
      if (ma === KHOAN_GIAM_THUONG) chi_tiet = ct_ky_luat.get(id) ?? [];
      else if (ma === 'tru_di_muon') {
        chi_tiet = lan_thanh_dong(id, ct_di_muon.get(id)?.tang_50k ?? [], x['thanh_tien']);
      } else if (ma === 'tru_nua_ngay') {
        chi_tiet = lan_thanh_dong(id, ct_di_muon.get(id)?.tang_nua_ngay ?? [], x['thanh_tien']);
      }
      const voi_ct = { ...x, chi_tiet };
      const ds = theo_phieu.get(id);
      if (ds === undefined) theo_phieu.set(id, [voi_ct]); else ds.push(voi_ct);
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
    // YC-2: da xem canh bao lech luong va van quyet chot. Mac dinh false — chan lan dau.
    const bo_qua_lech = luan_ly(b, 'bo_qua_lech', false) ?? false;

    if (k.trang_thai !== 'cho_duyet') {
      throw new LoiXungDot(`Kỳ lương đang ở trạng thái "${k.trang_thai}", không quyết được.`);
    }

    let ban_chot: KetQuaChot[] = [];

    if (quyet === 'da_duyet') {
      // YC-2 — CANH BAO LECH LUONG TRUOC KHI CHOT. Neu luong co ban trong phieu khong con khop
      // quyet dinh luong hien hanh (vd ai do sua quyet dinh sau khi tinh ma chua bam "Tinh lai"),
      // chan lan duyet dau va tra ve danh sach lech. Admin xem, roi hoac bam "Tinh lai" cho khop,
      // hoac duyet lai voi bo_qua_lech = true (co chu dich, co ghi nhat ky).
      const lech = await lech_luong_ky(k.id, k.thang);
      if (lech.length > 0 && !bo_qua_lech) {
        await ghi_nhat_ky(nd.sub, 'ky_luong_chan_lech_luong', 'ky_luong', k.id,
          { so_lech: lech.length, ma_nv: lech.map((x) => x.ma_nv) }, req.ip);
        return {
          ok: false,
          ma_loi: 'LECH_LUONG',
          thong_bao: `Có ${String(lech.length)} nhân viên lương cơ bản trong phiếu không khớp `
            + 'quyết định lương hiện hành. Hãy "Tính lại" kỳ hoặc rà soát quyết định lương '
            + 'trước khi chốt.',
          lech,
        };
      }
      if (lech.length > 0 && bo_qua_lech) {
        await ghi_nhat_ky(nd.sub, 'ky_luong_bo_qua_lech_luong', 'ky_luong', k.id,
          { so_lech: lech.length, ma_nv: lech.map((x) => x.ma_nv) }, req.ip);
      }
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

      // Gui email PHIEU LUONG cho tung nguoi (nen chi gui lan dau duyet — idempotent theo
      // gui_phieu_luc). Chay nen, KHONG chan viec duyet neu email loi/cham.
      void gui_phieu_luong_ky(k.id).then((r) => {
        if (r.so_gui > 0) console.log(`[phieu_luong_email] ky ${k.thang}: gui ${String(r.so_gui)}/${String(r.so_nguoi)} phieu`);
      }).catch((e: unknown) => console.error('[phieu_luong_email]', (e as Error).message));
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

  /**
   * YC-2 — BAO CAO LECH LUONG cua mot ky: nhung nhan vien co luong co ban / phu cap trong phieu
   * KHONG khop quyet dinh luong dang hieu luc. Xem duoc bat cu luc nao (khong doi trang thai) de
   * ra soat truoc khi duyet. Mang rong = khong lech.
   */
  app.get('/ky-luong/:id/lech-luong', { preHandler: can_nhan_su }, async (req) => {
    const k = await lay_ky(lay_id(req));
    const lech = await lech_luong_ky(k.id, k.thang);
    return { ky: k.thang, so_lech: lech.length, lech };
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

  /**
   * Gui (hoac gui lai) email phieu luong cho tung nguoi trong ky. Chi admin.
   *
   * Cho phep gui khi kỳ CHUA duyet (nhap / cho_duyet) — day la buoc "gui email XAC NHAN" truoc
   * khi duyet: nhan vien nhan phieu, ra soat, va co the KHIEU NAI luong (mục "Khiếu nại lương"
   * trong app) de he thong tiep nhan va chinh sua truoc khi chot. Cung dung sau khi duyet/da tra
   * de gui lai phieu chinh thuc. Luon `bat_buoc` de gui lai duoc du da gui lan truoc.
   */
  app.post('/ky-luong/:id/gui-phieu', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const k = await lay_ky(lay_id(req));
    if (k.trang_thai === 'huy') {
      throw new LoiXungDot('Kỳ đã hủy, không gửi phiếu lương được.');
    }
    const r = await gui_phieu_luong_ky(k.id, { bat_buoc: true });
    await ghi_nhat_ky(nd.sub, 'gui_phieu_luong', 'ky_luong', k.id,
      { ...r, trang_thai: k.trang_thai }, req.ip);
    return r;
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

  /**
   * THU HOI DUYET: da_duyet -> nhap de admin bo sung / sua roi duyet lai. Chi admin.
   *
   * Duyet da KHOA bang cong ca thang (da_chot = true) va sinh ban chot. Thu hoi mo lai ky de sua;
   * mo khoa bang cong cac ngay quet may (co_dieu_chinh = false) de tinh lai duoc, NHUNG GIU KHOA
   * cac ngay chinh sua tay (co_dieu_chinh = true) nhu cong 31/8 lam bu / giai trinh — khong de
   * "Tinh lai" ghi de mat du lieu tay. Xoa gui_phieu_luc de phieu (sau khi sua) gui lai duoc.
   */
  app.post('/ky-luong/:id/thu-hoi-duyet', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const k = await lay_ky(lay_id(req));
    if (k.trang_thai !== 'da_duyet') {
      throw new LoiXungDot(`Chỉ thu hồi duyệt được kỳ đã duyệt (hiện: "${k.trang_thai}").`);
    }
    const { tu, den } = khoang_thang(k.thang);
    await trong_giao_dich(async (khach) => {
      await khach.query(
        `update ky_luong set trang_thai = 'nhap', nguoi_duyet = null, duyet_luc = null,
                gui_duyet_luc = null, gui_phieu_luc = null, cap_nhat_luc = now() where id = $1`,
        [k.id],
      );
      await khach.query(
        `update bang_cong_ngay set da_chot = false
          where ngay >= $1 and ngay <= $2 and co_dieu_chinh = false`,
        [tu, den],
      );
    });
    await ghi_nhat_ky(nd.sub, 'thu_hoi_duyet_ky_luong', 'ky_luong', k.id, null, req.ip);
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

    const p = await truy_van_mot<{
      ky_luong_id: string; trang_thai: string; ep_du_cong: boolean; mien_phat: boolean;
      mien_thue: boolean; mien_bh: boolean; luong_net: boolean;
    }>(
      `select p.ky_luong_id, k.trang_thai, p.ep_du_cong, p.mien_phat, p.mien_thue, p.mien_bh,
              p.luong_net
         from phieu_luong p
         join ky_luong k on k.id = p.ky_luong_id where p.id = $1`,
      [id],
    );
    if (p === null) throw new LoiKhongTim('Không tìm thấy phiếu lương.');
    if (!SUA_DUOC.has(p.trang_thai)) {
      throw new LoiXungDot(`Kỳ lương đang ở trạng thái "${p.trang_thai}" nên phiếu đã khóa sửa.`);
    }

    // "Ep du cong" (tra du luong thang) va "mien phat" (bo phat di muon) deu la quyet dinh ve
    // tien nen CHI ADMIN doi duoc. Vang mat trong body (null) = giu nguyen; co mat va khac gia
    // tri cu ma khong phai admin -> chan.
    const ep_du_cong = luan_ly(b, 'ep_du_cong');
    if (ep_du_cong !== null && ep_du_cong !== p.ep_du_cong && nd.vai_tro !== 'admin') {
      throw new LoiKhongQuyen('Chỉ admin được tích "tính đủ công" cho phiếu lương.');
    }
    const mien_phat = luan_ly(b, 'mien_phat');
    if (mien_phat !== null && mien_phat !== p.mien_phat && nd.vai_tro !== 'admin') {
      throw new LoiKhongQuyen('Chỉ admin được tích "miễn phạt" cho phiếu lương.');
    }
    // Mien thue TNCN / mien BHXH-BHYT-BHTN: quyet dinh ve nghia vu thue & bao hiem, CHI ADMIN.
    const mien_thue = luan_ly(b, 'mien_thue');
    if (mien_thue !== null && mien_thue !== p.mien_thue && nd.vai_tro !== 'admin') {
      throw new LoiKhongQuyen('Chỉ admin được tích "miễn thuế TNCN" cho phiếu lương.');
    }
    const mien_bh = luan_ly(b, 'mien_bh');
    if (mien_bh !== null && mien_bh !== p.mien_bh && nd.vai_tro !== 'admin') {
      throw new LoiKhongQuyen('Chỉ admin được tích "miễn BHXH/BHYT/BHTN" cho phiếu lương.');
    }
    // Luong NET: cong ty ganh BHXH cua NLD (van dong du) — quyet dinh ve tien, CHI ADMIN.
    const luong_net = luan_ly(b, 'luong_net');
    if (luong_net !== null && luong_net !== p.luong_net && nd.vai_tro !== 'admin') {
      throw new LoiKhongQuyen('Chỉ admin được tích "lương NET" cho phiếu lương.');
    }
    await thuc_thi(
      `update phieu_luong set
         thuong = $2, phu_cap_khac = $3, tru_khac = $4,
         ly_do_tru_khac = $5, ghi_chu = $6, ep_du_cong = coalesce($8, ep_du_cong),
         mien_phat = coalesce($9, mien_phat), mien_thue = coalesce($10, mien_thue),
         mien_bh = coalesce($11, mien_bh), luong_net = coalesce($12, luong_net),
         sua_boi = $7, sua_luc = now()
       where id = $1`,
      [
        id, so_tien(b, 'thuong'), so_tien(b, 'phu_cap_khac'), so_tien(b, 'tru_khac'),
        chuoi(b, 'ly_do_tru_khac', { toi_da: 500 }),
        chuoi(b, 'ghi_chu', { toi_da: 500 }), nd.sub, ep_du_cong, mien_phat, mien_thue, mien_bh,
        luong_net,
      ],
    );

    // Tinh lai ca ky de tong khop voi tung dong.
    const k = await lay_ky(p.ky_luong_id);
    await tinh_ky_luong(k.id, k.thang);
    await ghi_nhat_ky(nd.sub, 'sua_phieu_luong', 'phieu_luong', id, b, req.ip);
    return { ok: true };
  });

  /**
   * Nhap LUONG CUNG (luong co ban P1 + phu cap co dinh P2) ngay tren bang luong — dung workflow
   * Excel: go thang vao bang. Tao/cap nhat mot `quyet_dinh_luong` co hieu luc tu dau thang cua ky
   * (nen bo tinh luong doc lai duoc va cac ky sau van giu), roi tinh lai ca ky.
   */
  app.put('/phieu-luong/:id/luong-cung', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);

    const p = await truy_van_mot<{ nhan_vien_id: string; ky_luong_id: string; trang_thai: string }>(
      `select p.nhan_vien_id, p.ky_luong_id, k.trang_thai from phieu_luong p
         join ky_luong k on k.id = p.ky_luong_id where p.id = $1`,
      [id],
    );
    if (p === null) throw new LoiKhongTim('Không tìm thấy phiếu lương.');
    if (!SUA_DUOC.has(p.trang_thai)) {
      throw new LoiXungDot(`Kỳ lương đang ở trạng thái "${p.trang_thai}" nên phiếu đã khóa sửa.`);
    }
    const k = await lay_ky(p.ky_luong_id);
    const hieu_luc_tu = `${k.thang}-01`;

    // Luong dong BH la TUY CHON: khong gui thi giu nguyen muc cu (coalesce ben duoi), gui 0
    // nghia la dong theo luong that. Tach rieng khoi luong_co_ban vi hai muc doc lap nhau.
    const luong_dong_bh = b['luong_dong_bh'] === undefined
      || b['luong_dong_bh'] === null || b['luong_dong_bh'] === ''
      ? null
      : so_tien(b, 'luong_dong_bh');

    // YC-1: chan cung — nhap muc luong phai kem CHUNG TU duyet. nguoi_duyet_id = nguoi dang
    // nhap (chiu trach nhiem), chung tu do form nhap.
    const chung_tu_mo_ta = chuoi_bat_buoc(b, 'chung_tu_mo_ta', { toi_da: 300, toi_thieu: 3 });
    const nguoi_duyet_id = nd.sub;

    await thuc_thi(
      `insert into quyet_dinh_luong
         (nhan_vien_id, hieu_luc_tu, luong_co_ban, phu_cap, luong_dong_bh, hinh_thuc, ly_do,
          tao_boi, nguoi_duyet_id, chung_tu_mo_ta)
       values ($1, $2, $3, $4, $5, 'thang', 'Nhập từ bảng lương', $6, $7, $8)
       on conflict (nhan_vien_id, hieu_luc_tu) do update set
         luong_co_ban = excluded.luong_co_ban, phu_cap = excluded.phu_cap,
         luong_dong_bh = coalesce(excluded.luong_dong_bh, quyet_dinh_luong.luong_dong_bh),
         nguoi_duyet_id = excluded.nguoi_duyet_id, chung_tu_mo_ta = excluded.chung_tu_mo_ta`,
      [p.nhan_vien_id, hieu_luc_tu, so_tien(b, 'luong_co_ban'), so_tien(b, 'phu_cap'),
       luong_dong_bh, nd.sub, nguoi_duyet_id, chung_tu_mo_ta],
    );

    await tinh_ky_luong(k.id, k.thang);
    await ghi_nhat_ky(nd.sub, 'nhap_luong_cung', 'phieu_luong', id,
      { luong_co_ban: b['luong_co_ban'], phu_cap: b['phu_cap'], luong_dong_bh }, req.ip);
    return { ok: true };
  });

  // ============================================================ cac khoan cua mot phieu
  //
  // Thay CA danh sach cung mot luc chu khong sua tung dong: ke toan nhin bang luong theo
  // dong nguoi, khong theo tung o.
  //
  // PHAM VI: danh sach gui len la cac khoan GO TAY cho rieng ky nay. Cac dong may sinh ra tu
  // `chinh_sach_phu_cap` khong nam trong pham vi cua tuyen nay — chung do chinh sach quan ly,
  // va `tinh_ky_luong` sinh lai moi lan tinh.
  //
  // Ghi de mot dong chinh sach = dua khoan do VAO danh sach nay (thanh mot dong go tay, chinh
  // sach se khong sinh dong cho no nua). Bo ghi de = bo no ra khoi danh sach.
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

    // Chi xoa dong GO TAY. Dong tu chinh sach khong thuoc pham vi tuyen nay — xoa o day thi
    // `tinh_ky_luong` ngay duoi sinh lai, chi ton mot vong ghi.
    await thuc_thi(
      `delete from phieu_luong_khoan
        where phieu_luong_id = $1 and tu_chinh_sach = false and khoan_ma <> all($2::text[])`,
      [id, dong.map((d) => d.ma)],
    );
    for (const d of dong) {
      // `thanh_tien` o day chi la gia tri tam — `tinh_ky_luong` ngay duoi se tinh lai het
      // theo dung `cach_tinh` cua danh muc.
      //
      // `tu_chinh_sach = false` ke ca khi dong cu la dong chinh sach: dua mot khoan vao danh
      // sach nay CHINH LA hanh dong ghi de.
      await thuc_thi(
        `insert into phieu_luong_khoan
           (phieu_luong_id, khoan_ma, so_luong, thanh_tien, ghi_chu, tu_chinh_sach)
         values ($1,$2,$3,$4,$5,false)
         on conflict (phieu_luong_id, khoan_ma) do update set
           so_luong = excluded.so_luong, thanh_tien = excluded.thanh_tien,
           ghi_chu = excluded.ghi_chu, tu_chinh_sach = false`,
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


  /**
   * YC 02 phan B (GD1) — NHAP NHANH THUONG KPI cho ca ky theo tung nhan vien (loc san theo
   * khoi/phong o giao dien). Ghi khoan GO TAY vao tung phieu roi tinh lai ky mot lan.
   *
   * Bat buoc CHUNG TU duyet (nhat quan YC 01) va ghi nguoi thao tac. Chi admin. So tien = 0 thi
   * GO khoan do khoi phieu (de sua nham). Kho da chot (khong con 'nhap') thi khoa.
   */
  const KHOAN_THUONG_KPI = [
    'thuong_kpi_ca_nhan', 'thuong_kpi_phong', 'hoa_hong_cskh', 'pc_doanh_so', 'pc_kpi',
  ] as const;
  app.post('/ky-luong/:id/thuong-kpi-hang-loat', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const k = await lay_ky(lay_id(req));
    if (!SUA_DUOC.has(k.trang_thai)) {
      throw new LoiXungDot(`Kỳ lương đang ở trạng thái "${k.trang_thai}" nên đã khóa sửa.`);
    }
    const b = than(req.body);
    const khoan_ma = trong_tap(b, 'khoan_ma', KHOAN_THUONG_KPI, { bat_buoc: true });
    // Chung tu duyet bat buoc — thuong thanh tien phai co can cu (YC 01).
    const chung_tu_mo_ta = chuoi_bat_buoc(b, 'chung_tu_mo_ta', { toi_da: 300, toi_thieu: 3 });
    const dong = b['dong'];
    if (!Array.isArray(dong) || dong.length === 0) throw new LoiDauVao('Thiếu danh sách "dong".');
    if (dong.length > 500) throw new LoiDauVao('Tối đa 500 dòng mỗi lần.');

    const ds: { nhan_vien_id: string; so_tien: number; ghi_chu: string | null }[] = [];
    for (const raw of dong) {
      const r = than(raw);
      const nhan_vien_id = uuid_bat_buoc(r, 'nhan_vien_id');
      if (ds.some((x) => x.nhan_vien_id === nhan_vien_id)) {
        throw new LoiDauVao('Một nhân viên xuất hiện hai lần trong danh sách.');
      }
      ds.push({
        nhan_vien_id, so_tien: so_tien(r, 'so_tien'), ghi_chu: chuoi(r, 'ghi_chu', { toi_da: 500 }),
      });
    }

    const khong_co_phieu: string[] = [];
    let so_ap = 0;
    await trong_giao_dich(async (khach) => {
      for (const d of ds) {
        const pl = (await khach.query<{ id: string }>(
          'select id from phieu_luong where ky_luong_id = $1 and nhan_vien_id = $2',
          [k.id, d.nhan_vien_id],
        )).rows[0];
        if (pl === undefined) { khong_co_phieu.push(d.nhan_vien_id); continue; }
        if (d.so_tien <= 0) {
          await khach.query(
            `delete from phieu_luong_khoan
              where phieu_luong_id = $1 and khoan_ma = $2 and tu_chinh_sach = false`,
            [pl.id, khoan_ma],
          );
        } else {
          await khach.query(
            `insert into phieu_luong_khoan
               (phieu_luong_id, khoan_ma, so_luong, thanh_tien, ghi_chu, tu_chinh_sach)
             values ($1,$2,null,$3,$4,false)
             on conflict (phieu_luong_id, khoan_ma) do update set
               so_luong = null, thanh_tien = excluded.thanh_tien,
               ghi_chu = excluded.ghi_chu, tu_chinh_sach = false`,
            [pl.id, khoan_ma, d.so_tien, d.ghi_chu ?? chung_tu_mo_ta],
          );
        }
        so_ap++;
      }
    });
    // Tinh lai ca ky de tong khop tung dong.
    await tinh_ky_luong(k.id, k.thang);
    await ghi_nhat_ky(nd.sub, 'thuong_kpi_hang_loat', 'ky_luong', k.id,
      { khoan_ma, chung_tu_mo_ta, so_ap, so_dong: ds.length, khong_co_phieu }, req.ip);
    return { ok: true, so_ap, khong_co_phieu };
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

  // ============================================================ KHIEU NAI PHIEU LUONG (quan ly)
  /** Danh sach khieu nai phieu luong. Truong phong chi thay phong minh; nhan su/admin thay het. */
  app.get('/khieu-nai-luong', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = than(req.query) as Record<string, unknown>;
    const tt = trong_tap(q, 'trang_thai', ['moi', 'dang_xem', 'chap_nhan', 'tu_choi'] as const);
    const chi_phong_minh = !xem_duoc_tat_ca(nd);
    return truy_van(
      `select kn.id, kn.ma, kn.noi_dung, kn.trang_thai, kn.phan_hoi, kn.tao_luc, kn.xu_ly_luc,
              kn.nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              k.thang, p.thuc_linh_lam_tron::float8 as thuc_linh,
              coalesce((select json_agg(json_build_object('id', t.id, 'ten', t.ten_goc)
                                        order by t.tao_luc)
                          from ho_so_tep t
                         where t.nhom = 'khieu_nai' and t.thuoc_id = kn.id), '[]') as anh,
              coalesce((select json_agg(json_build_object('vai', r.vai, 'noi_dung', r.noi_dung,
                                                          'tao_luc', r.tao_luc) order by r.tao_luc)
                          from khieu_nai_luong_tra_loi r
                         where r.khieu_nai_id = kn.id), '[]') as tra_loi
         from khieu_nai_luong kn
         join nhan_vien nv on nv.id = kn.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
         join phieu_luong p on p.id = kn.phieu_luong_id
         join ky_luong k on k.id = p.ky_luong_id
        where ($1::text is null or kn.trang_thai = $1)
          and ($2::boolean is not true
               or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $3))
        order by (kn.trang_thai in ('moi','dang_xem')) desc, kn.tao_luc desc
        limit 500`,
      [tt ?? null, chi_phong_minh, nd.nv],
    );
  });

  /**
   * Xu ly khieu nai phieu luong: 'dang_xem' (tiep nhan), 'chap_nhan' (dong y) hoac 'tu_choi'.
   * KHONG tu sua luong — neu dung, ke toan mo lai ky luong va sua tay theo quy trinh; day chi ghi
   * nhan ket qua xu ly va phan hoi cho nguoi lao dong.
   */
  app.post('/khieu-nai-luong/:id/xu-ly', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body) as Record<string, unknown>;
    const trang_thai = trong_tap(b, 'trang_thai', ['dang_xem', 'chap_nhan', 'tu_choi'] as const,
      { bat_buoc: true }) as 'dang_xem' | 'chap_nhan' | 'tu_choi';
    const phan_hoi = chuoi(b, 'phan_hoi', { toi_da: 2000 }) ?? null;

    const kn = await truy_van_mot<{ nhan_vien_id: string; trang_thai: string }>(
      'select nhan_vien_id, trang_thai from khieu_nai_luong where id = $1', [id],
    );
    if (kn === null) throw new LoiKhongTim('Không tìm thấy khiếu nại.');
    if (kn.trang_thai === 'chap_nhan' || kn.trang_thai === 'tu_choi') {
      throw new LoiXungDot('Khiếu nại đã được xử lý xong, không sửa được nữa.');
    }
    await thuc_thi(
      `update khieu_nai_luong set trang_thai = $2, phan_hoi = coalesce($3, phan_hoi),
              nguoi_xu_ly = $4,
              xu_ly_luc = case when $2 in ('chap_nhan','tu_choi') then now() else xu_ly_luc end,
              cap_nhat_luc = now()
        where id = $1`,
      [id, trang_thai, phan_hoi, nd.sub],
    );
    await ghi_nhat_ky(nd.sub, 'xu_ly_khieu_nai_luong', 'khieu_nai_luong', id, { trang_thai }, req.ip);

    gui_ngam({
      nguoi_dung_ids: await tai_khoan_cua_nhan_vien(kn.nhan_vien_id).catch(() => []),
      tieu_de: trang_thai === 'chap_nhan' ? 'Khiếu nại phiếu lương được chấp nhận'
        : trang_thai === 'tu_choi' ? 'Khiếu nại phiếu lương bị từ chối'
          : 'Khiếu nại phiếu lương đang được xem xét',
      noi_dung: phan_hoi ?? 'Phòng Nhân sự đã cập nhật khiếu nại phiếu lương của bạn.',
      du_lieu: { man: 'khieu-nai-luong', khieu_nai_id: id },
    });
    void email_hr_xu_ly(id, trang_thai, phan_hoi);
    return { ok: true };
  });

  /**
   * MO LAI mot khieu nai da dong (chap_nhan / tu_choi) de trao doi / giai trinh them.
   * CHI ADMIN duoc thuc hien. Dua ve 'dang_xem' (mo), xoa xu_ly_luc; giu lai phan_hoi/thread
   * lam lich su. Sau khi mo lai, nhan su co the tra loi / xu ly lai nhu binh thuong.
   */
  app.post('/khieu-nai-luong/:id/mo-lai', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const kn = await truy_van_mot<{ nhan_vien_id: string; trang_thai: string }>(
      'select nhan_vien_id, trang_thai from khieu_nai_luong where id = $1', [id],
    );
    if (kn === null) throw new LoiKhongTim('Không tìm thấy khiếu nại.');
    if (kn.trang_thai !== 'chap_nhan' && kn.trang_thai !== 'tu_choi') {
      throw new LoiXungDot('Chỉ mở lại được khiếu nại đã đóng (đã chấp nhận / đã từ chối).');
    }
    await thuc_thi(
      `update khieu_nai_luong set trang_thai = 'dang_xem', xu_ly_luc = null,
              nguoi_xu_ly = $2, cap_nhat_luc = now()
        where id = $1`,
      [id, nd.sub],
    );
    await ghi_nhat_ky(nd.sub, 'khieu_nai_luong.mo_lai', 'khieu_nai_luong', id,
      { tu_trang_thai: kn.trang_thai }, req.ip);
    gui_ngam({
      nguoi_dung_ids: await tai_khoan_cua_nhan_vien(kn.nhan_vien_id).catch(() => []),
      tieu_de: 'Khiếu nại phiếu lương được mở lại',
      noi_dung: 'Phòng Nhân sự đã mở lại khiếu nại phiếu lương của bạn để trao đổi / giải trình thêm.',
      du_lieu: { man: 'khieu-nai-luong', khieu_nai_id: id },
    });
    void email_hr_xu_ly(id, 'dang_xem',
      'Khiếu nại của bạn được mở lại để trao đổi / giải trình thêm.');
    return { ok: true };
  });

  /** Nhan su TRA LOI vao thread khieu nai (trao doi voi nguoi lao dong) — khi ticket con mo. */
  app.post('/khieu-nai-luong/:id/tra-loi', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const noi_dung = chuoi_bat_buoc(than(req.body) as Record<string, unknown>, 'noi_dung',
      { toi_thieu: 1, toi_da: 2000 });
    const kn = await truy_van_mot<{ nhan_vien_id: string; trang_thai: string }>(
      'select nhan_vien_id, trang_thai from khieu_nai_luong where id = $1', [id],
    );
    if (kn === null) throw new LoiKhongTim('Không tìm thấy khiếu nại.');
    if (kn.trang_thai === 'chap_nhan' || kn.trang_thai === 'tu_choi') {
      throw new LoiXungDot('Khiếu nại đã đóng, không trả lời thêm được.');
    }
    await trong_giao_dich(async (khach) => {
      await khach.query(
        `insert into khieu_nai_luong_tra_loi (khieu_nai_id, vai, nguoi_dung_id, noi_dung)
         values ($1, 'nhan_su', $2, $3)`,
        [id, nd.sub, noi_dung],
      );
      if (kn.trang_thai === 'moi') {
        await khach.query(
          `update khieu_nai_luong set trang_thai = 'dang_xem', nguoi_xu_ly = $2, cap_nhat_luc = now()
            where id = $1`,
          [id, nd.sub],
        );
      }
    });
    await ghi_nhat_ky(nd.sub, 'khieu_nai_luong.tra_loi', 'khieu_nai_luong', id, null, req.ip);
    gui_ngam({
      nguoi_dung_ids: await tai_khoan_cua_nhan_vien(kn.nhan_vien_id).catch(() => []),
      tieu_de: 'Khiếu nại phiếu lương có phản hồi mới',
      noi_dung: 'Phòng Nhân sự vừa trả lời khiếu nại phiếu lương của bạn.',
      du_lieu: { man: 'khieu-nai-luong', khieu_nai_id: id },
    });
    void email_hr_tra_loi(id, noi_dung);
    return { ok: true };
  });

  // ============================================================ khoi luong Trung Quoc (CNY)
  //
  // Nhom che_do_luong = 'tq' tra bang CNY, khong BHXH/thue VN — tinh & xem o tab rieng, dung
  // chung ky luong (thang) voi bang VND.

  /** Danh sach phieu luong CNY cua mot ky. */
  app.get('/ky-luong/:id/cny', { preHandler: can_nhan_su }, async (req) => {
    const k = await lay_ky(lay_id(req));
    const phieu = await truy_van<Record<string, unknown>>(
      `select p.*, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban
         from phieu_luong_cny p
         join nhan_vien nv on nv.id = p.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where p.ky_luong_id = $1
        order by pb.ten nulls last, nv.ma_nv`,
      [k.id],
    );
    return { ...k, phieu };
  });

  /** Tinh (hoac tinh lai) phieu luong CNY cua ky. */
  app.post('/ky-luong/:id/tinh-cny', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const k = await lay_ky(lay_id(req));
    if (!SUA_DUOC.has(k.trang_thai)) {
      throw new LoiXungDot(
        `Kỳ lương đang ở trạng thái "${k.trang_thai}" nên không tính lại được. `
        + 'Hãy thu hồi về nháp trước.',
      );
    }
    const so = await tinh_ky_luong_cny(k.id, k.thang);
    await ghi_nhat_ky(nd.sub, 'tinh_ky_luong_cny', 'ky_luong', k.id, { so_phieu: so }, req.ip);
    return { ok: true, so_phieu: so };
  });

  /**
   * Sua mot phieu luong CNY: luong cung CNY (luu quyet_dinh_luong_cny hieu luc tu dau thang) +
   * dieu chinh tay rieng ky (thuong / phu cap khac / tru khac / ghi chu), roi tinh lai ca ky.
   */
  app.patch('/phieu-luong-cny/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);

    const p = await truy_van_mot<{ nhan_vien_id: string; ky_luong_id: string; trang_thai: string }>(
      `select p.nhan_vien_id, p.ky_luong_id, k.trang_thai from phieu_luong_cny p
         join ky_luong k on k.id = p.ky_luong_id where p.id = $1`,
      [id],
    );
    if (p === null) throw new LoiKhongTim('Không tìm thấy phiếu lương CNY.');
    if (!SUA_DUOC.has(p.trang_thai)) {
      throw new LoiXungDot(`Kỳ lương đang ở trạng thái "${p.trang_thai}" nên phiếu đã khóa sửa.`);
    }
    const k = await lay_ky(p.ky_luong_id);

    // Luong cung CNY: chi ghi khi client co gui (co the chi sua thuong/tru). Luu vao
    // quyet_dinh_luong_cny hieu luc tu dau thang cua ky, giong duong /luong-cung cua VND.
    const co_luong = b['luong_co_ban'] !== undefined || b['phu_cap'] !== undefined;
    if (co_luong) {
      await thuc_thi(
        `insert into quyet_dinh_luong_cny (nhan_vien_id, hieu_luc_tu, luong_co_ban, phu_cap, ly_do, tao_boi)
         values ($1, $2, $3, $4, 'Nhập từ bảng lương CNY', $5)
         on conflict (nhan_vien_id, hieu_luc_tu) do update set
           luong_co_ban = excluded.luong_co_ban, phu_cap = excluded.phu_cap`,
        [p.nhan_vien_id, `${k.thang}-01`, so_tien(b, 'luong_co_ban'), so_tien(b, 'phu_cap'), nd.sub],
      );
    }

    await thuc_thi(
      `update phieu_luong_cny set
         thuong = $2, phu_cap_khac = $3, tru_khac = $4, ly_do_tru_khac = $5,
         ghi_chu = $6, sua_boi = $7, sua_luc = now()
       where id = $1`,
      [
        id, so_tien(b, 'thuong'), so_tien(b, 'phu_cap_khac'), so_tien(b, 'tru_khac'),
        chuoi(b, 'ly_do_tru_khac', { toi_da: 500 }), chuoi(b, 'ghi_chu', { toi_da: 500 }), nd.sub,
      ],
    );

    await tinh_ky_luong_cny(k.id, k.thang);
    await ghi_nhat_ky(nd.sub, 'sua_phieu_luong_cny', 'phieu_luong_cny', id, b, req.ip);
    return { ok: true };
  });

  /** Xuat bang luong CNY (xlsx). */
  app.get('/ky-luong/:id/xuat-xlsx-cny', { preHandler: can_nhan_su }, async (req, res) => {
    const k = await lay_ky(lay_id(req));
    const b = await bang_cny_xuat(k.id);
    const tep = ghi_xlsx({ ten_sheet: `Lương CNY ${k.thang}`, tieu_de: b.tieu_de, hang: b.hang });
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'xuat_bang_luong_cny', 'ky_luong',
      k.id, { thang: k.thang, dinh_dang: 'xlsx', so_dong: b.hang.length }, req.ip);
    return res
      .header('content-type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('content-disposition', `attachment; filename="luong_cny_${k.thang}.xlsx"`)
      .send(tep);
  });

  /** Xuat bang luong CNY (csv). */
  app.get('/ky-luong/:id/xuat-csv-cny', { preHandler: can_nhan_su }, async (req, res) => {
    const k = await lay_ky(lay_id(req));
    const b = await bang_cny_xuat(k.id);
    const csv = '﻿' + [b.tieu_de, ...b.hang].map((r) => r.map(o_csv).join(',')).join('\r\n');
    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'xuat_bang_luong_cny', 'ky_luong',
      k.id, { thang: k.thang, dinh_dang: 'csv', so_dong: b.hang.length }, req.ip);
    return res
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="luong_cny_${k.thang}.csv"`)
      .send(csv);
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
    // Xuat theo MAU ERP (mau_bang_luong_erp.xlsx): giu logo, nhom cot, cong thuc, in an.
    const tep = await xuat_bang_luong_erp(k.id);

    await ghi_nhat_ky(nguoi_dung_hien_tai(req).sub, 'xuat_bang_luong', 'ky_luong',
      k.id, { thang: k.thang, dinh_dang: 'xlsx' }, req.ip);

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

/** Bang xuat luong CNY: tieu de + cac hang, dung chung cho csv va xlsx. */
async function bang_cny_xuat(
  ky_luong_id: string,
): Promise<{ tieu_de: string[]; hang: (string | number)[][] }> {
  const phieu = await truy_van<Record<string, unknown>>(
    `select nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
            p.luong_co_ban, p.phu_cap, p.so_ngay_cong_chuan, p.so_ngay_cong_thuc,
            p.luong_theo_cong, p.thuong, p.phu_cap_khac, p.tru_khac, p.tong_thu_nhap, p.thuc_linh
       from phieu_luong_cny p
       join nhan_vien nv on nv.id = p.nhan_vien_id
       left join phong_ban pb on pb.id = nv.phong_ban_id
      where p.ky_luong_id = $1
      order by pb.ten nulls last, nv.ma_nv`,
    [ky_luong_id],
  );
  const tieu_de = [
    'Mã NV', 'Họ tên', 'Phòng ban', 'Lương cơ bản (CNY)', 'Phụ cấp (CNY)',
    'Công chuẩn', 'Công thực', 'Lương theo công (CNY)', 'Thưởng (CNY)',
    'Phụ cấp khác (CNY)', 'Trừ khác (CNY)', 'Tổng thu nhập (CNY)', 'Thực lĩnh (CNY)',
  ];
  const hang: (string | number)[][] = phieu.map((p) => [
    String(p['ma_nv'] ?? ''), String(p['ho_ten'] ?? ''), String(p['phong_ban'] ?? ''),
    Number(p['luong_co_ban']), Number(p['phu_cap']),
    Number(p['so_ngay_cong_chuan']), Number(p['so_ngay_cong_thuc']),
    Number(p['luong_theo_cong']), Number(p['thuong']), Number(p['phu_cap_khac']),
    Number(p['tru_khac']), Number(p['tong_thu_nhap']), Number(p['thuc_linh']),
  ]);
  return { tieu_de, hang };
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
