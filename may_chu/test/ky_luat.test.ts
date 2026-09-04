// Kiem phan THUAN cua xu ly ky luat: gom theo muc do + quyet hinh thuc. Khong CSDL.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// `ky_luat/xu_ly.ts` nap `cau_hinh.ts` (chain) -> phai dat bien moi truong TRUOC khi import dong.
process.env['JWT_SECRET'] ??= 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['DATABASE_URL'] ??= 'postgres://khong_dung@localhost:5432/khong_dung';
process.env['DEVICE_TZ_OFFSET_HOURS'] ??= '7';

import type { DongViPham } from '../src/ky_luat/xu_ly.ts';
const { gom_theo_muc_do, quyet_hinh_thuc } = await import('../src/ky_luat/xu_ly.ts');

function vp(
  nhan_vien_id: string, muc_do: DongViPham['muc_do'], ma: string, tien: number, id = `${ma}-${nhan_vien_id}`,
): DongViPham {
  return { vi_pham_id: id, nhan_vien_id, muc_do, loai_ma: ma, loai_ten: `Loại ${ma}`, muc_tru_tien: tien };
}

// ---------------------------------------------------------------- gom_theo_muc_do

test('gom: cung nguoi cung muc do -> mot ho so, cong tien va dem so vi pham', () => {
  const r = gom_theo_muc_do([
    vp('A', 'nhe', 'NQ-A01', 50000, 'x1'),
    vp('A', 'nhe', 'NQ-A04', 30000, 'x2'),
  ]);
  assert.equal(r.length, 1);
  assert.equal(r[0]!.nhan_vien_id, 'A');
  assert.equal(r[0]!.muc_do, 'nhe');
  assert.equal(r[0]!.so_vi_pham, 2);
  assert.equal(r[0]!.tong_tien, 80000);
  assert.equal(r[0]!.chi_tiet.length, 2);
});

test('gom: cung nguoi khac muc do -> hai ho so rieng (ky luat 1 lan theo tung muc do)', () => {
  const r = gom_theo_muc_do([
    vp('A', 'nhe', 'NQ-A01', 50000),
    vp('A', 'nang', 'NQ-C18', 500000),
  ]);
  assert.equal(r.length, 2);
  // Sap theo thu tu muc do tang dan trong cung mot nguoi.
  assert.equal(r[0]!.muc_do, 'nhe');
  assert.equal(r[1]!.muc_do, 'nang');
});

test('gom: nhieu nguoi -> moi nguoi ho so rieng', () => {
  const r = gom_theo_muc_do([
    vp('A', 'nhe', 'NQ-A01', 50000),
    vp('B', 'nhe', 'NQ-A01', 50000),
  ]);
  assert.equal(r.length, 2);
  assert.deepEqual(new Set(r.map((x) => x.nhan_vien_id)), new Set(['A', 'B']));
});

test('gom: tong_tien = 0 khi chua khai muc tru tien', () => {
  const r = gom_theo_muc_do([vp('A', 'nhe', 'NQ-A01', 0)]);
  assert.equal(r[0]!.tong_tien, 0);
});

test('gom: rong -> rong', () => {
  assert.deepEqual(gom_theo_muc_do([]), []);
});

// ---------------------------------------------------------------- quyet_hinh_thuc

test('quyet: tong 0 -> nhac nho, khong can duyet', () => {
  const r = quyet_hinh_thuc(0, 2_000_000);
  assert.equal(r.hinh_thuc, 'nhac_nho');
  assert.equal(r.can_duyet, false);
});

test('quyet: duoi nguong -> giam thuong, tu ap (khong can duyet)', () => {
  const r = quyet_hinh_thuc(500_000, 2_000_000);
  assert.equal(r.hinh_thuc, 'giam_thuong');
  assert.equal(r.can_duyet, false);
});

test('quyet: bang nguong -> giam thuong, can duyet (>= nguong)', () => {
  const r = quyet_hinh_thuc(2_000_000, 2_000_000);
  assert.equal(r.hinh_thuc, 'giam_thuong');
  assert.equal(r.can_duyet, true);
});

test('quyet: tren nguong -> can duyet', () => {
  assert.equal(quyet_hinh_thuc(3_000_000, 2_000_000).can_duyet, true);
});

test('quyet: nguong 0 -> moi khoan giam thuong deu phai duyet', () => {
  const r = quyet_hinh_thuc(1000, 0);
  assert.equal(r.hinh_thuc, 'giam_thuong');
  assert.equal(r.can_duyet, true);
});
