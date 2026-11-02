// Kiem tach phut OT theo LOAI NGAY (thuong / Chu nhat / le) — sai o day la sai tien OT.
//
// Quy tac (chu cong ty chot): le theo lich cua nguoi do > Chu nhat > ngay thuong (ke ca
// thu Bay lam viec). Le trung Chu nhat tinh vao le.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { tach_phut_ot } = await import('../src/luong/tach_phut_ot.ts');

// 06/09/2026 la Chu nhat, 07/09 la thu Hai, 05/09 la thu Bay (2026-01-01 la thu Nam).
const CN = '2026-09-06';
const T7 = '2026-09-05';
const T2 = '2026-09-07';

test('tach phut OT: ngay le THANG Chu nhat trung le', () => {
  const kq = tach_phut_ot([{ ngay: CN, phut_ot: 60 }], new Set([CN]));
  assert.deepEqual(kq, { thuong: 0, nghi_tuan: 0, le: 60 });
});

test('tach phut OT: Chu nhat khong phai le -> nghi tuan', () => {
  const kq = tach_phut_ot([{ ngay: CN, phut_ot: 45 }], new Set([]));
  assert.deepEqual(kq, { thuong: 0, nghi_tuan: 45, le: 0 });
});

test('tach phut OT: thu Bay lam viec la ngay THUONG, khong phai nghi tuan', () => {
  const kq = tach_phut_ot([{ ngay: T7, phut_ot: 30 }], new Set([]));
  assert.deepEqual(kq, { thuong: 30, nghi_tuan: 0, le: 0 });
});

test('tach phut OT: ngay thuong tinh vao phan thuong', () => {
  const kq = tach_phut_ot([{ ngay: T2, phut_ot: 90 }], new Set([]));
  assert.deepEqual(kq, { thuong: 90, nghi_tuan: 0, le: 0 });
});

test('tach phut OT: gop nhieu ngay, le theo dung lich cua nguoi do', () => {
  const kq = tach_phut_ot([
    { ngay: T2, phut_ot: 90 },
    { ngay: CN, phut_ot: 60 },
    { ngay: '2026-09-02', phut_ot: 120 },
  ], new Set(['2026-09-02']));
  assert.deepEqual(kq, { thuong: 90, nghi_tuan: 60, le: 120 });
});

test('tach phut OT: danh sach rong -> tat ca ve 0', () => {
  assert.deepEqual(tach_phut_ot([], new Set(['2026-09-02'])), { thuong: 0, nghi_tuan: 0, le: 0 });
});

// ============================================================ OT cua nguoi MIEN CHAM CONG
// Loi 02/11/2026: nguoi mien cham cong khong quet may -> ket qua 'vang' -> `tinh_cong.ts` xoa
// dong, xoa luon `phut_ot` — OT da duyet khong bao gio vao luong. Nay co OT thi GIU dong.
const { giu_ot_ngay_mien_cham_cong } = await import('../src/cong/quy_tac_tinh_cong.ts');

test('mien cham cong + co OT da duyet -> giu dong de OT vao luong', () => {
  assert.equal(giu_ot_ngay_mien_cham_cong(true, 240), true);
});

test('mien cham cong + khong co OT -> van bo dong vang rac', () => {
  assert.equal(giu_ot_ngay_mien_cham_cong(true, 0), false);
});

test('khong mien cham cong -> khong ap dung (dong vang ghi binh thuong)', () => {
  assert.equal(giu_ot_ngay_mien_cham_cong(false, 240), false);
});
