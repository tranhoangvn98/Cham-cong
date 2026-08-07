import { useEffect, useState, type ReactNode } from 'react';
import {
  da_dang_nhap, dang_xuat, la_admin, la_nhan_su, nguoi_dung_hien_tai, nhan_phien_tu_neo,
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
  /** Ten icon Tabler (xem web/src/icon.css). */
  icon: string;
  nhom: string;
  /** Dong phu tren header khi o trang nay. */
  phu?: string;
  /** Vai tro toi thieu de thay muc nay. */
  quyen?: 'nhan_su' | 'admin';
}

/*
 * Nhom menu theo demo Metronic da duyet: nhom dau khong co nhan, roi "Quan tri nhan su",
 * roi "He thong".
 *
 * Demo liet ke 11 man, trong do 4 man CHUA CO backend (Bang luong / Hop dong / Vi pham /
 * Cau hinh phap ly — Module C, D, G). KHONG dua chung vao menu: mot muc menu dan toi
 * trang trong thi te hon la khong co muc do.
 *
 * Nguoc lai, app nay co 5 man demo khong liet ke (Ca lam viec, Dia diem, Ngay le, Tai
 * khoan, Nhat ky thao tac). Giu nguyen — bo man "Ngay le" la Tet Nguyen dan khong khai
 * duoc va nhung ngay do bi tinh la Vang.
 */
const MENU: MucMenu[] = [
  { duong_dan: '/', ten: 'Tổng quan', icon: 'layout-dashboard', nhom: '', phu: 'Tình hình chấm công hôm nay' },
  { duong_dan: '/lan-quet', ten: 'Chấm công', icon: 'fingerprint', nhom: '', phu: 'Log đồng bộ từ máy ADMS' },
  { duong_dan: '/bang-cong', ten: 'Bảng công', icon: 'calendar-stats', nhom: '', phu: 'Tổng hợp theo tháng' },

  { duong_dan: '/nhan-vien', ten: 'Nhân viên', icon: 'users', nhom: 'Quản trị nhân sự', phu: 'Hồ sơ, PIN máy, tài khoản' },
  { duong_dan: '/duyet-don', ten: 'Nghỉ phép', icon: 'plane-departure', nhom: 'Quản trị nhân sự', phu: 'Đơn từ & duyệt' },

  { duong_dan: '/thiet-bi', ten: 'Thiết bị', icon: 'device-desktop', nhom: 'Hệ thống', phu: 'Máy chấm công ZKTeco', quyen: 'nhan_su' },
  { duong_dan: '/ca-lam', ten: 'Ca làm việc', icon: 'clock', nhom: 'Hệ thống', phu: 'Giờ vào/ra, dung sai, ngưỡng OT' },
  { duong_dan: '/dia-diem', ten: 'Địa điểm', icon: 'map-pin', nhom: 'Hệ thống', phu: 'Đối chiếu GPS khi đi công tác' },
  { duong_dan: '/ngay-le', ten: 'Ngày lễ', icon: 'star', nhom: 'Hệ thống', phu: 'Tết Nguyên đán phải tự thêm mỗi năm' },
  { duong_dan: '/tai-khoan', ten: 'Tài khoản', icon: 'key', nhom: 'Hệ thống', phu: 'Người dùng và vai trò', quyen: 'admin' },
  { duong_dan: '/nhat-ky', ten: 'Nhật ký thao tác', icon: 'list-details', nhom: 'Hệ thống', phu: 'Ai sửa gì, khi nào', quyen: 'admin' },
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

/**
 * Che do sang/toi. Ke hoach v2 muc 4.5 doi "bat/tat tren web", nen khong the chi dua vao
 * `prefers-color-scheme`: phai luu duoc lua chon cua nguoi dung.
 *
 * Ba trang thai: 'may' (theo he dieu hanh) / 'sang' / 'toi'. Bien CSS o
 * token_thiet_ke.css doc `data-che-do` tren <html>, nen chi can dat thuoc tinh do.
 */
type CheDo = 'may' | 'sang' | 'toi';

const KHOA_CHE_DO = 'cham_cong_che_do';

function doc_che_do(): CheDo {
  const v = localStorage.getItem(KHOA_CHE_DO);
  return v === 'sang' || v === 'toi' ? v : 'may';
}

function ap_che_do(c: CheDo): void {
  if (c === 'may') document.documentElement.removeAttribute('data-che-do');
  else document.documentElement.setAttribute('data-che-do', c);
}

function dang_toi(c: CheDo): boolean {
  if (c === 'toi') return true;
  if (c === 'sang') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function BoCuc(): ReactNode {
  const { duong_dan } = dung_tuyen();
  const nd = nguoi_dung_hien_tai();
  const [dang_doi_mk, dat_dang_doi_mk] = useState(false);
  const [ben_mo, dat_ben_mo] = useState(false);
  const [che_do, dat_che_do] = useState<CheDo>(doc_che_do);

  useEffect(() => {
    ap_che_do(che_do);
    if (che_do === 'may') localStorage.removeItem(KHOA_CHE_DO);
    else localStorage.setItem(KHOA_CHE_DO, che_do);
  }, [che_do]);

  // Dong thanh ben khi doi trang: o man nho no dang phu len noi dung.
  useEffect(() => { dat_ben_mo(false); }, [duong_dan]);

  if (dang_doi_mk) {
    return (
      <TrangDoiMatKhau
        bat_buoc={false}
        khi_xong={() => window.location.assign('/')}
      />
    );
  }

  const duoc_thay = MENU.filter(duoc_xem);
  const nhom_menu = [...new Set(duoc_thay.map((m) => m.nhom))];
  const muc = duoc_thay.find((m) => m.duong_dan === duong_dan) ?? null;
  const chu_dau = (nd?.ho_ten ?? nd?.ten_dang_nhap ?? '?')
    .split(' ').filter((t) => t.length > 0).slice(-2).map((t) => t[0]).join('').toUpperCase();

  return (
    <div className="vo-app">
      <aside className={ben_mo ? 'thanh-ben mo' : 'thanh-ben'}>
        <div className="thuong-hieu">
          <div className="thuong-hieu-o" aria-hidden="true">TH</div>
          <div>
            <b>Trần Hoàng</b>
            <span>HR · Chấm công</span>
          </div>
        </div>

        <nav className="dieu-huong">
          {nhom_menu.map((nhom) => (
            <div key={nhom} className="dieu-huong-khoi">
              {nhom !== '' && <div className="dieu-huong-nhom">{nhom}</div>}
              {duoc_thay.filter((m) => m.nhom === nhom).map((m) => (
                <LienKet
                  key={m.duong_dan}
                  den={m.duong_dan}
                  lop={duong_dan === m.duong_dan ? 'dang-chon' : undefined}
                >
                  <i className={`bt bt-${m.icon}`} aria-hidden="true" /> {m.ten}
                </LienKet>
              ))}
            </div>
          ))}
        </nav>

        <div className="chan-thanh-ben">
          <div className="ten-nguoi">{nd?.ho_ten ?? nd?.ten_dang_nhap}</div>
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

      {ben_mo && (
        <button
          className="man-che-ben"
          aria-label="Đóng thanh điều hướng"
          onClick={() => dat_ben_mo(false)}
        />
      )}

      <main className="than">
        <header className="dau-app">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button
              className="nut-tron nut-menu"
              aria-label="Mở thanh điều hướng"
              aria-expanded={ben_mo}
              onClick={() => dat_ben_mo(true)}
            >
              <i className="bt bt-menu-2" aria-hidden="true" />
            </button>
            <div style={{ minWidth: 0 }}>
              <div className="dau-app-tieu-de">{muc?.ten ?? 'Chấm công'}</div>
              {muc?.phu !== undefined && <div className="dau-app-phu">{muc.phu}</div>}
            </div>
          </div>

          <div className="dau-app-nut">
            <button
              className="nut-tron"
              onClick={() => dat_che_do(dang_toi(che_do) ? 'sang' : 'toi')}
              aria-label={dang_toi(che_do) ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              title={
                che_do === 'may'
                  ? 'Đang theo cài đặt máy — bấm để chọn thủ công'
                  : che_do === 'toi' ? 'Giao diện tối' : 'Giao diện sáng'
              }
            >
              <i className={dang_toi(che_do) ? 'bt bt-sun' : 'bt bt-moon'} aria-hidden="true" />
            </button>
            <div className="anh-dai-dien" title={nd?.ho_ten ?? ''} aria-hidden="true">
              {chu_dau}
            </div>
          </div>
        </header>

        <div className="noi-dung">
          <NoiDung duong_dan={duong_dan} />
        </div>
      </main>
    </div>
  );
}

export function App(): ReactNode {
  // Buoc lai render sau khi dang nhap/dang xuat de doc lai trang thai phien.
  const [lan, dat_lan] = useState(0);
  // Chua doc xong phan neo cua URL thi chua biet da dang nhap hay chua — ve trang dang
  // nhap trong luc do se nhap nhay mot nhip roi bien mat.
  const [dang_doc_neo, dat_dang_doc_neo] = useState(() => window.location.hash !== '');
  const [loi_sso, dat_loi_sso] = useState<string | null>(null);

  // Quay ve tu Microsoft: token nam trong phan neo cua URL.
  useEffect(() => {
    if (!dang_doc_neo) return;
    void nhan_phien_tu_neo()
      .then((loi) => { dat_loi_sso(loi); })
      .catch(() => { dat_loi_sso('Không hoàn tất được đăng nhập Microsoft.'); })
      .finally(() => { dat_dang_doc_neo(false); dat_lan((n) => n + 1); });
  }, [dang_doc_neo]);

  const nd = nguoi_dung_hien_tai();

  if (dang_doc_neo) return <div className="dang-tai-toan-trang">Đang hoàn tất đăng nhập…</div>;

  if (!da_dang_nhap()) {
    return <TrangDangNhap khi_xong={() => dat_lan(lan + 1)} loi_sso={loi_sso} />;
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
