-- Dang nhap bang tai khoan Microsoft (Entra ID) theo chuan OpenID Connect.

-- Dinh danh Microsoft gan voi tai khoan. Doi chieu bang EMAIL chu khong bang ten dang
-- nhap: ten dang nhap trong he thong nay do nhan su dat, khong trung voi email cong ty.
alter table nguoi_dung
  add column if not exists email_microsoft text;

create unique index if not exists nguoi_dung_email_microsoft_idx
  on nguoi_dung (lower(email_microsoft))
  where email_microsoft is not null;

comment on column nguoi_dung.email_microsoft is
  'Email/UPN ben Microsoft Entra ID. Trong = tai khoan nay chi dang nhap bang mat khau.';

-- ---------------------------------------------------------------- phien OIDC
-- Luu state + nonce + PKCE giua luc chuyen huong di va luc Microsoft goi ve.
--
-- Vi sao khong dung cookie: may chu khong co phien, va webapp co the nam khac origin voi
-- API. Bang nay song rat ngan (10 phut) va xoa ngay sau khi dung MOT lan.
create table if not exists phien_oidc (
  state          text primary key,
  nonce          text not null,
  -- PKCE: chong danh cap ma uy quyen (code) tren duong chuyen huong.
  ma_xac_minh    text not null,
  -- Duong dan trong webapp de quay lai sau khi dang nhap xong.
  quay_lai       text,
  tao_luc        timestamptz not null default now(),
  het_han        timestamptz not null
);

create index if not exists phien_oidc_het_han_idx on phien_oidc (het_han);
