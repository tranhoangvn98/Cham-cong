// Xac minh token cua cong SSO noi bo (`teams.tranhoangvietnam.com/cong`).
//
// Phan he KHONG phat hanh token nay, khong giu khoa ky, va khong bao gio nhan khoa rieng —
// chi lay khoa CONG KHAI qua JWKS roi kiem chu ky. Chon RS256 chinh vi the: HS256 dung mot bi
// mat chung vua de ky vua de xac minh, nen muon phan he xac minh duoc thi phai dua no bi mat
// do, ma co bi mat do thi phan he tu ky duoc token quan tri cho chinh minh.
//
// BA THU LAM SAI LA MAT CA CUM (hop dong bao mat cua cong, muc 3):
//
//   1. KHONG tin header `X-Cong-Nguoi-Dung` / `X-Cong-Email`. Caddy `copy_headers` chi GHI DE
//      header khi phan hoi xac thuc co header do — request den tu bat cu dau khac ngoai Caddy
//      (goi thang 127.0.0.1:8080, mot lo SSRF o phan he khac, mot container cung mang Docker)
//      thi ke goi TU KHAI MINH LA AI, chi bang cach dat header. Uy quyen duy nhat la token da
//      xac minh chu ky. Tep nay khong doc mot header `X-Cong-*` nao, va do la co y.
//   2. KHONG fail open. Khong tai duoc JWKS thi TU CHOI, dung bo khoa da cache. Loi pho bien
//      nhat trong loai ma nay xuat hien duoi dang mot `try { } catch { /* bo qua */ }` trong vo
//      hai. Xem `nap_khoa`: moi nhanh loi o day deu dan toi `null` = tu choi.
//   3. Kiem CHU KY TRUOC, roi moi tin bat cu truong nao ben trong. Doc truoc roi kiem sau la
//      duong nga kinh dien: ke tan cong tu soan payload voi `quyen: { chamcong: ['quan_tri'] }`.
//
// Cong chet thi phan he VAN phuc vu binh thuong bang token dang luu hanh cho toi khi chung het
// han (toi da 15 phut). Do la hanh vi dung. Dung viet ma lam mat tinh chat do, va cung dung
// viet ma bien no thanh "cong chet thi ai cung vao duoc".
import { createPublicKey, createVerify, type JsonWebKey } from 'node:crypto';
import { cau_hinh } from '../cau_hinh.ts';
import type { VaiTro } from './jwt.ts';

/**
 * Thuat toan duy nhat duoc chap nhan — DANH SACH TRANG CUNG TRONG MA.
 *
 * Khong doc `alg` tu header roi tin theo: do la duong vao cua `alg: none` va cua don "dung
 * khoa cong khai RSA lam bi mat HMAC".
 */
const THUAT_TOAN = 'RS256';

/** Do lech dong ho cho phep giua may cong va may phan he (giay). */
const LECH_DONG_HO_GIAY = 30;

/** Bo nho dem JWKS. Tai o MOI request la bien cong thanh diem nghen va la mot don DoS tu gay. */
const JWKS_TTL_MS = 60 * 60 * 1000;

/**
 * Gioi han tan suat nap JWKS: toi da bao nhieu luot trong mot cua so.
 *
 * VI SAO PHAI CO: khong co no thi ke tan cong gui mot loat token voi `kid` ngau nhien, moi
 * token bat phan he goi cong mot lan — mot don DoS len chinh cong, phat tu ben trong phan he.
 *
 * VI SAO KHONG PHAI 1: cong xoay khoa thi phai nap lai NGAY moi nhan ra `kid` moi. Neu chi cho
 * mot luot moi phut thi mot lan xoay khoa lam ca phan he tu choi het trong mot phut. Cho phep
 * mot chum nho la co du ca hai: xoay khoa xong la phuc hoi lien, ma 20 token `kid` bia chi
 * ton dung ngan ay luot.
 */
const SO_LUOT_NAP_MOI_CUA_SO = 3;
const CUA_SO_NAP_MS = 60 * 1000;

/** Bo khoa lon bat thuong = phan hoi khong phai cua cong. Chan truoc khi phan tich. */
const JWKS_TOI_DA_BYTE = 128 * 1024;

const HET_GIO_MS = 10_000;

// ---------------------------------------------------------------- cau hinh

/** Tinh nang chi bat khi khai du — thieu `iss` la coi nhu tat han. */
export function bat_cong_sso(): boolean {
  return cau_hinh.cong_sso.iss !== '' && cau_hinh.cong_sso.jwks_url !== '';
}

/**
 * Da bo duong dang nhap rieng cua cham cong chua?
 *
 * `&& bat_cong_sso()` KHONG phai thua: bo cua cu ma chua khai cua moi la khong con cua nao, va
 * ca cong ty khong vao duoc he thong. Cong tac nay chi co hieu luc khi cong da duoc khai.
 */
export function bo_dang_nhap_rieng(): boolean {
  return cau_hinh.cong_sso.bo_dang_nhap_rieng && bat_cong_sso();
}

/**
 * 410 Gone, khong phai 404 hay 400: duong nay TUNG ton tai va da bi bo co y. App cu goi vao se
 * doc duoc thong diep noi ro phai di dau, thay vi mot loi chung khong ai hieu.
 */
export class LoiDaBoCuaCu extends Error {
  ma_http = 410;

  constructor(thong_diep: string) {
    super(thong_diep);
    this.name = 'LoiDaBoCuaCu';
  }
}

/**
 * Chan mot duong con nhan mat khau, khi da chuyen sang cong.
 *
 * Goi o DAU moi route nhu vay. Gom vao mot ham de khong noi nao tu soan thong diep rieng —
 * nguoi dung gap sau cua nay can biet dung mot dieu: di dau de dang nhap.
 */
export function chan_cua_cu(): void {
  if (!bo_dang_nhap_rieng()) return;
  throw new LoiDaBoCuaCu(
    'Chấm công đã dùng chung cổng đăng nhập nội bộ. Mật khẩu do cổng quản lý, hệ thống này '
    + `không còn nhận mật khẩu. Hãy đăng nhập tại ${cau_hinh.cong_sso.goc_dang_nhap} rồi mở lại `
    + `${cau_hinh.cong_sso.tien_to}/.`,
  );
}

/**
 * Request nay den tu TRINH DUYET khong?
 *
 * `Origin` do trinh duyet tu dat tren moi POST, va `Sec-Fetch-*` tren moi request. Ma
 * JavaScript trong trang KHONG xoa duoc chung — day la diem quan trong: mot trang web khong
 * the tu gia dang thanh app native. Con `fetch` cua React Native thi khong gui header nao
 * trong so do.
 *
 * Nho vay "khong con form dang nhap nao chay duoc trong trinh duyet" tro thanh mot dieu CO THE
 * BUOC, khong chi la mot loi hua.
 *
 * KHONG phai mot ranh gioi bao mat: `curl` khong gui `Origin` nen di duoc duong cu. Do la mot
 * ranh gioi TRAI NGHIEM, va no dat dung cai dich cua buoc 3: khong nhan vien nao con duoc day
 * go mat khau cong ty vao mot trang khong phai cong.
 */
export function la_tu_trinh_duyet(yc: { headers: Record<string, unknown> }): boolean {
  const h = yc.headers;
  return typeof h['origin'] === 'string'
    || typeof h['sec-fetch-site'] === 'string'
    || typeof h['sec-fetch-mode'] === 'string';
}

/**
 * Chan duong mat khau khi goi TU TRINH DUYET, con app native thi tam thoi cho qua.
 *
 * GIAI DOAN CHUYEN TIEP CO THOI HAN. App dien thoai hien dang nhap bang mat khau va giu token
 * lam moi 30 ngay; app chua co duong di qua cong (loi "trinh duyet he thong + custom scheme").
 * Chan luon ca app la 59 nhan vien mat cham cong tren dien thoai trong nhieu ngay.
 *
 * KHI APP DA CO DUONG QUA CONG: xoa ham nay, doi cac cho goi no sang `chan_cua_cu()`, va xoa
 * `dang_nhap_app_tam` khoi /health. De nguyen la giu mot cua vao khong MFA song song mai mai.
 */
export function chan_cua_cu_web(
  yc: { headers: Record<string, unknown>; log?: { warn: (o: unknown, s: string) => void } },
): void {
  if (!bo_dang_nhap_rieng()) return;
  if (la_tu_trinh_duyet(yc)) {
    throw new LoiDaBoCuaCu(
      'Chấm công đã dùng chung cổng đăng nhập nội bộ. Hãy đăng nhập tại '
      + `${cau_hinh.cong_sso.goc_dang_nhap} rồi mở lại ${cau_hinh.cong_sso.tien_to}/.`,
    );
  }
  // Con dung duong cu = app cu con ngoai kia. Ghi lai de con so nay giam ve 0 truoc khi xoa
  // han duong nay, chu khong phai doan.
  yc.log?.warn({}, 'dang nhap bang mat khau qua duong app tam (giai doan chuyen tiep)');
}

/** Nhu tren nhung cho viec quan tri tai khoan — chi ro cho cap quyen o dau. */
export function chan_quan_tri_cua_cu(): void {
  if (!bo_dang_nhap_rieng()) return;
  throw new LoiDaBoCuaCu(
    'Tài khoản và mật khẩu do cổng nội bộ quản lý, không tạo hay đặt lại ở đây nữa. '
    + `Cấp quyền cho người dùng tại ${cau_hinh.cong_sso.goc_dang_nhap}cong/quan-tri, `
    + 'mục Module → chamcong.',
  );
}

/**
 * URL JWKS co an toan de goi khong.
 *
 * Tren production PHAI la HTTPS: tai bo khoa cong khai qua HTTP la de ke dung giua thay khoa,
 * va thay khoa la tu ky duoc token quan tri. `http://127.0.0.1` chi de bo kiem dung cong gia.
 */
export function url_an_toan(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol === 'https:') return true;
  return !cau_hinh.la_production && (u.hostname === '127.0.0.1' || u.hostname === 'localhost');
}

// ---------------------------------------------------------------- JWKS

interface KhoaJwk extends JsonWebKey {
  kid: string;
  kty: string;
}

let bo_nho: { khoa: KhoaJwk[]; het_han: number } | null = null;
/** Moc thoi gian cua cac luot nap gan day — chi giu trong mot cua so. */
let cac_luot_nap: number[] = [];

/** Chi de kiem thu: xoa bo nho dem va bo dem gioi han tan suat. */
export function xoa_dem_khoa_cong(): void {
  bo_nho = null;
  cac_luot_nap = [];
}

/** Con luot nap trong cua so hien tai khong. Ghi nhan luot khi tra ve true. */
function xin_luot_nap(): boolean {
  const bay_gio = Date.now();
  cac_luot_nap = cac_luot_nap.filter((t) => bay_gio - t < CUA_SO_NAP_MS);
  if (cac_luot_nap.length >= SO_LUOT_NAP_MOI_CUA_SO) return false;
  cac_luot_nap.push(bay_gio);
  return true;
}

/**
 * Nap bo khoa cong khai cua cong.
 *
 * Tra ve `null` khi khong nap duoc — KHONG nem loi, va tang goi coi `null` la TU CHOI. Khong
 * co nhanh nao o day tra ve "cho qua".
 *
 * @param cuong_buc bo qua bo nho dem (dung khi gap `kid` la — cong xoay khoa)
 */
async function nap_khoa(cuong_buc: boolean): Promise<KhoaJwk[] | null> {
  const con_han = bo_nho !== null && bo_nho.het_han > Date.now();
  if (!cuong_buc && con_han) return bo_nho!.khoa;

  const url = cau_hinh.cong_sso.jwks_url;
  if (!url_an_toan(url)) {
    console.error(`[cong-sso] JWKS url khong an toan, tu choi: ${url}`);
    return bo_nho === null ? null : bo_nho.khoa;
  }

  // Het luot thi VAN dung bo khoa cu — khoa cong khai cua cong khong tu nhien sai di, va tu
  // choi het moi nguoi vi mot phut cho la tu gay su co. Chua co bo khoa nao thi tra `null`.
  if (!xin_luot_nap()) return bo_nho === null ? null : bo_nho.khoa;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(HET_GIO_MS) });
    if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
    const chu = await res.text();
    if (chu.length > JWKS_TOI_DA_BYTE) throw new Error('bo khoa qua lon');
    const than = JSON.parse(chu) as { keys?: unknown };
    const khoa = Array.isArray(than.keys)
      ? than.keys.filter((k): k is KhoaJwk =>
        typeof k === 'object' && k !== null
        && typeof (k as { kid?: unknown }).kid === 'string'
        && (k as { kty?: unknown }).kty === 'RSA')
      : [];
    if (khoa.length === 0) throw new Error('khong co khoa RSA nao');
    bo_nho = { khoa, het_han: Date.now() + JWKS_TTL_MS };
    return khoa;
  } catch (loi) {
    // FAIL CLOSED. Con bo khoa cu thi dung tiep (cong chet 5 phut khong duoc lam dut phien cua
    // moi nguoi); khong co gi thi tra `null` va tang goi tu choi. Tuyet doi khong "cho qua".
    console.error(`[cong-sso] khong nap duoc JWKS: ${(loi as Error).message}`);
    return bo_nho === null ? null : bo_nho.khoa;
  }
}

// ---------------------------------------------------------------- noi dung token

/** Payload cua cong, sau khi da xac minh chu ky. */
export interface NoiDungCong {
  /** Id tai khoan tren cong — ON DINH VINH VIEN, la khoa de moc sang ban ghi cua phan he. */
  sub: string;
  /** Dinh danh Entra, co the null (tai khoan mat khau noi bo). */
  oid: string | null;
  /** Ma nhan su ben cong, co the null (tai khoan dich vu, tai khoan quan tri thuan). */
  nhan_su: string | null;
  email: string | null;
  ten: string | null;
  /** Vai tro CHI CUA PHAN HE NAY. Rong = da dang nhap nhung chua duoc cap quyen. */
  quyen: string[];
  /** 'tc' = nguoi dung, 'dv' = dich vu. 'lm' (token lam moi) bi tu choi tu truoc. */
  loai: 'tc' | 'dv';
  jti: string | null;
  exp: number;
}

function doc_phan(phan: string): Record<string, unknown> | null {
  try {
    const kq = JSON.parse(Buffer.from(phan, 'base64url').toString('utf8')) as unknown;
    if (typeof kq !== 'object' || kq === null || Array.isArray(kq)) return null;
    return kq as Record<string, unknown>;
  } catch {
    return null;
  }
}

function chuoi_hoac_null(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

/**
 * Doc `quyen[<ma module cua minh>]`.
 *
 * CHI doc khoa cua phan he nay — doc quyen cua phan he khac la vuot ranh gioi.
 *
 * Mang rong VA thieu han khoa deu nghia la "da dang nhap, chua duoc cap quyen". Khong dang nao
 * nghia la "cho qua". Cong khong bao gio tra `{ chamcong: [] }` (no bo han khoa) nhung phan he
 * phai xu ly duoc ca hai dang.
 */
function doc_quyen(than: Record<string, unknown>, ma_module: string): string[] {
  const q = than['quyen'];
  if (typeof q !== 'object' || q === null || Array.isArray(q)) return [];
  const cua_minh = (q as Record<string, unknown>)[ma_module];
  if (!Array.isArray(cua_minh)) return [];
  return cua_minh.filter((v): v is string => typeof v === 'string' && v !== '');
}

/**
 * Xac minh mot token cua cong. Tra ve `null` neu KHONG hop le — khong nem loi, de tang goi tra
 * 401 chung chung, khong tiet lo ly do cu the cho ke do.
 *
 * Thu tu bat buoc: `alg` -> chu ky -> `iss` -> `aud` -> `exp` -> `loai` -> `quyen`. Tu dong
 * "tu day tro xuong" ben duoi moi duoc tin noi dung token.
 */
export async function xac_minh_token_cong(token: string): Promise<NoiDungCong | null> {
  if (typeof token !== 'string') return null;
  const phan = token.split('.');
  if (phan.length !== 3) return null;
  const [p_dau, p_than, p_ky] = phan as [string, string, string];

  const dau = doc_phan(p_dau);
  if (dau === null) return null;
  if (dau['alg'] !== THUAT_TOAN) return null; // chan alg=none va HS256
  const kid = chuoi_hoac_null(dau['kid']);
  if (kid === null) return null;

  let khoa = (await nap_khoa(false))?.find((k) => k.kid === kid);
  if (khoa === undefined) {
    // Cong xoay khoa: gap `kid` la thi nap lai mot lan (co gioi han tan suat o `nap_khoa`).
    // Nho the phan he tu phuc hoi sau mot lan xoay khoa, khong can khoi dong lai.
    khoa = (await nap_khoa(true))?.find((k) => k.kid === kid);
  }
  if (khoa === undefined) return null;

  let hop_le: boolean;
  try {
    hop_le = createVerify('RSA-SHA256')
      .update(`${p_dau}.${p_than}`)
      .verify(createPublicKey({ key: khoa as JsonWebKey, format: 'jwk' }), Buffer.from(p_ky, 'base64url'));
  } catch {
    return null; // khoa JWK hong, hoac chu ky sai dinh dang
  }
  if (!hop_le) return null;

  // ------------------- tu day tro xuong moi duoc tin noi dung token -------------------
  const than = doc_phan(p_than);
  if (than === null) return null;

  const c = cau_hinh.cong_sso;
  if (than['iss'] !== c.iss) return null;      // so sanh dung chuoi
  if (than['aud'] !== c.aud) return null;      // `aud` la CHUOI, khong phai mang

  const gio = Math.floor(Date.now() / 1000);
  const exp = Number(than['exp'] ?? 0);
  if (!Number.isFinite(exp) || exp + LECH_DONG_HO_GIAY < gio) return null;
  const nbf = than['nbf'];
  if (typeof nbf === 'number' && Number.isFinite(nbf) && nbf - LECH_DONG_HO_GIAY > gio) return null;

  // Token lam moi (30 ngay) KHONG duoc dung de goi API.
  const loai = than['loai'];
  if (loai !== 'tc' && loai !== 'dv') return null;

  const sub = chuoi_hoac_null(than['sub']);
  if (sub === null) return null;

  return {
    sub,
    oid: chuoi_hoac_null(than['oid']),
    nhan_su: chuoi_hoac_null(than['nhan_su']),
    email: chuoi_hoac_null(than['email']),
    ten: chuoi_hoac_null(than['ten']),
    quyen: doc_quyen(than, c.ma_module),
    loai,
    jti: chuoi_hoac_null(than['jti']),
    exp,
  };
}

// ---------------------------------------------------------------- vai tro

/**
 * Vai tro khai o so dang ky cua cong CHO PHAN HE CHAM CONG, doi sang vai tro noi bo.
 *
 * DOI CHIEU THEO `ma`, KHONG theo `ten`. Vai tro ben cong la `{ma, ten}`: `ma` nam trong token
 * va trong bang nen khong doi duoc, `ten` chi la nhan hien thi va doi luc nao cung duoc. Doi
 * chieu theo `ten` la de mot nguoi sua nhan tieng Viet thanh go quyen cua ca phong.
 *
 * BANG NAY LA MOT NUA CUA MOT HOP DONG. Nua kia la danh sach vai tro khai ben cong. Bo khai
 * mot vai tro ben cong KHONG thu hoi quyen o phia phan he — cong loc token nhung khong sua ma
 * cua ta — nen xoa vai tro khoi khai bao thi phai xoa dong tuong ung o day.
 *
 * `cho_duyet` KHONG co trong bang: trang thai "da dang nhap, chua duoc cap quyen" o mo hinh
 * cong la `quyen` RONG, khong phai mot vai tro.
 */
const DOI_VAI_TRO: Readonly<Record<string, VaiTro>> = {
  quan_tri: 'admin',
  nhan_su: 'nhan_su',
  truong_phong_nhan_su: 'truong_phong_nhan_su',
  truong_phong: 'truong_phong',
  kiem_soat: 'kiem_soat',
  nhan_vien: 'nhan_vien',
};

/**
 * Cao nhat truoc. Mot nguoi co nhieu vai tro thi lay quyen cao nhat.
 *
 * `kiem_soat` dat SAU `truong_phong` co chu dich: no khong phai mot bac cao hon trong cung
 * mot thang bac, ma la mot truc khac. Neu mot nguoi vua la truong phong vua duoc cap quyen
 * kiem soat, ho vao he thong voi quyen truong phong (rong hon o phan nghiep vu hang ngay),
 * va cong van cap rieng quyen kiem soat qua vai tro tren tai khoan noi bo neu can. Dat
 * `kiem_soat` len tren se lam ho MAT quyen truong phong — mot cach im lang.
 */
const THU_TU: readonly VaiTro[] = [
  'admin', 'nhan_su', 'truong_phong_nhan_su', 'truong_phong', 'kiem_soat', 'nhan_vien',
];

/** Danh sach ma vai tro phai khai ben so dang ky cua cong. Dung cho tai lieu va bai kiem. */
export const MA_VAI_TRO_CONG: readonly string[] = Object.keys(DOI_VAI_TRO);

/**
 * Vai tro noi bo tuong ung voi `quyen` doc ra tu token, hoac `null` khi chua duoc cap quyen.
 *
 * `null` = "da dang nhap nhung chua duoc cap quyen o phan he nay" -> hien man hinh giai thich,
 * KHONG tra man hinh dang nhap (nguoi dung se dang nhap lai vo ich mai va goi cho ho tro).
 */
export function vai_tro_tu_quyen(quyen: readonly string[]): VaiTro | null {
  const co = new Set<VaiTro>();
  for (const ma of quyen) {
    const v = DOI_VAI_TRO[ma];
    if (v !== undefined) co.add(v);
  }
  return THU_TU.find((v) => co.has(v)) ?? null;
}

// ---------------------------------------------------------------- quay lai

/**
 * URL man dang nhap cua cong, kem duong dan de quay ve sau khi dang nhap xong.
 *
 * Kiem `quay_lai` y het cong kiem: phai bat dau bang DUNG MOT `/`, khong phai `//`, khong chua
 * `\`, khong chua ky tu dieu khien. Khong kiem la mo duong chuyen huong mo — ke tan cong gui
 * link dang nhap THAT roi day nan nhan sang trang gia sau khi dang nhap xong, va nan nhan vua
 * go mat khau o mot trang that nen khong nghi gi.
 */
export function url_dang_nhap_cong(quay_lai: string | null): string {
  const goc = cau_hinh.cong_sso.goc_dang_nhap;
  if (quay_lai === null || !la_duong_dan_noi_bo(quay_lai)) return goc;
  return `${goc}?quay_lai=${encodeURIComponent(quay_lai)}`;
}

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

/**
 * Duong dan noi bo hop le de dat vao `?quay_lai=` hay de chuyen huong toi.
 *
 * PHEP KIEM CHAY TREN CHUOI MA BO PHAN TICH URL SE THAY, khong phai chuoi nhan duoc. Thu tu do
 * la thu tu duy nhat dung, va dao no lai la mo mot duong chuyen huong mo:
 *
 *   nhan duoc      `/<tab>/evil.com`
 *   kiem `//` trom  -> khong khop, vi luc nay tab con nam giua hai dau gach
 *   trinh duyet xoa -> `//evil.com`  = ra ngoai ten mien
 *
 * Da xac minh tren Chromium that, khong suy tu dac ta: `/%09/evil.com`, `/%0a/evil.com`,
 * `/%0d/evil.com` deu dan ra `https://evil.com/`.
 *
 * Vi sao dieu nay dang so: ke tan cong gui link dang nhap THAT cua cong ty. Nan nhan doc thanh
 * dia chi, thay dung ten mien, dung chung chi, roi bi day sang trang gia sau khi dang nhap —
 * moi thu ho duoc day phai kiem deu dung.
 */
export function la_duong_dan_noi_bo(duong: string): boolean {
  return lam_sach_duong_dan_noi_bo(duong) !== null;
}

/**
 * Tra ve duong dan DA LAM SACH neu noi bo, `null` neu khong.
 *
 * Tang goi nen dung ban tra ve nay chu khong dung chuoi goc: nhu the thu duoc kiem va thu duoc
 * dung la MOT chuoi. Dung chuoi goc van an toan (bo phan tich xoa dung nhung ky tu ta da xoa)
 * nhung no de mot khoang cach de nguoi sau vo tinh lam rong ra.
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
