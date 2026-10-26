// Doc loi 409 "email da thuoc ho so khac" thanh du lieu giao dien dung duoc.
//
// Vi sao co tep nay: thong diep loi la cau chu, con giao dien can biet MO HO SO NAO. Truoc
// 27/10/2026 giao dien do chuoi thong diep roi dua ra nut "Cap lai mat khau" — nhung cap lai
// mat khau khong lam ho so tao duoc, vi ho so DA TON TAI (email la duy nhat). Nguoi dung bam
// cap lai mat khau, lay duoc mat khau, roi van khong luu duoc ho so.
//
// May chu moi tra kem `chi_tiet` (ma + nhan_vien_id). May chu cu chi co chuoi — van doc duoc
// ten nguoi de noi ro, chi la khong co nut mo ho so.

export interface HoSoTrung {
  /** Rong khi may chu la ban cu (chi co thong diep, khong co ma ho so). */
  id: string;
  ma_nv: string;
  ho_ten: string;
  dang_hoat_dong: boolean;
}

/** Ma nay phai khop `MA_LOI_EMAIL_DA_CO_HO_SO` trong may_chu/src/nhan_su/loi_ho_so.ts. */
export const MA_LOI_EMAIL_DA_CO_HO_SO = 'email_da_co_ho_so';

/**
 * Doc ho so dang trung tu loi tra ve. `null` = loi khac, hoac khong phai loi trung email.
 *
 * Nhan ca dang chuoi cu "Email X đã thuộc Y — không thể tạo tài khoản Microsoft trùng." de ban
 * web dang mo trong tab cu (chua tai lai) van hien duoc loi de hieu.
 */
export function ho_so_trung_tu_loi(loi: unknown): HoSoTrung | null {
  if (loi === null || loi === undefined) return null;
  const ban_ghi = loi as { message?: unknown; chi_tiet?: unknown };

  const ct = ban_ghi.chi_tiet as {
    ma?: unknown; nhan_vien_id?: unknown; ma_nv?: unknown; ho_ten?: unknown;
    dang_hoat_dong?: unknown;
  } | null | undefined;
  if (ct !== null && ct !== undefined && ct.ma === MA_LOI_EMAIL_DA_CO_HO_SO
    && typeof ct.nhan_vien_id === 'string' && ct.nhan_vien_id !== '') {
    return {
      id: ct.nhan_vien_id,
      ma_nv: typeof ct.ma_nv === 'string' ? ct.ma_nv : '',
      ho_ten: typeof ct.ho_ten === 'string' ? ct.ho_ten : '',
      dang_hoat_dong: ct.dang_hoat_dong !== false,
    };
  }

  const thong_diep = typeof ban_ghi.message === 'string' ? ban_ghi.message : '';
  // Dang chuoi CU (may chu chua cap nhat, hoac tab web mo tu truoc): chi doc duoc TEN nguoi,
  // khong co ma ho so nen khong ve nut mo ho so.
  const cu = /đã thuộc (.+?) — không thể tạo tài khoản Microsoft trùng\./.exec(thong_diep);
  if (cu !== null) {
    return { id: '', ma_nv: '', ho_ten: (cu[1] ?? '').trim(), dang_hoat_dong: true };
  }
  return null;
}
