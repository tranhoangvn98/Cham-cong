-- Gan quyet dinh nghi viec da ban hanh truoc ban 1.134.0 vao quy trinh.
-- Truoc ban nay, quyet dinh phat hanh chi tao quy trinh chu khong luu lien ket van ban, nen muc
-- `ban_hanh_qd` (bat buoc tu 1.134.0) hien dang "chua" du quyet dinh da co. Script tim thong bao
-- va tep quyet dinh cung ngay voi quy trinh roi gan lai; idempotent, chay lai khong doi gi.

with khop as (
  select qt.id as qt_id, tb.id as tb_id, tb.nguoi_tao, tb.tao_luc,
         t.id as tep_id,
         regexp_replace(substring(t.ten_goc from '([0-9]+/[0-9]{4}/[^ ]+)'), '\.docx$', '') as so
    from quy_trinh_thoi_viec qt
    join lateral (
      select tb.* from thong_bao tb
       where tb.nhan_vien_id = qt.nhan_vien_id
         and (tb.tao_luc at time zone 'Asia/Ho_Chi_Minh')::date
             between (qt.tao_luc at time zone 'Asia/Ho_Chi_Minh')::date - 1
                 and (qt.tao_luc at time zone 'Asia/Ho_Chi_Minh')::date
         and (tb.tieu_de ilike '%chấm dứt%' or tb.tieu_de ilike '%nghỉ việc%'
              or tb.tieu_de ilike '%kết thúc%')
       order by tb.tao_luc desc
       limit 1
    ) tb on true
    join ho_so_tep t on t.nhan_vien_id = qt.nhan_vien_id
     and t.nhom = 'tai_lieu' and t.ten_goc ilike 'Quyết định%'
     and t.tao_luc = tb.tao_luc
   where qt.nguon_tao = 'quyet_dinh' and qt.quyet_dinh_tep_id is null
)
update quy_trinh_thoi_viec qt
   set quyet_dinh_tep_id = k.tep_id,
       quyet_dinh_thong_bao_id = k.tb_id,
       quyet_dinh_so = k.so,
       quyet_dinh_ngay = (k.tao_luc at time zone 'Asia/Ho_Chi_Minh')::date,
       cap_nhat_luc = now()
  from khop k
 where qt.id = k.qt_id;

-- Muc ban hanh QD: da co van ban thi danh dau xong (khong bat HR lam lai lan hai).
update muc_checklist m
   set trang_thai = 'xong',
       xac_nhan_boi = tb.nguoi_tao,
       xac_nhan_luc = tb.tao_luc,
       ket_qua = jsonb_build_object('nguon', 'quyet_dinh_van_ban',
                                    'so', qt.quyet_dinh_so,
                                    'ngay', qt.quyet_dinh_ngay),
       ghi_chu = 'Quyết định ban hành trước bản 1.134.0 — liên kết hồi tố'
  from quy_trinh_thoi_viec qt
  join thong_bao tb on tb.id = qt.quyet_dinh_thong_bao_id
 where m.quy_trinh_id = qt.id
   and m.ma_muc = 'ban_hanh_qd'
   and qt.quyet_dinh_tep_id is not null
   and m.trang_thai <> 'xong';
