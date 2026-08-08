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
                      <td style={{ color: 'var(--xau)' }}>{d.loi}</td>
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
