// HOM THU Y KIEN CUA TOI (tab trong Khu vuc cua toi) — nhan vien gui gop y / phan anh /
// yeu cau / thac mac, theo doi phan hoi va trao doi den khi hoan tat. Y kien da gui cho
// du thao van ban cung nam o day (kem link mo lai ban du thao neu con dang lay y kien).
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import { LienKet } from '../dinh_tuyen.tsx';
import {
  AnhCoToken, DangTai, HopLoi, HopTot, ThreadKhieuNai, Trong, dung_hanh_dong, dung_nap,
  ngay_gio,
  type TinNhanKN,
} from '../thanh_phan.tsx';
import { Chon, type TuyChonChon } from '../chon.tsx';
import { dung_chuoi, tra_hien_tai, type ChuoiKhoa } from '../chuoi/chi_muc.tsx';

const KHOA_LOAI: Record<string, ChuoiKhoa> = {
  du_thao: 'yk_y_kien_du_thao',
  gop_y: 'yk_gop_y',
  phan_anh: 'yk_phan_anh',
  yeu_cau: 'yk_yeu_cau',
  thac_mac: 'yk_thac_mac',
};

const KHOA_TT: Record<string, ChuoiKhoa> = {
  moi: 'yk_cho_xu_ly', dang_xem: 'yk_da_tiep_nhan', da_dong: 'yk_da_hoan_tat',
};

/** Dich theo khoa chuoi; khoa khong co trong tu dien thi dung chuoi thay the. */
const tra_khoa = (k: ChuoiKhoa | undefined, thay: string): string =>
  k !== undefined ? tra_hien_tai(k) : thay;

interface HoThuToi {
  id: string;
  ma: string | null;
  loai: string;
  nhap_ai_id: string | null;
  tieu_de: string;
  noi_dung: string;
  trang_thai: string;
  tao_luc: string;
  dong_luc: string | null;
  tra_loi: TinNhanKN[];
  anh: { id: string; ten: string }[];
}

const CAC_LOAI_GUI: { ma: string; khoa: ChuoiKhoa }[] = [
  { ma: 'gop_y', khoa: 'yk_gop_y' },
  { ma: 'phan_anh', khoa: 'yk_phan_anh' },
  { ma: 'yeu_cau', khoa: 'yk_yeu_cau' },
  { ma: 'thac_mac', khoa: 'yk_thac_mac' },
];

interface DuThaoGon {
  id: string;
  ma: string;
  loai: string;
  trich_yeu: string;
  han_lay_y_kien: string | null;
}

const KHOA_LOAI_VB: Record<string, ChuoiKhoa> = {
  thong_bao: 'vai_loai_thong_bao',
  quyet_dinh: 'vai_loai_quyet_dinh',
  cong_van: 'vai_loai_cong_van',
};

export function YKienToi(): ReactNode {
  const ds = dung_nap<HoThuToi[]>('/api/toi/ho-thu-y-kien');
  const ds_du_thao = dung_nap<DuThaoGon[]>('/api/toi/du-thao-dang-lay-y-kien');
  const hd = dung_hanh_dong();
  const { tra } = dung_chuoi();
  const [loai, dat_loai] = useState('gop_y');
  const [tieu_de, dat_tieu_de] = useState('');
  const [noi_dung, dat_noi_dung] = useState('');
  const [mo, dat_mo] = useState<string | null>(null);
  const [tab, dat_tab] = useState<'tat_ca' | 'chinh_sach'>('tat_ca');

  const gui = (): void => {
    void hd.chay(
      () => goi('/api/toi/ho-thu-y-kien',
        { method: 'POST', body: { loai, tieu_de, noi_dung } }),
      tra('yk_da_gui_ok'),
    ).then((ok) => {
      if (ok) { dat_tieu_de(''); dat_noi_dung(''); ds.nap_lai(); }
    });
  };

  if (ds.dang_tai && ds.du_lieu === null) return <DangTai />;

  return (
    <>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <HopTot chu={hd.tot} />

      <div className="hang-tab">
        <button className={tab === 'tat_ca' ? 'dang-chon' : ''} onClick={() => dat_tab('tat_ca')}>
          {tra('cn_tat_ca')}
        </button>
        <button className={tab === 'chinh_sach' ? 'dang-chon' : ''}
          onClick={() => dat_tab('chinh_sach')}>
          {tra('yk_dong_gop_chinh_sach')}
        </button>
      </div>

      {tab === 'chinh_sach' && (
      <div className="the" style={{ marginTop: 12 }}>
        <div className="canhan-muc-dau"><h3>{tra('ht_gop_y_du_thao')}</h3></div>
        <p className="mo-ta">{tra('yk_cong_gop_y_mo_ta')}</p>
        {ds_du_thao.dang_tai ? <DangTai /> : ds_du_thao.loi !== null
          ? <HopLoi loi={ds_du_thao.loi} />
          : ds_du_thao.du_lieu === null || ds_du_thao.du_lieu.length === 0 ? (
            <p className="mo-ta">{tra('ht_khong_co_du_thao')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ds_du_thao.du_lieu.map((d) => {
                const khoa_loai = KHOA_LOAI_VB[d.loai];
                return (
                  <div key={d.id} className="hang-nut" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                    <span className="mo-ta khong-ngat" style={{ minWidth: 96 }}>{d.ma}</span>
                    <span className="khong-ngat" style={{ flex: 1, minWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {khoa_loai !== undefined ? tra_hien_tai(khoa_loai) : d.loai}
                      {d.trich_yeu !== '' ? ` — ${d.trich_yeu}` : ''}
                    </span>
                    <span className="mo-ta khong-ngat">
                      {d.han_lay_y_kien !== null
                        ? tra('ht_han_x', { n: ngay_gio(d.han_lay_y_kien) }) : ''}
                    </span>
                    <LienKet den={`/gop-y-du-thao?van_ban_id=${d.id}`} lop="nut nut-nho">
                      {tra('ht_gop_y_ngay')}
                    </LienKet>
                  </div>
                );
              })}
            </div>
          )}
      </div>
      )}

      {tab === 'tat_ca' && (
      <>
      <div className="the" style={{ marginTop: 12 }}>
        <div className="canhan-muc-dau"><h3>{tra('yk_gui_y_kien_moi')}</h3></div>
        <div className="bo-loc">
          <div className="o-nhap">
            <label htmlFor="loai">{tra('yk_loai_y_kien')}</label>
            <Chon gia_tri={loai} dat_gia_tri={dat_loai}
              cac_tuy_chon={CAC_LOAI_GUI.map((c): TuyChonChon => ({
                ma: c.ma, nhan: tra_hien_tai(c.khoa),
              }))}
              nhan={tra('yk_chon_loai')} />
          </div>
          <div className="o-nhap" style={{ flex: 1 }}>
            <label htmlFor="tieu_de">{tra('tb_tieu_de')}</label>
            <input id="tieu_de" value={tieu_de} onChange={(e) => dat_tieu_de(e.target.value)}
              placeholder={tra('yk_vi_du_tieu_de')} />
          </div>
        </div>
        <label htmlFor="noi_dung">{tra('tb_noi_dung')}</label>
        <textarea id="noi_dung" rows={4} value={noi_dung}
          onChange={(e) => dat_noi_dung(e.target.value)}
          placeholder={tra('yk_trinh_bay_ro')} />
        <div className="hang-nut" style={{ marginTop: 8 }}>
          <button disabled={hd.dang_chay || noi_dung.trim().length < 1 || tieu_de.trim().length < 3}
            onClick={gui}>
            {hd.dang_chay ? tra('cn_dang_gui') : tra('yk_gui_y_kien')}
          </button>
        </div>
      </div>

      {ds.du_lieu === null ? null : ds.du_lieu.length === 0 ? (
        <Trong tieu_de={tra('yk_chua_gui_y_kien')}
          mo_ta={tra('yk_moi_gop_y')} />
      ) : (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ds.du_lieu.map((h) => (
            <div className="the" key={h.id}>
              <div className="canhan-muc-dau">
                <h4>
                  {h.tieu_de}
                  <span className="mo-ta"> · {tra_khoa(KHOA_LOAI[h.loai], h.loai)}</span>
                </h4>
                <span className={`nhan ${h.trang_thai === 'da_dong' ? 'nhan-tot'
                  : h.trang_thai === 'dang_xem' ? 'nhan-canh-bao' : 'nhan-xau'}`}>
                  {tra_khoa(KHOA_TT[h.trang_thai], h.trang_thai)}
                </span>
              </div>
              <p className="mo-ta">
                {h.ma ?? ''} · {ngay_gio(h.tao_luc)}
                {h.nhap_ai_id !== null && (
                  <> · <a href={`/gop-y-du-thao?van_ban_id=${h.nhap_ai_id}`}>{tra('yk_mo_lai_du_thao')}</a></>
                )}
              </p>
              {mo === h.id ? (
                <>
                  <ThreadKhieuNai noi_dung={h.noi_dung} tao_luc={h.tao_luc} tra_loi={h.tra_loi} />
                  {h.anh.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      {h.anh.map((a) => (
                        <AnhCoToken key={a.id} duong_dan={`/api/ho-thu-y-kien/anh/${a.id}`}
                          alt={a.ten} cao={120} />
                      ))}
                    </div>
                  )}
                  {h.trang_thai !== 'da_dong' && (
                    <TraLoi nho={h.id} khi_xong={ds.nap_lai} />
                  )}
                  <button className="nut-phang nut-nho" onClick={() => dat_mo(null)}>{tra('yk_thu_gon')}</button>
                </>
              ) : (
                <button className="nut-phang nut-nho" onClick={() => dat_mo(h.id)}>
                  {tra('yk_xem_trao_doi', { n: h.tra_loi.length })}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </>
  );
}

function TraLoi({ nho, khi_xong }: { nho: string; khi_xong: () => void }): ReactNode {
  const hd = dung_hanh_dong();
  const { tra } = dung_chuoi();
  const [noi_dung, dat_noi_dung] = useState('');

  const gui = (): void => {
    void hd.chay(
      () => goi(`/api/toi/ho-thu-y-kien/${nho}/tra-loi`,
        { method: 'POST', body: { noi_dung } }),
      tra('pl_da_gui_tra_loi'),
    ).then((ok) => { if (ok) { dat_noi_dung(''); khi_xong(); } });
  };

  return (
    <div style={{ marginTop: 6 }}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <textarea value={noi_dung} onChange={(e) => dat_noi_dung(e.target.value)} rows={2}
        placeholder={tra('yk_trao_doi_them')} />
      <div className="hang-nut" style={{ marginTop: 6 }}>
        <button className="nut-phang" disabled={hd.dang_chay || noi_dung.trim().length < 1}
          onClick={gui}>{tra('pl_gui_tra_loi')}</button>
      </div>
    </div>
  );
}
