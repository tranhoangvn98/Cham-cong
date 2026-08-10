// Tien ich dinh dang va cac nhan tieng Viet.
import { mui_gio_offset_gio } from './api';

const hai = (n: number): string => String(n).padStart(2, '0');

/**
 * Doi moc ISO sang gio DIA PHUONG CUA MAY CHAM CONG.
 * KHONG dung toLocaleString: no format theo mui gio cua dien thoai. Nhan vien di cong tac
 * sang mui gio khac (hoac dien thoai dat sai mui gio) phai van thay dung gio cong ty.
 */
function ve_gio_may(moc: string | null | undefined): Date | null {
  if (moc === null || moc === undefined) return null;
  const d = new Date(moc);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + mui_gio_offset_gio() * 3600_000);
}

/** 'HH:MM' theo gio may cham cong. */
export function gio_ngan(moc: string | null | undefined): string {
  const t = ve_gio_may(moc);
  return t === null ? '--:--' : `${hai(t.getUTCHours())}:${hai(t.getUTCMinutes())}`;
}

/** 'DD/MM HH:MM' theo gio may cham cong. */
export function ngay_gio_ngan(moc: string | null | undefined): string {
  const t = ve_gio_may(moc);
  if (t === null) return '—';
  return `${hai(t.getUTCDate())}/${hai(t.getUTCMonth() + 1)} ${hai(t.getUTCHours())}:${hai(t.getUTCMinutes())}`;
}

/** 'YYYY-MM-DD' hom nay theo gio may cham cong. */
export function hom_nay(): string {
  const t = new Date(Date.now() + mui_gio_offset_gio() * 3600_000);
  return `${t.getUTCFullYear()}-${hai(t.getUTCMonth() + 1)}-${hai(t.getUTCDate())}`;
}

export function thang_nay(): string {
  return hom_nay().slice(0, 7);
}

/** Cong/tru thang cho chuoi 'YYYY-MM'. */
export function doi_thang(thang: string, buoc: number): string {
  const [y, m] = thang.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + buoc, 1));
  return `${d.getUTCFullYear()}-${hai(d.getUTCMonth() + 1)}`;
}

export function ten_thang(thang: string): string {
  const [y, m] = thang.split('-');
  return `Tháng ${Number(m)}/${y}`;
}

export function ngay_viet(ngay: string | null | undefined): string {
  if (ngay === null || ngay === undefined) return '—';
  const [y, m, d] = ngay.split('-');
  return d === undefined ? ngay : `${d}/${m}/${y}`;
}

const TEN_THU = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function thu_cua_ngay(ngay: string): string {
  const d = new Date(`${ngay}T00:00:00Z`);
  return TEN_THU[d.getUTCDay()] ?? '';
}

export function phut_thanh_chu(phut: number | null | undefined): string {
  const p = Number(phut ?? 0);
  if (!Number.isFinite(p) || p <= 0) return '—';
  const g = Math.floor(p / 60);
  const con = p % 60;
  if (g === 0) return `${con}p`;
  if (con === 0) return `${g}h`;
  return `${g}h${con}p`;
}

export const TEN_TRANG_THAI_NGAY: Record<string, string> = {
  co_mat: 'Có mặt',
  vang: 'Vắng',
  nghi_phep: 'Nghỉ phép',
  ngay_le: 'Ngày lễ',
  nghi_tuan: 'Nghỉ tuần',
};

export const TEN_TRANG_THAI_DON: Record<string, string> = {
  cho_duyet: 'Chờ duyệt',
  da_duyet: 'Đã duyệt',
  tu_choi: 'Từ chối',
  da_huy: 'Đã hủy',
  tu_dong: 'Đã ghi nhận',
};

export const TEN_LOAI_NGHI: Record<string, string> = {
  phep_nam: 'Phép năm',
  khong_luong: 'Không lương',
  om: 'Nghỉ ốm',
  thai_san: 'Thai sản',
  ket_hon: 'Kết hôn',
  hieu: 'Nghỉ hiếu',
};

export const TEN_NGUON: Record<string, string> = {
  may: 'Máy chấm công',
  dien_thoai: 'Điện thoại',
  thu_cong: 'Nhập tay',
};
