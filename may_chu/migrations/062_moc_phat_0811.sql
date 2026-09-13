-- BC 01 — L2: moc phat di muon mac dinh = 08:11 (khong phai 08:10).
--
-- Chinh sach BGD chot: chi phat tu 08:11, bo phan giay (08:10:00-08:10:59 KHONG phat). Engine
-- da bo giay san (tinh theo phut). Chi con doi MAC DINH cua cot tu 08:10 -> 08:11 cho khop:
-- tham so production da doi 08:11 tu truoc, day la chot mac dinh de cai moi / dong null cung dung.
alter table tham_so_luong alter column di_muon_moc_50k set default '08:11';

-- Nang cac dong con dang de dung moc cu 08:10 len 08:11 (khong dung dong da chinh tay khac).
update tham_so_luong set di_muon_moc_50k = '08:11'
 where di_muon_moc_50k = '08:10';
