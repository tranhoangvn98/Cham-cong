// Cap nhat ma PIN may Kho Ha Noi va may Sai Gon theo danh sach user moi (01/10/2026).
//
// CHAY TRONG CONTAINER may_chu (dung chinh cac module da bien dich), vi khong co mat khau
// admin de goi qua HTTP. Trinh tu:
//   1. Gan PIN 1000-1003 cho 4 nguoi Kho Ha Noi (gan_ma chinh thuc — co guard xung dot + dong bo
//      cot nhan_vien.pin_may).
//   2. Gan lai luot quet 1000-1003 dang "chua map" tren may Kho.
//   3. Chuyen luot quet PIN cu 3/4/5 tren may Kho (TU 01/09) tu nguoi VP sang nguoi Kho.
//      Thang 8 nam trong ky luong DA DUYET nen khong dong vao — phan thang 8 de HR quyet.
//   4. Bo gan luot quet PIN 6 may Kho (TU 01/09) khoi ERP2 (may khai ten "Yenkho").
//   5. Cap nhat bang may_nguoi_dung (anh chup user tren may) cho ca hai may.
//   6. Dat dai PIN may Kho 4000-4999 de "Cap PIN" tu dong khong trung VP.
//   7. Tinh lai bang cong thang 9 cho 8 nguoi anh huong.
//
// Hang rao truoc khi chay: thang 2026-09 phai con o trang thai 'nhap' (chua duyet luong).
// ============================================================================

import { gan_ma } from '/app/may_chu/dist/dinh_danh/nghiep_vu.js';
import { tinh_lai_khoang } from '/app/may_chu/dist/cong/tinh_cong.js';
import { thuc_thi, truy_van } from '/app/may_chu/dist/csdl/ket_noi.js';

const GHI_CHU = 'Khai PIN may Kho theo danh sach user doc tu may 01/10/2026';
const SERIAL_KHO = 'NYU7261300256';
const SERIAL_SG = '2145254601578';

const PIN_NV = [
  ['1000', '4ad11918-edee-4495-a71d-f63a8e6cc8ba', 'ERP161 Nguyen Duy Danh'],
  ['1001', '90825d87-89eb-4611-a8d0-382c8d20f8fd', 'ERP159 Phuong Van Nam'],
  ['1002', '7db545b1-8d86-46e6-9ba7-0075d297f22f', 'ERP158 Hoang Van Mon'],
  ['1003', 'f6a37afd-8cb4-4ca0-939c-4ef1bc9fae0b', 'ERP160 Nguyen Ngoc Vinh'],
];

// PIN cu tren may Kho -> nguoi that (khop danh sach may 31/08: 3=Ngocvinh, 4=Vanmon, 5=Vannam).
const PIN_CU = [
  ['3', 'f6a37afd-8cb4-4ca0-939c-4ef1bc9fae0b', 'ERP160 Nguyen Ngoc Vinh'],
  ['4', '7db545b1-8d86-46e6-9ba7-0075d297f22f', 'ERP158 Hoang Van Mon'],
  ['5', '90825d87-89eb-4611-a8d0-382c8d20f8fd', 'ERP159 Phuong Van Nam'],
];

// 8 nguoi can tinh lai thang 9: 4 nguoi Kho (duoc cong) + 3 nguoi VP bi gan nham + ERP2.
const TINH_LAI = [
  ['4ad11918-edee-4495-a71d-f63a8e6cc8ba', 'ERP161 Nguyen Duy Danh'],
  ['90825d87-89eb-4611-a8d0-382c8d20f8fd', 'ERP159 Phuong Van Nam'],
  ['7db545b1-8d86-46e6-9ba7-0075d297f22f', 'ERP158 Hoang Van Mon'],
  ['f6a37afd-8cb4-4ca0-939c-4ef1bc9fae0b', 'ERP160 Nguyen Ngoc Vinh'],
  ['96da76c5-8096-4bd9-9e87-ea1411842f6d', 'ERP114 Le Khac Minh'],
  ['a5349442-2439-4d2f-ab28-39f6f476b94a', 'ERP4 Tran Hoang Anh Vinh'],
  ['4b41e6ca-d3b2-452f-8ff1-f5ce4b8e3d6b', 'ERP16 Khuat Thi Kim Thu'],
  ['3df27c31-79c0-49e8-acc2-83652ecaeefb', 'ERP2 Nguyen Viet Minh Tien'],
];

// ---------------------------------------------------------------- hang rao
const kl = await truy_van(
  "select thang, trang_thai from ky_luong where thang in ('2026-08', '2026-09') order by thang",
);
console.log('Ky luong:', kl);
const thang9 = kl.find((k) => k.thang === '2026-09');
if (thang9 === undefined || thang9.trang_thai !== 'nhap') {
  console.error('DUNG: thang 2026-09 khong con o trang thai nhap. Khong sua duoc.');
  process.exit(1);
}

// ---------------------------------------------------------------- 1. gan PIN 1000-1003
console.log('=== 1. Gan PIN 1000-1003 ===');
for (const [pin, id, ten] of PIN_NV) {
  const kq = await gan_ma(id, 'may_cham_cong', pin, { nguon: 'nguoi_khai', ghi_chu: GHI_CHU });
  console.log(`PIN ${pin} -> ${ten}: ${JSON.stringify(kq)}`);
}

// ---------------------------------------------------------------- 2. gan lai luot quet 1000-1003
console.log('=== 2. Gan lai luot quet chua map 1000-1003 (may Kho, tu 01/09) ===');
for (const [pin, id, ten] of PIN_NV) {
  const n = await thuc_thi(
    `update lan_quet set nhan_vien_id = $2
      where thiet_bi_serial = $1 and nguon = 'may' and pin_may = $3 and nhan_vien_id is null
        and (thoi_diem + interval '7 hours')::date >= '2026-09-01'`,
    [SERIAL_KHO, id, pin],
  );
  console.log(`PIN ${pin} -> ${ten}: ${n} luot quet`);
}

// ---------------------------------------------------------------- 3. PIN cu 3/4/5
console.log('=== 3. Chuyen luot quet PIN cu 3/4/5 may Kho (tu 01/09) sang nguoi Kho ===');
for (const [pin, id, ten] of PIN_CU) {
  const n = await thuc_thi(
    `update lan_quet set nhan_vien_id = $2
      where thiet_bi_serial = $1 and nguon = 'may' and pin_may = $3
        and (thoi_diem + interval '7 hours')::date >= '2026-09-01'`,
    [SERIAL_KHO, id, pin],
  );
  console.log(`PIN ${pin} -> ${ten}: ${n} luot quet`);
}

// ---------------------------------------------------------------- 4. bo gan PIN 6 khoi ERP2
console.log('=== 4. Bo gan luot quet PIN 6 may Kho (tu 01/09) khoi ERP2 ===');
const n6 = await thuc_thi(
  `update lan_quet set nhan_vien_id = null
    where thiet_bi_serial = $1 and nguon = 'may' and pin_may = '6' and nhan_vien_id is not null
      and (thoi_diem + interval '7 hours')::date >= '2026-09-01'`,
  [SERIAL_KHO],
);
console.log(`Bo gan ${n6} luot quet (de "chua gan", cho HR lap ho so cho "Yenkho")`);

// ---------------------------------------------------------------- 5. may_nguoi_dung
console.log('=== 5. Cap nhat may_nguoi_dung theo danh sach moi ===');
await thuc_thi(
  `delete from may_nguoi_dung where thiet_bi_serial in ($1, $2)`, [SERIAL_SG, SERIAL_KHO],
);
const ds_may = [
  [SERIAL_SG, '28', 'Hien', 0], [SERIAL_SG, '39', 'Ta', 0],
  [SERIAL_SG, '3001', 'Tien', 0], [SERIAL_SG, '3002', 'Van', 0],
  [SERIAL_SG, '3004', 'Ly', 0], [SERIAL_SG, '3005', 'Son', 0],
  [SERIAL_SG, '3007', 'Kly', 0],
  [SERIAL_KHO, '1', 'Hao', 14], [SERIAL_KHO, '2', 'Ngoc', 14],
  [SERIAL_KHO, '6', 'Yenkho', 14],
  [SERIAL_KHO, '1000', 'Duydanh', 0], [SERIAL_KHO, '1001', 'Vannam', 0],
  [SERIAL_KHO, '1002', 'Vannon', 0], [SERIAL_KHO, '1003', 'Ngocvinh', 0],
];
for (const [sn, pin, ten, quyen] of ds_may) {
  await thuc_thi(
    `insert into may_nguoi_dung (thiet_bi_serial, pin, ten_may, the, quyen)
     values ($1, $2, $3, '', $4)`, [sn, pin, ten, quyen],
  );
}
console.log(`Da ghi ${ds_may.length} dong cho 2 may.`);

// ---------------------------------------------------------------- 6. dai PIN may Kho
console.log('=== 6. Dat dai PIN may Kho 4000-4999 ===');
await thuc_thi(`update thiet_bi set pin_tu = 4000, pin_den = 4999 where serial = $1`, [SERIAL_KHO]);
console.log('Da dat.');

// ---------------------------------------------------------------- 7. tinh lai thang 9
console.log('=== 7. Tinh lai bang cong thang 9 ===');
for (const [id, ten] of TINH_LAI) {
  const so = await tinh_lai_khoang('2026-09-01', '2026-09-30', id);
  console.log(`${ten}: ${so} ngay`);
}

// ---------------------------------------------------------------- kiem tra lai
console.log('=== Kiem tra: ma dinh danh 1000-1003 ===');
const md = await truy_van(
  `select md.ma_chuan as pin, nv.ma_nv, nv.ho_ten, md.hieu_luc_tu::date as tu
     from ma_dinh_danh md join nhan_vien nv on nv.id = md.nhan_vien_id
    where md.he_thong = 'may_cham_cong' and md.ma_chuan in ('1000','1001','1002','1003')
      and md.hieu_luc_den is null order by md.ma_chuan::int`,
);
console.table(md);

console.log('=== Kiem tra: luot quet may Kho sau khi sua ===');
const lq = await truy_van(
  `select lq.pin_may, coalesce(nv.ma_nv, '(chua gan)') as ma_nv, count(*)::int as lan
     from lan_quet lq left join nhan_vien nv on nv.id = lq.nhan_vien_id
    where lq.nguon = 'may' and lq.thiet_bi_serial = $1
    group by 1, 2 order by lq.pin_may::int`, [SERIAL_KHO],
);
console.table(lq);

console.log('=== Kiem tra: bang cong thang 9 cua 4 nguoi Kho ===');
const bc = await truy_van(
  `select nv.ma_nv, nv.ho_ten,
          count(*) filter (where bc.trang_thai = 'co_mat')::int as ngay_co_mat,
          coalesce(sum(bc.phut_lam), 0)::int as tong_phut
     from nhan_vien nv
     left join bang_cong_ngay bc
            on bc.nhan_vien_id = nv.id and bc.ngay between '2026-09-01' and '2026-09-30'
    where nv.ma_nv in ('ERP158','ERP159','ERP160','ERP161')
    group by 1, 2 order by 1`,
);
console.table(bc);

console.log('XONG.');
process.exit(0);
