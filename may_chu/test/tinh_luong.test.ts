// Kiem bo tinh luong bang so tinh tay.
//
// Day la cho sai thi mat tien that cua nguoi that, nen moi con so mong doi o duoi deu
// duoc dan giai trong ghi chu — nguoi doc sau phai kiem lai duoc bang may tinh bo tui,
// khong phai tin vao ma nguon.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { tinh_phieu_luong, thue_luy_tien, tran_bhxh_bhyt, tran_bhtn } =
  await import('../src/luong/tinh_luong.ts');
type ThamSoLuong = Awaited<typeof import('../src/luong/tinh_luong.ts')> extends never
  ? never : Parameters<typeof tinh_phieu_luong>[1];

/** Bieu thue luy tien 7 bac (Luat Thue TNCN 2007 Dieu 22). */
const BAC_THUE = [
  { bac: 1, tu_muc: 0, den_muc: 5_000_000, thue_suat: 5 },
  { bac: 2, tu_muc: 5_000_000, den_muc: 10_000_000, thue_suat: 10 },
  { bac: 3, tu_muc: 10_000_000, den_muc: 18_000_000, thue_suat: 15 },
  { bac: 4, tu_muc: 18_000_000, den_muc: 32_000_000, thue_suat: 20 },
  { bac: 5, tu_muc: 32_000_000, den_muc: 52_000_000, thue_suat: 25 },
  { bac: 6, tu_muc: 52_000_000, den_muc: 80_000_000, thue_suat: 30 },
  { bac: 7, tu_muc: 80_000_000, den_muc: null, thue_suat: 35 },
];

const TS: ThamSoLuong = {
  luong_co_so: 2_340_000,
  luong_toi_thieu_vung: 4_960_000,
  ty_le_bhxh_nld: 8,
  ty_le_bhyt_nld: 1.5,
  ty_le_bhtn_nld: 1,
  ty_le_bhxh_nsdld: 17.5,
  ty_le_bhyt_nsdld: 3,
  ty_le_bhtn_nsdld: 1,
  giam_tru_ban_than: 11_000_000,
  giam_tru_phu_thuoc: 4_400_000,
  bac_thue: BAC_THUE,
};

const CO_BAN = {
  luong_co_ban: 20_000_000,
  phu_cap: 0,
  so_ngay_cong_chuan: 22,
  so_ngay_cong_thuc: 22,
  phut_ot: 0,
  he_so_ot: 1.5,
  thuong: 0,
  phu_cap_khac: 0,
  so_nguoi_phu_thuoc: 0,
  tru_khac: 0,
};

/** Mot dong khoan mac dinh — cac test chi ghi de phan minh dang kiem. */
const KHOAN_GOC = {
  ma: 'x',
  loai: 'thu_nhap' as const,
  cach_tinh: 'nhap_tay' as const,
  don_gia: null as number | null,
  don_gia_danh_muc: null as number | null,
  chiu_thue: true,
  so_luong: null as number | null,
  so_tien: null as number | null,
};

// ================================================================ thue luy tien
test('thue luy tien: moi bac chi danh vao PHAN nam trong bac do', () => {
  // 20tr: 5tr*5% + 5tr*10% + 8tr*15% + 2tr*20% = 250k + 500k + 1.2tr + 400k = 2.350.000
  assert.equal(thue_luy_tien(20_000_000, BAC_THUE), 2_350_000);
});

test('thue luy tien: dung ranh gioi bac khong bi tinh sang bac sau', () => {
  // Dung 5tr = het bac 1: 5tr*5% = 250.000
  assert.equal(thue_luy_tien(5_000_000, BAC_THUE), 250_000);
  // Dung 10tr = het bac 2: 250k + 5tr*10% = 750.000
  assert.equal(thue_luy_tien(10_000_000, BAC_THUE), 750_000);
});

test('thue luy tien: thu nhap tinh thue <= 0 thi khong co thue', () => {
  assert.equal(thue_luy_tien(0, BAC_THUE), 0);
  assert.equal(thue_luy_tien(-5_000_000, BAC_THUE), 0);
});

test('thue luy tien: bac cuoi khong co tran', () => {
  // 100tr: den het bac 6 la 80tr -> 250k+500k+1.2tr+2.8tr+5tr+8.4tr = 18.150.000
  // con 20tr o bac 7: 20tr*35% = 7.000.000 -> tong 25.150.000
  assert.equal(thue_luy_tien(100_000_000, BAC_THUE), 25_150_000);
});

test('thue luy tien: bac truyen vao lon xon van tinh dung', () => {
  const dao = [...BAC_THUE].reverse();
  assert.equal(thue_luy_tien(20_000_000, dao), 2_350_000);
});

// ================================================================ tran dong bao hiem
test('hai tran dong KHAC NHAU — nham la sai tien voi nguoi luong cao', () => {
  assert.equal(tran_bhxh_bhyt(TS), 46_800_000);  // 20 x 2.340.000
  assert.equal(tran_bhtn(TS), 99_200_000);       // 20 x 4.960.000 (luong toi thieu vung I)
});

test('luong vuot tran: BHXH bi kep, BHTN chua bi kep', () => {
  const kq = tinh_phieu_luong({ ...CO_BAN, luong_co_ban: 60_000_000 }, TS);
  // Muc dong BHXH/BHYT kep o 46.800.000
  assert.equal(kq.muc_dong_bh, 46_800_000);
  assert.equal(kq.bhxh_nld, 3_744_000);   // 46.8tr x 8%
  assert.equal(kq.bhyt_nld, 702_000);     // 46.8tr x 1.5%
  // BHTN tran la 99.2tr nen 60tr CHUA bi kep -> tinh tren ca 60tr
  assert.equal(kq.bhtn_nld, 600_000);     // 60tr x 1%
});

test('luong vuot ca hai tran thi ca hai deu bi kep', () => {
  const kq = tinh_phieu_luong({ ...CO_BAN, luong_co_ban: 120_000_000 }, TS);
  assert.equal(kq.bhxh_nld, 3_744_000);   // kep o 46.8tr
  assert.equal(kq.bhtn_nld, 992_000);     // kep o 99.2tr x 1%
});

// ================================================================ phieu luong day du
test('phieu luong day du: du cong, khong phu thuoc', () => {
  const kq = tinh_phieu_luong(CO_BAN, TS);

  assert.equal(kq.luong_theo_cong, 20_000_000);
  assert.equal(kq.tong_thu_nhap, 20_000_000);

  // Bao hiem NLD: 8% + 1.5% + 1% = 10.5% cua 20tr = 2.100.000
  assert.equal(kq.bhxh_nld, 1_600_000);
  assert.equal(kq.bhyt_nld, 300_000);
  assert.equal(kq.bhtn_nld, 200_000);

  // Giam tru = ban than 11tr + bao hiem 2.1tr = 13.100.000
  assert.equal(kq.giam_tru_tong, 13_100_000);
  // Thu nhap tinh thue = 20tr - 13.1tr = 6.900.000
  assert.equal(kq.thu_nhap_tinh_thue, 6_900_000);
  // Thue: 5tr*5% + 1.9tr*10% = 250.000 + 190.000 = 440.000
  assert.equal(kq.thue_tncn, 440_000);

  assert.equal(kq.tong_tru, 2_540_000);   // 2.1tr bao hiem + 440k thue
  assert.equal(kq.thuc_linh, 17_460_000);
});

test('mien thue TNCN (admin tich): thue = 0, van giu thu nhap tinh thue de doi chieu', () => {
  const thuong = tinh_phieu_luong(CO_BAN, TS);
  const mien = tinh_phieu_luong({ ...CO_BAN, mien_thue: true }, TS);

  assert.ok(thuong.thue_tncn > 0, 'binh thuong co thue');
  assert.equal(mien.thue_tncn, 0, 'mien thue -> thue = 0');
  // Thu nhap tinh thue KHONG bi xoa (chi thue = 0) — con doi chieu duoc.
  assert.equal(mien.thu_nhap_tinh_thue, thuong.thu_nhap_tinh_thue);
  // Thuc linh tang dung bang so thue duoc mien.
  assert.equal(mien.thuc_linh - thuong.thuc_linh, thuong.thue_tncn);
});

test('nguoi phu thuoc lam giam thue, moi nguoi 4.4tr', () => {
  const khong = tinh_phieu_luong(CO_BAN, TS);
  const hai = tinh_phieu_luong({ ...CO_BAN, so_nguoi_phu_thuoc: 2 }, TS);

  assert.equal(hai.giam_tru_tong - khong.giam_tru_tong, 8_800_000);
  // Thu nhap tinh thue con 6.9tr - 8.8tr < 0 -> khong phai nop thue
  assert.equal(hai.thu_nhap_tinh_thue, 0);
  assert.equal(hai.thue_tncn, 0);
  assert.ok(hai.thuc_linh > khong.thuc_linh);
});

test('nghi nua thang: luong theo cong giam, nhung MUC DONG BAO HIEM khong giam', () => {
  const kq = tinh_phieu_luong({ ...CO_BAN, so_ngay_cong_thuc: 11 }, TS);

  assert.equal(kq.luong_theo_cong, 10_000_000, 'lam nua thang thi huong nua luong');
  // Luat BHXH 2014 Dieu 89: dong theo tien luong GHI TRONG HOP DONG, khong theo thuc nhan.
  assert.equal(kq.muc_dong_bh, 20_000_000);
  assert.equal(kq.bhxh_nld, 1_600_000);
});

test('luong dong BH khai rieng (thap hon luong that): BH tinh tren muc khai', () => {
  // Luong that 20tr, nhung KHAI dong BH chi 5tr -> BH tinh tren 5tr, luong theo cong van tren 20tr.
  const kq = tinh_phieu_luong({ ...CO_BAN, luong_dong_bh: 5_000_000 }, TS);

  assert.equal(kq.luong_theo_cong, 20_000_000, 'luong theo cong KHONG doi theo muc dong BH');
  assert.equal(kq.luong_dong_bh, 5_000_000, 'can cu dong BH = muc khai');
  assert.equal(kq.muc_dong_bh, 5_000_000);
  assert.equal(kq.bhxh_nld, 400_000);  // 5tr x 8%
  assert.equal(kq.bhyt_nld, 75_000);   // 5tr x 1.5%
  assert.equal(kq.bhtn_nld, 50_000);   // 5tr x 1%
  assert.equal(kq.bhxh_nsdld, 875_000); // 5tr x 17.5%
});

test('luong dong BH khong khai (null / 0): dong theo luong that nhu cu', () => {
  const mac_dinh = tinh_phieu_luong(CO_BAN, TS);
  const bang_null = tinh_phieu_luong({ ...CO_BAN, luong_dong_bh: null }, TS);
  const bang_khong = tinh_phieu_luong({ ...CO_BAN, luong_dong_bh: 0 }, TS);

  assert.equal(bang_null.luong_dong_bh, 20_000_000);
  assert.equal(bang_null.bhxh_nld, mac_dinh.bhxh_nld);
  assert.equal(bang_khong.bhxh_nld, mac_dinh.bhxh_nld);
});

test('luong dong BH khai cao vuot tran: van bi kep o tran', () => {
  const kq = tinh_phieu_luong({ ...CO_BAN, luong_dong_bh: 60_000_000 }, TS);
  assert.equal(kq.muc_dong_bh, 46_800_000, 'BHXH/BHYT kep o 20 lan luong co so');
  assert.equal(kq.bhxh_nld, 3_744_000);
});

test('mien bao hiem (thu viec / thuc tap): moi khoan BH deu 0, khong tru vao luong', () => {
  const kq = tinh_phieu_luong({ ...CO_BAN, dong_bao_hiem: false }, TS);
  assert.equal(kq.luong_dong_bh, 0);
  assert.equal(kq.muc_dong_bh, 0);
  assert.equal(kq.bhxh_nld, 0);
  assert.equal(kq.bhyt_nld, 0);
  assert.equal(kq.bhtn_nld, 0);
  assert.equal(kq.bhxh_nsdld, 0, 'phan doanh nghiep cung 0');
  // Mien BH thi giam tru truoc thue chi con ban than + phu thuoc (khong con BH).
  const co_bh = tinh_phieu_luong(CO_BAN, TS);
  assert.ok(kq.thuc_linh > co_bh.thuc_linh, 'mien BH -> thuc linh cao hon');
});

test('mien bao hiem TRUM CA luong dong BH khai rieng', () => {
  const kq = tinh_phieu_luong({ ...CO_BAN, luong_dong_bh: 5_000_000, dong_bao_hiem: false }, TS);
  assert.equal(kq.bhxh_nld, 0, 'da mien thi khai rieng cung khong dong');
});

test('lam them gio: tinh theo don gia gio cua thang, nhan he so', () => {
  // 22 ngay x 8h = 176 gio chuan. Don gia gio = 20tr/176 = 113.636,36
  // 10 gio OT x 1.5 = 113.636,36 x 10 x 1.5 = 1.704.545 (lam tron)
  const kq = tinh_phieu_luong({ ...CO_BAN, phut_ot: 600 }, TS);
  assert.equal(kq.tien_ot, 1_704_545);
  assert.equal(kq.tong_thu_nhap, 21_704_545);
});

test('thuong va phu cap khac vao thu nhap chiu thue, khong vao muc dong bao hiem', () => {
  const kq = tinh_phieu_luong({ ...CO_BAN, thuong: 5_000_000 }, TS);
  assert.equal(kq.tong_thu_nhap, 25_000_000);
  // Muc dong bao hiem van la luong hop dong 20tr, thuong khong lam tang
  assert.equal(kq.muc_dong_bh, 20_000_000);
  assert.equal(kq.bhxh_nld, 1_600_000);
  // Nhung thue thi tang: thu nhap tinh thue = 25tr - 13.1tr = 11.9tr
  assert.equal(kq.thu_nhap_tinh_thue, 11_900_000);
});

test('luong thap hon giam tru thi khong phai nop thue, khong am', () => {
  const kq = tinh_phieu_luong({ ...CO_BAN, luong_co_ban: 8_000_000 }, TS);
  assert.equal(kq.thu_nhap_tinh_thue, 0);
  assert.equal(kq.thue_tncn, 0);
  assert.ok(kq.thuc_linh > 0);
});

test('tru khac (tam ung) tru vao thuc linh, KHONG lam giam thue', () => {
  const khong = tinh_phieu_luong(CO_BAN, TS);
  const co = tinh_phieu_luong({ ...CO_BAN, tru_khac: 1_000_000 }, TS);

  assert.equal(co.thue_tncn, khong.thue_tncn, 'tam ung khong phai chi phi duoc tru thue');
  assert.equal(khong.thuc_linh - co.thuc_linh, 1_000_000);
});

test('nghi ca thang: khong co luong theo cong nhung van phai dong bao hiem', () => {
  const kq = tinh_phieu_luong({ ...CO_BAN, so_ngay_cong_thuc: 0 }, TS);
  assert.equal(kq.luong_theo_cong, 0);
  assert.equal(kq.tong_thu_nhap, 0);
  assert.equal(kq.bhxh_nld, 1_600_000);
  // Thuc linh AM: nguoi lao dong con no tien bao hiem. Phai hien ra chu khong duoc gim
  // ve 0 — ke toan can thay de con xu ly.
  assert.ok(kq.thuc_linh < 0, 'thuc linh am phai hien dung, khong duoc lam tron ve 0');
});

test('so ngay cong chuan = 0 khong lam vo phep chia', () => {
  const kq = tinh_phieu_luong({ ...CO_BAN, so_ngay_cong_chuan: 0, so_ngay_cong_thuc: 0 }, TS);
  assert.equal(kq.luong_theo_cong, 0);
  assert.equal(kq.tien_ot, 0);
  assert.ok(Number.isFinite(kq.thuc_linh));
});

test('doi ty le trich trong tham so thi ket qua doi theo — khong hang so trong ma', () => {
  const ts_moi = { ...TS, ty_le_bhxh_nld: 10 };
  const kq = tinh_phieu_luong(CO_BAN, ts_moi);
  assert.equal(kq.bhxh_nld, 2_000_000, '20tr x 10%');
});

test('moi so tien deu la so nguyen dong — khong co xu le', () => {
  const kq = tinh_phieu_luong({
    ...CO_BAN,
    luong_co_ban: 17_777_777,
    phut_ot: 137,
    // Ca ba cach tinh khoan deu phai ra so nguyen. `nua_ngay_luong` chia doi mot so le la
    // cho de sinh ra xu le nhat.
    khoan: [
      { ...KHOAN_GOC, ma: 'a', cach_tinh: 'nhap_tay', so_tien: 333_333 },
      { ...KHOAN_GOC, ma: 'b', cach_tinh: 'so_luong_x_don_gia', so_luong: 7, don_gia: 30_001 },
      { ...KHOAN_GOC, ma: 'c', loai: 'tru', cach_tinh: 'nua_ngay_luong', so_luong: 3 },
    ],
  }, TS);

  for (const [ten, v] of Object.entries(kq)) {
    if (ten === 'cac_khoan') continue;
    assert.equal(Number.isInteger(v), true, `${ten} = ${String(v)} phai la so nguyen dong`);
  }
  assert.equal(kq.cac_khoan.length, 3);
  for (const k of kq.cac_khoan) {
    assert.equal(Number.isInteger(k.thanh_tien), true,
      `khoản ${k.ma} = ${k.thanh_tien} phai la so nguyen dong`);
    assert.equal(k.don_gia === null || Number.isInteger(k.don_gia), true,
      `đơn giá khoản ${k.ma} phai la so nguyen dong`);
  }
});

// ================================================================ cac khoan
//
// Bang luong that cua cong ty co 9 khoan thu nhap va 5 khoan tru. Cac test duoi kiem dung
// nhung cho de sai tien: co so tinh thue, khoan tinh theo cong thuc, va lam tron khi tra.

test('khoan MIEN THUE khong vao co so tinh thue TNCN', () => {
  // 20tr luong + 690k phu cap an trua (23 ngay x 30.000). An trua trong han muc thi khong
  // chiu thue (Thong tu 111/2013), nen thu nhap tinh thue van la 20tr - 11tr giam tru ban
  // than - 1,9tr bao hiem = 7,1tr. Neu tinh ca 690k thi thue cao hon that.
  const co_an_trua = tinh_phieu_luong({
    ...CO_BAN,
    khoan: [{
      ...KHOAN_GOC, ma: 'pc_an_trua', cach_tinh: 'so_luong_x_don_gia',
      so_luong: 23, don_gia: 30_000, chiu_thue: false,
    }],
  }, TS);

  const khong_khoan = tinh_phieu_luong(CO_BAN, TS);

  assert.equal(co_an_trua.khoan_thu_nhap, 690_000, '23 x 30.000');
  assert.equal(co_an_trua.thu_nhap_mien_thue, 690_000);
  assert.equal(co_an_trua.tong_thu_nhap, 20_690_000, '690k VAN la thu nhap, van duoc tra');
  assert.equal(co_an_trua.thu_nhap_tinh_thue, khong_khoan.thu_nhap_tinh_thue,
    'khoan mien thue khong duoc lam tang co so tinh thue');
  assert.equal(co_an_trua.thue_tncn, khong_khoan.thue_tncn);
  // Nguoi lao dong nhan them dung 690.000, khong bi thue an bot.
  assert.equal(co_an_trua.thuc_linh - khong_khoan.thuc_linh, 690_000);
});

test('khoan CHIU THUE thi vao co so tinh thue', () => {
  const kq = tinh_phieu_luong({
    ...CO_BAN,
    khoan: [{
      ...KHOAN_GOC, ma: 'pc_kpi', cach_tinh: 'nhap_tay', so_tien: 2_000_000, chiu_thue: true,
    }],
  }, TS);
  const khong_khoan = tinh_phieu_luong(CO_BAN, TS);

  assert.equal(kq.thu_nhap_mien_thue, 0);
  assert.equal(kq.thu_nhap_tinh_thue, khong_khoan.thu_nhap_tinh_thue + 2_000_000);
});

test('khoan TRU vao tong tru, khong lam giam co so tinh thue', () => {
  // Da tam ung 3tr: nguoi lao dong nhan it hon 3tr, nhung thu nhap chiu thue KHONG doi —
  // tam ung la tra truoc, khong phai giam thu nhap.
  const kq = tinh_phieu_luong({
    ...CO_BAN,
    khoan: [{
      ...KHOAN_GOC, ma: 'da_tam_ung', loai: 'tru', cach_tinh: 'nhap_tay', so_tien: 3_000_000,
    }],
  }, TS);
  const khong_khoan = tinh_phieu_luong(CO_BAN, TS);

  assert.equal(kq.khoan_tru, 3_000_000);
  assert.equal(kq.thu_nhap_tinh_thue, khong_khoan.thu_nhap_tinh_thue);
  assert.equal(kq.thue_tncn, khong_khoan.thue_tncn);
  assert.equal(kq.tong_tru, khong_khoan.tong_tru + 3_000_000);
  assert.equal(kq.thuc_linh, khong_khoan.thuc_linh - 3_000_000);
});

test('khoan "nua ngay luong" tinh theo luong CUA CHINH NGUOI DO', () => {
  // 22tr / 22 cong = 1.000.000 mot ngay -> nua ngay = 500.000; 3 lan = 1.500.000.
  const kq = tinh_phieu_luong({
    ...CO_BAN,
    luong_co_ban: 22_000_000,
    khoan: [{
      ...KHOAN_GOC, ma: 'tru_nua_ngay', loai: 'tru', cach_tinh: 'nua_ngay_luong', so_luong: 3,
    }],
  }, TS);

  assert.equal(kq.luong_ngay, 1_000_000);
  assert.equal(kq.khoan_tru, 1_500_000);
  assert.equal(kq.cac_khoan[0]!.don_gia, 500_000, 'don gia chup lai la nua ngay luong');

  // Nguoi luong thap hon thi so tien tru phai thap hon — khong phai mot don gia chung.
  const luong_thap = tinh_phieu_luong({
    ...CO_BAN,
    luong_co_ban: 11_000_000,
    khoan: [{
      ...KHOAN_GOC, ma: 'tru_nua_ngay', loai: 'tru', cach_tinh: 'nua_ngay_luong', so_luong: 3,
    }],
  }, TS);
  assert.equal(luong_thap.khoan_tru, 750_000);
});

test('khoan "so luong x don gia" uu tien don gia RIENG cua dong, khong co thi lay danh muc', () => {
  const theo_danh_muc = tinh_phieu_luong({
    ...CO_BAN,
    khoan: [{
      ...KHOAN_GOC, ma: 'pc_an_trua', cach_tinh: 'so_luong_x_don_gia',
      so_luong: 10, don_gia: null, don_gia_danh_muc: 30_000,
    }],
  }, TS);
  assert.equal(theo_danh_muc.khoan_thu_nhap, 300_000);

  const theo_dong = tinh_phieu_luong({
    ...CO_BAN,
    khoan: [{
      ...KHOAN_GOC, ma: 'pc_an_trua', cach_tinh: 'so_luong_x_don_gia',
      so_luong: 10, don_gia: 35_000, don_gia_danh_muc: 30_000,
    }],
  }, TS);
  assert.equal(theo_dong.khoan_thu_nhap, 350_000, 'don gia rieng cua dong phai thang');
});

test('lam tron thuc linh den 100 dong nhung GIU nguyen so goc', () => {
  const kq = tinh_phieu_luong({
    ...CO_BAN, luong_co_ban: 17_777_777, lam_tron_den: 100,
  }, TS);

  assert.notEqual(kq.thuc_linh, kq.thuc_linh_lam_tron, 'so nay phai co du le de kiem duoc');
  assert.equal(kq.thuc_linh_lam_tron % 100, 0);
  assert.equal(Math.abs(kq.thuc_linh_lam_tron - kq.thuc_linh) <= 50, true);
});

test('khong khai lam tron thi thuc linh lam tron BANG thuc linh', () => {
  const kq = tinh_phieu_luong({ ...CO_BAN, luong_co_ban: 17_777_777 }, TS);
  assert.equal(kq.thuc_linh_lam_tron, kq.thuc_linh);
});

test('khong co khoan nao thi moi tong ve 0 — bang luong cu tinh ra dung so cu', () => {
  const kq = tinh_phieu_luong(CO_BAN, TS);
  assert.equal(kq.khoan_thu_nhap, 0);
  assert.equal(kq.khoan_tru, 0);
  assert.equal(kq.thu_nhap_mien_thue, 0);
  assert.deepEqual(kq.cac_khoan, []);
  // 20tr, du cong: luong theo cong = 20tr, bao hiem NLD = 8+1.5+1 = 10.5% = 2.100.000
  // nhung BHTN co tran rieng (20 x 4.960.000 = 99,2tr) nen chua cham tran.
  assert.equal(kq.tong_thu_nhap, 20_000_000);
});

// ---------------------------------------------------------------- nua cong thu Bay
const { ngay_cong_chuan } = await import('../src/luong/ky_luong.ts');

// Thang 8/2025: thu Bay roi vao 2, 9, 16, 23, 30 (5 thu Bay). Ca lam T2-T7.
const LAM_T2_T7 = [1, 2, 3, 4, 5, 6];

test('cong chuan: thu Bay tinh nua cong khi bat he so 0,5', () => {
  const day_du = ngay_cong_chuan('2025-08-01', '2025-08-31', LAM_T2_T7, new Set(), 1);
  const nua = ngay_cong_chuan('2025-08-01', '2025-08-31', LAM_T2_T7, new Set(), 0.5);
  // Thang 8/2025 co 5 thu Bay. Moi thu Bay bot 0,5 cong -> chenh dung 2,5.
  assert.equal(day_du - nua, 2.5);
});

test('cong chuan: he so mac dinh = 1 (thu Bay van 1 cong khi khong truyen)', () => {
  const mac_dinh = ngay_cong_chuan('2025-08-01', '2025-08-31', LAM_T2_T7, new Set());
  const he_so_1 = ngay_cong_chuan('2025-08-01', '2025-08-31', LAM_T2_T7, new Set(), 1);
  assert.equal(mac_dinh, he_so_1);
});

test('cong chuan: khong lam thu Bay thi he so T7 khong anh huong', () => {
  const lam_t2_t6 = [1, 2, 3, 4, 5];
  const a = ngay_cong_chuan('2025-08-01', '2025-08-31', lam_t2_t6, new Set(), 1);
  const b = ngay_cong_chuan('2025-08-01', '2025-08-31', lam_t2_t6, new Set(), 0.5);
  assert.equal(a, b);
});
