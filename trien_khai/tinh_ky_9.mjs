// Tinh lai ky luong 2026-09 tren VPS de phieu hien cong gom ngay le (24 = 22 + 2).
// Chay trong container may_chu:
//   docker compose cp tinh_ky_9.mjs may_chu:/tmp/tinh_ky_9.mjs
//   docker compose exec may_chu node /tmp/tinh_ky_9.mjs
import { truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';

const kl = await truy_van_mot(`select id, trang_thai from ky_luong where thang = '2026-09'`);
if (kl === null) { console.error('DUNG: khong co ky 2026-09'); process.exit(1); }
if (kl.trang_thai !== 'nhap') { console.error('DUNG: ky 2026-09 khong o trang thai nhap (' + kl.trang_thai + ')'); process.exit(1); }
const so = await tinh_ky_luong(kl.id, '2026-09');
console.log('DA TINH LAI ' + so + ' phieu thang 2026-09');
