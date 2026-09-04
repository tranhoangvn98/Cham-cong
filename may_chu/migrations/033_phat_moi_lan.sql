-- Phat GIAM THUONG theo TUNG LAN vi pham (vd di muon: 50.000d moi lan qua 10 phut, Dieu 14
-- Noi quy 01/2026 / Dieu 104 BLLD). Truoc day `muc_tru_tien` la mot khoan CO DINH cho ca ky;
-- di muon can nhan theo so lan trong thang.
--
-- RANH GIOI PHAP LY khong doi: day la GIAM THUONG P3, KHONG phai phat tien / cat luong (Dieu 127).

alter table loai_vi_pham
  add column if not exists tinh_moi_lan boolean not null default false;
comment on column loai_vi_pham.tinh_moi_lan is
  'true = muc_tru_tien nhan voi SO LAN vi pham trong ky (vd di muon 50k moi lan). false = khoan '
  'co dinh cho ca ky. So lan lay tu chi so trong bang_chung cua vi pham he thong.';

-- Di muon (NQ-A01): 50.000d moi lan, tinh theo tung lan. Chi dat khi HR chua khai muc rieng.
update loai_vi_pham
   set muc_tru_tien = 50000, tinh_moi_lan = true
 where ma = 'NQ-A01' and muc_tru_tien = 0;

-- Bat quy tac tu phat hien di muon THEO TUNG LAN: nguong >= 1 (bat ky lan di muon nao qua dung sai
-- ca lam deu tinh). So lan = so_lan_di_muon trong bang_chung -> tien phat = 50k * so_lan.
--
-- Chu cong ty yeu cau di muon phai bi phat tu dong (duoi 2tr nen he thong tu ap). Chi bat DUNG
-- quy tac so_lan_di_muon cua NQ-A01; cac quy tac khac cua NQ-A01 (tong_phut_muon, ve_som) giu TAT
-- de khong dem trung cung mot loi.
update quy_tac_vi_pham q
   set nguong = 1, toan_tu = '>=', dang_bat = true,
       ghi_chu = 'Phat di muon theo tung lan (50.000d/lan, Dieu 14 Noi quy). He thong tu ap.'
  from loai_vi_pham l
 where q.loai_vi_pham_id = l.id and l.ma = 'NQ-A01' and q.chi_so = 'so_lan_di_muon';
