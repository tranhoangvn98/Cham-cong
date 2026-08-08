// Lop goi API. Giu token trong bo nho + localStorage, tu lam moi khi 401.

/**
 * Goc cua API.
 *
 *   VITE_API_URL co gia tri -> dung nguyen (vd http://192.168.1.10:8080 khi webapp va API
 *                              nam o hai origin khac nhau)
 *   VITE_API_URL de trong   -> cung origin voi webapp, lay them tien to trien khai tu
 *                              VITE_BASE. Nho vay khi dat duoi /chamcong/ thi loi goi tu
 *                              di toi /chamcong/api/... , khong phai khai hai lan.
 */
const GOC = ((import.meta.env['VITE_API_URL'] as string | undefined) ?? '').replace(/\/+$/, '')
  || (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
const KHOA_LUU = 'cham_cong_phien';

export interface NguoiDung {
  id: string;
  ten_dang_nhap: string;
  vai_tro: 'admin' | 'nhan_su' | 'truong_phong' | 'nhan_vien' | 'cho_duyet';
  nhan_vien_id: string | null;
  ho_ten: string | null;
  phai_doi_mat_khau: boolean;
}

interface Phien {
  token_truy_cap: string;
  token_lam_moi: string;
  /** Mui gio cua may cham cong — moi moc thoi gian phai format theo offset nay. */
  mui_gio_offset_gio?: number;
  nguoi_dung: NguoiDung;
}

export class LoiApi extends Error {
  constructor(readonly ma: number, thong_diep: string) {
    super(thong_diep);
  }
}

let phien: Phien | null = doc_phien();

function doc_phien(): Phien | null {
  try {
    const s = localStorage.getItem(KHOA_LUU);
    return s === null ? null : (JSON.parse(s) as Phien);
  } catch {
    return null;
  }
}

function luu_phien(p: Phien | null): void {
  phien = p;
  if (p === null) localStorage.removeItem(KHOA_LUU);
  else localStorage.setItem(KHOA_LUU, JSON.stringify(p));
}

/**
 * Nhan phien do may chu tra ve qua PHAN NEO cua URL sau khi dang nhap Microsoft.
 *
 * Phan neo (#) khong duoc trinh duyet gui len may chu nen token khong loi vao log truy
 * cap cua reverse proxy. Doc xong xoa ngay khoi thanh dia chi de khong con trong lich su.
 *
 * Tra ve thong bao loi neu may chu bao that bai, null neu URL khong co gi.
 */
export async function nhan_phien_tu_neo(): Promise<string | null> {
  const neo = window.location.hash.replace(/^#/, '');
  if (neo === '') return null;
  const t = new URLSearchParams(neo);
  const truy_cap = t.get('token_truy_cap');
  const lam_moi = t.get('token_lam_moi');
  const loi = t.get('loi_dang_nhap');

  const don_dia_chi = (): void =>
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

  if (loi !== null) { don_dia_chi(); return loi; }
  if (truy_cap === null || lam_moi === null) return null;

  don_dia_chi();
  // Chua co thong tin nguoi dung — lay bang chinh token vua nhan.
  const res = await fetch(`${GOC}/api/xac-thuc/toi`, {
    headers: { authorization: `Bearer ${truy_cap}` },
  });
  if (!res.ok) return 'Không lấy được thông tin tài khoản sau khi đăng nhập.';
  const nd = (await res.json()) as NguoiDung & { mui_gio_offset_gio?: number };
  luu_phien({
    token_truy_cap: truy_cap,
    token_lam_moi: lam_moi,
    mui_gio_offset_gio: nd.mui_gio_offset_gio,
    nguoi_dung: nd,
  });
  return null;
}

/** Cau hinh cong khai cua may chu — de biet co hien nut Microsoft hay khong. */
export async function cau_hinh_dang_nhap(): Promise<{ dang_nhap_microsoft: boolean }> {
  try {
    const res = await fetch(`${GOC}/api/xac-thuc/cau-hinh`);
    if (!res.ok) return { dang_nhap_microsoft: false };
    return (await res.json()) as { dang_nhap_microsoft: boolean };
  } catch {
    return { dang_nhap_microsoft: false };
  }
}

/** Chuyen sang trang dang nhap cua Microsoft, nho duong dan hien tai de quay lai. */
export function di_dang_nhap_microsoft(): void {
  const quay_lai = encodeURIComponent(window.location.pathname.replace(/^\/+/, '/') || '/');
  window.location.href = `${GOC}/api/xac-thuc/microsoft/bat-dau?quay_lai=${quay_lai}`;
}

/**
 * Lam moi phien de lay lai vai tro tu may chu.
 *
 * Vai tro nam trong token nen sau khi admin phan quyen, token dang cam van la `cho_duyet`
 * cho toi khi het han. Ham nay de nguoi dung khong phai dang xuat rooi dang nhap lai.
 */
export async function lam_moi_phien(): Promise<boolean> {
  return lam_moi_token();
}

export function nguoi_dung_hien_tai(): NguoiDung | null {
  return phien?.nguoi_dung ?? null;
}

/**
 * Offset mui gio cua may cham cong (gio). Do may chu quyet dinh, KHONG lay tu trinh duyet.
 * Gio cham cong la gio tai noi dat may: xem tren laptop dat mui gio khac phai ra cung so.
 * Mac dinh 7 (Viet Nam) khi phien cu chua co truong nay.
 */
export function mui_gio_offset_gio(): number {
  const v = phien?.mui_gio_offset_gio;
  return typeof v === 'number' && Number.isFinite(v) ? v : 7;
}

export function da_dang_nhap(): boolean {
  return phien !== null;
}

/** Cac vai tro co quyen quan tri cham cong. */
export function la_nhan_su(): boolean {
  const v = phien?.nguoi_dung.vai_tro;
  return v === 'admin' || v === 'nhan_su';
}

export function la_admin(): boolean {
  return phien?.nguoi_dung.vai_tro === 'admin';
}

// Nhieu request 401 cung luc chi duoc lam moi MOT lan, neu khong token bi xoay
// nhieu lan lien tiep va lan sau lam vo lan truoc.
let dang_lam_moi: Promise<boolean> | null = null;

async function lam_moi_token(): Promise<boolean> {
  if (phien === null) return false;
  if (dang_lam_moi !== null) return dang_lam_moi;

  dang_lam_moi = (async () => {
    try {
      const res = await fetch(`${GOC}/api/xac-thuc/lam-moi`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token_lam_moi: phien?.token_lam_moi }),
      });
      if (!res.ok) {
        luu_phien(null);
        return false;
      }
      luu_phien((await res.json()) as Phien);
      return true;
    } catch {
      return false;
    } finally {
      dang_lam_moi = null;
    }
  })();

  return dang_lam_moi;
}

interface TuyChonGoi {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Khong tu lam moi token (dung cho chinh route lam moi / dang nhap). */
  khong_lam_moi?: boolean;
}

export async function goi<T = unknown>(duong_dan: string, tc: TuyChonGoi = {}): Promise<T> {
  const gui = async (): Promise<Response> => {
    const header: Record<string, string> = {};
    if (tc.body !== undefined) header['content-type'] = 'application/json';
    if (phien !== null) header['authorization'] = `Bearer ${phien.token_truy_cap}`;
    return fetch(`${GOC}${duong_dan}`, {
      method: tc.method ?? 'GET',
      headers: header,
      ...(tc.body === undefined ? {} : { body: JSON.stringify(tc.body) }),
    });
  };

  let res: Response;
  try {
    res = await gui();
  } catch {
    throw new LoiApi(0, 'Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ API.');
  }

  if (res.status === 401 && tc.khong_lam_moi !== true) {
    if (await lam_moi_token()) {
      res = await gui();
    } else {
      luu_phien(null);
      throw new LoiApi(401, 'Phiên đã hết hạn. Vui lòng đăng nhập lại.');
    }
  }

  if (!res.ok) {
    let thong_diep = `Lỗi ${res.status}`;
    try {
      const j = (await res.json()) as { loi?: string };
      if (typeof j.loi === 'string') thong_diep = j.loi;
    } catch {
      /* phan hoi khong phai JSON — giu thong diep mac dinh */
    }
    throw new LoiApi(res.status, thong_diep);
  }

  if (res.status === 204) return undefined as T;
  const kieu = res.headers.get('content-type') ?? '';
  if (!kieu.includes('application/json')) return (await res.text()) as T;
  return (await res.json()) as T;
}

export async function dang_nhap(ten_dang_nhap: string, mat_khau: string): Promise<NguoiDung> {
  const p = await goi<Phien>('/api/xac-thuc/dang-nhap', {
    method: 'POST',
    body: { ten_dang_nhap, mat_khau, thiet_bi: 'Webapp' },
    khong_lam_moi: true,
  });
  luu_phien(p);
  return p.nguoi_dung;
}

export async function dang_xuat(): Promise<void> {
  const tlm = phien?.token_lam_moi;
  luu_phien(null);
  if (tlm !== undefined) {
    try {
      await fetch(`${GOC}/api/xac-thuc/dang-xuat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token_lam_moi: tlm }),
      });
    } catch {
      /* dang xuat phia may chu that bai cung khong sao — token cuc bo da bo */
    }
  }
}

export async function doi_mat_khau(mat_khau_cu: string, mat_khau_moi: string): Promise<void> {
  await goi('/api/xac-thuc/doi-mat-khau', {
    method: 'POST',
    body: { mat_khau_cu, mat_khau_moi },
  });
  // May chu thu hoi moi phien sau khi doi mat khau -> buoc dang nhap lai.
  luu_phien(null);
}

/**
 * Tai tep (CSV) qua fetch de gan duoc header Authorization —
 * the <a download> thuong khong gui duoc token.
 */
export async function tai_tep(duong_dan: string, ten_tep: string): Promise<void> {
  const res = await fetch(`${GOC}${duong_dan}`, {
    headers: phien === null ? {} : { authorization: `Bearer ${phien.token_truy_cap}` },
  });
  if (!res.ok) throw new LoiApi(res.status, `Không tải được tệp (lỗi ${res.status}).`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ten_tep;
  a.click();
  URL.revokeObjectURL(url);
}

/** URL anh selfie kem token — dung cho thuoc tinh src cua <img>. */
export function url_anh(lan_quet_id: string): string {
  return `${GOC}/api/toi/anh/${lan_quet_id}`;
}

/** Tai anh co xac thuc thanh blob URL (the <img> khong gui duoc header). */
export async function tai_anh(lan_quet_id: string): Promise<string> {
  const res = await fetch(url_anh(lan_quet_id), {
    headers: phien === null ? {} : { authorization: `Bearer ${phien.token_truy_cap}` },
  });
  if (!res.ok) throw new LoiApi(res.status, 'Không tải được ảnh.');
  return URL.createObjectURL(await res.blob());
}
