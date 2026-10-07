// Kiem tra bo tu dien song ngu cua WEB: khoa doi xung vi/zh va lap tham so.
// Chuoi nguoi dung doc ma chi co mot ngon ngu la LOI (quy tac SONG-NGU-TRUNG.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CHUOI_VI } from '../src/chuoi/vi.ts';
import { CHUOI_ZH } from '../src/chuoi/zh.ts';
import { chuan_ngon_ngu, la_ngon_ngu, tra_chuoi } from '../src/chuoi/chi_muc.ts';

test('tu dien web: moi khoa tieng Viet phai co tieng Trung va nguoc lai', () => {
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
  assert.equal(chuan_ngon_ngu('zh'), 'zh');
  assert.equal(chuan_ngon_ngu(null), 'vi');
});

test('tra_chuoi: lap tham so {khoa}, thieu tham so thi giu nguyen mau', () => {
  assert.equal(
    tra_chuoi('vi', 'khong_co_trang_mo_ta', { duong_dan: '/x' }),
    'Đường dẫn /x không tồn tại.',
  );
  assert.equal(
    tra_chuoi('zh', 'cho_duyet_mo_ta', { ten: '阿明' }),
    '您好，阿明。您的账号已通过 Microsoft 验证成功，但尚未由管理员分配权限，暂时无法进入系统。',
  );
  // Tham so khong duoc khai bao thi giu nguyen mau {khoa} de phat hien loi lap.
  assert.equal(
    tra_chuoi('vi', 'khong_co_trang_mo_ta', {}),
    'Đường dẫn {duong_dan} không tồn tại.',
  );
});
