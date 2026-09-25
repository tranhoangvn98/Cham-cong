// Ham THUAN cua quy trinh thoi viec — khong CSDL, khong Fastify, kiem thu duoc tung o.
//
// Moi con so phap ly o day phai co can cu (BLLD 2019, ND145/2020): sai mot so la sai
// tien cua nguoi sap nghi — module nay la noi duy nhat tinh, va test khoa tung con so.
import type { DongMucThoiViec } from './quy_trinh.ts';

/** Mau khuon han bao truoc: loai hop dong -> so ngay (null = theo hop dong, khong chan). */
export type KhuonHanBaoTruoc = Record<string, number | null>;

/**
 * Nguong bao truoc toi thieu khi don phuong cham dut HDLD.
 *
 * BLLD 2019 Dieu 35.1 + Dieu 27 khoan 2 (thu viec khong can bao truoc) + Dieu 7
 * ND145/2020 (nguoi quan ly doanh nghiep toi 120 ngay). Ngoai le: hop dong XAC DINH
 * duoi 12 thang thi 3 ngay lam viec, khong phai 30.
 *
 * Tra null khi khong chan — theo hop dong (hoc_viec, cong_tac_vien).
 */
export function nguong_bao_truoc(
  khuon: KhuonHanBaoTruoc,
  loai_hop_dong: string,
  so_thang_hop_dong: number | null,
  la_quan_ly_dn: boolean,
): number | null {
  if (la_quan_ly_dn) {
    const n = khuon['quan_ly_dn'];
    return n === undefined ? 120 : n;
  }
  if (loai_hop_dong === 'xac_dinh' && so_thang_hop_dong !== null && so_thang_hop_dong < 12) {
    return 3;
  }
  return khuon[loai_hop_dong] ?? null;
}

/** Thu trong tuan: 0 = Chu nhat, 6 = Thu bay. Giong `thoi_gian.thu_trong_tuan`. */
export function thu_trong_tuan_thuan(ngay: string): number {
  return new Date(`${ngay}T00:00:00Z`).getUTCDay();
}

/** Them dung `so_ngay` ngay lam viec vao `tu_ngay`. `la_ngay_lam` quyet ngay nao tinh. */
export function cong_ngay_lam_viec(
  tu_ngay: string,
  so_ngay: number,
  la_ngay_lam: (ngay: string) => boolean,
): string {
  let ngay = tu_ngay;
  let con = so_ngay;
  while (con > 0) {
    const d = new Date(`${ngay}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    ngay = d.toISOString().slice(0, 10);
    if (la_ngay_lam(ngay)) con--;
  }
  return ngay;
}

/**
 * Tro cap thoi viec — BLLD 2019 Dieu 46: moi nam lam viec = nua thang luong, TRU thoi
 * gian da dong bao hiem that nghiep (Dieu 8 ND145/2020).
 */
export function tro_cap_thoi_viec(
  luong_thang: number,
  ngay_vao: string | null,
  ngay_nghi: string,
  so_thang_dong_bhtn: number,
): { so_nam_lam: number; so_nam_dong_bhtn: number; so_nam_tinh: number; tro_cap: number } {
  const so_nam_lam = ngay_vao === null || ngay_vao === ''
    ? 0
    : Math.max(0, (Date.parse(`${ngay_nghi}T00:00:00Z`)
      - Date.parse(`${ngay_vao}T00:00:00Z`)) / (365.25 * 86_400_000));
  const so_nam_dong_bhtn = so_thang_dong_bhtn / 12;
  // Lam tron 2 so le truoc khi tinh tien — so hien thi la so dung de tinh, khong lech nhau.
  const so_nam_tinh = Math.round(Math.max(0, so_nam_lam - so_nam_dong_bhtn) * 100) / 100;
  return {
    so_nam_lam: Math.round(so_nam_lam * 100) / 100,
    so_nam_dong_bhtn: Math.round(so_nam_dong_bhtn * 100) / 100,
    so_nam_tinh,
    tro_cap: Math.round(luong_thang * 0.5 * so_nam_tinh),
  };
}

/** Thanh toan phep nam chua nghi — BLLD 2019 Dieu 113 khoan 3. */
export function tien_phep_chua_nghi(so_ngay_con: number, luong_ngay: number): number {
  return Math.round(Math.max(0, so_ngay_con) * luong_ngay);
}

/** So muc bat buoc con `chua`/`dang` — con so do cua cham tron widget. */
export function so_muc_bat_buoc_chua(mucs: readonly DongMucThoiViec[]): number {
  return mucs.filter((m) => m.bat_buoc && (m.trang_thai === 'chua' || m.trang_thai === 'dang'))
    .length;
}

/** Tat ca muc bat buoc da `xong` hoac `bo_qua` chua — dieu kien chuyen san_sang_chot. */
export function san_sang_chot(mucs: readonly DongMucThoiViec[]): boolean {
  return mucs.every((m) => !m.bat_buoc || m.trang_thai === 'xong' || m.trang_thai === 'bo_qua');
}

/**
 * Kiem dieu kien truoc khi chay script dung hoat dong (Cong 2). TRA ve danh sach ly do
 * chua dat — rong = duoc chay. Ham thuan: bat bien "khong co duong nao cat truy cap truoc
 * khi ban giao xong" nam o day.
 */
export function kiem_dieu_kien_chay(
  mucs: readonly DongMucThoiViec[],
  trang_thai: string,
  lastday_da_chot: boolean,
  ngay_lam_viec_cuoi: string | null,
  email_dich_vu_bhxh: string,
  email_chung_tu_thue: string,
): string[] {
  const loi: string[] = [];
  if (trang_thai !== 'san_sang_chot') {
    loi.push('Quy trình chưa sẵn sàng chốt — còn mục bắt buộc chưa xong hoặc chưa tới bước này.');
  }
  if (!lastday_da_chot || ngay_lam_viec_cuoi === null) {
    loi.push('Chưa ấn định ngày làm việc cuối (lastday chưa chốt).');
  }
  const muc = (ma: string): DongMucThoiViec | undefined => mucs.find((m) => m.ma_muc === ma);
  const can_email_bhxh = muc('chot_bhxh') !== undefined && muc('chot_bhxh')!.trang_thai !== 'bo_qua';
  const can_email_thue = muc('chung_tu_thue') !== undefined
    && muc('chung_tu_thue')!.trang_thai !== 'bo_qua';
  if (can_email_bhxh && email_dich_vu_bhxh === '') {
    loi.push('Chưa khai email đơn vị dịch vụ BHXH — khai trong cấu hình Thôi việc trước khi chạy.');
  }
  if (can_email_thue && email_chung_tu_thue === '' && email_dich_vu_bhxh === '') {
    loi.push('Chưa khai email nhận chứng từ thuế TNCN (hoặc email dịch vụ BHXH dùng chung).');
  }
  const con_cho = so_muc_bat_buoc_chua(mucs);
  if (con_cho > 0) {
    loi.push(`Còn ${String(con_cho)} mục bắt buộc chưa xong.`);
  }
  return loi;
}

/** Nhan trang thai quy trinh cho nguoi doc. */
export const NHAN_TRANG_THAI_QUY_TRINH: Record<string, string> = {
  dang_thuc_hien: 'Đang thực hiện',
  san_sang_chot: 'Sẵn sàng chốt',
  da_khoa: 'Đã khóa',
  da_huy: 'Đã hủy',
};

/** Nhan trang thai muc checklist. */
export const NHAN_TRANG_THAI_MUC: Record<string, string> = {
  chua: 'Chưa làm',
  dang: 'Đang làm',
  xong: 'Đã xong',
  bo_qua: 'Bỏ qua',
};
