// Cau hinh MCP server — doc tu bien moi truong, khong can file .env.
//
//   CHAM_CONG_GOC   Goc API cham cong (mac dinh http://127.0.0.1:8080). Duong dan se noi
//                   them "/api/v1/...". Vi du khi chay canh may_chu trong cung mang Docker:
//                   http://may_chu:8080
//   CHAM_CONG_KHOA  Khoa API dang "ck_...", tao o Webapp → He thong → Khoa API. Thieu thi
//                   may chu MCP van chay de khach kiem danh sach cong cu, nhung goi cong cu
//                   nao cung tra loi "thieu khoa" ro rang.
//   MCP_TRANSPORT   "stdio" (mac dinh, cho Claude Desktop/Code chay cuc bo) hoac "http"
//                   (Streamable HTTP, dat sau reverse proxy tren VPS).
//   MCP_PORT        Cong nghe khi chay http (mac dinh 3100).
//   MCP_DUONG_DAN   Duong dan phuc vu Streamable HTTP (mac dinh /mcp).

function chu(khoa: string, mac_dinh: string): string {
  const v = process.env[khoa];
  return v === undefined || v.trim() === '' ? mac_dinh : v.trim();
}

function so(khoa: string, mac_dinh: number): number {
  const v = process.env[khoa];
  if (v === undefined || v.trim() === '') return mac_dinh;
  const n = Number(v.trim());
  if (!Number.isFinite(n)) throw new Error(`Bien ${khoa} phai la so, dang nhan: ${v}`);
  return n;
}

export const cau_hinh = {
  goc_api: chu('CHAM_CONG_GOC', 'http://127.0.0.1:8080').replace(/\/+$/, ''),
  khoa_api: chu('CHAM_CONG_KHOA', ''),
  transport: chu('MCP_TRANSPORT', 'stdio'),
  cong_http: so('MCP_PORT', 3100),
  duong_dan_http: '/' + chu('MCP_DUONG_DAN', 'mcp').replace(/^\/+/, ''),
};
