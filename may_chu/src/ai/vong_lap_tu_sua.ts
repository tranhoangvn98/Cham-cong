// Vong lap tu sua — chi loi `loai_loi='llm'` (G8/G9/G12) moi goi lai AI.
//
// Loi `code` (the thuc, pham vi, tep docx) la deterministic: goi lai AI khong sua duoc,
// chi ton tien — nem LoiGateCode ngay de nguoi lap trinh sua. Het so lan thu ma van
// truot gate van xuoi: nem LoiHetLuot kem ket qua de ghi vao cot ket_qua_gate.
import type {
  BoSinhDocx, GoiLlm, KetQuaGate, KieuVanBan, PhamViNhan, QuanHe, SpecVanBan, TruongHeThong,
} from './kieu.ts';
import { soan_van_ban, LoiSoanVanBan } from './soan_van_ban.ts';
import type { BoiCanhSoan } from './prompt_soan.ts';
import { ghep_spec } from './ghep_spec.ts';
import { chay_gate, dat_tat_ca, muc_loi } from './gate_kiem_tra.ts';

/** Loi gate deterministic — khong goi lai AI, day la loi lap trinh. */
export class LoiGateCode extends Error {
  readonly ket_qua_gate: KetQuaGate[];

  constructor(kq: KetQuaGate[]) {
    const loi = muc_loi(kq).map((k) => k.ma_check).join(', ');
    super(`Gate deterministic truot (${loi}) — loi lap trinh, khong goi lai AI.`);
    this.ket_qua_gate = kq;
  }
}

/** Het luot goi AI ma van truot gate van xuoi. */
export class LoiHetLuot extends Error {
  readonly ket_qua_gate: KetQuaGate[];

  constructor(kq: KetQuaGate[]) {
    super('AI soan van chua dat sau so lan thu toi da.');
    this.ket_qua_gate = kq;
  }
}

export interface CauHinhTuSua {
  goi_llm: GoiLlm;
  dung_docx: BoSinhDocx;
  /** So lan goi lai AI toi da (mac dinh lay DEEPSEEK_MAX_RETRY). */
  so_lan_toi_da: number;
  ghi_log?: (dong: string) => void;
}

export interface KetQuaTuSua {
  spec: SpecVanBan;
  docx: Buffer;
  ket_qua_gate: KetQuaGate[];
  /** So lan da goi AI (0 = lan dau da dat). */
  so_lan_thu: number;
}

/** Placeholder cho loi "AI tra khong phai JSON dung khuon" — day ve gate G12 de thu lai. */
const LOI_KHUON_DANG: KetQuaGate = {
  ma_check: 'G12', dat: false, ly_do: 'AI tra ve khong phai JSON dung khuon.', loai_loi: 'llm',
};

/**
 * Chay buoc ② (AI soan) + buoc ③ (build docx + gate), tu goi lai AI khi van xuoi loi.
 *
 * Tra ve spec + docx + ket qua gate khi dat. Nem LoiGateCode (loi code), LoiHetLuot
 * (het luot), hoac nem LoiSoanVanBan khi LLM khong goi duoc.
 */
export async function xu_ly_tu_sua(
  boi_canh: BoiCanhSoan,
  noi_dung_tho: string,
  he_thong: TruongHeThong,
  nguoi_nhan: { nhan_vien_id: string | null; phong_ban_id: string | null },
  pham_vi: PhamViNhan,
  quan_he: QuanHe,
  loai: KieuVanBan,
  cau_hinh: CauHinhTuSua,
): Promise<KetQuaTuSua> {
  let loi_truoc: KetQuaGate[] | undefined;

  for (let lan = 0; ; lan++) {
    const ghi = cau_hinh.ghi_log;
    if (lan > 0) ghi?.(`[tu-sua] goi lai AI lan ${lan + 1}`);

    let spec: SpecVanBan;
    try {
      const van_ai = await soan_van_ban(cau_hinh.goi_llm, boi_canh, noi_dung_tho, loi_truoc);
      spec = ghep_spec(he_thong, loai, pham_vi, quan_he, van_ai, nguoi_nhan);
    } catch (loi) {
      if (loi instanceof LoiSoanVanBan && loi.ma === 'llm') {
        // LLM khong goi duoc — chuyen sang fallback khong-LLM (route xu ly).
        throw loi;
      }
      // AI tra JSON sai khuon — coi nhu truot G12 va thu lai, neu con luot.
      if (loi instanceof LoiSoanVanBan && lan < cau_hinh.so_lan_toi_da) {
        loi_truoc = [LOI_KHUON_DANG];
        continue;
      }
      throw loi;
    }

    const docx = await cau_hinh.dung_docx.dung(spec);
    const kq = await chay_gate(spec, docx);

    if (dat_tat_ca(kq)) return { spec, docx, ket_qua_gate: kq, so_lan_thu: lan };

    const loi = muc_loi(kq);
    const loi_llm = loi.filter((k) => k.loai_loi === 'llm');
    if (loi_llm.length === 0) throw new LoiGateCode(kq);
    if (lan >= cau_hinh.so_lan_toi_da) throw new LoiHetLuot(kq);
    loi_truoc = loi_llm;
  }
}
