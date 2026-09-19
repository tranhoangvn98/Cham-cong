// Soan van xuat AI — buoc DUY NHAT dung AI trong toan luong.
//
// Nhan boi canh (code dung) + noi dung tho (nguoi tao nhap), goi LLM qua `GoiLlm`
// (truyen vao tu ben ngoai — adapter DeepSeek hoac ham gia trong test), tra ve
// VanXuatAI chi gom van xuoi. Moi viec deterministic nam ngoai tep nay.
import type { GoiLlm, KieuVanBan, KetQuaGate, VanXuatAI } from './kieu.ts';
import { prompt_soan, type BoiCanhSoan } from './prompt_soan.ts';

/** Loi soan — `ma` de worker phan loai: fallback khong-LLM hay bao loi. */
export class LoiSoanVanBan extends Error {
  /** 'llm' (loi tu goi LLM) | 'khuon_dang' (AI tra JSON khong dung khuan). */
  readonly ma: 'llm' | 'khuon_dang';

  constructor(ma: 'llm' | 'khuon_dang', thong_diep: string) {
    super(thong_diep);
    this.ma = ma;
  }
}

function la_mang_chuoi(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string' && x.trim() !== '');
}

/** Loai dong nguoi nhan AI loi viet vao than bai — "Kính gửi ..." hoac chi ten nguoi
 * nhan tro troi ("Toàn thể cán bộ, nhân viên ..."). Neu dong co hanh dong thi GIU (la
 * cau van thuc su, vd "Toàn thể ... phải thực hiện nghiêm túc.").
 * LUU Y: `\b` cua JS chi hieu ky tu ASCII — chu Viet ket thuc bang ky tu co dau (v.d
 * "thể") lam \b khong khop, nen dung lookaround ASCII. */
const MAU_DONG_NGUOI_NHAN = /^(k(i|í)nh g(u|ử)i|toàn thể|toan the|ông|ong|bà|ba)(?![A-Za-z0-9_])/i;
// Dong co tu hanh dong la cau van thuc — giu lai, khong phai dong nguoi nhan tro troi.
const TU_HANH_DONG = /(?<![A-Za-z0-9_])(thực hiện|thuc hien|yêu cầu|yeu cau|đề nghị|de nghi|chấp hành|chap hanh|đi làm|di lam|làm việc|lam viec|hãy|hay|cần|can|phải|phai|sẽ|se|không|khong|nghỉ|nghi|tuân|tuan|được|duoc|sắp xếp|sap xep|theo dõi|theo doi|báo cáo|bao cao)(?![A-Za-z0-9_])/i;

/** Dong chi ghi nguoi nhan ma khong co hanh dong -> dong thua, phai bo. */
export function la_dong_nguoi_nhan(d: string): boolean {
  const t = d.trim();
  return MAU_DONG_NGUOI_NHAN.test(t) && !TU_HANH_DONG.test(t);
}

function loai_dong_nguoi_nhan(doan: string[]): string[] {
  return doan.filter((d) => !la_dong_nguoi_nhan(d));
}

/** Chuan trich yeu theo NĐ30: cong van "V/v", thong bao / quyet dinh "Về việc". */
function chuan_trich_yeu(loai: KieuVanBan, trich_yeu: string): string {
  if (loai === 'cong_van') {
    return trich_yeu.startsWith('V/v') ? trich_yeu : `V/v ${trich_yeu}`;
  }
  // Thong bao / quyet dinh TUYET DOI khong dung "V/v" — AI loi viet thi sua, thieu thi them.
  const m = /^v\/v\s*[:.]?\s*/i.exec(trich_yeu);
  if (m !== null) return `Về việc ${trich_yeu.slice(m[0].length)}`;
  if (/^về việc\b/i.test(trich_yeu)) return trich_yeu;
  return `Về việc ${trich_yeu}`;
}

/**
 * Chuan hoa dau ra AI thanh VanXuatAI.
 *
 * Viec chu dong sua (vd cong van bat buoc co "V/v") la deterministic — nam trong
 * quyen cua code, khong phai quyet dinh cua AI.
 */
export function chuan_hoa_van_ai(loai: KieuVanBan, tho: unknown): VanXuatAI {
  if (typeof tho !== 'object' || tho === null || Array.isArray(tho)) {
    throw new LoiSoanVanBan('khuon_dang', 'AI tra ve khong phai doi tuong JSON.');
  }
  const b = tho as Record<string, unknown>;

  const trich_yeu = typeof b['trich_yeu'] === 'string' ? b['trich_yeu'].trim() : '';
  if (trich_yeu === '') {
    throw new LoiSoanVanBan('khuon_dang', 'AI tra ve thieu trich_yeu.');
  }
  const kinh_gui = la_mang_chuoi(b['kinh_gui']) ? (b['kinh_gui'] as string[]) : [];
  const noi_dung = la_mang_chuoi(b['noi_dung']) ? (b['noi_dung'] as string[]) : [];
  if (noi_dung.length === 0) {
    throw new LoiSoanVanBan('khuon_dang', 'AI tra ve noi_dung rong.');
  }

  const tv = chuan_trich_yeu(loai, trich_yeu);
  // Dong nguoi nhan ("Kính gửi ..." hay "Toàn thể ..." tro troi) KHONG duoc nam trong
  // than bai — cong van in rieng tu kinh_gui, thong bao / quyet dinh in o "Nơi nhận".
  const nd = loai_dong_nguoi_nhan(noi_dung);

  if (loai === 'cong_van') {
    if (kinh_gui.length === 0) {
      throw new LoiSoanVanBan('khuon_dang', 'Cong van bat buoc co kinh_gui.');
    }
    return { trich_yeu: tv, kinh_gui, noi_dung: nd };
  }

  if (loai === 'quyet_dinh') {
    // Go tien to "Căn cứ " AI tu chen san (builder in san "Căn cứ ...").
    const can_cu = (la_mang_chuoi(b['can_cu']) ? (b['can_cu'] as string[]) : [])
      .map((c) => c.replace(/^căn cứ\s+/i, ''));
    const dieu = la_mang_chuoi(b['dieu']) ? (b['dieu'] as string[]) : [];
    if (can_cu.length === 0) {
      throw new LoiSoanVanBan('khuon_dang', 'Quyet dinh bat buoc co can_cu.');
    }
    if (dieu.length === 0) {
      throw new LoiSoanVanBan('khuon_dang', 'Quyet dinh bat buoc co it nhat mot Dieu.');
    }
    // ND30: chi CONG VAN moi co "Kính gửi". Thong bao / quyet dinh ghi nguoi nhan o
    // khoi "Nơi nhận" cuoi van ban — kinh_gui AI sinh ra bi BO DI, khong in ra giay.
    return { trich_yeu: tv, kinh_gui: [], can_cu, dieu, noi_dung: nd };
  }

  // Thong bao: nguoi nhan nam o "Nơi nhận" — khong co dong "Kính gửi".
  return { trich_yeu: tv, kinh_gui: [], noi_dung: nd };
}

/**
 * Soan mot lan. Nem LoiSoanVanBan khi goi LLM that bai hoac khuon dang sai —
 * ben goi (vong lap tu sua) quyet dinh lam gi.
 */
export async function soan_van_ban(
  goi_llm: GoiLlm,
  boi_canh: BoiCanhSoan,
  noi_dung_tho: string,
  loi_lan_truoc?: KetQuaGate[],
): Promise<VanXuatAI> {
  const prompt = prompt_soan(boi_canh, noi_dung_tho, loi_lan_truoc);

  let cho: string;
  try {
    cho = await goi_llm(prompt);
  } catch (loi) {
    throw new LoiSoanVanBan('llm', `Khong goi duoc AI: ${(loi as Error).message}`);
  }

  let tho: unknown;
  try {
    tho = JSON.parse(cho);
  } catch {
    throw new LoiSoanVanBan('khuon_dang', 'AI tra ve khong phai JSON hop le.');
  }
  return chuan_hoa_van_ai(boi_canh.loai, tho);
}
