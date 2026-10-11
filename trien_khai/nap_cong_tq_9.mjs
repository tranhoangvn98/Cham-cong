// NAP CONG KHO TQ THANG 9/2026 + dau thang 10 (09/10/2026).
//
// Boi canh: Kho TQ khong co may cham cong — cong nạp từ file/thủ công theo tháng
// (thang 8 đã có tiền lệ, ghi chú "Nap file cham cong TQ 08/2026"). Thang 9 chua nap
// nen bang cong toan 'vang'. HR chot ca lam: 08:00–17:30, thu 2 -> thu 7.
//
// Quy uoc nap lan nay (HR xem lai sau khi co file that):
//   - Thu 2 -> Thu 7 thang 9: co_mat 1 cong (gia su di lam du).
//   - Chu nhat: nghi_tuan 0 cong.
//   - Giu nguyen cac o da co cong (ngay_le, ngoai_le 17/9).
//   - Khoi kho_tq: T7 = NGUYEN cong (t7_nua_cong = false) de cong chuan khop cong thuc.
//   - Khai ngay le TQ 01–07/10 (Golden Week) lich 'tq' + dien cong dau thang 10.
//   - Gan noi_lam_viec 'Kho Trung quoc' cho 3 nguoi con thieu (dung lich nghi TQ).
//   - Tinh lai phieu luong CNY thang 9.
//
// CHAY TRONG CONTAINER may_chu:
//   docker compose cp trien_khai/nap_cong_tq_9.mjs may_chu:/tmp/
//   docker compose exec may_chu node /tmp/nap_cong_tq_9.mjs
import { truy_van, truy_van_mot, thuc_thi } from '/app/may_chu/dist/csdl/ket_noi.js';
import { tinh_ky_luong_cny } from '/app/may_chu/dist/luong/ky_luong_cny.js';

const kl = await truy_van_mot(`select id, trang_thai from ky_luong where thang = '2026-09'`);
if (kl === null || kl.trang_thai !== 'nhap') {
  console.error('DUNG: ky 2026-09 khong o trang thai nhap (' + (kl?.trang_thai ?? 'khong co') + ').');
  process.exit(1);
}

const GHI_CHU_9 = 'Nap file cham cong TQ 09/2026';
const GHI_CHU_10 = 'Nap cong TQ thang 10/2026 (chua co file may)';

// --- 1. Kho TQ: thu Bay nguyen cong (khop cong chuan = cong thuc)
const kho = await truy_van_mot(`select id from khoi where ma = 'kho_tq'`);
if (kho === null) { console.error('DUNG: khong tim thay khoi kho_tq.'); process.exit(1); }
await thuc_thi(`update khoi set t7_nua_cong = false where id = $1`, [kho.id]);

// --- 2. Khai ngay le TQ 01-07/10/2026 (Golden Week)
for (let d = 1; d <= 7; d++) {
  const ngay = `2026-10-${String(d).padStart(2, '0')}`;
  await thuc_thi(
    `insert into ngay_le (ngay, lich_ma, huong_luong, ten)
     values ($1, 'tq', true, 'Quốc khánh Trung Quốc (Golden Week)')
     on conflict (ngay, lich_ma) do nothing`,
    [ngay],
  );
}

// --- 3. Gan noi lam viec 'Kho Trung quoc' cho 3 nguoi con thieu
const nlv = await truy_van_mot(`select id from noi_lam_viec where ten = 'Kho Trung quốc'`);
if (nlv === null) { console.error('DUNG: khong tim thay noi lam viec Kho Trung quoc.'); process.exit(1); }
for (const ma of ['ERP33', 'ERP95', 'ERP97']) {
  await thuc_thi(
    `update nhan_vien set noi_lam_viec_id = $1 where ma_nv = $2 and noi_lam_viec_id is null`,
    [nlv.id, ma],
  );
}

// --- 4. Danh sach nguoi Kho TQ
const ds = await truy_van(
  `select id, ma_nv from nhan_vien
    where dang_hoat_dong = true and khoi_id = (select id from khoi where ma = 'kho_tq')`,
);
console.log(`So nguoi Kho TQ: ${ds.length}`);

function cac_ngay(tu, den) {
  const ra = [];
  const d = new Date(`${tu}T00:00:00Z`);
  const cuoi = new Date(`${den}T00:00:00Z`);
  while (d <= cuoi) {
    ra.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return ra;
}

// --- 5. Thang 9: thu 2 - thu 7 chua co cong -> co_mat 1 cong
let so_9 = 0;
for (const nv of ds) {
  for (const ng of cac_ngay('2026-09-01', '2026-09-30')) {
    const dow = new Date(`${ng}T00:00:00Z`).getUTCDay(); // 0 = CN
    if (dow === 0 || dow > 6) continue; // chi thu 2 - thu 7
    const so = await thuc_thi(
      `update bang_cong_ngay
          set trang_thai = 'co_mat', so_cong = 1, co_dieu_chinh = true, ghi_chu = $3
        where nhan_vien_id = $1 and ngay = $2 and so_cong = 0`,
      [nv.id, ng, GHI_CHU_9],
    );
    so_9 += Number(so);
  }
}

// --- 6. Dau thang 10: 01-07/10 ngay_le (huong luong), 08-09/10 co_mat
let so_10 = 0;
for (const nv of ds) {
  for (const ng of cac_ngay('2026-10-01', '2026-10-09')) {
    const m = /^2026-10-0(\d)$/.exec(ng);
    const la_le_tq = m !== null && Number(m[1]) >= 1 && Number(m[1]) <= 7;
    const so = await thuc_thi(
      la_le_tq
        ? `update bang_cong_ngay
              set trang_thai = 'ngay_le', so_cong = 1, co_dieu_chinh = true, ghi_chu = $3
            where nhan_vien_id = $1 and ngay = $2 and so_cong = 0`
        : `update bang_cong_ngay
              set trang_thai = 'co_mat', so_cong = 1, co_dieu_chinh = true, ghi_chu = $3
            where nhan_vien_id = $1 and ngay = $2 and so_cong = 0`,
      [nv.id, ng, la_le_tq ? 'Ngày lễ Quốc khánh TQ' : GHI_CHU_10],
    );
    so_10 += Number(so);
  }
}
console.log(`Da nap: ${so_9} o thang 9, ${so_10} o dau thang 10.`);

// --- 7. Tinh lai phieu luong CNY thang 9
const so_phieu = await tinh_ky_luong_cny(kl.id, '2026-09');
console.log(`Da tinh lai ${so_phieu} phieu CNY thang 2026-09.`);
