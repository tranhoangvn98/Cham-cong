// Diem vao cua MCP server cho phan he Cham cong.
//
// HAI CACH CHAY:
//
//   stdio (mac dinh) — cho Claude Desktop / Claude Code / Copilot chay cuc bo:
//       node dist/may_chu_mcp.js
//     (hoac cau hinh dich vu voi bin "cham-cong-mcp")
//
//   http — Streamable HTTP dat sau reverse proxy (Caddy) tren VPS:
//       MCP_TRANSPORT=http MCP_PORT=3100 node dist/may_chu_mcp.js
//     Khach noi toi http://<may>:3100/mcp (hoac qua Caddy https://<ten mien>/mcp).
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { cau_hinh } from './cau_hinh.ts';
import { dang_ky_cong_cu } from './cong_cu.ts';

const may_chu = new McpServer({
  name: 'cham-cong',
  version: '1.0.0',
});

dang_ky_cong_cu(may_chu);

/** Ghi chu dung dich vu ra stderr de khong lam nhiem luong stdio. */
function ghi(log: string): void {
  process.stderr.write(`${new Date().toISOString()} [cham-cong-mcp] ${log}\n`);
}

async function chay_stdio(): Promise<void> {
  const van_chuyen = new StdioServerTransport();
  await may_chu.connect(van_chuyen);
  ghi('dang chay qua stdio');
}

/**
 * Streamable HTTP. Khong dung Express — node:http du. Khach dang ky SSE tai
 * GET /mcp va gui JSON-RPC tai POST /mcp (session rieng moi lan POST — mode stateless).
 */
async function chay_http(): Promise<void> {
  const may_http = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === cau_hinh.duong_dan_http) {
      void xu_ly_mcp(req, res);
      return;
    }
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('ok');
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('khong co duong nay');
  });
  may_http.listen(cau_hinh.cong_http, () => {
    ghi(`dang nghe http tai cong ${cau_hinh.cong_http}, duong ${cau_hinh.duong_dan_http}`);
  });
}

async function xu_ly_mcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Mot phien moi cho moi request: khong can luu phien, va khong ro ri phien giua cac
  // khach. Lua chon nay co y cho trien khai stateless sau reverse proxy.
  const van_chuyen = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on('close', () => {
    void van_chuyen.close();
  });
  await may_chu.connect(van_chuyen);
  // Khong truyen parsedBody: transport tu doc body tu luong request.
  await van_chuyen.handleRequest(req, res);
}

if (cau_hinh.transport === 'http') {
  void chay_http();
} else {
  void chay_stdio();
}
