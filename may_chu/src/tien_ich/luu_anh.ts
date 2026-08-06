// Luu anh selfie cham cong. Anh la du lieu ca nhan: KHONG phuc vu tinh, chi tra qua
// route co xac thuc va phan quyen (xem tuyen/toi.ts -> GET /api/toi/anh/:id).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve, sep } from 'node:path';
import { cau_hinh } from '../cau_hinh.ts';
import { LoiDauVao } from './kiem_tra.ts';

/** Nhan dang loai anh bang magic byte — KHONG tin content-type client gui len. */
function doc_dinh_dang(du_lieu: Buffer): 'jpg' | 'png' | null {
  if (du_lieu.length < 12) return null;
  // JPEG: FF D8 FF
  if (du_lieu[0] === 0xff && du_lieu[1] === 0xd8 && du_lieu[2] === 0xff) return 'jpg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((b, i) => du_lieu[i] === b)) return 'png';
  return null;
}

/**
 * Ghi anh xuong dia, tra ve TEN TEP tuong doi (dang 'YYYY-MM-DD/uuid.jpg').
 * Ten tep do server sinh hoan toan — khong lay bat ky phan nao tu client.
 */
export async function luu_anh_selfie(du_lieu: Buffer, ngay: string): Promise<string> {
  if (du_lieu.length === 0) throw new LoiDauVao('Anh rong.');
  if (du_lieu.length > cau_hinh.anh_toi_da_byte) {
    const mb = Math.round(cau_hinh.anh_toi_da_byte / (1024 * 1024));
    throw new LoiDauVao(`Anh qua lon (toi da ${mb} MB).`);
  }

  const dinh_dang = doc_dinh_dang(du_lieu);
  if (dinh_dang === null) throw new LoiDauVao('Chi nhan anh JPEG hoac PNG.');

  const thu_muc_con = ngay; // gom theo ngay de khong co thu muc hang tram nghin tep
  await mkdir(join(cau_hinh.thu_muc_anh, thu_muc_con), { recursive: true });

  const ten_tep = `${thu_muc_con}/${randomUUID()}.${dinh_dang}`;
  await writeFile(join(cau_hinh.thu_muc_anh, ten_tep), du_lieu, { mode: 0o600 });
  return ten_tep;
}

/**
 * Doc anh theo ten tep da luu trong DB.
 * Chan path traversal: chi nhan dung dinh dang 'YYYY-MM-DD/<uuid>.<jpg|png>' va
 * kiem tra lai duong dan tuyet doi nam trong thu muc anh.
 */
export async function doc_anh_selfie(
  ten_tep: string,
): Promise<{ du_lieu: Buffer; kieu: string } | null> {
  if (!/^\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.(jpg|png)$/.test(ten_tep)) return null;

  const goc = resolve(cau_hinh.thu_muc_anh);
  const day_du = resolve(goc, ten_tep);
  if (day_du !== goc && !day_du.startsWith(goc + sep)) return null;

  try {
    const du_lieu = await readFile(day_du);
    return { du_lieu, kieu: ten_tep.endsWith('.png') ? 'image/png' : 'image/jpeg' };
  } catch {
    return null;
  }
}
