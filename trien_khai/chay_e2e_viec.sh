#!/usr/bin/env bash
set -euo pipefail
cd /root/Cham-cong

echo '== tao CSDL test (bo qua neu da co) =='
if docker compose exec -T postgres psql -U chamcong -d chamcong -t -A -c \
  "select 1 from pg_database where datname='chamcong_test_viec';" | grep -q '1'; then
  echo 'da co — xoa de chay sach'
  docker compose exec -T postgres psql -U chamcong -d chamcong -c \
    'drop database chamcong_test_viec;'
fi
docker compose exec -T postgres psql -U chamcong -d chamcong -c \
  'create database chamcong_test_viec;'

echo '== build anh kiem =='
docker build -q --target kiem -t cham-cong-kiem -f may_chu/Dockerfile .

echo '== doc POSTGRES_PASSWORD tu .env =='
PG_PASS=$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
DB_URL_TEST="postgres://chamcong:${PG_PASS}@postgres:5432/chamcong_test_viec"

echo '== chay e2e =='
docker run --rm --network cham-cong_default \
  -e DATABASE_URL="$DB_URL_TEST" \
  cham-cong-kiem node --experimental-strip-types --test --test-concurrency=1 \
  may_chu/test/e2e.test.ts 2>&1 | tail -30
