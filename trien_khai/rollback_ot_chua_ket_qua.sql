-- Rollback cac don OT DA DUYET nhung CHUA co ket qua OT ve buoc duyet cap 2, de nguoi duyet
-- duyet lai kem tuy chon "Khong can ket qua OT" (ban 1.140.2).
-- Chi dong vao don thuoc ky luong CHUA CHOT (con 'nhap') hoac chua co ky luong.
-- Idempotent: chay lai khi khong con don nao thoa man thi update 0 dong.
begin;

create temporary table tam_ot_rollback on commit drop as
select d.id, d.nhan_vien_id, d.tu_ngay, d.gio_bat_dau, d.gio_ket_thuc,
       d.trang_thai as trang_thai_cu,
       d.nguoi_duyet_id, d.quyet_luc,
       d.nguoi_duyet_2_id, d.quyet_2_luc
  from don_tu d
 where d.loai = 'lam_them'
   and d.trang_thai = 'da_duyet'
   and not exists (select 1 from ket_qua_ot q where q.don_tu_id = d.id)
   and not exists (
     select 1 from ky_luong k
      where k.thang = to_char(d.tu_ngay, 'YYYY-MM')
        and k.trang_thai <> 'nhap'
   );

update don_tu d
   set trang_thai = 'cho_duyet_2',
       nguoi_duyet_2_id = null,
       quyet_2_luc = null
  from tam_ot_rollback t
 where d.id = t.id;

insert into nhat_ky_thao_tac(nguoi_dung_id, hanh_dong, thuc_the, thuc_the_id, chi_tiet, luc)
select null,
       'ot_rollback_chua_ket_qua',
       'don_tu',
       t.id::text,
       jsonb_build_object(
         'trang_thai_cu', t.trang_thai_cu,
         'nguoi_duyet_2_id_cu', t.nguoi_duyet_2_id,
         'quyet_2_luc_cu', t.quyet_2_luc,
         'ly_do', 'Rollback de duyet lai kem tuy chon Khong can ket qua OT (ban 1.140.2)',
         'boi', 'phien AI 09/11/2026'
       ),
       now()
  from tam_ot_rollback t;

select 'DA_ROLLBACK' as muc,
       count(*) as so_don,
       count(distinct nhan_vien_id) as so_nguoi,
       min(tu_ngay) as tu_ngay,
       max(tu_ngay) as den_ngay
  from tam_ot_rollback;

commit;
