-- Dong bo nguoi dung tu he thong ERP cu (Tran Hoang Viet Nam) sang day.
--
-- Can cu: "Huong dan tich hop & dong bo du lieu qua API — Tran Hoang Viet Nam",
-- endpoint GET /api/v1/external/users.
--
-- KHOA NOI BA HE THONG LA EMAIL:
--   ERP  .email  ==  nhan_vien.email  ==  UPN cua Microsoft 365
-- Dang nhap Microsoft o day khop nguoi theo `lower(nhan_vien.email)` (xem dang_nhap.ts),
-- nen dong bo dung email la M365 tu nhan ra nguoi ngay, khong phai khai thu ba.
--
-- Vi vay ban ghi ERP KHONG CO EMAIL thi bo qua: no khong noi duoc voi M365, va gan nhu
-- chac chan la tai khoan he thong chu khong phai nguoi that.

alter table nhan_vien
  -- Khoa chinh ben ERP (userId, kieu int). Giu rieng khoi `ma_erp` vi ma_erp la ma dung
  -- cho webhook/doi soat nghiep vu, con day la dinh danh ky thuat cua ban ghi nguoi dung.
  add column if not exists erp_user_id   int,
  add column if not exists erp_username  text,
  add column if not exists erp_dong_bo_luc timestamptz;

create unique index if not exists nhan_vien_erp_user_id_idx
  on nhan_vien(erp_user_id) where erp_user_id is not null;

comment on column nhan_vien.erp_user_id is
  'userId ben ERP. Chi de doi chieu — khoa noi voi Microsoft 365 la email.';

-- ---------------------------------------------------------------- nhat ky moi luot dong bo
-- Tai lieu tich hop muc 4.5 doi "luu nhat ky moi luot (thoi diem, so ban ghi, loi)".
-- Con mot ly do quan trong hon: dong bo co the TAO va SUA nhan vien hang loat. Khi ai do
-- hoi "vi sao ho ten nguoi nay doi", cai tra loi duoc la nhat ky.
create table if not exists dong_bo_erp (
  id              bigserial primary key,
  -- 'nhan_vien' — sau nay them 'khach_hang', 'don_hang'... thi dung chung bang nay.
  thuc_the        text not null,
  -- 'thu' = chay thu, khong ghi gi. 'that' = co ghi.
  che_do          text not null default 'that' check (che_do in ('thu','that')),

  so_doc          int not null default 0,
  so_tao_moi      int not null default 0,
  so_cap_nhat     int not null default 0,
  so_bo_qua       int not null default 0,
  so_loi          int not null default 0,

  -- Chi tiet tung ban ghi de doi chieu. Cat bot khi qua dai — xem `ghi_chu`.
  chi_tiet        jsonb,
  thong_diep      text,
  thanh_cong      boolean not null default true,

  bat_dau_luc     timestamptz not null default now(),
  ket_thuc_luc    timestamptz,
  mili_giay       int,
  nguoi_chay      uuid references nguoi_dung(id) on delete set null
);
create index if not exists dong_bo_erp_luc_idx on dong_bo_erp(bat_dau_luc desc);
