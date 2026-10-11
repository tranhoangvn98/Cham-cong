#!/usr/bin/env node
// GAN LAI LUOT QUET SANG 10/09 CUA MAY SG CHO DUNG NGUOI (03/10/2026).
//
// Boi canh: may SG (2145254601578) lap dat giua ngay 10/09. Cac luot quet BUOI SANG cua PIN
// 3001/3002/3004/3005 den truoc khi PIN duoc gan nhan vien trong ma_dinh_danh (hieu luc tu
// 10/09) nen bi de nhan_vien_id = null -> bang cong 10/09 thieu gio vao (Ly/Tien/Van 0 cong,
// Son 0,5 cong). Luot quet chieu cung ngay da duoc gan dung, khong dung den.
//
// Gan lai theo dung ma_dinh_danh hien hanh roi tinh lai cong + phieu luong thang 9.
//
// CHAY TRONG CONTAINER may_chu:
//   docker compose cp trien_khai/gan_quet_sg_10_9.mjs may_chu:/app/
//   docker compose exec may_chu node /app/gan_quet_sg_10_9.mjs
import { tinh_lai_khoang } from '/app/may_chu/dist/cong/tinh_cong.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';
import { thuc_thi, truy_van, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';

const SERIAL_SG = '2145254601578';
// Pin may SG -> ma nv dung theo ma_dinh_danh hien hanh (da doi chieu CSDL 03/10/2026).
const PIN_NGUOI = [
  { pin: '3001', ma_nv: 'ERP148', ten: 'Lê Thị Thủy Tiên' },
  { pin: '3002', ma_nv: 'ERP157', ten: 'Nguyễn Thị Thảo Vân' },
  { pin: '3004', ma_nv: 'ERP125', ten: 'Vũ Thị Cẩm Ly' },
  { pin: '3005', ma_nv: 'ERP124', ten: 'Bùi Tiến Sơn' },
];
// Ngay 10/09 theo mui gio noi dat may (UTC+7): [09/09 17:00 UTC, 10/09 17:00 UTC).
const TU = '2026-09-09T17:00:00Z';
const DEN = '2026-09-10T17:00:00Z';

// --- hang rao: ky thang 9 phai con sua duoc
const kl = await truy_van_mot(
  `select id, trang_thai from ky_luong where thang = '2026-09'`,
);
if (kl === null || kl.trang_thai !== 'nhap') {
  console.error('DUNG: ky 2026-09 khong o trang thai nhap.');
  process.exit(1);
}

console.log('=== GAN LAI LUOT QUET SANG 10/09 MAY SG ===');
let tong = 0;
const nguoi_da_tinh = new Set();
for (const pn of PIN_NGUOI) {
  // Chu PIN hien hanh theo ma dinh danh (mac dinh cua he thong khi may day ATTLOG).
  const nv = await truy_van_mot(
    `select nv.id, nv.ma_nv
       from ma_dinh_danh md
       join nhan_vien nv on nv.id = md.nhan_vien_id
      where md.he_thong = 'may_cham_cong' and md.ma = $1
        and (md.hieu_luc_den is null or md.hieu_luc_den > now())
      order by md.hieu_luc_tu desc limit 1`,
    [pn.pin],
  );
  if (nv === null || nv.ma_nv !== pn.ma_nv) {
    console.error(`DUNG: PIN ${pn.pin} dang khong gan cho ${pn.ma_nv} (tim thay: ${nv?.ma_nv ?? 'khong co'}).`);
    process.exit(1);
  }

  const so = await thuc_thi(
    `update lan_quet set nhan_vien_id = $3
      where thiet_bi_serial = $1 and nguon = 'may' and pin_may = $2
        and nhan_vien_id is null
        and thoi_diem >= $4::timestamptz and thoi_diem < $5::timestamptz`,
    [SERIAL_SG, pn.pin, nv.id, TU, DEN],
  );
  tong += so;
  console.log(`  PIN ${pn.pin} -> ${pn.ma_nv} ${pn.ten}: gan ${so} luot quet.`);
  if (so > 0) nguoi_da_tinh.add(nv.id);
}
console.log(`Tong cong da gan ${tong} luot quet.`);

// --- tinh lai cong 10/09 cho nhung nguoi co luot quet moi gan
for (const id of nguoi_da_tinh) {
  const so = await tinh_lai_khoang('2026-09-10', '2026-09-10', id);
  console.log(`Tinh lai ${so} o bang cong 10/09.`);
}

// --- tinh lai phieu luong thang 9
const sp = await tinh_ky_luong(kl.id, '2026-09');
console.log(`Tinh lai ${sp} phieu luong thang 9.`);

// --- doi chieu ket qua
console.log('');
console.log('=== Bang cong 10/09 cua nhom SG ===');
console.table(await truy_van(
  `select nv.ma_nv, nv.ho_ten, bc.trang_thai,
          to_char(bc.gio_vao, 'HH24:MI') as gio_vao,
          to_char(bc.gio_ra, 'HH24:MI') as gio_ra,
          bc.phut_lam, bc.so_cong, bc.ghi_chu
     from bang_cong_ngay bc
     join nhan_vien nv on nv.id = bc.nhan_vien_id
    where nv.ma_nv = any($1) and bc.ngay = '2026-09-10'
    order by nv.ma_nv`,
  [PIN_NGUOI.map((pn) => pn.ma_nv)],
));
console.log('XONG.');
process.exit(0);
