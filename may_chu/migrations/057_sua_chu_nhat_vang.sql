-- Sua loi: NGAY CHU NHAT bi tinh 'vang' (chu yeu tu bang cong SG nhap tay — vd 02/08/2026).
--
-- Chu nhat la ngay NGHI TUAN voi nguoi khong lam CN, khong duoc tinh 'vang' (vang lam phong
-- so_ngay_vang -> ky luat oan, va nhan vien thay bi bao vang oan). Cong = 0 o ca hai trang
-- thai nen KHONG doi tien; day la sua NHAN cho dung + go vang oan.
--
-- Chi sua ngay Chu nhat (dow=0) dang 'vang' cua nguoi co ca KHONG lam Chu nhat (hoac chua gan
-- ca -> mac dinh T2-T6). Nguoi that su lam Chu nhat (ca_lam.cac_ngay_lam chua 0) thi GIU nguyen.
-- Idempotent: chi lat 'vang' -> 'nghi_tuan'.

update bang_cong_ngay bc
   set trang_thai = 'nghi_tuan', so_cong = 0, tinh_luc = now()
  from nhan_vien nv
  left join ca_lam cl on cl.id = nv.ca_lam_id
 where bc.nhan_vien_id = nv.id
   and extract(dow from bc.ngay) = 0
   and bc.trang_thai = 'vang'
   and not (0 = any(coalesce(cl.cac_ngay_lam, '{1,2,3,4,5}')::int[]));
