// Job bo sung ma dinh danh tu cot cu — phan QUYET DINH phai kiem duoc tung ca.
//
// Su co 28/10/2026: bang ma dinh danh thieu ma cua nguoi DA co email/PIN o cot cu, nen trang
// "Ma o cac he thong" hien "Chua co ma" du du lieu van con. Job nay chep cot cu sang bang ma;
// sai o day nghia la gan ma cua nguoi nay cho nguoi khac, nen cac ca bien deu phai co bai kiem.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ke_hoach_bo_sung, type MaDangHieuLuc, type NguoiCoCotCu } from '../src/dinh_danh/bo_sung_ma.ts';

const nguoi = (p: Partial<NguoiCoCotCu> & { id: string; ma_nv: string }): NguoiCoCotCu => ({
  ho_ten: p.ma_nv, email: null, pin_may: null, ...p,
});

test('cot cu co ma ma bang ma trong thi bo sung', () => {
  const kq = ke_hoach_bo_sung(
    [nguoi({ id: 'a', ma_nv: 'NVVP1', email: 'a@congty.vn', pin_may: '33' })],
    [],
  );
  assert.deepEqual(kq.viec.map((v) => `${v.he_thong}=${v.ma}`).sort(),
    ['may_cham_cong=33', 'microsoft_email=a@congty.vn']);
  assert.deepEqual(kq.xung_dot, []);
});

test('da co ma trong bang thi khong bo sung lai (email khac chu hoa/thuong)', () => {
  const ma: MaDangHieuLuc[] = [
    { nhan_vien_id: 'a', he_thong: 'microsoft_email', ma: 'a@congty.vn', ma_nv: 'NVVP1' },
    { nhan_vien_id: 'a', he_thong: 'may_cham_cong', ma: '33', ma_nv: 'NVVP1' },
  ];
  const kq = ke_hoach_bo_sung(
    [nguoi({ id: 'a', ma_nv: 'NVVP1', email: 'A@CongTy.VN ', pin_may: ' 33 ' })],
    ma,
  );
  assert.deepEqual(kq.viec, []);
});

test('ma dang thuoc NGUOI KHAC thi khong tu lay — bao xung dot', () => {
  const ma: MaDangHieuLuc[] = [
    { nhan_vien_id: 'b', he_thong: 'may_cham_cong', ma: '33', ma_nv: 'NVVP2' },
  ];
  const kq = ke_hoach_bo_sung([nguoi({ id: 'a', ma_nv: 'NVVP1', pin_may: '33' })], ma);
  assert.deepEqual(kq.viec, []);
  assert.equal(kq.xung_dot.length, 1);
  assert.equal(kq.xung_dot[0]?.thuoc_ve, 'NVVP2');
});

test('cot cu rong thi khong sinh viec', () => {
  const kq = ke_hoach_bo_sung(
    [nguoi({ id: 'a', ma_nv: 'NVVP1', email: '   ', pin_may: null })],
    [],
  );
  assert.deepEqual(kq.viec, []);
});

test('ket qua on dinh theo ma nhan vien (chay lai khong loan thu tu)', () => {
  const kq = ke_hoach_bo_sung(
    [
      nguoi({ id: 'b', ma_nv: 'NVVP2', email: 'b@congty.vn' }),
      nguoi({ id: 'a', ma_nv: 'NVVP1', email: 'a@congty.vn' }),
    ],
    [],
  );
  assert.deepEqual(kq.viec.map((v) => v.ma_nv), ['NVVP1', 'NVVP2']);
});
