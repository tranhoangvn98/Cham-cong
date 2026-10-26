-- LUONG NGHI VIEC DUY NHAT — nhanh theo loai hop dong, mot quy trinh mo moi nguoi.
--
-- 1. `nguon_tao`  : don nhan vien / quyet dinh cong ty / nghi khong ban giao.
-- 2. `nhom_quy_trinh`: thuc_tap | thu_viec | thoi_vu | chinh_thuc | cong_tac_vien | quan_ly.
--    Chup luc sinh de bao cao va de UI hien can cu phap ly.
-- 3. Mot nguoi CHI MOT quy trinh mo (partial unique index).
-- 4. Don cac muc '-' (khong ap dung) ma migration 090 da lo nap vao `khuon_checklist`:
--    thuc tap sinh khong co bao giam BHXH, khong tro cap thoi viec, khong quyet toan
--    14 ngay theo D.48. Dong thoi don khoi checklist cua quy trinh dang mo.

alter table quy_trinh_thoi_viec
  add column if not exists nguon_tao text not null default 'don_nhan_vien',
  add column if not exists nhom_quy_trinh text,
  -- Quyet dinh nghi viec da ban hanh (van ban AI) gan voi quy trinh: so/ngay/tep/thong bao.
  -- Co du lieu nay thi Cong 2 DUNG LAI quyet dinh do, khong sinh van ban thu hai.
  add column if not exists quyet_dinh_tep_id uuid references ho_so_tep(id) on delete set null,
  add column if not exists quyet_dinh_thong_bao_id uuid references thong_bao(id) on delete set null,
  add column if not exists quyet_dinh_so text,
  add column if not exists quyet_dinh_ngay date;

alter table quy_trinh_thoi_viec
  drop constraint if exists quy_trinh_nguon_tao_hop_le;
alter table quy_trinh_thoi_viec
  add constraint quy_trinh_nguon_tao_hop_le check (
    nguon_tao in ('don_nhan_vien','quyet_dinh','nghi_khong_ban_giao')
  );

alter table quy_trinh_thoi_viec
  drop constraint if exists quy_trinh_nhom_hop_le;
alter table quy_trinh_thoi_viec
  add constraint quy_trinh_nhom_hop_le check (
    nhom_quy_trinh is null
    or nhom_quy_trinh in ('thuc_tap','thu_viec','thoi_vu','chinh_thuc','cong_tac_vien','quan_ly')
  );

-- Backfill nhanh cho du lieu cu. Quan ly chi co hieu luc khi hop dong la HĐ xac dinh /
-- khong xac dinh thoi han (giong `nhanh.ts`).
update quy_trinh_thoi_viec
   set nhom_quy_trinh = case
         when la_quan_ly_dn
              and loai_hop_dong in ('xac_dinh','khong_xac_dinh')
           then 'quan_ly'
         when loai_hop_dong = 'hoc_viec'      then 'thuc_tap'
         when loai_hop_dong = 'thu_viec'      then 'thu_viec'
         when loai_hop_dong = 'thoi_vu'       then 'thoi_vu'
         when loai_hop_dong = 'cong_tac_vien' then 'cong_tac_vien'
         else 'chinh_thuc'
       end
 where nhom_quy_trinh is null;

-- Moi nguoi chi mot quy trinh mo. Neu CSDL cu da co nhieu hon mot, giu ban moi nhat va
-- huy cac ban con lai (co ghi chu) TRUOC khi tao index.
with xep as (
  select id, row_number() over (
           partition by nhan_vien_id order by tao_luc desc, id desc) as rn
    from quy_trinh_thoi_viec
   where trang_thai in ('dang_thuc_hien','san_sang_chot')
)
update quy_trinh_thoi_viec qt
   set trang_thai = 'da_huy', cap_nhat_luc = now()
  from xep
 where xep.id = qt.id and xep.rn > 1;

create unique index if not exists quy_trinh_thoi_viec_mot_quy_trinh_mo
  on quy_trinh_thoi_viec (nhan_vien_id)
  where trang_thai in ('dang_thuc_hien','san_sang_chot');

-- ------------------------------------------------------------------ khuon checklist
-- Cac muc KHONG ap dung theo ma tran cua 090 (truoc day van duoc nap voi bat_buoc=false,
-- khien Cong 2 van doi email BHXH va van sinh giay bao giam cho thuc tap sinh).
delete from khuon_checklist
 where (loai_hop_dong = 'thu_viec'
        and ma_muc in ('thanh_toan_phep','tinh_tro_cap'))
    or (loai_hop_dong = 'hoc_viec'
        and ma_muc in ('kiem_tra_bao_truoc','thanh_toan_phep','tinh_tro_cap',
                       'hen_quyet_toan_14n','doi_mk_dung_chung','chot_bhxh'))
    or (loai_hop_dong = 'cong_tac_vien'
        and ma_muc in ('kiem_tra_bao_truoc','thanh_toan_phep','tinh_tro_cap',
                       'chot_bhxh','tra_so_giay_to'));

-- Chinh sach moi: thu viec bao truoc 14 ngay (chi sua dong dang con gia tri seed 0).
update khuon_han_bao_truoc
   set so_ngay = 14, ghi_chu = 'Chính sách công ty: thử việc báo trước 14 ngày'
 where loai_hop_dong = 'thu_viec' and so_ngay = 0;
update khuon_han_bao_truoc
   set ghi_chu = 'BLLĐ 2019 Điều 35.1 — HĐ xác định thời hạn báo trước 30 ngày (kể cả dưới 12 tháng)'
 where loai_hop_dong = 'xac_dinh';

-- Quy trinh dang mo: bo cac muc khong con trong khuon cua loai hop dong cua no.
delete from muc_checklist m
 using quy_trinh_thoi_viec qt
 where m.quy_trinh_id = qt.id
   and qt.trang_thai in ('dang_thuc_hien','san_sang_chot')
   and not exists (
     select 1 from khuon_checklist k
      where k.loai_hop_dong = qt.loai_hop_dong and k.ma_muc = m.ma_muc
   );

-- Quy trinh thu viec dang mo: bao dam co lai 2 muc vua duoc giu trong khuon (neu mot ban
-- migration cu da xoa khoi checklist).
insert into muc_checklist
  (quy_trinh_id, ma_muc, nhom, loai_tu_dong, bat_buoc, tieu_de)
select qt.id, k.ma_muc, k.nhom, k.loai_tu_dong, k.bat_buoc, k.tieu_de
  from quy_trinh_thoi_viec qt
  join khuon_checklist k on k.loai_hop_dong = qt.loai_hop_dong
 where qt.trang_thai in ('dang_thuc_hien','san_sang_chot')
   and qt.loai_hop_dong = 'thu_viec'
   and k.ma_muc in ('kiem_tra_bao_truoc','hen_quyet_toan_14n')
on conflict (quy_trinh_id, ma_muc) do nothing;

-- Tieu de muc quyet dinh theo nhanh: thuc tap sinh khong "cham dut HDLD".
update khuon_checklist
   set tieu_de = 'Ban hành quyết định kết thúc học việc / thực tập'
 where loai_hop_dong = 'hoc_viec' and ma_muc = 'ra_qd_cham_dut';
update khuon_checklist
   set tieu_de = 'Ban hành quyết định kết thúc thời gian thử việc'
 where loai_hop_dong = 'thu_viec' and ma_muc = 'ra_qd_cham_dut';
update khuon_checklist
   set tieu_de = 'Ban hành quyết định chấm dứt hợp đồng dịch vụ'
 where loai_hop_dong = 'cong_tac_vien' and ma_muc = 'ra_qd_cham_dut';

-- Quy trinh dang mo: dong bo tieu de muc theo khuon moi (vd 'Ket thuc hoc viec / thuc tap'
-- thay cho 'Quyet dinh cham dut HDLD').
update muc_checklist m
   set tieu_de = k.tieu_de
  from khuon_checklist k, quy_trinh_thoi_viec qt
 where m.quy_trinh_id = qt.id
   and qt.trang_thai in ('dang_thuc_hien','san_sang_chot')
   and k.loai_hop_dong = qt.loai_hop_dong
   and k.ma_muc = m.ma_muc
   and m.tieu_de <> k.tieu_de;

-- ------------------------------------------------------------------ QĐ nghỉ việc
-- Muc BAT BUOC: phai ban hanh quyet dinh (van ban AI) truoc khi Cong 2 chot. Quy trinh
-- tao tu QĐ duoc he thong tich ngay; quy trinh tu don cho HR ban hanh QĐ (Flow 1).
insert into khuon_checklist
  (loai_hop_dong, ma_muc, nhom, loai_tu_dong, bat_buoc, tieu_de, thu_tu)
select v.loai, 'ban_hanh_qd', 'hr_phap_ly', 'tu_dong', true,
       'Ban hành quyết định nghỉ việc / kết thúc hợp đồng', 145
  from (values ('thu_viec'),('hoc_viec'),('thoi_vu'),('xac_dinh'),
               ('khong_xac_dinh'),('cong_tac_vien')) as v(loai)
on conflict (loai_hop_dong, ma_muc) do nothing;

-- Quy trinh dang mo: them muc ban hanh QĐ. Quy trinh CU da qua lastday thi bo qua muc nay
-- (khong truy thu thu tuc cua nguoi da nghi); quy trinh con han thi BAT BUOC.
insert into muc_checklist
  (quy_trinh_id, ma_muc, nhom, loai_tu_dong, bat_buoc, tieu_de, trang_thai, ghi_chu)
select qt.id, 'ban_hanh_qd', 'hr_phap_ly', 'tu_dong', true,
       'Ban hành quyết định nghỉ việc / kết thúc hợp đồng',
       case when qt.nguon_tao = 'don_nhan_vien'
                 and qt.ngay_lam_viec_cuoi is not null
                 and qt.ngay_lam_viec_cuoi < current_date
            then 'bo_qua' else 'chua' end,
       case when qt.nguon_tao = 'don_nhan_vien'
                 and qt.ngay_lam_viec_cuoi is not null
                 and qt.ngay_lam_viec_cuoi < current_date
            then 'Quy trình cũ — không truy thu quyết định' else null end
  from quy_trinh_thoi_viec qt
 where qt.trang_thai in ('dang_thuc_hien','san_sang_chot')
on conflict (quy_trinh_id, ma_muc) do nothing;
