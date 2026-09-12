-- Di muon / ve som CHI phat tien qua module luong (phat_di_muon: phat 50k trong [08:10,08:30),
-- tru nua ngay tu 08:30, mien 3 lan/thang). KHONG phat them qua he ky luat (giam thuong) —
-- neu khong se:
--   (1) TRUNG PHAT: mot lan di muon bi tru tien HAI DUONG (khoan tru_di_muon/tru_nua_ngay ben
--       luong + khoan tru_giam_thuong_kl ben ky luat);
--   (2) VI PHAM Dieu 127 BLLD 2019 (cam phat tien / cat luong thay xu ly ky luat) khi giam
--       thuong TU DONG chay truoc khi cho nguoi lao dong giai trinh (Dieu 122);
--   (3) SO TIEN PHI LY: quy tac theo `tong_phut_muon` voi loai `tinh_moi_lan` = 50.000d * TONG
--       SO PHUT muon -> phong len hang tram trieu / nguoi (nguon "rac" ky 08/2026).
--
-- Vi vay TAT moi quy tac vi pham TU DONG dua tren chi so di muon / ve som. Loai vi pham
-- (loai_vi_pham) GIU NGUYEN de dung THU CONG: ky luat that cho tai pham (khien trach ->
-- keo dai nang luong -> sa thai) van lam tay theo Dieu 122 (hop + giai trinh + bien ban),
-- KHONG qua duong tu dong nay.
--
-- Chi tat (khong xoa) de de bat lai neu chinh sach doi. Idempotent: chi lat true -> false.

update quy_tac_vi_pham
   set dang_bat = false
 where chi_so in ('so_lan_di_muon', 'tong_phut_muon', 'so_lan_ve_som', 'tong_phut_ve_som')
   and dang_bat = true;
