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
import { useEffect, useState, type ReactNode } from 'react';
import { dang_xuat, doi_mat_khau, goi, goc_api_tuyet_doi, mui_gio_offset_gio } from '../api.ts';
import { LienKet } from '../dinh_tuyen.tsx';
import {
  HopLoi, HopThoai, OSo, Trong, XuongDanhSach,
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

const TEN_QUAN_HE: Record<string, string> = {
  con: 'Con', vo_chong: 'Vợ / chồng', cha: 'Cha', me: 'Mẹ', anh_chi_em: 'Anh chị em', khac: 'Khác',
};

const TEN_LOAI_HOP_DONG: Record<string, string> = {
  thu_viec: 'Thử việc', xac_dinh: 'Xác định thời hạn', khong_xac_dinh: 'Không xác định thời hạn',
  thoi_vu: 'Thời vụ', cong_tac_vien: 'Cộng tác viên', hoc_viec: 'Học việc',
};

const TEN_HINH_THUC_LUONG: Record<string, string> = {
  thang: 'Theo tháng', ngay: 'Theo ngày', gio: 'Theo giờ', san_pham: 'Sản phẩm', khoan: 'Khoán',
};

const TEN_TRANG_THAI_BHXH: Record<string, string> = {
  moi: 'Mới', da_nop: 'Đã nộp', co_quan_duyet: 'Cơ quan duyệt', tu_choi: 'Từ chối', hoan_thanh: 'Hoàn thành',
};

const TEN_LOAI_BHXH: Record<string, string> = {
  bao_tang: 'Báo tăng', bao_giam: 'Báo giảm', dieu_chinh: 'Điều chỉnh', chot_so: 'Chốt sổ',
  cap_the_bhyt: 'Cấp thẻ BHYT', om_dau: 'Ốm đau', thai_san: 'Thai sản', duong_suc: 'Dưỡng sức',
  tai_nan_lao_dong: 'Tai nạn lao động',
};

/** Nhan trang thai tai lieu ho so. */
const NHAN_TT_TAI_LIEU: Record<string, { chu: string; lop: string }> = {
  da_len_phan_mem: { chu: 'Đã lên phần mềm', lop: 'nhan-tot' },
  da_so_hoa: { chu: 'Đã số hóa', lop: 'nhan-lanh' },
  da_co_du_lieu: { chu: 'Đã có dữ liệu', lop: 'nhan-lanh' },
  thieu: { chu: 'Thiếu', lop: 'nhan-xau' },
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
  if (nam === 0) return `${thang} tháng`;
  return thang === 0 ? `${nam} năm` : `${nam} năm ${thang} tháng`;
}

/** Chu dau ho ten dung cho avatar. */
function chu_dau(ho_ten: string | null): string {
  return (ho_ten ?? '?').split(' ').filter((t) => t.length > 0)
    .slice(-2).map((t) => t[0]).join('').toUpperCase();
}

// ==================================================================== trang goc

type Tab = 'trang_chu' | 'bang_cong' | 'don_tu' | 'luong' | 'ca_nhan';
type FormMo = 'nghi' | 'giai' | 'khac';

const CAC_TAB: { ma: Tab; ten: string; icon: string }[] = [
  { ma: 'trang_chu', ten: 'Trang chủ', icon: 'bt-layout-dashboard' },
  { ma: 'bang_cong', ten: 'Bảng công', icon: 'bt-list-details' },
  { ma: 'don_tu', ten: 'Đơn từ', icon: 'bt-file-text' },
  { ma: 'luong', ten: 'Lương', icon: 'bt-receipt-2' },
  { ma: 'ca_nhan', ten: 'Cá nhân', icon: 'bt-user-check' },
];

/** Tieu de + phu de cua cac man con, theo mau thiet ke. Trang chu tinh rieng vi co ten. */
const TEN_MAN: Record<Exclude<Tab, 'trang_chu'>, [string, string]> = {
  bang_cong: ['Bảng công của tôi', 'Số liệu chấm công theo tháng'],
  don_tu: ['Nghỉ phép & đơn từ', 'Xin nghỉ, giải trình, theo dõi trạng thái duyệt'],
  luong: ['Phiếu lương', 'Cơ sở tính lương của kỳ'],
  ca_nhan: ['Cá nhân', 'Hồ sơ, tài liệu, hợp đồng, BHXH, cài đặt'],
};

function dau_de(tab: Tab, nv: HomNay['nhan_vien']): [string, string] {
  if (tab === 'trang_chu') {
    const ca = nv?.ca_lam !== null && nv?.ca_lam !== undefined
      ? ` · ${nv.ca_lam} ${gio_hh_mm(nv.ca_gio_vao)}–${gio_hh_mm(nv.ca_gio_ra)}`
      : '';
    return [
      `Xin chào, ${nv?.ho_ten ?? 'bạn'}`,
      `${thu_cua_ngay(hom_nay())}, ${ngay_viet(hom_nay())}${ca}`,
    ];
  }
  return TEN_MAN[tab];
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
export function TrangCaNhan({ ve_quan_tri }: { ve_quan_tri?: () => void }): ReactNode {
  const [tab, dat_tab] = useState<Tab>('trang_chu');
  const [mo_form, dat_mo_form] = useState<FormMo | null>(null);
  const hep = dung_hep();
  const hom_nay_nap = dung_nap<HomNay>('/api/toi/hom-nay');
  const thong_bao_nap = dung_nap<ThongBaoToi[]>('/api/toi/thong-bao');

  // So don dang cho duyet de dat len tab Don tu (lay tu /hom-nay, khong goi them).
  const so_don_cho = so(hom_nay_nap.du_lieu?.can_chu_y?.don_cua_toi_cho_duyet);
  const so_chua_doc = (thong_bao_nap.du_lieu ?? []).filter((t) => !t.da_doc).length;

  const nv = hom_nay_nap.du_lieu?.nhan_vien ?? null;
  const [tieu_de, phu_de] = dau_de(tab, nv);

  // Chuyen man ben trong trang + mo form neu can. Dung callback chu khong phai duong dan vi
  // bo dinh tuyen cua app khong mang theo chuoi truy van.
  const di_den = (t: Tab, mo: FormMo | null = null): void => {
    dat_tab(t);
    dat_mo_form(mo);
  };

  const chon_tab = (t: Tab): void => {
    dat_tab(t);
    dat_mo_form(null);
  };

  return (
    <div className="cn-vo">
      {!hep && (
        <nav className="cn-ben" aria-label="Khu vực của tôi">
          <div className="cn-thuong-hieu">
            <span className="cn-thuong-hieu-o" aria-hidden="true">C</span>
            <span className="cn-thuong-hieu-chu">
              <b>Chấm công</b>
              <i>Khu vực của tôi</i>
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
                <i className={`bt ${t.icon}`} aria-hidden="true" />
                <span>{t.ten}</span>
                {t.ma === 'don_tu' && so_don_cho > 0 && (
                  <span className="cn-ben-dem">{so_don_cho}</span>
                )}
              </button>
            ))}
          </div>

          <div className="cn-ben-phu">
            <LienKet den="/thong-bao" lop="cn-ben-phu-lien-ket">
              <i className="bt bt-star" aria-hidden="true" />
              <span>Thông báo</span>
              {so_chua_doc > 0 && <span className="cn-ben-dem">{so_chua_doc}</span>}
            </LienKet>
            <LienKet den="/van-ban" lop="cn-ben-phu-lien-ket">
              <i className="bt bt-file-text" aria-hidden="true" />
              <span>Văn bản công ty</span>
            </LienKet>
          </div>

          <div className="cn-ben-chan">
            {ve_quan_tri !== undefined && (
              <button type="button" className="cn-ve-quan-tri" onClick={ve_quan_tri}>
                ‹ Về góc nhìn Quản trị
              </button>
            )}
            <span className="cn-ben-ten">
              {nv?.ho_ten ?? '—'}
              {nv !== null && nv.ma_nv !== null ? ` · ${nv.ma_nv}` : ''}
            </span>
            <span className="cn-ben-ca">
              {nv?.ca_lam !== null && nv?.ca_lam !== undefined
                ? `${nv.ca_lam} ${gio_hh_mm(nv.ca_gio_vao)}–${gio_hh_mm(nv.ca_gio_ra)}`
                : 'Chưa gán ca làm việc'}
            </span>
          </div>
        </nav>
      )}

      <div className="cn-than">
        <header className="cn-dau">
          {hep && tab !== 'trang_chu' && (
            <button
              type="button"
              className="cn-dau-lui"
              aria-label="Về Trang chủ"
              onClick={() => chon_tab('trang_chu')}
            >
              ‹
            </button>
          )}
          <div className="cn-dau-chu">
            <b>{tieu_de}</b>
            {phu_de !== '' && <span>{phu_de}</span>}
          </div>
        </header>

        <main className="cn-noi-dung">
          <div className="cn-noi-dung-trong">
            {tab === 'trang_chu' && <ManTrangChu hom_nay_nap={hom_nay_nap} di_den={di_den} />}
            {tab === 'bang_cong' && <ManBangCong di_den={di_den} />}
            {tab === 'don_tu' && (
              <ManDonTu hom_nay_nap={hom_nay_nap} mo_form={mo_form} dat_mo_form={dat_mo_form} />
            )}
            {tab === 'luong' && <ManLuong />}
            {tab === 'ca_nhan' && <ManCaNhan />}
          </div>
        </main>

        {hep && (
          <nav className="cn-tab-chan" aria-label="Các màn khu vực của tôi">
            {CAC_TAB.map((t) => (
              <button
                key={t.ma}
                type="button"
                className={tab === t.ma ? 'cn-tab-chan-nut cn-tab-chan-chon' : 'cn-tab-chan-nut'}
                onClick={() => chon_tab(t.ma)}
              >
                <span className="cn-tab-chan-hinh">
                  <i className={`bt ${t.icon}`} aria-hidden="true" />
                  {t.ma === 'don_tu' && so_don_cho > 0 && (
                    <span className="cn-tab-chan-dem">{so_don_cho}</span>
                  )}
                </span>
                <span>{t.ten}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

// ==================================================================== man trang chu

function ManTrangChu({ hom_nay_nap, di_den }: {
  hom_nay_nap: ReturnType<typeof dung_nap<HomNay>>;
  di_den: (t: Tab, mo?: FormMo | null) => void;
}): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = hom_nay_nap;
  const bang_cong_thang = dung_nap<BangCongThang>(`/api/toi/bang-cong?thang=${thang_nay()}`);

  if (dang_tai && du_lieu === null) return <XuongDanhSach />;
  if (loi !== null) return <HopLoi loi={loi} />;
  if (du_lieu === null) return null;

  const th = du_lieu.thang_tong_hop;
  const phep = du_lieu.phep;

  return (
    <div className="luoi" style={{ marginTop: 16 }}>
      <LoiChao du_lieu={du_lieu} nap_lai={nap_lai} />

      <HanhDongNhanh phep={phep} so_don_cho={so(du_lieu.can_chu_y?.don_cua_toi_cho_duyet)} di_den={di_den} />

      <div className="luoi luoi-4">
        <OSo
          nhan="Công tháng"
          gia_tri={th === null ? '—' : so_viet(th.tong_cong)}
          phu={`trên ${so(th?.so_ngay_phai_lam)} ngày phải làm`}
        />
        <OSo
          nhan="Đi muộn"
          gia_tri={`${so(th?.so_lan_di_muon)} lần`}
          phu={`tổng ${phut_thanh_chu(so(th?.tong_phut_muon))}`}
          mau={so(th?.so_lan_di_muon) > 0 ? 'canh_bao' : undefined}
        />
        <OSo
          nhan="OT ghi nhận"
          gia_tri={phut_thanh_chu(so(th?.tong_phut_ot))}
          phu="chưa qua duyệt"
          mau={so(th?.tong_phut_ot) > 0 ? 'lanh' : undefined}
        />
        <OSo
          nhan="Phép còn"
          gia_tri={phep === null ? '—' : `${so_viet(phep.con_lai)} ngày`}
          phu={phep !== null && phep.cho_duyet > 0 ? `${so_viet(phep.cho_duyet)} ngày chờ duyệt` : 'không có đơn chờ duyệt'}
        />
      </div>

      <HaiCot>
        <BieuDoBayNgay nap={bang_cong_thang} />
        <DongThoiQuet lan_quet={du_lieu.lan_quet} />
        <TuanNay tuan={du_lieu.tuan} hom_nay={du_lieu.ngay} />
        <CotPhai th={th} du_lieu={du_lieu} di_den={di_den} />
      </HaiCot>
    </div>
  );
}

/** Dai ca lam hom nay — noi dung chinh cua loi chao. */
function LoiChao({ du_lieu, nap_lai }: { du_lieu: HomNay; nap_lai: () => void }): ReactNode {
  const bc = du_lieu.bang_cong;
  const nv = du_lieu.nhan_vien;
  const ca = nv?.ca_lam ?? 'Chưa gán ca làm việc';
  const ca_vao = phut_cua_gio(nv?.ca_gio_vao ?? null);
  const ca_ra = phut_cua_gio(nv?.ca_gio_ra ?? null);

  // Tien do ca: phan tram thoi gian da troi tu luc vao ca den bay gio.
  let phan_tram: number | null = null;
  let con_lai: string | null = null;
  if (ca_vao !== null && ca_ra !== null) {
    const dai = ca_ra <= ca_vao ? ca_ra + 1440 - ca_vao : ca_ra - ca_vao;
    if (bc !== null && bc.gio_ra !== null) {
      phan_tram = 100;
    } else if (dai > 0) {
      const nay = phut_hien_tai();
      const qua = nay >= ca_vao ? nay - ca_vao : (nay < ca_vao ? 0 : nay);
      phan_tram = Math.max(0, Math.min(100, Math.round((qua / dai) * 100)));
      const con = ca_ra - nay;
      if (con > 0) {
        con_lai = `còn ${Math.floor(con / 60)}h ${String(con % 60).padStart(2, '0')}′ đến ${gio_hh_mm(nv?.ca_gio_ra)}`;
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

  const som_muon = bc === null ? 'chưa có dữ liệu chấm công hôm nay'
    : bc.phut_muon > 0 ? `đi muộn ${phut_thanh_chu(bc.phut_muon)}`
      : bc.gio_vao !== null ? 'đúng giờ vào ca' : 'chưa quẹt vào';

  return (
    <div className="cn-hero">
      <div className="cn-hero-hang">
        <div className="cn-hero-o">
          <span className="cn-hero-nhan">GIỜ VÀO</span>
          <span className="cn-hero-gio">{bc?.gio_vao !== null && bc?.gio_vao !== undefined ? gio_ngan(bc.gio_vao) : '--:--'}</span>
          <span className="cn-hero-phu">{som_muon}</span>
        </div>
        <div className="cn-hero-o">
          <span className="cn-hero-nhan">GIỜ RA</span>
          <span className="cn-hero-gio">{bc?.gio_ra !== null && bc?.gio_ra !== undefined ? gio_ngan(bc.gio_ra) : '--:--'}</span>
          <span className="cn-hero-phu">{con_lai ?? (bc?.gio_ra !== null ? 'đã quẹt ra' : 'chưa quẹt ra')}</span>
        </div>
        {dang_lam && (
          <span className="cn-nhan-xanh">Đang làm · {lam_duoc}</span>
        )}
        {!dang_lam && bc?.gio_ra !== null && (
          <span className="cn-nhan-xam">Đã kết thúc ca hôm nay</span>
        )}
      </div>

      {phan_tram !== null && (
        <div className="cn-hero-tien-do">
          <div className="cn-tien-do">
            <div className="cn-tien-do-day" style={{ width: `${phan_tram}%` }} />
            <div className="cn-tien-do-num" style={{ left: `${phan_tram}%` }} />
            <div className="cn-tien-do-moc" style={{ left: '46%' }} />
          </div>
          <div className="cn-tien-do-nhan">
            <span>{gio_hh_mm(nv?.ca_gio_vao)} vào ca</span>
            <span>12:00 nghỉ trưa</span>
            <span>{gio_hh_mm(nv?.ca_gio_ra)} hết ca</span>
          </div>
        </div>
      )}

      <div className="cn-hero-chip-hang">
        <span className="cn-chip-toi">{ca}</span>
        {bc !== null && (
          <span className="cn-chip-toi">{bc.ghi_chu ?? 'Quẹt tại máy chấm công'}</span>
        )}
        <button className="cn-chip-nut" onClick={nap_lai}>Làm mới</button>
      </div>
    </div>
  );
}

function HanhDongNhanh({ phep, so_don_cho, di_den }: {
  phep: HomNay['phep'];
  so_don_cho: number;
  di_den: (t: Tab, mo?: FormMo | null) => void;
}): ReactNode {
  return (
    <div className="cn-hanh-dong">
      <button type="button" className="cn-nut-hanh-dong cn-nut-chinh-dam" onClick={() => di_den('don_tu', 'nghi')}>
        <i className="bt bt-plane-departure" />
        <span>
          <span className="cn-nut-hanh-dong-ten">Xin nghỉ phép</span>
          <span className="cn-nut-hanh-dong-phu">
            {phep === null ? '' : `Còn ${so_viet(phep.con_lai)} ngày phép`}
          </span>
        </span>
      </button>
      <button type="button" className="cn-nut-hanh-dong cn-nut-canh-bao" onClick={() => di_den('don_tu', 'giai')}>
        <i className="bt bt-clock-exclamation" />
        <span>
          <span className="cn-nut-hanh-dong-ten">Giải trình quên quẹt</span>
          <span className="cn-nut-hanh-dong-phu">Bù giờ vào / ra bị thiếu</span>
        </span>
      </button>
      <button type="button" className="cn-nut-hanh-dong cn-nut-thuong" onClick={() => di_den('don_tu')}>
        <i className="bt bt-file-text" />
        <span style={{ flex: 1 }}>
          <span className="cn-nut-hanh-dong-ten">Đơn của tôi</span>
          <span className="cn-nut-hanh-dong-phu">
            {so_don_cho > 0 ? `${so_don_cho} đơn đang chờ duyệt` : 'Không có đơn chờ duyệt'}
          </span>
        </span>
        {so_don_cho > 0 && <span className="cn-dem">{so_don_cho}</span>}
      </button>
    </div>
  );
}

function HaiCot({ children }: { children: ReactNode }): ReactNode {
  return <div className="cn-hai-cot">{children}</div>;
}

/** Bieu do gio lam 7 ngay gan nhat, lay tu bang cong thang hien tai. */
function BieuDoBayNgay({ nap }: { nap: ReturnType<typeof dung_nap<BangCongThang>> }): ReactNode {
  const { du_lieu, loi } = nap;
  if (loi !== null) return <HopLoi loi={loi} />;

  const hom = hom_nay();
  const ngay_ds: { ngay: string; gio: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) ngay_ds.push({ ngay: cong_ngay(hom, -i), gio: 0 });

  const bang = new Map((du_lieu?.ngay ?? []).map((n) => [n.ngay, n]));
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
        <h2>Giờ làm 7 ngày gần nhất</h2>
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
      <span className="cn-chu-nho">Vạch mờ = 8 giờ chuẩn của ca hành chính.</span>
    </div>
  );
}

/** Dong thoi gian cac lan quet hom nay. */
function DongThoiQuet({ lan_quet }: { lan_quet: LanQuetToi[] }): ReactNode {
  return (
    <div className="the">
      <h2>Các lần quẹt hôm nay</h2>
      {lan_quet.length === 0 ? (
        <Trong tieu_de="Chưa có lần quẹt nào" mo_ta="Dữ liệu hiện ngay sau khi bạn quẹt." />
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
                  <span className="cn-nguon">{TEN_NGUON[q.nguon] ?? q.nguon} · {q.nhan_xac_thuc}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Dai tuan nay T2..CN. */
function TuanNay({ tuan, hom_nay: hom }: { tuan: NgayTuan[]; hom_nay: string }): ReactNode {
  return (
    <div className="the">
      <h2>Tuần này</h2>
      <div className="cn-tuan">
        {tuan.map((n) => {
          const hom_nay_la = n.ngay === hom;
          const lop = n.trang_thai === 'co_mat' ? 'cn-ngay-co-mat'
            : n.trang_thai === 'vang' ? 'cn-ngay-vang'
              : hom_nay_la ? 'cn-ngay-hom-nay' : 'cn-ngay-mo';
          return (
            <div className={`cn-ngay-tuan ${lop}`} key={n.ngay}>
              <span className="cn-thu">{thu_cua_ngay(n.ngay)}</span>
              <span className="cn-so-ngay">{Number(n.ngay.slice(8))}</span>
              <span className="cn-cong">{n.trang_thai === 'co_mat' ? so_viet(n.so_cong) : '·'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Cot phai: chuyen can + can chu y. */
function CotPhai({ th, du_lieu, di_den }: {
  th: TongHopThang | null;
  du_lieu: HomNay;
  di_den: (t: Tab, mo?: FormMo | null) => void;
}): ReactNode {
  const ccy = du_lieu.can_chu_y;
  const ngay_du_cong = Math.max(0, so(th?.so_ngay_co_mat) - so(th?.so_lan_di_muon));
  const ngay_phai = so(th?.so_ngay_phai_lam);
  const ty_le = ngay_phai === 0 ? 0 : Math.round((ngay_du_cong / ngay_phai) * 100);

  return (
    <>
      <div className="the">
        <div className="cn-tieu-de-hang">
          <h2>Chuyên cần tháng này</h2>
          <span className="cn-phu">{ngay_du_cong}/{ngay_phai}</span>
        </div>
        <div className="cn-thanh">
          <div className="cn-thanh-day" style={{ width: `${ty_le}%` }} />
        </div>
        <span className="cn-chu-nho">Số ngày đủ công, không đi muộn. Điều kiện hưởng phụ cấp do quy chế lương quy định.</span>
      </div>

      <div className="the the-mong">
        <div className="cn-dau-mong">Cần chú ý & sắp tới</div>
        <CanChuY du_lieu={du_lieu} ccy={ccy} di_den={di_den} />
      </div>
    </>
  );
}

/** Danh sach viec can chu y, dung du lieu that thay vi so cung. */
function CanChuY({ du_lieu, ccy, di_den }: {
  du_lieu: HomNay;
  ccy: HomNay['can_chu_y'];
  di_den: (t: Tab, mo?: FormMo | null) => void;
}): ReactNode {
  const muc: { icon: string; lop: string; ten: string; mo_ta: string; lam: (() => void) | null; nhan: string }[] = [];

  const thieu_gio = du_lieu.bang_cong !== null
    && (du_lieu.bang_cong.gio_vao === null || du_lieu.bang_cong.gio_ra === null)
    && du_lieu.bang_cong.trang_thai === 'co_mat';
  if (thieu_gio) {
    muc.push({
      icon: 'bt-clock-exclamation', lop: 'cn-o-canh-bao',
      ten: 'Hôm nay thiếu giờ quẹt',
      mo_ta: du_lieu.bang_cong?.gio_vao === null ? 'Thiếu giờ vào' : 'Thiếu giờ ra',
      lam: () => di_den('don_tu', 'giai'), nhan: 'Giải trình',
    });
  }
  if (so(ccy?.don_cua_toi_cho_duyet) > 0) {
    muc.push({
      icon: 'bt-file-text', lop: 'cn-o-lanh',
      ten: `${ccy?.don_cua_toi_cho_duyet} đơn đang chờ duyệt`,
      mo_ta: 'Theo dõi trạng thái ở màn Đơn từ',
      lam: () => di_den('don_tu'), nhan: 'Xem đơn',
    });
  }
  if (so(ccy?.don_cho_toi_duyet) > 0) {
    muc.push({
      icon: 'bt-check', lop: 'cn-o-tot',
      ten: `${ccy?.don_cho_toi_duyet} đơn đang chờ bạn duyệt`,
      mo_ta: 'Bạn là người duyệt của phòng mình',
      lam: null, nhan: 'Đi duyệt',
    });
  }
  if (muc.length === 0) {
    muc.push({
      icon: 'bt-circle-check', lop: 'cn-o-tot',
      ten: 'Không có việc cần chú ý',
      mo_ta: 'Công hôm nay và đơn từ đều ổn',
      lam: () => {}, nhan: '',
    });
  }

  return (
    <>
      {muc.map((m) => {
        const trong = (
          <span className="cn-cty-hang">
            <i className={`bt ${m.icon} ${m.lop}`} />
            <span className="cn-cty-noi">
              <span className="cn-cty-ten">{m.ten}</span>
              <span className="cn-cty-mo-ta">{m.mo_ta}</span>
            </span>
            {m.nhan !== '' && <span className="cn-cty-nhan">{m.nhan}</span>}
          </span>
        );
        return m.lam === null
          ? <LienKet key={m.ten} den="/duyet-don" lop="cn-cty-lien-ket">{trong}</LienKet>
          : <button type="button" key={m.ten} className="cn-cty-lien-ket" onClick={m.lam}>{trong}</button>;
      })}
    </>
  );
}

// ==================================================================== man bang cong

/** Nhan trang thai mot ngay cong trong danh sach chi tiet. */
function nhan_ngay_cong(d: NgayCongNgay): string {
  if (d.trang_thai === 'nghi_phep') return 'Nghỉ phép';
  if (d.trang_thai === 'vang') return 'Vắng';
  if (d.trang_thai === 'ngay_le') return 'Ngày lễ';
  if (d.trang_thai === 'nghi_tuan') return 'Nghỉ tuần';
  const thieu: string[] = [];
  if (d.gio_vao === null) thieu.push('thiếu giờ vào');
  if (d.gio_ra === null) thieu.push('thiếu giờ ra');
  if (thieu.length > 0) return `Thiếu giờ quẹt (${thieu.join(', ')})`;
  if (so(d.phut_muon) > 0) return `Đi muộn ${phut_thanh_chu(d.phut_muon)}`;
  return 'Đủ công';
}

function ManBangCong({ di_den }: { di_den: (t: Tab, mo?: FormMo | null) => void }): ReactNode {
  const [thang, dat_thang] = useState(thang_nay());
  const { du_lieu, dang_tai, loi } = dung_nap<BangCongThang>(`/api/toi/bang-cong?thang=${thang}`, [thang]);

  if (dang_tai && du_lieu === null) return <XuongDanhSach />;
  if (loi !== null) return <HopLoi loi={loi} />;
  if (du_lieu === null) return null;

  const t = du_lieu.tong_hop;
  const co_du_lieu = so(t.so_ngay_co_du_lieu) > 0;
  const [nam, thg] = thang.split('-').map(Number);

  return (
    <div className="cn-cot-gap" style={{ marginTop: 16 }}>
      <div className="cn-chon-thang">
        <button
          type="button"
          className="cn-nut-vuong"
          aria-label="Tháng trước"
          onClick={() => dat_thang(thg === 1 ? `${(nam ?? 0) - 1}-12` : `${nam}-${String((thg ?? 1) - 1).padStart(2, '0')}`)}
        >
          ‹
        </button>
        <span className="cn-chon-thang-ten">tháng {String(thg).padStart(2, '0')}/{nam}</span>
        <button
          type="button"
          className="cn-nut-vuong"
          aria-label="Tháng sau"
          disabled={thang >= thang_nay()}
          onClick={() => dat_thang(thg === 12 ? `${(nam ?? 0) + 1}-01` : `${nam}-${String((thg ?? 1) + 1).padStart(2, '0')}`)}
        >
          ›
        </button>
      </div>

      <div className="the cn-ba-so">
        <div>
          <span className="cn-ba-so-nhan">TỔNG CÔNG</span>
          <span className="cn-ba-so-gia">{so_viet(t.tong_cong)}</span>
        </div>
        <div>
          <span className="cn-ba-so-nhan">GIỜ LÀM</span>
          <span className="cn-ba-so-gia">{phut_thanh_chu(so(t.tong_phut_lam))}</span>
        </div>
        <div>
          <span className="cn-ba-so-nhan">TĂNG CA</span>
          <span className="cn-ba-so-gia cn-ba-so-lanh">{phut_thanh_chu(so(t.tong_phut_ot))}</span>
        </div>
      </div>

      {!co_du_lieu && (
        <Trong
          tieu_de="Chưa có dữ liệu tháng này"
          mo_ta="Bảng công sẽ xuất hiện khi máy chấm công đẩy log về."
        />
      )}

      <LichThang thang={thang} ngay={du_lieu.ngay} />

      <div className="the the-mong">
        <div className="cn-dau-mong">Chi tiết từng ngày — mới nhất trước</div>
        {du_lieu.ngay.slice().reverse().map((d) => (
          <div className="cn-ngay-cong" key={d.ngay}>
            <div className="cn-ngay-cong-ngay">
              <span className="cn-ngay-cong-nhan">{thu_cua_ngay(d.ngay)} {d.ngay.slice(8)}</span>
              <span className="cn-ngay-cong-thang">{d.ngay.slice(5, 7)}/{d.ngay.slice(0, 4)}</span>
            </div>
            <div className="cn-ngay-cong-gio">
              <span>
                {d.trang_thai === 'nghi_phep' ? '— nghỉ phép'
                  : d.trang_thai === 'vang' ? '— vắng'
                    : d.trang_thai === 'ngay_le' ? '— ngày lễ'
                      : d.trang_thai === 'nghi_tuan' ? '— nghỉ tuần'
                        : `${gio_ngan(d.gio_vao)} → ${d.gio_ra === null ? 'thiếu giờ ra' : gio_ngan(d.gio_ra)}`}
              </span>
              <span className={`nhan ${d.phut_muon > 0 ? 'nhan-canh-bao'
                : d.trang_thai === 'co_mat' ? 'nhan-tot'
                  : d.trang_thai === 'nghi_phep' ? 'nhan-lanh' : 'nhan-mo'}`}>
                {nhan_ngay_cong(d)}
              </span>
            </div>
            <div className="cn-ngay-cong-phai">
              <span className="cn-ngay-cong-so">{so_viet(d.so_cong)}</span>
              <span className="cn-ngay-cong-lam">{so(d.phut_lam) > 0 ? phut_thanh_chu(so(d.phut_lam)) : '—'}</span>
            </div>
          </div>
        ))}
        <button type="button" className="cn-nut-phang-rong" onClick={() => di_den('don_tu', 'giai')}>
          Thấy sai lệch? Gửi giải trình quên quẹt →
        </button>
      </div>
    </div>
  );
}

/** Lich thang mau theo trang thai tung ngay. */
function LichThang({ thang, ngay }: { thang: string; ngay: NgayCongNgay[] }): ReactNode {
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
    let chu = 'Ngày chưa có dữ liệu';
    if (hang !== undefined) {
      chu = nhan_ngay_cong(hang);
      if (hang.trang_thai === 'vang') lop = 'cn-lich-vang';
      else if (hang.trang_thai === 'nghi_phep') lop = 'cn-lich-phep';
      else if (hang.trang_thai === 'ngay_le') lop = 'cn-lich-le';
      else if (hang.trang_thai === 'nghi_tuan') lop = 'cn-lich-mo';
      else if (hang.phut_muon > 0) lop = 'cn-lich-muon';
      else lop = 'cn-lich-tot';
    } else if (tuong_lai) {
      chu = 'Chưa đến';
    }
    o.push({ so: String(d), lop, tieu_de: `${ng}: ${chu}` });
  }

  return (
    <div className="the">
      <h2>Lịch tháng</h2>
      <div className="cn-lich">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((t) => (
          <span className="cn-lich-thu" key={t}>{t}</span>
        ))}
        {o.map((c, i) => (
          <div key={`o-${i}`} className={`cn-lich-o ${c.lop}`} title={c.tieu_de}>{c.so}</div>
        ))}
      </div>
      <div className="cn-chu-thich">
        <span className="nhan nhan-tot">Đủ công</span>
        <span className="nhan nhan-canh-bao">Đi muộn</span>
        <span className="nhan nhan-lanh">Nghỉ phép</span>
        <span className="nhan nhan-xau">Vắng</span>
        <span className="nhan nhan-mo">Nghỉ tuần</span>
      </div>
    </div>
  );
}

// ==================================================================== man don tu

type NhomDon = 'nghi_phep' | 'giai_trinh' | 'khac';

interface DonGop {
  id: string;
  nhom: NhomDon;
  tieu_de: string;
  chi_tiet: string;
  ly_do: string | null;
  trang_thai: string;
  ghi_chu_duyet: string | null;
}

const LOAI_NGHI: [string, string][] = [
  ['phep_nam', 'Phép năm'], ['khong_luong', 'Không lương'], ['om', 'Nghỉ ốm'],
  ['thai_san', 'Thai sản'], ['ket_hon', 'Kết hôn'], ['hieu', 'Nghỉ hiếu'],
];

/** Tieu de don nghi theo loai, dung dung chinh ta chu khong ghep may moc. */
const TEN_TIEU_DE_NGHI: Record<string, string> = {
  phep_nam: 'Nghỉ phép năm', khong_luong: 'Nghỉ không lương', om: 'Nghỉ ốm',
  thai_san: 'Nghỉ thai sản', ket_hon: 'Nghỉ kết hôn', hieu: 'Nghỉ việc hiếu',
};

/** Gom ba nguon don thanh mot danh sach dung de hien thi. */
function gop_don(nghi: DonNghiPhep[] | null, giai: DonGiaiTrinh[] | null, khac: DonKhac[] | null): DonGop[] {
  const ra: DonGop[] = [];
  for (const d of nghi ?? []) {
    ra.push({
      id: d.id, nhom: 'nghi_phep',
      tieu_de: TEN_TIEU_DE_NGHI[d.loai] ?? d.loai,
      chi_tiet: d.tu_ngay === d.den_ngay
        ? `${ngay_viet(d.tu_ngay)}${d.nua_ngay ? ' · ½ ngày' : ''}`
        : `${ngay_viet(d.tu_ngay)} – ${ngay_viet(d.den_ngay)}`,
      ly_do: d.ly_do, trang_thai: d.trang_thai, ghi_chu_duyet: d.ghi_chu_duyet,
    });
  }
  for (const d of giai ?? []) {
    ra.push({
      id: d.id, nhom: 'giai_trinh',
      tieu_de: 'Giải trình quên quẹt',
      chi_tiet: `${ngay_viet(d.ngay)} · đề xuất ${gio_ngan(d.gio_vao_de_xuat)} – ${gio_ngan(d.gio_ra_de_xuat)}`,
      ly_do: d.ly_do, trang_thai: d.trang_thai, ghi_chu_duyet: d.ghi_chu_duyet,
    });
  }
  for (const d of khac ?? []) {
    const ct = d.gio_bat_dau !== null
      ? `${ngay_viet(d.tu_ngay)} · ${d.gio_bat_dau} – ${d.gio_ket_thuc ?? ''}`
      : d.den_ngay !== null && d.den_ngay !== d.tu_ngay
        ? `${ngay_viet(d.tu_ngay)} – ${ngay_viet(d.den_ngay)}${d.noi_den !== null ? ` · ${d.noi_den}` : ''}`
        : ngay_viet(d.tu_ngay);
    ra.push({
      id: d.id, nhom: 'khac', tieu_de: ten_loai_khac(d.loai),
      chi_tiet: ct, ly_do: d.ly_do, trang_thai: d.trang_thai, ghi_chu_duyet: d.ghi_chu_duyet,
    });
  }
  return ra;
}

/** Ten loai don khac, lay tu danh muc may chu. */
function ten_loai_khac(ma: string): string {
  const TEN: Record<string, string> = {
    lam_them: 'Làm thêm giờ', doi_ca: 'Đổi ca', cong_tac: 'Công tác', thoi_viec: 'Thôi việc',
  };
  return TEN[ma] ?? ma;
}

function ManDonTu({ hom_nay_nap, mo_form, dat_mo_form }: {
  hom_nay_nap: ReturnType<typeof dung_nap<HomNay>>;
  mo_form: FormMo | null;
  dat_mo_form: (m: FormMo | null) => void;
}): ReactNode {
  const [loc, dat_loc] = useState<'tat_ca' | 'cho_duyet' | 'da_duyet' | 'tu_choi'>('tat_ca');

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
            <span className="cn-nut-hanh-dong-ten">Xin nghỉ phép</span>
            <span className="cn-nut-hanh-dong-phu">Phép năm, không lương, ốm…</span>
          </span>
        </button>
        <button type="button" className="cn-nut-hanh-dong cn-nut-canh-bao" onClick={() => dat_mo_form('giai')}>
          <i className="bt bt-clock-exclamation" />
          <span>
            <span className="cn-nut-hanh-dong-ten">Giải trình quên quẹt</span>
            <span className="cn-nut-hanh-dong-phu">Bù giờ vào / ra bị thiếu</span>
          </span>
        </button>
        <button type="button" className="cn-nut-hanh-dong cn-nut-thuong" onClick={() => dat_mo_form('khac')}>
          <i className="bt bt-plus" />
          <span>
            <span className="cn-nut-hanh-dong-ten">Đơn khác</span>
            <span className="cn-nut-hanh-dong-phu">Làm thêm, đổi ca, công tác, thôi việc</span>
          </span>
        </button>
      </div>

      {phep !== null && (
        <div className="the">
          <div className="cn-tieu-de-hang">
            <h2>Quỹ phép năm {thang_nay().slice(0, 4)}</h2>
            <span className="cn-phu">còn {so_viet(phep.con_lai)}/{so_viet(phep.quy)} ngày</span>
          </div>
          <div className="cn-thanh">
            <div
              className="cn-thanh-day"
              style={{ width: `${phep.quy === 0 ? 0 : Math.round((phep.con_lai / phep.quy) * 100)}%` }}
            />
          </div>
          <span className="cn-chu-nho">
            Đã dùng {so_viet(phep.da_dung)} ngày
            {phep.cho_duyet > 0 && <> · chưa trừ {so_viet(phep.cho_duyet)} ngày đang chờ duyệt</>}.
          </span>
        </div>
      )}

      <div className="hang-nut">
        {([['tat_ca', 'Tất cả'], ['cho_duyet', `Đang chờ (${so_cho})`], ['da_duyet', 'Đã duyệt'], ['tu_choi', 'Từ chối']] as const)
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
          tieu_de="Không có đơn nào ở bộ lọc này"
          mo_ta="Chọn “Tất cả” để xem toàn bộ đơn đã gửi."
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
    </div>
  );
}

/** Ba buoc duyet don: Da gui -> Nguoi duyet -> Hoan tat. */
function buoc_don(d: DonGop): { ten: string; lop: string }[] {
  const buocs = ['Đã gửi', 'Người duyệt', 'Hoàn tất'];
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

  // Don giai trinh KHONG co duong huy tu phia nhan vien (xem may_chu/src/tuyen/toi.ts) —
  // muon rut lai thi nho nhan su xu ly.
  const huy_duoc = d.nhom !== 'giai_trinh' && d.trang_thai === 'cho_duyet';

  const huy = async (): Promise<void> => {
    const dong_y = await xac_nhan.hoi({
      tieu_de: 'Hủy đơn này?',
      mo_ta: `${d.tieu_de} · ${d.chi_tiet}. Đơn sẽ được đánh dấu đã hủy và người duyệt không cần xử lý nữa.`,
      chu_dong_y: 'Hủy đơn',
      nguy_hiem: true,
    });
    if (!dong_y) return;
    const duong = d.nhom === 'nghi_phep'
      ? `/api/toi/nghi-phep/${d.id}/huy`
      : `/api/toi/don/${d.id}/huy`;
    const ok = await hd.chay(() => goi(duong, { method: 'POST', body: {} }), 'Đã hủy đơn.');
    if (ok) khi_huy();
  };

  const buocs = buoc_don(d);

  return (
    <div className="the">
      <div className="cn-don-dau">
        <div className="cn-don-tua">
          <span className="cn-don-tieu-de">{d.tieu_de}</span>
          <span className="cn-don-chi-tiet">{d.chi_tiet}</span>
          {d.ly_do !== null && d.ly_do !== '' && <span className="cn-don-ly-do">Lý do: {d.ly_do}</span>}
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

      {d.trang_thai === 'cho_duyet' && d.nhom === 'giai_trinh' && (
        <span className="cn-chu-nho">Đơn giải trình không tự hủy được — nhờ nhân sự xử lý.</span>
      )}

      {huy_duoc && (
        <button type="button" className="nut nut-nho cn-nut-huy" onClick={() => void huy()}>
          Hủy đơn
        </button>
      )}

      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      {xac_nhan.hop_thoai}
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
    }), 'Đã gửi đơn. Người duyệt sẽ nhận thông báo ngay.');
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de="Xin nghỉ phép" khi_dong={khi_dong}>
      <CotForm>
        <NhanO nhan="LOẠI NGHỈ">
          <div className="cn-chip-hang">
            {LOAI_NGHI.map(([ma, ten]) => (
              <button
                type="button"
                key={ma}
                className={`cn-chip ${loai === ma ? 'cn-chip-chon' : ''}`}
                onClick={() => dat_loai(ma)}
              >
                {ten}
              </button>
            ))}
          </div>
        </NhanO>

        <NhanO nhan="THỜI GIAN NGHỈ">
          <div className="cn-chip-hang">
            <button type="button" className={`cn-chip ${!nua_ngay ? 'cn-chip-chon' : ''}`} onClick={() => dat_nua(false)}>
              Cả ngày
            </button>
            <button type="button" className={`cn-chip ${nua_ngay ? 'cn-chip-chon' : ''}`} onClick={() => dat_nua(true)}>
              ½ ngày
            </button>
          </div>
          <div className="cn-hai-o">
            <NhanO nhan="Từ ngày">
              <input type="date" className="cn-nhap" value={tu_ngay} onChange={(e) => {
                dat_tu(e.target.value);
                if (e.target.value > den_ngay) dat_den(e.target.value);
              }} />
            </NhanO>
            {!nua_ngay && (
              <NhanO nhan="Đến ngày">
                <input type="date" className="cn-nhap" value={den_ngay} onChange={(e) => dat_den(e.target.value)} />
              </NhanO>
            )}
          </div>
          <div className="hop-thong-bao hop-tin">
            {nua_ngay ? `Nghỉ ½ ngày ${ngay_viet(tu_ngay)}`
              : `${so_ngay} ngày nghỉ, ${ngay_viet(tu_ngay)} → ${ngay_viet(den_ngay)}`}
            {phep !== null && loai === 'phep_nam' && (
              <> · còn lại {so_viet(Math.max(0, so(phep.con_lai) - so_ngay))} ngày phép</>
            )}
          </div>
        </NhanO>

        <NhanO nhan="Lý do">
          <textarea className="cn-nhap" rows={3} value={ly_do} placeholder="Việc gia đình…" onChange={(e) => dat_ly_do(e.target.value)} />
        </NhanO>

        <div className="cn-form-nut">
          <button type="button" className="nut" onClick={khi_dong}>Hủy</button>
          <button type="button" className="nut nut-chinh" disabled={hd.dang_chay} onClick={() => void gui()}>
            Gửi đơn
          </button>
        </div>
        <HopLoi loi={hd.loi} />
      </CotForm>
    </HopThoai>
  );
}

/** Ngay thieu gio quet trong thang hien tai, de chon trong form giai trinh. */
function ngay_thieu_gio(nap: BangCongThang | null): NgayCongNgay[] {
  if (nap === null) return [];
  return nap.ngay.filter((d) => d.ngay <= hom_nay()
    && d.trang_thai === 'co_mat'
    && (d.gio_vao === null || d.gio_ra === null))
    .slice().reverse();
}

function SheetGiaiTrinh({ khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void }): ReactNode {
  const hd = dung_hanh_dong();
  const bang_cong = dung_nap<BangCongThang>(`/api/toi/bang-cong?thang=${thang_nay()}`);
  const ds_thieu = ngay_thieu_gio(bang_cong.du_lieu);

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
    }), 'Đã gửi giải trình. Nhân sự duyệt xong, bảng công sẽ tự tính lại.');
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de="Giải trình quên quẹt" khi_dong={khi_dong} rong>
      <CotForm>
        {ds_thieu.length > 0 && (
          <NhanO nhan="NGÀY THIẾU GIỜ — HỆ THỐNG PHÁT HIỆN">
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
                    {d.gio_vao === null ? 'thiếu giờ vào' : 'thiếu giờ ra'}
                  </span>
                </button>
              ))}
            </div>
          </NhanO>
        )}

        <NhanO nhan="Ngày">
          <input type="date" className="cn-nhap" value={ngay} onChange={(e) => dat_ngay(e.target.value)} />
        </NhanO>

        <div className="cn-hai-o">
          <NhanO nhan="Giờ vào đề xuất">
            <input type="time" className="cn-nhap" value={gio_vao} onChange={(e) => dat_gio_vao(e.target.value)} />
          </NhanO>
          <NhanO nhan="Giờ ra đề xuất">
            <input type="time" className="cn-nhap" value={gio_ra} onChange={(e) => dat_gio_ra(e.target.value)} />
          </NhanO>
        </div>

        <NhanO nhan="Lý do (bắt buộc)">
          <textarea
            className="cn-nhap"
            rows={3}
            value={ly_do}
            placeholder="Máy không nhận khuôn mặt, đi họp ngoài…"
            onChange={(e) => dat_ly_do(e.target.value)}
          />
        </NhanO>

        <span className="cn-chu-nho">Chỉ điền mốc giờ bị thiếu. Nhân sự duyệt xong, bảng công sẽ tự tính lại.</span>

        <div className="cn-form-nut">
          <button type="button" className="nut" onClick={khi_dong}>Hủy</button>
          <button
            type="button"
            className="nut nut-chinh"
            disabled={hd.dang_chay || !du_ly_do || ngay === ''}
            onClick={() => void gui()}
          >
            Gửi giải trình
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
  const [loai, dat_loai] = useState('lam_them');
  const [tu_ngay, dat_tu] = useState(hom_nay());
  const [den_ngay, dat_den] = useState(hom_nay());
  const [gio_bat_dau, dat_gio_bat_dau] = useState('18:00');
  const [gio_ket_thuc, dat_gio_ket_thuc] = useState('20:30');
  const [noi_den, dat_noi_den] = useState('');
  const [ly_do, dat_ly_do] = useState('');

  const dt = loai_don?.find((l) => l.ma === loai) ?? null;

  const luu_y = loai === 'doi_ca'
    ? 'Đổi ca cần nhân sự chọn ca mới trên hồ sơ. Đơn ở đây là đề nghị, không tự đổi ca của bạn.'
    : loai === 'thoi_viec'
      ? 'Đơn thôi việc phải báo trước theo hợp đồng: 30 ngày với hợp đồng xác định thời hạn, 45 ngày với hợp đồng không xác định thời hạn.'
      : loai === 'lam_them'
        ? 'Tổng làm thêm không vượt 40 giờ/tháng. Hệ thống sẽ cảnh báo khi đơn vượt trần.'
        : '';

  const gui = async (): Promise<void> => {
    const ok = await hd.chay(() => goi('/api/toi/don', {
      method: 'POST',
      body: {
        loai,
        tu_ngay,
        den_ngay: dt?.co_khoang_ngay === true ? den_ngay : null,
        gio_bat_dau: loai === 'lam_them' ? gio_bat_dau : null,
        gio_ket_thuc: loai === 'lam_them' ? gio_ket_thuc : null,
        noi_den: loai === 'cong_tac' ? noi_den : null,
        ly_do,
      },
    }), 'Đã gửi đơn. Người duyệt sẽ nhận thông báo ngay.');
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de="Làm đơn" khi_dong={khi_dong} rong>
      <CotForm>
        <NhanO nhan="LOẠI ĐƠN">
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
          <NhanO nhan={dt?.nhan_tu_ngay ?? 'Ngày'}>
            <input type="date" className="cn-nhap" value={tu_ngay} onChange={(e) => {
              dat_tu(e.target.value);
              if (e.target.value > den_ngay) dat_den(e.target.value);
            }} />
          </NhanO>
          {dt?.co_khoang_ngay === true && (
            <NhanO nhan="Đến ngày">
              <input type="date" className="cn-nhap" value={den_ngay} onChange={(e) => dat_den(e.target.value)} />
            </NhanO>
          )}
        </div>

        {loai === 'lam_them' && (
          <div className="cn-hai-o">
            <NhanO nhan="Từ giờ">
              <input type="time" className="cn-nhap" value={gio_bat_dau} onChange={(e) => dat_gio_bat_dau(e.target.value)} />
            </NhanO>
            <NhanO nhan="Đến giờ">
              <input type="time" className="cn-nhap" value={gio_ket_thuc} onChange={(e) => dat_gio_ket_thuc(e.target.value)} />
            </NhanO>
          </div>
        )}

        {loai === 'cong_tac' && (
          <NhanO nhan="Nơi đến">
            <input type="text" className="cn-nhap" value={noi_den} placeholder="Đà Nẵng" onChange={(e) => dat_noi_den(e.target.value)} />
          </NhanO>
        )}

        <NhanO nhan={loai === 'cong_tac' ? 'Nội dung công tác' : 'Lý do'}>
          <textarea className="cn-nhap" rows={3} value={ly_do} onChange={(e) => dat_ly_do(e.target.value)} />
        </NhanO>

        {luu_y !== '' && <div className="hop-thong-bao hop-luu-y">{luu_y}</div>}

        <div className="cn-form-nut">
          <button type="button" className="nut" onClick={khi_dong}>Hủy</button>
          <button type="button" className="nut nut-chinh" disabled={hd.dang_chay} onClick={() => void gui()}>
            Gửi đơn
          </button>
        </div>
        <HopLoi loi={hd.loi} />
      </CotForm>
    </HopThoai>
  );
}

// ==================================================================== man luong

function ManLuong(): ReactNode {
  const [thang, dat_thang] = useState(thang_nay());
  const { du_lieu, dang_tai, loi } = dung_nap<LuongToi>(`/api/toi/luong?thang=${thang}`, [thang]);

  if (dang_tai && du_lieu === null) return <XuongDanhSach />;
  if (loi !== null) return <HopLoi loi={loi} />;
  if (du_lieu === null) return null;

  const t = du_lieu.co_so_tinh_luong;
  const phep = du_lieu.phep;
  const [nam, thg] = thang.split('-').map(Number);
  const so_ngay_phai = so(t.so_ngay_phai_lam);
  const ty_le = so_ngay_phai === 0 ? 0 : Math.round((so(t.tong_cong) / so_ngay_phai) * 100);

  return (
    <div className="cn-cot-gap" style={{ marginTop: 16 }}>
      <div className="cn-chon-thang">
        <button
          type="button"
          className="cn-nut-vuong"
          aria-label="Kỳ trước"
          onClick={() => dat_thang(thg === 1 ? `${(nam ?? 0) - 1}-12` : `${nam}-${String((thg ?? 1) - 1).padStart(2, '0')}`)}
        >
          ‹
        </button>
        <span className="cn-chon-thang-ten">Kỳ tháng {String(thg).padStart(2, '0')}/{nam}</span>
        <button
          type="button"
          className="cn-nut-vuong"
          aria-label="Kỳ sau"
          disabled={thang >= thang_nay()}
          onClick={() => dat_thang(thg === 12 ? `${(nam ?? 0) + 1}-01` : `${nam}-${String((thg ?? 1) + 1).padStart(2, '0')}`)}
        >
          ›
        </button>
      </div>

      {du_lieu.phieu_luong === null && (
        <div className="hop-thong-bao hop-tin">
          <strong>Kỳ này chưa có phiếu lương.</strong> {du_lieu.ly_do_chua_co_phieu_luong}
          {' '}Dưới đây là dữ liệu chấm công sẽ được dùng làm căn cứ — kiểm tra sớm để phát hiện sai lệch trước khi chốt.
        </div>
      )}
      {du_lieu.phieu_luong !== null && (
        <div className="hop-thong-bao hop-tot">Kỳ này đã có phiếu lương.</div>
      )}

      <div className="luoi luoi-4">
        <OSo nhan="Công thực tế" gia_tri={so_viet(t.tong_cong)} phu={`trên ${so_ngay_phai} ngày phải làm`} />
        <OSo nhan="Giờ làm" gia_tri={phut_thanh_chu(so(t.tong_phut_lam))} phu="đã trừ giờ nghỉ trưa" />
        <OSo nhan="OT ghi nhận" gia_tri={phut_thanh_chu(so(t.tong_phut_ot))} phu="chưa duyệt trả thêm" mau="lanh" />
        <OSo nhan="Vắng" gia_tri={`${so(t.so_ngay_vang)} ngày`} phu="không phép" mau={so(t.so_ngay_vang) > 0 ? 'xau' : undefined} />
      </div>

      <div className="the">
        <div className="cn-tieu-de-hang">
          <h2>Công thực tế / công chuẩn</h2>
          <span className="cn-phu">{so_viet(t.tong_cong)}/{so_ngay_phai}</span>
        </div>
        <div className="cn-thanh">
          <div className="cn-thanh-day" style={{ width: `${Math.min(100, ty_le)}%` }} />
        </div>
      </div>

      <div className="the the-mong">
        <div className="cn-dau-mong">Chi tiết kỳ tháng {String(thg).padStart(2, '0')}/{nam}</div>
        {[
          ['Ngày có mặt', `${so(t.so_ngay_co_mat)}`],
          ['Nghỉ phép', `${so(t.so_ngay_nghi_phep)}`],
          ['Ngày lễ', `${so(t.so_ngay_le)}`],
          ['Đi muộn', `${so(t.so_lan_di_muon)} lần · ${phut_thanh_chu(so(t.tong_phut_muon))}`],
          ['Về sớm', `${so(t.so_lan_ve_som)} lần · ${phut_thanh_chu(so(t.tong_phut_ve_som))}`],
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
            <h2>Quỹ phép năm {thang.slice(0, 4)}</h2>
            <span className="cn-phu">còn {so_viet(phep.con_lai)}/{so_viet(phep.quy)} ngày</span>
          </div>
          <div className="cn-thanh">
            <div
              className="cn-thanh-day cn-thanh-lanh"
              style={{ width: `${phep.quy === 0 ? 0 : Math.round((phep.con_lai / phep.quy) * 100)}%` }}
            />
          </div>
          {phep.cho_duyet > 0 && (
            <span className="cn-chu-nho">Chưa trừ {so_viet(phep.cho_duyet)} ngày đang chờ duyệt.</span>
          )}
        </div>
      )}

      <div className="hop-thong-bao hop-luu-y">
        {du_lieu.da_chot
          ? 'Kỳ công này đã chốt — số liệu dưới đây là căn cứ cuối cùng.'
          : 'Kỳ này chưa chốt. Một lần quẹt về muộn hoặc một đơn được duyệt vẫn có thể làm số liệu thay đổi.'}
        {' '}{du_lieu.ghi_chu_ot}
      </div>
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

const CAC_TAB_CN: { ma: TabCN; ten: string }[] = [
  { ma: 'chung', ten: 'Thông tin chung' },
  { ma: 'tai_lieu', ten: 'Tài liệu' },
  { ma: 'hop_dong', ten: 'Hợp đồng' },
  { ma: 'luong', ten: 'Lương' },
  { ma: 'phu_thuoc', ten: 'Người phụ thuộc' },
  { ma: 'bhxh', ten: 'BHXH – BHYT' },
  { ma: 'cong_viec', ten: 'Công việc' },
  { ma: 'thiet_bi', ten: 'Thiết bị' },
  { ma: 'cai_dat', ten: 'Cài đặt' },
];

function ManCaNhan(): ReactNode {
  const [tab, dat_tab] = useState<TabCN>('chung');
  const { du_lieu, dang_tai, loi } = dung_nap<HoSoToi>('/api/toi/ho-so');

  if (dang_tai && du_lieu === null) return <XuongDanhSach />;
  if (loi !== null) return <HopLoi loi={loi} />;
  if (du_lieu === null) return null;

  const nv = du_lieu.nhan_vien;
  if (nv === null) {
    return (
      <Trong
        tieu_de="Tài khoản chưa nối với hồ sơ nhân viên"
        mo_ta="Nhờ nhân sự gán tài khoản này vào hồ sơ của bạn thì thông tin cá nhân mới hiện ra ở đây."
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
            {nv.ma_nv} · vào làm {ngay_viet(nv.ngay_vao)}
            {nv.ngay_vao !== null && tham_nien(nv.ngay_vao) !== '' && <> · thâm niên {tham_nien(nv.ngay_vao)}</>}
          </span>
          <div className="cn-hs-chip-hang">
            <span className="cn-hs-chip-xanh">{nv.chuc_danh ?? 'Nhân viên'}</span>
            {nv.phong_ban !== null && <span className="cn-hs-chip">{nv.phong_ban}</span>}
            {nv.ca_lam !== null && (
              <span className="cn-hs-chip">
                {nv.ca_lam} {nv.gio_vao !== null && `· ${gio_hh_mm(nv.gio_vao)}–${gio_hh_mm(nv.gio_ra)}`}
              </span>
            )}
            {du_lieu.hop_dong === null && <span className="cn-hs-chip-canh-bao">Chưa có hợp đồng hiệu lực</span>}
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
            <span className="cn-hs-tl-ten">Hồ sơ tài liệu</span>
            <span className="cn-hs-tl-phu">{tl_thieu === 0 ? 'Đủ tài liệu bắt buộc' : `còn thiếu ${tl_thieu} tài liệu bắt buộc`}</span>
            {tl_thieu > 0 && (
              <button type="button" className="cn-hs-tl-nut" onClick={() => dat_tab('tai_lieu')}>Xem chi tiết</button>
            )}
          </div>
        </div>
      </div>

      {/* o chi so ho so */}
      <div className="luoi luoi-4">
        <OSo nhan="PIN máy" gia_tri={nv.pin_may ?? '—'} phu="số trên máy chấm công" />
        <OSo nhan="Ngày vào" gia_tri={ngay_viet(nv.ngay_vao)} phu={nv.ngay_chinh_thuc !== null ? `chính thức ${ngay_viet(nv.ngay_chinh_thuc)}` : 'chưa có ngày chính thức'} />
        <OSo
          nhan="Hợp đồng hiện tại"
          gia_tri={du_lieu.hop_dong === null ? '—' : TEN_LOAI_HOP_DONG[du_lieu.hop_dong.loai] ?? du_lieu.hop_dong.loai}
          phu={du_lieu.hop_dong === null ? 'chưa có hợp đồng hiệu lực' : du_lieu.hop_dong.hieu_luc_den !== null ? `đến ${ngay_viet(du_lieu.hop_dong.hieu_luc_den)}` : 'không xác định thời hạn'}
          mau={du_lieu.hop_dong === null ? 'xau' : undefined}
        />
        <OSo
          nhan="Lương hiện tại"
          gia_tri={du_lieu.luong === null ? '—' : `${so_viet(du_lieu.luong.luong_co_ban)} ₫`}
          phu={du_lieu.luong === null ? 'chưa có quyết định lương' : `phụ cấp ${so_viet(du_lieu.luong.phu_cap)} ₫ · ${TEN_HINH_THUC_LUONG[du_lieu.luong.hinh_thuc] ?? du_lieu.luong.hinh_thuc}`}
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
            {t.ten}
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
  if (nv === null) return null;

  const gt = cn?.gioi_tinh === 'nam' ? 'Nam' : cn?.gioi_tinh === 'nu' ? 'Nữ' : '—';

  return (
    <div className="luoi luoi-2">
      <Khoi
        ten="Thông tin cá nhân"
        phu="Sai thông tin? Gửi yêu cầu sửa cho nhân sự — bạn không tự sửa được hồ sơ gốc."
        dong={[
          { nhan: 'Họ và tên', gia_tri: nv.ho_ten },
          { nhan: 'Ngày sinh', gia_tri: ngay_viet(cn?.ngay_sinh ?? null) },
          { nhan: 'Giới tính', gia_tri: gt },
          { nhan: 'CCCD', gia_tri: cn?.cccd_so ?? '—' },
          { nhan: 'Điện thoại', gia_tri: nv.so_dien_thoai ?? '—' },
          { nhan: 'Email công ty', gia_tri: nv.email ?? '—' },
          { nhan: 'Nơi ở hiện tại', gia_tri: cn?.dia_chi_hien_tai ?? '—' },
          { nhan: 'Mã số thuế', gia_tri: cn?.ma_so_thue ?? '—' },
        ]}
      />
      <Khoi
        ten="Tài khoản & chấm công"
        dong={[
          { nhan: 'Mã nhân viên', gia_tri: nv.ma_nv },
          { nhan: 'Tên đăng nhập', gia_tri: du_lieu.ten_dang_nhap },
          { nhan: 'PIN trên máy chấm công', gia_tri: nv.pin_may ?? 'Chưa cấp' },
          { nhan: 'Chấm công bằng điện thoại', gia_tri: nv.duoc_cham_cong_dien_thoai ? 'Được phép' : 'Không — quẹt tại máy', mau: nv.duoc_cham_cong_dien_thoai ? 'tot' : undefined },
          { nhan: 'Múi giờ tính công', gia_tri: `UTC+${mui_gio_offset_gio()}` },
          { nhan: 'Trạng thái', gia_tri: nv.dang_hoat_dong ? 'Đang làm việc' : 'Đã nghỉ việc', mau: nv.dang_hoat_dong ? 'tot' : 'xau' },
        ]}
      />
    </div>
  );
}

function NoiDungTaiLieu({ du_lieu, ty_le_tl }: { du_lieu: HoSoToi; ty_le_tl: number }): ReactNode {
  const tl_bat_buoc = du_lieu.tai_lieu.filter((t) => t.bat_buoc && !t.chi_khi_nghi_viec);
  const tl_du = tl_bat_buoc.filter((t) => t.trang_thai === 'da_len_phan_mem').length;
  return (
    <div className="cn-cot-gap">
      <div className="the">
        <div className="cn-tieu-de-hang">
          <h2>Tiến độ hồ sơ bắt buộc</h2>
          <span className="cn-phu">{tl_du}/{tl_bat_buoc.length}</span>
        </div>
        <div className="cn-thanh">
          <div className="cn-thanh-day" style={{ width: `${ty_le_tl}%` }} />
        </div>
        <span className="cn-chu-nho">Chỉ tính là đủ khi tài liệu ở mức “Đã lên phần mềm”. Tài liệu chỉ phát sinh khi nghỉ việc được tạm miễn.</span>
      </div>

      <div className="the the-mong">
        {du_lieu.tai_lieu.map((t, i) => {
          const n = NHAN_TT_TAI_LIEU[t.trang_thai] ?? { chu: t.trang_thai, lop: 'nhan-mo' };
          const thieu = t.trang_thai === 'thieu' && t.bat_buoc && !t.chi_khi_nghi_viec;
          return (
            <div className={`cn-tl-dong ${i === 0 ? '' : 'cn-tl-vien'} ${thieu ? 'cn-tl-thieu' : ''}`} key={t.ma}>
              <div className="cn-tl-ten">
                <span className="cn-tl-ten-chinh">{t.ten}</span>
                <span className="cn-tl-mo-ta">{t.mo_ta ?? ''}</span>
              </div>
              <span className={`nhan ${n.lop}`}>{n.chu}</span>
              <span className="cn-tl-tep">{t.ten_tep ?? '—'}</span>
            </div>
          );
        })}
      </div>
      <span className="cn-chu-nho" style={{ padding: '0 4px' }}>
        Tài liệu do nhân sự đăng và cập nhật. Thiếu tài liệu nào, nhờ nhân sự bổ sung.
      </span>
    </div>
  );
}

function NoiDungHopDong({ du_lieu }: { du_lieu: HoSoToi }): ReactNode {
  const hd = du_lieu.hop_dong;
  if (du_lieu.nhan_vien === null) return null;
  return (
    <Khoi
      ten="Hợp đồng hiện tại"
      phu={hd === null
        ? 'Chưa có hợp đồng hiệu lực trong hệ thống. Bản giấy đã ký vẫn có giá trị — nhắc nhân sự đăng lên để hồ sơ đủ.'
        : undefined}
      dong={hd === null
        ? [
          { nhan: 'Loại hợp đồng', gia_tri: '—', mau: 'xau' },
          { nhan: 'Thời hạn', gia_tri: '—' },
          { nhan: 'Ngày ký', gia_tri: '—' },
        ]
        : [
          { nhan: 'Số hợp đồng', gia_tri: hd.so_hd ?? '—' },
          { nhan: 'Loại hợp đồng', gia_tri: TEN_LOAI_HOP_DONG[hd.loai] ?? hd.loai },
          { nhan: 'Chức danh', gia_tri: hd.chuc_danh ?? '—' },
          { nhan: 'Nơi làm việc', gia_tri: hd.noi_lam_viec ?? '—' },
          { nhan: 'Ngày ký', gia_tri: ngay_viet(hd.ngay_ky) },
          { nhan: 'Hiệu lực', gia_tri: hd.hieu_luc_den !== null ? `${ngay_viet(hd.hieu_luc_tu)} → ${ngay_viet(hd.hieu_luc_den)}` : `từ ${ngay_viet(hd.hieu_luc_tu)} · không xác định thời hạn` },
          { nhan: 'Lương cơ bản', gia_tri: `${so_viet(hd.luong_co_ban)} ₫` },
        ]}
    />
  );
}

function NoiDungLuongCN({ du_lieu }: { du_lieu: HoSoToi }): ReactNode {
  const l = du_lieu.luong;
  return (
    <Khoi
      ten="Lương & phụ cấp"
      phu="Số liệu do nhân sự chốt. Phiếu lương từng kỳ xem ở màn Lương."
      dong={l === null
        ? [{ nhan: 'Mức lương', gia_tri: 'Chưa có quyết định lương', mau: 'xau' }]
        : [
          { nhan: 'Lương cơ bản', gia_tri: `${so_viet(l.luong_co_ban)} ₫` },
          { nhan: 'Phụ cấp', gia_tri: `${so_viet(l.phu_cap)} ₫` },
          { nhan: 'Hình thức trả', gia_tri: TEN_HINH_THUC_LUONG[l.hinh_thuc] ?? l.hinh_thuc },
          { nhan: 'Số quyết định', gia_tri: l.so_quyet_dinh ?? '—' },
          { nhan: 'Hiệu lực từ', gia_tri: ngay_viet(l.hieu_luc_tu) },
        ]}
    />
  );
}

function NoiDungPhuThuoc({ du_lieu }: { du_lieu: HoSoToi }): ReactNode {
  if (du_lieu.nguoi_phu_thuoc.length === 0) {
    return (
      <Trong
        tieu_de="Chưa khai người phụ thuộc"
        mo_ta="Người phụ thuộc dùng để giảm trừ thuế TNCN. Gửi giấy tờ chứng minh cho nhân sự để đăng ký."
      />
    );
  }
  return (
    <div className="luoi luoi-2">
      {du_lieu.nguoi_phu_thuoc.map((p, i) => (
        <Khoi
          key={`${p.ho_ten}-${i}`}
          ten={`${p.ho_ten} · ${TEN_QUAN_HE[p.quan_he] ?? p.quan_he}`}
          dong={[
            { nhan: 'Ngày sinh', gia_tri: ngay_viet(p.ngay_sinh) },
            { nhan: 'Mã số thuế', gia_tri: p.ma_so_thue ?? '—' },
            { nhan: 'Giảm trừ', gia_tri: p.tu_thang !== null ? `từ ${ngay_viet(p.tu_thang)}${p.den_thang !== null ? ` đến ${ngay_viet(p.den_thang)}` : ' · còn hiệu lực'}` : 'chưa có khoảng áp dụng' },
            { nhan: 'Trạng thái', gia_tri: p.da_dang_ky ? 'Đã đăng ký' : 'Chưa đăng ký', mau: p.da_dang_ky ? 'tot' : undefined },
          ]}
        />
      ))}
    </div>
  );
}

function NoiDungBhxh({ du_lieu }: { du_lieu: HoSoToi }): ReactNode {
  const cn = du_lieu.ca_nhan;
  return (
    <div className="cn-cot-gap">
      <Khoi
        ten="BHXH – BHYT"
        dong={[
          { nhan: 'Số sổ BHXH', gia_tri: cn?.so_bhxh ?? 'Chưa có', mau: cn?.so_bhxh === null ? 'xau' : undefined },
          { nhan: 'Mã thẻ BHYT', gia_tri: cn?.so_the_bhyt ?? 'Chưa có', mau: cn?.so_the_bhyt === null ? 'xau' : undefined },
          { nhan: 'Cơ quan BHXH', gia_tri: cn?.co_quan_bhxh ?? '—' },
          { nhan: 'Nơi khám chữa bệnh ban đầu', gia_tri: cn?.noi_kham_chua_benh ?? '—' },
        ]}
      />
      {du_lieu.bhxh.length > 0 && (
        <div className="the the-mong">
          <div className="cn-dau-mong">Các sự kiện gần đây</div>
          {du_lieu.bhxh.map((s, i) => (
            <div className="cn-bhxh-dong" key={`${s.loai}-${s.thang}-${i}`}>
              <div className="cn-bhxh-trai">
                <span className="cn-bhxh-loai">{TEN_LOAI_BHXH[s.loai] ?? s.loai}</span>
                <span className="cn-bhxh-thang">tháng {s.thang.slice(0, 7)}</span>
              </div>
              <div className="cn-bhxh-giua">
                {s.muc_dong !== null && <span>mức đóng {so_viet(s.muc_dong)} ₫</span>}
                {s.ty_le_phan_tram !== null && <span> · {so_viet(s.ty_le_phan_tram)}%</span>}
                {s.so_ho_so !== null && <span> · hồ sơ {s.so_ho_so}</span>}
              </div>
              <span className={`nhan ${s.trang_thai === 'hoan_thanh' || s.trang_thai === 'co_quan_duyet' ? 'nhan-tot'
                : s.trang_thai === 'tu_choi' ? 'nhan-xau' : 'nhan-canh-bao'}`}>
                {TEN_TRANG_THAI_BHXH[s.trang_thai] ?? s.trang_thai}
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
  if (nv === null) return null;
  const quan_ly = nv.nguoi_quan_ly ?? 'Chưa gán';
  return (
    <div className="luoi luoi-2">
      <Khoi
        ten="Vị trí hiện tại"
        dong={[
          { nhan: 'Chức danh', gia_tri: nv.chuc_danh ?? '—' },
          { nhan: 'Phòng ban', gia_tri: nv.phong_ban ?? '—' },
          { nhan: 'Quản lý trực tiếp', gia_tri: quan_ly },
          { nhan: 'Ca làm việc', gia_tri: nv.ca_lam !== null ? `${nv.ca_lam} · ${gio_hh_mm(nv.gio_vao)}–${gio_hh_mm(nv.gio_ra)}` : 'Chưa gán ca' },
          { nhan: 'Nơi làm việc', gia_tri: du_lieu.hop_dong?.noi_lam_viec ?? '—' },
        ]}
      />
      <Khoi
        ten="Lịch sử công việc"
        dong={[
          { nhan: ngay_viet(nv.ngay_vao), gia_tri: nv.chuc_danh !== null ? `Tiếp nhận · ${nv.chuc_danh}` : 'Tiếp nhận' },
          { nhan: nv.ngay_chinh_thuc !== null ? ngay_viet(nv.ngay_chinh_thuc) : 'Chưa có', gia_tri: nv.ngay_chinh_thuc !== null ? 'Kết thúc thử việc' : 'Chưa xác nhận kết thúc thử việc' },
        ]}
      />
    </div>
  );
}

function NoiDungThietBi({ du_lieu }: { du_lieu: HoSoToi }): ReactNode {
  if (du_lieu.thiet_bi.length === 0) {
    return (
      <Trong
        tieu_de="Chưa có thiết bị cấp phát"
        mo_ta="Laptop, thẻ từ… do nhân sự ghi vào hồ sơ khi bàn giao."
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
            { nhan: 'Loại', gia_tri: tb.loai },
            { nhan: 'Hãng', gia_tri: tb.hang ?? '—' },
            { nhan: 'Số seri', gia_tri: tb.so_seri ?? '—' },
            { nhan: 'Ngày nhận', gia_tri: ngay_viet(tb.ngay_cap) },
            { nhan: 'Tình trạng', gia_tri: tb.tinh_trang === 'dang_dung' ? 'Đang dùng' : tb.tinh_trang, mau: tb.tinh_trang === 'dang_dung' ? 'tot' : undefined },
          ]}
        />
      ))}
    </div>
  );
}

function NoiDungCaiDat(): ReactNode {
  const [mo_mk, dat_mo_mk] = useState(false);
  const xac_nhan = dung_xac_nhan();

  return (
    <div className="cn-cot-gap">
      <button type="button" className="cn-nut-rong" onClick={() => dat_mo_mk(true)}>
        <span style={{ flex: 1 }}>Đổi mật khẩu</span>
        <span className="cn-mui">›</span>
      </button>

      <button
        type="button"
        className="cn-nut-rong cn-nut-dang-xuat"
        onClick={() => void (async () => {
          const dong_y = await xac_nhan.hoi({
            tieu_de: 'Đăng xuất khỏi ứng dụng?',
            mo_ta: 'Bạn sẽ phải đăng nhập lại bằng tên đăng nhập và mật khẩu. Dữ liệu chấm công không bị ảnh hưởng.',
            chu_dong_y: 'Đăng xuất',
            nguy_hiem: true,
          });
          if (dong_y) {
            await dang_xuat();
            window.location.assign('/');
          }
        })()}
      >
        Đăng xuất
      </button>

      <div className="cn-chan-trang">
        <span>Máy chủ nội bộ · {goc_api_tuyet_doi()}</span>
        <span>Múi giờ tính công UTC+{mui_gio_offset_gio()}</span>
      </div>

      {mo_mk && <SheetDoiMatKhau khi_dong={() => dat_mo_mk(false)} />}
      {xac_nhan.hop_thoai}
    </div>
  );
}

function SheetDoiMatKhau({ khi_dong }: { khi_dong: () => void }): ReactNode {
  const hd = dung_hanh_dong();
  const [cu, dat_cu] = useState('');
  const [moi, dat_moi] = useState('');
  const [nhap_lai, dat_nhap_lai] = useState('');

  const gui = async (): Promise<void> => {
    if (moi !== nhap_lai) {
      // Bao loi truc tiep de nguoi dung thay ngay, khong can may chu.
      hd.chay(async () => { throw new Error('Mật khẩu nhập lại không khớp.'); });
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
    <HopThoai tieu_de="Đổi mật khẩu" khi_dong={khi_dong}>
      <CotForm>
        <NhanO nhan="Mật khẩu hiện tại">
          <input type="password" className="cn-nhap" value={cu} onChange={(e) => dat_cu(e.target.value)} />
        </NhanO>
        <NhanO nhan="Mật khẩu mới">
          <input type="password" className="cn-nhap" value={moi} onChange={(e) => dat_moi(e.target.value)} />
        </NhanO>
        <NhanO nhan="Nhập lại mật khẩu mới">
          <input type="password" className="cn-nhap" value={nhap_lai} onChange={(e) => dat_nhap_lai(e.target.value)} />
        </NhanO>
        <div className="cn-form-nut">
          <button type="button" className="nut" onClick={khi_dong}>Hủy</button>
          <button
            type="button"
            className="nut nut-chinh"
            disabled={hd.dang_chay || cu === '' || moi === '' || nhap_lai === ''}
            onClick={() => void gui()}
          >
            Đổi mật khẩu
          </button>
        </div>
        <HopLoi loi={hd.loi} />
        {hd.tot !== null && <div className="hop-thong-bao hop-tot">Đã đổi mật khẩu. Đang chuyển về trang đăng nhập…</div>}
      </CotForm>
    </HopThoai>
  );
}
