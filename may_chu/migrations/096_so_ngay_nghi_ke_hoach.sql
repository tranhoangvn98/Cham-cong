-- ============================================================================
-- 096 — Ke hoach nghi le theo nam: an dinh SO NGAY NGHI thuoc dot
--
-- Truoc day mot dot nghi khai theo khoang (tu_ngay..den_ngay) thi TOAN BO khoang
-- tro thanh ngay le. That su co dot chi nghi MOT PHAN khoang: vd dot Quoc khanh
-- 1/9–3/9 nhung cong ty cho nghi 2 ngay (1/9 va 2/9), con 3/9 la ngay lam viec
-- binh thuong. Cot moi cho phep khai so ngay nghi (tinh tu tu_ngay); null = nghi
-- ca khoang (hanh vi cu, giu tuong thich).
-- ============================================================================

alter table ke_hoach_nghi_le
  add column if not exists so_ngay_nghi int;

comment on column ke_hoach_nghi_le.so_ngay_nghi is
  'So ngay trong khoang duoc nghi le, tinh tu tu_ngay; null = nghi ca khoang';

-- So ngay nghi phai nam trong khoang da khai.
alter table ke_hoach_nghi_le drop constraint if exists ke_hoach_nghi_le_so_ngay_nghi_hop_le;
alter table ke_hoach_nghi_le add constraint ke_hoach_nghi_le_so_ngay_nghi_hop_le
  check (so_ngay_nghi is null or (so_ngay_nghi >= 1 and so_ngay_nghi <= (den_ngay - tu_ngay + 1)));
