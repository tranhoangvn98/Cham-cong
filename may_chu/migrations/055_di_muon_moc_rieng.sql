-- Moc phat di muon RIENG theo tung nhan vien (ghi de moc chung cong ty).
--
-- Mac dinh cong ty (tham_so_luong): phat 50k tu 08:10, tru nua ngay tu 08:30. Mot so nguoi
-- co ca lam / chinh sach uu tien duoc duyet rieng thi khai o day; NULL = dung moc chung.
--
-- Vi du duoc duyet: ERP100 vao ca 08:30 -> phat 50k tu 08:40, tru nua ngay tu 09:00. Truoc
-- ban nay he thong ap moc 08:10 cung cho moi nguoi nen ERP100 bi "phat oan".

alter table nhan_vien
  add column if not exists di_muon_moc_50k       time,
  add column if not exists di_muon_moc_nua_ngay  time;

comment on column nhan_vien.di_muon_moc_50k is
  'Moc bat dau phat 50k rieng cua nguoi nay (NULL = dung moc chung cong ty).';
comment on column nhan_vien.di_muon_moc_nua_ngay is
  'Moc bat dau tru nua ngay rieng cua nguoi nay (NULL = dung moc chung cong ty).';

-- ERP100: chinh sach uu tien da duyet — phat 50k tu 08:40, tru nua ngay tu 09:00.
update nhan_vien
   set di_muon_moc_50k      = '08:40',
       di_muon_moc_nua_ngay = '09:00',
       cap_nhat_luc         = now()
 where ma_nv = 'ERP100';
