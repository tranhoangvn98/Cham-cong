// Test ham thuan cua quy trinh thoi viec — tat ca con so phap ly (BLLD 2019, ND145/2020)
// phai duoc khoa o day: sai mot so la sai tien cua nguoi sap nghi.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  nguong_bao_truoc, cong_ngay_lam_viec, tro_cap_thoi_viec, tien_phep_chua_nghi,
  so_muc_bat_buoc_chua, san_sang_chot, kiem_dieu_kien_chay,
} = await import('../src/thoi_viec/tinh_toan.ts');

// ---------------------------------------------------------------- nguong bao truoc

const KHUON: Record<string, number | null> = {
  thu_viec: 0,
  hoc_viec: null,
  thoi_vu: 3,
  xac_dinh: 30,
  khong_xac_dinh: 45,
  cong_tac_vien: null,
  quan_ly_dn: 120,
};

test('thu viec khong can bao truoc (BLLD D.27 k2)', () => {
  assert.equal(nguong_bao_truoc(KHUON, 'thu_viec', null, false), 0);
});

test('hop dong khong xac dinh bao truoc 45 ngay (BLLD D.35.1)', () => {
  assert.equal(nguong_bao_truoc(KHUON, 'khong_xac_dinh', null, false), 45);
});

test('hop dong xac dinh 12-36 thang bao truoc 30 ngay', () => {
  assert.equal(nguong_bao_truoc(KHUON, 'xac_dinh', 24, false), 30);
});

test('hop dong xac dinh duoi 12 thang chi 3 ngay lam viec', () => {
  assert.equal(nguong_bao_truoc(KHUON, 'xac_dinh', 6, false), 3);
});

test('hoc viec va cong tac vien khong chan — theo hop dong', () => {
  assert.equal(nguong_bao_truoc(KHUON, 'hoc_viec', null, false), null);
  assert.equal(nguong_bao_truoc(KHUON, 'cong_tac_vien', null, false), null);
});

test('nguoi quan ly DN toi 120 ngay (D.7 ND145/2020)', () => {
  assert.equal(nguong_bao_truoc(KHUON, 'khong_xac_dinh', null, true), 120);
});

// ---------------------------------------------------------------- ngay lam viec

const LA_NGAY_LAM = (ngay: string): boolean => {
  const thu = new Date(`${ngay}T00:00:00Z`).getUTCDay();
  return thu !== 0 && thu !== 6;
};

test('cong 14 ngay lam viec bo qua thu bay va chu nhat', () => {
  // 2026-09-25 la thu Sau -> 14 ngay lam viec ket thuc 2026-10-15 (thu Nam).
  assert.equal(cong_ngay_lam_viec('2026-09-25', 14, LA_NGAY_LAM), '2026-10-15');
});

test('cong ngay lam viec qua ngay le khi la_ngay_lam loai', () => {
  const le = new Set(['2026-09-28']);
  const la = (ngay: string): boolean => LA_NGAY_LAM(ngay) && !le.has(ngay);
  // 25/09 (thu 6) -> thu 7, CN nghi; 28/09 (thu 2) le -> 29/09 la ngay lam dau tien.
  assert.equal(cong_ngay_lam_viec('2026-09-25', 1, la), '2026-09-29');
});

// ---------------------------------------------------------------- tro cap & phep

test('tro cap thoi viec = 0.5 thang luong x so nam (tru thoi gian dong BHTN)', () => {
  const kq = tro_cap_thoi_viec(10_000_000, '2020-01-01', '2026-01-01', 36);
  // 6 nam lam, 3 nam dong BHTN -> tinh 3 nam -> 15.000.000.
  assert.equal(kq.so_nam_tinh, 3);
  assert.equal(kq.tro_cap, 15_000_000);
});

test('tro cap thoi viec khong am khi dong BHTN nhieu hon so nam lam', () => {
  const kq = tro_cap_thoi_viec(10_000_000, '2025-01-01', '2025-06-01', 48);
  assert.equal(kq.tro_cap, 0);
});

test('thanh toan phep chua nghi = so ngay con x luong ngay', () => {
  assert.equal(tien_phep_chua_nghi(5.5, 500_000), 2_750_000);
  assert.equal(tien_phep_chua_nghi(0, 500_000), 0);
});

// ---------------------------------------------------------------- trang thai & cong 2

const MUC = (ma: string, bat_buoc: boolean, trang_thai: 'chua' | 'xong' | 'bo_qua'): Parameters<typeof kiem_dieu_kien_chay>[0][number] =>
  ({ id: ma, quy_trinh_id: 'q', ma_muc: ma, nhom: 'nhan_vien', loai_tu_dong: 'nhan_vien',
    tieu_de: ma, bat_buoc, trang_thai, bang_chung_tep_id: null, bang_chung_ten_goc: null,
    ket_qua: null, xac_nhan_boi: null, xac_nhan_luc: null, ghi_chu: null });

test('so muc bat buoc con chua — khong dem muc khong bat buoc va da bo qua', () => {
  const mucs = [MUC('a', true, 'chua'), MUC('b', true, 'xong'),
    MUC('c', false, 'chua'), MUC('d', true, 'bo_qua')];
  assert.equal(so_muc_bat_buoc_chua(mucs), 1);
  assert.equal(san_sang_chot(mucs), false);
});

test('san sang chot khi moi muc bat buoc xong hoac bo qua', () => {
  const mucs = [MUC('a', true, 'xong'), MUC('b', true, 'bo_qua'), MUC('c', false, 'chua')];
  assert.equal(san_sang_chot(mucs), true);
});

test('kiem dieu kien chay: chan khi chua san sang hoac chua chot lastday', () => {
  const mucs = [MUC('a', true, 'xong')];
  const loi = kiem_dieu_kien_chay(mucs, 'dang_thuc_hien', false, null, 'bhxh@cty.vn', '');
  assert.equal(loi.length >= 2, true);
  assert.ok(loi.some((l) => l.includes('sẵn sàng')));
  assert.ok(loi.some((l) => l.includes('lastday')));
});

test('kiem dieu kien chay: chan khi thieu email dich vu BHXH (REQ-CH-02)', () => {
  const mucs = [MUC('chot_bhxh', true, 'xong'), MUC('luu_ho_so', true, 'xong')];
  const loi = kiem_dieu_kien_chay(mucs, 'san_sang_chot', true, '2026-09-30', '', '');
  assert.ok(loi.some((l) => l.includes('BHXH')));
});

test('kiem dieu kien chay: bo qua muc chot_bhxh thi khong doi hoi email', () => {
  const mucs = [MUC('chot_bhxh', true, 'bo_qua'), MUC('luu_ho_so', true, 'xong')];
  const loi = kiem_dieu_kien_chay(mucs, 'san_sang_chot', true, '2026-09-30', '', '');
  assert.deepEqual(loi, []);
});

test('kiem dieu kien chay: chan khi con muc bat buoc chua xong', () => {
  const mucs = [MUC('a', true, 'xong'), MUC('b', true, 'chua')];
  const loi = kiem_dieu_kien_chay(mucs, 'san_sang_chot', true, '2026-09-30', 'bhxh@cty.vn', '');
  assert.ok(loi.some((l) => l.includes('mục bắt buộc')));
});
