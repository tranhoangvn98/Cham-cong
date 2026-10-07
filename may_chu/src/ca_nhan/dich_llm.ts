// Dich cau tra loi cua tro ly (ca nhan + quan tri + thoi viec) sang tieng Trung qua LLM.
//
// Cau tra loi "dong san" sinh bang tieng Viet. Khi nguoi dung chon tieng Trung va LLM san
// sang, dich ca cau tra loi + goi y + nhan nut qua MOT luot goi LLM. LLM khong san sang
// (chua khai khoa / loi mang) thi giu nguyen tieng Viet — chatbot khong chet vi thieu LLM.
//
// Tep DOC LAP (khong nam trong ca_nhan/tro_ly.ts) de cac kenh tro ly khac nhau dung chung
// ma khong tao vong import.
import { cau_hinh } from '../cau_hinh.ts';
import { goi_deepseek } from '../ai/deepseek.ts';
import { type NgonNgu } from '../chuoi/chi_muc.ts';

export interface KhuonDich {
  tra_loi: string;
  goi_y: string[];
  mo_de_xuat?: { nhan: string; den: string };
  hanh_dong?: { nhan?: string; bo?: string; chi_tiet?: string[] };
}

function llm_san_sang(): boolean {
  return cau_hinh.deepseek.khoa !== '';
}

/** Goi DeepSeek yeu cau JSON va phan giai; loi thi tra null (ben goi giu nguyen tieng Viet). */
async function hoi_json(loai: string, prompt: string): Promise<Record<string, unknown> | null> {
  if (!llm_san_sang()) return null;
  try {
    const tho = await goi_deepseek(prompt, {
      ghi_log: (dong) => console.error(`[tro-ly:${loai}] ${dong}`),
    });
    const j: unknown = JSON.parse(tho);
    if (typeof j !== 'object' || j === null || Array.isArray(j)) return null;
    return j as Record<string, unknown>;
  } catch (loi) {
    console.error(`[tro-ly:${loai}] LLM loi, giu tieng Viet: ${(loi as Error).message}`);
    return null;
  }
}

/**
 * Dich cau tra loi (va cac nhan kem theo) sang tieng Trung Gian the qua LLM. Khong LLM thi
 * tra ve nguyen ban. Khong bao gio nem loi.
 */
export async function dich_tra_loi_llm<T extends KhuonDich>(
  ngon_ngu: NgonNgu, kq: T,
): Promise<T> {
  if (ngon_ngu !== 'zh') return kq;
  if (!llm_san_sang()) return kq;
  if (kq.tra_loi.trim() === '') return kq;
  const nhan = await hoi_json('dich',
    'Ban la dich gia chuyen nghiep cua doanh nghiep Trung Quoc. Dich cac chuoi sau tu TIENG '
    + 'VIET sang TIENG TRUNG GIAN THE, giong thuong mai chuyen nghiep, KHONG dich may. GIU '
    + 'NGUYEN markdown ** **, cac con so, ma, ngay gio, duong dan. Dau vao (JSON): '
    + JSON.stringify({
      tra_loi: kq.tra_loi,
      goi_y: kq.goi_y ?? [],
      mo_de_xuat_nhan: kq.mo_de_xuat?.nhan ?? null,
      hanh_dong_nhan: kq.hanh_dong?.nhan ?? null,
      hanh_dong_bo: kq.hanh_dong?.bo ?? null,
      hanh_dong_chi_tiet: kq.hanh_dong?.chi_tiet ?? null,
    })
    + '. Tra ve DUY NHAT doi tuong JSON dang {"tra_loi": "...", "goi_y": ["..."]} '
    + '(dung so phan tu goi_y nhu dau vao, moi phan tu la chuoi). Neu co mo_de_xuat_nhan '
    + 'khac null thi them "mo_de_xuat_nhan": "..."; neu co hanh_dong_nhan khac null thi them '
    + '"hanh_dong_nhan": "...", "hanh_dong_bo": "...", "hanh_dong_chi_tiet": ["..."] (dung '
    + 'so phan tu).');
  if (nhan === null) return kq;
  const ra: T = { ...kq };
  const t = nhan['tra_loi'];
  if (typeof t === 'string' && t.trim() !== '') ra.tra_loi = t.trim().slice(0, 1000);
  const g = nhan['goi_y'];
  if (Array.isArray(g) && (ra.goi_y ?? []).length > 0) {
    const gd = g.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
    if (gd.length > 0) ra.goi_y = gd.slice(0, (ra.goi_y ?? []).length);
  }
  const mn = nhan['mo_de_xuat_nhan'];
  if (typeof mn === 'string' && mn.trim() !== '' && ra.mo_de_xuat !== undefined) {
    ra.mo_de_xuat = { nhan: mn.trim(), den: ra.mo_de_xuat.den };
  }
  if (ra.hanh_dong !== undefined) {
    const hn = nhan['hanh_dong_nhan'];
    const hb = nhan['hanh_dong_bo'];
    const hc = nhan['hanh_dong_chi_tiet'];
    const them: Record<string, unknown> = {};
    if (typeof hn === 'string' && hn.trim() !== '') them['nhan'] = hn.trim();
    if (typeof hb === 'string' && hb.trim() !== '') them['bo'] = hb.trim();
    if (Array.isArray(hc)) {
      const hd = hc.filter((x): x is string => typeof x === 'string');
      if (hd.length > 0) them['chi_tiet'] = hd;
    }
    ra.hanh_dong = Object.assign({}, ra.hanh_dong, them) as T['hanh_dong'];
  }
  return ra;
}
