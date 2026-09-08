// Van ban cong ty: SOAN THAO + BAN HANH (khong chi la kho tep).
//
// HR soan noi dung ngay tren he thong (khong bat buoc dinh kem tep), co so hieu tu dong,
// nguoi ban hanh, loai van ban. Khi dang co the GUI: thong bao he thong (vao chuong bao +
// theo doi da doc) va/hoac email; PHAM VI ca nhan / phong ban / toan cong ty.
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
  noi_dung: string | null;
  nguoi_ban_hanh: string | null;
  danh_muc: string;
  ten_goc: string | null;
  kich_thuoc: number | null;
  tao_luc: string;
  co_tep: boolean;
}

interface PhongBan { id: string; ten: string }
interface NhanVienGon { id: string; ma_nv: string; ho_ten: string }

/** Loai / hinh thuc van ban. Thu tu tu "van ban hanh chinh" xuong "kho tai lieu". */
const NHAN_DANH_MUC: Record<string, string> = {
  thong_bao: 'Thông báo', quyet_dinh: 'Quyết định', cong_van: 'Công văn',
  noi_quy: 'Nội quy', bieu_mau: 'Biểu mẫu', chinh_sach: 'Chính sách',
  huong_dan: 'Hướng dẫn', khac: 'Khác',
};
const DANH_MUC_THU_TU = Object.keys(NHAN_DANH_MUC);

function co_MB(byte: number | null): string {
  if (byte === null || byte === 0) return '';
  const kb = byte / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

/** HR: soan va ban hanh van ban. */
function SoanVanBan({ khi_xong }: { khi_xong: () => void }): ReactNode {
  const [mo, dat_mo] = useState(false);
  const [tieu_de, dat_tieu_de] = useState('');
  const [danh_muc, dat_danh_muc] = useState('thong_bao');
  const [nguoi_ban_hanh, dat_nguoi_ban_hanh] = useState('');
  const [noi_dung, dat_noi_dung] = useState('');
  const [pham_vi, dat_pham_vi] = useState<'toan_cong_ty' | 'phong_ban' | 'ca_nhan'>('toan_cong_ty');
  const [phong_ban_id, dat_phong_ban_id] = useState('');
  const [nhan_vien_id, dat_nhan_vien_id] = useState('');
  const [gui_he_thong, dat_gui_he_thong] = useState(true);
  const [gui_email, dat_gui_email] = useState(false);
  const tep_ref = useRef<HTMLInputElement>(null);
  const hd = dung_hanh_dong();

  // Chi nap danh sach phong ban / nhan vien khi da mo trinh soan — khong ton mot luot goi
  // cho nguoi chi vao xem.
  const ds_pb = dung_nap<PhongBan[]>(mo ? '/api/phong-ban' : null);
  const ds_nv = dung_nap<NhanVienGon[]>(mo && pham_vi === 'ca_nhan' ? '/api/nhan-vien?chi_dang_lam=true' : null);

  const dat_lai = (): void => {
    dat_tieu_de(''); dat_noi_dung(''); dat_nguoi_ban_hanh(''); dat_danh_muc('thong_bao');
    dat_pham_vi('toan_cong_ty'); dat_phong_ban_id(''); dat_nhan_vien_id('');
    dat_gui_he_thong(true); dat_gui_email(false);
    if (tep_ref.current !== null) tep_ref.current.value = '';
  };

  const gui = async (): Promise<void> => {
    if (pham_vi === 'phong_ban' && phong_ban_id === '') return;
    if (pham_vi === 'ca_nhan' && nhan_vien_id === '') return;
    const tep = tep_ref.current?.files?.[0];
    const fd = new FormData();
    fd.append('tieu_de', tieu_de);
    fd.append('danh_muc', danh_muc);
    fd.append('nguoi_ban_hanh', nguoi_ban_hanh);
    fd.append('noi_dung', noi_dung);
    fd.append('pham_vi', pham_vi);
    if (pham_vi === 'phong_ban') fd.append('phong_ban_id', phong_ban_id);
    if (pham_vi === 'ca_nhan') fd.append('nhan_vien_id', nhan_vien_id);
    fd.append('gui_he_thong', gui_he_thong ? 'true' : 'false');
    fd.append('gui_email', gui_email ? 'true' : 'false');
    if (tep !== undefined) fd.append('tep', tep);

    const ok = await hd.chay(() => gui_tep('/api/van-ban', fd), 'Đã ban hành văn bản.');
    if (ok) { dat_lai(); dat_mo(false); khi_xong(); }
  };

  if (!mo) {
    return (
      <div className="tb-dang-thanh">
        <button onClick={() => dat_mo(true)}>+ Soạn văn bản</button>
      </div>
    );
  }

  const thieu_muc_tieu = (pham_vi === 'phong_ban' && phong_ban_id === '')
    || (pham_vi === 'ca_nhan' && nhan_vien_id === '');
  const thieu_noi_dung = noi_dung.trim() === '' && (tep_ref.current?.files?.length ?? 0) === 0;

  return (
    <div className="the tb-dang">
      <div className="canhan-muc-dau"><h2>Soạn &amp; ban hành văn bản</h2></div>
      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />

      <p className="mo-ta">Số hiệu được cấp tự động khi ban hành (VB-…).</p>

      <label className="truong"><span>Tiêu đề</span>
        <input value={tieu_de} onChange={(e) => dat_tieu_de(e.target.value)} /></label>

      <div className="tb-dang-hang">
        <label className="truong"><span>Loại / hình thức</span>
          <select value={danh_muc} onChange={(e) => dat_danh_muc(e.target.value)}>
            {DANH_MUC_THU_TU.map((m) => (
              <option key={m} value={m}>{NHAN_DANH_MUC[m]}</option>
            ))}
          </select>
        </label>
        <label className="truong"><span>Người ban hành</span>
          <input value={nguoi_ban_hanh} placeholder="vd Giám đốc, Phòng HCNS"
            onChange={(e) => dat_nguoi_ban_hanh(e.target.value)} /></label>
      </div>

      <label className="truong"><span>Nội dung văn bản</span>
        <textarea rows={8} value={noi_dung} placeholder="Soạn nội dung thông báo / văn bản tại đây…"
          onChange={(e) => dat_noi_dung(e.target.value)} /></label>

      <label className="truong"><span>Tệp đính kèm (tùy chọn — PDF, DOCX, XLSX, ảnh)</span>
        <input type="file" ref={tep_ref} accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx" /></label>

      <div className="tb-dang-hang">
        <label className="truong"><span>Phạm vi</span>
          <select value={pham_vi}
            onChange={(e) => dat_pham_vi(e.target.value as typeof pham_vi)}>
            <option value="toan_cong_ty">Toàn công ty</option>
            <option value="phong_ban">Phòng ban</option>
            <option value="ca_nhan">Cá nhân</option>
          </select>
        </label>
        {pham_vi === 'phong_ban' && (
          <label className="truong"><span>Chọn phòng ban</span>
            <select value={phong_ban_id} onChange={(e) => dat_phong_ban_id(e.target.value)}>
              <option value="">— Chọn —</option>
              {(ds_pb.du_lieu ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.ten}</option>
              ))}
            </select>
          </label>
        )}
        {pham_vi === 'ca_nhan' && (
          <label className="truong"><span>Chọn nhân viên</span>
            <select value={nhan_vien_id} onChange={(e) => dat_nhan_vien_id(e.target.value)}>
              <option value="">— Chọn —</option>
              {(ds_nv.du_lieu ?? []).map((n) => (
                <option key={n.id} value={n.id}>{n.ho_ten} ({n.ma_nv})</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="truong-hang">
        <input id="vb-gui-ht" type="checkbox" checked={gui_he_thong}
          onChange={(e) => dat_gui_he_thong(e.target.checked)} />
        <label htmlFor="vb-gui-ht">Gửi thông báo hệ thống (hiện ở chuông báo, theo dõi đã đọc)</label>
      </div>
      <div className="truong-hang">
        <input id="vb-gui-mail" type="checkbox" checked={gui_email}
          onChange={(e) => dat_gui_email(e.target.checked)} />
        <label htmlFor="vb-gui-mail">Gửi email (qua Microsoft 365 — bỏ qua nếu chưa cấu hình)</label>
      </div>

      <div className="hang-nut">
        <button
          onClick={() => { void gui(); }}
          disabled={hd.dang_chay || tieu_de.trim().length < 3 || thieu_muc_tieu || thieu_noi_dung}
        >
          {hd.dang_chay ? 'Đang ban hành…' : 'Ban hành'}
        </button>
        <button className="nut-phang" onClick={() => { dat_lai(); dat_mo(false); }}>Hủy</button>
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
  const nhom = DANH_MUC_THU_TU.filter((m) => ds.some((v) => v.danh_muc === m));

  const tai = (v: VanBan): void => {
    void hd.chay(() => tai_tep(`/api/toi/van-ban/${v.id}/tai`, v.ten_goc ?? v.tieu_de));
  };

  return (
    <div className="canhan">
      <div className="canhan-hero">
        <div className="canhan-hero-chao">Văn bản công ty</div>
        <div className="canhan-hero-phu">Thông báo, quyết định, nội quy, biểu mẫu — của công ty.</div>
      </div>
      <HopLoi loi={hd.loi} />
      {hr && <SoanVanBan khi_xong={nap_lai} />}

      {ds.length === 0
        ? <Trong tieu_de="Chưa có văn bản" mo_ta="Nhân sự sẽ đăng thông báo, nội quy, biểu mẫu tại đây." />
        : nhom.map((dm, i) => (
          <div className="the vb-nhom" key={khoa_tinh(dm, i)}>
            <div className="canhan-muc-dau"><h2>{NHAN_DANH_MUC[dm] ?? dm}</h2></div>
            <ul className="vb-danh-sach">
              {ds.filter((v) => v.danh_muc === dm).map((v, j) => (
                <li key={khoa_tinh(v.id, j)} className="vb-dong">
                  <div className="vb-thong-tin">
                    <div className="vb-tieu-de">{v.tieu_de}</div>
                    <div className="mo-ta">
                      <strong>{v.ma}</strong> · {ngay_viet(v.tao_luc)}
                      {v.nguoi_ban_hanh !== null ? ` · ${v.nguoi_ban_hanh}` : ''}
                      {co_MB(v.kich_thuoc) !== '' ? ` · ${co_MB(v.kich_thuoc)}` : ''}
                    </div>
                    {v.noi_dung !== null && v.noi_dung !== '' && (
                      <div className="vb-noi-dung">{v.noi_dung}</div>
                    )}
                    {(v.noi_dung === null || v.noi_dung === '') && v.mo_ta !== null && (
                      <div className="mo-ta">{v.mo_ta}</div>
                    )}
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
