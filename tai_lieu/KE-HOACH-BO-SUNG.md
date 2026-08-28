# Kế hoạch bổ sung — ra/vào văn phòng, cảnh báo HR, OT theo đơn, tự duyệt nghỉ phép

> ## Đối chiếu với mã hiện tại — 28.08.2026, sau v1.52.0
>
> Kế hoạch gốc viết dựa trên ảnh chụp mã **trước v1.52.0**. Đã kiểm lại từng tuyên bố; ba chỗ lỗi
> thời đã sửa thẳng trong thân (mục 0, mục 4). Tóm tắt trạng thái sáu yêu cầu:
>
> | Yêu cầu | Trạng thái | Ghi chú |
> |---|---|---|
> | OT chỉ tính khi có đơn duyệt | **Lõi XONG (v1.52.0)** | Còn: duyệt đơn tự tính lại + hệ số Điều 98 |
> | Giờ đến / ra về / về sớm | Gần đúng, cần mốc từ `ca_lam.gio_ra` | Ca thật đã 17:30 |
> | Chiều quét vào/ra, thời gian rời VP, cảnh báo ra vào không quét | **Chưa có** | Mục 1, 2, 4 — cần `thiet_bi.chieu` |
> | Danh mục cảnh báo cho HR trên dashboard | **Chưa có** (lớp mới, không đụng `vi_pham`) | Mục 3 |
> | Tính thời gian rời VP trong bảng công | **Chưa có** | Mục 2.5 |
> | Đơn nghỉ phép: hạn 07:30, hết phép = không phép, tự duyệt | **Chưa có** | Mục 5 — dùng LUẬT, không dùng AI |
>
> **Điều kiện tiên quyết chưa xong** (mục 1 của kế hoạch): phải đo trước hai đầu đọc là "cổng
> vào / cổng ra" thật hay chỉ là hai đầu đọc sát nhau người ta quẹt cả hai. Script
> `trien_khai/kiem_chieu_ra_vao.sql` (đã đẩy hôm nay) trả lời câu này. **Chưa chạy** — mọi thứ ở
> mục 1–4 phụ thuộc kết quả đó, nên đó là việc đầu tiên.
>
> **Hai quyết định của chủ công ty vẫn treo** (mục 7): (1) phút ra ngoài có trừ công không;
> (2) đơn nghỉ nộp sau 07:30 thì tự từ chối hay chuyển người. Cộng ba câu về ngưỡng tự duyệt phép
> (số ngày tối đa tự duyệt, đơn ngày mai có tự duyệt không, hạn nộp cho nghỉ nửa ngày chiều).
>

Tệp này đặt vào `tai_lieu/KE-HOACH-BO-SUNG.md` (tên theo quy ước repo: không dấu, chữ hoa,
gạch nối — `CLAUDE.md` mục *Đặt tên*).

Bản 0.1 — 28.08.2026. Viết sau khi đọc `may_chu/src/cong/quy_tac_tinh_cong.ts`,
`tinh_cong.ts`, `vi_pham/phat_hien.ts`, `don_tu/*`, `dashboard/theo_vai_tro.ts`,
`tuyen/toi.ts` và 26 tệp migration hiện có.

---

## 0. Chốt trước khi đọc tiếp: 4 điều repo đang làm khác với yêu cầu

| # | Yêu cầu của bạn | Code hiện tại | Khoảng cách |
|---|---|---|---|
| 1 | Quét đầu tiên = giờ đến; quét sau 17h30 = ra về; quét cuối trước 17h30 = về sớm | `tinh_cong_ngay` lấy `quet[0]` và `quet[cuối]`, về sớm = `gio_ra_ca − gio_ra − dung_sai` | **Gần đúng**. Mốc phải lấy từ `ca_lam.gio_ra`. Ca 'Hành chính (theo HĐLĐ)' trên **CSDL thật đã là 17:30** (đặt khi gán ca); chỉ `seed.ts` còn để ca mẫu 'Hanh chinh' ở 17:00 |
| 2 | Phân biệt log cửa vào / cửa ra, suy ra thời gian rời văn phòng, phát hiện ra vào không quét | **Không có** khái niệm chiều quét. `thiet_bi` chỉ có `vi_tri` (text tự do). `lan_quet.trang_thai` có mã Status ZKTeco nhưng bộ tính công **bỏ qua hoàn toàn** | Phải làm mới |
| 3 | Danh mục cảnh báo suy luận từ log cho HR | `vi_pham/phat_hien.ts` chỉ quét **7 chỉ số theo tháng** từ bảng công đã tính, không đọc log | Phải làm mới (lớp khác, không thay `vi_pham`) |
| 4 | Tính thời gian rời văn phòng trong mỗi bảng chấm công | `bang_cong_ngay` không có cột nào cho việc này | Phải làm mới |
| 5 | Gửi yêu cầu OT, duyệt xong mới tính | **PHẦN LÕI ĐÃ XONG ở v1.52.0** — `quy_tac_tinh_cong.ts` nay tính `phut_ot` = giao của giờ có mặt và đơn `lam_them` **đã duyệt**; không có đơn thì OT = 0 kèm chú thích. CÒN THIẾU: (a) duyệt đơn OT chưa tự tính lại bảng công (`quyet_don()` chỉ tính lại cho `cong_tac`); (b) hệ số OT theo Điều 98 (150/200/300%) | Thu hẹp còn hai việc nhỏ, không còn là 'đảo chính sách' |
| 6 | Đơn nghỉ phép, hạn 7h30, hết phép = không tính công, tự duyệt | Đơn nghỉ phép đã có, quỹ phép đã có (`nhan_vien.so_ngay_phep_nam`), **không có** hạn nộp, **không có** trạng thái nghỉ không phép, **không có** tự duyệt | Phải làm mới |

Hai điểm cần bạn quyết trước khi code (mục 7): mục 5 và mục 6 đều **đổi số tiền trả cho
người lao động**, nên không thể bật thẳng lên môi trường thật.

---

## 1. Nền tảng: chiều quét (điều kiện cần cho yêu cầu 2, 3, 4)

Không có chiều quét thì không suy ra được "đang trong hay đang ngoài văn phòng". Đây là
việc đầu tiên.

### 1.1 Khai chiều cho từng máy

```sql
-- may_chu/migrations/027_chieu_quet.sql
alter table thiet_bi
  add column if not exists chieu text not null default 'hai_chieu'
    check (chieu in ('vao','ra','hai_chieu'));

comment on column thiet_bi.chieu is
  'vao = may dat o cua vao, moi log deu la vao. ra = cua ra. '
  'hai_chieu = mot may cho ca hai chieu, suy tu ma Status cua ATTLOG.';
```

### 1.2 Suy ra chiều của một lần quét

Hàm thuần, đặt ở `may_chu/src/cong/chieu_quet.ts`:

```ts
export type Chieu = 'vao' | 'ra' | 'khong_ro';

/**
 * Status trong ATTLOG (xem 001_khoi_tao.sql):
 *   0 vao | 1 ra | 2 ra-nghi | 3 vao-nghi | 4 OT-vao | 5 OT-ra
 */
export function chieu_quet(chieu_may: string, status: number): Chieu {
  if (chieu_may === 'vao') return 'vao';
  if (chieu_may === 'ra') return 'ra';
  if (status === 0 || status === 3 || status === 4) return 'vao';
  if (status === 1 || status === 2 || status === 5) return 'ra';
  return 'khong_ro';
}
```

**Bẫy thật, phải xử lý đúng:** rất nhiều máy ZKTeco chạy chế độ mặc định luôn đẩy
`Status = 0` cho mọi lần quét. Nếu coi đó là "vào" thì mỗi buổi chiều cả công ty sẽ dính lỗi
`VAO_KHI_DANG_TRONG`. Quy tắc chống việc đó:

- `khong_ro` → **đảo trạng thái hiện tại** (đang trong thì thành ra, đang ngoài thì thành
  vào), gắn cờ `chieu_suy_doan = true`, và **không sinh cảnh báo lệch**.
- Chỉ máy khai `vao` / `ra`, hoặc máy thật sự đẩy Status khác 0, mới bật được cảnh báo lệch.
- Trang **Máy chấm công** phải hiện dòng: *"Máy này chưa khai chiều — hệ thống suy đoán,
  không phát hiện được ra vào không quét."*

Chiều là **suy ra lúc tính**, không ghi đè vào `lan_quet` (bảng đó append-only theo
`CLAUDE.md`). Đổi `thiet_bi.chieu` rồi bấm "Tính lại tháng" là ra kết quả mới.

### 1.2b Quy tắc trạng thái — chủ công ty chốt 28.08

Máy trạng thái chỉ đổi trạng thái **khi có log**. Không log thì trạng thái **giữ nguyên**. Ba
hệ quả, cả ba đều là ý chủ công ty muốn:

- **Trưa ở lại trong văn phòng, không quẹt** → không có log → vẫn TRONG. **Không cảnh báo.**
  Đây là ca phổ biến nhất, và nó *không* sinh báo giả vì đơn giản không có sự kiện nào.
- **Đang TRONG mà lại có log VÀO** (hoặc đang NGOÀI mà lại có log RA) → mâu thuẫn → cảnh báo
  `VAO_KHI_DANG_TRONG` / `RA_KHI_DANG_NGOAI`. Đây là bằng chứng có một lần ra/vào **không quẹt**.
- Không đoán giờ còn thiếu (mục 2.3): biết có lần không quẹt, nhưng không biết lúc mấy giờ, nên
  chỉ ghi cảnh báo, không cộng/trừ phút — bịa số là bịa vào bảng lương.

**Nỗi lo "báo giả hàng loạt" chỉ áp cho máy `khong_ro`** (máy đẩy Status=0 cho mọi lần, phải suy
đoán chiều). Với máy đó, một lượt về sau giờ trưa *trông giống* log-vào-khi-đang-trong dù người ta
không làm gì sai — nên máy đó **đảo trạng thái** thay vì cảnh báo. Với hai máy "cổng vào / cổng ra"
thật (chiều lấy từ **máy nào**, không từ Status), vấn đề này không tồn tại: log ở "Cổng vào" luôn
là vào, và cảnh báo mâu thuẫn là cảnh báo thật.

`kiem_chieu_ra_vao.sql` (mục 8, giai đoạn 0) là thứ quyết định hai máy của công ty thuộc loại nào.

---

## 2. Yêu cầu 1 + 2 + 4: máy trạng thái ra/vào trong ngày

### 2.1 Định nghĩa mốc, không hard-code

| Khái niệm | Lấy từ | Ghi chú |
|---|---|---|
| Mốc tan ca (17h30 của bạn) | `ca_lam.gio_ra` | **Seed đang là 17:00** → HR phải sửa ca "Hành chính" thành `17:30` trước khi chạy, nếu không cả công ty về sớm 30 phút trên giấy |
| Dung sai về sớm | `ca_lam.dung_sai_som_phut` | mặc định 5 |
| Khung "ra về" | `[gio_ra − dung_sai_som_phut, hết khung lấy quét)` | Quét chiều `ra` rơi vào đây = kết thúc ngày |

Hard-code `17:30` vào code là lỗi nặng: công ty có ca kho, ca lái xe, ca sáng thứ Bảy
(`ca_lam_theo_thu` đã có sẵn) — mỗi ca một mốc.

### 2.2 Hàm thuần mới

Đặt ở `may_chu/src/cong/ra_vao.ts`. Thuần — không CSDL, kiểm thử được từng kịch bản, đúng
tinh thần `quy_tac_tinh_cong.ts`.

```ts
export interface LanQuetCoChieu { thoi_diem: Date; chieu: Chieu; thiet_bi: string | null; }

export interface PhienRaNgoai {
  ra_luc: Date;
  vao_luc: Date | null;      // null = ra roi khong quay lai truoc moc tan ca
  phut: number;              // da tru phan giao voi gio nghi giua ca
  trong_gio_nghi: boolean;
}

export interface LoiQuet {
  ma: 'QUEN_QUET_VAO' | 'QUEN_QUET_RA' | 'VAO_KHI_DANG_TRONG' | 'RA_KHI_DANG_NGOAI'
    | 'QUET_TRUNG_LAP' | 'QUET_NGOAI_KHUNG';
  thoi_diem: Date;
  mo_ta: string;
}

export interface KetQuaRaVao {
  gio_den: Date | null;
  gio_ra_ve: Date | null;
  phien_ra_ngoai: PhienRaNgoai[];
  phut_ra_ngoai: number;          // tong, da tru phan trung gio nghi giua ca
  con_trong_van_phong: boolean;   // cuoi ngay van o trang thai TRONG
  loi: LoiQuet[];
}

export function suy_luan_ra_vao(
  quet: LanQuetCoChieu[], ngay: string, ca: CaLam | null,
): KetQuaRaVao;
```

### 2.3 Quy tắc chạy máy trạng thái

Trạng thái ban đầu: **NGOÀI**. Duyệt các lần quét theo thứ tự thời gian.

| Sự kiện | Trạng thái trước | Hành động |
|---|---|---|
| Quét bất kỳ, lần đầu tiên trong ngày | NGOÀI | `gio_den` = mốc này, **bất kể chiều** (đúng yêu cầu 1). Nếu chiều là `ra` → ghi lỗi `QUEN_QUET_VAO` nhưng vẫn nhận làm giờ đến |
| Chiều `vao` | NGOÀI | Đóng phiên ra ngoài đang mở → TRONG |
| Chiều `vao` | TRONG | **Lỗi `VAO_KHI_DANG_TRONG`** — người này đã ra mà không quét. Giữ TRONG |
| Chiều `ra`, thời điểm < mốc ra về | TRONG | Mở phiên ra ngoài → NGOÀI |
| Chiều `ra`, thời điểm < mốc ra về | NGOÀI | **Lỗi `RA_KHI_DANG_NGOAI`** — đã vào mà không quét. Giữ NGOÀI |
| Chiều `ra`, thời điểm ≥ mốc ra về | bất kỳ | `gio_ra_ve` = mốc này. **Kết thúc ngày**, các lần quét sau chỉ dùng để tính OT |
| Hết ngày, trạng thái = TRONG | — | **Lỗi `QUEN_QUET_RA`**, `gio_ra_ve = null` |
| Hết ngày, còn phiên ra ngoài mở và chưa có `gio_ra_ve` | — | Lần quét `ra` đó **trở thành** `gio_ra_ve` → tính về sớm (đúng yêu cầu 1) |

Hai lỗi `VAO_KHI_DANG_TRONG` / `RA_KHI_DANG_NGOAI` **không được đoán ra giờ còn thiếu**.
Không biết người đó ra lúc mấy giờ thì không cộng phút ra ngoài — chỉ ghi lỗi và để HR đối
chiếu camera hoặc yêu cầu giải trình. Bịa một con số vào bảng công là bịa vào bảng lương.

### 2.4 Trừ phút ra ngoài — chỗ dễ sai nhất

`phut_lam` hiện tính bằng: kẹp trong khung ca → trừ giờ nghỉ giữa ca. Nếu cộng thẳng
`phut_ra_ngoai` vào phép trừ thì **giờ nghỉ trưa bị trừ hai lần** với người quét ra lúc
12:00 và vào lúc 13:00.

Công thức đúng, dùng `phut_giao_nhau()` sẵn có trong `tien_ich/thoi_gian.ts`:

```
phut_ra_ngoai_tinh_tru = Σ ( phut_giao_nhau(phien.ra, phien.vao, ca_bat_dau, ca_ket_thuc)
                            − phut_giao_nhau(phien.ra, phien.vao, nghi_tu, nghi_den) )

phut_lam = max(0, kep_trong_ca − nghi_giua_ca − phut_ra_ngoai_tinh_tru)
```

Phiên nằm **trọn** trong giờ nghỉ giữa ca: `trong_gio_nghi = true`, hiện trên bảng công cho
minh bạch nhưng **không trừ công**.

### 2.5 Cột và bảng mới

```sql
-- may_chu/migrations/028_ra_ngoai_van_phong.sql
alter table bang_cong_ngay
  add column if not exists phut_ra_ngoai   int not null default 0 check (phut_ra_ngoai >= 0),
  add column if not exists so_lan_ra_ngoai int not null default 0 check (so_lan_ra_ngoai >= 0),
  add column if not exists so_loi_quet     int not null default 0 check (so_loi_quet >= 0);

create table if not exists phien_ra_ngoai (
  id             uuid primary key default gen_random_uuid(),
  nhan_vien_id   uuid not null references nhan_vien(id) on delete cascade,
  ngay           date not null,
  ra_luc         timestamptz not null,
  vao_luc        timestamptz,
  phut           int not null default 0,
  trong_gio_nghi boolean not null default false,
  suy_doan       boolean not null default false,   -- chieu do he thong doan, may chua khai
  unique (nhan_vien_id, ngay, ra_luc)
);
create index if not exists phien_ra_ngoai_nv_ngay_idx on phien_ra_ngoai(nhan_vien_id, ngay);
```

`phien_ra_ngoai` là **bảng dẫn xuất**: mỗi lần `tinh_lai_ngay` chạy thì `delete` theo
(nhân viên, ngày) rồi ghi lại, trong cùng transaction với `bang_cong_ngay`. Nguồn sự thật
vẫn là `lan_quet`.

### 2.6 Sửa vào code đang chạy

| Tệp | Sửa gì |
|---|---|
| `cong/quy_tac_tinh_cong.ts` | `DauVaoTinhCong.quet` đổi từ `Date[]` sang `LanQuetCoChieu[]`. Nhánh 7 gọi `suy_luan_ra_vao()`, lấy `gio_den` / `gio_ra_ve` thay cho `quet[0]` / `quet[cuối]`. `KetQuaTinhCong` thêm `phut_ra_ngoai`, `so_lan_ra_ngoai`, `loi` |
| `cong/tinh_cong.ts` | Truy vấn `lan_quet` join `thiet_bi` để lấy `chieu`; ghi thêm 3 cột mới + `phien_ra_ngoai`; đẩy `loi` sang bộ cảnh báo (mục 3) |
| `su_kien/hop_thu_di.ts` | Sự kiện `bang_cong.da_chot` thêm `phut_ra_ngoai` để ERP nhận được |
| `web/src/trang/bang_cong.tsx` | Thêm cột "Ra ngoài" (`2 lần · 47 phút`), bấm vào mở chi tiết từng phiên |
| `dien_thoai/app/(tabs)/bang-cong.tsx` | Như trên, dạng gọn |

**Bắt buộc theo `CLAUDE.md`:** sửa logic tính công thì phải thêm test. Tối thiểu 14 ca ở
`may_chu/test/ra_vao.test.ts`: ngày sạch không ra ngoài · ra 1 lần trong giờ · ra trọn giờ
nghỉ trưa · ra vắt qua giờ nghỉ trưa · ra rồi không quay lại (về sớm) · quét cuối sau mốc tan
ca · chỉ 1 lần quét · quét đầu ở cửa ra · vào khi đang trong · ra khi đang ngoài · máy
`hai_chieu` toàn Status 0 (không được sinh lỗi) · quét trùng lặp cách 20 giây · ca qua đêm ·
ngày lễ có ra ngoài.

---

## 3. Yêu cầu 3: danh mục cảnh báo cho HR

### 3.1 Vì sao là lớp mới, không nhét vào `vi_pham`

`vi_pham` là hồ sơ kỷ luật: có `loai_vi_pham`, có quy trình, và tệp `phat_hien.ts` ghi rõ
ranh giới pháp lý — máy chỉ ghi ở trạng thái `moi`, **BLLĐ 2019 Điều 122** đòi phải họp và
người lao động được giải trình. Cảnh báo vận hành thì khác: nó là *"chỗ này số liệu không
khớp, HR xem lại"*, phần lớn **không phải lỗi của ai** (máy lỗi, quên quét, khách vào cùng
cửa). Trộn hai thứ là biến một sự cố kỹ thuật thành một hồ sơ kỷ luật.

Cảnh báo có thể **nâng cấp** thành vi phạm: HR bấm "Lập vi phạm từ cảnh báo này". Chiều đi
một hướng, do người bấm.

### 3.2 Bảng

```sql
-- may_chu/migrations/029_canh_bao_cham_cong.sql
create table if not exists loai_canh_bao (
  ma        text primary key,
  ten       text not null,
  muc_do    text not null check (muc_do in ('thap','trung','cao','rat_cao')),
  nhom      text not null check (nhom in ('log','hanh_vi','don_tu','thiet_bi','rui_ro')),
  nguong    jsonb not null default '{}'::jsonb,
  -- Nhom `rui_ro` co han chot; ba nhom kia la su kien da xay ra, khong co han.
  co_han_chot boolean not null default false,
  -- Canh bao muc `rat_cao` KHONG duoc dong bang 'bo_qua' — xem muc 3.3b.
  cho_bo_qua  boolean not null default true,
  dang_bat  boolean not null default true,
  mo_ta     text,
  -- Dieu luat / dieu noi quy lam can cu. Hien thang tren giao dien cho HR.
  can_cu    text
);

create table if not exists canh_bao_cham_cong (
  id            uuid primary key default gen_random_uuid(),
  nhan_vien_id  uuid references nhan_vien(id) on delete cascade,
  thiet_bi_id   uuid references thiet_bi(id) on delete cascade,
  loai_ma       text not null references loai_canh_bao(ma),
  ngay          date not null,
  khoa_phu      text not null default '',   -- vd moc thoi gian, de mot ngay co nhieu canh bao cung loai
  muc_do        text not null,
  mo_ta         text not null,
  chi_tiet      jsonb not null default '{}'::jsonb,
  -- Ngay MAT QUYEN hoac bi phat neu khong lam gi. Chi nhom `rui_ro` co.
  han_chot      date,
  trang_thai    text not null default 'moi'
                check (trang_thai in ('moi','da_xem','da_xu_ly','bo_qua')),
  nguoi_xu_ly_id uuid references nguoi_dung(id) on delete set null,
  ghi_chu_xu_ly  text,
  -- Da bao len truong phong nhan su khi qua han ma chua ai dong.
  da_bao_len    boolean not null default false,
  tao_luc       timestamptz not null default now(),
  xu_ly_luc     timestamptz,
  unique (nhan_vien_id, ngay, loai_ma, khoa_phu)
);
create index if not exists canh_bao_han_chot_idx on canh_bao_cham_cong(han_chot)
  where han_chot is not null and trang_thai in ('moi','da_xem');
create index if not exists canh_bao_moi_idx on canh_bao_cham_cong(ngay desc)
  where trang_thai = 'moi';
```

`unique` + `on conflict do nothing` — theo đúng quy ước chống trùng của `CLAUDE.md`. Tính lại
bảng công nhiều lần **không** sinh cảnh báo trùng, và **không** ghi đè cảnh báo HR đã xử lý.

### 3.3 Danh mục cảnh báo

Nạp bằng `seed.ts`, HR sửa ngưỡng ở trang Cài đặt.

| Mã | Mức | Nhóm | Sinh khi | Ngưỡng mặc định |
|---|---|---|---|---|
| `QUEN_QUET_VAO` | cao | log | Lần quét đầu ngày ở cửa ra | — |
| `QUEN_QUET_RA` | cao | log | Cuối ngày còn trạng thái TRONG | — |
| `VAO_KHI_DANG_TRONG` | cao | log | Log vào khi đang trong ⇒ có lần ra không quét | — |
| `RA_KHI_DANG_NGOAI` | cao | log | Log ra khi đang ngoài ⇒ có lần vào không quét | — |
| `CHI_MOT_LAN_QUET` | cao | log | `gio_vao = gio_ra` | — |
| `QUET_TRUNG_LAP` | thấp | log | Hai lần quét cùng chiều cách nhau quá ngắn | 60 giây |
| `QUET_NGOAI_KHUNG` | thấp | log | Quét trước giờ vào ca quá xa, hoặc sau giờ ra ca quá xa | −3h / +6h |
| `RA_NGOAI_QUA_LAU` | trung | hành vi | Tổng phút ra ngoài trong ngày vượt ngưỡng | 90 phút |
| `RA_NGOAI_NHIEU_LAN` | trung | hành vi | Số lần ra ngoài trong ngày | ≥ 4 lần |
| `DI_MUON_LAP_LAI` | trung | hành vi | Số lần đi muộn trong tháng | ≥ 4 lần |
| `VE_SOM_LIEN_TIEP` | trung | hành vi | Số ngày liên tiếp về sớm | ≥ 3 ngày |
| `VANG_KHONG_DON` | cao | đơn từ | Trạng thái `vang` mà không có đơn nào trùm ngày | — |
| `NGHI_KHONG_PHEP` | cao | đơn từ | Trạng thái `nghi_khong_phep` (mục 5) | — |
| `TU_Y_BO_VIEC_5_NGAY` | rất cao | đơn từ | Số ngày `nghi_khong_phep` cộng dồn trong 30 ngày — **BLLĐ 2019 Điều 125.4** | ≥ 5 ngày |
| `OT_KHONG_DON` | trung | đơn từ | Có OT thực tế nhưng không có đơn `lam_them` đã duyệt | > 30 phút |
| `OT_VUOT_TRAN_THANG` | cao | đơn từ | Tổng OT tháng vượt **BLLĐ 2019 Điều 107** | > 40 giờ |
| `MAY_MAT_KET_NOI` | cao | thiết bị | Đã có ở `su_kien/giam_sat_may.ts`, chỉ nối vào bảng này | — |
| `MAY_CHUA_KHAI_CHIEU` | thấp | thiết bị | `thiet_bi.chieu = 'hai_chieu'` mà máy chỉ đẩy Status 0 | — |

`TU_Y_BO_VIEC_5_NGAY` là cảnh báo **rất cao** vì nó chạm tới quyền sa thải (Điều 125.4). Máy
**không** được tự kết luận — nó chỉ đếm ngày và bảo HR *"đủ điều kiện xem xét, đây là danh
sách ngày"*. Hình thức xử lý vẫn phải qua trình tự Điều 122.

### 3.3b Nhóm `rui_ro` — cảnh báo hậu quả cho HR

Mười tám loại ở bảng trên đều trả lời câu hỏi *"chuyện gì đã xảy ra"*. Chúng không đủ, vì
thứ làm HR mất tiền và mất quyền không phải một lần quên quét — mà là **một cái hạn trôi qua
mà không ai để ý**. Hợp đồng hết hạn 31 ngày là công ty mất quyền chấm dứt theo thời hạn, và
không có log nào báo chuyện đó vì chẳng có ai quét cái gì cả.

Nhóm `rui_ro` khác ba nhóm kia ở bốn điểm, và schema ở mục 3.2 đã có sẵn chỗ cho cả bốn:

| Khác biệt | Cách làm |
|---|---|
| Nhìn về phía trước | Có `han_chot`, hiện dạng đếm ngược *"còn 12 ngày"*, sắp xếp theo hạn gần nhất trước |
| Sinh lại mỗi ngày khi chưa xử lý | `khoa_phu` = tháng, không phải ngày. Một hợp đồng sắp hết hạn là **một** cảnh báo sống suốt kỳ, không phải 45 cảnh báo |
| Không được bấm "bỏ qua" | `cho_bo_qua = false` với mức `rat_cao`: chỉ đóng được bằng `da_xu_ly` kèm ghi chú bắt buộc |
| Quá hạn thì báo lên | Quá `han_chot` mà còn `moi`/`da_xem` → đặt `da_bao_len`, đẩy thông báo cho `truong_phong_nhan_su` và hiện ở lớp `he_thong` |

Mỗi loại khai `can_cu` để HR có sẵn điều luật khi lập hồ sơ, không phải đi tra lại.

| Mã | Mức | Hạn chót | Sinh khi | Hậu quả nếu để trôi | Căn cứ |
|---|---|---|---|---|---|
| `HDLD_SAP_HET_HAN` | cao | ngày hết hạn HĐ | Còn ≤ 45 ngày | Không kịp thương lượng ký mới | BLLĐ Đ45 |
| `HDLD_QUA_HAN_CHUA_KY` | **rất cao** | ngày hết hạn + 30 | HĐ xác định thời hạn đã hết, người vẫn đi làm, chưa ký HĐ mới | **HĐ tự chuyển thành không xác định thời hạn** — mất quyền chấm dứt theo thời hạn, vĩnh viễn | BLLĐ Đ20.2 |
| `THU_VIEC_SAP_HET` | cao | ngày hết thử việc | Còn ≤ 7 ngày | Hết hạn mà không thông báo kết quả thì người đó đương nhiên làm chính thức | BLLĐ Đ27 |
| `THU_VIEC_QUA_MUC` | **rất cao** | — | Thời gian thử việc vượt mức cho phép theo chức danh | Vi phạm hành chính, phải trả đủ lương phần vượt | BLLĐ Đ25 |
| `GIAY_PHEP_LAO_DONG_SAP_HET` | **rất cao** | ngày hết GPLĐ | Lao động nước ngoài, GPLĐ / thẻ tạm trú / visa còn ≤ 45 ngày | Người lao động thành **làm việc không phép**: phạt công ty, trục xuất người, và xin cấp lại mất nhiều tuần | NĐ 152/2020, sửa đổi bởi NĐ 70/2023 |
| `OT_SAP_CHAM_TRAN_THANG` | cao | cuối tháng | OT tháng đạt ≥ 90% mức 40 giờ | Còn kịp điều người khác. Vượt rồi thì không lùi được | BLLĐ Đ107.2 |
| `OT_VUOT_TRAN_NAM` | **rất cao** | 31/12 | OT năm vượt 200 giờ (hoặc 300 giờ với ngành thuộc Đ107.3) | Vi phạm trần năm; mức 300 giờ còn phải thông báo cơ quan quản lý lao động | BLLĐ Đ107.3, Đ107.4 |
| `THIEU_NGHI_TUAN` | cao | — | 7 ngày liên tiếp không có ngày nghỉ ≥ 24 giờ liên tục | Vi phạm nghỉ hằng tuần | BLLĐ Đ111 |
| `NHOM_BAO_VE_LAM_THEM` | **rất cao** | — | Người thuộc diện được bảo vệ (mang thai từ tháng thứ 7, nuôi con dưới 12 tháng) có OT, ca đêm, hoặc đơn công tác xa | Vi phạm với nhóm được bảo vệ đặc biệt — nặng hơn vi phạm thường | BLLĐ Đ137 |
| `PHEP_NAM_TON_CUOI_NAM` | trung | 31/12 | Còn ≥ 5 ngày phép chưa nghỉ khi còn < 60 ngày tới cuối năm | Cả phòng dồn nghỉ tháng 12, hoặc phát sinh nghĩa vụ thanh toán | BLLĐ Đ113, Đ114 |
| `PHEP_TON_KHI_THOI_VIEC` | cao | ngày làm việc cuối | Có đơn thôi việc đã duyệt và còn phép chưa nghỉ | Phải thanh toán tiền những ngày chưa nghỉ — dễ bị bỏ sót khi tính lương chốt | BLLĐ Đ113.3 |
| `CHUA_BAO_TANG_GIAM_BHXH` | cao | ngày vào / ngày nghỉ + 30 | Có `ngay_vao` hoặc `ngay_nghi_viec` mới mà chưa đánh dấu đã báo | Truy thu và tiền chậm đóng | Pháp luật BHXH hiện hành |
| `KY_LUONG_DU_LIEU_BAN` | **rất cao** | ngày chốt lương | Trước ngày chốt còn: người chưa gán ca, chưa cấp PIN, log chưa map người, ngày chưa tính, hoặc đơn còn chờ duyệt trong kỳ | Chốt xong phát hiện sai thì phải **mở chốt** — mất dấu vết, và đây là loại tranh chấp bảng lương khó gỡ nhất | — |
| `DON_TREO_QUA_HAN` | cao | — | Đơn ở `cho_duyet` quá 3 ngày | Đơn nghỉ được duyệt **sau khi người ta đã nghỉ**; đến hạn chốt lương vẫn còn treo | — |
| `MAY_MAT_KET_NOI_KEO_DAI` | **rất cao** | — | Máy offline > 24 giờ | Bộ nhớ máy ZKTeco tràn thì **log cũ bị đè, mất vĩnh viễn** — không tính được công những ngày đó | — |
| `MAY_LECH_GIO` | cao | — | Lệch > 3 phút so với máy chủ | Sai giờ vào/ra của **mọi người** quét ở máy đó, phát hiện muộn thì phải tính lại cả tháng | — |
| `NOI_QUY_CHUA_KHAI` | trung | — | Có loại cảnh báo đang bật mà chưa nối tới điều khoản nội quy nào | Xử lý kỷ luật không có căn cứ nội quy → không dùng được ở bước lập biên bản | BLLĐ Đ118, Đ127 |

Bốn loại cuối (`KY_LUONG_DU_LIEU_BAN`, `DON_TREO_QUA_HAN`, `MAY_*`) không có căn cứ pháp lý —
chúng là **rủi ro vận hành**, và nằm cùng nhóm vì hậu quả cũng là mất tiền hoặc mất dữ liệu.
`KY_LUONG_DU_LIEU_BAN` nên chạy **hằng ngày từ 7 ngày trước ngày chốt**, mỗi ngày một lần, với
danh sách cụ thể tên ai thiếu gì — chứ không phải một con số.

**Việc quan trọng: nối vào cái đã có, không viết lại.**

| Loại | Lấy dữ liệu từ |
|---|---|
| `HDLD_*`, `THU_VIEC_*` | `hop_dong/nhac_han.ts` — đã chạy thật, đã có `muc_gap()` |
| `MAY_*` | `su_kien/giam_sat_may.ts` — đã có `da_canh_bao_offline` chống spam |
| `OT_*` | `don_tu/loai_don.ts` — đã có `canh_bao_tran_ot()` và hằng số `PHUT_OT_TOI_DA_THANG` |
| `NOI_QUY_CHUA_KHAI` | `noi_quy_lao_dong` (migration 016) |
| `PHEP_*` | `quy_phep()` trong `tuyen/toi.ts` và `quy_phep_nam()` trong `dashboard/theo_vai_tro.ts` — **hai bản đang trùng nhau**, nên gộp về một hàm dùng chung nhân dịp này |

`GIAY_PHEP_LAO_DONG_SAP_HET` là loại **chưa có dữ liệu để sinh**: hồ sơ nhân sự cần thêm nhóm
tệp và ba trường (số GPLĐ, ngày hết hạn GPLĐ, ngày hết hạn thẻ tạm trú/visa). Với THVN có
nhân sự và pháp nhân phía Trung Quốc thì đây là cảnh báo đắt nhất trong bảng — một GPLĐ hết
hạn là dừng người, không phải phạt tiền rồi thôi.

*Giới hạn: cột "Căn cứ" là dẫn chiếu để HR tra tiếp, không phải kết luận pháp lý, và không nêu
mức phạt cụ thể — mức phạt theo Nghị định 12/2022/NĐ-CP thay đổi theo hành vi và quy mô, nên
để bộ phận pháp chế xác nhận khi thật sự dùng đến.*

### 3.4 Nơi sinh cảnh báo

| Loại | Sinh ở đâu | Khi nào |
|---|---|---|
| Nhóm `log` | `cong/tinh_cong.ts`, từ `KetQuaRaVao.loi` | Mỗi lần tính lại ngày, cùng transaction |
| Nhóm `hành vi`, `đơn từ` | Tiến trình mới `canh_bao/quet_hang_ngay.ts`, gọi từ `su_kien/lich_chay.ts` | Sau 01:00, ngay sau `chot_ngay_hom_qua()` |
| Nhóm `thiết bị` | `su_kien/giam_sat_may.ts` | Theo chu kỳ giám sát sẵn có |
| Nhóm `rủi ro` | `canh_bao/quet_han_chot.ts`, gọi từ `su_kien/lich_chay.ts` | Một lần mỗi sáng, **trước giờ làm việc**. Kèm bước quét lại các cảnh báo quá `han_chot` để đặt `da_bao_len` |

### 3.5 Dashboard

Thêm vào `dashboard/theo_vai_tro.ts`, **đúng bốn lớp phân quyền đang có** — đây là dữ liệu
nhạy cảm về từng người, tuyệt đối không để lọt xuống lớp `toi`:

| Lớp | Thấy gì |
|---|---|
| `toi` (nhân viên) | Chỉ cảnh báo **của chính mình**, và chỉ nhóm `log` (*"Ngày 26/08 bạn quên quét ra — gửi đơn giải trình?"*). Kèm nút mở thẳng form giải trình |
| `phong` (trưởng phòng) | Cảnh báo của phòng mình, đếm theo mức độ, top 5 người nhiều cảnh báo nhất |
| `cong_ty` (nhân sự) | Toàn công ty: ô đếm theo mức độ, bảng cảnh báo mới, lọc theo loại/phòng/khoảng ngày, nút xử lý hàng loạt |
| `he_thong` (admin) | Thêm nhóm `thiết bị`, và số máy chưa khai chiều |

Payload mới ở lớp `cong_ty`:

```ts
export interface CanhBaoTongQuan {
  theo_muc_do: { rat_cao: number; cao: number; trung: number; thap: number };
  moi_hom_nay: number;
  chua_xu_ly_qua_7_ngay: number;     // canh bao bi bo quen
  top_loai: { ma: string; ten: string; so: number }[];
  nguoi_nhieu_nhat: { ma_nv: string; ho_ten: string; so: number }[];

  /** Nhom `rui_ro`, sap theo han gan nhat. Day la khoi dat len DAU trang. */
  sap_den_han: {
    loai_ma: string;
    ten: string;
    ma_nv: string | null;
    ho_ten: string | null;
    han_chot: string;
    so_ngay_con: number;     // am = da qua han
    muc_do: string;
    can_cu: string | null;
  }[];
  da_qua_han: number;        // rui ro da troi qua han ma chua ai dong
}
```

Hai ô đáng giá nhất trên màn hình nhân sự, và nên đặt trên cùng, trước mọi biểu đồ:

- **"Đã quá hạn"** — rủi ro đã trôi qua hạn chót mà chưa ai đóng. Con số này đúng ra phải
  luôn bằng 0; khác 0 là đã mất một cái gì đó.
- **"Chưa xử lý quá 7 ngày"** — cảnh báo bị bỏ quên. Hệ thống cảnh báo mà không ai đóng cảnh
  báo thì sau ba tháng nó thành một danh sách đỏ không ai đọc, và lúc đó nó tệ hơn không có,
  vì nó tạo cảm giác đã kiểm soát.

Khối `sap_den_han` cũng hiện ở lớp `phong` (lọc theo phòng) — trưởng phòng là người biết ai
sắp hết hợp đồng, ai đang mang thai, ai sắp hết giấy phép lao động, sớm hơn nhân sự.

---

## 4. Tính năng mới 1: OT phải có đơn duyệt

### 4.1 Chính sách hiện tại và chính sách mới

> **CẬP NHẬT 28.08 (sau v1.52.0):** phần "chỉ tính OT đã đăng ký" **đã làm rồi** trong
> `quy_tac_tinh_cong.ts` (`phut_lam_them_da_duyet`). Mục 4 dưới đây thu hẹp còn: (a) duyệt đơn xong
> thì tự tính lại bảng công, (b) tách hệ số OT theo Điều 98. Bảng cột `phut_ot_thuc_te`/`phut_ot_duyet`
> chỉ cần nếu muốn giữ song song hai con số; hiện `phut_ot` đã là 'OT theo đơn' nên có thể bỏ qua.

Thiết kế phần còn lại:

```sql
-- may_chu/migrations/030_ot_theo_don.sql
alter table bang_cong_ngay
  add column if not exists phut_ot_thuc_te int not null default 0,
  add column if not exists phut_ot_duyet   int not null default 0,
  add column if not exists don_lam_them_id uuid references don_tu(id) on delete set null;

-- `phut_ot` giu nguyen, tro thanh cot DUNG DE TRA LUONG.
alter table tham_so_luong
  add column if not exists ot_chi_tinh_khi_duyet boolean not null default false;
```

`ot_chi_tinh_khi_duyet` **mặc định `false`** — bật lên là một quyết định của bạn, không phải
tác dụng phụ của một lần `npm run di_tru`.

### 4.2 Công thức

```
phut_ot_thuc_te = nhu hien nay (thoi gian sau gio tan ca, neu vuot nguong_ot_phut cua ca)

phut_ot_duyet   = phut_giao_nhau( [gio_tan_ca, gio_ra_thuc_te],
                                  [don.gio_bat_dau, don.gio_ket_thuc] )

phut_ot (tra luong) = ot_chi_tinh_khi_duyet ? phut_ot_duyet : phut_ot_thuc_te
```

Dùng **phần giao**, không dùng `min` của hai tổng. Đơn xin 18:00–21:00 mà người về lúc 19:00
thì được 1 giờ. Đơn xin 18:00–20:00 mà người ở tới 22:00 thì cũng chỉ 2 giờ — phần vượt sinh
cảnh báo `OT_KHONG_DON` để HR xem có phải quên nộp đơn bổ sung không.

### 4.3 Sửa vào code

| Tệp | Sửa gì |
|---|---|
| `don_tu/nghiep_vu.ts` | `quyet_don()` hiện trả `tinh_lai = null` cho `lam_them`. Đổi: trả `{tu_ngay, den_ngay}` để duyệt xong là bảng công cập nhật ngay |
| `cong/tinh_cong.ts` | Truy vấn thêm đơn `lam_them` đã duyệt của ngày đó, truyền vào bộ quy tắc |
| `cong/quy_tac_tinh_cong.ts` | `DauVaoTinhCong` thêm `lam_them: {gio_bat_dau, gio_ket_thuc} \| null` và `ot_chi_tinh_khi_duyet: boolean` |
| `luong/tinh_luong.ts` | Không đổi — vẫn đọc `phut_ot`. Cả sự thay đổi nằm ở chỗ cột đó được điền thế nào |
| `web/src/trang/bang_cong.tsx` | Hiện **hai** cột: "OT thực tế" và "OT được duyệt", lệch nhau thì tô khác màu |

### 4.4 Hai việc kèm theo, nên làm cùng đợt

**Hệ số OT đang là một số duy nhất** (`phieu_luong.he_so_ot`, mặc định 1,5). **BLLĐ 2019 Điều
98** quy định ba mức khác nhau: ngày thường ít nhất 150%, ngày nghỉ hằng tuần ít nhất 200%,
ngày lễ/tết và ngày nghỉ có hưởng lương ít nhất 300%. Bộ tính công **đã biết** trạng thái ngày
(`nghi_tuan`, `ngay_le`), nên chỉ còn thiếu ba cột hệ số:

```sql
alter table tham_so_luong
  add column if not exists he_so_ot_ngay_thuong numeric(4,2) not null default 1.50,
  add column if not exists he_so_ot_nghi_tuan   numeric(4,2) not null default 2.00,
  add column if not exists he_so_ot_ngay_le     numeric(4,2) not null default 3.00;
```

Hiện trạng đang trả 150% cho cả OT ngày lễ — **thấp hơn mức luật định**. Đây là rủi ro thật khi
thanh tra lao động vào, không phải chuyện đẹp số liệu.

**Trần giờ làm thêm.** `canh_bao_tran_ot()` đã kiểm 40 giờ/tháng (Điều 107.2). Còn thiếu hai
trần nữa của cùng điều luật: không quá **50% số giờ làm việc bình thường trong một ngày**, và
**200 giờ/năm** (300 giờ/năm chỉ với các ngành nghề nêu tại Điều 107.3 và phải thông báo cho
cơ quan lao động). Thêm hai cảnh báo cùng kiểu — cảnh báo, **không chặn**, giữ nguyên lập luận
đã có trong `loai_don.ts`.

*Giới hạn hiểu biết: đây là dẫn chiếu điều luật, không phải ý kiến pháp lý. Trước khi đổi cách
trả tiền OT, nên để bộ phận nhân sự hoặc luật sư lao động xác nhận, nhất là phần Điều 107.3.*

---

## 5. Tính năng mới 2: đơn nghỉ phép có hạn nộp và tự duyệt

### 5.1 Trạng thái ngày mới

```sql
-- may_chu/migrations/031_nghi_khong_phep.sql
alter table bang_cong_ngay drop constraint if exists bang_cong_ngay_trang_thai_check;
alter table bang_cong_ngay add constraint bang_cong_ngay_trang_thai_check
  check (trang_thai in ('vang','co_mat','nghi_phep','ngay_le','nghi_tuan','cong_tac',
                        'nghi_khong_phep'));
```

Kèm sửa `TrangThaiNgay` trong `quy_tac_tinh_cong.ts` — migration 024 đã comment sẵn *"PHẢI
khớp TrangThaiNgay"*.

**Thứ tự ưu tiên mới** trong `tinh_cong_ngay`, chèn `nghi_khong_phep` **sau** `nghi_tuan`:

```
1. nghi_phep (don da duyet)     -> theo loai don
2. ngay_le                      -> 1 cong neu huong luong
3. nghi_tuan                    -> 0 cong
4. nghi_khong_phep              -> 0 cong    <-- MOI
5. cong_tac                     -> 1 cong
6. co_mat                       -> tinh day du
7. vang                         -> 0 cong
```

Đặt sau `nghi_tuan` là có chủ ý: nghỉ không phép **rơi vào ngày nghỉ tuần thì không có nghĩa
gì**, ngày đó vốn không phải đi làm.

Khác nhau giữa `vang` và `nghi_khong_phep`: `vang` = không có dữ liệu, chưa biết vì sao (có
thể là quên quét, máy hỏng). `nghi_khong_phep` = **đã có đơn** nhưng đơn bị từ chối vì hết
quỹ phép hoặc nộp muộn quá hạn, người lao động biết và vẫn nghỉ. Hai thứ này dẫn tới hai
đường xử lý khác nhau, nên không được gộp.

### 5.2 Hạn nộp đơn trong ngày

```sql
alter table tham_so_luong
  add column if not exists han_nop_don_trong_ngay time not null default '07:30',
  add column if not exists qua_han_xu_ly text not null default 'chuyen_nguoi'
    check (qua_han_xu_ly in ('chuyen_nguoi','tu_choi'));
```

So sánh `don_nghi_phep.tao_luc` với `moc_thoi_gian(tu_ngay, han_nop_don_trong_ngay)` — dùng
`tien_ich/thoi_gian.ts`, **không** dùng `getHours()`. `CLAUDE.md` ghi rõ lỗi này đã từng xảy ra
một lần và làm bảng công hiện 01:00 thay vì 08:00.

**Khuyến nghị: đặt `qua_han_xu_ly = 'chuyen_nguoi'`, không phải `'tu_choi'`.** Lý do:

- Người ốm đột xuất lúc 8h sáng là tình huống thật và thường xuyên. Máy tự từ chối là ép người
  đó đi làm khi đang ốm, hoặc thành nghỉ không phép.
- **BLLĐ 2019 Điều 115** cho nghỉ việc riêng có hưởng lương trong các trường hợp cụ thể (kết
  hôn 3 ngày, con kết hôn 1 ngày, bố mẹ/vợ chồng/con chết 3 ngày) — những việc này không báo
  trước được.
- Nghỉ ốm có giấy của cơ sở khám chữa bệnh là chế độ BHXH, không phải phép năm.

Hạn 7h30 vẫn có tác dụng đầy đủ: **quá hạn thì máy không tự duyệt**, đơn lên bàn trưởng phòng
và được đánh dấu `NOP_MUON` trên giao diện. Đó là kỷ luật hành chính mà không tạo rủi ro pháp lý.
Nếu bạn vẫn muốn tự từ chối, tham số đã có sẵn — chỉ cần khai điều này trong nội quy lao động
đã đăng ký (BLLĐ Điều 118).

### 5.3 Bộ tự duyệt — bằng code, không bằng AI

Hàm thuần ở `may_chu/src/don_tu/tu_duyet.ts`:

```ts
export interface NguCanhDuyet {
  hom_nay: string;
  gio_nop: Date;
  han_nop: Date;
  phep_con_lai: number;
  so_ngay_don: number;
  so_ngay_lam_viec_trong_don: number;     // tru ngay le va ngay nghi tuan cua ca
  ty_le_phong_da_nghi: number;            // 0..1, cua ngay dong nhat trong khoang don
  ngay_da_chot: boolean;
  co_don_trung: boolean;
  dang_co_ky_luat: boolean;
}

export type QuyetDinhTuDong = 'da_duyet' | 'tu_choi' | 'chuyen_nguoi';

export interface KetQuaTuDuyet {
  quyet: QuyetDinhTuDong;
  ma_quy_tac: string;       // quy tac NAO ra quyet dinh nay
  ly_do: string;            // cau tieng Viet cho nguoi doc
  diem_kiem: Record<string, unknown>;   // toan bo dau vao + ket qua tung buoc
}

export function tu_duyet_nghi_phep(don: DonNghiPhep, nc: NguCanhDuyet): KetQuaTuDuyet;
```

Chạy tuần tự, **quy tắc chặn đầu tiên thắng**:

| # | Mã quy tắc | Điều kiện | Kết quả |
|---|---|---|---|
| 1 | `DA_CHOT` | Ngày đã chốt bảng công | `tu_choi` |
| 2 | `TRUNG_DON` | Đã có đơn trùm khoảng ngày | `tu_choi` |
| 3 | `NOP_MUON` | Đơn cho hôm nay, nộp sau `han_nop` | theo `qua_han_xu_ly` (mặc định `chuyen_nguoi`) |
| 4 | `LOAI_CAN_CHUNG_TU` | Loại ∈ {`om`, `thai_san`, `ket_hon`, `hieu`} | `chuyen_nguoi` — cần giấy tờ, máy không đọc được |
| 5 | `HET_PHEP` | Loại `phep_nam` và `phep_con_lai < so_ngay_don` | `tu_choi`, kèm câu gợi ý nộp lại loại `khong_luong` |
| 6 | `DON_DAI` | `so_ngay_lam_viec_trong_don > nguong` (mặc định 3) | `chuyen_nguoi` |
| 7 | `PHONG_THIEU_NGUOI` | `ty_le_phong_da_nghi ≥ nguong` (mặc định 0,30) | `chuyen_nguoi` |
| 8 | `DANG_KY_LUAT` | Đang có vi phạm ở trạng thái đang xử lý | `chuyen_nguoi` |
| 9 | `DU_DIEU_KIEN` | Qua hết 8 bước trên | **`da_duyet`** |

Quy tắc 5 **không tự chuyển đơn sang loại không lương**. Đổi loại đơn là đổi tiền lương của
người ta mà họ chưa đồng ý — máy phải hỏi, không được quyết thay.

```sql
alter table don_nghi_phep
  add column if not exists nguon_quyet text not null default 'nguoi'
    check (nguon_quyet in ('nguoi','tu_dong')),
  add column if not exists ma_quy_tac text,
  add column if not exists diem_kiem jsonb;
```

`diem_kiem` lưu **toàn bộ đầu vào và kết quả từng bước**. Sáu tháng sau có tranh chấp, mở ra là
biết chính xác lúc đó quỹ phép còn bao nhiêu, phòng nghỉ mấy người, quy tắc nào ra quyết định.
Không có ô này thì tự duyệt là một hộp đen — và một hộp đen thì tệ hơn cảm tính, vì cảm tính
ít nhất còn hỏi được người quyết.

Ghi `nhat_ky_thao_tac` với `nguoi_dung_id = null`, `hanh_dong = 'tu_duyet_nghi_phep'`.

### 5.4 Về việc "dùng AI để duyệt cho khỏi cảm tính"

Khuyến nghị thẳng: **không để mô hình ngôn ngữ ra quyết định duyệt hay từ chối đơn.**

- Cùng một đơn, chạy hai lần có thể ra hai kết quả khác nhau. Đó không phải hết cảm tính — đó
  là cảm tính không ai chịu trách nhiệm.
- Khi có tranh chấp lao động, bạn phải trình được **căn cứ** của quyết định. "Mô hình đánh giá
  là không hợp lý" không phải căn cứ. Bảng chín quy tắc ở trên thì có.
- Quỹ phép, hạn nộp, mật độ phòng ban đều là **số**. Số thì so sánh được bằng `if`, không cần
  mô hình.

Chỗ AI thật sự có ích, và nên làm:

| Việc | Vì sao hợp |
|---|---|
| Phân loại lý do tự do thành nhãn (ốm / việc gia đình / du lịch / khác) | Chỉ là gợi ý hiển thị, sai cũng không đổi quyết định |
| Soạn câu trả lời cho nhân viên khi đơn bị từ chối | Người duyệt vẫn đọc và bấm gửi |
| Rà soát hằng tháng, chỉ ra bất thường HR nên xem (*"phòng Kho có 3 người luôn xin nghỉ đúng thứ Sáu"*) | Đầu ra là gợi ý cho người, không phải quyết định |
| Đọc ảnh giấy nghỉ ốm, trích ngày và cơ sở khám | Repo đã có OCR ở `hop_dong/trich_noi_dung.ts`, dùng lại được |

Ranh giới: **AI được đề xuất và tóm tắt, code ra quyết định, người chịu trách nhiệm.**

### 5.5 Nghỉ vượt quỹ phép

Yêu cầu của bạn: *"quá ngày nghỉ phép thì là nghỉ không phép, không tính công"*.

- Đơn bị từ chối vì `HET_PHEP` → nhân viên vẫn nghỉ → ngày đó trạng thái `nghi_khong_phep`,
  `so_cong = 0`. HR bấm đánh dấu, hoặc hệ thống tự đặt khi có đơn bị từ chối vì hết phép trùm
  đúng ngày đó **và** không có lần quét nào.
- Sinh cảnh báo `NGHI_KHONG_PHEP`, và đếm dồn cho `TU_Y_BO_VIEC_5_NGAY`.
- **Không tính công là đúng luật** (không làm thì không trả lương). Nhưng *chế tài* thì khác:
  trừ thưởng, hạ xếp loại, hay kỷ luật đều phải có trong **nội quy lao động đã đăng ký** và
  theo trình tự **BLLĐ Điều 122**. Repo đã có bảng `noi_quy_lao_dong` (migration 016) — nên nối
  cảnh báo này sang đúng điều khoản nội quy để HR có sẵn căn cứ khi lập biên bản.

---

## 6. Ma trận rủi ro

| Rủi ro | Khả năng | Hậu quả | Cách chặn |
|---|---|---|---|
| Trừ phút ra ngoài làm giảm số công → giảm lương hàng loạt | cao | Rất nặng: trả thiếu lương cả công ty | Tham số `TRU_PHUT_RA_NGOAI` mặc định **tắt**. Chạy song song một kỳ lương, xuất bảng đối chiếu chênh lệch từng người, bật sau khi bạn duyệt |
| Máy chưa khai chiều → cảnh báo giả tràn màn hình | rất cao | HR mất niềm tin, bỏ qua cả cảnh báo thật | `khong_ro` không sinh cảnh báo lệch (mục 1.2). Bật cảnh báo lệch theo **từng máy** sau khi khai chiều |
| Ca hành chính seed là 17:00, thực tế 17:30 | chắc chắn xảy ra | Cả công ty về sớm 30 phút trên bảng công | Việc số 0 của đợt triển khai. Thêm bài kiểm khởi động cảnh báo nếu `ca_lam` còn nguyên giá trị seed |
| Đổi sang OT theo đơn → người không nộp đơn mất hết OT tháng đó | cao | Tranh chấp, mất lòng tin | Bật `ot_chi_tinh_khi_duyet` **sau** một tháng chạy chế độ chỉ báo cáo; thông báo trước; tháng đầu vẫn trả theo thực tế |
| Hệ số OT ngày lễ đang 1,5 thay vì 3,0 | đang xảy ra | Trả thiếu so với BLLĐ Điều 98 | Mục 4.4 — nên làm sớm, độc lập với các phần khác |
| Tự duyệt sai một đơn nghỉ ốm | trung bình | Ép người ốm đi làm | Loại `om` luôn `chuyen_nguoi` (quy tắc 4); quá hạn cũng `chuyen_nguoi` |
| Dữ liệu ra vào từng phút bị coi là giám sát quá mức | trung bình | Khiếu nại; rủi ro theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân | Khai rõ trong nội quy lao động (BLLĐ Điều 118) trước khi bật; nhân viên xem được dữ liệu của chính mình; đặt thời hạn lưu `phien_ra_ngoai` (đề xuất 24 tháng) |
| Cảnh báo sinh ra rồi không ai đóng | cao | Danh sách đỏ vô nghĩa sau 3 tháng | Ô "chưa xử lý quá 7 ngày" trên dashboard nhân sự (mục 3.5) |

*Các dẫn chiếu pháp lý ở đây là để định hướng thiết kế, không thay được ý kiến của luật sư lao
động. Ba chỗ nên hỏi trước khi chạy thật: hệ số OT ngày lễ, chế tài nghỉ không phép, và điều
khoản nội quy về đo thời gian rời văn phòng.*

---

## 7. Năm quyết định — chủ công ty CHỐT 28.08.2026

| # | Câu hỏi | Quyết định | Code dùng gì |
|---|---|---|---|
| 1 | Phút ra ngoài có trừ công? | **Phương án A — chỉ đo và hiện, KHÔNG trừ công** | `TRU_PHUT_RA_NGOAI = false`, cố định giai đoạn này |
| 2 | Đơn nộp sau hạn thì sao? | **Từ chối** (`qua_han_xu_ly = 'tu_choi'`) — trừ loại cần chứng từ, xem dưới | quy tắc `NOP_MUON` → `tu_choi` |
| 3 | Nghỉ dài mấy ngày thì người duyệt xem? | **≥ 3 ngày làm việc** | `nguong_don_dai = 3`, quy tắc `DON_DAI` → `chuyen_nguoi` |
| 4 | Hạn nộp đơn | **Trước giờ vào ca 30 phút**, tính trên ngày đầu của đơn | `han_nop = gio_vao_ca − 30 phút` |
| 5 | Nghỉ nửa ngày chiều | **Vẫn hạn 07:30** (không phải trước giờ nghỉ trưa) | dùng chung `han_nop` ở #4 — vì hạn bám giờ vào ca, không bám phần nghỉ |

**Câu 4+5 gộp thành một quy tắc gọn:** hạn nộp = **giờ vào ca − 30 phút**, so với ngày ĐẦU của
đơn. Ca hành chính vào 08:00 → hạn 07:30, đúng cho cả nghỉ cả ngày lẫn nghỉ nửa ngày chiều. Không
hard-code 07:30 — ca kho/lái xe vào giờ khác thì hạn tự dịch theo. Đơn cho ngày mai trở đi thì
`now` luôn trước hạn nên không bao giờ vướng `NOP_MUON` — đúng ý "báo trước 30 phút".

**Một ngoại lệ bắt buộc giữ, dù câu 2 chọn "từ chối":** loại đơn **cần chứng từ** (`om`,
`thai_san`, `ket_hon`, `hieu`) thì **không tự từ chối vì nộp muộn** — ốm đột xuất, hiếu hỉ không
báo trước 30 phút được (BLLĐ Điều 115). Các loại này luôn `chuyen_nguoi` cho người duyệt xem chứng
từ. Tức thứ tự quy tắc: `LOAI_CAN_CHUNG_TU` (chuyển người) đứng **trước** `NOP_MUON` (từ chối).
`NOP_MUON` chỉ áp cho `phep_nam` và `khong_luong`.

Hệ quả của câu 2 khớp đúng ý "quá ngày phép thì nghỉ không phép": đơn `phep_nam` nộp muộn bị từ
chối → người vẫn nghỉ → ngày đó `nghi_khong_phep`, 0 công. Cần **khai điều khoản hạn nộp vào nội
quy lao động đã đăng ký** (BLLĐ Điều 118) trước khi bật, vì tự từ chối là chế tài hành chính.

---

## 8. Thứ tự làm và tiêu chí xong

| Giai đoạn | Nội dung | Xong khi |
|---|---|---|
| **0** | HR sửa ca "Hành chính" thành 17:30; khai `chieu` cho từng máy | Truy vấn `select ten, gio_ra from ca_lam` ra 17:30; không máy nào còn `chieu = 'hai_chieu'` trừ máy thật sự hai chiều |
| **1** | `chieu_quet.ts` + `ra_vao.ts` + migration 027, 028; hiện cột "Ra ngoài" trên bảng công. **Chưa trừ công** | 14 bài kiểm ở mục 2.6 xanh; đối chiếu 1 tuần log thật, số phiên ra ngoài khớp với thực tế mắt thường |
| **2a** | Migration 029 + danh mục cảnh báo nhóm `log` / `hành vi` / `đơn từ` + tiến trình quét + dashboard 4 lớp | Chạy lại 3 lần trên cùng dữ liệu không sinh cảnh báo trùng; tài khoản `nhan_vien` gọi `/api/dashboard` **không** thấy dữ liệu người khác |
| **2b** | Nhóm `rui_ro` (mục 3.3b): nối `nhac_han.ts` + `giam_sat_may.ts`, thêm 3 trường giấy phép lao động vào hồ sơ, gộp hai bản `quy_phep` trùng nhau, khối "Sắp đến hạn" trên dashboard | Chạy trên dữ liệu thật của tháng trước, mọi hợp đồng sắp hết hạn đều có đúng một cảnh báo sống; ô "Đã quá hạn" đối chiếu khớp với danh sách HR tự rà bằng tay |
| **3** | Migration 030 + OT theo đơn + tách hệ số OT theo Điều 98 | Bảng đối chiếu OT thực tế / OT duyệt của một tháng thật; `ot_chi_tinh_khi_duyet` vẫn **tắt** |
| **4** | Migration 031 + hạn nộp + `tu_duyet.ts` + trạng thái `nghi_khong_phep` | 9 quy tắc có đủ bài kiểm; chạy chế độ "chỉ ghi đề xuất, không quyết" 2 tuần, đối chiếu với quyết định thật của trưởng phòng |
| **5** | Bật `ot_chi_tinh_khi_duyet`, bật tự duyệt, bật trừ phút ra ngoài (nếu chọn B/C) | Bạn ký duyệt bảng đối chiếu chênh lệch của từng giai đoạn |

Giai đoạn 1–4 **không đụng một đồng lương nào**. Toàn bộ thay đổi về tiền dồn vào giai đoạn 5
và chỉ bật bằng tham số, sau khi có bảng đối chiếu. Đây là điểm quan trọng nhất của kế hoạch
này: hệ thống đã chạy thật và đang trả lương cho 50 người, nên mọi thứ mới phải chạy song song
trước khi thay thế.

---

## 9. Tóm tắt tệp mới và tệp sửa

**Migration mới:** `027_chieu_quet.sql` · `028_ra_ngoai_van_phong.sql` ·
`029_canh_bao_cham_cong.sql` · `030_ot_theo_don.sql` · `031_nghi_khong_phep.sql`

**Mã nguồn mới:** `may_chu/src/cong/chieu_quet.ts` · `may_chu/src/cong/ra_vao.ts` ·
`may_chu/src/canh_bao/danh_muc.ts` · `may_chu/src/canh_bao/quet_hang_ngay.ts` ·
`may_chu/src/canh_bao/quet_han_chot.ts` · `may_chu/src/tuyen/canh_bao.ts` ·
`may_chu/src/don_tu/tu_duyet.ts` · `web/src/trang/canh_bao.tsx`

**Cần thêm dữ liệu, không chỉ code:** ba trường giấy phép lao động / thẻ tạm trú trong hồ sơ
nhân sự (cho `GIAY_PHEP_LAO_DONG_SAP_HET`), và cờ "đã báo tăng/giảm BHXH" (cho
`CHUA_BAO_TANG_GIAM_BHXH`). Không có hai thứ này thì hai cảnh báo đó không sinh được.

**Sửa:** `cong/quy_tac_tinh_cong.ts` · `cong/tinh_cong.ts` · `don_tu/nghiep_vu.ts` ·
`dashboard/theo_vai_tro.ts` · `tuyen/toi.ts` · `tuyen/don_tu.ts` · `su_kien/lich_chay.ts` ·
`csdl/seed.ts` · `web/src/trang/bang_cong.tsx` · `web/src/trang/dashboard.tsx` ·
`web/src/dinh_tuyen.tsx` · `web/src/huong_dan.ts` (có bài kiểm đòi mọi trang trong thanh điều
hướng phải có mục hướng dẫn) · `dien_thoai/app/(tabs)/bang-cong.tsx`

**Kiểm thử mới:** `may_chu/test/chieu_quet.test.ts` · `may_chu/test/ra_vao.test.ts` ·
`may_chu/test/canh_bao.test.ts` · `may_chu/test/tu_duyet.test.ts` và mở rộng
`may_chu/test/e2e.test.ts` cho luồng đơn OT và tự duyệt phép.
