// Trang tong quan CA NHAN — nhan vien chi thay viec cua CHINH MINH, khong bao gio thay dashboard
// toan cong ty (NĐ 13/2023 + yeu cau nghiep vu). Cong thang, phep con, nghi le sap toi, thong bao
// moi, don cho — tat ca tu /api/toi/tong-quan.
import type { ReactNode } from 'react';
import { LienKet } from '../dinh_tuyen.tsx';
import { DangTai, HopLoi, OSo, dung_nap, khoa_tinh, ngay_viet } from '../thanh_phan.tsx';
import { nguoi_dung_hien_tai } from '../api.ts';
import { dung_chuoi } from '../chuoi/chi_muc.tsx';

interface TongQuanCaNhan {
  thang: string;
  cong: {
    tong_cong: number;
    so_ngay_co_mat: number;
    so_ngay_vang: number;
    so_ngay_nghi_phep: number;
    so_lan_di_muon: number;
  } | null;
  phep: { quota: number; da_dung: number } | null;
  nghi_le: { ngay: string; ten: string }[];
  thong_bao: { chua_doc: number; can_giai_trinh: number } | null;
  don_cho: { so_don_cho: number } | null;
}

export function TrangDashboardCaNhan(): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<TongQuanCaNhan>('/api/toi/tong-quan');
  const { tra } = dung_chuoi();
  const nd = nguoi_dung_hien_tai();
  const ten = (nd?.ho_ten ?? nd?.ten_dang_nhap ?? '').split(' ').slice(-1)[0] || tra('cn_ban');

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  if (du_lieu === null) return <HopLoi loi={tra('dcn_khong_tai_duoc')} />;

  const { cong, phep, nghi_le, thong_bao, don_cho } = du_lieu;
  const phep_con = phep === null ? 0 : Math.max(0, phep.quota - phep.da_dung);
  const chua_doc = thong_bao?.chua_doc ?? 0;
  const can_gt = thong_bao?.can_giai_trinh ?? 0;

  return (
    <div className="canhan">
      <div className="canhan-hero">
        <div className="canhan-hero-chao">{tra('cn_xin_chao', { ten })}</div>
        <div className="canhan-hero-phu">{tra('dcn_tong_quan_rieng', { n: du_lieu.thang })}</div>
      </div>

      {can_gt > 0 && (
        <div className="hop-thong-bao hop-loi">
          {tra('dcn_ban_co_tb', { n: can_gt })}{' '}
          <LienKet den="/van-ban" lop="lk-manh">{tra('dcn_mo_ngay')}</LienKet>
        </div>
      )}

      <div className="canhan-luoi-o">
        <OSo nhan={tra('dcn_cong_thang_nay')} gia_tri={cong?.tong_cong ?? 0}
          phu={tra('dcn_co_mat_x_ngay', { n: cong?.so_ngay_co_mat ?? 0 })} mau="lanh" />
        <OSo nhan={tra('dcn_phep_con_lai')} gia_tri={phep_con}
          phu={tra('dcn_da_dung_xy', { x: phep?.da_dung ?? 0, y: phep?.quota ?? 0 })} mau="tot" />
        <OSo nhan={tra('dcn_thong_bao_moi')} gia_tri={chua_doc}
          phu={chua_doc > 0 ? tra('dcn_chua_doc_bam') : tra('dcn_da_doc_het')}
          mau={chua_doc > 0 ? 'xau' : undefined} />
        <OSo nhan={tra('dcn_don_cho_duyet')} gia_tri={don_cho?.so_don_cho ?? 0}
          phu={tra('dcn_nghi_phep_giai_trinh')} mau="canh_bao" />
      </div>

      <div className="canhan-hang">
        <div className="the canhan-muc">
          <div className="canhan-muc-dau">
            <h2>{tra('dcn_nghi_le_sap_toi')}</h2>
            <LienKet den="/van-ban" lop="lk-nhat">{tra('menu_thong_bao')}</LienKet>
          </div>
          {nghi_le.length === 0
            ? <p className="mo-ta">{tra('dcn_chua_co_ngay_le')}</p>
            : (
              <ul className="canhan-le">
                {nghi_le.map((l, i) => (
                  <li key={khoa_tinh(l.ngay, i)}>
                    <span className="canhan-le-ngay">{ngay_viet(l.ngay)}</span>
                    <span>{l.ten}</span>
                  </li>
                ))}
              </ul>
            )}
        </div>

        <div className="the canhan-muc">
          <div className="canhan-muc-dau">
            <h2>{tra('dcn_loi_tat')}</h2>
          </div>
          <div className="canhan-tat">
            <LienKet den="/ca-nhan/don-tu" lop="canhan-tat-o">{tra('dcn_xin_nghi_giai_trinh')}</LienKet>
            <LienKet den="/ca-nhan/thong-bao" lop="canhan-tat-o">{tra('dcn_thong_bao_cty')}</LienKet>
            <LienKet den="/ca-nhan/van-ban" lop="canhan-tat-o">{tra('dcn_tai_lieu_cty')}</LienKet>
            <LienKet den="/ca-nhan/ca-nhan" lop="canhan-tat-o">{tra('dcn_ho_so_cua_toi')}</LienKet>
          </div>
        </div>
      </div>
    </div>
  );
}
