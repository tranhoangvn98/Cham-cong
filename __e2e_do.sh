#!/bin/bash
# Chay lai e2e LOI (khong co module AI) de xem 331/369 co ben vung khong.
cd /root/chamcong-ai-test
docker compose run --rm --no-deps e2e sh -c \
  'cd /app && node may_chu/dist/csdl/chay_di_tru.js && node --experimental-strip-types --test --test-concurrency=1 may_chu/test/e2e.test.ts' \
  > /tmp/e2e4.log 2>&1
grep -n -B1 -A20 '^not ok' /tmp/e2e4.log | head -70
grep -E '^# (tests|pass|fail)' /tmp/e2e4.log
