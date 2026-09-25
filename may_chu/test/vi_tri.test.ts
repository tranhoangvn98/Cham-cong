// Vi tri nhan vien (7 bac) — kiem quy tac PHAN QUYEN tu dong khi tao tai khoan he thong.
// Sai quy tac o day = sai quyen tai khoan cua nguoi moi, nen khoa bang test.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  CAC_VI_TRI, MA_VI_TRI, vai_tro_theo_vi_tri, sinh_ten_dang_nhap, ten_vi_tri,
} = await import('../src/nhan_su/vi_tri.ts');

test('vai tro: tong giam doc / giam doc nhan nhan_su', () => {
  assert.equal(vai_tro_theo_vi_tri('tong_giam_doc'), 'nhan_su');
  assert.equal(vai_tro_theo_vi_tri('giam_doc'), 'nhan_su');
});

test('vai tro: truong phong nhan truong_phong, cac bac con lai nhan nhan_vien', () => {
  assert.equal(vai_tro_theo_vi_tri('truong_phong'), 'truong_phong');
  for (const ma of ['truong_nhom', 'nhan_vien', 'thu_viec', 'hoc_viec']) {
    assert.equal(vai_tro_theo_vi_tri(ma), 'nhan_vien');
  }
  // Chua chon vi tri thi an toan mac dinh nhan_vien, khong tu nang quyen.
  assert.equal(vai_tro_theo_vi_tri(null), 'nhan_vien');
});

test('du 7 bac vi tri, ma khong trung va dung tap kiem dau vao', () => {
  assert.equal(CAC_VI_TRI.length, 7);
  assert.equal(new Set(CAC_VI_TRI.map((v) => v.ma)).size, 7);
  assert.deepEqual(MA_VI_TRI, CAC_VI_TRI.map((v) => v.ma));
  assert.equal(ten_vi_tri('truong_phong'), 'Trưởng phòng');
  assert.equal(ten_vi_tri(null), '');
});

test('ten dang nhap goi y: ha ve chu thuong va chi giu ky tu hop le', () => {
  assert.equal(sinh_ten_dang_nhap('NVTU-1'), 'nvtu-1');
  assert.equal(sinh_ten_dang_nhap('ERP Đỗ Minh'), 'erpminh');
  assert.equal(sinh_ten_dang_nhap('a.b_c-d'), 'a.b_c-d');
});
