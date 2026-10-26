import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { bat_bang_di_dong } from './bang_di_dong.ts';
import './kieu.css';

// Bien nay do vite.config.ts thay bang ma phien ban luc build (define __PHIEN_BAN__).
declare const __PHIEN_BAN__: string;
declare global {
  interface Window { __PHIEN_BAN__?: string }
}

// ---------------------------------------------------------- tu chua benh ban cu
//
// Trieu chung: nguoi dung thay "giao dien cu bi loi" hien lai du may chu da trien khai
// ban moi — vi trinh duyet giu index.html / bundle cu trong bo nho dem (tab mo tu truoc
// luc trien khai, bfcache khi bam Lui/Tien). Cac kiem tra duoi day tu nap lai trang khi
// phat hien ban dang chay lech voi ban may chu dang phuc vu.

/** index.html moi nhat nhung JS cu (dem giu bundle cu) — nap lai lay build moi. */
function nap_lai_neu_lech(): void {
  if (window.__PHIEN_BAN__ !== undefined && window.__PHIEN_BAN__ !== __PHIEN_BAN__) {
    window.location.reload();
  }
}

/** Doi chieu version.json tu may chu: tab DANG MO tu ban cu cung tu nap lai. */
async function doi_chieu_phien_ban(): Promise<void> {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' });
    if (!r.ok) return;
    const v = await r.json() as { phien_ban?: string };
    if (v.phien_ban !== undefined && v.phien_ban !== __PHIEN_BAN__) {
      window.location.reload();
    }
  } catch {
    // Mang loi — bo qua, lan kiem tra sau se thu lai.
  }
}

function bat_tu_chua_benh(): void {
  // Bam Lui/Tien coi phuc hoi trang tu bfcache KHONG chay lai JS — kiem lai luc nay.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      nap_lai_neu_lech();
      void doi_chieu_phien_ban();
    }
  });
  // Quay lai tab sau thoi gian dai de no o ban cu cung duoc nap lai.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void doi_chieu_phien_ban();
  });
  // Vong tuan tra nhe: version.json chua vai chu so, 2 phut mot lan.
  window.setInterval(() => { void doi_chieu_phien_ban(); }, 2 * 60 * 1000);
}

const goc = document.getElementById('goc');
if (goc === null) throw new Error('Khong tim thay the #goc trong index.html');

if (window.__PHIEN_BAN__ !== undefined && window.__PHIEN_BAN__ !== __PHIEN_BAN__) {
  // index.html moi + JS cu trong dem: dung vong lap SPA cua ban cu, nap lai ngay.
  window.location.reload();
} else {
  bat_tu_chua_benh();
  bat_bang_di_dong();
  createRoot(goc).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
