// Rut toan bo giay phep cua mot UPN (KHONG khoa tai khoan) + in ten vai tro Entra dang giu.
// Dung khi tai khoan la ADMIN: Graph chan PATCH accountEnabled nhung assignLicense van cho phep.
import { cau_hinh } from '/app/may_chu/dist/cau_hinh.js';
import { lay_token_graph } from '/app/may_chu/dist/su_kien/gui_email.js';

const upn = (process.argv[2] ?? '').trim();
const token = await lay_token_graph();
const goc = cau_hinh.mail.goc_graph;

const dsRole = await (await fetch(`${goc}/directoryRoles`, {
  headers: { authorization: `Bearer ${token}` },
})).json().catch(() => ({ value: [] }));
const tenRole = new Map((dsRole.value ?? []).map((r) => [r.id, r.displayName]));

const thanhVien = await (await fetch(
  `${goc}/users/${encodeURIComponent(upn)}/transitiveMemberOf`,
  { headers: { authorization: `Bearer ${token}` } },
)).json().catch(() => ({ value: [] }));
console.log('Vai tro Entra:');
for (const m of thanhVien.value ?? []) {
  if (m['@odata.type'] !== '#microsoft.graph.directoryRole') continue;
  console.log(`  - ${tenRole.get(m.id) ?? m.id}`);
}

const u = await (await fetch(
  `${goc}/users/${encodeURIComponent(upn)}?$select=accountEnabled,assignedLicenses`,
  { headers: { authorization: `Bearer ${token}` } },
)).json();
const sku = (u.assignedLicenses ?? []).map((l) => l.skuId).filter(Boolean);
console.log('Truoc: accountEnabled =', u.accountEnabled, '| so giay phep =', sku.length);

if (sku.length === 0) {
  console.log('Khong con giay phep nao de rut.');
} else {
  const rut = await fetch(`${goc}/users/${encodeURIComponent(upn)}/assignLicense`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ addLicenses: [], removeLicenses: sku }),
  });
  console.log('Rut giay phep: HTTP', rut.status, rut.ok ? '' : (await rut.text()).slice(0, 300));
}

const sau = await (await fetch(
  `${goc}/users/${encodeURIComponent(upn)}?$select=accountEnabled,assignedLicenses`,
  { headers: { authorization: `Bearer ${token}` } },
)).json();
console.log('Sau : accountEnabled =', sau.accountEnabled,
  '| so giay phep =', (sau.assignedLicenses ?? []).length);
process.exit(0);
