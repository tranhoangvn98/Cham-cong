#!/bin/bash
# Thu tai docx cua TBN-000075 nhu trinh duyet se lam.
set -e
API=http://127.0.0.1:18080
curl -s -X POST $API/api/xac-thuc/dang-nhap \
  -H 'content-type: application/json' \
  --data-binary '{"ten_dang_nhap":"admin","mat_khau":"Thvn@2026Test"}' > /tmp/dn.out
TOKEN=$(python3 -c 'import json;print(json.load(open("/tmp/dn.out"))["token_truy_cap"])')
ID=$(docker exec chamcong_test_db psql -q -U chamcong -d chamcong_test_ai -tAc \
  "select id from thong_bao_nhap_ai where ma = 'TBN-000075'")
echo "id=$ID"
echo '--- GET /xem ---'
curl -s -o /tmp/tai.docx -w 'HTTP %{http_code}, %{size_download} byte, content-type=%{content_type}\n' \
  $API/api/thong-bao/ai/$ID/xem -H "authorization: Bearer $TOKEN"
file /tmp/tai.docx 2>/dev/null || head -c 4 /tmp/tai.docx | od -c | head -1
echo '--- GET /xem co header Origin cua web ---'
curl -s -o /dev/null -w 'HTTP %{http_code}\n' \
  $API/api/thong-bao/ai/$ID/xem -H "authorization: Bearer $TOKEN" \
  -H 'Origin: http://127.0.0.1:18081'
curl -s -I $API/api/thong-bao/ai/$ID/xem -H "authorization: Bearer $TOKEN" \
  -H 'Origin: http://127.0.0.1:18081' | grep -iE 'access-control|content-disposition'
