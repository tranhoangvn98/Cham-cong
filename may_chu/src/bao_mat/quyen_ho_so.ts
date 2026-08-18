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
  | 'thiet_bi'
  | 'thong_tin'      // thong tin ca nhan: CCCD, MST, so BHXH, lien he khan cap
  | 'tai_lieu'       // checklist ho so bat buoc theo HCNS
  | 'nguoi_phu_thuoc'
  | 'bhxh';

export const CAC_NHOM: readonly NhomHoSo[] = [
  'thong_tin', 'tai_lieu', 'hop_dong', 'bien_ban', 'luong',
  'nguoi_phu_thuoc', 'bhxh', 'cong_viec', 'bao_cao', 'khieu_nai', 'thiet_bi',
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

/**
 * MOT CHO DUY NHAT tra loi cau "vai tro nay co phai la nhan su khong".
 *
 * VI SAO PHAI GOM VAO DAY: cau `vai_tro === 'admin' || vai_tro === 'nhan_su'` truoc day nam
 * rai o SAU cho khac nhau — pham vi bang cong, lop che du lieu ca nhan, dem don cho duyet,
 * hook `can_nhan_su`, bang phan quyen ho so. Them mot vai tro nhan su moi
 * (`truong_phong_nhan_su`) ma quen mot cho la nguoi do dang nhap vao thay MOT NUA he thong,
 * khong bao loi gi, va cai nua khong thay se im lang nhu the no khong ton tai.
 *
 * Dat o day chu khong o `xac_thuc.ts` vi module nay THUAN — khong Fastify, khong CSDL — nen
 * moi lop khac deu nhap duoc ma khong keo theo gi.
 *
 * Co bai kiem chan: khong tep nao khac duoc phep so sanh `vai_tro === 'nhan_su'`.
 */
export function la_vai_tro_nhan_su(vai_tro: string): boolean {
  return vai_tro === 'admin' || vai_tro === 'nhan_su' || vai_tro === 'truong_phong_nhan_su';
}

/** Duyet duoc don tu: nhan su cac cap, va truong phong (voi phong cua minh). */
export function la_nguoi_duyet(vai_tro: string): boolean {
  return la_vai_tro_nhan_su(vai_tro) || vai_tro === 'truong_phong';
}

/**
 * Quan tri he thong: may cham cong, khoa API, tai khoan, dong bo.
 *
 * Rieng ra khoi `la_vai_tro_nhan_su` vi day la mot truc KHAC — quan tri ky thuat, khong
 * phai quan tri nhan su. Van dat o day de moi cau hoi "vai tro nay la gi" deu tra loi tu
 * mot cho, va de bai kiem chan so sanh chuoi khong phai chua ngoai le nao.
 */
export function la_quan_tri(vai_tro: string): boolean {
  return vai_tro === 'admin';
}

function la_nhan_su(nd: NguoiXem): boolean {
  return la_vai_tro_nhan_su(nd.vai_tro);
}

/**
 * Duoc THAY hay GO mot tep DA NAP vao ho so khong.
 *
 * Chat hon `sua_duoc` mot bac, va co chu dich:
 *
 *   NAP THEM mot ban scan la THEM chung cu — nhan su lam hang ngay, cang de cang tot.
 *   THAY hay GO mot ban da nap la LAM MAT chung cu — phai co nguoi chiu trach nhiem.
 *
 * Ho so nhan su la ho so phap ly: hop dong, CCCD, giay kham suc khoe, bang cap. Khi co
 * tranh chap lao dong hay khi co quan BHXH hoi, cai tra loi duoc la ban goc trong kho tep.
 * Mot tai khoan nhan su bi muon, hay mot cai bam nham, khong duoc phep lam mat no.
 *
 * `truong_phong` cua cac phong ban khac KHONG nam o day: ho von khong doc duoc ho so nhan
 * su cua cap duoi thi cang khong sua duoc.
 */
export function thay_xoa_tep_duoc(nd: NguoiXem): boolean {
  return nd.vai_tro === 'admin' || nd.vai_tro === 'truong_phong_nhan_su';
}

/** Cau giai thich khi bi tu choi. Viet ra day de moi cho tu choi noi giong nhau. */
export const LY_DO_KHONG_THAY_XOA_DUOC =
  'Chỉ Trưởng phòng nhân sự mới được thay hoặc gỡ tệp đã nạp vào hồ sơ. '
  + 'Nạp thêm tệp vào ô còn trống thì nhân sự làm được bình thường.';

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
 *   thong_tin   | co            | co NHUNG DA CHE         | co         | khong
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
    // `thong_tin` doc duoc nhung o dang DA CHE (xem bao_mat/che_du_lieu.ts): truong phong
    // can lien he khan cap cua cap duoi khi co su co, con so CCCD / so tai khoan / ket
    // luan suc khoe thi khong. Neu chan han ca nhom nay thi lop che tro thanh code chet —
    // moi nguoi doc duoc deu la nguoi duoc xem ban day du.
    return nhom === 'cong_viec' || nhom === 'bao_cao' || nhom === 'thiet_bi'
      || nhom === 'thong_tin';
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
    // Thong tin ca nhan, tai lieu, nguoi phu thuoc, BHXH deu KHONG nam trong day: do la
    // ho so phap ly do cong ty lap va nop cho co quan nha nuoc. Nhan vien bao sai thi bao
    // nhan su sua, chu tu sua duoc thi so BHXH va ma so thue thanh thu tuy nguoi khai.
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
