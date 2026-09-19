-- Quy trinh nghi viec tu dong: quyet dinh nghi viec tren he van ban AI.

-- Khi HR phat hanh mot "Quyet dinh nghi viec" (loai quyet_dinh, gui 1 ca nhan, co danh dau),
-- he thong tu gan tep vao ho so nhan vien. Den `ngay_nghi_viec`, lich chay dem tu dong:
--   1. khoa tai khoan dang nhap + thu hoi moi phien (he thong nay)
--   2. ghi su kien `nhan_su.nghi_viec` sang cong phan quyen (chan dang nhap + doi trang thai)
--   3. ghi su kien `ms365.nghi_viec` sang Microsoft Graph (chan dang nhap + rut giay phep)
-- Xem tai_lieu/NGHI-VIEC.md.

alter table thong_bao_nhap_ai
  add column if not exists la_qd_nghi_viec boolean not null default false,
  add column if not exists ngay_nghi_viec date,
  add column if not exists nghi_viec_da_chay_luc timestamptz,
  add column if not exists nghi_viec_dang_chay_luc timestamptz;

comment on column thong_bao_nhap_ai.la_qd_nghi_viec is
  'La quyet dinh nghi viec: khi phat hanh thi gan tep vao ho so nhan vien, va den
  ngay_nghi_viec thi lich chay dem tu khoa tai khoan va bao cong/Microsoft.';

comment on column thong_bao_nhap_ai.ngay_nghi_viec is
  'Ngay nghi viec ghi trong quyet dinh. Lich chay dem xu ly sau ngay nay.';

comment on column thong_bao_nhap_ai.nghi_viec_da_chay_luc is
  'Thoi diem lich chay dem da chay XONG buoc khoa tai khoan cho quyet dinh nay.';

comment on column thong_bao_nhap_ai.nghi_viec_dang_chay_luc is
  'Danh dau dang xu ly de nhieu instance khong chay trung; stale sau 5 phut thi
  duoc lay lai (may chet giua chung khong mat buoc khoa tai khoan).';

-- Quyet dinh nghi viec chi hop le khi: loai quyet dinh, gui dung 1 ca nhan, va CO ngay
-- nghi viec. Rang buoc de data vung khong phai chi code kiem — code co the bo sot, con
-- check thi khong.
alter table thong_bao_nhap_ai
  drop constraint if exists qd_nghi_viec_hop_le;
alter table thong_bao_nhap_ai
  add constraint qd_nghi_viec_hop_le check (
    la_qd_nghi_viec = false
    or (loai = 'quyet_dinh' and pham_vi = 'ca_nhan' and ngay_nghi_viec is not null)
  );

-- Lich chay dem quet nhanh: quyet dinh den han ma chua chay.
create index if not exists thong_bao_nhap_ai_nghi_viec_idx
  on thong_bao_nhap_ai (ngay_nghi_viec)
  where la_qd_nghi_viec and nghi_viec_da_chay_luc is null;
