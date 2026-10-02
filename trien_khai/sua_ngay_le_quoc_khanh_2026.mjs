// Sua ngay le Quoc khanh 2026 theo quyet dinh cua cong ty (02/10/2026):
//   - 1/9/2026: tu ngay lam viec -> ngay nghi le "Quoc khanh — ngay lien ke"
//   - 3/9/2026: tu ngay nghi le -> ngay lam viec binh thuong
// Sau do tinh lai bang cong ca khoang 1/9–3/9 cho toan bo nhan vien dang hoat dong.
//
// CHAY TRONG CONTAINER may_chu (sau khi da sao luu CSDL):
//   docker compose cp trien_khai/sua_ngay_le_quoc_khanh_2026.mjs may_chu:/tmp/sua_ngay_le_quoc_khanh_2026.mjs
//   docker compose exec -T may_chu node /tmp/sua_ngay_le_quoc_khanh_2026.mjs
//
// Luu y: 2027-09-03 van dang khai "ngay lien ke" tren VPS — chu dong ra soat hang nam
// truoc khi dung (nguon goc: trien_khai/nap_du_lieu_demo.mjs).
import { tinh_lai_khoang } from '/app/may_chu/dist/cong/tinh_cong.js';
import { thuc_thi, truy_van } from '/app/may_chu/dist/csdl/ket_noi.js';

// Hang rao: ky luong 2026-09 phai con o trang thai nhap (chua chot) moi duoc sua ngay le.
const kl = await truy_van("select thang, trang_thai from ky_luong where thang = '2026-09'");
if (kl.length === 0 || kl[0].trang_thai !== 'nhap') {
  console.error('DUNG: ky luong 2026-09 khong con o trang thai nhap.');
  process.exit(1);
}

console.log('=== Them ngay le 2026-09-01 ===');
const them = await thuc_thi(
  `insert into ngay_le(ngay, ten, huong_luong, lich_ma)
   values ('2026-09-01', 'Quốc khánh — ngày liền kề', true, 'vn')
   on conflict (ngay, lich_ma) do update set ten = excluded.ten, huong_luong = excluded.huong_luong`,
);
console.log(`${them} dong`);

console.log('=== Xoa ngay le 2026-09-03 ===');
const xoa = await thuc_thi("delete from ngay_le where ngay = '2026-09-03' and lich_ma = 'vn'");
console.log(`${xoa} dong`);

console.log('=== Tinh lai bang cong khoang 2026-09-01 -> 2026-09-03 ===');
const so = await tinh_lai_khoang('2026-09-01', '2026-09-03');
console.log(`${so} o cong`);

console.log('=== Ket qua ===');
const kt = await truy_van(
  "select ngay, ten, huong_luong from ngay_le where ngay between '2026-08-30' and '2026-09-05' order by ngay",
);
console.log(JSON.stringify(kt, null, 2));
