// Client goi REST API /api/v1 cua phan he Cham cong.
//
// Chi goi DUNG nhung duong may chu MCP biet san (khong bao gio noi du lieu tu cong cu vao
// duong dan) — nhu vay mot LLM tinh nghich khong the bao goi tro thanh goi mot endpoint khac.
//
// Chiu loi mang theo quy uoc CLAUDE.md muc 5: bat timeout, thu lai voi backoff, ton trong
// Retry-After khi gap 429, khong de long goi chet ngang.
import { cau_hinh } from './cau_hinh.ts';

/** Loi tra ve cho LLM doc — co ma de no giai thich duoc cho nguoi dung. */
export class LoiApi extends Error {
  readonly ma: number;
  readonly ma_loi: string;

  constructor(ma: number, ma_loi: string, thong_diep: string) {
    super(thong_diep);
    this.ma = ma;
    this.ma_loi = ma_loi;
  }
}

interface TuyChonGoi {
  phuong_thuc?: 'GET' | 'PUT' | 'POST';
  than?: unknown;
  truy_van?: Record<string, string>;
}

/** Dung URL tuyet doi tu duong dan /api/v1 + tham so truy van. Ham thuan de kiem. */
export function dung_url(duong_dan: string, truy_van: Record<string, string> = {}): string {
  const khoa = Object.entries(truy_van)
    .filter(([, v]) => v !== '' && v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  const qs = khoa.length === 0 ? '' : `?${khoa.join('&')}`;
  return `${cau_hinh.goc_api}${duong_dan}${qs}`;
}

/** Ngu khoang nho — tranh dap may chu dang qua tai. */
async function ngu(ms: number): Promise<void> {
  await new Promise((g) => setTimeout(g, ms));
}

/** Chuyen than phan hoi (co dang { du_lieu, phan_trang } hoac { loi }) thanh loi hoac ket qua. */
export function dich_than<T>(du_lieu: unknown): T {
  if (du_lieu === null || typeof du_lieu !== 'object') {
    throw new LoiApi(502, 'khuon_dang', 'Máy chủ chấm công trả về dạng không nhận được.');
  }
  const d = du_lieu as { loi?: { ma?: string; thong_diep?: string } };
  if (d.loi !== undefined && d.loi !== null) {
    throw new LoiApi(400, d.loi.ma ?? 'loi', d.loi.thong_diep ?? 'Máy chủ chấm công báo lỗi.');
  }
  return du_lieu as T;
}

/**
 * Goi mot duong /api/v1. Tra JSON da phan giai.
 *
 * Thu lai toi da 3 lan voi thoi gian cho tang dan khi: loi mang, HTTP 5xx, HTTP 429 (ton
 * trong Retry-After). HTTP 4xx khac la loi nghiep vu — tra ngay, khong thu lai.
 */
export async function goi_api<T = unknown>(
  duong_dan: string,
  tc: TuyChonGoi = {},
): Promise<T> {
  const phuong_thuc = tc.phuong_thuc ?? 'GET';
  const url = dung_url(duong_dan, tc.truy_van);

  let thu_cuoi: unknown;
  for (let lan = 0; lan < 3; lan++) {
    try {
      const res = await fetch(url, {
        method: phuong_thuc,
        headers: {
          authorization: `Bearer ${cau_hinh.khoa_api}`,
          ...(tc.than === undefined ? {} : { 'content-type': 'application/json' }),
        },
        ...(tc.than === undefined ? {} : { body: JSON.stringify(tc.than) }),
        signal: AbortSignal.timeout(30_000),
      });

      if (res.status === 429) {
        const ra = res.headers.get('retry-after');
        const cho = Number(ra);
        await ngu(Number.isFinite(cho) && cho > 0 ? Math.min(cho, 60) * 1000 : (lan + 1) * 2000);
        continue;
      }
      if (res.status >= 500) {
        thu_cuoi = new LoiApi(res.status, 'may_chu_loi', `Máy chủ chấm công lỗi ${res.status}.`);
        await ngu((lan + 1) * 1000);
        continue;
      }

      let than: unknown = null;
      try {
        than = await res.json();
      } catch {
        than = null;
      }
      if (res.status === 401 || res.status === 403) {
        const d = than as { loi?: { ma?: string; thong_diep?: string } } | null;
        throw new LoiApi(res.status, d?.loi?.ma ?? 'khong_quyen',
          d?.loi?.thong_diep
            ?? 'Khóa API thiếu quyền hoặc sai. Kiểm tra CHAM_CONG_KHOA và phạm vi của khóa.');
      }
      if (!res.ok) {
        const d = than as { loi?: { ma?: string; thong_diep?: string } } | null;
        throw new LoiApi(res.status, d?.loi?.ma ?? 'loi',
          d?.loi?.thong_diep ?? `Máy chủ chấm công báo lỗi ${res.status}.`);
      }
      return dich_than<T>(than);
    } catch (loi) {
      if (loi instanceof LoiApi) throw loi;
      thu_cuoi = loi;
      await ngu((lan + 1) * 1000);
    }
  }
  throw new LoiApi(0, 'loi_mang',
    `Không gọi được máy chủ chấm công sau 3 lần thử: ${(thu_cuoi as Error)?.message ?? 'lỗi mạng'}`);
}
