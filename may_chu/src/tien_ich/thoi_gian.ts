// Tien ich thoi gian. Toan bo he thong lam viec o MUI GIO CUA MAY CHAM CONG
// (cau_hinh.device_tz_offset_hours), khong phu thuoc mui gio cua may chu chay Node.
import { OFFSET_MAY_MS } from '../cau_hinh.ts';

const PHUT_MS = 60_000;

/** 'YYYY-MM-DD' theo gio dia phuong cua may. */
export function ngay_dia_phuong(d: Date): string {
  const t = new Date(d.getTime() + OFFSET_MAY_MS);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

/** 'HH:MM' theo gio dia phuong cua may. */
export function gio_dia_phuong(d: Date): string {
  const t = new Date(d.getTime() + OFFSET_MAY_MS);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
}

/** Thu trong tuan theo gio dia phuong: 0=CN, 1=T2, ... 6=T7. */
export function thu_trong_tuan(ngay: string): number {
  const [y, m, d] = tach_ngay(ngay);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function tach_ngay(ngay: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ngay);
  if (m === null) throw new Error(`Ngay khong hop le (can YYYY-MM-DD): ${ngay}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * Ghep 'YYYY-MM-DD' + 'HH:MM[:SS]' (gio dia phuong cua may) thanh moc tuyet doi.
 * @param cong_ngay so ngay cong them — dung cho ca qua dem (gio_ra thuoc ngay sau).
 */
export function moc_thoi_gian(ngay: string, gio: string, cong_ngay = 0): Date {
  const [y, m, d] = tach_ngay(ngay);
  const g = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(gio);
  if (g === null) throw new Error(`Gio khong hop le (can HH:MM): ${gio}`);
  return new Date(
    Date.UTC(y, m - 1, d + cong_ngay, Number(g[1]), Number(g[2]), Number(g[3] ?? '0'))
    - OFFSET_MAY_MS,
  );
}

/** Cong so ngay vao 'YYYY-MM-DD', tra ve chuoi cung dinh dang. */
export function cong_ngay(ngay: string, so_ngay: number): string {
  const [y, m, d] = tach_ngay(ngay);
  const t = new Date(Date.UTC(y, m - 1, d + so_ngay));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

/** Danh sach ngay tu..den (bao gom hai dau). Chan tren 400 ngay de tranh truy van khong lo. */
export function danh_sach_ngay(tu: string, den: string, toi_da = 400): string[] {
  const kq: string[] = [];
  let hien_tai = tu;
  while (hien_tai <= den && kq.length < toi_da) {
    kq.push(hien_tai);
    hien_tai = cong_ngay(hien_tai, 1);
  }
  return kq;
}

/** So phut giua hai moc, lam tron xuong, khong bao gio am. */
export function so_phut(tu: Date, den: Date): number {
  return Math.max(0, Math.floor((den.getTime() - tu.getTime()) / PHUT_MS));
}

/** So phut hai khoang thoi gian giao nhau. Dung de tru gio nghi trua. */
export function phut_giao_nhau(a1: Date, a2: Date, b1: Date, b2: Date): number {
  const bat_dau = Math.max(a1.getTime(), b1.getTime());
  const ket_thuc = Math.min(a2.getTime(), b2.getTime());
  return Math.max(0, Math.floor((ket_thuc - bat_dau) / PHUT_MS));
}

/** Ngay dau/cuoi cua thang 'YYYY-MM'. */
export function khoang_thang(thang: string): { tu: string; den: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(thang);
  if (m === null) throw new Error(`Thang khong hop le (can YYYY-MM): ${thang}`);
  const y = Number(m[1]);
  const th = Number(m[2]);
  if (th < 1 || th > 12) throw new Error(`Thang khong hop le: ${thang}`);
  const cuoi = new Date(Date.UTC(y, th, 0)).getUTCDate();
  return { tu: `${m[1]}-${m[2]}-01`, den: `${m[1]}-${m[2]}-${String(cuoi).padStart(2, '0')}` };
}

/** Doi phut thanh dang '8h 30p' de hien thi. */
export function phut_thanh_chu(phut: number): string {
  if (phut <= 0) return '0p';
  const g = Math.floor(phut / 60);
  const p = phut % 60;
  if (g === 0) return `${p}p`;
  if (p === 0) return `${g}h`;
  return `${g}h ${p}p`;
}
