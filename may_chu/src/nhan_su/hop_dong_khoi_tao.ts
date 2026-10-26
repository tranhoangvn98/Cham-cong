// Loai hop dong chon khi TAO HO SO NHAN SU + cach tinh ngay het han.
//
// Vi sao lam o day: form them nhan vien truoc day chi co o chu tu do "Loai hop dong" va gia tri
// do chi vao cau chu cua checklist. Nguoi dung can chon dung LOAI (hoc viec / outsource / thu
// viec / chinh thuc) va KY HAN (6 thang / 1 nam / khong xac dinh) de he thong TAO LUON
// `hop_dong_lao_dong` — nho vay tinh luong, thoi viec va nhac het han deu doc cung mot nguon.
//
// Gia tri luu xuong bang `hop_dong_lao_dong.loai` phai thuoc CHECK cua migration 009. "Outsource"
// khong phai ma rieng trong CSDL: no la hop dong dich vu, dung ma `cong_tac_vien` (cung nhom
// khong huong phu cap khoi voi `thoi_vu` — xem luong/ky_luong.ts).
import { LoiDauVao } from '../tien_ich/kiem_tra.ts';

/** Cac ma hop dong duoc phep chon khi tao ho so (khop CHECK cua hop_dong_lao_dong). */
export const LOAI_HOP_DONG_KHOI_TAO = [
  'hoc_viec', 'cong_tac_vien', 'thu_viec', 'xac_dinh', 'khong_xac_dinh',
] as const;
export type LoaiHopDongKhoiTao = (typeof LOAI_HOP_DONG_KHOI_TAO)[number];

/** Ky han hop dong chinh thuc duoc chon tren form (thang). */
export const KY_HAN_CHINH_THUC = [6, 12] as const;

/** Nhan tieng Viet dua vao checklist nhap viec + phan hoi. */
export function nhan_hop_dong(
  loai: LoaiHopDongKhoiTao | null, thoi_han_thang: number | null,
): string | null {
  if (loai === null) return null;
  switch (loai) {
    case 'hoc_viec': return 'Học việc';
    case 'cong_tac_vien': return 'Outsource (cộng tác viên)';
    case 'thu_viec': return 'Thử việc';
    case 'xac_dinh':
      return thoi_han_thang === 12
        ? 'Chính thức 1 năm'
        : `Chính thức ${String(thoi_han_thang ?? 6)} tháng`;
    case 'khong_xac_dinh': return 'Chính thức — không xác định kì hạn';
  }
}

/**
 * Chan cau hinh thieu: hop dong chinh thuc BAT BUOC co ki han 6 thang hoac 1 nam.
 *
 * Khong nhan ky han khac vi yeu cau 26/10/2026 chot dung hai moc nay (6 thang / 1 nam); muon
 * them moc thi sua `KY_HAN_CHINH_THUC` va bo test tuong ung.
 */
export function kiem_hop_dong_khoi_tao(
  loai: LoaiHopDongKhoiTao | null, thoi_han_thang: number | null,
): void {
  if (loai !== 'xac_dinh') return;
  if (thoi_han_thang === null || !(KY_HAN_CHINH_THUC as readonly number[]).includes(thoi_han_thang)) {
    throw new LoiDauVao('Hợp đồng chính thức cần chọn kì hạn 6 tháng hoặc 1 năm.');
  }
}

/** Ngay (YYYY-MM-DD) + so thang, lui 1 ngay; cuoi thang khong ton tai thi lay ngay cuoi thang. */
function cong_thang_lui_mot_ngay(tu_ngay: string, so_thang: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tu_ngay);
  if (m === null) throw new LoiDauVao(`Ngày không hợp lệ: ${tu_ngay}`);
  const nam = Number(m[1]);
  const thang = Number(m[2]);
  const ngay = Number(m[3]);
  const chi_so = thang - 1 + so_thang;
  const nam_dich = nam + Math.floor(chi_so / 12);
  const thang_dich = ((chi_so % 12) + 12) % 12;
  const ngay_cuoi = new Date(Date.UTC(nam_dich, thang_dich + 1, 0)).getUTCDate();
  if (ngay > ngay_cuoi) {
    // 31/08 + 6 thang -> thang 2 khong co ngay 31: dung ngay cuoi thang (28/02 hoac 29/02).
    return new Date(Date.UTC(nam_dich, thang_dich, ngay_cuoi)).toISOString().slice(0, 10);
  }
  const den = new Date(Date.UTC(nam_dich, thang_dich, ngay));
  den.setUTCDate(den.getUTCDate() - 1);
  return den.toISOString().slice(0, 10);
}

/**
 * `hieu_luc_den` cua hop dong tao kem ho so:
 *   - xac_dinh: ngay vao + 6/12 thang - 1 ngay (ngay lam viec cuoi cung);
 *   - khong_xac_dinh / thu_viec / hoc_viec / outsource: null (khong dat han).
 */
export function ngay_het_han(
  tu_ngay: string, loai: LoaiHopDongKhoiTao, thoi_han_thang: number | null,
): string | null {
  if (loai !== 'xac_dinh') return null;
  kiem_hop_dong_khoi_tao(loai, thoi_han_thang);
  return cong_thang_lui_mot_ngay(tu_ngay, thoi_han_thang as number);
}
