#!/usr/bin/env bash
# DEM du lieu thu nghiem truoc mot moc ngay. CHI DOC — khong xoa gi, khong sua gi.
#
# VI SAO TACH RIENG KHOI `don_du_lieu_demo.sh`: lenh kia co pham vi hep va tu xac dinh duoc
# (dau `NVDEMO`, serial `THU001`, PIN 9001-9008). Con "moi thu truoc ngay X la du lieu thu" thi
# KHONG tu xac dinh duoc — no la mot cau tuyen bo cua nguoi van hanh, va bien no thanh lenh xoa
# ma khong ai doc lai tung bang la cach mat du lieu that.
#
# Nen lenh nay chi DEM va chia ba nhom. Doc xong roi moi quyet xoa gi.
#
#   bash trien_khai/kiem_du_lieu_thu.sh              # moc = hom nay
#   bash trien_khai/kiem_du_lieu_thu.sh 2026-08-27   # moc tu chon
set -euo pipefail

MOC="${1:-}"
if [[ -z "$MOC" ]]; then MOC=$(date +%F); fi
if [[ ! "$MOC" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  printf '\033[31mMoc ngay phai dang YYYY-MM-DD, nhan duoc "%s"\033[0m\n' "$MOC"; exit 1
fi

# Hai may THAT. Moi may khac deu la may thu.
MAY_THAT="'8116254600435','8116254600440'"

xanh() { printf '\033[32m%s\033[0m\n' "$*"; }
vang() { printf '\033[33m%s\033[0m\n' "$*"; }
lam()  { printf '\033[36m%s\033[0m\n' "$*"; }

[[ -f docker-compose.yml ]] || { echo 'Hay cd vao thu muc ma nguon.'; exit 1; }
sql() { docker compose exec -T postgres psql -U chamcong -d chamcong -v ON_ERROR_STOP=1 "$@"; }

echo
lam "Moc ngay: $MOC   —   may that: $MAY_THAT"

# ================================================================ NHOM 1
vang '
=== NHOM 1 — Du lieu GIAO DICH cham cong / luong. Sinh lai duoc, xoa duoc. ==='
sql -c "
with m as (select '$MOC'::date as moc)
select 'lan_quet — TRUOC moc' as bang, count(*)::text as so_dong,
       coalesce(min(thoi_diem)::date::text,'-') || ' .. ' || coalesce(max(thoi_diem)::date::text,'-') as khoang
  from lan_quet, m where (thoi_diem + interval '7 hours')::date < m.moc
union all
select 'lan_quet — tu moc, tren MAY THU (khong phai may that)', count(*)::text,
       coalesce(string_agg(distinct thiet_bi_serial, ', '),'-')
  from lan_quet, m
 where (thoi_diem + interval '7 hours')::date >= m.moc
   and (thiet_bi_serial is null or thiet_bi_serial not in ($MAY_THAT))
union all
select '>> lan_quet — tu moc, tren MAY THAT (GIU LAI)', count(*)::text,
       coalesce(string_agg(distinct thiet_bi_serial, ', '),'-')
  from lan_quet, m
 where (thoi_diem + interval '7 hours')::date >= m.moc
   and thiet_bi_serial in ($MAY_THAT)
union all
select 'bang_cong_ngay — TRUOC moc', count(*)::text,
       coalesce(min(ngay)::text,'-') || ' .. ' || coalesce(max(ngay)::text,'-')
  from bang_cong_ngay, m where ngay < m.moc
union all
select 'bang_cong_ngay — da_chot = true (can chu y)', count(*)::text, '-'
  from bang_cong_ngay where da_chot
union all
select 'ky_luong (moi trang thai)', count(*)::text,
       coalesce(string_agg(thang || ':' || trang_thai, ', ' order by thang),'-') from ky_luong
union all
select 'phieu_luong', count(*)::text, '-' from phieu_luong
union all
select 'ban_chot (ban luong da duyet)', count(*)::text, '-' from ban_chot
union all
select 'lenh_thiet_bi', count(*)::text, '-' from lenh_thiet_bi
union all
select 'don_tu', count(*)::text, '-' from don_tu
union all
select 'don_nghi_phep', count(*)::text, '-' from don_nghi_phep
union all
select 'don_giai_trinh', count(*)::text, '-' from don_giai_trinh
union all
select 'vi_pham', count(*)::text, '-' from vi_pham
union all
select 'ket_qua_kpi', count(*)::text, '-' from ket_qua_kpi
union all
select 'hop_thu_di (su kien da phat)', count(*)::text, '-' from hop_thu_di;
"

# ================================================================ NHOM 2
vang '
=== NHOM 2 — HO SO NHAN SU. KHONG xoa theo ngay: day la du lieu that, nhap tay. ==='
sql -c "
select 'nhan_vien — ma NVDEMO*' as bang, count(*)::text as so_dong from nhan_vien where ma_nv like 'NVDEMO%'
union all
select '>> nhan_vien — nguoi that (GIU)', count(*)::text from nhan_vien where ma_nv not like 'NVDEMO%'
union all
select '>> ho_so_tep — tep da nap vao ho so (GIU)', count(*)::text from ho_so_tep
union all
select '>> hop_dong_lao_dong (GIU)', count(*)::text from hop_dong_lao_dong
union all
select '>> quyet_dinh_luong (GIU)', count(*)::text from quyet_dinh_luong
union all
select '>> nguoi_phu_thuoc (GIU)', count(*)::text from nguoi_phu_thuoc
union all
select '>> ho_so_ca_nhan (GIU)', count(*)::text from ho_so_ca_nhan
union all
select '>> chinh_sach_phu_cap (GIU)', count(*)::text from chinh_sach_phu_cap
union all
select '>> ma_dinh_danh (GIU tru cua NVDEMO)', count(*)::text from ma_dinh_danh;
"

# ================================================================ NHOM 3
vang '
=== NHOM 3 — CAU HINH va NHAT KY. Giu het. ==='
sql -c "
select '>> ca_lam' as bang, count(*)::text as so_dong from ca_lam
union all select '>> ngay_le', count(*)::text from ngay_le
union all select '>> phong_ban', count(*)::text from phong_ban
union all select '>> dia_diem', count(*)::text from dia_diem
union all select '>> khoan_luong', count(*)::text from khoan_luong
union all select '>> tham_so_luong', count(*)::text from tham_so_luong
union all select '>> thiet_bi', count(*)::text from thiet_bi
union all select '>> nguoi_dung', count(*)::text from nguoi_dung
union all select '>> nhat_ky_thao_tac (BANG CHUNG — khong bao gio xoa)', count(*)::text from nhat_ky_thao_tac;
"

cat <<'HD'

--------------------------------------------------------------------------------
Doc xong roi hay quyet. Ba cau can tra loi truoc khi co bat ky lenh xoa nao:

 1. `bang_cong_ngay` co dong nao `da_chot = true` khong, va `ban_chot` co bao nhieu ban?
    Co thi do la bang cong DA DUOC DUYET — xoa la mat can cu, phai huy duyet truoc.

 2. `ho_so_tep` co bao nhieu tep? Do la ban goc giay to phap ly cua nguoi that, nap tay.
    Chung KHONG lien quan gi den "du lieu cham cong thu nghiem" va phai o lai.

 3. May `NYU7261300256` (VP1 - Cua chinh) sap toi con dung khong? Neu con thi no la may
    THAT thu ba va phai them vao danh sach may that; neu khong thi tat no di
    (Thiet bi -> Tat) chu khong de no van day du lieu len.

Lenh nay KHONG xoa gi. Xoa la mot lenh khac, viet sau khi ba cau tren co cau tra loi.
--------------------------------------------------------------------------------
HD
