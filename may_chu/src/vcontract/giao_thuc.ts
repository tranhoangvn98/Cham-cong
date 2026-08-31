// Giai ma phan hoi cua vContract (He thong hop dong dien tu cua Viettel).
//
// DIEM LA NHAT CUA GIAO THUC NAY: moi phan hoi deu duoc boc MOT LOP BASE64. Goi API tra
// ve mot chuoi base64; giai ra moi duoc JSON that. Va trong JSON do, truong `data` lai la
// mot chuoi JSON nua — hai lan phai giai.
//
// Tach thanh ham thuan de kiem duoc bang chuoi that lay tu tai lieu, khong can goi mang.
import { LoiDauVao } from '../tien_ich/kiem_tra.ts';

/** Phan hoi chuan cua vContract sau khi da giai base64. */
export interface PhanHoiVContract {
  code?: string;
  message?: string;
  data?: unknown;
  success?: boolean;
}

/** Du lieu tra ve sau khi login thanh cong. */
export interface PhienVContract {
  token: string;
  tenantId?: string;
  userId?: string;
  enterpriseId?: string;
  username?: string;
  fullName?: string;
}

/**
 * Giai mot phan hoi vContract: base64 -> JSON.
 *
 * Chap nhan ca truong hop may chu tra thang JSON khong boc base64: tai lieu ghi la luon
 * boc, nhung moi truong lab tung tra thang, va doan mot lop boc khong ton kem gi.
 */
export function giai_phan_hoi(tho: string): PhanHoiVContract {
  const s = tho.trim();
  if (s === '') throw new LoiDauVao('vContract trả về phản hồi rỗng.');

  // Tra thang JSON (khong boc base64).
  if (s.startsWith('{') || s.startsWith('[')) {
    return JSON.parse(s) as PhanHoiVContract;
  }

  let giai: string;
  try {
    giai = Buffer.from(s, 'base64').toString('utf8');
  } catch {
    throw new LoiDauVao('Phản hồi vContract không phải base64 hợp lệ.');
  }
  const dau = giai.trimStart();
  if (!dau.startsWith('{') && !dau.startsWith('[')) {
    // Cat ngan de khong do ca token vao log.
    throw new LoiDauVao(
      `Giải base64 phản hồi vContract ra thứ không phải JSON: ${giai.slice(0, 80)}`,
    );
  }
  return JSON.parse(giai) as PhanHoiVContract;
}

/**
 * Lay `data` duoi dang doi tuong.
 *
 * vContract tra `data` la CHUOI JSON chu khong phai doi tuong long nhau — va chuoi do co
 * khi khong dung chuan JSON (khoa khong dat trong nhay kep, vi du `{token: abc,...}`).
 * Vi vay phai co duong du phong phan tich thu cong, neu khong login se hong ngay buoc dau.
 */
export function doc_data(ph: PhanHoiVContract): Record<string, unknown> {
  const d = ph.data;
  if (d === null || d === undefined) return {};
  if (typeof d === 'object') return d as Record<string, unknown>;
  if (typeof d !== 'string') return {};

  const s = d.trim();
  if (s === '' || s === 'null') return {};

  try {
    const o = JSON.parse(s) as unknown;
    if (typeof o === 'object' && o !== null) return o as Record<string, unknown>;
  } catch {
    // roi xuong duong du phong
  }
  return doc_cap_tho(s);
}

/**
 * Duong du phong: doc dang `{token: xxx,tenantId:yyy,...}` — khong phai JSON hop le.
 *
 * Tai lieu vContract dua vi du chinh xac o dang nay cho phan hoi login. Bo qua phan
 * `permissions:[0,1,2]` vi ta khong dung toi va dau ngoac vuong lam roi phep tach dau phay.
 */
export function doc_cap_tho(s: string): Record<string, unknown> {
  const trong = s.replace(/^\{/, '').replace(/\}$/, '');
  // Bo cac doan trong ngoac vuong truoc khi tach theo dau phay.
  const khong_mang = trong.replace(/\[[^\]]*\]/g, '');
  const ra: Record<string, unknown> = {};
  for (const doan of khong_mang.split(',')) {
    const vt = doan.indexOf(':');
    if (vt <= 0) continue;
    const khoa = doan.slice(0, vt).trim().replace(/^"|"$/g, '');
    const gia_tri = doan.slice(vt + 1).trim().replace(/^"|"$/g, '');
    // Bo cap khong con gia tri — vd `permissions:` sau khi da cat bo `[0,1,2]`. Giu lai
    // thanh chuoi rong se lam ben goi tuong la co truong do ma no rong, khac han voi
    // "khong co truong do".
    if (khoa !== '' && gia_tri !== '') ra[khoa] = gia_tri;
  }
  return ra;
}

/** Phan hoi bao thanh cong chua? vContract dung ca `success` lan `code`. */
export function la_thanh_cong(ph: PhanHoiVContract): boolean {
  if (ph.success === true) return true;
  if (ph.success === false) return false;
  return ph.code === '200';
}

/** Thong diep loi de hien cho nguoi dung — giu ca ma loi de con tra tai lieu. */
export function thong_diep_loi(ph: PhanHoiVContract): string {
  const ma = ph.code ?? '';
  const tin = ph.message ?? 'vContract không nêu lý do.';
  return ma === '' || ma === '200' ? tin : `${tin} (mã ${ma})`;
}

/** Doc phien tu phan hoi login. Nem loi neu khong co token — khong tra phien rong. */
export function doc_phien(ph: PhanHoiVContract): PhienVContract {
  const d = doc_data(ph);
  const token = typeof d['token'] === 'string' ? d['token'].trim() : '';
  if (token === '') {
    throw new LoiDauVao(`Đăng nhập vContract không trả về token: ${thong_diep_loi(ph)}`);
  }
  return {
    token,
    tenantId: chuoi_hoac_undefined(d['tenantId']),
    userId: chuoi_hoac_undefined(d['userId']),
    enterpriseId: chuoi_hoac_undefined(d['enterpriseId']),
    username: chuoi_hoac_undefined(d['username']),
    fullName: chuoi_hoac_undefined(d['fullName']),
  };
}

function chuoi_hoac_undefined(v: unknown): string | undefined {
  return typeof v === 'string' && v !== '' ? v : undefined;
}

/**
 * Boc phan hoi cua CHINH TA gui lai cho vContract khi no goi callback.
 *
 * Tai lieu (muc IV) ghi ro: he thong doi tac phai tra ket qua duoi dang base64 cua
 * `{"message":"OK","success":true}`. Tra JSON thuong thi vContract coi la that bai va
 * retry ba lan roi bo — hop dong se ket o trang thai cu ma khong ai biet tai sao.
 */
export function boc_tra_loi(thanh_cong: boolean, thong_diep: string): string {
  return Buffer.from(
    JSON.stringify({ message: thong_diep, success: thanh_cong }),
    'utf8',
  ).toString('base64');
}

/** Trang thai hop dong ben vContract. */
export const TRANG_THAI_HOP_DONG = [
  'DRAFT', 'PROCESSING', 'FINISHED', 'REJECTED', 'CANCEL',
] as const;
export type TrangThaiHopDong = typeof TRANG_THAI_HOP_DONG[number];

/** Nhan tieng Viet cho trang thai, de hien tren giao dien. */
export const NHAN_TRANG_THAI: Record<string, string> = {
  DRAFT: 'Nháp',
  PROCESSING: 'Đang ký',
  FINISHED: 'Hoàn tất',
  REJECTED: 'Bị từ chối',
  CANCEL: 'Đã hủy',
};

/**
 * Nhan tieng Viet cho `status` trong callback. Danh sach lay tu bang "Danh sach loai
 * thong bao va trang thai" trong tai lieu v1.0.11.
 */
export const NHAN_TRANG_THAI_THONG_BAO: Record<string, string> = {
  DONE_DRAFT: 'Đã lập hợp đồng ở trạng thái nháp',
  DONE_START_FLOW: 'Đã bắt đầu luồng ký',
  ERROR: 'Lập hợp đồng thất bại',
  ERROR_START_FLOW: 'Bắt đầu luồng ký thất bại',
  CUSTOMER_SIGNED: 'Khách hàng đã ký',
  CUSTOMER_REJECTED: 'Khách hàng từ chối ký',
  USER_APPROVED: 'Người bên lập đã phê duyệt',
  USER_SIGNED: 'Người bên lập đã ký',
  USER_REJECTED: 'Người bên lập từ chối ký',
  USER_CANCELLED: 'Đã hủy ký',
  MOIT_ERROR: 'Đẩy trục Bộ Công Thương thất bại',
  MOIT_DONE: 'Đã đẩy trục Bộ Công Thương, hoàn tất',
  DELETE_CONTRACT: 'Hợp đồng đã bị xóa',
  NEED_APROVE: 'Cần phê duyệt',
  NEED_SIGN: 'Cần ký duyệt',
};

/**
 * Suy trang thai hop dong tu mot thong bao callback.
 *
 * vContract KHONG phai luc nao cung gui `contractStatus` — nhieu thong bao chi co `status`.
 * Tra null khi khong suy duoc, de ben goi giu nguyen trang thai cu thay vi ghi de bang
 * mot phong doan.
 */
export function suy_trang_thai(
  status: string | null | undefined,
  contract_status: string | null | undefined,
): TrangThaiHopDong | null {
  if (typeof contract_status === 'string'
      && (TRANG_THAI_HOP_DONG as readonly string[]).includes(contract_status)) {
    return contract_status as TrangThaiHopDong;
  }
  switch (status) {
    case 'DONE_DRAFT': return 'DRAFT';
    case 'DONE_START_FLOW':
    case 'CUSTOMER_SIGNED':
    case 'USER_APPROVED':
    case 'USER_SIGNED':
    case 'NEED_APROVE':
    case 'NEED_SIGN': return 'PROCESSING';
    case 'CUSTOMER_REJECTED':
    case 'USER_REJECTED': return 'REJECTED';
    case 'USER_CANCELLED':
    case 'DELETE_CONTRACT': return 'CANCEL';
    case 'MOIT_DONE': return 'FINISHED';
    default: return null;
  }
}
