// Van ban cong ty — dau moi duy nhat cho:
//   tab "Thong bao"        — thong bao BGD/HR (loc nhanh toan cong ty), doc + giai trinh.
//   tab "Van ban ban hanh" — van ban co so hieu da phat hanh; nhan su soan AI o day.
//   tab "Tai lieu cong ty" — kho tep noi quy, bieu mau, chinh sach.
//
// Mot duong dan con cho moi tab (bookmark / nut Lui chay duoc): /van-ban, /van-ban/ban-hanh,
// /van-ban/tai-lieu. Khong con trang "Van ban AI" hay "Thong bao" dung rieng.
import { useRef, useState, type ReactNode } from 'react';
import {
  DangTai, HopLoi, HopTot, Trong, dung_hanh_dong, dung_nap, khoa_tinh, ngay_gio,
  ngay_viet,
} from '../thanh_phan.tsx';
import { LienKet } from '../dinh_tuyen.tsx';
import { gui_tep, la_nhan_su, tai_tep } from '../api.ts';
import { TabThongBao } from './thong_bao_ca_nhan.tsx';
import { TabVanBanBanHanh } from './thong_bao_ai.tsx';

export type TabVanBan = 'thong_bao' | 'ban_hanh' | 'tai_lieu';

const CAC_TAB: { ma: TabVanBan; ten: string; den: string }[] = [
  { ma: 'thong_bao', ten: 'Thông báo', den: '/van-ban' },
  { ma: 'ban_hanh', ten: 'Văn bản ban hành', den: '/van-ban/ban-hanh' },
  { ma: 'tai_lieu', ten: 'Tài liệu công ty', den: '/van-ban/tai-lieu' },
];

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

interface VanBanBanHanh {
  id: string;
  ma: string;
  tieu_de: string;
  muc_do: string;
  tao_luc: string;
  so_ky_hieu: string | null;
  loai: 'thong_bao' | 'quyet_dinh' | 'cong_van';
  co_tep: boolean;
}

const NHAN_DANH_MUC: Record<string, string> = {
  noi_quy: 'Nội quy', bieu_mau: 'Biểu mẫu', chinh_sach: 'Chính sách',
  huong_dan: 'Hướng dẫn', khac: 'Khác',
};

const NHAN_LOAI: Record<string, string> = {
  thong_bao: 'Thông báo', quyet_dinh: 'Quyết định', cong_van: 'Công văn',
};

function co_MB(byte: number | null): string {
  if (byte === null || byte === 0) return '';
  const kb = byte / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

// ==================================================================== tab tai lieu cong ty

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

/** Kho tep noi quy / bieu mau / chinh sach — noi dung cu cua trang Van ban cong ty. */
function TabTaiLieu(): ReactNode {
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
    <div>
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

// ==================================================================== tab van ban ban hanh

/** Nhan vien thuong: danh sach van ban DA PHAT HANH co so ky hieu trong pham vi cua minh. */
function DsVanBanBanHanh(): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<VanBanBanHanh[]>('/api/toi/van-ban-ban-hanh');
  const hd = dung_hanh_dong();

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];

  if (ds.length === 0) {
    return <Trong tieu_de="Chưa có văn bản ban hành"
      mo_ta="Văn bản có số ký hiệu phát hành cho bạn sẽ hiện ở đây." />;
  }
  return (
    <div>
      <HopLoi loi={hd.loi} />
      <table className="bang-gon">
        <thead>
          <tr>
            <th>Số ký hiệu</th><th>Loại</th><th>Trích yếu</th><th>Phát hành</th><th></th>
          </tr>
        </thead>
        <tbody>
          {ds.map((v, i) => (
            <tr key={khoa_tinh(v.id, i)}>
              <td><b>{v.so_ky_hieu ?? '—'}</b></td>
              <td>{NHAN_LOAI[v.loai] ?? v.loai}</td>
              <td>{v.tieu_de}</td>
              <td>{ngay_gio(v.tao_luc)}</td>
              <td>
                {v.co_tep && (
                  <button className="nut-nho nut-phang"
                    onClick={() => {
                      void hd.chay(() => tai_tep(
                        `/api/toi/thong-bao/${v.id}/tai`,
                        `${v.so_ky_hieu?.replaceAll('/', '-') ?? v.ma}.docx`,
                      ));
                    }}
                    disabled={hd.dang_chay}>
                    Tải DOCX
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================================================================== trang tong hop

/**
 * Trang "Van ban cong ty" — 3 tab. Nhan su thay them bang soan AI trong tab "Van ban ban
 * hanh"; nhan vien thuong chi thay danh sach van ban da phat hanh.
 */
export function TrangVanBan({ tab = 'thong_bao' }: { tab?: TabVanBan }): ReactNode {
  const hr = la_nhan_su();
  const tab_dung: TabVanBan = CAC_TAB.some((t) => t.ma === tab) ? tab : 'thong_bao';

  let noi_dung: ReactNode;
  if (tab_dung === 'thong_bao') {
    noi_dung = <TabThongBao />;
  } else if (tab_dung === 'ban_hanh') {
    noi_dung = hr ? <TabVanBanBanHanh /> : <DsVanBanBanHanh />;
  } else {
    noi_dung = <TabTaiLieu />;
  }

  return (
    <div className="canhan">
      <div className="canhan-hero">
        <div className="canhan-hero-chao">Văn bản công ty</div>
        <div className="canhan-hero-phu">
          Thông báo, văn bản ban hành có số hiệu và tài liệu công ty — một nơi duy nhất.
        </div>
      </div>
      <div className="hang-tab" role="tablist" aria-label="Các mục văn bản công ty">
        {CAC_TAB.map((t) => (
          <LienKet key={t.ma} den={t.den}
            lop={tab_dung === t.ma ? 'dang-chon' : ''}>
            {t.ten}
          </LienKet>
        ))}
      </div>
      {noi_dung}
    </div>
  );
}
