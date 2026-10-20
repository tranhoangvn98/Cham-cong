// Kiem helper thuan cua ung luong tu phuc vu (route /api/toi/ung-luong).
//
// Logic chinh cua route nam o SQL + guard; ham thuan duoc tach ra de kiem khong can CSDL.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('thang_khong_qua_khu: chi chan thang da qua, nhan thang hien tai va tuong lai', async () => {
  const { thang_khong_qua_khu } = await import('../src/tuyen/ung_luong_toi.ts');

  const hom_nay = '2026-10-20'; // thang hien tai 2026-10
  assert.equal(thang_khong_qua_khu('2026-09', hom_nay), false, 'thang truoc la qua khu');
  assert.equal(thang_khong_qua_khu('2025-12', hom_nay), false, 'thang cach xa la qua khu');
  assert.equal(thang_khong_qua_khu('2026-10', hom_nay), true, 'thang hien tai duoc phep');
  assert.equal(thang_khong_qua_khu('2026-11', hom_nay), true, 'thang sau duoc phep');
  assert.equal(thang_khong_qua_khu('2027-01', hom_nay), true, 'thang tuong lai duoc phep');
});
