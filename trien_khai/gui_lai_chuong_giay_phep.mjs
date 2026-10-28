// Gui lai chuong "tai khoan da co giay phep khac" voi TEN GOI thay vi ma GUID.
//
// Ban 1.138.3 da gui 5 chuong voi ten goi la ma skuId; script nay xoa dung 5 chuong do roi gui
// lai bang ham da sua (ban 1.138.4). Chay trong container may_chu:
//   docker compose cp trien_khai/gui_lai_chuong_giay_phep.mjs may_chu:/tmp/
//   docker compose exec -T may_chu node /tmp/gui_lai_chuong_giay_phep.mjs
import { truy_van, thuc_thi } from '/app/may_chu/dist/csdl/ket_noi.js';
import { bao_giay_phep_da_co_khac } from '/app/may_chu/dist/nhan_su/ms365.js';

const TIEU_DE = 'Tài khoản Microsoft có giấy phép khác — chưa cấp tự động';

const da_xoa = await truy_van(
  'delete from thong_bao_rieng where tieu_de = $1 returning id, nguoi_dung_id', [TIEU_DE]);
console.log(`Da xoa ${da_xoa.length} chuong cu (ten goi la ma GUID).`);

const nv = await truy_van(
  `select nv.id, nv.ma_nv, nv.ho_ten, nv.email
     from nhan_vien nv where nv.ma_nv = 'NVVP10260003'`);
const nguoi = nv[0];
if (nguoi === undefined) throw new Error('Khong thay ho so NVVP10260003 — dung lai.');

await bao_giay_phep_da_co_khac(
  nguoi.email, nguoi.ho_ten, nguoi.ma_nv,
  ['e0dfc8b9-9531-4ec8-94b4-9fec23b05fc8'],
  '3b555118-da6a-4418-894f-7df1e2096870');
console.log('Da gui lai chuong voi ten goi.');

// Ghi nhat ky de biet chuong cu bi thay vi sao.
await thuc_thi(
  `insert into nhat_ky_thao_tac(nguoi_dung_id, hanh_dong, thuc_the, thuc_the_id, chi_tiet)
   values (null, 'gui_lai_chuong_giay_phep', 'nhan_vien', $1, $2::jsonb)`,
  [nguoi.id, JSON.stringify({ so_chuong_xoa: da_xoa.length, ly_do: 'Ten goi la ma GUID (1.138.3)' })]);
process.exit(0);
