// Kiem quy tac quy phep nam (Dieu 113-114 BLLD): chia theo thang lam + phan bo vuot quy.
//
// Moi con so mong doi deu giai duoc bang tay (ghi trong chu thich), vi sai o day la NGAY CONG
// va TIEN LUONG that cua nguoi that.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { so_thang_lam_trong_nam, quy_phep_theo_luat, phan_bo_phep } =
  await import('../src/don_tu/quy_phep_nam.ts');

test('so_thang_lam_trong_nam: lam ca nam = 12', () => {
  assert.equal(so_thang_lam_trong_nam('2020-01-01', null, 2026), 12);
});

test('so_thang_lam_trong_nam: khong ro ngay vao -> coi ca nam', () => {
  assert.equal(so_thang_lam_trong_nam(null, null, 2026), 12);
});

test('so_thang_lam_trong_nam: vao 05/10 -> T10 (27 ngay >=50%), T11, T12 = 3 thang', () => {
  assert.equal(so_thang_lam_trong_nam('2026-10-05', null, 2026), 3);
});

test('so_thang_lam_trong_nam: vao 20/10 -> T10 chi 12 ngay (<50%) bi bo; con T11,T12 = 2 thang', () => {
  assert.equal(so_thang_lam_trong_nam('2026-10-20', null, 2026), 2);
});

test('so_thang_lam_trong_nam: nghi viec 10/03 -> T1,T2 du; T3 chi 10 ngay (<50%) bo = 2 thang', () => {
  assert.equal(so_thang_lam_trong_nam('2020-01-01', '2026-03-10', 2026), 2);
});

test('so_thang_lam_trong_nam: vao nam sau nam xet = 0', () => {
  assert.equal(so_thang_lam_trong_nam('2027-01-01', null, 2026), 0);
});

test('quy_phep_theo_luat: base 12, du 12 thang = 12', () => {
  assert.equal(quy_phep_theo_luat(12, 12), 12);
});

test('quy_phep_theo_luat: base 12, 3 thang = 3', () => {
  assert.equal(quy_phep_theo_luat(12, 3), 3);
});

test('quy_phep_theo_luat: base 14, 7 thang = 8 (14*7/12=8.17 -> lam tron 0,5)', () => {
  assert.equal(quy_phep_theo_luat(14, 7), 8);
});

test('quy_phep_theo_luat: base 12, 5 thang = 5', () => {
  assert.equal(quy_phep_theo_luat(12, 5), 5);
});

test('phan_bo_phep: tong trong quy -> tat ca giu', () => {
  const dons = [
    { id: 'a', tu_ngay: '2026-02-03', den_ngay: '2026-02-04', nua_ngay: false }, // 2 ngay
    { id: 'b', tu_ngay: '2026-05-06', den_ngay: '2026-05-06', nua_ngay: false }, // 1 ngay
  ];
  const kq = phan_bo_phep(dons, 12, 2026);
  assert.deepEqual(kq.map((h) => h.kieu), ['giu', 'giu']);
});

test('phan_bo_phep: don tron ngoai quy -> chuyen ca don', () => {
  // Quy = 2. Hai don 1 ngay (03/03, 04/04) an het quy; don thu ba (05/05) vuot -> chuyen.
  const dons = [
    { id: 'a', tu_ngay: '2026-03-03', den_ngay: '2026-03-03', nua_ngay: false },
    { id: 'b', tu_ngay: '2026-04-04', den_ngay: '2026-04-04', nua_ngay: false },
    { id: 'c', tu_ngay: '2026-05-05', den_ngay: '2026-05-05', nua_ngay: false },
  ];
  const kq = phan_bo_phep(dons, 2, 2026);
  assert.deepEqual(kq.map((h) => h.kieu), ['giu', 'giu', 'chuyen']);
  const c = kq[2];
  assert.ok(c && c.kieu === 'chuyen' && c.tu_ngay === '2026-05-05' && c.den_ngay === '2026-05-05');
});

test('phan_bo_phep: don vat qua ranh gioi quy -> tach', () => {
  // Quy = 1. Mot don 3 ngay 04..06/05. Ngay 1 (04/05) trong quy; 05-06/05 vuot.
  const dons = [{ id: 'a', tu_ngay: '2026-05-04', den_ngay: '2026-05-06', nua_ngay: false }];
  const kq = phan_bo_phep(dons, 1, 2026);
  const h = kq[0];
  assert.ok(h && h.kieu === 'tach');
  if (h.kieu === 'tach') {
    assert.equal(h.giu_den, '2026-05-04');
    assert.equal(h.km_tu, '2026-05-05');
    assert.equal(h.km_den, '2026-05-06');
  }
});

test('phan_bo_phep: nua ngay khi het quy -> chuyen', () => {
  const dons = [{ id: 'a', tu_ngay: '2026-06-01', den_ngay: '2026-06-01', nua_ngay: true }];
  const kq = phan_bo_phep(dons, 0, 2026);
  assert.equal(kq[0]?.kieu, 'chuyen');
});

test('phan_bo_phep: don vat qua HAI NAM chi canh bao, khong tach', () => {
  const dons = [{ id: 'a', tu_ngay: '2025-12-30', den_ngay: '2026-01-02', nua_ngay: false }];
  const kq = phan_bo_phep(dons, 12, 2026);
  assert.equal(kq[0]?.kieu, 'canh_bao_hai_nam');
});

test('phan_bo_phep (BC01/L4): don bac qua cuoi tuan chi dem NGAY LAM VIEC vao quy', () => {
  // 19/06(T6)..23/06(T3): lich 5 ngay nhung chi 3 ngay LAM (bo T7 20 + CN 21).
  const dons = [{ id: 'a', tu_ngay: '2026-06-19', den_ngay: '2026-06-23', nua_ngay: false }];
  const chi_ngay_lam = (ng: string): boolean => {
    const d = new Date(`${ng}T00:00:00Z`).getUTCDay();
    return d !== 0 && d !== 6; // bo CN(0) va T7(6)
  };
  // Quy = 3: dem theo NGAY LAM thi vua du -> giu ca don.
  assert.equal(phan_bo_phep(dons, 3, 2026, chi_ngay_lam)[0]?.kieu, 'giu');
  // Con neu dem ca ngay lich (loi cu) thi 5 > 3 -> tach oan.
  assert.equal(phan_bo_phep(dons, 3, 2026)[0]?.kieu, 'tach');
});
