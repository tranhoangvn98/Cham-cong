// Ho so CA NHAN — nhan vien xem thong tin cua chinh minh + tu cap nhat lien he (SDT, email).
// Cac truong quan trong (chuc danh, phong, ca, ngay vao) chi XEM — sua phai qua nhan su.
import { useState, type ReactNode } from 'react';
import {
  DangTai, HopLoi, HopTot, dung_hanh_dong, dung_nap, ngay_viet,
} from '../thanh_phan.tsx';
import { goi } from '../api.ts';

interface HoSoToi {
  ma_nv: string;
  ho_ten: string;
  chuc_danh: string | null;
  pin_may: string | null;
  ngay_vao: string | null;
  ngay_chinh_thuc: string | null;
  email: string | null;
  so_dien_thoai: string | null;
  so_ngay_phep_nam: number;
  phong_ban: string | null;
  ca_lam: string | null;
  gio_vao: string | null;
  gio_ra: string | null;
  nguoi_quan_ly: string | null;
}

function Dong({ nhan, gia_tri }: { nhan: string; gia_tri: ReactNode }): ReactNode {
  return (
    <div className="hoso-dong">
      <div className="hoso-nhan">{nhan}</div>
      <div className="hoso-gt">{gia_tri ?? <span className="mo-ta">—</span>}</div>
    </div>
  );
}

export function TrangHoSoToi(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<HoSoToi>('/api/toi/ho-so');
  const [sua, dat_sua] = useState(false);
  const [sdt, dat_sdt] = useState('');
  const [email, dat_email] = useState('');
  const hd = dung_hanh_dong();

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  if (du_lieu === null) return <HopLoi loi="Không tải được hồ sơ." />;
  const h = du_lieu;

  const mo_sua = (): void => {
    dat_sdt(h.so_dien_thoai ?? '');
    dat_email(h.email ?? '');
    dat_sua(true);
  };

  const luu = async (): Promise<void> => {
    const ok = await hd.chay(
      () => goi('/api/toi/ho-so/lien-he', { method: 'POST', body: { so_dien_thoai: sdt, email } }),
      'Đã cập nhật liên hệ.',
    );
    if (ok) { dat_sua(false); nap_lai(); }
  };

  return (
    <div className="canhan">
      <div className="canhan-hero">
        <div className="canhan-hero-chao">{h.ho_ten}</div>
        <div className="canhan-hero-phu">
          {h.chuc_danh ?? 'Nhân viên'}{h.phong_ban !== null ? ` · ${h.phong_ban}` : ''} · Mã {h.ma_nv}
        </div>
      </div>
      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />

      <div className="canhan-hang">
        <div className="the canhan-muc">
          <div className="canhan-muc-dau"><h2>Thông tin công việc</h2></div>
          <Dong nhan="Phòng ban" gia_tri={h.phong_ban} />
          <Dong nhan="Chức danh" gia_tri={h.chuc_danh} />
          <Dong nhan="Người quản lý" gia_tri={h.nguoi_quan_ly} />
          <Dong nhan="Ca làm việc" gia_tri={h.ca_lam !== null
            ? `${h.ca_lam} (${(h.gio_vao ?? '').slice(0, 5)}–${(h.gio_ra ?? '').slice(0, 5)})` : null} />
          <Dong nhan="PIN máy chấm công" gia_tri={h.pin_may} />
          <Dong nhan="Ngày vào" gia_tri={h.ngay_vao !== null ? ngay_viet(h.ngay_vao) : null} />
          <Dong nhan="Quỹ phép năm" gia_tri={`${h.so_ngay_phep_nam} ngày`} />
        </div>

        <div className="the canhan-muc">
          <div className="canhan-muc-dau">
            <h2>Liên hệ</h2>
            {!sua && (
              <button className="nut-nho nut-phang" onClick={mo_sua}>Sửa</button>
            )}
          </div>
          {!sua ? (
            <>
              <Dong nhan="Số điện thoại" gia_tri={h.so_dien_thoai} />
              <Dong nhan="Email" gia_tri={h.email} />
              <p className="mo-ta">Bạn tự cập nhật được số điện thoại và email. Các thông tin
                khác do nhân sự quản lý.</p>
            </>
          ) : (
            <div className="hoso-sua">
              <label className="truong">
                <span>Số điện thoại</span>
                <input value={sdt} onChange={(e) => dat_sdt(e.target.value)}
                  inputMode="tel" placeholder="09xx xxx xxx" />
              </label>
              <label className="truong">
                <span>Email</span>
                <input value={email} onChange={(e) => dat_email(e.target.value)}
                  inputMode="email" placeholder="ten@congty.com" />
              </label>
              <div className="hang-nut">
                <button onClick={() => { void luu(); }} disabled={hd.dang_chay}>
                  {hd.dang_chay ? 'Đang lưu…' : 'Lưu'}
                </button>
                <button className="nut-phang" onClick={() => dat_sua(false)}>Hủy</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
