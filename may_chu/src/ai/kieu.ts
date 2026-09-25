// Hop dong kieu du lieu cho module van ban AI (thong bao cong ty theo ND 30/2020/ND-CP).
//
// Day la ranh gioi giua cac module DOC LAP: moi module chi trao doi qua cac kieu nay.
// Quy tac:
//   - AI chi sinh VAN XUOI (VanXuatAI), khong sinh truong he thong.
//   - Code ghep van xuoi voi truong he thong thanh SpecVanBan.
//   - Bo sinh docx chi nhan SpecVanBan, tra Buffer.
//   - Gate doc SpecVanBan + tep docx, tra danh sach KetQuaGate.
//
// Module thuoc may_chu/src/ai/ KHONG duoc import csdl/, bao_mat/, su_kien/, tuyen/ —
// moi phu thuoc ngoai truyen qua tham so (GoiLlm, BoSinhDocx).

/** Loai van ban. Cong van theo ND30 KHONG in ten loai tren van ban. */
export type KieuVanBan = 'thong_bao' | 'quyet_dinh' | 'cong_van';

/** Pham vi nguoi nhan. */
export type PhamViNhan = 'ca_nhan' | 'phong_ban' | 'toan_cong_ty';

/** Quan he ban hanh -> nhan: noi bo (nhan vien) hay doi ngoai (co quan/doi tac). */
export type QuanHe = 'noi_bo' | 'doi_ngoai';

export type MucDo = 'thuong' | 'quan_trong' | 'khan';

/** Muc dich van ban — nguoi tao chon tren form, dung de dinh huong giong cho AI. */
export type MucDich = 'nhac_nho' | 'yeu_cau' | 'pho_bien' | 'moi_hop' | 'phoi_hop';

/** Trang thai vong doi cua ban nhap AI. */
export type TrangThaiNhap =
  | 'dang_soan' | 'cho_duyet' | 'cho_ky' | 'dang_lay_y_kien'
  | 'loi' | 'da_phat_hanh' | 'huy';

/**
 * Van xuat ma AI phai sinh — CHI gom van xuoi.
 *
 * AI khong duoc sinh so ky hieu, ngay, dia danh, nguoi ky — cac o do code dien.
 * Rieng loai `quyet_dinh` can them `can_cu` (can cu phap ly) va `dieu` (cac Dieu).
 */
export interface VanXuatAI {
  /** Trich yeu. Cong van: bat dau bang "V/v". Thong bao/quyet dinh: tieu de. */
  trich_yeu: string;
  /** Danh sach noi kinh gui. Thong bao thuong trong; cong van bat buoc. */
  kinh_gui: string[];
  /** Can cu ban hanh — chi loai quyet_dinh. */
  can_cu?: string[];
  /** Noi dung cac Dieu — chi loai quyet_dinh. */
  dieu?: string[];
  /** Cac doan noi dung. Quyet dinh: loi dan ket thuc bang "QUYẾT ĐỊNH:". */
  noi_dung: string[];
}

/**
 * Truong he thong do CODE dien, AI khong duoc sinh.
 * Nguon: cau_hinh (co quan, dia danh), ho so nhan_vien cua nguoi tao (nguoi ky, chuc vu),
 * thoi_gian.ts (ngay theo mui gio thiet bi), truy van DB (noi_nhan theo pham vi).
 */
export interface TruongHeThong {
  co_quan_ban_hanh: string;
  dia_danh: string;
  /** 'YYYY-MM-DD' theo mui gio noi dat may cham cong. */
  ngay: string;
  nguoi_ky: string;
  chuc_vu_nguoi_ky: string;
  /** Danh sach noi nhan in o goc trai cuoi van ban. */
  noi_nhan: string[];
}

/**
 * Spec van ban hoan chinh — dau vao duy nhat cua bo sinh docx va module gate.
 * Text hien thi trong app va tep docx CUNG sinh tu mot spec nay de khong lech nhau.
 */
export interface SpecVanBan {
  loai: KieuVanBan;
  pham_vi: PhamViNhan;
  quan_he: QuanHe;
  co_quan_ban_hanh: string;
  dia_danh: string;
  /** 'YYYY-MM-DD'. */
  ngay: string;
  /** Ten loai in tren van ban: 'THÔNG BÁO' / 'QUYẾT ĐỊNH' / '' (cong van khong in). */
  ten_loai: string;
  trich_yeu: string;
  kinh_gui: string[];
  can_cu: string[];
  dieu: string[];
  noi_dung: string[];
  nguoi_ky: string;
  chuc_vu_nguoi_ky: string;
  noi_nhan: string[];
  /** So ky hieu, vd '12/TB-THVN'. NULL o ban du thao — chi dien o buoc ban hanh. */
  so_ky_hieu: string | null;
  /** true = ban du thao (o so in watermark "DỰ THẢO"), false = ban chinh thuc. */
  du_thao: boolean;
  /** Id nguoi nhan/phong ban — de gate G11 kiem nhat quan voi pham_vi. */
  nhan_vien_id: string | null;
  phong_ban_id: string | null;
}

/** Goi mot LLM, tra ve noi dung tra loi (chuoi JSON doi voi DeepSeek). Test dung ham gia. */
export type GoiLlm = (prompt: string) => Promise<string>;

/** Bo sinh docx. Python sidecar hien thuc; test dung hien thuc gia tra docx mau. */
export interface BoSinhDocx {
  dung(spec: SpecVanBan): Promise<Buffer>;
}

/** Ket qua mot muc gate. `loai_loi='llm'` moi duoc kick goi lai AI. */
export interface KetQuaGate {
  ma_check: string;
  dat: boolean;
  ly_do: string;
  loai_loi: 'code' | 'llm';
}
