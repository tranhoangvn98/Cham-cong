// Thanh phan dung chung cho toan bo webapp.
import { useEffect, useState, type ReactNode } from 'react';
import { goi, tai_blob, tai_tep, LoiApi, mui_gio_offset_gio } from './api.ts';

/**
 * Khoa React cho mot danh sach CHI DOC, sinh lai toan bo moi lan.
 *
 * `key={i}` thuan lam React gan lai trang thai cua dong nay cho dong khac ngay khi danh sach bi
 * loc / xoa / sap xep. Cac danh sach dung ham nay thi khong — chung la ket qua trich mot tep,
 * thay tep la thay ca danh sach. Nhung ghi ro y do ra bang mot cai ten con hon de mot chu `i`
 * tran cho nguoi doc sau phai tu doan.
 */
export function khoa_tinh(noi_dung: unknown, vi_tri: number): string {
  return `${String(vi_tri)}:${String(noi_dung).slice(0, 32)}`;
}

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

/**
 * Khung xuong cho mot danh sach dang tai.
 *
 * Dung o cac trang danh sach thay cho dong chu "Đang tải…": chu do khong noi gi ve hinh dang
 * thu dang toi, nen moi lan tai xong la mot lan bo cuc nhay va nguoi dung mat cho dang nhin.
 * Khung xuong giu dung cho.
 *
 * `aria-busy` + `aria-live` de trinh doc man hinh noi "đang tải" thay vi doc 6 o trong.
 */
export function XuongDanhSach({ so_dong = 6 }: { so_dong?: number }): ReactNode {
  return (
    <div className="khung-xuong" aria-busy="true" aria-live="polite" aria-label="Đang tải">
      {Array.from({ length: so_dong }, (_, i) => (
        <div key={`xuong-${String(i)}`} className="xuong-dong" />
      ))}
    </div>
  );
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

/**
 * Khoi "chua co gi". `hanh_dong` de dat luon nut tao ngay giua khoi — nut noi mo mot khung
 * rong doc de hon la nut tha o tren roi khung rong o duoi khong dinh gi den nhau.
 */
export function Trong(
  { tieu_de, mo_ta, hanh_dong }: { tieu_de: string; mo_ta?: string; hanh_dong?: ReactNode },
): ReactNode {
  return (
    <div className="trong">
      <div className="trong-lon">{tieu_de}</div>
      {mo_ta !== undefined && <div>{mo_ta}</div>}
      {hanh_dong !== undefined && <div className="trong-hanh-dong">{hanh_dong}</div>}
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

// ============================================================ hoi xac nhan
//
// VI SAO KHONG DUNG `window.confirm`: no la hop thoai cua TRINH DUYET — khong theo che do toi,
// khong theo font va mau cua app, khong xuong dong duoc, khong to do nut xoa khac nut huy, va o
// nhieu trinh duyet co o "chan trang nay hien hop thoai" ma nguoi dung tick vao thi tu do moi
// lan bam Xoa se KHONG hoi gi ma cung KHONG xoa. Mot thao tac mat du lieu khong duoc phep phu
// thuoc vao thu do.
//
// `dung_xac_nhan()` tra ve mot cap: ham `hoi(...)` cho ra `Promise<boolean>`, va mot node phai
// dat vao cay de ve hop thoai. Quen dat node thi `hoi` khong bao gio giai quyet — de thay ngay
// lan bam dau tien, khong phai loi am tham.

export interface YeuCauXacNhan {
  tieu_de: string;
  /** Noi ro se mat gi. Cau "Bạn có chắc?" khong noi gi ca. */
  mo_ta: ReactNode;
  /** Chu tren nut dong y. Mac dinh 'Đồng ý'. */
  chu_dong_y?: string;
  /** `true` = thao tac khong hoan tac duoc; nut dong y to do. */
  nguy_hiem?: boolean;
}

interface DangHoi extends YeuCauXacNhan {
  tra_loi: (dong_y: boolean) => void;
}

export interface KetQuaXacNhan {
  hoi: (yeu_cau: YeuCauXacNhan) => Promise<boolean>;
  /** Dat node nay o dau ra cua thanh phan. */
  hop_thoai: ReactNode;
}

export function dung_xac_nhan(): KetQuaXacNhan {
  const [dang_hoi, dat_dang_hoi] = useState<DangHoi | null>(null);

  const hoi = (yeu_cau: YeuCauXacNhan): Promise<boolean> =>
    new Promise<boolean>((tra) => {
      dat_dang_hoi({
        ...yeu_cau,
        tra_loi: (dong_y) => { dat_dang_hoi(null); tra(dong_y); },
      });
    });

  const hop_thoai = dang_hoi === null ? null : (
    <HopThoai
      tieu_de={dang_hoi.tieu_de}
      // Bam ra ngoai hoac go Esc = KHONG dong y. Mot hop thoai xac nhan dong lai ma coi la
      // dong y thi mot cu bam lac cung xoa duoc du lieu.
      khi_dong={() => dang_hoi.tra_loi(false)}
    >
      <div className="mo-ta">{dang_hoi.mo_ta}</div>
      <div className="hang-nut">
        <button
          className={dang_hoi.nguy_hiem === true ? 'nut-nguy' : undefined}
          onClick={() => dang_hoi.tra_loi(true)}
          autoFocus
        >
          {dang_hoi.chu_dong_y ?? 'Đồng ý'}
        </button>
        <button className="nut-phang" onClick={() => dang_hoi.tra_loi(false)}>Hủy</button>
      </div>
    </HopThoai>
  );

  return { hoi, hop_thoai };
}

// ============================================================ hoi mot dong chu
//
// Thay `window.prompt` — cung ly do nhu tren, cong mot ly do rieng: `prompt` khong co nhan cho o
// nhap, nen nguoi dung chi thay mot cau hoi va mot o trong.

export interface YeuCauNhapChu {
  tieu_de: string;
  nhan: string;
  mo_ta?: ReactNode;
  gia_tri_dau?: string;
  /** Cho phep de trong (vd ly do tu choi la tuy chon). Mac dinh false. */
  cho_trong?: boolean;
  chu_dong_y?: string;
}

interface DangNhapChu extends YeuCauNhapChu {
  tra_loi: (chu: string | null) => void;
}

export interface KetQuaNhapChu {
  /** Tra ve chuoi nguoi dung go, hoac `null` khi ho huy. */
  hoi: (yeu_cau: YeuCauNhapChu) => Promise<string | null>;
  hop_thoai: ReactNode;
}

export function dung_nhap_chu(): KetQuaNhapChu {
  const [dang, dat_dang] = useState<DangNhapChu | null>(null);
  const [chu, dat_chu] = useState('');

  const hoi = (yeu_cau: YeuCauNhapChu): Promise<string | null> =>
    new Promise<string | null>((tra) => {
      dat_chu(yeu_cau.gia_tri_dau ?? '');
      dat_dang({ ...yeu_cau, tra_loi: (v) => { dat_dang(null); tra(v); } });
    });

  const thieu = dang !== null && dang.cho_trong !== true && chu.trim() === '';
  const xong = (): void => {
    if (dang === null || thieu) return;
    dang.tra_loi(chu);
  };

  const hop_thoai = dang === null ? null : (
    <HopThoai tieu_de={dang.tieu_de} khi_dong={() => dang.tra_loi(null)}>
      {dang.mo_ta !== undefined && <p className="mo-ta">{dang.mo_ta}</p>}
      <label htmlFor="xn-chu">{dang.nhan}</label>
      <input
        id="xn-chu"
        value={chu}
        autoFocus
        onChange={(e) => dat_chu(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') xong(); }}
      />
      <div className="hang-nut">
        <button onClick={xong} disabled={thieu}>{dang.chu_dong_y ?? 'Xác nhận'}</button>
        <button className="nut-phang" onClick={() => dang.tra_loi(null)}>Hủy</button>
      </div>
    </HopThoai>
  );

  return { hoi, hop_thoai };
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
  truong_phong_nhan_su: 'TP nhân sự',
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
  /**
   * Nhu `chay` nhung TRA VE KET QUA cua lan goi, null khi loi.
   *
   * Can rieng mot ham vi `chay` tra ve boolean. Ai muon dung ket qua ma goi `chay` roi
   * `as unknown as T` se nhan duoc `true` da bi ep kieu — trinh bien dich khong can, va
   * man hinh se trang khi doc thuoc tinh dau tien. Da xay ra that o trang Dong bo ERP.
   */
  chay_lay: <T>(ham: () => Promise<T>, thong_bao_tot?: string) => Promise<T | null>;
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

  const chay_lay = async <T,>(ham: () => Promise<T>, thong_bao_tot?: string): Promise<T | null> => {
    dat_dang_chay(true);
    dat_loi(null);
    dat_tot(null);
    try {
      const kq = await ham();
      if (thong_bao_tot !== undefined) dat_tot(thong_bao_tot);
      return kq;
    } catch (e) {
      dat_loi(e instanceof LoiApi ? e : new Error(e instanceof Error ? e.message : String(e)));
      return null;
    } finally {
      dat_dang_chay(false);
    }
  };

  return {
    chay,
    chay_lay,
    dang_chay,
    loi,
    tot,
    xoa_thong_bao: () => {
      dat_loi(null);
      dat_tot(null);
    },
  };
}


// ============================================================ nhap tu tep
interface TomTatNhap {
  tong?: number;
  se_tao?: number;
  se_cap_nhat?: number;
  loi?: number;
  dong?: { dong: number; ma_nv: string; ho_ten: string; viec: string; loi: string | null }[];
  ban_ghi?: number;
  dong_bo_qua?: number;
  som_nhat?: string | null;
  muon_nhat?: string | null;
  so_pin?: number;
  da_nhan?: number;
  trung?: number;
  dong_loi?: number;
  chua_map_pin?: string[];
}

/**
 * Hop thoai nhap tu tep, dung chung cho nhan vien va lich su cham cong.
 *
 * Luon di hai buoc: doc tep -> XEM TRUOC (may chu kiem het nhung khong ghi) -> nguoi dung
 * doc ket qua roi moi bam nhap that. Nhap thang mot phat vao du lieu luong la duong nhanh
 * nhat den mot bang cong sai ma khong ai biet sai tu dau.
 */
export function HopThoaiNhap(
  { tieu_de, duong_dan, mo_ta, tep_mau, ten_tep_mau, tuy_chon, them_than, khi_dong, khi_xong }: {
    tieu_de: string;
    duong_dan: string;
    mo_ta: ReactNode;
    tep_mau: string;
    ten_tep_mau: string;
    /** O tuy chon rieng cua tung loai nhap, hien ngay tren o chon tep. */
    tuy_chon?: ReactNode;
    them_than?: Record<string, unknown>;
    khi_dong: () => void;
    khi_xong: () => void;
  },
): ReactNode {
  const [noi_dung, dat_noi_dung] = useState('');
  const [ten_tep, dat_ten_tep] = useState('');
  const [xem, dat_xem] = useState<TomTatNhap | null>(null);
  const [da_nhap, dat_da_nhap] = useState(false);
  const hd = dung_hanh_dong();

  // Doi tuy chon (vi du bat "tao muc con thieu") thi ket qua xem truoc cu khong con dung
  // nua — bo di, bat nguoi dung kiem lai. Neu khong ho se bam "Nhap that" dua tren mot ban
  // xem truoc tinh bang bo tuy chon khac.
  const khoa_tuy_chon = JSON.stringify(them_than ?? {});
  useEffect(() => {
    dat_xem(null);
    dat_da_nhap(false);
  }, [khoa_tuy_chon]);

  const chon_tep = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const f = e.target.files?.[0];
    if (f === undefined) return;
    dat_ten_tep(f.name);
    dat_xem(null);
    dat_da_nhap(false);
    dat_noi_dung(await f.text());
  };

  const goi_nhap = async (xem_truoc: boolean): Promise<void> => {
    // `hd.chay` chi tra ve thanh cong/that bai chu KHONG tra ve than phan hoi, nen phai
    // bat ket qua ngay trong ham goi. Doc gia tri tra ve cua `chay` roi ep kieu se cho ra
    // mot object rong ma TypeScript van nhan — hop thoai im lang khong hien gi.
    let than: TomTatNhap | null = null;
    const ok = await hd.chay(
      async () => {
        than = await goi<TomTatNhap>(duong_dan, {
          method: 'POST',
          body: { noi_dung, xem_truoc, ...(them_than ?? {}) },
        });
      },
      xem_truoc ? undefined : 'Đã nhập xong.',
    );
    if (!ok || than === null) return;
    dat_xem(than);
    if (!xem_truoc) dat_da_nhap(true);
  };

  const tai_mau = (): void => {
    // BOM UTF-8 de Excel tren Windows mo ra khong bi vo dau tieng Viet.
    const blob = new Blob(['\ufeff' + tep_mau], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = ten_tep_mau;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const co_loi = (xem?.loi ?? 0) > 0;

  return (
    <HopThoai tieu_de={tieu_de} khi_dong={khi_dong}>
      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />

      <div className="mo-ta" style={{ marginBottom: 12 }}>{mo_ta}</div>

      <div className="hang-nut" style={{ marginBottom: 12 }}>
        <button type="button" onClick={tai_mau}>Tải tệp mẫu</button>
      </div>

      {tuy_chon}

      <div className="o-nhap">
        <label htmlFor="tep">Chọn tệp CSV</label>
        <input id="tep" type="file" accept=".csv,.txt,.dat,text/csv,text/plain"
          onChange={(e) => void chon_tep(e)} />
        {ten_tep !== '' && <div className="goi-y">{ten_tep}</div>}
      </div>

      {xem !== null && (
        <div className="the" style={{ marginTop: 4 }}>
          <h3>{da_nhap ? 'Kết quả nhập' : 'Xem trước — chưa ghi gì'}</h3>
          <div className="hang-nhan">
            {xem.tong !== undefined && <span className="nhan nhan-mo">{xem.tong} dòng</span>}
            {xem.se_tao !== undefined && <span className="nhan nhan-tot">{da_nhap ? 'đã tạo' : 'sẽ tạo'} {xem.se_tao}</span>}
            {xem.se_cap_nhat !== undefined && <span className="nhan nhan-lanh">{da_nhap ? 'đã cập nhật' : 'sẽ cập nhật'} {xem.se_cap_nhat}</span>}
            {xem.ban_ghi !== undefined && <span className="nhan nhan-mo">{xem.ban_ghi} bản ghi</span>}
            {xem.so_pin !== undefined && <span className="nhan nhan-mo">{xem.so_pin} PIN</span>}
            {xem.da_nhan !== undefined && <span className="nhan nhan-tot">nhận {xem.da_nhan}</span>}
            {xem.trung !== undefined && xem.trung > 0 && <span className="nhan nhan-lanh">trùng {xem.trung} (bỏ qua)</span>}
            {(xem.loi ?? 0) > 0 && <span className="nhan nhan-xau">lỗi {xem.loi}</span>}
            {(xem.dong_bo_qua ?? 0) > 0 && <span className="nhan nhan-canh-bao">bỏ qua {xem.dong_bo_qua} dòng</span>}
          </div>

          {(xem.som_nhat ?? null) !== null && (
            <div className="goi-y">Khoảng thời gian: {xem.som_nhat} → {xem.muon_nhat}</div>
          )}

          {(xem.chua_map_pin ?? []).length > 0 && (
            <div className="hop-thong-bao hop-luu-y" style={{ marginTop: 8 }}>
              <strong>{(xem.chua_map_pin ?? []).length} PIN chưa gán cho nhân viên nào:</strong>{' '}
              {(xem.chua_map_pin ?? []).slice(0, 20).join(', ')}
              {(xem.chua_map_pin ?? []).length > 20 ? '…' : ''}. Log của các PIN này vẫn được lưu
              nhưng chưa tính vào bảng công ai — khai PIN cho nhân viên rồi bấm "Gán lại" ở trang
              Log chấm công.
            </div>
          )}

          {(xem.dong ?? []).filter((d) => d.viec === 'loi').length > 0 && (
            <div className="vo-bang" style={{ maxHeight: 220, overflowY: 'auto', marginTop: 8 }}>
              <table>
                <thead><tr><th>Dòng</th><th>Mã NV</th><th>Lý do</th></tr></thead>
                <tbody>
                  {(xem.dong ?? []).filter((d) => d.viec === 'loi').map((d) => (
                    <tr key={d.dong}>
                      <td className="so">{d.dong}</td>
                      <td>{d.ma_nv || '—'}</td>
                      <td className="chu-xau">{d.loi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {co_loi && !da_nhap && (
            <div className="hop-thong-bao hop-luu-y" style={{ marginTop: 8 }}>
              Những dòng lỗi sẽ bị <strong>bỏ qua</strong>, các dòng còn lại vẫn nhập được.
              Sửa tệp rồi nhập lại nếu muốn đủ.
            </div>
          )}
        </div>
      )}

      <div className="hang-nut">
        {!da_nhap && (
          <>
            <button type="button" onClick={() => void goi_nhap(true)}
              disabled={hd.dang_chay || noi_dung === ''}>
              {hd.dang_chay ? 'Đang kiểm…' : 'Kiểm tra tệp'}
            </button>
            <button type="button" className="nut-chinh" onClick={() => void goi_nhap(false)}
              disabled={hd.dang_chay || xem === null}>
              Nhập thật
            </button>
          </>
        )}
        <button type="button" onClick={da_nhap ? khi_xong : khi_dong}>
          {da_nhap ? 'Xong' : 'Hủy'}
        </button>
      </div>
    </HopThoai>
  );
}

// ============================================================ xem nhanh tệp đính kèm

interface TrichNoiDung {
  loai: 'van_ban' | 'bang';
  ten_goc: string;
  doan?: string[];
  hang?: string[][];
  cat_bot: boolean;
}

/** Đoán cách xem theo tên tệp. Máy chủ vẫn là bên quyết định cuối cùng. */
function cach_xem(ten: string): 'anh' | 'pdf' | 'office' | 'khac' {
  const duoi = (ten.split('.').pop() ?? '').toLowerCase();
  if (['jpg', 'jpeg', 'png'].includes(duoi)) return 'anh';
  if (duoi === 'pdf') return 'pdf';
  if (['docx', 'xlsx'].includes(duoi)) return 'office';
  return 'khac';
}

/**
 * Popup xem nhanh tệp đính kèm: ảnh, PDF, Word, Excel.
 *
 * Ba đường khác nhau vì ba loại rủi ro khác nhau:
 *   - Ảnh: nạp về blob rồi vẽ bằng <img>. Ảnh không chạy được mã.
 *   - PDF: nhúng trong <iframe sandbox>. Máy chủ đã gắn CSP sandbox; thẻ này là lớp thứ
 *     hai. Không có `allow-same-origin` nên khung nằm ở một gốc riêng — một PDF có
 *     JavaScript không với được token của người đang đăng nhập.
 *   - Word/Excel: trình duyệt không vẽ được, nên máy chủ bóc chữ ra và ở đây chỉ hiển thị
 *     chữ. Không có tệp nào được nhúng vào trang.
 */
export function HopThoaiXemTep(
  { tep_id, ten_goc, khi_dong }: { tep_id: string; ten_goc: string; khi_dong: () => void },
): ReactNode {
  const [url, dat_url] = useState<string | null>(null);
  const [trich, dat_trich] = useState<TrichNoiDung | null>(null);
  const [loi, dat_loi] = useState<unknown>(null);
  const [dang_tai, dat_dang_tai] = useState(true);
  const kieu = cach_xem(ten_goc);
  const hd = dung_hanh_dong();

  useEffect(() => {
    let bo_url: string | null = null;
    let con_song = true;

    void (async () => {
      try {
        if (kieu === 'anh' || kieu === 'pdf') {
          const b = await tai_blob(`/api/ho-so/tep/${tep_id}/xem`);
          if (!con_song) { URL.revokeObjectURL(b.url); return; }
          bo_url = b.url;
          dat_url(b.url);
        } else if (kieu === 'office') {
          dat_trich(await goi<TrichNoiDung>(`/api/ho-so/tep/${tep_id}/trich`));
        }
      } catch (e) {
        if (con_song) dat_loi(e);
      } finally {
        if (con_song) dat_dang_tai(false);
      }
    })();

    // Thu hoi blob khi đóng, nếu không nó nằm lại trong bộ nhớ tab cho tới khi tải lại trang.
    return () => {
      con_song = false;
      if (bo_url !== null) URL.revokeObjectURL(bo_url);
    };
  }, [tep_id, kieu]);

  return (
    <HopThoai tieu_de={ten_goc} khi_dong={khi_dong} rong>
      <HopLoi loi={loi} />
      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />

      {dang_tai ? <DangTai chu="Đang mở tệp…" /> : (
        <div className="khung-xem-tep">
          {kieu === 'anh' && url !== null && (
            <img src={url} alt={ten_goc} className="anh-xem-tep" />
          )}

          {kieu === 'pdf' && url !== null && (
            <iframe
              src={url}
              title={ten_goc}
              className="khung-pdf"
              // KHÔNG đặt `sandbox` ở đây — và đây là một đánh đổi có chủ ý.
              //
              // Đã đo trên Chromium: `sandbox=""` lẫn `sandbox="allow-scripts"` đều làm
              // `contentDocument` thành null và khung chỉ hiện icon tài liệu hỏng, dù
              // `navigator.pdfViewerEnabled` là true. Bộ đọc PDF dựng sẵn bị sandbox chặn
              // hoàn toàn. Giữ sandbox nghĩa là bỏ hẳn tính năng xem PDF.
              //
              // Cái thay thế nó không phải là hy vọng:
              //   1. Máy chủ nhận dạng tệp bằng magic byte, nên thứ nằm ở đây CHẮC CHẮN là
              //      PDF. Rủi ro kinh điển — HTML đội lốt .pdf rồi chạy script trong gốc của
              //      webapp — bị chặn từ lúc tải lên.
              //   2. PDF được vẽ bởi tiến trình xem PDF riêng của trình duyệt. JavaScript
              //      trong PDF (nếu có) chạy trong bộ máy đó và không với được DOM, cookie
              //      hay localStorage của trang bọc ngoài.
              //   3. Đường tải xuống vẫn là `attachment`, và đường xem trực tiếp trên máy chủ
              //      vẫn gắn CSP `sandbox` cho trường hợp có ai mở thẳng địa chỉ.
            />
          )}

          {kieu === 'office' && trich !== null && trich.loai === 'van_ban' && (
            <div className="xem-van-ban">
              {(trich.doan ?? []).map((d, i) => <p key={khoa_tinh(d, i)}>{d}</p>)}
              {(trich.doan ?? []).length === 0 && (
                <p className="mo-ta">Tệp không có nội dung chữ để hiển thị.</p>
              )}
            </div>
          )}

          {kieu === 'office' && trich !== null && trich.loai === 'bang' && (
            <div className="vo-bang">
              <table>
                <tbody>
                  {(trich.hang ?? []).map((h, i) => (
                    <tr key={khoa_tinh(h[0], i)}>
                      {h.map((o, j) => (
                        i === 0
                          ? <th key={khoa_tinh(o, j)}>{o}</th>
                          : <td key={khoa_tinh(o, j)}>{o}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {kieu === 'khac' && (
            <Trong
              tieu_de="Định dạng này không xem nhanh được"
              mo_ta="Tải tệp về để mở bằng phần mềm trên máy."
            />
          )}

          {trich?.cat_bot === true && (
            <div className="hop-thong-bao hop-luu-y">
              Bản xem nhanh đã cắt bớt cho gọn. Tải tệp về để xem đầy đủ.
            </div>
          )}
        </div>
      )}

      <div className="hang-nut">
        <button type="button" className="nut-chinh" onClick={() => void hd.chay(
          () => tai_tep(`/api/ho-so/tep/${tep_id}`, ten_goc), 'Đã tải tệp về.',
        )}>
          Tải về
        </button>
        <button type="button" onClick={khi_dong}>Đóng</button>
      </div>
    </HopThoai>
  );
}
