// KIEM TRA (chi doc) cac API kiem ke ung dung da cai co san sang chua.
//
// Chay TRONG container may_chu:
//   docker compose exec -T may_chu node /app/kiem_tra_api_kiem_ke_ung_dung.mjs
//
// Y nghia tung dong:
//   Intune managedDevices     200 = Intune da kich hoat; 400/403 = chua bat/chua cap quyen
//   Intune detectedApps       200 = co the doc danh sach ung dung da cai (can thiet bi enroll)
//   Defender TVM              200 = co Defender for Endpoint + quyen ThreatHunting.Read.All
//   Authenticator registration 200 = co Entra ID P1/P2 (chi la dang ky MFA, khong phai da cai)
import { lay_token_graph } from '/app/may_chu/dist/su_kien/gui_email.js';

const GOC = 'https://graph.microsoft.com/v1.0';
const token = await lay_token_graph();

async function thu(ten, phuong_thuc, duong, than = null) {
  const dau = { authorization: `Bearer ${token}` };
  const tuy_chon = { method: phuong_thuc, headers: dau };
  if (than !== null) {
    dau['content-type'] = 'application/json';
    tuy_chon.body = JSON.stringify(than);
  }
  try {
    const res = await fetch(`${GOC}${duong}`, tuy_chon);
    const noi_dung = await res.text();
    const ngan = noi_dung.replace(/\s+/g, ' ').slice(0, 220);
    console.log(`${res.ok ? 'OK  ' : 'LOI '} ${String(res.status).padStart(3)}  ${ten}`);
    if (!res.ok) console.log(`      ${ngan}`);
  } catch (loi) {
    console.log(`LOI  ---  ${ten}: ${loi instanceof Error ? loi.message : String(loi)}`);
  }
}

console.log('Kiem tra API kiem ke ung dung —', new Date().toISOString());
await thu('Intune managedDevices', 'GET', '/deviceManagement/managedDevices?$top=1');
await thu('Intune detectedApps', 'GET', '/deviceManagement/detectedApps?$top=1');
await thu('Defender DeviceTvmSoftwareInventory', 'POST', '/security/runHuntingQuery',
  { Query: 'DeviceTvmSoftwareInventory | take 1' });
await thu('Authenticator registration report', 'GET',
  '/reports/authenticationMethods/userRegistrationDetails?$top=1');
process.exit(0);
