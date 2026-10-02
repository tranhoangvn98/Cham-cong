// Nap lai 7 user cua may Kho (NYU7261300256) xuong may theo mapping da chot 01/10/2026:
//   PIN 1    -> IT-01  Phan Song Hao   -> "Phan Song Hao"
//   PIN 2    -> ERP147 Hoang Minh Ngoc -> "Hoang Minh Ngoc"
//   PIN 6    -> ERP120 Nguyen Hai Yen  -> "Nguyen Hai Yen"
//   PIN 1000 -> ERP161 Nguyen Duy Danh -> "Nguyen Duy Danh"
//   PIN 1001 -> ERP159 Phuong Van Nam  -> "Phuong Van Nam"
//   PIN 1002 -> ERP158 Hoang Van Mon   -> "Hoang Van Mon"
//   PIN 1003 -> ERP160 Nguyen Ngoc Vinh-> "Nguyen Ngoc Vinh"
//
// Co che: xep lenh `DATA UPDATE USERINFO PIN=... Name=... Pri=...` vao bang `lenh_thiet_bi`.
// May nhan lenh o lan ket noi /cdata ke tiep (thuong duoi 10 giay neu may dang online).
// Pri GIU NGUYEN theo quyen ma may khai (PIN 1/2/6 = 14, con lai = 0).
// Van tay/khuon mat nam o bang template rieng cua may nen lenh nay chi doi ten/quyen,
// KHONG lam mat du lieu sinh trac hoc.
// CHAY TRONG CONTAINER may_chu.
// ============================================================================

import { xep_lenh } from '/app/may_chu/dist/adms/tuyen.js';
import { truy_van, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';

const SERIAL_KHO = 'NYU7261300256';

// pin -> [nhan_vien_id, ten_ascii]
const DS = [
  ['1', 'edf8437b-8190-446b-8f2b-fad3f75f4703', 'Phan Song Hao'],
  ['2', '458bc5df-75be-4bc6-82ba-0608a695adc2', 'Hoang Minh Ngoc'],
  ['6', '4ad84ca4-2b4b-4c9f-b703-ac3ecd4356aa', 'Nguyen Hai Yen'],
  ['1000', '4ad11918-edee-4495-a71d-f63a8e6cc8ba', 'Nguyen Duy Danh'],
  ['1001', '90825d87-89eb-4611-a8d0-382c8d20f8fd', 'Phuong Van Nam'],
  ['1002', '7db545b1-8d86-46e6-9ba7-0075d297f22f', 'Hoang Van Mon'],
  ['1003', 'f6a37afd-8cb4-4ca0-939c-4ef1bc9fae0b', 'Nguyen Ngoc Vinh'],
];

// ---------------------------------------------------------------- hang rao: may dang bat
const may = await truy_van_mot(
  'select ten, dang_bat, thay_lan_cuoi from thiet_bi where serial = $1', [SERIAL_KHO],
);
if (may === null) { console.error('Chua khai bao may Kho.'); process.exit(1); }
if (!may.dang_bat) {
  console.error(`May "${may.ten}" dang tat — lenh se khong bao gio duoc nhan. Bat may truoc.`);
  process.exit(1);
}
console.log(`May: ${may.ten} — thay lan cuoi: ${may.thay_lan_cuoi === null ? '(chua bao gio)' : may.thay_lan_cuoi}`);

// ---------------------------------------------------------------- hang rao: PIN phai dung chu
for (const [pin, id, ten] of DS) {
  const d = await truy_van_mot(
    `select nv.ma_nv, nv.ho_ten from ma_dinh_danh md join nhan_vien nv on nv.id = md.nhan_vien_id
      where md.he_thong = 'may_cham_cong' and md.ma_chuan = $1 and md.hieu_luc_den is null
        and md.nhan_vien_id = $2`,
    [pin, id],
  );
  if (d === null) {
    console.error(`DUNG: PIN ${pin} khong phai cua ${ten} (nhan_vien_id ${id}) trong ma_dinh_danh.`);
    process.exit(1);
  }
  console.log(`  PIN ${pin} -> ${d.ma_nv} ${d.ho_ten}: dung chu.`);
}

// ---------------------------------------------------------------- xep lenh
console.log('=== Xep lenh nap user xuong may Kho ===');
for (const [pin, id, ten] of DS) {
  // Giu nguyen quyen ma may khai (PIN 1/2/6 la quan ly = 14, con lai = 0).
  const q = await truy_van_mot(
    'select quyen from may_nguoi_dung where thiet_bi_serial = $1 and pin = $2',
    [SERIAL_KHO, pin],
  );
  const quyen = q?.quyen ?? 0;
  const lenh = `DATA UPDATE USERINFO PIN=${pin}\tName=${ten}\tPri=${quyen}\tPasswd=\tCard=\tGrp=1\tTZ=0000000000000000`;
  const lenh_id = await xep_lenh(SERIAL_KHO, lenh);
  console.log(`  PIN ${pin}: lenh ${lenh_id} (Pri=${quyen})`);
}

console.log('XONG. May nhan lenh o lan ket noi ke tiep (thuong duoi 10 giay).');
process.exit(0);
