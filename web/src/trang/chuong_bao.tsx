// Chuong bao (notification) o header — cho MOI nguoi dung. So chua doc + danh sach, bam vao thi
// mo dung man va danh dau da doc. Du lieu tu /api/toi/bao (sinh tu gui_ngam moi su kien).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import { dung_tuyen } from '../dinh_tuyen.tsx';
import { khoa_tinh, ngay_gio } from '../thanh_phan.tsx';

interface Bao {
  id: string;
  tieu_de: string;
  noi_dung: string;
  du_lieu: { man?: string } | null;
  da_doc: boolean;
  tao_luc: string;
}

/** man (trong du_lieu) -> duong dan trong web. Khong khop thi ve trang chu. */
const DUONG_THEO_MAN: Record<string, string> = {
  'duyet-don': '/duyet-don',
  'thong-bao': '/thong-bao',
  'ky-luat': '/don-cua-toi',
  'vi-pham': '/don-cua-toi',
  'don-cua-toi': '/don-cua-toi',
};

function IconChuong(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/**
 * `dieu_huong` (tuy chon): thay cho dieu huong mac dinh bang route. Vo ca nhan truyen callback
 * nay de bam mot bao mo man NGAY TRONG vo ca nhan (khong nhay ra vo quan tri cu). Khong truyen
 * thi giu hanh vi cu: `di_toi` theo `DUONG_THEO_MAN`.
 */
export function ChuongBao({ dieu_huong }: {
  dieu_huong?: (man: string | undefined) => void;
} = {}): ReactNode {
  const { di_toi } = dung_tuyen();
  const [mo, dat_mo] = useState(false);
  const [ds, dat_ds] = useState<Bao[]>([]);
  const [so, dat_so] = useState(0);
  const vo = useRef<HTMLDivElement>(null);

  const nap = (): void => {
    void goi<{ danh_sach: Bao[]; so_chua_doc: number }>('/api/toi/bao')
      .then((kq) => { dat_ds(kq.danh_sach); dat_so(kq.so_chua_doc); })
      .catch(() => { /* chuong bao la phu — loi thi im lang */ });
  };

  // Nap luc dau + moi 60 giay. Chi dem, nhe.
  useEffect(() => {
    nap();
    const h = window.setInterval(nap, 60_000);
    return () => window.clearInterval(h);
  }, []);

  // Dong khi bam ra ngoai.
  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: MouseEvent): void => {
      if (vo.current !== null && !vo.current.contains(e.target as Node)) dat_mo(false);
    };
    window.addEventListener('mousedown', ngoai);
    return () => window.removeEventListener('mousedown', ngoai);
  }, [mo]);

  const bam = (b: Bao): void => {
    if (!b.da_doc) {
      void goi(`/api/toi/bao/${b.id}/doc`, { method: 'POST', body: {} }).then(nap).catch(() => {});
    }
    dat_mo(false);
    const man = b.du_lieu?.man;
    if (dieu_huong !== undefined) { dieu_huong(man); return; }
    di_toi(man !== undefined ? (DUONG_THEO_MAN[man] ?? '/') : '/');
  };

  const doc_het = (): void => {
    void goi('/api/toi/bao/doc-het', { method: 'POST', body: {} }).then(nap).catch(() => {});
  };

  return (
    <div className="chuong-vo" ref={vo}>
      <button className="nut-tron" onClick={() => { if (!mo) nap(); dat_mo(!mo); }}
        aria-label={`Thông báo${so > 0 ? ` (${so} chưa đọc)` : ''}`} aria-expanded={mo}>
        <IconChuong />
        {so > 0 && <span className="chuong-dot">{so > 9 ? '9+' : so}</span>}
      </button>
      {mo && (
        <div className="chuong-bang" role="dialog" aria-label="Thông báo">
          <div className="chuong-dau">
            <b>Thông báo</b>
            {so > 0 && <button className="nut-nho nut-phang" onClick={doc_het}>Đánh dấu đã đọc</button>}
          </div>
          <div className="chuong-ds">
            {ds.length === 0
              ? <div className="chuong-trong">Chưa có thông báo nào.</div>
              : ds.map((b, i) => (
                <button key={khoa_tinh(b.id, i)}
                  className={b.da_doc ? 'chuong-muc' : 'chuong-muc chuong-moi'}
                  onClick={() => bam(b)}>
                  <div className="chuong-tieu-de">{b.tieu_de}</div>
                  {b.noi_dung !== '' && <div className="chuong-noi-dung">{b.noi_dung}</div>}
                  <div className="chuong-gio">{ngay_gio(b.tao_luc)}</div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
