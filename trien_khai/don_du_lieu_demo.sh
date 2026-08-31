#!/usr/bin/env bash
# Don sach du lieu demo truoc khi vao van hanh that.
#
# VI SAO LA SCRIPT CHU KHONG PHAI MOT NUT: xoa lan quet tho KHONG co duong API, va do la co y
# — trang Lan quet noi "du lieu tho tu may, khong bao gio bi sua". Mot route `DELETE /lan-quet/:id`
# se pha dung cau do. Nhung du lieu demo thi phai bien mat, neu khong no nam lan trong bang
# "PIN chua gan" va lam nhieu dung cai danh sach nhan su phai doc de gan nguoi that.
#
# Nen: mot script trien khai, pham vi HEP (chi cham cai co dau demo), doc truoc roi moi xoa.
#
#   bash trien_khai/don_du_lieu_demo.sh              # chi DEM, khong xoa gi
#   bash trien_khai/don_du_lieu_demo.sh --that       # xoa that
#
# Nhung gi bi xoa:
#   1. Lan quet cua may gia lap THU001
#   2. Lan quet mang PIN 9001..9008 o BAT KY may nao. Liet ke tung so chu KHONG dung
#      `between '9001' and '9008'`: `pin_may` la TEXT nen `between` la so sanh chuoi, va
#      '90015' hay '9001234' deu nam trong khoang do. Da kiem tren Postgres that.
#   3. Nhan vien ma_nv LIKE 'NVDEMO%' (keo theo bang cong, ma dinh danh, ho so — do FK cascade)
#   4. Thiet bi THU001
#
# KHONG bi xoa: cac lan quet PIN 1 va 2 tren may NYU7261300256. Chung gan cho NGUOI THAT
# (Phan Song Hao, Hoang Minh Ngoc) va da sinh ra bang cong — xoa la phai tinh lai bang cong
# cua nguoi that. Xem phan cuoi de biet cach xu ly rieng.
set -euo pipefail

THAT=0
[[ "${1:-}" == "--that" ]] && THAT=1

xanh() { printf '\033[32m%s\033[0m\n' "$*"; }
vang() { printf '\033[33m%s\033[0m\n' "$*"; }
do_()  { printf '\033[31m%s\033[0m\n' "$*"; }

if [[ ! -f docker-compose.yml ]]; then
  do_ 'Khong thay docker-compose.yml. Hay cd vao thu muc ma nguon roi chay lai.'
  exit 1
fi

sql() { docker compose exec -T postgres psql -U chamcong -d chamcong -v ON_ERROR_STOP=1 "$@"; }

# ---------------------------------------------------------------- 1. Doc truoc
vang '=== Se xoa nhung gi ==='
sql -c "
select 'lan quet cua may THU001' as muc,
       count(*)::text as so_luong from lan_quet where thiet_bi_serial = 'THU001'
union all
select 'lan quet PIN 9001-9008 (moi may)',
       count(*)::text from lan_quet where pin_may in ('9001','9002','9003','9004','9005','9006','9007','9008')
union all
select 'nhan vien NVDEMO*',
       count(*)::text from nhan_vien where ma_nv like 'NVDEMO%'
union all
select 'bang cong ngay cua NVDEMO* (xoa theo cascade)',
       count(*)::text from bang_cong_ngay bc
        join nhan_vien nv on nv.id = bc.nhan_vien_id where nv.ma_nv like 'NVDEMO%'
union all
select 'ma dinh danh cua NVDEMO* (xoa theo cascade)',
       count(*)::text from ma_dinh_danh md
        join nhan_vien nv on nv.id = md.nhan_vien_id where nv.ma_nv like 'NVDEMO%'
union all
select 'thiet bi THU001',
       count(*)::text from thiet_bi where serial = 'THU001';
"

# Phieu luong la thu duy nhat co the CHAN lan don nay, nen in ro no thuoc ky nao va ky do dang
# o trang thai gi — de nguoi doc quyet duoc truoc khi go `--that`.
vang '=== Phieu luong cua ho so NVDEMO* nam trong ky nao ==='
sql -c "
select kl.thang as ky_luong, kl.trang_thai,
       count(*)::text as so_phieu_demo,
       case when kl.trang_thai in ('da_duyet','da_tra') then 'CHAN — ky da chot, khong xoa'
            else 'xoa duoc — ky chua chot' end as ket_luan
  from phieu_luong pl
  join nhan_vien nv on nv.id = pl.nhan_vien_id
  join ky_luong kl on kl.id = pl.ky_luong_id
 where nv.ma_nv like 'NVDEMO%'
 group by kl.thang, kl.trang_thai order by kl.thang;
"

# ---------------------------------------------------------------- 2. Hang rao
# Cung ba hang rao ma `DELETE /api/nhan-vien/:id` dat ra. Lap lai o day chu khong tin rang
# "du lieu demo thi chac khong co gi" — neu ai da tinh luong hoac cap tai khoan cho mot ho so
# NVDEMO thi no khong con la du lieu demo nua.
# Ban dau hang rao nay chan MOI phieu luong. Qua chat: du lieu demo duoc nap kem mot ky luong
# thu, nen ho so demo nao cung co dung mot phieu — va the la khong bao gio don duoc.
#
# Cai dang chan la KY DA CHOT: xoa mot phieu khoi ky `da_duyet`/`da_tra` la doi tong so cua mot
# ky da duyet, tuc la sua chung tu. Ky con `nhap` hay `huy` thi phieu demo chi la so nhap dang
# do — xoa duoc, chi phai bam "Tinh luong" lai cho ky do.
CHAN=$(sql -tAc "
select coalesce(string_agg(x, '; '), '') from (
  select 'ky ' || kl.thang || ' (' || kl.trang_thai || ') co ' || count(*) || ' phieu demo' as x
    from phieu_luong pl
    join nhan_vien nv on nv.id = pl.nhan_vien_id
    join ky_luong kl on kl.id = pl.ky_luong_id
   where nv.ma_nv like 'NVDEMO%' and kl.trang_thai in ('da_duyet','da_tra')
   group by kl.thang, kl.trang_thai
  union all
  select nv.ma_nv || ' co tai khoan dang nhap'
    from nguoi_dung nd join nhan_vien nv on nv.id = nd.nhan_vien_id
   where nv.ma_nv like 'NVDEMO%'
) t;
")
if [[ -n "$CHAN" ]]; then
  do_ "TU CHOI: $CHAN"
  do_ 'Ky luong da chot la chung tu. Huy duyet ky do truoc, hoac de ho so demo o lai.'
  exit 1
fi

if [[ "$THAT" == "0" ]]; then
  echo
  vang 'Day la lan DEM, chua xoa gi.'
  echo '  Xoa that:  bash trien_khai/don_du_lieu_demo.sh --that'
  exit 0
fi

# ---------------------------------------------------------------- 3. Xoa, mot giao dich
vang '=== Dang xoa ==='
sql <<'SQL'
begin;

delete from lan_quet where thiet_bi_serial = 'THU001';
delete from lan_quet where pin_may in ('9001','9002','9003','9004','9005','9006','9007','9008');

-- Xoa nhan vien keo theo bang_cong_ngay, ma_dinh_danh va cac bang ho so (FK on delete cascade).
-- `lan_quet.nhan_vien_id` thi `on delete set null`, nen phai xoa lan quet TRUOC — da lam o tren.
delete from nhan_vien where ma_nv like 'NVDEMO%';

delete from thiet_bi where serial = 'THU001';

commit;
SQL

# ---------------------------------------------------------------- 4. Doi chieu lai
echo
vang '=== Con lai gi ==='
sql -c "
select 'lan quet con mang dau demo' as muc, count(*)::text as so_luong
  from lan_quet
 where thiet_bi_serial = 'THU001' or pin_may in ('9001','9002','9003','9004','9005','9006','9007','9008')
union all
select 'nhan vien NVDEMO*', count(*)::text from nhan_vien where ma_nv like 'NVDEMO%'
union all
select 'thiet bi THU001', count(*)::text from thiet_bi where serial = 'THU001';
"

# Phieu luong demo bi xoa theo cascade cua `nhan_vien`, nen tong so cua ky luong do da doi.
KY=$(sql -tAc "select string_agg(distinct thang, ', ') from ky_luong where trang_thai in ('nhap','cho_duyet');")
echo
xanh 'Xong. Ba dong tren phai bang 0.'
if [[ -n "$KY" ]]; then
  echo
  vang "Ky luong chua chot: $KY"
  echo '  Phieu luong cua ho so demo da bi xoa theo cascade, nen tong so cua ky do da doi.'
  echo '  Vao web -> Bang luong -> ky do -> bam "Tinh luong" de dung lai cho dung.'
fi
cat <<'HD'

Con MOT thu KHONG do script nay xoa, va co y:

  Cac lan quet PIN 1 va 2 tren may NYU7261300256 — do la lan thu nghiem, nhung chung da gan
  cho NGUOI THAT (Phan Song Hao, Hoang Minh Ngoc) va da sinh ra bang cong ngay.

  Xoa chung la sua bang cong cua nguoi that, nen phai lam hai buoc va theo dung thu tu:

    1. Ghi lai cac ngay bi anh huong:
         select distinct (thoi_diem + interval '7 hours')::date
           from lan_quet where thiet_bi_serial = 'NYU7261300256' and pin_may in ('1','2');

    2. Xoa lan quet do, roi vao web bam "Tinh lai bang cong" cho dung khoang ngay o buoc 1
       (Bang cong -> Tinh lai). Bo qua buoc nay thi bang cong van giu so cu, tinh tu cac lan
       quet khong con ton tai — sai am tham, dung kieu hong te nhat cua he thong nay.
HD
