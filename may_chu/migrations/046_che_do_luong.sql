-- Module: CHẾ ĐỘ LƯƠNG (tách khối lương Trung Quốc khỏi bảng lương VND).
--
-- Nhân sự Kho Trung Quốc nhận lương bằng CNY, không áp BHXH/thuế TNCN Việt Nam. Bảng lương
-- hiện tại chỉ tính VND (làm tròn về đồng, biểu thuế/bảo hiểm theo luật VN), nên tính chung
-- một bảng là SAI TIỀN với nhóm này.
--
-- Giải pháp: mỗi nhân viên có `che_do_luong`:
--   'vn' (mặc định) — vào bảng lương VND như cũ.
--   'tq'            — LOẠI khỏi kỳ lương VND; tính ở khối lương Trung Quốc riêng (CNY).
--
-- Đặt trên nhan_vien (không phải noi_lam_viec) vì chế độ lương gắn với từng người: một người
-- Kho TQ vẫn có thể ăn lương VND, và ngược lại.
alter table nhan_vien
  add column if not exists che_do_luong text not null default 'vn'
    constraint nhan_vien_che_do_luong_ck check (che_do_luong in ('vn', 'tq'));

comment on column nhan_vien.che_do_luong is
  'vn = bảng lương VND (mặc định); tq = khối lương Trung Quốc (CNY), loại khỏi kỳ lương VND.';
