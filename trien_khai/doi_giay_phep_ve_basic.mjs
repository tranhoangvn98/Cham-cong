// Doi giay phep cua MOT tai khoan ve Microsoft 365 Business Basic.
//
// MOT lan goi assignLicense: them Basic + rut cac goi khac CUNG LUC — khong de khoang trong
// khong co giay phep (rut truoc roi cap sau thi nguoi dung mat quyen dung giua hai buoc).
//
// Chay trong container may_chu:
//   docker compose cp trien_khai/doi_giay_phep_ve_basic.mjs may_chu:/tmp/
//   docker compose exec -T may_chu node /tmp/doi_giay_phep_ve_basic.mjs <upn>
//
// Khong truyen UPN thi chi IN trang thai hien tai (che do xem), khong ghi gi.
import { lay_token_graph } from '/app/may_chu/dist/su_kien/gui_email.js';
import { cau_hinh } from '/app/may_chu/dist/cau_hinh.js';
import { dung_than_cap_giay_phep, ten_goi_giay_phep } from '/app/may_chu/dist/nhan_su/ms365.js';
import { truy_van, thuc_thi } from '/app/may_chu/dist/csdl/ket_noi.js';

const GOC = cau_hinh.mail.goc_graph;
const BASIC = cau_hinh.ms365_tao.sku_basic.trim();
if (BASIC === '') throw new Error('Chua khai MS365_SKU_BASIC — dung lai.');

const upn = (process.argv[2] ?? '').trim().toLowerCase();
if (upn === '' || !upn.includes('@')) {
  console.log('Dung: node doi_giay_phep_ve_basic.mjs <upn>');
  process.exit(0);
}

const token = await lay_token_graph();
const dau = { authorization: `Bearer ${token}` };

const doc = await fetch(
  `${GOC}/users/${encodeURIComponent(upn)}?$select=id,userPrincipalName,usageLocation,assignedLicenses`,
  { headers: dau },
);
if (!doc.ok) throw new Error(`Graph từ chối đọc ${upn} (HTTP ${doc.status})`);
const u = await doc.json();
const dang_co = (u.assignedLicenses ?? []).map((l) => l.skuId ?? '').filter((s) => s !== '');
console.log(`${u.userPrincipalName}: ${dang_co.length === 0 ? '(không có giấy phép)' : dang_co.map((s) => `${ten_goi_giay_phep(s)} [${s}]`).join(', ')}`);

if (dang_co.includes(BASIC)) {
  console.log('Đã có đúng Business Basic — không làm gì.');
  process.exit(0);
}
if (dang_co.length === 0) {
  console.log('Tài khoản không có giấy phép nào — dùng luồng cấp bình thường, không dùng script đổi.');
  process.exit(0);
}

// Doi mot lan: them Basic, rut tat ca goi khac.
const than = { ...dung_than_cap_giay_phep(BASIC), removeLicenses: dang_co.filter((s) => s !== BASIC) };
const dat = await fetch(`${GOC}/users/${encodeURIComponent(upn)}/assignLicense`, {
  method: 'POST',
  headers: { ...dau, 'content-type': 'application/json' },
  body: JSON.stringify(than),
});
const than_loi = await dat.text();
if (!dat.ok) throw new Error(`Graph từ chối đổi giấy phép ${upn} (HTTP ${dat.status}): ${than_loi.slice(0, 300)}`);

const sau = await fetch(`${GOC}/users/${encodeURIComponent(upn)}?$select=assignedLicenses`, { headers: dau });
const ds_sau = (((await sau.json()) ?? {}).assignedLicenses ?? []).map((l) => l.skuId ?? '');
console.log(`Đã đổi: ${ds_sau.map((s) => ten_goi_giay_phep(s)).join(', ')}`);

const nv = await truy_van('select id, ma_nv from nhan_vien where lower(email) = $1 limit 1', [upn]);
const dong = nv[0];
if (dong !== undefined) {
  await thuc_thi(
    `insert into nhat_ky_thao_tac(nguoi_dung_id, hanh_dong, thuc_the, thuc_the_id, chi_tiet)
     values (null, 'doi_giay_phep_ms365', 'nhan_vien', $1, $2::jsonb)`,
    [dong.id, JSON.stringify({
      ma_nv: dong.ma_nv, upn,
      rut: dang_co, cap: BASIC,
      ly_do: 'Chot 29/10/2026: ha ve Business Basic theo chinh sach moi',
    })]);
  console.log(`Đã ghi nhật ký cho ${dong.ma_nv}.`);
}
process.exit(0);
