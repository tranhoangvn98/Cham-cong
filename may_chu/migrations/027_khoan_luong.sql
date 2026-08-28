-- Cac KHOAN cua mot phieu luong: phu cap, ho tro, cac khoan tru.
--
-- VI SAO KHONG THEM COT: bang luong that cua cong ty (thang 7/2026) co 9 khoan thu nhap va 5
-- khoan tru — PC an trua, trang diem, trang phuc quy, gui xe, KPI, OT, doanh so rep ADS, tien
-- ung cho cong ty, tru di muon, da tam ung... Danh sach do DOI GAN NHU HANG THANG. Moi lan doi
-- ma phai them mot cot vao `phieu_luong` la moi lan mot di tru, mot lan sua giao dien, mot lan
-- sua bo tinh — va cot cu thi khong ai dam bo.
--
-- Mot bang danh muc + mot bang dong thi them khoan moi la THEM MOT DONG DU LIEU.
--
-- Va no giai duoc mot thu ma bang tinh khong giai duoc: bang tinh cua cong ty co nhung DONG MA
-- (khong ma nhan vien, khong ho ten) mang mot khoan thu nhap thu hai — "Luong HCM" 4.500.000 —
-- roi duoc cong vao dong chinh bang mot cong thuc rieng (`ROUND(AI12+AI13,-2)`). Mot khoan la
-- mot dong o day, khong phai mot dong ma trong bang.

create table if not exists khoan_luong (
  ma          text primary key,
  ten         text not null,
  loai        text not null check (loai in ('thu_nhap', 'tru')),

  -- Cach ra so tien:
  --   nhap_tay            — ke toan go so tien
  --   so_luong_x_don_gia  — so luong x don gia (PC an trua: 23 ngay x 30.000)
  --   nua_ngay_luong      — (luong mot ngay / 2) x so luong
  cach_tinh   text not null default 'nhap_tay'
              check (cach_tinh in ('nhap_tay', 'so_luong_x_don_gia', 'nua_ngay_luong')),
  don_gia     numeric(14,2),

  -- Khoan nay co tinh vao thu nhap chiu thue TNCN khong. Phu cap an trua duoi muc quy dinh va
  -- phu cap trang phuc trong han muc thi KHONG chiu thue — de sai o day la tinh sai thue cua
  -- ca cong ty.
  chiu_thue   boolean not null default true,

  thu_tu      int not null default 100,
  dang_dung   boolean not null default true,

  -- Canh bao hien ngay canh khoan tren giao dien. Dung cho cac khoan co rui ro phap ly.
  canh_bao    text,
  ghi_chu     text,
  tao_luc     timestamptz not null default now()
);

comment on table khoan_luong is
  'Danh muc cac khoan phu cap / khoan tru cua bang luong. Them khoan moi = them mot dong.';

create table if not exists phieu_luong_khoan (
  phieu_luong_id uuid not null references phieu_luong(id) on delete cascade,
  khoan_ma       text not null references khoan_luong(ma),
  so_luong       numeric(10,2),
  -- Don gia CHUP LAI tai thoi diem tinh, khong join lai luc xem: don gia trong danh muc doi
  -- sau do thi phieu da tra khong duoc phep tu doi so.
  don_gia        numeric(14,2),
  thanh_tien     numeric(14,2) not null default 0,
  ghi_chu        text,
  primary key (phieu_luong_id, khoan_ma)
);

create index if not exists phieu_luong_khoan_phieu_idx on phieu_luong_khoan(phieu_luong_id);

-- ---------------------------------------------------------------- them cot cho phieu luong

alter table phieu_luong
  -- Luong mot ngay cong = luong goc / cong chuan thang. Chup lai vi cac khoan "nua ngay luong"
  -- tinh tu no, va cong chuan thang doi theo thang.
  add column if not exists luong_ngay          numeric(14,2) not null default 0,
  -- Tong cac khoan (tu `phieu_luong_khoan`). Luu san de doc va xuat bang khong phai cong
  -- lai tung dong — nhung van la SO DAN XUAT: bo tinh ghi lai ca hai moi lan tinh.
  add column if not exists khoan_thu_nhap      numeric(14,2) not null default 0,
  add column if not exists khoan_tru           numeric(14,2) not null default 0,
  -- Phan thu nhap KHONG chiu thue TNCN (an trua trong han muc, trang phuc trong han muc,
  -- hoan tien ung ho cong ty...). Truoc ban nay he thong tinh thue tren TOAN BO thu nhap,
  -- tuc thu thue ca tren tien hoan ung — sai theo Thong tu 111/2013.
  add column if not exists thu_nhap_mien_thue  numeric(14,2) not null default 0,
  -- Bang luong cua cong ty lam tron den 100 dong (`ROUND(AI,-2)`) va TRA theo so da lam tron.
  add column if not exists thuc_linh_lam_tron  numeric(14,2) not null default 0,
  -- Loai hop dong DANG HIEU LUC luc tinh, chup lai theo `hop_dong_lao_dong.loai`. Bang cua
  -- cong ty tach ba cot luong goc rieng (chinh thuc / thu viec / thuc tap) roi cong lai —
  -- cung mot thong tin, nhung o day la mot cot phan loai chu khong phai ba cot tien.
  --
  -- Co y nghia phap ly: BLLD 2019 Dieu 98 quy dinh luong thu viec it nhat 85% luong chinh
  -- thuc, nen phai biet dong nao la thu viec moi doi chieu duoc.
  add column if not exists loai_hop_dong       text;

alter table tham_so_luong
  -- Cong chuan thang CO DINH. Bang cua cong ty de o mot o rieng (`D3 = 25`) va moi dong chia
  -- cho no. Trong bang do co dong chia cho 25, co dong chia 26, co dong chia 30, co dong chia
  -- cho chinh so cong thuc te — bon cach trong cung mot bang, tuc bon nguoi cung chuc danh
  -- nghi cung so ngay nhan bon so tien khac nhau.
  --
  -- 0 = DEM THEO LICH (so ngay lam viec that cua thang, tru ngay le). Do la mac dinh, va la
  -- hanh vi cu — de mac dinh 26 o day la lang le doi luong cua moi phieu da tinh.
  add column if not exists cong_chuan_thang    numeric(5,2) not null default 0
                                               check (cong_chuan_thang >= 0),
  -- Lam tron luong thuc linh den boi so nay. 0 = khong lam tron. Bang cua cong ty lam tron
  -- den 100 dong.
  add column if not exists lam_tron_den        numeric(14,2) not null default 0
                                               check (lam_tron_den >= 0);

-- ---------------------------------------------------------------- danh muc ban dau
--
-- Lay dung theo bang luong thang 7/2026 cua cong ty. `on conflict do nothing` de di tru chay
-- lai duoc va de khong de len phan ke toan da sua.

insert into khoan_luong (ma, ten, loai, cach_tinh, don_gia, chiu_thue, thu_tu, canh_bao, ghi_chu)
values
  ('pc_chung',        'Phụ cấp',                  'thu_nhap', 'nhap_tay',           null, true,  10, null, null),
  ('pc_an_trua',      'Phụ cấp ăn trưa',          'thu_nhap', 'so_luong_x_don_gia', 30000, false, 20, null,
   'Số lượng = số ngày làm việc được tính hỗ trợ ăn trưa. Không chịu thuế trong hạn mức theo Thông tư 111/2013 và mức bữa ăn giữa ca theo Thông tư 26/2016/TT-BLĐTBXH.'),
  ('pc_trang_diem',   'Phụ cấp trang điểm',       'thu_nhap', 'nhap_tay',           null, true,  30, null, null),
  ('pc_trang_phuc',   'Phụ cấp trang phục quý',   'thu_nhap', 'nhap_tay',           null, false, 40, null,
   'Phụ cấp trang phục bằng tiền không chịu thuế TNCN trong hạn mức 5 triệu/người/năm (Thông tư 111/2013 Điều 2).'),
  ('pc_gui_xe',       'Hỗ trợ gửi xe',            'thu_nhap', 'nhap_tay',           null, true,  50, null, null),
  ('pc_kpi',          'Thưởng KPI',               'thu_nhap', 'nhap_tay',           null, true,  60, null, null),
  ('pc_ot',           'Tiền làm thêm giờ',        'thu_nhap', 'nhap_tay',           null, true,  70, null,
   'Phần trả CAO HƠN lương giờ ngày thường thì được miễn thuế TNCN — phần chênh, không phải toàn bộ.'),
  ('pc_doanh_so',     'Doanh số rep ADS',         'thu_nhap', 'nhap_tay',           null, true,  80, null, null),
  ('hoan_ung_cty',    'Tiền ứng cho công ty',     'thu_nhap', 'nhap_tay',           null, false, 90, null,
   'Hoàn lại tiền nhân viên đã ứng ra chi hộ công ty. Là HOÀN TIỀN, không phải thu nhập — nên không chịu thuế và không tính vào lương đóng bảo hiểm.'),
  ('luong_dia_diem',  'Lương địa điểm khác',      'thu_nhap', 'nhap_tay',           null, true,  95, null,
   'Dòng thu nhập thứ hai của cùng một người (ví dụ "Lương HCM"). Trong bảng tính cũ đây là một DÒNG MA không có mã nhân viên, cộng vào dòng chính bằng công thức riêng.'),

  ('tru_phat',        'Trừ / phạt',               'tru',      'nhap_tay',           null, true,  10,
   'BLLĐ 2019 Điều 127 CẤM phạt tiền và cấm cắt lương thay cho xử lý kỷ luật lao động. Khoản này chỉ dùng cho các khoản trừ hợp pháp (bồi thường thiệt hại theo Điều 129, đã có biên bản).',
   null),
  ('da_tam_ung',      'Đã tạm ứng lương',         'tru',      'nhap_tay',           null, true,  20, null,
   'Tiền đã ứng trước trong tháng. Không phải khoản phạt.'),
  ('tru_di_muon',     'Trừ đi muộn',              'tru',      'so_luong_x_don_gia', 50000, true,  30,
   'BLLĐ 2019 Điều 127 khoản 3 CẤM phạt tiền thay cho xử lý kỷ luật. Cách hợp pháp là trừ CÔNG cho thời gian không làm việc, không trừ tiền theo lần.',
   'Số lượng = số lần đi muộn.'),
  ('tru_nua_ngay',    'Trừ nửa ngày lương do đi muộn', 'tru', 'nua_ngay_luong',     null, true,  40,
   'BLLĐ 2019 Điều 127 khoản 3. Trừ nửa ngày lương cho người ĐÃ ĐI LÀM là cắt lương thay kỷ luật. Hợp pháp thì phải ghi nhận nửa ngày công đó trên bảng chấm công, để nó tự vào lương theo ngày công.',
   'Số lượng = số lần đi muộn quá ngưỡng.'),
  ('tru_khac',        'Trừ khác',                 'tru',      'nhap_tay',           null, true,  90, null, null)
on conflict (ma) do nothing;
