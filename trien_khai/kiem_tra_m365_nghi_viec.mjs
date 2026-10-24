// KIEM TRA (chi doc) trang thai Entra cua cac tai khoan co su kien ms365.nghi_viec dang treo.
// Chay TRONG container may_chu:
//   docker compose cp trien_khai/kiem_tra_m365_nghi_viec.mjs may_chu:/tmp/
//   docker compose exec -T may_chu node /tmp/kiem_tra_m365_nghi_viec.mjs
// Khong thay doi gi tren Microsoft — chi GET /users de doc accountEnabled + assignedLicenses.

import { cau_hinh } from '/app/may_chu/dist/cau_hinh.js';
import { lay_token_graph } from '/app/may_chu/dist/su_kien/gui_email.js';

const DS_UPN = [
  'ly.kd@tranhoangvietnam.com',
  'nhu.kd@tranhoangvietnam.com',
  'ngoc.hr@tranhoangvietnam.com',
];

const token = await lay_token_graph();
console.log('lay token Graph: OK');

for (const upn of DS_UPN) {
  const res = await fetch(
    `${cau_hinh.mail.goc_graph}/users/${encodeURIComponent(upn)}?$select=accountEnabled,assignedLicenses,userPrincipalName`,
    { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) },
  );
  if (!res.ok) {
    console.log(upn, '-> HTTP', res.status, (await res.text()).slice(0, 200));
    continue;
  }
  const j = await res.json();
  console.log(upn, '-> accountEnabled =', j.accountEnabled,
    '| so giay phep dang gan =', (j.assignedLicenses ?? []).length);
}
process.exit(0);
