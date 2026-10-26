// DON DU LIEU SAI DO "KHONG QUET MAY MA BI COI LA VANG" (26/10/2026).
//
// Boi canh: khoi VP Lang Son (4 nguoi) va tai khoan he thong ERP134 khong quet may. Moi ngay
// he thong ghi mot dong 'vang', moi thang sinh mot phieu vi pham + mot ho so ky luat. Bang dieu
// khien vi vay bao ~60 nguoi vang moi ngay trong khi thuc te chi vai nguoi.
//
// Migration 115 da bat co mien cham cong va tu do khong sinh them dong 'vang'. Script nay don
// phan da sinh:
//   1. Dong 'vang' cua nhom mien cham cong (toan bo lich su). GIU ngay le / nghi tuan / nghi
//      phep: do la su that cua lich, va ngay le dang duoc tra luong.
//   2. Dong 'vang' cua NGAY TUONG LAI (mot lan tinh lai theo khoang cu sinh ca thang).
//   3. Dong 'vang' cua nhung ngay SAU ngay nghi viec cua nguoi da nghi (lich chay dem khong
//      tinh lai nguoi da nghi nen chung nam lai vinh vien).
//   4. Vi pham va ho so ky luat TU DONG sinh tu cac dong vang do, CHUA gui email cho ai.
//
// Chay THU (chi in so luong, khong ghi):
//   docker compose cp trien_khai/don_vang_mien_cham_cong.mjs may_chu:/app/
//   docker compose exec -T may_chu node /app/don_vang_mien_cham_cong.mjs
//
// Chay THAT:
//   docker compose exec -T may_chu node /app/don_vang_mien_cham_cong.mjs --thuc-thi
import { thuc_thi, truy_van, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';

const THUC_THI = process.argv.includes('--thuc-thi');
const OFFSET = Number(process.env['DEVICE_TZ_OFFSET_HOURS'] ?? 7);

/** Ngay hom nay theo mui gio noi dat may cham cong (KHONG phai mui gio may chu). */
function hom_nay() {
  return new Date(Date.now() + OFFSET * 3600_000).toISOString().slice(0, 10);
}

const NGAY = hom_nay();
const MIEN = `(nv.mien_cham_cong or coalesce(k.mien_cham_cong, false))`;

async function dem(sql) {
  return (await truy_van_mot(sql))?.so ?? 0;
}

const truoc = {
  vang_mien: await dem(
    `select count(*)::int as so from bang_cong_ngay bc
       join nhan_vien nv on nv.id = bc.nhan_vien_id
       left join khoi k on k.id = nv.khoi_id
      where bc.trang_thai = 'vang' and ${MIEN}`),
  vang_mien_chot: await dem(
    `select count(*)::int as so from bang_cong_ngay bc
       join nhan_vien nv on nv.id = bc.nhan_vien_id
       left join khoi k on k.id = nv.khoi_id
      where bc.trang_thai = 'vang' and bc.da_chot = true and ${MIEN}`),
  vang_tuong_lai: await dem(
    `select count(*)::int as so from bang_cong_ngay
      where ngay > date '${NGAY}' and da_chot = false`),
  vang_sau_nghi_viec: await dem(
    `select count(*)::int as so
       from bang_cong_ngay bc join nhan_vien nv on nv.id = bc.nhan_vien_id
      where nv.dang_hoat_dong = false and nv.ngay_nghi_viec is not null
        and bc.ngay > nv.ngay_nghi_viec and bc.trang_thai = 'vang' and bc.da_chot = false`),
  vi_pham: await dem(
    `select count(*)::int as so from vi_pham v
       join nhan_vien nv on nv.id = v.nhan_vien_id
       left join khoi k on k.id = nv.khoi_id
      where ${MIEN} and v.nguon = 'he_thong' and v.trang_thai = 'moi'
        and v.ky_luat is null`),
  ky_luat: await dem(
    `select count(*)::int as so from ho_so_ky_luat h
       join nhan_vien nv on nv.id = h.nhan_vien_id
       left join khoi k on k.id = nv.khoi_id
      where ${MIEN} and h.trang_thai in ('moi','da_nhac') and h.da_gui_email = false`),
};

console.log(`Hom nay (mui gio may cham cong): ${NGAY}`);
console.log(`Mien cham cong: ${MIEN.replace(/\s+/g, ' ')}`);
console.log('Se xoa:');
console.log(`  - ${truoc.vang_mien} dong bang cong trang thai 'vang' cua nhom mien cham cong`
  + ` (trong do ${truoc.vang_mien_chot} dong da chot — so cong van la 0 nen khong doi luong)`);
console.log(`  - ${truoc.vang_tuong_lai} dong bang cong cua ngay TUONG LAI`);
console.log(`  - ${truoc.vang_sau_nghi_viec} dong 'vang' cua ngay sau khi nguoi do da nghi viec`);
console.log(`  - ${truoc.vi_pham} vi pham tu dong (chua xu ly, chua gan ky luat)`);
console.log(`  - ${truoc.ky_luat} ho so ky luat tu dong (chua gui email)`);

if (!THUC_THI) {
  console.log('\nCHAY THU — chua ghi gi. Them --thuc-thi de xoa that.');
  process.exit(0);
}

await thuc_thi(
  `delete from bang_cong_ngay bc
    using nhan_vien nv
     left join khoi k on k.id = nv.khoi_id
    where bc.nhan_vien_id = nv.id and bc.trang_thai = 'vang' and ${MIEN}`);
await thuc_thi(
  `delete from bang_cong_ngay where ngay > date '${NGAY}' and da_chot = false`);
await thuc_thi(
  `delete from bang_cong_ngay bc
    using nhan_vien nv
    where bc.nhan_vien_id = nv.id and nv.dang_hoat_dong = false
      and nv.ngay_nghi_viec is not null and bc.ngay > nv.ngay_nghi_viec
      and bc.trang_thai = 'vang' and bc.da_chot = false`);
await thuc_thi(
  `delete from vi_pham v
    using nhan_vien nv
     left join khoi k on k.id = nv.khoi_id
    where v.nhan_vien_id = nv.id and ${MIEN}
      and v.nguon = 'he_thong' and v.trang_thai = 'moi' and v.ky_luat is null`);
await thuc_thi(
  `delete from ho_so_ky_luat h
    using nhan_vien nv
     left join khoi k on k.id = nv.khoi_id
    where h.nhan_vien_id = nv.id and ${MIEN}
      and h.trang_thai in ('moi','da_nhac') and h.da_gui_email = false`);

const sau = {
  vang_mien: await dem(
    `select count(*)::int as so from bang_cong_ngay bc
       join nhan_vien nv on nv.id = bc.nhan_vien_id
       left join khoi k on k.id = nv.khoi_id
      where bc.trang_thai = 'vang' and ${MIEN}`),
  vang_tuong_lai: await dem(
    `select count(*)::int as so from bang_cong_ngay
      where ngay > date '${NGAY}' and da_chot = false`),
};

console.log('\nDa xoa xong.');
console.log(`  con lai: ${sau.vang_mien} dong 'vang' cua nhom mien, ${sau.vang_tuong_lai} dong tuong lai`);

const con_lai = await truy_van(
  `select nv.ma_nv, nv.ho_ten, count(*)::int as vang
     from bang_cong_ngay bc
     join nhan_vien nv on nv.id = bc.nhan_vien_id and nv.dang_hoat_dong
     left join khoi k on k.id = nv.khoi_id
    where bc.trang_thai = 'vang'
      and bc.ngay > date '${NGAY}' - 10 and bc.ngay <= date '${NGAY}'
      and not ${MIEN}
    group by nv.ma_nv, nv.ho_ten order by vang desc limit 5`);
console.log('\nNguoi vang nhieu nhat 10 ngay qua (chi nguoi dang lam, khong tinh khoi mien):');
for (const d of con_lai) console.log(`  ${d.ma_nv} ${d.ho_ten}: ${d.vang} ngay`);
