// CA KHO TRUNG QUOC 09:00-18:00 (26/10/2026).
//
// HR chot: ca kho Trung Quoc la 09:00 sang - 18:00 chieu (T2-T7 nhu kho Ha Noi).
// Khong sua ca "Hanh chinh (theo HĐLĐ)" vi ca do nhieu nguoi khac dang dung —
// tao ca rieng "Kho Trung Quốc" roi gan cho 5 nguoi ERP27/33/95/96/97.
//
// Gia dinh (co the doi 1 dong): nghi trua 12:00-13:30 giong ca Kho Ha Noi,
// phut_du_cong 420, dung sai 10/5 phut, nguong OT 30 phut, lam T2-T7.
//
// CHAY TRONG CONTAINER:
//   docker compose cp trien_khai/ca_kho_tq_20261026.mjs may_chu:/app/
//   docker compose exec -T may_chu node /app/ca_kho_tq_20261026.mjs
import { tinh_lai_khoang } from '/app/may_chu/dist/cong/tinh_cong.js';
import { thuc_thi, truy_van, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';

const DS = ['ERP27', 'ERP33', 'ERP95', 'ERP96', 'ERP97'];
const TU = '2026-10-09';
const DEN = '2026-10-26';

// --- 1. Ca lam
let ca = await truy_van_mot('select id from ca_lam where ten = $1', ['Kho Trung Quốc']);
if (ca === null) {
  ca = await truy_van_mot(
    `insert into ca_lam(ten, gio_vao, gio_ra, nghi_tu, nghi_den,
                        dung_sai_muon_phut, dung_sai_som_phut, nguong_ot_phut,
                        qua_dem, phut_du_cong, cac_ngay_lam, dang_hoat_dong)
     values ('Kho Trung Quốc', '09:00', '18:00', '12:00', '13:30',
             10, 5, 30, false, 420, '{1,2,3,4,5,6}', true)
     returning id`,
    [],
  );
  console.log(`Da tao ca "Kho Trung Quốc" 09:00-18:00 (id ${ca.id}).`);
} else {
  await thuc_thi(
    `update ca_lam
        set gio_vao = '09:00', gio_ra = '18:00',
            nghi_tu = '12:00', nghi_den = '13:30',
            phut_du_cong = 420, cac_ngay_lam = '{1,2,3,4,5,6}', dang_hoat_dong = true
      where id = $1`,
    [ca.id],
  );
  console.log(`Da cap nhat ca "Kho Trung Quốc" 09:00-18:00 (id ${ca.id}).`);
}

// --- 2. Gan ca cho 5 nguoi kho TQ
for (const ma of DS) {
  const n = await thuc_thi(
    'update nhan_vien set ca_lam_id = $1 where ma_nv = $2',
    [ca.id, ma],
  );
  console.log(`${ma}: gan ca (${n} dong)`);
}

// --- 3. Mo khoa o cong bi anh huong (giu nguyen o sua tay)
const mo = await thuc_thi(
  `update bang_cong_ngay bc set da_chot = false
     from nhan_vien nv
    where nv.id = bc.nhan_vien_id and nv.ma_nv = any($1::text[])
      and bc.ngay between $2 and $3 and bc.co_dieu_chinh = false`,
  [DS, TU, DEN],
);
console.log(`Mo khoa ${mo} o cong.`);

// --- 4. Tinh lai tung nguoi
for (const ma of DS) {
  const nv = await truy_van_mot('select id from nhan_vien where ma_nv = $1', [ma]);
  const n = await tinh_lai_khoang(TU, DEN, nv.id);
  console.log(`${ma}: tinh lai ${n} o.`);
}

// --- 5. Doi chieu
console.log('=== Cong 09-26/10 theo ca moi ===');
console.table(await truy_van(
  `select nv.ma_nv, bc.ngay::text as ngay, bc.trang_thai,
          coalesce(to_char(bc.gio_vao + interval '7 hours', 'HH24:MI'), '-') as vao,
          coalesce(to_char(bc.gio_ra + interval '7 hours', 'HH24:MI'), '-') as ra,
          bc.so_cong,
          left(coalesce(bc.ghi_chu, ''), 38) as ghi_chu
     from bang_cong_ngay bc join nhan_vien nv on nv.id = bc.nhan_vien_id
    where nv.ma_nv = any($1::text[]) and bc.ngay between $2 and $3
    order by nv.ma_nv, bc.ngay`,
  [DS, TU, DEN],
));

console.log('=== Tong hop ===');
console.table(await truy_van(
  `select nv.ma_nv, nv.ho_ten,
          count(*) filter (where bc.trang_thai = 'co_mat')::int as ngay_co_mat,
          sum(bc.so_cong)::numeric(10,1) as tong_cong
     from bang_cong_ngay bc join nhan_vien nv on nv.id = bc.nhan_vien_id
    where nv.ma_nv = any($1::text[]) and bc.ngay between $2 and $3
    group by 1, 2 order by 1`,
  [DS, TU, DEN],
));
