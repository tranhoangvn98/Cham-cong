# MCP server cho phân hệ Chấm công

MCP (Model Context Protocol) cho phép **trợ lý AI bên ngoài** (Claude Desktop, VS Code
Copilot, Microsoft Foundry…) đọc và thao tác phân hệ Chấm công bằng ngôn ngữ tự nhiên.

## Kiến trúc

- Gói `mcp/` là một tiến trình Node độc lập — **proxy mỏng** bọc REST API `/api/v1` có sẵn.
  Không chứa logic nghiệp vụ, không kết nối thẳng CSDL.
- Xác thực bằng **khóa API `ck_...`** (Webapp → Hệ thống → Khóa API) với phạm vi quyền và
  danh sách IP cho phép — đúng cơ chế dùng cho mọi hệ thống ngoài.
- Hai cách chạy cùng một mã nguồn:
  - `stdio` — Claude Desktop / Code chạy cục bộ.
  - `http` — Streamable HTTP trên VPS, đặt sau Caddy ở đường `https://<ten-mien>/mcp`.

## Tạo khóa API

1. Vào Webapp → Hệ thống → Khóa API → tạo khóa mới, đặt tên `mcp`.
2. Cấp phạm vi tối thiểu theo nhu cầu:

| Công cụ | Phạm vi cần |
| --- | --- |
| `lay_thong_tin_khoa` | (chỉ cần khóa hợp lệ) |
| `tim_nhan_vien`, `doc_nhan_vien` | `nhan_vien:doc` |
| `luu_nhan_vien` | `nhan_vien:ghi` |
| `doc_bang_cong`, `tong_hop_bang_cong` | `bang_cong:doc` |
| `doc_lan_quet` | `lan_quet:doc` |
| `doc_nghi_phep`, `doc_don` | `nghi_phep:doc` + `don:doc` |
| `doc_vi_pham`, `ghi_nhan_vi_pham` | `vi_pham:doc` + `vi_pham:ghi` |
| `doc_ky_luat` | `ky_luat:doc` |
| `doc_van_ban` | `van_ban:doc` |
| `doc_thong_bao` | `thong_bao:doc` |
| `doc_su_kien` | `su_kien:doc` |

3. (Khuyến nghị) Khai `IP cho phép` nếu khóa chỉ dùng từ văn phòng.

## Chạy trên VPS (HTTP)

Đã cấu hình sẵn trong `docker-compose.yml` (service `mcp`) và `cong_vao/Caddyfile`
(đường `/mcp/*`). Chỉ cần điền khóa vào `.env` rồi triển khai:

```bash
MCP_KHOA_API=ck_...
bash trien_khai/cap_nhat_vps.sh
```

Sau đó client nối tới `https://<ten-mien>/mcp`.

## Chạy cục bộ (stdio)

```bash
cd mcp
npm install
npm run build
CHAM_CONG_GOC=https://teams.tranhoangvietnam.com/chamcong \
CHAM_CONG_KHOA=ck_... \
node dist/may_chu_mcp.js
```

### Claude Desktop

Thêm vào `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cham-cong": {
      "command": "node",
      "args": ["<duong-dan-repo>/mcp/dist/may_chu_mcp.js"],
      "env": {
        "CHAM_CONG_GOC": "https://teams.tranhoangvietnam.com/chamcong",
        "CHAM_CONG_KHOA": "ck_..."
      }
    }
  }
}
```

### VS Code Copilot

Thêm vào `.vscode/mcp.json`:

```json
{
  "servers": {
    "cham-cong": {
      "type": "stdio",
      "command": "node",
      "args": ["<duong-dan-repo>/mcp/dist/may_chu_mcp.js"],
      "env": {
        "CHAM_CONG_GOC": "https://teams.tranhoangvietnam.com/chamcong",
        "CHAM_CONG_KHOA": "ck_..."
      }
    }
  }
}
```

## 15 công cụ

`lay_thong_tin_khoa` — kiểm tra khóa và phạm vi.

Đọc: `tim_nhan_vien`, `doc_nhan_vien`, `doc_bang_cong`, `tong_hop_bang_cong`,
`doc_lan_quet`, `doc_nghi_phep`, `doc_don`, `doc_vi_pham`, `doc_ky_luat`, `doc_van_ban`,
`doc_thong_bao`, `doc_su_kien`.

Ghi: `luu_nhan_vien` (upsert nhân viên), `ghi_nhan_vi_pham` (bản ghi vi phạm từ hệ thống
ngoài). Công cụ ghi chỉ chạy được khi khóa có phạm vi ghi — máy chủ từ chối bằng lỗi có
mã rõ ràng để AI giải thích lại cho người dùng.

## Kiểm thử tay

```bash
npx @modelcontextprotocol/inspector
# chọn "Connect" rồi điền lệnh chạy như trên (stdio), hoặc URL https://<ten-mien>/mcp
```

## Lưu ý

- Mọi lần gọi đều được ghi vào nhật ký API (`nhat_ky_api`) — kiểm tra được ai gọi gì, lúc nào.
- Dữ liệu trả về phụ thuộc phạm vi của khóa: khóa chỉ đọc thì không công cụ ghi nào chạy được.
- MCP **không** thay cho webapp: nó phục vụ trợ lý AI, không phục vụ người dùng cuối trực tiếp.
