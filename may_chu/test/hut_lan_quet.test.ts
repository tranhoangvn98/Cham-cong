// Hut luot quet chua gan khi gan PIN may cho mot nguoi.
//
// Bai kiem nay sinh ra tu loi that: 6 nhan vien moi trong thang 10-11/2026 duoc enroll tren may
// TRUOC khi nhan su lap ho so, nen toan bo luot quet cua ho nam o trang thai "chua gan" va ho bi
// ghi VANG o moi ngay du ngay nao cung quet. Rieng Tran Thi My Duyen mat 9 luot, Le Tran Khanh An
// mat 6 luot, Nguyen Thien Trang mat 28 luot.
//
// Phan nguy hiem nhat cua buoc hut la GAN NHAM: hut qua tay thi tien luong cua nguoi da nghi roi
// vao tui nguoi khac. Bon bai dau kiem dung chan do.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { ke_hoach_hut } = await import('../src/dinh_danh/hut_lan_quet_thuan.ts');

const TOI_DA = 90;
const LUC_CHAY = new Date('2026-11-02T10:00:00Z');

function d(iso: string): Date {
  return new Date(iso);
}

test('nhan vien moi quet truoc khi lap ho so: hut dung cac luot con treo', () => {
  // My Duyen: quet 30/10 08:25 (gio VN), ho so lap 30/10 09:13. Ba luot cua ngay do nam lai.
  const kq = ke_hoach_hut(
    { hieu_luc_tu: d('2026-10-30T02:13:48Z'), nguoi_truoc_ket_thuc: null },
    [d('2026-10-30T01:25:28Z'), d('2026-10-30T01:25:31Z'), d('2026-10-30T02:30:00Z')],
    LUC_CHAY,
    TOI_DA,
  );
  assert.notEqual(kq, null);
  assert.deepEqual(kq?.moc_hut, d('2026-10-30T01:25:28Z'), 'moc hut la luot quet som nhat');
  assert.deepEqual(kq?.hieu_luc_tu_moi, d('2026-10-30T01:25:28Z'),
    'moc hieu luc phai lui ve luot quet dau tien');
});

test('khong co luot quet nao con treo thi khong lam gi', () => {
  assert.equal(
    ke_hoach_hut(
      { hieu_luc_tu: d('2026-10-30T02:13:48Z'), nguoi_truoc_ket_thuc: null },
      [],
      LUC_CHAY,
      TOI_DA,
    ),
    null,
  );
});

test('PIN doi chu: khong hut luot quet cua nguoi CU', () => {
  // PIN 39 doi tu nguoi cu sang nguoi moi luc 01/11. Con sot mot luot quet chua gan cua thang 9
  // (truoc khi nguoi cu roi di) — luot do KHONG duoc phep roi sang nguoi moi.
  const kq = ke_hoach_hut(
    {
      hieu_luc_tu: d('2026-11-01T00:00:00Z'),
      nguoi_truoc_ket_thuc: d('2026-11-01T00:00:00Z'),
    },
    [d('2026-09-15T02:00:00Z')],
    LUC_CHAY,
    TOI_DA,
  );
  assert.equal(kq, null, 'luot quet truoc moc ket thuc cua nguoi cu phai bi bo qua');
});

test('PIN doi chu: van hut luot quet SAU moc nguoi cu ket thuc', () => {
  const kq = ke_hoach_hut(
    {
      hieu_luc_tu: d('2026-11-01T00:00:00Z'),
      nguoi_truoc_ket_thuc: d('2026-11-01T00:00:00Z'),
    },
    [d('2026-09-15T02:00:00Z'), d('2026-11-01T01:00:00Z')],
    LUC_CHAY,
    TOI_DA,
  );
  assert.deepEqual(kq?.moc_hut, d('2026-11-01T01:00:00Z'));
});

test('PIN dung lai sau vai nam: chi nhin lai toi da so ngay cho phep', () => {
  // Nguoi giu PIN cu roi di nam 2024, khong co dong ma dinh danh nao dong lai (du lieu di tru).
  // Mot nguoi vao thang 11/2026 khong duoc hut luot quet nam 2024.
  const kq = ke_hoach_hut(
    { hieu_luc_tu: d('2026-11-02T09:00:00Z'), nguoi_truoc_ket_thuc: null },
    [d('2024-03-10T02:00:00Z')],
    LUC_CHAY,
    TOI_DA,
  );
  assert.equal(kq, null);
});

test('moc hieu luc da som hon luot quet thi giu nguyen, khong day ve tuong lai', () => {
  // Ho so duoc lap TRUOC khi may enroll (nhap truoc, may lap sau). Khong co gi phai sua.
  const kq = ke_hoach_hut(
    { hieu_luc_tu: d('2026-10-01T00:00:00Z'), nguoi_truoc_ket_thuc: null },
    [d('2026-10-28T01:00:00Z')],
    LUC_CHAY,
    TOI_DA,
  );
  assert.deepEqual(kq?.moc_hut, d('2026-10-28T01:00:00Z'));
  assert.equal(kq?.hieu_luc_tu_moi, null, 'moc cu som hon roi thi khong duoc doi');
});
