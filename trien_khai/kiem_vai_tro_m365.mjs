// Doc vai tro thu muc cua mot UPN de giai thich loi 403 khi khoa (chi doc).
import { cau_hinh } from '/app/may_chu/dist/cau_hinh.js';
import { lay_token_graph } from '/app/may_chu/dist/su_kien/gui_email.js';

const upn = (process.argv[2] ?? '').trim();
const token = await lay_token_graph();
const res = await fetch(
  `${cau_hinh.mail.goc_graph}/users/${encodeURIComponent(upn)}/transitiveMemberOf?$select=displayName,roleTemplateId`,
  { headers: { authorization: `Bearer ${token}` } },
);
console.log('HTTP', res.status);
const j = await res.json().catch(() => ({}));
for (const m of j.value ?? []) console.log(`- ${m.displayName ?? m['@odata.type']}`);
process.exit(0);
