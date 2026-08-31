// Tra PIN may cham cong ra nhan vien theo MOC THOI GIAN. Module thuan, nen bai kiem "PIN doi chu
// giua thang" chay duoc bang du lieu mau — khong can CSDL, khong can may cham cong.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cac_pin_lech, dung_lich_pin, khoang_cua_nguoi, lich_pin_rong, tra_pin,
  type KhoangMa, type NguoiMap,
} from '../src/dinh_danh/tra_pin.ts';

const HAO = { id: 'id-hao', ma_nv: 'NV001', ma_erp: null };
const LAN = { id: 'id-lan', ma_nv: 'NV002', ma_erp: 'E2' };
const CUC = { id: 'id-cuc', ma_nv: 'NV003', ma_erp: null };

function d(iso: string): Date {
  return new Date(iso);
}

function dong(
  pin: string, nguoi: NguoiMap, tu: string, den: string | null,
): KhoangMa & { pin: string } {
  return {
    pin, id: nguoi.id, ma_nv: nguoi.ma_nv, ma_erp: nguoi.ma_erp,
    hieu_luc_tu: d(tu), hieu_luc_den: den === null ? null : d(den),
  };
}

// ---------------------------------------------------------------- luat 1: mo ve phia truoc
test('mot PIN chua bao gio doi chu thi tra dung nguoi ca truoc ngay hieu luc', () => {
  // Di tru 025 backfill `hieu_luc_tu = nhan_vien.tao_luc`. Do khong phai su that nghiep vu: ho so
  // duoc tao thang 8 khong co nghia la lan quet thang 6 thuoc ve khong ai. Neu bai nay do thi ban
  // nay vua lam MAT khop mot dong du lieu dang dung duoc.
  const lich = dung_lich_pin([dong('42', HAO, '2026-08-01T00:00:00Z', null)], []);
  assert.deepEqual(tra_pin(lich, '42', d('2026-06-15T02:00:00Z')), HAO);
  assert.deepEqual(tra_pin(lich, '42', d('2026-08-20T02:00:00Z')), HAO);
});

// ---------------------------------------------------------------- bai kiem bat buoc cua §9.5
test('PIN doi chu 01.07: lan quet thang 6 van thuoc nguoi cu', () => {
  const lich = dung_lich_pin([
    dong('42', HAO, '2026-01-01T00:00:00Z', '2026-07-01T00:00:00Z'),
    dong('42', LAN, '2026-07-01T00:00:00Z', null),
  ], []);

  assert.deepEqual(tra_pin(lich, '42', d('2026-06-30T09:00:00Z')), HAO, 'thang 6 phai la nguoi cu');
  assert.deepEqual(tra_pin(lich, '42', d('2026-07-01T01:00:00Z')), LAN, 'thang 7 la nguoi moi');
  // Dung moc chuyen: `hieu_luc_den` LOAI TRU, `hieu_luc_tu` BAO GOM. Neu hai dau cung bao gom thi
  // co mot thoi diem thuoc ve hai nguoi, va thu tu doc quyet dinh ai duoc cong — im lang.
  assert.deepEqual(tra_pin(lich, '42', d('2026-07-01T00:00:00Z')), LAN, 'dung moc chuyen la nguoi moi');
});

test('lo den muon 5 ngay, PIN doi chu ngay thu 3: lo tach cho hai nguoi theo ngay', () => {
  // Day la bai bat dung cho `hieu_luc_den is null`: mot lo duy nhat, mot lan tra, hai nguoi.
  const lich = dung_lich_pin([
    dong('7', HAO, '2026-01-01T00:00:00Z', '2026-08-13T00:00:00Z'),
    dong('7', LAN, '2026-08-13T00:00:00Z', null),
  ], []);

  const lo = [
    '2026-08-11T01:00:00Z', '2026-08-12T01:00:00Z', '2026-08-13T01:00:00Z',
    '2026-08-14T01:00:00Z', '2026-08-15T01:00:00Z',
  ].map((t) => tra_pin(lich, '7', d(t))?.ma_nv ?? null);

  assert.deepEqual(lo, ['NV001', 'NV001', 'NV002', 'NV002', 'NV002']);
});

test('PIN qua tay ba nguoi thi ke lai dung tung khoang', () => {
  const lich = dung_lich_pin([
    dong('9', HAO, '2026-01-01T00:00:00Z', '2026-03-01T00:00:00Z'),
    dong('9', LAN, '2026-03-01T00:00:00Z', '2026-05-01T00:00:00Z'),
    dong('9', CUC, '2026-05-01T00:00:00Z', null),
  ], []);
  assert.equal(tra_pin(lich, '9', d('2026-02-10T00:00:00Z'))?.ma_nv, 'NV001');
  assert.equal(tra_pin(lich, '9', d('2026-04-10T00:00:00Z'))?.ma_nv, 'NV002');
  assert.equal(tra_pin(lich, '9', d('2026-06-10T00:00:00Z'))?.ma_nv, 'NV003');
});

test('dung_lich_pin sap xep, nen thu tu dong doc ra khong anh huong ket qua', () => {
  const xuoi = dung_lich_pin([
    dong('9', HAO, '2026-01-01T00:00:00Z', '2026-03-01T00:00:00Z'),
    dong('9', LAN, '2026-03-01T00:00:00Z', null),
  ], []);
  const nguoc = dung_lich_pin([
    dong('9', LAN, '2026-03-01T00:00:00Z', null),
    dong('9', HAO, '2026-01-01T00:00:00Z', '2026-03-01T00:00:00Z'),
  ], []);
  for (const t of ['2026-02-01T00:00:00Z', '2026-04-01T00:00:00Z']) {
    assert.deepEqual(tra_pin(xuoi, '9', d(t)), tra_pin(nguoc, '9', d(t)), t);
  }
});

// ---------------------------------------------------------------- luat 2: bang noi cuoi
test('PIN da dong lai va chua cap cho ai thi tra null, KHONG roi xuong cot', () => {
  // Cot `pin_may` chi biet "hom nay la ai". Roi xuong cot o day la quay lai dung cai loi module
  // nay sinh ra de sua.
  const lich = dung_lich_pin(
    [dong('42', HAO, '2026-01-01T00:00:00Z', '2026-07-01T00:00:00Z')],
    [{ pin: '42', ...LAN }],
  );
  assert.equal(tra_pin(lich, '42', d('2026-08-01T00:00:00Z')), null, 'sau khi dong phai la null');
  assert.deepEqual(tra_pin(lich, '42', d('2026-05-01T00:00:00Z')), HAO, 'trong khoang van dung');
});

// ---------------------------------------------------------------- luat 3: duong du phong
test('PIN chi co o cot thi van tra duoc — khong lam mat khop so voi truoc', () => {
  const lich = dung_lich_pin([], [{ pin: '5', ...HAO }]);
  assert.deepEqual(tra_pin(lich, '5', d('2026-08-01T00:00:00Z')), HAO);
});

test('PIN khong co o dau thi tra null', () => {
  assert.equal(tra_pin(lich_pin_rong(), '99', d('2026-08-01T00:00:00Z')), null);
  const lich = dung_lich_pin([dong('42', HAO, '2026-01-01T00:00:00Z', null)], []);
  assert.equal(tra_pin(lich, '99', d('2026-08-01T00:00:00Z')), null);
});

// ---------------------------------------------------------------- luat 4: khoang chong nhau
test('hai khoang chong nhau thi dong cap gan nhat thang, va ket qua on dinh', () => {
  const lich = dung_lich_pin([
    dong('3', HAO, '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    dong('3', LAN, '2026-04-01T00:00:00Z', null),
  ], []);
  assert.equal(tra_pin(lich, '3', d('2026-02-01T00:00:00Z'))?.ma_nv, 'NV001');
  assert.equal(tra_pin(lich, '3', d('2026-05-01T00:00:00Z'))?.ma_nv, 'NV002', 'trong doan chong');
  assert.equal(tra_pin(lich, '3', d('2026-07-01T00:00:00Z'))?.ma_nv, 'NV002');
});

// ---------------------------------------------------------------- lech bang / cot
test('cac_pin_lech chi bao khi bang va cot noi khac nhau ve hom nay', () => {
  const khop = dung_lich_pin(
    [dong('1', HAO, '2026-01-01T00:00:00Z', null)], [{ pin: '1', ...HAO }]);
  assert.deepEqual(cac_pin_lech(khop), []);

  const lech = dung_lich_pin(
    [dong('1', HAO, '2026-01-01T00:00:00Z', null)], [{ pin: '1', ...LAN }]);
  assert.deepEqual(cac_pin_lech(lech), [{ pin: '1', ma_nv_bang: 'NV001', ma_nv_cot: 'NV002' }]);

  // PIN da dong lai o bang: cot noi ve hom nay, bang noi PIN khong con cua ai. Do la mot dang
  // lech khac va khong phai viec cua bo tiep nhan — de `pin_trung_khoang.sh` bao.
  const da_dong = dung_lich_pin(
    [dong('1', HAO, '2026-01-01T00:00:00Z', '2026-07-01T00:00:00Z')], [{ pin: '1', ...LAN }]);
  assert.deepEqual(cac_pin_lech(da_dong), []);
});

test('cac_pin_lech khong bao khi PIN chi co o mot ben', () => {
  assert.deepEqual(cac_pin_lech(dung_lich_pin([], [{ pin: '1', ...HAO }])), []);
  assert.deepEqual(
    cac_pin_lech(dung_lich_pin([dong('1', HAO, '2026-01-01T00:00:00Z', null)], [])), []);
});

// ---------------------------------------------------------------- khoang mac dinh cho "gan lai"
test('khoang_cua_nguoi: chu dau tien mo ve phia truoc', () => {
  const lich = dung_lich_pin([
    dong('42', HAO, '2026-02-01T00:00:00Z', '2026-07-01T00:00:00Z'),
    dong('42', LAN, '2026-07-01T00:00:00Z', null),
  ], []);
  assert.deepEqual(khoang_cua_nguoi(lich, '42', 'id-hao'),
    { tu: null, den: d('2026-07-01T00:00:00Z') });
  assert.deepEqual(khoang_cua_nguoi(lich, '42', 'id-lan'),
    { tu: d('2026-07-01T00:00:00Z'), den: null });
});

test('khoang_cua_nguoi: nguoi khong giu PIN nay thi tra null de cho goi TU CHOI, khong doan', () => {
  const lich = dung_lich_pin([dong('42', HAO, '2026-02-01T00:00:00Z', null)], []);
  assert.equal(khoang_cua_nguoi(lich, '42', 'id-lan'), null);
  assert.equal(khoang_cua_nguoi(lich, '99', 'id-hao'), null);
});

test('khoang_cua_nguoi: nhieu doan roi rac cua cung mot nguoi thi trum het', () => {
  // PIN quay ve nguoi cu — co that khi mot nguoi nghi roi vao lai.
  const lich = dung_lich_pin([
    dong('42', HAO, '2026-01-01T00:00:00Z', '2026-04-01T00:00:00Z'),
    dong('42', LAN, '2026-04-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    dong('42', HAO, '2026-06-01T00:00:00Z', null),
  ], []);
  assert.deepEqual(khoang_cua_nguoi(lich, '42', 'id-hao'), { tu: null, den: null });
});
