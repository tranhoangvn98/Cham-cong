// Kiem tra du lieu dau vao. Nem LoiDauVao (400) voi thong diep tieng Viet cho nguoi dung.
export class LoiDauVao extends Error {
  readonly ma_http = 400;
}

export class LoiKhongTim extends Error {
  readonly ma_http = 404;
}

export class LoiXungDot extends Error {
  readonly ma_http = 409;
}

export class LoiKhongQuyen extends Error {
  readonly ma_http = 403;
}

/**
 * Chuoi nay co the la mot so dien thoai khong.
 *
 * VI SAO CAN: ERP cu tra HO TEN trong truong `phoneNumber` — thay tren du lieu that
 * ("Trần Hoàng Anh Vinh" nam trong `so_dien_thoai` cua `ERP4`). Truoc do khong cho nao trong he
 * thong kiem o nay, nen no di thang tu ERP vao CSDL roi ra giao dien.
 *
 * QUY TAC LONG CO Y: dem CHU SO, phai co it nhat 7. Du de loai ten nguoi, "N/A", dau gach; va
 * khong loai cac cach viet that: `0912.345.678`, `+84 912 345 678`, `024 3822 1234`, so trong
 * ngoac. Chat hon nua thi se tu choi so that cua nguoi that — hong theo huong do ton hon, vi
 * khong ai biet minh vua mat so dien thoai.
 */
export function la_so_dien_thoai(s: string): boolean {
  return (s.match(/\d/g) ?? []).length >= 7;
}

function la_doi_tuong(v: unknown): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    throw new LoiDauVao('Dữ liệu gửi lên phải là một đối tượng JSON.');
  }
  return v as Record<string, unknown>;
}

export function than(v: unknown): Record<string, unknown> {
  return la_doi_tuong(v);
}

export function chuoi(
  nguon: Record<string, unknown>,
  khoa: string,
  tuy_chon: { bat_buoc?: boolean; toi_da?: number; toi_thieu?: number; nhan?: string } = {},
): string | null {
  const nhan = tuy_chon.nhan ?? khoa;
  const v = nguon[khoa];
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
    if (tuy_chon.bat_buoc === true) throw new LoiDauVao(`Thiếu trường bắt buộc: ${nhan}.`);
    return null;
  }
  if (typeof v !== 'string') throw new LoiDauVao(`Trường ${nhan} phải là chuỗi.`);
  const s = v.trim();
  const toi_da = tuy_chon.toi_da ?? 500;
  if (s.length > toi_da) throw new LoiDauVao(`Trường ${nhan} quá dài (tối đa ${toi_da} ký tự).`);
  if (tuy_chon.toi_thieu !== undefined && s.length < tuy_chon.toi_thieu) {
    throw new LoiDauVao(`Trường ${nhan} phải từ ${tuy_chon.toi_thieu} ký tự trở lên.`);
  }
  return s;
}

export function chuoi_bat_buoc(
  nguon: Record<string, unknown>,
  khoa: string,
  tuy_chon: { toi_da?: number; toi_thieu?: number; nhan?: string } = {},
): string {
  const s = chuoi(nguon, khoa, { ...tuy_chon, bat_buoc: true });
  return s as string;
}

export function so_nguyen(
  nguon: Record<string, unknown>,
  khoa: string,
  tuy_chon: { bat_buoc?: boolean; min?: number; max?: number; mac_dinh?: number } = {},
): number | null {
  const v = nguon[khoa];
  if (v === undefined || v === null || v === '') {
    if (tuy_chon.bat_buoc === true) throw new LoiDauVao(`Thiếu trường bắt buộc: ${khoa}.`);
    return tuy_chon.mac_dinh ?? null;
  }
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  if (!Number.isInteger(n)) throw new LoiDauVao(`Trường ${khoa} phải là số nguyên.`);
  if (tuy_chon.min !== undefined && n < tuy_chon.min) {
    throw new LoiDauVao(`Trường ${khoa} phải lớn hơn hoặc bằng ${tuy_chon.min}.`);
  }
  if (tuy_chon.max !== undefined && n > tuy_chon.max) {
    throw new LoiDauVao(`Trường ${khoa} phải nhỏ hơn hoặc bằng ${tuy_chon.max}.`);
  }
  return n;
}

export function so_thuc(
  nguon: Record<string, unknown>,
  khoa: string,
  tuy_chon: { bat_buoc?: boolean; min?: number; max?: number } = {},
): number | null {
  const v = nguon[khoa];
  if (v === undefined || v === null || v === '') {
    if (tuy_chon.bat_buoc === true) throw new LoiDauVao(`Thiếu trường bắt buộc: ${khoa}.`);
    return null;
  }
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  if (!Number.isFinite(n)) throw new LoiDauVao(`Trường ${khoa} phải là số.`);
  if (tuy_chon.min !== undefined && n < tuy_chon.min) {
    throw new LoiDauVao(`Trường ${khoa} phải lớn hơn hoặc bằng ${tuy_chon.min}.`);
  }
  if (tuy_chon.max !== undefined && n > tuy_chon.max) {
    throw new LoiDauVao(`Trường ${khoa} phải nhỏ hơn hoặc bằng ${tuy_chon.max}.`);
  }
  return n;
}

export function luan_ly(
  nguon: Record<string, unknown>,
  khoa: string,
  mac_dinh: boolean | null = null,
): boolean | null {
  const v = nguon[khoa];
  if (v === undefined || v === null || v === '') return mac_dinh;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  throw new LoiDauVao(`Trường ${khoa} phải là true/false.`);
}

const RE_NGAY = /^\d{4}-\d{2}-\d{2}$/;

export function ngay(
  nguon: Record<string, unknown>,
  khoa: string,
  tuy_chon: { bat_buoc?: boolean } = {},
): string | null {
  const s = chuoi(nguon, khoa, { bat_buoc: tuy_chon.bat_buoc, toi_da: 10 });
  if (s === null) return null;
  if (!RE_NGAY.test(s)) throw new LoiDauVao(`Trường ${khoa} phải có dạng YYYY-MM-DD.`);
  // Chan ngay khong ton tai (vd 2025-02-30).
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  const kt = new Date(Date.UTC(y, m - 1, d));
  if (kt.getUTCMonth() + 1 !== m || kt.getUTCDate() !== d) {
    throw new LoiDauVao(`Ngày không tồn tại: ${s}.`);
  }
  return s;
}

export function ngay_bat_buoc(nguon: Record<string, unknown>, khoa: string): string {
  return ngay(nguon, khoa, { bat_buoc: true }) as string;
}

const RE_GIO = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export function gio(
  nguon: Record<string, unknown>,
  khoa: string,
  tuy_chon: { bat_buoc?: boolean } = {},
): string | null {
  const s = chuoi(nguon, khoa, { bat_buoc: tuy_chon.bat_buoc, toi_da: 8 });
  if (s === null) return null;
  if (!RE_GIO.test(s)) throw new LoiDauVao(`Trường ${khoa} phải có dạng HH:MM (24 giờ).`);
  return s.length === 5 ? `${s}:00` : s;
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuid(
  nguon: Record<string, unknown>,
  khoa: string,
  tuy_chon: { bat_buoc?: boolean } = {},
): string | null {
  const s = chuoi(nguon, khoa, { bat_buoc: tuy_chon.bat_buoc, toi_da: 36 });
  if (s === null) return null;
  if (!RE_UUID.test(s)) throw new LoiDauVao(`Trường ${khoa} không phải mã hợp lệ.`);
  return s;
}

export function uuid_bat_buoc(nguon: Record<string, unknown>, khoa: string): string {
  return uuid(nguon, khoa, { bat_buoc: true }) as string;
}

/** Kiem tra chuoi thuoc tap gia tri cho phep. */
export function trong_tap<T extends string>(
  nguon: Record<string, unknown>,
  khoa: string,
  tap: readonly T[],
  tuy_chon: { bat_buoc?: boolean; mac_dinh?: T } = {},
): T | null {
  const s = chuoi(nguon, khoa, { bat_buoc: tuy_chon.bat_buoc, toi_da: 40 });
  if (s === null) return tuy_chon.mac_dinh ?? null;
  if (!(tap as readonly string[]).includes(s)) {
    throw new LoiDauVao(`Trường ${khoa} phải là một trong: ${tap.join(', ')}.`);
  }
  return s as T;
}

/** Kiem tra khoang ngay hop le va khong qua dai (chong truy van keo sap DB). */
export function khoang_ngay(
  nguon: Record<string, unknown>,
  toi_da_ngay = 400,
): { tu: string; den: string } {
  const tu = ngay_bat_buoc(nguon, 'tu');
  const den = ngay_bat_buoc(nguon, 'den');
  if (den < tu) throw new LoiDauVao('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.');
  const so_ngay = (Date.parse(`${den}T00:00:00Z`) - Date.parse(`${tu}T00:00:00Z`)) / 86_400_000 + 1;
  if (so_ngay > toi_da_ngay) {
    throw new LoiDauVao(`Khoảng ngày quá dài (tối đa ${toi_da_ngay} ngày).`);
  }
  return { tu, den };
}

/** Phan trang an toan: gioi han so dong tra ve. */
export function phan_trang(
  nguon: Record<string, unknown>,
  mac_dinh = 50,
  toi_da = 500,
): { gioi_han: number; bo_qua: number } {
  const gioi_han = so_nguyen(nguon, 'gioi_han', { min: 1, max: toi_da, mac_dinh }) ?? mac_dinh;
  const bo_qua = so_nguyen(nguon, 'bo_qua', { min: 0, max: 1_000_000, mac_dinh: 0 }) ?? 0;
  return { gioi_han, bo_qua };
}
