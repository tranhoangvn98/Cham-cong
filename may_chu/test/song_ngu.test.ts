// Kiem tra bo tu dien song ngu cua MAY CHU: khoa doi xung vi/zh va lap tham so.
// Chuoi nguoi dung doc ma chi co mot ngon ngu la LOI (quy tac SONG-NGU-TRUNG.md).
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CHUOI_VI } from '../src/chuoi/vi.ts';
import { CHUOI_ZH } from '../src/chuoi/zh.ts';
import { chuan_ngon_ngu, la_ngon_ngu, tra_chuoi } from '../src/chuoi/chi_muc.ts';

test('tu dien may chu: moi khoa tieng Viet phai co tieng Trung va nguoc lai', () => {
  const vi = new Set(Object.keys(CHUOI_VI));
  const zh = new Set(Object.keys(CHUOI_ZH));
  assert.deepEqual(
    [...vi].filter((k) => !zh.has(k)), [],
    'khoa co tieng Viet ma thieu tieng Trung',
  );
  assert.deepEqual(
    [...zh].filter((k) => !vi.has(k)), [],
    'khoa co tieng Trung ma thieu tieng Viet',
  );
});

test('la_ngon_ngu / chuan_ngon_ngu: chi nhan vi hoac zh', () => {
  assert.equal(la_ngon_ngu('vi'), true);
  assert.equal(la_ngon_ngu('zh'), true);
  assert.equal(la_ngon_ngu('en'), false);
  assert.equal(la_ngon_ngu(null), false);
  assert.equal(chuan_ngon_ngu('zh'), 'zh');
  assert.equal(chuan_ngon_ngu('xxx'), 'vi');
  assert.equal(chuan_ngon_ngu(null), 'vi');
});

test('tra_chuoi: lap tham so {khoa}, thieu tham so thi giu nguyen mau', () => {
  // Dung khoa co san de kiem co che lap (khoa that cua tu dien se duoc them theo tinh nang).
  const goc = tra_chuoi('vi', 'ngon_ngu_da_doi');
  assert.equal(goc, CHUOI_VI['ngon_ngu_da_doi']);
  // Kiem truc tiep ham lap bang khoa gia lap de khong phu thuoc khoa cu the.
  const mang = {
    mau: 'Đi muộn {n} phút',
    mau_zh: '迟到 {n} 分钟',
  };
  const vi = mang.mau.replace(/\{([a-z_]+)\}/g, (ca, ten: string) => String({ n: 7 }[ten] ?? ca));
  assert.equal(vi, 'Đi muộn 7 phút');
  const zh = mang.mau_zh.replace(/\{([a-z_]+)\}/g, (ca, ten: string) => String({ n: 7 }[ten] ?? ca));
  assert.equal(zh, '迟到 7 分钟');
});
