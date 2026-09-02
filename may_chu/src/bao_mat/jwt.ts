// JWT HS256 tu cai bang node:crypto — tranh them phu thuoc chi de ky mot chuoi.
// Chi ho tro HS256; thuat toan khac trong header bi tu choi (chong tan cong alg=none).
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { cau_hinh } from '../cau_hinh.ts';

/**
 * `cho_duyet` KHONG phai mot muc quyen — la trang thai "da xac thuc, chua duoc phan quyen".
 * Tai khoan o trang thai nay dang nhap duoc nhung moi hook phan quyen deu tu choi.
 */
export type VaiTro = 'admin' | 'nhan_su' | 'truong_phong' | 'truong_phong_nhan_su'
  | 'kiem_soat' | 'nhan_vien' | 'cho_duyet';

export interface NoiDungToken {
  /** id nguoi_dung */
  sub: string;
  vai_tro: VaiTro;
  /** id nhan_vien gan voi tai khoan (null voi admin/nhan_su khong phai nhan vien) */
  nv: string | null;
  ten: string;
  /** loai token: 'tc' = truy cap, 'lm' = lam moi */
  loai: 'tc' | 'lm';
  /** ma token — dung de thu hoi token lam moi */
  jti: string;
  iat: number;
  exp: number;
}

function b64url(du_lieu: Buffer | string): string {
  return Buffer.from(du_lieu as never).toString('base64url');
}

function ky(du_lieu: string): string {
  return createHmac('sha256', cau_hinh.jwt.secret).update(du_lieu).digest('base64url');
}

export interface TokenDaKy {
  token: string;
  jti: string;
  het_han: Date;
}

export function tao_token(
  noi_dung: Omit<NoiDungToken, 'iat' | 'exp' | 'jti'> & { jti?: string },
  song_giay: number,
): TokenDaKy {
  const bay_gio = Math.floor(Date.now() / 1000);
  const jti = noi_dung.jti ?? randomUUID();
  const day_du: NoiDungToken = {
    ...noi_dung,
    jti,
    iat: bay_gio,
    exp: bay_gio + song_giay,
  };
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify(day_du));
  const than = `${header}.${payload}`;
  return {
    token: `${than}.${ky(than)}`,
    jti,
    het_han: new Date((bay_gio + song_giay) * 1000),
  };
}

export function tao_token_truy_cap(
  nd: Omit<NoiDungToken, 'iat' | 'exp' | 'jti' | 'loai'>,
): TokenDaKy {
  return tao_token({ ...nd, loai: 'tc' }, cau_hinh.jwt.access_ttl);
}

export function tao_token_lam_moi(
  nd: Omit<NoiDungToken, 'iat' | 'exp' | 'jti' | 'loai'>,
): TokenDaKy {
  return tao_token({ ...nd, loai: 'lm' }, cau_hinh.jwt.refresh_ttl);
}

/**
 * Xac minh chu ky va thoi han. Tra ve noi dung neu hop le, null neu khong.
 * KHONG nem loi de route xu ly gon (401 chung, khong tiet lo ly do cu the).
 */
export function giai_ma_token(token: string): NoiDungToken | null {
  if (typeof token !== 'string') return null;
  const phan = token.split('.');
  if (phan.length !== 3) return null;
  const [header_b64, payload_b64, chu_ky] = phan as [string, string, string];

  let header: unknown;
  try {
    header = JSON.parse(Buffer.from(header_b64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (
    typeof header !== 'object' || header === null ||
    (header as { alg?: unknown }).alg !== 'HS256'
  ) {
    return null; // tu choi alg=none va moi thuat toan khac
  }

  const mong_doi = ky(`${header_b64}.${payload_b64}`);
  const a = Buffer.from(chu_ky);
  const b = Buffer.from(mong_doi);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let nd: NoiDungToken;
  try {
    nd = JSON.parse(Buffer.from(payload_b64, 'base64url').toString('utf8')) as NoiDungToken;
  } catch {
    return null;
  }

  if (typeof nd.exp !== 'number' || typeof nd.sub !== 'string') return null;
  if (nd.exp * 1000 <= Date.now()) return null; // het han
  if (nd.loai !== 'tc' && nd.loai !== 'lm') return null;
  return nd;
}

/** Bam token lam moi truoc khi luu DB — lo DB khong the mao danh nguoi dung. */
export function bam_token(token: string): string {
  return createHmac('sha256', cau_hinh.jwt.secret).update(`lm:${token}`).digest('base64url');
}
