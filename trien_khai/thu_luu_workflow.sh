#!/usr/bin/env bash
set -euo pipefail
cd /root/Cham-cong
# Tao token admin tam bang cach ky trong container may_chu (JWT_SECRET lay tu .env cua no).
ADMIN_ID=$(docker compose exec -T postgres psql -U chamcong -d chamcong -t -A -c \
  "select id from nguoi_dung where vai_tro='admin' and dang_hoat_dong limit 1;")
echo "admin id: $ADMIN_ID"
TOKEN=$(docker compose exec -T -e ADMIN_ID="$ADMIN_ID" may_chu node -e '
const { tao_token_truy_cap } = require("./dist/bao_mat/jwt.js");
const t = tao_token_truy_cap({ sub: process.env.ADMIN_ID, vai_tro: "admin", nv: null, ten: "kiem-thu" });
process.stdout.write(t.token);
')
echo "PATCH workflow may_mat_ket_noi..."
curl -s -X PATCH "https://teams.tranhoangvietnam.com/chamcong/api/viec/workflow/may_mat_ket_noi" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"dang_bat":true,"nguoi_nhan_kieu":"co_dinh","nhan_vien_id":null,"han_sau_gio":4,"uu_tien":"cao"}' -w '\nHTTP %{http_code}\n'
echo "doc lai config:"
curl -s "https://teams.tranhoangvietnam.com/chamcong/api/viec/workflow" \
  -H "Authorization: Bearer $TOKEN" | head -c 600; echo
