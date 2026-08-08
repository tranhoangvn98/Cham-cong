// Thanh phan dung chung cho toan bo webapp.
import { useEffect, useState, type ReactNode } from 'react';
import { goi, LoiApi, mui_gio_offset_gio } from './api.ts';

/** Doi phut thanh dang '7h 30p' cho de doc. */
export function phut_thanh_chu(phut: number | null | undefined): string {
  const p = Number(phut ?? 0);
  if (!Number.isFinite(p) || p <= 0) return '—';
  const g = Math.floor(p / 60);
  const con = p % 60;
  if (g === 0) return `${con}p`;
  if (con === 0) return `${g}h`;
  return `${g}h ${con}p`;
}

/**
 * Doi moc ISO sang gio DIA PHUONG CUA MAY CHAM CONG.
 *
 * KHONG dung toLocaleString: no format theo mui gio cua may nguoi xem. Gio cham cong
 * la gio tai noi dat may — HR mo bang cong tu laptop dat mui gio khac (hoac tu may chu
 * chay UTC) phai thay dung con so ma nhan vien da quet.
 */
function doi_ve_gio_may(moc: string | null | undefined): Date | null {
  if (moc === null || moc === undefined) return null;
  const d = new Date(moc);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + mui_gio_offset_gio() * 3600_000);
}

const hai = (n: number): string => String(n).padStart(2, '0');

/** 'HH:MM' theo gio may cham cong. */
export function gio_ngan(moc: string | null | undefined): string {
  const t = doi_ve_gio_may(moc);
  if (t === null) return '—';
  return `${hai(t.getUTCHours())}:${hai(t.getUTCMinutes())}`;
}

/** 'DD/MM/YYYY HH:MM' theo gio may cham cong. */
export function ngay_gio(moc: string | null | undefined): string {
  const t = doi_ve_gio_may(moc);
  if (t === null) return '—';
  return `${hai(t.getUTCDate())}/${hai(t.getUTCMonth() + 1)}/${t.getUTCFullYear()}`
    + ` ${hai(t.getUTCHours())}:${hai(t.getUTCMinutes())}`;
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

/** 'YYYY-MM-DD' hom nay theo gio may cham cong. */
export function hom_nay(): string {
  const t = new Date(Date.now() + mui_gio_offset_gio() * 3600_000);
  return `${t.getUTCFullYear()}-${hai(t.getUTCMonth() + 1)}-${hai(t.getUTCDate())}`;
}

/** Thang hien tai dang 'YYYY-MM' theo gio may cham cong. */
export function thang_nay(): string {
  return hom_nay().slice(0, 7);
}

// ============================================================ trang thai tai
export function DangTai({ chu = 'Đang tải…' }: { chu?: string }): ReactNode {
  return <div className="dang-tai">{chu}</div>;
}

export function HopLoi({ loi }: { loi: unknown }): ReactNode {
  if (loi === null || loi === undefined) return null;
  const chu = loi instanceof Error ? loi.message : String(loi);
  return <div className="hop-thong-bao hop-loi">{chu}</div>;
}

export function HopTot({ chu }: { chu: string | null }): ReactNode {
  if (chu === null) return null;
  return <div className="hop-thong-bao hop-tot">{chu}</div>;
}

export function Trong({ tieu_de, mo_ta }: { tieu_de: string; mo_ta?: string }): ReactNode {
  return (
    <div className="trong">
      <div className="trong-lon">{tieu_de}</div>
      {mo_ta !== undefined && <div>{mo_ta}</div>}
    </div>
  );
}

// ============================================================ nap du lieu
export interface KetQuaNap<T> {
  du_lieu: T | null;
  dang_tai: boolean;
  loi: unknown;
  nap_lai: () => void;
}

/**
 * Nap du lieu tu API. `khoa` doi -> nap lai.
 * Bo qua phan hoi cua request cu neu component da thay doi (chong tranh dua).
 */
export function dung_nap<T>(duong_dan: string | null, khoa: unknown[] = []): KetQuaNap<T> {
  const [du_lieu, dat_du_lieu] = useState<T | null>(null);
  const [dang_tai, dat_dang_tai] = useState(duong_dan !== null);
  const [loi, dat_loi] = useState<unknown>(null);
  const [lan, dat_lan] = useState(0);

  useEffect(() => {
    if (duong_dan === null) {
      dat_dang_tai(false);
      return;
    }
    let con_dung = true;
    dat_dang_tai(true);
    dat_loi(null);
    goi<T>(duong_dan)
      .then((kq) => {
        if (con_dung) dat_du_lieu(kq);
      })
      .catch((e: unknown) => {
        if (con_dung) dat_loi(e);
      })
      .finally(() => {
        if (con_dung) dat_dang_tai(false);
      });
    return () => {
      con_dung = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duong_dan, lan, ...khoa]);

  return { du_lieu, dang_tai, loi, nap_lai: () => dat_lan((n) => n + 1) };
}

// ============================================================ hop thoai
interface HopThoaiProps {
  tieu_de: string;
  children: ReactNode;
  khi_dong: () => void;
  rong?: boolean;
}

export function HopThoai({ tieu_de, children, khi_dong, rong }: HopThoaiProps): ReactNode {
  useEffect(() => {
    const khi_bam = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') khi_dong();
    };
    window.addEventListener('keydown', khi_bam);
    return () => window.removeEventListener('keydown', khi_bam);
  }, [khi_dong]);

  return (
    <div className="man-mo" onClick={khi_dong} role="presentation">
      <div
        className={rong === true ? 'hop-thoai hop-thoai-rong' : 'hop-thoai'}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={tieu_de}
      >
        <div className="dau-trang">
          <h2 style={{ margin: 0 }}>{tieu_de}</h2>
          <button className="nut-phang" onClick={khi_dong} aria-label="Đóng">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ============================================================ nhan trang thai
const NHAN_NGAY: Record<string, { chu: string; lop: string }> = {
  co_mat: { chu: 'Có mặt', lop: 'nhan-tot' },
  vang: { chu: 'Vắng', lop: 'nhan-xau' },
  nghi_phep: { chu: 'Nghỉ phép', lop: 'nhan-lanh' },
  ngay_le: { chu: 'Ngày lễ', lop: 'nhan-canh-bao' },
  nghi_tuan: { chu: 'Nghỉ tuần', lop: 'nhan-mo' },
};

export function NhanNgay({ trang_thai }: { trang_thai: string }): ReactNode {
  const n = NHAN_NGAY[trang_thai] ?? { chu: trang_thai, lop: 'nhan-mo' };
  return <span className={`nhan ${n.lop}`}>{n.chu}</span>;
}

const NHAN_DON: Record<string, { chu: string; lop: string }> = {
  cho_duyet: { chu: 'Chờ duyệt', lop: 'nhan-canh-bao' },
  da_duyet: { chu: 'Đã duyệt', lop: 'nhan-tot' },
  tu_choi: { chu: 'Từ chối', lop: 'nhan-xau' },
  da_huy: { chu: 'Đã hủy', lop: 'nhan-mo' },
  tu_dong: { chu: 'Tự động', lop: 'nhan-tot' },
};

export function NhanDon({ trang_thai }: { trang_thai: string }): ReactNode {
  const n = NHAN_DON[trang_thai] ?? { chu: trang_thai, lop: 'nhan-mo' };
  return <span className={`nhan ${n.lop}`}>{n.chu}</span>;
}

export const TEN_LOAI_NGHI: Record<string, string> = {
  phep_nam: 'Phép năm',
  khong_luong: 'Không lương',
  om: 'Nghỉ ốm',
  thai_san: 'Thai sản',
  ket_hon: 'Kết hôn',
  hieu: 'Nghỉ hiếu',
};

export const TEN_VAI_TRO: Record<string, string> = {
  admin: 'Quản trị',
  nhan_su: 'Nhân sự',
  truong_phong: 'Trưởng phòng',
  nhan_vien: 'Nhân viên',
  cho_duyet: 'Chờ phân quyền',
};

export const TEN_NGUON: Record<string, string> = {
  may: 'Máy chấm công',
  dien_thoai: 'Điện thoại',
  thu_cong: 'Nhập tay',
};

// ============================================================ o so
interface OSoProps {
  nhan: string;
  gia_tri: ReactNode;
  phu?: string;
  mau?: 'tot' | 'xau' | 'canh_bao' | 'lanh';
}

export function OSo({ nhan, gia_tri, phu, mau }: OSoProps): ReactNode {
  const mau_chu = mau === undefined
    ? undefined
    : { tot: 'var(--tot)', xau: 'var(--xau)', canh_bao: 'var(--canh-bao)', lanh: 'var(--lanh)' }[mau];
  return (
    <div className="o-so">
      <div className="o-so-nhan">{nhan}</div>
      <div className="o-so-gia-tri so" style={mau_chu === undefined ? undefined : { color: mau_chu }}>
        {gia_tri}
      </div>
      {phu !== undefined && <div className="o-so-phu">{phu}</div>}
    </div>
  );
}

// ============================================================ hanh dong co xu ly loi
export interface KetQuaHanhDong {
  chay: (ham: () => Promise<unknown>, thong_bao_tot?: string) => Promise<boolean>;
  dang_chay: boolean;
  loi: unknown;
  tot: string | null;
  xoa_thong_bao: () => void;
}

/** Bao boc mot hanh dong ghi du lieu: quan ly co dang chay, loi, va thong bao thanh cong. */
export function dung_hanh_dong(): KetQuaHanhDong {
  const [dang_chay, dat_dang_chay] = useState(false);
  const [loi, dat_loi] = useState<unknown>(null);
  const [tot, dat_tot] = useState<string | null>(null);

  const chay = async (ham: () => Promise<unknown>, thong_bao_tot?: string): Promise<boolean> => {
    dat_dang_chay(true);
    dat_loi(null);
    dat_tot(null);
    try {
      await ham();
      if (thong_bao_tot !== undefined) dat_tot(thong_bao_tot);
      return true;
    } catch (e) {
      dat_loi(e instanceof LoiApi ? e : new Error(e instanceof Error ? e.message : String(e)));
      return false;
    } finally {
      dat_dang_chay(false);
    }
  };

  return {
    chay,
    dang_chay,
    loi,
    tot,
    xoa_thong_bao: () => {
      dat_loi(null);
      dat_tot(null);
    },
  };
}
