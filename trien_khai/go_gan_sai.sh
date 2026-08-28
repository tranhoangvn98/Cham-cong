#!/usr/bin/env bash
# Go cac lan quet cua mot hoac nhieu PIN ve trang thai CHUA GAN, va don bang cong da sinh ra tu
# chung. Dung khi mot PIN da bi gan cho nguoi khong phai chu that cua no.
#
#   bash trien_khai/go_gan_sai.sh 1 2              # chi DEM
#   bash trien_khai/go_gan_sai.sh 1 2 --that       # sao luu roi go
#
# ============================================================================================
# VI SAO CAN LENH NAY — mot cai bay that, da xay ra tren production 27.08.2026
#
# Dong mot ma dinh danh KHONG ngan no hut lich su. Luat 1 cua `tra_pin` noi khoang DAU TIEN mo
# ve vo cuc phia truoc, vi `hieu_luc_tu` cua dong dau la moc do di tru 025 backfill dat vao chu
# khong phai su that nghiep vu. Nen mot dong da dong lai van la khoang `(-inf, luc_dong)` — va
# moi lan quet trong qua khu cua PIN do van gan cho nguoi giu dong ay.
#
# Hom do: PIN 1 va 2 duoc khai thu cho hai nguoi that tren may demo, roi DONG LAI truoc khi keo
# 40 nghin lan quet lich su tu hai may that. `kiem.sh truoc` bao "khong con PIN nao" — vi no chi
# liet ke ma DANG hieu luc. Bo tiep nhan doc CA MA DA DONG. Ket qua: 353 lan quet cua nhung nguoi
# khac chay vao bang cong cua hai nguoi do, trong do 340 lan la cua mot nguoi da nghi viec.
#
# Bai hoc, va lenh nay la cach sua: ma khai THU thi phai XOA HAN, khong phai dong lai. Dong lai
# dung cho ma tung LA THAT — do la luc lich su cua no can duoc giu.
# ============================================================================================
set -euo pipefail

PINS=()
THAT=0
for a in "$@"; do
  if [[ "$a" == "--that" ]]; then THAT=1
  elif [[ "$a" =~ ^[0-9]+$ ]]; then PINS+=("$a")
  else printf '\033[31mDoi so khong hop le: %s (chi nhan so PIN va --that)\033[0m\n' "$a"; exit 1
  fi
done
if [[ ${#PINS[@]} -eq 0 ]]; then
  printf '\033[31mDung: bash %s <pin> [pin...] [--that]\033[0m\n' "$0"; exit 1
fi

# Danh sach SQL dang ('1','2'). Tung so da qua kiem `^[0-9]+$` o tren nen khong the chen SQL.
DS=$(printf ",'%s'" "${PINS[@]}"); DS="${DS:1}"

xanh() { printf '\033[32m%s\033[0m\n' "$*"; }
vang() { printf '\033[33m%s\033[0m\n' "$*"; }
do_()  { printf '\033[31m%s\033[0m\n' "$*"; }

[[ -f docker-compose.yml ]] || { do_ 'Hay cd vao thu muc ma nguon.'; exit 1; }
sql() { docker compose exec -T postgres psql -U chamcong -d chamcong -v ON_ERROR_STOP=1 "$@"; }

echo
vang "=== PIN se go: $DS ==="

sql -c "
select lq.pin_may, nv.ma_nv, nv.ho_ten, count(*)::text as so_lan,
       min(lq.thoi_diem)::date::text || ' .. ' || max(lq.thoi_diem)::date::text as khoang
  from lan_quet lq join nhan_vien nv on nv.id = lq.nhan_vien_id
 where lq.pin_may in ($DS)
 group by 1,2,3 order by 1;
"

vang '=== Bang cong ngay se bi don (sinh ra tu cac lan quet tren) ==='
sql -c "
with anh_huong as (
  select distinct lq.nhan_vien_id,
         (lq.thoi_diem + make_interval(hours => 7))::date as ngay
    from lan_quet lq
   where lq.pin_may in ($DS) and lq.nhan_vien_id is not null
)
select nv.ma_nv, nv.ho_ten, count(*)::text as so_ngay,
       min(a.ngay)::text || ' .. ' || max(a.ngay)::text as khoang
  from anh_huong a
  join bang_cong_ngay bc on bc.nhan_vien_id = a.nhan_vien_id and bc.ngay = a.ngay
  join nhan_vien nv on nv.id = a.nhan_vien_id
 group by 1,2 order by 1;
"

# Hang rao: bang cong da chot hoac thang da co bang luong duyet thi KHONG tu don.
CHAN=$(sql -tAc "
with anh_huong as (
  select distinct lq.nhan_vien_id,
         (lq.thoi_diem + make_interval(hours => 7))::date as ngay
    from lan_quet lq where lq.pin_may in ($DS) and lq.nhan_vien_id is not null
)
select coalesce(string_agg(x, '; '), '') from (
  select 'co ' || count(*) || ' ngay bang cong DA CHOT' as x
    from anh_huong a join bang_cong_ngay bc
      on bc.nhan_vien_id = a.nhan_vien_id and bc.ngay = a.ngay
   where bc.da_chot
  having count(*) > 0
  union all
  select 'thang ' || kl.thang || ' da co bang luong ' || kl.trang_thai
    from ky_luong kl
   where kl.trang_thai in ('da_duyet','da_tra')
     and exists (select 1 from anh_huong a
                  where to_char(a.ngay,'YYYY-MM') = kl.thang)
) t;
")
if [[ -n "$CHAN" ]]; then
  do_ "TU CHOI: $CHAN"
  do_ 'Bang cong da chot hoac thang da tra luong la can cu. Huy chot / huy duyet truoc.'
  exit 1
fi

if [[ "$THAT" == "0" ]]; then
  echo
  vang 'Day la lan DEM, chua sua gi.'
  echo "  Go that:  bash trien_khai/go_gan_sai.sh ${PINS[*]} --that"
  exit 0
fi

# ---------------------------------------------------------------- sao luu
vang '
=== Sao luu truoc khi sua ==='
TM="sao_luu/truoc-go-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TM"
docker compose exec -T postgres pg_dump -U chamcong chamcong | gzip > "$TM/csdl.sql.gz"
xanh "  $TM/csdl.sql.gz ($(du -h "$TM/csdl.sql.gz" | cut -f1))"

# ---------------------------------------------------------------- sua
vang '
=== Dang go ==='
sql <<SQL
begin;

-- Bang tam giu cac cap (nguoi, ngay) TRUOC khi go, vi sau khi \`nhan_vien_id\` thanh null thi
-- khong con duong nao tim lai chung.
create temp table _anh_huong on commit drop as
select distinct lq.nhan_vien_id,
       (lq.thoi_diem + make_interval(hours => 7))::date as ngay
  from lan_quet lq
 where lq.pin_may in ($DS) and lq.nhan_vien_id is not null;

-- 1. Go gan. \`pin_may\` va \`thoi_diem\` giu nguyen — du lieu tho khong bi sua, chi bo chu.
update lan_quet set nhan_vien_id = null where pin_may in ($DS);

-- 2. Don bang cong da sinh ra tu chung. Xoa chu khong tinh lai o day: bo tinh cong nam trong
--    ung dung, khong goi duoc tu psql. Khong co dong = "chua co du lieu", va do la su that.
delete from bang_cong_ngay bc
 using _anh_huong a
 where bc.nhan_vien_id = a.nhan_vien_id and bc.ngay = a.ngay;

-- 3. Xoa han cac dong ma dinh danh cua chinh nhung PIN nay, ke ca dong da dong.
--    NGOAI LE co y doi voi luat "dong lai chu khong xoa": nhung dong nay la ma KHAI THU, chua
--    bao gio mo ta su that. De chung lai la moi lan nhap lich su sau nay lai hut sai mot lan nua,
--    vi luat 1 cua \`tra_pin\` cho khoang dau mo ve vo cuc phia truoc.
delete from ma_dinh_danh
 where he_thong = 'may_cham_cong' and ma_chuan in ($DS);

commit;
SQL

# ---------------------------------------------------------------- doi chieu
vang '
=== Con lai gi ==='
sql -c "
select 'lan quet cua cac PIN nay con mang chu (phai = 0)' as muc, count(*)::text as so_dong
  from lan_quet where pin_may in ($DS) and nhan_vien_id is not null
union all
select 'lan quet cua cac PIN nay, tong (giu nguyen)', count(*)::text
  from lan_quet where pin_may in ($DS)
union all
select 'ma dinh danh cua cac PIN nay (phai = 0)', count(*)::text
  from ma_dinh_danh where he_thong = 'may_cham_cong' and ma_chuan in ($DS)
union all
select 'lan quet dang CHUA GAN, tat ca PIN', count(*)::text
  from lan_quet where nguon = 'may' and nhan_vien_id is null;
"

echo
xanh 'Xong.'
cat <<'HD'

Viec con lai, tren web:

  Bang cong -> "Tinh lai bang cong" cho khoang ngay vua don. Lenh nay xoa cac dong bang cong
  sinh ra tu lan quet gan sai; tinh lai se dung lai theo du lieu con thuc su ton tai. Bo qua
  buoc nay thi bang cong chi thieu dong, khong sai so — nhung tinh lai cho sach.

  Cac lan quet vua go gio nam o Lan quet -> "PIN chua gan cho nhan vien nao". Gan chung cho
  dung nguoi bang nut "Gan lai", nho khai KHOANG NGAY: mot PIN co the da qua tay hai nguoi.
HD
