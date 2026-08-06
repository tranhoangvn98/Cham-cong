// Khoi tao du lieu toi thieu de he thong chay duoc ngay sau khi cai:
//   1 tai khoan admin, 1 ca hanh chinh, ngay le VN, 1 dia diem mau.
// Chay lai nhieu lan an toan (idempotent) — khong ghi de du lieu da co.
import { bam_mat_khau } from '../bao_mat/mat_khau.ts';
import { chay_di_tru } from './di_tru.ts';
import { dong_pool, truy_van_mot, thuc_thi } from './ket_noi.ts';

const NGAY_LE_CO_DINH = [
  ['01-01', 'Tet Duong lich'],
  ['04-30', 'Ngay Giai phong mien Nam'],
  ['05-01', 'Ngay Quoc te Lao dong'],
  ['09-02', 'Quoc khanh'],
] as const;

async function main(): Promise<void> {
  await chay_di_tru();

  // ---------------------------------------------------------------- ca hanh chinh
  const ca = await truy_van_mot<{ id: string }>(
    `insert into ca_lam (ten, gio_vao, gio_ra, nghi_tu, nghi_den,
                         dung_sai_muon_phut, dung_sai_som_phut, nguong_ot_phut,
                         qua_dem, phut_du_cong, cac_ngay_lam)
     select 'Hanh chinh', '08:00', '17:00', '12:00', '13:30', 5, 5, 30, false, 420, '{1,2,3,4,5}'
      where not exists (select 1 from ca_lam where ten = 'Hanh chinh')
     returning id`,
  );
  console.log(ca === null ? '[seed] ca "Hanh chinh" da co' : '[seed] da tao ca "Hanh chinh"');

  // ---------------------------------------------------------------- tai khoan admin
  const ten_dang_nhap = (process.env['ADMIN_TEN_DANG_NHAP'] ?? 'admin').trim();
  const mat_khau = process.env['ADMIN_MAT_KHAU'] ?? '';

  const da_co = await truy_van_mot<{ id: string }>(
    'select id from nguoi_dung where lower(ten_dang_nhap) = lower($1)',
    [ten_dang_nhap],
  );

  if (da_co !== null) {
    console.log(`[seed] tai khoan "${ten_dang_nhap}" da ton tai, khong thay doi`);
  } else if (mat_khau === '' || mat_khau.includes('doi_mat_khau')) {
    console.error(
      '[seed] CHUA TAO ADMIN: phai dat ADMIN_MAT_KHAU trong .env thanh mat khau that\n'
      + '       (toi thieu 8 ky tu, co ca chu va so). Chay lai `npm run seed` sau khi dat.',
    );
    process.exitCode = 1;
  } else {
    const hash = await bam_mat_khau(mat_khau);
    await thuc_thi(
      `insert into nguoi_dung(ten_dang_nhap, mat_khau_hash, vai_tro, phai_doi_mat_khau)
       values ($1, $2, 'admin', true)`,
      [ten_dang_nhap, hash],
    );
    console.log(
      `[seed] da tao admin "${ten_dang_nhap}". He thong se yeu cau doi mat khau o lan dang nhap dau.`,
    );
  }

  // ---------------------------------------------------------------- ngay le co dinh
  const nam = new Date().getUTCFullYear();
  let so_ngay_le = 0;
  for (const nam_can of [nam, nam + 1]) {
    for (const [md, ten] of NGAY_LE_CO_DINH) {
      so_ngay_le += await thuc_thi(
        `insert into ngay_le(ngay, ten, huong_luong) values ($1, $2, true)
         on conflict (ngay) do nothing`,
        [`${nam_can}-${md}`, ten],
      );
    }
  }
  console.log(`[seed] da them ${so_ngay_le} ngay le co dinh (${nam}-${nam + 1})`);
  console.log(
    '[seed] LUU Y: Tet Nguyen dan va cac ngay nghi bu theo lich am KHONG co san.\n'
    + '       Nhan su phai tu them qua POST /api/ngay-le hoac man hinh "Ngay le" tren webapp.',
  );
}

try {
  await main();
} catch (loi) {
  console.error('[seed] LOI:', (loi as Error).message);
  process.exitCode = 1;
} finally {
  await dong_pool();
}
