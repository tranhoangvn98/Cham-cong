// TINH LAI CONG SAU KHI MAY KHO NOI LAI VA DAY DU LOG KET (02/10/2026).
//
// Boi canh: may Kho (NYU7261300256) offline tu 20/09 den 02/10; log quet 21/09-02/10
// moi day ve sau khi them IP 123.24.251.227 vao ICLOCK_IP_CHO_PHEP. Bang cong thang 9
// cua nhom Kho tinh thieu nhung ngay do -> tinh lai.
//
// CHAY TRONG CONTAINER may_chu (giong ap_chinh_sach_thang_9.mjs):
//   docker compose cp trien_khai/tinh_lai_cong_du_lieu_kho_moi.mjs may_chu:/app/
//   docker compose exec may_chu node /app/tinh_lai_cong_du_lieu_kho_moi.mjs
import { tinh_lai_khoang } from '/app/may_chu/dist/cong/tinh_cong.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';
import { thuc_thi, truy_van, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';

const SERIAL_KHO = 'NYU7261300256';

// --- hang rao: ky thang 9 phai con sua duoc
const kl = await truy_van_mot(
  `select id, trang_thai from ky_luong where thang = '2026-09'`,
);
if (kl === null) {
  console.error('DUNG: chua co ky luong 2026-09.');
  process.exit(1);
}
if (kl.trang_thai === 'cho_duyet') {
  await thuc_thi(
    `update ky_luong set trang_thai = 'nhap', gui_duyet_luc = null, cap_nhat_luc = now()
      where id = $1`,
    [kl.id],
  );
  console.log('Ky 2026-09 dang cho_duyet -> dua ve nhap de tinh lai.');
}
if (kl.trang_thai !== 'nhap') {
  console.error(`DUNG: ky 2026-09 dang '${kl.trang_thai}' — can thu hoi duyet bang tay.`);
  process.exit(1);
}

// --- 1. mo khoa bang cong thang 9 (giu nguyen ngay sua tay)
const mo = await thuc_thi(
  `update bang_cong_ngay set da_chot = false
    where ngay between '2026-09-01' and '2026-09-30' and co_dieu_chinh = false`,
);
console.log(`Mo khoa ${mo} o cong thang 9.`);

// --- 2. tinh lai toan thang 9 (gio co du log quet Kho 21-30/09)
const s9 = await tinh_lai_khoang('2026-09-01', '2026-09-30');
console.log(`Tinh lai ${s9} o cong thang 9.`);

// --- 3. tinh lai 01-02/10 (nguoi Kho thieu quet trong 2 ngay may offline)
const s10 = await tinh_lai_khoang('2026-10-01', '2026-10-02');
console.log(`Tinh lai ${s10} o dau thang 10.`);

// --- 4. tinh lai phieu luong thang 9
const sp = await tinh_ky_luong(kl.id, '2026-09');
console.log(`Tinh lai ${sp} phieu luong thang 9.`);

// --- 5. doi chieu cong thang 9 cua nhung nguoi co quet may Kho
console.log('=== Doi chieu bang cong thang 9 (nguoi co luot quet may Kho) ===');
console.table(await truy_van(
  `select nv.ma_nv, nv.ho_ten,
          count(*) filter (where bc.trang_thai = 'co_mat')::int as ngay_co_mat,
          coalesce(sum(bc.phut_lam), 0)::int as tong_phut,
          count(*) filter (where bc.trang_thai = 'vang')::int as ngay_vang
     from lan_quet lq
     join nhan_vien nv on nv.id = lq.nhan_vien_id
     left join bang_cong_ngay bc
            on bc.nhan_vien_id = nv.id and bc.ngay between '2026-09-01' and '2026-09-30'
    where lq.thiet_bi_serial = $1 and lq.thoi_diem >= '2026-09-01'
    group by 1, 2 order by 1`,
  [SERIAL_KHO],
));
console.log('XONG.');
process.exit(0);
