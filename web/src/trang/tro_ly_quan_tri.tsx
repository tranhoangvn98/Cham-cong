// Widget tro ly QUAN TRI — nut noi goc phai duoi, chi hien o goc nhin Quan tri (nhan su/
// admin). Hoi bang tieng Viet, tra loi tu du lieu QUAN TRI dung theo quyen nguoi hoi
// (/api/quan-tri/tro-ly). Lich su luu theo tai khoan tren may chu; nut "Xoa" xoa cua minh.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { goi, LoiApi } from '../api.ts';
import { khoa_tinh } from '../thanh_phan.tsx';

/** Icon bieu do SVG — khac icon chat cua tro ly ca nhan de phan biet hai kenh. */
function IconQuanTri(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18" />
      <rect x="5" y="11" width="4" height="6" rx="1" />
      <rect x="11" y="7" width="4" height="10" rx="1" />
      <rect x="17" y="4" width="4" height="13" rx="1" />
    </svg>
  );
}

interface DapTroLyQT {
  tra_loi: string;
  y_dinh: string;
  goi_y: string[];
}

interface Dong {
  ai: 'toi' | 'bot';
  chu: string;
}

interface LuotLichSu {
  cau_hoi: string;
  tra_loi: string;
}

/** Hien **dam** thanh <strong>, xuong dong thanh <br>, dau dong • thanh muc. */
function noi_dung(chu: string): ReactNode {
  return chu.split('\n').map((dong, i) => {
    const than = dong.split(/(\*\*[^*]+\*\*)/g).map((phan, j) => (
      phan.startsWith('**') && phan.endsWith('**')
        ? <strong key={khoa_tinh(phan, j)}>{phan.slice(2, -2)}</strong>
        : <span key={khoa_tinh(phan, j)}>{phan}</span>
    ));
    if (dong.startsWith('• ')) {
      return <div key={khoa_tinh(dong, i)} className="troly-gach">{than}</div>;
    }
    return (
      <span key={khoa_tinh(dong, i)}>
        {i > 0 && <br />}
        {than}
      </span>
    );
  });
}

export function TroLyQuanTri(): ReactNode {
  const [mo, dat_mo] = useState(false);
  const [dong, dat_dong] = useState<Dong[]>([]);
  const [goi_y, dat_goi_y] = useState<string[]>([]);
  const [nhap, dat_nhap] = useState('');
  const [dang_hoi, dat_dang_hoi] = useState(false);
  const cuon = useRef<HTMLDivElement>(null);

  // Mo lan dau: nap lich su tu may chu; chua co lich su nao thi chao lai tu dau.
  useEffect(() => {
    if (!mo || dong.length > 0) return;
    void (async () => {
      const cu = await goi<LuotLichSu[]>('/api/quan-tri/tro-ly/lich-su')
        .catch(() => [] as LuotLichSu[]);
      if (Array.isArray(cu) && cu.length > 0) {
        const dong_cu: Dong[] = [];
        for (const d of [...cu].reverse()) {
          dong_cu.push({ ai: 'toi', chu: d.cau_hoi });
          dong_cu.push({ ai: 'bot', chu: d.tra_loi });
        }
        dat_dong(dong_cu);
        return;
      }
      const d = await goi<DapTroLyQT>('/api/quan-tri/tro-ly').catch(() => null);
      if (d !== null) {
        dat_dong([{ ai: 'bot', chu: d.tra_loi }]);
        dat_goi_y(d.goi_y);
      }
    })();
  }, [mo, dong.length]);

  useEffect(() => {
    cuon.current?.scrollTo({ top: cuon.current.scrollHeight, behavior: 'smooth' });
  }, [dong, dang_hoi]);

  const hoi = async (cau: string): Promise<void> => {
    const c = cau.trim();
    if (c === '' || dang_hoi) return;
    dat_dong((ds) => [...ds, { ai: 'toi', chu: c }]);
    dat_nhap('');
    dat_dang_hoi(true);
    try {
      const d = await goi<DapTroLyQT>(`/api/quan-tri/tro-ly?hoi=${encodeURIComponent(c)}`);
      dat_dong((ds) => [...ds, { ai: 'bot', chu: d.tra_loi }]);
      dat_goi_y(d.goi_y);
    } catch (loi) {
      const chu = loi instanceof LoiApi ? loi.message : 'Không kết nối được máy chủ.';
      dat_dong((ds) => [...ds, { ai: 'bot', chu: `Xin lỗi, mình chưa trả lời được lúc này: ${chu}` }]);
    } finally {
      dat_dang_hoi(false);
    }
  };

  /** Xoa toan bo lich su cua chinh minh tren may chu; cau hoi tiep theo chao lai tu dau. */
  const xoa_lich_su = (): void => {
    void goi('/api/quan-tri/tro-ly/lich-su', { method: 'DELETE' }).catch(() => {
      /* khong xoa duoc thi de trang thai nhu cu */
    });
    dat_dong([]);
    dat_goi_y([]);
  };

  if (!mo) {
    return createPortal(
      <button className="troly-nut" onClick={() => dat_mo(true)} aria-label="Mở trợ lý quản trị">
        <IconQuanTri />
      </button>,
      document.body,
    );
  }

  return createPortal(
    <div className="troly-panel" role="dialog" aria-label="Trợ lý quản trị">
      <div className="troly-dau">
        <b>Trợ lý quản trị</b>
        <span>
          <button className="nut-phang" onClick={xoa_lich_su} aria-label="Xóa lịch sử"
            title="Xóa toàn bộ lịch sử hội thoại của bạn">Xóa</button>
          <button className="nut-phang" onClick={() => dat_mo(false)} aria-label="Đóng">✕</button>
        </span>
      </div>
      <div className="troly-than" ref={cuon}>
        {dong.map((d, i) => (
          <div key={khoa_tinh(d.chu, i)} className={d.ai === 'toi' ? 'troly-tn troly-tn-toi' : 'troly-tn troly-tn-bot'}>
            {noi_dung(d.chu)}
          </div>
        ))}
        {dang_hoi && (
          <div className="troly-tn troly-tn-bot" aria-label="Đang trả lời">
            <span className="troly-ba-cham"><i /><i /><i /></span>
          </div>
        )}
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
          placeholder="Hỏi tổng quan, đi muộn, vắng, đơn chờ duyệt…" aria-label="Câu hỏi" />
        <button type="submit" disabled={dang_hoi || nhap.trim() === ''}>Gửi</button>
      </form>
    </div>,
    document.body,
  );
}
