-- Chinh sach phu cap CUA TUNG NGUOI.
--
-- VAN DE ban 1.34.0 con de lai: `phieu_luong_khoan` cho phep ghi phu cap cua tung nguoi, nhung
-- moi ky nhan su phai go lai tu dau cho ca 53 nguoi. Phu cap khong phai thu doi hang thang —
-- "chi A duoc ho tro gui xe 200.000/thang" la mot THOA THUAN co hieu luc tu mot ngay, keo dai
-- den khi co quyet dinh khac. Bat go lai moi thang la vua mat thoi gian vua mat cau tra loi cho
-- cau hoi "tu bao gio nguoi nay duoc huong khoan do".
--
-- Nen chinh sach la mot bang rieng, co HIEU LUC TU / DEN, giong `quyet_dinh_luong` va
-- `ma_dinh_danh`: khong sua tai cho, khong xoa — dong cu lai va mo dong moi. Nho vay tinh lai
-- luong thang cu van ra dung so cu.
--
-- Ky luong lay chinh sach cua thang do va TU SINH cac dong khoan. Nhan su chi phai dong vao
-- nhung gi that su thay doi trong thang (thuong KPI, doanh so, tam ung).

create table if not exists chinh_sach_phu_cap (
  id             uuid primary key default gen_random_uuid(),
  nhan_vien_id   uuid not null references nhan_vien(id) on delete cascade,
  -- `restrict`: khoan da co nguoi huong thi khong xoa khoi danh muc duoc. Muon dung thi tat
  -- `dang_dung` — dong lich su o lai.
  khoan_ma       text not null references khoan_luong(ma) on delete restrict,

  -- So luong lay tu dau, cho cac khoan tinh theo cong thuc:
  --   co_dinh    — lay `so_luong` cua chinh dong nay (vd: 1 lan/thang)
  --   theo_cong  — bang SO NGAY CONG THUC TE cua ky (vd: ho tro an trua theo ngay di lam)
  nguon_so_luong text not null default 'co_dinh'
                 check (nguon_so_luong in ('co_dinh', 'theo_cong')),
  so_luong       numeric(10,2) check (so_luong is null or so_luong >= 0),

  -- Cho khoan `cach_tinh = 'nhap_tay'`: so tien co dinh moi thang.
  so_tien        numeric(14,2) check (so_tien is null or so_tien >= 0),

  -- Don gia RIENG cua nguoi nay, de trong thi lay don gia danh muc. Day la cho de mot nguoi
  -- huong muc khac ca cong ty ma khong phai tao mot khoan moi chi cho mot nguoi.
  don_gia        numeric(14,2) check (don_gia is null or don_gia >= 0),

  hieu_luc_tu    date not null,
  -- null = con hieu luc. Dong lai bang cach dien ngay, KHONG xoa dong.
  hieu_luc_den   date,

  ly_do          text,
  ghi_chu        text,
  tao_boi        uuid references nguoi_dung(id) on delete set null,
  tao_luc        timestamptz not null default now(),

  constraint chinh_sach_khoang_hop_le
    check (hieu_luc_den is null or hieu_luc_den >= hieu_luc_tu)
);

-- Mot nguoi chi co MOT chinh sach dang hieu luc cho moi khoan. Dong da dong lai thi trung bao
-- nhieu cung duoc — do la lich su.
--
-- La INDEX chu khong phai CONSTRAINT vi Postgres khong cho `where` tren unique constraint.
create unique index if not exists chinh_sach_phu_cap_dang_hieu_luc
  on chinh_sach_phu_cap(nhan_vien_id, khoan_ma)
  where hieu_luc_den is null;

create index if not exists chinh_sach_phu_cap_nhan_vien_idx
  on chinh_sach_phu_cap(nhan_vien_id, hieu_luc_tu desc);

comment on table chinh_sach_phu_cap is
  'Phu cap / khoan tru dinh ky cua tung nguoi, co hieu luc tu-den. Ky luong tu sinh dong khoan.';

-- ---------------------------------------------------------------- danh dau dong tu chinh sach
--
-- Mot dong khoan tren phieu den tu MOT trong hai nguon, va phai phan biet duoc:
--
--   tu_chinh_sach = true   may sinh ra tu chinh sach. Moi lan tinh lai la sinh lai theo chinh
--                          sach hien hanh — chinh sach doi thi phieu doi theo.
--   tu_chinh_sach = false  nguoi go tay cho rieng thang nay (thuong KPI, tam ung), HOAC nguoi
--                          co y GHI DE con so chinh sach dua ra.
--
-- Tinh lai KHONG dung toi dong go tay. Va mot khoan da co dong go tay thi chinh sach khong
-- sinh them dong nua — ghi de la ghi de, khong phai cong don.
alter table phieu_luong_khoan
  add column if not exists tu_chinh_sach boolean not null default false;
