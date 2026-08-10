// Dang nhap bang tai khoan Microsoft (Entra ID) — OpenID Connect, luong Authorization
// Code + PKCE.
//
// Tu viet thay vi keo thu vien OIDC: chi can dung mot luong, va them mot phu thuoc lon
// vao lop xac thuc la them be mat tan cong. Doi lai, MOI phep kiem duoi day deu bat buoc.
import { createHash, createPublicKey, createVerify, randomBytes, timingSafeEqual, type JsonWebKey } from 'node:crypto';
import { cau_hinh } from '../cau_hinh.ts';

export class LoiMicrosoft extends Error {
  ma_http = 401;
}

/** Tinh nang chi bat khi khai du cau hinh — thieu mot gia tri la coi nhu tat. */
export function bat_dang_nhap_microsoft(): boolean {
  const m = cau_hinh.microsoft;
  return m.tenant_id !== '' && m.client_id !== '' && m.client_secret !== '' && m.redirect_uri !== '';
}

const GOC = (): string => `https://login.microsoftonline.com/${cau_hinh.microsoft.tenant_id}`;
export const URL_UY_QUYEN = (): string => `${GOC()}/oauth2/v2.0/authorize`;
export const URL_TOKEN = (): string => `${GOC()}/oauth2/v2.0/token`;
const URL_JWKS = (): string => `${GOC()}/discovery/v2.0/keys`;
/** Issuer hop le trong id_token. Entra dung dang co tenant id. */
const ISSUER = (): string => `https://login.microsoftonline.com/${cau_hinh.microsoft.tenant_id}/v2.0`;

// ---------------------------------------------------------------- PKCE + state
export function sinh_chuoi_ngau_nhien(so_byte = 32): string {
  return randomBytes(so_byte).toString('base64url');
}

/** S256: thach thuc gui di la bam SHA-256 cua chuoi xac minh giu lai. */
export function thach_thuc_pkce(ma_xac_minh: string): string {
  return createHash('sha256').update(ma_xac_minh).digest('base64url');
}

// ---------------------------------------------------------------- JWKS
interface KhoaJwk extends JsonWebKey {
  kid: string;
  kty: string;
}

let bo_nho_khoa: { khoa: KhoaJwk[]; het_han: number } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000;

/** Nap bo khoa cong khai cua Microsoft, co bo nho dem 1 gio. */
async function nap_khoa(bo_qua_dem = false): Promise<KhoaJwk[]> {
  if (!bo_qua_dem && bo_nho_khoa !== null && bo_nho_khoa.het_han > Date.now()) {
    return bo_nho_khoa.khoa;
  }
  const res = await fetch(URL_JWKS());
  if (!res.ok) throw new LoiMicrosoft(`Không tải được khóa công khai của Microsoft (HTTP ${res.status}).`);
  const than = (await res.json()) as { keys?: KhoaJwk[] };
  const khoa = than.keys ?? [];
  if (khoa.length === 0) throw new LoiMicrosoft('Microsoft trả về danh sách khóa rỗng.');
  bo_nho_khoa = { khoa, het_han: Date.now() + JWKS_TTL_MS };
  return khoa;
}

/** Chi de kiem thu: xoa bo nho dem khoa. */
export function xoa_dem_khoa(): void {
  bo_nho_khoa = null;
}

// ---------------------------------------------------------------- id_token
export interface ThongTinNguoiDung {
  /** Email/UPN dung de doi chieu voi tai khoan trong he thong. */
  email: string;
  ho_ten: string | null;
  /** Dinh danh on dinh cua nguoi dung trong Entra. */
  oid: string;
}

function doc_phan(phan: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(phan, 'base64url').toString('utf8')) as Record<string, unknown>;
}

/**
 * Kiem id_token: chu ky, issuer, audience, han dung, nonce, tenant.
 *
 * Thu tu quan trong: kiem CHU KY truoc khi tin bat cu truong nao ben trong. Doc truoc roi
 * kiem sau la duong nga kinh dien — ke tan cong tu soan token voi email bat ky.
 */
export async function kiem_id_token(id_token: string, nonce_mong_doi: string): Promise<ThongTinNguoiDung> {
  const phan = id_token.split('.');
  if (phan.length !== 3) throw new LoiMicrosoft('id_token sai định dạng.');
  const [phan_dau, phan_than, phan_ky] = phan as [string, string, string];

  const dau = doc_phan(phan_dau);
  const alg = String(dau['alg'] ?? '');
  // CHI chap nhan RS256. Khong cho 'none', khong cho HS256 (thuat toan doi xung se bien
  // khoa cong khai thanh khoa ky — lo hong "algorithm confusion" kinh dien).
  if (alg !== 'RS256') throw new LoiMicrosoft(`Thuật toán ký không được chấp nhận: ${alg}`);
  const kid = String(dau['kid'] ?? '');
  if (kid === '') throw new LoiMicrosoft('id_token thiếu kid.');

  let khoa = (await nap_khoa()).find((k) => k.kid === kid);
  if (khoa === undefined) {
    // Microsoft xoay khoa dinh ky: khong thay kid thi nap lai mot lan, bo qua bo nho dem.
    khoa = (await nap_khoa(true)).find((k) => k.kid === kid);
  }
  if (khoa === undefined) throw new LoiMicrosoft('Không tìm thấy khóa công khai khớp với id_token.');

  // Node doc thang JWK, khong phai doi sang PEM bang tay.
  const khoa_cong = createPublicKey({ key: khoa as JsonWebKey, format: 'jwk' });
  const hop_le = createVerify('RSA-SHA256')
    .update(`${phan_dau}.${phan_than}`)
    .verify(khoa_cong, Buffer.from(phan_ky, 'base64url'));
  if (!hop_le) throw new LoiMicrosoft('Chữ ký id_token không hợp lệ.');

  // --- Tu day tro xuong moi duoc tin noi dung token ---
  const than = doc_phan(phan_than);

  if (String(than['iss'] ?? '') !== ISSUER()) {
    throw new LoiMicrosoft('id_token không do tổ chức đã cấu hình phát hành.');
  }
  if (String(than['aud'] ?? '') !== cau_hinh.microsoft.client_id) {
    throw new LoiMicrosoft('id_token được cấp cho ứng dụng khác.');
  }
  if (String(than['tid'] ?? '') !== cau_hinh.microsoft.tenant_id) {
    throw new LoiMicrosoft('Tài khoản không thuộc tổ chức đã cấu hình.');
  }

  const gio = Math.floor(Date.now() / 1000);
  const LECH_CHO_PHEP = 120; // giay — chenh lech dong ho giua hai may
  const exp = Number(than['exp'] ?? 0);
  const nbf = Number(than['nbf'] ?? 0);
  if (!Number.isFinite(exp) || exp + LECH_CHO_PHEP < gio) throw new LoiMicrosoft('id_token đã hết hạn.');
  if (Number.isFinite(nbf) && nbf - LECH_CHO_PHEP > gio) throw new LoiMicrosoft('id_token chưa có hiệu lực.');

  // nonce buoc token nay phai thuoc dung phien dang nhap vua bat dau — chong replay.
  const nonce = String(than['nonce'] ?? '');
  if (!bang_nhau_an_toan(nonce, nonce_mong_doi)) throw new LoiMicrosoft('nonce không khớp phiên đăng nhập.');

  const email = String(than['preferred_username'] ?? than['email'] ?? than['upn'] ?? '').trim();
  if (email === '') throw new LoiMicrosoft('id_token không có email — kiểm tra quyền của ứng dụng bên Entra.');

  const oid = String(than['oid'] ?? than['sub'] ?? '');
  const ten = than['name'];

  return { email, ho_ten: typeof ten === 'string' && ten.trim() !== '' ? ten.trim() : null, oid };
}

/** So sanh chuoi khong ro ri thoi gian. */
function bang_nhau_an_toan(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length || x.length === 0) return false;
  return timingSafeEqual(x, y);
}

// ---------------------------------------------------------------- doi ma lay token
export async function doi_ma_lay_token(ma: string, ma_xac_minh: string): Promise<string> {
  const than = new URLSearchParams({
    client_id: cau_hinh.microsoft.client_id,
    client_secret: cau_hinh.microsoft.client_secret,
    code: ma,
    redirect_uri: cau_hinh.microsoft.redirect_uri,
    grant_type: 'authorization_code',
    code_verifier: ma_xac_minh,
  });

  const res = await fetch(URL_TOKEN(), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: than.toString(),
  });
  const kq = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    // KHONG dua nguyen thong bao cua Microsoft ra cho nguoi dung: no co the chua chi tiet
    // cau hinh noi bo. Ghi log rieng o tang goi.
    throw new LoiMicrosoft(`Microsoft từ chối mã ủy quyền (${String(kq['error'] ?? res.status)}).`);
  }
  const id_token = kq['id_token'];
  if (typeof id_token !== 'string') throw new LoiMicrosoft('Microsoft không trả về id_token.');
  return id_token;
}

/** Dung URL chuyen huong sang trang dang nhap cua Microsoft. */
export function url_dang_nhap(state: string, nonce: string, thach_thuc: string): string {
  const t = new URLSearchParams({
    client_id: cau_hinh.microsoft.client_id,
    response_type: 'code',
    redirect_uri: cau_hinh.microsoft.redirect_uri,
    response_mode: 'query',
    scope: 'openid profile email',
    state,
    nonce,
    code_challenge: thach_thuc,
    code_challenge_method: 'S256',
  });
  return `${URL_UY_QUYEN()}?${t.toString()}`;
}
