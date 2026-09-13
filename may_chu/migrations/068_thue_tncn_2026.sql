-- THUE TNCN 2026: giam tru gia canh moi + bieu thue luy tien 5 bac.
--
-- Can cu:
--   - Nghi quyet 110/2025/UBTVQH15: giam tru gia canh KY TINH THUE 2026 — ban than 15.500.000,
--     moi nguoi phu thuoc 6.200.000 (cu: 11.000.000 / 4.400.000).
--   - Luat Thue TNCN 2025: bieu thue luy tien tung phan rut tu 7 bac xuong 5 BAC, ap dung tu ky
--     tinh thue 2026 (5% <=10tr, 10% 10-30tr, 20% 30-60tr, 30% 60-100tr, 35% >100tr).
--
-- He thong chon tham so theo `hieu_luc_tu <= dau ky` (moi nhat truoc). Tao BAN GHI MOI hieu luc
-- 2026-01-01 -> moi ky tu 2026-01 tro di dung muc moi; ky 2025 tro ve giu nguyen ban cu (khong
-- lam sai lich su). Copy TAT CA tham so khac tu ban moi nhat, chi doi giam tru + bieu thue.
--
-- LUU Y: ap cho ca ky tinh thue 2026 (tu thang 1). Neu doanh nghiep muon khau tru thang chi ap
-- tu 01/07/2026 (ngay luat co hieu luc chung) thi doi `hieu_luc_tu` thanh '2026-07-01'.
--
-- Idempotent: chi tao khi chua co ban ghi hieu luc 2026-01-01.

do $$
declare src tham_so_luong%rowtype;
begin
  if not exists (select 1 from tham_so_luong where hieu_luc_tu = date '2026-01-01') then
    select * into src from tham_so_luong order by hieu_luc_tu desc limit 1;
    if not found then
      raise notice 'Chua co tham_so_luong nao — bo qua migration thue 2026.';
      return;
    end if;
    src.id := gen_random_uuid();
    src.hieu_luc_tu := date '2026-01-01';
    src.ten := 'Thuế TNCN 2026 (NQ 110/2025 + Luật TNCN 2025 — biểu 5 bậc)';
    src.giam_tru_ban_than := 15500000;
    src.giam_tru_phu_thuoc := 6200000;
    src.can_cu := 'NQ 110/2025/UBTVQH15 (giảm trừ 15,5tr/6,2tr); Luật Thuế TNCN 2025 '
                  || '(biểu lũy tiến 5 bậc) — áp dụng kỳ tính thuế 2026';
    src.tao_luc := now();
    src.cap_nhat_luc := now();
    insert into tham_so_luong values (src.*);

    -- Bieu thue 5 bac (thu nhap tinh thue THANG). tu_muc khong bao gom, den_muc bao gom.
    insert into bac_thue_tncn (tham_so_id, bac, tu_muc, den_muc, thue_suat) values
      (src.id, 1,          0,  10000000,  5),
      (src.id, 2,   10000000,  30000000, 10),
      (src.id, 3,   30000000,  60000000, 20),
      (src.id, 4,   60000000, 100000000, 30),
      (src.id, 5,  100000000,      null, 35);
  end if;
end $$;
