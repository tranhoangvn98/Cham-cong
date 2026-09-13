-- YC 02 — PHAN A: PHU CAP THEO KHOI.
--
-- Van de (028): phu cap luu theo TUNG NGUOI -> nguoi moi phai go lai toan bo, de sot. Them
-- khai niem KHOI + chinh sach phu cap cap khoi (mac dinh cho ca khoi); chinh sach ca nhan
-- (028) DE len khoi (override: mien / doi muc / khoan rieng). Cung co che hieu luc tu/den,
-- khong sua tai cho — tinh lai ky cu ra so cu.

create table if not exists khoi (
  id       uuid primary key default gen_random_uuid(),
  ma       text not null unique,
  ten      text not null,
  ghi_chu  text,
  dang_bat boolean not null default true,
  tao_luc  timestamptz not null default now()
);

-- Bon khoi theo yeu cau. Ten hien thi co dau; ma khong dau.
insert into khoi (ma, ten) values
  ('vp',     'Khối Văn Phòng (Hà Nội & Sài Gòn)'),
  ('kho_hn', 'Khối Kho Hà Nội'),
  ('vp_ls',  'Khối VP Lạng Sơn'),
  ('kho_tq', 'Khối Kho Trung Quốc')
on conflict (ma) do nothing;

-- Gan khoi cho nhan vien bang truong TUONG MINH (tranh suy doan sai tu phong_ban/dia_diem).
alter table nhan_vien
  add column if not exists khoi_id uuid references khoi(id) on delete set null;
create index if not exists nhan_vien_khoi_idx on nhan_vien(khoi_id);

-- Chinh sach phu cap CAP KHOI — cung cau truc hieu luc voi chinh_sach_phu_cap (028) nhung gan
-- khoi_id thay cho nhan_vien_id.
create table if not exists chinh_sach_phu_cap_khoi (
  id             uuid primary key default gen_random_uuid(),
  khoi_id        uuid not null references khoi(id) on delete cascade,
  khoan_ma       text not null references khoan_luong(ma) on delete restrict,
  nguon_so_luong text not null default 'co_dinh'
                 check (nguon_so_luong in ('co_dinh', 'theo_cong')),
  so_luong       numeric(10,2) check (so_luong is null or so_luong >= 0),
  so_tien        numeric(14,2) check (so_tien is null or so_tien >= 0),
  don_gia        numeric(14,2) check (don_gia is null or don_gia >= 0),
  hieu_luc_tu    date not null,
  hieu_luc_den   date,
  ly_do          text,
  ghi_chu        text,
  tao_boi        uuid references nguoi_dung(id) on delete set null,
  tao_luc        timestamptz not null default now(),
  constraint cspck_khoang_hop_le
    check (hieu_luc_den is null or hieu_luc_den >= hieu_luc_tu)
);
-- Moi khoi chi co MOT dong dang mo (hieu_luc_den is null) cho moi khoan — dong cu phai dong lai
-- truoc khi mo dong moi (giong tinh than 028).
create unique index if not exists cspck_mot_khoan_mo
  on chinh_sach_phu_cap_khoi (khoi_id, khoan_ma) where hieu_luc_den is null;
create index if not exists cspck_khoi_idx on chinh_sach_phu_cap_khoi(khoi_id);
