# Nối một service mới vào cổng chung

Tài liệu cho người viết module. Kiến trúc đầy đủ ở [`CONG-CHUNG.md`](CONG-CHUNG.md); ở đây
chỉ có hợp đồng và mã ví dụ.

Tóm tắt hợp đồng trong một câu: **cổng lo đăng nhập và quyền, module chỉ xác minh token rồi
làm việc của mình.**

---

## Sáu bước

### 1. Khai module vào sổ đăng ký

```sql
insert into module (ma, ten, mo_ta, tien_to, icon, thu_tu, bat, vai_tro) values
  ('rfid', 'RF-ID', 'Quản lý thẻ và đầu đọc', '/rfid', 'nfc', 30, false,
   '["quan_tri","van_hanh","xem"]'::jsonb);
```

- `ma` — không dấu, chữ thường, không đổi về sau. Nó nằm trong token của **mọi** người dùng.
- `vai_tro` — các mức quyền do **module tự khai**. Cổng chỉ giữ và gán, không diễn giải.
- `bat` — để `false` cho tới khi có nội dung thật. Một mục menu dẫn tới trang trống thì tệ
  hơn là không có mục đó.

### 2. Thêm một khối vào Caddyfile

```caddyfile
# API: chỉ cắt tiền tố của module, GIỮ LẠI '/api'.
handle /rfid/api/* {
	uri strip_prefix /rfid
	reverse_proxy 127.0.0.1:<cổng API>
}
# Giao diện tĩnh: cắt cả tiền tố.
handle_path /rfid/* {
	reverse_proxy 127.0.0.1:<cổng web>
}
redir /rfid /rfid/ permanent
```

Đừng dùng `handle_path` cho đường API — nó cắt luôn `/api` và mọi lời gọi thành 404.

### 3. Không tự làm đăng nhập

Không thấy token hợp lệ thì chuyển hướng, **không** hiện form đăng nhập của riêng mình:

```
/cong/dang-nhap?quay_lai=/rfid/the/123
```

Module **không bao giờ** lưu mật khẩu, không nhận khóa riêng, không tự phát hành token.

### 4. Xác minh token

Đọc `Authorization: Bearer <token>`, rồi:

| Kiểm | Giá trị đúng |
|---|---|
| Chữ ký | khóa công khai lấy từ `/cong/.well-known/jwks.json` theo `kid` |
| `alg` | **danh sách trắng cứng trong mã** — chỉ `RS256` |
| `iss` | `https://<tên miền>/cong` |
| `aud` | chứa `cong-noi-bo` |
| `exp` | chưa quá hạn |
| `loai` | `tc` cho người dùng, `dv` cho dịch vụ. Token `lm` (làm mới) **không** gọi API được. |

Rồi đọc quyền của **chính module mình**:

```
vai_tro = token.quyen["rfid"]        // mảng, có thể rỗng
```

- Mảng rỗng hoặc thiếu khóa → đã đăng nhập nhưng chưa được cấp quyền. Hiện màn hình "Tài
  khoản của bạn chưa được cấp quyền ở phân hệ này", **không** trả về màn hình đăng nhập —
  người dùng sẽ đăng nhập lại vô ích mãi.
- Đọc `quyen` của module khác là vượt ranh giới.

### 5. Nhúng thanh điều hướng chung

```html
<script defer src="/chung/thanh_dieu_huong.js"></script>
<link rel="stylesheet" href="/chung/thanh_dieu_huong.css">
```

Script tự đọc phiên, tự vẽ menu theo quyền, tự đánh dấu mục đang mở. Module không truyền gì
vào.

### 6. Móc người dùng của cổng sang bản ghi của mình

```sql
alter table nguoi_dung_rfid add column cong_id uuid unique;
```

Tra theo `token.sub` — id tài khoản trên cổng, ổn định vĩnh viễn. **Đừng dùng `email` làm
khóa**, email đổi được.

---

## Payload token

```json
{
  "iss": "https://<tên miền>/cong",
  "aud": "cong-noi-bo",
  "sub": "0f8b2c1e-...",
  "oid": "7c3a...",
  "email": "an.nv@tranhoangvietnam.com",
  "ten": "Nguyễn Văn An",
  "quyen": { "chamcong": ["nhan_su"], "rfid": ["xem"] },
  "loai": "tc",
  "jti": "...", "iat": 1755168000, "exp": 1755168900
}
```

`sub` = id trên cổng (dùng làm khóa) · `oid` = AAD object id (dùng để đối chiếu với dữ liệu
Microsoft 365) · `email`, `ten` chỉ để hiển thị.

---

## Mã ví dụ

### TypeScript / Node

```ts
import { createPublicKey, createVerify } from 'node:crypto';

const GOC_CONG = 'https://<ten mien>/cong';
const MA_MODULE = 'rfid';

let bo_khoa = new Map<string, ReturnType<typeof createPublicKey>>();
let tai_luc = 0;
let dang_tai: Promise<void> | null = null;

async function nap_jwks(bat_buoc = false): Promise<void> {
  // Tai lai khi qua 1 gio, hoac khi gap kid la. Chan tai lai dong thoi va tai lai
  // lien tuc: token rac voi kid bia se thanh don DoS len cong neu khong chan.
  if (!bat_buoc && Date.now() - tai_luc < 3_600_000) return;
  if (Date.now() - tai_luc < 60_000 && bo_khoa.size > 0) return;
  dang_tai ??= (async () => {
    const res = await fetch(`${GOC_CONG}/.well-known/jwks.json`);
    const { keys } = await res.json() as { keys: Array<Record<string, string>> };
    bo_khoa = new Map(keys.map((k) => [k['kid'] as string,
      createPublicKey({ key: k as never, format: 'jwk' })]));
    tai_luc = Date.now();
  })().finally(() => { dang_tai = null; });
  await dang_tai;
}

export async function xac_minh(token: string) {
  const phan = token.split('.');
  if (phan.length !== 3) return null;
  const [h64, p64, chu_ky] = phan as [string, string, string];

  const header = JSON.parse(Buffer.from(h64, 'base64url').toString('utf8'));
  // Danh sach trang CUNG. Doc alg tu header roi tin theo la mo duong cho alg=none.
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;

  await nap_jwks();
  let khoa = bo_khoa.get(header.kid);
  if (khoa === undefined) {
    await nap_jwks(true);          // kid la -> cong vua xoay khoa
    khoa = bo_khoa.get(header.kid);
    if (khoa === undefined) return null;
  }

  const ok = createVerify('RSA-SHA256')
    .update(`${h64}.${p64}`)
    .verify(khoa, Buffer.from(chu_ky, 'base64url'));
  if (!ok) return null;

  const nd = JSON.parse(Buffer.from(p64, 'base64url').toString('utf8'));
  if (nd.iss !== GOC_CONG) return null;
  if (nd.aud !== 'cong-noi-bo') return null;
  if (nd.loai !== 'tc' && nd.loai !== 'dv') return null;   // token lam moi KHONG goi API
  if (typeof nd.exp !== 'number' || nd.exp * 1000 <= Date.now()) return null;

  return { ...nd, vai_tro: (nd.quyen?.[MA_MODULE] ?? []) as string[] };
}
```

### Python

```python
import time, requests, jwt                      # pip install "pyjwt[crypto]" requests

GOC_CONG  = "https://<ten mien>/cong"
MA_MODULE = "agent"

_khach = jwt.PyJWKClient(f"{GOC_CONG}/.well-known/jwks.json",
                         cache_keys=True, lifespan=3600)

def xac_minh(token: str) -> dict | None:
    try:
        khoa = _khach.get_signing_key_from_jwt(token)     # tu tai lai khi gap kid la
        nd = jwt.decode(
            token, khoa.key,
            algorithms=["RS256"],                          # danh sach trang CUNG
            issuer=GOC_CONG, audience="cong-noi-bo",
            options={"require": ["exp", "iss", "aud", "sub"]},
        )
    except jwt.PyJWTError:
        return None
    if nd.get("loai") not in ("tc", "dv"):
        return None
    nd["vai_tro"] = nd.get("quyen", {}).get(MA_MODULE, [])
    return nd
```

---

## Checklist nghiệm thu

Module chưa qua đủ mười mục này thì chưa được bật `bat = true`.

- [ ] Không có mã nào lưu mật khẩu, ký token, hay đọc khóa riêng.
- [ ] `alg` là danh sách trắng cứng trong mã, không đọc từ header rồi tin theo.
- [ ] Kiểm đủ `iss`, `aud`, `exp`, `loai`.
- [ ] Token `lm` (làm mới) bị từ chối khi gọi API.
- [ ] JWKS được cache, và **tải lại khi gặp `kid` lạ** — thử bằng cách xoay khóa trên môi
      trường thử: module phải tự phục hồi, không cần khởi động lại.
- [ ] Tải lại JWKS có giới hạn tần suất.
- [ ] Người dùng không có quyền ở module này thấy màn hình "chưa được cấp quyền", không phải
      vòng lặp đăng nhập.
- [ ] Dữ liệu ngoài phạm vi của người dùng trả **404**, không phải 403 — để không tiết lộ sự
      tồn tại. (Quy ước có sẵn của dự án.)
- [ ] Không đọc `quyen` của module khác.
- [ ] Không có đường nào bỏ qua xác minh trừ khi đã ghi vào mục 10 của `CONG-CHUNG.md` kèm
      lý do và cơ chế xác thực thay thế.

---

## Những gì module **không** được làm

| Không được | Vì sao |
|---|---|
| Nhận khóa riêng của cổng | Có khóa riêng là tự ký được token quản trị cho chính mình |
| Tự hiện form đăng nhập | Dạy người dùng gõ mật khẩu công ty vào nơi khác cổng |
| Ghi vào bảng người dùng của cổng bằng SQL | Cổng đổi lược đồ là module gãy. Đi qua API `/cong/api/*`. |
| Sửa `quyen` trong token | Token có chữ ký; sửa là chữ ký sai. Cấp quyền làm ở cổng. |
| Tin `quyen` do client gửi lên | Chỉ tin cái đọc ra từ token đã xác minh chữ ký |
| Đặt token trong URL | URL lọt vào log reverse proxy, lịch sử trình duyệt, và header `Referer` |
