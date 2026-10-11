// 10/10/2026: chan phu cap KHOI cho nhom nhan su outsource — thay cho cac dong GO TAY 0d
// (nhat ky HR 07/10) da duoc don. Dung co che chinh thong cua he thong:
//   - pc_trang_phuc (danh muc nhap_tay): dong ca nhan so_tien = 0 -> bo qua, khong sinh.
//   - pc_an_trua   (danh muc so luong): dong ca nhan co_dinh so_luong = 0 -> bo qua.
// Ca nhan DE len khoi theo khoan_ma nen cac dong 0 nay chan dung hai khoan khoi.
//
// Neu HR muon nguoi nao huong lai phu cap khoi: chi can XOA 2 dong chinh sach 0d cua nguoi
// do (hoac dong hieu luc) roi tinh lai ky.
//
// Chay TRONG container may_chu (ban chay nay da co .env):
//   node /tmp/gan_phu_cap_0_outsource.mjs
import { thuc_thi, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';

const KY_ID = '4a67743c-21e7-4aa4-b067-34d447913770'; // ky 2026-09
const MA_NV = ['ERP2', 'ERP32', 'lengoc'];
const LY_DO = 'Nhan su outsource khong huong phu cap khoi (chot 10/10/2026)';
// khoan_ma -> cot can dat 0
const KHOAN = [
  { khoan_ma: 'pc_an_trua', so_luong: 0, so_tien: 0 },
  { khoan_ma: 'pc_trang_phuc', so_luong: 0, so_tien: 0 },
];

const ky = await truy_van_mot(
  'select thang, trang_thai from ky_luong where id = $1', [KY_ID],
);
if (ky === null) throw new Error('khong thay ky luong ' + KY_ID);
if (ky.trang_thai !== 'nhap') {
  throw new Error('ky ' + ky.thang + ' dang o trang thai ' + ky.trang_thai + ' — khong tinh lai');
}

let tong_them = 0;
for (const ma_nv of MA_NV) {
  const nv = await truy_van_mot(
    'select id from nhan_vien where ma_nv = $1 and dang_hoat_dong = true', [ma_nv],
  );
  if (nv === null) {
    console.log('BO QUA (khong thay nv):', ma_nv);
    continue;
  }
  for (const k of KHOAN) {
    const co = await truy_van_mot(
      `select so_tien, so_luong, hieu_luc_den from chinh_sach_phu_cap
        where nhan_vien_id = $1 and khoan_ma = $2
        order by hieu_luc_tu desc limit 1`,
      [nv.id, k.khoan_ma],
    );
    if (co !== null && co.hieu_luc_den === null
        && Number(co.so_tien ?? 0) === 0 && Number(co.so_luong ?? 0) === 0) {
      console.log('DA CO dong 0d:', ma_nv, k.khoan_ma);
      continue;
    }
    await thuc_thi(
      `insert into chinh_sach_phu_cap
         (nhan_vien_id, khoan_ma, nguon_so_luong, so_luong, so_tien, hieu_luc_tu, ly_do)
       values ($1, $2, 'co_dinh', $3, $4, '2026-09-01', $5)`,
      [nv.id, k.khoan_ma, k.so_luong, k.so_tien, LY_DO],
    );
    tong_them += 1;
    console.log('DA THEM 0d:', ma_nv, k.khoan_ma);
  }
}
console.log('tong dong chinh sach them:', tong_them);

const so_phieu = await tinh_ky_luong(KY_ID, ky.thang);
console.log('so phieu da tinh lai ky', ky.thang + ':', so_phieu);

// Kiem lai: khoan tren phieu ky 9 cua 3 nguoi — mong KHONG con pc_an_trua / pc_trang_phuc / pc_trang_diem.
const con = await truy_van_mot(
  `select nv.ma_nv, pk.khoan_ma, pk.thanh_tien, pk.tu_chinh_sach
     from phieu_luong_khoan pk
     join phieu_luong p on p.id = pk.phieu_luong_id
     join nhan_vien nv on nv.id = p.nhan_vien_id
    where p.ky_luong_id = $1 and nv.ma_nv = any($2::text[])
      and pk.khoan_ma in ('pc_an_trua','pc_trang_phuc','pc_trang_diem')
    order by nv.ma_nv, pk.khoan_ma`,
  [KY_ID, MA_NV],
);
console.log('khoan phu cap con tren phieu 3 nguoi:', JSON.stringify(con));
