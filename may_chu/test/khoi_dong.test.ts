// May chu phai KHOI DONG duoc: tat ca tuyen dang ky ma khong trung duong dan.
//
// Ly do co bai nay: mot route trung (vd hai lan GET /api/toi/phieu-luong) chi bung ra khi Fastify
// rap cac tuyen luc `app.ready()` — tsc va test don vi KHONG thay, nen tung lot ra production lam
// may chu crash-loop. Bai nay goi dung `app.ready()` de bat som loi do (FST_ERR_DUPLICATED_ROUTE...).
// Khong can CSDL that: dang ky tuyen khong mo ket noi (pool lazy).
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('ung dung khoi dong duoc — moi tuyen dang ky khong trung', async () => {
  const { dung_ung_dung } = await import('../src/ung_dung.ts');
  const app = await dung_ung_dung();
  try {
    await app.ready();
  } finally {
    await app.close();
  }
  assert.ok(true);
});
