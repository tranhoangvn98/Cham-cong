// GAN LAI 4 LUOT QUET VOI PIN MOI CUA MAY TQ (26/10/2026).
//
// May da duoc doi sang dai 5001-5005 tai cho, nhung LECH so voi he thong:
//   tren may: 5001 = ThanThiVanAnh, 5002 = HuangSuPing, 5003 = LiChengZhen,
//             5004 = HuangLiHua,   5005 = XiaZiFeng
//   he thong: 5000 = Van Anh, 5001 = Huang, 5002 = XiaZiFeng, 5003 = LiChengZhen,
//             5004 = HuangLiHua
// Bon luot quet hom 26/10 mang PIN theo nghia TREN MAY, nen phai gan theo ten tren may:
//   5001 -> ERP27 Van Anh, 5002 -> ERP33 Huang, 5004 -> ERP97 HuangLiHua, 5005 -> ERP95 XiaZiFeng
//
// CHAY TRONG CONTAINER:
//   docker compose cp trien_khai/gan_lai_pin_tq_lan2.mjs may_chu:/app/
//   docker compose exec -T may_chu node /app/gan_lai_pin_tq_lan2.mjs
import { tinh_lai_nhieu } from '/app/may_chu/dist/cong/tinh_cong.js';
import { thuc_thi, truy_van, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';

const SERIAL = 'CGT1254800127';
const MAP = [
  ['5001', 'ERP27'],
  ['5002', 'ERP33'],
  ['5004', 'ERP97'],
  ['5005', 'ERP95'],
];

const cap = (rows) => rows.map((c) => `${c.nhan_vien_id}|${c.ngay}`);
const layCap = () => truy_van(
  `select distinct nhan_vien_id,
          to_char((thoi_diem + interval '7 hours')::date, 'YYYY-MM-DD') as ngay
     from lan_quet
    where thiet_bi_serial = $1
      and pin_may in ('5001', '5002', '5004', '5005')
      and nhan_vien_id is not null`,
  [SERIAL],
);

// --- 1. Cap (nguoi, ngay) CU
const cu = await layCap();

// --- 2. Gan lai
for (const [pin, maNv] of MAP) {
  const nv = await truy_van_mot('select id, ho_ten from nhan_vien where ma_nv = $1', [maNv]);
  if (nv === null) {
    console.error(`DUNG: khong thay nhan vien ${maNv}`);
    process.exit(1);
  }
  const n = await thuc_thi(
    'update lan_quet set nhan_vien_id = $1 where thiet_bi_serial = $2 and pin_may = $3',
    [nv.id, SERIAL, pin],
  );
  console.log(`PIN ${pin} -> ${maNv} ${nv.ho_ten}: ${n} luot`);
}

// --- 3. Cap MOI + tinh lai
const moi = await layCap();
const gop = new Map();
for (const c of [...cu, ...moi]) gop.set(`${c.nhan_vien_id}|${c.ngay}`, c);
const ds = [...gop.values()];
for (const c of ds) {
  await thuc_thi(
    `update bang_cong_ngay set da_chot = false
      where nhan_vien_id = $1 and ngay = $2 and co_dieu_chinh = false`,
    [c.nhan_vien_id, c.ngay],
  );
}
console.log(`Tinh lai ${await tinh_lai_nhieu(ds)} o cong.`);

// --- 4. Doi chieu
console.table(await truy_van(
  `select lq.pin_may, coalesce(nv.ma_nv, '-') as ma_nv, coalesce(nv.ho_ten, '(chua gan)') as ho_ten,
          (lq.thoi_diem + interval '7 hours')::timestamp(0)::text as luc
     from lan_quet lq left join nhan_vien nv on nv.id = lq.nhan_vien_id
    where lq.thiet_bi_serial = $1 and lq.pin_may in ('5001', '5002', '5004', '5005')
    order by lq.thoi_diem`,
  [SERIAL],
));
