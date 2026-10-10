import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Ma phien ban nhung vao CA index.html LAN bundle JS (xem main.tsx). Neu hai ben lech
// nhau — trinh duyet dang chay ban cu tu bo nho dem — app tu nap lai de het giao dien cu.
// `Date.now()` moi lan build la mot ma moi; khong dung hash git vi VPS build tu image
// docker khong chua .git.
const PHIEN_BAN = Date.now().toString(36);

export default defineConfig({
  // Tien to duong dan khi webapp KHONG nam o goc ten mien — vd dung chung ten mien voi
  // dich vu khac: VITE_BASE=/chamcong/
  //
  // Vite nhung tien to nay vao duong dan cua tep tinh (assets, font) va lo ra cho ma nguon
  // qua import.meta.env.BASE_URL — router va lop goi API dung lai gia tri do. Phai co dau
  // gach cheo o CA HAI dau, neu khong Vite sinh duong dan sai.
  base: process.env['VITE_BASE'] ?? '/',
  plugins: [
    react(),
    {
      name: 'phien-ban-tu-chua-benh',
      transformIndexHtml: {
        order: 'pre',
        handler() {
          return [{
            tag: 'script',
            attrs: { type: 'text/javascript' },
            children: `window.__PHIEN_BAN__ = ${JSON.stringify(PHIEN_BAN)};`,
            injectTo: 'head',
          }];
        },
      },
      generateBundle() {
        // Ban JSON nho de tab DANG MO tu truoc lan trien khai doi chieu va tu nap lai.
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ phien_ban: PHIEN_BAN }),
        });
      },
    },
  ],
  define: {
    __PHIEN_BAN__: JSON.stringify(PHIEN_BAN),
  },
  server: {
    port: 5173,
    // Khi chay dev, chuyen tiep /api va /iclock sang may chu de khong phai cau hinh CORS.
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/health': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
