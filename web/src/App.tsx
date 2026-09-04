import { useEffect, useState, type ReactNode } from 'react';
import {
  cau_hinh_dang_nhap, da_dang_nhap, dang_xuat, di_cong_dang_nhap, doc_token_cong, dung_cong_sso,
  la_admin, la_nhan_su, la_quan_tri, la_nguoi_duyet, goc_nhin, dat_goc_nhin, type GocNhin,
  nap_phien_cong, nguoi_dung_hien_tai, nhan_phien_tu_neo,
} from './api.ts';
import { CungCapTuyen, LienKet, dung_tuyen } from './dinh_tuyen.tsx';
import { CungCapTieuDe, DuongMon, type TieuDeTrang } from './tieu_de_trang.tsx';
import { DangTai, TEN_VAI_TRO } from './thanh_phan.tsx';
import { ChonMucCaiDat, TrangCaiDat } from './trang/cai_dat_tong.tsx';
import { TrangChoDuyet, TrangDangNhap, TrangDoiMatKhau } from './trang/dang_nhap.tsx';
import { TrangDashboard } from './trang/dashboard.tsx';
import { TrangBangCong } from './trang/bang_cong.tsx';
import { TrangNhanVien } from './trang/nhan_vien.tsx';
import { TrangThietBi } from './trang/thiet_bi.tsx';
import { TrangDuyetDon } from './trang/duyet_don.tsx';
import { TrangCaLam, TrangDiaDiem, TrangNgayLe } from './trang/cai_dat.tsx';
import { TrangLanQuet } from './trang/lan_quet.tsx';
import { TrangNguoiDung, TrangNhatKy } from './trang/nguoi_dung.tsx';
import { TrangKhoaApi } from './trang/khoa_api.tsx';
import { TrangThamSoLuong } from './trang/tham_so_luong.tsx';
import { TrangRaVao } from './trang/ra_vao.tsx';
import { TrangKyLuatViPham } from './trang/ky_luat_vi_pham.tsx';
import { TrangLuongPhuCap } from './trang/luong_phu_cap.tsx';
import { TrangDonCuaToi } from './trang/don_cua_toi.tsx';
import { TrangKpi } from './trang/kpi.tsx';
import { TrangDongBoErp } from './trang/dong_bo_erp.tsx';
import { TrangHoSo } from './trang/ho_so.tsx';
import { TrangKhoTep } from './trang/kho_tep.tsx';
import { TrangMaDinhDanh } from './trang/ma_dinh_danh.tsx';
import { KhungHuongDan } from './thanh_phan_huong_dan.tsx';
import { TrangHopDong } from './trang/hop_dong.tsx';
import { TrangDashboardCaNhan } from './trang/dashboard_ca_nhan.tsx';
import { TrangCaNhan } from './trang/ca_nhan.tsx';
import { TrangHoSoToi } from './trang/ho_so_toi.tsx';
import { TrangPhieuLuongToi } from './trang/phieu_luong_toi.tsx';
import { TrangThongBaoCaNhan } from './trang/thong_bao_ca_nhan.tsx';
import { TrangVanBan } from './trang/van_ban.tsx';
import { TroLyCaNhan } from './trang/tro_ly.tsx';
import { ChuongBao } from './trang/chuong_bao.tsx';

interface MucMenu {
  duong_dan: string;
  ten: string;
  /** Ten icon Tabler (xem web/src/icon.css). */
  icon: string;
  nhom: string;
  /** Dong phu tren header khi o trang nay. */
  phu?: string;
  /**
   * Vai tro toi thieu de thay muc nay.
   * - 'quan_tri': nhan su/admin, VA truong phong duoc admin cap quyen xem (view-only, loc theo phong).
   * - 'nhan_su' : chi nhan su/admin (an voi truong phong duoc cap quyen — vd luong, cai dat).
   */
  quyen?: 'nhan_su' | 'admin' | 'nguoi_duyet' | 'quan_tri';
  /** Hien o GOC NHIN CA NHAN (viec cua chinh minh). Khong danh dau = chi hien o goc nhin Quan tri. */
  ca_nhan?: boolean;
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
  // Truy cap nhanh (khong nhom): trang tong quan + cong vao Khu vuc ca nhan.
  { duong_dan: '/', ten: 'Tổng quan', icon: 'layout-dashboard', nhom: '', phu: 'Tình hình chấm công hôm nay', ca_nhan: true },
  { duong_dan: '/ca-nhan', ten: 'Khu vực của tôi', icon: 'circle-check', nhom: '', phu: 'Chấm công, đơn từ và hồ sơ của bạn', ca_nhan: true },

  // Cua toi: viec tu phuc vu cua chinh nguoi dang nhap.
  { duong_dan: '/don-cua-toi', ten: 'Đơn của tôi', icon: 'file-text', nhom: 'Của tôi', phu: 'Xin nghỉ phép, giải trình', ca_nhan: true },
  { duong_dan: '/phieu-luong-toi', ten: 'Phiếu lương', icon: 'download', nhom: 'Của tôi', phu: 'Phiếu lương hàng tháng của bạn', ca_nhan: true },
  { duong_dan: '/ho-so-toi', ten: 'Hồ sơ của tôi', icon: 'user-check', nhom: 'Của tôi', phu: 'Thông tin & liên hệ cá nhân', ca_nhan: true },
  { duong_dan: '/thong-bao', ten: 'Thông báo', icon: 'star', nhom: 'Của tôi', phu: 'Thông báo từ BGĐ & nhân sự', ca_nhan: true },
  { duong_dan: '/van-ban', ten: 'Văn bản công ty', icon: 'list-details', nhom: 'Của tôi', phu: 'Nội quy, biểu mẫu, chính sách', ca_nhan: true },

  // Cham cong: log may + tong hop cong + canh bao ra/vao.
  { duong_dan: '/lan-quet', ten: 'Chấm công', icon: 'fingerprint', nhom: 'Chấm công', phu: 'Log đồng bộ từ máy ADMS', quyen: 'nhan_su' },
  { duong_dan: '/bang-cong', ten: 'Bảng công', icon: 'calendar-stats', nhom: 'Chấm công', phu: 'Tổng hợp theo tháng', quyen: 'quan_tri' },
  { duong_dan: '/ra-vao', ten: 'Ra/vào', icon: 'clock-exclamation', nhom: 'Chấm công', phu: 'Cảnh báo ra/vào & xử lý', quyen: 'nhan_su' },

  // Nhan su & luong: quan tri ho so nguoi lao dong.
  { duong_dan: '/nhan-vien', ten: 'Nhân viên', icon: 'users', nhom: 'Nhân sự & lương', phu: 'Hồ sơ, PIN máy, tài khoản', quyen: 'quan_tri' },
  { duong_dan: '/duyet-don', ten: 'Duyệt đơn', icon: 'plane-departure', nhom: 'Nhân sự & lương', phu: 'Đơn từ & duyệt', quyen: 'nguoi_duyet', ca_nhan: true },
  { duong_dan: '/kpi', ten: 'KPI', icon: 'chart-bar', nhom: 'Nhân sự & lương', phu: 'Chấm điểm từ dữ liệu thật', quyen: 'nhan_su' },
  { duong_dan: '/ky-luat', ten: 'Kỷ luật & vi phạm', icon: 'alert-triangle', nhom: 'Nhân sự & lương', phu: 'Nội quy, nhắc nhở, giảm thưởng', quyen: 'quan_tri' },
  { duong_dan: '/bang-luong', ten: 'Lương & phụ cấp', icon: 'receipt-2', nhom: 'Nhân sự & lương', phu: 'Bảng lương, chính sách phụ cấp', quyen: 'nhan_su' },
  { duong_dan: '/hop-dong', ten: 'Hợp đồng', icon: 'file-certificate', nhom: 'Nhân sự & lương', phu: 'Hạn hợp đồng, tìm trong nội dung', quyen: 'nhan_su' },

  { duong_dan: '/cai-dat', ten: 'Cài đặt', icon: 'settings', nhom: 'Hệ thống', phu: 'Chấm công, lương, tài khoản, tích hợp', quyen: 'nhan_su' },
];

/**
 * Cac muc CON cua trang Cai dat.
 *
 * VI SAO GOM: 11 muc cau hinh nam thang tren thanh ben lam no dai gap doi phan viec hang ngay,
 * va nguoi dung phai quet qua "Khoa API" moi lan tim "Bang cong". Cau hinh la thu sua vai lan
 * mot nam; viec hang ngay la thu mo vai lan mot ngay. Hai loai do khong nen cung mot cap.
 *
 * DUONG DAN CON GIU RIENG (`/cai-dat/thiet-bi`) chu khong phai tab trong mot trang: bookmark,
 * Ctrl-click, va nut Lui cua trinh duyet deu phai chay. Duong dan CU van song — xem
 * `CHUYEN_HUONG` ben duoi.
 *
 * Bang nay o LAI App.tsx cung `MENU` vi ca hai deu la dieu huong, va bai kiem
 * `thiet_ke/huong_dan.test.mjs` doc `duong_dan:` tu chinh tep nay de doi chieu voi bang huong
 * dan. Chuyen no sang tep khac la lam mat cai doi chieu do ma khong co gi bao.
 */
const MENU_CAI_DAT: MucMenu[] = [
  { duong_dan: '/cai-dat/thiet-bi', ten: 'Thiết bị', icon: 'device-desktop', nhom: 'Chấm công', phu: 'Máy chấm công ZKTeco', quyen: 'nhan_su' },
  { duong_dan: '/cai-dat/ca-lam', ten: 'Ca làm việc', icon: 'clock', nhom: 'Chấm công', phu: 'Giờ vào/ra, dung sai, ngưỡng OT' },
  { duong_dan: '/cai-dat/dia-diem', ten: 'Địa điểm', icon: 'map-pin', nhom: 'Chấm công', phu: 'Đối chiếu GPS khi đi công tác' },
  { duong_dan: '/cai-dat/ngay-le', ten: 'Ngày lễ', icon: 'star', nhom: 'Chấm công', phu: 'Tết Nguyên đán phải tự thêm mỗi năm' },

  { duong_dan: '/cai-dat/tham-so-luong', ten: 'Tham số lương', icon: 'receipt-2', nhom: 'Nhân sự & lương', phu: 'BHXH, thuế TNCN, giảm trừ gia cảnh', quyen: 'nhan_su' },

  { duong_dan: '/cai-dat/tai-khoan', ten: 'Tài khoản', icon: 'user-check', nhom: 'Tài khoản & bảo mật', phu: 'Người dùng và vai trò', quyen: 'admin' },
  { duong_dan: '/cai-dat/khoa-api', ten: 'Khóa API', icon: 'lock', nhom: 'Tài khoản & bảo mật', phu: 'Cho hệ thống ngoài gọi vào', quyen: 'admin' },
  { duong_dan: '/cai-dat/nhat-ky', ten: 'Nhật ký thao tác', icon: 'list-details', nhom: 'Tài khoản & bảo mật', phu: 'Ai sửa gì, khi nào', quyen: 'admin' },

  { duong_dan: '/cai-dat/dong-bo-erp', ten: 'Đồng bộ ERP', icon: 'refresh', nhom: 'Tích hợp & dữ liệu', phu: 'Kéo người dùng từ ERP cũ', quyen: 'admin' },
  { duong_dan: '/cai-dat/kho-tep', ten: 'Kho tệp hồ sơ', icon: 'file-text', nhom: 'Tích hợp & dữ liệu', phu: 'Tệp đính kèm và đường dẫn đã lưu', quyen: 'nhan_su' },
  { duong_dan: '/cai-dat/ma-dinh-danh', ten: 'Mã định danh', icon: 'search', nhom: 'Tích hợp & dữ liệu', phu: 'Tra cứu theo mã, đối soát các nguồn', quyen: 'nhan_su' },
];

/**
 * Duong dan cu -> duong dan moi.
 *
 * 11 trang cau hinh doi duong dan khi gom vao Cai dat. Nguoi dung da bookmark
 * `/tham-so-luong`, da dan `/thiet-bi` vao mot ghi chu noi bo, va tai lieu trong repo con nhac
 * ten cu. Tra 404 cho ho la mot loi ta tu gay ra, nen duong cu chuyen huong sang duong moi
 * (thay the trong lich su, de nut Lui khong ket giua hai duong).
 */
const CHUYEN_HUONG: Record<string, string> = {
  '/thiet-bi': '/cai-dat/thiet-bi',
  '/ca-lam': '/cai-dat/ca-lam',
  '/dia-diem': '/cai-dat/dia-diem',
  '/ngay-le': '/cai-dat/ngay-le',
  '/tham-so-luong': '/cai-dat/tham-so-luong',
  '/tai-khoan': '/cai-dat/tai-khoan',
  '/khoa-api': '/cai-dat/khoa-api',
  '/nhat-ky': '/cai-dat/nhat-ky',
  '/dong-bo-erp': '/cai-dat/dong-bo-erp',
  '/kho-tep': '/cai-dat/kho-tep',
  '/ma-dinh-danh': '/cai-dat/ma-dinh-danh',
};

function duoc_xem(m: MucMenu): boolean {
  if (m.quyen === 'admin') return la_admin();
  if (m.quyen === 'nhan_su') return la_nhan_su();
  if (m.quyen === 'quan_tri') return la_quan_tri();
  if (m.quyen === 'nguoi_duyet') return la_nguoi_duyet();
  return true;
}

/** Muc menu dang mo — ke ca khi duong dan la trang con cua no. */
function muc_dang_mo(duong_dan: string, cac_muc: MucMenu[]): MucMenu | null {
  return cac_muc.find((m) => m.duong_dan === duong_dan)
    ?? cac_muc.find((m) => m.duong_dan !== '/' && duong_dan.startsWith(`${m.duong_dan}/`))
    ?? null;
}

const RE_HO_SO = /^\/nhan-vien\/([0-9a-f-]{36})$/i;

function NoiDung({ duong_dan, ca_nhan }: { duong_dan: string; ca_nhan: boolean }): ReactNode {
  // Tuyen co tham so duy nhat cua app. Bat truoc switch vi switch chi so khop chinh xac.
  const ho_so = RE_HO_SO.exec(duong_dan);
  if (ho_so !== null) return <TrangHoSo nhan_vien_id={ho_so[1] as string} />;

  // Duong dan cu: `BoCuc` dang chuyen huong trong mot hieu ung. Ve o cho de khong nhay qua
  // "Không có trang này" mot khung hinh roi moi doi.
  if (CHUYEN_HUONG[duong_dan] !== undefined) return <DangTai />;

  if (duong_dan === '/cai-dat' || duong_dan.startsWith('/cai-dat/')) {
    return <KhungCaiDat duong_dan={duong_dan} />;
  }

  switch (duong_dan) {
    // Goc nhin Ca nhan: Tong quan la dashboard CUA CHINH MINH, khong phai toan cong ty. Nguoi
    // khong co quyen quan tri luon o goc Ca nhan (api.ts goc_nhin), nen ho khong bao gio thay
    // dashboard toan cong ty — vua la yeu cau nghiep vu vua la NĐ 13/2023.
    case '/ca-nhan': return <TrangCaNhan />;
    case '/': return ca_nhan ? <TrangDashboardCaNhan /> : <TrangDashboard />;
    case '/thong-bao': return <TrangThongBaoCaNhan />;
    case '/van-ban': return <TrangVanBan />;
    case '/ho-so-toi': return <TrangHoSoToi />;
    case '/phieu-luong-toi': return <TrangPhieuLuongToi />;
    case '/don-cua-toi': return <TrangDonCuaToi />;
    case '/bang-cong': return <TrangBangCong />;
    case '/lan-quet': return <TrangLanQuet />;
    case '/duyet-don': return <TrangDuyetDon />;
    case '/nhan-vien': return <TrangNhanVien />;
    case '/bang-luong': return la_nhan_su() ? <TrangLuongPhuCap /> : <KhongCoQuyen />;
    case '/ra-vao': return la_nhan_su() ? <TrangRaVao /> : <KhongCoQuyen />;
    case '/ky-luat': return la_quan_tri() ? <TrangKyLuatViPham /> : <KhongCoQuyen />;
    case '/kpi': return <TrangKpi />;
    case '/hop-dong': return la_nhan_su() ? <TrangHopDong /> : <KhongCoQuyen />;
    default: return <KhongTimThay duong_dan={duong_dan} />;
  }
}

/** Trang cua tung muc con trong Cai dat. Tach ra de `KhungCaiDat` chi lo phan vo. */
function NoiDungCaiDat({ duong_dan }: { duong_dan: string }): ReactNode {
  switch (duong_dan) {
    case '/cai-dat/thiet-bi': return <TrangThietBi />;
    case '/cai-dat/ca-lam': return <TrangCaLam />;
    case '/cai-dat/dia-diem': return <TrangDiaDiem />;
    case '/cai-dat/ngay-le': return <TrangNgayLe />;
    case '/cai-dat/tham-so-luong': return <TrangThamSoLuong />;
    case '/cai-dat/tai-khoan': return <TrangNguoiDung />;
    case '/cai-dat/khoa-api': return <TrangKhoaApi />;
    case '/cai-dat/nhat-ky': return <TrangNhatKy />;
    case '/cai-dat/dong-bo-erp': return <TrangDongBoErp />;
    case '/cai-dat/kho-tep': return <TrangKhoTep />;
    case '/cai-dat/ma-dinh-danh': return <TrangMaDinhDanh />;
    default: return <KhongTimThay duong_dan={duong_dan} />;
  }
}

/**
 * Vo cua khu Cai dat: sub-nav ben trai + noi dung muc con ben phai.
 *
 * Phan quyen kiem o DAY chu khong phai trong `NoiDungCaiDat`: mot cho duy nhat doc `quyen` cua
 * bang `MENU_CAI_DAT`, nen them mot muc con moi chi phai khai quyen mot lan. Truoc day moi
 * `case` tu goi `la_admin()` / `la_nhan_su()`, va mot `case` quen goi thi khong co gi bao.
 */
function KhungCaiDat({ duong_dan }: { duong_dan: string }): ReactNode {
  const cac_muc = MENU_CAI_DAT.filter(duoc_xem);
  const muc = MENU_CAI_DAT.find((m) => m.duong_dan === duong_dan) ?? null;

  let ben_trong: ReactNode;
  if (duong_dan === '/cai-dat') ben_trong = <ChonMucCaiDat cac_muc={cac_muc} />;
  else if (muc === null) ben_trong = <KhongTimThay duong_dan={duong_dan} />;
  else if (!duoc_xem(muc)) ben_trong = <KhongCoQuyen />;
  else ben_trong = <NoiDungCaiDat duong_dan={duong_dan} />;

  return (
    <TrangCaiDat cac_muc={cac_muc} duong_dan={duong_dan} muc={muc}>
      {ben_trong}
    </TrangCaiDat>
  );
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
  const { duong_dan, di_toi } = dung_tuyen();
  const nd = nguoi_dung_hien_tai();
  const [dang_doi_mk, dat_dang_doi_mk] = useState(false);
  const [ben_mo, dat_ben_mo] = useState(false);
  const [che_do, dat_che_do] = useState<CheDo>(doc_che_do);
  const [gn, dat_gn] = useState<GocNhin>(goc_nhin);
  // Tieu de do TRANG dat (vd ten nhan vien tren trang ho so). `null` = dung nhan cua MENU.
  const [tieu_de_trang, dat_tieu_de_trang] = useState<TieuDeTrang | null>(null);

  const doi_goc_nhin = (moi: GocNhin): void => {
    dat_goc_nhin(moi);
    dat_gn(moi);
    // Ca hai goc nhin deu dung Trang chu: quan tri -> bang tong quan, ca nhan -> khu vuc
    // cua toi (vo mau thiet ke).
    di_toi('/');
  };

  useEffect(() => {
    ap_che_do(che_do);
    if (che_do === 'may') localStorage.removeItem(KHOA_CHE_DO);
    else localStorage.setItem(KHOA_CHE_DO, che_do);
  }, [che_do]);

  // Dong thanh ben khi doi trang: o man nho no dang phu len noi dung.
  useEffect(() => { dat_ben_mo(false); }, [duong_dan]);

  // Duong dan cu cua 11 trang cau hinh -> duong dan moi trong Cai dat. `thay_the = true` de
  // nut Lui khong ket giua duong cu va duong moi.
  useEffect(() => {
    const moi = CHUYEN_HUONG[duong_dan];
    if (moi !== undefined) di_toi(moi, true);
  }, [duong_dan, di_toi]);

  if (dang_doi_mk) {
    return (
      <TrangDoiMatKhau
        bat_buoc={false}
        khi_xong={() => window.location.assign('/')}
      />
    );
  }

  // Trang "Khu vuc cua toi" chiem TOAN MAN HINH bang vo rieng cua mau thiet ke (thanh ben
  // toi + 5 tab + tab duoi tren man hep). O goc nhin Ca nhan, Trang chu CHINH LA trang nay —
  // khong con vo chung co thanh ben quan tri. Nguoi co quyen quan tri co nut quay lai.
  if (duong_dan === '/ca-nhan' || (gn === 'ca_nhan' && duong_dan === '/')) {
    return (
      <TrangCaNhan
        ve_quan_tri={la_quan_tri() ? () => doi_goc_nhin('quan_tri') : undefined}
        di_duyet={() => {
          // Duyet don la viec quan tri: doi HAN sang vo quan tri (khong de vo nua ca nhan nua
          // quan tri), roi toi thang man Duyet don. Nguoi duyet khong co quyen quan tri thi giu
          // goc nhin ca nhan — /duyet-don van hien voi ho vi muc menu co ca_nhan = true.
          if (la_quan_tri()) { dat_goc_nhin('quan_tri'); dat_gn('quan_tri'); }
          di_toi('/duyet-don');
        }}
      />
    );
  }

  // Goc nhin Ca nhan chi hien viec cua chinh minh (Tong quan, Don cua toi, Duyet don). Goc nhin
  // Quan tri hien het (theo quyen). Nguoi khong co quyen quan tri luon o Ca nhan.
  const duoc_thay = MENU.filter(duoc_xem).filter((m) => gn === 'quan_tri' || m.ca_nhan === true);
  const nhom_menu = [...new Set(duoc_thay.map((m) => m.nhom))];
  // Khop theo TIEN TO: `/nhan-vien/<uuid>` va `/cai-dat/khoa-api` deu phai lam sang muc cha
  // cua no. Truoc day chi so khop chinh xac, nen trang ho so khong muc nao sang va tieu de
  // header roi ve "Chấm công".
  const muc = muc_dang_mo(duong_dan, duoc_thay);
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
                  lop={muc?.duong_dan === m.duong_dan ? 'dang-chon' : undefined}
                >
                  <i className={`bt bt-${m.icon}`} aria-hidden="true" /> {m.ten}
                </LienKet>
              ))}
            </div>
          ))}
        </nav>

        <div className="chan-thanh-ben">
          {la_quan_tri() && (
            <div className="chuyen-goc-nhin" role="group" aria-label="Chuyển góc nhìn">
              <button className={gn === 'quan_tri' ? 'dang-chon' : undefined}
                onClick={() => doi_goc_nhin('quan_tri')}>Quản trị</button>
              <button className={gn === 'ca_nhan' ? 'dang-chon' : undefined}
                onClick={() => doi_goc_nhin('ca_nhan')}>Cá nhân</button>
            </div>
          )}
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
              {tieu_de_trang?.duong_mon !== undefined && (
                <DuongMon cac_chang={tieu_de_trang.duong_mon} />
              )}
              <div className="dau-app-tieu-de">
                {tieu_de_trang?.tieu_de ?? muc?.ten ?? 'Chấm công'}
              </div>
              {(tieu_de_trang?.phu ?? muc?.phu) !== undefined && (
                <div className="dau-app-phu">{tieu_de_trang?.phu ?? muc?.phu}</div>
              )}
            </div>
          </div>

          <div className="dau-app-nut">
            <ChuongBao />
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
          {/*
            Huong dan ve o DAY, mot cho cho ca 20 trang. Chen vao tung trang thi som muon co
            trang quen, va cai quen do khong bao gio do test.
          */}
          <KhungHuongDan key={duong_dan} duong_dan={duong_dan} />
          <CungCapTieuDe dat={dat_tieu_de_trang}>
            <NoiDung duong_dan={duong_dan} ca_nhan={gn === 'ca_nhan'} />
          </CungCapTieuDe>
        </div>
        {gn === 'ca_nhan' && <TroLyCaNhan />}
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
  // Chua hoi may chu xong thi CHUA BIET he thong con duong dang nhap rieng hay khong. Ve
  // trang dang nhap trong luc do la hien dung cai man hinh ma buoc 3 muon bo — dung mot nhip,
  // nhung du de nguoi dung go mat khau cong ty vao dung cho khong nen go.
  const [dang_hoi_cau_hinh, dat_dang_hoi_cau_hinh] = useState(true);
  const [loi_cong, dat_loi_cong] = useState<string | null>(null);

  // Khoi dong: hoi may chu con duong dang nhap rieng hay khong. Neu KHONG thi lay token cua
  // cong tu localStorage; khong co token thi ve cong dang nhap, co ma chua duoc cap quyen thi
  // hien man hinh giai thich — KHONG day ve trang dang nhap, vi ho da dang nhap that roi.
  useEffect(() => {
    let con_gan = true;
    void (async () => {
      await cau_hinh_dang_nhap();
      if (!con_gan) return;
      if (dung_cong_sso() && !da_dang_nhap()) {
        if (doc_token_cong() === null) { di_cong_dang_nhap(); return; }
        const loi = await nap_phien_cong();
        if (!con_gan) return;
        if (loi !== null) { dat_loi_cong(loi); }
        else if (!da_dang_nhap()) { di_cong_dang_nhap(); return; }
      }
      dat_dang_hoi_cau_hinh(false);
      dat_lan((n) => n + 1);
    })();
    return () => { con_gan = false; };
  }, []);

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
  if (dang_hoi_cau_hinh && loi_cong === null) {
    return <div className="dang-tai-toan-trang">Đang kiểm tra phiên đăng nhập…</div>;
  }

  // Da dang nhap o cong nhung chua duoc cap quyen o phan he nay. Man hinh giai thich, KHONG
  // phai form dang nhap: dang nhap lai bao nhieu lan cung khong lam xuat hien mot quyen.
  if (loi_cong !== null) {
    return (
      <div className="vo-dang-nhap">
        <div className="the-dang-nhap">
          <h1>Chấm công</h1>
          <div className="hop-luu-y" style={{ marginTop: 16 }}>{loi_cong}</div>
        </div>
      </div>
    );
  }

  if (!da_dang_nhap()) {
    // O che do cong thi khong bao gio toi day: khong co token la da chuyen huong o tren.
    if (dung_cong_sso()) { di_cong_dang_nhap(); return null; }
    return <TrangDangNhap khi_xong={() => dat_lan(lan + 1)} loi_sso={loi_sso} />;
  }

  // Da xac thuc nhung chua duoc phan quyen: khong vao duoc man nao ca.
  if (nd !== null && nd.vai_tro === 'cho_duyet') {
    return <TrangChoDuyet ten={nd.ho_ten ?? nd.ten_dang_nhap} khi_thoat={() => {
      dang_xuat(); dat_lan(lan + 1);
    }} />;
  }

  // Tai khoan moi tao / vua duoc dat lai mat khau: bat buoc doi truoc khi vao he thong.
  //
  // `!dung_cong_sso()` KHONG phai thua, va bo no ra la mot cai bay chet nguoi: o che do cong,
  // may chu tra 410 cho `/doi-mat-khau`, nen mot tai khoan cu con co `phai_doi_mat_khau = true`
  // se thay man hinh bat buoc doi mat khau ma khong bao gio doi duoc — vao he thong khong duoc,
  // ma cung khong co duong nao thoat. Mat khau da thuoc cong quan ly.
  if (nd !== null && nd.phai_doi_mat_khau && !dung_cong_sso()) {
    return <TrangDoiMatKhau bat_buoc khi_xong={() => dat_lan(lan + 1)} />;
  }

  return (
    <CungCapTuyen>
      <BoCuc />
    </CungCapTuyen>
  );
}
