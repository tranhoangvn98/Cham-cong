// Dang ky CAC HE THONG co ma dinh danh cho mot nguoi.
//
// VI SAO CAN BANG NAY: mot nguoi di qua nhieu he thong, moi he thong goi ho bang mot ma khac.
// Truoc day moi ma la MOT COT tren `nhan_vien` (`pin_may`, `erp_user_id`, `erp_username`,
// `ma_erp`, `email`), va cach do vo o bon cho:
//
//   1. MOT NGUOI MOT MA. `pin_may` la mot cot, nen mot nguoi khong the co PIN o hai may, va
//      dang ky lai PIN la ghi de — mat dau vet.
//   2. KHONG CO LICH SU. PIN 1 chuyen tu nguoi cu sang Phan Song Hao thi khong con vet nao noi
//      rang nhung lan quet cu thuoc ai. Doi email trong Entra cung the.
//   3. MA MICROSOFT ON DINH BI BO DI. `id_token` co `oid` — ma khong bao gio doi — va he thong
//      trich no ra roi khong luu. Khop nguoi bang `lower(email)`, nen doi email trong Entra la
//      mat khop, va (neu ten mien duoc phep) tao ra mot TAI KHOAN THU HAI cho cung mot nguoi.
//   4. THEM NGUON MOI = THEM COT + sua moi cho join. Con nguon nao chua co cot thi khong co cho
//      luu, nen no nam trong dau nguoi phu trach.
//
// Module NAY THUAN: khong CSDL, khong Fastify. Nho the kiem duoc tung he thong bang du lieu mau.
import { LoiDauVao } from '../tien_ich/kiem_tra.ts';

export type MaHeThong =
  | 'noi_bo'
  | 'may_cham_cong'
  | 'erp_cu'
  | 'erp_cu_tai_khoan'
  | 'erp_cu_ma'
  | 'microsoft_oid'
  | 'microsoft_email';

export interface DacTaHeThong {
  ma: MaHeThong;
  /** Ten cho nguoi doc, vi du "PIN máy chấm công". */
  ten: string;
  /** Nhom hien thi tren giao dien — cac he thong cung nguon dung mot nhom. */
  nhom: string;
  /**
   * Mot nguoi co the co NHIEU ma dang hieu luc o he thong nay khong.
   *
   * `may_cham_cong`: CO — nhieu may, va dang ky lai thi PIN moi khong xoa PIN cu ngay.
   * `microsoft_email`: CO — alias email la chuyen thuong trong Entra.
   * Con lai: khong. Ma moi thay ma cu, va ma cu duoc dong lai chu khong xoa.
   */
  nhieu_ma: boolean;
  /**
   * Ma nay CO DOI khong. Anh huong den cach doc bao cao doi soat va den viec co nen dung no
   * lam khoa khop nguoi hay khong: `microsoft_oid` khong doi nen tin duoc, `microsoft_email`
   * doi duoc nen chi dung de tim.
   */
  on_dinh: boolean;
  /** Cot cu tren `nhan_vien` (hoac `nguoi_dung`) ma ma nay tuong ung — de doi soat. */
  cot_cu: string | null;
  /** Chuan hoa de SO SANH. Ban goc van duoc luu nguyen van o cot `ma`. */
  chuan_hoa: (s: string) => string;
  /** Ly do tu choi, hoac null neu hop le. */
  kiem: (s: string) => string | null;
}

function khong_rong(s: string): string | null {
  return s.trim() === '' ? 'Mã không được để trống.' : null;
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Bang dac ta. THU TU O DAY LA THU TU HIEN TREN GIAO DIEN.
 *
 * Sap theo do gan voi cong viec hang ngay: ma noi bo va PIN may la thu nhan su nhin moi ngay,
 * ERP cu la thu tra cuu khi doi chieu du lieu cu, Microsoft la thu may tu ghi.
 */
export const CAC_HE_THONG: readonly DacTaHeThong[] = [
  {
    ma: 'noi_bo',
    ten: 'Mã nhân viên (hệ thống này)',
    nhom: 'Hệ thống chấm công',
    nhieu_ma: false,
    on_dinh: false,
    cot_cu: 'nhan_vien.ma_nv',
    chuan_hoa: (s) => s.trim().toUpperCase(),
    kiem: khong_rong,
  },
  {
    ma: 'may_cham_cong',
    ten: 'PIN máy chấm công',
    nhom: 'Máy chấm công',
    nhieu_ma: true,
    on_dinh: false,
    cot_cu: 'nhan_vien.pin_may',
    chuan_hoa: (s) => s.trim(),
    kiem: (s) => {
      const t = s.trim();
      if (t === '') return 'PIN không được để trống.';
      // May ZKTeco gui PIN nhu mot chuoi so. Chu cai o day gan nhu chac chan la go nham cot.
      if (!/^\d+$/.test(t)) return `PIN máy chấm công chỉ gồm chữ số, nhận được "${s}".`;
      return null;
    },
  },
  {
    ma: 'erp_cu',
    ten: 'userId bên ERP cũ',
    nhom: 'ERP cũ (erp_logistic)',
    nhieu_ma: false,
    on_dinh: true,
    cot_cu: 'nhan_vien.erp_user_id',
    chuan_hoa: (s) => s.trim(),
    kiem: (s) => {
      const t = s.trim();
      if (!/^\d+$/.test(t) || Number(t) <= 0) return `userId ERP phải là số nguyên dương, nhận được "${s}".`;
      return null;
    },
  },
  {
    ma: 'erp_cu_tai_khoan',
    ten: 'Tài khoản đăng nhập ERP cũ',
    nhom: 'ERP cũ (erp_logistic)',
    nhieu_ma: false,
    on_dinh: false,
    cot_cu: 'nhan_vien.erp_username',
    chuan_hoa: (s) => s.trim().toLowerCase(),
    kiem: khong_rong,
  },
  {
    ma: 'erp_cu_ma',
    ten: 'Mã nhân viên bên ERP cũ',
    nhom: 'ERP cũ (erp_logistic)',
    nhieu_ma: false,
    on_dinh: false,
    cot_cu: 'nhan_vien.ma_erp',
    chuan_hoa: (s) => s.trim().toUpperCase(),
    kiem: khong_rong,
  },
  {
    ma: 'microsoft_oid',
    ten: 'Object ID (Entra ID)',
    nhom: 'Microsoft 365',
    nhieu_ma: false,
    on_dinh: true,
    // Khong co cot cu nao: truoc day ma nay bi bo di sau khi kiem `id_token`.
    cot_cu: null,
    chuan_hoa: (s) => s.trim().toLowerCase(),
    kiem: (s) => (RE_UUID.test(s.trim().toLowerCase())
      ? null
      : `Object ID của Entra phải là một UUID, nhận được "${s}".`),
  },
  {
    ma: 'microsoft_email',
    ten: 'Email / UPN Microsoft',
    nhom: 'Microsoft 365',
    nhieu_ma: true,
    on_dinh: false,
    cot_cu: 'nhan_vien.email',
    chuan_hoa: (s) => s.trim().toLowerCase(),
    kiem: (s) => {
      const t = s.trim();
      // Kiem long co y: chi doi hinh dang `a@b`. Bo kiem email chat la mot cai bay — RFC cho
      // phep nhieu thu hon moi bieu thuc chinh quy nguoi ta hay viet, va tu choi email that
      // cua nguoi that thi ho khong dang nhap duoc.
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return `Email không đúng dạng: "${s}".`;
      return null;
    },
  },
];

const THEO_MA = new Map(CAC_HE_THONG.map((h) => [h.ma, h]));

export const MA_CAC_HE_THONG: readonly MaHeThong[] = CAC_HE_THONG.map((h) => h.ma);

export function dac_ta_he_thong(ma: string): DacTaHeThong {
  const d = THEO_MA.get(ma as MaHeThong);
  if (d === undefined) {
    throw new LoiDauVao(
      `Hệ thống định danh không hợp lệ: "${ma}". Các hệ thống nhận được: `
      + MA_CAC_HE_THONG.join(', '),
    );
  }
  return d;
}

/** Cac nhom, theo dung thu tu xuat hien trong `CAC_HE_THONG`. */
export function cac_nhom(): string[] {
  return [...new Set(CAC_HE_THONG.map((h) => h.nhom))];
}

export interface MaDaChuan {
  he_thong: MaHeThong;
  /** Nguyen van nguoi dung go / he thong kia tra ve. */
  ma: string;
  /** Da chuan hoa — dung de so sanh va de chong trung. */
  ma_chuan: string;
}

/**
 * Chuan hoa mot ma va tu choi neu no khong hop dang cua he thong do.
 *
 * Nem `LoiDauVao` chu khong tra `null`: mot ma sai dang di vao bang dinh danh la mot ma se
 * KHONG BAO GIO khop voi thu that, nen no nam im o do va khong ai biet.
 */
export function chuan_ma(he_thong: string, ma: string): MaDaChuan {
  const d = dac_ta_he_thong(he_thong);
  const ly_do = d.kiem(ma);
  if (ly_do !== null) throw new LoiDauVao(`${d.ten}: ${ly_do}`);
  const ma_chuan = d.chuan_hoa(ma);
  if (ma_chuan === '') throw new LoiDauVao(`${d.ten}: mã rỗng sau khi chuẩn hóa.`);
  return { he_thong: d.ma, ma: ma.trim(), ma_chuan };
}
