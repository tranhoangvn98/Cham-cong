// Widget tro ly du lieu ca nhan — nut noi goc phai duoi, chi hien o goc nhin Ca nhan.
// Hoi bang tieng Viet, tra loi tu du lieu cua chinh minh (/api/toi/tro-ly). Khong loi du lieu
// ra dich vu ngoai.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { goi } from '../api.ts';
import { khoa_tinh } from '../thanh_phan.tsx';

/** Icon chat SVG — net sach, khong phu thuoc emoji cua he dieu hanh. */
function IconChat(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

interface DapTroLy {
  tra_loi: string;
  y_dinh: string;
  goi_y: string[];
}

interface Dong {
  ai: 'toi' | 'bot';
  chu: string;
}

/** Hien **dam** thanh <strong>, xuong dong thanh <br>. Khong dung dangerouslySetInnerHTML. */
function noi_dung(chu: string): ReactNode {
  return chu.split('\n').map((dong, i) => (
    <span key={khoa_tinh(dong, i)}>
      {i > 0 && <br />}
      {dong.split(/(\*\*[^*]+\*\*)/g).map((phan, j) => (
        phan.startsWith('**') && phan.endsWith('**')
          ? <strong key={khoa_tinh(phan, j)}>{phan.slice(2, -2)}</strong>
          : <span key={khoa_tinh(phan, j)}>{phan}</span>
      ))}
    </span>
  ));
}

export function TroLyCaNhan(): ReactNode {
  const [mo, dat_mo] = useState(false);
  const [dong, dat_dong] = useState<Dong[]>([]);
  const [goi_y, dat_goi_y] = useState<string[]>([]);
  const [nhap, dat_nhap] = useState('');
  const [dang_hoi, dat_dang_hoi] = useState(false);
  const cuon = useRef<HTMLDivElement>(null);

  // Mo lan dau: lay loi chao + goi y.
  useEffect(() => {
    if (!mo || dong.length > 0) return;
    void goi<DapTroLy>('/api/toi/tro-ly').then((d) => {
      dat_dong([{ ai: 'bot', chu: d.tra_loi }]);
      dat_goi_y(d.goi_y);
    }).catch(() => { /* im lang — tro ly khong chay khong duoc chan viec khac */ });
  }, [mo, dong.length]);

  useEffect(() => {
    cuon.current?.scrollTo({ top: cuon.current.scrollHeight });
  }, [dong]);

  const hoi = async (cau: string): Promise<void> => {
    const c = cau.trim();
    if (c === '' || dang_hoi) return;
    dat_dong((ds) => [...ds, { ai: 'toi', chu: c }]);
    dat_nhap('');
    dat_dang_hoi(true);
    try {
      const d = await goi<DapTroLy>(`/api/toi/tro-ly?hoi=${encodeURIComponent(c)}`);
      dat_dong((ds) => [...ds, { ai: 'bot', chu: d.tra_loi }]);
      dat_goi_y(d.goi_y);
    } catch {
      dat_dong((ds) => [...ds, { ai: 'bot', chu: 'Xin lỗi, mình chưa trả lời được lúc này.' }]);
    } finally {
      dat_dang_hoi(false);
    }
  };

  // Render qua PORTAL ra document.body: nut noi khong nam trong khung nao cua trang, nen
  // `position:fixed` luon bam MAN HINH — khong the bi mot khung cha cat mat (dieu se xay ra
  // neu mot to tien co transform/overflow). Bam chac cho nut noi luon tron day o goc phai.
  if (!mo) {
    return createPortal(
      <button className="troly-nut" onClick={() => dat_mo(true)} aria-label="Mở trợ lý">
        <IconChat />
      </button>,
      document.body,
    );
  }

  return createPortal(
    <div className="troly-panel" role="dialog" aria-label="Trợ lý dữ liệu">
      <div className="troly-dau">
        <b>Trợ lý dữ liệu</b>
        <button className="nut-phang" onClick={() => dat_mo(false)} aria-label="Đóng">✕</button>
      </div>
      <div className="troly-than" ref={cuon}>
        {dong.map((d, i) => (
          <div key={khoa_tinh(d.chu, i)} className={d.ai === 'toi' ? 'troly-tn troly-tn-toi' : 'troly-tn troly-tn-bot'}>
            {noi_dung(d.chu)}
          </div>
        ))}
        {dang_hoi && <div className="troly-tn troly-tn-bot mo-ta">Đang tra…</div>}
        {goi_y.length > 0 && !dang_hoi && (
          <div className="troly-goi-y">
            {goi_y.map((g, i) => (
              <button key={khoa_tinh(g, i)} className="troly-chip" onClick={() => { void hoi(g); }}>
                {g}
              </button>
            ))}
          </div>
        )}
      </div>
      <form className="troly-hang" onSubmit={(e) => { e.preventDefault(); void hoi(nhap); }}>
        <input value={nhap} onChange={(e) => dat_nhap(e.target.value)}
          placeholder="Hỏi về phép, công, lương…" aria-label="Câu hỏi" />
        <button type="submit" disabled={dang_hoi || nhap.trim() === ''}>Gửi</button>
      </form>
    </div>,
    document.body,
  );
}
