// Cac KHOAN cua mot phieu luong: phu cap, ho tro, cac khoan tru.
//
// Ham THUAN, khong CSDL — cung ly do nhu `tinh_luong.ts`: day la cho sai thi mat tien that.
//
// Bang luong that cua cong ty co 9 khoan thu nhap va 5 khoan tru, va danh sach do doi gan
// nhu hang thang. Nen chung khong phai cot trong `phieu_luong` ma la DONG trong
// `phieu_luong_khoan`, moi dong tro ve mot dong danh muc `khoan_luong`.

/** Cach ra so tien cua mot khoan. Khop voi rang buoc `khoan_luong.cach_tinh`. */
export type CachTinhKhoan = 'nhap_tay' | 'so_luong_x_don_gia' | 'nua_ngay_luong';

export type LoaiKhoan = 'thu_nhap' | 'tru';

/** Mot dong khoan cua mot phieu, da gop voi dac ta trong danh muc. */
export interface KhoanDauVao {
  ma: string;
  loai: LoaiKhoan;
  cach_tinh: CachTinhKhoan;
  /** Don gia rieng cua dong nay; khong co thi lay don gia danh muc. */
  don_gia: number | null;
  /** Don gia mac dinh trong danh muc `khoan_luong`. */
  don_gia_danh_muc: number | null;
  chiu_thue: boolean;
  so_luong: number | null;
  /** Chi dung khi `cach_tinh = 'nhap_tay'`. */
  so_tien: number | null;
}

export interface KhoanKetQua {
  ma: string;
  loai: LoaiKhoan;
  so_luong: number | null;
  /** Don gia DA CHOT cho dong nay — ghi vao phieu de sau nay doi chieu duoc. */
  don_gia: number | null;
  thanh_tien: number;
  chiu_thue: boolean;
}

export interface TongKhoan {
  dong: KhoanKetQua[];
  /** Tong cac khoan thu nhap (ca chiu thue lan mien thue). */
  thu_nhap: number;
  /** Phan thu nhap KHONG chiu thue TNCN. */
  thu_nhap_mien_thue: number;
  /** Tong cac khoan tru. */
  tru: number;
}

/** Lam tron ve DONG — tien Viet khong co don vi nho hon dong. */
function dong_tien(n: number): number {
  return Math.round(n);
}

/**
 * So tien cua MOT khoan.
 *
 * `luong_ngay` la luong mot ngay cong cua chinh nguoi do, chi dung cho `nua_ngay_luong`.
 * Truyen 0 thi khoan do ra 0 — khong doan, khong lay mot con so khac thay the.
 */
export function tinh_mot_khoan(k: KhoanDauVao, luong_ngay: number): KhoanKetQua {
  const don_gia = k.don_gia ?? k.don_gia_danh_muc;
  const so_luong = k.so_luong;

  let thanh_tien = 0;
  let don_gia_chot: number | null = don_gia;

  switch (k.cach_tinh) {
    case 'nhap_tay':
      thanh_tien = dong_tien(k.so_tien ?? 0);
      don_gia_chot = null;
      break;

    case 'so_luong_x_don_gia':
      thanh_tien = dong_tien((so_luong ?? 0) * (don_gia ?? 0));
      break;

    case 'nua_ngay_luong':
      // Nua ngay luong CUA CHINH NGUOI DO, khong phai mot don gia chung: hai nguoi di muon
      // cung so lan ma luong khac nhau thi so tien phai khac nhau.
      don_gia_chot = dong_tien(luong_ngay / 2);
      thanh_tien = dong_tien((so_luong ?? 0) * (luong_ngay / 2));
      break;
  }

  // Mot khoan khong bao gio am. Khoan TRU la so duong o cot tru — dau am o day se lam mot
  // khoan tru bien thanh mot khoan cong, im lang.
  if (thanh_tien < 0) thanh_tien = 0;

  return {
    ma: k.ma,
    loai: k.loai,
    so_luong,
    don_gia: don_gia_chot,
    thanh_tien,
    chiu_thue: k.chiu_thue,
  };
}

/** Tinh ca danh sach khoan va cong tong theo tung nhom. */
export function tinh_cac_khoan(ds: readonly KhoanDauVao[], luong_ngay: number): TongKhoan {
  const dong = ds.map((k) => tinh_mot_khoan(k, luong_ngay));

  let thu_nhap = 0;
  let thu_nhap_mien_thue = 0;
  let tru = 0;

  for (const d of dong) {
    if (d.loai === 'tru') {
      tru += d.thanh_tien;
    } else {
      thu_nhap += d.thanh_tien;
      if (!d.chiu_thue) thu_nhap_mien_thue += d.thanh_tien;
    }
  }

  return { dong, thu_nhap, thu_nhap_mien_thue, tru };
}
