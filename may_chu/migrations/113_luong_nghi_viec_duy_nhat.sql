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
  add column if not exists nhom_quy_trinh text;

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

-- Backfill nhanh cho du lieu cu. Quan ly chi co hieu luc khi hop dong la HDLD.
update quy_trinh_thoi_viec
   set nhom_quy_trinh = case
         when la_quan_ly_dn
              and loai_hop_dong in ('thu_viec','thoi_vu','xac_dinh','khong_xac_dinh')
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
        and ma_muc in ('kiem_tra_bao_truoc','thanh_toan_phep','tinh_tro_cap'))
    or (loai_hop_dong = 'hoc_viec'
        and ma_muc in ('kiem_tra_bao_truoc','thanh_toan_phep','tinh_tro_cap',
                       'hen_quyet_toan_14n','doi_mk_dung_chung','chot_bhxh'))
    or (loai_hop_dong = 'cong_tac_vien'
        and ma_muc in ('kiem_tra_bao_truoc','thanh_toan_phep','tinh_tro_cap',
                       'chot_bhxh','tra_so_giay_to'));

-- Quy trinh dang mo: bo cac muc khong con trong khuon cua loai hop dong cua no.
delete from muc_checklist m
 using quy_trinh_thoi_viec qt
 where m.quy_trinh_id = qt.id
   and qt.trang_thai in ('dang_thuc_hien','san_sang_chot')
   and not exists (
     select 1 from khuon_checklist k
      where k.loai_hop_dong = qt.loai_hop_dong and k.ma_muc = m.ma_muc
   );

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
