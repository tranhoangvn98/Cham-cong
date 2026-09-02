// Kiem rao chan tai lieu OpenAPI cua /api/v1.
//
// Rao chan that nam trong hook onRoute cua tuyen_tich_hop: route thieu mo ta thi may chu
// khong khoi dong. O day kiem chinh ham quyet dinh dieu do — no phai bat dung nhung thu
// thieu, va khong duoc bat oan route co khai `hide`.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { loi_thieu_mo_ta } = await import('../src/tuyen/tich_hop.ts');

const day_du = {
  method: 'GET',
  url: '/api/v1/vi-du',
  schema: {
    summary: 'Ví dụ', tags: ['NhanVien'], security: [{ khoaApi: [] }], operationId: 'viDu',
  },
};

test('route co du mo ta thi khong bao loi', () => {
  assert.equal(loi_thieu_mo_ta(day_du), null);
});

test('route KHONG co schema thi bao loi — day la loi hay gap nhat', () => {
  const loi = loi_thieu_mo_ta({ method: 'GET', url: '/api/v1/quen' });
  assert.notEqual(loi, null);
  assert.match(loi!, /summary/);
  assert.match(loi!, /tags/);
  assert.match(loi!, /security/);
  assert.match(loi!, /operationId/);
  // Loi phai chi ro duong dan nao, khong bat nguoi doc di mo tung file.
  assert.match(loi!, /\/api\/v1\/quen/);
});

test('thieu tung phan deu bi bat', () => {
  for (const bo of ['summary', 'tags', 'security', 'operationId'] as const) {
    const sc: Record<string, unknown> = { ...day_du.schema };
    delete sc[bo];
    const loi = loi_thieu_mo_ta({ ...day_du, schema: sc });
    assert.notEqual(loi, null, `thieu ${bo} phai bao loi`);
    assert.match(loi!, new RegExp(bo));
  }
});

test('summary rong hoac chi khoang trang cung tinh la thieu', () => {
  for (const s of ['', '   ']) {
    const loi = loi_thieu_mo_ta({ ...day_du, schema: { ...day_du.schema, summary: s } });
    assert.notEqual(loi, null, `summary ${JSON.stringify(s)} phai bao loi`);
  }
});

test('tags rong hoac security rong tinh la thieu', () => {
  assert.notEqual(loi_thieu_mo_ta({ ...day_du, schema: { ...day_du.schema, tags: [] } }), null);
  assert.notEqual(loi_thieu_mo_ta({ ...day_du, schema: { ...day_du.schema, security: [] } }), null);
});

test('operationId rong tinh la thieu — ten ham trong client sinh ra phu thuoc no', () => {
  const loi = loi_thieu_mo_ta({ ...day_du, schema: { ...day_du.schema, operationId: '  ' } });
  assert.notEqual(loi, null);
  assert.match(loi!, /operationId/);
});

test('hide: true duoc bo qua — duong noi bo khong phai hop dong', () => {
  assert.equal(loi_thieu_mo_ta({ method: 'GET', url: '/api/v1/openapi.json', schema: { hide: true } }), null);
});

test('loi neu ro cach sua', () => {
  const loi = loi_thieu_mo_ta({ method: 'POST', url: '/api/v1/moi' });
  assert.match(loi!, /mo_ta\(\)/, 'phai chi ra dung ham can dung');
  assert.match(loi!, /hide/, 'phai neu loi thoat cho duong noi bo');
});
