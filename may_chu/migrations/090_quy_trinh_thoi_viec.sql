-- Module: QUY TRINH THOI VIEC TU DONG (Dac ta ky thuat so 01/2026/DTKT-IT).
--
-- Mo hinh 2 cong nguoi + phan giua tu dong:
--   Cong 1: Admin duyet don thoi viec -> sinh quy_trinh_thoi_viec + checklist.
--   Giua:   nhan vien tick muc 'nhan_vien'; tien trinh nen tick muc 'tu_dong';
--           moi muc bat buoc xong -> tu dong sang san_sang_chot.
--   Cong 2: Admin duyet cuoi + chot lastday + chay script dung hoat dong -> da_khoa.
--
-- Moi rang buoc dung `check` o tang CSDL; chong trung bang unique + on conflict.

-- ---------------------------------------------------------------- quy trinh
create table if not exists quy_trinh_thoi_viec (
  id                 uuid primary key default gen_random_uuid(),
  don_tu_id          uuid not null unique references don_tu(id),
  nhan_vien_id       uuid not null references nhan_vien(id),
  loai_hop_dong      text not null,          -- chup luc sinh, khong le thuoc HD doi ve sau
  chuc_danh          text,                   -- de chon khuon ban giao
  ngay_lam_viec_cuoi date,                   -- lastday; nguon = don_tu.tu_ngay
  lastday_da_chot    boolean not null default false,
  khong_can_bao_truoc boolean not null default false,  -- D.35 khoan 2
  la_quan_ly_dn      boolean not null default false,   -- D.7 ND145/2020: bao truoc toi 120 ngay
  trang_thai         text not null default 'dang_thuc_hien'
     check (trang_thai in ('dang_thuc_hien','san_sang_chot','da_khoa','da_huy')),
  ly_do_nghi         text,
  admin_duyet1_id    uuid references nguoi_dung(id),
  admin_duyet1_luc   timestamptz,
  admin_duyet2_id    uuid references nguoi_dung(id),
  admin_duyet2_luc   timestamptz,
  -- Khoa nguyen tu cho tien trinh nen (for update skip locked).
  dang_xu_ly_luc     timestamptz,
  -- Canh bao do dashboard Admin "toi ngay nghi, ban giao chua xong" — toi da mot lan mot ngay.
  canh_bao_den_han_luc timestamptz,
  tao_luc            timestamptz not null default now(),
  cap_nhat_luc       timestamptz not null default now(),
  constraint chot_phai_co_lastday
    check (trang_thai <> 'da_khoa'
           or (lastday_da_chot and ngay_lam_viec_cuoi is not null))
);

create index if not exists quy_trinh_thoi_viec_nv_idx
  on quy_trinh_thoi_viec(nhan_vien_id);
create index if not exists quy_trinh_thoi_viec_tt_idx
  on quy_trinh_thoi_viec(trang_thai, tao_luc desc);
-- Tien trinh nen quet quy trinh dang thuc hien.
create index if not exists quy_trinh_thoi_viec_chay_idx
  on quy_trinh_thoi_viec(id) where trang_thai = 'dang_thuc_hien';

-- ---------------------------------------------------------------- muc checklist
create table if not exists muc_checklist (
  id               uuid primary key default gen_random_uuid(),
  quy_trinh_id     uuid not null references quy_trinh_thoi_viec(id) on delete cascade,
  ma_muc           text not null,
  nhom             text not null       -- 'nhan_vien'|'ban_giao'|'it_bao_mat'|'ke_toan'|'hr_phap_ly'
     check (nhom in ('nhan_vien','ban_giao','it_bao_mat','ke_toan','hr_phap_ly')),
  loai_tu_dong     text not null        -- 'nhan_vien'|'tu_dong'|'script_cuoi'
     check (loai_tu_dong in ('nhan_vien','tu_dong','script_cuoi')),
  tieu_de          text not null,
  bat_buoc         boolean not null default true,
  trang_thai       text not null default 'chua'
     check (trang_thai in ('chua','dang','xong','bo_qua')),
  bang_chung_tep_id uuid references ho_so_tep(id) on delete set null,
  ket_qua          jsonb,               -- so lieu do may tinh (luong/phep/tro cap/han bao truoc)
  xac_nhan_boi     uuid references nguoi_dung(id),
  xac_nhan_luc     timestamptz,
  ghi_chu          text,
  unique (quy_trinh_id, ma_muc)         -- chong trung muc
);

create index if not exists muc_checklist_qt_idx on muc_checklist(quy_trinh_id);

-- ---------------------------------------------------------------- ban giao
create table if not exists ban_giao (
  id                uuid primary key default gen_random_uuid(),
  quy_trinh_id      uuid not null references quy_trinh_thoi_viec(id) on delete cascade,
  bien_ban_tep_id   uuid references ho_so_tep(id) on delete set null,
  nguoi_nhan_id     uuid references nguoi_dung(id),   -- admin gan, nguoi nay ky ben nhan
  ky_nguoi_giao_id  uuid references nguoi_dung(id),
  ky_nguoi_giao_luc timestamptz,
  ky_nguoi_nhan_id  uuid references nguoi_dung(id),
  ky_nguoi_nhan_luc timestamptz,
  tao_luc           timestamptz not null default now(),
  cap_nhat_luc      timestamptz not null default now()
);

create table if not exists ban_giao_muc (
  id                uuid primary key default gen_random_uuid(),
  ban_giao_id       uuid not null references ban_giao(id) on delete cascade,
  mo_ta             text not null,
  bat_buoc          boolean not null default true,
  trang_thai        text not null default 'chua'
     check (trang_thai in ('chua','da_ban_giao')),
  nguoi_xac_nhan_id uuid references nguoi_dung(id),
  xac_nhan_luc      timestamptz,
  ghi_chu           text,
  unique (ban_giao_id, mo_ta)
);

create index if not exists ban_giao_qt_idx on ban_giao(quy_trinh_id);
create index if not exists ban_giao_muc_idx on ban_giao_muc(ban_giao_id);

-- ---------------------------------------------------------------- khuon checklist (seed phat sinh muc)
-- Them loai HĐ/muc moi chi bang seed, khong sua code luong.
create table if not exists khuon_checklist (
  id               uuid primary key default gen_random_uuid(),
  loai_hop_dong    text not null,
  ma_muc           text not null,
  nhom             text not null check (nhom in ('nhan_vien','ban_giao','it_bao_mat','ke_toan','hr_phap_ly')),
  loai_tu_dong     text not null check (loai_tu_dong in ('nhan_vien','tu_dong','script_cuoi')),
  bat_buoc         boolean not null default true,
  tieu_de          text not null,
  thu_tu           int not null default 100,
  unique (loai_hop_dong, ma_muc)
);

-- ---------------------------------------------------------------- khuon ban giao theo vi tri
create table if not exists khuon_ban_giao (
  id               uuid primary key default gen_random_uuid(),
  chuc_danh        text not null,   -- tu khoa khớp với nhan_vien.chuc_danh (lowercase)
  loai             text,            -- nhãn nhóm vị trí, để hiển thị
  mo_ta            text not null,
  thu_tu           int not null default 100
);

-- ---------------------------------------------------------------- nguong bao truoc theo loai HĐ
-- so_ngay = null: theo hop dong, khong chan (hoc_viec / cong_tac_vien).
create table if not exists khuon_han_bao_truoc (
  loai_hop_dong    text primary key,
  so_ngay          int check (so_ngay is null or so_ngay >= 0),
  ghi_chu          text
);

-- ---------------------------------------------------------------- cau hinh admin sua duoc
create table if not exists cau_hinh_thoi_viec (
  khoa             text primary key,
  gia_tri          text not null default '',
  ghi_chu          text
);

insert into cau_hinh_thoi_viec (khoa, gia_tri, ghi_chu) values
  ('email_dich_vu_bhxh',
   '', 'Email đơn vị dịch vụ BHXH nhận hồ sơ báo giảm/chốt sổ. Bắt buộc khai trước khi chạy Cổng 2.'),
  ('email_dich_vu_bhxh_cc',
   '', 'CC nội bộ (HR) khi gửi hồ sơ BHXH. Có thể để trống.'),
  ('email_chung_tu_thue',
   '', 'Email nhận chứng từ khấu trừ thuế TNCN. Để trống = dùng chung email dịch vụ BHXH.')
on conflict (khoa) do nothing;

-- ---------------------------------------------------------------- nap khuon han bao truoc
-- REQ-CL-02: thu_viec = 0 (D.27 k2 BLLD); thoi_vu/HD<12 thang = 3 ngay lam viec;
-- xac_dinh 12-36 thang = 30; khong_xac_dinh = 45; hoc_viec/cong_tac_vien theo hop dong
-- (khong chan); quan ly DN toi 120 ngay (D.7 ND145/2020) — co rieng la_quan_ly_dn.
insert into khuon_han_bao_truoc (loai_hop_dong, so_ngay, ghi_chu) values
  ('thu_viec',       0,   'Thử việc không cần báo trước — BLLĐ 2019 Điều 27 khoản 2'),
  ('hoc_viec',       null,'Theo hợp đồng — không chặn'),
  ('thoi_vu',        3,   'BLLĐ 2019 Điều 35.1 (HĐ dưới 12 tháng: 3 ngày làm việc)'),
  ('xac_dinh',       30,  'BLLĐ 2019 Điều 35.1 (HĐ 12–36 tháng: 30 ngày; dưới 12 tháng: 3 ngày)'),
  ('khong_xac_dinh', 45,  'BLLĐ 2019 Điều 35.1'),
  ('cong_tac_vien',  null,'Hợp đồng dịch vụ (BLDS) — theo hợp đồng, không chặn'),
  ('quan_ly_dn',     120, 'Điều 7 NĐ145/2020 — người quản lý doanh nghiệp báo trước tới 120 ngày')
on conflict (loai_hop_dong) do nothing;

-- ---------------------------------------------------------------- nap khuon checklist
-- Ma tran theo loai HĐLĐ (muc 7.2 cua dac ta): B = bat buoc, P = phat sinh (khong bat buoc),
-- - = khong ap dung.
insert into khuon_checklist
  (loai_hop_dong, ma_muc, nhom, loai_tu_dong, bat_buoc, tieu_de, thu_tu)
select v.loai, k.ma_muc, k.nhom, k.loai_tu_dong, (v.che_do = 'B'), k.tieu_de, k.thu_tu
from (
  values
    ('xac_nhan_lastday',      'nhan_vien',   'nhan_vien',  'Xác nhận ngày làm việc cuối',                    10),
    ('doc_huong_dan',         'nhan_vien',   'nhan_vien',  'Đọc hướng dẫn thủ tục thôi việc',                20),
    ('tra_tai_san',           'nhan_vien',   'nhan_vien',  'Trả tài sản (laptop, điện thoại, SIM, thẻ)',    30),
    ('thanh_ly_tam_ung',      'nhan_vien',   'nhan_vien',  'Thanh lý tạm ứng / công nợ nội bộ',              40),
    ('sao_luu_du_lieu',       'nhan_vien',   'nhan_vien',  'Gỡ dữ liệu cá nhân khỏi máy công ty',            50),
    ('ky_cam_ket_bao_mat',    'nhan_vien',   'nhan_vien',  'Ký cam kết bảo mật khi rời công ty',             60),
    ('ban_giao_ho_so',        'ban_giao',    'nhan_vien',  'Bàn giao hồ sơ / tài liệu nghiệp vụ',            70),
    ('ky_bien_ban_ban_giao',  'ban_giao',    'nhan_vien',  'Ký biên bản bàn giao (hai chiều)',               80),
    ('ban_giao_cong_viec_do', 'ban_giao',    'tu_dong',    'Bàn giao & chuyển giao việc đang dở',            90),
    ('kiem_tra_bao_truoc',    'hr_phap_ly',  'tu_dong',    'Kiểm tra thời hạn báo trước',                   100),
    ('quyet_toan_luong',      'ke_toan',     'tu_dong',    'Quyết toán lương thực tế',                      110),
    ('thanh_toan_phep',       'ke_toan',     'tu_dong',    'Thanh toán phép năm chưa nghỉ',                 120),
    ('tinh_tro_cap',          'ke_toan',     'tu_dong',    'Tính trợ cấp thôi việc',                        130),
    ('hen_quyet_toan_14n',    'hr_phap_ly',  'tu_dong',    'Đặt mốc quyết toán 14 ngày làm việc',           140),
    ('ra_qd_cham_dut',        'hr_phap_ly',  'script_cuoi','Ban hành Quyết định chấm dứt HĐLĐ',             150),
    ('chuyen_quyen_du_lieu',  'it_bao_mat',  'script_cuoi','Chuyển quyền OneDrive/SharePoint',               160),
    ('doi_mk_dung_chung',     'it_bao_mat',  'script_cuoi','Xoay mật khẩu dùng chung',                      170),
    ('thu_hoi_quyen_erp',     'it_bao_mat',  'script_cuoi','Thu hồi quyền ERP',                             180),
    ('chot_bhxh',             'hr_phap_ly',  'script_cuoi','Sinh hồ sơ báo giảm/chốt sổ BHXH',              190),
    ('chung_tu_thue',         'ke_toan',     'script_cuoi','Sinh chứng từ khấu trừ thuế TNCN',              200),
    ('tra_so_giay_to',        'hr_phap_ly',  'script_cuoi','Sinh giấy xác nhận quá trình đóng BHXH-BHTN',   210),
    ('khoa_tai_khoan',        'it_bao_mat',  'script_cuoi','Vô hiệu hóa đăng nhập + ERP + Microsoft 365',    220),
    ('luu_ho_so',             'hr_phap_ly',  'script_cuoi','Đóng hồ sơ, cập nhật danh sách lao động',        230)
) as k(ma_muc, nhom, loai_tu_dong, tieu_de, thu_tu)
join (
  values
    -- ma_muc                      thu_viec  hoc_viec  thoi_vu  xac_dinh  khong_xac_dinh  cong_tac_vien
    ('xac_nhan_lastday',            'B','B','B','B','B','B'),
    ('doc_huong_dan',               'B','B','B','B','B','B'),
    ('tra_tai_san',                 'B','B','B','B','B','B'),
    ('thanh_ly_tam_ung',            'B','B','B','B','B','B'),
    ('sao_luu_du_lieu',             'B','B','B','B','B','B'),
    ('ky_cam_ket_bao_mat',          'P','P','P','B','B','B'),
    ('ban_giao_ho_so',              'B','P','B','B','B','B'),
    ('ky_bien_ban_ban_giao',        'B','B','B','B','B','B'),
    ('ban_giao_cong_viec_do',       'B','B','B','B','B','B'),
    ('kiem_tra_bao_truoc',          '-','P','B','B','B','P'),
    ('quyet_toan_luong',            'B','B','B','B','B','P'),
    ('thanh_toan_phep',             '-','-','P','B','B','-'),
    ('tinh_tro_cap',                '-','-','P','B','B','-'),
    ('hen_quyet_toan_14n',          'B','B','B','B','B','P'),
    ('ra_qd_cham_dut',              'P','P','B','B','B','P'),
    ('chuyen_quyen_du_lieu',        'P','P','P','B','B','P'),
    ('doi_mk_dung_chung',           'P','-','P','B','B','P'),
    ('thu_hoi_quyen_erp',           'B','P','B','B','B','P'),
    ('chot_bhxh',                   'P','-','P','B','B','-'),
    ('chung_tu_thue',               'P','P','P','B','B','P'),
    ('tra_so_giay_to',              'P','P','P','B','B','-'),
    ('khoa_tai_khoan',              'B','B','B','B','B','B'),
    ('luu_ho_so',                   'B','B','B','B','B','B')
) as m(ma_muc, thu_viec, hoc_viec, thoi_vu, xac_dinh, khong_xac_dinh, cong_tac_vien)
  on m.ma_muc = k.ma_muc
cross join lateral (
  values
    ('thu_viec',       m.thu_viec),
    ('hoc_viec',       m.hoc_viec),
    ('thoi_vu',        m.thoi_vu),
    ('xac_dinh',       m.xac_dinh),
    ('khong_xac_dinh', m.khong_xac_dinh),
    ('cong_tac_vien',  m.cong_tac_vien)
) as v(loai, che_do)
where v.che_do in ('B', 'P')
on conflict (loai_hop_dong, ma_muc) do nothing;

-- ---------------------------------------------------------------- nap khuon ban giao
insert into khuon_ban_giao (chuc_danh, loai, mo_ta, thu_tu) values
  ('kinh doanh', 'Sale/CSKH', 'Danh sách khách phụ trách + công nợ', 10),
  ('sale',       'Sale/CSKH', 'Lô hàng / báo giá đang xử lý', 20),
  ('cskh',       'Sale/CSKH', 'Nhóm Zalo/WeChat khách – đối tác', 30),
  ('vận hành',   'Vận hành/điều xe', 'Đầu mối nhà xe Trung Quốc – Việt Nam', 10),
  ('điều xe',    'Vận hành/điều xe', 'Lịch xe đang chạy', 20),
  ('wuliu',      'Vận hành/điều xe', 'Cước chưa đối soát', 30),
  ('vận tải',    'Vận hành/điều xe', 'Vận đơn đang theo', 40),
  ('thủ tục',    'Thủ tục/hải quan', 'Tờ khai chưa hoàn tất', 10),
  ('hải quan',   'Thủ tục/hải quan', 'Hồ sơ ủy thác XNK đang mở', 20),
  ('xuất nhập khẩu', 'Thủ tục/hải quan', 'Đầu mối chi cục / đại lý', 30),
  ('thủ kho',    'Thủ kho', 'Chốt tồn kho', 10),
  ('kho',        'Thủ kho', 'Chìa khóa / quyền vào kho', 20),
  ('kế toán',    'Kế toán', 'Sổ sách & chứng từ', 10),
  ('kế toán',    'Kế toán', 'Quyền MISA (ERP3)', 20),
  ('kế toán',    'Kế toán', 'Chữ ký số / token', 30),
  ('kế toán',    'Kế toán', 'Công nợ đang theo dõi', 40),
  ('it',         'IT/ERP', 'Tài khoản quản trị', 10),
  ('erp',        'IT/ERP', 'Mật khẩu dùng chung (đổi ngay)', 20),
  ('công nghệ',  'IT/ERP', 'Tài liệu hệ thống', 30),
  ('quản lý',    'Quản lý', 'Thu hồi ủy quyền / giấy giới thiệu còn hiệu lực', 10),
  ('giám đốc',   'Quản lý', 'Con dấu (nếu giữ)', 20),
  ('trưởng',     'Quản lý', 'Thu hồi ủy quyền / giấy giới thiệu còn hiệu lực', 30),
  ('phó',        'Quản lý', 'Con dấu (nếu giữ)', 40);

-- ---------------------------------------------------------------- danh muc tai lieu moi
insert into danh_muc_tai_lieu (ma, ten, nhom, mo_ta, bat_buoc, chi_khi_nghi_viec, thu_tu) values
  ('qd_cham_dut_hd',     'Quyết định chấm dứt HĐLĐ',      'A', 'Do Cổng 2 quy trình thôi việc sinh ra', true,  true, 111),
  ('xac_nhan_bhxh',      'Xác nhận quá trình đóng BHXH-BHTN', 'E', 'Trả sổ / xác nhận khi chấm dứt HĐLĐ (Đ.48 k3 BLLĐ)', false, true, 310),
  ('chung_tu_tncn',      'Chứng từ khấu trừ thuế TNCN',   'E', 'Khi có yêu cầu (NĐ126/2020)', false, true, 320),
  ('ho_so_bao_giam_bhxh','Hồ sơ báo giảm / chốt sổ BHXH', 'E', 'Gửi đơn vị dịch vụ BHXH', false, true, 330)
on conflict (ma) do nothing;
