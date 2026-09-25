// Widget tro ly thoi viec (REQ-NV-03): vong tron noi goc phai-duoi o MOI trang khi nguoi
// dung co quy trinh dang thuc hien / san sang chot. Cham do + so = so muc bat buoc con chua;
// het muc bat buoc thi chuyen xanh. Bam vao mo bang toi thieu: trang thai checklist + goi y
// muc ke tiep + nut mo trang huong dan + tick nhanh muc don gian.
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { goi } from '../api.ts';
import { dung_tuyen } from '../dinh_tuyen.tsx';
import { ngay_viet } from '../thanh_phan.tsx';

interface MucW {
  id: string;
  ma_muc: string;
  tieu_de: string;
  bat_buoc: boolean;
  loai_tu_dong: string;
  trang_thai: string;
}

interface QtW {
  id: string;
  trang_thai: string;
  ngay_lam_viec_cuoi: string | null;
  muc: MucW[];
}

const MUC_TICK_NHANH = new Set(['doc_huong_dan', 'sao_luu_du_lieu', 'xac_nhan_lastday']);

export function TroLyThoiViec(): ReactNode {
  const { di_toi } = dung_tuyen();
  const [qt, dat_qt] = useState<QtW | null>(null);
  const [dang_nap, dat_dang_nap] = useState(true);
  const [mo, dat_mo] = useState(false);
  const [dang_tick, dat_dang_tick] = useState(false);

  const nap = (): void => {
    void goi<QtW | null>('/api/toi/thoi-viec')
      .then((d) => { dat_qt(d); dat_dang_nap(false); })
      .catch(() => { dat_qt(null); dat_dang_nap(false); });
  };

  useEffect(() => {
    nap();
    const bo_hen = setInterval(nap, 60_000);
    return () => clearInterval(bo_hen);
  }, []);

  if (dang_nap || qt === null
    || (qt.trang_thai !== 'dang_thuc_hien' && qt.trang_thai !== 'san_sang_chot')) {
    return null;
  }

  const muc_chua = qt.muc.filter((m) => m.bat_buoc
    && (m.trang_thai === 'chua' || m.trang_thai === 'dang'));
  const so_chua = muc_chua.length;
  const tiep = muc_chua.filter((m) => m.loai_tu_dong === 'nhan_vien')[0] ?? null;

  const tick_nhanh = async (): Promise<void> => {
    if (tiep === null || !MUC_TICK_NHANH.has(tiep.ma_muc)) return;
    dat_dang_tick(true);
    try {
      await goi(`/api/toi/thoi-viec/muc/${tiep.id}/tick`, {
        method: 'POST', body: { trang_thai: 'xong', ghi_chu: 'Xác nhận qua trợ lý thôi việc' },
      });
      nap();
    } finally {
      dat_dang_tick(false);
    }
  };

  return createPortal(
    <>
      <button
        type="button"
        className="troly-nut-tv"
        aria-label="Trợ lý thủ tục thôi việc"
        onClick={() => dat_mo(!mo)}
      >
        <i className="bt bt-logout" aria-hidden="true" />
        <span className={so_chua > 0 ? 'troly-nut-tv-dem do' : 'troly-nut-tv-dem xanh'}>
          {String(so_chua)}
        </span>
      </button>
      {mo && (
        <div className="troly-panel">
          <div className="troly-dau">
            <span><i className="bt bt-logout" aria-hidden="true" /> Thủ tục thôi việc</span>
            <button type="button" className="nut-phang" aria-label="Đóng"
              onClick={() => dat_mo(false)}><i className="bt bt-x" aria-hidden="true" /></button>
          </div>
          <div className="troly-than">
            <div className="troly-tn troly-tn-bot">
              {so_chua === 0
                ? 'Bạn đã xong mọi mục bắt buộc — chờ Admin duyệt cuối ở Cổng 2.'
                : `Còn ${String(so_chua)} mục bắt buộc chưa xong.`
                  + (tiep !== null ? `\nMục kế tiếp: ${tiep.tieu_de}.` : '')}
              {qt.ngay_lam_viec_cuoi !== null
                && `\nNgày làm việc cuối: ${ngay_viet(qt.ngay_lam_viec_cuoi)}`}
            </div>
            {qt.muc.filter((m) => m.bat_buoc && m.loai_tu_dong === 'nhan_vien'
              && m.trang_thai !== 'xong' && m.trang_thai !== 'bo_qua')
              .slice(0, 5).map((m) => (
                <div key={m.id} className="tv-widget-muc">
                  <i className={m.trang_thai === 'dang' ? 'bt bt-clock' : 'bt bt-circle-x'}
                    aria-hidden="true" />
                  <span>{m.tieu_de}</span>
                </div>
              ))}
            <div className="tv-widget-hang">
              {tiep !== null && MUC_TICK_NHANH.has(tiep.ma_muc) && (
                <button type="button" className="troly-hd-xac-nhan" disabled={dang_tick}
                  onClick={() => void tick_nhanh()}>
                  Xác nhận: {tiep.tieu_de}
                </button>
              )}
              <button type="button" className="troly-chip-mo"
                onClick={() => { dat_mo(false); di_toi('/thoi-viec/huong-dan'); }}>
                Mở hướng dẫn thủ tục
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
