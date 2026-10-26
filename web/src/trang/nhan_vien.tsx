import { useEffect, useState, type ReactNode } from 'react';
import { goi, la_admin, la_nhan_su } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, HopThoaiNhap, TEN_VAI_TRO, Trong,
  dung_hanh_dong, dung_nap, dung_xac_nhan, ngay_gio, ngay_viet,
} from '../thanh_phan.tsx';
import { LienKet } from '../dinh_tuyen.tsx';
import { dung_phan_trang } from '../phan_trang.tsx';
import { Chon, type TuyChonChon } from '../chon.tsx';
import { tra_hien_tai } from '../chuoi/chi_muc.tsx';
import { GoiY } from '../goi_y.tsx';

/**
 * Tieu de tep mau nhap nhan vien.
 *
 * Dung dau CHAM PHAY: Excel ban tieng Viet mac dinh doc/ghi CSV bang dau cham phay, mo tep
 * dau phay ra se don het vao mot cot. Bo doc phia may chu tu nhan ra ca hai.
 */
const MAU_NHAN_VIEN = [
  'Mã NV;Họ và tên;PIN máy;Phòng ban;Ca làm;Ngày vào;Số điện thoại;Email;Chấm công điện thoại',
  'NV001;Nguyễn Văn An;1001;Kho;Hành chính;01/03/2024;0901234567;an.nv@congty.vn;',
  'NV002;Trần Thị Bình;1002;Kinh doanh;Hành chính;15/07/2025;0912345678;binh.tt@congty.vn;x',
].join('\r\n') + '\r\n';

interface NhanVien {
  id: string;
  ma_nv: string;
  ho_ten: string;
  pin_may: string | null;
  ma_erp: string | null;
  ngay_vao: string | null;
  so_dien_thoai: string | null;
  email: string | null;
  chuc_danh: string | null;
  vi_tri: string | null;
  duoc_cham_cong_dien_thoai: boolean;
  mien_cham_cong: boolean;
  /** Khối của người này miễn chấm công (cờ khối) — hiển thị để khỏi tick trùng. */
  khoi_mien_cham_cong: boolean;
  dang_hoat_dong: boolean;
  phong_ban_id: string | null;
  phong_ban: string | null;
  phong_ban_kiem_nhiem: { id: string; ten: string }[];
  ca_lam_id: string | null;
  ca_lam: string | null;
  noi_lam_viec_id: string | null;
  noi_lam_viec: string | null;
  lich_nghi_ma: string | null;
  che_do_luong: 'vn' | 'tq' | 'khong';
  khoi_id: string | null;
  khoi: string | null;
  cong_chuan_thang: string | null;
  co_tai_khoan: boolean;
}

interface CaLam { id: string; ten: string; dang_hoat_dong: boolean }
interface PhongBan { id: string; ten: string }
interface NoiLamViec { id: string; ten: string; lich_nghi_ma: string }
interface Khoi {
  id: string; ma: string; ma_ngan: string | null; ten: string; dang_bat: boolean;
  mien_cham_cong: boolean;
}

interface ThietBi {
  id: string;
  serial: string;
  ten: string;
  dang_bat: boolean;
  pin_tu: number | null;
  pin_den: number | null;
  khoi_id: string | null;
}

/** Phan hoi cua POST /api/nhan-vien khi co chon tao tai khoan (Microsoft / he thong). */
interface TaiKhoanMs { upn: string; mat_khau: string; sku_id: string; ghi_chu: string }
interface TaiKhoanHeThong {
  ten_dang_nhap: string;
  mat_khau: string;
  vai_tro: string;
  ghi_chu: string;
}
interface KetQuaTaoNhanVien {
  id: string;
  ma_nv: string;
  pin_may: string | null;
  may_da_day: string[];
  viec_id: string | null;
  so_vi_tri_to_chuc: number;
  so_dau_viec_dinh_ky: number;
  canh_bao?: string[];
  tai_khoan_ms365?: TaiKhoanMs;
  tai_khoan_he_thong?: TaiKhoanHeThong;
}

/** Vi tri JD trong danh muc To chuc & trach nhiem (chi de chon khi them nhan su). */
interface ViTriToChuc {
  id: string;
  ma: string;
  ten: string;
  cap_bac: string;
  dang_hoat_dong: boolean;
  ten_phong_ban: string | null;
  so_dau_viec: number;
}

/** Nguoi Microsoft 365 da co giay phep — chon de dien san ho ten + email. */
interface NguonMs365 { oid: string; ho_ten: string; upn: string }
interface KqNguonMs365 { danh_sach: NguonMs365[]; dong_bo_luc: string | null }

/** Bay bac vi tri chon tren form — dong bo voi may_chu/src/nhan_su/vi_tri.ts. */
export const CAC_VI_TRI = [
  { ma: 'tong_giam_doc', nhan: 'Tổng Giám Đốc' },
  { ma: 'giam_doc', nhan: 'Giám đốc' },
  { ma: 'truong_phong', nhan: 'Trưởng phòng' },
  { ma: 'truong_nhom', nhan: 'Trưởng nhóm (Leader/Chuyên viên)' },
  { ma: 'nhan_vien', nhan: 'Nhân viên' },
  { ma: 'thu_viec', nhan: 'Thử việc' },
  { ma: 'hoc_viec', nhan: 'Học việc (Thực tập sinh)' },
];

export function TrangNhanVien(): ReactNode {
  const [tim, dat_tim] = useState('');
  const [chi_dang_lam, dat_chi_dang_lam] = useState(true);
  const [dang_sua, dat_dang_sua] = useState<NhanVien | null>(null);
  const [dang_them, dat_dang_them] = useState(false);
  const [dang_them_tu_dong, dat_dang_them_tu_dong] = useState(false);
  const [tao_tk_cho, dat_tao_tk_cho] = useState<NhanVien | null>(null);
  const [dang_nhap_tep, dat_dang_nhap_tep] = useState(false);
  const [tao_thieu, dat_tao_thieu] = useState(false);

  const url = `/api/nhan-vien?chi_dang_lam=${chi_dang_lam}`
    + (tim.trim() === '' ? '' : `&tim=${encodeURIComponent(tim.trim())}`);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<NhanVien[]>(url);
  const ca = dung_nap<CaLam[]>('/api/ca-lam');
  const phong = dung_nap<PhongBan[]>('/api/phong-ban');
  const may = dung_nap<ThietBi[]>('/api/thiet-bi');
  const ch_may_chu = dung_nap<{ ms365_tao?: { bat: boolean } }>('/api/xac-thuc/cau-hinh');

  const chua_co_pin = (du_lieu ?? []).filter((n) => n.pin_may === null && n.dang_hoat_dong);
  const chua_co_ca = (du_lieu ?? []).filter((n) => n.ca_lam_id === null && n.dang_hoat_dong);

  const { ds_xem, bo_phan_trang } = dung_phan_trang(du_lieu ?? []);

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            PIN máy là cầu nối giữa máy chấm công và nhân viên — không có PIN thì log về không biết
            của ai. Một PIN dùng chung cho mọi máy ở mọi văn phòng.
          </p>
        </div>
        {la_nhan_su() && (
          <div className="hang-nut" style={{ marginBottom: 0 }}>
            <button onClick={() => dat_dang_nhap_tep(true)}>Nhập từ file</button>
            <button onClick={() => dat_dang_them(true)}>+ Thêm nhân viên</button>
            <button className="nut-chinh" onClick={() => dat_dang_them_tu_dong(true)}>
              + Thêm nhân viên tự động
            </button>
          </div>
        )}
      </div>

      {chua_co_pin.length > 0 && (
        <div className="hop-thong-bao hop-luu-y">
          <strong>{chua_co_pin.length} nhân viên chưa có PIN máy:</strong>{' '}
          {chua_co_pin.slice(0, 6).map((n) => n.ho_ten).join(', ')}
          {chua_co_pin.length > 6 ? '…' : ''}. Log chấm công của họ sẽ không map được.
        </div>
      )}

      {chua_co_ca.length > 0 && (
        <div className="hop-thong-bao hop-tin">
          {chua_co_ca.length} nhân viên chưa được gán ca làm việc — hệ thống chỉ tính tổng thời gian
          có mặt, không tính đi muộn / về sớm cho họ.
        </div>
      )}

      <div className="bo-loc">
        <div className="o-nhap" style={{ minWidth: 240 }}>
          <label htmlFor="tim">Tìm theo tên, mã NV hoặc PIN</label>
          <input id="tim" value={tim} onChange={(e) => dat_tim(e.target.value)}
            placeholder="Nguyễn Văn A / NV001 / 1001" />
        </div>
        <div className="o-nhap-ngang" style={{ marginBottom: 0 }}>
          <input id="dl" type="checkbox" checked={chi_dang_lam}
            onChange={(e) => dat_chi_dang_lam(e.target.checked)} />
          <label htmlFor="dl">Chỉ người đang làm</label>
        </div>
      </div>

      <HopLoi loi={loi} />

      <div className="the the-mong">
        {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
          <Trong tieu_de="Không có nhân viên nào" mo_ta="Thêm nhân viên và gán PIN đã khai trên máy." />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Họ tên</th>
                  <th>PIN máy</th>
                  <th>Phòng ban</th>
                  <th>Ca làm</th>
                  <th>Vào làm</th>
                  <th className="canh-giua">Chấm công ĐT</th>
                  <th className="canh-giua">Tài khoản</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ds_xem.map((n) => (
                  <tr key={n.id} style={n.dang_hoat_dong ? undefined : { opacity: 0.55 }}>
                    <td className="so">{n.ma_nv}</td>
                    <td>
                      <LienKet den={`/nhan-vien/${n.id}`} tieu_de="Mở hồ sơ nhân sự"
                        lop="lk-nhan-vien">
                        {n.ho_ten}
                      </LienKet>
                      {!n.dang_hoat_dong && (
                        <span className="nhan nhan-mo" style={{ marginLeft: 6 }}>đã nghỉ</span>
                      )}
                      {n.che_do_luong === 'tq' && (
                        <span className="nhan nhan-canh-bao" style={{ marginLeft: 6 }}>lương CNY</span>
                      )}
                      {n.che_do_luong === 'khong' && (
                        <span className="nhan nhan-mo" style={{ marginLeft: 6 }}>
                          {tra_hien_tai('nv_ngoai_bang_luong')}
                        </span>
                      )}
                      {(n.mien_cham_cong || n.khoi_mien_cham_cong) && (
                        <span className="nhan nhan-mo" style={{ marginLeft: 6 }}
                          title={n.khoi_mien_cham_cong
                            ? 'Khối của người này miễn chấm công'
                            : 'Miễn chấm công theo hồ sơ'}>
                          miễn chấm công
                        </span>
                      )}
                    </td>
                    <td className="so">
                      {n.pin_may ?? <span className="nhan nhan-xau">chưa có</span>}
                    </td>
                    <td>{n.phong_ban ?? '—'}
                      {n.phong_ban_kiem_nhiem.length > 0 && (
                        <div className="mo-ta">
                          + {n.phong_ban_kiem_nhiem.map((p) => p.ten).join(', ')}
                        </div>
                      )}
                    </td>
                    <td>{n.ca_lam ?? <span className="nhan nhan-canh-bao">chưa gán</span>}</td>
                    <td className="khong-ngat">{ngay_viet(n.ngay_vao)}</td>
                    <td className="canh-giua">
                      {n.duoc_cham_cong_dien_thoai
                        ? <span className="nhan nhan-lanh">bật</span>
                        : <span className="chu-mo">—</span>}
                    </td>
                    <td className="canh-giua">
                      {n.co_tai_khoan
                        ? <span className="nhan nhan-tot">có</span>
                        : la_admin()
                          ? <button className="nut-nho nut-phang" onClick={() => dat_tao_tk_cho(n)}>
                              Tạo
                            </button>
                          : <span className="chu-mo">—</span>}
                    </td>
                    <td className="khong-ngat">
                      <LienKet den={`/nhan-vien/${n.id}`} lop="nut nut-nho nut-phang">
                        Hồ sơ
                      </LienKet>
                      {la_nhan_su() && (
                        <> <button className="nut-nho nut-phang" onClick={() => dat_dang_sua(n)}>
                          Sửa
                        </button></>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bo_phan_trang}
          </div>
        )}
      </div>

      {(dang_them || dang_them_tu_dong || dang_sua !== null) && (
        <FormNhanVien
          nhan_vien={dang_sua}
          tu_dong={dang_them_tu_dong}
          cac_ca={(ca.du_lieu ?? []).filter((c) => c.dang_hoat_dong)}
          cac_phong={phong.du_lieu ?? []}
          cac_may={(may.du_lieu ?? []).filter((m) => m.dang_bat)}
          ms365_tao_bat={ch_may_chu.du_lieu?.ms365_tao?.bat === true}
          khi_dong={() => {
            dat_dang_them(false);
            dat_dang_them_tu_dong(false);
            dat_dang_sua(null);
          }}
          khi_xong={() => {
            dat_dang_them(false);
            dat_dang_them_tu_dong(false);
            dat_dang_sua(null);
            nap_lai();
          }}
        />
      )}

      {dang_nhap_tep && (
        <HopThoaiNhap
          tieu_de="Nhập nhân viên từ file"
          duong_dan="/api/nhap/nhan-vien"
          tep_mau={MAU_NHAN_VIEN}
          ten_tep_mau="mau_nhan_vien.csv"
          them_than={{ tao_thieu }}
          mo_ta={
            <>
              Đối chiếu theo <strong>Mã NV</strong>: đã có thì cập nhật, chưa có thì tạo mới.
              Không bao giờ xóa ai — người nghỉ việc phải xử lý bằng nút "Cho nghỉ việc".
              Ô để trống nghĩa là <strong>giữ nguyên</strong> giá trị cũ, không phải xóa.
              Tên cột không cần khớp tuyệt đối (chấp nhận "Mã NV", "ma_nv", "MÃ NV"…) và
              đọc được cả file phân cách bằng dấu phẩy, chấm phẩy hoặc TAB.
              {' '}<strong>Cột PIN máy phải là số đã khai trên máy ZKTeco</strong>, và mỗi người
              chỉ một PIN dùng chung cho mọi văn phòng — nhiều văn phòng thì chia dải PIN
              (VP1 1001–1999, VP2 2001–2999…) để không ai khai trùng.
            </>
          }
          tuy_chon={
            <>
              <div className="o-nhap-ngang">
                <input id="tt" type="checkbox" checked={tao_thieu}
                  onChange={(e) => dat_tao_thieu(e.target.checked)} />
                <label htmlFor="tt">Tự tạo phòng ban chưa có trong hệ thống</label>
              </div>
              <GoiY style={{ marginTop: -8, marginBottom: 12 }}>
                Mặc định tắt: một lỗi chính tả trong file sẽ để lại một phòng ban rác mà không
                ai để ý. Ca làm thì <strong>luôn</strong> phải khai bằng tay, vì còn giờ vào /
                giờ ra / giờ nghỉ.
              </GoiY>
            </>
          }
          khi_dong={() => dat_dang_nhap_tep(false)}
          khi_xong={() => {
            dat_dang_nhap_tep(false);
            nap_lai();
            ca.nap_lai();
            phong.nap_lai();
          }}
        />
      )}

      {tao_tk_cho !== null && (
        <FormTaoTaiKhoan
          nhan_vien={tao_tk_cho}
          khi_dong={() => dat_tao_tk_cho(null)}
          khi_xong={() => {
            dat_tao_tk_cho(null);
            nap_lai();
          }}
        />
      )}
    </>
  );
}

// ============================================================ form nhan vien
interface FormProps {
  nhan_vien: NhanVien | null;
  /** Che do tu dong: tu cap PIN + tao tai khoan Microsoft bat san. */
  tu_dong: boolean;
  cac_ca: CaLam[];
  cac_phong: PhongBan[];
  cac_may: ThietBi[];
  ms365_tao_bat: boolean;
  khi_dong: () => void;
  khi_xong: () => void;
}

// ------------------------------------------------- ban nhap form them nhan vien
//
// Mat phien (SSO het han, may chu khoi dong lai khi dang trien khai, mang chap chon) hoac dong
// nham hop thoai deu lam mat sach nhung gi da go tren form dai nay. Giu BAN NHAP trong
// sessionStorage cua dung TAB dang mo: tai lai trang hay dang nhap lai van con, dong tab thi
// sach (khong de du lieu nhan su nam lai tren may dung chung).
const KHOA_BAN_NHAP = 'cham_cong_nhap_nhan_vien';

/** Cac truong cua form them/sua nhan vien (mot o = mot khoa). */
interface TruongFormNhanVien {
  ma_nv: string; ho_ten: string; pin_may: string; ma_erp: string; ma_erp1: string;
  phong_ban_id: string; ca_lam_id: string; ngay_vao: string; so_dien_thoai: string;
  email: string; chuc_danh: string; vi_tri: string;
  duoc_cham_cong_dien_thoai: boolean; mien_cham_cong: boolean; noi_lam_viec_id: string;
  che_do_luong: 'vn' | 'tq' | 'khong'; khoi_id: string; cong_chuan_thang: string;
  loai_hop_dong: string; serial_may_cua: string;
}

/** Gia tri trong cua form — dung khi mo form them moi va khi bo ban nhap. */
const FORM_TRONG: TruongFormNhanVien = {
  ma_nv: '', ho_ten: '', pin_may: '', ma_erp: '', ma_erp1: '', phong_ban_id: '',
  ca_lam_id: '', ngay_vao: '', so_dien_thoai: '', email: '', chuc_danh: '', vi_tri: '',
  duoc_cham_cong_dien_thoai: false, mien_cham_cong: false, noi_lam_viec_id: '',
  che_do_luong: 'vn', khoi_id: '', cong_chuan_thang: '', loai_hop_dong: '', serial_may_cua: '',
};

interface BanNhapNhanVien {
  f: Partial<TruongFormNhanVien>;
  kiem_nhiem: string[];
  vi_tri_to_chuc: string[];
  tu_cap_pin: boolean;
  tao_tk_ms: boolean;
  tao_tk_ht: boolean;
  nguon_ms365: string;
  ms365_da_co: boolean;
}

function doc_ban_nhap(): BanNhapNhanVien | null {
  try {
    const raw = sessionStorage.getItem(KHOA_BAN_NHAP);
    if (raw === null) return null;
    const j = JSON.parse(raw) as Partial<BanNhapNhanVien> | null;
    if (j === null || typeof j !== 'object') return null;
    if (typeof j.f !== 'object' || j.f === null) return null;
    const chuoi = (x: unknown): string[] =>
      Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : [];
    return {
      f: j.f,
      kiem_nhiem: chuoi(j.kiem_nhiem),
      vi_tri_to_chuc: chuoi(j.vi_tri_to_chuc),
      tu_cap_pin: j.tu_cap_pin !== false,
      tao_tk_ms: j.tao_tk_ms === true,
      tao_tk_ht: j.tao_tk_ht !== false,
      nguon_ms365: typeof j.nguon_ms365 === 'string' ? j.nguon_ms365 : '',
      ms365_da_co: j.ms365_da_co === true,
    };
  } catch {
    return null;
  }
}

function luu_ban_nhap(b: BanNhapNhanVien): void {
  try {
    sessionStorage.setItem(KHOA_BAN_NHAP, JSON.stringify(b));
  } catch {
    /* trinh duyet chan sessionStorage (che do rieng tu) — khong co ban nhap cung khong sao */
  }
}

function xoa_ban_nhap(): void {
  try {
    sessionStorage.removeItem(KHOA_BAN_NHAP);
  } catch {
    /* nhu tren */
  }
}

function FormNhanVien(
  { nhan_vien, tu_dong, cac_ca, cac_phong, cac_may, ms365_tao_bat, khi_dong, khi_xong }: FormProps,
): ReactNode {
  // Ban nhap chi dung cho form THEM MOI: sua ho so thi du lieu that da co trong CSDL.
  const [ban_nhap] = useState(() => (nhan_vien === null ? doc_ban_nhap() : null));
  const [giu_ban_nhap, dat_giu_ban_nhap] = useState(ban_nhap !== null);
  const [f, dat_f] = useState<TruongFormNhanVien>(() => ({
    ma_nv: nhan_vien?.ma_nv ?? '',
    ho_ten: nhan_vien?.ho_ten ?? '',
    pin_may: nhan_vien?.pin_may ?? '',
    ma_erp: nhan_vien?.ma_erp ?? '',
    ma_erp1: '',
    phong_ban_id: nhan_vien?.phong_ban_id ?? '',
    ca_lam_id: nhan_vien?.ca_lam_id ?? '',
    ngay_vao: nhan_vien?.ngay_vao ?? '',
    so_dien_thoai: nhan_vien?.so_dien_thoai ?? '',
    email: nhan_vien?.email ?? '',
    chuc_danh: nhan_vien?.chuc_danh ?? '',
    vi_tri: nhan_vien?.vi_tri ?? '',
    duoc_cham_cong_dien_thoai: nhan_vien?.duoc_cham_cong_dien_thoai ?? false,
    mien_cham_cong: nhan_vien?.mien_cham_cong ?? false,
    noi_lam_viec_id: nhan_vien?.noi_lam_viec_id ?? '',
    che_do_luong: nhan_vien?.che_do_luong ?? 'vn',
    khoi_id: nhan_vien?.khoi_id ?? '',
    cong_chuan_thang: nhan_vien?.cong_chuan_thang ?? '',
    loai_hop_dong: '',
    serial_may_cua: '',
    ...(ban_nhap?.f ?? {}),
  }));
  // Ho so moi: mac dinh de he thong cap PIN theo dai cua may thuoc khoi — nguoi lap ho so khong
  // phai nghi ra so, va cung khong phai chon may.
  const [tu_cap_pin, dat_tu_cap_pin] = useState(ban_nhap?.tu_cap_pin ?? true);
  const [kiem_nhiem, dat_kiem_nhiem] = useState<string[]>(
    ban_nhap?.kiem_nhiem ?? nhan_vien?.phong_ban_kiem_nhiem.map((p) => p.id) ?? [],
  );
  const [tao_tk_ms, dat_tao_tk_ms] = useState(
    ban_nhap?.tao_tk_ms ?? (tu_dong && ms365_tao_bat),
  );
  const [tao_tk_ht, dat_tao_tk_ht] = useState(ban_nhap?.tao_tk_ht ?? true);
  // Chon nguoi DA co tai khoan Microsoft 365 (da cap giay phep) thay vi nhap tay: he thong
  // khong tao lai tai khoan, chi khoi tao phan con lai.
  const [nguon_ms365, dat_nguon_ms365] = useState(ban_nhap?.nguon_ms365 ?? '');
  const [ms365_da_co, dat_ms365_da_co] = useState(ban_nhap?.ms365_da_co ?? false);
  // Vi tri lay tu cau hinh "To chuc & trach nhiem": chon la giao luon dau viec dinh ky cua vi tri.
  // Thu tu mang = thu tu NGUOI DUNG CHON; phan tu dau tien thanh vi tri chinh.
  const [vi_tri_to_chuc, dat_vi_tri_to_chuc] = useState<string[]>(ban_nhap?.vi_tri_to_chuc ?? []);
  const ds_vi_tri = dung_nap<ViTriToChuc[]>('/api/to-chuc/vi-tri');
  const nguon = dung_nap<KqNguonMs365>(
    nhan_vien === null ? '/api/nhan-vien/ms365-da-cap-phep' : null);
  const [ket_qua, dat_ket_qua] = useState<TaiKhoanMs | null>(null);
  const [ket_qua_ht, dat_ket_qua_ht] = useState<TaiKhoanHeThong | null>(null);
  const [ket_qua_ma, dat_ket_qua_ma] = useState('');
  const [ket_qua_pin, dat_ket_qua_pin] = useState<string | null>(null);
  const [ket_qua_may, dat_ket_qua_may] = useState<string[]>([]);
  const [ket_qua_vt, dat_ket_qua_vt] = useState<{ so_vt: number; so_viec: number } | null>(null);
  const [canh_bao_ket, dat_canh_bao_ket] = useState<string[]>([]);
  const noi = dung_nap<NoiLamViec[]>('/api/noi-lam-viec');
  const khoi = dung_nap<Khoi[]>('/api/khoi');
  const hd = dung_hanh_dong();
  const db = dung_hanh_dong();
  const xn = dung_xac_nhan();

  // Tu luu ban nhap (chi form THEM MOI): mat phien dang nhap hay dong nham hop thoai van con.
  useEffect(() => {
    if (nhan_vien !== null) return;
    luu_ban_nhap({
      f, kiem_nhiem, vi_tri_to_chuc, tu_cap_pin, tao_tk_ms, tao_tk_ht, nguon_ms365, ms365_da_co,
    });
  }, [f, kiem_nhiem, vi_tri_to_chuc, tu_cap_pin, tao_tk_ms, tao_tk_ht, nguon_ms365,
    ms365_da_co, nhan_vien]);

  const doi = (khoa: keyof typeof f, gt: string | boolean): void =>
    dat_f((cu) => ({ ...cu, [khoa]: gt }));

  /** Bo ban nhap: xoa ban luu va tra form ve trang thai trong. */
  const bo_ban_nhap = (): void => {
    xoa_ban_nhap();
    dat_giu_ban_nhap(false);
    dat_f({ ...FORM_TRONG });
    dat_kiem_nhiem([]);
    dat_vi_tri_to_chuc([]);
    dat_tu_cap_pin(true);
    dat_tao_tk_ms(tu_dong && ms365_tao_bat);
    dat_tao_tk_ht(true);
    dat_nguon_ms365('');
    dat_ms365_da_co(false);
  };

  /** Lao dong outsource: hop dong dich vu — khong thuoc bang luong, khong can chi tiet cham cong. */
  const la_outsource = f.loai_hop_dong === 'cong_tac_vien';

  /** Doi loai lao dong: outsource tu dat "Khong theo bang luong" + mien cham cong; doi sang loai
   *  khac thi tra ve VND va bo mien cham cong neu chinh viec chon outsource dat ra. */
  const doi_loai_lao_dong = (ma: string): void =>
    dat_f((cu) => {
      const outsource = ma === 'cong_tac_vien';
      const cu_outsource = cu.loai_hop_dong === 'cong_tac_vien';
      return {
        ...cu,
        loai_hop_dong: ma,
        che_do_luong: outsource
          ? 'khong'
          : (cu.che_do_luong === 'khong' ? 'vn' : cu.che_do_luong),
        mien_cham_cong: outsource ? true : (cu_outsource ? false : cu.mien_cham_cong),
      };
    });

  const khoi_dang_chon = (khoi.du_lieu ?? []).find((k) => k.id === f.khoi_id) ?? null;
  const may_cua_khoi = cac_may.filter((m) => m.khoi_id !== null && m.khoi_id === f.khoi_id
    && m.dang_bat);
  /** Chức danh chọn từ danh mục vị trí đã khai — không gõ tự do để hồ sơ/hợp đồng thống nhất. */
  const ds_chuc_danh = [...new Set(
    (ds_vi_tri.du_lieu ?? [])
      .filter((v) => v.dang_hoat_dong && !v.ma.startsWith('bac.'))
      .map((v) => v.ten),
  )].sort((a, b) => a.localeCompare(b, 'vi'));
  const chuc_danh_ngoai_danh_muc = f.chuc_danh !== '' && !ds_chuc_danh.includes(f.chuc_danh);
  /** Xem truoc khuon ma: khoi + thang nam vao lam. So thu tu chi biet khi luu. */
  const ma_xem_truoc = ((): string => {
    const mn = khoi_dang_chon?.ma_ngan;
    if (mn === null || mn === undefined || mn === '') return '';
    const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(f.ngay_vao);
    const thang = m === null ? 'MMYY' : `${m[2] as string}${(m[1] as string).slice(2)}`;
    return `NV${mn}${thang}####`;
  })();

  const bat_tat_kiem_nhiem = (id: string): void =>
    dat_kiem_nhiem((cu) => (cu.includes(id) ? cu.filter((x) => x !== id) : [...cu, id]));

  /** Chon/bo vi tri JD. Giu thu tu chon: phan tu dau tien la vi tri chinh. */
  const bat_tat_vi_tri = (id: string): void =>
    dat_vi_tri_to_chuc((cu) => (cu.includes(id) ? cu.filter((x) => x !== id) : [...cu, id]));

  /** Chon nguoi co san tai khoan Microsoft 365: dien ho ten + email, bo che do tao moi. */
  const chon_ms365 = (ma: string): void => {
    dat_nguon_ms365(ma);
    if (ma === '') {
      dat_ms365_da_co(false);
      dat_tao_tk_ms(tu_dong && ms365_tao_bat);
      return;
    }
    const u = (nguon.du_lieu?.danh_sach ?? []).find((x) => x.oid === ma);
    if (u === undefined) return;
    dat_f((cu) => ({ ...cu, ho_ten: u.ho_ten, email: u.upn }));
    dat_ms365_da_co(true);
    dat_tao_tk_ms(false);
  };

  /** Sua email tay sau khi da chon tu danh sach thi bo che do "da co" — email moi co the
   *  chua co tai khoan Microsoft nao, khong duoc bo qua buoc tao tai khoan. */
  const doi_email = (gt: string): void => {
    doi('email', gt);
    const u = (nguon.du_lieu?.danh_sach ?? []).find((x) => x.oid === nguon_ms365);
    if (u !== undefined && gt.trim().toLowerCase() !== u.upn.toLowerCase()) {
      dat_nguon_ms365('');
      dat_ms365_da_co(false);
      dat_tao_tk_ms(tu_dong && ms365_tao_bat);
    }
  };

  const dong_bo_ngay = async (): Promise<void> => {
    const ok = await db.chay(() => goi('/api/nhan-vien/ms365-da-cap-phep/dong-bo', {
      method: 'POST', body: {},
    }));
    if (ok) nguon.nap_lai();
  };

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    // Ma tren form la "ma chon" (xac_dinh_6 / xac_dinh_12 / ...) — tach thanh loai + ki han
    // dung hop dong_lao_dong.loai (CHECK migration 009).
    const hop_dong_gui = ((): { loai: string | null; thang: number | null } => {
      const ma = f.loai_hop_dong;
      if (ma === '') return { loai: null, thang: null };
      if (ma.startsWith('xac_dinh_')) {
        return { loai: 'xac_dinh', thang: Number(ma.slice('xac_dinh_'.length)) };
      }
      return { loai: ma, thang: null };
    })();
    const than = {
      ma_nv: f.ma_nv.trim(),
      ho_ten: f.ho_ten.trim(),
      pin_may: (tu_cap_pin || la_outsource)
        ? null
        : (f.pin_may.trim() === '' ? null : f.pin_may.trim()),
      ma_erp: f.ma_erp.trim() === '' ? null : f.ma_erp.trim(),
      ma_erp1: f.ma_erp1.trim() === '' ? null : f.ma_erp1.trim(),
      phong_ban_id: f.phong_ban_id === '' ? null : f.phong_ban_id,
      ca_lam_id: la_outsource || f.ca_lam_id === '' ? null : f.ca_lam_id,
      ngay_vao: f.ngay_vao === '' ? null : f.ngay_vao,
      so_dien_thoai: f.so_dien_thoai.trim() === '' ? null : f.so_dien_thoai.trim(),
      email: f.email.trim() === '' ? null : f.email.trim(),
      chuc_danh: f.chuc_danh.trim() === '' ? null : f.chuc_danh.trim(),
      vi_tri: f.vi_tri === '' ? null : f.vi_tri,
      duoc_cham_cong_dien_thoai: la_outsource ? false : f.duoc_cham_cong_dien_thoai,
      mien_cham_cong: f.mien_cham_cong,
      noi_lam_viec_id: f.noi_lam_viec_id === '' ? null : f.noi_lam_viec_id,
      che_do_luong: f.che_do_luong,
      khoi_id: f.khoi_id === '' ? null : f.khoi_id,
      phong_ban_kiem_nhiem: kiem_nhiem,
      cong_chuan_thang: la_outsource || f.cong_chuan_thang === ''
        ? null
        : Number(f.cong_chuan_thang),
    };
    if (nhan_vien === null) {
      const kq = await hd.chay_lay<KetQuaTaoNhanVien>(() =>
        goi('/api/nhan-vien', {
          method: 'POST',
          body: {
            ...than,
            tu_cap_pin: tu_cap_pin && !la_outsource,
            serial_may_cua: la_outsource || f.serial_may_cua === '' ? null : f.serial_may_cua,
            tao_tk_ms365: tao_tk_ms,
            tao_tk_he_thong: tao_tk_ht,
            ms365_da_co,
            loai_hop_dong: hop_dong_gui.loai,
            thoi_han_thang: hop_dong_gui.thang,
            vi_tri_ids: vi_tri_to_chuc,
          },
        }),
      );
      if (kq === null) return;
      // Luôn mở hộp thoại kết quả: mã nhân viên và PIN đều do hệ thống sinh nên phải hiện ra
      // đúng một lần để nhân sự chép lại bàn giao.
      dat_ket_qua(kq.tai_khoan_ms365 ?? null);
      dat_ket_qua_ht(kq.tai_khoan_he_thong ?? null);
      dat_ket_qua_ma(kq.ma_nv);
      dat_ket_qua_pin(kq.pin_may);
      dat_ket_qua_may(kq.may_da_day ?? []);
      dat_ket_qua_vt(
        kq.so_vi_tri_to_chuc > 0
          ? { so_vt: kq.so_vi_tri_to_chuc, so_viec: kq.so_dau_viec_dinh_ky }
          : null,
      );
      dat_canh_bao_ket(kq.canh_bao ?? []);
      // Da tao xong: ban nhap khong con y nghia.
      xoa_ban_nhap();
      dat_giu_ban_nhap(false);
      return;
    }
    const ok = await hd.chay(() =>
      goi(`/api/nhan-vien/${nhan_vien.id}`, { method: 'PUT', body: than }),
    );
    if (ok) khi_xong();
  };

  const cho_nghi = async (): Promise<void> => {
    if (nhan_vien === null) return;
    const dong_y = await xn.hoi({
      tieu_de: `Cho ${nhan_vien.ho_ten} nghỉ việc?`,
      mo_ta: <>
        Lịch sử chấm công và toàn bộ hồ sơ <strong>được giữ lại</strong>; tài khoản đăng nhập bị
        vô hiệu hóa. Đây KHÔNG phải xóa hồ sơ.
      </>,
      chu_dong_y: 'Cho nghỉ việc',
    });
    if (!dong_y) return;
    const ok = await hd.chay(() =>
      goi(`/api/nhan-vien/${nhan_vien.id}/nghi-viec`, { method: 'POST', body: {} }),
    );
    if (ok) khi_xong();
  };

  return (
    <HopThoai
      tieu_de={nhan_vien === null
        ? (tu_dong ? 'Thêm nhân viên tự động' : 'Thêm nhân viên')
        : `Sửa: ${nhan_vien.ho_ten}`}
      khi_dong={khi_dong}
      rong
      lop_them="hop-thoai-form-nhan-vien"
    >
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />

        {giu_ban_nhap && (
          <div className="hop-thong-bao hop-luu-y">
            Đã khôi phục nội dung đang nhập dở của lần trước (mất phiên đăng nhập hoặc đóng nhầm
            hộp thoại).{' '}
            <button type="button" className="nut-nho nut-phang" onClick={bo_ban_nhap}>
              Bỏ bản nháp
            </button>
          </div>
        )}

        {nhan_vien === null && tu_dong && (
          <div className="hop-thong-bao hop-tin">
            Chế độ tự động: hệ thống <strong>tự sinh mã nhân viên</strong>,
            {' '}<strong>tự cấp PIN theo dãy của máy thuộc khối</strong> và đẩy lên máy,
            {' '}<strong>tự tạo tài khoản hệ thống</strong> (vai trò theo vị trí)
            {ms365_tao_bat
              ? <> và <strong>tự tạo tài khoản Microsoft 365</strong> — mật khẩu khởi tạo chỉ
                hiện một lần ngay sau khi lưu.</>
              : <> — máy chủ chưa bật tạo tài khoản Microsoft nên bước đó sẽ chờ, hồ sơ vẫn
                lưu bình thường.</>}
          </div>
        )}

        {nhan_vien === null && (
          <div className="hop-thong-bao hop-tin">{tra_hien_tai('nv_hop_nhat_phu')}</div>
        )}

        {/* Chon loai lao dong TRUOC: quyet dinh phan nao cua form can dien (outsource khong
            can chi tiet cham cong). */}
        {nhan_vien === null && (
          <div className="o-nhap">
            <label htmlFor="lld">{tra_hien_tai('nv_loai_lao_dong')}</label>
            <Chon gia_tri={f.loai_hop_dong}
              dat_gia_tri={doi_loai_lao_dong}
              cac_tuy_chon={[
                { ma: 'hoc_viec', nhan: tra_hien_tai('nv_hd_hoc_viec') },
                { ma: 'cong_tac_vien', nhan: tra_hien_tai('nv_hd_outsource') },
                { ma: 'thu_viec', nhan: tra_hien_tai('nv_hd_thu_viec') },
                { ma: 'xac_dinh_6', nhan: tra_hien_tai('nv_hd_chinh_thuc_6') },
                { ma: 'xac_dinh_12', nhan: tra_hien_tai('nv_hd_chinh_thuc_12') },
                { ma: 'khong_xac_dinh', nhan: tra_hien_tai('nv_hd_khong_xac_dinh') },
              ]}
              rong={tra_hien_tai('nv_hd_chua_chon')} nhan={tra_hien_tai('nv_loai_lao_dong')} />
            <GoiY>{tra_hien_tai('nv_loai_lao_dong_phu')}</GoiY>
          </div>
        )}

        {nhan_vien === null && la_outsource && (
          <div className="hop-thong-bao hop-tin">{tra_hien_tai('nv_outsource_da_an')}</div>
        )}

        {nhan_vien === null && (
          <div className="o-nhap">
            <label htmlFor="m365">{tra_hien_tai('nv_ms365_chon')}</label>
            <Chon gia_tri={nguon_ms365} dat_gia_tri={chon_ms365}
              cac_tuy_chon={(nguon.du_lieu?.danh_sach ?? []).map((u): TuyChonChon => ({
                ma: u.oid, nhan: `${u.ho_ten} — ${u.upn}`,
              }))}
              rong={tra_hien_tai('nv_ms365_chon_rong')} nhan={tra_hien_tai('nv_ms365_chon')} />
            <div className="hang-nut" style={{ marginTop: 8 }}>
              <button type="button" className="nut-nho nut-phang"
                onClick={() => { void dong_bo_ngay(); }} disabled={db.dang_chay}>
                {db.dang_chay ? tra_hien_tai('nv_dang_dong_bo') : tra_hien_tai('nv_dong_bo_ngay')}
              </button>
              <span className="goi-y giu-hien">
                {nguon.du_lieu?.dong_bo_luc === null || nguon.du_lieu?.dong_bo_luc === undefined
                  ? tra_hien_tai('nv_chua_dong_bo')
                  : tra_hien_tai('nv_dong_bo_luc', { luc: ngay_gio(nguon.du_lieu.dong_bo_luc) })}
              </span>
            </div>
            {ms365_da_co && (
              <div className="hop-thong-bao hop-tin">{tra_hien_tai('nv_ms365_da_co')}</div>
            )}
            {db.loi !== null && <HopLoi loi={db.loi} />}
          </div>
        )}

        <div className="luoi luoi-2">
          {nhan_vien === null ? (
            <div className="o-nhap">
              <label htmlFor="ma">{tra_hien_tai('nv_ma_tu_sinh')}</label>
              <div id="ma" className={ma_xem_truoc === '' ? 'o-tinh' : 'o-tinh chu-ma'}>
                {ma_xem_truoc === '' ? tra_hien_tai('nv_ma_cho_khoi') : ma_xem_truoc}
              </div>
              <GoiY>{tra_hien_tai('nv_ma_tu_sinh_phu')}</GoiY>
            </div>
          ) : (
            <div className="o-nhap">
              <label htmlFor="ma">Mã nhân viên *</label>
              <input id="ma" value={f.ma_nv} onChange={(e) => doi('ma_nv', e.target.value)} required />
            </div>
          )}
          <div className="o-nhap">
            <label htmlFor="ht">Họ tên *</label>
            <input id="ht" value={f.ho_ten} onChange={(e) => doi('ho_ten', e.target.value)} required />
          </div>
        </div>

        {nhan_vien === null && !la_outsource && (
          <>
            <div className="o-nhap-ngang" style={{ marginBottom: tu_cap_pin ? 0 : 8 }}>
              <input id="tcp" type="checkbox" checked={tu_cap_pin}
                onChange={(e) => dat_tu_cap_pin(e.target.checked)} />
              <label htmlFor="tcp">{tra_hien_tai('nv_pin_tu_khoi')}</label>
            </div>
            {tu_cap_pin && (
              <GoiY style={{ marginTop: 0, marginBottom: 12 }}>
                {tra_hien_tai('nv_pin_tu_khoi_phu')}
                {f.khoi_id !== '' && may_cua_khoi.length === 0 && (
                  <><br /><strong>{tra_hien_tai('nv_ket_qua_chua_co_may')}</strong></>
                )}
              </GoiY>
            )}
            {!tu_cap_pin && (
              <div className="o-nhap">
                <label htmlFor="pin">{tra_hien_tai('nv_pin_nhap_tay')}</label>
                <input id="pin" value={f.pin_may} onChange={(e) => doi('pin_may', e.target.value)}
                  inputMode="numeric" placeholder="1001" />
                <GoiY>
                  Phải trùng đúng số ID đã khai trên máy ZKTeco. Chỉ gồm chữ số.
                  {' '}<strong>Nhiều văn phòng thì dùng CHUNG một số PIN cho cả ba máy</strong> — PIN
                  chính là danh tính, máy nào quẹt cũng ra đúng người.
                </GoiY>
              </div>
            )}
            <div className="o-nhap">
              <label htmlFor="mc">{tra_hien_tai('nv_may_cua')}</label>
              <Chon gia_tri={f.serial_may_cua} dat_gia_tri={(ma) => doi('serial_may_cua', ma)}
                cac_tuy_chon={cac_may.map((m): TuyChonChon => ({ ma: m.serial, nhan: m.ten }))}
                rong={tra_hien_tai('nv_may_cua_rong')} nhan={tra_hien_tai('nv_may_cua')} />
              <GoiY>{tra_hien_tai('nv_may_cua_phu')}</GoiY>
            </div>
          </>
        )}
        {nhan_vien !== null && (
          <div className="o-nhap">
            <label htmlFor="pin">PIN trên máy chấm công</label>
            <input id="pin" value={f.pin_may} onChange={(e) => doi('pin_may', e.target.value)}
              inputMode="numeric" placeholder="1001" />
            <GoiY>
              Phải trùng đúng số ID đã khai trên máy ZKTeco. Chỉ gồm chữ số.
            </GoiY>
          </div>
        )}

        <div className="o-nhap">
          <label htmlFor="cd">Chức danh</label>
          <Chon gia_tri={f.chuc_danh}
            dat_gia_tri={(ten) => doi('chuc_danh', ten)}
            cac_tuy_chon={[
              ...(chuc_danh_ngoai_danh_muc
                ? [{ ma: f.chuc_danh, nhan: f.chuc_danh }]
                : []),
              ...ds_chuc_danh.map((ten): TuyChonChon => ({ ma: ten, nhan: ten })),
            ]}
            rong="— Chưa chọn —" nhan="Chức danh" />
          <GoiY>
            Chọn từ danh mục <strong>vị trí</strong> đã khai ở Tổ chức &amp; trách nhiệm. Muốn giao
            việc định kỳ thì chọn thêm vị trí ở mục bên dưới.
          </GoiY>
        </div>

        <div className="o-nhap">
          <label htmlFor="vtri">Vị trí</label>
          <Chon gia_tri={f.vi_tri}
            dat_gia_tri={(ma) => doi('vi_tri', ma)}
            cac_tuy_chon={CAC_VI_TRI.map((v): TuyChonChon => ({ ma: v.ma, nhan: v.nhan }))}
            rong="— Chưa chọn —" nhan="Vị trí" />
          <GoiY>
            Khi tạo tài khoản hệ thống, vai trò tự suy từ vị trí: Tổng Giám Đốc/Giám đốc nhận
            vai trò nhân sự, Trưởng phòng nhận trưởng phòng, còn lại nhận nhân viên.
          </GoiY>
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="pb">Phòng ban</label>
            <Chon gia_tri={f.phong_ban_id}
              dat_gia_tri={(ma) => doi('phong_ban_id', ma)}
              cac_tuy_chon={cac_phong.map((p): TuyChonChon => ({ ma: p.id, nhan: p.ten }))}
              rong="— Chưa gán —" nhan="Phòng ban" />
          </div>
          {!la_outsource && (
            <div className="o-nhap">
              <label htmlFor="cl">Ca làm việc</label>
              <Chon gia_tri={f.ca_lam_id}
                dat_gia_tri={(ma) => doi('ca_lam_id', ma)}
                cac_tuy_chon={cac_ca.map((c): TuyChonChon => ({ ma: c.id, nhan: c.ten }))}
                rong="— Chưa gán —" nhan="Ca làm việc" />
            </div>
          )}
        </div>

        <div className="o-nhap">
          <label>{tra_hien_tai('nv_phong_ban_kiem_nhiem')}</label>
          <div className="vo-bang" style={{ maxHeight: 170, overflowY: 'auto' }}>
            <table className="bang-gon">
              <tbody>
                {cac_phong
                  .filter((p) => p.id !== f.phong_ban_id)
                  .map((p) => (
                    <tr key={p.id}>
                      <td style={{ width: 32 }}>
                        <input type="checkbox" checked={kiem_nhiem.includes(p.id)}
                          aria-label={`${tra_hien_tai('nv_phong_ban_kiem_nhiem')}: ${p.ten}`}
                          onChange={() => bat_tat_kiem_nhiem(p.id)} />
                      </td>
                      <td>{p.ten}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <GoiY>{tra_hien_tai('nv_phong_ban_kiem_nhiem_phu')}</GoiY>
        </div>

        {nhan_vien === null && (
          <div className="o-nhap">
            <label>{tra_hien_tai('nv_vi_tri_to_chuc')}</label>
            {(ds_vi_tri.du_lieu ?? [])
              .filter((v) => v.dang_hoat_dong && !v.ma.startsWith('bac.'))
              .length === 0 ? (
                <div className="goi-y giu-hien">{tra_hien_tai('nv_vi_tri_khong_co')}</div>
              ) : (
                <div className="vo-bang" style={{ maxHeight: 210, overflowY: 'auto' }}>
                  <table className="bang-gon">
                    <tbody>
                      {(ds_vi_tri.du_lieu ?? [])
                        .filter((v) => v.dang_hoat_dong && !v.ma.startsWith('bac.'))
                        .map((v) => (
                          <tr key={v.id}>
                            <td style={{ width: 32 }}>
                              <input type="checkbox" checked={vi_tri_to_chuc.includes(v.id)}
                                aria-label={`${tra_hien_tai('nv_vi_tri_to_chuc')}: ${v.ten}`}
                                onChange={() => bat_tat_vi_tri(v.id)} />
                            </td>
                            <td>{v.ten}
                              <div className="mo-ta">
                                {v.ten_phong_ban ?? 'Toàn công ty'} · {v.so_dau_viec} đầu việc
                              </div>
                            </td>
                            <td className="khong-ngat">
                              {vi_tri_to_chuc[0] === v.id && (
                                <span className="nhan nhan-tot">{tra_hien_tai('nv_vi_tri_chinh_nhan')}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            <GoiY>{tra_hien_tai('nv_vi_tri_to_chuc_phu')}</GoiY>
            {vi_tri_to_chuc.length > 0 && (
              <div className="goi-y giu-hien">
                {tra_hien_tai('nv_vi_tri_chinh', {
                  ten: (ds_vi_tri.du_lieu ?? []).find((v) => v.id === vi_tri_to_chuc[0])?.ten ?? '',
                })}
              </div>
            )}
          </div>
        )}

        <div className="o-nhap">
          <label htmlFor="nlv">Nơi làm việc</label>
          <Chon gia_tri={f.noi_lam_viec_id}
            dat_gia_tri={(ma) => doi('noi_lam_viec_id', ma)}
            cac_tuy_chon={(noi.du_lieu ?? []).map((n): TuyChonChon => ({
              ma: n.id, nhan: `${n.ten} (${n.lich_nghi_ma.toUpperCase()})`,
            }))}
            rong="— Lịch Việt Nam (mặc định) —" nhan="Nơi làm việc" />
          <GoiY>
            Quyết định <strong>lịch nghỉ lễ</strong> áp dụng cho người này: làm ở Việt Nam theo lịch
            VN, làm ở Trung Quốc theo lịch TQ. Chưa gán = lịch Việt Nam.
          </GoiY>
        </div>

        <div className="o-nhap">
          <label htmlFor="cdl">{tra_hien_tai('nv_cdl')}</label>
          <Chon gia_tri={f.che_do_luong}
            dat_gia_tri={(ma) => doi('che_do_luong', ma)}
            cac_tuy_chon={[
              { ma: 'vn', nhan: tra_hien_tai('nv_cdl_vn') },
              { ma: 'tq', nhan: tra_hien_tai('nv_cdl_tq') },
              { ma: 'khong', nhan: tra_hien_tai('nv_cdl_khong') },
            ]}
            nhan={tra_hien_tai('nv_cdl')} />
          <GoiY>{tra_hien_tai('nv_cdl_phu')}</GoiY>
        </div>

        <div className="o-nhap">
          <label htmlFor="khoi">Khối</label>
          <Chon gia_tri={f.khoi_id}
            dat_gia_tri={(ma) => doi('khoi_id', ma)}
            cac_tuy_chon={(khoi.du_lieu ?? []).filter((k) => k.dang_bat).map((k): TuyChonChon => ({
              ma: k.id, nhan: k.ten,
            }))}
            rong="— Chưa gán —" nhan="Khối" />
          <GoiY>
            Gán khối để người này <strong>tự hưởng phụ cấp mặc định của khối</strong> (VP, Kho HN,
            VP Lạng Sơn, Kho TQ). Phụ cấp cá nhân (nếu có) vẫn <strong>đè lên</strong> mức của khối.
          </GoiY>
        </div>

        {!la_outsource && (
          <div className="o-nhap">
            <label htmlFor="ccr">{tra_hien_tai('nv_cong_chuan_rieng')}</label>
            <input id="ccr" type="number" min="0" max="31" step="0.5"
              value={f.cong_chuan_thang} onChange={(e) => doi('cong_chuan_thang', e.target.value)}
              placeholder="—" />
            <GoiY>{tra_hien_tai('nv_cong_chuan_rieng_phu')}</GoiY>
          </div>
        )}

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="nv">Ngày vào làm</label>
            <input id="nv" type="date" value={f.ngay_vao} onChange={(e) => doi('ngay_vao', e.target.value)} />
          </div>
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="erp">Mã bên ERP</label>
            <input id="erp" value={f.ma_erp} onChange={(e) => doi('ma_erp', e.target.value)}
              placeholder="Để đồng bộ bảng lương" />
          </div>
          <div className="o-nhap">
            <label htmlFor="em">Email</label>
            <input id="em" type="email" value={f.email} onChange={(e) => doi_email(e.target.value)}
              required={tao_tk_ms} />
          </div>
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="erp1">{tra_hien_tai('nv_ma_erp1')}</label>
            <input id="erp1" value={f.ma_erp1} onChange={(e) => doi('ma_erp1', e.target.value)}
              placeholder={tra_hien_tai('nv_ma_erp1_goi_y')} />
            <GoiY>{tra_hien_tai('nv_ma_erp1_phu')}</GoiY>
          </div>
          <div className="o-nhap">
            <label htmlFor="sdt">Số điện thoại</label>
            <input id="sdt" value={f.so_dien_thoai} onChange={(e) => doi('so_dien_thoai', e.target.value)} />
          </div>
        </div>

        {!la_outsource && (
          <div className="o-nhap-ngang">
            <input id="ccdt" type="checkbox" checked={f.duoc_cham_cong_dien_thoai}
              onChange={(e) => doi('duoc_cham_cong_dien_thoai', e.target.checked)} />
            <label htmlFor="ccdt">Cho phép chấm công bằng điện thoại (GPS + selfie)</label>
            <GoiY>
              Chỉ bật cho người thường xuyên đi công tác / công trường. Chấm công ngoài phạm vi địa điểm
              đã khai vẫn phải chờ nhân sự duyệt mới được tính công.
            </GoiY>
          </div>
        )}

        <div className="o-nhap-ngang">
          <input id="mcc" type="checkbox" checked={f.mien_cham_cong}
            disabled={khoi_dang_chon?.mien_cham_cong === true}
            onChange={(e) => doi('mien_cham_cong', e.target.checked)} />
          <label htmlFor="mcc">Miễn chấm công — không cần quẹt máy</label>
          <GoiY>
            {khoi_dang_chon?.mien_cham_cong === true
              ? `Khối "${khoi_dang_chon.ten}" đã miễn chấm công nên người này tự động được miễn — không cần quẹt máy, cũng không bị tính vắng.`
              : 'Bật cho người không quẹt máy (làm ở điểm chưa có máy, tài khoản hệ thống…). '
                + 'Hệ thống không ghi ngày vắng cho họ; ngày lễ và nghỉ phép vẫn tính bình thường.'}
          </GoiY>
        </div>

        {nhan_vien === null && !tu_dong && (
          <div className="o-nhap-ngang" style={{ marginTop: 8 }}>
            <input id="tkht" type="checkbox" checked={tao_tk_ht}
              onChange={(e) => dat_tao_tk_ht(e.target.checked)} />
            <label htmlFor="tkht">Tạo tài khoản hệ thống (đăng nhập app điện thoại)</label>
            <GoiY>
              Tên đăng nhập sinh từ mã nhân viên, mật khẩu khởi tạo <strong>chỉ hiện một lần</strong>
              sau khi lưu. Vai trò tự suy từ ô Vị trí ở trên.
            </GoiY>
          </div>
        )}

        {nhan_vien === null && !tu_dong && !ms365_da_co && (
          <div className="o-nhap-ngang" style={{ marginTop: 8 }}>
            <input id="tkms" type="checkbox" checked={tao_tk_ms} disabled={!ms365_tao_bat}
              onChange={(e) => dat_tao_tk_ms(e.target.checked)} />
            <label htmlFor="tkms">Tạo tài khoản Microsoft 365 + cấp giấy phép</label>
            <GoiY>
              {ms365_tao_bat
                ? <>Email trở thành tên đăng nhập Microsoft. Mật khẩu khởi tạo sẽ <strong>chỉ hiện
                  một lần</strong> ngay sau khi lưu — hãy chép lại rồi bàn giao cho nhân viên.
                  Giấy phép mặc định là <strong>Business Basic</strong>.</>
                : 'Máy chủ chưa bật tính năng này (MS365_TAO_TAI_KHOAN_BAT) — hỏi quản trị hệ thống.'}
            </GoiY>
          </div>
        )}
        {nhan_vien === null && tu_dong && (
          <GoiY style={{ marginBottom: 12 }}>
            <strong>Lưu ý:</strong> điền email công ty (dùng làm tên đăng nhập Microsoft) nếu máy
            chủ đã bật tạo tài khoản; giấy phép mặc định là Business Basic.
          </GoiY>
        )}

        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay}>
            {hd.dang_chay ? 'Đang lưu…' : 'Lưu'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
          {nhan_vien !== null && nhan_vien.dang_hoat_dong && (
            <button type="button" className="nut-nguy" style={{ marginLeft: 'auto' }}
              onClick={cho_nghi} disabled={hd.dang_chay}>
              Cho nghỉ việc
            </button>
          )}
        </div>
      </form>
      {(ket_qua_ma !== '' || ket_qua !== null || ket_qua_ht !== null) && (
        <HopThoaiKetQuaTk
          ho_ten={f.ho_ten.trim()}
          ma_nv={ket_qua_ma}
          pin={ket_qua_pin}
          may_da_day={ket_qua_may}
          ket_qua_ms={ket_qua}
          ket_qua_ht={ket_qua_ht}
          ket_qua_vt={ket_qua_vt}
          canh_bao={canh_bao_ket}
          khi_xong={() => {
            dat_ket_qua(null);
            dat_ket_qua_ht(null);
            dat_ket_qua_ma('');
            dat_ket_qua_pin(null);
            dat_ket_qua_may([]);
            dat_ket_qua_vt(null);
            khi_xong();
          }}
        />
      )}
      {xn.hop_thoai}
    </HopThoai>
  );
}

// ============================================================ ket qua tao tai khoan
function HopThoaiKetQuaTk(
  { ho_ten, ma_nv, pin, may_da_day, ket_qua_ms, ket_qua_ht, ket_qua_vt, canh_bao, khi_xong }:
  {
    ho_ten: string;
    ma_nv: string;
    pin: string | null;
    may_da_day: string[];
    ket_qua_ms: TaiKhoanMs | null;
    ket_qua_ht: TaiKhoanHeThong | null;
    ket_qua_vt: { so_vt: number; so_viec: number } | null;
    canh_bao: string[];
    khi_xong: () => void;
  },
): ReactNode {
  return (
    <HopThoai tieu_de={`Tài khoản mới — ${ho_ten}`} khi_dong={khi_xong}>
      {ket_qua_vt !== null && (
        <div className="hop-thong-bao hop-tot">
          {tra_hien_tai('nv_ket_qua_vi_tri', {
            so_vt: ket_qua_vt.so_vt, so_viec: ket_qua_vt.so_viec,
          })}
        </div>
      )}
      <div className="o-nhap">
        <label htmlFor="kq-ma">{tra_hien_tai('nv_ket_qua_ma')}</label>
        <input id="kq-ma" value={ma_nv} readOnly className="chu-ma" />
      </div>
      <div className="o-nhap">
        <label htmlFor="kq-pin">{tra_hien_tai('nv_ket_qua_pin')}</label>
        <input id="kq-pin" value={pin ?? '—'} readOnly className="chu-ma" />
        <GoiY>
          {may_da_day.length > 0
            ? `${tra_hien_tai('nv_ket_qua_may_day')}: ${may_da_day.join(', ')}`
            : tra_hien_tai('nv_ket_qua_chua_co_may')}
        </GoiY>
      </div>
      {ket_qua_ms !== null && <>
        <div className="hop-thong-bao hop-tin">
          {ket_qua_ms.ghi_chu}
        </div>
        <div className="o-nhap">
          <label htmlFor="kq-upn">Tên đăng nhập Microsoft (UPN)</label>
          <input id="kq-upn" value={ket_qua_ms.upn} readOnly />
        </div>
        <div className="o-nhap">
          <label htmlFor="kq-mk">Mật khẩu khởi tạo Microsoft</label>
          <input id="kq-mk" value={ket_qua_ms.mat_khau} readOnly className="chu-ma" />
          <div className="hang-nut">
            <button className="nut-chinh"
              onClick={() => { void navigator.clipboard.writeText(ket_qua_ms.mat_khau); }}>
              Sao chép mật khẩu Microsoft
            </button>
          </div>
        </div>
      </>}
      {ket_qua_ht !== null && <>
        <div className="hop-thong-bao hop-tin">
          {ket_qua_ht.ghi_chu}
        </div>
        <div className="o-nhap">
          <label htmlFor="kq-tdn">Tên đăng nhập hệ thống</label>
          <input id="kq-tdn" value={ket_qua_ht.ten_dang_nhap} readOnly />
          <GoiY>
            Vai trò: {TEN_VAI_TRO[ket_qua_ht.vai_tro] ?? ket_qua_ht.vai_tro} (suy từ vị trí đã chọn).
          </GoiY>
        </div>
        <div className="o-nhap">
          <label htmlFor="kq-mkh">Mật khẩu khởi tạo hệ thống</label>
          <input id="kq-mkh" value={ket_qua_ht.mat_khau} readOnly className="chu-ma" />
          <div className="hang-nut">
            <button className="nut-chinh"
              onClick={() => { void navigator.clipboard.writeText(ket_qua_ht.mat_khau); }}>
              Sao chép mật khẩu hệ thống
            </button>
          </div>
        </div>
      </>}
      {canh_bao.map((cb) => (
        <div key={cb} className="hop-thong-bao hop-luu-y">{cb}</div>
      ))}
      <div className="hang-nut">
        <button onClick={khi_xong}>Đã lưu lại</button>
      </div>
    </HopThoai>
  );
}

// ============================================================ tao tai khoan dang nhap
function FormTaoTaiKhoan(
  { nhan_vien, khi_dong, khi_xong }:
  { nhan_vien: NhanVien; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const goi_y_ten = nhan_vien.ma_nv.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const [ten, dat_ten] = useState(goi_y_ten);
  const [mk, dat_mk] = useState('');
  const [vai_tro, dat_vai_tro] = useState<'nhan_vien' | 'truong_phong'>('nhan_vien');
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(() => goi('/api/nguoi-dung', {
      method: 'POST',
      body: { ten_dang_nhap: ten.trim(), mat_khau: mk, vai_tro, nhan_vien_id: nhan_vien.id },
    }));
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de={`Tạo tài khoản cho ${nhan_vien.ho_ten}`} khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />

        <div className="hop-thong-bao hop-tin">
          Tài khoản này dùng để đăng nhập <strong>app điện thoại</strong>. Hệ thống sẽ bắt nhân viên
          đổi mật khẩu ở lần đăng nhập đầu tiên.
        </div>

        <div className="o-nhap">
          <label htmlFor="tdn">Tên đăng nhập *</label>
          <input id="tdn" value={ten} onChange={(e) => dat_ten(e.target.value)} required />
          <GoiY>Chỉ chữ không dấu, số và các ký tự . _ -</GoiY>
        </div>

        <div className="o-nhap">
          <label htmlFor="mkm">Mật khẩu tạm *</label>
          <input id="mkm" value={mk} onChange={(e) => dat_mk(e.target.value)} required />
          <GoiY>Tối thiểu 8 ký tự, có cả chữ và số. Đọc cho nhân viên rồi họ tự đổi.</GoiY>
        </div>

        <div className="o-nhap">
          <label htmlFor="vt">Vai trò</label>
          <Chon gia_tri={vai_tro}
            dat_gia_tri={(ma) => dat_vai_tro(ma as 'nhan_vien' | 'truong_phong')}
            cac_tuy_chon={[
              { ma: 'nhan_vien', nhan: `${TEN_VAI_TRO['nhan_vien']} — chỉ xem công của mình` },
              { ma: 'truong_phong', nhan: `${TEN_VAI_TRO['truong_phong']} — xem và duyệt đơn của phòng mình` },
            ]}
            nhan="Vai trò" />
        </div>

        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay}>
            {hd.dang_chay ? 'Đang tạo…' : 'Tạo tài khoản'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}

export { type NhanVien };
