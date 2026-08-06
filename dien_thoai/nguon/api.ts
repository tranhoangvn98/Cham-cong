// Lop goi API cho app dien thoai.
//
// Token luu trong SecureStore (Keychain tren iOS / Keystore tren Android), KHONG dung
// AsyncStorage: du lieu AsyncStorage doc duoc tren may da root/jailbreak.
import * as SecureStore from 'expo-secure-store';

const KHOA_PHIEN = 'cham_cong_phien';
const KHOA_MAY_CHU = 'cham_cong_may_chu';

export type VaiTro = 'admin' | 'nhan_su' | 'truong_phong' | 'nhan_vien';

export interface NguoiDung {
  id: string;
  ten_dang_nhap: string;
  vai_tro: VaiTro;
  nhan_vien_id: string | null;
  ho_ten: string | null;
  phai_doi_mat_khau: boolean;
}

export interface Phien {
  token_truy_cap: string;
  token_lam_moi: string;
  /** Mui gio may cham cong — moi moc thoi gian phai hien theo offset nay. */
  mui_gio_offset_gio?: number;
  nguoi_dung: NguoiDung;
}

export class LoiApi extends Error {
  constructor(readonly ma: number, thong_diep: string) {
    super(thong_diep);
  }
}

let phien: Phien | null = null;
let goc_may_chu = '';

/**
 * Nap phien + dia chi may chu tu SecureStore khi mo app.
 *
 * Doc hai gia tri trong HAI try RIENG: neu doc phien that bai (keychain loi, du lieu
 * hong) thi dia chi may chu da luu KHONG duoc mat theo — neu khong, nguoi dung bi bat
 * nhap lai dia chi may chu chi vi mot loi khong lien quan.
 */
export async function nap_phien_da_luu(): Promise<Phien | null> {
  try {
    goc_may_chu = (await SecureStore.getItemAsync(KHOA_MAY_CHU)) ?? goc_may_chu_mac_dinh();
  } catch {
    goc_may_chu = goc_may_chu_mac_dinh();
  }

  try {
    const s = await SecureStore.getItemAsync(KHOA_PHIEN);
    phien = s === null ? null : (JSON.parse(s) as Phien);
  } catch {
    phien = null;
  }
  return phien;
}

function goc_may_chu_mac_dinh(): string {
  const tu_env = process.env['EXPO_PUBLIC_API_URL'];
  return typeof tu_env === 'string' && tu_env.trim() !== '' ? tu_env.trim() : '';
}

export function may_chu(): string {
  return goc_may_chu;
}

/** Dat dia chi may chu. Chuan hoa: bo dau '/' cuoi, tu them http:// neu thieu. */
export async function dat_may_chu(dia_chi: string): Promise<void> {
  let s = dia_chi.trim();
  if (s === '') throw new LoiApi(0, 'Chưa nhập địa chỉ máy chủ.');
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  s = s.replace(/\/+$/, '');
  goc_may_chu = s;
  try {
    await SecureStore.setItemAsync(KHOA_MAY_CHU, s);
  } catch (loi) {
    console.warn('[api] khong luu duoc dia chi may chu:', (loi as Error).message);
  }
}

export function phien_hien_tai(): Phien | null {
  return phien;
}

export function nguoi_dung_hien_tai(): NguoiDung | null {
  return phien?.nguoi_dung ?? null;
}

/**
 * Offset mui gio cua may cham cong. Do may chu quyet dinh, KHONG lay tu dien thoai:
 * gio cham cong la gio tai noi dat may. Mac dinh 7 (Viet Nam).
 */
export function mui_gio_offset_gio(): number {
  const v = phien?.mui_gio_offset_gio;
  return typeof v === 'number' && Number.isFinite(v) ? v : 7;
}

async function luu_phien(p: Phien | null): Promise<void> {
  // Cap nhat bo nho TRUOC: du ghi dia that bai thi phien hien tai van dung duoc,
  // chi la lan mo app sau phai dang nhap lai.
  phien = p;
  try {
    if (p === null) await SecureStore.deleteItemAsync(KHOA_PHIEN);
    else await SecureStore.setItemAsync(KHOA_PHIEN, JSON.stringify(p));
  } catch (loi) {
    console.warn('[api] khong luu duoc phien vao SecureStore:', (loi as Error).message);
  }
}

// Nhieu request 401 cung luc chi duoc lam moi MOT lan: token lam moi CO XOAY nen goi
// song song se lam vo nhau va nguoi dung bi dang xuat oan.
let dang_lam_moi: Promise<boolean> | null = null;

async function lam_moi_token(): Promise<boolean> {
  if (phien === null) return false;
  if (dang_lam_moi !== null) return dang_lam_moi;

  dang_lam_moi = (async () => {
    try {
      const res = await fetch(`${goc_may_chu}/api/xac-thuc/lam-moi`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token_lam_moi: phien?.token_lam_moi }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        await luu_phien(null);
        return false;
      }
      await luu_phien((await res.json()) as Phien);
      return true;
    } catch {
      // Mat mang: KHONG xoa phien, de nguoi dung thu lai khi co mang.
      return false;
    } finally {
      dang_lam_moi = null;
    }
  })();

  return dang_lam_moi;
}

interface TuyChon {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  khong_lam_moi?: boolean;
  /** Thoi gian cho toi da (ms). Mang 3G/4G yeu can nhieu thoi gian hon. */
  cho_toi_da?: number;
}

export async function goi<T = unknown>(duong_dan: string, tc: TuyChon = {}): Promise<T> {
  if (goc_may_chu === '') {
    throw new LoiApi(0, 'Chưa cấu hình địa chỉ máy chủ. Vào Cá nhân → Địa chỉ máy chủ.');
  }

  const gui = async (): Promise<Response> => {
    const header: Record<string, string> = {};
    if (tc.body !== undefined) header['content-type'] = 'application/json';
    if (phien !== null) header['authorization'] = `Bearer ${phien.token_truy_cap}`;
    return fetch(`${goc_may_chu}${duong_dan}`, {
      method: tc.method ?? 'GET',
      headers: header,
      ...(tc.body === undefined ? {} : { body: JSON.stringify(tc.body) }),
      signal: AbortSignal.timeout(tc.cho_toi_da ?? 25_000),
    });
  };

  let res: Response;
  try {
    res = await gui();
  } catch (loi) {
    const la_het_gio = (loi as Error).name === 'TimeoutError';
    throw new LoiApi(
      0,
      la_het_gio
        ? 'Máy chủ không phản hồi. Kiểm tra kết nối mạng rồi thử lại.'
        : 'Không kết nối được máy chủ. Kiểm tra mạng và địa chỉ máy chủ.',
    );
  }

  if (res.status === 401 && tc.khong_lam_moi !== true) {
    if (await lam_moi_token()) {
      res = await gui();
    } else {
      await luu_phien(null);
      throw new LoiApi(401, 'Phiên đã hết hạn. Vui lòng đăng nhập lại.');
    }
  }

  if (!res.ok) {
    let thong_diep = `Lỗi ${res.status}`;
    try {
      const j = (await res.json()) as { loi?: string };
      if (typeof j.loi === 'string') thong_diep = j.loi;
    } catch {
      /* phan hoi khong phai JSON */
    }
    throw new LoiApi(res.status, thong_diep);
  }

  if (res.status === 204) return undefined as T;
  const kieu = res.headers.get('content-type') ?? '';
  if (!kieu.includes('application/json')) return (await res.text()) as T;
  return (await res.json()) as T;
}

export async function dang_nhap(
  ten_dang_nhap: string,
  mat_khau: string,
  mo_ta_thiet_bi: string,
): Promise<Phien> {
  const p = await goi<Phien>('/api/xac-thuc/dang-nhap', {
    method: 'POST',
    body: { ten_dang_nhap, mat_khau, thiet_bi: mo_ta_thiet_bi },
    khong_lam_moi: true,
  });
  await luu_phien(p);
  return p;
}

export async function dang_xuat(): Promise<void> {
  const tlm = phien?.token_lam_moi;
  await luu_phien(null);
  if (tlm !== undefined && goc_may_chu !== '') {
    try {
      await fetch(`${goc_may_chu}/api/xac-thuc/dang-xuat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token_lam_moi: tlm }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      /* token cuc bo da bo, khong sao neu may chu chua biet */
    }
  }
}

export async function doi_mat_khau(cu: string, moi: string): Promise<void> {
  await goi('/api/xac-thuc/doi-mat-khau', {
    method: 'POST',
    body: { mat_khau_cu: cu, mat_khau_moi: moi },
  });
  // May chu thu hoi moi phien sau khi doi mat khau -> buoc dang nhap lai.
  await luu_phien(null);
}

/** Kiem tra dia chi may chu co dung khong TRUOC khi bat nguoi dung nhap mat khau. */
export async function thu_ket_noi(dia_chi: string): Promise<void> {
  let s = dia_chi.trim();
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  s = s.replace(/\/+$/, '');
  let res: Response;
  try {
    res = await fetch(`${s}/health`, { signal: AbortSignal.timeout(12_000) });
  } catch {
    throw new LoiApi(0, 'Không kết nối được. Kiểm tra địa chỉ và mạng (cần cùng mạng với máy chủ).');
  }
  if (!res.ok) throw new LoiApi(res.status, `Máy chủ trả về lỗi ${res.status}.`);
  const j = (await res.json()) as { trang_thai?: string };
  if (j.trang_thai !== 'ok') throw new LoiApi(503, 'Máy chủ đang có sự cố cơ sở dữ liệu.');
}

/**
 * Gui lan cham cong bang dien thoai: multipart voi toa do + anh selfie.
 * Dung FormData cua React Native (ho tro { uri, name, type } cho tep cuc bo).
 */
export interface KetQuaChamCong {
  ok: boolean;
  id: string;
  thoi_diem: string;
  trang_thai: number;
  trang_thai_duyet: 'tu_dong' | 'cho_duyet';
  dia_diem: string | null;
  khoang_cach_m: number | null;
  thong_bao: string;
}

export async function gui_cham_cong(tham_so: {
  anh_uri: string;
  vi_do: number;
  kinh_do: number;
  do_chinh_xac_m: number | null;
  trang_thai: 0 | 1;
  gps_gia_lap: boolean;
}): Promise<KetQuaChamCong> {
  if (goc_may_chu === '') throw new LoiApi(0, 'Chưa cấu hình địa chỉ máy chủ.');

  const dung_form = (): FormData => {
    const form = new FormData();
    form.append('vi_do', String(tham_so.vi_do));
    form.append('kinh_do', String(tham_so.kinh_do));
    if (tham_so.do_chinh_xac_m !== null) {
      form.append('do_chinh_xac_m', String(Math.round(tham_so.do_chinh_xac_m)));
    }
    form.append('trang_thai', String(tham_so.trang_thai));
    form.append('gps_gia_lap', tham_so.gps_gia_lap ? 'true' : 'false');
    // React Native cho phep dinh kem tep cuc bo bang { uri, name, type }.
    form.append('anh', {
      uri: tham_so.anh_uri,
      name: 'selfie.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    return form;
  };

  const gui = async (): Promise<Response> =>
    fetch(`${goc_may_chu}/api/toi/cham-cong`, {
      method: 'POST',
      headers: phien === null ? {} : { authorization: `Bearer ${phien.token_truy_cap}` },
      body: dung_form(),
      // Anh co the vai MB tren mang yeu.
      signal: AbortSignal.timeout(60_000),
    });

  let res: Response;
  try {
    res = await gui();
  } catch (loi) {
    throw new LoiApi(
      0,
      (loi as Error).name === 'TimeoutError'
        ? 'Gửi ảnh quá lâu. Kiểm tra mạng rồi thử lại.'
        : 'Không gửi được. Kiểm tra kết nối mạng.',
    );
  }

  if (res.status === 401 && (await lam_moi_token())) {
    res = await gui();
  }

  const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new LoiApi(res.status, typeof j['loi'] === 'string' ? j['loi'] : `Lỗi ${res.status}`);
  }
  return j as unknown as KetQuaChamCong;
}

/** Tai anh selfie (co xac thuc) thanh data URI de hien trong the Image. */
export async function tai_anh_base64(lan_quet_id: string): Promise<string | null> {
  try {
    const res = await fetch(`${goc_may_chu}/api/toi/anh/${lan_quet_id}`, {
      headers: phien === null ? {} : { authorization: `Bearer ${phien.token_truy_cap}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    let nhi_phan = '';
    const byte = new Uint8Array(buf);
    for (let i = 0; i < byte.length; i++) nhi_phan += String.fromCharCode(byte[i] as number);
    const kieu = res.headers.get('content-type') ?? 'image/jpeg';
    return `data:${kieu};base64,${globalThis.btoa(nhi_phan)}`;
  } catch {
    return null;
  }
}
