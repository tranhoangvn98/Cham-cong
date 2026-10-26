// Doc chi tiet nguon cap giay phep (truc tiep hay qua group) cua mot UPN — chi doc.
import { cau_hinh } from '/app/may_chu/dist/cau_hinh.js';
import { lay_token_graph } from '/app/may_chu/dist/su_kien/gui_email.js';

const upn = (process.argv[2] ?? '').trim();
const token = await lay_token_graph();
const res = await fetch(
  `${cau_hinh.mail.goc_graph}/users/${encodeURIComponent(upn)}`
  + '?$select=accountEnabled,assignedLicenses,licenseAssignmentStates',
  { headers: { authorization: `Bearer ${token}` } },
);
console.log('HTTP', res.status);
const j = await res.json().catch(() => ({}));
console.log('accountEnabled:', j.accountEnabled);
console.log('assignedLicenses:', JSON.stringify(j.assignedLicenses ?? []));
for (const s of j.licenseAssignmentStates ?? []) {
  console.log(' - sku', s.skuId, '| nguon:', s.assignedByGroup === null ? 'truc tiep' : `group ${s.assignedByGroup}`,
    '| trang thai:', s.state, s.error ?? '');
}
process.exit(0);
