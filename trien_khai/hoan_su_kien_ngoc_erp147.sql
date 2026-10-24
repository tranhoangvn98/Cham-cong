-- Tam hoan 3 su kien nghi viec cua ERP147 Hoang Minh Ngoc.
--
-- VI SAO: ho so ERP147 dang ghi nghi 18/09/2026 nhung HR bao chi ay DANG LAM o Kho (xem
-- tai_lieu/NGHI-VIEC.md va ghi chu repo — vu Quynh Anh la tien le cho-nghi-nham). Sau khi
-- va bo nhat viec cua hop_thu_di (24/10/2026), su kien ms365.nghi_viec id 82218 se duoc day
-- di that va RUT GIAY PHEP ngoc.hr@ — khoa nham mot nguoi dang di lam.
--
-- Cach lam theo dung tien le da dung cho vu Quynh Anh (08/10/2026): danh dau gui_luc + ghi ly
-- do vao loi_cuoi, KHONG xoa dong — giu dau vet. Neu HR xac nhan chi Ngoc nghi that thi mo
-- ho so bam "Nghi viec khong ban giao" de sinh su kien MOI, khong dung lai 3 dong nay.
--
-- Chay: docker compose exec -T postgres psql -U chamcong -d chamcong -v ON_ERROR_STOP=1 -f -

\set ON_ERROR_STOP on

begin;

update hop_thu_di
   set gui_luc = now(),
       loi_cuoi = 'Tam hoan 24/10/2026: ho so ERP147 Hoang Minh Ngoc ghi nghi 18/09 nhung HR bao dang lam o Kho — chua chot, khong khoa tai khoan/M365 cua nguoi dang di lam.'
 where id in (82216, 82217, 82218)
   and gui_luc is null
   and loai_su_kien in ('nhan_su.nghi_viec', 'erp1.nhan_su.nghi_viec', 'ms365.nghi_viec')
   and du_lieu->>'ma_nv' = 'ERP147';

insert into nhat_ky_thao_tac (nguoi_dung_id, hanh_dong, thuc_the, thuc_the_id, chi_tiet, dia_chi_ip)
select null, 'tam_hoan_su_kien_nghi_viec', 'hop_thu_di', null,
       jsonb_build_object(
         'nhan_vien_id', nv.id,
         'ma_nv', nv.ma_nv,
         'su_kien_ids', jsonb_build_array(82216, 82217, 82218),
         'ly_do', 'Ho so ghi nghi 18/09 nhung HR bao dang lam o Kho — cho HR chot'),
       null
  from nhan_vien nv
 where nv.ma_nv = 'ERP147';

commit;

select id, loai_su_kien, gui_luc is not null as da_danh_dau, left(coalesce(loi_cuoi, ''), 60) as loi_cuoi
  from hop_thu_di where id in (82216, 82217, 82218);
