import { useState, type ReactNode } from 'react';
import {
  da_dang_nhap, dang_xuat, la_admin, la_nhan_su, nguoi_dung_hien_tai,
} from './api.ts';
import { CungCapTuyen, LienKet, dung_tuyen } from './dinh_tuyen.tsx';
import { TEN_VAI_TRO } from './thanh_phan.tsx';
import { TrangDangNhap, TrangDoiMatKhau } from './trang/dang_nhap.tsx';
import { TrangDashboard } from './trang/dashboard.tsx';
import { TrangBangCong } from './trang/bang_cong.tsx';
import { TrangNhanVien } from './trang/nhan_vien.tsx';
import { TrangThietBi } from './trang/thiet_bi.tsx';
import { TrangDuyetDon } from './trang/duyet_don.tsx';
import { TrangCaLam, TrangDiaDiem, TrangNgayLe } from './trang/cai_dat.tsx';
import { TrangLanQuet } from './trang/lan_quet.tsx';
import { TrangNguoiDung, TrangNhatKy } from './trang/nguoi_dung.tsx';

interface MucMenu {
  duong_dan: string;
  ten: string;
  bieu_tuong: string;
  nhom: string;
  /** Vai tro toi thieu de thay muc nay. */
  quyen?: 'nhan_su' | 'admin';
}

const MENU: MucMenu[] = [
  { duong_dan: '/', ten: 'Tổng quan', bieu_tuong: '◫', nhom: 'Theo dõi' },
  { duong_dan: '/bang-cong', ten: 'Bảng công', bieu_tuong: '▤', nhom: 'Theo dõi' },
  { duong_dan: '/lan-quet', ten: 'Nhật ký quẹt', bieu_tuong: '⧗', nhom: 'Theo dõi' },
  { duong_dan: '/duyet-don', ten: 'Duyệt đơn', bieu_tuong: '✓', nhom: 'Theo dõi' },

  { duong_dan: '/nhan-vien', ten: 'Nhân viên', bieu_tuong: '☰', nhom: 'Quản lý' },
  { duong_dan: '/thiet-bi', ten: 'Máy chấm công', bieu_tuong: '⬚', nhom: 'Quản lý', quyen: 'nhan_su' },
  { duong_dan: '/ca-lam', ten: 'Ca làm việc', bieu_tuong: '◷', nhom: 'Quản lý' },
  { duong_dan: '/dia-diem', ten: 'Địa điểm', bieu_tuong: '⌖', nhom: 'Quản lý' },
  { duong_dan: '/ngay-le', ten: 'Ngày lễ', bieu_tuong: '★', nhom: 'Quản lý' },

  { duong_dan: '/tai-khoan', ten: 'Tài khoản', bieu_tuong: '⚿', nhom: 'Hệ thống', quyen: 'admin' },
  { duong_dan: '/nhat-ky', ten: 'Nhật ký thao tác', bieu_tuong: '❐', nhom: 'Hệ thống', quyen: 'admin' },
];

function duoc_xem(m: MucMenu): boolean {
  if (m.quyen === 'admin') return la_admin();
  if (m.quyen === 'nhan_su') return la_nhan_su();
  return true;
}

function NoiDung({ duong_dan }: { duong_dan: string }): ReactNode {
  switch (duong_dan) {
    case '/': return <TrangDashboard />;
    case '/bang-cong': return <TrangBangCong />;
    case '/lan-quet': return <TrangLanQuet />;
    case '/duyet-don': return <TrangDuyetDon />;
    case '/nhan-vien': return <TrangNhanVien />;
    case '/thiet-bi': return la_nhan_su() ? <TrangThietBi /> : <KhongCoQuyen />;
    case '/ca-lam': return <TrangCaLam />;
    case '/dia-diem': return <TrangDiaDiem />;
    case '/ngay-le': return <TrangNgayLe />;
    case '/tai-khoan': return la_admin() ? <TrangNguoiDung /> : <KhongCoQuyen />;
    case '/nhat-ky': return la_admin() ? <TrangNhatKy /> : <KhongCoQuyen />;
    default: return <KhongTimThay duong_dan={duong_dan} />;
  }
}

function KhongCoQuyen(): ReactNode {
  return (
    <div className="the">
      <h1>Không có quyền</h1>
      <p className="mo-ta">Tài khoản của bạn không được xem trang này.</p>
      <LienKet den="/" lop="nut">Về tổng quan</LienKet>
    </div>
  );
}

function KhongTimThay({ duong_dan }: { duong_dan: string }): ReactNode {
  return (
    <div className="the">
      <h1>Không có trang này</h1>
      <p className="mo-ta">Đường dẫn <code>{duong_dan}</code> không tồn tại.</p>
      <LienKet den="/" lop="nut">Về tổng quan</LienKet>
    </div>
  );
}

function BoCuc(): ReactNode {
  const { duong_dan } = dung_tuyen();
  const nd = nguoi_dung_hien_tai();
  const [dang_doi_mk, dat_dang_doi_mk] = useState(false);

  if (dang_doi_mk) {
    return (
      <TrangDoiMatKhau
        bat_buoc={false}
        khi_xong={() => window.location.assign('/')}
      />
    );
  }

  const nhom_menu = [...new Set(MENU.filter(duoc_xem).map((m) => m.nhom))];

  return (
    <div className="vo-app">
      <aside className="thanh-ben">
        <div className="thuong-hieu">
          <span aria-hidden="true">⧖</span> Chấm công
        </div>

        <nav className="dieu-huong">
          {nhom_menu.map((nhom) => (
            <div key={nhom} className="dieu-huong-khoi">
              <div className="dieu-huong-nhom">{nhom}</div>
              {MENU.filter((m) => duoc_xem(m) && m.nhom === nhom).map((m) => (
                <LienKet
                  key={m.duong_dan}
                  den={m.duong_dan}
                  lop={duong_dan === m.duong_dan ? 'dang-chon' : undefined}
                >
                  <span aria-hidden="true">{m.bieu_tuong}</span> {m.ten}
                </LienKet>
              ))}
            </div>
          ))}
        </nav>

        <div className="chan-thanh-ben">
          <div style={{ fontWeight: 600, color: 'var(--chu)' }}>
            {nd?.ho_ten ?? nd?.ten_dang_nhap}
          </div>
          <div style={{ marginBottom: 8 }}>
            {nd === null ? '' : (TEN_VAI_TRO[nd.vai_tro] ?? nd.vai_tro)}
          </div>
          <div className="hang-nut">
            <button className="nut-nho nut-phang" onClick={() => dat_dang_doi_mk(true)}>
              Đổi mật khẩu
            </button>
            <button
              className="nut-nho nut-phang"
              onClick={() => {
                void dang_xuat().then(() => window.location.assign('/'));
              }}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      <main className="than">
        <NoiDung duong_dan={duong_dan} />
      </main>
    </div>
  );
}

export function App(): ReactNode {
  // Buoc lai render sau khi dang nhap/dang xuat de doc lai trang thai phien.
  const [lan, dat_lan] = useState(0);
  const nd = nguoi_dung_hien_tai();

  if (!da_dang_nhap()) {
    return <TrangDangNhap khi_xong={() => dat_lan(lan + 1)} />;
  }

  // Tai khoan moi tao / vua duoc dat lai mat khau: bat buoc doi truoc khi vao he thong.
  if (nd !== null && nd.phai_doi_mat_khau) {
    return <TrangDoiMatKhau bat_buoc khi_xong={() => dat_lan(lan + 1)} />;
  }

  return (
    <CungCapTuyen>
      <BoCuc />
    </CungCapTuyen>
  );
}
