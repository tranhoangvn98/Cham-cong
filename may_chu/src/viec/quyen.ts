// Quyen va nguon cua module cong viec.
//
// Thu tu uu tien nguon do nguoi dung chot: Giám đốc giao > hệ thống > trưởng phòng >
// liên phòng > tự tạo. `ho_so` la di san cua tab ho so nhan su — xep cuoi cung.
//
// Vai tro so sanh QUA helper o bao_mat/quyen_ho_so.ts (mot cho duy nhat) — gate test
// cam so sanh chuoi vai tro ngoai module do.
import {
  la_nguoi_duyet, la_quan_tri, la_vai_tro_nhan_su,
} from '../bao_mat/quyen_ho_so.ts';

export { la_vai_tro_nhan_su };

export const CAC_NGUON = ['giam_doc', 'he_thong', 'truong_phong', 'lien_phong', 'tu_tao'] as const;
export type NguonViec = typeof CAC_NGUON[number];

/** Thu tu uu tien de sap xep: so nho = uu tien cao. */
export const THU_TU_NGUON: Record<string, number> = {
  giam_doc: 0,
  he_thong: 1,
  truong_phong: 2,
  lien_phong: 3,
  tu_tao: 4,
  ho_so: 5,
};

/** Nguoi dang xem — lay tu token. */
export interface NguoiXem {
  /** id nguoi_dung */
  sub: string;
  vai_tro: string;
  /** id nhan_vien gan voi tai khoan (null voi tai khoan khong phai nhan vien) */
  nv: string | null;
}

/** true neu vai tro thuoc nhom nhan su (xem duoc tat ca) — khop can_nhan_su cua may chu. */
export function nguon_khi_giao(vai_tro: string, cung_phong: boolean): NguonViec {
  // Giám đốc = admin: uu tien cao nhat.
  if (la_quan_tri(vai_tro)) return 'giam_doc';
  // Nhan su cac cap + truong phong: cung phong thi truong_phong, khac phong thi lien_phong.
  if (la_nguoi_duyet(vai_tro)) {
    return cung_phong ? 'truong_phong' : 'lien_phong';
  }
  return 'tu_tao';
}

/** Ai duoc giao viec cho ai. */
export type PhamViGiao = 'moi_nguoi' | 'chi_minh';

export function pham_vi_giao(nd: NguoiXem): PhamViGiao {
  if (la_nguoi_duyet(nd.vai_tro)) return 'moi_nguoi';
  return 'chi_minh';
}

/** Pham vi DOC danh sach viec: tat ca / phong minh / cua minh. */
export type PhamViDoc = 'tat_ca' | 'phong_minh' | 'cua_minh';

export function pham_vi_doc(nd: NguoiXem): PhamViDoc {
  if (la_vai_tro_nhan_su(nd.vai_tro)) return 'tat_ca';
  if (nd.vai_tro === 'truong_phong') return 'phong_minh';
  return 'cua_minh';
}

/**
 * Khoa SQL cho pham vi doc. Dung trong cau `where` cua truy van — nhan vien chi thay
 * viec cua minh (nhan hay giao), truong phong thay ca viec cua nguoi trong phong minh.
 *
 * Tham so $1 = id nhan vien cua nguoi dang xem (null = tai khoan khong phai nhan vien),
 * $2 = id nguoi_dung cua nguoi dang xem.
 */
export function khoa_pham_vi_doc(pv: PhamViDoc): string {
  if (pv === 'tat_ca') return 'true';
  if (pv === 'cua_minh') {
    return `(v.nhan_vien_id = $1 or v.giao_boi = $2)`;
  }
  return `(
    v.nhan_vien_id = $1
    or v.giao_boi = $2
    or v.nhan_vien_id in (
      select nv2.id from nhan_vien nv2
       where nv2.phong_ban_id in (
         select pb.id from phong_ban pb where pb.truong_phong_id = $1
       )
    )
  )`;
}

/** Ai duoc DUYET (xac nhan hoan thanh / tu choi) mot viec. */
export function duoc_duyet(nd: NguoiXem, giao_boi: string | null): boolean {
  if (la_vai_tro_nhan_su(nd.vai_tro)) return true;
  return giao_boi !== null && giao_boi === nd.sub;
}
