#!/usr/bin/env bash
# Trien khai du lieu PIN len CSDL that: dong nguoi da nghi + khai not cac PIN con lai.
#
# Chay tu THU MUC GOC cua ma nguon (noi co docker-compose.yml):
#
#   bash trien_khai/khai_du_lieu_pin.sh
#   bash trien_khai/khai_du_lieu_pin.sh /duong/dan/DANH_SACH_NHAN_SU.xlsx
#
# Khai them duong dan tep nhan su thi lam luon buoc 6: nap ho so (`npm run nap_ho_so`) va xuat
# danh sach nguoi chua co ma. Thu tu co chu dich — khai PIN truoc de bo nap ho so nhin thay
# ngay quet cuoi cung cua tung nguoi, vi do la can cu duy nhat de dat ngay nghi viec.
#
# Vi sao la script chu khong phai dan tung lenh: hai script SQL nay mac dinh `rollback;`, va
# cach doi sang `commit;` truoc gio la `sed -i` thang vao tep trong repo. Lam vay lam ban thu
# muc lam viec, nen lan `git pull` sau se bao xung dot va nguoi dung se `git checkout` de lay
# ban moi — mat luon thay doi, hoac te hon la commit nham ban da doi vao nhanh. Script nay
# chep ra tep tam roi doi tren BAN CHEP: tep trong repo khong bao gio bi sua.
#
# Trinh tu: sao luu -> chay thu (rollback) ca hai -> nguoi doc -> go GHI -> ghi that.
set -euo pipefail

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

TEP_NS="${1:-}"
if [[ -n "$TEP_NS" && ! -f "$TEP_NS" ]]; then
  do_ "Khong thay tep nhan su: $TEP_NS"
  exit 1
fi

DONG=trien_khai/dong_nguoi_da_nghi.sql
KHAI=trien_khai/khai_pin_con_lai.sql
for f in "$DONG" "$KHAI"; do
  if [[ ! -f "$f" ]]; then
    do_ "Khong thay $f. Chay 'git pull' de lay ban moi nhat roi chay lai."
    exit 1
  fi
  # Ai do da `sed -i` tep trong repo tu lan truoc thi tep dang o che do GHI THAT. Dung lai:
  # buoc chay thu se khong con la chay thu nua.
  if ! grep -qx 'rollback;' "$f"; then
    do_ "$f khong con dong 'rollback;' — tep da bi sua tay."
    do_ "Chay: git checkout -- $f   roi chay lai script nay."
    exit 1
  fi
done

TM=$(mktemp -d)
trap 'rm -rf "$TM"' EXIT

# HAI ham, khong phai mot: `docker compose exec -T` KHONG tu dong dong stdin, nen mot lenh
# `-c` binh thuong se doc luon stdin cua script — tuc la nuot cau tra loi cua `read` o buoc
# xac nhan, va script se "tu dong dong y" hoac tu huy. Nen moi lenh `-c` phai `</dev/null`.
psql_c() { docker compose exec -T postgres psql -U chamcong -d chamcong "$@" </dev/null; }
psql_f() { docker compose exec -T postgres psql -U chamcong -d chamcong -v ON_ERROR_STOP=1 < "$1"; }

echo
xanh '=== 1/5. Kiem tra CSDL song ==='
if ! psql_c -qtA -c 'select 1' >/dev/null 2>&1; then
  do_ 'Khong noi duoc toi postgres. Chay "docker compose ps" xem dich vu con chay khong.'
  exit 1
fi
psql_c -c "select count(*) as nhan_vien, (select count(*) from lan_quet where nguon='may'
             and nhan_vien_id is null) as quet_chua_gan from nhan_vien;"

echo
xanh '=== 2/5. Sao luu CSDL ==='
# Sao luu TRUOC moi thu. Hai script nay ghi vao ma_dinh_danh, nhan_vien va lan_quet — deu la
# du lieu goc, khong dung lai duoc tu bang cong.
BAK="sao_luu_truoc_khai_pin_$(date +%Y%m%d_%H%M%S).sql.gz"
docker compose exec -T postgres pg_dump -U chamcong chamcong | gzip > "$BAK"
xanh "  Da luu: $BAK ($(du -h "$BAK" | cut -f1))"
echo   "  Lui lai: gunzip -c $BAK | docker compose exec -T postgres psql -U chamcong -d chamcong"

echo
xanh '=== 3/5. Chay thu (rollback) — khong ghi gi ca ==='
vang '  Doc ky hai bang DOI CHIEU va BO LAI ben duoi.'
for f in "$DONG" "$KHAI"; do
  echo
  xanh "--- chay thu: $f ---"
  # `|| ...`: mot hang rao bat len la psql thoat khac 0. Do la script lam DUNG viec cua no,
  # khong phai su co — nhung `set -e` se giet ca script truoc khi kip noi gi.
  if ! psql_f "$f"; then
    echo
    do_ "Chay thu $f DUNG LAI o mot hang rao (xem dong ERROR ngay tren)."
    do_ 'Chua ghi gi ca. Xu ly nguyen nhan roi chay lai script nay.'
    exit 1
  fi
done

echo
xanh '=== 4/5. Xac nhan ==='
cat <<'HET'
  Truoc khi ghi that, doc lai o tren:
    * Bang DOI CHIEU  — ho so duoc chon co dung nguoi khong.
    * Bang BO LAI     — PIN nao chua khai duoc va vi sao (day la viec cho nhan su,
                        khong phai loi; nhung PIN do se duoc bo qua lan nay).
    * KIEM TRA 3 va 4 phai RONG.
    * Trong dong_nguoi_da_nghi: cot doi_chieu_ngay phai la "khop", va bang
      "lan quet SAU ngay nghi" phai RONG.
HET
echo
read -r -p '  Go dung chu  GHI  de ghi that (bat cu gi khac = huy): ' TRA_LOI
if [[ "$TRA_LOI" != "GHI" ]]; then
  vang '  Da huy. Khong ghi gi ca. Ban sao luu van con.'
  exit 0
fi

echo
xanh '=== 5/5. Ghi that ==='
for f in "$DONG" "$KHAI"; do
  CHEP="$TM/$(basename "$f")"
  # Doi tren BAN CHEP. Tep trong repo giu nguyen `rollback;`.
  sed 's/^rollback;$/commit;/' "$f" > "$CHEP"
  if ! grep -qx 'commit;' "$CHEP"; then
    do_ "Khong doi duoc rollback -> commit trong $f. Dung lai, chua ghi gi."
    exit 1
  fi
  echo
  xanh "--- ghi that: $f ---"
  # Moi tep la mot giao dich rieng. Neu tep thu hai hong thi tep thu nhat DA ghi xong —
  # noi ro chu khong de nguoi dung tu doan trang thai.
  if ! psql_f "$CHEP"; then
    echo
    do_ "GHI THAT $f that bai. Cac tep TRUOC no (neu co) DA ghi xong va van con."
    do_ "Muon quay lai het: gunzip -c $BAK | docker compose exec -T postgres psql -U chamcong -d chamcong"
    exit 1
  fi
done

if [[ -n "$TEP_NS" ]]; then
  echo
  xanh '=== 6/6. Nap ho so nhan su tu tep XLSX ==='
  TRONG_MAY=/tmp/nhan_su_$(date +%s).xlsx
  docker compose cp "$TEP_NS" "may_chu:$TRONG_MAY"

  echo
  xanh '--- chay thu ---'
  docker compose exec -T may_chu npm run nap_ho_so -- "$TRONG_MAY" </dev/null

  echo
  read -r -p '  Go dung chu  GHI  de nap that (bat cu gi khac = bo qua buoc nay): ' TL2
  if [[ "$TL2" == "GHI" ]]; then
    docker compose exec -T may_chu npm run nap_ho_so -- "$TRONG_MAY" --that \
      --xuat /tmp/can_ma_nhan_vien.xlsx </dev/null
    docker compose cp may_chu:/tmp/can_ma_nhan_vien.xlsx ./can_ma_nhan_vien.xlsx || true
    [[ -f ./can_ma_nhan_vien.xlsx ]] && xanh '  Da lay ve: ./can_ma_nhan_vien.xlsx'
  else
    vang '  Bo qua buoc nap ho so. Cac buoc PIN o tren van da ghi.'
  fi
  # Tep chua CCCD/dia chi cua nguoi that — khong de lai trong container.
  docker compose exec -T may_chu rm -f "$TRONG_MAY" </dev/null || true
fi

echo
xanh '=== Xong. Doi chieu sau khi ghi ==='
psql_c -c "select count(*) filter (where nhan_vien_id is null)     as quet_chua_gan,
                  count(*) filter (where nhan_vien_id is not null) as quet_da_gan,
                  count(*)                                          as tong
             from lan_quet where nguon = 'may';"
psql_c -c "select count(*) as ma_dinh_danh_dang_mo from ma_dinh_danh
            where he_thong = 'may_cham_cong' and hieu_luc_den is null;"
psql_c -c "select count(*) filter (where dang_hoat_dong) as dang_hoat_dong,
                  count(*) filter (where not dang_hoat_dong) as da_nghi
             from nhan_vien;"

echo
vang 'CON MOT BUOC NUA — du lieu da dung nhung bang cong VAN LA SO CU:'
echo '  Vao web -> Bang cong -> "Tinh lai bang cong", chia hai lan vi moi lan toi da 92 ngay:'
echo '     03/04/2026 -> 30/06/2026'
echo '     01/07/2026 -> 27/08/2026'
echo
echo 'Sau do kiem bang mat mot nguoi bat ky de doi chieu.'
