-- Ba he thong chay song song, moi ben goi mot nguoi bang mot ma khac nhau:
--   * he thong cham cong: `nhan_vien.ma_nv` (noi bo)
--   * ERP cu            : `nhan_vien.ma_erp` (ma nhan vien) + `erp_user_id` / `erp_username`
--   * ERP1 (moi)        : bang ma dinh danh, he_thong = 'erp1'
--   * Microsoft 365     : UPN (`ma_dinh_danh` he_thong = 'microsoft_email')
--   * may cham cong     : PIN (`ma_dinh_danh` he_thong = 'may_cham_cong')
--
-- EP BA MA GIONG NHAU LA KHONG KHA THI: 59/68 ho so dang mang `ma_nv` dung bang ma ERP cu
-- (dang `ERP<id>`), nen mot khi ERP1 cap ma khac thi khong con cho nao phan biet "ma noi bo"
-- voi "ma ERP cu". Script nay tach ban sao ma ERP cu ra cot rieng + so ma dinh danh, de tang
-- sau `ma_nv` co the doi ma khong keo theo du lieu ERP.
--
-- Chay tren VPS:
--   docker compose exec -T postgres psql -U chamcong -d chamcong -v ON_ERROR_STOP=1 -f -

\set ON_ERROR_STOP on

begin;

-- 1) Ho so nao dang mang ma ERP cu trong `ma_nv` thi chep sang cot `ma_erp`.
update nhan_vien
   set ma_erp = ma_nv, cap_nhat_luc = now()
 where ma_erp is null
   and ma_nv ~ '^ERP[0-9]+$';

-- 2) Ghi vao so ma dinh danh (mot cho tra loi "ma nay dang la cua ai").
insert into ma_dinh_danh (nhan_vien_id, he_thong, ma, ma_chuan, nguon, ghi_chu)
select nv.id, 'erp_cu_ma', nv.ma_erp, upper(btrim(nv.ma_erp)), 'di_tru',
       'Backfill 25/10/2026: ma_nv dang mang ma ERP cu'
  from nhan_vien nv
 where nv.ma_erp is not null
   and btrim(nv.ma_erp) <> ''
on conflict do nothing;

insert into nhat_ky_thao_tac (nguoi_dung_id, hanh_dong, thuc_the, thuc_the_id, chi_tiet, dia_chi_ip)
select null, 'backfill_ma_erp', 'nhan_vien', null,
       jsonb_build_object(
         'so_ho_so', count(*),
         'nguon', 'ma_nv dang ERP<id>',
         'ly_do', 'Tach ma ERP cu khoi ma noi bo: ba he thong song song dung ba ma rieng'),
       null
  from nhan_vien where ma_erp is not null;

commit;

-- Kiem chung: moi he thong mot ma, khong ep trung nhau.
select nv.ma_nv            as ma_noi_bo,
       nv.ma_erp           as ma_erp_cu,
       (select m.ma from ma_dinh_danh m
         where m.nhan_vien_id = nv.id and m.he_thong = 'erp1'
           and m.hieu_luc_den is null limit 1)             as ma_erp1,
       nv.erp_username     as tai_khoan_erp_cu,
       nv.email            as email_m365,
       nv.pin_may          as pin_may
  from nhan_vien nv
 where nv.dang_hoat_dong = true
 order by nv.ma_nv
 limit 12;
