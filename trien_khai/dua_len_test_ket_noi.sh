#!/usr/bin/env bash
# ============================================================
# Test ket noi module van ban AI tren VPS — KHONG DUNG GIT.
#
# Quy tac da cam ket voi CEO: TUYET DOI KHONG commit truoc khi test ket noi dat.
# Script nay chuyen working tree len VPS bang rsync (KHONG .git, KHONG .env, KHONG du
# lieu), tao mot thu muc test RIENG (/root/chamcong-ai-test) de kho production
# (/root/Cham-cong) khong bao gio bi dung toi.
#
# Cach dung (tu thu muc goc repo, may co rsync + ssh):
#   bash trien_khai/dua_len_test_ket_noi.sh
#
# Buoc build chay SAN unit test + kiem tra kieu ben trong Dockerfile (target build) —
# mot test do la hinh anh khong duoc dung. Buoc e2e chay tren CSDL `chamcong_test_ai`
# (target kiem cua may_chu/Dockerfile).
# ============================================================
set -euo pipefail

VPS="root@103.81.87.47"
DICH="/root/chamcong-ai-test"
NGUON="$(cd "$(dirname "$0")/.." && pwd)"

echo "== 1. Dong bo ma nguon len VPS (khong .git/.env/du lieu/node_modules) =="
ssh "$VPS" "mkdir -p $DICH"
rsync -a --delete \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'du_lieu' \
  --exclude 'anh_cham_cong' \
  --exclude 'log' \
  --exclude 'sao_luu' \
  --exclude '.venv' \
  --exclude '__pycache__' \
  "$NGUON/" "$VPS:$DICH/"

echo "== 2. Tao .env + compose ghi de cho thu muc test (cong + DB rieng) =="
ssh "$VPS" bash -s <<'EOF'
set -euo pipefail
cd /root/chamcong-ai-test

# Lay 2 bi mat tu .env production de chay test — chi doc, khong commit, khong in ra.
MAT_KHAU_DB=$(grep -E '^POSTGRES_PASSWORD=' /root/Cham-cong/.env | cut -d= -f2-)
KHOA_JWT=$(grep -E '^JWT_SECRET=' /root/Cham-cong/.env | cut -d= -f2-)

cat > .env <<ENV
POSTGRES_PASSWORD=${MAT_KHAU_DB}
JWT_SECRET=${KHOA_JWT}
ENV

# Ghi de CHI nam trong thu muc test: cong khac (15432/18080/18081), volume khac,
# CSDL ten `chamcong_test_ai` (e2e tu choi moi DB khong bat dau bang chamcong_test).
cat > docker-compose.override.yml <<ENV
services:
  cong_vao:
    profiles: ["tat"]
  postgres:
    container_name: chamcong_test_db
    ports: ["15432:5432"]
    environment:
      POSTGRES_DB: chamcong_test_ai
      POSTGRES_USER: chamcong
      POSTGRES_PASSWORD: ${MAT_KHAU_DB}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chamcong -d chamcong_test_ai"]
      interval: 10s
      timeout: 5s
      retries: 10
    volumes:
      - pgdata_test:/var/lib/postgresql/data
  may_chu:
    container_name: chamcong_test_maychu
    ports: ["18080:8080"]
    environment:
      DATABASE_URL: postgres://chamcong:${MAT_KHAU_DB}@postgres:5432/chamcong_test_ai
      TU_DONG_DI_TRU: "1"
    volumes:
      - ho_so_test:/du_lieu/ho_so
      - anh_test:/du_lieu/anh_cham_cong
  web:
    container_name: chamcong_test_web
    ports: ["18081:8081"]
  e2e:
    build:
      context: .
      dockerfile: may_chu/Dockerfile
      target: kiem
    container_name: chamcong_test_e2e
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://chamcong:${MAT_KHAU_DB}@postgres:5432/chamcong_test_ai
      JWT_SECRET: ${KHOA_JWT}
volumes:
  pgdata_test:
  ho_so_test:
  anh_test:
ENV
EOF

echo "== 3. Build anh (ben trong chay unit test + kiem tra kieu) =="
ssh "$VPS" "cd $DICH && docker compose build may_chu web" || { echo "BUILD LOI"; exit 1; }

echo "== 4. Khoi dong DB test + chay e2e (nhap -> gate -> ban hanh) =="
ssh "$VPS" "cd $DICH && docker compose up -d postgres && docker compose build e2e && docker compose run --rm e2e" || { echo "E2E LOI"; exit 1; }

echo "== 5. Kiem npm audit trong anh build =="
ssh "$VPS" "cd $DICH && docker compose build may_chu 2>/dev/null; docker run --rm --entrypoint sh chamcong-ai-test-may_chu -c 'npm audit --omit=dev || true'" || true

echo "== Xong. Log test nam ngay tren man hinh. "
echo "== Thu muc test: $DICH — khi xong co the xoa: ssh $VPS 'rm -rf $DICH && docker rm -f chamcong_test_*; docker volume rm pgdata_test ho_so_test anh_test'"
