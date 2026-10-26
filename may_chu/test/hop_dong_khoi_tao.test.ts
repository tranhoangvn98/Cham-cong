// Loai hop dong khi tao ho so + ngay het han — ham THUAN, khong CSDL.
//
// VI SAO PHAI KHOA: ngay het han di vao hop_dong_lao_dong, roi vao nhac het han, tinh luong va
// quy trinh thoi viec. Sai mot ngay o cuoi thang / nam nhuan la sai giay to, khong co loi nao bao.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  LOAI_HOP_DONG_KHOI_TAO, kiem_hop_dong_khoi_tao, ngay_het_han, nhan_hop_dong,
} from '../src/nhan_su/hop_dong_khoi_tao.ts';

test('ma hop dong khop CHECK cua bang hop_dong_lao_dong', () => {
  assert.deepEqual([...LOAI_HOP_DONG_KHOI_TAO], [
    'hoc_viec', 'cong_tac_vien', 'thu_viec', 'xac_dinh', 'khong_xac_dinh',
  ]);
});

test('nhan hop dong: du loai + ki han, Outsource la cong tac vien', () => {
  assert.equal(nhan_hop_dong('hoc_viec', null), 'Học việc');
  assert.equal(nhan_hop_dong('cong_tac_vien', null), 'Outsource (cộng tác viên)');
  assert.equal(nhan_hop_dong('thu_viec', null), 'Thử việc');
  assert.equal(nhan_hop_dong('xac_dinh', 6), 'Chính thức 6 tháng');
  assert.equal(nhan_hop_dong('xac_dinh', 12), 'Chính thức 1 năm');
  assert.equal(nhan_hop_dong('khong_xac_dinh', null), 'Chính thức — không xác định kì hạn');
  assert.equal(nhan_hop_dong(null, null), null);
});

test('ngay het han: 6 thang / 1 nam lui 1 ngay', () => {
  assert.equal(ngay_het_han('2026-01-15', 'xac_dinh', 6), '2026-07-14');
  assert.equal(ngay_het_han('2026-01-15', 'xac_dinh', 12), '2027-01-14');
});

test('ngay het han: cuoi thang va nam nhuan khong bi tran', () => {
  // Thang dich khong co ngay 31 -> lay ngay cuoi thang (khong lui tiep).
  assert.equal(ngay_het_han('2026-08-31', 'xac_dinh', 6), '2027-02-28');
  assert.equal(ngay_het_han('2023-08-31', 'xac_dinh', 6), '2024-02-29');
  assert.equal(ngay_het_han('2026-05-31', 'xac_dinh', 6), '2026-11-30');
});

test('loai khong xac dinh han / thu viec / hoc viec: khong dat hieu_luc_den', () => {
  assert.equal(ngay_het_han('2026-05-31', 'khong_xac_dinh', null), null);
  assert.equal(ngay_het_han('2026-05-31', 'thu_viec', null), null);
  assert.equal(ngay_het_han('2026-05-31', 'hoc_viec', null), null);
  assert.equal(ngay_het_han('2026-05-31', 'cong_tac_vien', null), null);
});

test('hop dong chinh thuc bat buoc ki han 6 hoac 12 thang', () => {
  assert.throws(() => kiem_hop_dong_khoi_tao('xac_dinh', null), /6 tháng hoặc 1 năm/);
  assert.throws(() => kiem_hop_dong_khoi_tao('xac_dinh', 3), /6 tháng hoặc 1 năm/);
  assert.throws(() => ngay_het_han('2026-01-01', 'xac_dinh', null), /6 tháng hoặc 1 năm/);
  kiem_hop_dong_khoi_tao('xac_dinh', 6);
  kiem_hop_dong_khoi_tao('xac_dinh', 12);
  kiem_hop_dong_khoi_tao('thu_viec', null);
});
