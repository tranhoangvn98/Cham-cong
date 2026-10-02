// Gan 3 PIN may Kho da ro danh tinh (HR xac nhan 01/10/2026):
//   PIN 1 "Hao"    -> IT-01  Phan Song Hao   (dang giu PIN 31 o VP)
//   PIN 2 "Ngoc"   -> ERP147 Hoang Minh Ngoc (dang giu PIN 57 o VP; ho so dang bi khoa — xem chu y)
//   PIN 6 "Yenkho" -> ERP120 Nguyen Hai Yen  (dang giu PIN 20 o VP)
//
// CHAY TRONG CONTAINER may_chu. Luu y:
//   * ERP147 Hoang Minh Ngoc dang bi ghi "nghi viec 18/09/2026" (dang_hoat_dong = f).
//     Script van gan PIN theo chi dao cua HR; muon tinh cong phai mo lai ho so — viec nhan su.
//   * PIN 6 la ma TOAN CONG TY: gan cho Yen dong thoi thu hoi cua ERP2 (Tien). Neu Tien con
//     di lam o VP va quet PIN 6 se bi tinh cho Yen — can kiem lai voi HR.
//   * Thang 8 (29-31/08) nam trong ky luong DA DUYET: khong dong vao luot quet thang 8.
//     (PIN 6 con 11 luot quet thang 8 van gan cho ERP2; PIN 1 con 2 luot quet chua gan.)
// ============================================================================

import { gan_ma } from '/app/may_chu/dist/dinh_danh/nghiep_vu.js';
import { tinh_lai_khoang } from '/app/may_chu/dist/cong/tinh_cong.js';
import { thuc_thi, truy_van } from '/app/may_chu/dist/csdl/ket_noi.js';

const GHI_CHU = 'PIN may Kho theo danh sach HR 01/10/2026';
const SERIAL_KHO = 'NYU7261300256';

// ---------------------------------------------------------------- hang rao
const kl = await truy_van(
  "select thang, trang_thai from ky_luong where thang = '2026-09'",
);
if (kl.length === 0 || kl[0].trang_thai !== 'nhap') {
  console.error('DUNG: thang 2026-09 khong con o trang thai nhap.');
  process.exit(1);
}

// ---------------------------------------------------------------- gan 3 PIN
console.log('=== Gan PIN 1 -> IT-01 Phan Song Hao ===');
console.log(JSON.stringify(await gan_ma(
  'edf8437b-8190-446b-8f2b-fad3f75f4703', 'may_cham_cong', '1',
  { nguon: 'nguoi_khai', ghi_chu: GHI_CHU },
)));

console.log('=== Gan PIN 2 -> ERP147 Hoang Minh Ngoc ===');
console.log(JSON.stringify(await gan_ma(
  '458bc5df-75be-4bc6-82ba-0608a695adc2', 'may_cham_cong', '2',
  { nguon: 'nguoi_khai', ghi_chu: GHI_CHU },
)));

console.log('=== Gan PIN 6 -> ERP120 Nguyen Hai Yen (thu hoi cua ERP2) ===');
console.log(JSON.stringify(await gan_ma(
  '4ad84ca4-2b4b-4c9f-b703-ac3ecd4356aa', 'may_cham_cong', '6',
  { nguon: 'nguoi_khai', ghi_chu: GHI_CHU, thu_hoi_cua_nguoi_khac: true },
)));

// ---------------------------------------------------------------- gan lai luot quet thang 9
console.log('=== Gan lai 20 luot quet PIN 6 may Kho (tu 01/09) cho ERP120 ===');
const n = await thuc_thi(
  `update lan_quet set nhan_vien_id = $2
    where thiet_bi_serial = $1 and nguon = 'may' and pin_may = '6' and nhan_vien_id is null
      and (thoi_diem + interval '7 hours')::date >= '2026-09-01'`,
  [SERIAL_KHO, '4ad84ca4-2b4b-4c9f-b703-ac3ecd4356aa'],
);
console.log(`${n} luot quet`);

console.log('=== Tinh lai bang cong thang 9 cho ERP120 ===');
console.log(await tinh_lai_khoang('2026-09-01', '2026-09-30', '4ad84ca4-2b4b-4c9f-b703-ac3ecd4356aa'));

// ---------------------------------------------------------------- kiem tra
console.log('=== Kiem tra: ma dinh danh PIN 1/2/6 ===');
const md = await truy_van(
  `select md.ma_chuan as pin, nv.ma_nv, nv.ho_ten, md.hieu_luc_tu::date as tu,
          md.hieu_luc_den::date as den, md.ghi_chu
     from ma_dinh_danh md join nhan_vien nv on nv.id = md.nhan_vien_id
    where md.he_thong = 'may_cham_cong' and md.ma_chuan in ('1','2','6')
    order by md.ma_chuan::int, md.hieu_luc_tu`,
);
console.table(md);

console.log('=== Kiem tra: luot quet may Kho ===');
const lq = await truy_van(
  `select lq.pin_may, coalesce(nv.ma_nv, '(chua gan)') as ma_nv, count(*)::int as lan
     from lan_quet lq left join nhan_vien nv on nv.id = lq.nhan_vien_id
    where lq.nguon = 'may' and lq.thiet_bi_serial = $1
    group by 1, 2 order by lq.pin_may::int`,
  [SERIAL_KHO],
);
console.table(lq);

console.log('XONG.');
process.exit(0);
