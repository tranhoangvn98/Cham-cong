// Khu vuc cua toi — giao dien ca nhan cho tung nhan vien tren web.
//
// Ban goc la mau thiet ke offline "Giao dien ca nhan". Noi dung gom nam man: Trang chu,
// Bang cong, Don tu, Luong, Ca nhan — tat ca deu doc du lieu cua CHINH nguoi dang xem qua
// API self-service `/api/toi/*` (cung bo API ma app dien thoai dung, xem may_chu/src/tuyen/toi.ts).
//
// May chu la NGUON SU THAT ve quyen: route `/api/toi/*` khong nhan nhan_vien_id nao, chi tra
// du lieu cua tai khoan dang dang nhap. Trang nay khong tu loc gi them.
//
// Chuoi hien thi cho nhan vien viet co dau; ten bien/ham viet khong dau theo quy uoc du an.
import { Component, useEffect, useState, type ReactNode } from 'react';
import { dang_xuat, doi_mat_khau, goi, goc_api_tuyet_doi, gui_tep, mui_gio_offset_gio } from '../api.ts';
import { TrangThongBaoCaNhan } from './thong_bao_ca_nhan.tsx';
import { TrangPhieuLuongToi, TrangKhieuNaiToi } from './phieu_luong_toi.tsx';
import { YKienToi } from './y_kien_toi.tsx';
import { ViecToi } from './viec_toi.tsx';
import { TrangVanBan } from './van_ban.tsx';
import { ChuongBao } from './chuong_bao.tsx';
import { dung_tuyen } from '../dinh_tuyen.tsx';
import { dung_chuoi, tra_hien_tai, type ChuoiKhoa } from '../chuoi/chi_muc.tsx';

/**
 * Ranh gioi loi: mot man con vo (throw khi render) thi CHI man do bao loi, khong lam trang
 * ca ung dung. Truoc day mot loi nho o tab Ca nhan lam toan bo Khu vuc cua toi trang xoa.
 * Hien luon ca `message` de nguoi dung doc lai cho nhan su / dev, khong phai mo cong cu nha
 * phat trien. Dat `key` theo man dang xem o noi dung -> doi man la dung lai tu dau, khong ket
 * o trang thai loi.
 */
class RanhGioiLoi extends Component<{ children: ReactNode }, { loi: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { loi: null };
  }

  static getDerivedStateFromError(loi: Error): { loi: Error } {
    return { loi };
  }

  render(): ReactNode {
    if (this.state.loi !== null) {
      return (
        <div className="the" style={{ margin: 16 }}>
          <h2>{tra_hien_tai('cn_loi_man_hinh')}</h2>
          <p className="mo-ta">
            {tra_hien_tai('cn_loi_man_hinh_mo_ta')}
          </p>
          <pre className="chu-ma" style={{
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12,
            background: 'var(--nen-mo)', padding: 12, borderRadius: 8, marginTop: 8,
          }}>{this.state.loi.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
import {
  HopLoi, HopThoai, OSo, Trong, XuongDanhSach, OKeoTep,
  dung_hanh_dong, dung_nap, dung_xac_nhan,
  gio_ngan, hom_nay, ngay_viet, phut_thanh_chu, thang_nay, thu_cua_ngay,
  NhanDon, TEN_NGUON,
} from '../thanh_phan.tsx';

// ==================================================================== kieu du lieu

interface LanQuetToi {
  id: string;
  thoi_diem: string;
  trang_thai: number;
  nguon: string;
  trang_thai_duyet: string;
  nhan_trang_thai: string;
  nhan_xac_thuc: string;
}

interface NgayTuan {
  ngay: string;
  trang_thai: string;
  phut_muon: number;
  phut_lam: number;
  so_cong: string;
}

interface TongHopThang {
  tong_cong: string;
  tong_phut_lam: number;
  tong_phut_ot: number;
  tong_phut_muon: number;
  tong_phut_ve_som: number;
  so_lan_di_muon: number;
  so_lan_ve_som: number;
  so_ngay_vang: number;
  so_ngay_co_mat: number;
  so_ngay_nghi_phep: number;
  so_ngay_le: number;
  so_ngay_phai_lam: number;
  so_ngay_da_chot: number;
  so_ngay_co_du_lieu: number;
}

interface HomNay {
  ngay: string;
  dau_tuan: string;
  thang: string;
  nhan_vien: {
    ho_ten: string;
    ma_nv: string;
    duoc_cham_cong_dien_thoai: boolean;
    ca_lam: string | null;
    ca_gio_vao: string | null;
    ca_gio_ra: string | null;
  } | null;
  bang_cong: {
    trang_thai: string;
    gio_vao: string | null;
    gio_ra: string | null;
    phut_lam: number;
    phut_muon: number;
    phut_ve_som: number;
    phut_ot: number;
    so_cong: number;
    ghi_chu: string | null;
  } | null;
  tuan: NgayTuan[];
  thang_tong_hop: TongHopThang | null;
  phep: { quy: number; da_dung: number; con_lai: number; cho_duyet: number } | null;
  can_chu_y: {
    don_cua_toi_cho_duyet: number;
    don_cho_toi_duyet: number;
    hop_dong_sap_het_han: null;
  } | null;
  lan_quet: LanQuetToi[];
}

interface NgayCongNgay {
  ngay: string;
  trang_thai: string;
  gio_vao: string | null;
  gio_ra: string | null;
  phut_lam: number;
  phut_muon: number;
  phut_ve_som: number;
  phut_ot: number;
  so_cong: string;
  co_dieu_chinh: boolean;
  da_chot: boolean;
  ghi_chu: string | null;
}

interface BangCongThang {
  thang: string;
  tong_hop: TongHopThang;
  ngay: NgayCongNgay[];
}

interface DonNghiPhep {
  id: string;
  loai: string;
  tu_ngay: string;
  den_ngay: string;
  nua_ngay: boolean;
  ly_do: string | null;
  trang_thai: string;
  ghi_chu_duyet: string | null;
}

interface DonGiaiTrinh {
  id: string;
  ngay: string;
  gio_vao_de_xuat: string | null;
  gio_ra_de_xuat: string | null;
  ly_do: string;
  trang_thai: string;
  ghi_chu_duyet: string | null;
}

interface DonKhac {
  id: string;
  loai: string;
  tu_ngay: string;
  den_ngay: string | null;
  gio_bat_dau: string | null;
  gio_ket_thuc: string | null;
  noi_den: string | null;
  ly_do: string | null;
  trang_thai: string;
  ghi_chu_duyet: string | null;
}

interface LoaiDon {
  ma: string;
  ten: string;
  nhan_tu_ngay: string;
  co_khoang_ngay: boolean;
}

interface HoSoToi {
  nhan_vien: {
    ma_nv: string;
    ma_erp: string | null;
    ho_ten: string;
    chuc_danh: string | null;
    pin_may: string | null;
    ngay_vao: string | null;
    ngay_chinh_thuc: string | null;
    email: string | null;
    so_dien_thoai: string | null;
    so_ngay_phep_nam: number;
    duoc_cham_cong_dien_thoai: boolean;
    dang_hoat_dong: boolean;
    phong_ban: string | null;
    ca_lam: string | null;
    gio_vao: string | null;
    gio_ra: string | null;
    nguoi_quan_ly: string | null;
  } | null;
  ca_nhan: Record<string, string | null> | null;
  ten_dang_nhap: string;
  hop_dong: {
    so_hd: string | null;
    loai: string;
    chuc_danh: string | null;
    noi_lam_viec: string | null;
    ngay_ky: string | null;
    hieu_luc_tu: string;
    hieu_luc_den: string | null;
    luong_co_ban: string | null;
    trang_thai: string;
  } | null;
  luong: {
    hieu_luc_tu: string;
    luong_co_ban: string;
    phu_cap: string;
    hinh_thuc: string;
    so_quyet_dinh: string | null;
  } | null;
  nguoi_phu_thuoc: {
    ho_ten: string;
    quan_he: string;
    ngay_sinh: string | null;
    ma_so_thue: string | null;
    so_cccd: string | null;
    tu_thang: string | null;
    den_thang: string | null;
    da_dang_ky: boolean;
  }[];
  bhxh: {
    loai: string;
    thang: string;
    muc_dong: string | null;
    ty_le_phan_tram: string | null;
    so_ho_so: string | null;
    trang_thai: string;
    ngay_nop: string | null;
    ghi_chu: string | null;
  }[];
  thiet_bi: {
    loai: string;
    ten: string;
    hang: string | null;
    model: string | null;
    so_seri: string | null;
    ngay_cap: string | null;
    tinh_trang: string;
  }[];
  tai_lieu: {
    ma: string;
    ten: string;
    nhom: string;
    mo_ta: string | null;
    bat_buoc: boolean;
    chi_khi_nghi_viec: boolean;
    trang_thai: string;
    co_dong: boolean;
    ten_tep: string | null;
  }[];
}

// ==================================================================== tien ich

/** Doi chuoi/so thanh so, an toan voi gia tri null. */
function so(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** So thap phan dung dau phay nhu thoi quen Viet Nam. */
function so_viet(v: unknown): string {
  return String(so(v)).replace('.', ',');
}

/** Cong so ngay vao ngay dang YYYY-MM-DD, khong qua Date cua mui gio may xem. */
function cong_ngay(ngay: string, so_ngay: number): string {
  const [n, t, d] = ngay.split('-').map(Number);
  const moc = new Date(Date.UTC(n ?? 1970, (t ?? 1) - 1, (d ?? 1) + so_ngay));
  return moc.toISOString().slice(0, 10);
}

/** Phut hien tai trong ngay theo mui gio cua may cham cong. */
function phut_hien_tai(): number {
  const t = new Date(Date.now() + mui_gio_offset_gio() * 3600_000);
  return t.getUTCHours() * 60 + t.getUTCMinutes();
}

/** 'HH:MM' thanh phut trong ngay. */
function phut_cua_gio(g: string | null): number | null {
  if (g === null || g === '') return null;
  const [h, m] = g.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Cat chuoi gio 'HH:MM:SS' (kieu `time` cua Postgres) thanh 'HH:MM'. */
function gio_hh_mm(g: string | null | undefined): string {
  if (g === null || g === undefined || g === '') return '—';
  return g.slice(0, 5);
}

const KHOA_QUAN_HE: Record<string, ChuoiKhoa> = {
  con: 'cn_qh_con', vo_chong: 'cn_qh_vo_chong', cha: 'cn_qh_cha', me: 'cn_qh_me',
  anh_chi_em: 'cn_qh_anh_chi_em', khac: 'cn_qh_khac',
};

const KHOA_LOAI_HOP_DONG: Record<string, ChuoiKhoa> = {
  thu_viec: 'cn_hd_thu_viec', xac_dinh: 'cn_hd_xac_dinh', khong_xac_dinh: 'cn_hd_kxd',
  thoi_vu: 'cn_hd_thoi_vu', cong_tac_vien: 'cn_hd_ctv', hoc_viec: 'cn_hd_hoc_viec',
};

const KHOA_HINH_THUC_LUONG: Record<string, ChuoiKhoa> = {
  thang: 'cn_ht_thang', ngay: 'cn_ht_ngay', gio: 'cn_ht_gio', san_pham: 'cn_ht_san_pham',
  khoan: 'cn_ht_khoan',
};

const KHOA_TRANG_THAI_BHXH: Record<string, ChuoiKhoa> = {
  moi: 'cn_bh_moi', da_nop: 'cn_bh_da_nop', co_quan_duyet: 'cn_bh_cq_duyet',
  tu_choi: 'cn_bh_tu_choi', hoan_thanh: 'cn_bh_hoan_thanh',
};

const KHOA_LOAI_BHXH: Record<string, ChuoiKhoa> = {
  bao_tang: 'cn_lbh_bao_tang', bao_giam: 'cn_lbh_bao_giam', dieu_chinh: 'cn_lbh_dieu_chinh',
  chot_so: 'cn_lbh_chot_so', cap_the_bhyt: 'cn_lbh_cap_the', om_dau: 'cn_lbh_om_dau',
  thai_san: 'cn_lbh_thai_san', duong_suc: 'cn_lbh_duong_suc', tai_nan_lao_dong: 'cn_lbh_tnld',
};

/** Nhan trang thai tai lieu ho so. */
const NHAN_TT_TAI_LIEU: Record<string, { khoa: ChuoiKhoa; lop: string }> = {
  da_len_phan_mem: { khoa: 'cn_tt_da_len_phan_mem', lop: 'nhan-tot' },
  da_so_hoa: { khoa: 'cn_tt_da_so_hoa', lop: 'nhan-lanh' },
  da_co_du_lieu: { khoa: 'cn_tt_da_co_du_lieu', lop: 'nhan-lanh' },
  thieu: { khoa: 'cn_tt_thieu', lop: 'nhan-xau' },
};

/** Tinh tham nien dang '1 nam 4 thang' tu ngay vao lam. */
function tham_nien(ngay_vao: string | null): string {
  if (ngay_vao === null) return '';
  const [n, t, d] = ngay_vao.split('-').map(Number);
  const vao = Date.UTC(n ?? 1970, (t ?? 1) - 1, d ?? 1);
  const nay = new Date(Date.now() + mui_gio_offset_gio() * 3600_000);
  const hien = Date.UTC(nay.getUTCFullYear(), nay.getUTCMonth(), nay.getUTCDate());
  const thang_tong = Math.max(0, (hien - vao) / (86_400_000 * 30.44));
  const nam = Math.floor(thang_tong / 12);
  const thang = Math.round(thang_tong - nam * 12);
  if (nam === 0) return tra_hien_tai('cn_x_thang', { n: thang });
  return thang === 0
    ? tra_hien_tai('cn_x_nam', { n: nam })
    : tra_hien_tai('cn_nam_thang_x', { n: nam, m: thang });
}

/** Chu dau ho ten dung cho avatar. */
function chu_dau(ho_ten: string | null): string {
  return (ho_ten ?? '?').split(' ').filter((t) => t.length > 0)
    .slice(-2).map((t) => t[0]).join('').toUpperCase();
}

/** Dich theo khoa chuoi; khoa khong co trong tu dien thi dung chuoi thay the. */
function tra_khoa(k: ChuoiKhoa | undefined, thay: string): string {
  return k !== undefined ? tra_hien_tai(k) : thay;
}

// ==================================================================== trang goc

type Tab = 'trang_chu' | 'bang_cong' | 'don_tu' | 'luong' | 'phep' | 'khieu_nai' | 'viec' | 'y_kien' | 'ca_nhan';
type FormMo = 'nghi' | 'giai' | 'khac' | 'ot';

// Ten icon KHONG kem tien to `bt-` (giong MENU o App.tsx) — noi render tu ghep `bt bt-${icon}`.
// De ca tien to o day thi bai kiem thiet_ke/icon.test.mjs (doc `icon: '...'`) hieu nham ten icon
// la `bt-...` va bao thieu, du glyph van hien dung.
const CAC_TAB: { ma: Tab; khoa: ChuoiKhoa; icon: string }[] = [
  { ma: 'trang_chu', khoa: 'cn_tab_trang_chu', icon: 'layout-dashboard' },
  { ma: 'bang_cong', khoa: 'menu_bang_cong', icon: 'list-details' },
  { ma: 'don_tu', khoa: 'cn_tab_don_tu', icon: 'file-text' },
  { ma: 'luong', khoa: 'cn_tab_luong', icon: 'receipt-2' },
  { ma: 'phep', khoa: 'cn_tab_phep', icon: 'calendar-stats' },
  { ma: 'khieu_nai', khoa: 'cn_tab_khieu_nai', icon: 'alert-triangle' },
  { ma: 'viec', khoa: 'menu_cong_viec', icon: 'check' },
  { ma: 'y_kien', khoa: 'menu_ho_thu_y_kien', icon: 'users' },
  { ma: 'ca_nhan', khoa: 'cn_tab_ca_nhan', icon: 'user-check' },
];

/**
 * Duong dan <-> tab. Khu vuc cua toi la vo ca nhan DUY NHAT: tro ly, chuong bao va lien ket
 * noi khac deu mo DUNG TAB bang duong dan con (`/ca-nhan/luong`), thay vi trang doc lap cu.
 * Nho vay nut Lui/Tien cua trinh duyet chay dung va URL co the bookmark duoc.
 */
const DUONG_TAB: Record<string, Tab> = {
  '/ca-nhan': 'trang_chu',
  '/ca-nhan/bang-cong': 'bang_cong',
  '/ca-nhan/don-tu': 'don_tu',
  '/ca-nhan/luong': 'luong',
  '/ca-nhan/phep': 'phep',
  '/ca-nhan/khieu-nai': 'khieu_nai',
  '/ca-nhan/viec': 'viec',
  '/ca-nhan/y-kien': 'y_kien',
  '/ca-nhan/ca-nhan': 'ca_nhan',
};

const TAB_DUONG: Record<Tab, string> = {
  trang_chu: '/ca-nhan',
  bang_cong: '/ca-nhan/bang-cong',
  don_tu: '/ca-nhan/don-tu',
  luong: '/ca-nhan/luong',
  phep: '/ca-nhan/phep',
  khieu_nai: '/ca-nhan/khieu-nai',
  viec: '/ca-nhan/viec',
  y_kien: '/ca-nhan/y-kien',
  ca_nhan: '/ca-nhan/ca-nhan',
};

/** Tieu de + phu de cua cac man con, theo mau thiet ke. Trang chu tinh rieng vi co ten. */
const TEN_MAN: Record<Exclude<Tab, 'trang_chu'>, [ChuoiKhoa, ChuoiKhoa]> = {
  bang_cong: ['cn_ten_man_bang_cong', 'cn_ten_man_bang_cong_phu'],
  don_tu: ['cn_ten_man_don_tu', 'cn_ten_man_don_tu_phu'],
  luong: ['cn_ten_man_luong', 'cn_ten_man_luong_phu'],
  phep: ['cn_ten_man_phep', 'cn_ten_man_phep_phu'],
  khieu_nai: ['cn_ten_man_khieu_nai', 'cn_ten_man_khieu_nai_phu'],
  viec: ['cn_ten_man_viec', 'cn_ten_man_viec_phu'],
  y_kien: ['cn_ten_man_y_kien', 'cn_ten_man_y_kien_phu'],
  ca_nhan: ['cn_ten_man_ca_nhan', 'cn_ten_man_ca_nhan_phu'],
};

function dau_de(tab: Tab, nv: HomNay['nhan_vien']): [string, string] {
  if (tab === 'trang_chu') {
    const ca = nv?.ca_lam !== null && nv?.ca_lam !== undefined
      ? ` · ${nv.ca_lam} ${gio_hh_mm(nv.ca_gio_vao)}–${gio_hh_mm(nv.ca_gio_ra)}`
      : '';
    return [
      tra_hien_tai('cn_xin_chao', { ten: nv?.ho_ten ?? tra_hien_tai('cn_ban') }),
      `${thu_cua_ngay(hom_nay())}, ${ngay_viet(hom_nay())}${ca}`,
    ];
  }
  const cap = TEN_MAN[tab];
  return [tra_hien_tai(cap[0]), tra_hien_tai(cap[1])];
}

/** Theo doi be rong man hinh: hep = duoi 900px thi thanh ben bien thanh tab day duoi. */
function dung_hep(): boolean {
  const [hep, dat_hep] = useState(() => window.matchMedia('(max-width: 899px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)');
    const doi = (): void => dat_hep(mq.matches);
    mq.addEventListener('change', doi);
    return () => mq.removeEventListener('change', doi);
  }, []);
  return hep;
}

interface ThongBaoToi {
  id: string;
  da_doc: boolean;
}

/**
 * Toan bo KHU VUC CUA TOI theo dung vo cua mau thiet ke "Giao dien ca nhan":
 * thanh ben toi (thuong hieu, 5 tab, muc phu, chan trang) + dau trang + noi dung.
 * Tren man hep thanh ben an di va 5 tab chuyen xuong thanh tab duoi.
 *
 * `ve_quan_tri` co khi nguoi dung la quan tri — hien nut quay lai goc nhin Quan tri.
 */
export function TrangCaNhan({ ve_quan_tri, di_duyet }: {
  ve_quan_tri?: () => void;
  /** Sang goc nhin Quan tri va toi man Duyet don. Duyet don la viec quan tri, khong phai
   *  viec ca nhan, nen doi han sang vo quan tri thay vi lien ket nua voi nua kia. */
  di_duyet?: () => void;
}): ReactNode {
  const { duong_dan, di_toi } = dung_tuyen();
  const { tra, ngon_ngu, dat } = dung_chuoi();
  // Tab ban dau doc tu duong dan that (tro ly mo `/ca-nhan/luong` thi vao thang tab Luong).
  const [tab, dat_tab] = useState<Tab>(() => DUONG_TAB[duong_dan] ?? 'trang_chu');
  const [mo_form, dat_mo_form] = useState<FormMo | null>(null);
  // Man PHU nam ngoai 5 tab chinh (Thong bao, Van ban cong ty): mo ngay TRONG vo ca nhan chu
  // khong dieu huong ra route rieng — dieu huong ra se roi ve vo quan tri cu ("quay lai giao
  // dien cu"). null = dang xem mot trong 5 tab.
  const [man_phu, dat_man_phu] = useState<'thong_bao' | 'van_ban' | null>(
    duong_dan === '/ca-nhan/thong-bao' ? 'thong_bao' : duong_dan === '/ca-nhan/van-ban' ? 'van_ban' : null);
  const hep = dung_hep();
  const hom_nay_nap = dung_nap<HomNay>('/api/toi/hom-nay');
  const thong_bao_nap = dung_nap<ThongBaoToi[]>('/api/toi/thong-bao');

  // So don dang cho duyet de dat len tab Don tu (lay tu /hom-nay, khong goi them).
  const so_don_cho = so(hom_nay_nap.du_lieu?.can_chu_y?.don_cua_toi_cho_duyet);
  const so_chua_doc = (thong_bao_nap.du_lieu ?? []).filter((t) => !t.da_doc).length;

  const nv = hom_nay_nap.du_lieu?.nhan_vien ?? null;
  const [tieu_de, phu_de] = man_phu === 'thong_bao'
    ? [tra('menu_thong_bao'), tra('cn_thong_bao_phu_de')]
    : man_phu === 'van_ban'
      ? [tra('menu_van_ban'), tra('cn_van_ban_phu_de')]
      : dau_de(tab, nv);

  // Chuyen man ben trong trang + mo form neu can. Dung callback chu khong phai duong dan vi
  // bo dinh tuyen cua app khong mang theo chuoi truy van. Luon dong man phu khi ve 5 tab.
  // URL thay bang `replace` de mot phien mo bao nhieu tab cung khong day lich su nut Lui.
  const vao_tab = (t: Tab, mo: FormMo | null = null): void => {
    dat_tab(t);
    dat_mo_form(mo);
    dat_man_phu(null);
    di_toi(TAB_DUONG[t], true);
  };

  const vao_man_phu = (m: 'thong_bao' | 'van_ban'): void => {
    dat_tab('trang_chu');
    dat_mo_form(null);
    dat_man_phu(m);
    di_toi(m === 'thong_bao' ? '/ca-nhan/thong-bao' : '/ca-nhan/van-ban', true);
  };

  // Dong bo khi duong dan thay doi TU NGOAI (tro ly, chuong bao, nut Lui/Tien cua trinh duyet).
  useEffect(() => {
    if (duong_dan === '/') { vao_tab('trang_chu'); return; }
    if (duong_dan === '/ca-nhan/thong-bao') { vao_man_phu('thong_bao'); return; }
    if (duong_dan === '/ca-nhan/van-ban') { vao_man_phu('van_ban'); return; }
    const t = DUONG_TAB[duong_dan];
    if (t !== undefined) vao_tab(t);
  }, [duong_dan]); // eslint-disable-line react-hooks/exhaustive-deps

  const di_den = (t: Tab, mo: FormMo | null = null): void => vao_tab(t, mo);

  const chon_tab = (t: Tab): void => vao_tab(t);

  // Bam mot bao trong chuong: dieu huong NGAY TRONG vo ca nhan theo `man` cua bao, khong nhay
  // ra route quan tri. Duyet don la viec quan tri -> doi han goc nhin (di_duyet).
  const dieu_huong_bao = (man: string | undefined): void => {
    if (man === 'thong-bao') { vao_man_phu('thong_bao'); return; }
    if (man === 'khieu-nai-luong') { vao_tab('khieu_nai'); return; }
    if (man === 'ho-thu-y-kien') { vao_tab('y_kien'); return; }
    if (man === 'duyet-don' || man === 'don-tu') { di_duyet?.(); return; }
    if (man === 'ky-luat' || man === 'vi-pham' || man === 'don-cua-toi') { vao_tab('don_tu'); return; }
    vao_tab('trang_chu');
  };

  return (
    <div className="cn-vo">
      {!hep && (
        <nav className="cn-ben" aria-label={tra('menu_khu_vuc_cua_toi')}>
          <div className="cn-thuong-hieu">
            <span className="cn-thuong-hieu-o" aria-hidden="true">C</span>
            <span className="cn-thuong-hieu-chu">
              <b>{tra('menu_cham_cong')}</b>
              <i>{tra('menu_khu_vuc_cua_toi')}</i>
            </span>
          </div>

          <div className="cn-ben-tab">
            {CAC_TAB.map((t) => (
              <button
                key={t.ma}
                type="button"
                className={tab === t.ma ? 'cn-tab-ben cn-tab-ben-chon' : 'cn-tab-ben'}
                onClick={() => chon_tab(t.ma)}
              >
                <i className={`bt bt-${t.icon}`} aria-hidden="true" />
                <span>{tra(t.khoa)}</span>
                {t.ma === 'don_tu' && so_don_cho > 0 && (
                  <span className="cn-ben-dem">{so_don_cho}</span>
                )}
              </button>
            ))}
          </div>

          <div className="cn-ben-phu">
            <button
              type="button"
              className={man_phu === 'thong_bao' ? 'cn-ben-phu-lien-ket cn-ben-phu-chon' : 'cn-ben-phu-lien-ket'}
              onClick={() => vao_man_phu('thong_bao')}
            >
              <i className="bt bt-star" aria-hidden="true" />
              <span>{tra('menu_thong_bao')}</span>
              {so_chua_doc > 0 && <span className="cn-ben-dem">{so_chua_doc}</span>}
            </button>
            <button
              type="button"
              className={man_phu === 'van_ban' ? 'cn-ben-phu-lien-ket cn-ben-phu-chon' : 'cn-ben-phu-lien-ket'}
              onClick={() => vao_man_phu('van_ban')}
            >
              <i className="bt bt-file-text" aria-hidden="true" />
              <span>{tra('menu_van_ban')}</span>
            </button>
          </div>

          <div className="cn-ben-chan">
            {ve_quan_tri !== undefined && (
              <button type="button" className="cn-ve-quan-tri" onClick={ve_quan_tri}>
                ‹ {tra('cn_ve_goc_nhin_quan_tri')}
              </button>
            )}
            <span className="cn-ben-ten">
              {nv?.ho_ten ?? '—'}
              {nv !== null && nv.ma_nv !== null ? ` · ${nv.ma_nv}` : ''}
            </span>
            <span className="cn-ben-ca">
              {nv?.ca_lam !== null && nv?.ca_lam !== undefined
                ? `${nv.ca_lam} ${gio_hh_mm(nv.ca_gio_vao)}–${gio_hh_mm(nv.ca_gio_ra)}`
                : tra('cn_chua_gan_ca_lam_viec')}
            </span>
          </div>
        </nav>
      )}

      <div className="cn-than">
        <header className="cn-dau">
          {(man_phu !== null || (hep && tab !== 'trang_chu')) && (
            <button
              type="button"
              className="cn-dau-lui"
              aria-label={man_phu !== null ? tra('cn_ve_man_truoc') : tra('cn_ve_trang_chu')}
              onClick={() => vao_tab('trang_chu')}
            >
              ‹
            </button>
          )}
          <div className="cn-dau-chu">
            <b>{tieu_de}</b>
            {phu_de !== '' && <span>{phu_de}</span>}
          </div>
          <button
            type="button"
            className="cn-dau-ngon-ngu"
            onClick={() => dat(ngon_ngu === 'vi' ? 'zh' : 'vi')}
            aria-label={tra('ngon_ngu')}
            title={tra('ngon_ngu')}
          >
            {ngon_ngu === 'vi' ? '中' : 'VI'}
          </button>
          {/* Chuong bao TONG HOP (/api/toi/bao): thong bao cong ty + nhac nho/canh cao ky luat
              + trang thai don... `dieu_huong` mo dung man NGAY TRONG vo ca nhan. */}
          <ChuongBao dieu_huong={dieu_huong_bao} />
        </header>

        <main className="cn-noi-dung">
          <div className="cn-noi-dung-trong">
            <RanhGioiLoi key={man_phu ?? tab}>
              {man_phu === 'thong_bao' && <TrangThongBaoCaNhan />}
              {man_phu === 'van_ban' && <TrangVanBan chi_doc />}
              {man_phu === null && (
                <>
                  {tab === 'trang_chu' && <ManTrangChu hom_nay_nap={hom_nay_nap} di_den={di_den} di_duyet={di_duyet} />}
                  {tab === 'bang_cong' && <ManBangCong di_den={di_den} />}
                  {tab === 'don_tu' && (
                    <ManDonTu hom_nay_nap={hom_nay_nap} mo_form={mo_form} dat_mo_form={dat_mo_form} />
                  )}
                  {tab === 'luong' && <ManLuong />}
                  {tab === 'phep' && <NoiDungPhep />}
                  {tab === 'khieu_nai' && <TrangKhieuNaiToi />}
                  {tab === 'viec' && <ViecToi />}
                  {tab === 'y_kien' && <YKienToi />}
                  {tab === 'ca_nhan' && <ManCaNhan />}
                </>
              )}
            </RanhGioiLoi>
          </div>
        </main>

        {hep && (
          <nav className="cn-tab-chan" aria-label={tra('cn_cac_man_khu_vuc')}>
            {CAC_TAB.map((t) => (
              <button
                key={t.ma}
                type="button"
                className={tab === t.ma ? 'cn-tab-chan-nut cn-tab-chan-chon' : 'cn-tab-chan-nut'}
                onClick={() => chon_tab(t.ma)}
              >
                <span className="cn-tab-chan-hinh">
                  <i className={`bt bt-${t.icon}`} aria-hidden="true" />
                  {t.ma === 'don_tu' && so_don_cho > 0 && (
                    <span className="cn-tab-chan-dem">{so_don_cho}</span>
                  )}
                </span>
                <span>{tra(t.khoa)}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

// ==================================================================== man trang chu

/** Bang nhac thoi viec tren Trang chu ca nhan — chi hien khi co quy trinh dang mo. */
function NhacThoiViec(): ReactNode {
  const { di_toi } = dung_tuyen();
  const nap = dung_nap<{
    trang_thai: string;
    ngay_lam_viec_cuoi: string | null;
    muc: { bat_buoc: boolean; trang_thai: string }[];
  } | null>('/api/toi/thoi-viec');
  const d = nap.du_lieu;
  if (d === null || d === undefined) return null;
  const con = d.muc.filter((m) => m.bat_buoc
    && (m.trang_thai === 'chua' || m.trang_thai === 'dang')).length;
  return (
    <div className={con > 0 ? 'cn-nhac-thoi-viec' : 'cn-nhac-thoi-viec tot'}>
      <div>
        <b>{tra_hien_tai('cn_thu_tuc_thoi_viec_mo')}</b>
        <div className="mo-ta">
          {con > 0
            ? tra_hien_tai('cn_con_muc_bat_buoc', { n: con })
            : tra_hien_tai('cn_moi_muc_xong')}
          {d.ngay_lam_viec_cuoi !== null && ` · Lastday: ${ngay_viet(d.ngay_lam_viec_cuoi)}`}
        </div>
      </div>
      <button type="button" className="nut-nho nut-chinh"
        onClick={() => di_toi('/thoi-viec/huong-dan')}>{tra_hien_tai('cn_mo_huong_dan')}</button>
    </div>
  );
}

function ManTrangChu({ hom_nay_nap, di_den, di_duyet }: {
  hom_nay_nap: ReturnType<typeof dung_nap<HomNay>>;
  di_den: (t: Tab, mo?: FormMo | null) => void;
  di_duyet?: () => void;
}): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = hom_nay_nap;
  const { tra } = dung_chuoi();
  const thang_hien = thang_nay();
  // 7 ngay gan nhat co the lot sang thang truoc — nap them thang do de bieu do va can chu y
  // khong trong vao dau thang.
  const thang_dau_7 = cong_ngay(hom_nay(), -6).slice(0, 7);
  const bang_cong_thang = dung_nap<BangCongThang>(`/api/toi/bang-cong?thang=${thang_hien}`);
  const bang_cong_truoc = dung_nap<BangCongThang>(
    thang_dau_7 !== thang_hien ? `/api/toi/bang-cong?thang=${thang_dau_7}` : null,
  );

  if (dang_tai && du_lieu === null) return <XuongDanhSach />;
  if (loi !== null) return <HopLoi loi={loi} />;
  if (du_lieu === null) return null;

  const th = du_lieu.thang_tong_hop;
  const phep = du_lieu.phep;
  const ds_ngay = [
    ...(bang_cong_truoc.du_lieu?.ngay ?? []),
    ...(bang_cong_thang.du_lieu?.ngay ?? []),
  ];

  return (
    <div className="luoi" style={{ marginTop: 16 }}>
      <LoiChao du_lieu={du_lieu} nap_lai={nap_lai} />

      <NhacThoiViec />

      <HanhDongNhanh phep={phep} so_don_cho={so(du_lieu.can_chu_y?.don_cua_toi_cho_duyet)} di_den={di_den} />

      <div className="luoi luoi-4">
        <OSo
          nhan={tra('cn_cong_thang')}
          gia_tri={th === null ? '—' : so_viet(th.tong_cong)}
          phu={tra('cn_ngay_da_co_du_lieu', { n: so(th?.so_ngay_co_du_lieu) })}
        />
        <OSo
          nhan={tra('cn_di_muon')}
          gia_tri={tra('cn_lan_x', { n: so(th?.so_lan_di_muon) })}
          phu={tra('cn_tong_x', { n: phut_thanh_chu(so(th?.tong_phut_muon)) })}
          mau={so(th?.so_lan_di_muon) > 0 ? 'canh_bao' : undefined}
        />
        <OSo
          nhan={tra('cn_ot_ghi_nhan')}
          gia_tri={phut_thanh_chu(so(th?.tong_phut_ot))}
          phu={tra('cn_chua_qua_duyet')}
          mau={so(th?.tong_phut_ot) > 0 ? 'lanh' : undefined}
        />
        <OSo
          nhan={tra('cn_phep_con')}
          gia_tri={phep === null ? '—' : tra('cn_ngay_x', { n: so_viet(phep.con_lai) })}
          phu={phep !== null && phep.cho_duyet > 0 ? tra('cn_ngay_cho_duyet', { n: so_viet(phep.cho_duyet) }) : tra('cn_khong_co_don_cho_duyet')}
        />
      </div>

      <HaiCot>
        <BieuDoBayNgay ds_ngay={ds_ngay} />
        <DongThoiQuet lan_quet={du_lieu.lan_quet} />
        <TuanNay tuan={du_lieu.tuan} hom_nay={du_lieu.ngay} />
        <CotPhai th={th} du_lieu={du_lieu} ds_ngay={ds_ngay} di_den={di_den} di_duyet={di_duyet} />
      </HaiCot>
    </div>
  );
}

/** Dai ca lam hom nay — noi dung chinh cua loi chao. */
function LoiChao({ du_lieu, nap_lai }: { du_lieu: HomNay; nap_lai: () => void }): ReactNode {
  const { tra } = dung_chuoi();
  const bc = du_lieu.bang_cong;
  const nv = du_lieu.nhan_vien;
  const ca = nv?.ca_lam ?? tra('cn_chua_gan_ca_lam_viec');
  const ca_vao = phut_cua_gio(nv?.ca_gio_vao ?? null);
  const ca_ra = phut_cua_gio(nv?.ca_gio_ra ?? null);

  // Tien do ca: phan tram thoi gian da troi tu luc vao ca den bay gio.
  // Ca dem (gio_ra < gio_vao) tinh qua nua dem bang modulo 1440; truoc gio vao ca thi
  // tien do ve 0, sau gio tan thi ve 100 (ban dau tru thang nen ca dem luon 0%).
  let phan_tram: number | null = null;
  let con_lai: string | null = null;
  let qua_gio_ra = false;
  const nay = phut_hien_tai();
  if (ca_vao !== null && ca_ra !== null) {
    const qua_dem = ca_ra <= ca_vao;
    const dai = qua_dem ? ca_ra + 1440 - ca_vao : ca_ra - ca_vao;
    qua_gio_ra = nay > ca_ra;
    if (bc !== null && bc.gio_ra !== null) {
      phan_tram = 100;
    } else if (dai > 0) {
      const cach = qua_dem ? (nay - ca_vao + 1440) % 1440 : nay - ca_vao;
      const qua = cach > dai
        ? (nay >= ca_vao ? dai : 0)
        : Math.max(0, cach);
      phan_tram = Math.round((qua / dai) * 100);
      const con = ca_ra - nay;
      if (con > 0) {
        con_lai = tra('cn_con_x_den_gio', {
          n: `${Math.floor(con / 60)}h ${String(con % 60).padStart(2, '0')}′`,
          g: gio_hh_mm(nv?.ca_gio_ra),
        });
      }
    }
  }

  const dang_lam = bc !== null && bc.gio_vao !== null && bc.gio_ra === null;
  let lam_duoc = '';
  if (dang_lam && bc.gio_vao !== null) {
    const bat_dau = new Date(bc.gio_vao).getTime();
    const qua = Math.max(0, Date.now() + mui_gio_offset_gio() * 3600_000 - bat_dau);
    const gio = Math.floor(qua / 3600_000);
    const phut = Math.floor((qua % 3600_000) / 60_000);
    lam_duoc = `${gio}h ${String(phut).padStart(2, '0')}′`;
  }

  const som_muon = bc === null ? tra('cn_chua_co_du_lieu_cham_cong')
    : bc.trang_thai === 'vang' ? tra('cn_hom_nay_vang')
      : bc.trang_thai === 'nghi_phep' ? tra('cn_hom_nay_nghi_phep')
        : bc.phut_muon > 0 ? tra('cn_di_muon_x', { n: phut_thanh_chu(bc.phut_muon) })
          : bc.gio_vao !== null ? tra('cn_dung_gio_vao_ca') : tra('cn_chua_quet_vao');

  return (
    <div className="cn-hero">
      <div className="cn-hero-hang">
        <div className="cn-hero-o">
          <span className="cn-hero-nhan">{tra('cn_gio_vao')}</span>
          <span className="cn-hero-gio">{bc?.gio_vao !== null && bc?.gio_vao !== undefined ? gio_ngan(bc.gio_vao) : '--:--'}</span>
          <span className="cn-hero-phu">{som_muon}</span>
        </div>
        <div className="cn-hero-o">
          <span className="cn-hero-nhan">{tra('cn_gio_ra')}</span>
          <span className="cn-hero-gio">{bc?.gio_ra !== null && bc?.gio_ra !== undefined ? gio_ngan(bc.gio_ra) : '--:--'}</span>
          <span className="cn-hero-phu">{con_lai ?? (bc?.gio_ra !== null ? tra('cn_da_quet_ra') : tra('cn_chua_quet_ra'))}</span>
        </div>
        {dang_lam && qua_gio_ra && (
          <span className="cn-nhan-cam">{tra('cn_qua_gio_ra', { n: lam_duoc })}</span>
        )}
        {dang_lam && !qua_gio_ra && (
          <span className="cn-nhan-xanh">{tra('cn_dang_lam', { n: lam_duoc })}</span>
        )}
        {!dang_lam && bc?.gio_ra !== null && (
          <span className="cn-nhan-xam">{tra('cn_da_ket_thuc_ca')}</span>
        )}
      </div>

      {phan_tram !== null && (
        <div className="cn-hero-tien-do">
          <div className="cn-tien-do">
            <div className="cn-tien-do-day" style={{ width: `${phan_tram}%` }} />
            <div className="cn-tien-do-num" style={{ left: `${phan_tram}%` }} />
          </div>
          <div className="cn-tien-do-nhan">
            <span>{gio_hh_mm(nv?.ca_gio_vao)} {tra('cn_vao_ca')}</span>
            <span>{gio_hh_mm(nv?.ca_gio_ra)} {tra('cn_het_ca')}</span>
          </div>
        </div>
      )}

      <div className="cn-hero-chip-hang">
        <span className="cn-chip-toi">{ca}</span>
        {bc !== null && (
          <span className="cn-chip-toi">{bc.ghi_chu ?? tra('cn_quet_tai_may')}</span>
        )}
        <button className="cn-chip-nut" onClick={nap_lai}>{tra('cn_lam_moi')}</button>
      </div>
    </div>
  );
}

function HanhDongNhanh({ phep, so_don_cho, di_den }: {
  phep: HomNay['phep'];
  so_don_cho: number;
  di_den: (t: Tab, mo?: FormMo | null) => void;
}): ReactNode {
  const { tra } = dung_chuoi();
  return (
    <div className="cn-hanh-dong">
      <button type="button" className="cn-nut-hanh-dong cn-nut-chinh-dam" onClick={() => di_den('don_tu', 'nghi')}>
        <i className="bt bt-plane-departure" />
        <span>
          <span className="cn-nut-hanh-dong-ten">{tra('cn_xin_nghi_phep')}</span>
          <span className="cn-nut-hanh-dong-phu">
            {phep === null ? '' : tra('cn_con_ngay_phep', { n: so_viet(phep.con_lai) })}
          </span>
        </span>
      </button>
      <button type="button" className="cn-nut-hanh-dong cn-nut-canh-bao" onClick={() => di_den('don_tu', 'giai')}>
        <i className="bt bt-clock-exclamation" />
        <span>
          <span className="cn-nut-hanh-dong-ten">{tra('cn_giai_trinh_quen_quet')}</span>
          <span className="cn-nut-hanh-dong-phu">{tra('cn_bu_gio_thieu')}</span>
        </span>
      </button>
      <button type="button" className="cn-nut-hanh-dong cn-nut-thuong" onClick={() => di_den('don_tu')}>
        <i className="bt bt-file-text" />
        <span style={{ flex: 1 }}>
          <span className="cn-nut-hanh-dong-ten">{tra('cn_don_cua_toi')}</span>
          <span className="cn-nut-hanh-dong-phu">
            {so_don_cho > 0 ? tra('cn_don_dang_cho_duyet', { n: so_don_cho }) : tra('cn_khong_co_don_cho_duyet')}
          </span>
        </span>
        {so_don_cho > 0 && <span className="cn-dem">{so_don_cho}</span>}
      </button>
      <button type="button" className="cn-nut-hanh-dong cn-nut-thuong" onClick={() => di_den('don_tu', 'ot')}>
        <i className="bt bt-clock" />
        <span>
          <span className="cn-nut-hanh-dong-ten">{tra('cn_dang_ky_ot')}</span>
          <span className="cn-nut-hanh-dong-phu">{tra('cn_lam_them_gio_duyet_2_cap')}</span>
        </span>
      </button>
    </div>
  );
}

function HaiCot({ children }: { children: ReactNode }): ReactNode {
  return <div className="cn-hai-cot">{children}</div>;
}

/** Bieu do gio lam 7 ngay gan nhat. Nhan danh sach ngay da GHEP hai thang de du lieu
   khong trong vao dau thang. */
function BieuDoBayNgay({ ds_ngay }: { ds_ngay: NgayCongNgay[] }): ReactNode {
  const { tra } = dung_chuoi();
  const hom = hom_nay();
  const ngay_ds: { ngay: string; gio: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) ngay_ds.push({ ngay: cong_ngay(hom, -i), gio: 0 });

  const bang = new Map(ds_ngay.map((n) => [n.ngay, n]));
  let tong_gio = 0;
  let so_ngay_co = 0;
  for (const o of ngay_ds) {
    const d = bang.get(o.ngay);
    o.gio = so(d?.phut_lam) / 60;
    if (o.gio > 0) { tong_gio += o.gio; so_ngay_co += 1; }
  }
  const tb = so_ngay_co === 0 ? 0 : tong_gio / so_ngay_co;

  return (
    <div className="the">
      <div className="cn-tieu-de-hang">
        <h2>{tra('cn_gio_lam_7_ngay')}</h2>
        <span className="cn-phu">TB {tb === 0 ? '—' : `${so_viet(tb.toFixed(1))}h`}</span>
      </div>
      <div className="cn-cot-gio">
        {ngay_ds.map((o) => {
          const d = bang.get(o.ngay);
          const cao = o.gio <= 0 ? 0 : Math.max(4, Math.round((o.gio / 9.5) * 100));
          const hom_nay_la = o.ngay === hom;
          const nghi = d !== undefined && d.trang_thai === 'nghi_tuan';
          return (
            <div className="cn-cot" key={o.ngay}>
              <span className="cn-cot-gia">{o.gio <= 0 ? '—' : `${so_viet(o.gio.toFixed(1))}h`}</span>
              <div
                className={`cn-cot-than ${hom_nay_la ? 'cn-cot-hom-nay' : ''} ${nghi ? 'cn-cot-nghi' : ''}`}
                style={{ height: cao === 0 ? '4px' : `${cao}%` }}
              />
              <span className={`cn-cot-thu ${hom_nay_la ? 'cn-chu-dam' : ''}`}>{thu_cua_ngay(o.ngay)}</span>
            </div>
          );
        })}
      </div>
      <span className="cn-chu-nho">{tra('cn_vach_mo_8_gio')}</span>
    </div>
  );
}

/** Dong thoi gian cac lan quet hom nay. */
function DongThoiQuet({ lan_quet }: { lan_quet: LanQuetToi[] }): ReactNode {
  const { tra } = dung_chuoi();
  return (
    <div className="the">
      <h2>{tra('cn_cac_lan_quet')}</h2>
      {lan_quet.length === 0 ? (
        <Trong tieu_de={tra('cn_chua_co_lan_quet')} mo_ta={tra('cn_du_lieu_hien_ngay')} />
      ) : (
        <div className="cn-dong-thoi">
          {lan_quet.map((q, i) => (
            <div className="cn-dong-thoi-dong" key={q.id}>
              <div className="cn-dong-thoi-cot">
                <span className={`cn-cham ${q.trang_thai === 0 ? 'cn-cham-vao' : 'cn-cham-ra'}`} />
                {i < lan_quet.length - 1 && <span className="cn-vach" />}
              </div>
              <div className="cn-dong-thoi-noi">
                <span className="cn-gio">{gio_ngan(q.thoi_diem)}</span>
                <div>
                  <span className="cn-ten">{q.nhan_trang_thai}</span>
                  <span className="cn-nguon">{tra_khoa(TEN_NGUON[q.nguon], q.nguon)} · {q.nhan_xac_thuc}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Dai tuan nay T2..CN, ve DU 7 ngay ke ca ngay chua co du lieu. */
function TuanNay({ tuan, hom_nay: hom }: { tuan: NgayTuan[]; hom_nay: string }): ReactNode {
  const { tra } = dung_chuoi();
  const bang = new Map(tuan.map((n) => [n.ngay, n]));
  const thu = new Date(`${hom}T00:00:00Z`).getUTCDay();
  const dau_tuan = cong_ngay(hom, -(thu === 0 ? 6 : thu - 1));
  const ds_ngay = Array.from({ length: 7 }, (_, i) => cong_ngay(dau_tuan, i));

  return (
    <div className="the">
      <h2>{tra('cn_tuan_nay')}</h2>
      <div className="cn-tuan">
        {ds_ngay.map((ng) => {
          const n = bang.get(ng);
          const hom_nay_la = ng === hom;
          const lop = hom_nay_la ? 'cn-ngay-hom-nay'
            : n?.trang_thai === 'co_mat' ? 'cn-ngay-co-mat'
              : n?.trang_thai === 'vang' ? 'cn-ngay-vang'
                : n?.trang_thai === 'nghi_phep' ? 'cn-ngay-phep'
                  : n?.trang_thai === 'ngay_le' ? 'cn-ngay-le'
                    : 'cn-ngay-mo';
          return (
            <div className={`cn-ngay-tuan ${lop}`} key={ng}>
              <span className="cn-thu">{thu_cua_ngay(ng)}</span>
              <span className="cn-so-ngay">{Number(ng.slice(8))}</span>
              <span className="cn-cong">
                {n !== undefined && n.trang_thai === 'co_mat' ? so_viet(n.so_cong) : '·'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Cot phai: chuyen can + can chu y. */
function CotPhai({ th, du_lieu, ds_ngay, di_den, di_duyet }: {
  th: TongHopThang | null;
  du_lieu: HomNay;
  ds_ngay: NgayCongNgay[];
  di_den: (t: Tab, mo?: FormMo | null) => void;
  di_duyet?: () => void;
}): ReactNode {
  const { tra } = dung_chuoi();
  const ccy = du_lieu.can_chu_y;
  const hom = hom_nay();
  const da_qua = ds_ngay.filter((d) => d.ngay <= hom);
  // Chuyen can tinh theo TUNG NGAY, khong theo con so gop: mot ngay thieu gio quet van duoc
  // tinh 'co_mat' trong tong hop nhung khong duoc tinh la du cong.
  const ngay_du_cong = da_qua.filter((d) => d.trang_thai === 'co_mat'
    && so(d.so_cong) >= 1 && so(d.phut_muon) === 0).length;
  const ngay_phai = da_qua.filter((d) => d.trang_thai !== 'nghi_tuan'
    && d.trang_thai !== 'ngay_le').length;
  // Thang chua co ban ghi nao (vd dau thang moi) thi dung con so tong hop lam tam.
  const dung_ds = da_qua.length > 0;
  const hien_du = dung_ds
    ? ngay_du_cong
    : Math.max(0, so(th?.so_ngay_co_mat) - so(th?.so_lan_di_muon));
  const hien_phai = dung_ds ? ngay_phai : so(th?.so_ngay_phai_lam);
  const ty_le = hien_phai === 0 ? 0 : Math.round((hien_du / hien_phai) * 100);

  return (
    <>
      <div className="the">
        <div className="cn-tieu-de-hang">
          <h2>{tra('cn_chuyen_can_thang')}</h2>
          <span className="cn-phu">{hien_du}/{hien_phai}</span>
        </div>
        <div className="cn-thanh">
          <div className="cn-thanh-day" style={{ width: `${Math.min(100, ty_le)}%` }} />
        </div>
        <span className="cn-chu-nho">
          {dung_ds
            ? tra('cn_so_ngay_du_cong')
            : tra('cn_chua_co_du_lieu_thang') + ' ' + tra('cn_bang_cong_xuat_hien')}
        </span>
      </div>

      <div className="the the-mong">
        <div className="cn-dau-mong">{tra('cn_can_chu_y_sap_toi')}</div>
        <CanChuY ccy={ccy} ds_ngay={ds_ngay} di_den={di_den} di_duyet={di_duyet} />
      </div>
    </>
  );
}

/** Danh sach viec can chu y, dung du lieu that thay vi so cung. */
function CanChuY({ ccy, ds_ngay, di_den, di_duyet }: {
  ccy: HomNay['can_chu_y'];
  ds_ngay: NgayCongNgay[];
  di_den: (t: Tab, mo?: FormMo | null) => void;
  di_duyet?: () => void;
}): ReactNode {
  const { tra } = dung_chuoi();
  const muc: { icon: string; lop: string; ten: string; mo_ta: string; lam: (() => void) | null; nhan: string }[] = [];

  // Dem toan bo ngay thieu gio quet da qua (khong chi hom nay).
  const ngay_thieu = ds_ngay.filter((d) => d.ngay <= hom_nay()
    && d.trang_thai === 'co_mat'
    && (d.gio_vao === null || d.gio_ra === null));
  if (ngay_thieu.length > 0) {
    muc.push({
      icon: 'clock-exclamation', lop: 'cn-o-canh-bao',
      ten: tra('cn_ngay_thieu_gio_quet', { n: ngay_thieu.length }),
      mo_ta: ngay_thieu.length === 1
        ? `${tra('cn_ngay')} ${ngay_viet(ngay_thieu[0]?.ngay ?? '')}`
        : tra('cn_bo_sung_giai_trinh'),
      lam: () => di_den('don_tu', 'giai'), nhan: tra('cn_giai_trinh'),
    });
  }
  if (so(ccy?.don_cua_toi_cho_duyet) > 0) {
    muc.push({
      icon: 'file-text', lop: 'cn-o-lanh',
      ten: tra('cn_don_dang_cho_duyet', { n: ccy?.don_cua_toi_cho_duyet ?? 0 }),
      mo_ta: tra('cn_theo_doi_don_tu'),
      lam: () => di_den('don_tu'), nhan: tra('cn_xem_don'),
    });
  }
  if (so(ccy?.don_cho_toi_duyet) > 0 && di_duyet !== undefined) {
    muc.push({
      icon: 'check', lop: 'cn-o-tot',
      ten: tra('cn_don_cho_ban_duyet', { n: ccy?.don_cho_toi_duyet ?? 0 }),
      mo_ta: tra('cn_ban_la_nguoi_duyet'),
      lam: di_duyet, nhan: tra('cn_di_duyet'),
    });
  }
  if (muc.length === 0) {
    muc.push({
      icon: 'circle-check', lop: 'cn-o-tot',
      ten: tra('cn_khong_co_viec_can_chu_y'),
      mo_ta: tra('cn_cong_va_don_on'),
      lam: () => {}, nhan: '',
    });
  }

  return (
    <>
      {muc.map((m) => {
        const trong = (
          <span className="cn-cty-hang">
            <i className={`bt bt-${m.icon} ${m.lop}`} />
            <span className="cn-cty-noi">
              <span className="cn-cty-ten">{m.ten}</span>
              <span className="cn-cty-mo-ta">{m.mo_ta}</span>
            </span>
            {m.nhan !== '' && <span className="cn-cty-nhan">{m.nhan}</span>}
          </span>
        );
        return (
          <button
            type="button"
            key={m.ten}
            className="cn-cty-lien-ket"
            onClick={m.lam ?? undefined}
          >
            {trong}
          </button>
        );
      })}
    </>
  );
}

// ==================================================================== man bang cong

/** Nhan trang thai mot ngay cong trong danh sach chi tiet. */
function nhan_ngay_cong(d: NgayCongNgay): string {
  if (d.trang_thai === 'nghi_phep') return tra_hien_tai('cn_tt_nghi_phep');
  if (d.trang_thai === 'nghi_khong_luong') return tra_hien_tai('cn_tt_nghi_khong_luong');
  if (d.trang_thai === 'lam_bu') return tra_hien_tai('cn_tt_lam_bu');
  if (d.trang_thai === 'ngoai_le') return tra_hien_tai('cn_tt_ngoai_le');
  if (d.trang_thai === 'cong_tac') return tra_hien_tai('cn_tt_cong_tac');
  if (d.trang_thai === 'lam_remote') return tra_hien_tai('cn_tt_lam_remote');
  if (d.trang_thai === 'vang') return tra_hien_tai('cn_tt_vang');
  if (d.trang_thai === 'ngay_le') return tra_hien_tai('cn_tt_ngay_le');
  if (d.trang_thai === 'nghi_tuan') return tra_hien_tai('cn_tt_nghi_tuan');
  const thieu: string[] = [];
  if (d.gio_vao === null) thieu.push(tra_hien_tai('cn_thieu_gio_vao'));
  if (d.gio_ra === null) thieu.push(tra_hien_tai('cn_thieu_gio_ra'));
  if (thieu.length > 0) return tra_hien_tai('cn_tt_thieu_gio_quet', { n: thieu.join(', ') });
  if (so(d.phut_muon) > 0) return tra_hien_tai('cn_tt_di_muon', { n: phut_thanh_chu(d.phut_muon) });
  return tra_hien_tai('cn_tt_du_cong');
}

function ManBangCong({ di_den }: { di_den: (t: Tab, mo?: FormMo | null) => void }): ReactNode {
  const [thang, dat_thang] = useState(thang_nay());
  const { du_lieu, dang_tai, loi } = dung_nap<BangCongThang>(`/api/toi/bang-cong?thang=${thang}`, [thang]);
  const { tra } = dung_chuoi();

  if (dang_tai && du_lieu === null) return <XuongDanhSach />;
  if (loi !== null) return <HopLoi loi={loi} />;
  if (du_lieu === null) return null;

  const t = du_lieu.tong_hop;
  const co_du_lieu = so(t.so_ngay_co_du_lieu) > 0;
  const [nam, thg] = thang.split('-').map(Number);

  return (
    <div className="cn-cot-gap" style={{ marginTop: 16 }}>
      {/* Bo chon thang va 3 so tong gop mot hang de danh dien tich doc cho lich + chi tiet. */}
      <div className="cn-bang-cong-dau">
        <div className="cn-chon-thang">
          <button
            type="button"
            className="cn-nut-vuong"
            aria-label={tra('cn_thang_truoc')}
            onClick={() => dat_thang(thg === 1 ? `${(nam ?? 0) - 1}-12` : `${nam}-${String((thg ?? 1) - 1).padStart(2, '0')}`)}
          >
            ‹
          </button>
          <span className="cn-chon-thang-ten">{tra('cn_thang_x', { n: `${String(thg).padStart(2, '0')}/${nam}` })}</span>
          <button
            type="button"
            className="cn-nut-vuong"
            aria-label={tra('cn_thang_sau')}
            disabled={thang >= thang_nay()}
            onClick={() => dat_thang(thg === 12 ? `${(nam ?? 0) + 1}-01` : `${nam}-${String((thg ?? 1) + 1).padStart(2, '0')}`)}
          >
            ›
          </button>
        </div>

        <div className="the cn-ba-so">
          <div>
            <span className="cn-ba-so-nhan">{tra('cn_tong_cong')}</span>
            <span className="cn-ba-so-gia">{so_viet(t.tong_cong)}</span>
          </div>
          <div>
            <span className="cn-ba-so-nhan">{tra('cn_gio_lam')}</span>
            <span className="cn-ba-so-gia">{phut_thanh_chu(so(t.tong_phut_lam))}</span>
          </div>
          <div>
            <span className="cn-ba-so-nhan">{tra('cn_tang_ca')}</span>
            <span className="cn-ba-so-gia cn-ba-so-lanh">{phut_thanh_chu(so(t.tong_phut_ot))}</span>
          </div>
        </div>
      </div>

      {!co_du_lieu && (
        <Trong
          tieu_de={tra('cn_chua_co_du_lieu_thang')}
          mo_ta={tra('cn_bang_cong_xuat_hien')}
        />
      )}

      {/* Man rong: lich thang ben trai, chi tiet tung ngay ben phai — nhin duoc nhieu ngay hon. */}
      <div className="cn-bang-cong-luoi">
        <LichThang thang={thang} ngay={du_lieu.ngay} />

        <div className="the the-mong">
          <div className="cn-dau-mong" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 6,
          }}>
            <span>{tra('cn_chi_tiet_tung_ngay')}</span>
            <span style={{ fontSize: 11, fontWeight: 400, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span><b style={{ color: '#16A34A' }}>●</b> {tra('cn_tt_du_cong')}</span>
              <span><b style={{ color: '#F59E0B' }}>●</b> {tra('cn_muon_thieu_gio')}</span>
              <span><b style={{ color: '#DC2626' }}>●</b> {tra('cn_tt_vang')}</span>
              <span><b style={{ color: '#0EA5E9' }}>●</b> {tra('cn_tt_nghi_phep')}</span>
            </span>
          </div>
          <div className="cn-ngay-ds">
          {du_lieu.ngay.map((d) => {
            const thieu_gio = d.trang_thai === 'co_mat' && (d.gio_vao === null || d.gio_ra === null);
            const mau = d.trang_thai === 'vang' ? '#DC2626'
              : d.trang_thai === 'nghi_phep' ? '#0EA5E9'
                : d.trang_thai === 'nghi_khong_luong' ? '#F59E0B'
                  : d.trang_thai === 'ngay_le' || d.trang_thai === 'lam_bu' ? '#8B5CF6'
                    : d.trang_thai === 'nghi_tuan' ? '#CBD5E1'
                      : thieu_gio || so(d.phut_muon) > 0 ? '#F59E0B'
                        : '#16A34A';
            const badge_lop = d.trang_thai === 'vang' ? 'nhan-xau'
              : d.trang_thai === 'co_mat' ? (so(d.phut_muon) > 0 || thieu_gio ? 'nhan-canh-bao' : 'nhan-tot')
                : d.trang_thai === 'nghi_phep' ? 'nhan-lanh' : 'nhan-mo';
            const gio_txt = d.gio_vao === null && d.gio_ra === null ? null
              : d.gio_vao === null ? tra('cn_thieu_gio_vao_mui_ten', { r: gio_ngan(d.gio_ra) })
                : `${gio_ngan(d.gio_vao)} → ${d.gio_ra === null ? tra('cn_thieu_gio_ra') : gio_ngan(d.gio_ra)}`;
            const muon_txt = [so(d.phut_muon) > 0 ? tra('cn_muon_phut', { n: so(d.phut_muon) }) : null,
              so(d.phut_ve_som) > 0 ? tra('cn_ve_som_phut', { n: so(d.phut_ve_som) }) : null].filter(Boolean).join(' · ');
            const la_hom_nay = d.ngay === hom_nay();
            return (
              <div key={d.ngay} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 4px 5px 10px', marginBottom: 4, borderRadius: 6,
                borderLeft: `4px solid ${mau}`,
                background: la_hom_nay ? 'var(--nen-mo, #f1f5f9)' : 'transparent',
              }}>
                <div style={{ minWidth: 40, flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.1 }}>
                    {d.ngay.slice(8)}{' '}
                    <span style={{ fontWeight: 500, fontSize: 11.5 }}>{thu_cua_ngay(d.ngay)}</span>
                  </div>
                  <div className="mo-ta" style={{ fontSize: 10.5 }}>{d.ngay.slice(5, 7)}/{d.ngay.slice(0, 4)}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className={`nhan ${badge_lop}`}>{nhan_ngay_cong(d)}</span>
                  {gio_txt !== null && (
                    <span style={{ fontSize: 12.5, marginLeft: 6 }}>
                      {gio_txt}
                      {muon_txt !== '' && <span className="mo-ta"> · {muon_txt}</span>}
                    </span>
                  )}
                  {d.ghi_chu !== null && d.ghi_chu !== '' && (
                    <div className="mo-ta" style={{ fontSize: 11.5, marginTop: 2 }}>{d.ghi_chu}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right', minWidth: 44, flexShrink: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1 }}>{so_viet(d.so_cong)}</div>
                  <div className="mo-ta" style={{ fontSize: 10 }}>{tra('cn_cong')}</div>
                  {so(d.phut_lam) > 0 && (
                    <div className="mo-ta" style={{ fontSize: 10.5, marginTop: 2 }}>{phut_thanh_chu(so(d.phut_lam))}</div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid var(--vien)' }}>
            <button type="button" className="cn-nut-phang-rong" style={{ flex: 1 }} onClick={() => di_den('don_tu', 'ot')}>
              {tra('cn_dang_ky_lam_them_ot')}
            </button>
            <button type="button" className="cn-nut-phang-rong" style={{ flex: 1 }} onClick={() => di_den('don_tu', 'giai')}>
              {tra('cn_thay_sai_lech')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Lich thang mau theo trang thai tung ngay. */
function LichThang({ thang, ngay }: { thang: string; ngay: NgayCongNgay[] }): ReactNode {
  const { tra } = dung_chuoi();
  const [nam, thg] = thang.split('-').map(Number);
  const hom = hom_nay();
  const dau_thu = (new Date(Date.UTC(nam ?? 1970, (thg ?? 1) - 1, 1)).getUTCDay() + 6) % 7;
  const tong_ngay = new Date(Date.UTC(nam ?? 1970, thg ?? 1, 0)).getUTCDate();

  const bang = new Map(ngay.map((n) => [n.ngay, n]));
  const o: { so: string; lop: string; tieu_de: string }[] = [];
  for (let i = 0; i < dau_thu; i += 1) o.push({ so: '', lop: '', tieu_de: '' });

  for (let d = 1; d <= tong_ngay; d += 1) {
    const ng = `${thang}-${String(d).padStart(2, '0')}`;
    const hang = bang.get(ng);
    const tuong_lai = ng > hom;
    let lop = 'cn-lich-mo';
    let chu = tra('cn_ngay_chua_co_du_lieu');
    if (hang !== undefined) {
      chu = nhan_ngay_cong(hang);
      if (hang.trang_thai === 'vang') lop = 'cn-lich-vang';
      else if (hang.trang_thai === 'nghi_phep' || hang.trang_thai === 'ngoai_le') lop = 'cn-lich-phep';
      else if (hang.trang_thai === 'ngay_le') lop = 'cn-lich-le';
      else if (hang.trang_thai === 'nghi_tuan') lop = 'cn-lich-mo';
      else if (hang.gio_vao === null || hang.gio_ra === null) lop = 'cn-lich-thieu';
      else if (hang.phut_muon > 0) lop = 'cn-lich-muon';
      else lop = 'cn-lich-tot';
    } else if (tuong_lai) {
      chu = tra('cn_chua_den');
    }
    o.push({ so: String(d), lop, tieu_de: `${ng}: ${chu}` });
  }

  return (
    <div className="the">
      <h2>{tra('cn_lich_thang')}</h2>
      <div className="cn-lich">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((t) => (
          <span className="cn-lich-thu" key={t}>{t}</span>
        ))}
        {o.map((c, i) => (
          <div key={`o-${i}`} className={`cn-lich-o ${c.lop}`} title={c.tieu_de}>{c.so}</div>
        ))}
      </div>
      <div className="cn-chu-thich">
        <span className="nhan nhan-tot">{tra('cn_tt_du_cong')}</span>
        <span className="nhan nhan-canh-bao">{tra('cn_di_muon')}</span>
        <span className="nhan nhan-lanh">{tra('cn_tt_nghi_phep')}</span>
        <span className="nhan nhan-xau">{tra('cn_tt_vang')}</span>
        <span className="nhan nhan-mo">{tra('cn_tt_nghi_tuan')}</span>
      </div>
    </div>
  );
}

// ==================================================================== man don tu

type NhomDon = 'nghi_phep' | 'giai_trinh' | 'khac';

interface DonGop {
  id: string;
  nhom: NhomDon;
  /** Ma loai don (chi co o nhom `khac`) — dung de nhan dien don lam them gio. */
  loai: string;
  tieu_de: string;
  chi_tiet: string;
  ly_do: string | null;
  trang_thai: string;
  ghi_chu_duyet: string | null;
}

const LOAI_NGHI: [string, ChuoiKhoa][] = [
  ['phep_nam', 'cn_loai_phep_nam'], ['khong_luong', 'cn_loai_khong_luong'],
  ['om', 'cn_loai_om'], ['thai_san', 'cn_loai_thai_san'], ['ket_hon', 'cn_loai_ket_hon'],
  ['hieu', 'cn_loai_hieu'],
];

/** Tieu de don nghi theo loai, dung dung chinh ta chu khong ghep may moc. */
const TEN_TIEU_DE_NGHI: Record<string, ChuoiKhoa> = {
  phep_nam: 'cn_td_nghi_phep_nam', khong_luong: 'cn_td_nghi_khong_luong', om: 'cn_td_nghi_om',
  thai_san: 'cn_td_nghi_thai_san', ket_hon: 'cn_td_nghi_ket_hon', hieu: 'cn_td_nghi_hieu',
};

/** Gom ba nguon don thanh mot danh sach dung de hien thi. */
function gop_don(nghi: DonNghiPhep[] | null, giai: DonGiaiTrinh[] | null, khac: DonKhac[] | null): DonGop[] {
  const ra: DonGop[] = [];
  for (const d of nghi ?? []) {
    const k = TEN_TIEU_DE_NGHI[d.loai];
    ra.push({
      id: d.id, nhom: 'nghi_phep', loai: '',
      tieu_de: k !== undefined ? tra_hien_tai(k) : d.loai,
      chi_tiet: d.tu_ngay === d.den_ngay
        ? `${ngay_viet(d.tu_ngay)}${d.nua_ngay ? tra_hien_tai('cn_nua_ngay_dot') : ''}`
        : `${ngay_viet(d.tu_ngay)} – ${ngay_viet(d.den_ngay)}`,
      ly_do: d.ly_do, trang_thai: d.trang_thai, ghi_chu_duyet: d.ghi_chu_duyet,
    });
  }
  for (const d of giai ?? []) {
    ra.push({
      id: d.id, nhom: 'giai_trinh', loai: '',
      tieu_de: tra_hien_tai('cn_giai_trinh_quen_quet'),
      chi_tiet: `${ngay_viet(d.ngay)} · ${tra_hien_tai('cn_de_xuat_khoang', {
        v: gio_ngan(d.gio_vao_de_xuat), r: gio_ngan(d.gio_ra_de_xuat),
      })}`,
      ly_do: d.ly_do, trang_thai: d.trang_thai, ghi_chu_duyet: d.ghi_chu_duyet,
    });
  }
  for (const d of khac ?? []) {
    const ct = d.loai === 've_som' && d.gio_bat_dau !== null
      ? `${ngay_viet(d.tu_ngay)} · ${tra_hien_tai('cn_ra_ve_x', { n: d.gio_bat_dau })}`
      : d.gio_bat_dau !== null
        ? `${ngay_viet(d.tu_ngay)} · ${d.gio_bat_dau} – ${d.gio_ket_thuc ?? ''}`
        : d.den_ngay !== null && d.den_ngay !== d.tu_ngay
          ? `${ngay_viet(d.tu_ngay)} – ${ngay_viet(d.den_ngay)}${d.noi_den !== null ? ` · ${d.noi_den}` : ''}`
          : ngay_viet(d.tu_ngay);
    ra.push({
      id: d.id, nhom: 'khac', loai: d.loai, tieu_de: ten_loai_khac(d.loai),
      chi_tiet: ct, ly_do: d.ly_do, trang_thai: d.trang_thai, ghi_chu_duyet: d.ghi_chu_duyet,
    });
  }
  return ra;
}

/** Ten loai don khac, lay tu danh muc may chu. */
function ten_loai_khac(ma: string): string {
  const TEN: Record<string, ChuoiKhoa> = {
    lam_them: 'cn_loai_lam_them', doi_ca: 'cn_loai_doi_ca', cong_tac: 'cn_loai_cong_tac',
    thoi_viec: 'cn_loai_thoi_viec', di_muon: 'cn_loai_di_muon', ve_som: 'cn_loai_ve_som',
    lam_remote: 'cn_loai_lam_remote',
  };
  const k = TEN[ma];
  return k !== undefined ? tra_hien_tai(k) : ma;
}

function ManDonTu({ hom_nay_nap, mo_form, dat_mo_form }: {
  hom_nay_nap: ReturnType<typeof dung_nap<HomNay>>;
  mo_form: FormMo | null;
  dat_mo_form: (m: FormMo | null) => void;
}): ReactNode {
  const [loc, dat_loc] = useState<'tat_ca' | 'cho_duyet' | 'da_duyet' | 'tu_choi'>('tat_ca');
  const { tra } = dung_chuoi();

  const nghi = dung_nap<DonNghiPhep[]>('/api/toi/nghi-phep');
  const giai = dung_nap<DonGiaiTrinh[]>('/api/toi/giai-trinh');
  const khac = dung_nap<{ danh_sach: DonKhac[] }>('/api/toi/don');
  const loai_don = dung_nap<{ danh_sach: LoaiDon[] }>('/api/toi/don/loai');

  const phep = hom_nay_nap.du_lieu?.phep ?? null;

  const tat_ca = gop_don(nghi.du_lieu, giai.du_lieu, khac.du_lieu?.danh_sach ?? null);
  const ds = loc === 'tat_ca' ? tat_ca : tat_ca.filter((d) => d.trang_thai === loc);
  const so_cho = tat_ca.filter((d) => d.trang_thai === 'cho_duyet').length;

  const sau_khi_xong = (): void => {
    dat_mo_form(null);
    nghi.nap_lai();
    giai.nap_lai();
    khac.nap_lai();
    hom_nay_nap.nap_lai();
  };

  return (
    <div className="cn-cot-gap" style={{ marginTop: 16 }}>
      <div className="cn-hanh-dong cn-hanh-dong-3">
        <button type="button" className="cn-nut-hanh-dong cn-nut-chinh-dam" onClick={() => dat_mo_form('nghi')}>
          <i className="bt bt-plane-departure" />
          <span>
            <span className="cn-nut-hanh-dong-ten">{tra('cn_xin_nghi_phep')}</span>
            <span className="cn-nut-hanh-dong-phu">{tra('cn_nghi_phep_phu')}</span>
          </span>
        </button>
        <button type="button" className="cn-nut-hanh-dong cn-nut-canh-bao" onClick={() => dat_mo_form('giai')}>
          <i className="bt bt-clock-exclamation" />
          <span>
            <span className="cn-nut-hanh-dong-ten">{tra('cn_giai_trinh_quen_quet')}</span>
            <span className="cn-nut-hanh-dong-phu">{tra('cn_bu_gio_thieu')}</span>
          </span>
        </button>
        <button type="button" className="cn-nut-hanh-dong cn-nut-thuong" onClick={() => dat_mo_form('khac')}>
          <i className="bt bt-plus" />
          <span>
            <span className="cn-nut-hanh-dong-ten">{tra('cn_don_khac')}</span>
            <span className="cn-nut-hanh-dong-phu">{tra('cn_don_khac_phu')}</span>
          </span>
        </button>
        <button type="button" className="cn-nut-hanh-dong cn-nut-thuong" onClick={() => dat_mo_form('ot')}>
          <i className="bt bt-clock" />
          <span>
            <span className="cn-nut-hanh-dong-ten">{tra('cn_dang_ky_ot')}</span>
            <span className="cn-nut-hanh-dong-phu">{tra('cn_lam_them_gio_duyet_2_cap')}</span>
          </span>
        </button>
      </div>

      {phep !== null && (
        <div className="the">
          <div className="cn-tieu-de-hang">
            <h2>{tra('cn_quy_phep_nam_x', { n: thang_nay().slice(0, 4) })}</h2>
            <span className="cn-phu">{tra('cn_con')} {so_viet(phep.con_lai)}/{so_viet(phep.quy)} {tra('pl_ngay_unit')}</span>
          </div>
          <div className="cn-thanh">
            <div
              className="cn-thanh-day"
              style={{ width: `${phep.quy === 0 ? 0 : Math.max(0, Math.min(100, Math.round((phep.con_lai / phep.quy) * 100)))}%` }}
            />
          </div>
          <span className="cn-chu-nho">
            {tra('cn_da_dung_x_ngay', { n: so_viet(phep.da_dung) })}
            {phep.cho_duyet > 0 && <> · {tra('cn_chua_tru_x_ngay', { n: so_viet(phep.cho_duyet) })}</>}.
          </span>
        </div>
      )}

      <div className="hang-nut">
        {([['tat_ca', tra('cn_tat_ca')], ['cho_duyet', tra('cn_dang_cho', { n: so_cho })], ['da_duyet', tra('cn_da_duyet')], ['tu_choi', tra('cn_tu_choi')]] as const)
          .map(([ma, ten]) => (
            <button
              type="button"
              key={ma}
              className={`nut nut-nho ${loc === ma ? 'nut-chinh' : ''}`}
              onClick={() => dat_loc(ma)}
            >
              {ten}
            </button>
          ))}
      </div>

      {nghi.loi !== null && <HopLoi loi={nghi.loi} />}
      {giai.loi !== null && <HopLoi loi={giai.loi} />}
      {khac.loi !== null && <HopLoi loi={khac.loi} />}

      {ds.length === 0 ? (
        <Trong
          tieu_de={tra('cn_khong_co_don_o_loc')}
          mo_ta={tra('cn_chon_tat_ca_xem')}
        />
      ) : (
        ds.map((d) => (
          <TheDon key={d.id} d={d} khi_huy={() => {
            if (d.nhom === 'nghi_phep') {
              void (async () => { nghi.nap_lai(); hom_nay_nap.nap_lai(); })();
            } else if (d.nhom === 'giai_trinh') giai.nap_lai();
            else khac.nap_lai();
          }} />
        ))
      )}

      {mo_form === 'nghi' && (
        <SheetNghiPhep phep={phep} khi_dong={() => dat_mo_form(null)} khi_xong={sau_khi_xong} />
      )}
      {mo_form === 'giai' && (
        <SheetGiaiTrinh khi_dong={() => dat_mo_form(null)} khi_xong={sau_khi_xong} />
      )}
      {mo_form === 'khac' && (
        <SheetDonKhac
          loai_don={loai_don.du_lieu?.danh_sach ?? null}
          khi_dong={() => dat_mo_form(null)}
          khi_xong={sau_khi_xong}
        />
      )}
      {mo_form === 'ot' && (
        <SheetDangKyOt khi_dong={() => dat_mo_form(null)} khi_xong={sau_khi_xong} />
      )}
    </div>
  );
}

/** Ba buoc duyet don: Da gui -> Nguoi duyet -> Hoan tat. */
function buoc_don(d: DonGop): { ten: string; lop: string }[] {
  const buocs = [tra_hien_tai('cn_da_gui'), tra_hien_tai('cn_nguoi_duyet'), tra_hien_tai('cn_hoan_tat')];
  return buocs.map((ten, i) => {
    if (d.trang_thai === 'da_huy') return { ten, lop: 'cn-buoc-mo' };
    if (d.trang_thai === 'tu_choi' && i === 1) return { ten, lop: 'cn-buoc-xau' };
    if (d.trang_thai === 'da_duyet') return { ten, lop: 'cn-buoc-tot' };
    if (i === 0) return { ten, lop: 'cn-buoc-tot' };
    if (d.trang_thai === 'cho_duyet' && i === 1) return { ten, lop: 'cn-buoc-cho' };
    return { ten, lop: 'cn-buoc-mo' };
  });
}

function TheDon({ d, khi_huy }: { d: DonGop; khi_huy: () => void }): ReactNode {
  const hd = dung_hanh_dong();
  const xac_nhan = dung_xac_nhan();
  const [mo_kq, dat_mo_kq] = useState(false);
  const { tra } = dung_chuoi();

  // Don giai trinh KHONG co duong huy tu phia nhan vien (xem may_chu/src/tuyen/toi.ts) —
  // muon rut lai thi nho nhan su xu ly.
  const huy_duoc = d.nhom !== 'giai_trinh' && d.trang_thai === 'cho_duyet';

  const huy = async (): Promise<void> => {
    const dong_y = await xac_nhan.hoi({
      tieu_de: tra('cn_huy_don_nay'),
      mo_ta: `${d.tieu_de} · ${d.chi_tiet}. ${tra('cn_huy_don_mo_ta')}`,
      chu_dong_y: tra('cn_huy_don'),
      nguy_hiem: true,
    });
    if (!dong_y) return;
    const duong = d.nhom === 'nghi_phep'
      ? `/api/toi/nghi-phep/${d.id}/huy`
      : `/api/toi/don/${d.id}/huy`;
    const ok = await hd.chay(() => goi(duong, { method: 'POST', body: {} }), tra('cn_da_huy_don'));
    if (ok) khi_huy();
  };

  const buocs = buoc_don(d);

  return (
    <div className="the">
      <div className="cn-don-dau">
        <div className="cn-don-tua">
          <span className="cn-don-tieu-de">{d.tieu_de}</span>
          <span className="cn-don-chi-tiet">{d.chi_tiet}</span>
          {d.ly_do !== null && d.ly_do !== '' && <span className="cn-don-ly-do">{tra('cn_ly_do_x', { n: d.ly_do })}</span>}
        </div>
        <NhanDon trang_thai={d.trang_thai} />
      </div>

      <div className="cn-buoc">
        {buocs.map((b, i) => (
          <div className="cn-buoc-o" key={`${b.ten}-${i}`}>
            <div className="cn-buoc-hang">
              <span className={`cn-buoc-cham ${b.lop}`} />
              {i < 2 && <span className={`cn-buoc-vach ${buocs[i + 1]?.lop === 'cn-buoc-mo' ? 'cn-buoc-vach-mo' : ''}`} />}
            </div>
            <span className={`cn-buoc-ten ${b.lop === 'cn-buoc-mo' ? 'cn-chu-nho' : ''}`}>{b.ten}</span>
          </div>
        ))}
      </div>

      {d.ghi_chu_duyet !== null && d.ghi_chu_duyet !== '' && (
        <div className={`hop-thong-bao ${d.trang_thai === 'tu_choi' ? 'hop-loi' : 'hop-luu-y'}`}>
          {d.ghi_chu_duyet}
        </div>
      )}

      {d.loai === 'lam_them' && d.trang_thai === 'cho_duyet_2' && (
        <div className="hop-thong-bao hop-tin">
          {tra('cn_duyet_cap_1')}
        </div>
      )}

      {d.loai === 'lam_them' && d.trang_thai === 'da_duyet' && (
        <button type="button" className="nut nut-nho" onClick={() => dat_mo_kq(true)}>
          {tra('cn_nop_ket_qua_ot')}
        </button>
      )}

      {d.trang_thai === 'cho_duyet' && d.nhom === 'giai_trinh' && (
        <span className="cn-chu-nho">{tra('cn_don_giai_trinh_khong_huy')}</span>
      )}

      {huy_duoc && (
        <button type="button" className="nut nut-nho cn-nut-huy" onClick={() => void huy()}>
          {tra('cn_huy_don')}
        </button>
      )}

      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      {xac_nhan.hop_thoai}

      {mo_kq && (
        <SheetKetQuaOt
          don={d}
          khi_dong={() => dat_mo_kq(false)}
          khi_xong={() => { dat_mo_kq(false); khi_huy(); }}
        />
      )}
    </div>
  );
}

/** Phan mo form de dung chung cho ba sheet. */
function CotForm({ children }: { children: ReactNode }): ReactNode {
  return <div className="cn-form">{children}</div>;
}

function NhanO({ nhan, children }: { nhan: string; children: ReactNode }): ReactNode {
  return (
    <label className="cn-o">
      <span className="cn-o-nhan">{nhan}</span>
      {children}
    </label>
  );
}

function SheetNghiPhep({ phep, khi_dong, khi_xong }: {
  phep: HomNay['phep'];
  khi_dong: () => void;
  khi_xong: () => void;
}): ReactNode {
  const hd = dung_hanh_dong();
  const { tra } = dung_chuoi();
  const [loai, dat_loai] = useState('phep_nam');
  const [tu_ngay, dat_tu] = useState(hom_nay());
  const [den_ngay, dat_den] = useState(hom_nay());
  const [nua_ngay, dat_nua] = useState(false);
  const [ly_do, dat_ly_do] = useState('');

  const so_ngay = nua_ngay ? 0.5
    : Math.max(1, (Date.parse(`${den_ngay}T00:00:00Z`) - Date.parse(`${tu_ngay}T00:00:00Z`)) / 86_400_000 + 1);

  const gui = async (): Promise<void> => {
    const ok = await hd.chay(() => goi('/api/toi/nghi-phep', {
      method: 'POST',
      body: { loai, tu_ngay, den_ngay: nua_ngay ? tu_ngay : den_ngay, nua_ngay, ly_do },
    }), tra('cn_da_gui_don'));
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de={tra('cn_xin_nghi_phep')} khi_dong={khi_dong}>
      <CotForm>
        <NhanO nhan={tra('cn_loai_nghi')}>
          <div className="cn-chip-hang">
            {LOAI_NGHI.map(([ma, khoa]) => (
              <button
                type="button"
                key={ma}
                className={`cn-chip ${loai === ma ? 'cn-chip-chon' : ''}`}
                onClick={() => dat_loai(ma)}
              >
                {tra(khoa)}
              </button>
            ))}
          </div>
        </NhanO>

        <NhanO nhan={tra('cn_thoi_gian_nghi')}>
          <div className="cn-chip-hang">
            <button type="button" className={`cn-chip ${!nua_ngay ? 'cn-chip-chon' : ''}`} onClick={() => dat_nua(false)}>
              {tra('cn_ca_ngay')}
            </button>
            <button type="button" className={`cn-chip ${nua_ngay ? 'cn-chip-chon' : ''}`} onClick={() => dat_nua(true)}>
              {tra('cn_nua_ngay')}
            </button>
          </div>
          <div className="cn-hai-o">
            <NhanO nhan={tra('cn_tu_ngay')}>
              <input type="date" className="cn-nhap" value={tu_ngay} onChange={(e) => {
                dat_tu(e.target.value);
                if (e.target.value > den_ngay) dat_den(e.target.value);
              }} />
            </NhanO>
            {!nua_ngay && (
              <NhanO nhan={tra('cn_den_ngay')}>
                <input type="date" className="cn-nhap" value={den_ngay} onChange={(e) => dat_den(e.target.value)} />
              </NhanO>
            )}
          </div>
          <div className="hop-thong-bao hop-tin">
            {nua_ngay ? tra('cn_nghi_nua_ngay_x', { n: ngay_viet(tu_ngay) })
              : tra('cn_ngay_nghi_khoang', { n: so_ngay, tu: ngay_viet(tu_ngay), den: ngay_viet(den_ngay) })}
            {phep !== null && loai === 'phep_nam' && (
              <> · {tra('cn_con_lai_ngay_phep', { n: so_viet(Math.max(0, so(phep.con_lai) - so_ngay)) })}</>
            )}
          </div>
        </NhanO>

        <NhanO nhan={tra('cn_ly_do')}>
          <textarea className="cn-nhap" rows={3} value={ly_do} placeholder={tra('cn_viec_gia_dinh')} onChange={(e) => dat_ly_do(e.target.value)} />
        </NhanO>

        <div className="cn-form-nut">
          <button type="button" className="nut" onClick={khi_dong}>{tra('cn_huy')}</button>
          <button type="button" className="nut nut-chinh" disabled={hd.dang_chay} onClick={() => void gui()}>
            {tra('cn_gui_don')}
          </button>
        </div>
        <HopLoi loi={hd.loi} />
      </CotForm>
    </HopThoai>
  );
}

/** Ngay thieu gio quet trong khoang du lieu nhan duoc, de chon trong form giai trinh. */
function ngay_thieu_gio(ds: NgayCongNgay[]): NgayCongNgay[] {
  return ds.filter((d) => d.ngay <= hom_nay()
    && d.trang_thai === 'co_mat'
    && (d.gio_vao === null || d.gio_ra === null))
    .slice().reverse();
}

function SheetGiaiTrinh({ khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void }): ReactNode {
  const hd = dung_hanh_dong();
  const { tra } = dung_chuoi();
  // Ghep ca thang truoc de cac ngay thieu gio dau thang khong bien mat.
  const thang_hien = thang_nay();
  const thang_dau_7 = cong_ngay(hom_nay(), -6).slice(0, 7);
  const bang_cong = dung_nap<BangCongThang>(`/api/toi/bang-cong?thang=${thang_hien}`);
  const bang_cong_truoc = dung_nap<BangCongThang>(
    thang_dau_7 !== thang_hien ? `/api/toi/bang-cong?thang=${thang_dau_7}` : null,
  );
  const ds_thieu = ngay_thieu_gio([
    ...(bang_cong_truoc.du_lieu?.ngay ?? []),
    ...(bang_cong.du_lieu?.ngay ?? []),
  ]);

  const [ngay, dat_ngay] = useState(ds_thieu[0]?.ngay ?? hom_nay());
  const [gio_vao, dat_gio_vao] = useState('');
  const [gio_ra, dat_gio_ra] = useState('');
  const [ly_do, dat_ly_do] = useState('');

  const du_ly_do = ly_do.trim().length >= 5;

  const gui = async (): Promise<void> => {
    if (ngay === '') return;
    const ok = await hd.chay(() => goi('/api/toi/giai-trinh', {
      method: 'POST',
      body: {
        ngay,
        gio_vao_de_xuat: gio_vao === '' ? null : gio_vao,
        gio_ra_de_xuat: gio_ra === '' ? null : gio_ra,
        ly_do,
      },
    }), tra('cn_da_gui_giai_trinh'));
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de={tra('cn_giai_trinh_quen_quet')} khi_dong={khi_dong} rong>
      <CotForm>
        {ds_thieu.length > 0 && (
          <NhanO nhan={tra('cn_ngay_thieu_gio_he_thong')}>
            <div className="cn-chip-hang">
              {ds_thieu.slice(0, 6).map((d) => (
                <button
                  type="button"
                  key={d.ngay}
                  className={`cn-chip cn-chip-dai ${ngay === d.ngay ? 'cn-chip-chon' : ''}`}
                  onClick={() => dat_ngay(d.ngay)}
                >
                  <span className="cn-chip-dai-ten">{thu_cua_ngay(d.ngay)}, {ngay_viet(d.ngay)}</span>
                  <span className="cn-chip-dai-phu">
                    {d.gio_vao === null ? tra('cn_thieu_gio_vao') : tra('cn_thieu_gio_ra')}
                  </span>
                </button>
              ))}
            </div>
          </NhanO>
        )}

        <NhanO nhan={tra('cn_ngay')}>
          <input type="date" className="cn-nhap" value={ngay} onChange={(e) => dat_ngay(e.target.value)} />
        </NhanO>

        <div className="cn-hai-o">
          <NhanO nhan={tra('cn_gio_vao_de_xuat')}>
            <input type="time" className="cn-nhap" value={gio_vao} onChange={(e) => dat_gio_vao(e.target.value)} />
          </NhanO>
          <NhanO nhan={tra('cn_gio_ra_de_xuat')}>
            <input type="time" className="cn-nhap" value={gio_ra} onChange={(e) => dat_gio_ra(e.target.value)} />
          </NhanO>
        </div>

        <NhanO nhan={tra('cn_ly_do_bat_buoc')}>
          <textarea
            className="cn-nhap"
            rows={3}
            value={ly_do}
            placeholder={tra('cn_may_khong_nhan_khuon_mat')}
            onChange={(e) => dat_ly_do(e.target.value)}
          />
        </NhanO>

        <span className="cn-chu-nho">{tra('cn_chi_dien_moc_thieu')}</span>

        <div className="cn-form-nut">
          <button type="button" className="nut" onClick={khi_dong}>{tra('cn_huy')}</button>
          <button
            type="button"
            className="nut nut-chinh"
            disabled={hd.dang_chay || !du_ly_do || ngay === ''}
            onClick={() => void gui()}
          >
            {tra('cn_gui_giai_trinh')}
          </button>
        </div>
        <HopLoi loi={hd.loi} />
      </CotForm>
    </HopThoai>
  );
}

function SheetDonKhac({ loai_don, khi_dong, khi_xong }: {
  loai_don: LoaiDon[] | null;
  khi_dong: () => void;
  khi_xong: () => void;
}): ReactNode {
  const hd = dung_hanh_dong();
  const { tra } = dung_chuoi();
  const [loai, dat_loai] = useState('lam_them');
  const [tu_ngay, dat_tu] = useState(hom_nay());
  const [den_ngay, dat_den] = useState(hom_nay());
  const [gio_bat_dau, dat_gio_bat_dau] = useState('18:00');
  const [gio_ket_thuc, dat_gio_ket_thuc] = useState('20:30');
  const [noi_den, dat_noi_den] = useState('');
  const [ly_do, dat_ly_do] = useState('');

  const dt = loai_don?.find((l) => l.ma === loai) ?? null;

  const luu_y = loai === 'doi_ca'
    ? tra('cn_luu_y_doi_ca')
    : loai === 'thoi_viec'
      ? tra('cn_luu_y_thoi_viec')
      : loai === 'lam_them'
        ? tra('cn_luu_y_lam_them')
        : loai === 've_som'
          ? tra('cn_luu_y_ve_som')
          : loai === 'lam_remote'
            ? tra('cn_luu_y_lam_remote')
            : '';

  const gui = async (): Promise<void> => {
    const ok = await hd.chay(() => goi('/api/toi/don', {
      method: 'POST',
      body: {
        loai,
        tu_ngay,
        den_ngay: dt?.co_khoang_ngay === true ? den_ngay : null,
        gio_bat_dau: loai === 'lam_them' || loai === 've_som' ? gio_bat_dau : null,
        gio_ket_thuc: loai === 'lam_them' ? gio_ket_thuc : null,
        noi_den: loai === 'cong_tac' ? noi_den : null,
        ly_do,
      },
    }), tra('cn_da_gui_don'));
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de={tra('cn_lam_don')} khi_dong={khi_dong} rong>
      <CotForm>
        <NhanO nhan={tra('cn_loai_don')}>
          <div className="cn-chip-hang">
            {(loai_don ?? []).map((l) => (
              <button
                type="button"
                key={l.ma}
                className={`cn-chip ${loai === l.ma ? 'cn-chip-chon' : ''}`}
                onClick={() => dat_loai(l.ma)}
              >
                {l.ten.replace('Đơn xin ', '')}
              </button>
            ))}
          </div>
        </NhanO>

        <div className="cn-hai-o">
          <NhanO nhan={dt?.nhan_tu_ngay ?? tra('cn_ngay')}>
            <input type="date" className="cn-nhap" value={tu_ngay} onChange={(e) => {
              dat_tu(e.target.value);
              if (e.target.value > den_ngay) dat_den(e.target.value);
            }} />
          </NhanO>
          {dt?.co_khoang_ngay === true && (
            <NhanO nhan={tra('cn_den_ngay')}>
              <input type="date" className="cn-nhap" value={den_ngay} onChange={(e) => dat_den(e.target.value)} />
            </NhanO>
          )}
        </div>

        {loai === 'lam_them' && (
          <div className="cn-hai-o">
            <NhanO nhan={tra('cn_tu_gio')}>
              <input type="time" className="cn-nhap" value={gio_bat_dau} onChange={(e) => dat_gio_bat_dau(e.target.value)} />
            </NhanO>
            <NhanO nhan={tra('cn_den_gio')}>
              <input type="time" className="cn-nhap" value={gio_ket_thuc} onChange={(e) => dat_gio_ket_thuc(e.target.value)} />
            </NhanO>
          </div>
        )}

        {loai === 've_som' && (
          <NhanO nhan={tra('cn_gio_du_kien_ra_ve')}>
            <input type="time" className="cn-nhap" value={gio_bat_dau} onChange={(e) => dat_gio_bat_dau(e.target.value)} />
          </NhanO>
        )}

        {loai === 'cong_tac' && (
          <NhanO nhan={tra('cn_noi_den')}>
            <input type="text" className="cn-nhap" value={noi_den} placeholder="Đà Nẵng" onChange={(e) => dat_noi_den(e.target.value)} />
          </NhanO>
        )}

        <NhanO nhan={loai === 'cong_tac' ? tra('cn_noi_dung_cong_tac') : tra('cn_ly_do')}>
          <textarea className="cn-nhap" rows={3} value={ly_do} onChange={(e) => dat_ly_do(e.target.value)} />
        </NhanO>

        {luu_y !== '' && <div className="hop-thong-bao hop-luu-y">{luu_y}</div>}

        <div className="cn-form-nut">
          <button type="button" className="nut" onClick={khi_dong}>{tra('cn_huy')}</button>
          <button type="button" className="nut nut-chinh" disabled={hd.dang_chay} onClick={() => void gui()}>
            {tra('cn_gui_don')}
          </button>
        </div>
        <HopLoi loi={hd.loi} />
      </CotForm>
    </HopThoai>
  );
}

/** Dang ky lam them gio (OT) — don loai `lam_them`, duyet hai cap roi nop ket qua bang anh. */
function SheetDangKyOt({ khi_dong, khi_xong }: {
  khi_dong: () => void;
  khi_xong: () => void;
}): ReactNode {
  const hd = dung_hanh_dong();
  const { tra } = dung_chuoi();
  const [tu_ngay, dat_tu] = useState(hom_nay());
  const [gio_bat_dau, dat_gio_bat_dau] = useState('17:30');
  const [gio_ket_thuc, dat_gio_ket_thuc] = useState('20:00');
  const [ly_do, dat_ly_do] = useState('');
  const [tep, dat_tep] = useState<File | null>(null);

  const du = gio_bat_dau !== '' && gio_ket_thuc !== '' && gio_ket_thuc > gio_bat_dau;

  const gui = async (): Promise<void> => {
    const ok = await hd.chay(async () => {
      // Tao don truoc de lay id, roi moi tai tep kem len (route tai-lieu can id don).
      const don = await goi<{ id: string }>('/api/toi/don', {
        method: 'POST',
        body: {
          loai: 'lam_them', tu_ngay, den_ngay: null,
          gio_bat_dau, gio_ket_thuc, noi_den: null, ly_do,
        },
      });
      if (tep !== null) {
        const fd = new FormData();
        fd.append('tep', tep);
        await gui_tep(`/api/toi/don/${don.id}/tai-lieu`, fd);
      }
    }, tra('cn_da_gui_don'));
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de={tra('cn_dang_ky_lam_them_tieu_de')} khi_dong={khi_dong} rong>
      <CotForm>
        <NhanO nhan={tra('cn_ngay_lam_them')}>
          <input type="date" className="cn-nhap" value={tu_ngay} onChange={(e) => dat_tu(e.target.value)} />
        </NhanO>

        <div className="cn-hai-o">
          <NhanO nhan={tra('cn_tu_gio')}>
            <input type="time" className="cn-nhap" value={gio_bat_dau} onChange={(e) => dat_gio_bat_dau(e.target.value)} />
          </NhanO>
          <NhanO nhan={tra('cn_den_gio')}>
            <input type="time" className="cn-nhap" value={gio_ket_thuc} onChange={(e) => dat_gio_ket_thuc(e.target.value)} />
          </NhanO>
        </div>

        <NhanO nhan={tra('cn_ly_do')}>
          <textarea
            className="cn-nhap"
            rows={3}
            value={ly_do}
            placeholder="Gấp đơn hàng, chạy máy bù, họp với khách…"
            onChange={(e) => dat_ly_do(e.target.value)}
          />
        </NhanO>

        <div className="cn-o">
          <span className="cn-o-nhan">{tra('cn_tai_lieu_kem')}</span>
          <OKeoTep
            ma="ot-tai-lieu"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            khi_nhan={(ds) => dat_tep(ds?.[0] ?? null)}
          />
          {tep !== null && <span className="cn-chu-nho">{tra('cn_da_chon_tep', { n: tep.name })}</span>}
        </div>

        <div className="hop-thong-bao hop-tin">
          {tra('cn_hop_ot_2_cap')}
        </div>

        <div className="cn-form-nut">
          <button type="button" className="nut" onClick={khi_dong}>{tra('cn_huy')}</button>
          <button
            type="button"
            className="nut nut-chinh"
            disabled={hd.dang_chay || !du || tu_ngay === ''}
            onClick={() => void gui()}
          >
            {tra('cn_gui_don')}
          </button>
        </div>
        <HopLoi loi={hd.loi} />
      </CotForm>
    </HopThoai>
  );
}

interface KetQuaOtToi {
  id: string;
  trang_thai: string;
  ghi_chu: string | null;
  ghi_chu_duyet: string | null;
  tao_luc: string;
}

/** Nop ket qua OT cua don da duyet: 1-5 anh + ghi chu. */
function SheetKetQuaOt({ don, khi_dong, khi_xong }: {
  don: DonGop;
  khi_dong: () => void;
  khi_xong: () => void;
}): ReactNode {
  const hd = dung_hanh_dong();
  const { du_lieu, nap_lai } = dung_nap<{ ket_qua: KetQuaOtToi | null }>(
    `/api/toi/don/${don.id}/ket-qua`);
  const { tra } = dung_chuoi();
  const [anh, dat_anh] = useState<File[]>([]);
  const [ghi_chu, dat_ghi_chu] = useState('');
  const kq = du_lieu?.ket_qua ?? null;

  const gui = async (): Promise<void> => {
    const fd = new FormData();
    for (const a of anh) fd.append('anh', a);
    fd.append('ghi_chu', ghi_chu);
    const ok = await hd.chay(
      () => gui_tep(`/api/toi/don/${don.id}/ket-qua`, fd),
      tra('cn_da_nop_kq_ot'),
    );
    if (ok) {
      nap_lai();
      dat_anh([]);
      dat_ghi_chu('');
      khi_xong();
    }
  };

  return (
    <HopThoai tieu_de={tra('cn_ket_qua_ot', { n: don.chi_tiet })} khi_dong={khi_dong} rong>
      <CotForm>
        {kq === null && (
          <div className="hop-thong-bao hop-tin">
            {tra('cn_ket_qua_ot_huong_dan')}
          </div>
        )}
        {kq !== null && kq.trang_thai === 'cho_duyet' && (
          <div className="hop-thong-bao hop-tin">
            {tra('cn_kq_da_nop')}
          </div>
        )}
        {kq !== null && kq.trang_thai === 'da_duyet' && (
          <div className="hop-thong-bao hop-tot">{tra('cn_kq_da_duyet')}</div>
        )}
        {kq !== null && kq.trang_thai === 'tu_choi' && (
          <div className="hop-thong-bao hop-loi">
            {tra('cn_kq_tu_choi', {
              n: kq.ghi_chu_duyet !== null && kq.ghi_chu_duyet !== '' ? `: ${kq.ghi_chu_duyet}` : '',
            })}
          </div>
        )}

        <div className="cn-o">
          <span className="cn-o-nhan">{tra('cn_anh_ket_qua')}</span>
          <OKeoTep
            ma="ot-ket-qua-anh"
            nhieu
            accept="image/jpeg,image/png"
            khi_nhan={(ds) => dat_anh(Array.from(ds ?? []).slice(0, 5))}
          />
          {anh.length > 0 && (
            <span className="cn-chu-nho">
              {tra('cn_da_chon_x_anh', { n: anh.length, ten: anh.map((a) => a.name).join(', ') })}
            </span>
          )}
        </div>

        <NhanO nhan={tra('cn_ghi_chu_khong_bat_buoc')}>
          <textarea className="cn-nhap" rows={2} value={ghi_chu} onChange={(e) => dat_ghi_chu(e.target.value)} />
        </NhanO>

        <div className="cn-form-nut">
          <button type="button" className="nut" onClick={khi_dong}>{tra('cn_dong')}</button>
          <button
            type="button"
            className="nut nut-chinh"
            disabled={hd.dang_chay || anh.length === 0}
            onClick={() => void gui()}
          >
            {hd.dang_chay ? tra('cn_dang_gui') : tra('cn_nop_ket_qua')}
          </button>
        </div>
        <HopLoi loi={hd.loi} />
      </CotForm>
    </HopThoai>
  );
}

// ==================================================================== man luong

function ManLuong(): ReactNode {
  // Mặc định mở KỲ LƯƠNG MỚI NHẤT ĐÃ CÓ (có kỳ nào hiện kỳ đó), KHÔNG phải tháng lịch hiện tại —
  // tháng chưa có kỳ mà mở ra "chưa có phiếu" gây hiểu nhầm. Người dùng vẫn bấm ‹ › để xem tháng khác.
  const phieu = dung_nap<{ thang: string }[]>('/api/toi/phieu-luong');
  const { tra } = dung_chuoi();
  const [thang_chon, dat_thang] = useState<string | null>(null);
  const ky_moi_nhat = (phieu.du_lieu ?? [])[0]?.thang ?? null;
  const thang = thang_chon ?? ky_moi_nhat ?? thang_nay();
  const { du_lieu, dang_tai, loi } = dung_nap<LuongToi>(`/api/toi/luong?thang=${thang}`, [thang]);

  if (phieu.dang_tai || (dang_tai && du_lieu === null)) return <XuongDanhSach />;
  if (loi !== null) return <HopLoi loi={loi} />;
  if (du_lieu === null) return null;

  const t = du_lieu.co_so_tinh_luong;
  const phep = du_lieu.phep;
  const [nam, thg] = thang.split('-').map(Number);
  const so_ngay_phai = so(t.so_ngay_phai_lam);
  const ty_le = so_ngay_phai === 0 ? 0 : Math.round((so(t.tong_cong) / so_ngay_phai) * 100);

  return (
    <div className="cn-cot-gap" style={{ marginTop: 12 }}>
      <div className="cn-chon-thang cn-chon-thang-gon">
        <button
          type="button"
          className="cn-nut-vuong"
          aria-label={tra('cn_ky_truoc')}
          onClick={() => dat_thang(thg === 1 ? `${(nam ?? 0) - 1}-12` : `${nam}-${String((thg ?? 1) - 1).padStart(2, '0')}`)}
        >
          ‹
        </button>
        <span className="cn-chon-thang-ten">{tra('cn_ky_thang_x', { n: `${String(thg).padStart(2, '0')}/${nam}` })}</span>
        <button
          type="button"
          className="cn-nut-vuong"
          aria-label={tra('cn_ky_sau')}
          disabled={thang >= thang_nay()}
          onClick={() => dat_thang(thg === 12 ? `${(nam ?? 0) + 1}-01` : `${nam}-${String((thg ?? 1) + 1).padStart(2, '0')}`)}
        >
          ›
        </button>
      </div>

      {du_lieu.phieu_luong === null && (
        <div className="hop-thong-bao hop-tin">
          <strong>{tra('cn_ky_chua_co_phieu')}</strong> {du_lieu.ly_do_chua_co_phieu_luong}
          {' '}{tra('cn_duoi_day_du_lieu_cham_cong')}
        </div>
      )}
      {du_lieu.phieu_luong !== null && <TrangPhieuLuongToi thang_loc={thang} />}

      {du_lieu.phieu_luong === null && (
        <>
      {/* Phan con lai xep hai cot nhu dashboard de ca man nam gon trong mot khung hinh. */}
      <div className="cn-luong-luoi">
        <div className="cn-cot-gap">
          {du_lieu.phieu_luong !== null && (
            <div className="cn-dau-mong">{tra('pl_co_so_cham_cong')}</div>
          )}
          <div className="luoi luoi-4">
            <OSo nhan={tra('cn_cong_thuc_te')} gia_tri={so_viet(t.tong_cong)} phu={tra('cn_ngay_da_co_du_lieu', { n: so(t.so_ngay_co_du_lieu) })} />
            <OSo nhan={tra('cn_gio_lam')} gia_tri={phut_thanh_chu(so(t.tong_phut_lam))} phu={tra('cn_da_tru_gio_nghi_trua')} />
            <OSo nhan={tra('cn_ot_ghi_nhan')} gia_tri={phut_thanh_chu(so(t.tong_phut_ot))} phu={tra('cn_chua_duyet_tra_them')} mau="lanh" />
            <OSo nhan={tra('cn_tt_vang')} gia_tri={tra('cn_ngay_x', { n: so(t.so_ngay_vang) })} phu={tra('cn_khong_phep')} mau={so(t.so_ngay_vang) > 0 ? 'xau' : undefined} />
          </div>

          <div className="the">
            <div className="cn-tieu-de-hang">
              <h2>{tra('cn_cong_thuc_te_chuan')}</h2>
              <span className="cn-phu">{so_viet(t.tong_cong)}/{so_ngay_phai}</span>
            </div>
            <div className="cn-thanh">
              <div className="cn-thanh-day" style={{ width: `${Math.min(100, ty_le)}%` }} />
            </div>
          </div>
        </div>

        <div className="cn-cot-gap">
          <div className="the the-mong">
            <div className="cn-dau-mong">{tra('cn_chi_tiet_ky_thang', { n: `${String(thg).padStart(2, '0')}/${nam}` })}</div>
            {[
              [tra('cn_ngay_co_mat'), `${so(t.so_ngay_co_mat)}`],
              [tra('cn_tt_nghi_phep'), `${so(t.so_ngay_nghi_phep)}`],
              [tra('cn_tt_ngay_le'), `${so(t.so_ngay_le)}`],
              [tra('cn_di_muon'), `${so(t.so_lan_di_muon)} ${tra('pl_lan')} · ${phut_thanh_chu(so(t.tong_phut_muon))}`],
              [tra('cn_ve_som'), `${so(t.so_lan_ve_som)} ${tra('pl_lan')} · ${phut_thanh_chu(so(t.tong_phut_ve_som))}`],
            ].map(([ten, gia]) => (
              <div className="cn-hang-don" key={ten}>
                <span>{ten}</span>
                <span className="cn-so">{gia}</span>
              </div>
            ))}
          </div>

          {phep !== null && (
            <div className="the">
              <div className="cn-tieu-de-hang">
                <h2>{tra('cn_quy_phep_nam_x', { n: thang.slice(0, 4) })}</h2>
                <span className="cn-phu">{tra('cn_con')} {so_viet(phep.con_lai)}/{so_viet(phep.quy)} {tra('pl_ngay_unit')}</span>
              </div>
              <div className="cn-thanh">
                <div
                  className="cn-thanh-day cn-thanh-lanh"
                  style={{ width: `${phep.quy === 0 ? 0 : Math.max(0, Math.min(100, Math.round((phep.con_lai / phep.quy) * 100)))}%` }}
                />
              </div>
              {phep.cho_duyet > 0 && (
                <span className="cn-chu-nho">{tra('cn_chua_tru_x_ngay', { n: so_viet(phep.cho_duyet) })}</span>
              )}
            </div>
          )}

          <div className="hop-thong-bao hop-luu-y">
            {du_lieu.da_chot
              ? tra('cn_chot_roi')
              : tra('cn_chua_chot')}
            {' '}{du_lieu.ghi_chu_ot}
          </div>
        </div>
      </div>
          </>
        )}

      {du_lieu.phieu_luong !== null && (
        <div className="hop-thong-bao hop-luu-y">
          {du_lieu.da_chot
            ? tra('cn_chot_roi_phieu')
            : tra('cn_chua_chot_phieu')}
          {' '}{du_lieu.ghi_chu_ot}
        </div>
      )}
    </div>
  );
}

interface LuongToi {
  thang: string;
  tu: string;
  den: string;
  co_so_tinh_luong: TongHopThang;
  phep: { quy: number; da_dung: number; con_lai: number; cho_duyet: number } | null;
  da_chot: boolean;
  phieu_luong: unknown;
  ghi_chu_ot: string;
  ly_do_chua_co_phieu_luong: string;
}

// ==================================================================== man ca nhan

type TabCN = 'chung' | 'tai_lieu' | 'hop_dong' | 'luong' | 'phu_thuoc' | 'bhxh'
  | 'cong_viec' | 'thiet_bi' | 'cai_dat';

const CAC_TAB_CN: { ma: TabCN; khoa: ChuoiKhoa }[] = [
  { ma: 'chung', khoa: 'cn_thong_tin_chung' },
  { ma: 'tai_lieu', khoa: 'cn_tai_lieu' },
  { ma: 'hop_dong', khoa: 'cn_hop_dong' },
  { ma: 'luong', khoa: 'cn_luong' },
  { ma: 'phu_thuoc', khoa: 'cn_nguoi_phu_thuoc' },
  { ma: 'bhxh', khoa: 'cn_bhxh_bhyt' },
  { ma: 'cong_viec', khoa: 'cn_cong_viec' },
  { ma: 'thiet_bi', khoa: 'cn_thiet_bi' },
  { ma: 'cai_dat', khoa: 'cn_cai_dat' },
];

function ManCaNhan(): ReactNode {
  const [tab, dat_tab] = useState<TabCN>('chung');
  const { du_lieu, dang_tai, loi } = dung_nap<HoSoToi>('/api/toi/ho-so');
  const { tra } = dung_chuoi();

  if (dang_tai && du_lieu === null) return <XuongDanhSach />;
  if (loi !== null) return <HopLoi loi={loi} />;
  if (du_lieu === null) return null;

  const nv = du_lieu.nhan_vien;
  // `== null` bat CA null lan undefined: neu may chu doi hinh dang tra ve (khong long duoi
  // `nhan_vien`) thi hien thong bao thay vi vo trang khi doc `nv.ho_ten`.
  if (nv == null) {
    return (
      <Trong
        tieu_de={tra('cn_tk_chua_noi_ho_so')}
        mo_ta={tra('cn_nho_nhan_su_gan')}
      />
    );
  }

  // Tien do tai lieu bat buoc (khong tinh nhung giay chi phat sinh khi nghi viec).
  const tl_bat_buoc = du_lieu.tai_lieu.filter((t) => t.bat_buoc && !t.chi_khi_nghi_viec);
  const tl_du = tl_bat_buoc.filter((t) => t.trang_thai === 'da_len_phan_mem').length;
  const tl_thieu = tl_bat_buoc.filter((t) => t.trang_thai === 'thieu').length;
  const ty_le_tl = tl_bat_buoc.length === 0 ? 0 : Math.round((tl_du / tl_bat_buoc.length) * 100);

  return (
    <div className="cn-cot-gap" style={{ marginTop: 16 }}>
      {/* hero ho so */}
      <div className="cn-hs-hero">
        <div className="cn-hs-av">
          <span className="cn-hs-av-chu">{chu_dau(nv.ho_ten)}</span>
          <span className={nv.dang_hoat_dong ? 'cn-hs-dot-tot' : 'cn-hs-dot-xam'} />
        </div>
        <div className="cn-hs-chinh">
          <span className="cn-hs-ten">{nv.ho_ten}</span>
          <span className="cn-hs-phu">
            {nv.ma_nv} · {tra('cn_vao_lam_x', { n: ngay_viet(nv.ngay_vao) })}
            {nv.ngay_vao !== null && tham_nien(nv.ngay_vao) !== '' && <> · {tra('cn_tham_nien_x', { n: tham_nien(nv.ngay_vao) })}</>}
          </span>
          <div className="cn-hs-chip-hang">
            <span className="cn-hs-chip-xanh">{nv.chuc_danh ?? tra('vai_tro_nhan_vien')}</span>
            {nv.phong_ban !== null && <span className="cn-hs-chip">{nv.phong_ban}</span>}
            {nv.ca_lam !== null && (
              <span className="cn-hs-chip">
                {nv.ca_lam} {nv.gio_vao !== null && `· ${gio_hh_mm(nv.gio_vao)}–${gio_hh_mm(nv.gio_ra)}`}
              </span>
            )}
            {du_lieu.hop_dong === null && <span className="cn-hs-chip-canh-bao">{tra('cn_chua_co_hop_dong_hieu_luc')}</span>}
          </div>
        </div>
        <div className="cn-hs-tl">
          <div
            className="cn-hs-vong"
            style={{ background: `conic-gradient(var(--chinh) ${ty_le_tl * 3.6}deg, var(--nen-mo) 0)` }}
          >
            <span className="cn-hs-vong-so">{tl_du}/{tl_bat_buoc.length}</span>
          </div>
          <div className="cn-hs-tl-phai">
            <span className="cn-hs-tl-ten">{tra('cn_ho_so_tai_lieu')}</span>
            <span className="cn-hs-tl-phu">{tl_thieu === 0 ? tra('cn_du_tai_lieu_bat_buoc') : tra('cn_con_thieu_tai_lieu', { n: tl_thieu })}</span>
            {tl_thieu > 0 && (
              <button type="button" className="cn-hs-tl-nut" onClick={() => dat_tab('tai_lieu')}>{tra('cn_xem_chi_tiet')}</button>
            )}
          </div>
        </div>
      </div>

      {/* o chi so ho so */}
      <div className="luoi luoi-4">
        <OSo nhan={tra('cn_pin_may')} gia_tri={nv.pin_may ?? '—'} phu={tra('cn_so_tren_may')} />
        <OSo nhan={tra('cn_ngay_vao')} gia_tri={ngay_viet(nv.ngay_vao)} phu={nv.ngay_chinh_thuc !== null ? tra('cn_chinh_thuc_x', { n: ngay_viet(nv.ngay_chinh_thuc) }) : tra('cn_chua_co_ngay_chinh_thuc')} />
        <OSo
          nhan={tra('cn_hop_dong_hien_tai')}
          gia_tri={du_lieu.hop_dong === null ? '—' : tra_khoa(KHOA_LOAI_HOP_DONG[du_lieu.hop_dong.loai], du_lieu.hop_dong.loai)}
          phu={du_lieu.hop_dong === null ? tra('cn_chua_co_hop_dong_hieu_luc') : du_lieu.hop_dong.hieu_luc_den !== null ? tra('cn_den_x', { n: ngay_viet(du_lieu.hop_dong.hieu_luc_den) }) : tra('cn_kxd_thoi_han')}
          mau={du_lieu.hop_dong === null ? 'xau' : undefined}
        />
        <OSo
          nhan={tra('cn_luong_hien_tai')}
          gia_tri={du_lieu.luong === null ? '—' : `${so_viet(du_lieu.luong.luong_co_ban)} ₫`}
          phu={du_lieu.luong === null ? tra('cn_chua_co_qd_luong') : tra('cn_phu_cap_x_dong', { n: so_viet(du_lieu.luong.phu_cap), m: tra_khoa(KHOA_HINH_THUC_LUONG[du_lieu.luong.hinh_thuc], du_lieu.luong.hinh_thuc) })}
        />
      </div>

      {/* tab con */}
      <div className="hang-tab">
        {CAC_TAB_CN.map((t) => (
          <button
            key={t.ma}
            className={tab === t.ma ? 'dang-chon' : ''}
            onClick={() => dat_tab(t.ma)}
          >
            {tra(t.khoa)}
            {t.ma === 'tai_lieu' && tl_thieu > 0 && <span className="dem-tab">{tl_thieu}</span>}
          </button>
        ))}
      </div>

      {tab === 'chung' && <NoiDungChung du_lieu={du_lieu} />}
      {tab === 'tai_lieu' && <NoiDungTaiLieu du_lieu={du_lieu} ty_le_tl={ty_le_tl} />}
      {tab === 'hop_dong' && <NoiDungHopDong du_lieu={du_lieu} />}
      {tab === 'luong' && <NoiDungLuongCN du_lieu={du_lieu} />}
      {tab === 'phu_thuoc' && <NoiDungPhuThuoc du_lieu={du_lieu} />}
      {tab === 'bhxh' && <NoiDungBhxh du_lieu={du_lieu} />}
      {tab === 'cong_viec' && <NoiDungCongViec du_lieu={du_lieu} />}
      {tab === 'thiet_bi' && <NoiDungThietBi du_lieu={du_lieu} />}
      {tab === 'cai_dat' && <NoiDungCaiDat />}
    </div>
  );
}

interface DongKhoi {
  nhan: string;
  gia_tri: string;
  mau?: 'xau' | 'tot' | 'lanh';
}

/** Khoi thong tin chung: tieu de + cac dong nhan/gia tri. */
function Khoi({ ten, phu, dong }: { ten: string; phu?: string; dong: DongKhoi[] }): ReactNode {
  return (
    <div className="the">
      <h2>{ten}</h2>
      {phu !== undefined && <p className="mo-ta">{phu}</p>}
      <div className="cn-khoi-dong">
        {dong.map((d) => (
          <div className="cn-khoi-hang" key={d.nhan}>
            <span className="cn-khoi-nhan">{d.nhan}</span>
            <span
              className="cn-khoi-gia"
              style={{ color: d.mau === undefined ? undefined
                : { xau: 'var(--xau)', tot: 'var(--tot)', lanh: 'var(--lanh)' }[d.mau] }}
            >
              {d.gia_tri}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoiDungChung({ du_lieu }: { du_lieu: HoSoToi }): ReactNode {
  const nv = du_lieu.nhan_vien;
  const cn = du_lieu.ca_nhan;
  const { tra } = dung_chuoi();
  if (nv === null) return null;

  const gt = cn?.gioi_tinh === 'nam' ? tra('cn_nam') : cn?.gioi_tinh === 'nu' ? tra('cn_nu') : '—';

  return (
    <div className="luoi luoi-2">
      <Khoi
        ten={tra('cn_thong_tin_ca_nhan')}
        phu={tra('cn_sai_thong_tin')}
        dong={[
          { nhan: tra('cn_ho_va_ten'), gia_tri: nv.ho_ten },
          { nhan: tra('cn_ngay_sinh'), gia_tri: ngay_viet(cn?.ngay_sinh ?? null) },
          { nhan: tra('cn_gioi_tinh'), gia_tri: gt },
          { nhan: 'CCCD', gia_tri: cn?.cccd_so ?? '—' },
          { nhan: tra('cn_dien_thoai'), gia_tri: nv.so_dien_thoai ?? '—' },
          { nhan: tra('cn_email_cong_ty'), gia_tri: nv.email ?? '—' },
          { nhan: tra('cn_noi_o_hien_tai'), gia_tri: cn?.dia_chi_hien_tai ?? '—' },
          { nhan: tra('cn_ma_so_thue'), gia_tri: cn?.ma_so_thue ?? '—' },
        ]}
      />
      <Khoi
        ten={tra('cn_tk_va_cham_cong')}
        dong={[
          { nhan: tra('cn_ma_nhan_vien'), gia_tri: nv.ma_nv },
          { nhan: tra('ten_dang_nhap'), gia_tri: du_lieu.ten_dang_nhap },
          { nhan: tra('cn_pin_tren_may'), gia_tri: nv.pin_may ?? tra('cn_chua_cap') },
          { nhan: tra('cn_cham_cong_dt'), gia_tri: nv.duoc_cham_cong_dien_thoai ? tra('cn_duoc_phep') : tra('cn_khong_quet_tai_may'), mau: nv.duoc_cham_cong_dien_thoai ? 'tot' : undefined },
          { nhan: tra('cn_mui_gio_tinh_cong'), gia_tri: `UTC+${mui_gio_offset_gio()}` },
          { nhan: tra('cn_trang_thai'), gia_tri: nv.dang_hoat_dong ? tra('cn_dang_lam_viec') : tra('cn_da_nghi_viec'), mau: nv.dang_hoat_dong ? 'tot' : 'xau' },
        ]}
      />
    </div>
  );
}

function NoiDungTaiLieu({ du_lieu, ty_le_tl }: { du_lieu: HoSoToi; ty_le_tl: number }): ReactNode {
  const tl_bat_buoc = du_lieu.tai_lieu.filter((t) => t.bat_buoc && !t.chi_khi_nghi_viec);
  const tl_du = tl_bat_buoc.filter((t) => t.trang_thai === 'da_len_phan_mem').length;
  const { tra } = dung_chuoi();
  return (
    <div className="cn-cot-gap">
      <div className="the">
        <div className="cn-tieu-de-hang">
          <h2>{tra('cn_tien_do_ho_so')}</h2>
          <span className="cn-phu">{tl_du}/{tl_bat_buoc.length}</span>
        </div>
        <div className="cn-thanh">
          <div className="cn-thanh-day" style={{ width: `${ty_le_tl}%` }} />
        </div>
        <span className="cn-chu-nho">{tra('cn_chi_tinh_du_khi')}</span>
      </div>

      <div className="the the-mong">
        {du_lieu.tai_lieu.map((t, i) => {
          const n = NHAN_TT_TAI_LIEU[t.trang_thai] ?? { khoa: 'cn_tt_thieu' as ChuoiKhoa, lop: 'nhan-mo' };
          const thieu = t.trang_thai === 'thieu' && t.bat_buoc && !t.chi_khi_nghi_viec;
          return (
            <div className={`cn-tl-dong ${i === 0 ? '' : 'cn-tl-vien'} ${thieu ? 'cn-tl-thieu' : ''}`} key={t.ma}>
              <div className="cn-tl-ten">
                <span className="cn-tl-ten-chinh">{t.ten}</span>
                <span className="cn-tl-mo-ta">{t.mo_ta ?? ''}</span>
              </div>
              <span className={`nhan ${n.lop}`}>{tra(n.khoa)}</span>
              <span className="cn-tl-tep">{t.ten_tep ?? '—'}</span>
            </div>
          );
        })}
      </div>
      <span className="cn-chu-nho" style={{ padding: '0 4px' }}>
        {tra('cn_tai_lieu_do_nhan_su')}
      </span>
    </div>
  );
}

function NoiDungHopDong({ du_lieu }: { du_lieu: HoSoToi }): ReactNode {
  const hd = du_lieu.hop_dong;
  const { tra } = dung_chuoi();
  if (du_lieu.nhan_vien === null) return null;
  return (
    <Khoi
      ten={tra('cn_hop_dong_hien_tai')}
      phu={hd === null
        ? tra('cn_hop_dong_hd_null')
        : undefined}
      dong={hd === null
        ? [
          { nhan: tra('cn_loai_hop_dong'), gia_tri: '—', mau: 'xau' },
          { nhan: tra('cn_thoi_han'), gia_tri: '—' },
          { nhan: tra('cn_ngay_ky'), gia_tri: '—' },
        ]
        : [
          { nhan: tra('cn_so_hop_dong'), gia_tri: hd.so_hd ?? '—' },
          { nhan: tra('cn_loai_hop_dong'), gia_tri: tra_khoa(KHOA_LOAI_HOP_DONG[hd.loai], hd.loai) },
          { nhan: tra('cn_chuc_danh'), gia_tri: hd.chuc_danh ?? '—' },
          { nhan: tra('cn_noi_lam_viec'), gia_tri: hd.noi_lam_viec ?? '—' },
          { nhan: tra('cn_ngay_ky'), gia_tri: ngay_viet(hd.ngay_ky) },
          { nhan: tra('cn_hieu_luc'), gia_tri: hd.hieu_luc_den !== null ? `${ngay_viet(hd.hieu_luc_tu)} → ${ngay_viet(hd.hieu_luc_den)}` : tra('cn_tu_x', { n: `${ngay_viet(hd.hieu_luc_tu)} · ${tra('cn_kxd_thoi_han')}` }) },
          { nhan: tra('cn_luong_co_ban'), gia_tri: `${so_viet(hd.luong_co_ban)} ₫` },
        ]}
    />
  );
}

function NoiDungLuongCN({ du_lieu }: { du_lieu: HoSoToi }): ReactNode {
  const l = du_lieu.luong;
  const { tra } = dung_chuoi();
  return (
    <Khoi
      ten={tra('cn_luong_phu_cap')}
      phu={tra('cn_so_lieu_do_nhan_su')}
      dong={l === null
        ? [{ nhan: tra('cn_muc_luong'), gia_tri: tra('cn_chua_co_qd_luong'), mau: 'xau' }]
        : [
          { nhan: tra('cn_luong_co_ban'), gia_tri: `${so_viet(l.luong_co_ban)} ₫` },
          { nhan: tra('menu_phu_cap'), gia_tri: `${so_viet(l.phu_cap)} ₫` },
          { nhan: tra('cn_hinh_thuc_tra'), gia_tri: tra_khoa(KHOA_HINH_THUC_LUONG[l.hinh_thuc], l.hinh_thuc) },
          { nhan: tra('cn_so_quyet_dinh'), gia_tri: l.so_quyet_dinh ?? '—' },
          { nhan: tra('cn_hieu_luc_tu'), gia_tri: ngay_viet(l.hieu_luc_tu) },
        ]}
    />
  );
}

const KHOA_LOAI_NGHI_PHEP: Record<string, ChuoiKhoa> = {
  phep_nam: 'cn_loai_phep_nam', khong_luong: 'cn_loai_khong_luong', om: 'cn_loai_om',
  thai_san: 'cn_loai_thai_san', ket_hon: 'cn_loai_ket_hon', hieu: 'cn_loai_hieu',
};
const KHOA_TT_NGHI: Record<string, { khoa: ChuoiKhoa; lop: string }> = {
  cho_duyet: { khoa: 'cn_tt_cho_duyet', lop: 'nhan-canh-bao' },
  da_duyet: { khoa: 'cn_tt_da_duyet', lop: 'nhan-tot' },
  tu_choi: { khoa: 'cn_tt_tu_choi', lop: 'nhan-xau' },
  da_huy: { khoa: 'cn_tt_da_huy', lop: 'nhan-mo' },
};

interface LanNghi {
  id: string; loai: string; tu_ngay: string; den_ngay: string; nua_ngay: boolean;
  trang_thai: string; ly_do: string | null; so_ngay: number;
}
interface PhepData {
  nam: string;
  quy: { quy: number; da_dung: number; con_lai: number; cho_duyet: number };
  cac_lan: LanNghi[];
}

/** Quan ly phep nam CUA TOI: quy phep + chi tiet tung lan nghi da dung trong nam. */
function NoiDungPhep(): ReactNode {
  const nam_nay = new Date().getFullYear();
  const [nam, dat_nam] = useState(nam_nay);
  const { du_lieu, dang_tai, loi } = dung_nap<PhepData>(`/api/toi/phep?nam=${nam}`, [nam]);
  const { tra } = dung_chuoi();
  if (dang_tai && du_lieu === null) return <XuongDanhSach />;
  if (loi !== null) return <HopLoi loi={loi} />;
  if (du_lieu === null) return null;
  const q = du_lieu.quy;
  const khoang = (x: LanNghi): string => (x.tu_ngay === x.den_ngay
    ? ngay_viet(x.tu_ngay) : `${ngay_viet(x.tu_ngay)} – ${ngay_viet(x.den_ngay)}`);

  return (
    <div className="cn-cot-gap">
      <div className="cn-chon-thang">
        <button type="button" className="cn-nut-vuong" aria-label={tra('cn_nam_truoc')}
          onClick={() => dat_nam(nam - 1)}>‹</button>
        <span className="cn-chon-thang-ten">{tra('cn_phep_nam_x', { n: nam })}</span>
        <button type="button" className="cn-nut-vuong" aria-label={tra('cn_nam_sau')}
          disabled={nam >= nam_nay} onClick={() => dat_nam(nam + 1)}>›</button>
      </div>

      <Khoi
        ten={tra('cn_quy_phep_nam')}
        phu={tra('cn_chi_nghi_phep_tru')}
        dong={[
          { nhan: tra('cn_tong_quy_phep'), gia_tri: tra('cn_ngay_x', { n: so_viet(q.quy) }) },
          { nhan: tra('cn_da_dung'), gia_tri: tra('cn_ngay_x', { n: so_viet(q.da_dung) }) },
          { nhan: tra('cn_con_lai'), gia_tri: tra('cn_ngay_x', { n: so_viet(q.con_lai) }), mau: q.con_lai <= 0 ? 'xau' : 'tot' },
          { nhan: tra('cn_dang_cho_duyet'), gia_tri: tra('cn_ngay_x', { n: so_viet(q.cho_duyet) }), mau: q.cho_duyet > 0 ? 'lanh' : undefined },
        ]}
      />

      <div className="the the-mong">
        <div className="cn-dau-mong">{tra('cn_chi_tiet_cac_lan_nghi', { n: nam })}</div>
        {du_lieu.cac_lan.length === 0 && (
          <div className="cn-hang-don"><span className="mo-ta">{tra('cn_chua_co_lan_nghi')}</span></div>
        )}
        {du_lieu.cac_lan.map((x) => (
          <div className="cn-hang-don" key={x.id}>
            <div>
              <strong>{khoang(x)}</strong>
              <span className="mo-ta"> · {tra_khoa(KHOA_LOAI_NGHI_PHEP[x.loai], x.loai)} · {so_viet(x.so_ngay)} {tra('pl_ngay_unit')}{x.nua_ngay ? tra('cn_nua_ngay_suffix') : ''}</span>
              {x.ly_do !== null && x.ly_do !== '' && <div className="mo-ta">{x.ly_do}</div>}
            </div>
            <span className={`nhan ${KHOA_TT_NGHI[x.trang_thai]?.lop ?? 'nhan-mo'}`}>
              {tra_khoa(KHOA_TT_NGHI[x.trang_thai]?.khoa, x.trang_thai)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoiDungPhuThuoc({ du_lieu }: { du_lieu: HoSoToi }): ReactNode {
  const { tra } = dung_chuoi();
  if (du_lieu.nguoi_phu_thuoc.length === 0) {
    return (
      <Trong
        tieu_de={tra('cn_chua_khai_pt')}
        mo_ta={tra('cn_pt_mo_ta')}
      />
    );
  }
  return (
    <div className="luoi luoi-2">
      {du_lieu.nguoi_phu_thuoc.map((p, i) => (
        <Khoi
          key={`${p.ho_ten}-${i}`}
          ten={`${p.ho_ten} · ${tra_khoa(KHOA_QUAN_HE[p.quan_he], p.quan_he)}`}
          dong={[
            { nhan: tra('cn_ngay_sinh'), gia_tri: ngay_viet(p.ngay_sinh) },
            { nhan: tra('cn_ma_so_thue'), gia_tri: p.ma_so_thue ?? '—' },
            { nhan: tra('cn_giam_tru'), gia_tri: p.tu_thang !== null ? tra('cn_tu_x', { n: `${ngay_viet(p.tu_thang)}${p.den_thang !== null ? tra('cn_den_x_khoang', { n: ngay_viet(p.den_thang) }) : tra('cn_con_hieu_luc')}` }) : tra('cn_chua_co_khoang') },
            { nhan: tra('cn_trang_thai'), gia_tri: p.da_dang_ky ? tra('cn_da_dang_ky') : tra('cn_chua_dang_ky'), mau: p.da_dang_ky ? 'tot' : undefined },
          ]}
        />
      ))}
    </div>
  );
}

function NoiDungBhxh({ du_lieu }: { du_lieu: HoSoToi }): ReactNode {
  const cn = du_lieu.ca_nhan;
  const { tra } = dung_chuoi();
  return (
    <div className="cn-cot-gap">
      <Khoi
        ten={tra('cn_bhxh_bhyt')}
        dong={[
          { nhan: tra('cn_so_so_bhxh'), gia_tri: cn?.so_bhxh ?? tra('cn_chua_co'), mau: cn?.so_bhxh === null ? 'xau' : undefined },
          { nhan: tra('cn_ma_the_bhyt'), gia_tri: cn?.so_the_bhyt ?? tra('cn_chua_co'), mau: cn?.so_the_bhyt === null ? 'xau' : undefined },
          { nhan: tra('cn_co_quan_bhxh'), gia_tri: cn?.co_quan_bhxh ?? '—' },
          { nhan: tra('cn_noi_kcb_bd'), gia_tri: cn?.noi_kham_chua_benh ?? '—' },
        ]}
      />
      {du_lieu.bhxh.length > 0 && (
        <div className="the the-mong">
          <div className="cn-dau-mong">{tra('cn_cac_su_kien_gan_day')}</div>
          {du_lieu.bhxh.map((s, i) => (
            <div className="cn-bhxh-dong" key={`${s.loai}-${s.thang}-${i}`}>
              <div className="cn-bhxh-trai">
                <span className="cn-bhxh-loai">{tra_khoa(KHOA_LOAI_BHXH[s.loai], s.loai)}</span>
                <span className="cn-bhxh-thang">{tra('cn_thang_x', { n: s.thang.slice(0, 7) })}</span>
              </div>
              <div className="cn-bhxh-giua">
                {s.muc_dong !== null && <span>{tra('cn_muc_dong_x', { n: so_viet(s.muc_dong) })}</span>}
                {s.ty_le_phan_tram !== null && <span> · {so_viet(s.ty_le_phan_tram)}%</span>}
                {s.so_ho_so !== null && <span>{tra('cn_ho_so_x', { n: s.so_ho_so })}</span>}
              </div>
              <span className={`nhan ${s.trang_thai === 'hoan_thanh' || s.trang_thai === 'co_quan_duyet' ? 'nhan-tot'
                : s.trang_thai === 'tu_choi' ? 'nhan-xau' : 'nhan-canh-bao'}`}>
                {tra_khoa(KHOA_TRANG_THAI_BHXH[s.trang_thai], s.trang_thai)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NoiDungCongViec({ du_lieu }: { du_lieu: HoSoToi }): ReactNode {
  const nv = du_lieu.nhan_vien;
  const { tra } = dung_chuoi();
  if (nv === null) return null;
  const quan_ly = nv.nguoi_quan_ly ?? tra('cn_chua_gan_ca');
  return (
    <div className="luoi luoi-2">
      <Khoi
        ten={tra('cn_vi_tri_hien_tai')}
        dong={[
          { nhan: tra('cn_chuc_danh'), gia_tri: nv.chuc_danh ?? '—' },
          { nhan: tra('cn_phong_ban'), gia_tri: nv.phong_ban ?? '—' },
          { nhan: tra('cn_quan_ly_truc_tiep'), gia_tri: quan_ly },
          { nhan: tra('cn_ca_lam_viec'), gia_tri: nv.ca_lam !== null ? `${nv.ca_lam} · ${gio_hh_mm(nv.gio_vao)}–${gio_hh_mm(nv.gio_ra)}` : tra('cn_chua_gan_ca') },
          { nhan: tra('cn_noi_lam_viec'), gia_tri: du_lieu.hop_dong?.noi_lam_viec ?? '—' },
        ]}
      />
      <Khoi
        ten={tra('cn_lich_su_cong_viec')}
        dong={[
          { nhan: ngay_viet(nv.ngay_vao), gia_tri: nv.chuc_danh !== null ? `${tra('cn_tiep_nhan')} · ${nv.chuc_danh}` : tra('cn_tiep_nhan') },
          { nhan: nv.ngay_chinh_thuc !== null ? ngay_viet(nv.ngay_chinh_thuc) : tra('cn_chua_co'), gia_tri: nv.ngay_chinh_thuc !== null ? tra('cn_ket_thuc_thu_viec') : tra('cn_chua_xac_nhan_tt') },
        ]}
      />
    </div>
  );
}

function NoiDungThietBi({ du_lieu }: { du_lieu: HoSoToi }): ReactNode {
  const { tra } = dung_chuoi();
  if (du_lieu.thiet_bi.length === 0) {
    return (
      <Trong
        tieu_de={tra('cn_chua_co_thiet_bi')}
        mo_ta={tra('cn_thiet_bi_mo_ta')}
      />
    );
  }
  return (
    <div className="luoi luoi-2">
      {du_lieu.thiet_bi.map((tb, i) => (
        <Khoi
          key={`${tb.ten}-${i}`}
          ten={`${tb.ten}${tb.model !== null ? ` · ${tb.model}` : ''}`}
          dong={[
            { nhan: tra('cn_loai'), gia_tri: tb.loai },
            { nhan: tra('cn_hang'), gia_tri: tb.hang ?? '—' },
            { nhan: tra('cn_so_seri'), gia_tri: tb.so_seri ?? '—' },
            { nhan: tra('cn_ngay_nhan'), gia_tri: ngay_viet(tb.ngay_cap) },
            { nhan: tra('cn_tinh_trang'), gia_tri: tb.tinh_trang === 'dang_dung' ? tra('cn_dang_dung') : tb.tinh_trang, mau: tb.tinh_trang === 'dang_dung' ? 'tot' : undefined },
          ]}
        />
      ))}
    </div>
  );
}

function NoiDungCaiDat(): ReactNode {
  const [mo_mk, dat_mo_mk] = useState(false);
  const xac_nhan = dung_xac_nhan();
  const { tra } = dung_chuoi();

  return (
    <div className="cn-cot-gap">
      <button type="button" className="cn-nut-rong" onClick={() => dat_mo_mk(true)}>
        <span style={{ flex: 1 }}>{tra('doi_mat_khau')}</span>
        <span className="cn-mui">›</span>
      </button>

      <button
        type="button"
        className="cn-nut-rong cn-nut-dang-xuat"
        onClick={() => void (async () => {
          const dong_y = await xac_nhan.hoi({
            tieu_de: tra('cn_dx_khoi_ung_dung'),
            mo_ta: tra('cn_dx_mo_ta'),
            chu_dong_y: tra('dang_xuat'),
            nguy_hiem: true,
          });
          if (dong_y) {
            await dang_xuat();
            window.location.assign('/');
          }
        })()}
      >
        {tra('dang_xuat')}
      </button>

      <div className="cn-chan-trang">
        <span>{tra('cn_may_chu_noi_bo', { n: goc_api_tuyet_doi() })}</span>
        <span>{tra('cn_mui_gio_tinh_cong_utc', { n: mui_gio_offset_gio() })}</span>
      </div>

      {mo_mk && <SheetDoiMatKhau khi_dong={() => dat_mo_mk(false)} />}
      {xac_nhan.hop_thoai}
    </div>
  );
}

function SheetDoiMatKhau({ khi_dong }: { khi_dong: () => void }): ReactNode {
  const hd = dung_hanh_dong();
  const { tra } = dung_chuoi();
  const [cu, dat_cu] = useState('');
  const [moi, dat_moi] = useState('');
  const [nhap_lai, dat_nhap_lai] = useState('');

  const gui = async (): Promise<void> => {
    if (moi !== nhap_lai) {
      // Bao loi truc tiep de nguoi dung thay ngay, khong can may chu.
      hd.chay(async () => { throw new Error(tra('cn_mk_nhap_lai_khong_khop')); });
      return;
    }
    const ok = await hd.chay(async () => {
      await doi_mat_khau(cu, moi);
    });
    if (ok) {
      // May chu thu hoi moi phien sau khi doi mat khau -> quay ve man dang nhap.
      window.setTimeout(() => window.location.assign('/'), 900);
    }
  };

  return (
    <HopThoai tieu_de={tra('doi_mat_khau')} khi_dong={khi_dong}>
      <CotForm>
        <NhanO nhan={tra('mat_khau_hien_tai')}>
          <input type="password" className="cn-nhap" value={cu} onChange={(e) => dat_cu(e.target.value)} />
        </NhanO>
        <NhanO nhan={tra('mat_khau_moi')}>
          <input type="password" className="cn-nhap" value={moi} onChange={(e) => dat_moi(e.target.value)} />
        </NhanO>
        <NhanO nhan={tra('nhap_lai_mat_khau_moi')}>
          <input type="password" className="cn-nhap" value={nhap_lai} onChange={(e) => dat_nhap_lai(e.target.value)} />
        </NhanO>
        <div className="cn-form-nut">
          <button type="button" className="nut" onClick={khi_dong}>{tra('cn_huy')}</button>
          <button
            type="button"
            className="nut nut-chinh"
            disabled={hd.dang_chay || cu === '' || moi === '' || nhap_lai === ''}
            onClick={() => void gui()}
          >
            {tra('doi_mat_khau')}
          </button>
        </div>
        <HopLoi loi={hd.loi} />
        {hd.tot !== null && <div className="hop-thong-bao hop-tot">{tra('cn_da_doi_mk_chuyen')}</div>}
      </CotForm>
    </HopThoai>
  );
}
