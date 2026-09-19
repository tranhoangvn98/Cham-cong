// Chan dang nhap + rut giay phep Microsoft 365 khi nghi viec — kiem phan THUAN.
//
// Payload Graph duoc tach thanh ham thuan `dung_than_*` de kiem duoc ma khong can goi
// Graph that: sai khuon payload la sai hop dong voi Microsoft, va no chi bi phat hien
// khi ai do nhin thay mot tai khoan da nghi van dang nhap duoc — qua muon. Nen khuon
// payload duoc khoa bang test.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { dung_than_chan_dang_nhap, dung_than_rut_giay_phep } =
  await import('../src/nhan_su/ms365.ts');

test('chan dang nhap: accountEnabled phai la false', () => {
  assert.deepEqual(dung_than_chan_dang_nhap(), { accountEnabled: false });
});

test('rut giay phep: addLicenses rong, removeLicenses la danh sach sku dang gan', () => {
  const than = dung_than_rut_giay_phep(['sku-e3', 'sku-f3']);
  assert.deepEqual(than, { addLicenses: [], removeLicenses: ['sku-e3', 'sku-f3'] });
});

test('rut giay phep: khong con giay phep nao thi danh sach rut rong', () => {
  assert.deepEqual(dung_than_rut_giay_phep([]), { addLicenses: [], removeLicenses: [] });
});
