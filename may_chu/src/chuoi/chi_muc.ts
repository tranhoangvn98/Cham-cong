// Chi muc tu dien song ngu cua MAY CHU. Chuoi nguoi dung doc PHẢI di qua day —
// khong hardcode chuoi tieng Viet hay tieng Trung o bat ky module nao khac.
import { CHUOI_VI } from './vi.ts';
import { CHUOI_ZH } from './zh.ts';

export type NgonNgu = 'vi' | 'zh';

/** Khoa chuoi = toan bo khoa cua tu dien tieng Viet (nguon su that). */
export type ChuoiKhoa = keyof typeof CHUOI_VI;

export function la_ngon_ngu(x: unknown): x is NgonNgu {
  return x === 'vi' || x === 'zh';
}

/** Chuan hoa gia tri doc tu CSDL/header ve NgonNgu; khong hop le thi 'vi'. */
export function chuan_ngon_ngu(x: unknown): NgonNgu {
  return la_ngon_ngu(x) ? x : 'vi';
}

/**
 * Tra chuoi theo ngon ngu. `tham_so` de lap tham so {khoa} trong chuoi (vd '迟到 {n} 分钟').
 * Tham so thieu thi GIU NGUYEN {khoa} de de phat hien loi lap, khong thay bang chuoi rong.
 */
export function tra_chuoi(
  ngon_ngu: NgonNgu,
  khoa: ChuoiKhoa,
  tham_so?: Record<string, string | number>,
): string {
  const goc: string = (ngon_ngu === 'zh' ? CHUOI_ZH : CHUOI_VI)[khoa];
  if (tham_so === undefined) return goc;
  return goc.replace(/\{([a-z_]+)\}/g, (ca, ten: string) =>
    Object.prototype.hasOwnProperty.call(tham_so, ten) ? String(tham_so[ten]) : ca);
}
