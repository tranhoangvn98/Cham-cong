-- CHUAN DOAN: Quynh Anh khong vao duoc Cham cong. CHI DOC — khong sua gi.
-- Chay: Get-Content -Raw trien_khai/chuan_doan_quynh_anh.sql | ssh vps 'cd /root/Cham-cong && docker compose exec -T postgres psql -U chamcong -d chamcong -v ON_ERROR_STOP=1 -f -'
\pset pager off

\echo ''
\echo '=== 1. HO SO NHAN VIEN + TAI KHOAN (tim theo ten, bo dau) ==='
select nv.ma_nv, nv.ho_ten, nv.dang_hoat_dong as nv_hoat_dong,
       nv.ngay_nghi_viec, nv.ngay_vao, nv.email as nv_email, nv.pin_may,
       nd.id as nd_id, nd.ten_dang_nhap, nd.vai_tro, nd.dang_hoat_dong as nd_hoat_dong,
       nd.phai_doi_mat_khau, nd.so_lan_sai, nd.khoa_den, nd.dang_nhap_cuoi,
       nd.email_microsoft, nd.cong_sub, nd.ngon_ngu
  from nhan_vien nv
  left join nguoi_dung nd on nd.nhan_vien_id = nv.id
 where translate(lower(nv.ho_ten),
       'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ',
       'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd')
       like '%quynh%anh%';

\echo ''
\echo '=== 2. TAI KHOAN CO TEN DANG NHAP / EMAIL CHUA "quynh" ==='
select nd.id, nd.ten_dang_nhap, nd.vai_tro, nd.dang_hoat_dong,
       nd.phai_doi_mat_khau, nd.so_lan_sai, nd.khoa_den, nd.dang_nhap_cuoi,
       nd.email_microsoft, nd.cong_sub, nd.ngon_ngu, nd.nhan_vien_id
  from nguoi_dung nd
 where lower(nd.ten_dang_nhap) like '%quynh%'
    or lower(coalesce(nd.email_microsoft,'')) like '%quynh%';

\echo ''
\echo '=== 3. NHAT KY THAO TAC GAN DAY (cua nhung nguoi o muc 1) ==='
select nk.nguoi_dung_id, nd.ten_dang_nhap, nk.hanh_dong, nk.thuc_the, nk.thuc_the_id,
       nk.dia_chi_ip, nk.luc
  from nhat_ky_thao_tac nk
  join nguoi_dung nd on nd.id = nk.nguoi_dung_id
  join nhan_vien nv on nv.id = nd.nhan_vien_id
 where translate(lower(nv.ho_ten),
       'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ',
       'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd')
       like '%quynh%anh%'
 order by nk.luc desc limit 15;

\echo ''
\echo '=== 4. TOKEN LAM MOI (phien dang song / bi thu hoi) ==='
select tr.nguoi_dung_id, nd.ten_dang_nhap, tr.het_han, tr.thu_hoi_luc, tr.mo_ta_thiet_bi
  from token_lam_moi tr
  join nguoi_dung nd on nd.id = tr.nguoi_dung_id
  join nhan_vien nv on nv.id = nd.nhan_vien_id
 where translate(lower(nv.ho_ten),
       'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ',
       'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd')
       like '%quynh%anh%'
 order by tr.het_han desc limit 10;
