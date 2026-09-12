-- Hai tich (chi admin) tren mot phieu luong:
--   mien_thue = mien thue TNCN (thue_tncn = 0)
--   mien_bh   = mien BHXH/BHYT/BHTN (can cu dong = 0 -> moi khoan BH = 0)
-- Dung cho truong hop dac biet do Ban dieu hanh quyet (vd dien khong thuoc dong BH bat buoc,
-- thu nhap da xac nhan duoi nguong chiu thue...). Giong ep_du_cong / mien_phat: la quyet dinh ve
-- tien nen chi admin duoc tich (chan o tang tuyen). Tinh lai ky se giu nguyen 2 tich nay.
alter table phieu_luong
  add column if not exists mien_thue boolean not null default false;
alter table phieu_luong
  add column if not exists mien_bh boolean not null default false;

comment on column phieu_luong.mien_thue is
  'Admin tich: mien thue TNCN cho phieu nay (thue_tncn = 0).';
comment on column phieu_luong.mien_bh is
  'Admin tich: mien BHXH/BHYT/BHTN cho phieu nay (can cu dong = 0).';
