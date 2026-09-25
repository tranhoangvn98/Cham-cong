// Chuong bao (notification) o header — cho MOI nguoi dung. So chua doc + danh sach, bam vao thi
// mo dung man va danh dau da doc. Du lieu tu /api/toi/bao (sinh tu gui_ngam moi su kien).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { goi, la_nhan_su } from '../api.ts';
import { dung_tuyen } from '../dinh_tuyen.tsx';
import { dat_muc_tieu_bao } from '../dieu_huong_sau.ts';
import { khoa_tinh, ngay_gio } from '../thanh_phan.tsx';

interface Bao {
  id: string;
  tieu_de: string;
  noi_dung: string;
  // Ngoai `man` (di toi dau), thong bao con kem id ban ghi de mo dung khieu nai / don cu the.
  du_lieu: { man?: string; khieu_nai_id?: string; don_id?: string; ho_thu_id?: string } | null;
  da_doc: boolean;
  doc_luc: string | null;
  // May chu suy live tu nghiep vu: null = thuần tin, chi co nhan Da xem / Chua xem.
  trang_thai: string | null;
  nhan_trang_thai: string | null;
  con_xu_ly: boolean;
  tao_luc: string;
}

/** man (trong du_lieu) -> duong dan trong web. Khong khop thi ve trang chu. */
const DUONG_THEO_MAN: Record<string, string> = {
  'duyet-don': '/duyet-don',
  'duyet-ot': '/duyet-don',
  'duyet-ket-qua-ot': '/duyet-don',
  'don-tu': '/duyet-don',
  'khieu-nai-luong': '/khieu-nai-luong',
  'ho-thu-y-kien': '/ca-nhan/y-kien',
  'ra-vao': '/ra-vao',
  'thong-bao': '/thong-bao',
  'ky-luat': '/ca-nhan/don-tu',
  'vi-pham': '/ca-nhan/don-tu',
  'don-cua-toi': '/ca-nhan/don-tu',
  'ho_so': '/ca-nhan/ca-nhan',
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
  // Ba tab tran (khong gan so dem): 'tat_ca' xem moi thu; 'chua_xem' chi bao chua doc;
  // 'cho_duyet' chi nhung bao DA XEM nhung viec gan no van con cho xu ly.
  const [tab, dat_tab] = useState<'tat_ca' | 'chua_xem' | 'cho_duyet'>('tat_ca');
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
    // Kem id ban ghi (neu co) de man dich mo dung khieu nai / don va dung thao luan, khong chi
    // dung o dau man. Dat truoc khi dieu huong; man dich doc mot lan luc mount.
    const id_ban_ghi = b.du_lieu?.khieu_nai_id ?? b.du_lieu?.don_id ?? b.du_lieu?.ho_thu_id;
    if (man !== undefined && id_ban_ghi != null && id_ban_ghi !== '') {
      dat_muc_tieu_bao({ man, id: id_ban_ghi });
    }
    if (dieu_huong !== undefined) { dieu_huong(man); return; }
    // Hòm thư ý kiến: goc quan tri vao trang quan ly; nhan vien vao tab cua minh.
    if (man === 'ho-thu-y-kien' && la_nhan_su()) { di_toi('/ho-thu-y-kien'); return; }
    di_toi(man !== undefined ? (DUONG_THEO_MAN[man] ?? '/') : '/');
  };

  const doc_het = (): void => {
    void goi('/api/toi/bao/doc-het', { method: 'POST', body: {} }).then(nap).catch(() => {});
  };

  // Sap xep ba tang:
  //   1. CHUA XEM len dau, moi nhat truoc — de khong bao gio bi viec "cho duyet" chen mat.
  //   2. DA XEM nhung viec CON PHAI XU LY (cho duyet) — cai LAU CHUA XU LY nhat len tren cung.
  //   3. Phan da xem con lai (da xu ly / thuần tin) — moi nhat truoc.
  const bac = (b: Bao): 0 | 1 | 2 => (!b.da_doc ? 0 : b.con_xu_ly ? 1 : 2);
  const sap = [...ds].sort((a, b) => {
    const ba = bac(a);
    const bb = bac(b);
    if (ba !== bb) return ba - bb;
    if (ba === 0) return a.tao_luc > b.tao_luc ? -1 : 1;
    if (ba === 1) return a.tao_luc < b.tao_luc ? -1 : 1;
    return a.tao_luc > b.tao_luc ? -1 : 1;
  });
  const ds_cho_duyet = sap.filter((b) => b.da_doc && b.con_xu_ly);
  const hien = tab === 'chua_xem'
    ? sap.filter((b) => !b.da_doc)
    : tab === 'cho_duyet' ? ds_cho_duyet : sap;

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
          <div className="chuong-tabs" role="tablist" aria-label="Lọc thông báo">
            <button type="button" role="tab" aria-selected={tab === 'tat_ca'}
              className={tab === 'tat_ca' ? 'chuong-tab dang-chon' : 'chuong-tab'}
              onClick={() => dat_tab('tat_ca')}>Tất cả</button>
            <button type="button" role="tab" aria-selected={tab === 'chua_xem'}
              className={tab === 'chua_xem' ? 'chuong-tab dang-chon' : 'chuong-tab'}
              onClick={() => dat_tab('chua_xem')}>Chưa xem</button>
            <button type="button" role="tab" aria-selected={tab === 'cho_duyet'}
              className={tab === 'cho_duyet' ? 'chuong-tab dang-chon' : 'chuong-tab'}
              onClick={() => dat_tab('cho_duyet')}>Chờ duyệt</button>
          </div>
          <div className="chuong-ds">
            {hien.length === 0
              ? <div className="chuong-trong">
                  {tab === 'chua_xem'
                    ? 'Không còn thông báo chưa xem.'
                    : tab === 'cho_duyet'
                      ? 'Không có thông báo nào đang chờ duyệt.'
                      : 'Chưa có thông báo nào.'}
                </div>
              : hien.map((b, i) => (
                <button key={khoa_tinh(b.id, i)}
                  className={b.da_doc ? 'chuong-muc' : 'chuong-muc chuong-moi'}
                  onClick={() => bam(b)}>
                  <div className="chuong-tieu-de">{b.tieu_de}</div>
                  {b.noi_dung !== '' && <div className="chuong-noi-dung">{b.noi_dung}</div>}
                  <div className="chuong-meta">
                    {b.da_doc ? (
                      <span className="nhan nhan-mo">
                        Đã xem{b.doc_luc !== null ? ` · ${ngay_gio(b.doc_luc)}` : ''}
                      </span>
                    ) : (
                      <span className="nhan nhan-lanh">Chưa xem</span>
                    )}
                    {b.nhan_trang_thai !== null && (
                      <span className={`nhan ${b.con_xu_ly ? 'nhan-canh-bao' : 'nhan-mo'}`}>
                        {b.nhan_trang_thai}
                      </span>
                    )}
                  </div>
                  <div className="chuong-gio">{ngay_gio(b.tao_luc)}</div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
