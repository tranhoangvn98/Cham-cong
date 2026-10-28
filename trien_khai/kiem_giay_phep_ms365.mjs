// Kiem tra (chi doc) giay phep hien tai cua vai UPN — chay trong container may_chu.
//   docker compose cp trien_khai/kiem_giay_phep_ms365.mjs may_chu:/tmp/
//   docker compose exec -T may_chu node /tmp/kiem_giay_phep_ms365.mjs a@x.vn b@x.vn
import { lay_token_graph } from '/app/may_chu/dist/su_kien/gui_email.js';
import { cau_hinh } from '/app/may_chu/dist/cau_hinh.js';

const GOC = cau_hinh.mail.goc_graph;
const token = await lay_token_graph();
const dau = { authorization: `Bearer ${token}` };

// Bang ten goi giay phep (skuId -> skuPartNumber) de doc ket qua cho de hieu.
const skus = await fetch(`${GOC}/subscribedSkus?$select=skuId,skuPartNumber,consumedUnits,prepaidUnits`, { headers: dau });
const ten = new Map();
if (skus.ok) {
  const kq = await skus.json();
  for (const s of kq.value ?? []) ten.set(s.skuId, s.skuPartNumber);
}

for (const upn of process.argv.slice(2)) {
  const res = await fetch(`${GOC}/users/${encodeURIComponent(upn)}?$select=userPrincipalName,usageLocation,assignedLicenses,accountEnabled`, { headers: dau });
  if (!res.ok) { console.log(`${upn}: HTTP ${res.status}`); continue; }
  const u = await res.json();
  const ds = (u.assignedLicenses ?? []).map((l) => `${l.skuId} (${ten.get(l.skuId) ?? 'khong ro ten'})`);
  console.log(`${u.userPrincipalName}  enabled=${String(u.accountEnabled)}  usageLocation=${u.usageLocation ?? '(trong)'}`);
  console.log(`  giay phep: ${ds.length === 0 ? '(khong co)' : ds.join(', ')}`);
}
process.exit(0);
