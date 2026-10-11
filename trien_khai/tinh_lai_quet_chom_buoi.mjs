// Tinh lai cac o con mang marker cu "+1 cong buoi lam" (nghi phep co luong nua ngay ma quet
// chom sang buoi kia): so cong KHONG doi (van 1,0 = 0,5 phep + 0,5 buoi lam) nhung ghi chu
// duoc viet lai dung luat moi (+0.5 cong buoi lam). Cac o nghi KHONG luong cung loai da
// duoc sua rieng (ERP150) — script nay chi quet nhung gi con sot lai.
// CHAY TRONG CONTAINER may_chu:
//   docker compose cp trien_khai/tinh_lai_quet_chom_buoi.mjs may_chu:/app/
//   docker compose exec may_chu node /app/tinh_lai_quet_chom_buoi.mjs
import { tinh_lai_khoang } from '/app/may_chu/dist/cong/tinh_cong.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';
import { truy_van, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';

// Hang rao: ky thang 9 phai con sua duoc.
const kl = await truy_van_mot(`select id, trang_thai from ky_luong where thang = '2026-09'`);
if (kl === null || kl.trang_thai !== 'nhap') {
  console.error('DUNG: ky 2026-09 khong o trang thai nhap.');
  process.exit(1);
}

const dong = await truy_van(
  `select distinct nhan_vien_id, ngay from bang_cong_ngay
    where ghi_chu like '%+1 cong buoi lam%' and ngay between '2026-09-01' and '2026-09-30'`,
);
for (const d of dong) {
  const so = await tinh_lai_khoang(d.ngay, d.ngay, d.nhan_vien_id);
  console.log(`Tinh lai ${d.nhan_vien_id} ${d.ngay}: ${so} ngay`);
}
console.log(`Da tinh lai ${dong.length} o.`);

const sp = await tinh_ky_luong(kl.id, '2026-09');
console.log(`Tinh lai ${sp} phieu luong thang 9.`);
process.exit(0);
