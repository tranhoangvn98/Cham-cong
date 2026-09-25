#!/usr/bin/env bash
# Chay e2e cho module CONG BO DU THAO (1.106.0): ho_thu_y_kien + thong_bao_ai (hoi quy).
# Dung: tao DB chamcong_test_cong_bo -> build --target kiem -> chay 2 file e2e.
set -e
cd /root/Cham-cong

DB=chamcong_test_cong_bo
MK=$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)

docker compose exec -T postgres psql -U chamcong -d chamcong \
  -c "drop database if exists $DB"
docker compose exec -T postgres psql -U chamcong -d chamcong \
  -c "create database $DB"

docker build -q --target kiem -t cham-cong-kiem -f may_chu/Dockerfile .

docker run --rm --network cham-cong_default \
  -e DATABASE_URL="postgres://chamcong:$MK@postgres:5432/$DB" \
  -e JWT_SECRET='khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001' \
  -e NODE_ENV=test \
  -e DEVICE_TZ_OFFSET_HOURS=7 \
  -e CO_QUAN_BAN_HANH='CÔNG TY TNHH TRẦN HOÀNG VIỆT NAM' \
  -e DIA_DANH_VAN_BAN='Lạng Sơn' \
  -e EXPO_PUSH_URL='http://127.0.0.1:1/push' \
  cham-cong-kiem sh -c "node may_chu/dist/csdl/chay_di_tru.js && node --experimental-strip-types --test --test-concurrency=1 may_chu/test/ho_thu_y_kien_e2e.test.ts may_chu/test/thong_bao_ai_e2e.test.ts"
