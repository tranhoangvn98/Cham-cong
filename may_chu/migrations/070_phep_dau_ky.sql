-- PHEP NAM DA DUNG "CHOT TAY" DAU KY (truoc khi he thong quan ly luong).
--
-- Boi canh: chu DN cung cap bang theo doi phep T1-T7/2026 (so ngay da nghi cua tung nguoi).
-- Tu ky T8 he thong tinh phep theo don. De KHONG dem trung, khai so ngay da dung dau ky vao
-- bang nay; quy phep se tru so_ngay nay, va CHI don phep tu `tinh_tu_ngay` tro di moi duoc dem
-- them (don truoc `tinh_tu_ngay` bo qua vi da gop vao so_ngay).
--
-- Nam khong co dong -> hanh vi cu (dem het don ca nam), tuong thich nguoc.
create table if not exists phep_da_dung_dau_ky (
  nhan_vien_id uuid not null references nhan_vien(id) on delete cascade,
  nam          int  not null,
  so_ngay      numeric(5,1) not null default 0 check (so_ngay >= 0),
  -- Don phep nam tu ngay nay tro di moi dem THEM vao quy da dung; truoc do da gop vao `so_ngay`.
  tinh_tu_ngay date not null,
  ghi_chu      text,
  tao_luc      timestamptz not null default now(),
  primary key (nhan_vien_id, nam)
);

comment on table phep_da_dung_dau_ky is
  'Phep nam da dung chot tay giai doan dau nam (truoc khi he thong quan ly). Quy phep tru so_ngay; don phep tu tinh_tu_ngay tro di moi dem them.';
