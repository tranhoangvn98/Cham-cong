#!/usr/bin/env bash
set -e
cd /root/Cham-cong
echo '== cot moi cua cong_viec =='
docker compose exec -T postgres psql -U chamcong -d chamcong -t -A -c \
  "select column_name from information_schema.columns where table_name='cong_viec' and column_name in ('nguon','han_gio','han_moc','khoa_chong_trung') order by 1;"
echo '== bang phu =='
docker compose exec -T postgres psql -U chamcong -d chamcong -t -A -c \
  "select to_regclass('cong_viec_hanh_dong') is not null, to_regclass('cong_viec_nhom') is not null, to_regclass('cong_viec_mau_dinh_ky') is not null, to_regclass('cong_viec_workflow') is not null;"
echo '== trang thai cong_viec check =='
docker compose exec -T postgres psql -U chamcong -d chamcong -t -A -c \
  "select pg_get_constraintdef(oid) from pg_constraint where conname='cong_viec_trang_thai_check';"
echo '== route /api/viec (401 = co route, can dang nhap) =='
curl -s -o /dev/null -w '%{http_code}\n' https://127.0.0.1:8080/api/viec/toi -k -H 'Host: teams.tranhoangvietnam.com'
echo '== trang web /cong-viec (200 = SPA phuc vu) =='
curl -s -o /dev/null -w '%{http_code}\n' https://teams.tranhoangvietnam.com/chamcong/cong-viec
