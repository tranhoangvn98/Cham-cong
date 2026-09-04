-- Module: THONG BAO RIENG (notification chuong bao) cho tung nguoi dung.
--
-- Khac `thong_bao` (bang tin cong ty, ai trong pham vi cung doc): day la thong bao RIENG cho
-- MOT tai khoan — "don cua ban da duyet", "co don cho ban duyet", "vi pham moi voi ban",
-- "thong bao moi tu cong ty". Sinh ra tu `gui_ngam` (su_kien/thong_bao_day.ts): moi cho dang
-- day push toi app dien thoai gio luu them mot dong o day de web co chuong bao + so chua doc.
--
-- Nho the moi diem su kien SAN CO (nop don, duyet don, giai trinh...) tu dong co chuong bao ma
-- khong phai sua tung route.

create table if not exists thong_bao_rieng (
  id            uuid primary key default gen_random_uuid(),
  nguoi_dung_id uuid not null references nguoi_dung(id) on delete cascade,
  tieu_de       text not null,
  noi_dung      text not null default '',
  -- Kem theo de web/app biet bam vao mo man nao (vd {man:'duyet-don', don_id:...}).
  du_lieu       jsonb,
  da_doc        boolean not null default false,
  tao_luc       timestamptz not null default now()
);

-- Truy van chinh: chua doc cua mot nguoi, moi nhat truoc.
create index if not exists thong_bao_rieng_chua_doc_idx
  on thong_bao_rieng(nguoi_dung_id, tao_luc desc) where da_doc = false;
create index if not exists thong_bao_rieng_nguoi_idx
  on thong_bao_rieng(nguoi_dung_id, tao_luc desc);
