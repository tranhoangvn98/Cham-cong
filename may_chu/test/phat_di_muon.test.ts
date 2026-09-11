// Kiem phat di muon bang so tinh tay. Day la cho tru tien nguoi lao dong nen moi con so
// mong doi deu dan giai duoc.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tinh_phat_di_muon, gio_sang_phut } from '../src/luong/phat_di_muon.ts';

// 08:00 vao chuan; 08:10 bat dau 50k; 08:30 bat dau nua ngay.
const CH = {
  bat: true,
  moc_50k_phut: 8 * 60 + 10, // 490
  moc_nua_ngay_phut: 8 * 60 + 30, // 510
  muc_50k: 50000,
  mien_moi_thang: 3,
};

test('tat cong tac -> khong phat gi', () => {
  const kq = tinh_phat_di_muon(
    [{ phut_trong_ngay: 9 * 60, co_don_truoc_han: false }],
    { ...CH, bat: false },
  );
  assert.deepEqual(kq, {
    so_lan_50k: 0, so_lan_50k_phat: 0, so_lan_nua_ngay: 0, so_lan_mien: 0, tien_50k: 0,
  });
});

test('vao truoc 08:10 -> khong phat', () => {
  const kq = tinh_phat_di_muon([
    { phut_trong_ngay: 8 * 60 + 0, co_don_truoc_han: false },  // 08:00
    { phut_trong_ngay: 8 * 60 + 9, co_don_truoc_han: false },  // 08:09
  ], CH);
  assert.equal(kq.so_lan_50k, 0);
  assert.equal(kq.so_lan_nua_ngay, 0);
});

test('08:10–08:29 -> tang 50k; 08:30 tro di -> tang nua ngay', () => {
  const kq = tinh_phat_di_muon([
    { phut_trong_ngay: 8 * 60 + 10, co_don_truoc_han: false }, // 08:10 -> 50k
    { phut_trong_ngay: 8 * 60 + 29, co_don_truoc_han: false }, // 08:29 -> 50k
    { phut_trong_ngay: 8 * 60 + 30, co_don_truoc_han: false }, // 08:30 -> nua ngay
    { phut_trong_ngay: 9 * 60 + 0, co_don_truoc_han: false },  // 09:00 -> nua ngay
  ], CH);
  assert.equal(kq.so_lan_50k, 2);
  assert.equal(kq.so_lan_nua_ngay, 2);
  assert.equal(kq.so_lan_50k_phat, 2); // khong don -> khong mien
  assert.equal(kq.tien_50k, 100000);
});

test('mien toi da 3 lan/thang cho tang 50k co don', () => {
  const ngay = [
    { phut_trong_ngay: 8 * 60 + 15, co_don_truoc_han: true },
    { phut_trong_ngay: 8 * 60 + 15, co_don_truoc_han: true },
    { phut_trong_ngay: 8 * 60 + 15, co_don_truoc_han: true },
    { phut_trong_ngay: 8 * 60 + 15, co_don_truoc_han: true },  // lan thu 4 co don van bi phat
    { phut_trong_ngay: 8 * 60 + 15, co_don_truoc_han: false }, // khong don -> phat
  ];
  const kq = tinh_phat_di_muon(ngay, CH);
  assert.equal(kq.so_lan_50k, 5);
  assert.equal(kq.so_lan_mien, 3);
  assert.equal(kq.so_lan_50k_phat, 2);
  assert.equal(kq.tien_50k, 100000);
});

test('don KHONG mien duoc tang nua ngay (>= 08:30)', () => {
  const kq = tinh_phat_di_muon([
    { phut_trong_ngay: 9 * 60, co_don_truoc_han: true }, // co don nhung 09:00 -> van tru nua ngay
  ], CH);
  assert.equal(kq.so_lan_nua_ngay, 1);
  assert.equal(kq.so_lan_mien, 0);
});

test('giai doan an han (yeu_cau_don_mien=false): mien 3 lan/thang KHONG can don', () => {
  const ngay = [
    { phut_trong_ngay: 8 * 60 + 15, co_don_truoc_han: false },
    { phut_trong_ngay: 8 * 60 + 15, co_don_truoc_han: false },
    { phut_trong_ngay: 8 * 60 + 15, co_don_truoc_han: false },
  ];
  const kq = tinh_phat_di_muon(ngay, { ...CH, yeu_cau_don_mien: false });
  assert.equal(kq.so_lan_50k, 3);
  assert.equal(kq.so_lan_mien, 3);
  assert.equal(kq.so_lan_50k_phat, 0);
  assert.equal(kq.tien_50k, 0);
});

test('an han: qua 3 lan/thang thi tu lan thu 4 van phat du khong don', () => {
  const ngay = [
    { phut_trong_ngay: 8 * 60 + 15, co_don_truoc_han: false },
    { phut_trong_ngay: 8 * 60 + 15, co_don_truoc_han: false },
    { phut_trong_ngay: 8 * 60 + 15, co_don_truoc_han: false },
    { phut_trong_ngay: 8 * 60 + 15, co_don_truoc_han: false },
  ];
  const kq = tinh_phat_di_muon(ngay, { ...CH, yeu_cau_don_mien: false });
  assert.equal(kq.so_lan_mien, 3);
  assert.equal(kq.so_lan_50k_phat, 1);
  assert.equal(kq.tien_50k, 50000);
});

test('an han KHONG mien duoc tang nua ngay (>= 08:30)', () => {
  const kq = tinh_phat_di_muon([
    { phut_trong_ngay: 9 * 60, co_don_truoc_han: false },
  ], { ...CH, yeu_cau_don_mien: false });
  assert.equal(kq.so_lan_nua_ngay, 1);
  assert.equal(kq.so_lan_mien, 0);
});

test('bat buoc don (yeu_cau_don_mien=true): khong don -> khong mien', () => {
  const kq = tinh_phat_di_muon([
    { phut_trong_ngay: 8 * 60 + 15, co_don_truoc_han: false },
  ], { ...CH, yeu_cau_don_mien: true });
  assert.equal(kq.so_lan_mien, 0);
  assert.equal(kq.so_lan_50k_phat, 1);
});

test('moc phat RIENG (ERP100): 08:40 moi phat 50k, 09:00 moi tru nua ngay', () => {
  const ch_erp100 = { ...CH, moc_50k_phut: 8 * 60 + 40, moc_nua_ngay_phut: 9 * 60 };
  const kq = tinh_phat_di_muon([
    { phut_trong_ngay: 8 * 60 + 20, co_don_truoc_han: false }, // 08:20 -> khong phat (< 08:40)
    { phut_trong_ngay: 8 * 60 + 45, co_don_truoc_han: false }, // 08:45 -> tang 50k
    { phut_trong_ngay: 9 * 60 + 5, co_don_truoc_han: false },  // 09:05 -> nua ngay
  ], ch_erp100);
  assert.equal(kq.so_lan_50k, 1);
  assert.equal(kq.so_lan_nua_ngay, 1);
  assert.equal(kq.so_lan_50k_phat, 1);
});

test('gio_sang_phut doc chuoi PG', () => {
  assert.equal(gio_sang_phut('08:10:00'), 490);
  assert.equal(gio_sang_phut('08:30'), 510);
  assert.equal(gio_sang_phut('07:30:00'), 450);
  assert.equal(gio_sang_phut('bậy'), 0);
});
