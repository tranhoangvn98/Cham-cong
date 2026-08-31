// Kiem phan thuan tuy cua khoa API: sinh khoa, bam, kiem pham vi.
//
// Phan chan quyen chay tren HTTP nam o e2e.test.ts — o day chi lo phan khong can CSDL.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { PHAM_VI, bam_khoa, la_pham_vi, sinh_khoa } =
  await import('../src/bao_mat/khoa_api.ts');

test('sinh_khoa: khoa co tien to nhan biet duoc va du dai', () => {
  const { khoa, tien_to } = sinh_khoa();
  assert.ok(khoa.startsWith('ck_'), `khoa phai bat dau bang ck_, nhan duoc: ${khoa}`);
  // 32 byte base64url ~ 43 ky tu, cong tien to.
  assert.ok(khoa.length >= 40, `khoa qua ngan: ${khoa.length} ky tu`);
  assert.equal(tien_to, khoa.slice(0, 11));
  assert.ok(tien_to.length < khoa.length, 'tien to khong duoc la ca khoa');
});

test('sinh_khoa: hai lan goi khong bao gio ra trung nhau', () => {
  const tap = new Set<string>();
  for (let i = 0; i < 500; i++) tap.add(sinh_khoa().khoa);
  assert.equal(tap.size, 500);
});

test('bam_khoa: cung khoa ra cung ma bam, khac khoa ra khac', () => {
  const a = sinh_khoa().khoa;
  const b = sinh_khoa().khoa;
  assert.equal(bam_khoa(a), bam_khoa(a));
  assert.notEqual(bam_khoa(a), bam_khoa(b));
});

test('bam_khoa: ma bam KHONG chua khoa goc', () => {
  const { khoa, ma_bam } = sinh_khoa();
  // Lo ra du mot phan khoa trong ma bam la mat toan bo y nghia cua viec bam.
  assert.ok(!ma_bam.includes(khoa.slice(3, 20)), 'ma bam lo mot phan khoa goc');
  assert.match(ma_bam, /^[0-9a-f]{64}$/, 'ma bam phai la SHA-256 dang hex');
});

test('sinh_khoa: ma bam tra ve khop voi bam cua chinh khoa do', () => {
  const { khoa, ma_bam } = sinh_khoa();
  assert.equal(ma_bam, bam_khoa(khoa));
});

test('la_pham_vi: chap nhan pham vi hop le, tu choi pham vi bia', () => {
  for (const p of PHAM_VI) assert.equal(la_pham_vi(p), true, p);
  for (const p of ['', 'admin', 'nhan_vien', 'nhan_vien:xoa', 'bang_cong:ghi', '*']) {
    assert.equal(la_pham_vi(p), false, `khong duoc chap nhan "${p}"`);
  }
});

test('PHAM_VI: khong co pham vi ghi cho bang cong va lan quet', () => {
  // Bang cong va lan quet la ban ghi goc de tinh luong. Cho he thong ngoai ghi de vao day
  // la mo duong sua so cham cong tu ben ngoai ma khong qua duyet — co y KHONG co.
  for (const p of PHAM_VI) {
    if (p.startsWith('bang_cong') || p.startsWith('lan_quet')) {
      assert.ok(p.endsWith(':doc'), `${p} phai la chi-doc`);
    }
  }
});
