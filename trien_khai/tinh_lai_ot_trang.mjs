// Tinh lai cong 1/9 + 2/9 cua Trang (ERP109) sau khi sua luat OT khong can quet
// (ket qua OT da duyet -> phut OT theo gio dang ky), roi tinh lai ky luong thang 9.
// CHAY TRONG CONTAINER may_chu:
//   docker compose cp trien_khai/tinh_lai_ot_trang.mjs may_chu:/tmp/
//   docker compose exec may_chu node /tmp/tinh_lai_ot_trang.mjs
import { truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';
import { tinh_lai_ngay } from '/app/may_chu/dist/cong/tinh_cong.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';

const nv = await truy_van_mot(`select id from nhan_vien where ma_nv = 'ERP109'`);
if (nv === null) { console.error('DUNG: khong tim thay ERP109.'); process.exit(1); }
const k1 = await tinh_lai_ngay(nv.id, '2026-09-01');
const k2 = await tinh_lai_ngay(nv.id, '2026-09-02');
console.log(`tinh lai 01/09: ${k1 !== null ? JSON.stringify({ phut_ot: k1.phut_ot, tt: k1.trang_thai }) : 'null'}`);
console.log(`tinh lai 02/09: ${k2 !== null ? JSON.stringify({ phut_ot: k2.phut_ot, tt: k2.trang_thai }) : 'null'}`);

const kl = await truy_van_mot(`select id, trang_thai from ky_luong where thang = '2026-09'`);
if (kl !== null && kl.trang_thai === 'nhap') {
  const so = await tinh_ky_luong(kl.id, '2026-09');
  console.log(`da tinh lai ${so} phieu luong thang 2026-09.`);
}
