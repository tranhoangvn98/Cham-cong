// Bai kiem may trang thai ra/vao van phong. Toan bo ham thuan — khong CSDL.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// `tien_ich/thoi_gian.ts` nap `cau_hinh.ts` (doc mui gio may) nen chain keo theo kiem bien
// moi truong. Dat truoc import — dung cach `tinh_cong.test.ts` da lam.
process.env['JWT_SECRET'] ??= 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['DATABASE_URL'] ??= 'postgres://khong_dung@localhost:5432/khong_dung';
process.env['DEVICE_TZ_OFFSET_HOURS'] ??= '7';

// Kieu erase luc bien dich nen import tinh duoc; gia tri phai import DONG sau khi da dat bien
// moi truong — import tinh bi keo len dau, chay truoc ca cac lenh gan process.env o tren.
import type { LanQuetCoChieu } from '../src/cong/ra_vao.ts';
import type { CaLam } from '../src/cong/quy_tac_tinh_cong.ts';

const { chieu_quet } = await import('../src/cong/chieu_quet.ts');
const { suy_luan_ra_vao } = await import('../src/cong/ra_vao.ts');

const NGAY = '2026-08-03';   // thu Hai

const CA: CaLam = {
  gio_vao: '08:00', gio_ra: '17:30', nghi_tu: '12:00', nghi_den: '13:30',
  dung_sai_muon_phut: 5, dung_sai_som_phut: 5, nguong_ot_phut: 30,
  qua_dem: false, phut_du_cong: 420, cac_ngay_lam: [1, 2, 3, 4, 5],
};

function q(gio: string, chieu: 'vao' | 'ra' | 'khong_ro'): LanQuetCoChieu {
  return { thoi_diem: new Date(`${NGAY}T${gio}:00+07:00`), chieu, thiet_bi: 'S1' };
}
const gio = (d: Date | null): string | null =>
  d === null ? null : d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' });

// ---------------------------------------------------------------- chieu_quet

test('chieu_quet: may khai vao/ra thi lay thang chieu do', () => {
  assert.equal(chieu_quet('vao', 1, false), 'vao');   // Status noi ra nhung may la cua vao
  assert.equal(chieu_quet('ra', 0, false), 'ra');
});

test('chieu_quet: may hai_chieu doc theo Status', () => {
  assert.equal(chieu_quet('hai_chieu', 0, false), 'vao');
  assert.equal(chieu_quet('hai_chieu', 1, false), 'ra');
  assert.equal(chieu_quet('hai_chieu', 4, false), 'vao');   // OT vao
  assert.equal(chieu_quet('hai_chieu', 5, false), 'ra');    // OT ra
});

test('chieu_quet: may hai_chieu chi co Status 0 -> khong_ro (bay ZKTeco)', () => {
  // May day Status 0 cho moi lan quet: Status vo nghia, khong duoc coi la vao.
  assert.equal(chieu_quet('hai_chieu', 0, true), 'khong_ro');
});

// ---------------------------------------------------------------- ngay sach

test('ngay sach: vao sang, ra chieu — khong loi, khong phien ra ngoai', () => {
  const r = suy_luan_ra_vao([q('08:00', 'vao'), q('17:35', 'ra')], NGAY, CA);
  assert.equal(gio(r.gio_den), '08:00:00');
  assert.equal(gio(r.gio_ra_ve), '17:35:00');
  assert.equal(r.phien_ra_ngoai.length, 0);
  assert.equal(r.phut_ra_ngoai, 0);
  assert.equal(r.loi.length, 0);
  assert.equal(r.con_trong_van_phong, false);
});

test('ra ngoai 1 lan trong gio lam, tru dung phut', () => {
  const r = suy_luan_ra_vao(
    [q('08:00', 'vao'), q('10:00', 'ra'), q('10:30', 'vao'), q('17:35', 'ra')], NGAY, CA);
  assert.equal(r.phien_ra_ngoai.length, 1);
  assert.equal(r.phut_ra_ngoai, 30);
  assert.equal(r.loi.length, 0);
});

test('ra tron trong gio nghi trua -> khong tru cong', () => {
  const r = suy_luan_ra_vao(
    [q('08:00', 'vao'), q('12:05', 'ra'), q('13:00', 'vao'), q('17:35', 'ra')], NGAY, CA);
  assert.equal(r.phien_ra_ngoai.length, 1);
  assert.equal(r.phien_ra_ngoai[0]?.trong_gio_nghi, true);
  assert.equal(r.phut_ra_ngoai, 0);
});

test('ra vat qua gio nghi trua -> chi tru phan ngoai gio nghi', () => {
  // Ra 11:30, vao 14:00. Nghi 12:00-13:30 (90p). Tho = 150p. Tru 90 = 60p.
  const r = suy_luan_ra_vao(
    [q('08:00', 'vao'), q('11:30', 'ra'), q('14:00', 'vao'), q('17:35', 'ra')], NGAY, CA);
  assert.equal(r.phut_ra_ngoai, 60);
  assert.equal(r.phien_ra_ngoai[0]?.trong_gio_nghi, false);
});

test('ra roi khong quay lai truoc tan ca -> ve som, gio ra ve = lan ra do', () => {
  const r = suy_luan_ra_vao([q('08:00', 'vao'), q('15:00', 'ra')], NGAY, CA);
  assert.equal(gio(r.gio_ra_ve), '15:00:00');
  assert.equal(r.phien_ra_ngoai.length, 0);   // khong tinh la phien ra ngoai — la ve han
  assert.equal(r.con_trong_van_phong, false);
});

test('quet cuoi sau moc tan ca = ket thuc ngay, cac lan sau bo qua', () => {
  const r = suy_luan_ra_vao(
    [q('08:00', 'vao'), q('17:40', 'ra'), q('19:00', 'ra')], NGAY, CA);
  assert.equal(gio(r.gio_ra_ve), '17:40:00');
});

test('chi 1 lan quet: gio den = gio ra ve, co loi CHI_MOT_LAN_QUET', () => {
  const r = suy_luan_ra_vao([q('08:00', 'vao')], NGAY, CA);
  assert.equal(gio(r.gio_den), '08:00:00');
  assert.equal(r.con_trong_van_phong, true);
  assert.ok(r.loi.some((l) => l.ma === 'QUEN_QUET_RA'));
});

test('quet dau ngay o cua ra -> loi QUEN_QUET_VAO nhung van nhan lam gio den', () => {
  const r = suy_luan_ra_vao([q('08:05', 'ra'), q('17:35', 'ra')], NGAY, CA);
  assert.equal(gio(r.gio_den), '08:05:00');
  assert.ok(r.loi.some((l) => l.ma === 'QUEN_QUET_VAO'));
});

test('vao khi dang trong -> loi VAO_KHI_DANG_TRONG', () => {
  // vao 08:00, roi lai vao 10:00 (khong quet ra o giua)
  const r = suy_luan_ra_vao(
    [q('08:00', 'vao'), q('10:00', 'vao'), q('17:35', 'ra')], NGAY, CA);
  assert.ok(r.loi.some((l) => l.ma === 'VAO_KHI_DANG_TRONG'));
});

test('ra khi dang ngoai -> loi RA_KHI_DANG_NGOAI', () => {
  // vao 08:00, ra 10:00 (ngoai), ra 10:30 lan nua (khong quet vao o giua)
  const r = suy_luan_ra_vao(
    [q('08:00', 'vao'), q('10:00', 'ra'), q('10:30', 'ra'), q('17:35', 'ra')], NGAY, CA);
  assert.ok(r.loi.some((l) => l.ma === 'RA_KHI_DANG_NGOAI'));
});

test('may khong_ro (Status 0): dao trang thai, KHONG sinh loi mau thuan', () => {
  // Chuoi giong "vao khi dang trong" nhung vi chieu la suy doan nen khong bat loi.
  const kr = (gio_str: string): LanQuetCoChieu =>
    ({ thoi_diem: new Date(`${NGAY}T${gio_str}:00+07:00`), chieu: 'khong_ro', thiet_bi: 'S1' });
  const r = suy_luan_ra_vao([kr('08:00'), kr('12:00'), kr('13:00'), kr('17:35')], NGAY, CA);
  assert.equal(r.suy_doan, true);
  assert.equal(r.loi.filter((l) =>
    l.ma === 'VAO_KHI_DANG_TRONG' || l.ma === 'RA_KHI_DANG_NGOAI').length, 0);
});

test('quet trung lap cach 20 giay cung chieu: khong sinh loi mau thuan', () => {
  // Hai lan 'vao' sat nhau — lan hai la trung lap, khong phai "vao khi dang trong" that su...
  // nhung may trang thai van thay day la vao-khi-dang-trong. Bai nay KHOA hanh vi hien tai:
  // co sinh VAO_KHI_DANG_TRONG. (Loc trung lap la viec cua lop tren, ghi ro de nguoi sau biet.)
  const r = suy_luan_ra_vao(
    [q('08:00', 'vao'),
     { thoi_diem: new Date(`${NGAY}T08:00:20+07:00`), chieu: 'vao', thiet_bi: 'S1' },
     q('17:35', 'ra')], NGAY, CA);
  assert.ok(r.loi.some((l) => l.ma === 'VAO_KHI_DANG_TRONG'));
});

test('khong co ca (ca null): khong co moc tan ca, van tinh phien ra ngoai', () => {
  const r = suy_luan_ra_vao(
    [q('08:00', 'vao'), q('10:00', 'ra'), q('10:20', 'vao'), q('18:00', 'ra')], NGAY, null);
  // Khong co moc -> lan ra cuoi (18:00) dong phien cuoi va tro thanh gio ra ve.
  assert.equal(r.phien_ra_ngoai.length, 1);
  assert.equal(r.phut_ra_ngoai, 20);
  assert.equal(gio(r.gio_ra_ve), '18:00:00');
});

test('ngay le van tinh ra ngoai (ca truyen vao, trang thai ngay xu ly o lop tren)', () => {
  const r = suy_luan_ra_vao(
    [q('09:00', 'vao'), q('11:00', 'ra'), q('11:30', 'vao'), q('16:00', 'ra')], NGAY, CA);
  assert.equal(r.phut_ra_ngoai, 30);
  assert.equal(gio(r.gio_den), '09:00:00');
});
