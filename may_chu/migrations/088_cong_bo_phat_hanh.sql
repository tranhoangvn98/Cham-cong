-- Module: CONG BO PHAT HANH — tong hop tinh nang moi tu CHANGELOG thanh thong bao cong ty.
--
-- Moi dot phat hanh la mot dong: khoang phien ban (tu -> den) lay tu CHANGELOG.md, ban nhap
-- thong bao do AI tong hop (fallback khong-LLM khi thieu khoa), admin sua roi CONG BO — luc
-- do tao dong `thong_bao` toan cong ty bat popup + gui email (co che san co).

create table if not exists cong_bo_phat_hanh (
  id            uuid primary key default gen_random_uuid(),
  tu_phien_ban  text not null,
  den_phien_ban text not null,
  tieu_de       text,
  noi_dung      text,
  trang_thai    text not null default 'nhap' check (trang_thai in ('nhap', 'da_cong_bo')),
  thong_bao_id  uuid references thong_bao(id),
  nguoi_tao     uuid references nguoi_dung(id) on delete set null,
  tao_luc       timestamptz not null default now(),
  cap_nhat_luc  timestamptz not null default now()
);

create index if not exists cong_bo_phat_hanh_trang_thai_idx
  on cong_bo_phat_hanh(trang_thai, tao_luc desc);
