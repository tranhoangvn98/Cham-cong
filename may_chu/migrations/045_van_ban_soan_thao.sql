-- Module: VĂN BẢN CÔNG TY thành TRÌNH SOẠN THẢO + BAN HÀNH THÔNG BÁO.
--
-- Trước đây "Văn bản công ty" chỉ là kho tải tệp lên (tiêu đề + danh mục + mô tả ngắn + tệp).
-- Ban giám đốc yêu cầu nó trở thành nơi SOẠN văn bản đầy đủ và BAN HÀNH:
--   - Soạn NỘI DUNG văn bản ngay trên hệ thống (không bắt buộc đính kèm tệp).
--   - SỐ HIỆU tự động (đã có sẵn cột `ma` = VB-000001, nay hiển thị rõ trên trình soạn).
--   - NGƯỜI BAN HÀNH (ai ký/ban hành — vd Giám đốc, Phòng HCNS).
--   - HÌNH THỨC / LOẠI văn bản (mở rộng `danh_muc`: thêm thông báo, quyết định, công văn).
--   - PHẠM VI gửi: cá nhân / phòng ban / toàn công ty.
--   - HÌNH THỨC GỬI: thông báo hệ thống (tạo bản ghi `thong_bao` liên kết, tái dùng chuông
--     báo + theo dõi đã đọc) và/hoặc email (qua Microsoft 365, fail-soft).
--
-- Tái dùng bảng `thong_bao` cho phần gửi hệ thống thay vì dựng lại bộ theo-dõi-đã-đọc — nên
-- `thong_bao` được mở rộng thêm phạm vi 'ca_nhan'.

-- ---------------------------------------------------------------- 1. thong_bao: thêm cá nhân
alter table thong_bao add column if not exists nhan_vien_id uuid references nhan_vien(id) on delete cascade;

-- Bỏ các ràng buộc CHECK cũ có nhắc `pham_vi` (enum phạm vi + ràng buộc ghép phong_ban_id),
-- rồi thêm lại bản có 'ca_nhan'. Tìm theo định nghĩa để không phụ thuộc tên tự sinh.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'thong_bao'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%pham_vi%'
  loop
    execute format('alter table thong_bao drop constraint %I', c.conname);
  end loop;
end $$;

alter table thong_bao add constraint thong_bao_pham_vi_ck
  check (pham_vi in ('toan_cong_ty','phong_ban','ca_nhan'));
-- phong_ban_id có ⟺ phạm vi phòng ban; nhan_vien_id có ⟺ phạm vi cá nhân.
alter table thong_bao add constraint thong_bao_muc_tieu_ck
  check ((pham_vi = 'phong_ban') = (phong_ban_id is not null)
     and (pham_vi = 'ca_nhan')  = (nhan_vien_id is not null));

-- ---------------------------------------------------------------- 2. van_ban_cong_ty: soạn thảo
alter table van_ban_cong_ty add column if not exists noi_dung        text;
alter table van_ban_cong_ty add column if not exists nguoi_ban_hanh  text;
alter table van_ban_cong_ty add column if not exists pham_vi         text not null default 'toan_cong_ty';
alter table van_ban_cong_ty add column if not exists phong_ban_id    uuid references phong_ban(id) on delete set null;
alter table van_ban_cong_ty add column if not exists nhan_vien_id    uuid references nhan_vien(id) on delete set null;
alter table van_ban_cong_ty add column if not exists gui_he_thong    boolean not null default false;
alter table van_ban_cong_ty add column if not exists gui_email       boolean not null default false;
alter table van_ban_cong_ty add column if not exists thong_bao_id    uuid references thong_bao(id) on delete set null;

-- Phạm vi hợp lệ. Không ghép cứng phong_ban_id/nhan_vien_id ở CHECK: các dòng cũ có
-- pham_vi mặc định 'toan_cong_ty' và hai cột kia null nên vẫn hợp lệ; ràng buộc theo phạm
-- vi được route kiểm (báo lỗi tiếng Việt rõ hơn cho người dùng).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'van_ban_pham_vi_ck') then
    alter table van_ban_cong_ty add constraint van_ban_pham_vi_ck
      check (pham_vi in ('toan_cong_ty','phong_ban','ca_nhan'));
  end if;
end $$;

-- Mở rộng danh_muc (loại/hình thức văn bản): thêm thông báo, quyết định, công văn.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'van_ban_cong_ty'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%danh_muc%'
  loop
    execute format('alter table van_ban_cong_ty drop constraint %I', c.conname);
  end loop;
end $$;
alter table van_ban_cong_ty add constraint van_ban_danh_muc_ck
  check (danh_muc in ('thong_bao','quyet_dinh','cong_van','noi_quy',
                      'bieu_mau','chinh_sach','huong_dan','khac'));

create index if not exists van_ban_ca_nhan_idx
  on van_ban_cong_ty(nhan_vien_id) where nhan_vien_id is not null;
create index if not exists van_ban_phong_ban_idx
  on van_ban_cong_ty(phong_ban_id) where phong_ban_id is not null;
