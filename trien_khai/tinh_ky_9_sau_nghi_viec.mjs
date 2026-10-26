// 12/10/2026: sau khi sua logic "nghi viec nhung van phai tinh luong" (commit 43d7b51),
// tinh lai ky 9 de sinh lai phieu cho nguoi da nghi ma con cong trong thang:
//   - ERP147 Hoang Minh Ngoc (nghi ghi 18/09, thang 9 co 14 cong)
//   - ERP126 Pham Thi Huynh Nhu (nghi ghi 09/10, thang 9 con 3 cong)
// Ky 9 dang 'nhap' nen tinh lai an toan; cac phieu khac giu nguyen so tay sua.
//
// Chay TRONG container may_chu:
//   node /tmp/tinh_ky_9_sau_nghi_viec.mjs
import { truy_van, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';

const ky = await truy_van_mot(
  "select id, thang, trang_thai from ky_luong where thang = '2026-09'",
);
if (ky === null) throw new Error('khong thay ky 2026-09');
if (ky.trang_thai !== 'nhap') {
  throw new Error('ky 2026-09 dang o trang thai ' + ky.trang_thai + ' — khong tinh lai');
}

const truoc = await truy_van(
  `select nv.ma_nv, nv.ho_ten, count(p.id) as so_phieu
     from phieu_luong p join nhan_vien nv on nv.id = p.nhan_vien_id
    where p.ky_luong_id = $1 and nv.ma_nv in ('ERP147','ERP126')
    group by nv.ma_nv, nv.ho_ten order by nv.ma_nv`,
  [ky.id],
);
console.log('TRUOC KHI TINH:', JSON.stringify(truoc));

const so_phieu = await tinh_ky_luong(ky.id, ky.thang);
console.log('so phieu da tinh lai ky', ky.thang + ':', so_phieu);

const sau = await truy_van(
  `select nv.ma_nv, nv.ho_ten, p.so_ngay_cong_chuan::text, p.so_ngay_cong_thuc::text,
          p.thuc_linh::text, p.tinh_luc
     from phieu_luong p join nhan_vien nv on nv.id = p.nhan_vien_id
    where p.ky_luong_id = $1 and nv.ma_nv in ('ERP147','ERP126')
    order by nv.ma_nv`,
  [ky.id],
);
console.log('SAU KHI TINH:');
for (const d of sau) console.log(JSON.stringify(d));
