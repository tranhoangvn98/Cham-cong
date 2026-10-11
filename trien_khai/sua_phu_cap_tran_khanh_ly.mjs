// 08/10/2026: admin them phu cap makeup (pc_trang_diem, 500.000d tu 01/09/2026) cho
// Tran Khanh Ly (khanhlykd) nhung phieu luong ky 9 van 0d: mot dong GO TAY 0d
// (tu_chinh_sach = false) tren phieu de len chinh sach nen `khoan_tu_chinh_sach` khong
// sinh dong 500.000d. Xoa dong go tay do roi tinh lai ky 9.
//
// Chay TRONG container may_chu (ban chay nay da co .env):
//   node /tmp/sua_phu_cap_tran_khanh_ly.mjs
//
// Lua y: ky luong phai con trang thai 'nhap' moi tinh lai — ky da duyet thi dung lai.
import { thuc_thi, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';

const KY_ID = '4a67743c-21e7-4aa4-b067-34d447913770'; // ky 2026-09
const MA_NV = 'khanhlykd';
const KHOAN = 'pc_trang_diem';

const ky = await truy_van_mot(
  'select thang, trang_thai from ky_luong where id = $1', [KY_ID],
);
if (ky === null) throw new Error('khong thay ky luong ' + KY_ID);
if (ky.trang_thai !== 'nhap') {
  throw new Error('ky ' + ky.thang + ' dang o trang thai ' + ky.trang_thai + ' — khong tinh lai');
}

const nv = await truy_van_mot(
  'select id, ho_ten from nhan_vien where ma_nv = $1 and dang_hoat_dong = true', [MA_NV],
);
if (nv === null) throw new Error('khong thay nhan vien ' + MA_NV);

const phieu = await truy_van_mot(
  'select id from phieu_luong where ky_luong_id = $1 and nhan_vien_id = $2',
  [KY_ID, nv.id],
);
if (phieu === null) throw new Error('khong thay phieu ky cho ' + MA_NV);

const truoc = await truy_van_mot(
  'select thanh_tien, tu_chinh_sach from phieu_luong_khoan where phieu_luong_id = $1 and khoan_ma = $2',
  [phieu.id, KHOAN],
);
console.log('dong truoc:', JSON.stringify(truoc));

const xoa = await thuc_thi(
  'delete from phieu_luong_khoan where phieu_luong_id = $1 and khoan_ma = $2 and tu_chinh_sach = false',
  [phieu.id, KHOAN],
);
console.log('so dong go tay da xoa:', xoa);

const so_phieu = await tinh_ky_luong(KY_ID, ky.thang);

const sau = await truy_van_mot(
  'select thanh_tien, tu_chinh_sach, so_luong, don_gia from phieu_luong_khoan where phieu_luong_id = $1 and khoan_ma = $2',
  [phieu.id, KHOAN],
);
const tong = await truy_van_mot(
  'select phu_cap, phu_cap_khac, khoan_thu_nhap, tong_thu_nhap from phieu_luong where id = $1',
  [phieu.id],
);
console.log('dong sau:', JSON.stringify(sau));
console.log('phieu sau:', JSON.stringify(tong), '| so phieu tinh lai:', so_phieu);
