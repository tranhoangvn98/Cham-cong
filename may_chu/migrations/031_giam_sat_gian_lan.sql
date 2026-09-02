-- Module H: giam sat gian lan tren du lieu ERP 1.
--
-- BOI CANH: ERP 1 (erp_manager + erp_logistic) la noi phat sinh tien va chung tu, nhung hang
-- rao phong ngua o do con yeu: nhieu bang tien KHONG co cot ModifiedDate/ModifiedBy, khoa to
-- khai khong chan sua dong tien, va co duong ghi du lieu khong xac thuc. Module nay khong va
-- CHUA BAO GIO vá duoc nhung lo do — no la lop PHAT HIEN dat o he thong khac, de nguoi bi
-- giam sat khong quan tri duoc noi ghi nhan canh bao.
--
-- RANH GIOI PHAP LY — doc truoc khi them cot nao vao day:
--
-- Canh bao do may sinh chi la DAU HIEU CAN KIEM TRA. Khong co duong nao di thang tu "may phat
-- hien" den "ket luan gian lan". Vi the:
--   - Trang thai do may ghi luon la 'moi'; chi con nguoi doi duoc sang trang thai khac.
--   - Bang nay KHONG co cot so tien phat, khong noi toi bang luong. BLLD 2019 Dieu 127 cam
--     phat tien / cat luong thay cho ky luat lao dong.
--   - Neu mot canh bao dan toi ky luat lao dong that, no phai di qua duong `vi_pham`
--     (013_vi_pham.sql) voi day du hop, giai trinh va bien ban theo Dieu 122.
--
-- BA TANG CHI-DOC: module chi doc ERP 1, khong bao gio ghi. Tang 1 o Postgres ERP 1
-- (GRANT SELECT + default_transaction_read_only), tang 2 o chuoi ket noi
-- (options=-c default_transaction_read_only=on), tang 3 o ma nguon (moi truy van boc trong
-- `begin read only`). Xem `src/giam_sat/ket_noi_erp.ts`.

-- ---------------------------------------------------------------- nguon du lieu ERP 1
-- Moi dong la MOT database tren may chu ERP 1 ma module duoc phep doc.
--
-- KHONG luu thong tin dang nhap o day. Host / user / password nam trong bien moi truong
-- (ERP1_*), giong het cach ERP_API_KEY dang lam. Bang nay chi tra loi cau hoi "ma nguon `sale`
-- tro toi database nao" — de doi ten database ben ERP 1 la sua mot dong, khong phai sua code.
create table if not exists nguon_du_lieu (
  id                    uuid primary key default gen_random_uuid(),
  -- Khoa phang ma phep do tham chieu: 'hola','sale','debt','logs','kho'. Khai trong
  -- src/giam_sat/nguon.ts — day chi la ban sao de UI doc.
  ma                    text not null unique,
  ten                   text not null,
  -- Ten database THAT, do man hinh do tim dien vao. Trong = chua chon.
  ten_database          text,
  mo_ta                 text,
  dang_bat              boolean not null default false,
  kiem_tra_luc          timestamptz,
  kiem_tra_ok           boolean,
  kiem_tra_thong_diep   text,
  tao_luc               timestamptz not null default now(),
  cap_nhat_luc          timestamptz not null default now()
);

comment on table nguon_du_lieu is
  'Anh xa ma nguon -> ten database tren may chu ERP 1. KHONG chua thong tin dang nhap.';

-- ---------------------------------------------------------------- danh muc canh bao
create table if not exists loai_canh_bao (
  id                uuid primary key default gen_random_uuid(),
  ma                text not null unique,
  ten               text not null,
  nhom              text not null
                    check (nhom in ('sla','trung_lap','don_hang','giao_dich',
                                    'chi_phi_cong_no','cheo_cham_cong')),
  mo_ta             text,
  muc_do_mac_dinh   text not null default 'trung'
                    check (muc_do_mac_dinh in ('thap','trung','cao','nghiem_trong')),
  -- So gio ke tu luc phat hien den luc phai co nguoi xu ly xong. Dung de tinh "qua han".
  sla_xu_ly_gio     int not null default 72 check (sla_xu_ly_gio > 0),
  -- Bo phan chiu trach nhiem doc nhom canh bao nay. Chi de hien thi va loc.
  vai_tro_xu_ly     text,
  huong_dan_xu_ly   text,
  dang_bat          boolean not null default true,
  tao_luc           timestamptz not null default now(),
  cap_nhat_luc      timestamptz not null default now()
);

-- ---------------------------------------------------------------- danh muc loi
create table if not exists loai_loi (
  id                        uuid primary key default gen_random_uuid(),
  ma                        text not null unique,
  ten                       text not null,
  loai_canh_bao_id          uuid not null references loai_canh_bao(id) on delete restrict,
  mo_ta                     text,
  muc_do                    text not null default 'trung'
                            check (muc_do in ('thap','trung','cao','nghiem_trong')),
  bo_phan_chiu_trach_nhiem  text,
  hau_qua                   text,
  huong_khac_phuc           text,
  -- Quy che noi bo / dieu khoan lam can cu. Cung vai tro voi loai_vi_pham.can_cu.
  can_cu                    text,
  dang_bat                  boolean not null default true,
  tao_luc                   timestamptz not null default now(),
  cap_nhat_luc              timestamptz not null default now()
);
create index if not exists loai_loi_canh_bao_idx on loai_loi(loai_canh_bao_id);

-- ---------------------------------------------------------------- dieu kien cua loi
-- Moi dong la MOT dieu kien tren mot phep do. Nhieu dieu kien cua cung mot loi noi voi nhau
-- bang AND. Can OR thi tao hai `loai_loi` — co y, vi mot cay bieu thuc long nhau cau hinh qua
-- UI la thu khong ai doc lai duoc sau sau thang.
--
-- `phep_do` KHONG phai cau SQL. No la ma cua mot phep do khai bao trong TypeScript
-- (src/giam_sat/phep_do/chi_muc.ts) voi SQL tham so hoa san. Cho phep nhap SQL tu do o day la
-- bien man hinh cau hinh thanh cong thuc thi SQL tren CSDL san xuat cua ERP 1.
create table if not exists dieu_kien_loi (
  id            uuid primary key default gen_random_uuid(),
  loai_loi_id   uuid not null references loai_loi(id) on delete cascade,
  phep_do       text not null check (phep_do <> ''),
  -- Tham so cua phep do (so ngay, nguong tien...). Khai bao kieu nam trong code.
  tham_so       jsonb not null default '{}'::jsonb,
  toan_tu       text not null default '>=' check (toan_tu in ('>=','>','=','<=','<','!=')),
  nguong        numeric(18,4) not null,
  thu_tu        int not null default 0,
  dang_bat      boolean not null default false,
  ghi_chu       text,
  tao_luc       timestamptz not null default now()
);
create index if not exists dieu_kien_loi_loai_idx on dieu_kien_loi(loai_loi_id);
create index if not exists dieu_kien_loi_bat_idx on dieu_kien_loi(phep_do) where dang_bat;

-- ---------------------------------------------------------------- ban ghi canh bao
create table if not exists canh_bao (
  id                uuid primary key default gen_random_uuid(),
  loai_loi_id       uuid not null references loai_loi(id) on delete restrict,

  -- Dinh danh doi tuong ben ERP 1: ('sale','tbl_DonHang','48213').
  nguon_ma          text not null,
  thuc_the          text not null,
  thuc_the_khoa     text not null,

  -- Ky 'YYYY-MM' voi canh bao tinh theo ky; null voi canh bao gan voi mot chung tu cu the.
  ky                text check (ky is null or ky ~ '^\d{4}-\d{2}$'),

  muc_do            text not null default 'trung'
                    check (muc_do in ('thap','trung','cao','nghiem_trong')),
  tieu_de           text not null,
  mo_ta             text,

  -- So lieu lam can cu, de nguoi xu ly doi chieu ma khong phai tra lai ERP 1.
  -- Voi canh bao "sua len" thi chua { truoc, sau, doi_luc }.
  -- CHI luu truong can de doi chieu, KHONG sao chep nguyen ban ghi ERP 1 (giam be mat ro ri).
  bang_chung        jsonb not null default '{}'::jsonb,
  gia_tri           numeric(18,4),
  nguong            numeric(18,4),

  -- Nguoi lien quan ben ERP 1, va ho so nhan vien tuong ung neu map duoc.
  erp_user_id       int,
  nhan_vien_id      uuid references nhan_vien(id) on delete set null,
  so_tien           numeric(18,2),

  -- May LUON ghi 'moi'. Chi con nguoi doi sang trang thai khac.
  trang_thai        text not null default 'moi'
                    check (trang_thai in ('moi','dang_kiem_tra','xac_nhan','bo_qua','da_xu_ly')),
  nguoi_xu_ly       uuid references nguoi_dung(id) on delete set null,
  xu_ly_luc         timestamptz,
  ket_luan          text,

  phat_hien_luc     timestamptz not null default now(),
  cap_nhat_luc      timestamptz not null default now()
);

create index if not exists canh_bao_trang_thai_idx on canh_bao(trang_thai, phat_hien_luc desc);
create index if not exists canh_bao_loai_idx on canh_bao(loai_loi_id, phat_hien_luc desc);
create index if not exists canh_bao_nhan_vien_idx on canh_bao(nhan_vien_id, phat_hien_luc desc);
create index if not exists canh_bao_nguon_idx on canh_bao(nguon_ma, thuc_the);

-- Mot loi chi sinh MOT canh bao cho moi doi tuong moi ky. Khong co rang buoc nay thi moi vong
-- quet lai de ra mot ban sao, va cai ket luan nguoi ta da viet bi chim trong ban trung.
-- `coalesce(ky,'')` de dong co ky = null van vao duoc chi muc duy nhat.
create unique index if not exists canh_bao_mot_lan
  on canh_bao(loai_loi_id, nguon_ma, thuc_the, thuc_the_khoa, coalesce(ky, ''));

-- ---------------------------------------------------------------- nhat ky xu ly canh bao
-- Append-only. Khong co route nao sua hay xoa dong o day: do la bang ghi vet, khong phai
-- bang du lieu.
create table if not exists canh_bao_xu_ly (
  id                bigserial primary key,
  canh_bao_id       uuid not null references canh_bao(id) on delete cascade,
  nguoi_dung_id     uuid references nguoi_dung(id) on delete set null,
  hanh_dong         text not null,
  trang_thai_truoc  text,
  trang_thai_sau    text,
  ghi_chu           text,
  luc               timestamptz not null default now()
);
create index if not exists canh_bao_xu_ly_canh_bao_idx on canh_bao_xu_ly(canh_bao_id, luc);

-- ---------------------------------------------------------------- anh chup phat hien sua len
-- DAY LA MAU CHOT KY THUAT CUA MODULE.
--
-- Nhieu bang tien cua ERP 1 khong co ModifiedDate/ModifiedBy (da kiem chung:
-- xnk.Logistic.Core/SharedKernel/BaseEntity.cs chi co Id/CreatedUtcDate/IsDeleted;
-- DatabaseCore.Domain/Entities/Base/BaseEntity.cs chi co CreatedDate/LastUpdateTime/IsDeleted).
-- Vi vay viec sua so tien sau khi duyet KHONG de lai dau vet nao trong ERP 1 de truy van.
--
-- Cach bu: ERP 2 tu chup van tay cac truong trong yeu moi lan quet. Van tay doi giua hai lan
-- quet => co nguoi sua. Khong tra ra AI sua (ERP 1 khong luu), nhung ra duoc CAI GI doi va
-- TRONG KHOANG NAO — du de mo mot cuoc kiem tra.
create table if not exists anh_chup_erp (
  id            bigserial primary key,
  nguon_ma      text not null,
  bang          text not null,
  khoa          text not null,
  -- sha256 cua cac truong theo doi, chuan hoa thu tu khoa truoc khi bam.
  van_tay       text not null,
  du_lieu       jsonb not null,
  quet_luc      timestamptz not null default now(),
  unique (nguon_ma, bang, khoa)
);
create index if not exists anh_chup_erp_quet_idx on anh_chup_erp(quet_luc);

-- ---------------------------------------------------------------- nhat ky chay quet
-- Cung muc dich voi bang `dong_bo_erp` (017): mot lan quet that bai ma bao "0 canh bao" la
-- kieu that bai te nhat — nhin nhu thanh cong.
create table if not exists lan_quet_giam_sat (
  id                bigserial primary key,
  loai_loi_id       uuid references loai_loi(id) on delete set null,
  pham_vi           text,
  so_ban_ghi_doc    int not null default 0,
  so_canh_bao_moi   int not null default 0,
  so_bo_qua         int not null default 0,
  thanh_cong        boolean not null default false,
  thong_diep        text,
  mili_giay         int,
  bat_dau_luc       timestamptz not null default now(),
  ket_thuc_luc      timestamptz
);
create index if not exists lan_quet_giam_sat_bat_dau_idx
  on lan_quet_giam_sat(bat_dau_luc desc);

-- ================================================================ SEED
-- Bo khoi dau de he thong dung duoc ngay. Cong ty sua/them theo quy che cua minh.
--
-- MOI DIEU KIEN DEU TAT (`dang_bat = false`). Bat san bang mot con so tu nghi ra la de he
-- thong ket toi nguoi that bang tieu chi khong ai duyet — cung ly do voi 013_vi_pham.sql.
-- Quy trinh dung: bam "Chay thu" -> xem no bat bao nhieu ban ghi -> chot nguong -> moi bat.

-- ---------------------------------------------------------------- nguon du lieu
-- `ten_database` de trong: man hinh "Nguon ERP" se do tim va dien vao. KHONG doan ten o day —
-- ten trong ma nguon ERP 1 la ten UAT (cms_uat, xnk_debt_uat...), chua chac la ten that.
insert into nguon_du_lieu (ma, ten, mo_ta, dang_bat)
select * from (values
  ('hola', 'Hola — chi/thu, vi, ngan hang, van don',
   'Database loi cua erp_manager: usr/chi/thu/wallet/transaction/casso/kho.', false),
  ('sale', 'Ban hang — don hang, co hoi, lo hang, mua hang',
   'Database cua sale.API: schema sale.', false),
  ('debt', 'Cong no — khach hang, nhan vien, nha cung cap',
   'Database cua xnk.debt.api: schema manage_debt.', false),
  ('logs', 'Nhat ky thao tac ERP 1',
   'Database cua xnk_log.API: schema xnk_logs, bang EmployeeActionLog.', false),
  ('kho',  'Kho & to khai — packing list, nhap/xuat kho, to khai, hoa don',
   'Database cua erp_logistic (inventorydb).', false)
) as t(ma, ten, mo_ta, dang_bat)
where not exists (select 1 from nguon_du_lieu);

-- ---------------------------------------------------------------- danh muc canh bao
insert into loai_canh_bao (ma, ten, nhom, mo_ta, muc_do_mac_dinh, sla_xu_ly_gio,
                           vai_tro_xu_ly, huong_dan_xu_ly)
select * from (values
  ('SLA', 'Chậm tiến độ chứng từ', 'sla',
   'Chứng từ không được lập hoặc duyệt trong thời hạn đã cam kết.',
   'trung', 48, 'Trưởng phòng XNK',
   'Đối chiếu với sổ giao việc, xác định nguyên nhân chậm là do người, do quy trình hay do '
   || 'khách chưa cung cấp chứng từ. Chậm lặp lại cùng một người là dấu hiệu cần xem lại.'),

  ('TRUNG_LAP', 'Trùng lặp dữ liệu', 'trung_lap',
   'Cùng một khách hoặc cùng một nội dung được lên nhiều lần, có thể bởi nhiều người.',
   'trung', 72, 'Trưởng phòng Kinh doanh',
   'Xác định bản ghi nào là bản gốc, hủy bản trùng. Nếu hai nhân viên cùng lên một khách, '
   || 'đối chiếu quy chế phân chia khách hàng trước khi kết luận.'),

  ('DON_HANG', 'Đơn hàng bất thường', 'don_hang',
   'Đơn hàng bị sửa sau khi chốt, giảm trừ lớn, hoặc số liệu không hợp lý.',
   'cao', 24, 'Kế toán trưởng',
   'Mở lịch sử đơn hàng, đối chiếu giá trị trước và sau. Sửa sau khi chốt bán mà không có '
   || 'yêu cầu sửa được duyệt là dấu hiệu cần báo cáo ngay.'),

  ('GIAO_DICH', 'Giao dịch bất thường', 'giao_dich',
   'Chứng từ chi/thu thiếu kiểm soát: tự duyệt, duyệt quá nhanh, thiếu chứng từ, lệch sao kê.',
   'nghiem_trong', 24, 'Kế toán trưởng',
   'Đối chiếu chứng từ gốc và sao kê ngân hàng. Trường hợp người đề xuất trùng người duyệt '
   || 'phải báo cáo Ban điều hành, không tự đóng.'),

  ('CHI_PHI_CONG_NO', 'Chi phí và công nợ', 'chi_phi_cong_no',
   'Cước vận chuyển vượt định mức, chi phí không gắn lô, công nợ vượt hạn mức hoặc treo lâu.',
   'cao', 72, 'Kế toán trưởng',
   'Đối chiếu bảng giá đã duyệt và hạn mức tín dụng của khách. Cước sửa sau khi phiếu kho '
   || 'đã lập cần có giải trình bằng văn bản.'),

  ('CHEO_CHAM_CONG', 'Đối chiếu chéo chấm công', 'cheo_cham_cong',
   'Có thao tác trên ERP 1 vào thời điểm người đó không đi làm theo bảng công.',
   'trung', 72, 'Kiểm soát nội bộ',
   'KIỂM TRA TRƯỚC KHI KẾT LUẬN: làm từ xa, quên quẹt thẻ, tài khoản dùng chung và sai lệch '
   || 'múi giờ đều tạo ra dấu hiệu này. Hỏi người liên quan trước, đừng suy đoán.')
) as t(ma, ten, nhom, mo_ta, muc_do_mac_dinh, sla_xu_ly_gio, vai_tro_xu_ly, huong_dan_xu_ly)
where not exists (select 1 from loai_canh_bao);

-- ---------------------------------------------------------------- danh muc loi
insert into loai_loi (ma, ten, loai_canh_bao_id, mo_ta, muc_do,
                      bo_phan_chiu_trach_nhiem, hau_qua, huong_khac_phuc)
select l.ma, l.ten, cb.id, l.mo_ta, l.muc_do, l.bo_phan, l.hau_qua, l.khac_phuc
  from (values
  -- ============================================================ SLA
  ('PKL_CHUA_LAP', 'Đơn đã chốt nhưng chưa có packing list', 'SLA',
   'Đơn hàng đã chuyển sang bán mà quá thời hạn vẫn chưa lập packing list nào.', 'trung',
   'Bộ phận XNK',
   'Hàng không kịp đóng gói và khai báo, lỡ chuyến, khách phàn nàn.',
   'Lập packing list ngay; nếu vướng do khách chưa gửi chi tiết hàng thì ghi rõ vào ghi chú đơn.'),

  ('PKL_LAP_MUON', 'Packing list lập muộn so với thời hạn', 'SLA',
   'Số giờ từ lúc tạo đơn đến lúc có packing list vượt ngưỡng cam kết.', 'thap',
   'Bộ phận XNK',
   'Dồn việc về cuối, tăng rủi ro sai sót khi khai báo.',
   'Rà lại phân công; nếu chậm lặp lại ở cùng một người thì xem lại tải công việc.'),

  ('PKL_TREO_CHO_NHAP_KHO', 'Packing list treo ở trạng thái chờ nhập kho', 'SLA',
   'Packing list ở trạng thái chờ nhập kho quá lâu mà không chuyển tiếp.', 'trung',
   'Bộ phận Kho',
   'Hàng nằm kho không được ghi nhận, sai lệch tồn kho và công nợ kho.',
   'Đối chiếu thực tế tại kho; nhập kho hoặc hủy packing list nếu hàng không về.'),

  ('NKCT_LECH_LON_TREO', 'Phiếu nhập kho lệch trên 10% chưa xử lý', 'SLA',
   'Phiếu nhập kho ở trạng thái phải kiểm tra lại (lệch số kiện/cân/khối trên 10%) tồn quá lâu.',
   'cao', 'Bộ phận Kho',
   'Lệch số lượng không được làm rõ sớm thì sau này không truy được trách nhiệm.',
   'Cân đo lại, lập biên bản lệch, đối chiếu với nhà vận chuyển trước khi chốt.'),

  ('TK_SLA_CHAM', 'Tờ khai bị hệ thống đánh dấu duyệt chậm', 'SLA',
   'Tờ khai có SlaStatus = SLA_SLOW do khoảng cách giữa lúc hoàn thành và lúc duyệt vượt cấu hình.',
   'trung', 'Bộ phận Hải quan',
   'Chậm thông quan, phát sinh phí lưu bãi.',
   'Xem lại chuỗi duyệt; nếu người duyệt thường xuyên vắng thì bổ sung người duyệt thay thế.'),

  ('TK_GIO_DUYET_LAU', 'Tờ khai duyệt quá lâu sau khi hoàn thành', 'SLA',
   'Số phút từ FinishedDateTimeUTC đến ApprovedDateTimeUTC vượt ngưỡng.', 'trung',
   'Bộ phận Hải quan',
   'Như trên, kèm rủi ro tỷ giá nếu tờ khai treo qua ngày.',
   'Đặt hạn duyệt rõ ràng trong quy chế và theo dõi bằng chỉ số này.'),

  ('TK_TREO_CHUA_DUYET', 'Tờ khai hoàn thành nhưng chưa được duyệt', 'SLA',
   'Tờ khai ở trạng thái FINISH quá thời hạn mà chưa chuyển sang APPROVED.', 'cao',
   'Bộ phận Hải quan',
   'Lô hàng không thông quan được, chi phí lưu kho lưu bãi tăng theo ngày.',
   'Duyệt hoặc trả lại kèm lý do; không để tờ khai treo không trạng thái.'),

  -- ============================================================ TRUNG LAP
  ('CH_TRUNG_SDT', 'Hai nhân viên cùng lên cơ hội một số điện thoại', 'TRUNG_LAP',
   'Từ hai cơ hội đang mở trở lên có cùng số điện thoại đã chuẩn hóa nhưng khác người phụ trách.',
   'trung', 'Phòng Kinh doanh',
   'Tranh khách nội bộ, khách bị hai người gọi, và số liệu cơ hội bị thổi lên.',
   'Đối chiếu quy chế phân chia khách; giữ một cơ hội, hủy phần còn lại.'),

  ('CH_TRUNG_KHACH', 'Hai nhân viên cùng lên cơ hội một khách hàng', 'TRUNG_LAP',
   'Từ hai cơ hội đang mở trở lên trên cùng mã khách nhưng khác người phụ trách.', 'trung',
   'Phòng Kinh doanh',
   'Như trên.',
   'Như trên.'),

  ('CH_KHONG_DINH_DANH', 'Cơ hội không truy được về khách thật', 'TRUNG_LAP',
   'Cơ hội không có mã khách và cũng không có số điện thoại.', 'cao',
   'Phòng Kinh doanh',
   'Không kiểm chứng được cơ hội có thật hay không; đây là đường dễ nhất để khai khống chỉ tiêu.',
   'Yêu cầu bổ sung thông tin khách trong 24 giờ, quá hạn thì hủy cơ hội.'),

  ('CH_SAO_BAT_THUONG', 'Số sao cơ hội cao hơn mức khối lượng cho phép', 'TRUNG_LAP',
   'Số sao đang lưu cao hơn số sao tính lại theo đúng công thức khối lượng/thể tích của ERP 1 '
   || '— dấu hiệu có người đặt sao thủ công.', 'cao',
   'Phòng Kinh doanh',
   'Sao cơ hội tính vào điểm KPI, nên đặt sao tay là ăn gian điểm.',
   'Đối chiếu khối lượng/thể tích thực tế. Nếu số liệu hàng đúng thì trả sao về mức tự tính.'),

  ('CH_CHOT_KHONG_DON', 'Cơ hội báo đã chốt nhưng không có đơn hàng', 'TRUNG_LAP',
   'Cơ hội ở trạng thái đã chốt quá thời hạn mà không gắn với đơn hàng nào.', 'cao',
   'Phòng Kinh doanh',
   'Chỉ tiêu chốt đơn bị thổi lên mà không có doanh thu thật đằng sau.',
   'Gắn đơn hàng tương ứng hoặc trả cơ hội về trạng thái đúng.'),

  -- ============================================================ DON HANG
  ('DH_SUA_SAU_CHOT', 'Đơn hàng bị sửa sau khi đã chuyển sang bán', 'DON_HANG',
   'Có bản ghi lịch sử sửa đơn phát sinh sau ngày chuyển đổi sang bán hàng.', 'nghiem_trong',
   'Kế toán',
   'Doanh thu đã ghi nhận bị thay đổi sau khi chốt sổ; báo cáo và công nợ lệch nhau.',
   'Đối chiếu giá trị trước/sau trong lịch sử; yêu cầu người sửa giải trình bằng văn bản.'),

  ('DH_SUA_NHIEU_LAN', 'Đơn hàng bị sửa nhiều lần bất thường', 'DON_HANG',
   'Số lần sửa một đơn trong khoảng thời gian vượt ngưỡng.', 'trung',
   'Phòng Kinh doanh',
   'Có thể là dữ liệu đầu vào kém, cũng có thể là dò tìm mức giá lọt qua kiểm soát.',
   'Xem chuỗi thay đổi; nếu sửa đi sửa lại cùng một trường tiền thì báo cáo lên.'),

  ('DH_SUA_GIAM_TIEN', 'Đơn hàng bị sửa giảm giá trị', 'DON_HANG',
   'Tổng tiền sau khi sửa thấp hơn trước khi sửa quá ngưỡng.', 'nghiem_trong',
   'Kế toán',
   'Giảm doanh thu ghi nhận; nếu tiền đã thu thì phần chênh không rõ đi đâu.',
   'Đối chiếu với phiếu thu và biên bản giảm trừ đã duyệt. Không có căn cứ thì hoàn nguyên.'),

  ('DH_SUA_KHONG_QUA_DUYET', 'Đơn hàng ở trạng thái đã duyệt sửa nhưng không có yêu cầu sửa',
   'DON_HANG',
   'Trạng thái sửa đơn là APPROVE mà không tìm thấy yêu cầu sửa tương ứng.', 'nghiem_trong',
   'Kế toán',
   'Quy trình duyệt bị đi vòng; không truy được ai cho phép sửa.',
   'Tra lịch sử đơn và nhật ký thao tác ERP 1; báo cáo Ban điều hành.'),

  ('DH_GIAM_TRU_CAO', 'Giảm trừ đơn hàng chiếm tỷ lệ cao', 'DON_HANG',
   'Giá trị giảm trừ trên tổng tiền đơn vượt tỷ lệ phần trăm ngưỡng.', 'cao',
   'Kế toán',
   'Giảm trừ là đường rút doanh thu hợp lệ nhất về mặt hình thức, nên phải soi kỹ.',
   'Đối chiếu biên bản giảm trừ, chứng từ khiếu nại của khách và người duyệt.'),

  ('DH_TONG_BANG_KHONG', 'Đơn hàng đã bán nhưng tổng tiền bằng không', 'DON_HANG',
   'Đơn ở trạng thái đã bán mà tổng tiền bằng 0.', 'cao',
   'Phòng Kinh doanh',
   'Doanh thu không được ghi nhận, hoặc đơn được dùng để chạy chỉ tiêu số lượng.',
   'Bổ sung giá trị đơn hoặc hủy đơn nếu là đơn nháp bị chốt nhầm.'),

  ('DH_TRUNG_KHACH_NGAY_TIEN', 'Đơn hàng trùng khách, trùng ngày, trùng số tiền', 'DON_HANG',
   'Từ hai đơn trở lên cùng khách, cùng ngày tạo và cùng tổng tiền.', 'trung',
   'Phòng Kinh doanh',
   'Nhiều khả năng là đơn nhập trùng; nếu đã ghi nhận doanh thu thì báo cáo sai.',
   'Giữ một đơn, hủy phần trùng; kiểm tra phiếu thu đã đối ứng vào đơn nào.'),

  ('DH_SUA_LEN', 'Đơn hàng đổi dữ liệu mà không có bản ghi lịch sử', 'DON_HANG',
   'Vân tay các trường trọng yếu của đơn đổi giữa hai lần quét nhưng không có dòng lịch sử '
   || 'tương ứng — dấu hiệu sửa thẳng vào cơ sở dữ liệu.', 'nghiem_trong',
   'Bộ phận CNTT',
   'Sửa vòng qua ứng dụng thì mọi kiểm soát trong phần mềm đều vô hiệu.',
   'Đối chiếu nhật ký truy cập cơ sở dữ liệu; rà soát quyền ghi trực tiếp vào ERP 1.'),

  -- ============================================================ GIAO DICH
  ('CHI_TU_DUYET', 'Người đề xuất chi trùng người duyệt chi', 'GIAO_DICH',
   'Đề xuất chi có người tạo trùng với người duyệt ở một bước duyệt bất kỳ.', 'nghiem_trong',
   'Kế toán trưởng',
   'Mất tách biệt nhiệm vụ — một người tự quyết toàn bộ một khoản chi.',
   'Báo cáo Ban điều hành. Rà lại cấu hình bước duyệt để chặn từ gốc, không chỉ phát hiện sau.'),

  ('CHI_DUYET_SIEU_TOC', 'Chi số tiền lớn được duyệt gần như tức thì', 'GIAO_DICH',
   'Khoảng cách từ lúc tạo đề xuất đến lúc duyệt nhỏ hơn ngưỡng phút, với số tiền từ ngưỡng trở lên.',
   'cao', 'Kế toán trưởng',
   'Duyệt nhanh hơn thời gian đủ để đọc chứng từ nghĩa là không ai thực sự kiểm.',
   'Hỏi người duyệt về căn cứ; nếu là khoản định kỳ đã biết trước thì ghi nhận và bỏ qua.'),

  ('CHI_DUYET_NGOAI_GIO', 'Chi được duyệt ngoài giờ làm việc', 'GIAO_DICH',
   'Thời điểm duyệt nằm ngoài khung giờ hành chính đã cấu hình.', 'trung',
   'Kế toán trưởng',
   'Ngoài giờ là lúc ít người đối chiếu nhất.',
   'Đối chiếu tính cấp bách của khoản chi. Chi gấp ngoài giờ là bình thường; chi thường xuyên '
   || 'ngoài giờ thì không.'),

  ('CHI_KHONG_CHUNG_TU', 'Chi số tiền lớn không đính kèm chứng từ', 'GIAO_DICH',
   'Đề xuất chi từ ngưỡng tiền trở lên mà không có ảnh chứng từ nào.', 'cao',
   'Kế toán',
   'Không có chứng từ thì khoản chi không kiểm chứng được và không hạch toán đúng được.',
   'Yêu cầu bổ sung chứng từ; quá hạn thì treo khoản chi.'),

  ('CHI_TRUNG_TIEN_NCC', 'Chi trùng số tiền cho cùng nhà cung cấp', 'GIAO_DICH',
   'Từ hai đề xuất chi trở lên cùng mã nhà cung cấp và cùng số tiền trong khoảng thời gian ngắn.',
   'cao', 'Kế toán',
   'Rủi ro trả tiền hai lần cho một hóa đơn.',
   'Đối chiếu hóa đơn gốc và sao kê; nếu đã trả trùng thì lập đề nghị thu hồi.'),

  ('CHI_LECH_SAO_KE', 'Chi báo đã thanh toán nhưng chưa khớp sao kê', 'GIAO_DICH',
   'Đề xuất chi ở trạng thái đã thanh toán mà cờ đối chiếu ngân hàng vẫn chưa khớp quá thời hạn.',
   'cao', 'Kế toán',
   'Tiền ghi là đã chi nhưng không thấy trên sao kê — hoặc chưa chi thật, hoặc chi bằng đường khác.',
   'Đối chiếu sao kê ngân hàng theo ngày; làm rõ trước khi khóa sổ kỳ.'),

  ('THU_LECH_TON_LAU', 'Phiếu thu có chênh lệch tồn quá lâu', 'GIAO_DICH',
   'Phiếu thu được đánh dấu có chênh lệch mà chưa xử lý quá thời hạn.', 'trung',
   'Kế toán',
   'Chênh lệch để lâu thì không còn ai nhớ nguyên nhân, và trở thành nợ khó đối chiếu.',
   'Đối chiếu với khách và sao kê; ghi bút toán điều chỉnh có căn cứ.'),

  ('BANK_CHUA_KHOP', 'Giao dịch ngân hàng lớn chưa khớp chứng từ', 'GIAO_DICH',
   'Giao dịch ghi có từ ngưỡng tiền trở lên chưa được khớp với chứng từ nào quá thời hạn.', 'cao',
   'Kế toán',
   'Tiền về mà không biết của ai thì công nợ khách không giảm, dễ thu trùng.',
   'Tra nội dung chuyển khoản, liên hệ khách để xác định; gắn vào phiếu thu tương ứng.'),

  ('CHI_VUOT_HAN_MUC', 'Chi vượt hạn mức của loại chi', 'GIAO_DICH',
   'Số tiền chi vượt hạn mức đã cấu hình cho loại chi đó.', 'nghiem_trong',
   'Kế toán trưởng',
   'Hạn mức là chốt chặn nghiệp vụ; vượt được nghĩa là chốt chặn không hoạt động.',
   'Kiểm tra khoản chi có được cấp trên phê duyệt ngoại lệ không; nếu không thì báo cáo ngay.'),

  ('GHI_KHONG_XAC_THUC', 'Chứng từ được ghi bởi tài khoản rỗng', 'GIAO_DICH',
   'Bản ghi bên erp_logistic mang UserId rỗng (00000000-0000-0000-0000-000000000000) — dấu hiệu '
   || 'được tạo qua đường gọi không xác thực.', 'nghiem_trong',
   'Bộ phận CNTT',
   'Không quy trách nhiệm được cho ai. Đây là hệ quả của việc erp_logistic không bật xác thực.',
   'Rà soát đường gọi tạo ra bản ghi này; ưu tiên vá phía erp_logistic thay vì chỉ theo dõi.'),

  -- ============================================================ CHI PHI & CONG NO
  ('CUOC_DON_GIA_VUOT', 'Đơn giá cước vận chuyển vượt định mức', 'CHI_PHI_CONG_NO',
   'Cước vận chuyển chia cho số kiện (hoặc khối) vượt ngưỡng đơn giá.', 'cao',
   'Bộ phận Vận tải',
   'Cước cao hơn định mức làm giảm lãi lô hàng, và là chỗ dễ giấu chênh lệch nhất.',
   'Đối chiếu bảng giá đã duyệt của nhà vận chuyển; yêu cầu giải trình phần vượt.'),

  ('CUOC_SUA_LEN', 'Cước phiếu nhập kho bị sửa sau khi lập', 'CHI_PHI_CONG_NO',
   'Vân tay cước vận chuyển / cước nội địa của phiếu nhập kho đổi giữa hai lần quét.',
   'nghiem_trong', 'Bộ phận Kho',
   'erp_logistic cho sửa cước phiếu nhập kho không giới hạn khi chưa gắn phiếu xuất, và không '
   || 'lưu lại ai sửa. Đây là chỗ sửa số tiền không để lại dấu vết.',
   'Đối chiếu giá trị trước/sau trong bằng chứng; yêu cầu người phụ trách giải trình.'),

  ('CHI_PHI_KHONG_GAN_LO', 'Chi phí mua hàng không gắn lô và không gắn đơn', 'CHI_PHI_CONG_NO',
   'Đơn mua hàng từ ngưỡng tiền trở lên mà không gắn container lẫn đơn hàng.', 'cao',
   'Kế toán',
   'Chi phí không phân bổ được vào lô nào thì giá vốn từng lô sai, và lãi lỗ theo lô vô nghĩa.',
   'Gắn chi phí vào lô/đơn tương ứng; nếu là chi phí chung thì phân bổ theo quy tắc đã duyệt.'),

  ('CN_VUOT_HAN_MUC', 'Công nợ khách vượt hạn mức tín dụng', 'CHI_PHI_CONG_NO',
   'Dư nợ của khách vượt hạn mức tín dụng đã cấp.', 'cao',
   'Kế toán công nợ',
   'Bán tiếp cho khách đã vượt hạn mức là tăng rủi ro mất vốn.',
   'Tạm dừng giao hàng mới cho tới khi thu bớt, hoặc trình duyệt nâng hạn mức có căn cứ.'),

  ('CN_KHONG_PHAT_SINH_THU', 'Khách nợ lớn không phát sinh thu', 'CHI_PHI_CONG_NO',
   'Khách có dư nợ từ ngưỡng trở lên và không có phiếu thu nào trong khoảng thời gian.', 'cao',
   'Kế toán công nợ',
   'Nợ đọng càng lâu càng khó thu.',
   'Lập kế hoạch thu nợ, đối chiếu công nợ có xác nhận của khách.'),

  ('CN_NHAN_VIEN_CAO', 'Công nợ nhân viên vượt ngưỡng', 'CHI_PHI_CONG_NO',
   'Dư nợ tạm ứng của một nhân viên vượt ngưỡng.', 'trung',
   'Kế toán',
   'Tạm ứng không hoàn là một dạng chiếm dụng vốn.',
   'Yêu cầu hoàn ứng hoặc quyết toán chứng từ trong hạn quy định.'),

  ('NCC_NO_AM', 'Đã trả thừa nhà cung cấp', 'CHI_PHI_CONG_NO',
   'Dư nợ nhà cung cấp âm, tức đã trả nhiều hơn số phải trả.', 'cao',
   'Kế toán',
   'Tiền của công ty đang nằm ở nhà cung cấp mà không ai theo dõi.',
   'Đối chiếu công nợ với nhà cung cấp; thu hồi hoặc cấn trừ vào đơn sau.'),

  -- ============================================================ CHEO CHAM CONG
  ('TT_NGAY_NGHI', 'Có thao tác trên ERP 1 vào ngày không đi làm', 'CHEO_CHAM_CONG',
   'Nhân viên có thao tác trên ERP 1 vào ngày mà bảng công ghi là vắng hoặc nghỉ phép.', 'trung',
   'Kiểm soát nội bộ',
   'Có thể là tài khoản bị dùng chung, cũng có thể chỉ là làm từ xa.',
   'HỎI NGƯỜI LIÊN QUAN TRƯỚC. Làm từ xa, quên quẹt thẻ và sai múi giờ đều tạo ra dấu hiệu này.'),

  ('TT_NGOAI_CA', 'Có thao tác trên ERP 1 ngoài ca làm việc', 'CHEO_CHAM_CONG',
   'Thao tác xảy ra trước giờ vào ca hoặc sau giờ tan ca quá ngưỡng phút.', 'thap',
   'Kiểm soát nội bộ',
   'Như trên.',
   'Như trên. Chỉ số này chỉ có ý nghĩa khi lặp lại đều đặn, không dùng để kết luận một lần.')
) as l(ma, ten, ma_canh_bao, mo_ta, muc_do, bo_phan, hau_qua, khac_phuc)
  join loai_canh_bao cb on cb.ma = l.ma_canh_bao
 where not exists (select 1 from loai_loi);

-- ---------------------------------------------------------------- dieu kien mac dinh
-- TAT CA DEU TAT. Nguong duoi day la GOI Y de co diem xuat phat, khong phai chuan cua cong ty.
-- Quy trinh dung: mo trang Danh muc -> bam "Chay thu" -> xem no bat bao nhieu ban ghi ->
-- chot nguong voi truong bo phan -> moi bat.
insert into dieu_kien_loi (loai_loi_id, phep_do, tham_so, toan_tu, nguong, dang_bat, ghi_chu)
select ll.id, d.phep_do, d.tham_so::jsonb, d.toan_tu, d.nguong, false,
       'Ngưỡng gợi ý — phải đối chiếu quy chế nội bộ đã ban hành rồi mới bật.'
  from (values
  -- ma_loi                     phep_do                      tham_so                                              toan_tu  nguong
  ('PKL_CHUA_LAP',             'pkl_chua_co_sau_n_gio',      '{"ngay_nhin_lai":30}',                              '>=',    24),
  ('PKL_LAP_MUON',             'pkl_tao_muon',               '{"ngay_nhin_lai":30}',                              '>=',    48),
  ('PKL_TREO_CHO_NHAP_KHO',    'pkl_cho_nhap_kho_lau',       '{"ngay_nhin_lai":60}',                              '>=',    72),
  ('NKCT_LECH_LON_TREO',       'nkct_lech_lon',              '{"ngay_nhin_lai":90}',                              '>=',    3),
  ('TK_SLA_CHAM',              'to_khai_sla_cham',           '{"ngay_nhin_lai":30}',                              '>=',    1),
  ('TK_GIO_DUYET_LAU',         'to_khai_gio_duyet',          '{"ngay_nhin_lai":30}',                              '>=',    240),
  ('TK_TREO_CHUA_DUYET',       'to_khai_treo_chua_duyet',    '{"ngay_nhin_lai":30}',                              '>=',    24),

  ('CH_TRUNG_SDT',             'co_hoi_trung_sdt',           '{"so_ngay":30}',                                    '>=',    2),
  ('CH_TRUNG_KHACH',           'co_hoi_trung_khach',         '{"so_ngay":30}',                                    '>=',    2),
  ('CH_KHONG_DINH_DANH',       'co_hoi_khong_dinh_danh',     '{"ngay_nhin_lai":30}',                              '>=',    1),
  ('CH_SAO_BAT_THUONG',        'co_hoi_sao_bat_thuong',      '{"ngay_nhin_lai":90}',                              '>=',    1),
  ('CH_CHOT_KHONG_DON',        'co_hoi_chot_khong_don',      '{"ngay_nhin_lai":180}',                             '>=',    7),

  ('DH_SUA_SAU_CHOT',          'don_sua_sau_chot',           '{"ngay_nhin_lai":30}',                              '>=',    1),
  ('DH_SUA_NHIEU_LAN',         'don_sua_nhieu_lan',          '{"so_ngay":30}',                                    '>=',    5),
  ('DH_SUA_GIAM_TIEN',         'don_sua_giam_tien',          '{"ngay_nhin_lai":30}',                              '>=',    5000000),
  ('DH_SUA_KHONG_QUA_DUYET',   'don_sua_khong_qua_duyet',    '{"ngay_nhin_lai":90}',                              '>=',    1),
  ('DH_GIAM_TRU_CAO',          'don_giam_tru_ty_le_cao',     '{"ngay_nhin_lai":90}',                              '>=',    10),
  ('DH_TONG_BANG_KHONG',       'don_tong_bang_khong',        '{"ngay_nhin_lai":30}',                              '>=',    1),
  ('DH_TRUNG_KHACH_NGAY_TIEN', 'don_trung_khach_ngay_tien',  '{"ngay_nhin_lai":30}',                              '>=',    2),
  ('DH_SUA_LEN',               'don_sua_len',                '{}',                                                '>=',    1),

  ('CHI_TU_DUYET',             'chi_tu_de_xuat_tu_duyet',    '{"ngay_nhin_lai":90}',                              '>=',    1),
  ('CHI_DUYET_SIEU_TOC',       'chi_duyet_sieu_toc',         '{"ngay_nhin_lai":30,"so_tien_toi_thieu":20000000}', '<=',    5),
  ('CHI_DUYET_NGOAI_GIO',      'chi_duyet_ngoai_gio',        '{"ngay_nhin_lai":30,"gio_bat_dau":8,"gio_ket_thuc":18}', '>=', 1),
  ('CHI_KHONG_CHUNG_TU',       'chi_khong_chung_tu',         '{"ngay_nhin_lai":30}',                              '>=',    10000000),
  ('CHI_TRUNG_TIEN_NCC',       'chi_trung_tien_ncc',         '{"so_ngay":7}',                                     '>=',    2),
  ('CHI_LECH_SAO_KE',          'chi_lech_sao_ke',            '{"ngay_nhin_lai":90}',                              '>=',    7),
  ('THU_LECH_TON_LAU',         'thu_lech_ton_lau',           '{"ngay_nhin_lai":90}',                              '>=',    7),
  ('BANK_CHUA_KHOP',           'giao_dich_bank_chua_khop',   '{"ngay_nhin_lai":90,"so_tien_toi_thieu":10000000}', '>=',    5),
  ('CHI_VUOT_HAN_MUC',         'chi_vuot_han_muc',           '{"ngay_nhin_lai":90}',                              '>',     0),
  ('GHI_KHONG_XAC_THUC',       'ghi_khong_xac_thuc',         '{"ngay_nhin_lai":30}',                              '>=',    1),

  ('CUOC_DON_GIA_VUOT',        'cuoc_don_gia_vuot',          '{"ngay_nhin_lai":30}',                              '>=',    500000),
  ('CUOC_SUA_LEN',             'cuoc_sua_len',               '{}',                                                '>',     0),
  ('CHI_PHI_KHONG_GAN_LO',     'chi_phi_khong_gan_lo',       '{"ngay_nhin_lai":90}',                              '>=',    20000000),
  ('CN_VUOT_HAN_MUC',          'cong_no_vuot_han_muc',       '{}',                                                '>',     0),
  ('CN_KHONG_PHAT_SINH_THU',   'cong_no_khong_phat_sinh_thu','{"so_tien_toi_thieu":50000000}',                    '>=',    60),
  ('CN_NHAN_VIEN_CAO',         'cong_no_nhan_vien_cao',      '{}',                                                '>=',    20000000),
  ('NCC_NO_AM',                'ncc_no_am',                  '{}',                                                '>=',    1000000),

  ('TT_NGAY_NGHI',             'thao_tac_ngay_nghi',         '{"ngay_nhin_lai":30}',                              '>=',    1),
  ('TT_NGOAI_CA',              'thao_tac_ngoai_ca',          '{"ngay_nhin_lai":30}',                              '>=',    120)
) as d(ma_loi, phep_do, tham_so, toan_tu, nguong)
  join loai_loi ll on ll.ma = d.ma_loi
 where not exists (select 1 from dieu_kien_loi);
