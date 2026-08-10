import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Tien to duong dan khi webapp KHONG nam o goc ten mien — vd dung chung ten mien voi
  // dich vu khac: VITE_BASE=/chamcong/
  //
  // Vite nhung tien to nay vao duong dan cua tep tinh (assets, font) va lo ra cho ma nguon
  // qua import.meta.env.BASE_URL — router va lop goi API dung lai gia tri do. Phai co dau
  // gach cheo o CA HAI dau, neu khong Vite sinh duong dan sai.
  base: process.env['VITE_BASE'] ?? '/',
  plugins: [react()],
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
