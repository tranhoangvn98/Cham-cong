// Cap lai ma nhan su: kiem phan THUAN (khuon ma, ngay dung de sinh ma, ma du kien).
//
// Phan ghi CSDL (dong ma cu lai, cap so moi, doi cot `ma_nv`) nam trong transaction nen chi kiem
// duoc voi CSDL that — xem `tao_ho_so_e2e.test.ts`.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  la_ma_theo_khuon, ma_du_kien, ngay_de_sinh_ma,
} from '../src/dinh_danh/cap_lai_ma.ts';

test('la_ma_theo_khuon: nhan ma sinh tu dong, tu choi ma kieu cu', () => {
  for (const ma of ['NVKHN05260001', 'NVVP10260007', 'NVKTQ01270042']) {
    assert.equal(la_ma_theo_khuon(ma), true, `phai nhan: ${ma}`);
  }
  // Chuan hoa chu HOA truoc khi so — du lieu cu co the luu chu thuong.
  assert.equal(la_ma_theo_khuon('nvkhn05260001'), true);
  assert.equal(la_ma_theo_khuon('  NVKHN05260001  '), true);

  for (const ma of ['NV0156', 'ERP69', 'TAM14', 'BGD', 'NV001', 'NVKHN0526', '', 'NV05260001']) {
    assert.equal(la_ma_theo_khuon(ma), false, `khong duoc nhan: "${ma}"`);
  }
});

test('ngay_de_sinh_ma: uu tien ngay vao lam', () => {
  assert.equal(ngay_de_sinh_ma('2026-05-20', new Date('2020-01-01T00:00:00Z')), '2026-05-20');
  // Ngay vao lam sai dang thi roi xuong moc tiep theo, khong nem loi: ho so cu co the co
  // gia tri rac, va "khong cap lai duoc ma" khong phai cau tra loi huu ich.
  assert.equal(ngay_de_sinh_ma('20/05/2026', null, new Date('2026-03-10T03:00:00Z')), '2026-03-10');
});

test('ngay_de_sinh_ma: thieu ngay vao lam thi lay ngay tao ho so', () => {
  // 18:00 UTC ngay 31/05 la 01/06 gio may cham cong (offset 7) — phai ra thang 6.
  assert.equal(ngay_de_sinh_ma(null, new Date('2026-05-31T18:00:00Z')), '2026-06-01');
  // Chuoi ISO cung nhan (pg tra Date, nhung cho goi khac co the tra chuoi).
  assert.equal(ngay_de_sinh_ma('', '2026-05-31T18:00:00Z'), '2026-06-01');
});

test('ngay_de_sinh_ma: khong co gi thi lay hom nay theo gio may cham cong', () => {
  assert.equal(ngay_de_sinh_ma(null, null, new Date('2026-10-25T18:00:00Z')), '2026-10-26');
  assert.equal(ngay_de_sinh_ma(null, null, new Date('2026-10-25T16:00:00Z')), '2026-10-25');
});

test('ma_du_kien: ghep tien to + ma ngan khoi + thang, so thu tu de ####', () => {
  assert.equal(ma_du_kien('KHN', '2026-05-20'), 'NVKHN0526####');
  assert.equal(ma_du_kien('khn', '2026-05-20'), 'NVKHN0526####');
  assert.equal(ma_du_kien(' khn ', '2026-12-01'), 'NVKHN1226####');
  // Khoi chua khai ma ngan thi khong bia ra ma — giao dien hien "chua gan khoi".
  assert.equal(ma_du_kien(null, '2026-05-20'), '');
  assert.equal(ma_du_kien('', '2026-05-20'), '');
});
