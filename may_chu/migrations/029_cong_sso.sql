-- Noi tai khoan cham cong voi tai khoan tren cong SSO noi bo.
--
-- `cong_sub` la id tai khoan ben cong (truong `sub` cua token). Cong bao dam no ON DINH
-- VINH VIEN, nen day la khoa dung de moc sang ban ghi cua ta.
--
-- VI SAO KHONG DUNG EMAIL LAM KHOA: email doi duoc — doi ten nguoi, doi ten mien, doi phong.
-- Da dinh dung bay nay o duong dang nhap Microsoft: truoc ban 1.32.0 he thong chi khop bang
-- email, nen doi email ben Entra la mat khop, va lan dang nhap ke tiep TAO MOT TAI KHOAN THU
-- HAI cho cung mot nguoi. Email van dung de doi chieu LAN DAU, roi ghi `cong_sub` lai de tu
-- do khong phai doan nua.
alter table nguoi_dung
  add column if not exists cong_sub text;

-- Mot tai khoan cong chi noi voi DUNG MOT tai khoan cham cong. Thieu rang buoc nay thi hai
-- ban ghi cung tro ve mot nguoi, va "ai lam viec nay" khong con tra loi duoc.
create unique index if not exists nguoi_dung_cong_sub_idx
  on nguoi_dung (cong_sub)
  where cong_sub is not null;

comment on column nguoi_dung.cong_sub is
  'Id tai khoan tren cong SSO noi bo (token.sub). Trong = tai khoan nay chua tung dang nhap '
  'qua cong. Vai tro cua nguoi dang nhap qua cong lay tu TOKEN, khong lay tu cot vai_tro.';
