-- Co che LAM BU (make-up): mot NGAY duoc nghi (vd 31/8, thu Hai) van nam trong cong chuan
-- (mau so), nhung nhan vien KIEM cong cua no bang cach di lam cac BUOI BU (vd chieu thu Bay
-- 22/8 & 29/8 — von la buoi nghi). Cong ngay nghi = tong 0,5 moi buoi bu "da lam".
--
-- "Da lam mot buoi bu" (tu dong theo cham cong, BGD chot):
--   - co mat (co_mat) dung buoi do            -> 0,5
--   - nghi phep CO luong da duyet trum buoi   -> 0,5 (mien lam bu)
--   - nghi khong luong / vang / nghi tuan     -> 0
--
-- Hai bang cau hinh + mot trang thai moi 'lam_bu' cho ngay duoc nghi (de bang cong hien ro,
-- khong lan voi co_mat/ngay_le nhu cach nhap tay truoc day).

-- 1) Ngay duoc nghi bu (ngay o mau so, kiem cong bang buoi bu).
create table if not exists ngay_lam_bu (
  id          uuid primary key default gen_random_uuid(),
  ngay_nghi   date not null unique,
  ghi_chu     text,
  tao_boi     uuid references nguoi_dung(id) on delete set null,
  tao_luc     timestamptz not null default now()
);

-- 2) Cac buoi lam bu de kiem cong cho mot ngay nghi.
create table if not exists buoi_lam_bu (
  id             uuid primary key default gen_random_uuid(),
  ngay_lam_bu_id uuid not null references ngay_lam_bu(id) on delete cascade,
  ngay           date not null,
  buoi           text not null check (buoi in ('sang','chieu')),
  unique (ngay_lam_bu_id, ngay, buoi)
);
create index if not exists buoi_lam_bu_ngay_idx on buoi_lam_bu(ngay);

-- 3) Trang thai moi 'lam_bu' cho ngay duoc nghi bu tren bang cong ngay.
alter table bang_cong_ngay drop constraint if exists bang_cong_ngay_trang_thai_check;
alter table bang_cong_ngay add constraint bang_cong_ngay_trang_thai_check
  check (trang_thai in
    ('vang','co_mat','nghi_phep','nghi_khong_luong','ngay_le','nghi_tuan','cong_tac','lam_bu'));
