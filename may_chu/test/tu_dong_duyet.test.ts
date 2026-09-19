// Kiem quyet dinh tu dong duyet don nghi: khong luong -> duyet; loai khac xet quy phep nam
// (du -> phep; thieu -> tach; het -> tu choi).
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { quyet_dinh_don } = await import('../src/don_tu/tu_dong_duyet.ts');

const NGAY3 = ['2026-08-10', '2026-08-11', '2026-08-12'];

test('khong luong: luon duyet, khong xet quy', () => {
  assert.equal(quyet_dinh_don('khong_luong', NGAY3, false, 0).kieu, 'duyet_khong_luong');
});

test('du phep: duyet ca don la phep nam', () => {
  assert.equal(quyet_dinh_don('phep_nam', NGAY3, false, 5).kieu, 'duyet_phep');
});

test('het phep (0): tu choi ca don', () => {
  const r = quyet_dinh_don('om', NGAY3, false, 0);
  assert.equal(r.kieu, 'tu_choi');
});

test('thieu phep: tach phep + khong luong (con 2, xin 3)', () => {
  const r = quyet_dinh_don('phep_nam', NGAY3, false, 2);
  assert.equal(r.kieu, 'tach');
  if (r.kieu === 'tach') {
    assert.equal(r.so_phep, 2);
    assert.equal(r.so_kl, 1);
    assert.equal(r.giu_den, '2026-08-11');
    assert.equal(r.kl_tu, '2026-08-12');
  }
});

test('om cung xet theo phep nam: du phep -> duyet phep', () => {
  assert.equal(quyet_dinh_don('om', NGAY3, false, 3).kieu, 'duyet_phep');
});

test('nua ngay con 0.5 phep -> duyet phep', () => {
  assert.equal(quyet_dinh_don('phep_nam', ['2026-08-10'], true, 0.5).kieu, 'duyet_phep');
});

test('nua ngay het phep -> tu choi', () => {
  assert.equal(quyet_dinh_don('phep_nam', ['2026-08-10'], true, 0).kieu, 'tu_choi');
});
