// Khoa dang nhap + thu hoi phien + rut TOAN BO giay phep Microsoft 365 cho mot UPN.
// Dung DUNG ham nghiep vu cua he thong (`chan_dang_nhap_va_rut_giay_phep`), khong tu goi Graph
// theo cach khac — de mot duong duy nhat, va de job quet ngay mai thay dung ket qua.
//
// Chay TRONG container may_chu:
//   docker compose cp /tmp/khoa_m365.mjs may_chu:/tmp/
//   docker compose exec -T may_chu node /tmp/khoa_m365.mjs <upn>
import { chan_dang_nhap_va_rut_giay_phep } from '/app/may_chu/dist/nhan_su/ms365.js';
import { cau_hinh } from '/app/may_chu/dist/cau_hinh.js';
import { lay_token_graph } from '/app/may_chu/dist/su_kien/gui_email.js';

const upn = (process.argv[2] ?? '').trim();
if (upn === '' || !upn.includes('@')) {
  console.error('Thieu UPN. Vi du: node /tmp/khoa_m365.mjs a@b.vn');
  process.exit(1);
}

/** Doc trang thai THAT de kiem chung sau khi khoa. */
async function doc(upnCanDoc) {
  const token = await lay_token_graph();
  const res = await fetch(
    `${cau_hinh.mail.goc_graph}/users/${encodeURIComponent(upnCanDoc)}`
    + '?$select=accountEnabled,assignedLicenses',
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (res.status === 404) return { ton_tai: false };
  if (!res.ok) return { loi: `HTTP ${res.status}` };
  const j = await res.json();
  return {
    ton_tai: true,
    accountEnabled: j.accountEnabled,
    so_giay_phep: (j.assignedLicenses ?? []).length,
  };
}

console.log('truoc:', upn, JSON.stringify(await doc(upn)));
await chan_dang_nhap_va_rut_giay_phep(upn);
console.log('sau  :', upn, JSON.stringify(await doc(upn)));
process.exit(0);
