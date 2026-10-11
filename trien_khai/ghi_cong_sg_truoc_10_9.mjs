#!/usr/bin/env node
// GHI CONG TAY CHO NHOM SG — CAC NGAY TRUOC 10/09/2026 (chua co may cham cong o SG).
//
// Boi canh: may cham cong SG (2145254601578) bat dau co du lieu tu 10/09/2026. Nhung ngay
// truoc do HR cung cap bang cong tam. Script nay ghi cho 5 nguoi:
//   - Ngay DI LAM: them 2 lan quet nguon 'thu_cong' (gio vao/ra lay theo ca lam cua tung nguoi;
//     thu Bay lay khung gio rieng cua ca) roi tinh lai cong ngay do.
//   - Ngay NGHI PHEP (Son 3/9): tao don phep nam trang thai 'da_duyet' roi tinh lai cong.
// Tu 10/09 tro di KHONG dung toi — du lieu may cham cong giu nguyen.
//
// Hoan tac: chay lai voi tham so --hoan-tac de xoa cac ban ghi script nay tao roi tinh lai.
//
// CHAY TRONG CONTAINER may_chu (giong ap_chinh_sach_thang_9.mjs):
//   docker compose cp trien_khai/ghi_cong_sg_truoc_10_9.mjs may_chu:/app/
//   docker compose exec may_chu node /app/ghi_cong_sg_truoc_10_9.mjs
import { tinh_lai_ngay } from '/app/may_chu/dist/cong/tinh_cong.js';
import { tinh_ky_luong } from '/app/may_chu/dist/luong/ky_luong.js';
import { ban_don_am_tham } from '/app/may_chu/dist/don_tu/ban_don.js';
import { id_tai_khoan_he_thong } from '/app/may_chu/dist/bao_mat/tai_khoan_he_thong.js';
import { cau_hinh } from '/app/may_chu/dist/cau_hinh.js';
import { thuc_thi, truy_van, truy_van_mot } from '/app/may_chu/dist/csdl/ket_noi.js';

const HOAN_TAC = process.argv.includes('--hoan-tac');
const MOC_MAY = '2026-09-10'; // tu ngay nay: theo du lieu may cham cong
const DAU_KHOA = 'thu_cong-sg|'; // khoa chong trung de nhan dien ban ghi cua script nay
const GHI_CHU_QUET = 'Nhập tay: SG chưa có máy chấm công trước 10/09/2026';
const GHI_CHU_PHEP = 'Ghi nhận tạm: SG chưa có máy chấm công trước 10/09/2026 (theo bảng chấm công HR)';

// Bang cong tam truoc 10/09 do HR cung cap.
// Chu y: HR ghi "Nguyễn Thị Thủy Tiên" — trong he thong nguoi ten Thuy Tien duy nhat la
// ERP148 "Lê Thị Thủy Tiên" (vào 22/06/2026), ghi cong cho nguoi nay.
const DU_LIEU = [
  {
    ma_nv: 'ERP124',
    ngay_lam: ['2026-09-04', '2026-09-05', '2026-09-07', '2026-09-08', '2026-09-09'],
    nghi_phep: ['2026-09-03'],
  },
  {
    ma_nv: 'ERP148',
    ngay_lam: ['2026-09-03', '2026-09-04', '2026-09-05', '2026-09-07', '2026-09-08', '2026-09-09'],
    nghi_phep: [],
  },
  {
    ma_nv: 'ERP125',
    ngay_lam: ['2026-09-03', '2026-09-04', '2026-09-05', '2026-09-07', '2026-09-08', '2026-09-09'],
    nghi_phep: [],
  },
  {
    ma_nv: 'ERP157',
    ngay_lam: ['2026-09-04', '2026-09-05', '2026-09-07', '2026-09-08', '2026-09-09'],
    nghi_phep: [],
  },
  {
    ma_nv: 'ERP69',
    ngay_lam: ['2026-09-03', '2026-09-04', '2026-09-05', '2026-09-07', '2026-09-08', '2026-09-09'],
    nghi_phep: [],
  },
];

const OFFSET = cau_hinh.device_tz_offset_hours;

/** Timestamptz theo gio dia phuong noi dat may: '2026-09-04 08:00' -> chuoi co offset. */
function gio_dia_phuong_sang_ts(ngay, hh_mm) {
  const dau = OFFSET >= 0 ? '+' : '-';
  const so = Math.abs(OFFSET);
  const gio = String(Math.floor(so)).padStart(2, '0');
  const phut = String(Math.round((so % 1) * 60)).padStart(2, '0');
  return `${ngay} ${hh_mm}:00${dau}${gio}:${phut}`;
}

/** Thu trong tuan cua mot ngay 'YYYY-MM-DD' theo quy uoc CSDL: 0=CN ... 6=T7. */
function thu_cua_ngay(ngay) {
  return new Date(`${ngay}T00:00:00Z`).getUTCDay();
}

const THU_BAY = 6;

console.log(`=== ${HOAN_TAC ? 'HOAN TAC' : 'GHI CONG TAY'} SG truoc ${MOC_MAY} ===`);
console.log(`Mui gio noi dat may: UTC${OFFSET >= 0 ? '+' : ''}${OFFSET}`);
console.log('');

// ---------------------------------------------------------------- hang rao: ky luong
const kl = await truy_van_mot(
  `select id, trang_thai from ky_luong where thang = '2026-09'`,
);
if (kl === null) {
  console.error('DUNG: chua co ky luong 2026-09.');
  process.exit(1);
}
if (kl.trang_thai === 'cho_duyet') {
  await thuc_thi(
    `update ky_luong set trang_thai = 'nhap', gui_duyet_luc = null, cap_nhat_luc = now()
      where id = $1`,
    [kl.id],
  );
  console.log('Ky 2026-09 dang cho_duyet -> dua ve nhap de tinh lai.');
}
if (kl.trang_thai !== 'nhap') {
  console.error(`DUNG: ky 2026-09 dang '${kl.trang_thai}' — can thu hoi duyet bang tay.`);
  process.exit(1);
}

// ---------------------------------------------------------------- nap nhan vien + ca
const nhan_vien = [];
for (const dong of DU_LIEU) {
  const nv = await truy_van_mot(
    `select id, ma_nv, ho_ten, dang_hoat_dong, ca_lam_id
       from nhan_vien where ma_nv = $1`,
    [dong.ma_nv],
  );
  if (nv === null) {
    console.error(`DUNG: khong tim thay ma_nv '${dong.ma_nv}'.`);
    process.exit(1);
  }
  if (!nv.dang_hoat_dong) {
    console.error(`DUNG: ${nv.ma_nv} ${nv.ho_ten} da nghi viec.`);
    process.exit(1);
  }
  // Khung gio lam theo thu (vd sang thu Bay) — khong co dong nao = dung khung gio chinh.
  nv.theo_thu = await truy_van(
    `select thu, to_char(gio_vao, 'HH24:MI') as gio_vao, to_char(gio_ra, 'HH24:MI') as gio_ra
       from ca_lam_theo_thu where ca_lam_id = $1 order by thu`,
    [nv.ca_lam_id],
  );
  nv.ca = await truy_van_mot(
    `select to_char(gio_vao, 'HH24:MI') as gio_vao, to_char(gio_ra, 'HH24:MI') as gio_ra
       from ca_lam where id = $1`,
    [nv.ca_lam_id],
  );
  for (const ngay of [...dong.ngay_lam, ...dong.nghi_phep]) {
    if (ngay >= MOC_MAY) {
      console.error(`DUNG: ${dong.ma_nv} co ngay ${ngay} >= ${MOC_MAY} — tu ngay nay theo may.`);
      process.exit(1);
    }
  }
  nhan_vien.push({ ...dong, ...nv });
}

/** Gio vao/ra cua mot nguoi trong mot ngay theo ca (khung rieng thu Bay neu co). */
function khung_gio(nv, ngay) {
  const thu = thu_cua_ngay(ngay);
  const rieng = nv.theo_thu.find((r) => r.thu === thu);
  if (rieng !== undefined) return { vao: rieng.gio_vao, ra: rieng.gio_ra };
  if (nv.ca !== null) return { vao: nv.ca.gio_vao, ra: nv.ca.gio_ra };
  // Chua gan ca: dung gio hanh chinh mac dinh (chi de khong dung script giua chung).
  console.warn(`CANH BAO: ${nv.ma_nv} chua gan ca — dung 08:00/17:30.`);
  return { vao: '08:00', ra: '17:30' };
}

// ---------------------------------------------------------------- ke hoach truoc khi ghi
console.log('--- Ke hoach ---');
for (const nv of nhan_vien) {
  for (const ngay of nv.ngay_lam) {
    const k = khung_gio(nv, ngay);
    const t7 = thu_cua_ngay(ngay) === THU_BAY ? ' (thu Bay — nua cong)' : '';
    console.log(`  ${nv.ma_nv} ${nv.ho_ten}: ${ngay} vao ${k.vao} ra ${k.ra}${t7}`);
  }
  for (const ngay of nv.nghi_phep) {
    console.log(`  ${nv.ma_nv} ${nv.ho_ten}: ${ngay} NGHI PHEP NAM (da duyet)`);
  }
}
console.log('');

const he_thong_id = HOAN_TAC ? null : await id_tai_khoan_he_thong();

if (HOAN_TAC) {
  // ---------------------------------------------------------------- hoan tac
  const ma_danh_sach = nhan_vien.map((nv) => nv.ma_nv);
  const xoa_quet = await thuc_thi(
    `delete from lan_quet
      where khoa_chong_trung like $1
        and ghi_chu = $2
        and nhan_vien_id in (select id from nhan_vien where ma_nv = any($3))`,
    [`${DAU_KHOA}%`, GHI_CHU_QUET, ma_danh_sach],
  );
  console.log(`Xoa ${xoa_quet} lan quet thu_cong cua script.`);

  const xoa_phep = await thuc_thi(
    `delete from don_nghi_phep
      where ly_do = $1
        and trang_thai = 'da_duyet'
        and nhan_vien_id in (select id from nhan_vien where ma_nv = any($2))`,
    [GHI_CHU_PHEP, ma_danh_sach],
  );
  console.log(`Xoa ${xoa_phep} don nghi phep cua script.`);

  // Tinh lai cac ngay da dung toi de ve trang thai truoc khi ghi.
  for (const nv of nhan_vien) {
    for (const ngay of [...nv.ngay_lam, ...nv.nghi_phep]) {
      await tinh_lai_ngay(nv.id, ngay);
    }
  }
  const sp = await tinh_ky_luong(kl.id, '2026-09');
  console.log(`Tinh lai ${sp} phieu luong thang 9.`);
  console.log('HOAN TAC XONG.');
  process.exit(0);
}

// ---------------------------------------------------------------- ghi lan quet thu_cong
let so_quet_them = 0;
for (const nv of nhan_vien) {
  for (const ngay of nv.ngay_lam) {
    const k = khung_gio(nv, ngay);
    for (const [hh_mm, trang_thai] of [[k.vao, 0], [k.ra, 1]]) {
      const khoa = `${DAU_KHOA}${nv.ma_nv}|${ngay}|${trang_thai}`;
      const them = await thuc_thi(
        `insert into lan_quet
           (nguon, thiet_bi_serial, pin_may, nhan_vien_id, thoi_diem,
            trang_thai, xac_thuc, ma_cong_viec, khoa_chong_trung,
            trang_thai_duyet, ghi_chu)
         values ('thu_cong', null, null, $1, $2::timestamptz, $3, 9, 0, $4, 'tu_dong', $5)
         on conflict (khoa_chong_trung) do nothing`,
        [nv.id, gio_dia_phuong_sang_ts(ngay, hh_mm), trang_thai, khoa, GHI_CHU_QUET],
      );
      so_quet_them += them;
    }
  }
}
console.log(`Da them ${so_quet_them} lan quet thu_cong.`);

// ---------------------------------------------------------------- don nghi phep (Son 3/9)
let so_phep_them = 0;
for (const nv of nhan_vien) {
  for (const ngay of nv.nghi_phep) {
    const co_don = await truy_van_mot(
      `select id from don_nghi_phep
        where nhan_vien_id = $1 and tu_ngay <= $2 and den_ngay >= $2`,
      [nv.id, ngay],
    );
    if (co_don !== null) {
      console.log(`  ${nv.ma_nv} ${ngay}: da co don nghi phep, bo qua.`);
      continue;
    }
    const dong = await truy_van_mot(
      `insert into don_nghi_phep
         (nhan_vien_id, loai, tu_ngay, den_ngay, nua_ngay, ly_do, trang_thai,
          nguoi_duyet_id, ghi_chu_duyet, quyet_luc)
       values ($1, 'phep_nam', $2, $2, false, $3, 'da_duyet', $4, $5, now())
       returning id`,
      [nv.id, ngay, GHI_CHU_PHEP, he_thong_id,
       'Nhập tay bởi bộ phận nhân sự (ngoài luồng duyệt web)'],
    );
    if (dong !== null) {
      so_phep_them++;
      await ban_don_am_tham('nghi_phep', dong.id); // sinh ban don PDF vao ho so
    }
  }
}
console.log(`Da tao ${so_phep_them} don nghi phep nam.`);

// ---------------------------------------------------------------- tinh lai bang cong
let so_ngay_da_tinh = 0;
for (const nv of nhan_vien) {
  for (const ngay of [...nv.ngay_lam, ...nv.nghi_phep]) {
    const kq = await tinh_lai_ngay(nv.id, ngay);
    if (kq !== null) so_ngay_da_tinh++;
  }
}
console.log(`Da tinh lai ${so_ngay_da_tinh} o bang cong.`);

// ---------------------------------------------------------------- tinh lai phieu luong
const sp = await tinh_ky_luong(kl.id, '2026-09');
console.log(`Da tinh lai ${sp} phieu luong thang 9.`);

// ---------------------------------------------------------------- doi chieu ket qua
console.log('');
console.log('=== Doi chieu bang cong 3/9 - 9/9 ===');
console.table(await truy_van(
  `select nv.ma_nv, nv.ho_ten, bc.ngay, bc.trang_thai,
          to_char(bc.gio_vao, 'HH24:MI') as gio_vao,
          to_char(bc.gio_ra, 'HH24:MI') as gio_ra,
          bc.phut_lam, bc.so_cong, bc.ghi_chu
     from bang_cong_ngay bc
     join nhan_vien nv on nv.id = bc.nhan_vien_id
    where nv.ma_nv = any($1)
      and bc.ngay between '2026-09-03' and '2026-09-09'
    order by nv.ma_nv, bc.ngay`,
  [nhan_vien.map((nv) => nv.ma_nv)],
));

console.log('=== Tong cong 3/9 - 9/9 theo nguoi ===');
console.table(await truy_van(
  `select nv.ma_nv, nv.ho_ten,
          count(*) filter (where bc.trang_thai = 'co_mat')::int as ngay_co_mat,
          count(*) filter (where bc.trang_thai = 'nghi_phep')::int as ngay_nghi_phep,
          count(*) filter (where bc.trang_thai = 'vang')::int as ngay_vang,
          coalesce(sum(bc.so_cong), 0) as tong_cong
     from nhan_vien nv
     join bang_cong_ngay bc on bc.nhan_vien_id = nv.id
    where nv.ma_nv = any($1)
      and bc.ngay between '2026-09-03' and '2026-09-09'
    group by nv.ma_nv, nv.ho_ten
    order by nv.ma_nv`,
  [nhan_vien.map((nv) => nv.ma_nv)],
));
console.log('XONG.');
process.exit(0);
