// Kiem thu cac ham thuan tuy cua LAP LENH CHI (bo dau ten + dien giai chuyen khoan).
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env['JWT_SECRET'] ??= 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['DATABASE_URL'] ??= 'postgres://khong_dung@localhost:5432/khong_dung';

const { ten_khong_dau, dien_giai_luong } = await import('../src/luong/lenh_chi.ts');

// ================================================================ ten_khong_dau
test('ten_khong_dau: bo dau, doi đ -> d, in hoa', () => {
  assert.equal(ten_khong_dau('Lê Thùy Linh'), 'LE THUY LINH');
  assert.equal(ten_khong_dau('Đặng Thành Đạt'), 'DANG THANH DAT');
  assert.equal(ten_khong_dau('Nguyễn Thị Hiền'), 'NGUYEN THI HIEN');
});

test('ten_khong_dau: gom khoang trang thua, cat dau/cuoi', () => {
  assert.equal(ten_khong_dau('  Hoàng   Minh  Ngọc '), 'HOANG MINH NGOC');
});

test('ten_khong_dau: giu nguyen ASCII san co', () => {
  assert.equal(ten_khong_dau('ERP106'), 'ERP106');
});

// ================================================================ dien_giai_luong
test('dien_giai_luong: YYYY-MM -> Luong TMM-YYYY', () => {
  assert.equal(dien_giai_luong('2026-08'), 'Luong T08-2026');
  assert.equal(dien_giai_luong('2026-12'), 'Luong T12-2026');
});
