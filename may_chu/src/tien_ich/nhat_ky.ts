// Nhat ky thao tac (audit log). Ghi lai ai lam gi — can cho tranh chap bang cong.
import { thuc_thi } from '../csdl/ket_noi.ts';

/**
 * Ghi mot dong nhat ky. KHONG bao gio nem loi ra ngoai: that bai ghi nhat ky
 * khong duoc lam hong hanh dong nghiep vu da thanh cong.
 */
export async function ghi_nhat_ky(
  nguoi_dung_id: string | null,
  hanh_dong: string,
  thuc_the: string | null,
  thuc_the_id: string | null,
  chi_tiet: Record<string, unknown> | null,
  dia_chi_ip: string | null,
): Promise<void> {
  try {
    await thuc_thi(
      `insert into nhat_ky_thao_tac
         (nguoi_dung_id, hanh_dong, thuc_the, thuc_the_id, chi_tiet, dia_chi_ip)
       values ($1,$2,$3,$4,$5::jsonb,$6)`,
      [
        nguoi_dung_id, hanh_dong, thuc_the, thuc_the_id,
        chi_tiet === null ? null : JSON.stringify(chi_tiet),
        dia_chi_ip,
      ],
    );
  } catch (loi) {
    console.error('[nhat_ky] khong ghi duoc:', (loi as Error).message);
  }
}
