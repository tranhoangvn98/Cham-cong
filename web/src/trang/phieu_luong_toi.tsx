// Phieu luong CUA TOI: nhan vien tu xem phieu luong hang thang da duyet/da tra, xem TUNG khoan.
//
// Mot bang luong khong giai thich duoc la mot don khieu nai — nen o day hien tung khoan thu
// nhap va tung khoan tru, khong gop thanh mot con so "phu cap".
import { useState, type ReactNode } from 'react';
import { DangTai, HopLoi, Trong, dung_nap } from '../thanh_phan.tsx';

interface KhoanPhieu {
  khoan_ma: string;
  ten: string;
  loai: 'thu_nhap' | 'tru';
  so_luong: string | null;
  don_gia: string | null;
  thanh_tien: string;
  ghi_chu: string | null;
  chiu_thue: boolean;
}

interface Phieu {
  id: string;
  thang: string;
  trang_thai_ky: string;
  luong_co_ban: string;
  phu_cap: string;
  so_ngay_cong_chuan: string;
  so_ngay_cong_thuc: string;
  luong_ngay: string;
  luong_theo_cong: string;
  tien_ot: string;
  thuong: string;
  phu_cap_khac: string;
  tong_thu_nhap: string;
  bhxh_nld: string;
  bhyt_nld: string;
  bhtn_nld: string;
  thue_tncn: string;
  tru_khac: string;
  tong_tru: string;
  thuc_linh: string;
  thuc_linh_lam_tron: string;
  loai_hop_dong: string | null;
  khoan: KhoanPhieu[];
}

const dinh_dang = new Intl.NumberFormat('vi-VN');
const tien = (v: unknown): string => dinh_dang.format(Math.round(Number(v) || 0));
const thang_viet = (t: string): string => {
  const [n, m] = t.split('-');
  return `Tháng ${m}/${n}`;
};
const TRANG_THAI: Record<string, string> = { da_duyet: 'Đã duyệt', da_tra: 'Đã trả' };
const LOAI_HD: Record<string, string> = {
  thu_viec: 'Thử việc', xac_dinh: 'Xác định thời hạn', khong_xac_dinh: 'Không xác định thời hạn',
  thoi_vu: 'Thời vụ', cong_tac_vien: 'Cộng tác viên', hoc_viec: 'Học việc',
};

export function TrangPhieuLuongToi(): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<Phieu[]>('/api/toi/phieu-luong');
  const [chon, dat_chon] = useState(0);

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];
  if (ds.length === 0) {
    return (
      <Trong tieu_de="Chưa có phiếu lương"
        mo_ta="Phiếu lương hiện sau khi kế toán chốt và duyệt kỳ lương của tháng." />
    );
  }

  const p = ds[Math.min(chon, ds.length - 1)]!;
  const thu_nhap = p.khoan.filter((k) => k.loai === 'thu_nhap');
  const khau_tru = p.khoan.filter((k) => k.loai === 'tru');

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">Phiếu lương hàng tháng của bạn — xem chi tiết từng khoản.</p>
        </div>
        <button className="nut-phang" onClick={() => window.print()}>In phiếu</button>
      </div>

      <div className="bo-loc">
        <div className="o-nhap">
          <label htmlFor="ky">Kỳ lương</label>
          <select id="ky" value={chon} onChange={(e) => dat_chon(Number(e.target.value))}>
            {ds.map((x, i) => (
              <option key={x.id} value={i}>
                {thang_viet(x.thang)} — {TRANG_THAI[x.trang_thai_ky] ?? x.trang_thai_ky}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="the phieu-luong">
        <div className="phieu-dau">
          <div>
            <h2>{thang_viet(p.thang)}</h2>
            <span className="nhan nhan-tot">{TRANG_THAI[p.trang_thai_ky] ?? p.trang_thai_ky}</span>
            {p.loai_hop_dong !== null && (
              <span className="nhan nhan-mo"> {LOAI_HD[p.loai_hop_dong] ?? p.loai_hop_dong}</span>
            )}
          </div>
          <div className="phieu-thuc-linh">
            <span className="mo-ta">Thực nhận</span>
            <strong>{tien(p.thuc_linh_lam_tron)} đ</strong>
          </div>
        </div>

        <div className="phieu-cong">
          <span>Công chuẩn: <strong>{p.so_ngay_cong_chuan}</strong></span>
          <span>Công thực tế: <strong>{p.so_ngay_cong_thuc}</strong></span>
          <span>Lương cơ bản: <strong>{tien(p.luong_co_ban)} đ</strong></span>
          <span>Lương/ngày công: <strong>{tien(p.luong_ngay)} đ</strong></span>
        </div>

        <h3>Thu nhập</h3>
        <div className="vo-bang">
          <table>
            <tbody>
              <tr>
                <td>Lương theo công</td>
                <td className="phai">{tien(p.luong_theo_cong)}</td>
              </tr>
              {Number(p.tien_ot) > 0 && (
                <tr><td>Làm thêm giờ (OT)</td><td className="phai">{tien(p.tien_ot)}</td></tr>
              )}
              {thu_nhap.map((k) => (
                <tr key={k.khoan_ma}>
                  <td>{k.ten}{k.chiu_thue ? '' : ' (miễn thuế)'}
                    {k.so_luong !== null && Number(k.so_luong) > 0 &&
                      <span className="mo-ta"> × {k.so_luong}</span>}</td>
                  <td className="phai">{tien(k.thanh_tien)}</td>
                </tr>
              ))}
              {Number(p.thuong) > 0 && (
                <tr><td>Thưởng</td><td className="phai">{tien(p.thuong)}</td></tr>
              )}
              {Number(p.phu_cap_khac) > 0 && (
                <tr><td>Phụ cấp khác</td><td className="phai">{tien(p.phu_cap_khac)}</td></tr>
              )}
              <tr className="hang-tong">
                <td><strong>Tổng thu nhập</strong></td>
                <td className="phai"><strong>{tien(p.tong_thu_nhap)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Khấu trừ</h3>
        <div className="vo-bang">
          <table>
            <tbody>
              <tr><td>BHXH (8%)</td><td className="phai">{tien(p.bhxh_nld)}</td></tr>
              <tr><td>BHYT (1,5%)</td><td className="phai">{tien(p.bhyt_nld)}</td></tr>
              <tr><td>BHTN (1%)</td><td className="phai">{tien(p.bhtn_nld)}</td></tr>
              {Number(p.thue_tncn) > 0 && (
                <tr><td>Thuế TNCN</td><td className="phai">{tien(p.thue_tncn)}</td></tr>
              )}
              {khau_tru.map((k) => (
                <tr key={k.khoan_ma}>
                  <td>{k.ten}
                    {k.so_luong !== null && Number(k.so_luong) > 0 &&
                      <span className="mo-ta"> × {k.so_luong}</span>}</td>
                  <td className="phai">{tien(k.thanh_tien)}</td>
                </tr>
              ))}
              {Number(p.tru_khac) > 0 && (
                <tr><td>Trừ khác</td><td className="phai">{tien(p.tru_khac)}</td></tr>
              )}
              <tr className="hang-tong">
                <td><strong>Tổng khấu trừ</strong></td>
                <td className="phai"><strong>{tien(p.tong_tru)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="phieu-ket">
          <span>Thực nhận (làm tròn)</span>
          <strong>{tien(p.thuc_linh_lam_tron)} đ</strong>
        </div>
      </div>

      <div className="hop-thong-bao hop-luu-y">
        Phiếu lương chỉ hiện khi kỳ đã được duyệt/trả. Nếu thấy sai, gửi giải trình ở mục
        <strong> Đơn của tôi</strong> hoặc liên hệ nhân sự — mỗi khoản đều ghi rõ để đối chiếu.
      </div>
    </>
  );
}
