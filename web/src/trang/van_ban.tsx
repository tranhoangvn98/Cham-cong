// Kho van ban cong ty (noi quy, bieu mau, chinh sach) — nhan vien xem va tai ve.
import { useRef, useState, type ReactNode } from 'react';
import {
  DangTai, HopLoi, HopTot, Trong, dung_hanh_dong, dung_nap, khoa_tinh, ngay_viet,
} from '../thanh_phan.tsx';
import { gui_tep, la_nhan_su, tai_tep } from '../api.ts';

interface VanBan {
  id: string;
  ma: string;
  tieu_de: string;
  mo_ta: string | null;
  danh_muc: string;
  ten_goc: string | null;
  kich_thuoc: number | null;
  tao_luc: string;
  co_tep: boolean;
}

const NHAN_DANH_MUC: Record<string, string> = {
  noi_quy: 'Nội quy', bieu_mau: 'Biểu mẫu', chinh_sach: 'Chính sách',
  huong_dan: 'Hướng dẫn', khac: 'Khác',
};

function co_MB(byte: number | null): string {
  if (byte === null || byte === 0) return '';
  const kb = byte / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

/** HR: tai van ban len. */
function TaiVanBan({ khi_xong }: { khi_xong: () => void }): ReactNode {
  const [mo, dat_mo] = useState(false);
  const [tieu_de, dat_tieu_de] = useState('');
  const [danh_muc, dat_danh_muc] = useState('noi_quy');
  const [mo_ta, dat_mo_ta] = useState('');
  const tep_ref = useRef<HTMLInputElement>(null);
  const hd = dung_hanh_dong();

  const gui = async (): Promise<void> => {
    const tep = tep_ref.current?.files?.[0];
    if (tep === undefined) { return; }
    const fd = new FormData();
    fd.append('tep', tep);
    fd.append('tieu_de', tieu_de);
    fd.append('danh_muc', danh_muc);
    fd.append('mo_ta', mo_ta);
    const ok = await hd.chay(() => gui_tep('/api/van-ban', fd), 'Đã tải văn bản lên.');
    if (ok) {
      dat_tieu_de(''); dat_mo_ta(''); dat_danh_muc('noi_quy');
      if (tep_ref.current !== null) tep_ref.current.value = '';
      dat_mo(false); khi_xong();
    }
  };

  if (!mo) {
    return (
      <div className="tb-dang-thanh">
        <button onClick={() => dat_mo(true)}>+ Tải văn bản lên</button>
      </div>
    );
  }
  return (
    <div className="the tb-dang">
      <div className="canhan-muc-dau"><h2>Tải văn bản lên</h2></div>
      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />
      <label className="truong"><span>Tiêu đề</span>
        <input value={tieu_de} onChange={(e) => dat_tieu_de(e.target.value)} /></label>
      <div className="tb-dang-hang">
        <label className="truong"><span>Danh mục</span>
          <select value={danh_muc} onChange={(e) => dat_danh_muc(e.target.value)}>
            <option value="noi_quy">Nội quy</option>
            <option value="bieu_mau">Biểu mẫu</option>
            <option value="chinh_sach">Chính sách</option>
            <option value="huong_dan">Hướng dẫn</option>
            <option value="khac">Khác</option>
          </select>
        </label>
        <label className="truong"><span>Tệp (PDF, DOCX, XLSX, ảnh)</span>
          <input type="file" ref={tep_ref} accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx" /></label>
      </div>
      <label className="truong"><span>Mô tả (tùy chọn)</span>
        <input value={mo_ta} onChange={(e) => dat_mo_ta(e.target.value)} /></label>
      <div className="hang-nut">
        <button onClick={() => { void gui(); }} disabled={hd.dang_chay || tieu_de.trim().length < 3}>
          {hd.dang_chay ? 'Đang tải…' : 'Tải lên'}
        </button>
        <button className="nut-phang" onClick={() => dat_mo(false)}>Hủy</button>
      </div>
    </div>
  );
}

export function TrangVanBan(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<VanBan[]>('/api/toi/van-ban');
  const hd = dung_hanh_dong();
  const hr = la_nhan_su();

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];
  const nhom = [...new Set(ds.map((v) => v.danh_muc))];

  const tai = (v: VanBan): void => {
    void hd.chay(() => tai_tep(`/api/toi/van-ban/${v.id}/tai`, v.ten_goc ?? v.tieu_de));
  };

  return (
    <div className="canhan">
      <div className="canhan-hero">
        <div className="canhan-hero-chao">Văn bản công ty 📚</div>
        <div className="canhan-hero-phu">Nội quy, biểu mẫu, chính sách — tải về khi cần.</div>
      </div>
      <HopLoi loi={hd.loi} />
      {hr && <TaiVanBan khi_xong={nap_lai} />}

      {ds.length === 0
        ? <Trong tieu_de="Chưa có văn bản" mo_ta="Nhân sự sẽ đăng nội quy, biểu mẫu tại đây." />
        : nhom.map((dm, i) => (
          <div className="the vb-nhom" key={khoa_tinh(dm, i)}>
            <div className="canhan-muc-dau"><h2>{NHAN_DANH_MUC[dm] ?? dm}</h2></div>
            <ul className="vb-danh-sach">
              {ds.filter((v) => v.danh_muc === dm).map((v, j) => (
                <li key={khoa_tinh(v.id, j)} className="vb-dong">
                  <div className="vb-thong-tin">
                    <div className="vb-tieu-de">{v.tieu_de}</div>
                    <div className="mo-ta">
                      {v.ma} · {ngay_viet(v.tao_luc)}{co_MB(v.kich_thuoc) !== '' ? ` · ${co_MB(v.kich_thuoc)}` : ''}
                      {v.mo_ta !== null ? ` · ${v.mo_ta}` : ''}
                    </div>
                  </div>
                  {v.co_tep && (
                    <button className="nut-nho" onClick={() => tai(v)} disabled={hd.dang_chay}>
                      <i className="bt bt-download" aria-hidden="true" /> Tải
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
