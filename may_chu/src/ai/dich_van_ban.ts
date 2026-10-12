// Dich van xuoi cua van ban AI sang tieng Trung GIAN THE — cho email gui theo ngon ngu
// nguoi nhan. Tach rieng khoi luong soan chinh (soan_van_ban.ts) vi buoc dich chay SAU khi
// gate dat, va co the chay LAI o thoi diem gui email (ban nhap tu_soan khong co ban dich).
//
// Ham THUAN: nhan `GoiLlm` tu ben ngoai (adapter DeepSeek hoac ham gia trong test) —
// khong import cau_hinh / deepseek / csdl. Tra null (khong nem) khi LLM loi hoac tra JSON
// sai khuon — ben goi giu nguyen tieng Viet, email van gui duoc.
import type { GoiLlm } from './kieu.ts';

/** Ban dich hoan chinh cua mot van ban: tieu de (trich yeu) + cac doan noi dung. */
export interface BanDichVanBan {
  trich_yeu_zh: string;
  noi_dung_zh: string[];
}

/** Ten cong ty theo bang thuat ngu song ngu — nhac AI dich nhat quan. */
export const CONG_TY_ZH = '陈黄越南有限公司';

/**
 * Prompt dich: dich trich yeu + noi dung sang tieng Trung Gian the, giong thuong mai
 * chuyen nghiep, KHONG dich may. Giu nguyen con so, ngay gio, ma ky hieu, ten rieng.
 * Tra ve DUY NHAT doi tuong JSON, so doan noi_dung_zh phai KHOP voi dau vao.
 */
export function prompt_dich_van_ban(trich_yeu: string, noi_dung: string[]): string {
  return 'Ban la chuyen vien van thu cua doanh nghiep Trung Quoc. Dich TIEU DE va NOI DUNG '
    + 'van ban sau tu TIENG VIET sang TIENG TRUNG GIAN THE, van phong thuong mai chuyen '
    + 'nghiep, dung tu chuan cua doanh nghiep Trung Quoc — KHONG dich may, KHONG dich word '
    + '-by-word. Quy uoc bat buoc: ten cong ty "Công ty TNHH Trần Hoàng Việt Nam" dich thanh '
    + `"${CONG_TY_ZH}". GIU NGUYEN: con so, ngay gio, so ky hieu, ma, ten rieng. `
    + `Tieu de (trich yeu): ${trich_yeu}. `
    + 'Noi dung (mang cac doan, dung nguyen so doan): '
    + JSON.stringify(noi_dung)
    + '. Tra ve DUY NHAT doi tuong JSON, KHONG them loi dan giai, dang: '
    + '{"trich_yeu_zh": "tieu de da dich", "noi_dung_zh": ["doan 1 da dich", "doan 2 da dich"]} '
    + '(mang noi_dung_zh phai dung so phan tu cua noi_dung dau vao).';
}

/**
 * Chuan hoa JSON AI tra ve thanh BanDichVanBan. Tra null khi sai khuon hoac so doan lech —
 * ban dich lech so doan la dau hieu cat xon noi dung, khong dung.
 */
export function chuan_hoa_ban_dich(tho: unknown, so_doan: number): BanDichVanBan | null {
  if (typeof tho !== 'object' || tho === null || Array.isArray(tho)) return null;
  const b = tho as Record<string, unknown>;
  const trich_yeu_zh = typeof b['trich_yeu_zh'] === 'string' ? b['trich_yeu_zh'].trim() : '';
  if (trich_yeu_zh === '') return null;
  const noi_dung_zh = b['noi_dung_zh'];
  if (!Array.isArray(noi_dung_zh)) return null;
  const cac_doan = noi_dung_zh
    .filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  if (cac_doan.length !== so_doan) return null;
  return { trich_yeu_zh, noi_dung_zh: cac_doan };
}

/**
 * Dich tieu de + noi dung sang tieng Trung qua LLM. KHONG bao gio nem — loi goi LLM, JSON
 * hong hay khuon lech deu tra null de ben goi giu nguyen tieng Viet.
 */
export async function dich_van_ban_zh(
  goi_llm: GoiLlm,
  trich_yeu: string,
  noi_dung: string[],
): Promise<BanDichVanBan | null> {
  if (trich_yeu.trim() === '' || noi_dung.length === 0) return null;
  try {
    const cho = await goi_llm(prompt_dich_van_ban(trich_yeu, noi_dung));
    return chuan_hoa_ban_dich(JSON.parse(cho), noi_dung.length);
  } catch {
    return null;
  }
}
