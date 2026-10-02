// CHUYEN 20 LUOT QUET PIN 6 MAY KHO (21-30/09) MOI DAY VE TU TIEN SANG YEN (02/10/2026).
//
// Boi canh: may Kho offline 20/09-02/10; log ket 21-30/09 ve hom nay duoc map tu dong
// theo ma dinh danh hieu luc TAI THOI DIEM quet — luc do PIN 6 con thuoc ERP2 (Tien),
// nhung HR da chot (01/10): PIN 6 may Kho la ERP120 Yen tu 01/09. Chuyen lai theo chot.
//
// CHAY TRONG CONTAINER may_chu:
//   docker compose cp trien_khai/chuyen_pin6_kho_ngay_muon_ve.mjs may_chu:/app/
//   docker compose exec may_chu node /app/chuyen_pin6_kho_ngay_muon_ve.mjs
import { tinh_lai_khoang } from '/app/may_chu/dist/cong/tinh_cong.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';
import { thuc_thi, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';

const SERIAL_KHO = 'NYU7261300256';
const ID_YEN = '4ad84ca4-2b4b-4c9f-b703-ac3ecd4356aa'; // ERP120
const ID_TIEN = '3df27c31-79c0-49e8-acc2-83652ecaeefb'; // ERP2

// --- hang rao: ky thang 9 phai con sua duoc
const kl = await truy_van_mot(
  `select id, trang_thai from ky_luong where thang = '2026-09'`,
);
if (kl === null || kl.trang_thai !== 'nhap') {
  console.error('DUNG: ky 2026-09 khong o trang thai nhap.');
  process.exit(1);
}

// --- 1. chuyen 20 luot PIN 6 may Kho 21-30/09 tu Tien sang Yen
const n = await thuc_thi(
  `update lan_quet set nhan_vien_id = $3
    where thiet_bi_serial = $1 and nguon = 'may' and pin_may = '6'
      and nhan_vien_id = $2
      and thoi_diem >= '2026-09-20T00:00:00Z' and thoi_diem < '2026-10-01T00:00:00Z'`,
  [SERIAL_KHO, ID_TIEN, ID_YEN],
);
console.log(`Da chuyen ${n} luot quet PIN 6 (21-30/09) tu ERP2 sang ERP120.`);

// --- 2. tinh lai cong thang 9 cho ca hai nguoi
const sY = await tinh_lai_khoang('2026-09-01', '2026-09-30', ID_YEN);
const sT = await tinh_lai_khoang('2026-09-01', '2026-09-30', ID_TIEN);
console.log(`Tinh lai ERP120: ${sY} o | ERP2: ${sT} o.`);

// --- 3. tinh lai phieu luong thang 9
const sp = await tinh_ky_luong(kl.id, '2026-09');
console.log(`Tinh lai ${sp} phieu luong thang 9.`);

process.exit(0);
