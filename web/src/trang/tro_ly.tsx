// Widget tro ly du lieu ca nhan — nut noi goc phai duoi, chi hien o goc nhin Ca nhan.
// Hoi bang tieng Viet, tra loi tu du lieu cua chinh minh (/api/toi/tro-ly). Khong loi du lieu
// ra dich vu ngoai.
//
// HANH DONG CHO XAC NHAN: may chu chi DIEN SAN payload don (hanh_dong) — khong ghi gi ca.
// Nhan vien bam "Xac nhan" thi TRINH DUYET nay moi goi route POST san co voi token cua chinh
// ho. Khong bam thi khong co gi duoc gui di.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { goi, LoiApi } from '../api.ts';
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

/** Hanh dong may chu dien san, cho nhan vien bam xac nhan. */
interface HanhDong {
  loai: string;
  tieu_de: string;
  chi_tiet: string[];
  duong_dan: string;
  phuong_thuc: 'POST';
  du_lieu: Record<string, unknown>;
  nhan: string;
  bo: string;
}

interface DapTroLy {
  tra_loi: string;
  y_dinh: string;
  goi_y: string[];
  hanh_dong?: HanhDong;
}

interface Dong {
  ai: 'toi' | 'bot';
  chu: string;
}

/** Hien **dam** thanh <strong>, xuong dong thanh <br>, dau dong • thanh muc. Khong dung
 * dangerouslySetInnerHTML. */
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

/** Giao dien chi cho goi cac duong /api/toi do may chu san sinh. Chan lai de khong ai nem
 * mot duong la (vd /api/xac-thuc) vao the xac nhan. */
function duong_an_toan(hd: HanhDong): boolean {
  return hd.phuong_thuc === 'POST' && hd.duong_dan.startsWith('/api/toi/');
}

export function TroLyCaNhan(): ReactNode {
  const [mo, dat_mo] = useState(false);
  const [dong, dat_dong] = useState<Dong[]>([]);
  const [goi_y, dat_goi_y] = useState<string[]>([]);
  const [nhap, dat_nhap] = useState('');
  const [dang_hoi, dat_dang_hoi] = useState(false);
  const [hanh_dong, dat_hanh_dong] = useState<HanhDong | null>(null);
  const [dang_gui, dat_dang_gui] = useState(false);
  const cuon = useRef<HTMLDivElement>(null);

  // Mo lan dau: lay loi chao + goi y.
  useEffect(() => {
    if (!mo || dong.length > 0) return;
    void goi<DapTroLy>('/api/toi/tro-ly').then((d) => {
      dat_dong([{ ai: 'bot', chu: d.tra_loi }]);
      dat_goi_y(d.goi_y);
      if (d.hanh_dong !== undefined) dat_hanh_dong(d.hanh_dong);
    }).catch(() => { /* im lang — tro ly khong chay khong duoc chan viec khac */ });
  }, [mo, dong.length]);

  useEffect(() => {
    cuon.current?.scrollTo({ top: cuon.current.scrollHeight });
  }, [dong, hanh_dong]);

  const hoi = async (cau: string): Promise<void> => {
    const c = cau.trim();
    if (c === '' || dang_hoi) return;
    dat_dong((ds) => [...ds, { ai: 'toi', chu: c }]);
    dat_nhap('');
    dat_hanh_dong(null);
    dat_dang_hoi(true);
    try {
      const d = await goi<DapTroLy>(`/api/toi/tro-ly?hoi=${encodeURIComponent(c)}`);
      dat_dong((ds) => [...ds, { ai: 'bot', chu: d.tra_loi }]);
      dat_goi_y(d.goi_y);
      if (d.hanh_dong !== undefined) dat_hanh_dong(d.hanh_dong);
    } catch {
      dat_dong((ds) => [...ds, { ai: 'bot', chu: 'Xin lỗi, mình chưa trả lời được lúc này.' }]);
    } finally {
      dat_dang_hoi(false);
    }
  };

  /** Nhan vien TU bam xac nhan — day la buoc duy nhat thuc su gui don di. */
  const xac_nhan = async (): Promise<void> => {
    const hd = hanh_dong;
    if (hd === null || dang_gui) return;
    if (!duong_an_toan(hd)) {
      dat_dong((ds) => [...ds, { ai: 'bot', chu: 'Yêu cầu này không hợp lệ, mình không gửi được.' }]);
      dat_hanh_dong(null);
      return;
    }
    dat_dang_gui(true);
    try {
      await goi<unknown>(hd.duong_dan, { method: hd.phuong_thuc, body: hd.du_lieu });
      dat_hanh_dong(null);
      dat_dong((ds) => [...ds, { ai: 'bot', chu: `Đã gửi thành công: ${hd.tieu_de}. ` +
        'Bạn xem trạng thái ở tab "Đơn của tôi".' }]);
    } catch (loi) {
      const chu = loi instanceof LoiApi ? loi.message : 'Không kết nối được máy chủ.';
      dat_dong((ds) => [...ds, { ai: 'bot', chu: `Chưa gửi được: ${chu}` }]);
    } finally {
      dat_dang_gui(false);
    }
  };

  const bo_qua = (): void => {
    const hd = hanh_dong;
    dat_hanh_dong(null);
    if (hd !== null) {
      dat_dong((ds) => [...ds, { ai: 'bot', chu: 'Đã bỏ qua — không có gì được gửi đi.' }]);
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
        {hanh_dong !== null && !dang_hoi && (
          <div className="troly-hd" role="group" aria-label="Chờ xác nhận">
            <div className="troly-hd-b">{hanh_dong.tieu_de}</div>
            {hanh_dong.chi_tiet.map((d, i) => (
              <div key={khoa_tinh(d, i)} className="troly-hd-dong">{d}</div>
            ))}
            <div className="troly-hd-nut">
              <button className="troly-hd-xac-nhan" onClick={() => { void xac_nhan(); }}
                disabled={dang_gui} aria-label={hanh_dong.nhan}>
                {dang_gui ? 'Đang gửi…' : hanh_dong.nhan}
              </button>
              <button className="troly-hd-bo" onClick={bo_qua} disabled={dang_gui}
                aria-label={hanh_dong.bo}>
                {hanh_dong.bo}
              </button>
            </div>
          </div>
        )}
        {goi_y.length > 0 && !dang_hoi && hanh_dong === null && (
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
          placeholder="Hỏi về phép, công, nội quy…" aria-label="Câu hỏi" />
        <button type="submit" disabled={dang_hoi || nhap.trim() === ''}>Gửi</button>
      </form>
    </div>,
    document.body,
  );
}
