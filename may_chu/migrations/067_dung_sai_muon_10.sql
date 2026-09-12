-- NGUONG DI MUON: bat dau tinh vi pham tu phut thu 11 (vd ca 08:00 -> tinh muon tu 08:11:00).
--
-- Chu cong ty chot: "tu 8 gio 11 phut 00 giay bat dau tinh vi pham". Truoc day dung_sai_muon_phut
-- mac dinh = 5 -> ca 08:00 tinh muon tu 08:06:00 (khong dong nhat voi quy dinh). Dat = 10 cho
-- TOAN BO ca de dong bo: so_phut() lam tron XUONG nen 08:10:59 -> 10 phut -> khong muon; 08:11:00
-- -> 11 phut -> muon 1 phut. Dung ranh gioi 08:11:00.
--
-- Chi doi NGUONG DI MUON (buoi sang). Nguong ve som (dung_sai_som_phut) giu nguyen.
--
-- LUU Y VAN HANH: sau khi chay migration nay phai TINH LAI CONG thang lien quan (Bang cong ->
-- Tinh lai thang) de phut_muon tinh lai theo nguong moi, roi chay lai phat hien vi pham + ky luat
-- + tinh luong. Migration chi doi tham so, khong tu tinh lai du lieu cu.

alter table ca_lam alter column dung_sai_muon_phut set default 10;

update ca_lam set dung_sai_muon_phut = 10 where dung_sai_muon_phut < 10;
