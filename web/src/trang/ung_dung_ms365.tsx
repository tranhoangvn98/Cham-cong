// The "Ung dung bat buoc" trong tab Thong tin chung cua ho so nhan su.
//
// QUAN TRONG: day KHONG phai danh sach ung dung da cai. Microsoft Graph chi tra bao cao SU DUNG
// 30 ngay (da kich hoat / dang nhap), va bao cao do khong tach duoc OneDrive/SharePoint tren
// dien thoai. Vi vay moi dong co trang thai "da dung / chi dung ban web / chua thay dung /
// chua kiem tra duoc" va co dong ghi chu nguon o duoi the. Dung doi nhan chu thanh
// "da cai dat" — sai ve nghia va se lam nhan su ket luan nham.
import { useState, type ReactNode } from 'react';
import { goi, la_nhan_su } from '../api.ts';
import {
  DangTai, HopLoi, HopTot, dung_hanh_dong, dung_nap, ngay_gio, ngay_viet,
} from '../thanh_phan.tsx';
import { dung_chuoi, type ChuoiKhoa } from '../chuoi/chi_muc.tsx';

type NenTang = 'may_tinh' | 'dien_thoai';
type TrangThai =
  | 'da_dung' | 'chi_web' | 'khong_thay' | 'khong_kiem_tra_duoc' | 'khong_co_tai_khoan';

interface DongUngDung {
  nen_tang: NenTang;
  ung_dung: string;
  ten: string;
  trang_thai: TrangThai;
  lan_hoat_dong: string | null;
  ngay_bao_cao: string | null;
  nguon: string;
  chi_tiet: string | null;
}

interface KetQuaTai {
  danh_sach: DongUngDung[];
  dong_bo_luc: string | null;
  ngay_bao_cao: string | null;
  graph_da_cau_hinh: boolean;
}

interface KetQuaDongBo {
  so_nhan_vien: number;
  so_dong: number;
  so_nguoi_thieu: number;
  ngay_bao_cao: string | null;
  loi: string[];
}

const KHOA_TRANG_THAI: Record<TrangThai, ChuoiKhoa> = {
  da_dung: 'udm365_tt_da_dung',
  chi_web: 'udm365_tt_chi_web',
  khong_thay: 'udm365_tt_khong_thay',
  khong_kiem_tra_duoc: 'udm365_tt_khong_kiem_tra_duoc',
  khong_co_tai_khoan: 'udm365_tt_khong_co_tai_khoan',
};

const LOP_TRANG_THAI: Record<TrangThai, string> = {
  da_dung: 'nhan-tot',
  chi_web: 'nhan-canh-bao',
  khong_thay: 'nhan-xau',
  khong_kiem_tra_duoc: 'nhan-mo',
  khong_co_tai_khoan: 'nhan-mo',
};

/** Ma chi tiet do may chu tra -> khoa chuoi. Ma la khong phai cau hien thi. */
const KHOA_CHI_TIET: Record<string, ChuoiKhoa> = {
  chi_dung_web: 'udm365_ct_chi_dung_web',
  khong_co_hoat_dong: 'udm365_ct_khong_co_hoat_dong',
  dong_bo_tep: 'udm365_ct_dong_bo_tep',
  can_entra_p1: 'udm365_ct_can_entra_p1',
  bao_cao_khong_tach_thiet_bi: 'udm365_ct_bao_cao_khong_tach_thiet_bi',
  loi_bao_cao: 'udm365_ct_loi_bao_cao',
  chua_co_upn: 'udm365_ct_chua_co_upn',
  khong_co_giay_phep: 'udm365_ct_khong_co_giay_phep',
};

export function TheUngDungMs365({ nhan_vien_id }: { nhan_vien_id: string }): ReactNode {
  const duong = `/api/nhan-vien/${nhan_vien_id}/ms365-ung-dung`;
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<KetQuaTai>(duong, [nhan_vien_id]);
  const { tra } = dung_chuoi();
  const hd = dung_hanh_dong();
  const [kq_dong_bo, dat_kq_dong_bo] = useState<KetQuaDongBo | null>(null);

  const dong_bo = async (): Promise<void> => {
    dat_kq_dong_bo(null);
    const kq = await hd.chay_lay<KetQuaDongBo>(
      () => goi<KetQuaDongBo>('/api/nhan-vien/ms365-ung-dung/dong-bo', { method: 'POST' }),
    );
    if (kq !== null) {
      dat_kq_dong_bo(kq);
      nap_lai();
    }
  };

  if (dang_tai) return <DangTai />;

  const ds = du_lieu?.danh_sach ?? [];
  const theo_nen = (nen: NenTang): DongUngDung[] => ds.filter((d) => d.nen_tang === nen);

  const mo_ta = (d: DongUngDung): string => {
    if (d.chi_tiet !== null) {
      const khoa = KHOA_CHI_TIET[d.chi_tiet];
      if (khoa !== undefined && d.trang_thai !== 'da_dung') return tra(khoa);
    }
    if (d.trang_thai === 'da_dung' && d.lan_hoat_dong !== null) {
      return tra('udm365_lan_cuoi', { ngay: ngay_viet(d.lan_hoat_dong) });
    }
    if (d.trang_thai === 'da_dung') return tra('udm365_trong_30_ngay');
    return '';
  };

  const bang = (nen: NenTang, tieu_de: string): ReactNode => {
    const dong = theo_nen(nen);
    if (dong.length === 0) return null;
    return (
      <div>
        <h4 style={{ margin: '0 0 6px' }}>{tieu_de}</h4>
        <div className="vo-bang">
          <table className="bang-gon">
            <thead>
              <tr>
                <th>{tra('udm365_ung_dung')}</th>
                <th>{tra('udm365_trang_thai')}</th>
              </tr>
            </thead>
            <tbody>
              {dong.map((d) => {
                const phu = mo_ta(d);
                return (
                  <tr key={`${d.nen_tang}:${d.ung_dung}`}>
                    <td>
                      {d.ten}
                      {phu !== '' && <div className="mo-ta">{phu}</div>}
                    </td>
                    <td>
                      <span className={`nhan ${LOP_TRANG_THAI[d.trang_thai]}`}>
                        {tra(KHOA_TRANG_THAI[d.trang_thai])}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="the" style={{ marginTop: 12 }}>
      <h3>{tra('udm365_tieu_de')}</h3>
      <p className="mo-ta">{tra('udm365_mo_ta')}</p>

      <HopLoi loi={loi ?? hd.loi} />
      {kq_dong_bo !== null && (
        <HopTot chu={tra('udm365_da_dong_bo', {
          so: kq_dong_bo.so_nhan_vien,
          thieu: kq_dong_bo.so_nguoi_thieu,
        })} />
      )}

      <div className="hang-nut">
        {la_nhan_su() && du_lieu?.graph_da_cau_hinh === true && (
          <button type="button" className="nut-chinh" disabled={hd.dang_chay} onClick={() => void dong_bo()}>
            {hd.dang_chay ? tra('udm365_dang_dong_bo') : tra('udm365_dong_bo')}
          </button>
        )}
        {du_lieu?.dong_bo_luc !== null && du_lieu?.dong_bo_luc !== undefined && (
          <span className="mo-ta">
            {tra('udm365_cap_nhat', {
              luc: ngay_gio(du_lieu.dong_bo_luc),
              ngay: du_lieu.ngay_bao_cao === null ? '—' : ngay_viet(du_lieu.ngay_bao_cao),
            })}
          </span>
        )}
      </div>

      {ds.length === 0 ? (
        <div className="hop-thong-bao hop-luu-y">
          {du_lieu?.graph_da_cau_hinh === false
            ? tra('udm365_chua_cau_hinh')
            : tra('udm365_chua_co')}
        </div>
      ) : (
        <div className="luoi luoi-2">
          {bang('may_tinh', tra('udm365_may_tinh'))}
          {bang('dien_thoai', tra('udm365_dien_thoai'))}
        </div>
      )}

      <p className="mo-ta" style={{ marginTop: 10 }}>{tra('udm365_nguon')}</p>
    </div>
  );
}
