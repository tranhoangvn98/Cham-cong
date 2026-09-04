// Trang tong quan CA NHAN — nhan vien chi thay viec cua CHINH MINH, khong bao gio thay dashboard
// toan cong ty (NĐ 13/2023 + yeu cau nghiep vu). Cong thang, phep con, nghi le sap toi, thong bao
// moi, don cho — tat ca tu /api/toi/tong-quan.
import type { ReactNode } from 'react';
import { LienKet } from '../dinh_tuyen.tsx';
import { DangTai, HopLoi, OSo, dung_nap, khoa_tinh, ngay_viet } from '../thanh_phan.tsx';
import { nguoi_dung_hien_tai } from '../api.ts';

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
  const nd = nguoi_dung_hien_tai();
  const ten = (nd?.ho_ten ?? nd?.ten_dang_nhap ?? '').split(' ').slice(-1)[0] || 'bạn';

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  if (du_lieu === null) return <HopLoi loi="Không tải được tổng quan." />;

  const { cong, phep, nghi_le, thong_bao, don_cho } = du_lieu;
  const phep_con = phep === null ? 0 : Math.max(0, phep.quota - phep.da_dung);
  const chua_doc = thong_bao?.chua_doc ?? 0;
  const can_gt = thong_bao?.can_giai_trinh ?? 0;

  return (
    <div className="canhan">
      <div className="canhan-hero">
        <div className="canhan-hero-chao">Xin chào, {ten}</div>
        <div className="canhan-hero-phu">Đây là tổng quan của riêng bạn trong tháng {du_lieu.thang}.</div>
      </div>

      {can_gt > 0 && (
        <div className="hop-thong-bao hop-loi">
          Bạn có <b>{can_gt}</b> thông báo cần giải trình.{' '}
          <LienKet den="/thong-bao" lop="lk-manh">Mở ngay →</LienKet>
        </div>
      )}

      <div className="canhan-luoi-o">
        <OSo nhan="Công tháng này" gia_tri={cong?.tong_cong ?? 0}
          phu={`Có mặt ${cong?.so_ngay_co_mat ?? 0} ngày`} mau="lanh" />
        <OSo nhan="Phép còn lại" gia_tri={phep_con}
          phu={`Đã dùng ${phep?.da_dung ?? 0}/${phep?.quota ?? 0}`} mau="tot" />
        <OSo nhan="Thông báo mới" gia_tri={chua_doc}
          phu={chua_doc > 0 ? 'Chưa đọc — bấm để xem' : 'Đã đọc hết'}
          mau={chua_doc > 0 ? 'xau' : undefined} />
        <OSo nhan="Đơn chờ duyệt" gia_tri={don_cho?.so_don_cho ?? 0}
          phu="Nghỉ phép, giải trình" mau="canh_bao" />
      </div>

      <div className="canhan-hang">
        <div className="the canhan-muc">
          <div className="canhan-muc-dau">
            <h2>Nghỉ lễ sắp tới</h2>
            <LienKet den="/thong-bao" lop="lk-nhat">Thông báo</LienKet>
          </div>
          {nghi_le.length === 0
            ? <p className="mo-ta">Sắp tới chưa có ngày lễ nào trong lịch.</p>
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
            <h2>Lối tắt</h2>
          </div>
          <div className="canhan-tat">
            <LienKet den="/don-cua-toi" lop="canhan-tat-o">Xin nghỉ / giải trình</LienKet>
            <LienKet den="/thong-bao" lop="canhan-tat-o">Thông báo công ty</LienKet>
            <LienKet den="/van-ban" lop="canhan-tat-o">Văn bản công ty</LienKet>
            <LienKet den="/ho-so-toi" lop="canhan-tat-o">Hồ sơ của tôi</LienKet>
          </div>
        </div>
      </div>
    </div>
  );
}
