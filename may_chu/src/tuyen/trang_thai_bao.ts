// Suy trang thai "da xu ly / chua xu ly" cua mot thong bao rieng tu doi tuong nghiep vu ma
// no gan (don, khieu nai, vi pham, ho so ky luat...).
//
// Vi sao suy LIVE thay vi luu cot trang thai: thong bao la anh chup cua mot viec. Don co the
// duoc duyet 5 phut sau khi thong bao sinh ra; luu cot thi phai cham vao MOI route quyet dinh
// de cap nhat, quen mot route la lech. Suy live thi chuong bao LUON dung voi nghiep vu.
//
// Tep nay la ham THUAN (khong cham CSDL) — test don vi chay duoc trong docker build.

export const NHAN_TRANG_THAI: Record<string, string> = {
  cho_duyet: 'Chờ duyệt',
  cho_duyet_2: 'Chờ duyệt cấp 2',
  da_duyet: 'Đã duyệt',
  tu_choi: 'Đã từ chối',
  da_huy: 'Đã hủy',
  moi: 'Chờ xử lý',
  dang_xem: 'Đang xem xét',
  chap_nhan: 'Đã chấp nhận',
  da_nhac: 'Đã nhắc',
  da_ap_dung: 'Đã áp dụng',
  bac_bo: 'Đã bác bỏ',
  mien: 'Đã miễn',
  da_xac_nhan: 'Đã xác nhận',
  da_xu_ly: 'Đã xử lý',
  cho_giai_trinh: 'Chờ giải trình',
};

/** Trang thai con cho nguoi dung hanh dong — giao dien hien nhan "chua xu ly" mau cam. */
const CON_XU_LY = new Set(['cho_duyet', 'cho_duyet_2', 'moi', 'dang_xem', 'cho_giai_trinh']);

export function con_xu_ly(trang_thai: string | null): boolean {
  return trang_thai !== null && CON_XU_LY.has(trang_thai);
}

export interface DoiTuongTruy {
  /** Ten bang trong CSDL (danh sach dong trong file nay — khong phai dau vao nguoi dung). */
  bang: string;
  id: string;
}

/** Lay id thong bao cong ty (man 'thong-bao') de xu ly rieng theo nguoi doc. */
export function thong_bao_cong_ty_id(du_lieu: unknown): string | null {
  if (typeof du_lieu !== 'object' || du_lieu === null) return null;
  const d = du_lieu as Record<string, unknown>;
  if (d['man'] !== 'thong-bao') return null;
  return typeof d['thong_bao_id'] === 'string' && d['thong_bao_id'] !== ''
    ? d['thong_bao_id']
    : null;
}

/**
 * Tu du_lieu jsonb cua thong bao -> doi tuong de tra trang thai, hoac null (thuần tin).
 *
 * Ban do `man`/`loai` lay tu kiem ke moi diem goi gui_ngam (xem su_kien/thong_bao_day.ts va cac
 * tuyen): duyet-don/don-tu/duyet-ot -> don theo loai; duyet-ket-qua-ot -> ket_qua_ot;
 * ky-luat -> khieu nai ky luat HOAC ho so ky luat; vi-pham -> vi_pham;
 * khieu-nai-luong -> khieu nai luong; don-cua-toi -> de xuat.
 * 'ho_so' (hop dong het han) va 'ra-vao' (nhac nho) la thuần tin -> null.
 */
export function doi_tuong_truy(du_lieu: unknown): DoiTuongTruy | null {
  if (typeof du_lieu !== 'object' || du_lieu === null) return null;
  const d = du_lieu as Record<string, unknown>;
  const man = typeof d['man'] === 'string' ? d['man'] : '';
  const id = (k: string): string | null =>
    typeof d[k] === 'string' && d[k] !== '' ? (d[k] as string) : null;
  const loai = typeof d['loai'] === 'string' ? d['loai'] : '';

  const don_theo_loai = (): DoiTuongTruy | null => {
    const dx = id('de_xuat_id');
    if (dx !== null) return { bang: 'de_xuat', id: dx };
    const don_id = id('don_id');
    if (don_id === null) return null;
    if (loai === 'nghi_phep') return { bang: 'don_nghi_phep', id: don_id };
    if (loai === 'giai_trinh') return { bang: 'don_giai_trinh', id: don_id };
    // lam_them, doi_ca, cong_tac, thoi_viec, di_muon — cung mot bang don_tu.
    return { bang: 'don_tu', id: don_id };
  };

  switch (man) {
    case 'duyet-don':
    case 'don-tu':
    case 'duyet-ot':
      return don_theo_loai();
    case 'duyet-ket-qua-ot': {
      const kq = id('ket_qua_id');
      return kq === null ? null : { bang: 'ket_qua_ot', id: kq };
    }
    case 'ky-luat': {
      const kn = id('khieu_nai_id');
      if (kn !== null) return { bang: 'khieu_nai_ky_luat', id: kn };
      const hs = id('ho_so_id');
      if (hs !== null) return { bang: 'ho_so_ky_luat', id: hs };
      return null; // chi co ky: nhac nho / giam thuong — thuần tin.
    }
    case 'vi-pham': {
      const vp = id('vi_pham_id');
      return vp === null ? null : { bang: 'vi_pham', id: vp };
    }
    case 'khieu-nai-luong': {
      const kn = id('khieu_nai_id');
      return kn === null ? null : { bang: 'khieu_nai_luong', id: kn };
    }
    case 'don-cua-toi': {
      const dx = id('de_xuat_id');
      return dx === null ? null : { bang: 'de_xuat', id: dx };
    }
    default:
      return null;
  }
}
