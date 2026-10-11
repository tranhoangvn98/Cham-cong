// 10/10/2026: HR da duyet cac don lam them thang 9 nhung chua co ban ghi KET QUA OT
// (nhan vien chua nop anh minh chung). Theo chi dao "cho chay lai bang luong co OT",
// tao ket qua OT trang thai da_duyet thay mat HR cho CAC DON THANG 9 da duyet du 2 cap,
// ghi ro nguon goc trong ghi_chu_duyet, roi tinh lai ngay cong + tinh lai ky 9.
//
// PHAM VI: chi don tu_ngay trong thang 9, loai lam_them, trang_thai = 'da_duyet',
// chua co dong ket_qua_ot nao. Don 03/10 (thang 10) va don cho_duyet (ERP1 07/9)
// KHONG dung vao — ky 10 chua ton tai va don chua duyet xong.
//
// Hoan tac neu can: delete ket_qua_ot co ghi_chu_duyet = 'HR duyet truc tiep...' roi
// tinh_lai_ngay + tinh_ky_luong lai.
//
// Chay TRONG container may_chu:
//   node /tmp/duyet_ket_qua_ot_hang_loat.mjs
import { truy_van, truy_van_mot, thuc_thi } from '/app/may_chu/dist/csdl/ket_noi.js';
import { tinh_lai_ngay } from '/app/may_chu/dist/cong/tinh_cong.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';

const KY_ID = '4a67743c-21e7-4aa4-b067-34d447913770'; // ky 2026-09
const GHI_CHU_DUYET = 'HR duyệt trực tiếp 10/10/2026 — không có ảnh minh chứng';

const ky = await truy_van_mot(
  'select thang, trang_thai from ky_luong where id = $1', [KY_ID],
);
if (ky === null) throw new Error('khong thay ky luong ' + KY_ID);
if (ky.trang_thai !== 'nhap') {
  throw new Error('ky ' + ky.thang + ' dang o trang thai ' + ky.trang_thai + ' — khong tinh lai');
}

const don = await truy_van(
  `select d.id as don_id, d.nhan_vien_id, to_char(d.tu_ngay,'YYYY-MM-DD') as ngay, nv.ma_nv
     from don_tu d
     join nhan_vien nv on nv.id = d.nhan_vien_id
    where d.loai = 'lam_them' and d.trang_thai = 'da_duyet'
      and d.tu_ngay between '2026-09-01' and '2026-09-30'
      and not exists (select 1 from ket_qua_ot k where k.don_tu_id = d.id)
    order by d.tu_ngay`,
);

let so_tao = 0;
const ngay_da_tinh = new Set();
for (const d of don) {
  const tao = await thuc_thi(
    `insert into ket_qua_ot (don_tu_id, ghi_chu, trang_thai, quyet_luc, ghi_chu_duyet)
     values ($1, $2, 'da_duyet', now(), $3)
     on conflict (don_tu_id) do nothing`,
    [d.don_id, 'Nộp thay theo chốt HR 10/10/2026', GHI_CHU_DUYET],
  );
  so_tao += tao;
  console.log('KET QUA OT DA DUYET:', d.ma_nv, d.ngay, tao === 1 ? '(tao moi)' : '(da co)');
  if (!ngay_da_tinh.has(d.nhan_vien_id + '|' + d.ngay)) {
    const kq = await tinh_lai_ngay(d.nhan_vien_id, d.ngay);
    console.log('  tinh lai ngay:', d.ngay, kq === null ? 'KHONG DUOC (ngay chot?)' : 'ok');
    ngay_da_tinh.add(d.nhan_vien_id + '|' + d.ngay);
  }
}

console.log('tong ket qua da tao:', so_tao);
const so_phieu = await tinh_ky_luong(KY_ID, ky.thang);
console.log('so phieu da tinh lai ky', ky.thang + ':', so_phieu);

// Kiem lai phut_ot bang cong + phieu luong cua nhung nguoi vua xu ly.
const kiem = await truy_van(
  `select nv.ma_nv, bc.ngay, bc.phut_ot,
          pl.phut_ot as pl_ot, pl.tien_ot
     from bang_cong_ngay bc
     join nhan_vien nv on nv.id = bc.nhan_vien_id
     left join phieu_luong pl on pl.nhan_vien_id = nv.id and pl.ky_luong_id = $1
    where bc.ngay between '2026-09-01' and '2026-09-30' and bc.phut_ot > 0
    order by bc.ngay, nv.ma_nv`,
  [KY_ID],
);
for (const r of kiem) {
  console.log(r.ma_nv, r.ngay, 'bangcong_ot=' + r.phut_ot, 'phieu_ot=' + r.pl_ot, 'tien_ot=' + r.tien_ot);
}
