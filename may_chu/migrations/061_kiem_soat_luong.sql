-- YC 01/2026: kiem soat & chuan hoa muc luong.
--
-- YC-1: moi quyet dinh luong phai co CHUNG TU DUYET + NGUOI DUYET (chan cung o tang API).
--   - nguoi_duyet_id : nguoi phe duyet muc luong.
--   - chung_tu_mo_ta : so/ten quyet dinh - bien ban lam can cu (bat buoc, chuoi khong rong).
--   - chung_tu_tep_id: tep dinh kem trong kho ho so (tuy chon).
-- YC-4: co LUONG NET tren nhan vien -> khong tru BHXH cua NLD vao thuc nhan (cong ty chiu).
--
-- Chi them cot, khong doi du lieu cu. Idempotent.

alter table quyet_dinh_luong add column if not exists nguoi_duyet_id   uuid references nguoi_dung(id) on delete set null;
alter table quyet_dinh_luong add column if not exists chung_tu_mo_ta   text;
alter table quyet_dinh_luong add column if not exists chung_tu_tep_id  uuid;

comment on column quyet_dinh_luong.chung_tu_mo_ta is
  'So/ten quyet dinh - bien ban lam can cu duyet muc luong (YC-1). Bat buoc khi tao/sua qua API.';

alter table nhan_vien add column if not exists luong_net boolean not null default false;
comment on column nhan_vien.luong_net is
  'Luong NET: cong ty chiu 100%% BHXH, khong tru phan NLD vao thuc nhan (YC-4).';
