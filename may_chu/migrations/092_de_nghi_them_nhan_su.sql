-- ============================================================================
-- 092 — Onboarding nhan su moi tu dong (DTKT 02/2026): de nghi them nhan su.
--
-- HR/quan ly tao DE NGHI them nguoi (chua thanh nhan_vien); Admin duyet MOT buoc
-- thi he thong chay khoi tao trong mot transaction: insert nhan_vien + cap PIN +
-- outbox (cong / ERP1 / MS365) + lenh cap user xuong may cua + sinh cong viec
-- "Nhap viec" kem checklist cho nguoi phu trach nhan su.
--
-- Xem tai_lieu/ONBOARDING-NHAN-SU-MOI.md.
-- ============================================================================

-- ---------------------------------------------------------------- de nghi them nhan su
create table if not exists de_nghi_them_nhan_su (
  id              uuid primary key default gen_random_uuid(),
  -- Du lieu ho so de nghi (khớp dau vao tao nhan_vien hien co).
  ho_ten          text not null,
  -- Rong = de he thong/Admin cap khi duyet (route duyet nhan ma_nv thay the).
  ma_nv           text,
  chuc_danh       text,
  vi_tri          text check (vi_tri in ('tong_giam_doc','giam_doc','truong_phong',
                                         'truong_nhom','nhan_vien','thu_viec','hoc_viec')),
  phong_ban_id    uuid references phong_ban(id)    on delete set null,
  ca_lam_id       uuid references ca_lam(id)       on delete set null,
  khoi_id         uuid references khoi(id)         on delete set null,
  noi_lam_viec_id uuid references noi_lam_viec(id) on delete set null,
  ngay_vao        date,
  so_dien_thoai   text,
  email           text,               -- email = UPN du kien cho MS365
  ma_erp          text,
  loai_hop_dong   text,               -- de checklist ky HĐ đúng loại
  tu_cap_pin      boolean not null default true,
  pin_may         text,               -- khi khong tu cap
  serial_may_cua  text,               -- may kiem soat ra vao se day user+PIN
  cap_ms365       boolean not null default true,
  tao_tk_he_thong boolean not null default true,
  trang_thai      text not null default 'cho_duyet'
                  check (trang_thai in ('cho_duyet','da_khoi_tao','da_tu_choi')),
  nhan_vien_id    uuid references nhan_vien(id) on delete set null,
  nguoi_de_nghi   uuid references nguoi_dung(id) on delete set null,
  admin_duyet_id  uuid references nguoi_dung(id) on delete set null,
  admin_duyet_luc timestamptz,
  ly_do_tu_choi   text,
  tao_luc         timestamptz not null default now()
);
create index if not exists de_nghi_them_ns_tt_idx
  on de_nghi_them_nhan_su(trang_thai, tao_luc);

-- ---------------------------------------------------------------- khoa chong trung lenh thiet bi
-- Khoa de khong day trung mot lenh co y nghia duy nhat, vd `nhap_viec_pin:<nhan_vien_id>`
-- (REQ-PIN-02: dung unique + on conflict do nothing thay cho "kiem truoc roi them").
alter table lenh_thiet_bi
  add column if not exists khoa_chong_trung text;
create unique index if not exists lenh_thiet_bi_khoa_idx
  on lenh_thiet_bi(khoa_chong_trung) where khoa_chong_trung is not null;
