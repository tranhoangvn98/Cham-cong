-- Thong bao toan cong ty: them 2 kenh phat khi tao thong bao —
--   popup     : hien HOP THOAI (modal) bat buoc doc khi nguoi dung mo app, tai dung
--               thong_bao_da_doc san co de biet ai da doc/dismiss (khong lam moi bang).
--   gui_email : co gui email toi tung nguoi nhan (chi ghi lai da bat/tat; viec gui do route lo).
--
-- Chi them cot, khong doi hanh vi thong bao cu (mac dinh false). Idempotent.

alter table thong_bao add column if not exists popup     boolean not null default false;
alter table thong_bao add column if not exists gui_email boolean not null default false;

-- Loc nhanh cac thong bao popup con hieu luc (nguoi dung nao mo app cung hoi bang nay).
create index if not exists thong_bao_popup_idx
  on thong_bao(tao_luc desc) where popup = true and da_go = false;
