// Tinh lai cong cho Trần Minh Anh (ERP150) cac ngay nghi KHONG luong nua ngay ma quet chom
// sang buoi kia (10/09 + 23/09/2026) sau ban sua quy_tac_tinh_cong (buoi lam toi da 0,5).
// CHAY TRONG CONTAINER may_chu:
//   docker compose cp trien_khai/tinh_lai_minh_anh.mjs may_chu:/app/
//   docker compose exec may_chu node /app/tinh_lai_minh_anh.mjs
import { tinh_lai_khoang } from '/app/may_chu/dist/cong/tinh_cong.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';
import { truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';

const ID_ERP150 = '4a453db3-6dfd-41fe-af48-3bb3e759a9c1';

// Hang rao: ky thang 9 phai con sua duoc.
const kl = await truy_van_mot(`select id, trang_thai from ky_luong where thang = '2026-09'`);
if (kl === null || kl.trang_thai !== 'nhap') {
  console.error('DUNG: ky 2026-09 khong o trang thai nhap.');
  process.exit(1);
}

for (const ngay of ['2026-09-10', '2026-09-23']) {
  const so = await tinh_lai_khoang(ngay, ngay, ID_ERP150);
  console.log(`Tinh lai ${ngay}: ${so} ngay`);
}

const sp = await tinh_ky_luong(kl.id, '2026-09');
console.log(`Tinh lai ${sp} phieu luong thang 9.`);
process.exit(0);
