#!/usr/bin/env bash
set -uo pipefail
cd /root/Cham-cong
PG_PASS=$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
DB_URL_TEST="postgres://chamcong:${PG_PASS}@postgres:5432/chamcong_test_viec"
docker run --rm --network cham-cong_default \
  -e DATABASE_URL="$DB_URL_TEST" \
  cham-cong-kiem node --experimental-strip-types --test --test-concurrency=1 \
  may_chu/test/e2e.test.ts 2>&1 | grep -E '^not ok' || true
