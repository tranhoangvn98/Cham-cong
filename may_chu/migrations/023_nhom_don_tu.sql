-- Them nhom `don_tu` vao kho tep ho so: BAN DON DA DUYET.
--
-- Yeu cau: "cac loai don ... duyet tren he thong. sau khi duoc duyet thi luu tren he thong".
--
-- VI SAO KHONG LAM MOT BANG MOI: ban don da duyet la ho so cua MOT NHAN VIEN, dung nhu hop
-- dong hay quyet dinh luong. Dat no vao `ho_so_tep` thi duoc dung lai toan bo phan da co:
-- phan quyen theo nhom, tab Ho so tren web, duong tai tep, cay thu muc tren dia, sao luu.
-- Mot bang moi la mot ban sao cua tat ca nhung thu do, va moi ban sao la mot cho de lech.
--
-- `thuoc_id` cua dong `ho_so_tep` tro ve don goc (don_nghi_phep.id hoac don_giai_trinh.id),
-- nen tu ban don tra nguoc ve duoc don da sinh ra no.

alter table ho_so_tep drop constraint if exists ho_so_tep_nhom_check;

alter table ho_so_tep add constraint ho_so_tep_nhom_check check (nhom in (
  'hop_dong','bien_ban','luong','cong_viec','bao_cao','khieu_nai','thiet_bi',
  'thong_tin','tai_lieu','nguoi_phu_thuoc','bhxh','don_tu','khac'
));

comment on column ho_so_tep.nhom is
  'Nhom ho so. PHAI khop CAC_NHOM trong may_chu/src/bao_mat/quyen_ho_so.ts cong voi "khac". '
  'Co bai kiem e2e tai len that cho tung nhom trong CAC_NHOM.';
