// Kieu du lieu chung cua khung phep do.
//
// MOT PHEP DO la mot cach DO mot chi so tren du lieu ERP 1 — khong phai mot quy tac. No tra
// ve mot danh sach dong, moi dong mang mot con so. Viec so con so do voi nguong la cua
// `danh_gia.ts`, va nguong den tu `dieu_kien_loi` do nguoi quan tri dat.
//
// Tach lam hai nhu vay de: doi nguong khong phai sua code, va sua cach do khong pha nguong
// nguoi ta da chot.
import type { MaNguon } from '../nguon.ts';

/** Nhom nghiep vu — khop `loai_canh_bao.nhom` trong CSDL. */
export type NhomCanhBao =
  | 'sla' | 'trung_lap' | 'don_hang' | 'giao_dich' | 'chi_phi_cong_no' | 'cheo_cham_cong';

/**
 * Khai bao mot tham so cua phep do.
 *
 * Dung de giao dien TU DUNG FORM: co bang khai bao nay thi trang danh muc khong phai biet
 * truoc phep do nao co tham so gi. Them mot phep do moi la them mot tep, khong phai sua UI.
 */
export interface MoTaThamSo {
  ten: string;
  /** Nhan hien thi — tieng Viet co dau. */
  nhan: string;
  kieu: 'so' | 'tien' | 'gio';
  mac_dinh: number;
  /** Giai thich ngan cho nguoi dat nguong. */
  goi_y?: string;
}

/** Mot dong ket qua do. */
export interface DongDo {
  /** Ten bang ben ERP 1, vi du 'tbl_DonHang'. */
  thuc_the: string;
  /** Khoa chinh cua ban ghi do, dang chuoi. */
  thuc_the_khoa: string;
  /** Con so duoc do — thu se dem so voi nguong. */
  gia_tri: number;
  /** Tieu de hien tren danh sach canh bao. Tieng Viet co dau. */
  tieu_de: string;
  /** So lieu lam can cu. CHI truong can de doi chieu, khong sao chep ca ban ghi. */
  bang_chung: Record<string, unknown>;
  /** Nguoi lien quan ben ERP 1 (usr."User".Id), neu xac dinh duoc. */
  erp_user_id?: number;
  /** So tien lien quan, de loc va sap xep theo muc do thiet hai. */
  so_tien?: number;
  /** Ky 'YYYY-MM' neu phep do tinh theo ky; bo trong voi canh bao gan mot chung tu. */
  ky?: string;
}

/** Ham doc du lieu ERP 1 ma phep do duoc phep goi. Tiem vao de test khong can CSDL that. */
export interface NguCanh {
  // Rang buoc `object` chu khong phai `Record<string, unknown>`: TypeScript khong coi mot
  // `interface` khong co index signature la thoa `Record<string, unknown>`, nen moi phep do
  // se phai khai kieu dong bang object literal dai dong. Repo da dung object literal o
  // `truy_van<{...}>`, nhung phep do can dat ten kieu de tai dung giua cac ham.
  doc: <T extends object>(
    ma: MaNguon, sql: string, tham_so?: ReadonlyArray<unknown>,
  ) => Promise<T[]>;
  /**
   * Doc CSDL cua chinh he thong cham cong (ERP 2).
   *
   * Chi nhom `cheo_cham_cong` dung — do la ly do module nay dat o ERP 2 chu khong o ERP 1:
   * khong he thong nao khac co dong thoi bang cong va du lieu nghiep vu.
   *
   * Tiem qua ngu canh thay vi nhap thang `truy_van` de test chay duoc ma khong can CSDL.
   */
  doc_noi_bo: <T extends object>(
    sql: string, tham_so?: ReadonlyArray<unknown>,
  ) => Promise<T[]>;
  /** Thoi diem chay vong quet. Tiem vao de test co ket qua on dinh. */
  bay_gio: Date;
}

export interface PhepDo {
  /** Ma duy nhat. Doi ma la pha cau hinh nguoi ta da dat — dung doi, hay them ma moi. */
  ma: string;
  ten: string;
  mo_ta: string;
  nhom: NhomCanhBao;
  /** Cac nguon can doc. Nhieu hon mot = phep do tu ghep du lieu trong Node. */
  nguon: readonly MaNguon[];
  /** Don vi cua `gia_tri`, hien canh nguong tren giao dien. */
  don_vi: 'giờ' | 'phút' | 'ngày' | 'lần' | 'VND' | '%';
  tham_so: readonly MoTaThamSo[];
  /**
   * `true` neu phep do can so sanh voi anh chup lan quet truoc (phat hien sua len).
   * `danh_gia.ts` doc co nay de biet co phai cap nhat `anh_chup_erp` sau khi do khong.
   */
  dung_anh_chup?: boolean;
  /**
   * Khac `undefined` = phep do KHONG chay duoc, kem ly do bang tieng Viet.
   *
   * VI SAO CAN CO NAY thay vi xoa han phep do: co nhung chi so nghiep vu THAT SU can, nhung
   * ERP 1 khong luu du lieu de tinh (vi du `chi_vuot_han_muc` — bang `chi.tbl_han_muc_chi`
   * khong co cot so tien). Xoa han thi danh muc mat mot muc ma nguoi dung dang cho doi, va
   * sau nay khong ai nho tai sao no bien mat. Con de no tra ve 0 dong la kieu hong te nhat:
   * nhin y het "khong co canh bao nao".
   *
   * Nen: giu phep do trong danh muc, tu choi chay, va noi ro thieu gi.
   */
  chua_trien_khai?: string;
  do: (ctx: NguCanh, ts: Readonly<Record<string, number>>) => Promise<DongDo[]>;
}

/** Doc mot tham so so, lay mac dinh tu khai bao neu nguoi dung khong dat. */
export function ts_so(
  phep_do: PhepDo, ts: Readonly<Record<string, number>>, ten: string,
): number {
  const v = ts[ten];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const khai = phep_do.tham_so.find((t) => t.ten === ten);
  return khai?.mac_dinh ?? 0;
}
