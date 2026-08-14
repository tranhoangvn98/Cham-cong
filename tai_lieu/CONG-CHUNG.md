# Cổng chung: kiến trúc mô-đun

Tài liệu **thiết kế**, chưa triển khai. Đọc và duyệt trước, rồi mới làm theo mục 18.

Người viết một service mới chỉ cần đọc [`KET-NOI-MODUN.md`](KET-NOI-MODUN.md) — tài liệu này
dành cho người thiết kế và vận hành chính cái cổng.

> **Vị trí tạm.** Tài liệu này đang nằm trong kho `Cham-cong` vì kho của cổng chưa tồn tại.
> Khi dựng kho `cong-noi-bo` (mục 14), chuyển cả hai tệp sang đó — cổng không được là tài
> sản của một module.

---

## 0. Mục tiêu

Nhân viên mở **một địa chỉ**, đăng nhập **một lần**, thấy **một thanh điều hướng**. Bên
dưới là nhiều service độc lập, và thêm một service mới **không phải sửa service nào đang
chạy**.

Cổng chịu trách nhiệm **đăng nhập, phân quyền, phát hành và thu hồi token**. Module chỉ
nhận token, xác minh, rồi làm việc của nó.

Đó là ranh giới. Mọi quyết định dưới đây suy ra từ nó.

### Hiện trạng bốn hệ thống

| Hệ thống | Mã module | Trạng thái hôm nay |
|---|---|---|
| Chấm công | `chamcong` | Web 12 trang + app Expo. **Đang tự làm đăng nhập** — phải chuyển thành module. |
| AI Agent | `agent` | Python CLI + bot Teams. Chưa có giao diện web. Trang quản trị: xem `ai_agent/tai_lieu/TRANG-QUAN-TRI.md`. |
| RF-ID | `rfid` | Chỉ có `README.md`. |
| TOOL | `tool` | Chỉ có `README.md`. |

Việc trước mắt là **dựng cổng và biến Chấm công thành module đầu tiên**. Nếu Chấm công
không chuyển được sang mô hình này thì mô hình sai — nó là phép thử thật, không phải ví dụ.

---

## 1. Ranh giới trách nhiệm

| Việc | Cổng | Module |
|---|:--:|:--:|
| Màn hình đăng nhập | ✅ | ❌ |
| Nói chuyện với Entra ID (OAuth, PKCE) | ✅ | ❌ |
| Lưu mật khẩu / băm mật khẩu | ✅ | ❌ |
| Ký và phát hành token | ✅ | ❌ |
| Làm mới, thu hồi token | ✅ | ❌ |
| Giữ khóa **riêng** | ✅ | ❌ |
| Sổ đăng ký module + thanh điều hướng | ✅ | ❌ |
| Cấp vai trò cho người dùng ở từng module | ✅ | ❌ |
| **Xác minh** token bằng khóa công khai | ❌ | ✅ |
| Quyết định vai trò đó được làm gì | ❌ | ✅ |
| Dữ liệu nghiệp vụ và CSDL riêng | ❌ | ✅ |

Hai luật rút ra, không có ngoại lệ:

1. **Module không bao giờ nhận khóa riêng.** Nó chỉ có khóa công khai, chỉ **xác minh**
   được, không **ký** được. Đây là lý do mục 4 tồn tại.
2. **Cổng không biết gì về nghiệp vụ của module.** Cổng biết "người này có vai trò
   `nhan_su` ở module `chamcong`". Vai trò đó xem được bảng công của ai là việc của Chấm
   công.

---

## 2. Sơ đồ đường dẫn

**Cổng sở hữu gốc tên miền và mọi đường không ai nhận.** Ba nhóm đường dưới đây là ngoại lệ
được khai tên; còn lại thuộc về cổng.

```
https://teams.tranhoangvietnam.com/
  /api/*                webhook bot Teams       -> 127.0.0.1:3978   ngoại lệ
  /dev/*                webhook bot dev         -> 127.0.0.1:3979   ngoại lệ
  /iclock/*             máy chấm công ZKTeco    -> 127.0.0.1:8080   ngoại lệ

  /chamcong/api/*       API Chấm công           -> 127.0.0.1:8080
  /chamcong/*           webapp Chấm công        -> 127.0.0.1:8081
  /agent/*              module AI Agent         -> (chưa có)
  /rfid/*  /tool/*      chỗ trống

  /                     trang chủ cổng          -> 127.0.0.1:8090
  /cong/*               đăng nhập, API danh tính, JWKS, quản trị
  /chung/*              thanh điều hướng + CSS dùng chung
  <mọi đường còn lại>   cổng xử lý (404 của cổng, bí danh, module mới)

http://teams.tranhoangvietnam.com/
  /iclock/*             máy chấm công ZKTeco (HTTP thường, KHÔNG chuyển hướng)
  <còn lại>             chuyển hướng sang HTTPS
```

Thêm module = thêm một tiền tố đường dẫn + một dòng trong sổ đăng ký. Không đụng module nào
khác.

### Vì sao phải đảo quyền sở hữu gốc

Caddyfile đang chạy để bot giữ `handle { reverse_proxy 3978 }` — bắt **tất cả**. Domain vì
thế thuộc về bot, còn cổng chỉ là khách trọ ở `/cong/*`. Muốn
`teams.tranhoangvietnam.com` **là** cổng thì phải đảo lại.

Đảo được, vì bot chỉ cần đúng một đường. `config/openclaw.json` khai:

```
webhook: { port: 3978, path: "/api/messages" }
```

Cổng điều khiển `18789` bind `127.0.0.1`, không bao giờ ra Internet. Ngoài `/api/messages`
thì bot không phục vụ gì trên tên miền công khai — nó đang bắt tất chỉ vì lịch sử, không phải
vì cần.

**Thu về `/api/*` chứ không phải `/api/messages`.** Hẹp vừa đủ để nhả gốc cho cổng, nhưng vẫn
chừa chỗ nếu có đầu mối nào của bot chưa được ghi vào tài liệu. Chấm công không đụng: API của
nó nằm ở `/chamcong/api/*`.

> ⚠️ Đây là thay đổi **thu hẹp**, trong khi quy ước của `openclaw-teams` (docs/GD2-PHAN2.md)
> là *"thay đổi Caddy phải ADDITIVE"*. Cố ý phá quy ước đó, nên phải nghiệm thu bằng cả hai
> cách ở bước 4 mục 18: `curl` trả 401 **và** nhắn thật cho bot trong Teams. Lùi lại là chép
> lại tệp sao lưu và `systemctl reload caddy`.

### Đường dẫn ngắn: bí danh có kiểm soát

Người dùng không bao giờ phải gõ `/chamcong` — vào gốc tên miền là thấy cổng, bấm vào là đi.
Nhưng khi cần gửi cho nhau một đường dẫn ngắn, cổng giữ một **bảng bí danh** và chuyển hướng
302 sang đường dẫn chuẩn của module:

```
/cham-cong   ->  /chamcong/
/bang-cong   ->  /chamcong/bang-cong
/cham-cong/bang-cong -> /chamcong/bang-cong
```

Bí danh khai cùng chỗ với module và **kiểm trùng lúc đăng ký** — hai module không được cùng
đòi một bí danh. Danh sách ngắn, có chủ đích, chỉ cho vài trang hay được gửi qua lại.

**Chuyển hướng chứ không viết lại đường dẫn.** Viết lại (giữ nguyên URL ngắn trên thanh địa
chỉ) là bẫy: Vite đã nhúng tiền tố `/chamcong/` vào mọi tệp tĩnh và mọi liên kết trong
webapp, nên bấm một phát là quay về đường dài — chỉ khác là bây giờ có hai URL cho cùng một
trang. Chuyển hướng cho đường vào ngắn mà không sinh ra sự mập mờ đó.

### Vì sao không bỏ hẳn tiền tố

Nghe hợp lý: cho Chấm công chiếm thẳng `/bang-cong`, `/nhan-vien`, AI Agent chiếm
`/bao-cao`… Nhưng đếm trên chính mã nguồn hiện có thì đụng nhau ngay:

| Đường dẫn | Chấm công | Cổng | AI Agent |
|---|:--:|:--:|:--:|
| `/tai-khoan` | ✅ có rồi | ✅ cần | |
| `/nhat-ky` | ✅ có rồi | ✅ cần | ✅ cần |
| `/nguoi-dung` | | ✅ cần | ✅ cần |
| `/cai-dat` | | ✅ cần | ✅ cần |
| `/api/*` | ✅ có rồi | | ✅ cần (và bot đang giữ) |

Bỏ tiền tố nghĩa là cổng phải giữ một danh sách khoảng mười hai đường dẫn cấp một cho **mỗi**
module, và mỗi lần thêm module lại phải rà trùng với tất cả module cũ. Đó đúng là thứ mà toàn
bộ tài liệu này dựng lên để tránh: thêm một service không được bắt sửa service đang chạy.

Muốn URL sạch mà không có tiền tố thì lối đi đúng là **subdomain cho từng module**
(`chamcong.tranhoangvietnam.com`) — hết trùng, hết tiền tố, lại thêm ranh giới bảo mật thật.
Cái giá là mất SSO nhờ chung `localStorage`, phải chuyển sang cookie và mở CORS (mục 2). Đây
là đánh đổi có thật, để ở mục 21 cho anh quyết.

### Vì sao chung một origin

Phiên đăng nhập nằm trong `localStorage`, mà `localStorage` phân vùng theo **origin**, không
theo đường dẫn. Cùng origin nghĩa là mọi module đọc được cùng một phiên — đăng nhập một lần
là xong, không phải viết dòng nào.

Đi subdomain riêng thì phải đổi sang cookie `HttpOnly` `Domain=`, viết lại tầng token của
web lẫn app điện thoại, mở CORS trở lại, và xin thêm chứng chỉ cho từng subdomain.

**Cái giá:** chung origin thì trong trình duyệt **không còn ranh giới bảo mật** giữa các
module. Một lỗ XSS ở `/tool` đọc được token của cả cụm. Chấp nhận được khi mọi module do
cùng một đội viết và cùng một quy trình rà soát. **Module do bên thứ ba viết, hoặc module
nhúng mã của bên thứ ba, phải ra subdomain riêng** — lúc đó nó dùng cookie thay vì
`localStorage`, và đó là ngoại lệ có chủ đích chứ không phải mặc định.

---

## 3. Cổng là nơi cấp danh tính duy nhất

Luồng đăng nhập:

```
Người dùng -> /cong/dang-nhap
           -> Entra ID (OAuth 2.0 + PKCE)
           -> /cong/api/xac-thuc/microsoft/goi-ve
           -> cổng tra sổ đăng ký, dựng token, chuyển về đường dẫn ban đầu
```

Module không tham gia vào luồng này. Nó chỉ làm một việc khi không thấy token hợp lệ:

```
chuyển sang  /cong/dang-nhap?quay_lai=<đường dẫn hiện tại>
```

`quay_lai` phải được cổng kiểm là **đường dẫn nội bộ** (bắt đầu bằng `/`, không phải `//`,
không có sơ đồ giao thức). Không kiểm là có open redirect: kẻ tấn công gửi link "đăng nhập"
thật rồi đẩy nạn nhân sang trang giả. Chấm công đã có sẵn phần kiểm này trong
`may_chu/src/tuyen/dang_nhap.ts`, chuyển nguyên sang cổng.

### Đã chốt: chỉ đăng nhập bằng Microsoft

Toàn cụm dùng **Microsoft Entra ID**. Không có màn hình nhập mật khẩu ở bất kỳ đâu trong hệ
thống, trừ một ngoại lệ ở dưới.

**Điều này KHÔNG có nghĩa module xác minh token của Microsoft.** Cổng nhận danh tính từ
Microsoft rồi **đổi lấy token của cổng** — token đó mới mang `quyen` theo từng module. Lý do:
Entra biết "đây là chị An", nhưng không biết chị An là `truong_phong` ở Chấm công và không có
quyền gì ở AI Agent. Toàn bộ mục 4–7 giữ nguyên.

```
Microsoft xác thực "ai"  ->  cổng quyết định "được làm gì"  ->  module thi hành
```

**Bỏ được:**

| Bỏ | Ghi chú |
|---|---|
| `mat_khau.ts` (scrypt) | Không còn chỗ nào băm mật khẩu, trừ tài khoản thoát hiểm |
| Màn hình đổi mật khẩu, cờ `phai_doi_mat_khau` | Chính sách mật khẩu về Entra lo |
| Chuyển băm mật khẩu khi nhập tài khoản (mục 15) | Chỉ khớp theo Entra object id / email |
| Đặt lại mật khẩu cho nhân viên quên | Việc của IT trên Entra, không phải của nhân sự |

**Được thêm** mà không phải viết dòng nào: MFA, Conditional Access, khóa tài khoản khi nghỉ
việc chỉ làm một chỗ, nhật ký đăng nhập của Entra.

### Tài khoản thoát hiểm — ngoại lệ duy nhất

Chỉ có Microsoft nghĩa là **một điểm hỏng là cả cụm không ai vào được**, kể cả quản trị viên.
Và hỏng theo cách không báo trước: `MS_CLIENT_SECRET` hạn tối đa 2 năm, hết hạn là nút đăng
nhập chết ngay.

Giữ **đúng một** tài khoản quản trị cục bộ:

- Mặc định **vô hiệu hóa**. Bật bằng biến môi trường trên máy chủ, không bật được từ giao diện.
- Mật khẩu dài, sinh ngẫu nhiên, cất trong két / trình quản lý bí mật. Không ai dùng hằng ngày.
- Mọi lần đăng nhập bằng nó ghi nhật ký và gửi cảnh báo.
- Chỉ dùng để chữa cấu hình Entra rồi thoát ra ngay.

Đây là lý do `mat_khau.ts` vẫn phải chuyển sang cổng dù không còn ai dùng mật khẩu.

### Chặn ở tầng Entra, không phải ở tầng ứng dụng

Bật `appRoleAssignmentRequired` trên service principal (lệnh có sẵn ở
`tai_lieu/DANG-NHAP-MICROSOFT.md`) thì người không được gán **không qua nổi màn hình đăng
nhập** của Microsoft. Chặt hơn hẳn việc để họ đăng nhập được rồi mới từ chối ở ứng dụng.

Kèm `MS_TEN_MIEN_CHO_PHEP=tranhoangvietnam.com` làm lớp thứ hai.

### Lần đầu đăng nhập

Đặt `MS_TU_DONG_TAO=1`: cổng tự tạo tài khoản với **`quyen` rỗng cho mọi module**. Người dùng
vào được cổng, thấy màn hình "chưa được cấp quyền", quản trị viên cấp sau.

An toàn vì đã có hai lớp chặn ở trên, và vì mảng quyền rỗng không mở được gì. Để `0` thì mỗi
nhân viên mới phải chờ tạo tay hai lần — một ở Entra, một ở cổng.

### Đăng xuất

Đăng xuất khỏi cổng = xóa phiên cục bộ + thu hồi token làm mới. **Không** tự động đăng xuất
khỏi Microsoft: người dùng còn Outlook và Teams đang mở, đá họ ra khỏi cả bộ Microsoft 365
là hành vi không ai mong đợi. Cần thoát hẳn thì có mục riêng "Đăng xuất khỏi Microsoft" gọi
đầu mối `logout` của Entra.

### Điều kiện tiên quyết phải kiểm trước

**Mọi tài khoản đang dùng phải khớp được với một tài khoản Entra.** Tài khoản nào không khớp
thì sau khi chuyển là không đăng nhập được nữa. Chạy đối soát và xử lý hết trước khi sang
giai đoạn B ở mục 15 — đây là việc phải làm, không phải việc nên làm.

**Đã xác nhận: mọi nhân viên đều có tài khoản Microsoft.** Nên không cần đường đăng nhập thứ
hai, và "chỉ Microsoft" áp dụng được cho cả web lẫn app điện thoại.

Vẫn phải chạy đối soát, vì "ai cũng có tài khoản" chưa đủ — còn phải **khớp được** tài khoản
Entra với đúng bản ghi nhân viên trong Chấm công. Ba thứ hay lệch: người dùng chung một hòm
thư, người có hai tài khoản, và người đã nghỉ nhưng bản ghi còn hoạt động. Đối soát bằng AAD
object id trước, email sau; danh sách còn lại xử lý tay.

Kèm theo một ràng buộc về quy trình: **nhân viên mới phải có tài khoản Entra trước ngày đi
làm đầu tiên**, nếu không họ quẹt vân tay được (máy ZKTeco không cần tài khoản) nhưng không
xem được bảng công của chính mình. Trước đây nhân sự tạo tài khoản cục bộ là xong; giờ phải
qua IT. Ghi vào quy trình nhận việc.

---

## 4. Khóa bất đối xứng — thay đổi quan trọng nhất

Chấm công hôm nay ký JWT bằng **HS256** (`may_chu/src/bao_mat/jwt.ts`): một bí mật chung
vừa dùng để ký vừa dùng để xác minh.

Mô hình đó **không dùng được** cho cổng. Muốn module xác minh được token thì phải đưa nó
`JWT_SECRET`; mà có `JWT_SECRET` thì module **tự ký được token quản trị cho chính mình**.
Bốn module là bốn bản sao của một bí mật mở được mọi thứ — mất một bản là mất cả cụm.

**Cổng dùng RS256.** Cổng giữ khóa riêng và là nơi duy nhất ký được. Module tải khóa công
khai, chỉ xác minh được.

```
GET /cong/.well-known/jwks.json

{ "keys": [
  { "kty":"RSA", "use":"sig", "alg":"RS256", "kid":"2026-08", "n":"...", "e":"AQAB" }
] }
```

Vì sao RS256 chứ không phải EdDSA: EdDSA nhỏ và nhanh hơn, nhưng RS256 được **mọi** thư viện
JWT hỗ trợ. Mục tiêu của cả tài liệu này là service sau nối vào dễ — chọn thuật toán tương
thích rộng nhất. Nếu chắc chắn mọi module đều là Node hoặc Python thì EdDSA cũng được, đổi
sau được nhờ cơ chế `kid` ở dưới.

### Xoay khóa

Mỗi khóa có `kid`. Khi xoay, cổng **công bố cả hai khóa** trong JWKS và ký bằng khóa mới.
Sau khi mọi access token cũ hết hạn (15 phút) thì gỡ khóa cũ.

Module phải:

- cache JWKS (gợi ý 1 giờ),
- **tải lại ngay khi gặp `kid` lạ** — không có bước này thì xoay khóa làm chết cả cụm,
- có giới hạn tần suất tải lại, để token rác với `kid` bịa không thành đòn DoS lên cổng.

### Ba luật khi xác minh — thiếu một cái là lỗ hổng

1. **Chỉ chấp nhận `alg` nằm trong danh sách trắng.** Đọc `alg` từ header rồi tin theo là
   mở đường cho `alg: none` và cho đòn "đưa khóa công khai RSA vào làm bí mật HMAC". Chấm
   công đã chặn đúng cách trong `giai_ma_token`; giữ nguyên tinh thần đó.
2. **Kiểm `iss`** đúng địa chỉ cổng.
3. **Kiểm `aud`** chứa `cong-noi-bo`.

---

## 5. Hợp đồng token

Access token, TTL **15 phút** (giữ nguyên `JWT_ACCESS_TTL=900` đang dùng):

```json
{
  "iss": "https://<tên miền>/cong",
  "aud": "cong-noi-bo",
  "sub": "0f8b2c1e-...",
  "oid": "7c3a...-aad-object-id",
  "email": "an.nv@tranhoangvietnam.com",
  "ten": "Nguyễn Văn An",
  "quyen": {
    "chamcong": ["nhan_su"],
    "agent":    ["su_dung"],
    "rfid":     []
  },
  "loai": "tc",
  "kid":  "2026-08",
  "jti":  "...",
  "iat":  1755168000,
  "exp":  1755168900
}
```

| Trường | Ý nghĩa |
|---|---|
| `sub` | Id tài khoản **trên cổng**. Ổn định vĩnh viễn. Đây là khóa module dùng để móc sang bản ghi của mình. |
| `oid` | AAD object id của Entra. Có mặt vì dữ liệu sử dụng bot đã khóa theo trường này (`phien.aad_object_id`, `requests.aad_object_id`) — thiếu nó thì trang thống kê AI Agent không nối được người dùng với lượt hỏi. |
| `email` | Tiện cho hiển thị và đối soát. **Không dùng làm khóa** — email đổi được. |
| `quyen` | Vai trò theo **từng** module. Mảng rỗng hoặc thiếu khóa = đã đăng nhập nhưng chưa được cấp quyền ở module đó. |
| `loai` | `tc` = truy cập · `lm` = làm mới · `dv` = token dịch vụ (mục 8). |

Ba điểm bắt buộc:

- **Module chỉ đọc `quyen[<mã module của mình>]`.** Đọc của module khác là vượt ranh giới.
- **Không có trạng thái `cho_duyet` riêng nữa.** Chấm công hôm nay có vai trò `cho_duyet`
  nghĩa là "đã xác thực, chưa được phân quyền". Trong mô hình mới nó là `quyen.chamcong` rỗng
  — cùng ý nghĩa, nhưng tổng quát cho mọi module và không tốn một vai trò đặc biệt.
- **Không nhét `nhan_vien_id` vào token.** Đó là khái niệm của Chấm công, không phải của
  cổng. Module tự giữ bảng ánh xạ `cong_id` → thực thể của nó (mục 15). Cổng nhét khái niệm
  của một module vào token là bắt đầu phá chính ranh giới nó dựng ra.

### Token có nên phình khi có nhiều module không

Với 4–15 module thì `quyen` vẫn nhỏ hơn 1 KB, không thành vấn đề. Nếu một ngày vượt xa mức
đó, đường thoát là để token chỉ mang `sub` và module gọi `POST /cong/api/gioi-thieu-token`
để hỏi quyền. Đổi được về sau mà không phải viết lại giao diện — **đừng làm bây giờ**, nó đặt
cổng vào đường đi của mọi request.

---

## 6. Mô hình quyền

Mỗi module **tự khai** các mức quyền của nó khi đăng ký. Cổng không có một danh sách vai trò
toàn cục, vì "trưởng phòng" ở Chấm công và "trưởng phòng" ở RF-ID không nhất thiết cùng nghĩa.

| Module | Các mức nó khai |
|---|---|
| `chamcong` | `admin`, `nhan_su`, `truong_phong`, `nhan_vien` |
| `agent` | `quan_tri`, `su_dung` |
| `rfid` | *(khai khi có mã)* |

Cổng chỉ làm ba việc: giữ danh sách đó, gán cho người dùng, nhét vào token.

Một người có thể là `admin` ở Chấm công và không có quyền gì ở AI Agent. Đó là điểm chính
của việc tách quyền theo module.

**Ai cấp quyền:** người có vai trò `quan_tri` trên chính module `cong`. Cổng là một module
của chính nó, quản trị bằng đúng cơ chế đó — không có đường tắt "siêu quản trị" nằm ngoài mô
hình.

---

## 7. Sổ đăng ký module

```sql
create table module (
  ma        text primary key,              -- 'chamcong'
  ten       text        not null,          -- 'Chấm công'
  mo_ta     text        not null default '',
  tien_to   text        not null unique,   -- '/chamcong'
  icon      text        not null,          -- tên icon Tabler
  thu_tu    int         not null default 100,
  bat       boolean     not null default true,
  vai_tro   jsonb       not null,          -- ['admin','nhan_su',...] module tự khai
  tao_luc   timestamptz not null default now()
);

create table quyen_nguoi_dung (
  nguoi_dung_id uuid        not null references nguoi_dung(id) on delete cascade,
  module_ma     text        not null references module(ma)     on delete cascade,
  vai_tro       text        not null,
  cap_boi       uuid        references nguoi_dung(id),
  cap_luc       timestamptz not null default now(),
  primary key (nguoi_dung_id, module_ma, vai_tro)
);
```

Thanh điều hướng dựng từ bảng `module`, lọc theo `quyen` của người đang đăng nhập. Module có
`bat = false` biến khỏi thanh điều hướng mà không phải sửa mã hay dựng lại gì.

**Module chưa có nội dung thì không hiện.** Đây là tiền lệ đã ghi trong `web/src/App.tsx`:
*một mục menu dẫn tới trang trống thì tệ hơn là không có mục đó*. `RF-ID` và `TOOL` để
`bat = false` cho tới khi có mã thật.

---

## 8. Token dịch vụ (máy với máy)

Không phải lời gọi nào cũng có người ngồi sau. Timer của AI Agent chạy 17:30 mỗi ngày cần
đọc API Chấm công mà không có ai đăng nhập.

```
POST /cong/api/token-dich-vu
     { "ma_dich_vu": "agent-bao-cao", "bi_mat": "..." }
  -> { "token_truy_cap": "...", "het_han_sau": 3600 }
```

- `loai: "dv"`, `sub` = mã dịch vụ, TTL 1 giờ.
- `quyen` là **phạm vi hẹp nhất đủ dùng** — `{"chamcong": ["doc_bang_cong"]}`, không phải
  `admin`.
- Bí mật lưu **đã băm** trong CSDL cổng (`scrypt`, cùng cách đang dùng cho mật khẩu).
- Xoay được, thu hồi được, có nhật ký lần dùng cuối.
- **Không bao giờ đặt trong URL** — chỉ trong header `Authorization`. URL lọt vào log của
  reverse proxy, vào lịch sử trình duyệt, vào `Referer`.

Module phân biệt bằng `loai`: token `dv` không có người thật đằng sau, nên đừng ghi nhật ký
thao tác dưới tên một nhân viên nào.

---

## 9. Luồng chạy: từ đăng nhập tới gọi API của module

Câu hỏi quan trọng nhất khi vận hành: **qua được lớp xác minh rồi thì đi tiếp thế nào?**

```
 ┌────────┐        ┌──────────┐      ┌──────┐   ┌──────────────┐  ┌───────────┐
 │Trình   │        │  Cổng    │      │Entra │   │ Web module   │  │API module │
 │duyệt   │        │  :8090   │      │  ID  │   │ (tệp tĩnh)   │  │           │
 └───┬────┘        └────┬─────┘      └──┬───┘   └──────┬───────┘  └─────┬─────┘
     │ 1. GET /         │               │              │                │
     ├─────────────────►│               │              │                │
     │ 2. chưa có phiên → /cong/dang-nhap              │                │
     │◄─────────────────┤               │              │                │
     │ 3. OAuth + PKCE  │               │              │                │
     ├──────────────────┴──────────────►│              │                │
     │ 4. mã ủy quyền → /cong/api/xac-thuc/microsoft/goi-ve             │
     ├─────────────────►│               │              │                │
     │                  │ 5. đổi mã lấy id_token, đọc oid               │
     │                  ├──────────────►│              │                │
     │                  │ 6. tra nguoi_dung + quyen_nguoi_dung          │
     │                  │    (CSDL của cổng)           │                │
     │                  │ 7. KÝ token RS256 chứa quyen{}                │
     │ 8. 302 về /#token_truy_cap=…&token_lam_moi=…    │                │
     │◄─────────────────┤               │              │                │
     │ 9. lưu localStorage['cong_phien'], xóa neo khỏi thanh địa chỉ    │
     │                  │               │              │                │
     │ 10. bấm "Chấm công" → GET /chamcong/            │                │
     ├─────────────────────────────────────────────────►                │
     │ 11. tệp tĩnh                     │              │                │
     │◄─────────────────────────────────────────────────┤                │
     │ 12. JS đọc localStorage (CÙNG origin nên thấy)  │                │
     │ 13. GET /chamcong/api/bang-cong  Authorization: Bearer …          │
     ├──────────────────────────────────────────────────────────────────►
     │                  │               │              │  14. xác minh  │
     │                  │               │              │  CỤC BỘ bằng   │
     │                  │               │              │  JWKS đã cache │
     │                  │               │              │  15. đọc       │
     │                  │               │              │  quyen.chamcong│
     │                  │               │              │  16. tra       │
     │                  │               │              │  cong_id=sub   │
     │ 17. dữ liệu      │               │              │                │
     │◄──────────────────────────────────────────────────────────────────┤
```

**Bước 14 là điểm mấu chốt: module KHÔNG gọi cổng.** Nó xác minh chữ ký ngay trong tiến
trình của mình bằng khóa công khai đã cache. Cổng chỉ xuất hiện ở bước 1–8 (đăng nhập, vài
phút một lần) và ở lần tải JWKS đầu tiên.

Nếu module phải hỏi cổng ở mỗi request thì đó không còn là microservice — đó là monolith bị
xé ra rồi nối lại bằng HTTP, chậm hơn và mong manh hơn bản gốc. Chữ ký bất đối xứng tồn tại
chính là để tránh điều đó.

Hệ quả cụ thể: **cổng chết thì các module vẫn phục vụ bình thường** cho tới khi access token
hết hạn (15 phút). Chỉ đăng nhập mới là không được.

### App điện thoại khác ở đâu

Bước 8–9 không dùng được vì app native không có `localStorage` và không nhận được phần neo
của URL. Thay bằng: mở trình duyệt hệ thống → Entra → deep link về app kèm mã → app đổi mã
lấy token qua `POST /cong/api/token` → cất vào `expo-secure-store`. Từ bước 13 trở đi giống
hệt web.

---

## 10. Phân quyền xác định từ cái gì — ba tầng

Đây là chỗ dễ lẫn nhất, nên tách bạch rõ ai quyết cái gì:

| Tầng | Câu hỏi | Ai trả lời | Dựa vào |
|---|---|---|---|
| 1. Xác thực | **Anh là ai?** | Microsoft Entra ID | Tài khoản công ty, MFA, Conditional Access |
| 2. Phân quyền thô | **Được vào module nào, với vai trò gì?** | Cổng | Bảng `quyen_nguoi_dung` → nhét vào `quyen` trong token |
| 3. Phân quyền tinh | **Trong module đó được xem/sửa bản ghi nào?** | Chính module | `quyen[<mã module>]` **+** dữ liệu nghiệp vụ của module |

Ví dụ chạy suốt ba tầng:

1. Entra xác nhận đây là `an.nv@tranhoangvietnam.com`, `oid = 7c3a…`.
2. Cổng tra ra: người này có `["truong_phong"]` ở `chamcong`, `["su_dung"]` ở `agent`, không
   có gì ở `rfid`. Ký vào token.
3. Chấm công đọc `quyen.chamcong = ["truong_phong"]`, rồi **tự** quyết: trưởng phòng chỉ xem
   được nhân viên trong phòng mình. Logic đó nằm ở `may_chu/src/bao_mat/quyen_ho_so.ts`.

**Cổng không biết "phòng ban" là gì, và không được biết.** Nó chỉ biết chuỗi
`"truong_phong"` là một vai trò hợp lệ mà module `chamcong` đã khai. Ngày Chấm công đổi luật
"trưởng phòng xem được gì", cổng không phải sửa một dòng nào — đó chính là thước đo ranh giới
có đúng hay không.

Câu hỏi kiểm tra khi thiết kế tính năng mới: *cổng có phải biết thêm khái niệm nghiệp vụ nào
không?* Nếu có, gần như chắc chắn là đặt sai chỗ.

---

## 11. Bề mặt API của cổng

**Có, cổng phải có API riêng** — nhưng nhỏ, và cố ý **không** có đầu mối "kiểm tra quyền cho
tôi" gọi ở mỗi request.

### Module gọi (rất ít)

| Đầu mối | Ai gọi | Tần suất |
|---|---|---|
| `GET /cong/.well-known/jwks.json` | mọi module | 1 lần/giờ + khi gặp `kid` lạ |
| `GET /cong/.well-known/openid-configuration` | thư viện JWT tự dò | 1 lần lúc khởi động |
| `POST /cong/api/token-dich-vu` | service chạy nền | 1 lần/giờ |
| `GET /cong/api/nguoi-dung?sub=a,b,c` | module cần **tên người khác** | có cache, xem dưới |

Hết. Không có gì khác nằm trên đường đi của một request người dùng.

### Trình duyệt gọi (không phải module)

```
GET  /cong/dang-nhap                          màn hình đăng nhập
GET  /cong/api/xac-thuc/microsoft/goi-ve      Entra gọi về
POST /cong/api/token                          đổi mã lấy token (app điện thoại)
POST /cong/api/lam-moi                        làm mới access token
POST /cong/api/dang-xuat                      thu hồi token làm mới
GET  /cong/api/toi                            tôi là ai + vào được module nào
```

`/cong/api/toi` là thứ thanh điều hướng dùng để vẽ menu. Module **không** cần gọi nó — thông
tin đã nằm sẵn trong token.

### Quản trị (vai trò `quan_tri` trên module `cong`)

```
GET    /cong/api/module                       sổ đăng ký
POST   /cong/api/module                       khai module mới
PATCH  /cong/api/module/:ma                   bật/tắt, đổi tên, đổi thứ tự
GET    /cong/api/nguoi-dung                   tìm người
GET    /cong/api/nguoi-dung/:id/quyen         xem quyền
PUT    /cong/api/nguoi-dung/:id/quyen         cấp/gỡ quyền
GET    /cong/api/nhat-ky                      ai cấp quyền cho ai, khi nào
POST   /cong/api/dich-vu                      tạo/xoay bí mật service token
```

### Cố ý KHÔNG có

| Không có | Vì sao |
|---|---|
| `POST /cong/api/kiem-tra-quyen` gọi mỗi request | Biến cổng thành điểm nghẽn đồng bộ và điểm hỏng duy nhất. Token đã mang sẵn câu trả lời. |
| Đầu mối cho module đọc/ghi bảng `nguoi_dung` tùy ý | Cổng đổi lược đồ là mọi module gãy |
| Đầu mối cho module tự cấp quyền cho chính nó | Module tự nâng quyền được thì phân quyền vô nghĩa |

`POST /cong/api/gioi-thieu-token` (token introspection) có thể thêm sau **nếu** xuất hiện
một thao tác cần chắc chắn tuyệt đối tại thời điểm thực hiện — ví dụ duyệt chi. Cho tới lúc
đó thì đừng thêm: có sẵn là sẽ có người dùng nó ở mọi request.

### Hiển thị tên người khác — ca dùng thật hay bị bỏ sót

Token mang `ten` và `email` của **người đang đăng nhập**. Nhưng màn hình duyệt đơn cần hiện
*"duyệt bởi Nguyễn Văn B"* — mà B không phải người đang đăng nhập.

Ba cách, xếp theo thứ tự nên dùng:

1. **Nhân bản lúc ghi.** Khi Chấm công lưu "đơn này do B duyệt", lưu luôn `nguoi_duyet_ten`
   bên cạnh `nguoi_duyet_cong_id`. Không gọi cổng lần nào, và **đúng về mặt nghiệp vụ**: sổ
   sách phải ghi tên tại thời điểm duyệt, không phải tên hiện tại.
2. **Tra theo lô, có cache.** `GET /cong/api/nguoi-dung?sub=a,b,c` cho danh sách dài cần tên
   mới nhất. Gọi một lần cho cả trang, không phải mỗi dòng một lần.
3. **Cổng phát sự kiện khi người dùng đổi tên**, module cập nhật bản sao. Chỉ làm khi số
   module đủ lớn để cách 2 thành gánh nặng.

Nhân bản dữ liệu giữa các service **không phải là lỗi thiết kế** — nó là cách microservice
đổi tính nhất quán tức thời lấy tính độc lập. Cái phải tránh là gọi đồng bộ chéo trong
đường đi của request.

### Bốn luật microservice áp cho cụm này

1. **Không service nào đọc CSDL của service khác bằng SQL.** Đi qua API, hoặc nhân bản dữ
   liệu mình cần.
2. **Không gọi đồng bộ chéo trong đường đi của request.** Cổng chỉ nằm ở luồng đăng nhập.
3. **Hỏng từng phần, không hỏng cả cụm.** Cổng chết → không đăng nhập mới được, nhưng người
   đang dùng vẫn dùng tiếp 15 phút. Chấm công chết → AI Agent không việc gì.
4. **Hợp đồng đổi phải tương thích ngược.** Thêm khóa vào token thì được; đổi ý nghĩa
   `quyen` thì phải qua giai đoạn chấp nhận cả hai, đúng như cách chuyển HS256 → RS256 ở
   mục 15.

---

## 12. Vòng đời và thu hồi

| | TTL | Thu hồi được? |
|---|---|---|
| Access (`tc`) | 15 phút | Không — hết hạn là cách thu hồi |
| Làm mới (`lm`) | 30 ngày | Có — lưu đã băm trong CSDL cổng |
| Dịch vụ (`dv`) | 1 giờ | Có — vô hiệu hóa bí mật |

Module **không** hỏi cổng ở mỗi request. Nó xác minh chữ ký cục bộ. Đổi lại, khóa một tài
khoản có độ trễ tối đa 15 phút — chấp nhận được, và đây là đánh đổi tiêu chuẩn.

Cần chặn tức thì (nhân viên nghỉ việc trong tình huống nhạy cảm) thì thu hồi token làm mới
**và** khóa tài khoản ở Entra ID. Đừng dựng danh sách thu hồi cho access token: nó đặt cổng
vào đường đi của mọi request, tức là đúng cái mà toàn bộ thiết kế này tránh.

Chấm công đã có bảng token làm mới lưu băm + cột `thu_hoi_luc` — chuyển nguyên sang cổng.

---

## 13. Ba đường KHÔNG đi qua cổng

Nhận diện sớm để không ai "thống nhất" nhầm rồi làm hỏng dữ liệu thật.

| Đường | Vì sao ngoại lệ |
|---|---|
| `/iclock/*` | Máy ZKTeco nói giao thức ADMS, không biết HTTP header `Authorization`, không làm được TLS. Xác thực bằng serial + danh sách IP. Ép nó qua cổng là **mất dữ liệu chấm công**, tức là sai lương. |
| `/api/messages` | Webhook Bot Framework của Microsoft gọi vào. Xác thực bằng chữ ký của Microsoft, không phải token cổng. |
| `/cong/.well-known/jwks.json` | Khóa công khai, cố ý mở. Không có gì bí mật để bảo vệ. |

Hai đường đầu đã có cơ chế xác thực riêng phù hợp với bên gọi. Ranh giới bảo mật vẫn còn, chỉ
là không phải ranh giới của cổng.

---

## 14. Cổng nằm ở kho nào

**Đã chốt: kho riêng `cong-noi-bo`.** Chưa tồn tại, cần tạo trước khi viết dòng mã đầu tiên.

Đặt cổng trong kho `Cham-cong` sẽ làm "triển khai cổng" và "triển khai Chấm công" dính vào
nhau — đúng cái ràng buộc mà cả thiết kế này muốn gỡ. Và mọi module còn lại sẽ phải phụ thuộc
vào kho của một module.

Việc phải làm ngay khi kho tồn tại: **chuyển `CONG-CHUNG.md` và `KET-NOI-MODUN.md` sang đó.**
Hai tệp này đang tạm trú trong `Cham-cong` chỉ vì chưa có chỗ. Để lâu thì người viết module
mới sẽ phải clone kho của một module để đọc hợp đồng của cổng — vô lý, và là dấu hiệu ranh
giới đang trôi.

### Cấu trúc đề xuất

```
cong-noi-bo/
  may_chu/          API cổng (Node + TS + Fastify, cùng bộ công cụ với Chấm công)
  web/              trang chủ + màn hình đăng nhập + trang quản trị quyền
  chung/            thanh điều hướng dùng chung, sinh ra tệp phục vụ ở /chung/*
  thiet_ke/         token.json của cổng (nhánh `web`)
  migrations/       lược đồ CSDL cổng
  tai_lieu/         CONG-CHUNG.md, KET-NOI-MODUN.md
```

### CSDL

Cổng cần CSDL riêng: `nguoi_dung`, `module`, `quyen_nguoi_dung`, `token_lam_moi`, `dich_vu`,
`nhat_ky_dang_nhap`, `bi_danh`.

Dùng chung instance PostgreSQL với Chấm công thì được, nhưng **khác database**, khác tài
khoản kết nối. Module không được đọc bảng người dùng của cổng bằng SQL — đó là luật 1 của
mục 11.

Chung instance thì rẻ và đủ ở quy mô này; cái giá là instance chết thì cả cổng lẫn Chấm công
cùng chết. Tách instance mua được tính độc lập đó, đổi lại thêm một thứ phải sao lưu và giám
sát. Vẫn để ở mục 21 cho anh quyết.

---

## 15. Chấm công: từ nơi cấp danh tính thành module

Đây là phần rủi ro nhất, vì Chấm công đang chạy thật và trả lương thật.

### Cái gì chuyển sang cổng

| Tệp hiện tại | Số phận |
|---|---|
| `may_chu/src/bao_mat/microsoft.ts` | **Chuyển** sang cổng |
| `may_chu/src/bao_mat/mat_khau.ts` | **Chuyển** sang cổng |
| `may_chu/src/bao_mat/jwt.ts` | **Chuyển** sang cổng, đổi HS256 → RS256 |
| `may_chu/src/tuyen/dang_nhap.ts` | **Chuyển** sang cổng |
| `may_chu/src/bao_mat/xac_thuc.ts` | **Ở lại**, đổi ruột: xác minh bằng JWKS thay vì bí mật chung |
| `may_chu/src/bao_mat/quyen_ho_so.ts` | **Ở lại nguyên vẹn** — quyết định nghiệp vụ là việc của module |

Sau khi chuyển, `xac_thuc.ts` giữ nguyên bề mặt hàm (`can_dang_nhap`, `can_nhan_su`,
`can_admin`, `nguoi_dung_hien_tai`). **Không route nghiệp vụ nào phải sửa** — đó là phần
thưởng cho việc trước đây đã gom xác thực vào một chỗ.

### Tài khoản chuyển thế nào

Cổng dựng `nguoi_dung` từ bảng của Chấm công, khớp theo **AAD object id**, không khớp được
thì theo email. Vì đã chốt chỉ đăng nhập bằng Microsoft (mục 3), **không chuyển băm mật khẩu**
— tài khoản nào không khớp được với Entra thì không dùng được nữa, phải xử lý xong trong bước
đối soát trước khi sang giai đoạn B.

Bảng `nguoi_dung` của Chấm công **giữ lại**, thêm một cột:

```sql
alter table nguoi_dung add column cong_id uuid unique;
```

Đó là toàn bộ mối nối. Chấm công tra `cong_id = token.sub` để tìm bản ghi của mình, rồi mọi
thứ khác chạy như cũ. Vai trò trong bảng cũ trở thành dữ liệu chết, dọn ở giai đoạn C.

### Ba giai đoạn, không có ngày nào gãy

**A — Cổng chạy song song.** Cổng phát token RS256. Chấm công **chấp nhận cả hai**: token
RS256 của cổng và token HS256 của chính nó. Đăng nhập cũ vẫn hoạt động. Không ai thấy gì
khác.

**B — Chuyển đường đăng nhập.** Web và app điện thoại trỏ sang `/cong/dang-nhap`. Người dùng
đăng nhập qua cổng. Token HS256 cũ vẫn được chấp nhận cho tới khi hết hạn — 30 ngày cho token
làm mới, nên **giai đoạn này phải kéo dài hơn 30 ngày** hoặc chấp nhận cho mọi người đăng
nhập lại một lần. Chọn cách nào cũng được, nhưng phải chọn trước, không phát hiện giữa chừng.

**C — Dọn.** Gỡ đường đăng nhập cũ, gỡ mã HS256, xóa `JWT_SECRET` khỏi `.env` của Chấm công,
xóa cột vai trò cũ.

Chỉ được sang giai đoạn sau khi giai đoạn trước đã chạy ổn định trọn một chu kỳ tính lương.

---

## 16. App điện thoại

**App hiện chưa có đăng nhập Microsoft.** `dien_thoai/nguon/api.ts` chỉ có `dang_nhap(ten_dang_nhap,
mat_khau)` và `doi_mat_khau()` — không có dòng nào nói chuyện với Entra. Vì đã chốt chỉ đăng
nhập bằng Microsoft, việc này chuyển từ "nên làm" thành **đường găng**: app không viết lại
thì nhân viên không vào được app, dù web đã chạy.

Nên làm giai đoạn này **song song** với giai đoạn A của mục 15, đừng để tới cuối.

App native có ba ràng buộc khác web:

- **Không có `localStorage`.** Token vào `expo-secure-store` (Keychain / Keystore), không
  phải `AsyncStorage`.
- **OAuth phải mở trình duyệt hệ thống** (`expo-web-browser`), không phải WebView nhúng.
  Entra ID từ chối WebView nhúng, và làm thế cũng là dạy người dùng gõ mật khẩu công ty vào
  một khung không kiểm chứng được.
- **Cần redirect URI riêng** dạng deep link cho app, thêm vào Entra bên cạnh URI của web.

Việc này đủ lớn để làm thành một giai đoạn riêng, sau khi web đã chạy ổn.

---

## 17. Caddyfile hợp nhất

Caddy chạy trực tiếp trên máy chủ (không trong Docker), nên mọi đích đến là `127.0.0.1`.

```caddyfile
# ---------------------------------------------------------------- HTTP (cổng 80)
# CHỈ phục vụ máy chấm công. Firmware ZKTeco không làm được TLS, và gặp 301/302 thì
# nhiều bản coi là lỗi rồi bỏ luôn cả lô dữ liệu — đường này KHÔNG chuyển hướng.
http://<tên miền> {
	handle /iclock/* {
		reverse_proxy 127.0.0.1:8080
	}
	handle {
		redir https://{host}{uri} permanent
	}
}

# ---------------------------------------------------------------- HTTPS (cổng 443)
<tên miền> {
	encode gzip

	# ---- Webhook bot Teams ----
	# TRƯỚC ĐÂY khối này là `handle { }` bắt tất. Thu về `/api/*` để nhả gốc tên miền
	# cho cổng. Bot chỉ khai đúng `/api/messages` (config/openclaw.json), `/api/*` là
	# hẹp vừa đủ mà vẫn chừa chỗ cho đầu mối chưa ghi trong tài liệu.
	handle /api/* {
		reverse_proxy 127.0.0.1:3978
	}
	handle_path /dev/* {
		reverse_proxy 127.0.0.1:3979
	}

	# ---- Module: Chấm công ----
	# Chỉ cắt '/chamcong', GIỮ LẠI '/api' vì máy chủ đăng ký route ở tiền tố đó.
	# Dùng handle_path ở đây là sai: nó cắt cả '/api' và mọi lời gọi thành 404.
	handle /chamcong/api/* {
		uri strip_prefix /chamcong
		reverse_proxy 127.0.0.1:8080
	}
	handle /chamcong/health {
		uri strip_prefix /chamcong
		reverse_proxy 127.0.0.1:8080
	}
	# Webapp tĩnh: nginx trong container phục vụ ở gốc, còn Vite đã nhúng sẵn tiền tố
	# vào đường dẫn tệp tĩnh — ở đây cắt cả tiền tố là đúng.
	handle_path /chamcong/* {
		reverse_proxy 127.0.0.1:8081
	}
	# Thiếu gạch chéo cuối thì đường dẫn tương đối của Vite trỏ sai chỗ.
	redir /chamcong /chamcong/ permanent

	# ---- Module: AI Agent (khi có) ----
	# handle /agent/api/* { uri strip_prefix /agent
	#                       reverse_proxy 127.0.0.1:8091 }
	# handle_path /agent/* { reverse_proxy 127.0.0.1:8092 }

	# ---- Máy chấm công gọi bằng HTTPS: chỉ để thử bằng curl ----
	handle /iclock/* {
		reverse_proxy 127.0.0.1:8080
	}

	# ---- Bí danh ngắn: danh sách có kiểm soát, kiểm trùng lúc đăng ký module ----
	redir /cham-cong  /chamcong/           302
	redir /bang-cong  /chamcong/bang-cong  302

	# ---- Cổng: gốc tên miền VÀ mọi đường không ai nhận ----
	# Cổng tự phục vụ /cong/*, /chung/* và trang 404 của chính nó.
	handle {
		reverse_proxy 127.0.0.1:8090
	}
}
```

Ba điểm phải kiểm bằng mắt:

- `handle /chamcong/api/*` phải thắng `handle_path /chamcong/*`. Caddy xếp các khối `handle`
  theo độ cụ thể của đường dẫn nên đúng theo lý thuyết — **vẫn phải kiểm bằng `curl`** ở
  mục 18.
- Khối `http://` làm **tắt** cơ chế tự chuyển HTTP → HTTPS cho toàn site, nên phải tự viết
  lại `redir`. Thiếu dòng đó là webapp bị phục vụ qua HTTP thường.
- `PROXY_TIN_CAY=172.16.0.0/12`, không phải `127.0.0.1/32`: Caddy chạy trên máy chủ nối vào
  cổng đã publish của Docker, nên container thấy địa chỉ nguồn là gateway của mạng Docker.
  Khai sai thì `ICLOCK_IP_CHO_PHEP` mất tác dụng vì mọi request trông như cùng một IP.

---

## 18. Runbook giai đoạn A

Mỗi bước có điều kiện hoàn thành (DoD) và cách lùi.

### Bước 0 — Ghi nhớ trạng thái trước khi đụng gì

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://<tên miền>/
cp /etc/caddy/Caddyfile /root/Caddyfile.truoc-cong-chung
ss -tlnp | grep -E ':(80|443|3978|3979|8080|8081|8090)\b'
```

Bot Teams đang phục vụ người thật. Làm hỏng nó là hỏng ngay, không đợi ai phát hiện.

### Bước 1 — Sinh cặp khóa của cổng

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out cong-2026-08.key
chmod 600 cong-2026-08.key
```

**DoD:** khóa riêng chỉ `root` đọc được, **không** nằm trong bất kỳ kho mã nào, đã có trong
danh sách sao lưu.
**Lùi:** không có gì để lùi, chưa ai dùng.

### Bước 2 — Dựng cổng, chưa nối vào đâu

Chạy cổng ở `127.0.0.1:8090`. Nhập tài khoản từ Chấm công (mục 15).

**DoD:**
```bash
curl -s http://127.0.0.1:8090/cong/.well-known/jwks.json | grep -q '"kid"'
```
và đăng nhập thử bằng một tài khoản thật, nhận được token giải mã ra đúng `quyen`.
**Lùi:** dừng service. Chưa ai dùng.

### Bước 3 — Chấm công chấp nhận cả hai loại token

Sửa `may_chu/src/bao_mat/xac_thuc.ts`: thử RS256 qua JWKS trước, không được thì rơi về HS256.

**DoD:** `npm test` và `npm --workspace may_chu run test_e2e` xanh; đăng nhập bằng đường cũ
vẫn hoạt động; token của cổng cũng gọi được API.
**Lùi:** revert commit, dựng lại `may_chu`.

### Bước 4 — Đổi Caddyfile

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

**DoD** — cả tám lệnh phải đúng:

```bash
curl -s -o /dev/null -w 'bot        %{http_code}\n' https://<tên miền>/api/messages
curl -s -o /dev/null -w 'goc        %{http_code}\n' https://<tên miền>/
curl -s -o /dev/null -w 'cong       %{http_code}\n' https://<tên miền>/cong/dang-nhap
curl -s              -w '\njwks     %{http_code}\n' https://<tên miền>/cong/.well-known/jwks.json
curl -s -o /dev/null -w 'webapp     %{http_code}\n' https://<tên miền>/chamcong/
curl -s              -w '\nhealth   %{http_code}\n' https://<tên miền>/chamcong/health
curl -s -o /dev/null -w 'iclock     %{http_code}\n' http://<tên miền>/iclock/cdata
curl -s -o /dev/null -w 'redir 80   %{http_code}\n' http://<tên miền>/chamcong/
```

- `bot` phải là **401** — y như trước khi đổi. Đây là dấu hiệu tốt, không phải lỗi:
  `scripts/healthcheck.sh` của `openclaw-teams` cũng kiểm bằng đúng mã này.
- `goc` phải trả trang chủ **cổng**. Trả nội dung của bot nghĩa là khối thu hẹp `/api/*`
  chưa có hiệu lực.
- `health` phải trả JSON `{"trang_thai":"ok",...}`. Trả HTML của bot nghĩa là thứ tự khối
  `handle` sai.
- `redir 80` phải là 301; `iclock` **không** được là 301.

**Rồi nhắn thật cho bot trong Teams.** `curl` trả 401 chỉ chứng minh Caddy tới được cổng
3978, không chứng minh Bot Framework vẫn gửi được. Bước này là bắt buộc vì thay đổi ở trên
**thu hẹp** đường của bot, đi ngược quy ước "chỉ thêm, không bớt" của `openclaw-teams`.

**Lùi:** `cp /root/Caddyfile.truoc-cong-chung /etc/caddy/Caddyfile && systemctl reload caddy`.

### Bước 5 — Kiểm bằng người thật

Đăng nhập bằng tài khoản Microsoft, mở bảng công, mở một hồ sơ nhân viên, tải một tệp đính
kèm. Bốn việc này đi qua bốn cơ chế khác nhau: OAuth redirect, API thường, route có tham số,
route phục vụ tệp có phân quyền.

### Bước 6 — Xác nhận máy chấm công vẫn đẩy log

Bước hay bị quên và hỏng âm thầm nhất. Máy ZKTeco không báo lỗi, chỉ là bảng công thiếu dữ
liệu, và vài ngày sau mới có người phát hiện.

```bash
node trien_khai/kiem_tra.mjs   --may-chu http://<tên miền>
node trien_khai/gia_lap_may.mjs --may-chu http://<tên miền>
```

**DoD:** lần quẹt giả lập hiện trên `/chamcong/lan-quet`.

---

## 19. Rủi ro đã biết

| # | Rủi ro | Vì sao xảy ra | Cách chặn |
|---|---|---|---|
| 1 | Module tự ký được token quản trị | Dùng HS256 và chia bí mật cho module | RS256 + JWKS (mục 4). Khóa riêng không rời khỏi cổng. |
| 2 | `alg=none` / nhầm khóa công khai thành bí mật HMAC | Đọc `alg` từ header rồi tin theo | Danh sách trắng `alg` cứng trong mã (mục 4) |
| 3 | Xoay khóa làm chết cả cụm | Module cache JWKS mà không tải lại khi gặp `kid` lạ | Bắt buộc trong hợp đồng module + kiểm khi nghiệm thu |
| 4 | Cổng chết là cả cụm chết | Mọi đăng nhập đi qua một chỗ | Token sống 15 phút nên cổng chết vẫn dùng tiếp được ~15 phút. Healthcheck + autoheal như `openclaw`. |
| 5 | Open redirect qua `quay_lai` | Không kiểm đích chuyển hướng | Chỉ nhận đường dẫn nội bộ (mục 3) |
| 6 | Đụng đường `/api` | Caddyfile của bot `handle { reverse_proxy 3978 }` bắt tất, kể cả `/api/*` | Module bắt buộc nằm dưới tiền tố riêng. Kiểm bằng lệnh `health` ở bước 4. |
| 6b | **Bot ngừng nhận tin sau khi nhả gốc** | Thu `handle { }` về `/api/*` là thay đổi **bớt**, đi ngược quy ước ADDITIVE của `openclaw-teams`. Nếu bot còn đầu mối nào ngoài `/api/*` chưa ghi trong tài liệu thì đầu mối đó rơi sang cổng | Thu về `/api/*` chứ không phải `/api/messages`. Nghiệm thu bằng **cả hai**: `curl` trả 401 **và** nhắn thật trong Teams (bước 4). Lùi bằng tệp sao lưu ở bước 0. |
| 7 | `handle_path` cắt nhầm tiền tố | `handle_path /chamcong/api/*` cắt cả `/api`, máy chủ trả 404 | `handle` + `uri strip_prefix` cho đường API |
| 8 | Máy chấm công ngừng đẩy log | `/iclock` bị ép sang HTTPS hoặc bị kéo vào cổng | Bước 6. `iclock` phải trả 200, không phải 301. |
| 9 | Đổi tiền tố mà không dựng lại | `VITE_BASE` là biến lúc **build**, Vite thay lúc biên dịch | Dựng lại image `web`, không chỉ restart |
| 10 | Tranh cổng 80/443 | Bật `COMPOSE_PROFILES=ten_mien` của Chấm công sẽ dựng Caddy thứ hai, cướp cổng, giết bot | **Không bao giờ** bật profile đó trên VPS này |
| 11 | XSS ở một module lộ token cả cụm | Hệ quả của việc chung origin (mục 2) | Module bên thứ ba phải ra subdomain riêng. Giữ CSP `default-src 'self'`. |
| 12 | Mọi người bị đăng xuất giữa kỳ lương | Giai đoạn B ngắn hơn hạn 30 ngày của token làm mới | Chọn trước: kéo dài giai đoạn B > 30 ngày, hoặc báo trước sẽ đăng nhập lại một lần |
| 13 | Secret Entra hết hạn | `--years 2` là hạn dài nhất, hết hạn thì đăng nhập chết không báo trước. Chỉ dùng Microsoft nên **cả cụm** ngừng đăng nhập, không riêng Chấm công | Ghi ngày hết hạn vào lịch ngay khi tạo; cảnh báo trước 60 ngày; tài khoản thoát hiểm (mục 3) |
| 14 | Nhân viên mới không xem được bảng công của mình | Đã xác nhận ai cũng có tài khoản Microsoft, nhưng người **mới** thì chưa. Quẹt vân tay được (máy không cần tài khoản) mà không đăng nhập được | Đưa "tạo tài khoản Entra" vào quy trình nhận việc, làm trước ngày đi làm đầu tiên (mục 3) |
| 14b | Tài khoản Entra không khớp được với bản ghi nhân viên | Hòm thư dùng chung, một người hai tài khoản, người đã nghỉ mà bản ghi còn hoạt động | Đối soát theo AAD object id trước, email sau, phần còn lại xử lý tay — **xong trước** giai đoạn B (mục 15) |
| 15 | Entra hỏng / cấu hình sai là không ai vào được, kể cả quản trị viên | Một nguồn danh tính duy nhất | Tài khoản thoát hiểm cục bộ, mặc định vô hiệu hóa (mục 3) |
| 16 | App điện thoại thành nút thắt | App chưa có đăng nhập Microsoft; chốt bỏ mật khẩu là app hết đường vào | Làm song song giai đoạn A, không để cuối (mục 16) |

---

## 20. Khối lượng

| GĐ | Nội dung | Ước lượng |
|---|---|---|
| 1 | Cổng: đăng nhập Entra, RS256 + JWKS, sổ đăng ký module, cấp quyền, trang chủ | 5–8 ngày |
| 2 | Thanh điều hướng chung `/chung/*`, sinh CSS từ `token.json` + test | 2–3 ngày |
| 3 | Chấm công thành module (giai đoạn A → C ở mục 15) | 4–6 ngày + thời gian chờ giữa các giai đoạn |
| 4 | App điện thoại: **viết mới** đăng nhập Microsoft (PKCE, trình duyệt hệ thống, secure store, deep link) — làm **song song** giai đoạn 3, không để cuối | 4–5 ngày |
| 5 | Module AI Agent — xem `ai_agent/tai_lieu/TRANG-QUAN-TRI.md` | tài liệu riêng |
| — | `rfid`, `tool` | khi hai kho có nội dung |

Giai đoạn 1 và 2 làm được song song với việc khác. Giai đoạn 3 thì không: nó đụng vào hệ
đang trả lương, làm một mình và làm chậm.

---

## 21. Còn phải quyết

1. **Giữ tiền tố `/chamcong`, hay chuyển sang subdomain cho từng module?** (mục 2) Giữ tiền
   tố thì SSO miễn phí nhờ chung `localStorage` và không phải sửa gì; subdomain thì URL sạch
   và có ranh giới bảo mật thật, nhưng phải chuyển sang cookie, mở CORS, và viết lại tầng
   token của cả web lẫn app điện thoại. Đề xuất: giữ tiền tố + bảng bí danh; đổi sang
   subdomain chỉ khi có module do bên ngoài viết.
2. **Giai đoạn B kéo dài hơn 30 ngày, hay chấp nhận cho mọi người đăng nhập lại một lần?**
3. **Cổng dùng chung instance PostgreSQL với Chấm công hay instance riêng?** (mục 14)
4. Sửa `/etc/caddy/Caddyfile` thì phải cập nhật bản trong kho `ai_agent` cho khớp, nếu không
   `scripts/drift.sh` sẽ báo lệch. Lần này bắt buộc, vì thay đổi chạm thẳng vào tuyến của bot.

## 22. Đã chốt, không bàn lại

- **Tên miền:** `teams.tranhoangvietnam.com` là cổng chung chính. Sau mục 2 thì nó thuộc về
  cổng chứ không còn thuộc về bot.
- **Đăng nhập:** chỉ qua Microsoft Entra ID (mục 3), kèm đúng một tài khoản thoát hiểm cục bộ
  mặc định vô hiệu hóa.
- **Phạm vi người dùng:** mọi nhân viên đều có tài khoản Microsoft, nên không cần đường đăng
  nhập thứ hai cho nhân viên tuyến đầu. Vẫn còn hai việc kèm theo: đối soát tài khoản Entra ↔
  bản ghi nhân viên (rủi ro 14b), và đưa việc tạo tài khoản Entra vào quy trình nhận việc
  (rủi ro 14).
- **Kiến trúc:** mô-đun. Cổng giữ danh tính, khóa và quyền; module chỉ xác minh token.
  RS256 + JWKS, quyền tách theo từng module.
- **Kho:** cổng nằm ở kho riêng `cong-noi-bo` (mục 14), không dựng trong kho của module nào.
  `CONG-CHUNG.md` và `KET-NOI-MODUN.md` chuyển sang đó ngay khi kho tồn tại.
- **Module không hỏi cổng ở mỗi request.** Xác minh chữ ký cục bộ bằng JWKS. Cổng chỉ nằm
  trên luồng đăng nhập (mục 9), và cố ý không có đầu mối "kiểm tra quyền cho tôi" (mục 11).
