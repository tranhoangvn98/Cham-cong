# Sao lưu và phục hồi

Bảng công là căn cứ tính lương. Mất nó là mất bằng chứng trả lương, không dựng lại được
từ trí nhớ.

Tài liệu này ghi rõ **lệnh nào chạy trên máy nào**. Đây là chỗ dễ nhầm nhất: gõ nhầm máy
thì lệnh hoặc báo "command not found", hoặc tệ hơn là chạy được nhưng chép dữ liệu từ VPS
về chính VPS — trông như thành công mà không sao lưu được gì.

| Ký hiệu | Nghĩa là |
|---|---|
| 🖥️ **VPS** | Gõ sau khi đã `ssh` vào máy chủ. Dấu nhắc dạng `[root@… ~]#` |
| 💻 **Máy anh** | Gõ trên PowerShell / Terminal máy tính của anh. Dấu nhắc dạng `PS C:\…>` |

---

## 1. Cái gì được sao lưu

| Thứ | Nằm ở đâu | Mất thì sao |
|---|---|---|
| Cơ sở dữ liệu | volume `pgdata` | Mất toàn bộ chấm công, nhân sự, nghỉ phép |
| Hợp đồng scan, biên bản | volume `ho_so` | **Mất bản gốc** — CSDL chỉ giữ tên tệp, không giữ nội dung |
| Ảnh selfie chấm công | volume `anh_cham_cong` | Mất bằng chứng ảnh của các lần quét qua app |

Hai volume tệp **không nằm trong CSDL**. Chỉ `pg_dump` thôi là chưa đủ.

Nếu công ty chưa dùng app điện thoại và chưa tải hợp đồng lên thì hai tệp
`anh_cham_cong.tar.gz` / `ho_so.tar.gz` sẽ chỉ khoảng **87–89 byte** — đó là tệp nén rỗng,
đúng chứ không phải lỗi. Kiểm cho chắc:

🖥️ **VPS**

```bash
docker run --rm -v cham-cong_ho_so:/d:ro alpine find /d -type f | wc -l
docker run --rm -v cham-cong_anh_cham_cong:/d:ro alpine find /d -type f | wc -l
```

Ra `0` thì tệp rỗng là đúng. Ra số khác `0` mà bản sao lưu vẫn 89 byte thì **báo ngay** —
đó là lỗi sao lưu thật.

---

## 2. Sao lưu

`trien_khai/cap_nhat_vps.sh` **tự sao lưu trước mỗi lần cập nhật**, để vào
`/root/Cham-cong/sao_luu/<ngày-giờ>/`. Không phải làm gì thêm.

Muốn sao lưu ngoài đợt cập nhật:

🖥️ **VPS**

```bash
cd /root/Cham-cong
THU_MUC="sao_luu/$(date +%Y%m%d-%H%M%S)" && mkdir -p "$THU_MUC"
docker compose exec -T postgres pg_dump -U chamcong chamcong | gzip > "$THU_MUC/csdl.sql.gz"
for v in ho_so anh_cham_cong; do
  docker run --rm -v "cham-cong_$v:/nguon:ro" -v "$PWD/$THU_MUC:/dich" \
    alpine tar czf "/dich/$v.tar.gz" -C /nguon .
done
ls -lh "$THU_MUC"
```

---

## 3. Kéo về máy anh

**Đây là bước quan trọng nhất.** Bản sao lưu nằm cùng ổ đĩa với dữ liệu gốc chỉ chống được
lỗi thao tác — hỏng ổ cứng là mất cả hai. Nên làm **mỗi tháng một lần**, và trước mỗi lần
cập nhật lớn.

💻 **Máy anh**

```powershell
cd $env:USERPROFILE\Documents
scp -r root@103.81.87.47:/root/Cham-cong/sao_luu ./sao_luu_chamcong
```

Dùng **địa chỉ IP** chứ không phải tên miền: tên miền làm SSH hỏi lại xác nhận khoá máy
chủ, mà `scp` đang chiếm luồng nhập liệu để truyền tệp nên câu hỏi đó không trả lời được —
nó hỏi ba lần rồi bỏ cuộc. Dùng IP thì không hỏi gì.

Chỉ lấy một bộ:

💻 **Máy anh**

```powershell
scp -r root@103.81.87.47:/root/Cham-cong/sao_luu/20260814-223438 ./sao_luu_chamcong/
```

Xem bộ nào đang có, và nặng bao nhiêu:

🖥️ **VPS**

```bash
du -sh /root/Cham-cong/sao_luu/*
```

---

## 4. Dọn bộ cũ

Giữ 3 bộ gần nhất trên VPS, phần còn lại đã nằm ở máy anh:

🖥️ **VPS**

```bash
ls -1dt /root/Cham-cong/sao_luu/*/ | tail -n +4 | xargs -r rm -rf
```

---

## 5. Kiểm bản sao lưu có dùng được không

Bản sao lưu chưa từng phục hồi thử thì **chưa phải bản sao lưu** — mới chỉ là một tệp mà
ta hy vọng là dùng được. Diễn tập vào một CSDL nháp, **không đụng gì tới dữ liệu thật**:

🖥️ **VPS**

```bash
cd /root/Cham-cong
docker compose exec -T postgres psql -U chamcong -d postgres -c 'CREATE DATABASE thu_phuc_hoi;'
gunzip -c sao_luu/20260814-223438/csdl.sql.gz \
  | docker compose exec -T postgres psql -U chamcong -d thu_phuc_hoi
```

Đếm xem dữ liệu có thật sự vào không:

```bash
docker compose exec -T postgres psql -U chamcong -d thu_phuc_hoi \
  -c 'SELECT count(*) AS nhan_vien FROM nhan_vien;' \
  -c 'SELECT count(*) AS lan_quet FROM lan_quet;'
```

Số khớp với hệ thống đang chạy thì bản sao lưu tốt. Xong thì xoá CSDL nháp:

```bash
docker compose exec -T postgres psql -U chamcong -d postgres -c 'DROP DATABASE thu_phuc_hoi;'
```

Nên diễn tập **mỗi quý một lần**. Mất 2 phút, và nó trả lời câu hỏi duy nhất thật sự
quan trọng: hôm ổ cứng chết, cái tệp này có cứu được không.

---

## 6. Phục hồi thật

> **Xoá sạch dữ liệu hiện tại và thay bằng bản sao lưu.** Chỉ làm khi đã mất dữ liệu,
> hoặc đã cân nhắc kỹ. Nếu còn nghi ngờ, làm bước 5 vào CSDL nháp trước.

### 6.1. Cơ sở dữ liệu

🖥️ **VPS**

```bash
cd /root/Cham-cong

# 1. Dừng máy chủ. Bắt buộc: nó đang giữ kết nối và sẽ chạy di trú đè lên giữa chừng.
docker compose stop may_chu

# 2. Sao lưu cái đang có trước đã — kể cả khi tin là nó hỏng.
docker compose exec -T postgres pg_dump -U chamcong chamcong \
  | gzip > "sao_luu/truoc-khi-phuc-hoi-$(date +%Y%m%d-%H%M%S).sql.gz"

# 3. Dựng lại CSDL rỗng. Bản kết xuất là SQL thuần, đổ đè lên bảng đang có sẽ lỗi
#    "relation already exists" — phải xoá sạch rồi tạo lại.
docker compose exec -T postgres psql -U chamcong -d postgres \
  -c 'DROP DATABASE chamcong WITH (FORCE);' -c 'CREATE DATABASE chamcong OWNER chamcong;'

# 4. Nạp bản sao lưu.
gunzip -c sao_luu/20260814-223438/csdl.sql.gz \
  | docker compose exec -T postgres psql -U chamcong -d chamcong

# 5. Bật lại.
docker compose start may_chu
curl -s http://127.0.0.1:8080/health
```

`/health` phải trả `{"trang_thai":"ok","csdl":"ok",…}`.

### 6.2. Tệp đính kèm và ảnh

🖥️ **VPS**

```bash
cd /root/Cham-cong
docker compose stop may_chu
for v in ho_so anh_cham_cong; do
  docker run --rm -v "cham-cong_$v:/dich" -v "$PWD/sao_luu/20260814-223438:/nguon:ro" \
    alpine sh -c "rm -rf /dich/* && tar xzf /nguon/$v.tar.gz -C /dich"
done
docker compose start may_chu
```

### 6.3. Phục hồi từ máy anh lên VPS

Khi VPS mất sạch và chỉ còn bản trên máy anh — đẩy ngược lên rồi làm 6.1:

💻 **Máy anh**

```powershell
scp -r $env:USERPROFILE\Documents\sao_luu_chamcong\20260814-223438 root@103.81.87.47:/root/Cham-cong/sao_luu/
```

---

## 7. Lui lại bản mã nguồn cũ

Khác với phục hồi dữ liệu — cái này chỉ đổi mã nguồn, không đụng CSDL. Cuối mỗi lần chạy
`cap_nhat_vps.sh` nó đã in sẵn lệnh lui:

🖥️ **VPS**

```bash
cd /root/Cham-cong
git checkout <mã-bản-cũ> && docker compose up -d --build
```

Lưu ý: nếu bản mới đã chạy di trú CSDL thì lui mã nguồn **không** lui được lược đồ CSDL.
Muốn về đúng trạng thái cũ thì phải phục hồi cả CSDL theo mục 6.1.

## 8. Cây thư mục kho hồ sơ

Từ bản 1.25.0, tệp đính kèm hồ sơ nằm theo cây:

```
/du_lieu/ho_so/
├── HR-01_Hoang-Minh-Ngoc/
│   ├── hop_dong/
│   │   └── 2026-08-18_hop-dong_HDLD-07-2026_a1b2c3d4.pdf
│   ├── tai_lieu/
│   │   ├── 2026-08-18_tai-lieu_CCCD_e5f6a7b8.pdf
│   │   └── 2026-08-18_tai-lieu_SO-YEU-LY-LICH_11c2d3e4.pdf
│   └── bhxh/
│       └── 2026-08-18_bhxh_BAO-TANG_9a8b7c6d.pdf
└── IT-01_Phan-Song-Hao/
    └── hop_dong/
        └── 2026-07-01_hop-dong_HDLD-03-2026_5f6a7b8c.pdf
```

**Vì sao việc này thuộc tài liệu sao lưu:** cây cũ là `2026-08/<uuid>.pdf`. Bung một bản sao
lưu ra máy khác mà **không có cơ sở dữ liệu** thì cả kho tệp là một đống tên vô nghĩa — không
biết tệp nào của ai, loại gì. Cây mới đọc được bằng mắt, nên bản sao lưu tự nó có giá trị.

Tám ký tự hex ở cuối tên tệp là **tám ký tự đầu của `ho_so_tep.id`** — mở thư mục lên là tra
ngược được về đúng dòng cơ sở dữ liệu.

Không dấu tiếng Việt, không dấu cách: tên tệp đi qua `tar`, `scp`, `rsync`, WinSCP, Windows,
và qua cả header `Content-Disposition`. Mỗi chặng hiểu UTF-8 một cách khác nhau.

### Đường đọc vẫn là cơ sở dữ liệu

`ho_so_tep.ten_luu` **là khóa đọc**. Không chỗ nào tính lại đường dẫn từ mã nhân viên, vì mã
nhân viên và họ tên **đều đổi được** (đồng bộ ERP ghi lại họ tên mỗi lần chạy).

Nghĩa là: **thư mục lệch không làm mất tệp.** Nếu tên thư mục không khớp hồ sơ, mọi tệp vẫn
mở được bình thường — chỉ là tên thư mục cũ. Sắp xếp lại là việc dọn dẹp, không phải cứu hộ.

### Sắp xếp lại

Thư mục được đổi **ngay tại chỗ** khi sửa mã nhân viên hoặc họ tên, và có một **lần quét mỗi
ngày** làm lưới hứng (có bốn chỗ trong hệ thống sửa được hai trường đó).

Chạy tay khi cần — **Hệ thống → Kho tệp hồ sơ → Cây thư mục**, hoặc:

```bash
# 🖥️ Trên VPS — chạy thử, KHÔNG đổi gì
cd /root/Cham-cong && docker compose exec may_chu npm run sap_xep_tep

# Đổi chỗ thật
cd /root/Cham-cong && docker compose exec may_chu npm run sap_xep_tep -- --that
```

**Mặc định là chạy thử.** Thứ đang di chuyển là bản gốc hợp đồng, CCCD, bằng cấp — không khôi
phục được từ cơ sở dữ liệu.

> **Lệnh trong container chạy bản đã biên dịch (`dist/`), không chạy mã nguồn TypeScript.**
> Ảnh chạy không chứa `may_chu/src` — đó là cố ý, ảnh chạy không cần trình biên dịch. Trên máy
> lập trình, dùng biến thể `_ma_nguon` để chạy trực tiếp từ `src`:
> `npm run sap_xep_tep_ma_nguon`. Có bài kiểm đối chiếu `package.json` với `Dockerfile` nên
> một lệnh không chạy được trong container sẽ đỏ test.

Lệnh **gọi lại được nhiều lần**: tệp đã đúng chỗ thì bỏ qua. Việc chỉ di chuyển **trong** kho
hồ sơ — không xóa, không ghi đè.

### Hai con số cần để ý trong kết quả

| | Nghĩa là gì |
|---|---|
| **MẤT TỆP** | có dòng cơ sở dữ liệu nhưng không có tệp trên đĩa. Thường do phục hồi sao lưu **thiếu volume `ho_so`** — xem mục sao lưu ở trên, phải kéo **cả hai** volume. |
| **ĐƯỜNG DẪN XẤU** | `ten_luu` trong cơ sở dữ liệu không hợp lệ. Dữ liệu hỏng, cần người xem — máy không tự xử lý. |

Lần quét hàng ngày ghi cả hai con số này ra log:

```bash
cd /root/Cham-cong && docker compose logs may_chu | grep "CANH BAO kho tep"
```

