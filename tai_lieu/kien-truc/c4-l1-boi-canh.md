# C4 mức 1 — Bối cảnh: module Giám sát gian lận

Sơ đồ đặt module trong bối cảnh các hệ thống và con người quanh nó. Người không làm kỹ thuật
đọc được sơ đồ này.

```mermaid
graph TB
    CEO["Ban điều hành<br/>đọc cảnh báo, chốt ngưỡng"]
    KS["Kiểm soát nội bộ<br/>xử lý cảnh báo"]
    AD["Quản trị CNTT<br/>cấu hình nguồn dữ liệu"]

    ERP2["<b>ERP 2 — Chấm công</b><br/>Node + Fastify + PostgreSQL<br/>chứa module Giám sát gian lận"]

    ERP1M["<b>ERP 1 — erp_manager</b><br/>bán hàng, chi/thu, công nợ, log<br/>PostgreSQL"]
    ERP1L["<b>ERP 1 — erp_logistic</b><br/>packing list, kho, tờ khai<br/>PostgreSQL"]

    SSO["Cổng SSO nội bộ<br/>OIDC RS256"]
    SMTP["Máy chủ thư<br/>SMTP"]
    ZK["Máy chấm công ZKTeco<br/>giao thức ADMS"]

    CEO -->|"HTTPS: xem cảnh báo, xuất CSV"| ERP2
    KS -->|"HTTPS: xử lý cảnh báo, đặt ngưỡng"| ERP2
    AD -->|"HTTPS: chọn database, đối chiếu schema"| ERP2

    ERP2 -->|"PostgreSQL CHỈ ĐỌC<br/>ba lớp chặn ghi"| ERP1M
    ERP2 -->|"PostgreSQL CHỈ ĐỌC"| ERP1L
    ERP2 -->|"SMTP: bản tin hằng ngày"| SMTP
    SSO -->|"OIDC: xác thực, cấp vai trò"| ERP2
    ZK -->|"ADMS: log chấm công"| ERP2

    classDef ta fill:#e8f0fe,stroke:#3B82F6,stroke-width:2px
    classDef nguoi_khac fill:#fff4e5,stroke:#d97706
    class ERP2 ta
    class ERP1M,ERP1L nguoi_khac
```

**Chú giải:** khối xanh là hệ thống ta xây; khối cam là hệ thống của đội khác — ta chỉ **đọc**,
không bao giờ ghi.

## Vì sao mũi tên chỉ một chiều tới ERP 1

Module không có đường ghi nào sang ERP 1. Ba lớp chặn (quyền tài khoản, tham số chuỗi kết nối,
`begin read only` mỗi truy vấn) và một bài kiểm kiến trúc trong CI cưỡng chế điều đó.

Hệ quả cần biết: **ERP 1 không biết module này tồn tại.** Nếu ERP 1 đổi tên bảng, module im
lặng trả 0 dòng. Lệnh `doi_chieu_schema` là thứ duy nhất biến sự im lặng đó thành báo cáo.
