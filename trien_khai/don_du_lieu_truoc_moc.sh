#!/usr/bin/env bash
# Xoa du lieu GIAO DICH cham cong / luong duoc them TRUOC mot moc thoi gian.
#
#   bash trien_khai/don_du_lieu_truoc_moc.sh 2026-08-26              # chi DEM
#   bash trien_khai/don_du_lieu_truoc_moc.sh 2026-08-26 --that       # sao luu roi xoa
#
# Moc la 00:00 GIO MAY CHAM CONG cua ngay do (UTC+7), khong phai gio UTC — vi moi thu trong he
# thong nay neo theo gio may.
#
# ============================================================================================
# BA NHOM BANG, VA CHI NHOM 1 BI XOA
#
# Nhom 1 — GIAO DICH cham cong / luong. Sinh lai duoc tu lan quet, nen xoa duoc:
#   lan_quet · bang_cong_ngay · ky_luong (+phieu_luong, phieu_luong_khoan theo cascade) ·
#   ban_chot · lenh_thiet_bi · don_tu · don_nghi_phep · don_giai_trinh · vi_pham ·
#   ket_qua_kpi · tong_hop_kpi · hop_thu_di
#
# Nhom 2 — HO SO NHAN SU. KHONG XOA, ke ca khi duoc them truoc moc:
#   nhan_vien (tru ma NVDEMO*) · ho_so_tep · ho_so_ca_nhan · hop_dong_lao_dong ·
#   quyet_dinh_luong · nguoi_phu_thuoc · chinh_sach_phu_cap · ma_dinh_danh · tai_lieu_nhan_vien ·
#   bhxh_su_kien · bien_ban_thoa_thuan · hop_dong_dien_tu · thiet_bi_cap_phat
#
#   VI SAO: "du lieu them truoc moc" va "du lieu cham cong thu nghiem" la hai tap khac nhau.
#   `ho_so_tep` la BAN GOC giay to phap ly cua nguoi that — hop dong, CCCD — do nhan su nap tay,
#   va tep goc do khong con o dau khac. Ngay nap cua no khong noi gi ve viec no that hay thu.
#   Muon xoa nhung thu nay thi phai xoa co chon, tung ho so, qua giao dien — khong theo ngay.
#
# Nhom 3 — CAU HINH va NHAT KY. KHONG XOA:
#   ca_lam · ngay_le · phong_ban · dia_diem · khoan_luong · tham_so_luong · bac_thue_tncn ·
#   danh_muc_* · loai_vi_pham · quy_tac_vi_pham · thiet_bi · khoa_api · nguoi_dung ·
#   nhat_ky_thao_tac · nhat_ky_api
#
#   `nhat_ky_thao_tac` la bang chung ai lam gi luc nao, ke ca lan xoa nay. Xoa no la xoa dau vet
#   cua chinh minh.
# ============================================================================================
set -euo pipefail

MOC="${1:-}"
THAT=0
[[ "${2:-}" == "--that" ]] && THAT=1
if [[ ! "$MOC" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  printf '\033[31mDung: bash %s YYYY-MM-DD [--that]\033[0m\n' "$0"; exit 1
fi

# Hai may THAT. Lan quet cua may khac, ke ca sau moc, se duoc DEM RIENG chu khong tu xoa.
MAY_THAT="'8116254600435','8116254600440'"

xanh() { printf '\033[32m%s\033[0m\n' "$*"; }
vang() { printf '\033[33m%s\033[0m\n' "$*"; }
lam()  { printf '\033[36m%s\033[0m\n' "$*"; }
do_()  { printf '\033[31m%s\033[0m\n' "$*"; }

[[ -f docker-compose.yml ]] || { do_ 'Hay cd vao thu muc ma nguon.'; exit 1; }
sql() { docker compose exec -T postgres psql -U chamcong -d chamcong -v ON_ERROR_STOP=1 "$@"; }

# `M` la moc theo gio may: 00:00 ngay MOC o UTC+7. Dung cho cac cot `timestamptz`.
#
# CAC COT `date` (nhu `bang_cong_ngay.ngay`) thi so voi `'$MOC'::date` TRUC TIEP, KHONG dung
# `($M)::date`: phep cast timestamptz -> date theo TimeZone cua PHIEN, ma phien psql trong
# container la UTC, nen `'2026-08-26 00:00+07'::timestamptz::date` ra `2026-08-25` — lech dung
# mot ngay. Bo kiem da bat duoc: mot ngay bang cong thu nghiem con sot lai. Theo chieu nguoc thi
# no xoa mot ngay THAT. Da xac nhan tren Postgres that: `show timezone` = Etc/UTC.
M="'$MOC 00:00:00+07'::timestamptz"

echo
lam "Moc: $MOC 00:00 (gio may, UTC+7)   —   may that: $MAY_THAT"

# ================================================================ 1. Dem
vang '
=== SE XOA (nhom 1, truoc moc) ==='
sql -c "
select 'lan_quet' as bang, count(*)::text as so_dong,
       coalesce(min(thoi_diem)::date::text,'-') || ' .. ' || coalesce(max(thoi_diem)::date::text,'-') as khoang
  from lan_quet where thoi_diem < $M
union all select 'bang_cong_ngay', count(*)::text,
       coalesce(min(ngay)::text,'-') || ' .. ' || coalesce(max(ngay)::text,'-')
  from bang_cong_ngay where ngay < '$MOC'::date
union all select 'ky_luong (+phieu_luong theo cascade)', count(*)::text,
       coalesce(string_agg(thang || ':' || trang_thai, ', ' order by thang),'-')
  from ky_luong where tao_luc < $M
union all select 'phieu_luong (theo cascade)', count(*)::text, '-'
  from phieu_luong pl join ky_luong kl on kl.id = pl.ky_luong_id where kl.tao_luc < $M
union all select 'ban_chot', count(*)::text, '-' from ban_chot where tao_luc < $M
union all select 'lenh_thiet_bi', count(*)::text, '-' from lenh_thiet_bi where tao_luc < $M
union all select 'don_tu', count(*)::text, '-' from don_tu where tao_luc < $M
union all select 'don_nghi_phep', count(*)::text, '-' from don_nghi_phep where tao_luc < $M
union all select 'don_giai_trinh', count(*)::text, '-' from don_giai_trinh where tao_luc < $M
union all select 'vi_pham', count(*)::text, '-' from vi_pham where tao_luc < $M
union all select 'hop_thu_di', count(*)::text, '-' from hop_thu_di where tao_luc < $M
union all select 'nhan_vien NVDEMO* (va moi thu cua ho)', count(*)::text, '-'
  from nhan_vien where ma_nv like 'NVDEMO%'
union all select 'thiet_bi THU001', count(*)::text, '-' from thiet_bi where serial = 'THU001';
"

vang '
=== GIU LAI ==='
sql -c "
select '>> lan_quet TU MOC, may that' as bang, count(*)::text as so_dong
  from lan_quet where thoi_diem >= $M and thiet_bi_serial in ($MAY_THAT)
union all select '?? lan_quet TU MOC, may KHAC (xem ghi chu cuoi)', count(*)::text
  from lan_quet where thoi_diem >= $M
    and (thiet_bi_serial is null or thiet_bi_serial not in ($MAY_THAT))
union all select '>> nhan_vien nguoi that', count(*)::text
  from nhan_vien where ma_nv not like 'NVDEMO%'
union all select '>> ho_so_tep (ban goc giay to)', count(*)::text from ho_so_tep
union all select '>> hop_dong_lao_dong', count(*)::text from hop_dong_lao_dong
union all select '>> quyet_dinh_luong', count(*)::text from quyet_dinh_luong
union all select '>> nguoi_phu_thuoc', count(*)::text from nguoi_phu_thuoc
union all select '>> chinh_sach_phu_cap', count(*)::text from chinh_sach_phu_cap
union all select '>> nhat_ky_thao_tac', count(*)::text from nhat_ky_thao_tac
union all select '>> ca_lam / ngay_le / phong_ban',
       (select count(*) from ca_lam)::text || ' / ' ||
       (select count(*) from ngay_le)::text || ' / ' ||
       (select count(*) from phong_ban)::text;
"

if [[ "$THAT" == "0" ]]; then
  echo
  vang 'Day la lan DEM, chua xoa gi.'
  echo "  Xoa that:  bash trien_khai/don_du_lieu_truoc_moc.sh $MOC --that"
  exit 0
fi

# ================================================================ 2. Sao luu
# Sao luu TRONG chinh lenh nay, khong tin vao "chac ai do da sao luu". Mot lan xoa dien rong
# ma khong co duong lui la mot lan khong nen chay.
vang '
=== Sao luu truoc khi xoa ==='
TM="sao_luu/truoc-don-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TM"
docker compose exec -T postgres pg_dump -U chamcong chamcong | gzip > "$TM/csdl.sql.gz"
KT=$(du -h "$TM/csdl.sql.gz" | cut -f1)
xanh "  $TM/csdl.sql.gz ($KT)"
echo "  Lui lai:  gunzip -c $TM/csdl.sql.gz | docker compose exec -T postgres psql -U chamcong -d chamcong"

# ================================================================ 3. Xoa
vang '
=== Dang xoa ==='
sql <<SQL
begin;

-- Thu tu co y: lan_quet TRUOC nhan_vien. \`lan_quet.nhan_vien_id\` la \`on delete set null\`,
-- nen xoa nhan vien truoc se de lai lan quet vo chu thay vi xoa chung.
delete from lan_quet where thoi_diem < $M;
delete from lan_quet where thiet_bi_serial = 'THU001';
delete from lan_quet
 where pin_may in ('9001','9002','9003','9004','9005','9006','9007','9008');

delete from bang_cong_ngay where ngay < '$MOC'::date;

-- ky_luong keo theo phieu_luong va phieu_luong_khoan (FK cascade).
delete from ky_luong  where tao_luc < $M;
delete from ban_chot  where tao_luc < $M;

delete from lenh_thiet_bi  where tao_luc < $M;
delete from don_giai_trinh where tao_luc < $M;
delete from don_nghi_phep  where tao_luc < $M;
delete from don_tu         where tao_luc < $M;
delete from vi_pham        where tao_luc < $M;
delete from hop_thu_di     where tao_luc < $M;

-- Ho so demo: keo theo bang cong, ma dinh danh va cac bang ho so cua chinh no (FK cascade).
delete from nhan_vien where ma_nv like 'NVDEMO%';
delete from thiet_bi  where serial = 'THU001';

commit;
SQL

# ================================================================ 4. Doi chieu lai
vang '
=== Con lai gi ==='
sql -c "
select 'lan_quet truoc moc (phai = 0)' as muc, count(*)::text as so_dong
  from lan_quet where thoi_diem < $M
union all select 'bang_cong_ngay truoc moc (phai = 0)', count(*)::text
  from bang_cong_ngay where ngay < '$MOC'::date
union all select 'nhan_vien NVDEMO* (phai = 0)', count(*)::text
  from nhan_vien where ma_nv like 'NVDEMO%'
union all select '>> lan_quet con lai', count(*)::text from lan_quet
union all select '>> nhan_vien con lai', count(*)::text from nhan_vien
union all select '>> ho_so_tep con lai', count(*)::text from ho_so_tep;
"

echo
xanh 'Xong.'
cat <<'HD'

Hai viec con lai, khong tu dong:

  1. `ban_chot` bi xoa dong trong CSDL nhung TEP .xlsx tren dia thi con, o
     `du_lieu/_ban_chot/`. Chung khong con duong nao mo tu web nua. Xoa tay neu muon:
       ls -la du_lieu/_ban_chot/*/

  2. Lan quet SAU moc tren may KHONG phai hai may that (dong `??` o bang GIU LAI) —
     neu con dong nao, do la may `NYU7261300256`. May do la may demo nhung ngay quet lai
     sau moc, nen lenh nay khong tu quyet. Hai duong:
       - Con dung may do  -> them serial vao MAY_THAT trong lenh nay va giu du lieu.
       - Khong dung nua   -> tat may tren web (Thiet bi -> Tat), roi xoa rieng:
           delete from lan_quet where thiet_bi_serial = 'NYU7261300256';
         va bam "Tinh lai bang cong" cho cac ngay do.
HD
