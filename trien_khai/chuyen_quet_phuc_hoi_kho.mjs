// SUA MAPPING CAC LUOT QUET MAY KHO DUOC PHUC HOI BOI "LAY LOG CU" (03/10/2026).
//
// Boi canh: ban 1.117.0 bat ket qua `DATA QUERY tablename=transaction` cua may acc. Khi kiem
// thu tren may Kho, may day 4 goi (~350 dong, tu 10/08 den 03/10), trong do 90 luot quet chua
// tung ve duoc qua rtlog. Cac dong moi duoc map TU DONG theo ma dinh danh hieu luc tai thoi
// diem quet — dung ve co che, nhung SAI voi chot HR (01/10):
//   - PIN 6 may Kho tu 01/09 la ERP120 Yen (may khai ten "Yenkho"), KHONG phai ERP2 Tien.
//   - PIN 3/4/5 may Kho tu 01/09 la 3 nguoi Kho (3=ERP160 Vinh, 4=ERP158 Mon, 5=ERP159 Nam).
// Thang 8 nam trong ky luong DA DUYET nen khong dong vao (de HR quyet sau — nhu ghi chu o
// cap_nhat_pin_kho_sg.mjs).
//
// CHAY TRONG CONTAINER may_chu:
//   docker compose cp trien_khai/chuyen_quet_phuc_hoi_kho.mjs may_chu:/app/
//   docker compose exec may_chu node /app/chuyen_quet_phuc_hoi_kho.mjs
import { tinh_lai_khoang } from '/app/may_chu/dist/cong/tinh_cong.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';
import { thuc_thi, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';

const SERIAL_KHO = 'NYU7261300256';

// 8 nguoi can tinh lai thang 9 — dung danh sach cua cap_nhat_pin_kho_sg.mjs.
const TINH_LAI = [
  ['4ad84ca4-2b4b-4c9f-b703-ac3ecd4356aa', 'ERP120 Nguyen Hai Yen'],
  ['3df27c31-79c0-49e8-acc2-83652ecaeefb', 'ERP2 Nguyen Viet Minh Tien'],
  ['4b41e6ca-d3b2-452f-8ff1-f5ce4b8e3d6b', 'ERP16 Khuat Thi Kim Thu'],
  ['a5349442-2439-4d2f-ab28-39f6f476b94a', 'ERP4 Tran Hoang Anh Vinh'],
  ['96da76c5-8096-4bd9-9e87-ea1411842f6d', 'ERP114 Le Khac Minh'],
  ['f6a37afd-8cb4-4ca0-939c-4ef1bc9fae0b', 'ERP160 Nguyen Ngoc Vinh'],
  ['7db545b1-8d86-46e6-9ba7-0075d297f22f', 'ERP158 Hoang Van Mon'],
  ['90825d87-89eb-4611-a8d0-382c8d20f8fd', 'ERP159 Phuong Van Nam'],
];

// Hang rao: ky thang 9 phai con sua duoc.
const kl = await truy_van_mot(`select id, trang_thai from ky_luong where thang = '2026-09'`);
if (kl === null || kl.trang_thai !== 'nhap') {
  console.error('DUNG: ky 2026-09 khong o trang thai nhap.');
  process.exit(1);
}

const THANG_9 = "and (thoi_diem + interval '7 hours')::date between '2026-09-01' and '2026-09-30'";

// --- 1. PIN 6 may Kho thang 9: tu ERP2 (Tien) sang ERP120 (Yen)
const n6 = await thuc_thi(
  `update lan_quet set nhan_vien_id = $3
    where thiet_bi_serial = $1 and nguon = 'may' and pin_may = '6'
      and nhan_vien_id = $2 ${THANG_9}`,
  [SERIAL_KHO, '3df27c31-79c0-49e8-acc2-83652ecaeefb', '4ad84ca4-2b4b-4c9f-b703-ac3ecd4356aa'],
);
console.log(`Da chuyen ${n6} luot quet PIN 6 thang 9 tu ERP2 sang ERP120.`);

// --- 2. PIN 3/4/5 may Kho thang 9: ve 3 nguoi Kho (idempotent)
const PIN_CU = [
  ['3', 'f6a37afd-8cb4-4ca0-939c-4ef1bc9fae0b', 'ERP160'],
  ['4', '7db545b1-8d86-46e6-9ba7-0075d297f22f', 'ERP158'],
  ['5', '90825d87-89eb-4611-a8d0-382c8d20f8fd', 'ERP159'],
];
for (const [pin, id, ten] of PIN_CU) {
  const n = await thuc_thi(
    `update lan_quet set nhan_vien_id = $2
      where thiet_bi_serial = $1 and nguon = 'may' and pin_may = $3 ${THANG_9}`,
    [SERIAL_KHO, id, pin],
  );
  console.log(`PIN ${pin} thang 9 -> ${ten}: ${n} luot quet.`);
}

// --- 3. tinh lai bang cong thang 9 cho 8 nguoi
console.log('=== Tinh lai bang cong thang 9 ===');
for (const [id, ten] of TINH_LAI) {
  const so = await tinh_lai_khoang('2026-09-01', '2026-09-30', id);
  console.log(`${ten}: ${so} ngay`);
}

// --- 4. tinh lai phieu luong thang 9
const sp = await tinh_ky_luong(kl.id, '2026-09');
console.log(`Tinh lai ${sp} phieu luong thang 9.`);

process.exit(0);
