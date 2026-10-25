// Kiem quy tac danh gia tai khoan Microsoft cua nguoi DA NGHI.
//
// Sai quy tac nay thi mot trong hai chieu deu nguy hiem: bao dong gia moi ngay (roi khong ai
// doc canh bao that), hoac bo sot mot tai khoan con dang nhap duoc cua nguoi da roi cong ty.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { loi_m365 } = await import('../src/nhan_su/quet_nghi_viec.ts');

test('tai khoan con mo -> loi m365_con_mo', () => {
  assert.deepEqual(
    loi_m365({ ton_tai: true, dang_mo: true, so_giay_phep: 0 }),
    ['m365_con_mo'],
  );
});

test('tai khoan da khoa nhung con giay phep -> loi m365_con_giay_phep', () => {
  assert.deepEqual(
    loi_m365({ ton_tai: true, dang_mo: false, so_giay_phep: 2 }),
    ['m365_con_giay_phep'],
  );
});

test('con mo VA con giay phep -> bao ca hai (cach sua khac nhau)', () => {
  assert.deepEqual(
    loi_m365({ ton_tai: true, dang_mo: true, so_giay_phep: 1 }),
    ['m365_con_mo', 'm365_con_giay_phep'],
  );
});

test('da khoa va het giay phep -> khong loi', () => {
  assert.deepEqual(loi_m365({ ton_tai: true, dang_mo: false, so_giay_phep: 0 }), []);
});

test('tai khoan da xoa han -> khong phai loi (xoa la cach dong chat hon khoa)', () => {
  assert.deepEqual(loi_m365({ ton_tai: false, dang_mo: false, so_giay_phep: 0 }), []);
});
