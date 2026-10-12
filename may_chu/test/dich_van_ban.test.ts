// Kiem thu module dich van ban AI sang tieng Trung (ai/dich_van_ban.ts) — ham THUAN,
// LLM gia. KHONG can CSDL / mang.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { prompt_dich_van_ban, chuan_hoa_ban_dich, dich_van_ban_zh, CONG_TY_ZH } =
  await import('../src/ai/dich_van_ban.ts');

test('prompt_dich_van_ban: nhet du tieu de, cac doan va ten cong ty chuan', () => {
  const p = prompt_dich_van_ban('Về việc nghỉ lễ', ['Đoạn một.', 'Đoạn hai.']);
  assert.match(p, /Về việc nghỉ lễ/);
  assert.match(p, /Đoạn một\./);
  assert.match(p, /Đoạn hai\./);
  assert.match(p, /TIENG TRUNG GIAN THE/);
  assert.match(p, new RegExp(CONG_TY_ZH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('chuan_hoa_ban_dich: JSON dung khuon thi tra ban dich, dung so doan', () => {
  const ra = chuan_hoa_ban_dich({
    trich_yeu_zh: '关于放假安排的通知',
    noi_dung_zh: ['第一段。', '第二段。'],
  }, 2);
  assert.deepEqual(ra, { trich_yeu_zh: '关于放假安排的通知', noi_dung_zh: ['第一段。', '第二段。'] });
});

test('chuan_hoa_ban_dich: JSON hong / thieu truong / lech so doan thi tra null', () => {
  assert.equal(chuan_hoa_ban_dich(null, 2), null);
  assert.equal(chuan_hoa_ban_dich('chuoi', 2), null);
  assert.equal(chuan_hoa_ban_dich({ trich_yeu_zh: '', noi_dung_zh: ['a'] }, 1), null);
  assert.equal(chuan_hoa_ban_dich({ trich_yeu_zh: 't', noi_dung_zh: 'chuoi' }, 1), null);
  // Lech so doan la dau hieu cat xon — khong nhan.
  assert.equal(chuan_hoa_ban_dich({ trich_yeu_zh: 't', noi_dung_zh: ['a'] }, 2), null);
  assert.equal(chuan_hoa_ban_dich({ trich_yeu_zh: 't', noi_dung_zh: ['a', ''] }, 2), null);
});

test('dich_van_ban_zh: LLM tra JSON dung thi tra ban dich', async () => {
  const ra = await dich_van_ban_zh(
    async (p) => {
      assert.match(p, /VIET sang TIENG TRUNG/);
      return '{"trich_yeu_zh":"关于调整工作时间的通知","noi_dung_zh":["第一段。","第二段。"]}';
    },
    'Về việc điều chỉnh giờ làm việc',
    ['Đoạn một.', 'Đoạn hai.'],
  );
  assert.deepEqual(ra, {
    trich_yeu_zh: '关于调整工作时间的通知',
    noi_dung_zh: ['第一段。', '第二段。'],
  });
});

test('dich_van_ban_zh: LLM nem loi / tra JSON hong thi tra null, KHONG nem', async () => {
  assert.equal(await dich_van_ban_zh(async () => { throw new Error('mang chet'); },
    'Tieu de', ['Doan']), null);
  assert.equal(await dich_van_ban_zh(async () => 'khong phai json',
    'Tieu de', ['Doan']), null);
  assert.equal(await dich_van_ban_zh(async () => '{"trich_yeu_zh":"x","noi_dung_zh":["a","b"]}',
    'Tieu de', ['Doan']), null);
});
