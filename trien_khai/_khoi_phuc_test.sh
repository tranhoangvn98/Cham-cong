#!/bin/bash
set -euo pipefail
DICH=/root/chamcong-ai-test
cd "$DICH"
KHOA=$(grep -E '^DEEPSEEK_API_KEY=' /root/Cham-cong/.env | cut -d= -f2-)
[ -z "$KHOA" ] && { echo 'LOI KEY'; exit 1; }
grep -q '^DEEPSEEK_API_KEY=' .env && sed -i "s|^DEEPSEEK_API_KEY=.*|DEEPSEEK_API_KEY=${KHOA}|" .env \
  || printf 'DEEPSEEK_API_KEY=%s\n' "$KHOA" >> .env
for B in 'VITE_API_URL=http://127.0.0.1:18080' 'CONG_MAY_CHU=18080' 'CONG_WEB=18081' \
  'CORS_ORIGIN=http://127.0.0.1:18081' \
  'CO_QUAN_BAN_HANH=CÔNG TY TNHH TRẦN HOÀNG VIỆT NAM' 'DIA_DANH_VAN_BAN=Lạng Sơn'; do
  T=$(printf '%s' "$B" | cut -d= -f1)
  grep -q "^${T}=" .env || printf '%s\n' "$B" >> .env
done
sed -i 's|"18081:8081"|"18081:80"|' docker-compose.override.yml
docker compose build web >/dev/null
docker compose up -d postgres may_chu web
for i in $(seq 1 40); do
  docker exec chamcong_test_maychu wget -q -O /dev/null http://127.0.0.1:8080/health 2>/dev/null && break
  sleep 2
done
HASH=$(docker compose run --rm --no-deps -T e2e node --experimental-strip-types -e \
  "import('file:///app/may_chu/src/bao_mat/mat_khau.ts').then(async (m) => console.log(await m.bam_mat_khau('Thvn@2026Test')))" | tr -d '\r')
[ ${#HASH} -lt 20 ] && { echo 'LOI hash'; exit 1; }
docker exec chamcong_test_db psql -U chamcong -d chamcong_test_ai -q -c \
  "update nguoi_dung set nhan_vien_id = null where ten_dang_nhap = 'ai_admin';"
docker exec chamcong_test_db psql -U chamcong -d chamcong_test_ai -q -c \
  "update nguoi_dung
      set mat_khau_hash = '${HASH}', vai_tro = 'admin', dang_hoat_dong = true,
          phai_doi_mat_khau = false, so_lan_sai = 0, khoa_den = null,
          nhan_vien_id = (select id from nhan_vien where ma_nv = 'AI-ADMIN')
    where ten_dang_nhap = 'admin';"
docker exec chamcong_test_maychu wget -q -O /dev/null \
  --header='Content-Type: application/json' \
  --post-data='{"ten_dang_nhap":"admin","mat_khau":"Thvn@2026Test"}' \
  http://127.0.0.1:8080/api/xac-thuc/dang-nhap && echo 'dang nhap OK'
curl -s -o /dev/null -w 'web=%{http_code}\n' http://127.0.0.1:18081/
