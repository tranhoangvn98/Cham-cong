-- Hoi thoai (thread) cho mot khieu nai phieu luong: nguoi lao dong va Nhan su trao doi qua lai
-- cho toi khi dong ticket. Ticket MO khi trang_thai in ('moi','dang_xem); DONG khi 'chap_nhan'
-- hoac 'tu_choi' (khong tra loi them duoc). `noi_dung` goc cua khieu nai la tin nhan dau tien.
create table if not exists khieu_nai_luong_tra_loi (
  id             uuid primary key default gen_random_uuid(),
  khieu_nai_id   uuid not null references khieu_nai_luong(id) on delete cascade,
  -- Phia gui: 'nhan_vien' (nguoi khieu nai) hay 'nhan_su' (nguoi xu ly).
  vai            text not null check (vai in ('nhan_vien', 'nhan_su')),
  -- Ai gui (de truy nguon). Giu lai du tai khoan bi xoa.
  nguoi_dung_id  uuid references nguoi_dung(id) on delete set null,
  noi_dung       text not null check (length(btrim(noi_dung)) >= 1),
  tao_luc        timestamptz not null default now()
);
create index if not exists khieu_nai_luong_tra_loi_idx
  on khieu_nai_luong_tra_loi(khieu_nai_id, tao_luc);
