-- Module G: quan ly vi pham noi quy lao dong.
--
-- RANH GIOI PHAP LY — doc truoc khi them cot nao vao day:
--
-- BLLD 2019 Dieu 127 CAM: phat tien, cat luong thay cho ky luat lao dong. Vi vay bang
-- `vi_pham` KHONG co cot so tien, va he thong khong bao gio tu tru luong tu vi pham.
-- Cot `diem_tru_kpi` chi anh huong diem danh gia, khong dong toi bang luong.
--
-- BLLD 2019 Dieu 122: ky luat phai co hop, nguoi lao dong duoc quyen GIAI TRINH, phai lap
-- BIEN BAN. Vi the mot vi pham do he thong phat hien chi la 'moi' — phai co nguoi xac nhan
-- va nguoi lao dong duoc giai trinh truoc khi thanh ky luat. Khong co duong nao di thang
-- tu "may phat hien" den "da ky luat".
--
-- BLLD 2019 Dieu 124: chi bon hinh thuc ky luat — khien trach, keo dai thoi han nang luong
-- khong qua 6 thang, cach chuc, sa thai. Khong co hinh thuc nao khac.

-- ---------------------------------------------------------------- danh muc loai vi pham
create table if not exists loai_vi_pham (
  id              uuid primary key default gen_random_uuid(),
  ma              text not null unique,
  ten             text not null,
  mo_ta           text,
  nhom            text not null default 'khac'
                  check (nhom in ('gio_giac','noi_quy','an_toan','tai_san','thai_do','khac')),
  muc_do          text not null default 'nhe'
                  check (muc_do in ('nhe','trung','nang')),
  -- Hinh thuc ky luat DE XUAT khi vi pham nay duoc xac nhan. Chi de goi y cho nguoi
  -- quyet dinh; ban than no khong tu ap dung gi.
  ky_luat_de_xuat text check (ky_luat_de_xuat is null or ky_luat_de_xuat in
                  ('nhac_nho','khien_trach','keo_dai_nang_luong','cach_chuc','sa_thai')),
  -- Diem tru khi cham KPI. KHONG phai tien.
  diem_tru_kpi    numeric(6,2) not null default 0 check (diem_tru_kpi >= 0),
  dang_bat        boolean not null default true,
  tao_luc         timestamptz not null default now(),
  cap_nhat_luc    timestamptz not null default now()
);

-- ---------------------------------------------------------------- quy tac tu phat hien
-- Moi dong la mot dieu kien tren du lieu cham cong da tinh. Chay theo ky (thang).
create table if not exists quy_tac_vi_pham (
  id                uuid primary key default gen_random_uuid(),
  loai_vi_pham_id   uuid not null references loai_vi_pham(id) on delete cascade,
  ten               text not null,
  -- Chi so lay tu bang_cong_ngay gop theo thang. Danh sach dong (khong phai tu do) de
  -- khong bao gio phai noi chuoi vao SQL.
  chi_so            text not null check (chi_so in (
                      'so_lan_di_muon','tong_phut_muon','so_lan_ve_som','tong_phut_ve_som',
                      'so_ngay_vang','so_ngay_thieu_gio','so_lan_quen_quet')),
  toan_tu           text not null default '>=' check (toan_tu in ('>=','>','=','<=','<')),
  nguong            numeric(10,2) not null,
  dang_bat          boolean not null default true,
  ghi_chu           text,
  tao_luc           timestamptz not null default now()
);
create index if not exists quy_tac_vi_pham_loai_idx on quy_tac_vi_pham(loai_vi_pham_id);

-- ---------------------------------------------------------------- ban ghi vi pham
create table if not exists vi_pham (
  id                uuid primary key default gen_random_uuid(),
  nhan_vien_id      uuid not null references nhan_vien(id) on delete cascade,
  loai_vi_pham_id   uuid not null references loai_vi_pham(id) on delete restrict,

  -- nguoi: quan ly / nhan su ghi nhan. he_thong: quy tac tu phat hien.
  nguon             text not null default 'nguoi' check (nguon in ('nguoi','he_thong')),
  quy_tac_id        uuid references quy_tac_vi_pham(id) on delete set null,

  -- Ngay xay ra (vi pham do nguoi ghi) hoac ngay cuoi ky (vi pham he thong phat hien).
  ngay              date not null,
  -- Ky 'YYYY-MM' — de chan trung khi quy tac chay lai nhieu lan.
  ky                text check (ky is null or ky ~ '^\d{4}-\d{2}$'),

  mo_ta             text,
  -- So lieu lam can cu, de nguoi doc doi chieu ma khong phai tra lai bang cong.
  bang_chung        jsonb,

  -- moi -> nguoi lao dong giai trinh -> xac nhan hoac bac bo -> ky luat neu can.
  trang_thai        text not null default 'moi'
                    check (trang_thai in ('moi','cho_giai_trinh','da_xac_nhan','bac_bo','da_xu_ly')),

  -- BLLD 2019 Dieu 122 khoan 1 diem c: nguoi lao dong co quyen tu bao chua.
  giai_trinh        text,
  giai_trinh_luc    timestamptz,

  -- Hinh thuc ky luat DA AP DUNG (khac voi de xuat trong danh muc).
  ky_luat           text check (ky_luat is null or ky_luat in
                    ('nhac_nho','khien_trach','keo_dai_nang_luong','cach_chuc','sa_thai')),
  -- Bien ban hop xu ly ky luat. Khong co bien ban thi khong thanh ky luat.
  bien_ban_id       uuid references bien_ban_thoa_thuan(id) on delete set null,

  nguoi_ghi         uuid references nguoi_dung(id) on delete set null,
  nguoi_xu_ly       uuid references nguoi_dung(id) on delete set null,
  xu_ly_luc         timestamptz,
  ghi_chu           text,
  tao_luc           timestamptz not null default now(),
  cap_nhat_luc      timestamptz not null default now()
);
create index if not exists vi_pham_nhan_vien_idx on vi_pham(nhan_vien_id, ngay desc);
create index if not exists vi_pham_trang_thai_idx on vi_pham(trang_thai, ngay desc);

-- Mot quy tac chi sinh MOT vi pham cho moi nguoi moi ky. Khong co rang buoc nay thi chay
-- lai quy tac (hoac tinh lai bang cong) se de ra hang loat ban ghi trung.
create unique index if not exists vi_pham_he_thong_mot_lan
  on vi_pham(nhan_vien_id, quy_tac_id, ky)
  where nguon = 'he_thong' and quy_tac_id is not null and ky is not null;

-- ---------------------------------------------------------------- danh muc mac dinh
-- Bo khoi dau de he thong dung duoc ngay. Cong ty sua/them tuy noi quy cua minh.
insert into loai_vi_pham (ma, ten, mo_ta, nhom, muc_do, ky_luat_de_xuat, diem_tru_kpi)
select * from (values
  ('DI_MUON',      'Đi muộn nhiều lần',
   'Số lần đi muộn trong tháng vượt ngưỡng cho phép.', 'gio_giac', 'nhe', 'nhac_nho', 5),
  ('VE_SOM',       'Về sớm nhiều lần',
   'Số lần về sớm trong tháng vượt ngưỡng cho phép.', 'gio_giac', 'nhe', 'nhac_nho', 5),
  ('VANG_KHONG_PHEP', 'Vắng không phép',
   'Nghỉ không có đơn được duyệt.', 'gio_giac', 'trung', 'khien_trach', 15),
  ('QUEN_QUET',    'Quên quẹt thẻ nhiều lần',
   'Phải làm đơn giải trình nhiều lần trong tháng.', 'gio_giac', 'nhe', null, 3),
  ('VI_PHAM_NOI_QUY', 'Vi phạm nội quy lao động',
   'Ghi nhận thủ công bởi quản lý.', 'noi_quy', 'trung', 'khien_trach', 10),
  ('AN_TOAN',      'Vi phạm an toàn lao động',
   'Không dùng bảo hộ, thao tác không an toàn.', 'an_toan', 'nang', 'khien_trach', 20),
  ('TAI_SAN',      'Làm hư hỏng, mất tài sản',
   'Bồi thường theo Điều 129 BLLĐ, KHÔNG phải phạt tiền.', 'tai_san', 'nang', null, 20)
) as t(ma, ten, mo_ta, nhom, muc_do, ky_luat_de_xuat, diem_tru_kpi)
where not exists (select 1 from loai_vi_pham);

-- Quy tac mac dinh: TAT san. Nguong phai do cong ty tu chot theo noi quy da dang ky,
-- bat san bang con so tu nghi ra la de he thong ket toi nguoi that bang tieu chi khong ai duyet.
insert into quy_tac_vi_pham (loai_vi_pham_id, ten, chi_so, toan_tu, nguong, dang_bat, ghi_chu)
select l.id, q.ten, q.chi_so, '>=', q.nguong, false,
       'Ngưỡng gợi ý — phải đối chiếu nội quy lao động đã đăng ký của công ty rồi mới bật.'
  from loai_vi_pham l
  join (values
    ('DI_MUON',         'Đi muộn từ 5 lần/tháng',        'so_lan_di_muon',   5::numeric),
    ('VE_SOM',          'Về sớm từ 5 lần/tháng',         'so_lan_ve_som',    5::numeric),
    ('VANG_KHONG_PHEP', 'Vắng không phép từ 1 ngày',     'so_ngay_vang',     1::numeric),
    ('QUEN_QUET',       'Quên quẹt từ 3 lần/tháng',      'so_lan_quen_quet', 3::numeric)
  ) as q(ma, ten, chi_so, nguong) on q.ma = l.ma
 where not exists (select 1 from quy_tac_vi_pham);
