-- 114: bo sung phan con thieu cua 113 tren may that.
-- Tep 113 da chay o VPS truoc khi duoc bo sung (lien ket quyet dinh, muc ban_hanh_qd,
-- nguong bao truoc thu viec 14 ngay, tra lai 2 muc cua thu viec). Ledger di_tru khong
-- chay lai tep da chay, nen phan delta phai nam o tep moi. Tat ca deu idempotent.

-- ------------------------------------------------------------------ lien ket quyet dinh
alter table quy_trinh_thoi_viec
  add column if not exists quyet_dinh_tep_id uuid references ho_so_tep(id) on delete set null,
  add column if not exists quyet_dinh_thong_bao_id uuid references thong_bao(id) on delete set null,
  add column if not exists quyet_dinh_so text,
  add column if not exists quyet_dinh_ngay date;

-- ------------------------------------------------------------------ nhanh quan ly
-- Ban 113 dau tien tinh ca thu_viec/thoi_vu vao nhanh quan ly; dong da luu vi vay co the sai.
update quy_trinh_thoi_viec
   set nhom_quy_trinh = case
         when la_quan_ly_dn
              and loai_hop_dong in ('xac_dinh','khong_xac_dinh')
           then 'quan_ly'
         when loai_hop_dong = 'hoc_viec'      then 'thuc_tap'
         when loai_hop_dong = 'thu_viec'      then 'thu_viec'
         when loai_hop_dong = 'thoi_vu'       then 'thoi_vu'
         when loai_hop_dong in ('xac_dinh','khong_xac_dinh') then 'chinh_thuc'
         when loai_hop_dong = 'cong_tac_vien' then 'cong_tac_vien'
         else nhom_quy_trinh
       end
 where nhom_quy_trinh is distinct from case
         when la_quan_ly_dn
              and loai_hop_dong in ('xac_dinh','khong_xac_dinh')
           then 'quan_ly'
         when loai_hop_dong = 'hoc_viec'      then 'thuc_tap'
         when loai_hop_dong = 'thu_viec'      then 'thu_viec'
         when loai_hop_dong = 'thoi_vu'       then 'thoi_vu'
         when loai_hop_dong in ('xac_dinh','khong_xac_dinh') then 'chinh_thuc'
         when loai_hop_dong = 'cong_tac_vien' then 'cong_tac_vien'
         else nhom_quy_trinh
       end;

-- ------------------------------------------------------------------ nguong bao truoc
update khuon_han_bao_truoc
   set so_ngay = 14, ghi_chu = 'Chính sách công ty: thử việc báo trước 14 ngày'
 where loai_hop_dong = 'thu_viec' and so_ngay = 0;
update khuon_han_bao_truoc
   set ghi_chu = 'BLLĐ 2019 Điều 35.1 — HĐ xác định thời hạn báo trước 30 ngày (kể cả dưới 12 tháng)'
 where loai_hop_dong = 'xac_dinh';

-- ------------------------------------------------------------------ khuon checklist thu viec
-- Ban 113 dau tien da xoa 2 muc nay khoi khuon thu viec; tra lai theo dong cua HĐ xác định
-- (cung nhom/loai/tieu de/thu tu) de giao dien va tien trinh tu dong doc dung.
insert into khuon_checklist
  (loai_hop_dong, ma_muc, nhom, loai_tu_dong, bat_buoc, tieu_de, thu_tu)
select 'thu_viec', k.ma_muc, k.nhom, k.loai_tu_dong, k.bat_buoc, k.tieu_de, k.thu_tu
  from khuon_checklist k
 where k.loai_hop_dong = 'xac_dinh'
   and k.ma_muc in ('kiem_tra_bao_truoc','hen_quyet_toan_14n')
on conflict (loai_hop_dong, ma_muc) do nothing;

-- ------------------------------------------------------------------ muc ban hanh quyet dinh
insert into khuon_checklist
  (loai_hop_dong, ma_muc, nhom, loai_tu_dong, bat_buoc, tieu_de, thu_tu)
select v.loai, 'ban_hanh_qd', 'hr_phap_ly', 'tu_dong', true,
       'Ban hành quyết định nghỉ việc / kết thúc hợp đồng', 145
  from (values ('thu_viec'),('hoc_viec'),('thoi_vu'),('xac_dinh'),
               ('khong_xac_dinh'),('cong_tac_vien')) as v(loai)
on conflict (loai_hop_dong, ma_muc) do nothing;

-- ------------------------------------------------------------------ quy trinh dang mo
-- Thu viec dang mo: tra lai 2 muc vua duoc tra vao khuon.
insert into muc_checklist
  (quy_trinh_id, ma_muc, nhom, loai_tu_dong, bat_buoc, tieu_de)
select qt.id, k.ma_muc, k.nhom, k.loai_tu_dong, k.bat_buoc, k.tieu_de
  from quy_trinh_thoi_viec qt
  join khuon_checklist k on k.loai_hop_dong = qt.loai_hop_dong
 where qt.trang_thai in ('dang_thuc_hien','san_sang_chot')
   and qt.loai_hop_dong = 'thu_viec'
   and k.ma_muc in ('kiem_tra_bao_truoc','hen_quyet_toan_14n')
on conflict (quy_trinh_id, ma_muc) do nothing;

-- Moi quy trinh dang mo: them muc ban hanh QĐ. Quy trinh CU da qua lastday thi bo qua muc
-- nay (khong truy thu thu tuc cua nguoi da nghi); quy trinh con han thi BAT BUOC.
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
