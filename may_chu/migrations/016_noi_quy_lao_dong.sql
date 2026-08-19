-- Nap danh muc vi pham tu NOI QUY LAO DONG so 01/2026/NQLD-TPVN (ban 16/07/2026),
-- Phu luc "Danh muc hanh vi vi pham va hinh thuc xu ly ky luat" — 64 hanh vi, 12 nhom.
--
-- BA DIEU NOI QUY NAY LAM DUNG, VA LUOC DO PHAI PHAN ANH DUNG:
--
-- 1. CHE TAI TAI CHINH KHONG PHAI PHAT TIEN. Noi quy Dieu 14 dung "giam thuong P3" —
--    thuong theo ket qua cong viec, la DIEU KIEN HUONG THUONG theo Dieu 104 BLLD, khong
--    phai phat tien va khong phai hinh thuc ky luat. Vi vay cot moi ten la
--    `giam_thuong_p3_phan_tram`, KHONG phai "so tien phat". He thong van khong tu tru bat
--    cu dong nao vao luong — viec giam thuong do Quy che thuong quyet dinh.
--
-- 2. BON MUC DO, khong phai ba. Noi quy phan Nhe / Trung binh / Nang / Rat nang, gan voi
--    thang giam thuong 5% / 15% / 30% / toi 100% (Dieu 14).
--
-- 3. COT `chi_tiet_che_tai` GIU NGUYEN VAN cot "Hinh thuc xu ly" cua Phu luc. Cac khoan
--    trong do co dieu kien va bac tang dan ma khong ma hoa may moc duoc (vd "di muon qua
--    10 phut", "tai pham nhieu lan trong thang"). Ep chung thanh mot con so la lam sai
--    van ban da ban hanh; nguoi xu ly phai doc dung cau chu cua noi quy.

alter table loai_vi_pham
  drop constraint if exists loai_vi_pham_muc_do_check;
alter table loai_vi_pham
  add constraint loai_vi_pham_muc_do_check
  check (muc_do in ('nhe','trung','nang','rat_nang'));

-- Nhom cu (gio_giac/noi_quy/...) khong du cho 12 nhom A-L cua Phu luc.
alter table loai_vi_pham
  drop constraint if exists loai_vi_pham_nhom_check;

alter table loai_vi_pham
  -- Ma nhom trong Phu luc: A..L.
  add column if not exists nhom_phu_luc  text,
  -- Muc giam thuong P3 theo thang chuan Dieu 14. KHONG phai tien phat, khong tru vao luong.
  add column if not exists giam_thuong_p3_phan_tram numeric(5,2) not null default 0
      check (giam_thuong_p3_phan_tram >= 0 and giam_thuong_p3_phan_tram <= 100),
  -- Nguyen van cot "Hinh thuc xu ly" cua Phu luc.
  add column if not exists chi_tiet_che_tai text,
  -- Dieu khoan noi quy lam can cu.
  add column if not exists can_cu text;

comment on column loai_vi_pham.giam_thuong_p3_phan_tram is
  'Muc giam thuong P3 (Dieu 104 BLLD) theo Dieu 14 Noi quy. KHONG phai phat tien.';

insert into loai_vi_pham
  (ma, ten, chi_tiet_che_tai, nhom_phu_luc, nhom, muc_do, ky_luat_de_xuat,
   giam_thuong_p3_phan_tram, can_cu, diem_tru_kpi, dang_bat)
select v.ma, v.ten, v.chi_tiet, v.nhom_pl, v.ten_nhom, v.muc_do, v.ky_luat,
       v.p3, v.can_cu,
       -- Diem tru KPI suy tu muc do: dung cho cham diem noi bo, doc lap voi che tai P3.
       case v.muc_do when 'nhe' then 5 when 'trung' then 15
                     when 'nang' then 30 else 50 end,
       true
  from (values
  ('NQ-A01','Đi muộn, về sớm, tự ý rời vị trí khi không được đồng ý','(1) Không hưởng lương thời gian thực tế không làm việc (2) đi muộn quá 10 phút: giảm 50.000đ vào thưởng P3 mỗi lần (3) đi muộn quá 30 phút: giảm thưởng P3 một khoản bằng 1/2 tiền lương ngày (tối đa bằng thưởng P3 hiện có của tháng) (4) tái phạm nhiều lần trong tháng: khiển trách → kéo dài nâng lương 06 tháng → sa thải (Đ.125.3)','A','Chuyên Cần, Trật Tự Nội Vụ','nhe','khien_trach',5,'Đ.6, 14'),
  ('NQ-A02','Nghỉ không xin phép; nghỉ phép không thông báo trước','(1) Không hưởng lương ngày nghỉ (2) giảm 5% thưởng P3 mỗi lần (3) khiển trách, tái phạm: kéo dài nâng lương 06 tháng (4) đủ 05 ngày cộng dồn/30 ngày hoặc 20 ngày/365 ngày không lý do chính đáng: sa thải (Đ.125.4)','A','Chuyên Cần, Trật Tự Nội Vụ','nhe','khien_trach',5,'Đ.5.4, 14, 125.4'),
  ('NQ-A03','Gian lận chấm công (chấm hộ, khai khống giờ)','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3) (5) có tổ chức hoặc gây thiệt hại: xử lý theo Điều 15','A','Chuyên Cần, Trật Tự Nội Vụ','trung','khien_trach',15,'Đ.14–15'),
  ('NQ-A04','Không chấm công giờ đến hoặc giờ về không có lý do chính đáng','(1) giảm 5% thưởng P3 mỗi lần vi phạm (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3) (5) buổi/ngày không có dữ liệu chấm công và không giải trình được thì không hưởng lương thời gian đó (Điều 6.6)','A','Chuyên Cần, Trật Tự Nội Vụ','nhe','khien_trach',5,'Đ.6, 14'),
  ('NQ-A05','Trang phục không phù hợp môi trường công sở','(1) giảm 5% thưởng P3 mỗi lần vi phạm (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3)','A','Chuyên Cần, Trật Tự Nội Vụ','nhe','khien_trach',5,'Đ.14'),
  ('NQ-A06','Làm việc riêng trong giờ; gây mất trật tự; tự ý sang bộ phận khác','(1) giảm 5% thưởng P3 mỗi lần vi phạm (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3)','A','Chuyên Cần, Trật Tự Nội Vụ','nhe','khien_trach',5,'Đ.14'),
  ('NQ-A07','Xả rác, mất vệ sinh, lãng phí tài sản chung','(1) giảm 5% thưởng P3 mỗi lần vi phạm (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3)','A','Chuyên Cần, Trật Tự Nội Vụ','nhe','khien_trach',5,'Đ.14'),
  ('NQ-A08','Sử dụng rượu, bia trong giờ làm việc/giờ nghỉ trưa','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3) (5) gây hậu quả nghiêm trọng: xử lý theo Điều 15','A','Chuyên Cần, Trật Tự Nội Vụ','trung','khien_trach',15,'Đ.14–15'),
  ('NQ-B09','Thái độ không đúng mực với khách hàng, đối tác','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3) (5) gây thiệt hại nghiêm trọng cho Công ty: xử lý theo Điều 15','B','Ứng Xử, Đạo Đức, Liêm Chính','trung','khien_trach',15,'Đ.14–15'),
  ('NQ-B10','Gây mất đoàn kết, bè phái, xúc phạm người khác','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3) (5) kèm bản kiểm điểm ở lần đầu','B','Ứng Xử, Đạo Đức, Liêm Chính','trung','khien_trach',15,'Đ.14'),
  ('NQ-B11','Nói dối, bao che, báo cáo sai lệch số liệu do chủ quan','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3) (5) gây thiệt hại nghiêm trọng về tài sản/lợi ích: sa thải (Điều 16)','B','Ứng Xử, Đạo Đức, Liêm Chính','trung','khien_trach',15,'Đ.14, 16'),
  ('NQ-B12','Nhận hoa hồng, quà, lợi ích riêng từ nhà cung cấp/khách hàng','(1) Buộc hoàn trả toàn bộ khoản vụ lợi (2) giảm 30% thưởng P3 mỗi lần (3) kéo dài nâng lương 06 tháng hoặc cách chức (4) giá trị lớn, có tổ chức hoặc tái phạm: sa thải (Điều 16) và chuyển cơ quan chức năng nếu có dấu hiệu tội phạm','B','Ứng Xử, Đạo Đức, Liêm Chính','nang','keo_dai_nang_luong',30,'Đ.15–16, 125.2'),
  ('NQ-B13','Che giấu xung đột lợi ích (người thân là đối tác/nhà cung cấp)','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3)','B','Ứng Xử, Đạo Đức, Liêm Chính','trung','khien_trach',15,'Đ.14'),
  ('NQ-B14','Cạnh tranh, làm cho đối thủ, lập công ty sân sau (vi phạm cam kết đã ký)','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3) (5) xử lý theo cam kết đã ký; sa thải khi đủ căn cứ Điều 16','B','Ứng Xử, Đạo Đức, Liêm Chính','nang','keo_dai_nang_luong',30,'Đ.16 + thỏa thuận'),
  ('NQ-B15','Quấy rối tình dục tại nơi làm việc','(1) giảm tới 100% thưởng P3 của tháng (2) sa thải (Điều 16), áp dụng hạn chế cho hành vi đặc biệt nghiêm trọng hoặc tái phạm (3) bồi thường (4) chuyển cơ quan chức năng nếu có dấu hiệu tội phạm','B','Ứng Xử, Đạo Đức, Liêm Chính','rat_nang','sa_thai',100,'Đ.16, 125.2'),
  ('NQ-B16','Đánh bạc, cố ý gây thương tích, dùng ma túy tại nơi làm việc','(1) giảm tới 100% thưởng P3 của tháng (2) sa thải (Điều 16), áp dụng hạn chế cho hành vi đặc biệt nghiêm trọng hoặc tái phạm (3) bồi thường (4) chuyển cơ quan chức năng nếu có dấu hiệu tội phạm','B','Ứng Xử, Đạo Đức, Liêm Chính','rat_nang','sa_thai',100,'Đ.16, 125.1'),
  ('NQ-C17','Sơ suất làm hư hỏng dụng cụ, thiết bị','(1) Giảm 15% thưởng P3 mỗi lần (2) xử lý theo giá trị thiệt hại tại Điều 15 (3) bồi thường theo Điều 19 (sơ suất: tối đa 03 tháng lương, khấu trừ ≤ 30%/tháng)','C','Tài Sản, Bảo Mật, Sở Hữu Trí Tuệ','trung','khien_trach',15,'Đ.15, 19'),
  ('NQ-C18','Làm mất tài sản; tiêu hao vật tư quá định mức','(1) Giảm 30% thưởng P3 mỗi lần (2) xử lý theo giá trị thiệt hại tại Điều 15 (3) bồi thường theo thời giá hoặc hợp đồng trách nhiệm (Điều 19)','C','Tài Sản, Bảo Mật, Sở Hữu Trí Tuệ','nang','keo_dai_nang_luong',30,'Đ.15, 19'),
  ('NQ-C19','Trộm cắp, tham ô tài sản của Công ty','(1) giảm tới 100% thưởng P3 của tháng (2) sa thải (Điều 16), áp dụng hạn chế cho hành vi đặc biệt nghiêm trọng hoặc tái phạm (3) bồi thường (4) chuyển cơ quan chức năng nếu có dấu hiệu tội phạm','C','Tài Sản, Bảo Mật, Sở Hữu Trí Tuệ','rat_nang','sa_thai',100,'Đ.16, 125.1'),
  ('NQ-C20','Cố ý phá hủy tài liệu, hồ sơ, hệ thống của Công ty','(1) giảm tới 100% thưởng P3 của tháng (2) sa thải (Điều 16), áp dụng hạn chế cho hành vi đặc biệt nghiêm trọng hoặc tái phạm (3) bồi thường (4) chuyển cơ quan chức năng nếu có dấu hiệu tội phạm','C','Tài Sản, Bảo Mật, Sở Hữu Trí Tuệ','rat_nang','sa_thai',100,'Đ.16, 125'),
  ('NQ-C21','Tiết lộ bí mật kinh doanh/công nghệ, dữ liệu khách hàng','(1) giảm tới 100% thưởng P3 của tháng (2) sa thải (Điều 16), áp dụng hạn chế cho hành vi đặc biệt nghiêm trọng hoặc tái phạm (3) bồi thường (4) chuyển cơ quan chức năng nếu có dấu hiệu tội phạm','C','Tài Sản, Bảo Mật, Sở Hữu Trí Tuệ','rat_nang','sa_thai',100,'Đ.16, 125.2'),
  ('NQ-C22','Xâm phạm quyền sở hữu trí tuệ của Công ty','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3) (5) gây thiệt hại nghiêm trọng: sa thải (Điều 16)','C','Tài Sản, Bảo Mật, Sở Hữu Trí Tuệ','nang','keo_dai_nang_luong',30,'Đ.16, 125.2'),
  ('NQ-C23','So sánh, phát tán thông tin tiền lương của người khác','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3) (5) có yếu tố lộ bí mật kinh doanh: sa thải (Điều 16)','C','Tài Sản, Bảo Mật, Sở Hữu Trí Tuệ','trung','khien_trach',15,'Đ.11.3, 14, 16'),
  ('NQ-D24','Không sử dụng phương tiện bảo hộ được cấp','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3) (5) gây tai nạn/thiệt hại: xử lý theo Điều 15 Luật ATVSLĐ; Đ.14–15','D','An Toàn, Vệ Sinh Lao Động, Pccc','trung','khien_trach',15,''),
  ('NQ-D25','Vi phạm quy định phòng cháy, chữa cháy','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3) (5) gây nguy cơ đặc biệt nghiêm trọng: sa thải (Điều 16) Luật PCCC; Đ.15–16','D','An Toàn, Vệ Sinh Lao Động, Pccc','nang','keo_dai_nang_luong',30,''),
  ('NQ-D26','Không tuân thủ quy trình an toàn kho/bốc xếp/vận tải','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3) (5) gây tai nạn/thiệt hại: xử lý theo Điều 15','D','An Toàn, Vệ Sinh Lao Động, Pccc','nang','keo_dai_nang_luong',30,'Đ.15–16'),
  ('NQ-E27','Khai báo hải quan sai do chủ quan/thiếu kiểm tra','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3) (5) gây phạt/truy thu: xử lý theo giá trị thiệt hại Điều 15 + bồi thường','E','Xuất Nhập Khẩu – Hải Quan','nang','keo_dai_nang_luong',30,'Đ.15–16; Luật HQ'),
  ('NQ-E28','Làm sai lệch, giả mạo chứng từ hải quan, xuất xứ','(1) giảm tới 100% thưởng P3 của tháng (2) sa thải (Điều 16), áp dụng hạn chế cho hành vi đặc biệt nghiêm trọng hoặc tái phạm (3) bồi thường (4) chuyển cơ quan chức năng nếu có dấu hiệu tội phạm','E','Xuất Nhập Khẩu – Hải Quan','rat_nang','sa_thai',100,'Đ.16, 125.2'),
  ('NQ-E29','Không lưu trữ chứng từ XNK theo quy định (05 năm)','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3)','E','Xuất Nhập Khẩu – Hải Quan','trung','khien_trach',15,'Đ.14; Luật HQ'),
  ('NQ-E30','Tự ý thỏa thuận với đối tác vận chuyển/bến bãi ngoài thẩm quyền','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3) (5) có vụ lợi: sa thải (Điều 16)','E','Xuất Nhập Khẩu – Hải Quan','nang','keo_dai_nang_luong',30,'Đ.15–16'),
  ('NQ-F31','Nhập/xuất kho không đúng quy trình, không kiểm đếm','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3)','F','Kho Vận','trung','khien_trach',15,'Đ.14'),
  ('NQ-F32','Lập Packing List sai hoặc thiếu trường bắt buộc','(1) giảm 5% thưởng P3 mỗi lần vi phạm (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3)','F','Kho Vận','nhe','khien_trach',5,'Đ.14'),
  ('NQ-F33','Để thất thoát, hư hỏng hàng hóa do không tuân thủ FIFO/FEFO','(1) Giảm 30% thưởng P3 mỗi lần (2) xử lý theo giá trị thiệt hại tại Điều 15 (3) bồi thường theo Điều 19','F','Kho Vận','nang','keo_dai_nang_luong',30,'Đ.15, 19'),
  ('NQ-F34','Chậm/không cung cấp đủ Packing List, dữ liệu đơn hàng','(1) giảm 5% thưởng P3 mỗi lần vi phạm (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3) (5) đồng thời đánh giá KPI (không giữ/dừng lương)','F','Kho Vận','nhe','khien_trach',5,'Đ.14; QC KPI'),
  ('NQ-G35','Chi vượt/sai hạn mức phê duyệt','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3) (5) bồi thường; cố ý vụ lợi: sa thải (Điều 16)','G','Tài Chính – Kế Toán','nang','keo_dai_nang_luong',30,'Đ.15–16, 19'),
  ('NQ-G36','Không đối chiếu; làm sai lệch số liệu kế toán','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3) (5) gian lận hoặc gây thiệt hại nghiêm trọng: sa thải (Điều 16)','G','Tài Chính – Kế Toán','nang','keo_dai_nang_luong',30,'Đ.15–16'),
  ('NQ-G37','Chậm hoàn ứng; chiếm dụng tạm ứng','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3) (5) chiếm dụng: bồi thường + xử lý theo Điều 15','G','Tài Chính – Kế Toán','trung','khien_trach',15,'Đ.14–15, 19'),
  ('NQ-G38','Vi phạm quy chế quản lý tiền mặt/ngoại tệ','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3)','G','Tài Chính – Kế Toán','nang','keo_dai_nang_luong',30,'Đ.15–16, 19'),
  ('NQ-H39','Chia sẻ/để lộ tài khoản, mật khẩu; không bật xác thực 2 lớp','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3)','H','Công Nghệ Thông Tin, Dữ Liệu','trung','khien_trach',15,'Đ.14; CS ATTT'),
  ('NQ-H40','Cài đặt/sử dụng phần mềm không bản quyền, phần mềm lạ','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3) (5) gây sự cố hệ thống: xử lý theo Điều 15','H','Công Nghệ Thông Tin, Dữ Liệu','trung','khien_trach',15,'Đ.14–15; Luật SHTT'),
  ('NQ-H41','Lưu dữ liệu công ty ở thiết bị/tài khoản cá nhân trái quy định','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3) (5) làm lộ dữ liệu: sa thải (Điều 16)','H','Công Nghệ Thông Tin, Dữ Liệu','trung','khien_trach',15,'Đ.14, 16'),
  ('NQ-H42','Xử lý dữ liệu cá nhân sai quy định','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3)','H','Công Nghệ Thông Tin, Dữ Liệu','nang','keo_dai_nang_luong',30,'Đ.15–16; PL BVDLCN'),
  ('NQ-H43','Không bảo quản, để mất kiểm soát tài khoản cá nhân do Công ty cấp (email, phần mềm, hệ thống nội bộ)','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3) (5) gây lộ dữ liệu hoặc thiệt hại: xử lý theo Điều 15/16','H','Công Nghệ Thông Tin, Dữ Liệu','trung','khien_trach',15,'Đ.14–15; CS ATTT'),
  ('NQ-H44','Tự ý cho người khác mượn, sử dụng tài khoản do Công ty cấp','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3) (5) gây hậu quả hoặc làm lộ dữ liệu: sa thải (Điều 16)','H','Công Nghệ Thông Tin, Dữ Liệu','trung','khien_trach',15,'Đ.14–16; CS ATTT'),
  ('NQ-H45','Giao dịch, trao đổi công việc với khách hàng qua Zalo cá nhân hoặc kênh liên lạc cá nhân không được Công ty chỉ định','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3) (5) làm lộ dữ liệu hoặc chiếm giữ khách hàng: xử lý theo Điều 15/16','H','Công Nghệ Thông Tin, Dữ Liệu','trung','khien_trach',15,'Đ.11, 14; CS ATTT'),
  ('NQ-H46','Chuyển dữ liệu làm việc, dữ liệu khách hàng qua Zalo cá nhân hoặc kênh không do Công ty chỉ định','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3) (5) làm lộ bí mật kinh doanh/dữ liệu khách hàng: sa thải (Điều 16)','H','Công Nghệ Thông Tin, Dữ Liệu','nang','keo_dai_nang_luong',30,'Đ.11, 16; PL BVDLCN'),
  ('NQ-I47','Tự ý giảm giá/chiết khấu ngoài thẩm quyền','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3) (5) bồi thường chênh lệch; vụ lợi: sa thải (Điều 16)','I','Kinh Doanh, Bán Hàng','nang','keo_dai_nang_luong',30,'Đ.15–16, 19'),
  ('NQ-I48','Lập đơn hàng khống, tạo doanh số ảo','(1) giảm tới 100% thưởng P3 của tháng (2) sa thải (Điều 16), áp dụng hạn chế cho hành vi đặc biệt nghiêm trọng hoặc tái phạm (3) bồi thường (4) chuyển cơ quan chức năng nếu có dấu hiệu tội phạm','I','Kinh Doanh, Bán Hàng','rat_nang','sa_thai',100,'Đ.16, 125.2'),
  ('NQ-I49','Chậm phản hồi/bỏ rơi khách hàng theo SLA','(1) Không hưởng doanh số/hoa hồng đơn liên quan theo Quy chế hoa hồng (2) điều chuyển khách hàng (biện pháp quản lý) (3) tái phạm nhiều lần: giảm 5% thưởng P3 mỗi lần và khiển trách','I','Kinh Doanh, Bán Hàng','nhe','khien_trach',5,'Đ.12.3; QC hoa hồng'),
  ('NQ-I50','Chậm thu hồi công nợ so với thời hạn hợp đồng','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3) (5) đồng thời đánh giá KPI (không giữ/dừng thưởng)','I','Kinh Doanh, Bán Hàng','trung','khien_trach',15,'Đ.14; QC KPI'),
  ('NQ-I51','Thường xuyên không hoàn thành công việc theo hợp đồng','(1) Giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) đánh giá theo Quy chế KPI (4) đủ căn cứ: đơn phương chấm dứt HĐLĐ (Đ.36.1.a)','I','Kinh Doanh, Bán Hàng','trung','khien_trach',15,'Đ.14; 36.1.a'),
  ('NQ-K52','Người quản lý bao che, không xử lý vi phạm của cấp dưới','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3)','K','Trách Nhiệm Quản Lý, Chấp Hành Điều Hành','nang','keo_dai_nang_luong',30,'Đ.15–16'),
  ('NQ-K53','Người quản lý buông lỏng giám sát dẫn đến hậu quả nghiêm trọng','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3) (5) chịu trách nhiệm liên đới về thiệt hại','K','Trách Nhiệm Quản Lý, Chấp Hành Điều Hành','nang','keo_dai_nang_luong',30,'Đ.15–16'),
  ('NQ-K54','Không chấp hành quyết định điều động, phân công hợp pháp','(1) giảm 15% thưởng P3 mỗi lần (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3)','K','Trách Nhiệm Quản Lý, Chấp Hành Điều Hành','trung','khien_trach',15,'Đ.14'),
  ('NQ-L55','Lãng phí điện, nước, văn phòng phẩm, vật tư; sử dụng vượt định mức không có lý do chính đáng','(1) giảm 5% thưởng P3 mỗi lần vi phạm (2) khiển trách (3) tái phạm: kéo dài nâng lương 06 tháng (4) tái phạm tiếp: sa thải (Đ.125.3)','L','Lãng Phí, Thất Thoát, Thiếu Trách Nhiệm','nhe','khien_trach',5,'Đ.14'),
  ('NQ-L56','Sử dụng tài sản, phương tiện, nhiên liệu, thẻ xăng dầu của Công ty vào mục đích cá nhân','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3) (5) có yếu tố chiếm dụng/kê khống: sa thải (Điều 16) + hoàn trả','L','Lãng Phí, Thất Thoát, Thiếu Trách Nhiệm','nang','keo_dai_nang_luong',30,'Đ.15–16, 19'),
  ('NQ-L57','Kê khống, khai tăng chi phí vận chuyển, nhiên liệu, lưu kho, bốc xếp để trục lợi','(1) giảm tới 100% thưởng P3 của tháng (2) sa thải (Điều 16), áp dụng hạn chế cho hành vi đặc biệt nghiêm trọng hoặc tái phạm (3) bồi thường (4) chuyển cơ quan chức năng nếu có dấu hiệu tội phạm (5) buộc hoàn trả khoản trục lợi','L','Lãng Phí, Thất Thoát, Thiếu Trách Nhiệm','rat_nang','sa_thai',100,'Đ.16, 125.2'),
  ('NQ-L58','Để hàng hóa quá hạn lưu kho, quá hạn sử dụng, hư hỏng do không theo dõi, không luân chuyển','(1) Giảm 30% thưởng P3 mỗi lần (2) xử lý theo giá trị thiệt hại tại Điều 15 (3) bồi thường theo Điều 19','L','Lãng Phí, Thất Thoát, Thiếu Trách Nhiệm','nang','keo_dai_nang_luong',30,'Đ.15, 19'),
  ('NQ-L59','Không bàn giao hoặc bàn giao không đầy đủ công việc, tài sản, hồ sơ, công nợ khi nghỉ, chuyển hoặc chấm dứt công việc, gây gián đoạn hoặc thất thoát','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3) (5) gây thiệt hại: xử lý theo Điều 15 + bồi thường','L','Lãng Phí, Thất Thoát, Thiếu Trách Nhiệm','nang','keo_dai_nang_luong',30,'Đ.15–16, 19'),
  ('NQ-L60','Tự ý bỏ vị trí, không trực, không bố trí người thay thế, gây gián đoạn vận hành, thông quan, giao nhận','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3)','L','Lãng Phí, Thất Thoát, Thiếu Trách Nhiệm','nang','keo_dai_nang_luong',30,'Đ.15–16'),
  ('NQ-L61','Không báo cáo kịp thời sự cố, hư hỏng, mất mát, rủi ro dẫn đến hậu quả hoặc làm thiệt hại nặng thêm','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3)','L','Lãng Phí, Thất Thoát, Thiếu Trách Nhiệm','nang','keo_dai_nang_luong',30,'Đ.15–16'),
  ('NQ-L62','Thiếu trách nhiệm khi kiểm tra, đối chiếu, ký xác nhận (nhận hàng, chứng từ, thanh toán) dẫn đến sai sót, thất thoát','(1) Giảm 30% thưởng P3 mỗi lần (2) xử lý theo giá trị thiệt hại tại Điều 15 (3) bồi thường theo Điều 19','L','Lãng Phí, Thất Thoát, Thiếu Trách Nhiệm','nang','keo_dai_nang_luong',30,'Đ.15, 19'),
  ('NQ-L63','Không thực hiện kiểm kê định kỳ; che giấu hoặc không báo cáo chênh lệch kiểm kê','(1) giảm 30% thưởng P3 mỗi lần (2) kéo dài nâng lương 06 tháng hoặc cách chức (3) bồi thường nếu có thiệt hại (4) sa thải khi tái phạm, thiệt hại ≥ 53,1 triệu, hoặc có vụ lợi (Đ.125.2–3) (5) che giấu nhằm chiếm đoạt: sa thải (Điều 16)','L','Lãng Phí, Thất Thoát, Thiếu Trách Nhiệm','nang','keo_dai_nang_luong',30,'Đ.15–16'),
  ('NQ-L64','Để phát sinh chi phí phạt, lưu container, lưu bãi (demurrage/detention) do chậm trễ chủ quan','(1) Giảm 30% thưởng P3 mỗi lần (2) xử lý theo giá trị thiệt hại tại Điều 15 (3) bồi thường theo Điều 19 Đ.15, 19 Danh mục này không loại trừ trách nhiệm dân sự, hành chính hoặc hình sự theo quy định pháp luật. Các chế tài tài chính trong danh mục (giảm thưởng P3; khấu trừ lương để bồi thường thiệt hại) được áp dụng theo đúng căn cứ pháp luật quy định tại Điều 13, Điều 14 và Điều 19 Nội quy này; Công ty không áp dụng phạt tiền hoặc cắt lương không có căn cứ pháp luật (Điều 127 Bộ luật Lao động).','L','Lãng Phí, Thất Thoát, Thiếu Trách Nhiệm','nang','keo_dai_nang_luong',30,'')
  ) as v(ma, ten, chi_tiet, nhom_pl, ten_nhom, muc_do, ky_luat, p3, can_cu)
 where not exists (select 1 from loai_vi_pham where ma = v.ma);

-- Bay loai mac dinh cua he thong (ma khong co tien to NQ-) da bi danh muc that thay the.
-- Tat thay vi xoa: co the da co ban ghi vi pham tro toi chung.
update loai_vi_pham
   set dang_bat = false,
       mo_ta = coalesce(mo_ta, '') ||
               ' [Đã thay bằng danh mục Phụ lục Nội quy 01/2026/NQLĐ-TPVN]'
 where ma not like 'NQ-%'
   and exists (select 1 from loai_vi_pham where ma like 'NQ-%');
