// Ma nhan su noi bo: khuon NV + ma ngan khoi + MMYY + so thu tu (NVKHN05260001).
//
// Phan THUAN duoc khoa o day: khuon ma, phan thang-nam, va cach noi ba phan lai. Phan dem so
// thu tu nam trong transaction nen chi kiem duoc voi CSDL that (xem `ma_nhan_su_e2e.test.ts`).
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  KHUON_MA_NHAN_SU, TIEN_TO_MA_NHAN_SU, dung_ma_nhan_su, thang_trong_ma,
} from '../src/dinh_danh/ma_nhan_su.ts';

test('ma nhan su: ghep dung khuon NV + khoi + MMYY + so thu tu', () => {
  assert.equal(TIEN_TO_MA_NHAN_SU, 'NV');
  // Vi du chot voi chu cong ty: nhan vien kho Ha Noi vao thang 5/2026, nguoi thu 1.
  assert.equal(dung_ma_nhan_su('KHN', '0526', 1), 'NVKHN05260001');
  assert.equal(dung_ma_nhan_su('VP', '1026', 7), 'NVVP10260007');
  assert.equal(dung_ma_nhan_su('KTQ', '0127', 42), 'NVKTQ01270042');
});

test('ma nhan su: so thu tu qua 4 chu so KHONG bi cat (cat la mat tinh duy nhat)', () => {
  assert.equal(dung_ma_nhan_su('KHN', '0526', 10000), 'NVKHN052610000');
  assert.equal(dung_ma_nhan_su('KHN', '0526', 123456), 'NVKHN0526123456');
});

test('ma nhan su: khuon doc lai dung ba phan', () => {
  const m = KHUON_MA_NHAN_SU.exec('NVKHN05260001');
  assert.ok(m);
  assert.equal(m[1], 'KHN', 'ma ngan khoi');
  assert.equal(m[2], '0526', 'thang nam');
  assert.equal(Number(m[3]), 1, 'so thu tu');

  // Ma cu tren production khong theo khuon nay — khong duoc nhan nham.
  for (const ma_cu of ['NV0156', 'ERP69', 'TAM14', 'BGD', 'NV001', 'NVKHN0526']) {
    assert.equal(KHUON_MA_NHAN_SU.test(ma_cu), false, `khong duoc khop: ${ma_cu}`);
  }
});

test('thang trong ma: lay tu ngay vao lam, ding dang YYYY-MM-DD', () => {
  assert.equal(thang_trong_ma('2026-05-20'), '0526');
  assert.equal(thang_trong_ma('2026-12-01'), '1226');
  assert.equal(thang_trong_ma('2027-01-31'), '0127');
});

test('thang trong ma: khong co ngay vao lam thi lay HOM NAY theo gio may cham cong', () => {
  // 18:00 UTC ngay 25/10 la 01:00 ngay 26/10 gio Viet Nam (offset 7) — phai ra thang 10.
  assert.equal(thang_trong_ma(null, new Date('2026-10-25T18:00:00Z')), '1026');
  // 31/05 18:00 UTC = 01/06 gio Viet Nam — sang thang 6, khong duoc lay thang 5 cua may chu.
  assert.equal(thang_trong_ma(null, new Date('2026-05-31T18:00:00Z')), '0626');
  assert.equal(thang_trong_ma('', new Date('2026-03-10T03:00:00Z')), '0326');
});

test('thang trong ma: ngay sai dang bi tu choi ro rang', () => {
  assert.throws(() => thang_trong_ma('20/05/2026'), /YYYY-MM-DD/);
  assert.throws(() => thang_trong_ma('2026-5-20'), /YYYY-MM-DD/);
});
