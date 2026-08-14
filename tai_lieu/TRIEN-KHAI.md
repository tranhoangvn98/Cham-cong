# Triển khai lên máy chủ

Kiến trúc mạng khuyến nghị:

```
Internet ──HTTPS──► Caddy/Nginx ──► web (8081)  ── nhân sự, app điện thoại
                         │
                         └───────► may_chu (8080) ── API
                                        ▲
              LAN (không ra Internet) ──┘
                     Máy chấm công ZKTeco
```

Lý do tách: máy ZKTeco chỉ nói được HTTP thường, nên cổng nhận dữ liệu máy **chỉ mở
trong LAN**. Webapp và app điện thoại đi qua HTTPS.

---

## 1. Chuẩn bị

Máy chủ Linux có Docker. Mở cổng:

| Cổng | Cho ai | Phạm vi |
|---|---|---|
| 8080 | Máy chấm công + API | **Chỉ LAN** |
| 443 | Nhân sự, app điện thoại | Internet (qua reverse proxy) |
| 5432 | PostgreSQL | **Không mở** — dùng SSH tunnel khi cần |

## 2. Cài đặt

```bash
git clone <repo> /opt/cham-cong
cd /opt/cham-cong

cp .env.example .env
nano .env
```

Bắt buộc điền:

```bash
POSTGRES_PASSWORD=<mật khẩu mạnh>
JWT_SECRET=<sinh bằng lệnh dưới>
VITE_API_URL=https://chamcong.congty.vn      # URL API mà trình duyệt gọi tới
CORS_ORIGIN=https://chamcong.congty.vn       # origin của webapp
ADMIN_MAT_KHAU=<mật khẩu admin đầu tiên>
```

```bash
# Sinh JWT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> `VITE_API_URL` được **nhúng vào mã JavaScript lúc build**, không đọc lúc chạy. Đổi giá
> trị này phải build lại webapp: `docker compose up -d --build web`.

```bash
docker compose up -d
docker compose exec may_chu node dist/csdl/seed.js   # tạo admin + ca + ngày lễ
docker compose ps                                     # cả 3 service phải "healthy"
curl http://localhost:8080/health
```

## 3. Reverse proxy

### Caddy (tự lo chứng chỉ HTTPS)

```caddyfile
chamcong.congty.vn {
    # API cho webapp và app điện thoại
    handle /api/* {
        reverse_proxy localhost:8080
    }
    handle /health {
        reverse_proxy localhost:8080
    }

    # KHÔNG proxy /iclock/* ra Internet — chỉ máy trong LAN được đẩy dữ liệu.
    handle /iclock/* {
        respond 404
    }

    # Webapp
    handle {
        reverse_proxy localhost:8081
    }
}
```

### Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name chamcong.congty.vn;

    ssl_certificate     /etc/letsencrypt/live/chamcong.congty.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chamcong.congty.vn/privkey.pem;

    # Ảnh chấm công có thể vài MB
    client_max_body_size 8m;

    location /iclock/ { return 404; }   # chặn từ Internet

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:8080;
    }

    location / {
        proxy_pass http://127.0.0.1:8081;
    }
}
```

Máy chủ chạy với `NODE_ENV=production` sẽ tin `X-Forwarded-For`, nên giới hạn tốc độ
và nhật ký thao tác ghi đúng IP thật của người dùng.

## 4. Sao lưu

**Bắt buộc.** Bảng công là căn cứ tính lương; mất dữ liệu là mất bằng chứng.

`trien_khai/cap_nhat_vps.sh` đã tự sao lưu trước mỗi lần cập nhật. Thêm bản hàng ngày cho
những ngày không cập nhật — sửa `MA_NGUON` cho đúng nơi anh đặt mã nguồn:

```bash
cat > /etc/cron.daily/sao-luu-cham-cong <<'EOF'
#!/bin/sh
set -e
MA_NGUON=/root/Cham-cong
THU_MUC="$MA_NGUON/sao_luu/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$THU_MUC"
cd "$MA_NGUON"

docker compose exec -T postgres pg_dump -U chamcong chamcong | gzip > "$THU_MUC/csdl.sql.gz"

# CẢ HAI volume. `ho_so` giữ bản gốc hợp đồng scan — CSDL chỉ có tên tệp, không có nội
# dung, nên bỏ qua nó là mất hẳn không dựng lại được.
for v in ho_so anh_cham_cong; do
  docker run --rm -v "cham-cong_$v:/nguon:ro" -v "$THU_MUC:/dich" \
    alpine tar czf "/dich/$v.tar.gz" -C /nguon .
done

# Giữ 30 ngày
find "$MA_NGUON/sao_luu" -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +
EOF
chmod +x /etc/cron.daily/sao-luu-cham-cong
```

Sao lưu nằm cùng ổ với dữ liệu gốc **không cứu được khi ổ cứng chết** — phải kéo định kỳ
về máy khác.

Cách kéo về, cách phục hồi, và cách diễn tập phục hồi để biết bản sao lưu có thật sự dùng
được: xem [SAO-LUU-VA-PHUC-HOI.md](SAO-LUU-VA-PHUC-HOI.md).

> Đừng đổ bản kết xuất đè lên CSDL đang chạy. Đó là SQL thuần, gặp bảng đã có sẽ dừng giữa
> chừng với `relation already exists` và để lại dữ liệu chắp vá. Quy trình đúng — dừng máy
> chủ, dựng lại CSDL rỗng, rồi mới nạp — ở tài liệu trên.

## 5. Giám sát

`GET /health` trả về:

```json
{ "trang_thai": "ok", "csdl": "ok", "luc": "2026-08-06T10:00:00.000Z" }
```

Trả HTTP 503 khi không kết nối được cơ sở dữ liệu. Đủ để cắm vào Uptime Kuma / Zabbix.

Ba việc nên theo dõi:

1. **Máy chấm công mất kết nối** — máy chủ tự phát hiện trong vòng 1 phút và ghi log mức
   `warn`, đồng thời đẩy sự kiện `thiet_bi.mat_ket_noi` vào hộp thư đi (và
   `thiet_bi.ket_noi_lai` khi máy báo hiệu lại). Cảnh báo chỉ gửi **một lần** mỗi lần mất
   kết nối, không lặp lại mỗi chu kỳ. Cũng hiện trên trang Tổng quan của webapp.

   Máy vẫn lưu log nội bộ nên không mất dữ liệu, nhưng bảng công sẽ chậm cập nhật. Muốn báo
   sang Teams / Zalo thì trỏ `ERP_WEBHOOK_URL` tới một relay và lọc theo `loai_su_kien`:

   ```bash
   docker compose logs may_chu | grep "mat ket noi"
   ```

   ```sql
   -- Máy nào đang được đánh dấu mất kết nối
   select serial, ten, thay_lan_cuoi from thiet_bi where da_canh_bao_offline;
   ```
2. **Bảng công ngày hôm qua đã chốt chưa** — máy chủ tự chạy sau 01:00 giờ Việt Nam.
   Kiểm tra: `select * from cong_viec_da_chay order by chay_luc desc limit 5;`
   Việc này **bắt buộc** phải chạy, vì người vắng cả ngày không có lần quẹt nào nên không
   có gì kích hoạt tính công cho họ.
3. **Hộp thư đi tồn** (nếu dùng đồng bộ ERP):
   ```sql
   select count(*), max(so_lan), max(loi_cuoi)
     from hop_thu_di where gui_luc is null;
   ```

Log:

```bash
docker compose logs -f may_chu                    # tất cả
docker compose logs -f may_chu | grep iclock      # chỉ giao tiếp với máy
docker compose logs may_chu | grep '"level":50'   # chỉ lỗi
```

## 6. Nâng cấp

```bash
cd /opt/cham-cong
docker compose exec -T postgres pg_dump -U chamcong chamcong | gzip > /tmp/truoc-nang-cap.sql.gz
git pull
docker compose up -d --build
docker compose logs may_chu | grep di_tru        # xem migration đã chạy
```

Migration tự chạy khi khởi động (`TU_DONG_DI_TRU=1` trong `docker-compose.yml`), dùng
advisory lock nên nhiều instance khởi động cùng lúc cũng không chạy trùng.

## 7. Cần đọc trước khi tin vào số liệu

- **Múi giờ**: `DEVICE_TZ_OFFSET_HOURS` phải khớp nơi đặt máy. Đặt sai làm lệch toàn bộ
  giờ công. Máy chủ chạy UTC vẫn đúng — hệ thống không dùng múi giờ của máy chủ.
- **Ngày lễ**: chỉ có sẵn ngày lễ dương lịch cố định. **Tết Nguyên đán phải tự thêm mỗi
  năm**, nếu không những ngày đó bị tính là `Vắng`.
- **Ngày làm việc trong tuần**: mặc định T2–T6. Công ty làm cả T7 mà không sửa ca thì
  ngày T7 bị coi là nghỉ tuần và giờ làm bị dồn hết vào OT.
- **Chốt tháng** trước khi gửi bảng công cho kế toán, để một lần quẹt về muộn không âm
  thầm làm đổi số đã duyệt.
