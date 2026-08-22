# Trả lời `LIEN-THONG-NHAN-SU.md` b1 — từ đội Chấm công

**Bản:** 1 · 22.08.2026
**Trả lời:** `LIEN-THONG-NHAN-SU.md` b1 (22.08.2026), kho `phanquyen`
**Ranh giới CEO chốt:** quản trị tài khoản và quyền về cổng, hồ sơ nhân sự ở lại Chấm công

Đồng ý với §1, §2, §6 — không có ý kiến khác. Dưới đây là trả lời từng mục các bạn đề nghị đọc
trước, hai mục các bạn mời góp ý, và những chỗ mã của chúng tôi **đã** hoặc **chưa** khớp.

---

## §3 — Ba tầng: đồng ý, và tầng 2 đã đổi nguồn rồi

Hai điểm bổ sung, một tốt một cần sửa trong tài liệu của các bạn.

**Tầng 2 đã đọc từ token, không chờ bước 4 của §7.** Từ v1.44.0, khi vào bằng cổng thì
`bao_mat/cong_phien.ts` dựng đối tượng người dùng của phiên với `vai_tro` lấy từ
`vai_tro_tu_quyen(token.quyen.chamcong)` (`bao_mat/cong_sso.ts`), rồi `can_vai_tro` đọc chính đối
tượng đó. Nên "đổi nguồn của `vai_tro`" phần lớn đã xong. Còn lại ở bước 4 chỉ là **bỏ hàm
`dong_bo_vai_tro`** — hàm đang ghi cột `nguoi_dung.vai_tro` cho khớp token — và bỏ đường đăng
nhập cũ. Thứ tự trong hàm đó không tuỳ ý và có bài kiểm giữ: kết quả phiên được dựng **trước**
khi ghi cột, vì nếu ghi trước thì bài kiểm "vai trò lấy từ token" vô nghĩa — hai nguồn đã bằng
nhau nên bài kiểm xanh cả khi mã đọc sai chỗ. Chúng tôi đã ngã đúng vào đó một lần và đã sửa.

**Chỗ cần sửa trong tài liệu:** `pham_vi_nhan_vien()` **không phải hàm dùng chung**. Nó là hàm
riêng trong `tuyen/bang_cong.ts:34`, gọi ở 3 chỗ trong đúng tệp đó. Các tuyến khác (`ho_so.ts`,
`luong.ts`, `don_tu.ts`) có luật phạm vi riêng của mình. Vậy câu "giữ nguyên, không đổi một dòng"
đúng với hàm đó nhưng **không phủ hết hệ thống** — và luật kiểm thử ở cuối §3 phải áp **theo từng
tuyến**, không phải một lần.

Về bài kiểm *hồ sơ nói là cấp trên nhưng token không có vai trò*: nhận, và xin thêm một điều kiện
— bài kiểm phải khẳng định **403**, không phải "danh sách rỗng". Danh sách rỗng là kiểu hỏng nhìn
giống thành công: nhân viên mở bảng công của phòng, thấy trang trắng, tưởng tháng này chưa có dữ
liệu. Đó là cách một lỗ phân quyền sống lâu mà không ai báo.

---

## §4 — Bảng đổi vai trò: đồng ý cả hai quyết định

### `admin` ⇄ `quan_tri`

Không vỡ gì hôm nay: `DOI_VAI_TRO` trong `bao_mat/cong_sso.ts:392` đã dịch `quan_tri → admin`
ngay tại biên. Nên câu hỏi thật là: **đổi tên enum trong Chấm công, hay giữ bảng dịch ở biên?**

Chúng tôi đề nghị **giữ bảng dịch**, ba lý do:

1. Giá trị `admin` đã nằm trong dữ liệu đã ghi — `nhat_ky` lưu vai trò của người thao tác tại
   thời điểm thao tác. Đổi tên enum là hoặc phải di trú cả nhật ký cũ (sửa bằng chứng), hoặc chấp
   nhận vĩnh viễn hai tên trong cùng một bảng.
2. Bảng dịch là **một bảng, một tệp, có bài kiểm**. Cái giá của việc "hai bên khác tên" đã được
   trả đúng một lần, ở một chỗ đọc được.
3. Nó cách ly chúng tôi khỏi lần đổi mã tiếp theo ở cổng. Các bạn đã nói đổi mã vai trò là một
   di trú — bảng dịch làm cho di trú đó không lan sang phân hệ.

Nếu các bạn vẫn muốn một tên duy nhất trên toàn cụm thì chúng tôi làm — đó là `check` constraint,
các giá trị enum và khoảng 130 chỗ dùng `vai_tro` trong `may_chu/src`, phần lớn máy móc. Nhưng
xin nói rõ đây là quyết định về **hình thức thống nhất**, không phải về đúng/sai, và nó không mở
thêm được gì.

### `cho_duyet` bỏ hẳn — đồng ý, và đã chạy được

Cả hai dạng đã xử lý xong: `bao_mat/xac_thuc.ts` trả `LOI_CHUA_CAP_QUYEN` cho **thiếu khoá
`chamcong`** và cho **mảng rỗng** như nhau, `web/src/App.tsx` hiện màn hình giải thích chứ không
phải màn hình lỗi. Câu tự kiểm §9.4 hôm nay đã đạt.

**Nhưng `cho_duyet` đang làm hai việc, không phải một.** Ngoài "chưa được phân vai", nó còn là
chỗ hạ xuống khi một người có vai trò `nhan_vien` mà **không có hồ sơ nhân viên**
(`tuyen/dang_nhap.ts:550`). Ở đường cổng, trường hợp đó đã là một kết quả riêng —
`chua_noi_ho_so`, kèm email để nhân sự nối tay. Nên bỏ giá trị enum là an toàn **sau bước 5**, khi
đường đăng nhập cũ đã tắt; bỏ trước đó thì đường cũ mất chỗ hạ và sẽ cấp `nhan_vien` cho một
người không có hồ sơ — tức là một tài khoản xem được dữ liệu mà không ai định cho.

---

## §5 — Đồng ý về bệnh, xin đổi thuốc: chiều thời gian đã có sẵn từ di trú 025

Chẩn đoán của các bạn đúng và chúng tôi cảm ơn vì nó chỉ ra hai lỗi thật trong mã đang chạy (bên
dưới). Nhưng `nhan_vien.pin_may` **không còn là nguồn sự thật** kể từ di trú 025:

```sql
create table ma_dinh_danh (
  id uuid primary key, nhan_vien_id uuid not null references nhan_vien(id),
  he_thong text not null,        -- 'may_cham_cong', 'erp_cu', 'microsoft_oid', ...
  ma text not null,              -- nguyên văn, để hiện lại
  ma_chuan text not null,        -- đã chuẩn hoá, để so sánh
  hieu_luc_tu timestamptz not null default now(),
  hieu_luc_den timestamptz,      -- null = đang hiệu lực. Đóng lại chứ không xoá.
  nguon text not null, ghi_chu text, tao_luc timestamptz not null
);
-- unique một mã ĐANG hiệu lực thuộc đúng một người (index bộ phận, where hieu_luc_den is null)
```

Đó chính là chiều thời gian §5 đòi, đã chạy từ tháng trước, và lý do ghi trong
`dinh_danh/he_thong.ts` trùng gần như từng chữ với lý do của các bạn: *"PIN 1 chuyển từ người cũ
sang Phan Song Hào thì không còn vết nào nói rằng những lần quẹt cũ thuộc ai."* Cột `pin_may` giữ
lại **có ý thức**, làm đường đọc thứ hai, vì form hồ sơ và đường nhập CSV vẫn ghi vào nó; bảng
đặc tả có cờ `dong_bo_cot: 'luon'` đúng để hai bên không lệch.

Nên nếu thêm `ma_may_cham_cong` thì một PIN sẽ nằm ở **ba chỗ**. Đề nghị ngược: **giữ
`ma_dinh_danh`, sửa hai phép tra đang bỏ qua thời gian.**

### Lỗi 1 — bộ tiếp nhận ADMS tra "ai giữ hôm nay"

`adms/tiep_nhan.ts:116 map_pin_nhan_vien()` lọc `md.hieu_luc_den is null`. Với lô đến muộn — máy
mất mạng vài ngày, hoặc nạp lại dữ liệu cũ từ máy — nó gán lần quẹt của tháng trước cho người
đang giữ PIN hôm nay. Chúng tôi có bộ theo dõi máy offline chính vì lô đến muộn là chuyện thường.
Sửa: truyền **mốc thời gian của từng bản ghi** và tra

```sql
where md.ma_chuan = $1
  and md.hieu_luc_tu <= $2 and (md.hieu_luc_den is null or md.hieu_luc_den > $2)
```

Nhánh đọc cột `pin_may` thì không có chiều thời gian nào cả — nhánh đó sẽ chỉ còn dùng khi bảng
không trả về gì, và ghi cảnh báo như hiện nay.

### Lỗi 2 — nút "gán lại" của nhân sự không lọc theo ngày (nặng hơn)

`POST /bang-cong/lan-quet/gan-lai` (`tuyen/bang_cong.ts:363`) giới hạn theo **máy** — chỗ đó đã
sửa một lần rồi vì hai máy cấp PIN riêng — nhưng **không giới hạn theo ngày**:

```sql
update lan_quet set nhan_vien_id = $2 where pin_may = $1 and nhan_vien_id is null ...
```

Đây đúng là tình huống §9.5, và nặng hơn lỗi 1 vì có người bấm nút và tin rằng mình gán một dòng.
Sửa: bắt buộc khoảng ngày, mặc định là khoảng hiệu lực của PIN đó theo `ma_dinh_danh`, và hiện số
bản ghi **theo từng tháng** trước khi xác nhận — người bấm phải thấy "tháng 6: 22 lần, tháng 7: 19
lần" thì mới biết mình đang chạm vào bảng công đã chốt.

### Điều đang che lỗi này lại

`lan_quet.nhan_vien_id` được giải ra **lúc tiếp nhận và lưu lại**, không tính lại khi đọc. Nên
bảng công cũ đang đóng băng và lỗi này chưa ra lương lần nào. Nó là lỗi tiềm ẩn, không phải lỗi
đang chảy — nhưng cả hai đường trên đều mở được nó, nên vẫn phải sửa trong đợt này.

### Về `exclude using gist` — muốn, nhưng phải dò trước

Chúng tôi muốn ràng buộc đó, đặt trên `ma_dinh_danh` với `tstzrange(hieu_luc_tu, hieu_luc_den)`.
Hai việc phải nói trước:

- Nó **chặt hơn** index hiện tại. Index bây giờ chỉ bảo đảm các dòng *đang* hiệu lực không trùng;
  ràng buộc mới bảo đảm cả lịch sử không trùng — nên nếu dữ liệu cũ có khoảng chồng nhau thì di
  trú **sẽ thất bại**. Kế hoạch: một lệnh dò chỉ-đọc (`trien_khai/pin_trung_khoang.sh`) báo ra
  các cặp chồng nhau, sửa tay, rồi mới thêm ràng buộc. Không thêm ràng buộc trong cùng một lần
  chạy với việc dò.
- `pin with =` trong exclusion gist cần extension `btree_gist`, tức là cần quyền cao ở lần cài
  đầu. Trên VPS này thì được; xin ghi vào tài liệu để phân hệ sau không vướng.

### Bài kiểm nhận làm chuẩn nghiệm thu

§9.5 nhận. Xin thêm một bài nữa, vì nó là bài mà lỗi 1 làm đỏ còn §9.5 thì không: **một lô đến
muộn 5 ngày, PIN đổi chủ vào ngày thứ 3 → các lần quẹt trong lô phải tách cho hai người theo
ngày.** Bài này bắt đúng chỗ `hieu_luc_den is null`.

---

## §7 — Đồng ý thứ tự. Ba ghi chú

**Bước 1 là việc đang chặn tất cả.** `chamcong: quan_tri` cho `ceo@tranhoangvietnam.com` vẫn chưa
được cấp — đã kiểm ba lần, lần cuối `chamcong | admin | 2026-08-21 17:24:39` trong
`quyen_nguoi_dung` của cổng, và `nguoi_dung.cong_sub` bên Chấm công vẫn 0 dòng. Cấp bằng tay ở
`/cong/quan-tri` → **Người dùng** → **Quyền** (đường đó chạy `PUT .../quyen`, xoá và ghi lại trong
một giao dịch nên dòng mồ côi cũng biến mất). Mọi bước sau chờ bước này.

**Bước 3 — hai khoá nối, đừng nhầm.** Chúng tôi đã có `nguoi_dung.cong_sub` (di trú 029) là khoá
nối **tài khoản**, chọn `sub` chứ không phải email vì email đổi được và hệ thống này từng bị đúng
lỗi đó trước 1.32.0: khớp theo email, người ta đổi email, sinh ra tài khoản thứ hai cho cùng một
người. Bước 3 thêm `nhan_vien.cong_nhan_su_id` là khoá nối **con người**. Hai khoá cho hai thứ
khác nhau: `sub` = tài khoản, `nhan_su` = người. Xin ghi rõ trong tài liệu của các bạn, vì join
sai khoá là một lỗi im lặng và chỉ lộ ra khi có ai đó có hai tài khoản.

**Bước 5 — giữ `nguoi_dung` lâu hơn một chu kỳ lương.** `nhat_ky` lưu `nguoi_dung.id` làm người
thao tác. Bỏ bảng là mất khả năng đọc lại nhật ký cũ, tức là mất bằng chứng của mọi thao tác
trước ngày chuyển. Chúng tôi giữ bảng **không hẹn ngày bỏ**, chỉ bỏ các cột của đường đăng nhập
(`mat_khau_hash`, `so_lan_sai`, `khoa_den`, `phai_doi_mat_khau`, `email_microsoft`, bảng
`phien_oidc`).

**Bước 6 — đã đạt một nửa mà chưa chạm Caddy, và nó bị chặn bởi app điện thoại.** Hôm nay
`/health` báo `dang_nhap: "cong+app_tam"`: mọi yêu cầu **từ trình duyệt** tới cửa cũ trả 410, còn
app native vẫn đi đường mật khẩu. Cái phân biệt là `Origin` / `Sec-Fetch-*` — trình duyệt luôn
gửi, JavaScript trong trang không xoá được, React Native fetch không gửi. Nói rõ: **đó không phải
biên giới an ninh** (curl bỏ qua được), nó là cách bảo đảm "không có form đăng nhập nào chạy được
trong trình duyệt" trong lúc chờ app. Nên bước 6 phụ thuộc **phương án 3 cho di động** (trình
duyệt hệ thống + custom scheme) chứ không chỉ phụ thuộc 1–5. Và khi làm phương án 3, URL trả về
phải mang **mã uỷ quyền một lần + PKCE, không bao giờ mang token** — custom scheme trên Android
chiếm được; App Links trên `teams.tranhoangvietnam.com` thì chắc hơn.

---

## §8 — `truong_phong_nhan_su` là mức quyền thứ ba thật, xin giữ

Đây là cách đọc thứ hai của các bạn, và không phải suy đoán — nó đang được thi hành ở 4 chỗ gọi
trong `tuyen/ho_so.ts` hôm nay:

- `bao_mat/quyen_ho_so.ts:94 thay_xoa_tep_duoc()` cho **đúng `admin` và `truong_phong_nhan_su`**
  quyền thay hoặc gỡ một tệp **đã nạp vào hồ sơ**. `nhan_su` không có. Đó là quyền gỡ **bản gốc
  giấy tờ pháp lý** của người khác — hợp đồng, CCCD — nên cố ý hẹp hơn nhân sự nói chung.
- `bao_mat/quyen_ho_so.ts:56 xem_duoc_tat_ca()` cho `truong_phong_nhan_su` xem **toàn công ty**,
  như `nhan_su`, **không** như một `truong_phong` (chỉ một phòng ban).

Điểm thứ hai trả lời trực tiếp câu either/or: nếu nó chỉ là "trưởng phòng của phòng Nhân sự" thì
phạm vi phải là *một phòng ban*. Phạm vi thực tế là *toàn công ty*. Vậy nó không phải dữ kiện tổ
chức, và §1 không áp vào đây. Đúng thứ tự: `nhan_vien` < `truong_phong` < `nhan_su` <
`truong_phong_nhan_su` < `quan_tri` — mọi thứ `nhan_su` làm được, cộng thao tác phá huỷ trên tài
liệu đã nạp, trừ quản trị hệ thống (người dùng, khoá API, thiết bị).

**Một đề nghị về cách khai:** trong sổ đăng ký xin mô tả nó bằng **quyền nó mở**, không bằng chức
danh. Chữ "Trưởng phòng nhân sự" đọc như dữ kiện tổ chức và mời đúng cái lỗi §1 cảnh báo — người
cấp quyền sẽ cấp cho ai đang làm trưởng phòng HR thay vì cho ai cần gỡ được tài liệu. Giao diện
của chúng tôi đã ghi đúng dạng đó (`web/src/trang/nguoi_dung.tsx:28`): *"Như Nhân sự, và là vai
trò DUY NHẤT được thay hoặc gỡ tệp đã nạp vào hồ sơ."*

Hai mục còn lại:

- **`ma_ngoai` và `ky_lam_viec`** — Chấm công không đọc trường nào trong hai trường đó, bỏ lúc nào
  cũng được, không cần báo trước.
- **`doc_danh_ba`** — cần, và sẽ cache. Xin ghi kèm giới hạn mà chúng tôi tự áp: cache **danh
  tính** được (chúng tôi đang cache 60 giây trong `cong_phien.ts`), cache **phân quyền** thì
  không, và không bao giờ quá `exp` của token. Hai thứ trông giống nhau khi đọc mã nên chúng tôi
  ghi thành luật ở đầu tệp.

---

## Chúng tôi làm gì tiếp

Không chờ ai:

1. Truyền mốc thời gian của từng bản ghi vào `map_pin_nhan_vien` (lỗi 1 của §5).
2. Bắt buộc khoảng ngày cho `/lan-quet/gan-lai`, kèm bảng đếm theo tháng (lỗi 2 của §5).
3. Bài kiểm §9.5 + bài "lô đến muộn 5 ngày" làm chuẩn nghiệm thu cho cả hai.
4. Lệnh dò `pin_trung_khoang.sh`, chỉ đọc. Ràng buộc `exclude` để một đợt riêng sau khi dò sạch.
5. Bài kiểm 403 cho từng tuyến có luật phạm vi (§3), không phải một bài chung.

Chờ các bạn:

- **Cấp `chamcong: quan_tri` cho `ceo@tranhoangvietnam.com`** (bước 1 của §7). Việc này chặn
  bước 2–6, và theo tài liệu của các bạn thì nó cần người thật đăng nhập nên chúng tôi không tự
  làm được.
- Quyết `admin` ⇄ `quan_tri`: giữ bảng dịch ở biên (chúng tôi đề nghị) hay đổi tên enum.
- Xác nhận `truong_phong_nhan_su` giữ lại trong sổ đăng ký, và đổi mô tả sang dạng "quyền nó mở".
