-- Khoa API cho he thong ngoai goi vao /api/v1/*.
--
-- Vi sao KHONG dung JWT nhu webapp: JWT o day gan voi mot NGUOI, song 15 phut va phai lam
-- moi lien tuc. He thong ngoai goi may-den-may, chay theo lich luc 2 gio sang, khong co ai
-- ngoi nhap mat khau. Khoa API song lau, thu hoi duoc tung cai, va pham vi quyen khai rieng
-- cho tung ben tich hop — ERP chi doc bang cong thi khong the vo tinh sua ho so nhan su.

create table if not exists khoa_api (
  id            uuid primary key default gen_random_uuid(),
  ten           text not null,

  -- CHI luu ma bam. Khoa goc hien dung MOT lan luc tao roi khong lay lai duoc — lo thi
  -- thu hoi va tao cai moi. Luu khoa goc trong CSDL nghia la ai doc duoc mot ban sao luu
  -- la goi duoc API that.
  ma_bam        text not null unique,

  -- Tam ky tu dau cua khoa, luu ro de con nhan ra tren giao dien: "ck_a1b2c3…". Khong du
  -- de doan ra khoa.
  tien_to       text not null,

  -- Pham vi quyen, vi du {'nhan_vien:doc','bang_cong:doc'}. Rong = khong lam duoc gi.
  pham_vi       text[] not null default '{}',

  dang_bat      boolean not null default true,
  het_han       timestamptz,

  -- Chan theo IP nguon, cung dinh dang ICLOCK_IP_CHO_PHEP. Rong = khong chan.
  ip_cho_phep   text,

  ghi_chu       text,
  tao_boi       uuid references nguoi_dung(id) on delete set null,
  tao_luc       timestamptz not null default now(),
  dung_lan_cuoi timestamptz,
  so_lan_dung   bigint not null default 0,

  constraint khoa_api_ten_khong_rong check (length(trim(ten)) > 0)
);

create index if not exists khoa_api_dang_bat_idx on khoa_api(dang_bat) where dang_bat = true;

-- ---------------------------------------------------------------- nhat ky goi API
--
-- Ben tich hop bao "hom qua khong lay duoc du lieu" thi phai tra ra duoc ho co goi that
-- khong, goi luc nao, tra ve ma gi. Khong co bang nay thi chi con doi nhau.
create table if not exists nhat_ky_api (
  id          bigserial primary key,
  khoa_api_id uuid references khoa_api(id) on delete set null,
  duong_dan   text not null,
  phuong_thuc text not null,
  ma_tra_ve   int not null,
  dia_chi_ip  text,
  mili_giay   int,
  tao_luc     timestamptz not null default now()
);
create index if not exists nhat_ky_api_theo_khoa_idx on nhat_ky_api(khoa_api_id, id desc);
create index if not exists nhat_ky_api_tao_luc_idx on nhat_ky_api(tao_luc);
