// Khai bao may cham cong Kho Trung Quoc (zFace1100, serial CGT1254800127)
// va cap PIN dai 5000-5999 cho 5 nhan vien dang hoat dong cua Phong Kho TQ.
//
// CHAY TRONG CONTAINER may_chu (import /app/may_chu/dist/**).
// Idempotent: insert thiet_bi on conflict do nothing; gan_ma tu bao 'da_co'.
//
// Luu y:
//   * ERP27 Van Anh dang giu PIN 43 (may cham cong, toan cong ty) — may_cham_cong
//     cho phep nhieu ma nen giu ca hai. Khi Nap NV cho may TQ phai chon PIN 5000.
//   * Dong ho may TQ phai de GIO BAC KINH (+8). Khong bam nut "Dong bo gio" tren
//     web cho may nay vi lenh do day gio Viet Nam (+7) xuong may.
// ============================================================================

import { gan_ma } from '/app/may_chu/dist/dinh_danh/nghiep_vu.js';
import { thuc_thi, truy_van } from '/app/may_chu/dist/csdl/ket_noi.js';

const SERIAL = 'CGT1254800127';
const GHI_CHU = `Hệ thống cấp cho máy Kho Trung Quốc (${SERIAL})`;

// ---------------------------------------------------------------- 1. khai may
const them = await thuc_thi(
  `insert into thiet_bi (serial, ten, vi_tri, pin_tu, pin_den)
   values ($1, 'Kho Trung Quốc', 'Kho Trung Quốc', 5000, 5999)
   on conflict (serial) do nothing`,
  [SERIAL],
);
console.log(`thiet_bi: ${them === 1 ? 'DA KHAI MOI' : 'da co san (bo qua)'}`);

// ---------------------------------------------------------------- 2. cap PIN
const NGUOI = [
  ['496eb901-45b0-45a2-adc9-97e6f0684c87', 'ERP27', '5000'],
  ['257606d9-77c9-4c8c-b475-c1fc9a6a5c20', 'ERP33', '5001'],
  ['dd491aa3-e1d9-4f73-9e65-a857acc3493e', 'ERP95', '5002'],
  ['ac8ff08c-a90b-43bb-88d1-4c09d842661f', 'ERP96', '5003'],
  ['efc4aec0-2d47-42fb-8d03-8b286918fd5e', 'ERP97', '5004'],
];
for (const [id, ma_nv, pin] of NGUOI) {
  const kq = await gan_ma(id, 'may_cham_cong', pin, {
    nguon: 'nguoi_khai',
    ghi_chu: GHI_CHU,
  });
  console.log(`${ma_nv} PIN ${pin}: ${kq.ket_cuc}`);
}

// ---------------------------------------------------------------- 3. kiem tra
const tb = await truy_van(
  `select serial, ten, vi_tri, dang_bat, pin_tu, pin_den,
          thay_lan_cuoi is not null as da_goi
     from thiet_bi where serial = $1`,
  [SERIAL],
);
console.log('=== thiet_bi ===');
console.table(tb);

const md = await truy_van(
  `select md.ma_chuan as pin, nv.ma_nv, nv.ho_ten
     from ma_dinh_danh md join nhan_vien nv on nv.id = md.nhan_vien_id
    where md.he_thong = 'may_cham_cong' and md.hieu_luc_den is null
      and md.ma_chuan in ('5000','5001','5002','5003','5004')
    order by md.ma_chuan::int`,
);
console.log('=== ma dinh danh ===');
console.table(md);

console.log('XONG.');
process.exit(0);
