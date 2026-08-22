#!/usr/bin/env bash
# Do cac PIN may cham cong co KHOANG HIEU LUC CHONG NHAU trong bang `ma_dinh_danh`.
#
# VI SAO CAN: index cua di tru 025 chi bao dam cac ma DANG hieu luc khong trung nhau
# (`where hieu_luc_den is null`). Lich su thi van chong nhau duoc — va mot khoang chong nhau nghia
# la co mot thoi diem ma PIN do thuoc hai nguoi, nen bo tiep nhan phai TU QUYET ai duoc cong.
# `tra_pin` quyet dinh duoc ("lan cap gan nhat thang") de khong bao gio vut mot lan quet di, nhung
# do la mot luat de ke lai, khong phai mot cau tra loi dung.
#
# Buoc tiep theo — them rang buoc `exclude using gist` cho ca lich su — chi lam duoc SAU khi lenh
# nay bao sach. Di tru do se THAT BAI neu con khoang chong nhau, va that bai giua mot lan trien
# khai la thu khong ai muon gap. Vi vay: DO TRUOC, SUA TAY, ROI MOI THEM RANG BUOC.
#
# CHI DOC. Khong sua, khong xoa, khong tao gi.
#
#   bash trien_khai/pin_trung_khoang.sh
#
# Chay tu THU MUC GOC cua ma nguon.
set -euo pipefail

xanh() { printf '\033[32m%s\033[0m\n' "$*"; }
vang() { printf '\033[33m%s\033[0m\n' "$*"; }
do_()  { printf '\033[31m%s\033[0m\n' "$*"; }

if [[ ! -f docker-compose.yml ]]; then
  do_ 'Khong thay docker-compose.yml. Hay cd vao thu muc ma nguon roi chay lai.'
  exit 1
fi

# Hai dong chong nhau khi khoang cua chung giao nhau. `hieu_luc_den` LOAI TRU, nen dung `<` chu
# khong phai `<=`: hai dong lien tiep dung sat nhau (den cua dong truoc = tu cua dong sau) KHONG
# phai chong nhau — do la ranh gioi doi chu, va no la chuyen binh thuong.
SQL=$(cat <<'EOF'
select a.ma_chuan as pin,
       na.ma_nv || ' (' || na.ho_ten || ')' as nguoi_1,
       to_char(a.hieu_luc_tu, 'YYYY-MM-DD HH24:MI') as tu_1,
       coalesce(to_char(a.hieu_luc_den, 'YYYY-MM-DD HH24:MI'), 'con hieu luc') as den_1,
       nb.ma_nv || ' (' || nb.ho_ten || ')' as nguoi_2,
       to_char(b.hieu_luc_tu, 'YYYY-MM-DD HH24:MI') as tu_2,
       coalesce(to_char(b.hieu_luc_den, 'YYYY-MM-DD HH24:MI'), 'con hieu luc') as den_2
  from ma_dinh_danh a
  join ma_dinh_danh b
    on b.he_thong = a.he_thong and b.ma_chuan = a.ma_chuan and b.id > a.id
   and a.hieu_luc_tu < coalesce(b.hieu_luc_den, 'infinity'::timestamptz)
   and b.hieu_luc_tu < coalesce(a.hieu_luc_den, 'infinity'::timestamptz)
  join nhan_vien na on na.id = a.nhan_vien_id
  join nhan_vien nb on nb.id = b.nhan_vien_id
 where a.he_thong = 'may_cham_cong'
 order by a.ma_chuan, a.hieu_luc_tu;
EOF
)

echo 'Do PIN may cham cong co khoang hieu luc chong nhau...'
echo
KQ=$(docker compose exec -T postgres psql -U chamcong -d chamcong -v ON_ERROR_STOP=1 -c "$SQL")
echo "$KQ"
echo

SO=$(printf '%s' "$KQ" | sed -n 's/^ *(\([0-9]*\) row.*/\1/p' | head -1)
SO=${SO:-0}

if [[ "$SO" == "0" ]]; then
  xanh 'Khong co khoang nao chong nhau. Du dieu kien them rang buoc `exclude using gist`.'
  exit 0
fi

vang "Co $SO cap khoang chong nhau. PHAI sua tay truoc khi them rang buoc."
echo
cat <<'HD'
Cach sua, theo tung cap o tren:

  1. Xac dinh dong nao SAI. Cot `nguon` cua `ma_dinh_danh` noi ai/cai gi ghi dong do
     ('di_tru' = backfill 025, 'nguoi_khai' = go tay, 'nhap_csv' = nhap tep...).
     Dong tu 'di_tru' thuong la dong co `hieu_luc_tu` = ngay tao ho so, va do la moc gia.
  2. Sua `hieu_luc_tu` / `hieu_luc_den` cho hai khoang KHONG con giao nhau. Dat `hieu_luc_den`
     cua dong truoc = `hieu_luc_tu` cua dong sau — dung sat nhau, khong chong.
  3. Kiem lai bang cong cua nhung ngay trong doan chong: no da duoc tinh theo luat
     "lan cap gan nhat thang", nen doi khoang co the doi chu mot so lan quet. Chay lai
     "Tinh lai bang cong" cho khoang ngay do.
  4. Chay lai lenh nay cho toi khi sach.

KHONG xoa dong nao. Dong lai chu khong xoa: xoa la mat cau tra loi cho "PIN nay tung la cua ai".
HD
exit 1
