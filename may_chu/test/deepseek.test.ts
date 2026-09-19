// Adapter DeepSeek — kiem khong can mang, khong can khoa that.
//
// Mock globalThis.fetch: moi luot goi tra mot phan hoi trong hang cho truoc. Nho vay kiem
// duoc: tham so gui di, luot thu lai khi 429/5xx, khong thu lai khi 4xx, va lat bo khung
// ```json ... ``` (phong khi DeepSeek thay doi cach boc).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

process.env['JWT_SECRET'] ??= 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['DATABASE_URL'] ??= 'postgres://khong_dung@127.0.0.1:5432/khong_dung';
process.env['DEEPSEEK_API_KEY'] = 'khoa-thu-khong-lo-ra-ngoai';

const { goi_deepseek, LoiDeepSeek, lat_hop_json } = await import('../src/ai/deepseek.ts');
import type { CauHinhGoiDeepSeek } from '../src/ai/deepseek.ts';

const CAU_HINH: CauHinhGoiDeepSeek = {
  khoa: 'khoa-thu-khong-lo-ra-ngoai',
  model: 'deepseek-chat',
  goc: 'https://api.deepseek.com',
  timeout_ms: 60_000,
  max_retry: 3,
};

const fetch_goc = globalThis.fetch;
after(() => {
  globalThis.fetch = fetch_goc;
});

/** Ham ngu gia — ghi lai de kiem co goi hay khong, khong ngu that. */
function ngu_gia(): { ham: (ms: number) => Promise<void>; lan: number[] } {
  const lan: number[] = [];
  return { ham: async (ms: number) => { lan.push(ms); }, lan };
}

interface PhanHoi {
  trang_thai: number;
  than: unknown;
  dau?: Record<string, string>;
}

/** Thay fetch bang mot may chu gia tra hang phan hoi lan luot. */
function gia_lap(cac: PhanHoi[]): {
  da_goi: { url: string; than: Record<string, unknown>; dau: Record<string, string> }[];
} {
  const da_goi: { url: string; than: Record<string, unknown>; dau: Record<string, string> }[] = [];
  let i = 0;
  globalThis.fetch = (async (u: string | URL | Request, o?: RequestInit) => {
    const ph = cac[Math.min(i, cac.length - 1)] as PhanHoi;
    i++;
    const dau: Record<string, string> = { 'content-type': 'application/json', ...(ph.dau ?? {}) };
    da_goi.push({
      url: String(u),
      than: typeof o?.body === 'string' ? JSON.parse(o.body) as Record<string, unknown> : {},
      dau: { ...(o?.headers as Record<string, string>) },
    });
    return new Response(JSON.stringify(ph.than), { status: ph.trang_thai, headers: dau });
  }) as typeof fetch;
  return { da_goi };
}

/** Bo cau hinh gia kem ham ngu gia — nhanh gon cho cac test. */
function tuy_chon_gia(sua: Partial<CauHinhGoiDeepSeek> = {}): {
  cau_hinh: CauHinhGoiDeepSeek; ngu: (ms: number) => Promise<void>; lan_ngu: number[];
} {
  const ng = ngu_gia();
  return { cau_hinh: { ...CAU_HINH, ...sua }, ngu: ng.ham, lan_ngu: ng.lan };
}

test('thanh cong: gui dung dia chi, khoa, va response_format json_object', async () => {
  const g = gia_lap([{
    trang_thai: 200,
    than: { choices: [{ message: { content: '{"trich_yeu":"V/v nghi le"}' } }] },
  }]);
  const tc = tuy_chon_gia();
  const kq = await goi_deepseek('soan thong bao', tc);
  assert.equal(kq, '{"trich_yeu":"V/v nghi le"}');
  assert.equal(g.da_goi.length, 1);
  assert.equal(g.da_goi[0]?.url, 'https://api.deepseek.com/chat/completions');
  assert.equal(g.da_goi[0]?.dau['authorization'], 'Bearer khoa-thu-khong-lo-ra-ngoai');
  const than = g.da_goi[0]?.than as Record<string, unknown>;
  assert.equal((than['response_format'] as Record<string, unknown>)['type'], 'json_object');
  assert.equal(than['model'], 'deepseek-chat');
});

test('429 co Retry-After: cho roi thu lai thanh cong', async () => {
  const g = gia_lap([
    { trang_thai: 429, than: {}, dau: { 'retry-after': '1' } },
    { trang_thai: 200, than: { choices: [{ message: { content: '{"ok":true}' } }] } },
  ]);
  const tc = tuy_chon_gia();
  const kq = await goi_deepseek('x', tc);
  assert.equal(kq, '{"ok":true}');
  assert.equal(g.da_goi.length, 2, 'phai thu lai sau 429');
  assert.deepEqual(tc.lan_ngu, [1000], 'phai ton trong Retry-After (1 giay)');
});

test('5xx: thu lai dung so lan roi nem loi co ma http_5xx', async () => {
  const g = gia_lap([
    { trang_thai: 500, than: {} },
    { trang_thai: 502, than: {} },
    { trang_thai: 503, than: {} },
  ]);
  const tc = tuy_chon_gia({ max_retry: 2 });
  await assert.rejects(
    () => goi_deepseek('x', tc),
    (loi: unknown) => loi instanceof LoiDeepSeek && loi.ma === 'http_5xx',
  );
  assert.equal(g.da_goi.length, 3, '1 lan dau + 2 lan thu lai');
  assert.equal(tc.lan_ngu.length, 2, '3 luot goi = 2 lan ngu giua chung');
});

test('4xx (sai khoa): nem ngay, KHONG ton luot thu lai', async () => {
  const g = gia_lap([{ trang_thai: 401, than: {} }]);
  await assert.rejects(
    () => goi_deepseek('x', tuy_chon_gia()),
    (loi: unknown) => loi instanceof LoiDeepSeek && loi.ma === 'http_4xx',
  );
  assert.equal(g.da_goi.length, 1);
});

test('thieu khoa: nem loi ma thieu_khoa, khong goi mang', async () => {
  let da_goi = 0;
  globalThis.fetch = (async () => {
    da_goi++;
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  await assert.rejects(
    () => goi_deepseek('x', tuy_chon_gia({ khoa: '' })),
    (loi: unknown) => loi instanceof LoiDeepSeek && loi.ma === 'thieu_khoa',
  );
  assert.equal(da_goi, 0);
});

test('tra ve rong: nem loi khuon_dang', async () => {
  gia_lap([{ trang_thai: 200, than: { choices: [{ message: { content: '   ' } }] } }]);
  await assert.rejects(
    () => goi_deepseek('x', tuy_chon_gia()),
    (loi: unknown) => loi instanceof LoiDeepSeek && loi.ma === 'khuon_dang',
  );
});

test('lat_hop_json: bo khung ```json ... ``` neu co', () => {
  assert.equal(lat_hop_json('```json\n{"a":1}\n```'), '{"a":1}');
  assert.equal(lat_hop_json('  {"a":1}  '), '{"a":1}');
  assert.equal(lat_hop_json('```\n{"a":1}\n```'), '{"a":1}');
});
