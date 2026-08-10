-- Trang thai canh bao cua may cham cong, cho tien trinh giam sat (Phan C · Task 4).
--
-- Chi de CHONG SPAM: canh bao dung mot lan moi lan chuyen online -> offline, khong canh
-- bao lai moi chu ky trong khi may van dang mat ket noi. Khong dung cot nay lam nguon su
-- that cho "may co online khong" — cai do luon tinh tu `thay_lan_cuoi` so voi nguong.
alter table thiet_bi
  add column if not exists da_canh_bao_offline boolean not null default false;

comment on column thiet_bi.da_canh_bao_offline is
  'Da gui canh bao cho lan mat ket noi hien tai chua. Reset ve false khi may bao hieu lai.';
