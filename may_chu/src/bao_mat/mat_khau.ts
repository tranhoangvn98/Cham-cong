// Bam mat khau bang scrypt cua node:crypto — khong can goi native (bcrypt/argon2).
// Dinh dang luu: scrypt$N$r$p$<salt_base64url>$<hash_base64url>
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt_async = promisify(scrypt) as (
  mat_khau: string | Buffer,
  muoi: string | Buffer,
  do_dai: number,
  tuy_chon: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

// N=2^15 (32768): cham vua du de chong do offline, van < 100ms tren VPS thuong.
const N = 32768;
const R = 8;
const P = 1;
const DAI_HASH = 32;
const DAI_MUOI = 16;
// scrypt can ~128 * N * r byte; cong them he so an toan.
const MAXMEM = 128 * N * R * 2;

export async function bam_mat_khau(mat_khau: string): Promise<string> {
  kiem_tra_do_manh(mat_khau);
  const muoi = randomBytes(DAI_MUOI);
  const hash = await scrypt_async(mat_khau.normalize('NFKC'), muoi, DAI_HASH, {
    N, r: R, p: P, maxmem: MAXMEM,
  });
  return [
    'scrypt', N, R, P,
    muoi.toString('base64url'),
    hash.toString('base64url'),
  ].join('$');
}

/** So sanh mat khau voi hash da luu. Khong bao gio nem loi — chi tra true/false. */
export async function kiem_tra_mat_khau(mat_khau: string, luu: string): Promise<boolean> {
  try {
    const phan = luu.split('$');
    if (phan.length !== 6 || phan[0] !== 'scrypt') return false;
    const n = Number(phan[1]);
    const r = Number(phan[2]);
    const p = Number(phan[3]);
    if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
    // Chan tham so vo ly tu DB bi sua doi — tranh scrypt an het RAM.
    if (n < 1024 || n > 1 << 20 || r < 1 || r > 32 || p < 1 || p > 16) return false;

    const muoi = Buffer.from(phan[4] as string, 'base64url');
    const hash_luu = Buffer.from(phan[5] as string, 'base64url');
    if (muoi.length === 0 || hash_luu.length === 0) return false;

    const hash_moi = await scrypt_async(mat_khau.normalize('NFKC'), muoi, hash_luu.length, {
      N: n, r, p, maxmem: 128 * n * r * 2,
    });
    return timingSafeEqual(hash_luu, hash_moi);
  } catch {
    return false;
  }
}

/** Yeu cau toi thieu cho mat khau. Nem loi co thong diep tieng Viet de tra ve API. */
export function kiem_tra_do_manh(mat_khau: string): void {
  if (typeof mat_khau !== 'string' || mat_khau.length < 8) {
    throw new LoiMatKhau('Mật khẩu phải từ 8 ký tự trở lên.');
  }
  if (mat_khau.length > 200) {
    throw new LoiMatKhau('Mật khẩu quá dài (tối đa 200 ký tự).');
  }
  if (!/[0-9]/.test(mat_khau) || !/[a-zA-Z]/.test(mat_khau)) {
    throw new LoiMatKhau('Mật khẩu phải có cả chữ và số.');
  }
  const de_doan = ['12345678', 'password', 'matkhau', 'chamcong', '11111111', 'admin123'];
  if (de_doan.includes(mat_khau.toLowerCase())) {
    throw new LoiMatKhau('Mật khẩu quá dễ đoán, hãy chọn mật khẩu khác.');
  }
}

export class LoiMatKhau extends Error {}
