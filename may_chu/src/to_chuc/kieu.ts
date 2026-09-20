// Kieu du lieu cua module to chuc – vi tri – trach nhiem.
// Cac kieu doc tu CSDL tra cho giao dien (web / app).

/** Cap bac vi tri theo file JD. */
export type CapBac = 'cap_cao' | 'truong_phong' | 'truong_nhom' | 'chuyen_vien' | 'nhan_vien';

/** Tan suat chuan hoa cua dau viec (cot dau_viec.tan_suat). */
export type TanSuat =
  | 'hang_ngay' | 'hang_tuan' | 'hai_tuan' | 'hang_thang' | 'hang_quy'
  | 'hang_nam' | '6_thang' | 'phat_sinh' | 'lien_tuc';

/** Vai tro RACI. */
export type VaiTroRaci = 'R' | 'A' | 'C' | 'I';

/** Nguoi o RACI theo file JD (vai tro chuc danh, khong phai ten nguoi). */
export type KieuNguoiRaci = 'ceo' | 'tp' | 'tn' | 'nv_cv' | 'tbks';

export interface DongViTri {
  id: string;
  ma: string;
  ten: string;
  cap_bac: CapBac;
  pham_vi: 'cu_the' | 'toan_cong_ty' | 'moi_phong';
  phong_ban_id: string | null;
  ten_phong_ban: string | null;
  mo_ta: string | null;
  dang_hoat_dong: boolean;
  so_dau_viec: number;
  so_nguoi_gui: number;
}

export interface DongNhom {
  id: string;
  ma: string;
  ten: string;
  so_task: number;
}

export interface DongTn {
  id: string;
  nhom_id: string;
  ma: string | null;
  ten: string;
  nguoi_quan_tri_vi_tri_id: string | null;
  ten_nguoi_quan_tri: string | null;
  so_task: number;
}

export interface DongRaci {
  vai_tro: VaiTroRaci;
  kieu_nguoi: KieuNguoiRaci;
}

export interface DongBuoc {
  id: string;
  ten: string;
  mo_ta: string | null;
  thu_tu: number;
}

export interface DongDauViec {
  id: string;
  vi_tri_id: string;
  ten_vi_tri: string | null;
  ten: string;
  mo_ta: string | null;
  nhom_id: string;
  ten_nhom: string | null;
  tn_chi_tiet_id: string | null;
  ten_tn: string | null;
  phong_ban_id: string | null;
  ten_phong_ban: string | null;
  input: string | null;
  output: string | null;
  kpi: string | null;
  co_bc: boolean;
  ma_bc: string | null;
  trang_thai_ma_bc: 'de_xuat' | 'chuan' | null;
  tan_suat: TanSuat;
  tan_suat_tho: string | null;
  sla: string | null;
  phan_cap_xu_ly: string | null;
  muc_do_quan_trong: 'cao' | 'rat_cao' | 'trung_binh';
  ghi_chu: string | null;
  dang_bat: boolean;
  raci: DongRaci[];
  buoc: DongBuoc[];
}

export interface DongBaoCaoMau {
  id: string;
  ma: string;
  ten: string | null;
  trang_thai: 'de_xuat' | 'chuan';
  so_dau_viec: number;
}
