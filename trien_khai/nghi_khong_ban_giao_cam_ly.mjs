// Danh dau ERP125 Vu Thi Cam Ly da nghi viec — KHONG qua quy trinh ban giao (yeu cau 24/10/2026:
// "Nhu va Cam Ly nghi roi, chuyen sang trang thai [nghi viec khong ban giao]").
//   * Nhu (ERP126 Pham Thi Huynh Nhu) da duoc ghi nghi 09/10/2026 tu truoc — script KHONG dong vao.
//   * Ngay nghi 2026-10-09: trung ngay quet cuoi cung cua Cam Ly (5 luot ngay 09/10, sau do khong
//     quet nua) va trung ngay nghi da ghi cua Nhu — hai chi em cung nghi mot dot.
//
// CHAY TRONG CONTAINER may_chu (tren VPS):
//   docker compose cp trien_khai/nghi_khong_ban_giao_cam_ly.mjs may_chu:/tmp/
//   docker compose exec -T may_chu node /tmp/nghi_khong_ban_giao_cam_ly.mjs
//
// Dung DUNG code path cua route POST /nhan-vien/:id/nghi-viec: cho_nghi_viec trong MOT
// transaction (tat hoat dong + khoa tai khoan + thu hoi token + tat mau viec dinh ky + don
// phong kiem nhiem + su kien hop_thu_di: nhan_su/erp1/ms365) roi ghi nhat ky thao tac.
// Hoan tac (neu can): xem bai hoc Quynh Anh trong ghi chu repo — mo lai 2 bang nhan_vien +
// nguoi_dung VA huy cac su kien treo trong hop_thu_di.

import { trong_giao_dich, truy_van, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';
import { cho_nghi_viec } from '/app/may_chu/dist/nhan_su/nghi_viec.js';
import { ghi_nhat_ky } from '/app/may_chu/dist/tien_ich/nhat_ky.js';

const MA_NV = 'ERP125';
const NGAY_NGHI = '2026-10-09';

// ---------------------------------------------------------------- hang rao
const nv = await truy_van_mot(
  `select id, ma_nv, ho_ten, dang_hoat_dong, ngay_nghi_viec::text as ngay_nghi_viec
     from nhan_vien where ma_nv = $1`,
  [MA_NV],
);
if (nv === null) {
  console.error('DUNG: khong tim thay ' + MA_NV);
  process.exit(1);
}
console.log('hien tai:', nv.ma_nv, '-', nv.ho_ten,
  '| dang_hoat_dong =', nv.dang_hoat_dong, '| ngay_nghi_viec =', nv.ngay_nghi_viec);
if (nv.dang_hoat_dong !== true) {
  console.error('DUNG: nguoi nay da nghi viec tu truoc — khong lam lai.');
  process.exit(1);
}

// ---------------------------------------------------------------- cho nghi viec
const ket_qua = await trong_giao_dich((khach) => cho_nghi_viec(khach, nv.id, NGAY_NGHI));
console.log('cho_nghi_viec ->', JSON.stringify(ket_qua));

await ghi_nhat_ky(null, 'cho_nghi_viec', 'nhan_vien', nv.id, {
  ma_nv: nv.ma_nv,
  ho_ten: nv.ho_ten,
  ngay_nghi_viec: NGAY_NGHI,
  khong_qua_quy_trinh: true,
  nguon: 'script nghi_khong_ban_giao_cam_ly.mjs (yeu cau 24/10/2026)',
}, null);

// ---------------------------------------------------------------- kiem chung
const sau = await truy_van_mot(
  'select dang_hoat_dong, ngay_nghi_viec::text as ngay_nghi_viec from nhan_vien where id = $1',
  [nv.id],
);
console.log('nhan_vien sau khi chay:', JSON.stringify(sau));

const tk = await truy_van(
  'select ten_dang_nhap, dang_hoat_dong from nguoi_dung where nhan_vien_id = $1',
  [nv.id],
);
console.log('tai khoan:');
console.table(tk);

const sk = await truy_van(
  `select id, loai_su_kien, du_lieu::text as du_lieu, gui_luc
     from hop_thu_di where du_lieu::text like $1 order by id desc limit 5`,
  ['%' + nv.ma_nv + '%'],
);
console.log('su kien hop_thu_di (chua gui la binh thuong — dich chua cau hinh):');
console.table(sk);

console.log('XONG.');
process.exit(0);
