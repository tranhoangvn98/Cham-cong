#!/usr/bin/env bash
# Hai viec con lai truoc khi khai het PIN: sua ten cho khop, va gop hai cap ho so trung.
#
# Chay tu THU MUC GOC cua ma nguon:
#
#   bash trien_khai/hoan_tat_ho_so.sh
#
# Sau script nay chay lai `khai_du_lieu_pin.sh` la khai duoc not PIN 4 va PIN 57.
#
# VI SAO KHONG GOP CHUNG VAO `khai_du_lieu_pin.sh`: gop ho so la thao tac doi chu so hang tram
# dong bang cong / bang luong / KPI cua mot nguoi that roi XOA mot ho so, va khong hoan tac duoc
# bang mot lenh. No xung dang mot lan doc rieng, khong nen troi vao giua mot script dai.
set -euo pipefail

xanh() { printf '\033[32m%s\033[0m\n' "$*"; }
vang() { printf '\033[33m%s\033[0m\n' "$*"; }
do_()  { printf '\033[31m%s\033[0m\n' "$*"; }

if [[ ! -f docker-compose.yml || ! -f .env ]]; then
  do_ 'Chay tu thu muc ma nguon (noi co docker-compose.yml va .env).'
  exit 1
fi

psql_c() { docker compose exec -T postgres psql -U chamcong -d chamcong "$@" </dev/null; }

echo
xanh '=== 1/4. Sao luu CSDL ==='
BAK="sao_luu_truoc_hoan_tat_$(date +%Y%m%d_%H%M%S).sql.gz"
docker compose exec -T postgres pg_dump -U chamcong chamcong | gzip > "$BAK"
xanh "  Da luu: $BAK ($(du -h "$BAK" | cut -f1))"
echo   "  Lui lai: gunzip -c $BAK | docker compose exec -T postgres psql -U chamcong -d chamcong"

# ---------------------------------------------------------------- 1. sua ten
echo
xanh '=== 2/4. Sua ten hai nguoi cho khop so HCNS ==='
cat <<'HET'
  Chu cong ty da xac nhan moi cap la MOT nguoi:
    ERP84   "Tran Minh Khanh"    -> "Tran Thi Minh Khanh"
    ERP156  "Nguyen Hoang Anh"   -> "Nguyen Thi Hoang Anh"

  Lay ten DAY DU theo so HCNS lam chuan vi do la ban goc phap ly. Sua xong thi bo nap ho so
  khop tuyet doi, khong con roi vao muc "nghi la cung nguoi" va bo qua ho nua.
HET
echo
psql_c -c "select ma_nv, ho_ten, coalesce(pin_may,'—') as pin_may, dang_hoat_dong
             from nhan_vien where ma_nv in ('ERP84','ERP156') order by ma_nv;"

read -r -p '  Go  GHI  de doi ten (bat cu gi khac = bo qua buoc nay): ' TL
if [[ "$TL" == "GHI" ]]; then
  psql_c -v ON_ERROR_STOP=1 -c "
    update nhan_vien set ho_ten = 'Trần Thị Minh Khánh',  cap_nhat_luc = now() where ma_nv = 'ERP84';
    update nhan_vien set ho_ten = 'Nguyễn Thị Hoàng Anh', cap_nhat_luc = now() where ma_nv = 'ERP156';"
  psql_c -c "select ma_nv, ho_ten from nhan_vien where ma_nv in ('ERP84','ERP156') order by ma_nv;"
  xanh '  Da doi ten.'
else
  vang '  Bo qua buoc doi ten.'
fi

# ---------------------------------------------------------------- 2. gop ho so trung
echo
xanh '=== 3/4. Gop hai cap ho so trung ==='
vang '  Doc ky: gop la XOA mot ho so, KHONG hoan tac duoc bang mot lenh.'
echo
docker compose exec -T may_chu npm run gop_trung </dev/null || true

# Hai cap nay da duoc xac dinh tu di tru 025 va tu doi chieu PIN, khong phai doan.
for CAP in "BGD ERP4" "ERP147 HR-01"; do
  A=${CAP%% *}; B=${CAP##* }
  echo
  xanh "--- Cap: $A  <->  $B ---"
  psql_c -c "
    select nv.ma_nv, nv.ho_ten, coalesce(nv.pin_may,'—') as pin_may, nv.dang_hoat_dong,
           (select count(*) from bang_cong_ngay bc where bc.nhan_vien_id = nv.id) as bang_cong,
           (select count(*) from lan_quet lq   where lq.nhan_vien_id = nv.id)     as lan_quet,
           (select count(*) from ma_dinh_danh md where md.nhan_vien_id = nv.id)   as ma_dinh_danh
      from nhan_vien nv where nv.ma_nv in ('$A','$B') order by nv.ma_nv;"

  # KHONG co mac dinh, va thu tu KHONG doan duoc: go nguoc hai ma la gop nguoc, cong va luong
  # cua ban dung se thanh cua ban bi xoa.
  read -r -p "  Go ma GIU LAI ($A hoac $B), hoac Enter de bo qua cap nay: " GIU
  if [[ -z "$GIU" ]]; then vang '  Bo qua cap nay.'; continue; fi
  if [[ "$GIU" != "$A" && "$GIU" != "$B" ]]; then
    do_ "  \"$GIU\" khong thuoc cap nay. Bo qua."; continue
  fi
  BO=$([[ "$GIU" == "$A" ]] && echo "$B" || echo "$A")

  echo
  xanh "  Chay thu: giu $GIU, bo $BO"
  docker compose exec -T may_chu npm run gop_trung -- "$GIU" "$BO" </dev/null

  read -r -p "  Go  GOP  de gop that (bat cu gi khac = bo qua): " TL2
  if [[ "$TL2" == "GOP" ]]; then
    docker compose exec -T may_chu npm run gop_trung -- "$GIU" "$BO" --that </dev/null
    xanh "  Da gop: giu $GIU, bo $BO."
  else
    vang '  Bo qua cap nay.'
  fi
done

# ---------------------------------------------------------------- 3. doi chieu
echo
xanh '=== 4/4. Doi chieu sau khi sua ==='
psql_c -c "
  select ho_ten, count(*) as so_ho_so, string_agg(ma_nv, ' | ' order by ma_nv) as cac_ma
    from nhan_vien where dang_hoat_dong group by ho_ten having count(*) > 1 order by ho_ten;"
echo '  ^ Bang tren la cac ten CON trung. Rong = da het trung.'

psql_c -c "select count(*) filter (where dang_hoat_dong) as dang_hoat_dong,
                  count(*) filter (where not dang_hoat_dong) as da_nghi,
                  count(*) as tong from nhan_vien;"

echo
vang 'BUOC KE TIEP:'
echo '  1. bash trien_khai/khai_du_lieu_pin.sh /root/ns.xlsx'
echo '     -> khai not PIN 4 va PIN 57, va dien ho so cho hai nguoi vua doi ten.'
echo '  2. Cai dat -> Thiet bi -> "Xoa NV": xoa PIN 1 tren CA HAI may'
echo '     (8116254600435 va 8116254600440 — so PIN do tung may cap).'
echo '  3. Bang cong -> "Tinh lai bang cong": 03/04-30/06 roi 01/07-27/08.'
