// 10/10/2026: don cac dong GO TAY 0d (tu_chinh_sach = false, thanh_tien = 0) tren phieu
// luong ky 9 — dong thua do HR them khoan roi luu khong nhap so (nhat ky 07-08/10/2026).
//
// RIENG ERP2 (Nguyen Viet Minh Tien): HR chot 10/10/2026 Tien la NHAN SU OUTSOURCE, khong
// huong chinh sach phu cap — nen chinh sach pc_trang_diem 200.000d (Reset T8) la DU THUA:
// DONG hieu luc tu 01/09/2026 (hieu_luc_den = '2026-08-31') de ky 9 tro di khong sinh nua,
// va xoa dong go tay 0d tren phieu. KHONG xoa dong chinh sach han — giu dau vet lich su.
//
// Chay TRONG container may_chu (ban chay nay da co .env):
//   node /tmp/don_go_tay_0d.mjs
//
// Lua y: ky luong phai con trang thai 'nhap' moi tinh lai — ky da duyet thi dung lai.
import { thuc_thi, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';

const KY_ID = '4a67743c-21e7-4aa4-b067-34d447913770'; // ky 2026-09
// (ma_nv, khoan_ma) can don — chi xoa neu dong DANG 0d va tu_chinh_sach = false.
const CAP = [
  ['ERP2', 'pc_an_trua'], ['ERP2', 'pc_trang_phuc'], ['ERP2', 'pc_trang_diem'],
  ['ERP32', 'pc_an_trua'], ['ERP32', 'pc_trang_phuc'],
  ['lengoc', 'pc_an_trua'], ['lengoc', 'pc_trang_phuc'],
  ['hoangvietkd', 'pc_trang_diem'],
  ['ERP109', 'pc_kpi'], ['ERP109', 'pc_doanh_so'],
];

const ky = await truy_van_mot(
  'select thang, trang_thai from ky_luong where id = $1', [KY_ID],
);
if (ky === null) throw new Error('khong thay ky luong ' + KY_ID);
if (ky.trang_thai !== 'nhap') {
  throw new Error('ky ' + ky.thang + ' dang o trang thai ' + ky.trang_thai + ' — khong tinh lai');
}

let tong_xoa = 0;
for (const [ma_nv, khoan] of CAP) {
  const nv = await truy_van_mot(
    'select id, ho_ten from nhan_vien where ma_nv = $1 and dang_hoat_dong = true', [ma_nv],
  );
  if (nv === null) {
    console.log('BO QUA (khong thay nv hoat dong):', ma_nv, khoan);
    continue;
  }
  const phieu = await truy_van_mot(
    'select id from phieu_luong where ky_luong_id = $1 and nhan_vien_id = $2',
    [KY_ID, nv.id],
  );
  if (phieu === null) {
    console.log('BO QUA (khong co phieu ky):', ma_nv, khoan);
    continue;
  }
  const dong = await truy_van_mot(
    `select thanh_tien, tu_chinh_sach from phieu_luong_khoan
      where phieu_luong_id = $1 and khoan_ma = $2`,
    [phieu.id, khoan],
  );
  if (dong === null) {
    console.log('KHONG CO DONG:', ma_nv, khoan);
    continue;
  }
  // Chi xoa dong GO TAY dang 0d — dong co tien / dong chinh sach khong dung vao.
  if (Number(dong.thanh_tien) !== 0 || dong.tu_chinh_sach === true) {
    console.log('GIU NGUYEN (khong phai 0d go tay):', ma_nv, khoan, JSON.stringify(dong));
    continue;
  }
  const xoa = await thuc_thi(
    `delete from phieu_luong_khoan
      where phieu_luong_id = $1 and khoan_ma = $2
        and tu_chinh_sach = false and thanh_tien = 0`,
    [phieu.id, khoan],
  );
  tong_xoa += xoa;
  console.log('DA XOA:', ma_nv, khoan, '-', xoa, 'dong');
}

console.log('tong so dong da xoa:', tong_xoa);

// Dong chinh sach pc_trang_diem 200k cua ERP2 (outsource): dong hieu luc tu 01/09/2026.
const dong_cs = await thuc_thi(
  `update chinh_sach_phu_cap cs
      set hieu_luc_den = '2026-08-31'
    from nhan_vien nv
   where cs.nhan_vien_id = nv.id and nv.ma_nv = 'ERP2'
     and cs.khoan_ma = 'pc_trang_diem'
     and (cs.hieu_luc_den is null or cs.hieu_luc_den > '2026-08-31')`,
);
console.log('chinh sach trang diem ERP2 da dong hieu luc:', dong_cs);

const so_phieu = await tinh_ky_luong(KY_ID, ky.thang);
console.log('so phieu da tinh lai ky', ky.thang + ':', so_phieu);

// Kiem lai: con dong 0d go tay nao trong ky khong + dong trang diem ERP2 da sinh lai chua.
const con_0d = await truy_van_mot(
  `select count(*)::int as so from phieu_luong_khoan pk
     join phieu_luong p on p.id = pk.phieu_luong_id
    where p.ky_luong_id = $1 and pk.tu_chinh_sach = false and pk.thanh_tien = 0`,
  [KY_ID],
);
const sau = await truy_van_mot(
  `select pk.thanh_tien, pk.tu_chinh_sach, pk.so_luong
     from phieu_luong_khoan pk
     join phieu_luong p on p.id = pk.phieu_luong_id
     join nhan_vien nv on nv.id = p.nhan_vien_id
    where p.ky_luong_id = $1 and nv.ma_nv = 'ERP2' and pk.khoan_ma = 'pc_trang_diem'`,
  [KY_ID],
);
console.log('con 0d go tay trong ky:', con_0d?.so ?? -1);
console.log('trang diem ERP2 sau tinh lai (mong null = outsource khong con khoan):', JSON.stringify(sau));
