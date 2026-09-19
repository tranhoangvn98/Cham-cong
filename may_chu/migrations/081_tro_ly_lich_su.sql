-- Lich su hoi thoai tro ly nhan su: luu LAU DAI theo tung nhan vien de tro ly hieu nguoi
-- hoi hon — dung lam ngu canh cau noi tiep ("ngay do") va chao lai dung chu de lan truoc.
-- Chi nhan vien do doc duoc lich su cua minh (route /api/toi/tro-ly/lich-su); khong goi ra
-- dich vu ngoai, khong phuc vu bat ky man nao khac.
create table if not exists tro_ly_hoi_thoai (
  id           uuid primary key default gen_random_uuid(),
  nhan_vien_id uuid not null references nhan_vien(id) on delete cascade,
  cau_hoi      text not null,
  tra_loi      text not null,
  y_dinh       text not null default 'khong_ro',
  co_hanh_dong boolean not null default false,
  tao_luc      timestamptz not null default now()
);

create index if not exists tro_ly_hoi_thoai_nv_idx
  on tro_ly_hoi_thoai (nhan_vien_id, tao_luc desc);
