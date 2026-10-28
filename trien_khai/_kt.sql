select id, nguoi_dung_id, tieu_de, left(noi_dung, 200) as noi_dung, tao_luc::timestamp(0) as tao
from thong_bao_rieng where tao_luc > now() - interval '15 minutes' order by id desc limit 5;
