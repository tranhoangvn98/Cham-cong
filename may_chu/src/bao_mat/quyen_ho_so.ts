// Ai duoc xem / sua nhom nao trong ho so nhan su.
//
// Tach ra thanh module thuan tuy (khong CSDL, khong Fastify) de kiem thu duoc tung o cua
// bang phan quyen. Ho so nhan su chua thu nhay cam nhat he thong — luong va khieu nai —
// nen quy tac phai doc duoc thanh mot bang, khong nam rai rac trong 20 route.

/** Bay nhom du lieu trong ho so mot nguoi. */
export type NhomHoSo =
  | 'hop_dong'
  | 'bien_ban'
  | 'luong'
  | 'cong_viec'
  | 'bao_cao'
  | 'khieu_nai'
  | 'thiet_bi';

export const CAC_NHOM: readonly NhomHoSo[] = [
  'hop_dong', 'bien_ban', 'luong', 'cong_viec', 'bao_cao', 'khieu_nai', 'thiet_bi',
] as const;

export interface NguoiXem {
  vai_tro: string;
  /** nhan_vien_id gan voi tai khoan; null neu tai khoan chua noi voi ho so nhan vien nao. */
  nv: string | null;
}

/** Quan he giua nguoi xem va ho so dang mo. */
export interface BoiCanh {
  /** Ho so nay la cua chinh nguoi dang xem. */
  la_chinh_minh: boolean;
  /** Nguoi dang xem la truong phong cua nhan vien nay. */
  la_cap_tren: boolean;
}

function la_nhan_su(nd: NguoiXem): boolean {
  return nd.vai_tro === 'admin' || nd.vai_tro === 'nhan_su';
}

/**
 * Co duoc DOC nhom nay khong.
 *
 * Bang quy tac:
 *
 *   nhom        | admin/nhan_su | truong_phong (cap tren) | chinh minh | nguoi ngoai
 *   ------------|---------------|-------------------------|------------|------------
 *   hop_dong    | co            | KHONG                   | co         | khong
 *   bien_ban    | co            | KHONG                   | co         | khong
 *   luong       | co            | KHONG                   | co         | khong
 *   cong_viec   | co            | co                      | co         | khong
 *   bao_cao     | co            | co                      | co         | khong
 *   khieu_nai   | co            | KHONG                   | co         | khong
 *   thiet_bi    | co            | co                      | co         | khong
 *
 * Hai o dang chu y:
 *
 * - `khieu_nai`: truong phong KHONG doc duoc, ke ca cua cap duoi minh. Khieu nai rat
 *   thuong nham vao chinh nguoi quan ly truc tiep; cho ho doc duoc thi khong ai dam gui,
 *   va kenh khieu nai tro thanh mot cai hop rong nhin thi tuong la moi viec on.
 * - `hop_dong` / `luong`: truong phong khong phai nguoi tra luong. Ho can biet cap duoi
 *   lam gi (cong viec, bao cao), khong can biet cap duoi duoc tra bao nhieu.
 */
export function doc_duoc(nd: NguoiXem, nhom: NhomHoSo, bc: BoiCanh): boolean {
  if (la_nhan_su(nd)) return true;
  if (bc.la_chinh_minh) return true;
  if (nd.vai_tro === 'truong_phong' && bc.la_cap_tren) {
    return nhom === 'cong_viec' || nhom === 'bao_cao' || nhom === 'thiet_bi';
  }
  return false;
}

/**
 * Co duoc TAO / SUA / XOA trong nhom nay khong.
 *
 * Chat hon quyen doc. Nguyen tac: nhin thay khong co nghia la sua duoc.
 *
 *   nhom        | admin/nhan_su | truong_phong (cap tren) | chinh minh
 *   ------------|---------------|-------------------------|------------------------
 *   hop_dong    | co            | khong                   | khong (chi doc)
 *   bien_ban    | co            | khong                   | khong (chi doc)
 *   luong       | co            | khong                   | khong (chi doc)
 *   cong_viec   | co            | co                      | co (cap nhat viec cua minh)
 *   bao_cao     | co            | co                      | co (nop bao cao cua minh)
 *   khieu_nai   | co            | khong                   | co (gui khieu nai cua minh)
 *   thiet_bi    | co            | khong                   | khong (chi doc)
 *
 * Nhan vien KHONG duoc tu sua hop dong, luong hay danh sach thiet bi cua chinh minh — do
 * la ho so do cong ty lap. Nhung ho PHAI tu gui duoc khieu nai va bao cao, neu khong thi
 * hai muc do khong con y nghia gi.
 */
export function sua_duoc(nd: NguoiXem, nhom: NhomHoSo, bc: BoiCanh): boolean {
  if (la_nhan_su(nd)) return true;
  if (nd.vai_tro === 'truong_phong' && bc.la_cap_tren) {
    return nhom === 'cong_viec' || nhom === 'bao_cao';
  }
  if (bc.la_chinh_minh) {
    return nhom === 'cong_viec' || nhom === 'bao_cao' || nhom === 'khieu_nai';
  }
  return false;
}

/**
 * Nhung o mot nguoi tu sua duoc tren ban ghi CUA CHINH MINH.
 *
 * Nhan vien cap nhat tien do va nop ket qua cong viec duoc, nhung khong tu doi nguoi
 * duoc giao, khong tu doi han, va khong tu ket luan khieu nai cua chinh minh la
 * "da giai quyet".
 */
export function chi_duoc_sua_o(nd: NguoiXem, nhom: NhomHoSo, bc: BoiCanh): string[] | null {
  if (la_nhan_su(nd)) return null; // null = khong gioi han
  if (nd.vai_tro === 'truong_phong' && bc.la_cap_tren) return null;
  if (!bc.la_chinh_minh) return [];
  if (nhom === 'cong_viec') return ['trang_thai', 'ket_qua'];
  if (nhom === 'bao_cao') return ['tieu_de', 'noi_dung', 'trang_thai', 'ky', 'ky_tu', 'ky_den'];
  if (nhom === 'khieu_nai') return ['tieu_de', 'noi_dung', 'loai', 'muc_do'];
  return [];
}

/** Danh sach nhom nguoi nay doc duoc — dung de webapp chi hien tab co du lieu. */
export function cac_nhom_doc_duoc(nd: NguoiXem, bc: BoiCanh): NhomHoSo[] {
  return CAC_NHOM.filter((n) => doc_duoc(nd, n, bc));
}
