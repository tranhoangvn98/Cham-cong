// KIEM TRA (chi doc) 3 nguon du lieu Microsoft Graph dung cho tinh nang "ung dung bat buoc":
//   1. reports/getM365AppUserDetail          — Outlook/Teams theo Windows/Mobile (can Reports.Read.All)
//   2. reports/getOneDriveActivityUserDetail — so tep da dong bo (OneDrive tren may tinh)
//   3. reports/authenticationMethods/userRegistrationDetails — da dang ky Authenticator chua
//
// Chay TRONG container may_chu (dung token app-only san co):
//   docker compose exec -T may_chu node /app/kiem_tra_bao_cao_ms365.mjs
import { lay_token_graph } from '/app/may_chu/dist/su_kien/gui_email.js';

const GOC = 'https://graph.microsoft.com/v1.0';
const token = await lay_token_graph();
const dau = { authorization: `Bearer ${token}`, accept: 'text/csv' };

async function docCsv(duong) {
  const res = await fetch(`${GOC}${duong}`, { headers: dau, redirect: 'follow' });
  const than = await res.text();
  if (!res.ok) {
    console.log(`LOI ${String(res.status)} ${duong}\n${than.slice(0, 400)}`);
    return;
  }
  const dong = than.replace(/^\uFEFF/, '').split(/\r?\n/).filter((x) => x.trim() !== '');
  console.log(`OK ${duong}`);
  console.log(`  kieu: ${res.headers.get('content-type') ?? '?'} · ${String(dong.length - 1)} dong du lieu`);
  for (const d of dong.slice(0, 2)) console.log(`  ${d.slice(0, 400)}`);
}

await docCsv("/reports/getM365AppUserDetail(period='D30')?$format=text/csv");
await docCsv("/reports/getOneDriveActivityUserDetail(period='D30')?$format=text/csv");

const mfa = await fetch(`${GOC}/reports/authenticationMethods/userRegistrationDetails?$top=5`,
  { headers: { authorization: `Bearer ${token}` } });
console.log(`userRegistrationDetails: HTTP ${String(mfa.status)} ${(await mfa.text()).slice(0, 300)}`);

const tu = new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const loc = encodeURIComponent(`createdDateTime ge ${tu}T00:00:00Z`);
const signIn = await fetch(`${GOC}/auditLogs/signIns?$filter=${loc}&$top=10&$select=createdDateTime,appDisplayName,clientAppUsed,userPrincipalName,deviceDetail`,
  { headers: { authorization: `Bearer ${token}` } });
const thanSi = await signIn.text();
console.log(`auditLogs/signIns: HTTP ${String(signIn.status)} ${thanSi.slice(0, 800)}`);
