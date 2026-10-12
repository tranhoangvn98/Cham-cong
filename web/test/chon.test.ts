// Kiem tra bo chon tha xuong dung chung: khi phia duoi khong du cho thi bang phai mo LEN.
// Tien le loi giao dien 12/10/2026: droplist "so dong moi trang" o day bang luong chi tiet
// mo xuong bi lech het ra ngoai khung cuon — bam thay khong co gi xay ra.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  cao_bang_chon, phai_mo_len, CAO_MUC_CHON, PAD_DANH_SACH, CAO_O_TIM, LE_BANG,
} from '../src/chon_tien_ich.ts';

test('cao bang: 3 tuy chon (phan trang) = padding + 3 muc, khong o tim', () => {
  assert.equal(cao_bang_chon(3, false), PAD_DANH_SACH + 3 * CAO_MUC_CHON);
});

test('cao bang: du 5 tuy chon tro len thi chan o 5 muc va co them o tim', () => {
  assert.equal(cao_bang_chon(7, true), PAD_DANH_SACH + 5 * CAO_MUC_CHON + CAO_O_TIM);
  // co_tim phai khop viec co o tim that (>= 5 tuy chon) — goi sai co (false) thi khong cong.
  assert.equal(cao_bang_chon(7, false), PAD_DANH_SACH + 5 * CAO_MUC_CHON);
});

test('khong bao gio tinh cao cho 0 muc (danh sach rong van hien khung chua dong "khong co")', () => {
  assert.equal(cao_bang_chon(0, false), PAD_DANH_SACH + 1 * CAO_MUC_CHON);
});

test('mo len khi o gan day khung: day o + le + bang vuot qua canh duoi', () => {
  // O chon day 690, khung nhin cao 711: bang 116 cao, le 4 -> 690 + 4 + 116 = 810 > 711.
  assert.equal(phai_mo_len(690, 711, cao_bang_chon(3, false)), true);
});

test('mo xuong khi phia duoi con du cho', () => {
  // O chon day 500, khung nhin cao 711: 500 + 4 + 116 = 620 < 711.
  assert.equal(phai_mo_len(500, 711, cao_bang_chon(3, false)), false);
});

test('vua khit canh duoi (bang nhau) van mo xuong — khong bi cat', () => {
  const cao = cao_bang_chon(3, false);
  const day = 711 - LE_BANG - cao;
  assert.equal(phai_mo_len(day, 711, cao), false);
  // Them 1px nua la phai mo len.
  assert.equal(phai_mo_len(day + 1, 711, cao), true);
});
