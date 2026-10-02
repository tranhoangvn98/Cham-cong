// Kiem ham chon ngay nghi le cua mot ke hoach nghi theo nam:
//   - khong an dinh so ngay nghi -> nghi CA KHOANG (hanh vi cu),
//   - an dinh `so_ngay_nghi` -> chi nhung ngay dau khoang duoc nghi, phan con lai la ngay
//     lam viec binh thuong (vd dot 1/9–3/9 khai 2 -> nghi 1/9 va 2/9, 3/9 di lam).
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { ngay_nghi_cua_ke_hoach } = await import('../src/tuyen/nghi_le_luong.ts');

test('khong an dinh so ngay -> nghi ca khoang', () => {
  assert.deepEqual(
    ngay_nghi_cua_ke_hoach('2026-09-01', '2026-09-03', null),
    ['2026-09-01', '2026-09-02', '2026-09-03'],
  );
});

test('an dinh so ngay nghi -> chi lay nhung ngay dau khoang', () => {
  assert.deepEqual(
    ngay_nghi_cua_ke_hoach('2026-09-01', '2026-09-03', 2),
    ['2026-09-01', '2026-09-02'],
  );
});

test('an dinh so ngay nghi = do dai khoang -> nhu nghi ca khoang', () => {
  assert.deepEqual(
    ngay_nghi_cua_ke_hoach('2026-09-01', '2026-09-03', 3),
    ['2026-09-01', '2026-09-02', '2026-09-03'],
  );
});

test('khoang chi mot ngay', () => {
  assert.deepEqual(ngay_nghi_cua_ke_hoach('2026-09-02', '2026-09-02', null), ['2026-09-02']);
  assert.deepEqual(ngay_nghi_cua_ke_hoach('2026-09-02', '2026-09-02', 1), ['2026-09-02']);
});
