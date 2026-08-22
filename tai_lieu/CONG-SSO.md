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
| 2 | Khai phân hệ vào sổ đăng ký của cổng, **bật `bat = true`** | phía cổng | chưa ai có quyền |
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

> ### Cấp quyền là việc của NGƯỜI THẬT — không tự động hoá được
>
> Cổng có một chốt gọi là `can_nguoi_that`: **cấp quyền, đặt mật khẩu và tạo bí mật dịch vụ chỉ
> người thật đang đăng nhập làm được.** Token dịch vụ bị từ chối **403** ở ba việc đó, kể cả khi
> nó có `cong.quan_tri`.
>
> Hệ quả cần biết trước khi lập kế hoạch: **đừng thiết kế luồng nào tự cấp quyền cổng cho nhân
> viên** — ví dụ "nhân sự khai hồ sơ xong thì hệ thống tự cấp `chamcong: nhan_vien`". Nó sẽ ăn
> 403, và đó là chốt làm đúng việc của nó chứ không phải lỗi. Kể cả script deploy của cổng cũng
> chỉ cấp `cong.quan_tri` (đường vào tối thiểu để quản trị viên mở được trang) và **không bao
> giờ** cấp quyền module.
>
> Cấp bằng tay ở `/cong/quan-tri` → tab **Người dùng** → **Quyền**. Đường đó `PUT .../quyen`
> xoá hết quyền cũ rồi chèn lại bộ mới **trong một giao dịch**, nên nó cũng là cách dọn một
> dòng quyền mồ côi (xem R13a): cấp lại bằng mã đúng thì dòng mã cũ biến luôn.
>
> Và một cái bẫy đọc log: bước khởi tạo của `len_vps.sh` in `[module] chamcong — tat` ở **mọi**
> lần deploy, kể cả khi module đang bật. Dòng đó in hằng số trong mã nguồn, không phải giá trị
> trong CSDL — `on conflict do update` của cổng không đụng `bat`. Muốn biết trạng thái thật thì
> hỏi CSDL:
>
> ```bash
> cd /srv/cong && docker compose exec -T csdl_cong psql -U cong -d cong \
>   -c "select ma, bat from module order by ma;"
> ```

> ### `bat = true` phải bật NGAY ở bước 2, không để tới lúc ký nhận
>
> Bản đầu của hợp đồng bảo mật viết: *"module chưa qua đủ checklist thì chưa được bật
> `bat = true`"*. Nhưng bên cổng, `doc_quyen` có `join module m on m.ma = q.module_ma and m.bat`
> — nên `bat = false` làm `token.quyen['chamcong']` **luôn rỗng**. Làm theo thứ tự đó thì ta cấp
> quyền, đăng nhập, thấy quyền rỗng, và đi tìm lỗi trong mã của chính mình. Quản trị cổng đã
> phát hiện và sửa lại tài liệu.
>
> Bật `bat` **không** mở đường vào phân hệ: nó chỉ thêm một thẻ trên trang chủ cho người đã
> được cấp quyền, và cho vai trò chảy vào token. Cái có hậu quả là **bước 4** (cổng gác) và
> việc cấp quyền cho **người dùng thật** — hai thứ đó mới là chốt của checklist.
>
> Cũng vì vậy: **đừng dựa vào `bat = false` để chặn truy cập.** Nó chỉ ẩn mục menu và bỏ vai trò
> khỏi token **mới**; token đã phát còn mang vai trò tới 15 phút, và bản thân phân hệ vẫn chạy
> và vẫn phục vụ. Muốn chặn thật thì tắt khối `handle` ở Caddy hoặc tắt dịch vụ; muốn chặn một
> **người** thì vô hiệu hoá tài khoản.

### Một chỗ vênh đã xảy ra thật, ở đúng bước này

Sổ đăng ký lúc đầu khai mã vai trò là **`admin`**, còn mã của chúng ta đọc là **`quan_tri`**.
Đó là vênh **âm thầm** theo đúng nghĩa xấu nhất: `ma` là thứ đi vào token và vào
`quyen_nguoi_dung`, nên cấp `chamcong.admin` là cấp một vai trò mà mã của ta **không bao giờ
nhận ra** — không báo lỗi ở đâu, người được cấp chỉ đơn giản là không có quyền. Quản trị cổng
đã sửa thành đúng năm mã ở bảng trên.

Đây chính là lý do bảng `DOI_VAI_TRO` được gọi là *một nửa của một hợp đồng*. Sau khi bên cổng
deploy, kiểm lại năm mã đã vào đúng — một dòng trên VPS:

```bash
docker compose exec -T csdl_cong psql -U cong -d cong -tAc \
  "select jsonb_pretty(vai_tro) from module where ma='chamcong';"
```

---

## 4. Bước 2 phía mã — ĐÃ XONG

Ba tệp:

- `migrations/029_cong_sso.sql` — thêm `nguoi_dung.cong_sub` (id tài khoản bên cổng) và một
  chỉ mục duy nhất trên nó.
- `may_chu/src/bao_mat/cong_phien.ts` — móc một token của cổng sang một bản ghi `nguoi_dung`.
- `may_chu/src/bao_mat/xac_thuc.ts` — hook `can_dang_nhap` nhận **cả hai** loại token.

**Khoá móc là `sub`, không phải email.** Cổng bảo đảm `sub` ổn định vĩnh viễn; email đổi được —
đổi tên người, đổi tên miền, đổi phòng. Hệ thống này đã dính đúng cái bẫy đó ở đường đăng nhập
Microsoft: trước 1.32.0 chỉ khớp bằng email, nên đổi email bên Entra là mất khớp, và lần đăng
nhập kế tiếp **tạo một tài khoản thứ hai** cho cùng một người. Email vẫn dùng để đối chiếu
**lần đầu**, rồi ghi `cong_sub` lại để từ đó không phải đoán nữa.

**Vai trò lấy từ token, không lấy từ cột `nguoi_dung.vai_tro`.** Cột đó chỉ để hiển thị trên
trang Tài khoản, và được cập nhật theo token để nó không nói dối — nhưng không một quyết định
phân quyền nào đọc nó. Đọc cột trong CSDL nghĩa là **thu hồi quyền bên cổng không còn tác
dụng**, và đó là điều tệ nhất có thể làm với một hệ SSO.

Ba trạng thái "đã đăng nhập thật nhưng chưa vào được", cả ba đều ra **403** kèm cờ riêng trong
thân phản hồi, **không** ra 401:

| Trạng thái | Cờ | Nghĩa |
|---|---|---|
| `quyen` rỗng hoặc thiếu khóa `chamcong` | `chua_cap_quyen` | cổng chưa cấp vai trò |
| Vai trò cần hồ sơ mà tài khoản chưa nối hồ sơ | `chua_noi_ho_so` | nhân sự chưa khai hồ sơ |
| Tài khoản bị vô hiệu hoá **bên ta** | — | khoá tại chấm công |

401 ở ba chỗ này làm giao diện đẩy người dùng về trang đăng nhập: họ đăng nhập lại, thành công,
rồi lại bị đẩy ra — một vòng lặp không bao giờ thoát, và việc duy nhất họ làm được là gọi cho
hỗ trợ.

Trạng thái thứ hai đáng nói riêng. Nếu cho qua với `nv = null` thì mọi đường `/api/toi/*` trả về
rỗng — trông y như hệ thống mất dữ liệu, và người dùng không có cách nào biết phải gọi ai.

**Ánh xạ danh tính được cache 60 giây**, còn **quyết định phân quyền thì không** — nó tính lại
từ token ở mỗi request. Hệ quả phải biết: vô hiệu hoá một tài khoản **bên chấm công** có hiệu
lực trong vòng một phút, còn thu hồi **bên cổng** thì tối đa 15 phút (tuổi của access token).

---

## 5. Bước 3 và 4 — chưa làm

- **Bước 3:** bỏ đường đăng nhập riêng — không còn chỗ nào nhận mật khẩu, webapp không hiện
  form mà chuyển hướng sang `https://teams.tranhoangvietnam.com/?quay_lai=/chamcong/<đường muốn
  tới>`. Phép kiểm `quay_lai` (đúng một `/` đầu, không `//`, không `\`, không ký tự điều khiển)
  đã có sẵn ở `la_duong_dan_noi_bo()`.
- **Bước 4:** chạy `chan_duong.sh /chamcong` trên VPS. **DỪNG và báo quản trị cổng trước** — đây
  là bước sửa Caddyfile dùng chung, cái duy nhất có thể làm sập bot Teams đang chạy trên cùng
  tên miền.

### Giai đoạn chuyển tiếp đang chạy: trình duyệt qua cổng, app tạm giữ đường cũ

Bật `CONG_SSO_BO_DANG_NHAP_RIENG=1` thì đường mật khẩu bị chặn **cho trình duyệt**, còn app
native tạm thời vẫn đi được. Phân biệt bằng `Origin` và `Sec-Fetch-*`: trình duyệt tự đặt chúng
và **mã JavaScript trong trang không xoá được** — nên một trang web không thể tự giả dạng thành
app. `fetch` của React Native không gửi header nào trong số đó.

Nhờ vậy *"không còn form đăng nhập nào chạy được trong trình duyệt"* trở thành một điều **có
thể buộc**, không chỉ là một lời hứa.

**Đây KHÔNG phải một ranh giới bảo mật.** `curl` không gửi `Origin` nên đi được đường app. Nó là
ranh giới **trải nghiệm**, và nó đạt đúng cái đích của bước 3: không nhân viên nào còn được dạy
gõ mật khẩu công ty vào một trang không phải cổng — mà cũng không ai mất chấm công trên điện
thoại trong lúc chờ app có đường mới.

`GET /health` trả `dang_nhap` để trạng thái này **nhìn thấy được**, vì một cửa vào không MFA
chưa đóng mà không ai thấy thì nó thành vĩnh viễn:

| `dang_nhap` | Nghĩa |
|---|---|
| `rieng` | chưa khai cổng, chỉ có đường đăng nhập riêng |
| `cong+rieng` | đã khai cổng, hai đường song song (công tắc tắt) |
| `cong+app_tam` | **giai đoạn chuyển tiếp**: trình duyệt buộc qua cổng, app còn đường cũ |

Và máy chủ ghi một dòng cảnh báo mỗi lần đường app tạm được dùng, để con số đó giảm về 0 trước
khi xoá hẳn — chứ không phải đoán.

**Khi app đã có đường qua cổng:** xoá `chan_cua_cu_web()`, đổi các chỗ gọi nó sang
`chan_cua_cu()`, và xoá `cong+app_tam` khỏi `/health`. Ghi ngay trong chú thích của hàm đó.

### App điện thoại — ba lối, và lối thứ ba là lối đúng

App hiện đăng nhập bằng `POST /api/xac-thuc/dang-nhap` và giữ token làm mới 30 ngày của chính
hệ thống chấm công. Cổng không phát token cho app di động theo đường đó.

| Lối | Được | Mất |
|---|---|---|
| WebView nhúng mở màn đăng nhập cổng | app không giữ mật khẩu | phải phát hành lại app. Và Microsoft **khuyến nghị không dùng** WebView nhúng: một số cấu hình Conditional Access (đòi thiết bị đã đăng ký, hoặc đòi broker) **từ chối** WebView nhúng — nên nút Microsoft 365 trong WebView có thể đơn giản là không chạy |
| Giữ đường mật khẩu riêng cho app | không phải sửa app | vi phạm đúng cái bước 3 muốn bỏ, và duy trì một cửa vào **không MFA** song song |
| **Trình duyệt hệ thống + custom scheme** (`AuthSession` của Expo) | chuẩn cho app native (RFC 8252), Entra hỗ trợ đầy đủ, app không bao giờ thấy mật khẩu, dùng lại được phiên trình duyệt sẵn có | vẫn phải phát hành lại app, và cần cổng thêm danh sách trắng redirect URI dạng `thvcc://` |

Lối 3 tốn thêm việc ở phía cổng nhưng là lối duy nhất không phải làm lại lần nữa. Phần việc bên
cổng (danh sách trắng redirect + test) do quản trị cổng làm, không phải đội chấm công.

> **Một điểm bảo mật phải chốt cùng lối 3.** Custom scheme **bị chiếm được**: trên Android một
> app khác có thể đăng ký cùng `thvcc://` và nhận cú redirect. Nên đường quay về **không được
> mang token** — nó phải mang một **mã uỷ quyền dùng một lần** (authorization code + PKCE), thứ
> vô dụng với ai không giữ `code_verifier`. Nếu cổng đặt access token và refresh token vào
> fragment của `thvcc://...` giống cách đường Microsoft hiện tại làm với webapp, thì một app
> độc hại chiếm scheme sẽ lấy được **refresh token 30 ngày**.
>
> Mạnh hơn nữa, nếu cổng làm được: dùng **App Links / Universal Links** —
> `https://teams.tranhoangvietnam.com/chamcong/app-goi-ve`, xác thực bằng quyền sở hữu tên miền
> — thì không app nào chiếm được đường quay về. Cổng đã sở hữu tên miền đó.

---

## 6. Tự kiểm

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
