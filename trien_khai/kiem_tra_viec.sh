#!/usr/bin/env bash
set -e
cd /root/Cham-cong
echo '== thu cau SQL /toi voi tat ca pham vi =='
docker compose exec -T postgres psql -U chamcong -d chamcong -t -A -c "
select v.id, v.nhan_vien_id, v.tieu_de, v.giao_boi,
       coalesce(nd2.ho_ten, nd.ten_dang_nhap) as ten_nguoi_giao
  from cong_viec v
  left join nhan_vien nv on nv.id = v.nhan_vien_id
  left join phong_ban pb on pb.id = nv.phong_ban_id
  left join nguoi_dung nd on nd.id = v.giao_boi
  left join nhan_vien nd2 on nd2.id = nd.nhan_vien_id
  left join cong_viec_nhom cn on cn.id = v.nhom_id
 where (true)
 order by v.tao_luc desc
 limit 3;"
echo '== dem so viec hien co =='
docker compose exec -T postgres psql -U chamcong -d chamcong -t -A -c \
  "select count(*) from cong_viec;"
echo '== goi /api/viec/toi qua ten mien (401 = route song) =='
curl -s -o /dev/null -w '%{http_code}\n' https://teams.tranhoangvietnam.com/chamcong/api/viec/toi
