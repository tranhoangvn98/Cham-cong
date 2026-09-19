-- LUONG DONG BAO HIEM tach khoi luong thuc te.
--
-- Yeu cau ban giam doc: "Luong dong BHXH khac voi luong thuc te". O nhieu doanh nghiep, muc
-- luong ghi trong so BHXH (can cu dong BHXH/BHYT/BHTN) duoc khai THAP hon luong that de giam
-- chi phi bao hiem. Truoc di tru nay he thong dong bao hiem tren luong_co_ban + phu_cap, tuc la
-- BUOC luong dong bao hiem PHAI bang luong that — khong dung voi thuc te.
--
-- Nen tach ra mot muc rieng:
--   - `quyet_dinh_luong.luong_dong_bh`  : muc luong KHAI dong bao hiem (NULL = dung luong that
--                                         luong_co_ban + phu_cap nhu cu, giu nguyen hanh vi).
--   - `phieu_luong.luong_dong_bh`       : chup lai muc da dung khi tinh ky do (khong join lai).
--
-- Cong thuc BH van giu nguyen (8/1.5/1 NLD, 17.5/3/1 NSDLD, tran = 20 x luong co so / toi thieu
-- vung) — chi DOI CAN CU tinh tu "luong that" sang "luong dong BH" khi co khai.

alter table quyet_dinh_luong
  add column if not exists luong_dong_bh numeric(14,2)
    check (luong_dong_bh is null or luong_dong_bh >= 0);

comment on column quyet_dinh_luong.luong_dong_bh is
  'Muc luong khai dong BHXH/BHYT/BHTN. NULL = dong theo luong that (luong_co_ban + phu_cap).';

alter table phieu_luong
  add column if not exists luong_dong_bh numeric(14,2) not null default 0;

comment on column phieu_luong.luong_dong_bh is
  'Can cu dong bao hiem da dung khi tinh phieu (truoc khi ap tran). Chup lai de doi chieu.';
