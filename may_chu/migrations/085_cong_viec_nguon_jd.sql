-- Mo rong nguon cua bang cong_viec: them 'jd' — viec sinh tu dau viec (JD) theo vi tri.
-- Truoc day chi bang cong_viec_mau_dinh_ky duoc them 'jd' (084), nen sinh viec dinh ky
-- tu JD bi loi rang buoc cong_viec_nguon_check. Chi rong ra, khong thu hep.

alter table cong_viec drop constraint if exists cong_viec_nguon_check;
alter table cong_viec
  add constraint cong_viec_nguon_check
  check (nguon in ('ho_so','giam_doc','he_thong','truong_phong',
                   'lien_phong','tu_tao','jd'));
