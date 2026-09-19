#!/bin/bash
# Xem ten_luu_docx cua ban nhap moi nhat va cac tep thuc su trong /du_lieu/ho_so.
docker exec chamcong_test_db psql -q -U chamcong -d chamcong_test_ai -tAc \
  "select ma, ten_luu_docx from thong_bao_nhap_ai where ma = 'TBN-000075'"
echo '--- toan bo /du_lieu/ho_so ---'
docker exec chamcong_test_maychu sh -c 'find /du_lieu/ho_so -type f 2>/dev/null | head -20'
echo '--- log worker gan day ---'
docker logs chamcong_test_maychu --since 40m 2>&1 | grep -iE 'deepseek|soan|gate|docx|LoiDeepSeek|loi mang' | tail -12
