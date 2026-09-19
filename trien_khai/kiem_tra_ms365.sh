#!/usr/bin/env bash
# Kiem tra quyen ung dung cua app Entra dung cho nghiep vu nghi viec (chan dang nhap + rut
# giay phep Microsoft 365). Chay tren VPS trong thu muc goc repo (can .env).
#
# In "GO" khi token app-only mang du User.ReadWrite.All + User.RevokeSessions.All — luc do
# moi duoc bat MS365_NGHI_VIEC_BAT=1. In "CHUA-DU" (kèm tên quyền thiếu) thì phải vào
# portal.azure.com -> Entra ID -> App registrations cap them quyen va Grant admin consent.
#
# Cach chay:  bash trien_khai/kiem_tra_ms365.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "CHUA-DU: khong thay .env o thu muc goc repo"
  exit 1
fi

docker run --rm --env-file .env node:22-alpine node -e '
async function m() {
  const e = process.env;
  const cid = e.MS_MAIL_CLIENT_ID || e.SHAREPOINT_CLIENT_ID;
  const sec = e.MS_MAIL_CLIENT_SECRET || e.SHAREPOINT_CLIENT_SECRET;
  const tid = e.MS_MAIL_TENANT_ID || e.SHAREPOINT_TENANT_ID;
  const goc = e.SHAREPOINT_GOC_TOKEN || "https://login.microsoftonline.com";
  if (!cid || !sec || !tid) {
    console.log("CHUA-DU: thieu creds MS_MAIL_*/SHAREPOINT_* trong .env");
    process.exit(1);
  }
  const r = await fetch(goc + "/" + tid + "/oauth2/v2.0/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cid, client_secret: sec,
      scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials",
    }),
  });
  const j = await r.json();
  if (!j.access_token) {
    console.log("CHUA-DU: khong lay duoc token — " + JSON.stringify(j).slice(0, 160));
    process.exit(1);
  }
  const p = JSON.parse(Buffer.from(j.access_token.split(".")[1], "base64url").toString());
  const roles = p.roles || [];
  const can = ["User.ReadWrite.All", "User.RevokeSessions.All"];
  console.log("appid:", p.appid, "| roles:", JSON.stringify(roles));
  const thieu = can.filter((x) => !roles.includes(x));
  if (thieu.length === 0) {
    console.log("GO: du 2 quyen — san sang bat MS365_NGHI_VIEC_BAT=1");
    process.exit(0);
  }
  console.log("CHUA-DU: thieu quyen " + JSON.stringify(thieu));
  process.exit(1);
}
m();
'
