// Kiem phan thuan cua goi MCP: dung URL, dich than phan hoi, danh sach cong cu.
//
// Khong can may chu Cham cong dang chay — khong goi mang ra ngoai.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { dung_url, dich_than, LoiApi } = await import('../src/goi_api.ts');
const { TEN_CONG_CU } = await import('../src/cong_cu.ts');

test('dung_url: noi duong dan va tham so truy van', () => {
  const u = dung_url('/api/v1/bang-cong', {
    tu: '2026-09-01', den: '2026-09-30', ma_nv: 'NV001', rong: '',
  });
  assert.ok(u.startsWith('http://127.0.0.1:8080/api/v1/bang-cong?'), u);
  assert.ok(u.includes('tu=2026-09-01'), u);
  assert.ok(u.includes('den=2026-09-30'), u);
  assert.ok(u.includes('ma_nv=NV001'), u);
  assert.ok(!u.includes('rong='), 'tham so rong phai bi bo');
});

test('dung_url: khong co tham so thi khong co dau hoi', () => {
  assert.equal(dung_url('/api/v1/toi'), 'http://127.0.0.1:8080/api/v1/toi');
});

test('dich_than: tra nguyen du lieu hop le', () => {
  const kq = dich_than<{ du_lieu: number[] }>({ du_lieu: [1, 2], phan_trang: { tong: 2 } });
  assert.deepEqual(kq.du_lieu, [1, 2]);
});

test('dich_than: than co { loi } thi nem LoiApi kem ma', () => {
  assert.throws(
    () => dich_than({ loi: { ma: 'thieu_khoa', thong_diep: 'Thiếu khóa API.' } }),
    (loi: unknown) => loi instanceof LoiApi
      && loi.ma_loi === 'thieu_khoa'
      && loi.message === 'Thiếu khóa API.',
  );
});

test('TEN_CONG_CU: du 15 cong cu, ten doc nhat va khong dau', () => {
  assert.equal(TEN_CONG_CU.length, 15);
  assert.equal(new Set(TEN_CONG_CU).size, TEN_CONG_CU.length);
  for (const ten of TEN_CONG_CU) {
    assert.match(ten, /^[a-z0-9_]+$/, ten);
  }
  // Nhung cong cu cot loi phai co mat — thieu la AI khong doc duoc phan he.
  for (const ten of ['lay_thong_tin_khoa', 'tim_nhan_vien', 'doc_bang_cong',
    'doc_don', 'doc_van_ban', 'doc_ky_luat', 'ghi_nhan_vi_pham']) {
    assert.ok(TEN_CONG_CU.includes(ten as never), `thieu cong cu ${ten}`);
  }
});
