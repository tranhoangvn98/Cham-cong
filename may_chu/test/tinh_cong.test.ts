// Kiem thu quy tac tinh cong — phan sinh ra tien luong, phai chac tung tinh huong.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env['JWT_SECRET'] ??= 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['DATABASE_URL'] ??= 'postgres://khong_dung@localhost:5432/khong_dung';
process.env['DEVICE_TZ_OFFSET_HOURS'] ??= '7';

// Kieu chi ton tai luc bien dich nen import tinh duoc; gia tri phai import dong
// vi module cau_hinh doc bien moi truong khi nap.
import type { CaLam, KhoangLamThem } from '../src/cong/quy_tac_tinh_cong.ts';

const { tinh_cong_ngay, khoang_lay_quet, ca_cua_ngay } = await import('../src/cong/quy_tac_tinh_cong.ts');
const { moc_thoi_gian } = await import('../src/tien_ich/thoi_gian.ts');

/** Ca hanh chinh 08:00-17:00, nghi trua 12:00-13:30, T2-T6. */
const CA_HC = {
  gio_vao: '08:00', gio_ra: '17:00',
  nghi_tu: '12:00', nghi_den: '13:30',
  dung_sai_muon_phut: 5, dung_sai_som_phut: 5, nguong_ot_phut: 30,
  qua_dem: false, phut_du_cong: 420, cac_ngay_lam: [1, 2, 3, 4, 5],
} satisfies CaLam;

// 2026-08-06 la Thu Nam (ngay lam viec). 2026-08-08 la Thu Bay (nghi tuan).
const T5 = '2026-08-06';
const T7 = '2026-08-08';

function q(ngay: string, ...gio: string[]) {
  return gio.map((g) => moc_thoi_gian(ngay, g));
}

/** Mot don lam them da duyet, viet gon cho de doc trong bai kiem. */
function ot(...cap: [string, string][]): KhoangLamThem[] {
  return cap.map(([gio_bat_dau, gio_ket_thuc]) => ({ gio_bat_dau, gio_ket_thuc }));
}

function co_ban(ngay: string, ca: CaLam | null, quet: Date[]) {
  return {
    ngay, ca, quet,
    nghi_phep: null, ngay_le: null, giai_trinh: null, cong_tac: null,
    lam_them: [] as KhoangLamThem[],
  };
}

test('ngay du cong binh thuong: 08:00-17:00 = 540 phut tho - 90 nghi = 450', () => {
  const kq = tinh_cong_ngay(co_ban(T5, CA_HC, q(T5, '08:00', '17:00')));
  assert.equal(kq.trang_thai, 'co_mat');
  assert.equal(kq.phut_lam, 450);
  assert.equal(kq.phut_muon, 0);
  assert.equal(kq.phut_ve_som, 0);
  assert.equal(kq.phut_ot, 0);
  assert.equal(kq.so_cong, 1);
});

test('den som khong duoc tinh them cong (kep vao khung ca)', () => {
  const kq = tinh_cong_ngay(co_ban(T5, CA_HC, q(T5, '07:00', '17:00')));
  assert.equal(kq.phut_lam, 450, 'den som 1 tieng khong lam tang cong');
  assert.equal(kq.phut_muon, 0);
});

test('di muon trong dung sai 5 phut: khong tinh phat', () => {
  const kq = tinh_cong_ngay(co_ban(T5, CA_HC, q(T5, '08:05', '17:00')));
  assert.equal(kq.phut_muon, 0);
  assert.equal(kq.phut_lam, 445);
});

test('di muon vuot dung sai: chi tinh phan vuot', () => {
  const kq = tinh_cong_ngay(co_ban(T5, CA_HC, q(T5, '08:20', '17:00')));
  assert.equal(kq.phut_muon, 15, '20 phut muon - 5 phut dung sai');
  assert.equal(kq.phut_lam, 430);
  assert.match(kq.ghi_chu ?? '', /Di muon 15 phut/);
});

test('ve som vuot dung sai', () => {
  const kq = tinh_cong_ngay(co_ban(T5, CA_HC, q(T5, '08:00', '16:00')));
  assert.equal(kq.phut_ve_som, 55, '60 phut som - 5 phut dung sai');
  assert.equal(kq.phut_lam, 390);
  assert.equal(kq.so_cong, 0.5, 'chua du 420 phut nhung >= nua nguong');
});

// ==================================================================================
// OT CHI TINH KHI CO DON LAM THEM DA DUYET.
//
// Truoc ban nay, o lai qua `nguong_ot_phut` la tu dong thanh OT. Mot he thong tu ket
// luan "o lai muon = lam them" la tu tao ra nghia vu tra tien tu mot lan quet the —
// va tren du lieu that, gio quet cuoi cung thuong la luc roi toa nha chu khong phai
// luc ngung lam viec.
// ==================================================================================

test('OT: o lai den 19:00 nhung KHONG co don -> 0 OT, va phai co ghi chu', () => {
  const kq = tinh_cong_ngay(co_ban(T5, CA_HC, q(T5, '08:00', '19:00')));
  assert.equal(kq.phut_ot, 0, 'khong dang ky thi khong duoc tinh');
  assert.equal(kq.phut_lam, 450, 'cong chuan van kep trong khung ca');
  assert.match(kq.ghi_chu ?? '', /khong co don lam them/, 'khong duoc im lang');
  assert.match(kq.ghi_chu ?? '', /120 phut/, 'phai noi ro o lai bao lau');
});

test('OT: co don 17:00-19:00 va o lai den 19:00 -> 120 phut', () => {
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, q(T5, '08:00', '19:00')),
    lam_them: ot(['17:00', '19:00']),
  });
  assert.equal(kq.phut_ot, 120);
  assert.equal(kq.phut_lam, 450, 'OT khong cong vao cong chuan');
  assert.equal(kq.so_cong, 1);
});

test('OT la GIAO: dang ky 17:00-19:00 nhung ve luc 18:00 -> chi 60 phut', () => {
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, q(T5, '08:00', '18:00')),
    lam_them: ot(['17:00', '19:00']),
  });
  assert.equal(kq.phut_ot, 60, 'don la ke hoach, khong phai ket qua');
});

test('OT la GIAO: dang ky nhung khong o lai -> 0 phut', () => {
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, q(T5, '08:00', '17:00')),
    lam_them: ot(['17:00', '19:00']),
  });
  assert.equal(kq.phut_ot, 0);
});

test('OT: hai don chong nhau trong mot ngay khong duoc tinh hai lan', () => {
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, q(T5, '08:00', '20:00')),
    lam_them: ot(['17:00', '18:30'], ['18:00', '20:00']),
  });
  assert.equal(kq.phut_ot, 180, 'hop nhat thanh 17:00-20:00, khong phai 90 + 120');
});

test('OT: don 20 phut van duoc tinh — nguong_ot_phut khong con chan', () => {
  // Nguong ton tai de loc nhieu cho mot phep suy doan tu dong. Khi can cu la mot don
  // da duyet thi loc nua la sai: khong ai giai thich duoc "duyet roi ma van 0 phut".
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, q(T5, '08:00', '17:20')),
    lam_them: ot(['17:00', '17:20']),
  });
  assert.equal(kq.phut_ot, 20);
});

test('OT: don trum gio nghi trua phai TRU gio nghi', () => {
  // Don lam them ca ngay (ngay le), 08:00-17:00 = 540 phut, tru 90 phut nghi trua.
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, q(T5, '08:00', '17:00')),
    ngay_le: { huong_luong: true },
    lam_them: ot(['08:00', '17:00']),
  });
  assert.equal(kq.phut_ot, 450, 'khong duoc tra tien cho 90 phut nghi trua');
});

test('nhieu lan quet trong ngay: lay som nhat va muon nhat', () => {
  const kq = tinh_cong_ngay(co_ban(T5, CA_HC, q(T5, '08:00', '12:01', '13:29', '17:02')));
  assert.equal(kq.gio_vao?.getTime(), moc_thoi_gian(T5, '08:00').getTime());
  assert.equal(kq.gio_ra?.getTime(), moc_thoi_gian(T5, '17:02').getTime());
  assert.equal(kq.phut_lam, 450);
});

test('chi co 1 lan quet: khong tinh duoc gio lam, co ghi chu canh bao', () => {
  const kq = tinh_cong_ngay(co_ban(T5, CA_HC, q(T5, '08:00')));
  assert.equal(kq.phut_lam, 0);
  assert.equal(kq.so_cong, 0);
  assert.match(kq.ghi_chu ?? '', /thieu gio ra/);
});

test('khong co lan quet nao trong ngay lam viec: vang', () => {
  const kq = tinh_cong_ngay(co_ban(T5, CA_HC, []));
  assert.equal(kq.trang_thai, 'vang');
  assert.equal(kq.so_cong, 0);
  assert.equal(kq.gio_vao, null);
});

test('nghi trua chi bi tru khi khoang lam that su trum gio nghi', () => {
  // Lam buoi sang 08:00-11:30, khong trum 12:00-13:30
  const kq = tinh_cong_ngay(co_ban(T5, CA_HC, q(T5, '08:00', '11:30')));
  assert.equal(kq.phut_lam, 210, 'khong bi tru 90 phut nghi trua');
  assert.equal(kq.so_cong, 0.5);
});

test('nghi trua bi tru mot phan khi ra giua gio nghi', () => {
  // 08:00 -> 12:30: tho 270 phut, giao voi nghi (12:00-12:30) = 30 phut
  const kq = tinh_cong_ngay(co_ban(T5, CA_HC, q(T5, '08:00', '12:30')));
  assert.equal(kq.phut_lam, 240);
});

test('chua gan ca: chi tinh tong thoi gian, khong phat muon/som', () => {
  const kq = tinh_cong_ngay(co_ban(T5, null, q(T5, '09:30', '18:00')));
  assert.equal(kq.trang_thai, 'co_mat');
  assert.equal(kq.phut_lam, 510);
  assert.equal(kq.phut_muon, 0);
  assert.equal(kq.phut_ve_som, 0);
  assert.equal(kq.phut_ot, 0);
  assert.equal(kq.so_cong, 1);
  assert.match(kq.ghi_chu ?? '', /chua duoc gan ca/);
});

test('chua gan ca: van tinh OT neu co don da duyet', () => {
  const kq = tinh_cong_ngay({
    ...co_ban(T5, null, q(T5, '09:30', '18:00')),
    lam_them: ot(['17:00', '18:00']),
  });
  assert.equal(kq.phut_ot, 60, 'khong co ca thi khong co gio nghi de tru');
});

test('ngay nghi tuan khong quet: nghi_tuan, 0 cong', () => {
  const kq = tinh_cong_ngay(co_ban(T7, CA_HC, []));
  assert.equal(kq.trang_thai, 'nghi_tuan');
  assert.equal(kq.so_cong, 0);
});

test('lam viec ngay nghi tuan KHONG co don: 0 OT, ghi chu noi ro', () => {
  const kq = tinh_cong_ngay(co_ban(T7, CA_HC, q(T7, '09:00', '12:00')));
  assert.equal(kq.trang_thai, 'nghi_tuan');
  assert.equal(kq.phut_lam, 180, 'van ghi nhan da co mat bao lau');
  assert.equal(kq.phut_ot, 0, 'nhung khong tra tien khi chua dang ky');
  assert.equal(kq.phut_muon, 0);
  assert.equal(kq.so_cong, 0);
  assert.match(kq.ghi_chu ?? '', /nghi tuan/);
  assert.match(kq.ghi_chu ?? '', /khong co don lam them/);
});

test('lam viec ngay nghi tuan CO don: tinh phan da dang ky', () => {
  const kq = tinh_cong_ngay({
    ...co_ban(T7, CA_HC, q(T7, '09:00', '12:00')),
    lam_them: ot(['09:00', '12:00']),
  });
  assert.equal(kq.trang_thai, 'nghi_tuan');
  assert.equal(kq.phut_ot, 180);
  assert.equal(kq.so_cong, 0, 'ngay nghi tuan van khong sinh cong chuan');
});

test('ngay le huong luong: 1 cong du khong di lam', () => {
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, []),
    ngay_le: { huong_luong: true },
  });
  assert.equal(kq.trang_thai, 'ngay_le');
  assert.equal(kq.so_cong, 1);
});

test('lam viec ngay le KHONG co don: 0 OT, ghi chu noi ro', () => {
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, q(T5, '08:00', '17:00')),
    ngay_le: { huong_luong: true },
  });
  assert.equal(kq.trang_thai, 'ngay_le');
  assert.equal(kq.so_cong, 1);
  assert.equal(kq.phut_lam, 450, 'van ghi nhan da lam bao lau');
  assert.equal(kq.phut_ot, 0);
  assert.match(kq.ghi_chu ?? '', /khong co don lam them/);
});

test('nghi phep co luong: 1 cong; nua ngay: 0.5 cong', () => {
  const ca_ngay = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, []),
    nghi_phep: { loai: 'phep_nam', nua_ngay: false },
  });
  assert.equal(ca_ngay.trang_thai, 'nghi_phep');
  assert.equal(ca_ngay.so_cong, 1);

  const nua = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, []),
    nghi_phep: { loai: 'phep_nam', nua_ngay: true },
  });
  assert.equal(nua.so_cong, 0.5);
});

test('nghi phep ma van den lam, khong co don lam them: 0 OT', () => {
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, q(T5, '08:00', '12:00')),
    nghi_phep: { loai: 'phep_nam', nua_ngay: false },
  });
  assert.equal(kq.trang_thai, 'nghi_phep');
  assert.equal(kq.phut_ot, 0);
  assert.match(kq.ghi_chu ?? '', /khong co don lam them/);
});

test('nghi khong luong: 0 cong', () => {
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, []),
    nghi_phep: { loai: 'khong_luong', nua_ngay: false },
  });
  assert.equal(kq.trang_thai, 'nghi_phep');
  assert.equal(kq.so_cong, 0);
});

test('nghi phep uu tien cao hon ngay le', () => {
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, []),
    nghi_phep: { loai: 'phep_nam', nua_ngay: false },
    ngay_le: { huong_luong: true },
  });
  assert.equal(kq.trang_thai, 'nghi_phep');
});

test('don giai trinh da duyet ghi de gio vao/ra', () => {
  // Quen quet ra, chi co 1 moc 08:00; giai trinh de xuat ra 17:00
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, q(T5, '08:00')),
    giai_trinh: { gio_vao_de_xuat: null, gio_ra_de_xuat: '17:00' },
  });
  assert.equal(kq.co_dieu_chinh, true);
  assert.equal(kq.phut_lam, 450);
  assert.equal(kq.so_cong, 1);
  assert.match(kq.ghi_chu ?? '', /giai trinh/);
});

test('giai trinh ca hai moc khi quen quet ca ngay', () => {
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, []),
    giai_trinh: { gio_vao_de_xuat: '08:00', gio_ra_de_xuat: '17:00' },
  });
  assert.equal(kq.trang_thai, 'co_mat');
  assert.equal(kq.phut_lam, 450);
  assert.equal(kq.co_dieu_chinh, true);
});

// ---------------------------------------------------------------- ca dem
const CA_DEM = {
  gio_vao: '22:00', gio_ra: '06:00',
  nghi_tu: '02:00', nghi_den: '02:30',
  dung_sai_muon_phut: 5, dung_sai_som_phut: 5, nguong_ot_phut: 30,
  qua_dem: true, phut_du_cong: 420, cac_ngay_lam: [1, 2, 3, 4, 5],
} satisfies CaLam;

test('ca dem: quet 22:00 hom truoc, 06:00 hom sau = 480 phut - 30 nghi = 450', () => {
  const quet = [moc_thoi_gian(T5, '22:00'), moc_thoi_gian(T5, '06:00', 1)];
  const kq = tinh_cong_ngay(co_ban(T5, CA_DEM, quet));
  assert.equal(kq.trang_thai, 'co_mat');
  assert.equal(kq.phut_lam, 450);
  assert.equal(kq.phut_muon, 0);
  assert.equal(kq.so_cong, 1);
});

test('ca dem: di muon tinh dung theo gio vao 22:00', () => {
  const quet = [moc_thoi_gian(T5, '22:30'), moc_thoi_gian(T5, '06:00', 1)];
  const kq = tinh_cong_ngay(co_ban(T5, CA_DEM, quet));
  assert.equal(kq.phut_muon, 25);
});

test('ca dem: nghi giua ca (02:00-02:30 ngay hom sau) bi tru dung', () => {
  const quet = [moc_thoi_gian(T5, '22:00'), moc_thoi_gian(T5, '03:00', 1)];
  const kq = tinh_cong_ngay(co_ban(T5, CA_DEM, quet));
  // 22:00 -> 03:00 = 300 phut tho, tru 30 phut nghi = 270
  assert.equal(kq.phut_lam, 270);
});

test('ca dem: don lam them sau nua dem thuoc ngay hom sau', () => {
  // Khoang dang ky '06:00'-'08:00' nho hon gio vao ca (22:00) nen duoc hieu la ngay hom sau —
  // cung quy uoc voi gio nghi giua ca.
  const quet = [moc_thoi_gian(T5, '22:00'), moc_thoi_gian(T5, '08:00', 1)];
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_DEM, quet),
    lam_them: ot(['06:00', '08:00']),
  });
  assert.equal(kq.phut_ot, 120);
});

test('khoang_lay_quet: ca thuong dung dung mot ngay theo lich', () => {
  const k = khoang_lay_quet(T5, CA_HC);
  assert.equal(k.tu.getTime(), moc_thoi_gian(T5, '00:00').getTime());
  assert.equal(k.den.getTime(), moc_thoi_gian(T5, '00:00', 1).getTime());
});

test('khoang_lay_quet: ca dem mo rong sang ngay hom sau', () => {
  const k = khoang_lay_quet(T5, CA_DEM);
  assert.equal(k.tu.getTime(), moc_thoi_gian(T5, '19:00').getTime(), '3h truoc gio vao');
  assert.equal(k.den.getTime(), moc_thoi_gian(T5, '11:00', 1).getTime(), '5h sau gio ra');
});

// ==================================================================================
// Khung gio rieng theo thu — che do T2-T6 ca ngay + SANG THU BAY (hop dong lao dong
// pho bien o Viet Nam: 08:00-12:00 va 13:30-17:30, thu Bay chi lam buoi sang).
// Khong co co che nay thi moi thu Bay ca cong ty bi ghi "ve som 330 phut".
// ==================================================================================

/** Ca theo hop dong: T2-T7, rieng T7 chi 08:00-12:00 va tinh 0,5 cong. */
const CA_HD = {
  gio_vao: '08:00', gio_ra: '17:30',
  nghi_tu: '12:00', nghi_den: '13:30',
  dung_sai_muon_phut: 5, dung_sai_som_phut: 5, nguong_ot_phut: 30,
  qua_dem: false, phut_du_cong: 480, cac_ngay_lam: [1, 2, 3, 4, 5, 6],
  theo_thu: [
    { thu: 6, gio_vao: '08:00', gio_ra: '12:00', nghi_tu: null, nghi_den: null, phut_du_cong: 480 },
  ],
} satisfies CaLam;

test('theo thu: T2-T6 van dung khung gio goc cua ca', () => {
  const kq = tinh_cong_ngay(co_ban(T5, CA_HD, q(T5, '08:00', '17:30')));
  assert.equal(kq.trang_thai, 'co_mat');
  assert.equal(kq.phut_lam, 480, '570 phut tho - 90 phut nghi trua');
  assert.equal(kq.phut_ve_som, 0);
  assert.equal(kq.so_cong, 1);
});

test('theo thu: sang T7 lam du 08:00-12:00 -> KHONG ve som, 0,5 cong', () => {
  const kq = tinh_cong_ngay(co_ban(T7, CA_HD, q(T7, '08:00', '12:00')));
  assert.equal(kq.trang_thai, 'co_mat', 'T7 nam trong cac_ngay_lam nen la ngay di lam');
  assert.equal(kq.phut_lam, 240, 'khung gio T7 khong co gio nghi trua');
  assert.equal(kq.phut_ve_som, 0, 've luc 12:00 la dung gio tan ca cua thu Bay');
  assert.equal(kq.phut_muon, 0);
  assert.equal(kq.phut_ot, 0);
  assert.equal(kq.so_cong, 0.5, '240 phut / nguong 480 -> nua cong');
});

test('theo thu: T7 ve som that (11:00) van bi ghi nhan ve som', () => {
  const kq = tinh_cong_ngay(co_ban(T7, CA_HD, q(T7, '08:00', '11:00')));
  assert.equal(kq.phut_ve_som, 55, '60 phut som - 5 phut dung sai');
  assert.equal(kq.phut_lam, 180);
  assert.equal(kq.so_cong, 0, '180 phut chua toi nua nguong 480');
});

test('theo thu: lam qua trua T7 KHONG co don -> 0 OT', () => {
  const kq = tinh_cong_ngay(co_ban(T7, CA_HD, q(T7, '08:00', '14:00')));
  assert.equal(kq.phut_lam, 240, 'kep trong khung ca: chi tinh toi 12:00');
  assert.equal(kq.phut_ot, 0);
  assert.match(kq.ghi_chu ?? '', /khong co don lam them/);
});

test('theo thu: lam qua trua T7 CO don -> tinh theo don', () => {
  const kq = tinh_cong_ngay({
    ...co_ban(T7, CA_HD, q(T7, '08:00', '14:00')),
    lam_them: ot(['12:00', '14:00']),
  });
  assert.equal(kq.phut_lam, 240);
  assert.equal(kq.phut_ot, 120, 'khung gio T7 khong khai gio nghi nen khong tru gi');
});

test('theo thu: khong khai thu nao thi ca chay y het truoc day', () => {
  const khong_khai = { ...CA_HD, theo_thu: [] } satisfies CaLam;
  const kq = tinh_cong_ngay(co_ban(T7, khong_khai, q(T7, '08:00', '12:00')));
  assert.equal(kq.phut_ve_som, 325, '17:30 - 12:00 = 330 phut, tru 5 phut dung sai');
  assert.equal(kq.so_cong, 0.5, '240 phut lam / nguong 480');
});

test('theo thu: ngay le van uu tien hon khung gio rieng', () => {
  const kq = tinh_cong_ngay({
    ...co_ban(T7, CA_HD, q(T7, '08:00', '12:00')),
    ngay_le: { huong_luong: true },
  });
  assert.equal(kq.trang_thai, 'ngay_le');
  assert.equal(kq.phut_ot, 0, 'lam ngay le ma khong dang ky thi khong tinh OT');
  assert.equal(kq.so_cong, 1);
});

test('ca_cua_ngay: tra dung khung gio cua thu, khong doi dung sai va ngay lam', () => {
  const t7 = ca_cua_ngay(CA_HD, T7);
  assert.equal(t7?.gio_ra, '12:00');
  assert.equal(t7?.nghi_tu, null);
  assert.equal(t7?.dung_sai_muon_phut, 5, 'chinh sach chung, khong doi theo thu');
  assert.deepEqual(t7?.cac_ngay_lam, [1, 2, 3, 4, 5, 6]);

  const t5 = ca_cua_ngay(CA_HD, T5);
  assert.equal(t5?.gio_ra, '17:30', 'thu khong khai -> khung gio goc');
  assert.equal(ca_cua_ngay(null, T7), null);
});

// ==================================================================== ngay di cong tac
//
// Truoc khi co nhanh nay, mot nguoi di cong tac ca tuan hien la VANG ca tuan: khong co lan
// quet nao, va bo tinh cong khong biet ly do. Ke toan nhin bang do thi tru cong that.

test('cong tac: khong co lan quet nao van duoc mot cong, khong phai vang', () => {
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, []),
    cong_tac: { noi_den: 'Hà Nội' },
  });
  assert.equal(kq.trang_thai, 'cong_tac');
  assert.equal(kq.so_cong, 1);
  assert.equal(kq.phut_muon, 0, 'khong co gio chuan de doi chieu thi khong duoc phat di muon');
  assert.equal(kq.phut_ve_som, 0);
  assert.match(kq.ghi_chu ?? '', /Hà Nội/, 'ghi chu phai noi di dau');
});

test('cong tac: khong co noi den van chay, ghi chu goi la "Di cong tac"', () => {
  const kq = tinh_cong_ngay({ ...co_ban(T5, CA_HC, []), cong_tac: { noi_den: null } });
  assert.equal(kq.trang_thai, 'cong_tac');
  assert.equal(kq.so_cong, 1);
});

test('cong tac: co quet the trong ngay cong tac thi ghi chu lai, khong bao loi', () => {
  // Ghe qua van phong roi di la chuyen binh thuong. Mot lan quet trong ngay cong tac la thong
  // tin, khong phai loi.
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, q(T5, '08:00', '09:00')),
    cong_tac: { noi_den: 'Đà Nẵng' },
  });
  assert.equal(kq.trang_thai, 'cong_tac');
  assert.equal(kq.so_cong, 1);
  assert.match(kq.ghi_chu ?? '', /quet the/i);
});

test('cong tac: co don lam them thi van tinh OT', () => {
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, q(T5, '08:00', '19:00')),
    cong_tac: { noi_den: 'Hải Phòng' },
    lam_them: ot(['17:00', '19:00']),
  });
  assert.equal(kq.trang_thai, 'cong_tac');
  assert.equal(kq.so_cong, 1);
  assert.equal(kq.phut_ot, 120);
});

test('cong tac: NGHI PHEP thang cong tac', () => {
  // Hai don trum cung mot ngay la du lieu mau thuan. Nghi phep la thu nguoi lao dong duoc
  // huong nen no thang — va con so cong khong bi tinh hai lan.
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, []),
    nghi_phep: { loai: 'phep_nam', nua_ngay: false },
    cong_tac: { noi_den: 'Hà Nội' },
  });
  assert.equal(kq.trang_thai, 'nghi_phep');
});

test('cong tac: NGAY LE thang cong tac', () => {
  // Cong tac trum mot ngay le thi nguoi do van duoc huong ngay le.
  const kq = tinh_cong_ngay({
    ...co_ban(T5, CA_HC, []),
    ngay_le: { huong_luong: true },
    cong_tac: { noi_den: 'Hà Nội' },
  });
  assert.equal(kq.trang_thai, 'ngay_le');
});

test('cong tac: NGAY NGHI TUAN thang cong tac', () => {
  // Cong tac vao ngay nghi tuan khong bien ngay do thanh ngay cong. Neu that su lam viec hom
  // do thi co lan quet, va OT tinh theo don lam them da duyet.
  const kq = tinh_cong_ngay({
    ...co_ban(T7, CA_HC, []),
    cong_tac: { noi_den: 'Hà Nội' },
  });
  assert.equal(kq.trang_thai, 'nghi_tuan');
  assert.equal(kq.so_cong, 0);
});
