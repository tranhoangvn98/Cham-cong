// Doi chinh sach phu cap cua mot nguoi thanh cac DONG KHOAN cua mot ky.
//
// Ham THUAN, khong CSDL — de kiem duoc bang so cu the. Day la cho quyet dinh mot nguoi thang
// nay nhan bao nhieu, nen no phai kiem duoc rieng.

/** Mot dong chinh sach dang hieu luc, da gop voi dac ta khoan trong danh muc. */
export interface DongChinhSach {
  khoan_ma: string;
  /** Cach tinh cua khoan trong danh muc. */
  cach_tinh: 'nhap_tay' | 'so_luong_x_don_gia' | 'nua_ngay_luong';
  nguon_so_luong: 'co_dinh' | 'theo_cong';
  so_luong: number | null;
  so_tien: number | null;
  don_gia: number | null;
}

/** So lieu cua ky, dung cho cac nguon so luong tu dong. */
export interface SoLieuKy {
  /** So ngay cong THUC TE cua nguoi do trong ky. */
  so_cong: number;
}

/** Mot dong khoan sap ghi vao `phieu_luong_khoan`. */
export interface DongKhoanSinhRa {
  khoan_ma: string;
  so_luong: number | null;
  don_gia: number | null;
  /** Chi co nghia voi khoan `nhap_tay`. */
  so_tien: number;
}

/**
 * Sinh cac dong khoan tu chinh sach.
 *
 * `da_go_tay` la cac khoan nguoi dung DA nhap tay cho ky nay. Chinh sach KHONG sinh dong cho
 * nhung khoan do: ghi de la ghi de, khong phai cong don. De sinh them mot dong nua thi thang
 * nay nguoi ta nhan hai lan cung mot khoan ma khong ai co y do.
 */
export function khoan_tu_chinh_sach(
  chinh_sach: readonly DongChinhSach[],
  so_lieu: SoLieuKy,
  da_go_tay: ReadonlySet<string>,
): DongKhoanSinhRa[] {
  const ra: DongKhoanSinhRa[] = [];

  for (const cs of chinh_sach) {
    if (da_go_tay.has(cs.khoan_ma)) continue;

    if (cs.cach_tinh === 'nhap_tay') {
      // Khoan go thang so tien: chinh sach phai noi so tien la bao nhieu. Khong noi thi
      // khong sinh dong — mot dong 0 dong tren bang luong chi lam nhieu bang.
      if (cs.so_tien === null || cs.so_tien <= 0) continue;
      ra.push({ khoan_ma: cs.khoan_ma, so_luong: null, don_gia: null, so_tien: cs.so_tien });
      continue;
    }

    const so_luong = cs.nguon_so_luong === 'theo_cong'
      ? so_lieu.so_cong
      : (cs.so_luong ?? 0);

    // Khong di lam ngay nao thi khong co ho tro an trua nao — va khong de lai mot dong 0.
    if (so_luong <= 0) continue;

    ra.push({
      khoan_ma: cs.khoan_ma,
      so_luong,
      // De trong thi bo tinh lay don gia danh muc; dien thi day la muc rieng cua nguoi nay.
      don_gia: cs.don_gia,
      so_tien: 0,
    });
  }

  return ra;
}

/**
 * Chinh sach nao con hieu luc trong khoang [tu, den] cua ky.
 *
 * Mot chinh sach ap dung cho ky neu no BAT DAU truoc khi ky ket thuc va CHUA DONG truoc khi ky
 * bat dau — tuc hai khoang co giao nhau. Lay ngay ky bat dau lam moc la sai voi nguoi vao lam
 * giua thang.
 */
export function con_hieu_luc(
  cs: { hieu_luc_tu: string; hieu_luc_den: string | null },
  tu: string,
  den: string,
): boolean {
  if (cs.hieu_luc_tu > den) return false;
  if (cs.hieu_luc_den !== null && cs.hieu_luc_den < tu) return false;
  return true;
}
