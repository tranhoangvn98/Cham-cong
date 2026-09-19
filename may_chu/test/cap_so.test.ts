// So ky hieu — khuon THVN chot 07-09-2026: 12/TB-THVN, 12/QĐ-THVN, cong van 12/THVN-NS.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { dung_so_ky_hieu, kiem_tra_so_ky_hieu } from '../src/ai/cap_so.ts';

test('khuon so theo loai', () => {
  assert.equal(dung_so_ky_hieu('thong_bao', 12, 2026, 'CTTHVN', 'NS'), '12/2026/TB-CTTHVN');
  assert.equal(dung_so_ky_hieu('quyet_dinh', 5, 2026, 'CTTHVN', 'NS'), '05/2026/QĐ-CTTHVN');
  assert.equal(dung_so_ky_hieu('cong_van', 7, 2026, 'CTTHVN', 'NS'), '07/2026/CTTHVN-NS');
});

test('C-11: so nho hon 10 phai co so 0 dang truoc', () => {
  assert.equal(dung_so_ky_hieu('thong_bao', 1, 2026, 'CTTHVN', 'NS'), '01/2026/TB-CTTHVN');
  assert.equal(dung_so_ky_hieu('quyet_dinh', 9, 2026, 'CTTHVN', 'NS'), '09/2026/QĐ-CTTHVN');
  assert.equal(kiem_tra_so_ky_hieu('thong_bao', '1/2026/TB-CTTHVN'), false, 'so 1 khong duoc phep');
  assert.ok(kiem_tra_so_ky_hieu('thong_bao', '01/2026/TB-CTTHVN'));
});

test('kiem tra khuon: chap nhan dung, tu choi sai', () => {
  assert.ok(kiem_tra_so_ky_hieu('thong_bao', '12/2026/TB-CTTHVN'));
  assert.ok(kiem_tra_so_ky_hieu('quyet_dinh', '12/2026/QĐ-CTTHVN'));
  assert.ok(kiem_tra_so_ky_hieu('cong_van', '12/2026/CTTHVN-NS'));

  // Cong van KHONG duoc chua "CV" (ND30: cong van khong in ten loai).
  assert.equal(kiem_tra_so_ky_hieu('cong_van', '12/2026/CTTHVN-CV'), false);
  assert.equal(kiem_tra_so_ky_hieu('cong_van', '12/CV-THVN'), false);

  // Thong bao/quyet dinh phai co ma loai va nam.
  assert.equal(kiem_tra_so_ky_hieu('thong_bao', '12/2026/CV-CTTHVN'), false);
  assert.equal(kiem_tra_so_ky_hieu('thong_bao', '12/2026/TB-CTTHVN/9'), false);
});
