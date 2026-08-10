# Triển khai từ PowerShell (Windows)

Máy Windows chỉ đóng vai trò **cái điều khiển từ xa**: mọi thứ thật sự chạy trên VPS Linux.
PowerShell dùng để mở SSH và để kiểm tra lại từ bên ngoài. Không cần cài Docker, Node hay
Git trên máy Windows.

---

## 0. Ba cái bẫy của PowerShell cần biết trước

Đây là chỗ hay mất thời gian nhất, nên đọc trước khi gõ:

| Bẫy | Vì sao | Cách đúng |
|---|---|---|
| `curl` **không phải** curl | Trong Windows PowerShell 5.1, `curl` là bí danh của `Invoke-WebRequest`, tham số hoàn toàn khác | Luôn gõ **`curl.exe`** |
| `&&` không chạy | PowerShell 5.1 chưa hỗ trợ `&&` (PowerShell 7 thì có) | Xuống dòng, hoặc dùng `;` |
| Nháy kép nuốt mất `$` | PowerShell nội suy `$biến` trong `"..."` | Dùng nháy **đơn** `'...'` khi chuỗi có `$` |

Xem mình đang dùng bản nào:

```powershell
$PSVersionTable.PSVersion
```

Bản `5.1.x` là Windows PowerShell mặc định. Nếu muốn tránh hai bẫy đầu, cài PowerShell 7:
`winget install Microsoft.PowerShell`.

---

## 1. Mở kết nối tới VPS

`ssh` có sẵn trong Windows 10/11, không phải cài thêm:

```powershell
ssh --version
ssh root@teams.tranhoangvietnam.com
```

Từ dấu nhắc sau khi đăng nhập, mọi lệnh là **bash trên VPS**, không còn là PowerShell nữa.

### Đỡ phải gõ lại mỗi lần

Tạo tệp `C:\Users\<tên bạn>\.ssh\config`:

```
Host chamcong
    HostName teams.tranhoangvietnam.com
    User root
    ServerAliveInterval 30
```

Từ đó chỉ cần:

```powershell
ssh chamcong
```

---

## 2. Cập nhật hệ thống (chạy trên VPS)

Sau khi đã SSH vào, tìm thư mục mã nguồn rồi chạy một lệnh duy nhất:

```bash
cd ~/cham-cong 2>/dev/null || cd "$(dirname "$(find / -name docker-compose.yml -path '*cham*' 2>/dev/null | head -1)")"
pwd

bash trien_khai/cap_nhat_vps.sh
```

Script tự làm theo thứ tự: **sao lưu → kéo mã mới → dựng lại ảnh → chờ máy chủ lên →
kiểm tra**. Nó cũng đo mã HTTP của **chatbot Teams trước và sau** khi cập nhật rồi báo động
nếu con số đổi — vì hệ thống chấm công dùng chung tên miền với bot.

Muốn bỏ bước sao lưu cho nhanh (chỉ nên dùng khi vừa sao lưu xong):

```bash
bash trien_khai/cap_nhat_vps.sh --khong-sao-luu
```

> **Sao lưu quan trọng hơn từ bản 1.12.0.** Hợp đồng scan và các tệp đính kèm hồ sơ nằm trên
> volume `ho_so`, **không** nằm trong CSDL — CSDL chỉ giữ siêu dữ liệu. Mất volume là mất bản
> gốc, dump CSDL không cứu được. Script sao lưu cả hai.

### Kết quả mong đợi

```
=== 6/6. Kiem tra sau khi cap nhat ===
  postgres   Up (healthy)
  may_chu    Up (healthy)
  web        Up

  /chamcong/health : HTTP 200
  /iclock/cdata    : HTTP 401        (may chua khai serial)
  bot Teams (/)    : HTTP 401        (truoc khi cap nhat la 401)
```

`401` ở dòng `iclock` là **đúng**: máy chấm công chưa khai serial thì bị từ chối. `401` ở
dòng bot cũng đúng — miễn là **giống hệt con số trước khi cập nhật**.

Không cần chạy di trú CSDL bằng tay: `TU_DONG_DI_TRU=1` nên bảng mới được tạo lúc khởi động.

---

## 3. Kiểm tra lại từ máy Windows

Thoát SSH (`exit`), rồi kiểm tra từ bên ngoài — nhớ `curl.exe`:

```powershell
curl.exe -s https://teams.tranhoangvietnam.com/chamcong/health
curl.exe -s -o NUL -w "webapp: %{http_code}`n" https://teams.tranhoangvietnam.com/chamcong/
curl.exe -s -o NUL -w "bot:    %{http_code}`n" https://teams.tranhoangvietnam.com/
```

Rồi mở trình duyệt vào `https://teams.tranhoangvietnam.com/chamcong/` và đăng nhập bằng
Microsoft.

Nếu muốn dùng lệnh gốc của PowerShell thay cho `curl.exe`:

```powershell
Invoke-RestMethod https://teams.tranhoangvietnam.com/chamcong/health
```

---

## 4. Khi có sự cố

Xem nhật ký, ngay trong PowerShell, không cần vào SSH trước — chú ý **nháy đơn**:

```powershell
ssh chamcong 'cd ~/cham-cong; docker compose logs --tail=100 may_chu'
ssh chamcong 'cd ~/cham-cong; docker compose ps'
```

Lùi về bản trước (script in sẵn mã bản cũ ở cuối mỗi lần chạy):

```bash
cd ~/cham-cong
git checkout <mã-bản-cũ>
docker compose up -d --build
```

Phục hồi CSDL từ bản sao lưu:

```bash
cd ~/cham-cong
gunzip -c sao_luu/<thư-mục>/csdl.sql.gz | docker compose exec -T postgres psql -U chamcong chamcong
```

Phục hồi tệp đính kèm hồ sơ:

```bash
docker run --rm -v cham-cong_ho_so:/dich -v "$PWD/sao_luu/<thư-mục>:/nguon:ro" \
  alpine tar xzf /nguon/ho_so.tar.gz -C /dich
```

### Nếu chatbot Teams hỏng

Đây là rủi ro lớn nhất vì hai dịch vụ dùng chung tên miền. Cấu hình Caddy nằm **trên máy
chủ**, không nằm trong Docker Compose của hệ thống chấm công — nên `docker compose` không
đụng tới nó. Nhưng nếu vẫn hỏng:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl status caddy
sudo journalctl -u caddy -n 50 --no-pager
```

---

## 5. Chép tệp giữa Windows và VPS

`scp` cũng có sẵn trong Windows. Chú ý dấu gạch chéo ngược ở phía Windows:

```powershell
# Windows -> VPS (ví dụ đưa file CSV nhân viên lên)
scp C:\Users\ban\Desktop\nhan_vien.csv chamcong:~/cham-cong/

# VPS -> Windows (ví dụ lấy bản sao lưu về giữ)
scp -r chamcong:~/cham-cong/sao_luu C:\Users\ban\Desktop\sao_luu_chamcong
```

Riêng danh sách nhân viên thì **không cần scp**: trang Nhân viên có nút "Nhập từ file", tải
thẳng từ trình duyệt lên.
