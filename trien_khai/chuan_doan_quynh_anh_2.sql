-- CHUAN DOAN QUYNH ANH — bang chung nghi viec / hoat dong gan day. CHI DOC.
-- Ids tim duoc o lot 1:
--   nhan_vien : 4ca41824-a3a6-4687-8677-21f7251e58ea  (ERP153 Nguyen Quynh Anh)
--   nguoi_dung: 8dc0c240-a92e-4b5d-b23b-9cef974e18a6  (quynhanh.xnk@tranhoangvietnam.com)
\pset pager off

\echo ''
\echo '=== 5. DON TU CUA QUYNH ANH (tat ca loai) ==='
select id, loai, trang_thai, tu_ngay, den_ngay, ly_do, tao_luc, quyet_luc
  from don_tu
 where nhan_vien_id = '4ca41824-a3a6-4687-8677-21f7251e58ea'
 order by tao_luc desc limit 20;

\echo ''
\echo '=== 6. QUY TRINH THOI VIEC ==='
select id, don_tu_id, loai_hop_dong, chuc_danh, ngay_lam_viec_cuoi, lastday_da_chot,
       trang_thai, tao_luc
  from quy_trinh_thoi_viec
 where nhan_vien_id = '4ca41824-a3a6-4687-8677-21f7251e58ea';

\echo ''
\echo '=== 7. VAN BAN AI CA NHAN (gồm quyết định nghỉ việc) ==='
select id, ma, loai, pham_vi, trang_thai, ngay_nghi_viec, nghi_viec_da_chay_luc,
       tao_luc, left(noi_dung_tho, 120) as trich
  from thong_bao_nhap_ai
 where nhan_vien_id = '4ca41824-a3a6-4687-8677-21f7251e58ea'
 order by tao_luc desc limit 10;

\echo ''
\echo '=== 8. HOP THU DI (sự kiện gửi đi liên quan) ==='
select id, loai_su_kien, tao_luc, gui_luc, so_lan, loi_cuoi
  from hop_thu_di
 where du_lieu::text ilike '%4ca41824-a3a6-4687-8677-21f7251e58ea%'
    or du_lieu::text ilike '%ERP153%'
    or du_lieu::text ilike '%Quỳnh Anh%'
    or du_lieu::text ilike '%quynhanh.xnk%'
 order by tao_luc desc limit 30;

\echo ''
\echo '=== 9. LAN QUET TU 25/09 (pin 60 hoac theo ho so) ==='
select thoi_diem, nguon, pin_may, thiet_bi_serial, trang_thai_duyet
  from lan_quet
 where (nhan_vien_id = '4ca41824-a3a6-4687-8677-21f7251e58ea' or pin_may = '60')
   and thoi_diem >= '2026-09-25'
 order by thoi_diem desc limit 30;

\echo ''
\echo '=== 10. BANG CONG NGAY TU 25/09 ==='
select ngay, trang_thai, gio_vao, gio_ra, phut_lam, so_cong, co_dieu_chinh
  from bang_cong_ngay
 where nhan_vien_id = '4ca41824-a3a6-4687-8677-21f7251e58ea'
   and ngay >= '2026-09-25'
 order by ngay;

\echo ''
\echo '=== 11. NHAT KY THAO TAC CHAM TOI CO AY (ai lam, luc nao) ==='
select nk.luc, nk.hanh_dong, nk.thuc_the, nk.thuc_the_id, nk.dia_chi_ip,
       coalesce(nd2.ten_dang_nhap, '') as nguoi_thuc_hien
  from nhat_ky_thao_tac nk
  left join nguoi_dung nd2 on nd2.id = nk.nguoi_dung_id
 where nk.thuc_the_id in ('4ca41824-a3a6-4687-8677-21f7251e58ea',
                          '8dc0c240-a92e-4b5d-b23b-9cef974e18a6')
    or nk.nguoi_dung_id = '8dc0c240-a92e-4b5d-b23b-9cef974e18a6'
 order by nk.luc desc limit 40;
