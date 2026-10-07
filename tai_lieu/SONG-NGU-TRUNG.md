# Song ngữ Việt – Trung toàn hệ thống

> Quyết định (10/2026): **toàn bộ dự án Chấm công là hệ thống SONG NGỮ Việt – Trung.**
> Mọi tính năng — hiện có và về sau — phải phục vụ đủ hai ngôn ngữ. Tiếng Trung dùng
> **Giản thể (简体中文)** với từ vựng **thương mại chuyên nghiệp** theo bảng thuật ngữ
> ở mục 6 của tài liệu này. Tài liệu này là nguồn chuẩn; quy tắc bắt buộc đã ghi vào
> `CLAUDE.md`.

## 1. Phạm vi song ngữ

Song ngữ áp cho **mọi chuỗi người dùng đọc được**, không chỉ màn hình:

| Bề mặt | Tiếng Việt | Tiếng Trung |
|---|---|---|
| Web app (`web/`) — nhãn, nút, bảng, hộp thoại, lỗi | ✅ | ✅ |
| App điện thoại (`dien_thoai/`) | ✅ | ✅ |
| Thông báo đẩy, email hệ thống, email phiếu lương | ✅ | ✅ |
| Nhãn trạng thái trên bảng công / phiếu lương | ✅ | ✅ |
| Tài liệu sinh ra (DOCX bản đơn, quyết định, bảng lương) | ✅ | ✅ |
| Tiêu đề / chú thích CSV-XLSX xuất ra | ✅ | ✅ |
| Comment code, định danh, tên bảng/cột CSDL | Tiếng Việt không dấu (giữ quy ước cũ) | — |

Nguyên tắc cốt lõi: **chuỗi hiển thị không bao giờ hardcode trong component** — mọi chuỗi
nằm trong từ điển tập trung và có ĐỦ hai khóa `vi` + `zh`. Một chuỗi chỉ có tiếng Việt
là **lỗi**, bị test bắt (mục 5).

## 2. Kiến trúc

### 2.1. Từ điển trung tâm mỗi workspace

- `web/src/chuoi/vi.ts` + `web/src/chuoi/zh.ts` — một đối tượng `Record<ChuoiKhoa, string>`.
- `dien_thoai/nguon/chuoi/vi.ts` + `dien_thoai/nguon/chuoi/zh.ts` — cùng bộ khóa.
- `may_chu/src/chuoi/vi.ts` + `may_chu/src/chuoi/zh.ts` — chuỗi do máy chủ sinh
  (lỗi API, email, thông báo, nhãn trạng thái, tiêu đề file xuất).

Khóa là `snake_case` mô tả nghĩa (không phải văn bản), ví dụ
`bang_cong.chieu.vao` / `don.trang_thai.cho_duyet`. Sửa văn bản = sửa trong từ điển,
không sửa ở chỗ dùng.

```ts
// vi.ts                                  // zh.ts
bang_cong_chieu_vao: 'Vào',               bang_cong_chieu_vao: '上班',
don_cho_duyet: 'Chờ duyệt',               don_cho_duyet: '待审批',
phieu_luong_tong_thu_nhap: 'Tổng thu nhập', phieu_luong_tong_thu_nhap: '总收入',
```

### 2.2. Ngôn ngữ hiển thị theo NGƯỜI DÙNG

- Migration mới: cột `ngon_ngu` (`'vi' | 'zh'`, mặc định `'vi'`) cho `nguoi_dung`.
- Web: chọn ngôn ngữ ở trang Tài khoản; lưu vào CSDL (không chỉ localStorage) để mọi
  thiết bị đồng bộ; phản hồi đăng nhập trả kèm `ngon_ngu`.
- App: cùng trường, giao diện chọn ở màn hình cá nhân.
- Máy chủ: đọc ngôn ngữ người nhận khi gửi email/thông báo (không dùng ngôn ngữ của
  người GỬI); lỗi API trả theo ngôn ngữ của request (`Accept-Language`/header `X-Ngon-Ngu`
  từ app/web, fallback ngôn ngữ của người dùng).
- Tài liệu DOCX (đơn từ, quyết định, phiếu lương): bản in theo ngôn ngữ của chủ thể
  (nhân viên xem đơn của mình, kế toán in bảng lương cho một người) — bản chung nội bộ
  giữ tiếng Việt.

### 2.3. Chuỗi có tham số / số lượng

Không ghép chuỗi bằng `+`. Dùng mẫu tham số `{n}`:

```ts
// vi: 'Đi muộn {n} phút'      // zh: '迟到 {n} 分钟'
// vi: 'Bạn có {n} thông báo chưa đọc'  // zh: '您有 {n} 条未读通知'
```

Tiếng Trung không chia số nhiều — một mẫu dùng cho mọi `{n}`. Tiếng Việt nếu cần
nhiều dạng thì tách khóa riêng (`_mot` / `_nhieu`).

### 2.4. Nhãn trạng thái từ CSDL

Trạng thái lưu trong CSDL vẫn là mã tiếng Việt không dấu (`cho_duyet`, `co_mat`...).
Lớp hiển thị dịch qua từ điển `trang_thai.*` — KHÔNG dịch ở SQL, KHÔNG lưu chữ TQ
xuống CSDL (đổi thuật ngữ không cần migration).

## 3. Font chữ Hán

- Be Vietnam Pro / Inter không có glyph Hán — thêm font chữ Hán vào `thiet_ke/token.json`
  (nhánh `web` + `mobile`), theo đúng quy trình `npm run sinh_token`:
  - Web: **Noto Sans SC** (Google Fonts, giấy phép SIL OFL 1.1) subset woff2, chỉ nạp
    khi ngôn ngữ hiển thị là `zh` (tải lười theo khóa ngôn ngữ).
  - App: **Noto Sans SC** dạng ttf trong `dien_thoai/tai_nguyen/font/`, đăng ký qua
    `fontFamily` (luật cũ: chọn độ đậm bằng `fontFamily`, không bằng `fontWeight`).
- Định dạng số tiền bản TQ: `Intl.NumberFormat('zh-CN')` + ký hiệu `¥` (CNY) — KHÔNG
  dùng `đ`.

## 4. Tiếng Trung thương mại chuyên nghiệp — quy tắc viết

1. **Chỉ dùng Giản thể (简体中文)** — khách hàng/đối tác là Trung Quốc đại lục.
2. **Dùng từ trong bảng thuật ngữ (mục 6).** Từ ngoài bảng thì đối chiếu cách dùng
   chuẩn của doanh nghiệp TQ, KHÔNG dịch máy, KHÔNG dịch word-by-word.
3. Văn phong **thương mại trang trọng**: xưng hô khách hàng `您`, công ty `公司`,
   tránh khẩu ngữ (`哈啰`, `OK 啦`...).
4. Bảng biểu dùng cột ngắn gọn kiểu doanh nghiệp: `姓名`, `部门`, `日期`, `班次`,
   `上班`, `下班`, `迟到分钟`, `早退分钟`, `加班分钟`, `出勤天数`, `备注`.
5. Không để lẫn nửa Việt nửa TQ trong một chuỗi. Tên riêng (tên người, tên công ty)
   giữ nguyên tự dạng gốc; tên công ty có thể kèm bản dịch chính thức một lần trong
   từ điển `ten_cong_ty`.
6. Số + danh từ dùng lượng từ: `2 天`, `3 次`, `1 条` — đúng chuẩn tiếng TQ.

## 5. Kiểm thử bắt buộc

- **Test khóa đối xứng**: mọi khóa trong `vi.ts` phải có trong `zh.ts` và ngược lại
  (web + app + máy chủ) — thiếu là fail.
- **Test glyph font**: khi bật `zh`, font chữ Hán phủ đủ ký tự (mở rộng bài test phủ
  glyph hiện có ở `thiet_ke/font.test.mjs`).
- **e2e**: chuyển ngôn ngữ ở Tài khoản → bảng công/phiếu lương hiện chữ TQ đúng từ
  điển; email gửi đúng ngôn ngữ người nhận.
- Review thủ công: PR nào thêm chuỗi người dùng mà thiếu `zh` là chặn ngay — giống
  luật hiện hành về `dang_hoat_dong` và chuỗi tiếng Việt có dấu.

## 6. Bảng thuật ngữ chuẩn (Việt → Trung Giản thể)

### Chấm công

| Tiếng Việt | Tiếng Trung | Ghi chú |
|---|---|---|
| Chấm công | 考勤 | |
| Máy chấm công | 考勤机 | |
| Quẹt vào / Quẹt ra | 上班打卡 / 下班打卡 | |
| Vào / Ra | 上班 / 下班 | nhãn ngắn trên bảng công |
| Đi muộn | 迟到 | |
| Về sớm | 早退 | |
| Tăng ca (làm thêm giờ) | 加班 | |
| Đơn tăng ca | 加班申请单 | |
| Ca làm việc | 班次 | |
| Giờ vào ca / Giờ tan ca | 上班时间 / 下班时间 | |
| Nghỉ trưa | 午休 | |
| Có mặt | 出勤 | |
| Vắng mặt | 缺勤 | |
| Ngày công | 出勤天数 | |
| Bảng công | 考勤表 | |
| Lịch sử quẹt | 打卡记录 | |
| Giải trình chấm công | 考勤说明 | |
| Chấm công bằng điện thoại | 手机打卡 | |
| Vị trí làm việc (geofence) | 工作地点 | |
| Kiểm soát ra vào | 门禁 | |
| Đi muộn {n} phút | 迟到 {n} 分钟 | |
| Về sớm {n} phút | 早退 {n} 分钟 | |
| Mất nửa ngày công | 扣除半天出勤 | |
| Ngoại lệ chấm công | 考勤特批 | sổ ngoại lệ |
| Đủ công | 全勤 | |

### Nghỉ phép & đơn từ

| Tiếng Việt | Tiếng Trung | Ghi chú |
|---|---|---|
| Đơn từ / Đề nghị | 申请单 | |
| Xin nghỉ | 请假 | |
| Nghỉ phép năm | 年假 | |
| Nghỉ ốm | 病假 | |
| Nghỉ việc riêng (có lương) | 事假 | |
| Nghỉ không lương | 无薪假 | |
| Nghỉ lễ (theo luật) | 法定节假日 | |
| Nghỉ lễ Trung Quốc | 中国法定节假日 | lịch `tq` đã có |
| Nghỉ nửa ngày | 请假半天 | |
| Nghỉ bù / Làm bù | 调休 / 补班 | |
| Công tác | 出差 | |
| Làm việc từ xa | 远程办公 | |
| Xin về sớm | 申请早退 | |
| Chờ duyệt / Đã duyệt / Từ chối | 待审批 / 已批准 / 已拒绝 | |
| Người duyệt | 审批人 | |
| Lý do | 事由 / 原因 | |
| Số ngày nghỉ | 请假天数 | |
| Quỹ phép còn lại | 剩余年假 | |

### Lương & khen thưởng

| Tiếng Việt | Tiếng Trung | Ghi chú |
|---|---|---|
| Lương / Tiền lương | 工资 / 薪资 | |
| Phiếu lương | 工资单 | |
| Kỳ lương | 计薪周期 | |
| Lương cơ bản | 基本工资 | |
| Phụ cấp | 津贴 | |
| Thưởng | 奖金 | |
| Thu nhập | 收入 | |
| Tổng thu nhập | 总收入 | |
| Khoản trừ | 扣款 | |
| Trừ nửa ngày lương | 扣除半天工资 | |
| Phạt đi muộn | 迟到扣款 | |
| Tạm ứng lương | 预支工资 | |
| Lương ngày công | 日工资 | |
| Ngày công chuẩn | 标准出勤天数 | |
| Thuế thu nhập cá nhân | 个人所得税 | |
| Bảo hiểm xã hội | 社会保险 | |
| Bảo hiểm y tế | 医疗保险 | |
| Bảo hiểm thất nghiệp | 失业保险 | |
| Nhân dân tệ | 人民币 | ký hiệu `¥` |
| Hợp đồng lao động | 劳动合同 | |
| Quyết định lương | 薪资调整通知 | |
| Thử việc | 试用期 | |
| Thôi việc / Nghỉ việc | 离职 | |
| Quyết toán thôi việc | 离职结算 | |

### Nhân sự & tổ chức

| Tiếng Việt | Tiếng Trung | Ghi chú |
|---|---|---|
| Nhân viên | 员工 | |
| Phòng ban | 部门 | |
| Trưởng phòng | 部门主管 | |
| Giám đốc | 总经理 | |
| Nhân sự (bộ phận) | 人力资源部 | |
| Kế toán | 财务 | |
| Hồ sơ nhân viên | 员工档案 | |
| Họ tên | 姓名 | |
| Mã nhân viên | 工号 | |
| Ngày vào làm | 入职日期 | |
| Ngày nghỉ việc | 离职日期 | |
| KPI / Đánh giá | KPI 考核 | |
| Kỷ luật | 纪律处分 | |
| Vi phạm | 违规 | |
| Khiếu nại | 申诉 | |
| Thông báo | 通知 | |
| Văn bản công ty / Nội quy | 公司制度 | |
| Đào tạo | 培训 | |

### Hệ thống chung

| Tiếng Việt | Tiếng Trung | Ghi chú |
|---|---|---|
| Đăng nhập / Đăng xuất | 登录 / 退出登录 | |
| Tài khoản / Mật khẩu | 账号 / 密码 | |
| Trang chủ / Tổng quan | 首页 / 概览 | |
| Cài đặt | 设置 | |
| Ngôn ngữ | 语言 | |
| Lưu / Hủy / Xóa | 保存 / 取消 / 删除 | |
| Tìm kiếm | 搜索 | |
| Tải xuống / Xuất Excel | 下载 / 导出 Excel | |
| Hôm nay / Hôm qua | 今天 / 昨天 | |
| Tháng | 月份 | |
| Chưa đọc | 未读 | |
| Xác nhận / Gửi | 确认 / 提交 | |
| Thành công / Thất bại | 成功 / 失败 | |
| Đang xử lý | 处理中 | |
| Không tìm thấy | 未找到 | |
| Không có quyền truy cập | 无访问权限 | |
| Trang / Dòng | 页 / 条 | |

## 7. Lộ trình triển khai (đề xuất)

1. **Giai đoạn 1 — nền tảng**: migration `ngon_ngu`; bộ từ điển khung ở 3 workspace;
   cơ chế chọn ngôn ngữ trên web + app; test khóa đối xứng.
2. **Giai đoạn 2 — bề mặt chính**: đăng nhập, trang chủ, bảng công, đơn từ, thông báo
   (cả đẩy + email theo người nhận).
3. **Giai đoạn 3 — lương & tài liệu**: phiếu lương (đã có khối CNY riêng — chỉ thêm lớp
   ngôn ngữ), xuất CSV/Excel, DOCX đơn/quyết định theo ngôn ngữ chủ thể.
4. Từ nay, **mọi tính năng mới phải sinh ra đã có đủ hai ngôn ngữ** — không có giai đoạn
   "bổ sung sau".
