#!/usr/bin/env bash
# Cap nhat he thong cham cong tren VPS: sao luu -> keo ma moi -> dung lai -> kiem tra.
#
# Viet thanh script thay vi de nguoi dung dan tung lenh, vi hai lan truoc da co su co do
# dan nham: mot lan dan ca chuoi giu cho "<mat khau admin>" vao lenh, mot lan dan
# "<ip van phong>" vao ICLOCK_IP_CHO_PHEP lam may chu khong khoi dong duoc. Script khong
# co cho de dan nham.
#
#   bash trien_khai/cap_nhat_vps.sh
#   bash trien_khai/cap_nhat_vps.sh --khong-sao-luu     # bo qua buoc sao luu (nhanh hon)
#
# Chay tu THU MUC GOC cua ma nguon (noi co docker-compose.yml).
set -euo pipefail

SAO_LUU=1
[[ "${1:-}" == "--khong-sao-luu" ]] && SAO_LUU=0

xanh() { printf '\033[32m%s\033[0m\n' "$*"; }
vang() { printf '\033[33m%s\033[0m\n' "$*"; }
do_()  { printf '\033[31m%s\033[0m\n' "$*"; }

if [[ ! -f docker-compose.yml ]]; then
  do_ 'Khong thay docker-compose.yml. Hay cd vao thu muc ma nguon roi chay lai.'
  exit 1
fi
if [[ ! -f .env ]]; then
  do_ 'Khong thay tep .env. Day khong phai ban trien khai da cau hinh.'
  exit 1
fi

NHANH=$(git rev-parse --abbrev-ref HEAD)
TRUOC=$(git rev-parse --short HEAD)
# `tail -1`: tep .env that hay co khoa bi khai lap (them tay nhieu lan). Docker Compose
# lay dong CUOI, nen o day lam y het — khong co `tail` thi bien nay om ca hai dong ke ca
# ky tu xuong dong, va moi URL dung no deu hong.
TEN_MIEN=$(grep -E '^TEN_MIEN=' .env | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)

echo
xanh "=== 1/6. Trang thai hien tai ==="
echo "  nhanh:  $NHANH"
echo "  ban:    $TRUOC"
echo "  domain: ${TEN_MIEN:-(khong khai trong .env)}"

# --------------------------------------------------------------- ghi nho trang thai bot
# Tren VPS nay he thong cham cong dung CHUNG ten mien voi mot chatbot Teams. Ghi lai ma
# HTTP cua bot TRUOC khi doi gi, de cuoi script doi chieu — neu cau hinh lam hong bot thi
# phai biet ngay chu khong phai doi nguoi dung phat hien.
MA_BOT_TRUOC=''
if [[ -n "$TEN_MIEN" ]]; then
  MA_BOT_TRUOC=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$TEN_MIEN/" || echo 'loi')
  echo "  bot Teams truoc khi cap nhat: HTTP $MA_BOT_TRUOC"
fi

# --------------------------------------------------------------- sao luu
echo
if [[ $SAO_LUU -eq 1 ]]; then
  xanh '=== 2/6. Sao luu CSDL va tep dinh kem ==='
  THU_MUC_SAO_LUU="sao_luu/$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$THU_MUC_SAO_LUU"

  docker compose exec -T postgres pg_dump -U chamcong chamcong \
    | gzip > "$THU_MUC_SAO_LUU/csdl.sql.gz"
  echo "  CSDL      -> $THU_MUC_SAO_LUU/csdl.sql.gz ($(du -h "$THU_MUC_SAO_LUU/csdl.sql.gz" | cut -f1))"

  # Ten volume that = <ten du an>_<ten volume>. Ten du an mac dinh la ten thu muc, nhung
  # Docker Compose ha ve chu thuong va bo ky tu la — lay theo dung quy tac do, neu khong
  # se "khong thay volume" mot cach im lang va di tiep ma khong sao luu gi.
  DU_AN="${COMPOSE_PROJECT_NAME:-$(basename "$PWD" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_-')}"

  # Tep dinh kem ho so (hop dong scan, bien ban) nam tren volume, KHONG nam trong CSDL.
  # Mat volume la mat ban goc — CSDL chi giu sieu du lieu.
  for v in ho_so anh_cham_cong; do
    if docker volume inspect "${DU_AN}_$v" >/dev/null 2>&1; then
      docker run --rm -v "${DU_AN}_$v:/nguon:ro" -v "$PWD/$THU_MUC_SAO_LUU:/dich" \
        alpine tar czf "/dich/$v.tar.gz" -C /nguon .
      echo "  $v -> $THU_MUC_SAO_LUU/$v.tar.gz"
    else
      vang "  bo qua $v: chua co volume ${DU_AN}_$v (binh thuong neu chua ai tai tep len)"
    fi
  done
else
  vang '=== 2/6. BO QUA sao luu (--khong-sao-luu) ==='
fi

# --------------------------------------------------------------- keo ma moi
echo
xanh '=== 3/6. Keo ma nguon moi ==='
git fetch origin "$NHANH"
git pull origin "$NHANH"
SAU=$(git rev-parse --short HEAD)
if [[ "$TRUOC" == "$SAU" ]]; then
  vang "  Khong co gi moi (van o ban $SAU). Van dung lai de chac chan."
else
  echo "  $TRUOC -> $SAU"
  git --no-pager log --oneline "$TRUOC..$SAU" | sed 's/^/    /'
fi

# --------------------------------------------------------------- dung lai
echo
xanh '=== 4/6. Dung lai anh va khoi dong ==='
# --build la BAT BUOC khi ma nguon doi. Doi mot bien moi truong thi khong can, nhung them
# route moi hay sua giao dien thi phai dung lai anh, neu khong container van chay ma cu.
docker compose up -d --build

echo
xanh '=== 5/6. Cho may chu san sang ==='
# Di tru CSDL chay tu dong luc khoi dong (TU_DONG_DI_TRU=1 trong docker-compose.yml),
# nen khong phai goi tay. Nhung phai doi no xong moi kiem duoc.
for i in $(seq 1 60); do
  if curl -sf --max-time 5 http://127.0.0.1:8080/health >/dev/null 2>&1; then
    echo "  may chu san sang sau ${i}s"
    break
  fi
  [[ $i -eq 60 ]] && { do_ '  may chu khong len sau 60s. Xem: docker compose logs --tail=80 may_chu'; exit 1; }
  sleep 1
done
curl -s http://127.0.0.1:8080/health | sed 's/^/  /'
echo

# --------------------------------------------------------------- kiem tra
echo
xanh '=== 6/6. Kiem tra sau khi cap nhat ==='
docker compose ps --format 'table {{.Service}}\t{{.Status}}' | sed 's/^/  /'

if [[ -n "$TEN_MIEN" ]]; then
  echo
  ma_web=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$TEN_MIEN/chamcong/health" || echo loi)
  ma_iclock=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://$TEN_MIEN/iclock/cdata?SN=KIEM-TRA" || echo loi)
  ma_bot=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$TEN_MIEN/" || echo loi)

  # 403 la KET QUA DUNG khi da khai `ICLOCK_IP_CHO_PHEP`: cau curl tren di tu chinh VPS ra Internet
  # roi quay lai, nen no mang IP cua VPS chu khong phai IP van phong. Truoc ban nay dong duoi luon
  # in "mong doi 401", nen moi lan trien khai deu hien mot dong lech — va mot canh bao luon sai la
  # mot canh bao khong ai con doc.
  if grep -Eq '^ICLOCK_IP_CHO_PHEP=.+' .env 2>/dev/null; then
    mong_doi_iclock='403 — dang khoa theo IP, curl tu VPS bi chan la dung'
  else
    mong_doi_iclock='401 — may chua khai serial'
  fi

  echo "  /chamcong/health : HTTP $ma_web        (mong doi 200)"
  echo "  /iclock/cdata    : HTTP $ma_iclock        (mong doi $mong_doi_iclock)"
  echo "  bot Teams (/)    : HTTP $ma_bot        (truoc khi cap nhat la $MA_BOT_TRUOC)"

  if [[ -n "$MA_BOT_TRUOC" && "$ma_bot" != "$MA_BOT_TRUOC" ]]; then
    echo
    do_ "  !! Bot Teams doi tu $MA_BOT_TRUOC sang $ma_bot — cap nhat nay da dong den no."
    do_ '  Kiem tra ngay: sudo caddy validate --config /etc/caddy/Caddyfile'
  fi
fi

echo
xanh 'Xong.'
echo "Neu can lui lai ban cu:"
echo "  git checkout $TRUOC && docker compose up -d --build"
