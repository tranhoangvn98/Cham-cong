// Van ban cong ty — dau moi duy nhat cho:
//   tab "Thong bao"        — thong bao BGD/HR (loc nhanh toan cong ty), doc + giai trinh.
//   tab "Van ban ban hanh" — van ban co so hieu da phat hanh; nhan su soan AI o day.
//   tab "Tai lieu cong ty" — kho tep noi quy, bieu mau, chinh sach + HR soan & ban hanh
//                           văn bản thủ công (không cần AI, có số hiệu VB- tự cấp).
//
// Mot duong dan con cho moi tab (bookmark / nut Lui chay duoc): /van-ban, /van-ban/ban-hanh,
// /van-ban/tai-lieu. Khong con trang "Van ban AI" hay "Thong bao" dung rieng.
import { useState, type ReactNode } from 'react';
import {
  DangTai, HopLoi, HopTot, OKeoTep, Trong, dung_hanh_dong, dung_nap, khoa_tinh, ngay_gio,
  ngay_viet,
} from '../thanh_phan.tsx';
import { LienKet } from '../dinh_tuyen.tsx';
import { gui_tep, la_nhan_su, tai_tep } from '../api.ts';
import { dung_phan_trang } from '../phan_trang.tsx';
import { Chon } from '../chon.tsx';
import { TrangThongBaoCaNhan } from './thong_bao_ca_nhan.tsx';
import { TabVanBanBanHanh } from './thong_bao_ai.tsx';
import { dung_chuoi, tra_hien_tai, type ChuoiKhoa } from '../chuoi/chi_muc.tsx';

export type TabVanBan = 'thong_bao' | 'ban_hanh' | 'tai_lieu';

const CAC_TAB: { ma: TabVanBan; khoa: ChuoiKhoa; den: string }[] = [
  { ma: 'thong_bao', khoa: 'menu_thong_bao', den: '/van-ban' },
  { ma: 'ban_hanh', khoa: 'vb_van_ban_ban_hanh', den: '/van-ban/ban-hanh' },
  { ma: 'tai_lieu', khoa: 'dcn_tai_lieu_cty', den: '/van-ban/tai-lieu' },
];

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

interface PhongBan { id: string; ten: string }
interface NhanVienGon { id: string; ma_nv: string; ho_ten: string }

/** Loai / hinh thuc van ban. Thu tu tu "van ban hanh chinh" xuong "kho tai lieu". */
const KHOA_DANH_MUC: Record<string, ChuoiKhoa> = {
  thong_bao: 'menu_thong_bao', quyet_dinh: 'vb_dm_quyet_dinh', cong_van: 'vb_dm_cong_van',
  noi_quy: 'vb_dm_noi_quy', bieu_mau: 'vb_dm_bieu_mau', chinh_sach: 'vb_dm_chinh_sach',
  huong_dan: 'vb_dm_huong_dan', khac: 'vb_dm_khac',
};
const DANH_MUC_THU_TU = Object.keys(KHOA_DANH_MUC);

const KHOA_LOAI: Record<string, ChuoiKhoa> = {
  thong_bao: 'menu_thong_bao', quyet_dinh: 'vb_dm_quyet_dinh', cong_van: 'vb_dm_cong_van',
};

/** Dich theo khoa chuoi; khoa khong co trong tu dien thi dung chuoi thay the. */
const tra_khoa = (k: ChuoiKhoa | undefined, thay: string): string =>
  k !== undefined ? tra_hien_tai(k) : thay;

function co_MB(byte: number | null): string {
  if (byte === null || byte === 0) return '';
  const kb = byte / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

// ==================================================================== tab tai lieu cong ty

/** HR: soan va ban hanh van ban thu cong (khong can AI, so hieu VB- tu cap). */
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
  const [tep, dat_tep] = useState<File | null>(null);
  const hd = dung_hanh_dong();
  const { tra } = dung_chuoi();

  // Chi nap danh sach phong ban / nhan vien khi da mo trinh soan — khong ton mot luot goi
  // cho nguoi chi vao xem.
  const ds_pb = dung_nap<PhongBan[]>(mo ? '/api/phong-ban' : null);
  const ds_nv = dung_nap<NhanVienGon[]>(mo && pham_vi === 'ca_nhan' ? '/api/nhan-vien?chi_dang_lam=true' : null);

  const dat_lai = (): void => {
    dat_tieu_de(''); dat_noi_dung(''); dat_nguoi_ban_hanh(''); dat_danh_muc('thong_bao');
    dat_pham_vi('toan_cong_ty'); dat_phong_ban_id(''); dat_nhan_vien_id('');
    dat_gui_he_thong(true); dat_gui_email(false);
    dat_tep(null);
  };

  const gui = async (): Promise<void> => {
    if (pham_vi === 'phong_ban' && phong_ban_id === '') return;
    if (pham_vi === 'ca_nhan' && nhan_vien_id === '') return;
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
    if (tep !== null) fd.append('tep', tep);

    const ok = await hd.chay(() => gui_tep('/api/van-ban', fd), tra('vb_da_ban_hanh'));
    if (ok) { dat_lai(); dat_mo(false); khi_xong(); }
  };

  if (!mo) {
    return (
      <div className="tb-dang-thanh">
        <button onClick={() => dat_mo(true)}>{tra('vb_soan_van_ban')}</button>
      </div>
    );
  }

  const thieu_muc_tieu = (pham_vi === 'phong_ban' && phong_ban_id === '')
    || (pham_vi === 'ca_nhan' && nhan_vien_id === '');
  const thieu_noi_dung = noi_dung.trim() === '' && tep === null;

  return (
    <div className="the tb-dang">
      <div className="canhan-muc-dau"><h2>{tra('vb_soan_va_ban_hanh')}</h2></div>
      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />

      <p className="mo-ta">{tra('vb_so_hieu_tu_cap')}</p>

      <label className="truong"><span>{tra('tb_tieu_de')}</span>
        <input value={tieu_de} onChange={(e) => dat_tieu_de(e.target.value)} /></label>

      <div className="tb-dang-hang">
        <label className="truong"><span>{tra('vb_loai_hinh_thuc')}</span>
          <Chon gia_tri={danh_muc} dat_gia_tri={dat_danh_muc}
            cac_tuy_chon={DANH_MUC_THU_TU.map((m) => ({
              ma: m, nhan: KHOA_DANH_MUC[m] !== undefined ? tra_hien_tai(KHOA_DANH_MUC[m]) : m,
            }))}
            nhan={tra('vb_loai_hinh_thuc_phu')} />
        </label>
        <label className="truong"><span>{tra('vb_nguoi_ban_hanh')}</span>
          <input value={nguoi_ban_hanh} placeholder={tra('vb_nguoi_ban_hanh_phu')}
            onChange={(e) => dat_nguoi_ban_hanh(e.target.value)} /></label>
      </div>

      <label className="truong"><span>{tra('vb_noi_dung_van_ban')}</span>
        <textarea rows={8} value={noi_dung} placeholder={tra('vb_noi_dung_phu')}
          onChange={(e) => dat_noi_dung(e.target.value)} /></label>

      <div className="truong"><span>{tra('vb_tep_kem')}</span>
        <OKeoTep
          ma="vb-tep-kem"
          accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
          khi_nhan={(ds) => dat_tep(ds?.[0] ?? null)}
        />
      </div>

      <div className="tb-dang-hang">
        <label className="truong"><span>{tra('vb_pham_vi')}</span>
          <Chon gia_tri={pham_vi}
            dat_gia_tri={(ma) => dat_pham_vi(ma as typeof pham_vi)}
            cac_tuy_chon={[
              { ma: 'toan_cong_ty', nhan: tra('vb_toan_cong_ty') },
              { ma: 'phong_ban', nhan: tra('vb_phong_ban') },
              { ma: 'ca_nhan', nhan: tra('vb_ca_nhan') },
            ]}
            nhan={tra('vb_pham_vi_nhan')} />
        </label>
        {pham_vi === 'phong_ban' && (
          <label className="truong"><span>{tra('vb_chon_phong_ban')}</span>
            <Chon gia_tri={phong_ban_id} dat_gia_tri={dat_phong_ban_id}
              cac_tuy_chon={(ds_pb.du_lieu ?? []).map((p) => ({ ma: p.id, nhan: p.ten }))}
              rong={tra('vb_chon')} nhan={tra('vb_phong_ban_nhan')} />
          </label>
        )}
        {pham_vi === 'ca_nhan' && (
          <label className="truong"><span>{tra('vb_chon_nhan_vien')}</span>
            <Chon gia_tri={nhan_vien_id} dat_gia_tri={dat_nhan_vien_id}
              cac_tuy_chon={(ds_nv.du_lieu ?? []).map((n) => ({
                ma: n.id, nhan: `${n.ho_ten} (${n.ma_nv})`,
              }))}
              rong={tra('vb_chon')} nhan={tra('vb_nhan_vien_nhan')} />
          </label>
        )}
      </div>

      <div className="truong-hang">
        <input id="vb-gui-ht" type="checkbox" checked={gui_he_thong}
          onChange={(e) => dat_gui_he_thong(e.target.checked)} />
        <label htmlFor="vb-gui-ht">{tra('vb_gui_he_thong')}</label>
      </div>
      <div className="truong-hang">
        <input id="vb-gui-mail" type="checkbox" checked={gui_email}
          onChange={(e) => dat_gui_email(e.target.checked)} />
        <label htmlFor="vb-gui-mail">{tra('vb_gui_email')}</label>
      </div>

      <div className="hang-nut">
        <button
          onClick={() => { void gui(); }}
          disabled={hd.dang_chay || tieu_de.trim().length < 3 || thieu_muc_tieu || thieu_noi_dung}
        >
          {hd.dang_chay ? tra('vb_dang_ban_hanh') : tra('vb_ban_hanh')}
        </button>
        <button className="nut-phang" onClick={() => { dat_lai(); dat_mo(false); }}>{tra('cn_huy')}</button>
      </div>
    </div>
  );
}

/** Kho tep noi quy / bieu mau / chinh sach — noi dung cu cua trang Van ban cong ty. */
function TabTaiLieu({ chi_doc = false }: { chi_doc?: boolean }): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<VanBan[]>('/api/toi/van-ban');
  const hd = dung_hanh_dong();
  const hr = la_nhan_su();
  const { tra } = dung_chuoi();

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];
  const nhom = DANH_MUC_THU_TU.filter((m) => ds.some((v) => v.danh_muc === m));

  const tai = (v: VanBan): void => {
    void hd.chay(() => tai_tep(`/api/toi/van-ban/${v.id}/tai`, v.ten_goc ?? v.tieu_de));
  };

  return (
    <div>
      <HopLoi loi={hd.loi} />
      {hr && !chi_doc && <SoanVanBan khi_xong={nap_lai} />}
      {ds.length === 0
        ? <Trong tieu_de={tra('vb_chua_co_van_ban')} mo_ta={tra('vb_nhan_su_se_dang')} />
        : nhom.map((dm, i) => (
          <div className="the vb-nhom" key={khoa_tinh(dm, i)}>
            <div className="canhan-muc-dau"><h2>{tra_khoa(KHOA_DANH_MUC[dm], dm)}</h2></div>
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
                      <i className="bt bt-download" aria-hidden="true" /> {tra('vb_tai')}
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
  const { tra } = dung_chuoi();
  const ds = du_lieu ?? [];
  // Hook phan trang phai chay moi lan render: dat truoc cac return som.
  const { ds_xem, bo_phan_trang } = dung_phan_trang(ds);

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;

  if (ds.length === 0) {
    return <Trong tieu_de={tra('vb_chua_co_vb_ban_hanh')}
      mo_ta={tra('vb_van_ban_cho_ban')} />;
  }
  return (
    <div>
      <HopLoi loi={hd.loi} />
      <table className="bang-gon">
        <thead>
          <tr>
            <th>{tra('vb_so_ky_hieu')}</th><th>{tra('vb_loai')}</th><th>{tra('vb_trich_yeu')}</th><th>{tra('vb_phat_hanh')}</th><th></th>
          </tr>
        </thead>
        <tbody>
          {ds_xem.map((v, i) => (
            <tr key={khoa_tinh(v.id, i)}>
              <td><b>{v.so_ky_hieu ?? '—'}</b></td>
              <td>{tra_khoa(KHOA_LOAI[v.loai], v.loai)}</td>
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
                    {tra('vb_tai_docx')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {bo_phan_trang}
    </div>
  );
}

// ==================================================================== trang tong hop

/**
 * Trang "Van ban cong ty" — 3 tab. Nhan su thay them bang soan AI trong tab "Van ban ban
 * hanh"; nhan vien thuong chi thay danh sach van ban da phat hanh.
 *
 * `chi_doc`: trang ca nhan luon chi doc — khong co soan AI, khong soan/ban hanh tai lieu
 * (viec do nam o goc nhin Quan tri).
 */
export function TrangVanBan({ tab = 'thong_bao', chi_doc = false }:
  { tab?: TabVanBan; chi_doc?: boolean }): ReactNode {
  const hr = la_nhan_su();
  const { tra } = dung_chuoi();
  const tab_dung: TabVanBan = CAC_TAB.some((t) => t.ma === tab) ? tab : 'thong_bao';

  let noi_dung: ReactNode;
  if (tab_dung === 'thong_bao') {
    noi_dung = <TrangThongBaoCaNhan />;
  } else if (tab_dung === 'ban_hanh') {
    noi_dung = hr && !chi_doc ? <TabVanBanBanHanh /> : <DsVanBanBanHanh />;
  } else {
    noi_dung = <TabTaiLieu chi_doc={chi_doc} />;
  }

  return (
    <div className="canhan">
      <div className="canhan-hero">
        <div className="canhan-hero-chao">{tra('menu_van_ban')}</div>
        <div className="canhan-hero-phu">
          {tra('vb_van_ban_cong_ty_phu')}
        </div>
      </div>
      <div className="hang-tab" role="tablist" aria-label={tra('vb_cac_muc_vb')}>
        {CAC_TAB.map((t) => (
          <LienKet key={t.ma} den={t.den}
            lop={tab_dung === t.ma ? 'dang-chon' : ''}>
            {tra(t.khoa)}
          </LienKet>
        ))}
      </div>
      {noi_dung}
    </div>
  );
}
