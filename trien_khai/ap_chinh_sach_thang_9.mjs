// AP DUNG CHINH SACH CONG MOI TU 01/09/2026 (migration 097 da chay khi deploy):
//   1. Kiem muc ngoai le 17/9 da nam trong so ngoai le (migration gieo san).
//   2. Mo khoa bang cong thang 9 cho cac ngay TINH TU DONG (co_dieu_chinh = false) — giu
//      nguyen cac ngay sua tay.
//   3. Tinh lai cong toan thang 9 (luat moi: di muon / ve som qua 30 phut mat nua ngay cong).
//   4. Tinh lai ky luong thang 9 neu ky con o trang thai sua duoc (nhap / cho_duyet).
//   5. Bao cao doi chieu cac ngay 16-18/9.
//
// CHAY TRONG CONTAINER may_chu (VPS .env co ADMIN creds trong nen khong dang nhap HTTP duoc —
// chay module da bien dich trong container la duong chinh thuc, nhu gan_pin_kho_sg.mjs).
//
//   docker compose cp trien_khai/ap_chinh_sach_thang_9.mjs may_chu:/app/ap_chinh_sach_thang_9.mjs
//   docker compose exec may_chu node /app/ap_chinh_sach_thang_9.mjs
import { tinh_lai_khoang } from '/app/may_chu/dist/cong/tinh_cong.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';
import { thuc_thi, truy_van, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';

const TU = '2026-09-01';
const DEN = '2026-09-30';

// --- 1. kiem muc ngoai le 17/9 (migration gieo san)
console.log('=== So ngoai le 17/9 ===');
console.table(await truy_van(
  `select to_char(ngay,'YYYY-MM-DD') as ngay, loai, ghi_chu,
          mien_di_muon, mien_ve_som, mien_vang
     from so_ngoai_le where ngay = date '2026-09-17'`,
));

// --- 2. mo khoa nhung ngay tinh tu dong cua thang 9
const mo = await thuc_thi(
  `update bang_cong_ngay set da_chot = false
    where ngay between $1 and $2 and co_dieu_chinh = false`,
  [TU, DEN],
);
console.log(`Mo khoa ${mo} o bang cong thang 9 (giu nguyen ngay sua tay).`);

// --- 3. tinh lai cong toan thang 9
const so = await tinh_lai_khoang(TU, DEN);
console.log(`Da tinh lai ${so} o cong thang 9.`);

// --- 4. tinh lai ky luong thang 9 (neu ky co va chua duyet / tra)
const kl = await truy_van_mot(
  `select id, trang_thai from ky_luong where thang = '2026-09'`,
);
if (kl !== null) {
  if (kl.trang_thai === 'cho_duyet') {
    await thuc_thi(
      `update ky_luong set trang_thai = 'nhap', gui_duyet_luc = null, cap_nhat_luc = now()
        where id = $1`,
      [kl.id],
    );
    console.log('Ky luong thang 9 dang cho_duyet -> dua ve nhap de tinh lai.');
  }
  if (kl.trang_thai === 'nhap') {
    const so_phieu = await tinh_ky_luong(kl.id, '2026-09');
    console.log(`Da tinh lai ${so_phieu} phieu luong thang 9.`);
  } else {
    console.error(
      `DUNG: ky luong thang 9 dang '${kl.trang_thai}' — phai thu hoi duyet/tra bang tay truoc khi tinh lai.`,
    );
    process.exit(1);
  }
} else {
  console.log('Chua co ky luong thang 9 — tao tren web (Bang luong) roi bam Tinh.');
}

// --- 5. bao cao doi chieu: 16-18/9 (ngay bao 17/9 + nhung ngay mat nua ngay cong)
console.log('=== Doi chieu 16-18/9: ngoai le / mat nua ngay cong ===');
console.table(await truy_van(
  `select nv.ma_nv, nv.ho_ten, to_char(bc.ngay,'YYYY-MM-DD') as ngay,
          bc.trang_thai, bc.so_cong, bc.ghi_chu
     from bang_cong_ngay bc
     join nhan_vien nv on nv.id = bc.nhan_vien_id
    where bc.ngay between date '2026-09-16' and date '2026-09-18'
      and (bc.trang_thai = 'ngoai_le' or bc.so_cong = 0.5 or bc.ghi_chu like '%Mất nửa ngày%')
    order by bc.ngay, nv.ma_nv`,
));
