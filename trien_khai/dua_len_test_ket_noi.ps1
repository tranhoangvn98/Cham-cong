# dua_len_test_ket_noi.ps1 — ban PowerShell cua dua_len_test_ket_noi.sh.
#
# CHAY TREN MAY WINDOWS (noi co ma nguon dang sua, CHUA commit). VPS khong co code moi
# vi ta khong dung git cho toi khi co lenh — day la cach dua code len test ma KHONG commit.
#
# Cach chay (PowerShell, thu muc goc repo):
#   powershell -NoProfile -ExecutionPolicy Bypass -File trien_khai/dua_len_test_ket_noi.ps1
#
# Dong goi ma nguon (loai .git/.env/du lieu), scp len VPS vao thu muc RIENG
# /root/chamcong-ai-test (khong dung toi kho production /root/Cham-cong), build anh
# (ben trong chay SAN unit test + kiem tra kieu), roi chay e2e voi CSDL chamcong_test_ai.
param(
  [string]$Vps = 'vps',                 # ten host trong ~/.ssh/config
  [string]$Dich = '/root/chamcong-ai-test',
  [string]$TepNen = '/root/chamcong-ai-test-src.tar.gz'
)

$ErrorActionPreference = 'Stop'
$Goc = Split-Path -Parent $PSScriptRoot
$TarCucBo = Join-Path $env:TEMP 'chamcong-ai-test.tar.gz'

Write-Host '== 1. Dong goi ma nguon (khong .git/.env/du lieu/node_modules) =='
if (Test-Path $TarCucBo) { Remove-Item $TarCucBo -Force }
Push-Location $Goc
tar -czf $TarCucBo `
  --exclude='.git' `
  --exclude='.env' `
  --exclude='node_modules' `
  --exclude='dist' --exclude='web/dist' `
  --exclude='du_lieu' --exclude='anh_cham_cong' `
  --exclude='log' --exclude='sao_luu' `
  --exclude='.venv' --exclude='__pycache__' `
  .
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'tar dong goi that bai.' }
Pop-Location
Write-Host "    goi duoc: $((Get-Item $TarCucBo).Length / 1KB) KB"

Write-Host "== 2. Chuyen len $Vps =="
scp $TarCucBo "${Vps}:$TepNen"

# Chuoi lenh chay tren VPS. Day la here-string LITERAL (dau nhay don) nen PowerShell
# khong thay the bien o day — bash tren VPS moi thay.
$Lenh = @'
set -euo pipefail
DICH=/root/chamcong-ai-test
TAR=/root/chamcong-ai-test-src.tar.gz
echo "== 3. Giai nen vao $DICH (kho production /root/Cham-cong khong bi dung) =="
rm -rf "$DICH" && mkdir -p "$DICH"
tar -xzf "$TAR" -C "$DICH" && rm -f "$TAR"
cd "$DICH"

# Doc 2 bi mat tu .env production de chay test — chi doc, khong in, khong commit.
MAT_KHAU_DB=$(grep -E '^POSTGRES_PASSWORD=' /root/Cham-cong/.env | cut -d= -f2-)
KHOA_JWT=$(grep -E '^JWT_SECRET=' /root/Cham-cong/.env | cut -d= -f2-)
if [ -z "$MAT_KHAU_DB" ] || [ -z "$KHOA_JWT" ]; then
  echo "LOI: khong doc duoc POSTGRES_PASSWORD/JWT_SECRET tu /root/Cham-cong/.env"
  exit 1
fi

cat > .env <<ENV
POSTGRES_PASSWORD=${MAT_KHAU_DB}
JWT_SECRET=${KHOA_JWT}
ENV

# Ghi de CHI nam trong thu muc test: cong khac (15432/18080/18081), volume khac,
# CSDL ten `chamcong_test_ai` (e2e tu choi moi DB khong bat dau chamcong_test).
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
    ports: ["18081:80"]
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

echo "== 4. Build anh (ben trong chay unit test + kiem tra kieu) =="
docker compose build may_chu web || { echo "BUILD LOI — xem log o tren"; exit 1; }

echo "== 5. Khoi dong DB test + chay e2e =="
docker compose up -d postgres
# Dung may_chu/web thu cong (neu dang chay): worker cua no cung noi vao chamcong_test_ai
# va GIANH xu ly ban nhap e2e — lam test 421 thay tep o volume khac (404) va test 425
# thay AI co khoa thay vi loi thieu khoa. Da tung xay ra, dung lai truoc khi chay.
docker compose stop may_chu web 2>/dev/null || true
docker compose rm -f may_chu web 2>/dev/null || true
docker compose build e2e || { echo "BUILD E2E LOI"; exit 1; }
docker compose run --rm e2e || { echo "E2E LOI — xem log o tren"; exit 1; }

echo ""
echo "== XONG: test ket noi dat. Bao CEO de xin lenh commit. =="
echo "== Don dep khi xong: docker rm -f chamcong_test_db chamcong_test_maychu chamcong_test_web;"
echo "==                    docker volume rm pgdata_test ho_so_test anh_test;"
echo "==                    rm -rf $DICH"
'@

Write-Host "== Chay lenh tren $Vps (log in ra truc tiep) =="
# Chuẩn hóa xuống dòng: here-string Windows dùng CRLF, bash chỉ hiểu LF.
$Lenh = ($Lenh -split "`r`n") -join "`n"
$Lenh | ssh $Vps 'bash -s'

Write-Host '== Hoan tat. Xem log o tren de ket luan. =='
