# C4 mức 2 — Container: module Giám sát gian lận

Mỗi mũi tên ghi rõ **giao thức** và **mục đích** — không viết chung chung "gọi API".

```mermaid
graph TB
    subgraph ERP2["ERP 2 — Chấm công"]
        WEB["Web app<br/>React 19 + Vite<br/>trang /giam-sat"]
        API["Máy chủ API<br/>Node 22 + Fastify<br/>tuyen/giam_sat.ts"]
        QUET["Vòng quét nền<br/>giam_sat/lich_quet.ts<br/>15 phút/vòng, ô 60 phút"]
        DB[("PostgreSQL ERP 2<br/>canh_bao, loai_loi,<br/>dieu_kien_loi, anh_chup_erp")]
    end

    subgraph ERP1["ERP 1 — 5 database"]
        HOLA[("hola<br/>chi/thu/ngân hàng/vận đơn")]
        SALE[("sale<br/>đơn hàng, cơ hội, mua hàng")]
        DEBT[("debt<br/>công nợ")]
        LOGS[("logs<br/>nhật ký thao tác")]
        KHO[("kho<br/>PKL, nhập/xuất kho, tờ khai")]
    end

    SMTP["Máy chủ SMTP"]

    WEB -->|"HTTPS/JSON + Bearer JWT<br/>đọc cảnh báo, đặt ngưỡng"| API
    API -->|"SQL qua pg pool<br/>đọc/ghi cảnh báo và danh mục"| DB
    QUET -->|"SQL<br/>đọc điều kiện, ghi cảnh báo + nhật ký"| DB

    QUET -->|"PostgreSQL CHỈ ĐỌC<br/>max 3 kết nối, timeout 20s"| HOLA
    QUET -->|"PostgreSQL CHỈ ĐỌC"| SALE
    QUET -->|"PostgreSQL CHỈ ĐỌC"| DEBT
    QUET -->|"PostgreSQL CHỈ ĐỌC"| LOGS
    QUET -->|"PostgreSQL CHỈ ĐỌC"| KHO

    API -.->|"PostgreSQL CHỈ ĐỌC<br/>chỉ khi bấm Chạy thử / Dò tìm"| HOLA
    QUET -->|"SMTP<br/>bản tin hằng ngày"| SMTP

    classDef ro fill:#fff4e5,stroke:#d97706
    class HOLA,SALE,DEBT,LOGS,KHO ro
```

## Vì sao tách vòng quét khỏi luồng request

Đọc CSDL của hệ thống khác là việc chậm và không đoán trước được. Đặt nó trong luồng xử lý
request thì một truy vấn treo bên ERP 1 sẽ làm treo một request của người dùng đang chờ màn
hình chấm công.

Ngoại lệ duy nhất là nút **Chạy thử** và **Dò tìm database**: người dùng chủ động bấm và
đang đứng chờ kết quả, nên chạy đồng bộ là đúng.

## Khóa việc

Nhiều instance chạy song song không quét trùng: mỗi loại lỗi × mỗi ô thời gian là một dòng
`cong_viec_da_chay`, giành bằng `insert ... on conflict do nothing` (nguyên tử).

## Sơ đồ này khớp thực tế

Kiểm chứng ngày 02.09.2026: 31 migration chạy sạch trên PostgreSQL 16, API trả đúng phân
quyền qua `app.inject()`, 16 bài e2e xanh.
