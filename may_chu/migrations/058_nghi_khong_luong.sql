-- Loi 6 (Bao cao so 02): NGHI KHONG LUONG bi gan nham nhan 'nghi_phep'.
--
-- enum bang_cong_ngay.trang_thai truoc day khong co gia tri rieng cho nghi khong luong, nen
-- may tinh cong dat ngay nghi khong luong thanh 'nghi_phep' (chi khac o so_cong = 0). Hau qua:
-- ke toan va nhan vien nhin bang cong / bang tong hop KHONG phan biet duoc phep CO luong voi
-- phep KHONG luong -> hieu nham minh bi/khong bi tru cong (vd co Diep, va script xac minh loc
-- theo trang_thai <> 'nghi_phep' khong bat duoc ngay khong luong).
--
-- Sua: them gia tri 'nghi_khong_luong' vao rang buoc, roi doi nhan cho cac ngay DA co trong
-- lich su. KHONG doi tien: so_cong cua nghi khong luong von da = 0, day chi la sua NHAN.
-- Idempotent: chay lai an toan.

-- 1) Mo rong rang buoc trang_thai (giu nguyen moi gia tri cu + them nghi_khong_luong).
alter table bang_cong_ngay drop constraint if exists bang_cong_ngay_trang_thai_check;
alter table bang_cong_ngay add constraint bang_cong_ngay_trang_thai_check
  check (trang_thai in
    ('vang','co_mat','nghi_phep','nghi_khong_luong','ngay_le','nghi_tuan','cong_tac'));

-- 2) Doi nhan lich su: ngay dang 'nghi_phep' nhung thuc chat co don NGHI KHONG LUONG da duyet
--    trum ca ngay (khong phai nua ngay) -> 'nghi_khong_luong'. so_cong giu nguyen (da = 0).
update bang_cong_ngay bc
   set trang_thai = 'nghi_khong_luong', tinh_luc = now()
  from don_nghi_phep d
 where d.nhan_vien_id = bc.nhan_vien_id
   and d.loai = 'khong_luong'
   and d.trang_thai = 'da_duyet'
   and d.nua_ngay = false
   and bc.ngay >= d.tu_ngay
   and bc.ngay <= d.den_ngay
   and bc.trang_thai = 'nghi_phep';
