// Che mot phan du lieu ca nhan truoc khi tra ra ngoai.
//
// Nghi dinh 13/2023/ND-CP xep CCCD, ma so thue, so BHXH, so tai khoan vao du lieu ca nhan;
// rieng thong tin suc khoe la du lieu ca nhan NHAY CAM. Nguyen tac o day: chi tra ban day
// du cho nguoi thuc su can, con lai tra ban da che — va viec che phai lam o MAY CHU chu
// khong phai o giao dien.
//
// Che o giao dien la che gia: du lieu day du van di qua duong truyen, van nam trong bo nho
// trinh duyet, van hien ra trong tab Network. Ai mo cong cu phat trien cung doc duoc.

/**
 * Giu `so_dau` ky tu dau va `so_cuoi` ky tu cuoi, phan giua thay bang dau cham.
 *
 * Van de nhan ra duoc ban ghi (doi chieu voi giay to trong tay) ma khong doc duoc tron ven.
 */
/** Che it hon ngan nay ky tu thi coi nhu khong che. */
const CHE_TOI_THIEU = 4;

export function che_giua(gia_tri: string | null, so_dau = 0, so_cuoi = 4): string | null {
  if (gia_tri === null) return null;
  const s = gia_tri.trim();
  if (s === '') return null;

  // Chuoi ngan thi che HET. Khong du de che cho tu te thi che nua vo nghia: mot chuoi 5 ky
  // tu giu 4 ky tu cuoi la giau duoc dung 1 ky tu, doan ra ngay. Che luon ca do dai de
  // khong lo them manh moi nao.
  const so_che = s.length - so_dau - so_cuoi;
  if (so_che < CHE_TOI_THIEU) return '•'.repeat(Math.max(s.length, CHE_TOI_THIEU));

  return s.slice(0, so_dau) + '•'.repeat(so_che) + s.slice(s.length - so_cuoi);
}

/** So dien thoai: giu dau so va 3 so cuoi — du de goi doi chieu, khong du de dung. */
export function che_dien_thoai(sdt: string | null): string | null {
  return che_giua(sdt, 3, 3);
}

/** Email: giu ky tu dau cua hop thu va nguyen ten mien. */
export function che_email(email: string | null): string | null {
  if (email === null) return null;
  const s = email.trim();
  const cho = s.indexOf('@');
  if (cho <= 0) return che_giua(s, 1, 0);
  const hop = s.slice(0, cho);
  const mien = s.slice(cho);
  return (hop[0] ?? '') + '•'.repeat(Math.max(hop.length - 1, 2)) + mien;
}

/**
 * Nhung truong bi che, va che theo kieu nao.
 *
 * Dia chi va thong tin suc khoe khong che tung phan ma BO HAN: che nua dia chi thi van
 * doan ra duoc, con ket luan suc khoe thi khong co "mot phan" nao vo hai ca.
 */
const CACH_CHE: Record<string, (v: string | null) => string | null> = {
  cccd_so: (v) => che_giua(v, 0, 4),
  ma_so_thue: (v) => che_giua(v, 0, 3),
  so_bhxh: (v) => che_giua(v, 0, 4),
  so_the_bhyt: (v) => che_giua(v, 0, 4),
  so_tai_khoan: (v) => che_giua(v, 0, 4),
  lien_he_khan_sdt: che_dien_thoai,
  dia_chi_thuong_tru: (v) => (v === null || v.trim() === '' ? null : '(đã ẩn)'),
  dia_chi_hien_tai: (v) => (v === null || v.trim() === '' ? null : '(đã ẩn)'),
  kham_suc_khoe_ket_luan: (v) => (v === null || v.trim() === '' ? null : '(đã ẩn)'),
};

/** Ten cac truong duoc coi la du lieu ca nhan — dung de ghi nhat ky va de kiem thu. */
export const TRUONG_NHAY_CAM = Object.keys(CACH_CHE);

/**
 * Tra ve ban sao da che nhung truong nhay cam.
 *
 * `day_du = true` thi tra nguyen ban — nhung nguoi goi PHAI ghi nhat ky truy cap truoc,
 * xem `tuyen/ho_so.ts`.
 */
export function che_ho_so(
  ho_so: Record<string, unknown> | null,
  day_du: boolean,
): Record<string, unknown> | null {
  if (ho_so === null) return null;
  if (day_du) return { ...ho_so, da_che: false };

  const ra: Record<string, unknown> = { ...ho_so, da_che: true };
  for (const [khoa, che] of Object.entries(CACH_CHE)) {
    if (!(khoa in ra)) continue;
    const v = ra[khoa];
    ra[khoa] = v === null || v === undefined ? null : che(String(v));
  }
  return ra;
}

/**
 * Ai duoc xem ban day du.
 *
 * Nhan su va admin: duoc, vi ho la nguoi lam thu tuc bao hiem va thue.
 * Chinh chu: duoc — do la du lieu cua chinh ho.
 * Truong phong: KHONG, ke ca cap duoi minh. Quan ly truc tiep khong can so CCCD hay so tai
 * khoan cua nhan vien de lam viec; co nhu cau that thi hoi nhan su.
 */
export function duoc_xem_day_du(
  nd: { vai_tro: string; nv: string | null },
  nhan_vien_id: string,
): boolean {
  if (nd.vai_tro === 'admin' || nd.vai_tro === 'nhan_su') return true;
  return nd.nv !== null && nd.nv === nhan_vien_id;
}
