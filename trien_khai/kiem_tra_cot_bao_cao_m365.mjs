// In danh sach COT cua cac bao cao Microsoft 365 (chi doc) de biet trich duoc gi.
// Chay trong container: docker compose exec -T may_chu node /app/kiem_tra_cot_bao_cao_m365.mjs
import { lay_token_graph } from '/app/may_chu/dist/su_kien/gui_email.js';

const GOC = 'https://graph.microsoft.com/v1.0';
const token = await lay_token_graph();

const BAO_CAO = [
  ['M365 Apps', "getM365AppUserDetail(period='D30')"],
  ['OneDrive', "getOneDriveActivityUserDetail(period='D30')"],
  ['Email app', "getEmailAppUsageUserDetail(period='D30')"],
  ['Teams device', "getTeamsDeviceUsageUserDetail(period='D30')"],
  ['SharePoint', "getSharePointActivityUserDetail(period='D30')"],
];

for (const [nhan, duong] of BAO_CAO) {
  const res = await fetch(`${GOC}/reports/${duong}?$format=text/csv`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.log(`${nhan}: LOI ${res.status}`);
    continue;
  }
  const chu = await res.text();
  const dong = chu.split(/\r?\n/);
  const cot = (dong[0] ?? '').split(',');
  console.log(`\n=== ${nhan} — ${cot.length} cot, ${dong.length - 2} dong du lieu`);
  console.log(cot.map((c) => c.trim().replace(/^"|"$/g, '')).join(' | '));
}
process.exit(0);
