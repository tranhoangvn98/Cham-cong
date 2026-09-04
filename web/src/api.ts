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

/**
 * Goc API dang tuyet doi, de hien link cho NGUOI DUNG chep di noi khac.
 *
 * KHONG dung window.location.origin cho viec nay: webapp chay duoi tien to (vd /chamcong/)
 * nen origin khong thoi se ra link thieu tien to, chep sang he thong khac la 404.
 */
export function goc_api_tuyet_doi(): string {
  return `${window.location.origin}${GOC}`;
}
const KHOA_LUU = 'cham_cong_phien';

export type VaiTroNguoiDung =
  | 'admin' | 'nhan_su' | 'truong_phong_nhan_su' | 'truong_phong' | 'nhan_vien' | 'cho_duyet';

export interface NguoiDung {
  id: string;
  ten_dang_nhap: string;
  vai_tro: VaiTroNguoiDung;
  nhan_vien_id: string | null;
  ho_ten: string | null;
  phai_doi_mat_khau: boolean;
  /** Truong phong duoc admin cap quyen xem man hinh quan tri. Vai tro nhan su luon co. */
  quyen_quan_tri?: boolean;
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

// ==================================================================== cong SSO noi bo
//
// Khi may chu bao `dang_nhap_rieng: false`, webapp KHONG hien form nao ca. Token do CONG phat
// va cong luu no o `localStorage['cong_phien']`; webapp chay cung origin
// (`teams.tranhoangvietnam.com/chamcong`) nen doc duoc thang tu do.
//
// KHONG luu lai token do vao khoa rieng cua minh. Cong la chu so huu: no xoay token, no thu
// hoi token. Ta chep ra mot ban la ta giu mot phien dai hon phien cua cong — dung cai ma hop
// dong bao mat cam. Nen moi lan goi API deu DOC LAI tu `cong_phien`.

interface CauHinhCong {
  goc_dang_nhap: string;
  tien_to: string;
  iss: string;
}

export interface CauHinhDangNhap {
  /** false = da bo duong dang nhap rieng, phai chuyen huong sang cong. */
  dang_nhap_rieng: boolean;
  dang_nhap_microsoft: boolean;
  cong_sso: CauHinhCong | null;
}

let cau_hinh_cong: CauHinhCong | null = null;

/** true khi dang chay o che do dung chung cong. */
export function dung_cong_sso(): boolean {
  return cau_hinh_cong !== null;
}

/**
 * Lay token cua cong tu `localStorage['cong_phien']`.
 *
 * NHAN RA token theo `iss` trong payload, KHONG theo ten truong. Ten truong ben trong
 * `cong_phien` la hop dong cua cong: no doi ten `token_truy_cap` thanh `access_token` la ta
 * gay, va gay im lang. Quet moi chuoi trong do va lay cai nao la JWT co `iss` dung va
 * `loai: 'tc'` thi mien nhiem voi viec doi ten.
 *
 * Doc payload o day KHONG phai mot phep kiem bao mat — chu ky do MAY CHU xac minh. Day chi la
 * viec chon dung chuoi de gui di.
 */
export function doc_token_cong(): string | null {
  const c = cau_hinh_cong;
  if (c === null) return null;
  let tho: string | null;
  try {
    tho = localStorage.getItem('cong_phien');
  } catch {
    return null; // localStorage bi chan (che do rieng tu)
  }
  if (tho === null || tho === '') return null;

  const ung_vien: string[] = [];
  try {
    const v = JSON.parse(tho) as unknown;
    if (typeof v === 'string') ung_vien.push(v);
    else if (typeof v === 'object' && v !== null) {
      for (const x of Object.values(v as Record<string, unknown>)) {
        if (typeof x === 'string') ung_vien.push(x);
      }
    }
  } catch {
    ung_vien.push(tho); // khong phai JSON: co the la chinh token
  }

  for (const t of ung_vien) {
    const phan = t.split('.');
    if (phan.length !== 3) continue;
    try {
      const than = JSON.parse(atob(phan[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as
        { iss?: unknown; loai?: unknown };
      if (than.iss === c.iss && than.loai === 'tc') return t;
    } catch {
      /* khong phai JWT doc duoc — thu chuoi ke tiep */
    }
  }
  return null;
}

/**
 * Duong dan noi bo hop le de dat vao `?quay_lai=`.
 *
 * Dung phep kiem cua cong: dung MOT `/` dau, khong `//`, khong `\\`, khong ky tu dieu khien.
 * Khong kiem la mo duong chuyen huong mo — ke tan cong gui link dang nhap THAT roi day nan
 * nhan sang trang gia sau khi dang nhap xong, va nan nhan vua go mat khau o mot trang that.
 */
/**
 * Ky tu bi tu choi trong mot duong dan: MOI ky tu dieu khien, ke ca tab, LF, CR.
 *
 * Tab/LF/CR la ba ky tu ma bo phan tich URL theo WHATWG XOA khi doc mot URL. Nen
 * `/<tab>/evil.com` KHONG phai duong dan noi bo — sau khi phan tich no la `//evil.com`, mot URL
 * tuong doi giao thuc tro RA NGOAI. Mot phep kiem `startsWith('//')` chay tren chuoi CHUA xoa
 * khong bat duoc gi, vi luc do ky tu dieu khien con nam giua hai dau gach.
 *
 * Da xac minh tren Chromium that, khong suy tu dac ta:
 *   ?quay_lai=/%09/evil.com  ->  https://evil.com/
 *   ?quay_lai=/%0a/evil.com  ->  https://evil.com/
 *   ?quay_lai=/%0d/evil.com  ->  https://evil.com/
 *
 * Vi sao dang so: ke tan cong gui link dang nhap THAT cua cong ty. Nan nhan doc thanh dia chi,
 * thay dung ten mien, dung chung chi, go mat khau, roi bi day sang trang gia — moi thu ho duoc
 * day phai kiem deu dung.
 */
const KY_TU_TU_CHOI = /[\u0000-\u001f\u007f]/;

export function la_duong_dan_noi_bo(duong: string): boolean {
  return lam_sach_duong_dan_noi_bo(duong) !== null;
}

/**
 * BAN SAO CO Y cua `lam_sach_duong_dan_noi_bo` o may_chu/src/bao_mat/cong_sso.ts.
 *
 * Hai ban vi webapp va may chu la hai bundle khac nhau, khong nhap chung module duoc. Co hang
 * rao o `thiet_ke/giao_dien.test.mjs` doi chieu than hai ham nay tung dong — lech nhau thi bai
 * kiem do, vi mot lop kiem chuyen huong mo co hai ban khac nhau la mot lop kiem chi manh bang
 * ban yeu hon.
 *
 * PHEP KIEM CHAY TREN CHUOI MA BO PHAN TICH URL SE THAY: tab/LF/CR bi xoa TRUOC, roi moi kiem
 * `//`. Dao thu tu la `/<tab>/evil.com` di qua duoc va thanh `//evil.com` — ra ngoai ten mien.
 */
export function lam_sach_duong_dan_noi_bo(duong: string): string | null {
  if (typeof duong !== 'string' || duong.length === 0 || duong.length > 512) return null;
  // TU CHOI, khong phai "xoa roi kiem lai". Xem chu thich tren ve WHATWG: neu ta xoa roi kiem
  // thi `/chamcong<CR><LF>Set-Cookie: x=1` tro thanh mot duong dan "hop le", va lop chan chen
  // header bien mat. Tu choi han thi chuoi da kiem LUON bang chuoi goc — khong con cho de tang
  // goi vo tinh dung chuoi chua kiem.
  if (KY_TU_TU_CHOI.test(duong)) return null;
  if (!duong.startsWith('/') || duong.startsWith('//')) return null;
  // `\\` bi mot so trinh duyet coi nhu `/`, nen `/\\evil.com` cung thanh URL tuong doi giao thuc.
  if (duong.includes('\\')) return null;
  return duong;
}

/**
 * Ma hoa duong dan cho `?quay_lai=` — ma hoa moi thu TRU dau `/`.
 *
 * `encodeURIComponent` bien `/chamcong/` thanh `%2Fchamcong%2F`: dung ve ky thuat nhung nguoi
 * dung doc thanh dia chi thay mot chuoi rac. Dau `/` la ky tu hop le trong gia tri cua chuoi
 * truy van, nen giu nguyen no vua dung vua doc duoc: `?quay_lai=/chamcong/`.
 *
 * VAN ma hoa moi ky tu khac, va do khong phai lam dep: mot duong dan chua `&` hay `#` ma khong
 * ma hoa se lam cong doc nham tham so — hoac cat mat phan sau cua duong dan.
 */
function ma_hoa_quay_lai(duong: string): string {
  return encodeURIComponent(duong).replace(/%2F/g, '/');
}

/** Chuyen sang man dang nhap cua cong, nho duong dang mo de quay lai dung cho. */
export function di_cong_dang_nhap(): void {
  const c = cau_hinh_cong;
  if (c === null) return;
  const dang_o = window.location.pathname + window.location.search;
  const q = la_duong_dan_noi_bo(dang_o) ? dang_o : `${c.tien_to}/`;
  window.location.href = `${c.goc_dang_nhap}?quay_lai=${ma_hoa_quay_lai(q)}`;
}

/** Cau hinh cong khai cua may chu. Goi MOT lan luc khoi dong. */
export async function cau_hinh_dang_nhap(): Promise<CauHinhDangNhap> {
  const mac_dinh: CauHinhDangNhap = {
    dang_nhap_rieng: true, dang_nhap_microsoft: false, cong_sso: null,
  };
  try {
    const res = await fetch(`${GOC}/api/xac-thuc/cau-hinh`);
    if (!res.ok) return mac_dinh;
    const kq = (await res.json()) as Partial<CauHinhDangNhap>;
    // Ban may chu cu khong co truong `dang_nhap_rieng` -> coi nhu con duong rieng.
    const c: CauHinhDangNhap = {
      dang_nhap_rieng: kq.dang_nhap_rieng !== false,
      dang_nhap_microsoft: kq.dang_nhap_microsoft === true,
      cong_sso: kq.cong_sso ?? null,
    };
    cau_hinh_cong = c.dang_nhap_rieng ? null : c.cong_sso;
    return c;
  } catch {
    return mac_dinh;
  }
}

/**
 * Nap thong tin nguoi dung bang token cua cong. Tra ve thong diep loi, hoac null neu xong.
 *
 * Vai tro KHONG doc tu token o phia client — doc tu `/api/xac-thuc/toi`, tuc la tu may chu sau
 * khi may chu da xac minh chu ky. Tin `quyen` do client tu doc ra la tin mot thu ai cung sua
 * duoc trong DevTools.
 */
export async function nap_phien_cong(): Promise<string | null> {
  const t = doc_token_cong();
  if (t === null) return null;
  let res: Response;
  try {
    res = await fetch(`${GOC}/api/xac-thuc/toi`, { headers: { authorization: `Bearer ${t}` } });
  } catch {
    return 'Không kết nối được máy chủ chấm công.';
  }
  if (res.status === 403) {
    const j = (await res.json().catch(() => ({}))) as { loi?: string };
    return j.loi ?? 'Tài khoản của bạn chưa được cấp quyền ở phân hệ Chấm công.';
  }
  if (!res.ok) return null; // 401: token het han -> tang goi se chuyen huong
  const nd = (await res.json()) as NguoiDung & { mui_gio_offset_gio?: number };
  // Giu trong BO NHO thoi, khong ghi localStorage: cong la chu so huu token.
  phien = {
    token_truy_cap: t, token_lam_moi: '',
    mui_gio_offset_gio: nd.mui_gio_offset_gio, nguoi_dung: nd,
  };
  return null;
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

/**
 * Vai tro NHAN SU co quyen quan tri cham cong. PHAI khop `can_nhan_su` cua may chu
 * (bao_mat/xac_thuc.ts) — bai kiem `huong_dan.test.mjs` doi chieu tung ky tu, nen giu dung dang
 * `v === '...'`.
 */
export function la_nhan_su(): boolean {
  const v = phien?.nguoi_dung.vai_tro;
  // `truong_phong_nhan_su` PHAI co mat o day: may chu coi vai tro nay ngang `nhan_su`.
  return v === 'admin' || v === 'nhan_su' || v === 'truong_phong_nhan_su';
}

/**
 * Co vao PHAN QUAN TRI khong. Vai tro nhan su luon co; truong phong thi CHI khi duoc admin cap
 * quyen (`quyen_quan_tri`). Dung cho hien menu quan tri + nut chuyen goc nhin.
 */
export function la_quan_tri(): boolean {
  if (la_nhan_su()) return true;
  const nd = phien?.nguoi_dung;
  return nd?.vai_tro === 'truong_phong' && nd.quyen_quan_tri === true;
}

/** Nguoi duyet don: nguoi quan tri, hoac truong phong (duyet don cua phong minh). */
export function la_nguoi_duyet(): boolean {
  return la_quan_tri() || phien?.nguoi_dung.vai_tro === 'truong_phong';
}

/**
 * Truong phong duoc admin cap quyen chi XEM man hinh quan tri — KHONG duoc thao tac. Dung de an
 * cac nut ghi (quet, duyet, bac bo, sua...). Backend van la lop chan that: moi thao tac deu do
 * guard can_nhan_su/can_admin chan, day chi de giao dien khong bay nut bam vao la loi 403.
 */
export function chi_xem_quan_tri(): boolean {
  return la_quan_tri() && !la_nhan_su();
}

// ---------------------------------------------------------------- goc nhin: Quan tri / Ca nhan
export type GocNhin = 'quan_tri' | 'ca_nhan';
const KHOA_GOC_NHIN = 'goc_nhin_xem';

/** Goc nhin hien tai. Nguoi KHONG co quyen quan tri luon o 'ca_nhan'. */
export function goc_nhin(): GocNhin {
  if (!la_quan_tri()) return 'ca_nhan';
  try { return localStorage.getItem(KHOA_GOC_NHIN) === 'ca_nhan' ? 'ca_nhan' : 'quan_tri'; }
  catch { return 'quan_tri'; }
}

export function dat_goc_nhin(g: GocNhin): void {
  try { localStorage.setItem(KHOA_GOC_NHIN, g); } catch { /* rieng tu / chan cookie — bo qua */ }
}

/** Vai tro cua nguoi dang dang nhap, hoac null khi chua dang nhap. */
export function vai_tro_hien_tai(): VaiTroNguoiDung | null {
  return phien?.nguoi_dung.vai_tro ?? null;
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
  let token_da_gui: string | null = null;
  const gui = async (): Promise<Response> => {
    const header: Record<string, string> = {};
    if (tc.body !== undefined) header['content-type'] = 'application/json';
    // O che do cong: DOC LAI token moi lan goi. Cong xoay token trong tab khac hay o khung
    // ngoai thi ta nhan duoc ban moi ngay, khong phai tai lai trang.
    const t = dung_cong_sso() ? doc_token_cong() : phien?.token_truy_cap ?? null;
    token_da_gui = t;
    if (t !== null) header['authorization'] = `Bearer ${t}`;
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
    if (dung_cong_sso()) {
      // Ta KHONG lam moi token cua cong — no khong phai cua ta. Nhung cong co the vua xoay
      // token o mot tab khac, nen doc lai va thu DUNG MOT lan neu da doi. Con khong thi ve
      // cong dang nhap lai, mang theo duong dang mo de quay dung cho.
      const t_moi = doc_token_cong();
      if (t_moi !== null && t_moi !== token_da_gui) res = await gui();
      if (res.status === 401) {
        di_cong_dang_nhap();
        throw new LoiApi(401, 'Phiên đã hết hạn. Đang chuyển về cổng đăng nhập.');
      }
    } else if (await lam_moi_token()) {
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
 * Gui tep len bang multipart.
 *
 * KHONG tu dat content-type: trinh duyet phai sinh header do vi con phai kem chuoi
 * boundary. Dat tay se ra mot header thieu boundary, va may chu khong tach duoc cac phan.
 */
export async function gui_tep<T = unknown>(duong_dan: string, du_lieu: FormData): Promise<T> {
  const res = await fetch(`${GOC}${duong_dan}`, {
    method: 'POST',
    headers: phien === null ? {} : { authorization: `Bearer ${phien.token_truy_cap}` },
    body: du_lieu,
  });
  const than: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const loi = (than as { loi?: string } | null)?.loi;
    throw new LoiApi(res.status, loi ?? `Không tải được tệp lên (lỗi ${res.status}).`);
  }
  return than as T;
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

/**
 * Tai noi dung tep ve dang blob URL de nhung vao <img> hoac <iframe>.
 *
 * Khong dat thang duong dan API vao `src`: the <img>/<iframe> khong gui duoc header
 * Authorization. Tai bang fetch roi doi sang blob: URL thi vua gui duoc token, vua khong
 * phai nhet token vao thanh dia chi (noi no se nam lai trong lich su va log proxy).
 *
 * Nho goi `URL.revokeObjectURL` khi dong — neu khong blob nam lai trong bo nho tab.
 */
export async function tai_blob(duong_dan: string): Promise<{ url: string; kieu: string }> {
  const res = await fetch(`${GOC}${duong_dan}`, {
    headers: phien === null ? {} : { authorization: `Bearer ${phien.token_truy_cap}` },
  });
  if (!res.ok) {
    const than: unknown = await res.json().catch(() => null);
    const loi = (than as { loi?: string } | null)?.loi;
    throw new LoiApi(res.status, loi ?? `Không mở được tệp (lỗi ${res.status}).`);
  }
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), kieu: blob.type };
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
