-- Kiem tra phong ban trung ten tren CSDL (chi doc)
select pb.ten,
       pb.tao_luc::date as tao_ngay,
       (select count(*) from nhan_vien n where n.phong_ban_id = pb.id and n.dang_hoat_dong) as nv_dang_lam,
       (select count(*) from nhan_vien n where n.phong_ban_id = pb.id) as nv_tat_ca,
       (select count(*) from vi_tri v where v.phong_ban_id = pb.id) as so_vi_tri,
       (select count(*) from phong_ban_kiem_nhiem k where k.phong_ban_id = pb.id) as luot_kiem_nhiem,
       (select count(*) from thong_bao t where t.phong_ban_id = pb.id) as so_thong_bao,
       (select count(*) from van_ban_cong_ty d where d.phong_ban_id = pb.id) as so_van_ban,
       (select count(*) from dau_viec c where c.phong_ban_id = pb.id) as so_dau_viec,
       (select count(*) from danh_muc_kpi k where k.ap_dung_phong_ban = pb.id) as so_kpi,
       (select count(*) from thong_bao_nhap_ai a where a.phong_ban_id = pb.id) as so_nhap_ai
from phong_ban pb
order by pb.ten;
