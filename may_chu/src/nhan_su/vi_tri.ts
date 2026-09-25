// Vi tri (bac) nhan vien — 7 muc chon san khi tao ho so. Vai tro tai khoan he thong
// (nguoi_dung) duoc suy tu vi tri nay de he thong tu phan quyen, HR khong phai chon tay.

export interface ViTri {
  ma: string;
  ten: string;
}

/** Bay bac vi tri theo quyet dinh cua cong ty. Ma nam trong CHECK cua bang nhan_vien. */
export const CAC_VI_TRI: readonly ViTri[] = [
  { ma: 'tong_giam_doc', ten: 'Tổng Giám Đốc' },
  { ma: 'giam_doc', ten: 'Giám đốc' },
  { ma: 'truong_phong', ten: 'Trưởng phòng' },
  { ma: 'truong_nhom', ten: 'Trưởng nhóm (Leader/Chuyên viên)' },
  { ma: 'nhan_vien', ten: 'Nhân viên' },
  { ma: 'thu_viec', ten: 'Thử việc' },
  { ma: 'hoc_viec', ten: 'Học việc (Thực tập sinh)' },
];

/** Ma vi tri dung de kiem dau vao API (trong_tap). */
export const MA_VI_TRI: readonly string[] = CAC_VI_TRI.map((v) => v.ma);

/** Ten hien thi cua mot ma vi tri; khong co thi tra chuoi rong. */
export function ten_vi_tri(ma: string | null): string {
  if (ma === null) return '';
  return CAC_VI_TRI.find((v) => v.ma === ma)?.ten ?? ma;
}

/**
 * Vai tro tai khoan he thong suy tu vi tri.
 *
 * Quy tac chu cong ty chot:
 *   - Tong Giam Doc / Giam doc -> `nhan_su` (quan tri cham cong toan cong ty);
 *   - Truong phong -> `truong_phong` (xem va duyet don cua phong minh);
 *   - Con lai (truong nhom, nhan vien, thu viec, hoc viec) -> `nhan_vien`.
 */
export function vai_tro_theo_vi_tri(
  vi_tri: string | null,
): 'nhan_su' | 'truong_phong' | 'nhan_vien' {
  if (vi_tri === 'tong_giam_doc' || vi_tri === 'giam_doc') return 'nhan_su';
  if (vi_tri === 'truong_phong') return 'truong_phong';
  return 'nhan_vien';
}

/**
 * Ten dang nhap goi y tu ma nhan vien: ha ve chu thuong, giu lai chu thuong khong
 * dau, so va dau . _ -. Cung quy tac voi form tao tai khoan thu cong.
 */
export function sinh_ten_dang_nhap(ma_nv: string): string {
  return ma_nv.toLowerCase().replace(/[^a-z0-9._-]/g, '');
}
