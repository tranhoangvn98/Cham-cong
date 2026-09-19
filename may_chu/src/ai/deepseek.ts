// Adapter DeepSeek — goi POST /chat/completions, tra ve chuoi noi dung.
//
// Quy tac an toan:
//   - KHONG log khoa API, KHONG log prompt/ket qua (noi dung van ban co the chua PII).
//   - Chiu loi mang: timeout, ket noi dut/reset, HTTP 5xx, 429 (ton trong Retry-After)
//     -> cho + thu lai (backoff) toi da `max_retry` lan, KHONG lam sap luong goi.
//   - Moi loi deu ra `LoiDeepSeek` co `ma` de ben goi phan loai (fallback khong-LLM).
import { cau_hinh } from '../cau_hinh.ts';

/** Loi cua adapter. `ma` de ben goi quyet dinh: fallback hay bao loi. */
export class LoiDeepSeek extends Error {
  /** 'thieu_khoa' | 'loi_mang' | 'http_4xx' | 'http_5xx' | '429' | 'khuon_dang' | 'het_gio' */
  readonly ma: string;

  constructor(ma: string, thong_diep: string) {
    super(thong_diep);
    this.ma = ma;
  }
}

const LOAI_DUNG_LUOT = new Set(['loi_mang', 'http_5xx', '429', 'het_gio']);

/** Chua dung luot thu: 4xx (sai khoa/khuon dang) thu lai cung vo ich. */
function dung_luot_thu(loi: LoiDeepSeek): boolean {
  return LOAI_DUNG_LUOT.has(loi.ma);
}

/** Ngu trong khoang nho — tranh dap DeepSeek khi no dang qua tai. */
function ngu(ms: number): Promise<void> {
  return new Promise((xong) => setTimeout(xong, ms));
}

/** Chuoi JSON co the bi DeepSeek boc trong ```json ... ``` — lat ra de parse. */
export function lat_hop_json(s: string): string {
  const t = s.trim();
  if (t.startsWith('```')) {
    const khep = t.indexOf('\n');
    return khep === -1 ? t.replace(/^```[a-zA-Z]*|```$/g, '').trim() : t.slice(khep + 1, -3).trim();
  }
  return t;
}

interface ThanChat {
  choices?: { message?: { content?: string } }[];
}

/** Cau hinh goi DeepSeek. Bo test bơm cau hinh gia qua tham so — `cau_hinh` export
 * `as const` nen khong duoc sua luc chay. */
export interface CauHinhGoiDeepSeek {
  khoa: string;
  model: string;
  goc: string;
  timeout_ms: number;
  max_retry: number;
}

/**
 * Goi DeepSeek mot lan. Ham nay la `GoiLlm` thuc thu — truyen vao cac module khac
 * qua tham so (xem `kieu.ts`), nen module dung no khong import gi o day.
 */
export async function goi_deepseek(
  prompt: string,
  tuy_chon: {
    /** Noi dung tang dan moi lan thu — phuc vu ghi log ma khong lo PII. */
    ghi_log?: (dong: string) => void;
    /** Bo test bơm ham ngủ giả để không phải chờ backoff thật. */
    ngu?: (ms: number) => Promise<void>;
    /** Bo test bơm cau hinh gia thay vi sua `cau_hinh` (as const). */
    cau_hinh?: CauHinhGoiDeepSeek;
  } = {},
): Promise<string> {
  const c: CauHinhGoiDeepSeek = tuy_chon.cau_hinh ?? cau_hinh.deepseek;
  if (c.khoa === '') {
    throw new LoiDeepSeek('thieu_khoa', 'Chưa cấu hình DEEPSEEK_API_KEY.');
  }
  const ghi = tuy_chon.ghi_log;
  const cho_ngu = tuy_chon.ngu ?? ngu;

  let loi_cuoi: LoiDeepSeek | null = null;
  for (let lan = 0; ; lan++) {
    // Het luot: dung, nem loi cuoi cung (da ghi o moi nhanh that bai).
    if (lan > c.max_retry) {
      throw loi_cuoi ?? new LoiDeepSeek('loi_mang', 'Het luot thu goi DeepSeek.');
    }

    try {
      const res = await fetch(`${c.goc}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${c.khoa}`,
        },
        body: JSON.stringify({
          model: c.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(c.timeout_ms),
      });

      if (res.status === 429) {
        const cho = Number(res.headers.get('retry-after') ?? '');
        loi_cuoi = new LoiDeepSeek('429', 'DeepSeek gioi han toc do.');
        if (lan === c.max_retry) continue;
        // Ton trong Retry-After — KHUYET DIEM cua phien truoc: con cho them backoff
        // o dau vong ke tiep thanh ra ngu 2 lan. Mot that bai chi duoc ngu MOT lan.
        const cho_ms = Number.isFinite(cho) && cho > 0 ? Math.min(cho * 1000, 60_000) : 1000;
        ghi?.(`[deepseek] 429, cho ${cho_ms}ms (Retry-After)`);
        await cho_ngu(cho_ms);
        continue;
      }
      if (res.status >= 500) {
        loi_cuoi = new LoiDeepSeek('http_5xx', `DeepSeek tra ma ${res.status}.`);
        if (lan === c.max_retry) continue;
        await cho_ngu(2000 * 2 ** lan + Math.floor(Math.random() * 500));
        continue;
      }
      if (!res.ok) {
        throw new LoiDeepSeek('http_4xx', `DeepSeek tra ma ${res.status} — kiem tra khoa/model.`);
      }

      const than = await res.json() as ThanChat;
      const noi_dung = than.choices?.[0]?.message?.content;
      if (typeof noi_dung !== 'string' || noi_dung.trim() === '') {
        throw new LoiDeepSeek('khuon_dang', 'DeepSeek tra ve khong co noi dung.');
      }
      return lat_hop_json(noi_dung);
    } catch (loi) {
      if (loi instanceof LoiDeepSeek) {
        // 4xx / khuon dang: thu lai cung vo ich, nem ngay.
        if (!dung_luot_thu(loi)) throw loi;
        loi_cuoi = loi;
        if (lan === c.max_retry) continue;
        await cho_ngu(2000 * 2 ** lan + Math.floor(Math.random() * 500));
        continue;
      }
      // Loi fetch: timeout (DOMException TimeoutError), reset ket noi, DNS...
      loi_cuoi = new LoiDeepSeek(
        loi instanceof Error && loi.name === 'TimeoutError' ? 'het_gio' : 'loi_mang',
        `Khong goi duoc DeepSeek: ${(loi as Error).message}`,
      );
      if (lan === c.max_retry) continue;
      await cho_ngu(2000 * 2 ** lan + Math.floor(Math.random() * 500));
    }
  }
}
