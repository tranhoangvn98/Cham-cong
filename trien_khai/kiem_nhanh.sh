#!/usr/bin/env bash
# Kiem nhanh trang thai truoc / sau khi keo log cu ve. CHI DOC.
#
#   bash trien_khai/kiem_nhanh.sh truoc
#   bash trien_khai/kiem_nhanh.sh sau
#   bash trien_khai/kiem_nhanh.sh log
#
# ============================================================================================
# KHOI A LIET KE CA MA DA DONG, VA DAY LA LY DO
#
# Ban dau khoi A chi liet ke ma DANG hieu luc (`hieu_luc_den is null`). Ngay 27.08.2026 no bao
# "khong con PIN nao" va nguoi doc — toi — tin la sach de keo 40 nghin lan quet lich su ve.
# Ket qua: 353 lan quet bi gan sai nguoi, trong do 340 lan la cua mot nguoi da nghi viec chay
# vao bang cong nguoi dang lam.
#
# Vi bo tiep nhan doc CA MA DA DONG: luat 1 cua `tra_pin` cho khoang DAU TIEN mo ve vo cuc phia
# truoc, nen mot dong da dong van la `(-inf, luc_dong)` va van hut het qua khu cua PIN do.
#
# Mot phep kiem khong kiem dung thu no hua thi te hon la khong kiem. Nay khoi A liet ke:
#   - ma dang hieu luc          -> se hut moi lan quet
#   - ma DA DONG                -> VAN hut lan quet TRUOC ngay dong
#   - cot `nhan_vien.pin_may`   -> duong doc du phong khi bang khong co dong nao
# ============================================================================================
set -euo pipefail

VIEC="${1:-truoc}"

xanh() { printf '\033[32m%s\033[0m\n' "$*"; }
lam()  { printf '\n\033[36m########## %s\033[0m\n' "$*"; }
do_()  { printf '\033[31m%s\033[0m\n' "$*"; }

[[ -f docker-compose.yml ]] || { do_ 'Hay cd vao thu muc ma nguon.'; exit 1; }
sql() { docker compose exec -T postgres psql -U chamcong -d chamcong -v ON_ERROR_STOP=1 "$@"; }

khoi_a() {
  lam 'A. Moi thu co the HUT lan quet ve mot nguoi'
  sql -c "
select md.ma_chuan as pin, nv.ma_nv, nv.ho_ten,
       case when md.hieu_luc_den is null then 'DANG hieu luc — hut moi lan quet'
            else 'DA DONG ' || md.hieu_luc_den::date
                 || ' — VAN hut lan quet TRUOC ngay do' end as canh_bao
  from ma_dinh_danh md join nhan_vien nv on nv.id = md.nhan_vien_id
 where md.he_thong = 'may_cham_cong'
union all
select nv.pin_may, nv.ma_nv, nv.ho_ten, 'COT pin_may — duong doc du phong'
  from nhan_vien nv
 where nv.pin_may is not null and nv.dang_hoat_dong
 order by 1, 4;
"
}

case "$VIEC" in
truoc)
  khoi_a

  lam 'B. Thiet bi'
  sql -c "select serial, ten, dang_bat, pin_tu, pin_den,
                  now() - thay_lan_cuoi as im_lang
             from thiet_bi order by thay_lan_cuoi desc nulls last;"

  lam 'C. Lan quet hien co, theo may va PIN'
  sql -c "select thiet_bi_serial, pin_may, count(*) as so_lan,
                  min(thoi_diem)::date as lan_dau, max(thoi_diem)::date as lan_cuoi,
                  count(*) filter (where nhan_vien_id is not null) as da_gan
             from lan_quet where nguon = 'may' group by 1,2 order by 1,2;"

  lam 'D. Ban dang chay (401 = dung 1.51.0 tro len)'
  docker compose exec -T may_chu node -e \
    "fetch('http://127.0.0.1:8080/api/lan-quet/chua-map/thang?pin_may=1').then(r=>console.log('  HTTP',r.status,r.status===401?'-> dung ban moi':'-> xem lai'))"
  ;;

sau)
  lam 'A. Lenh vua gui'
  sql -c "select id, thiet_bi_serial, left(lenh,70) as lenh, gui_luc, ma_tra_ve,
                  case when gui_luc is null then 'DANG CHO — may chua lay'
                       when ma_tra_ve is null then 'may da lay, chua bao ve'
                       when ma_tra_ve = 0 then 'ok'
                       else 'MAY TU CHOI' end as ket_qua
             from lenh_thiet_bi order by id desc limit 10;"

  lam 'B. Cai gi da ve — da_gan PHAI = 0 neu chua khai PIN nao'
  sql -c "select thiet_bi_serial, count(*) as so_lan, count(distinct pin_may) as so_pin,
                  min(thoi_diem)::date as som_nhat, max(thoi_diem)::date as muon_nhat,
                  count(*) filter (where nhan_vien_id is not null) as da_gan
             from lan_quet where nguon='may' group by 1 order by 1;"

  lam 'C. Neu da_gan khac 0 — ai dang bi gan'
  sql -c "select lq.pin_may, nv.ma_nv, nv.ho_ten, count(*) as so_lan,
                  min(lq.thoi_diem)::date as tu_ngay, max(lq.thoi_diem)::date as den_ngay
             from lan_quet lq join nhan_vien nv on nv.id = lq.nhan_vien_id
            where lq.nguon='may' group by 1,2,3 order by 1;"

  lam 'D. Theo thang'
  sql -c "select to_char(thoi_diem + make_interval(hours => 7),'YYYY-MM') as thang,
                  count(*) as so_lan, count(distinct pin_may) as so_pin
             from lan_quet where nguon='may' group by 1 order by 1;"

  lam 'E. Moc thoi gian bat thuong'
  sql -c "select thiet_bi_serial,
                  count(*) filter (where thoi_diem > now()) as o_tuong_lai,
                  count(*) filter (where thoi_diem < '2020-01-01') as truoc_2020
             from lan_quet where nguon='may' group by 1 order by 1;"
  ;;

log)
  docker compose logs may_chu --tail 300 | grep -iE 'iclock|chua khai bao' | tail -40
  ;;

*) echo "Dung: bash trien_khai/kiem_nhanh.sh truoc|sau|log"; exit 1 ;;
esac
