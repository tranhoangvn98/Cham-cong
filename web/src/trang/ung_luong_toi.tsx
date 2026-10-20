// Ung luong CUA TOI — man trong giao dien ca nhan (Khu vuc cua toi).
//
// Nhan vien tu xem lich su tam ung cua minh, gui de nghi ung (trang thai cho_duyet) va huy
// de nghi khi con cho duyet. Duyet / danh dau da chi do nhan su lam tren trang quan tri
// /ung-luong — day chi la phia ca nhan cua cung bo du lieu.
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  ChonThang, HopLoi, HopThoai, Trong, XuongDanhSach,
  dung_hanh_dong, dung_nap, dung_xac_nhan, thang_nay,
} from '../thanh_phan.tsx';
import { Chon } from '../chon.tsx';
import { dung_chuoi, type ChuoiKhoa } from '../chuoi/chi_muc.tsx';

interface UngToi {
  id: string;
  thang: string;
  so_tien: number;
  ngay_ung: string | null;
  hinh_thuc: 'tien_mat' | 'chuyen_khoan';
  trang_thai: 'cho_duyet' | 'da_duyet' | 'da_chi' | 'huy';
  ly_do: string | null;
  ghi_chu: string | null;
  tao_luc: string;
  duyet_luc: string | null;
  chi_luc: string | null;
  nguoi_duyet: string | null;
}

const NHAN_TT: Record<UngToi['trang_thai'], ChuoiKhoa> = {
  cho_duyet: 'ul_tt_cho_duyet',
  da_duyet: 'ul_tt_da_duyet',
  da_chi: 'ul_tt_da_chi',
  huy: 'ul_tt_huy',
};

const MAU_TT: Record<UngToi['trang_thai'], string> = {
  cho_duyet: 'nhan-canh-bao',
  da_duyet: 'nhan-mo',
  da_chi: 'nhan-tot',
  huy: 'nhan-xau',
};

/** Dinh dang tien Viet: cham phan nhom nghin, khong hien so le. */
function tien(v: unknown): string {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
}

/** Them dau '/' trong luc go: '19092026' -> '19/09/2026'. */
function them_gach_ngay(chuoi: string): string {
  const so = chuoi.replace(/\D/g, '').slice(0, 8);
  if (so.length <= 2) return so;
  if (so.length <= 4) return `${so.slice(0, 2)}/${so.slice(2)}`;
  return `${so.slice(0, 2)}/${so.slice(2, 4)}/${so.slice(4)}`;
}

/**
 * Kiem tra 'dd/mm/yyyy' va doi sang 'YYYY-MM-DD'. Loi tra ve KHOA TU DIEN de hien thi dung
 * ngon ngu nguoi dung, khong hardcode chuoi.
 */
function viet_sang_iso(viet: string):
  { ok: true; iso: string | null } | { ok: false; loi: ChuoiKhoa } {
  const s = viet.trim();
  if (s === '') return { ok: true, iso: null };
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m === null) return { ok: false, loi: 'ul_ngay_sai_dang' };
  const dd = Number(m[1]);
  const tt = Number(m[2]);
  const nn = Number(m[3]);
  if (dd < 1 || dd > 31 || tt < 1 || tt > 12 || nn < 2000 || nn > 2100) {
    return { ok: false, loi: 'ul_ngay_khong_hop_le' };
  }
  return { ok: true, iso: `${m[3]}-${m[2]}-${m[1]}` };
}

export function UngLuongToi(): ReactNode {
  const { tra } = dung_chuoi();
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<UngToi[]>('/api/toi/ung-luong');
  const [mo_form, dat_mo_form] = useState(false);
  const hd = dung_hanh_dong();
  const xac_nhan = dung_xac_nhan();

  const ds = du_lieu ?? [];

  const huy = (u: UngToi) => async (): Promise<void> => {
    const dong_y = await xac_nhan.hoi({
      tieu_de: tra('ul_xn_huy_tieu_de'),
      mo_ta: tra('ul_xn_huy_mo_ta', { thang: u.thang }),
      chu_dong_y: tra('ul_huy_de_nghi'),
      nguy_hiem: true,
    });
    if (!dong_y) return;
    await hd.chay(
      () => goi(`/api/toi/ung-luong/${u.id}/huy`, { method: 'POST' }), tra('ul_da_huy'),
    ).then(nap_lai);
  };

  return (
    <div className="ul-vo">
      <div className="dau-trang">
        <div>
          <p className="mo-ta">{tra('ul_mo_ta')}</p>
        </div>
        <div className="hang-nut">
          <button onClick={() => dat_mo_form(true)} disabled={hd.dang_chay}>
            {tra('ul_gui_de_nghi')}
          </button>
        </div>
      </div>

      <div className="hop-luu-y">{tra('ul_luu_y_tru_phieu')}</div>

      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <div className="ul-bang the the-mong">
        {dang_tai ? <XuongDanhSach /> : loi !== null ? <HopLoi loi={loi} /> : ds.length === 0 ? (
          <Trong tieu_de={tra('ul_trong_tieu_de')} mo_ta={tra('ul_trong_mo_ta')} />
        ) : (
          <div className="vo-bang">
            <table className="bang-gon">
              <thead>
                <tr>
                  <th>{tra('ul_thang')}</th>
                  <th className="canh-phai">{tra('ul_so_tien')}</th>
                  <th>{tra('ul_ngay_ung')}</th>
                  <th>{tra('ul_hinh_thuc')}</th>
                  <th>{tra('ul_trang_thai')}</th>
                  <th>{tra('ul_ly_do')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ds.map((u) => (
                  <tr key={u.id}>
                    <td>{u.thang}</td>
                    <td className="canh-phai">{tien(u.so_tien)}</td>
                    <td>{u.ngay_ung ?? '—'}</td>
                    <td>
                      {u.hinh_thuc === 'chuyen_khoan'
                        ? tra('ul_hinh_chuyen_khoan') : tra('ul_hinh_tien_mat')}
                    </td>
                    <td><span className={MAU_TT[u.trang_thai]}>{tra(NHAN_TT[u.trang_thai])}</span></td>
                    <td>{u.ly_do ?? '—'}</td>
                    <td className="canh-phai" style={{ whiteSpace: 'nowrap' }}>
                      {u.trang_thai === 'cho_duyet' && (
                        <button className="nut-phang" disabled={hd.dang_chay} onClick={huy(u)}>
                          {tra('ul_huy_de_nghi')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {mo_form && (
        <HopThoaiUng
          khi_dong={() => dat_mo_form(false)}
          khi_xong={() => { dat_mo_form(false); nap_lai(); }}
        />
      )}
      {xac_nhan.hop_thoai}
    </div>
  );
}

/** Form gui de nghi ung luong moi. Nguoi dung tu chon thang (tu thang nay tro di). */
function HopThoaiUng({ khi_dong, khi_xong }: {
  khi_dong: () => void; khi_xong: () => void;
}): ReactNode {
  const { tra } = dung_chuoi();
  const [f, dat_f] = useState({
    thang: thang_nay(),
    so_tien: '',
    ngay_ung: '',
    hinh_thuc: 'tien_mat' as 'tien_mat' | 'chuyen_khoan',
    ly_do: '',
    ghi_chu: '',
  });
  const [loi_ngay, dat_loi_ngay] = useState<ChuoiKhoa | null>(null);
  const hd = dung_hanh_dong();
  const dat = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    dat_f({ ...f, [k]: e.target.value });

  const du_dieu_kien = Number(f.so_tien) > 0;

  const gui = (): void => {
    const kq_ngay = viet_sang_iso(f.ngay_ung);
    if (!kq_ngay.ok) {
      dat_loi_ngay(kq_ngay.loi);
      return;
    }
    const than = {
      thang: f.thang, so_tien: Number(f.so_tien), ngay_ung: kq_ngay.iso,
      hinh_thuc: f.hinh_thuc, ly_do: f.ly_do, ghi_chu: f.ghi_chu,
    };
    void hd.chay(
      () => goi('/api/toi/ung-luong', { method: 'POST', body: than }), tra('ul_da_gui'),
    ).then((ok) => { if (ok) khi_xong(); });
  };

  return (
    <HopThoai tieu_de={tra('ul_gui_de_nghi_tieu_de')} khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <div className="ul-form ul-form-mot-cot">
        <div>
          <label>{tra('ul_thang')}</label>
          <ChonThang gia_tri={f.thang} doi={(v) => dat_f({ ...f, thang: v })} />
        </div>
        <div>
          <label htmlFor="ult-so-tien">{tra('ul_so_tien')}</label>
          <input id="ult-so-tien" inputMode="numeric" value={f.so_tien}
            placeholder="5.000.000" onChange={dat('so_tien')} />
        </div>
        <div>
          <label htmlFor="ult-ngay">{tra('ul_ngay_ung')}</label>
          <input id="ult-ngay" placeholder="dd/mm/yyyy" value={f.ngay_ung}
            onChange={(e) => {
              dat_f({ ...f, ngay_ung: them_gach_ngay(e.target.value) });
              dat_loi_ngay(null);
            }} />
          {loi_ngay !== null && <div className="hop-thong-bao hop-loi">{tra(loi_ngay)}</div>}
        </div>
        <div>
          <label>{tra('ul_hinh_thuc')}</label>
          <Chon
            gia_tri={f.hinh_thuc}
            dat_gia_tri={(ma) => dat_f({ ...f, hinh_thuc: ma as 'tien_mat' | 'chuyen_khoan' })}
            cac_tuy_chon={[
              { ma: 'tien_mat', nhan: tra('ul_hinh_tien_mat') },
              { ma: 'chuyen_khoan', nhan: tra('ul_hinh_chuyen_khoan') },
            ]}
            nhan={tra('ul_hinh_thuc')}
          />
        </div>
        <div>
          <label htmlFor="ult-ly-do">{tra('ul_ly_do')}</label>
          <input id="ult-ly-do" value={f.ly_do} onChange={dat('ly_do')} />
        </div>
        <div>
          <label htmlFor="ult-ghi-chu">{tra('ul_ghi_chu')}</label>
          <input id="ult-ghi-chu" value={f.ghi_chu} onChange={dat('ghi_chu')} />
        </div>
      </div>

      <div className="hang-nut">
        <button disabled={!du_dieu_kien || hd.dang_chay} onClick={gui}>
          {tra('ul_gui_de_nghi')}
        </button>
        <button className="nut-phang" onClick={khi_dong}>{tra('cn_huy')}</button>
      </div>
    </HopThoai>
  );
}
