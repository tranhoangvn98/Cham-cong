# Nối chấm công vào cổng SSO nội bộ

Mục tiêu: nhân viên đăng nhập **một lần** ở `teams.tranhoangvietnam.com`, rồi vào chấm công mà
không gõ mật khẩu lần thứ hai. Chấm công **bỏ hẳn** đường đăng nhập riêng của nó.

Tài liệu này là phần việc của **chấm công**. Hợp đồng bảo mật của cổng (số liệu `iss`/`aud`,
sổ rủi ro R1–R16, 12 lệnh tự kiểm, checklist ký nhận) nằm ở tài liệu `BAOMATCONGSSO.md` do
quản trị cổng phát hành — đọc tài liệu đó để biết *vỡ thì mất gì*, đọc tài liệu này để biết
*trong kho mã này cái gì nằm ở đâu*.

---

## 1. Thứ tự — không được đảo

| Bước | Việc | Sửa gì | Rủi ro nếu làm sai |
|---|---|---|---|
| 1 | Xác minh token của cổng | chỉ mã của chấm công | chỉ chấm công không vào được |
| 2 | Khai phân hệ vào sổ đăng ký của cổng | phía cổng | chưa ai có quyền |
| 3 | **Bỏ đường đăng nhập riêng** | mã + webapp của chấm công | — |
| 4 | Bật cổng gác cho `/chamcong` | **Caddyfile dùng chung** | làm sập phân hệ của người khác |
| 5 | Chạy 12 lệnh tự kiểm, ký nhận | — | — |

Đảo bước 4 lên trước bước 3 là nhân viên đăng nhập **hai lần** — tệ hơn hiện tại. Bước 4 là
bước duy nhất chạm vào thứ đang chạy của người khác, nên nó ở cuối và có script riêng
(`/srv/cong/trien_khai/chan_duong.sh`) tự sao lưu, `caddy validate` và tự lùi.

> ### `/iclock/*` KHÔNG BAO GIỜ được gác
>
> Đây là rủi ro R9 của cổng, và với chấm công thì nó là rủi ro nặng nhất trong cả việc này.
> `/iclock/*` là đường **máy chấm công** gọi vào. Máy ZKTeco không có token, không đăng nhập,
> và firmware của nó coi mọi phản hồi 3xx là lỗi rồi **bỏ luôn lô dữ liệu đang gửi**. Gác
> đường đó nghĩa là: máy quẹt vẫn kêu bíp, nhân viên vẫn tưởng đã chấm công, mà dữ liệu không
> bao giờ tới máy chủ. Hậu quả xuất hiện ở **bảng lương**, chậm hơn cả tháng, và không có cách
> nào dựng lại.
>
> `chan_duong.sh` từ chối đường này, không hỏi lại. Đừng tìm cách đi vòng.
>
> Lớp bảo vệ của `/iclock/*` là **danh sách IP** (`ICLOCK_IP_CHO_PHEP`) cộng số máy, không
> phải cổng gác. Xem `tai_lieu/KET-NOI-MAY-ZKTECO.md`.

---

## 2. Bước 1 — xác minh token (ĐÃ XONG trong mã)

Tất cả nằm ở một tệp: [`may_chu/src/bao_mat/cong_sso.ts`](../may_chu/src/bao_mat/cong_sso.ts).
Bài kiểm ở [`may_chu/test/cong_sso.test.ts`](../may_chu/test/cong_sso.test.ts).

Bật bằng cách khai **một** biến trong `.env`:

```
CONG_SSO_GOC=https://teams.tranhoangvietnam.com/cong
```

Để trống = tắt hẳn, hệ thống đăng nhập bằng đường riêng như trước. Bốn biến `CONG_SSO_JWKS`,
`CONG_SSO_AUD`, `CONG_SSO_MA_MODULE`, `CONG_SSO_TIEN_TO` đều suy ra được từ biến trên, chỉ đặt
khi cổng đổi hợp đồng.

**TUYỆT ĐỐI không đặt khóa riêng của cổng vào `.env`.** Phân hệ chỉ nhận khóa **công khai** qua
JWKS. Có khóa riêng là tự ký được token quản trị cho chính mình — và đó chính là lý do cổng
chọn RS256 chứ không HS256.

Những gì lớp này làm, theo đúng thứ tự bắt buộc:

| Kiểm | Sai thì bị gì |
|---|---|
| `alg === 'RS256'`, danh sách trắng **cứng trong mã** | `alg: none`, và đòn dùng khóa công khai làm bí mật HMAC |
| Chữ ký, bằng khóa lấy theo `kid` từ JWKS | ai cũng tự ký được token |
| `iss` đúng chuỗi | token của một cổng khác dùng được ở đây |
| `aud === 'cong-noi-bo'` (là **chuỗi**, không phải mảng) | token phát cho hệ khác dùng được ở đây |
| `exp`, cho lệch đồng hồ 30 giây | token cũ dùng mãi |
| `loai ∈ {tc, dv}` | token làm mới (30 ngày) dùng làm token gọi API |
| `quyen['chamcong']` — **chỉ** khóa của mình | đọc quyền phân hệ khác là vượt ranh giới |

Ba tính chất đáng ghi lại, vì chúng là chỗ dễ làm hỏng khi sửa về sau:

- **Fail closed.** Không tải được JWKS thì **từ chối**. Không có nhánh `catch` nào dẫn tới "cho
  qua". Nhưng nếu **đã** có bộ khóa trong bộ nhớ đệm thì vẫn dùng tiếp: cổng chết 5 phút không
  được làm đứt phiên của cả công ty. Cả hai vế đều có bài kiểm riêng.
- **JWKS không tải ở mỗi request.** Đệm 1 giờ, và nạp lại khi gặp `kid` lạ (cổng xoay khóa) —
  nhưng **có giới hạn tần suất**: tối đa 3 lượt mỗi phút. Không có giới hạn đó thì kẻ tấn công
  gửi một loạt token với `kid` bịa và biến phân hệ thành cái búa đánh vào cổng.
- **Không đọc `X-Cong-*`.** Caddy chuyển `X-Cong-Nguoi-Dung` và `X-Cong-Email` sang, nhưng
  chúng là tiện nghi ghi log, **không phải cơ sở uỷ quyền**: request đến từ bất cứ đâu khác
  ngoài Caddy thì kẻ gọi tự khai mình là ai chỉ bằng cách đặt header. Có **bài kiểm quét toàn
  bộ `may_chu/src`** để chặn cả ý tưởng đó.

### Vai trò — đối chiếu theo `ma`, không theo `ten`

Bảng đổi vai trò nằm ở `DOI_VAI_TRO` trong `cong_sso.ts`. Đây là **một nửa của một hợp đồng**;
nửa kia là danh sách vai trò khai bên sổ đăng ký của cổng.

| `ma` khai bên cổng | `ten` (nhãn hiển thị) | Vai trò trong chấm công |
|---|---|---|
| `quan_tri` | Quản trị hệ thống | `admin` |
| `nhan_su` | Nhân sự | `nhan_su` |
| `truong_phong_nhan_su` | Trưởng phòng nhân sự | `truong_phong_nhan_su` |
| `truong_phong` | Trưởng phòng | `truong_phong` |
| `nhan_vien` | Nhân viên | `nhan_vien` |

Một người có nhiều vai trò thì lấy quyền **cao nhất**.

Hai luật đi kèm:

- **`ten` không bao giờ ảnh hưởng quyền.** `ma` nằm trong token và trong bảng nên không đổi
  được; `ten` chỉ để hiển thị và đổi lúc nào cũng được. Đối chiếu theo `ten` là để một người
  sửa nhãn tiếng Việt thành gỡ quyền của cả phòng.
- **Bỏ khai một vai trò bên cổng KHÔNG thu hồi quyền ở phía chấm công.** Cổng lọc token nhưng
  không sửa mã của ta. Xóa một dòng khỏi bảng trên thì phải xóa dòng tương ứng trong
  `DOI_VAI_TRO`, và ngược lại.

`cho_duyet` **không** có trong bảng: trạng thái "đã đăng nhập, chưa được cấp quyền" ở mô hình
cổng là `quyen` **rỗng**, không phải một vai trò. Mảng rỗng và thiếu hẳn khóa `chamcong` đều
nghĩa là như vậy — và **không** cái nào nghĩa là "cho qua".

---

## 3. Bước 2 — xin gì ở quản trị cổng

Gửi quản trị cổng đúng bốn thứ:

1. **Mã module:** `chamcong`
2. **Tiền tố đường dẫn:** `/chamcong`
3. **Danh sách vai trò `{ma, ten}`:** năm dòng ở bảng trên.
4. **Vai trò cần cho token dịch vụ:** hiện tại **không cần gì**. Nếu về sau chấm công phải tra
   cứu danh bạ nhân sự thì xin **`cong.doc_danh_ba`** — vai trò **chỉ đọc** — và **không** xin
   `nhan_su` (vai trò đó **ghi** được ánh xạ người ↔ PIN máy, và ánh xạ PIN chính là dữ liệu
   quyết định ai được trả lương cho lần quẹt nào). Kết quả tra cứu phải **cache**, đừng gọi mỗi
   dòng một lần.

Xong bước này khi: đăng nhập bằng tài khoản thử thì `token.quyen['chamcong']` ra đúng vai trò
mong đợi, và một tài khoản **chưa** được cấp quyền thì thấy màn hình "chưa được cấp quyền" chứ
không phải vòng lặp đăng nhập.

---

## 4. Bước 3 và 4 — chưa làm

Còn hai việc, theo thứ tự:

- **Bước 3:** nối `cong_sso.ts` vào hook xác thực, rồi bỏ đường đăng nhập riêng — không còn chỗ
  nào nhận mật khẩu, webapp không hiện form mà chuyển hướng sang
  `https://teams.tranhoangvietnam.com/?quay_lai=/chamcong/<đường muốn tới>`. Phép kiểm
  `quay_lai` (đúng một `/` đầu, không `//`, không `\`, không ký tự điều khiển) đã có sẵn ở
  `la_duong_dan_noi_bo()`.
- **Bước 4:** chạy `chan_duong.sh /chamcong` trên VPS. Chỉ sau khi bước 3 xong.

Một điểm cần quyết trước khi làm bước 3: **app điện thoại**. App hiện đăng nhập bằng
`POST /api/xac-thuc/dang-nhap` và giữ token làm mới 30 ngày của chính hệ thống chấm công. Cổng
không phát token cho app di động theo đường đó, nên có hai lối:

| Lối | Được | Mất |
|---|---|---|
| App mở màn đăng nhập của cổng trong WebView | một chỗ giữ mật khẩu duy nhất, thu hồi ở cổng có hiệu lực với cả app | phải sửa app, và phải phát hành lại bản build |
| Giữ đường mật khẩu **riêng cho app**, web đi qua cổng | không phải sửa app | vẫn còn một đường mật khẩu — vi phạm chính điều bước 3 muốn đạt, và R4 của sổ rủi ro |

Lối thứ nhất là lối đúng. Lối thứ hai chỉ nên dùng như một giai đoạn chuyển tiếp có thời hạn.

---

## 5. Tự kiểm

Sau khi bật, chạy 12 lệnh ở mục 6 của `BAOMATCONGSSO.md`. Bốn lệnh quan trọng nhất, và cũng là
bốn lệnh hay bỏ sót nhất:

```bash
TM=https://teams.tranhoangvietnam.com

# 1. Không token -> 401 (không phải 200, cũng không phải 500).
curl -si "$TM/chamcong/api/nhan-vien" | head -1

# 2. Giả header phải KHÔNG có tác dụng. Đây là phép thử quan trọng nhất.
curl -si -H 'X-Cong-Email: giam.doc@tranhoangvietnam.com' \
         -H 'X-Cong-Nguoi-Dung: 00000000-0000-0000-0000-000000000000' \
         "$TM/chamcong/api/nhan-vien" | head -1

# 3. Gọi thẳng cổng nội bộ, bỏ qua Caddy — CHẠY TRÊN VPS. Ra 200 là lỗi nghiêm trọng.
curl -si -H 'X-Cong-Email: giam.doc@tranhoangvietnam.com' \
         "http://127.0.0.1:8080/api/nhan-vien" | head -1

# 4. Máy chủ có bind ra ngoài không? Chỉ được thấy 127.0.0.1.
ss -ltn | grep 8080
```

Và một lệnh riêng của chấm công, chạy **sau** mỗi lần chạm vào Caddyfile:

```bash
# Máy chấm công vẫn gửi được log? Phải ra 200 và KHÔNG được là 3xx.
curl -si "http://teams.tranhoangvietnam.com/iclock/cdata?SN=8116254600435&options=all" | head -1
```

Máy ZKTeco coi 3xx là lỗi và bỏ lô dữ liệu. Một dòng `301` ở đây nghĩa là bảng công đang mất
dữ liệu, ngay lúc này.
