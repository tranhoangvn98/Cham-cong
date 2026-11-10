-- Rollback cac don OT vua duyet HOM NAY (10/11) ma KHONG co ket qua OT -> de duyet lai kem
-- tich "Khong can ket qua OT". Chi dong don da duyet cap 2 trong ngay, chua co ket qua OT.
begin;

create temporary table tam_ot_rollback on commit drop as
select d.id, d.nhan_vien_id, d.tu_ngay, d.trang_thai as trang_thai_cu,
       d.nguoi_duyet_2_id, d.quyet_2_luc
  from don_tu d
 where d.loai = 'lam_them'
   and d.trang_thai = 'da_duyet'
   and d.quyet_2_luc >= timestamptz '2026-11-10 00:00+07'
   and not exists (select 1 from ket_qua_ot q where q.don_tu_id = d.id);

update don_tu d
   set trang_thai = 'cho_duyet_2', nguoi_duyet_2_id = null, quyet_2_luc = null
  from tam_ot_rollback t
 where d.id = t.id;

insert into nhat_ky_thao_tac(nguoi_dung_id, hanh_dong, thuc_the, thuc_the_id, chi_tiet, luc)
select null, 'ot_rollback_chua_ket_qua', 'don_tu', t.id::text,
       jsonb_build_object(
         'trang_thai_cu', t.trang_thai_cu,
         'nguoi_duyet_2_id_cu', t.nguoi_duyet_2_id,
         'quyet_2_luc_cu', t.quyet_2_luc,
         'ly_do', 'Duyet lai kem tich Khong can ket qua OT (duyet luc 11:06-11:14 chua tich)',
         'boi', 'phien AI 10/11/2026'
       ),
       now()
  from tam_ot_rollback t;

select 'DA_ROLLBACK' as muc, count(*) as so_don from tam_ot_rollback;

select 'CHO_CAP_2' as muc, count(*) as so_don
  from don_tu where loai = 'lam_them' and trang_thai = 'cho_duyet_2';

commit;
