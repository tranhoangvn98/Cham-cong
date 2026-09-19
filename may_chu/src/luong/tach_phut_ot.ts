// Tach phut OT theo LOAI NGAY de tinh tien voi he so rieng: ngay thuong / nghi hang tuan
// (Chu nhat) / ngay le. Ham THUAN, khong CSDL — cung ly do voi `tinh_luong.ts`: day la cho
// sai thi mat tien that, nen tach ra de kiem duoc bang so cu the.
//
// Quy tac (chu cong ty chot 17/09/2026 — ap CHUNG cho moi nhom nhan su, khong co ngoai le
// nao khac ngoai he so cua khoi da duyet trong bang `khoi`):
//   - Ngay LE theo LICH NGHI cua chinh nguoi do (vn/tq...) -> he so le (300%). Le trung Chu
//     nhat thi le THANG (nguoi lam ngay le huong muc le, khong xuong muc nghi tuan).
//   - Chu nhat -> he so nghi hang tuan (200%).
//   - Cac ngay con lai (ke ca thu Bay lam viec) -> he so ngay thuong (150%, khoi kho 100%).
import { thu_trong_tuan } from '../tien_ich/thoi_gian.ts';

/** Mot ngay co ghi nhan OT trong ky. `ngay` dang 'YYYY-MM-DD'. */
export interface NgayOt {
  ngay: string;
  phut_ot: number;
}

export interface PhutOtTheoLoai {
  thuong: number;
  nghi_tuan: number;
  le: number;
}

export function tach_phut_ot(ds: readonly NgayOt[], le: ReadonlySet<string>): PhutOtTheoLoai {
  let thuong = 0;
  let nghi_tuan = 0;
  let le_ = 0;
  for (const d of ds) {
    const phut = Math.max(0, d.phut_ot);
    if (le.has(d.ngay)) {
      le_ += phut;
    } else if (thu_trong_tuan(d.ngay) === 0) {
      nghi_tuan += phut;
    } else {
      thuong += phut;
    }
  }
  return { thuong, nghi_tuan, le: le_ };
}
