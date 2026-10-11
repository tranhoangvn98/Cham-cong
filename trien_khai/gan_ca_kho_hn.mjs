// TAO CA + TINH LAI CONG KHO HA NOI (09/10/2026).
//
// Boi canh: 5 nguoi Kho HN (ERP158-162) chua co ca -> ngay lam T2-T6 quet moi tinh duoc,
// T7/CN quet bi 'nghi_tuan' 0 cong. HR chot: ca chinh thuc 08:00-17:30 thu 2 - thu 7
// (khoi kho_hn da dat T7 nguyen cong truoc do). OT sang 06:00-08:00 khi co xe hang ve la
// NGOAI CA - van di theo luong don lam them da duyet nhu hien tai (khong tu dong tra OT).
//
// Cac buoc: tao ca 'Kho Ha Noi' (08:00-17:30, T2-T7) -> gan 5 nguoi -> tinh lai cong
// thang 9 + dau thang 10 -> tinh lai ky luong thang 9 (kho_hn chuan rieng 25).
//
// CHAY TRONG CONTAINER may_chu:
//   docker compose cp trien_khai/gan_ca_kho_hn.mjs may_chu:/tmp/
//   docker compose exec may_chu node /tmp/gan_ca_kho_hn.mjs
import { truy_van, truy_van_mot, thuc_thi } from '/app/may_chu/dist/csdl/ket_noi.js';
import { tinh_lai_khoang } from '/app/may_chu/dist/cong/tinh_cong.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';

const kl = await truy_van_mot(`select id, trang_thai from ky_luong where thang = '2026-09'`);
if (kl === null || kl.trang_thai !== 'nhap') {
  console.error('DUNG: ky 2026-09 khong o trang thai nhap.');
  process.exit(1);
}

// --- 1. Tao ca 'Kho Ha Noi' neu chua co
let ca = await truy_van_mot(`select id from ca_lam where ten = 'Kho Hà Nội'`);
if (ca === null) {
  ca = await truy_van_mot(
    `insert into ca_lam (ten, gio_vao, gio_ra, nghi_tu, nghi_den, phut_du_cong, cac_ngay_lam)
     values ('Kho Hà Nội', '08:00:00', '17:30:00', '12:00:00', '13:30:00', 420, '{1,2,3,4,5,6}')
     returning id`,
  );
  console.log('Da tao ca moi: Kho Hà Nội (08:00-17:30, T2-T7).');
} else {
  console.log('Ca Kho Hà Nội da co, dung lai.');
}

// --- 2. Gan ca cho 5 nguoi Kho HN
const ds = await truy_van(
  `select id, ma_nv from nhan_vien
    where dang_hoat_dong = true and khoi_id = (select id from khoi where ma = 'kho_hn')`,
);
if (ds.length !== 5) {
  console.error(`DUNG: kho_hn dang co ${ds.length} nguoi hoat dong (mong doi 5).`);
  process.exit(1);
}
for (const nv of ds) {
  await thuc_thi(`update nhan_vien set ca_lam_id = $1 where id = $2`, [ca.id, nv.id]);
}
console.log(`Da gan ca cho ${ds.length} nguoi: ${ds.map((x) => x.ma_nv).join(', ')}`);

// --- 3. Tinh lai cong thang 9 + dau thang 10
for (const nv of ds) {
  const so9 = await tinh_lai_khoang('2026-09-01', '2026-09-30', nv.id);
  const so10 = await tinh_lai_khoang('2026-10-01', '2026-10-09', nv.id);
  console.log(`${nv.ma_nv}: tinh lai ${so9} o thang 9, ${so10} o dau thang 10.`);
}

// --- 4. Tinh lai ky luong thang 9
const so_phieu = await tinh_ky_luong(kl.id, '2026-09');
console.log(`Da tinh lai ${so_phieu} phieu luong thang 2026-09.`);
