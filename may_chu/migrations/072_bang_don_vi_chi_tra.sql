-- Phap nhan CHI TRA luong + tai khoan nguon (de LAP LENH CHI theo mau ngan hang).
-- Moi don vi co mot tai khoan chuyen tien (From Account). Nhan vien duoc gan don vi qua
-- ho_so_ca_nhan.don_vi_chi_luong; ten phai KHOP ten o day de tra ra dung tai khoan nguon.
create table if not exists don_vi_chi_tra (
  ten             text primary key,
  tai_khoan_nguon text not null,
  mo_ta           text,
  tao_luc         timestamptz not null default now()
);

insert into don_vi_chi_tra (ten, tai_khoan_nguon) values
  ('Công ty Thống Nhất', '298222'),
  ('Công ty Tiên Phong', '21021998')
on conflict (ten) do nothing;
