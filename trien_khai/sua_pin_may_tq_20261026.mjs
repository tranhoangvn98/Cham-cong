// SUA MAPPING PIN MAY KHO TRUNG QUOC (26/10/2026).
//
// Boi canh: may CGT1254800127 dung PIN 1-5 trung voi 5 nhan vien VN. Da hoi may
// (DATA QUERY USERINFO) va biet chac ten tren may:
//   1 Huang        -> ERP33 Huang Shu Ping   (da cap 5001)
//   2 ThanThiVanAnh-> ERP27 Than Thi Van Anh (da cap 5000)
//   3 XiaZiFeng    -> ERP95 XIAZIFENG        (da cap 5002)
//   4 LiChengZhen  -> ERP96 LI CHENG ZHEN    (da cap 5003)
//   5 HuangLiHua   -> ERP97 HUANG LI HUA     (da cap 5004)
//
// Script nay:
//   1. Chan neu may dang BAT (tranh ghi chen trong luc sua).
//   2. Sao luu toan bo lan_quet cua may vao bang lan_quet_sao_luu_pin_tq_20261026.
//   3. Gan lai nhan_vien_id theo bang tren.
//   4. Mo khoa + tinh lai bang cong cua MOI cap (nguoi, ngay) bi anh huong
//      (ca 5 nguoi VN bi ghi nham LAN 5 nguoi TQ nhan dung).
//   5. Tinh lai phieu luong ky 2026-10 neu ky con 'nhap'.
//   6. In doi chieu de kiem chung.
//
// CHAY TRONG CONTAINER:
//   docker compose cp trien_khai/sua_pin_may_tq_20261026.mjs may_chu:/app/
//   docker compose exec -T may_chu node /app/sua_pin_may_tq_20261026.mjs
import { tinh_lai_nhieu } from '/app/may_chu/dist/cong/tinh_cong.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';
import { tinh_ky_luong_cny } from '/app/may_chu/dist/luong/ky_luong_cny.js';
import { thuc_thi, truy_van, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';

const SERIAL = 'CGT1254800127';
const BANG_SAO_LUU = 'lan_quet_sao_luu_pin_tq_20261026';
const MAP = [
  ['1', 'ERP33'],
  ['2', 'ERP27'],
  ['3', 'ERP95'],
  ['4', 'ERP96'],
  ['5', 'ERP97'],
];

// --- 0. Hang rao
const daCo = await truy_van_mot('select to_regclass($1) as t', [BANG_SAO_LUU]);
if (daCo.t !== null) {
  console.error(`DUNG: bang sao luu ${BANG_SAO_LUU} da ton tai — script da chay roi.`);
  process.exit(1);
}
const tb = await truy_van_mot('select dang_bat from thiet_bi where serial = $1', [SERIAL]);
if (tb === null) {
  console.error(`DUNG: khong thay thiet bi ${SERIAL}.`);
  process.exit(1);
}
if (tb.dang_bat) {
  console.error('DUNG: may dang BAT — tat thiet bi truoc khi sua de khong ghi chen.');
  process.exit(1);
}

// --- 1. Sao luu
await thuc_thi(
  `create table ${BANG_SAO_LUU} as select * from lan_quet where thiet_bi_serial = $1`,
  [SERIAL],
);
const bl = await truy_van_mot(`select count(*)::int as n from ${BANG_SAO_LUU}`);
console.log(`Da sao luu ${bl.n} luot quet vao bang ${BANG_SAO_LUU}.`);

// --- 2. Cap (nguoi, ngay) CU truoc khi doi
const cu = await truy_van(
  `select distinct nhan_vien_id,
          to_char((thoi_diem + interval '7 hours')::date, 'YYYY-MM-DD') as ngay
     from lan_quet
    where thiet_bi_serial = $1 and nhan_vien_id is not null`,
  [SERIAL],
);

// --- 3. Gan lai theo bang
let tongSua = 0;
for (const [pin, maNv] of MAP) {
  const nv = await truy_van_mot('select id, ho_ten from nhan_vien where ma_nv = $1', [maNv]);
  if (nv === null) {
    console.error(`DUNG: khong tim thay nhan vien ${maNv}.`);
    process.exit(1);
  }
  const n = await thuc_thi(
    `update lan_quet set nhan_vien_id = $1
      where thiet_bi_serial = $2 and pin_may = $3`,
    [nv.id, SERIAL, pin],
  );
  tongSua += n;
  console.log(`PIN ${pin} -> ${maNv} ${nv.ho_ten}: ${n} luot`);
}
console.log(`Tong da gan lai: ${tongSua} luot.`);

// --- 4. Cap (nguoi, ngay) MOI
const moi = await truy_van(
  `select distinct nhan_vien_id,
          to_char((thoi_diem + interval '7 hours')::date, 'YYYY-MM-DD') as ngay
     from lan_quet
    where thiet_bi_serial = $1 and nhan_vien_id is not null`,
  [SERIAL],
);

// --- 5. Mo khoa cac o cong bi anh huong (giu nguyen o sua tay)
const cap = new Map();
for (const c of [...cu, ...moi]) cap.set(`${c.nhan_vien_id}|${c.ngay}`, c);
const ds = [...cap.values()];
let moKhoa = 0;
for (const c of ds) {
  moKhoa += await thuc_thi(
    `update bang_cong_ngay set da_chot = false
      where nhan_vien_id = $1 and ngay = $2 and co_dieu_chinh = false`,
    [c.nhan_vien_id, c.ngay],
  );
}
console.log(`Mo khoa ${moKhoa} o cong trong ${ds.length} cap (nguoi, ngay) bi anh huong.`);

// --- 6. Tinh lai cong
const soCong = await tinh_lai_nhieu(ds);
console.log(`Da tinh lai ${soCong} o cong.`);

// --- 7. Tinh lai phieu luong ky 10 neu con nhap
const kl = await truy_van_mot(
  `select id, trang_thai from ky_luong where thang = '2026-10'`,
  [],
);
if (kl === null) {
  console.log('Chua co ky luong 2026-10 — bo qua phieu luong.');
} else if (kl.trang_thai !== 'nhap') {
  console.log(`Ky 2026-10 dang '${kl.trang_thai}' — KHONG tinh lai phieu luong.`);
} else {
  const a = await tinh_ky_luong(kl.id, '2026-10');
  const b = await tinh_ky_luong_cny(kl.id, '2026-10');
  console.log(`Tinh lai ${a} phieu luong VN + ${b} phieu luong CNY (ky 2026-10).`);
}

// --- 8. Doi chieu
console.log('=== Luot quet may TQ theo nguoi ===');
console.table(await truy_van(
  `select lq.pin_may, nv.ma_nv, nv.ho_ten, count(*)::int as luot
     from lan_quet lq join nhan_vien nv on nv.id = lq.nhan_vien_id
    where lq.thiet_bi_serial = $1
    group by 1, 2, 3 order by lq.pin_may::int`,
  [SERIAL],
));

console.log('=== Cong 09-26/10 cua 5 nguoi TQ ===');
console.table(await truy_van(
  `select nv.ma_nv, nv.ho_ten,
          count(*) filter (where bc.trang_thai = 'co_mat')::int as ngay_co_mat,
          sum(bc.so_cong)::numeric(10,1) as tong_cong
     from bang_cong_ngay bc join nhan_vien nv on nv.id = bc.nhan_vien_id
    where bc.ngay between '2026-10-09' and '2026-10-26'
      and nv.ma_nv in ('ERP33', 'ERP27', 'ERP95', 'ERP96', 'ERP97')
    group by 1, 2 order by 1`,
  [],
));

console.log('=== Cong 09-26/10 cua 5 nguoi VN tung bi ghi nham ===');
console.table(await truy_van(
  `select nv.ma_nv, nv.ho_ten,
          count(*) filter (where bc.trang_thai = 'co_mat')::int as ngay_co_mat,
          sum(bc.so_cong)::numeric(10,1) as tong_cong
     from bang_cong_ngay bc join nhan_vien nv on nv.id = bc.nhan_vien_id
    where bc.ngay between '2026-10-09' and '2026-10-26'
      and nv.ma_nv in ('IT-01', 'ERP147', 'ERP16', 'ERP4', 'ERP114')
    group by 1, 2 order by 1`,
  [],
));

console.log('XONG. Hoan tac: update lan_quet tu bang sao luu ' + BANG_SAO_LUU + ' roi tinh lai cong.');
