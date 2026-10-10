// Phieu luong CUA TOI: nhan vien tu xem phieu luong hang thang da duyet/da tra, xem TUNG khoan.
//
// Mot bang luong khong giai thich duoc la mot don khieu nai — nen o day hien tung khoan thu
// nhap va tung khoan tru, khong gop thanh mot con so "phu cap".
import { useEffect, useState, type ReactNode } from 'react';
import { goi, gui_tep } from '../api.ts';
import { lay_muc_tieu_bao, nghe_muc_tieu_bao } from '../dieu_huong_sau.ts';
import { Chon, type TuyChonChon } from '../chon.tsx';
import {
  AnhCoToken, DangTai, HopLoi, HopThoai, OKeoTep, ThreadKhieuNai, Trong, dung_hanh_dong,
  dung_nap, khoa_tinh, ngay_gio, type TinNhanKN,
} from '../thanh_phan.tsx';
import { dung_chuoi, tra_hien_tai, type ChuoiKhoa } from '../chuoi/chi_muc.tsx';

interface KhoanPhieu {
  khoan_ma: string;
  ten: string;
  loai: 'thu_nhap' | 'tru';
  so_luong: string | null;
  don_gia: string | null;
  thanh_tien: string;
  ghi_chu: string | null;
  chiu_thue: boolean;
  chi_tiet?: { id: string; ly_do: string; so_tien: string; thu_tu: number; cac_lan?: string[] }[];
}

interface ChamCongPhieu {
  tong_ngay_du_lieu: number;
  tong_phut_lam: number;
  so_ngay_co_mat: number;
  so_ngay_vang: number;
  so_ngay_nghi_phep: number;
  so_ngay_le: number;
  so_lan_di_muon: number;
  tong_phut_muon: number;
  so_lan_ve_som: number;
  tong_phut_ve_som: number;
  so_lan_quen_quet: number | null;
}

interface Phieu {
  id: string;
  thang: string;
  ho_ten: string;
  ma_nv: string | null;
  trang_thai_ky: string;
  luong_co_ban: string;
  phu_cap: string;
  so_ngay_cong_chuan: string;
  so_ngay_cong_thuc: string;
  luong_ngay: string;
  luong_theo_cong: string;
  phut_ot: string;
  he_so_ot: string;
  tien_ot: string;
  phut_ot_nghi_tuan: string;
  phut_ot_le: string;
  tien_ot_thuong: string;
  tien_ot_nghi_tuan: string;
  tien_ot_le: string;
  he_so_ot_nghi_tuan: string;
  he_so_ot_le: string;
  thuong: string;
  phu_cap_khac: string;
  tong_thu_nhap: string;
  muc_dong_bh: string;
  so_nguoi_phu_thuoc: string;
  giam_tru_tong: string;
  thu_nhap_tinh_thue: string;
  bhxh_nld: string;
  bhyt_nld: string;
  bhtn_nld: string;
  thue_tncn: string;
  tru_khac: string;
  ly_do_tru_khac: string | null;
  ghi_chu: string | null;
  tong_tru: string;
  thuc_linh: string;
  thuc_linh_lam_tron: string;
  loai_hop_dong: string | null;
  ep_du_cong: boolean;
  mien_phat: boolean;
  khoan: KhoanPhieu[];
  /** Quy phep nam cua nam cua ky phieu. Null = chua tinh duoc. */
  phep: { quy: number; da_dung: number; con_lai: number; cho_duyet: number } | null;
  /** Cac don nghi (phep nam / khong luong) giao voi thang cua phieu. */
  nghi: { tu_ngay: string; den_ngay: string; nua_ngay: boolean; loai: string; trang_thai: string }[];
  /** Tong hop cham cong thang cua phieu (co so tinh luong). Null = chua co du lieu. */
  cham_cong: ChamCongPhieu | null;
}

interface KhieuNai {
  id: string;
  ma: string | null;
  noi_dung: string;
  trang_thai: string;
  phan_hoi: string | null;
  tao_luc: string;
  thang: string;
  anh: { id: string; ten: string }[];
  tra_loi: TinNhanKN[];
}

const KHOA_TT_KN: Record<string, { khoa: ChuoiKhoa; lop: string }> = {
  moi: { khoa: 'pl_tt_moi', lop: 'nhan-xau' },
  dang_xem: { khoa: 'pl_tt_dang_xem', lop: 'nhan-canh-bao' },
  chap_nhan: { khoa: 'pl_tt_chap_nhan', lop: 'nhan-tot' },
  tu_choi: { khoa: 'pl_tt_tu_choi', lop: 'nhan-mo' },
};

const dinh_dang = new Intl.NumberFormat('vi-VN');
const tien = (v: unknown): string => dinh_dang.format(Math.round(Number(v) || 0));
/** Dich theo khoa chuoi; khoa khong co trong tu dien thi dung chuoi thay the. */
const tra_khoa = (k: ChuoiKhoa | undefined, thay: string): string =>
  k !== undefined ? tra_hien_tai(k) : thay;
const thang_viet = (t: string): string => {
  const [n, m] = t.split('-');
  return tra_hien_tai('pl_thang_xy', { m: m ?? '', n: n ?? '' });
};
/** Phut OT thanh chuoi gio 'Xh' / 'XhYY' — dung nhat quan voi bang cong. */
const gio_ot = (phut: unknown): string => {
  const p = Number(phut) || 0;
  return `${Math.floor(p / 60)}h${p % 60 > 0 ? String(p % 60).padStart(2, '0') : ''}`;
};
const he_so = (v: unknown): string =>
  (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
/** Phut -> chuoi '89h 15p' / '6h' — cho gio cong, gio muon, gio ve som. */
const gio_phut = (phut: unknown): string => {
  const p = Number(phut) || 0;
  const g = Math.floor(p / 60);
  const m = p % 60;
  return m > 0 ? `${g}h ${String(m).padStart(2, '0')}p` : `${g}h`;
};
/** So 2 le: 0.2099 -> '20.99' — cho ti trong khau tru tren tong thu nhap. */
const hai_le = (v: number): string => (Math.round(v * 100) / 100).toFixed(2);
/** Chong CSV injection: o bat dau bang = + - @ phai bi vo hieu hoa. */
const o_csv = (v: string): string => (/^[=+\-@]/.test(v) ? `'${v}` : v);
/**
 * Giai thich cach ra tien cua mot dong khoan: don gia × so luong (hoac ghi chu nhan su
 * nhap) — de nhan vien tu kiem duoc "tru nhu the nao", khong phai tin mot con so gop.
 */
const mo_ta_khoan = (k: KhoanPhieu): ReactNode => {
  const dg = k.don_gia !== null ? Number(k.don_gia) : 0;
  const sl = k.so_luong !== null ? Number(k.so_luong) : 0;
  const ghi = k.ghi_chu !== null && k.ghi_chu !== '';
  if (dg > 0 && sl > 0) {
    return <span className="mo-ta"> {tien(dg)}đ × {sl} = {tien(k.thanh_tien)}đ</span>;
  }
  if (sl > 0) return <span className="mo-ta"> × {sl}</span>;
  if (ghi) return <span className="mo-ta"> — {k.ghi_chu}</span>;
  return null;
};
const TRANG_THAI_KY: Record<string, ChuoiKhoa> = { da_duyet: 'cn_tt_da_duyet', da_tra: 'pl_da_tra' };
const KHOA_HD: Record<string, ChuoiKhoa> = {
  thu_viec: 'cn_hd_thu_viec', xac_dinh: 'cn_hd_xac_dinh', khong_xac_dinh: 'cn_hd_kxd',
  thoi_vu: 'cn_hd_thoi_vu', cong_tac_vien: 'cn_hd_ctv', hoc_viec: 'cn_hd_hoc_viec',
};

export function TrangPhieuLuongToi({ thang_loc }: { thang_loc?: string } = {}): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<Phieu[]>('/api/toi/phieu-luong');
  const kn = dung_nap<KhieuNai[]>('/api/toi/khieu-nai-luong');
  const { tra } = dung_chuoi();
  const [chon, dat_chon] = useState(0);
  const [mo_kn, dat_mo_kn] = useState(false);

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  // `thang_loc` (khi nhung trong màn Lương cá nhân): chỉ hiện phiếu của tháng đó, ẩn ô chọn kỳ.
  const ds = thang_loc != null
    ? (du_lieu ?? []).filter((x) => x.thang === thang_loc)
    : (du_lieu ?? []);
  if (ds.length === 0) {
    return (
      <Trong tieu_de={tra('pl_chua_co_phieu')}
        mo_ta={tra('pl_phieu_hien_sau')} />
    );
  }

  const p = ds[Math.min(chon, ds.length - 1)]!;
  const cc = p.cham_cong;
  const thu_nhap = p.khoan.filter((k) => k.loai === 'thu_nhap');
  const khau_tru = p.khoan.filter((k) => k.loai === 'tru');
  // "Luong theo cong" gop CA luong co ban + phu cap roi nhan ti le cong. Tach ra de nhan vien
  // THAY RO phan phu cap (chi tiet phu cap), khong chi mot cuc "luong theo cong".
  const ty_le_cong = Number(p.so_ngay_cong_chuan) > 0
    ? Number(p.so_ngay_cong_thuc) / Number(p.so_ngay_cong_chuan) : 0;
  const pc_theo_cong = Math.round((Number(p.phu_cap) || 0) * ty_le_cong);
  const luong_cb_theo_cong = Math.round(Number(p.luong_theo_cong) || 0) - pc_theo_cong;
  // Cac khoan PHAT (di muon / nua ngay do di muon) — de hien ro "chi tiet phat" cho nguoi bi phat,
  // hoac ghi "da mien phat" khi admin da mien va khong co dong phat nao.
  const co_khoan_phat = khau_tru.some(
    (k) => k.khoan_ma === 'tru_di_muon' || k.khoan_ma === 'tru_nua_ngay',
  );
  // Cac khoan co liet ke tung lan (ngay + gio) — tach khoi bang hai cot de cot Khau tru
  // khong bi keo dai; hien ben duoi, chay ngang theo chieu rong the.
  const chi_tiet_tru = khau_tru.flatMap((k) =>
    (k.chi_tiet ?? []).map((c) => ({ khoan: k, chi: c })));
  // So khoan dang hien trong hai cot — ghi tren the tong hop (giong "5 khoan").
  const so_thu = (Number(p.phu_cap) > 0 ? 2 : 1) + (Number(p.tien_ot) > 0 ? 1 : 0)
    + thu_nhap.length + (Number(p.thuong) > 0 ? 1 : 0) + (Number(p.phu_cap_khac) > 0 ? 1 : 0);
  const so_tru = 3 + (Number(p.thue_tncn) > 0 ? 1 : 0) + khau_tru.length
    + (Number(p.tru_khac) > 0 ? 1 : 0);
  // Ti trong: khau tru chiem bao nhieu % TONG THU NHAP (the tong thue: -X).
  const thu_gop = Number(p.tong_thu_nhap) || 0;
  const tru_gop = Number(p.tong_tru) || 0;
  const ti_le_tru = thu_gop > 0 ? (tru_gop / thu_gop) * 100 : 0;
  const ti_le_cong = Math.min(100, Number(p.so_ngay_cong_chuan) > 0
    ? (Number(p.so_ngay_cong_thuc) / Number(p.so_ngay_cong_chuan)) * 100 : 0);
  // Tai the CSV cac khoan — dung de nhan vien tu doi chieu. Chong CSV injection.
  const xuat_csv = (): void => {
    const hang: string[][] = [
      [tra('pl_csv_muc'), tra('pl_csv_loai'), tra('pl_csv_so_luong'), tra('pl_csv_don_gia'),
        tra('pl_csv_thanh_tien'), tra('pl_csv_ghi_chu')],
      [tra('pl_luong_theo_cong'), 'thu_nhap', p.so_ngay_cong_thuc, '', tien(p.luong_theo_cong), ''],
      ...thu_nhap.map((k) => [k.ten, 'thu_nhap', k.so_luong ?? '', k.don_gia ?? '',
        tien(k.thanh_tien), k.ghi_chu ?? '']),
      [tra('pl_lam_them_gio'), 'thu_nhap', gio_ot(p.phut_ot), '', tien(p.tien_ot), ''],
      [tra('pl_thuong'), 'thu_nhap', '', '', tien(p.thuong), ''],
      [tra('pl_phu_cap_khac'), 'thu_nhap', '', '', tien(p.phu_cap_khac), ''],
      [tra('pl_tong_thu_nhap'), 'tong', '', '', tien(p.tong_thu_nhap), ''],
      ['BHXH (8%)', 'tru', '', '', tien(p.bhxh_nld), ''],
      ['BHYT (1,5%)', 'tru', '', '', tien(p.bhyt_nld), ''],
      ['BHTN (1%)', 'tru', '', '', tien(p.bhtn_nld), ''],
      [tra('pl_thu_nhap_tinh_thue'), 'tru', '', '', tien(p.thue_tncn), ''],
      ...khau_tru.map((k) => [k.ten, 'tru', k.so_luong ?? '', k.don_gia ?? '',
        tien(k.thanh_tien), k.ghi_chu ?? '']),
      [tra('pl_tru_khac'), 'tru', '', '', tien(p.tru_khac), p.ly_do_tru_khac ?? ''],
      [tra('pl_tong_khau_tru'), 'tong', '', '', tien(p.tong_tru), ''],
      [tra('pl_csv_thuc_nhan'), 'thuc_nhan', '', '', tien(p.thuc_linh_lam_tron), ''],
    ];
    const noi_dung = '\ufeff' + hang.map((r) => r.map(o_csv).join(',')).join('\r\n');
    const tep = new Blob([noi_dung], { type: 'text/csv;charset=utf-8' });
    const duong = URL.createObjectURL(tep);
    const a = document.createElement('a');
    a.href = duong;
    a.download = `phieu_luong_${p.thang}.csv`;
    a.click();
    URL.revokeObjectURL(duong);
  };

  return (
    <>
      {thang_loc == null && (
        <div className="pl-dau">
          <div className="pl-dau-tua">
            <h2>{tra('pl_phieu_luong')}</h2>
            <span className="mo-ta">
              {tra('pl_nhan_vien_x', { n: p.ho_ten })} — {tra('pl_ky_thang_xy', { m: p.thang.slice(5, 7), n: p.thang.slice(0, 4) })}
            </span>
          </div>
          <div className="pl-dau-nut">
            <div className="pl-thang" role="group" aria-label={tra('pl_chuyen_ky')}>
              <button type="button" className="pl-mui" aria-label={tra('pl_ky_truoc')}
                disabled={chon >= ds.length - 1} onClick={() => dat_chon(chon + 1)}>‹</button>
              <strong>{p.thang.slice(5, 7)}/{p.thang.slice(0, 4)}</strong>
              <button type="button" className="pl-mui" aria-label={tra('pl_ky_sau')}
                disabled={chon <= 0} onClick={() => dat_chon(chon - 1)}>›</button>
            </div>
            <button className="nut-phang" onClick={() => window.print()}>{tra('pl_tai_pdf')}</button>
            <button className="nut-phang" onClick={xuat_csv}>{tra('pl_xuat_file')}</button>
          </div>
        </div>
      )}

      <div className="pl-vo">
        <div className="pl-hero">
          <div className="pl-hero-chinh">
            <span className="pl-o-nhan">{tra('pl_thuc_nhan')}</span>
            <strong className="pl-tien-lon">{tien(p.thuc_linh_lam_tron)}<em>đ</em></strong>
            <span className="pl-duyet">
              <i className="pl-duyet-o" aria-hidden="true" />
              {tra_khoa(TRANG_THAI_KY[p.trang_thai_ky], p.trang_thai_ky)}
              {' · '}{tra('pl_da_lam_tron_tu', { n: tien(p.thuc_linh) })}
            </span>
            {(p.loai_hop_dong !== null || p.ep_du_cong || p.mien_phat) && (
              <span className="pl-hero-nhan">
                {p.loai_hop_dong !== null && (
                  <span className="nhan nhan-mo">{tra_khoa(KHOA_HD[p.loai_hop_dong], p.loai_hop_dong)}</span>
                )}
                {p.ep_du_cong && <span className="nhan nhan-canh-bao">{tra('pl_du_cong')}</span>}
                {p.mien_phat && <span className="nhan nhan-canh-bao">{tra('pl_mien_phat')}</span>}
              </span>
            )}
          </div>
          <div className="pl-o">
            <span className="pl-o-nhan">{tra('pl_tong_thu_nhap')}</span>
            <strong className="pl-xanh">{tien(p.tong_thu_nhap)}</strong>
            <span className="mo-ta">{tra('pl_khoan_x', { n: so_thu })}</span>
          </div>
          <div className="pl-o">
            <span className="pl-o-nhan">{tra('pl_tong_khau_tru')}</span>
            <strong className="pl-do">-{tien(p.tong_tru)}</strong>
            <span className="mo-ta">{tra('pl_khoan_x', { n: so_tru })}</span>
          </div>
          <div className="pl-o">
            <span className="pl-o-nhan">{tra('cn_cong_thuc_te')}</span>
            <strong>{p.so_ngay_cong_thuc} / {p.so_ngay_cong_chuan}</strong>
            <div className="pl-tien-do">
              <div className="pl-tien-do-day" style={{ width: `${ti_le_cong}%` }} />
            </div>
            {cc !== null && (
              <span className="mo-ta">{tra('cn_ngay_da_co_du_lieu', { n: cc.so_ngay_co_mat })}</span>
            )}
          </div>
          <div className="pl-o">
            <span className="pl-o-nhan">{tra('pl_ti_trong')}</span>
            <div className="pl-dt-thanh">
              {thu_gop > 0 ? <span className="pl-dt-thu" style={{ flexGrow: thu_gop }} /> : null}
              {tru_gop > 0 ? <span className="pl-dt-tru" style={{ flexGrow: tru_gop }} /> : null}
            </div>
            <span className="mo-ta">{tra('pl_khau_tru_chiem', { n: hai_le(ti_le_tru) })}</span>
          </div>
        </div>

        <div className="pl-cot">
          <section className="pl-the" aria-label={tra('pl_thu_nhap')}>
              <h3>{tra('pl_thu_nhap')}</h3>
            {Number(p.phu_cap) > 0 ? (
              <>
                <div className="pl-dong">
                  <span className="pl-dong-ten">{tra('pl_luong_cb_theo_cong')}
                    <span className="mo-ta"> {tra('pl_cong_xy', { n: p.so_ngay_cong_thuc, m: p.so_ngay_cong_chuan })}</span></span>
                  <span className="pl-dong-tien">{tien(luong_cb_theo_cong)}</span>
                </div>
                <div className="pl-dong">
                  <span className="pl-dong-ten">{tra('pl_phu_cap_theo_cong')}
                    <span className="mo-ta"> {tra('pl_d_thang_xy', { n: tien(p.phu_cap), m: p.so_ngay_cong_thuc, k: p.so_ngay_cong_chuan })}</span></span>
                  <span className="pl-dong-tien">{tien(pc_theo_cong)}</span>
                </div>
              </>
            ) : (
              <div className="pl-dong">
                <span className="pl-dong-ten">{tra('pl_luong_theo_cong')}
                  <span className="mo-ta"> {tra('pl_cong_xy', { n: p.so_ngay_cong_thuc, m: p.so_ngay_cong_chuan })}</span></span>
                <span className="pl-dong-tien">{tien(p.luong_theo_cong)}</span>
              </div>
            )}
            {Number(p.tien_ot) > 0 && (
              <>
                <div className="pl-dong">
                  <span className="pl-dong-ten"><strong>{tra('pl_lam_them_gio')}</strong>
                    <span className="mo-ta"> {gio_ot(p.phut_ot)}</span></span>
                  <span className="pl-dong-tien"><strong>{tien(p.tien_ot)}</strong></span>
                </div>
                {Number(p.tien_ot_thuong) > 0 && (
                  <div className="pl-dong pl-dong-con">
                    <span className="pl-dong-ten">{tra('pl_ngay_thuong')}
                      <span className="mo-ta">
                        {' '}{gio_ot(Math.max(0,
                          Number(p.phut_ot) - Number(p.phut_ot_nghi_tuan) - Number(p.phut_ot_le)))}
                        {' '}× {tra('pl_he_so_x', { n: he_so(p.he_so_ot) })}
                      </span></span>
                    <span className="pl-dong-tien">{tien(p.tien_ot_thuong)}</span>
                  </div>
                )}
                {Number(p.tien_ot_nghi_tuan) > 0 && (
                  <div className="pl-dong pl-dong-con">
                    <span className="pl-dong-ten">{tra('pl_chu_nhat')}
                      <span className="mo-ta"> {gio_ot(p.phut_ot_nghi_tuan)} × {tra('pl_he_so_x', { n: he_so(p.he_so_ot_nghi_tuan) })}</span></span>
                    <span className="pl-dong-tien">{tien(p.tien_ot_nghi_tuan)}</span>
                  </div>
                )}
                {Number(p.tien_ot_le) > 0 && (
                  <div className="pl-dong pl-dong-con">
                    <span className="pl-dong-ten">{tra('pl_ngay_le')}
                      <span className="mo-ta"> {gio_ot(p.phut_ot_le)} × {tra('pl_he_so_x', { n: he_so(p.he_so_ot_le) })}</span></span>
                    <span className="pl-dong-tien">{tien(p.tien_ot_le)}</span>
                  </div>
                )}
              </>
            )}
            {thu_nhap.map((k) => (
              <div className="pl-dong" key={k.khoan_ma}>
                <span className="pl-dong-ten">{k.ten}{k.chiu_thue ? '' : tra('pl_mien_thue')}{mo_ta_khoan(k)}</span>
                <span className="pl-dong-tien">{tien(k.thanh_tien)}</span>
              </div>
            ))}
            {Number(p.thuong) > 0 && (
              <div className="pl-dong">
                <span className="pl-dong-ten">{tra('pl_thuong')}</span>
                <span className="pl-dong-tien">{tien(p.thuong)}</span>
              </div>
            )}
            {Number(p.phu_cap_khac) > 0 && (
              <div className="pl-dong">
                <span className="pl-dong-ten">{tra('pl_phu_cap_khac')}</span>
                <span className="pl-dong-tien">{tien(p.phu_cap_khac)}</span>
              </div>
            )}
            <div className="pl-dong pl-dong-tong pl-tong-xanh">
              <span className="pl-dong-ten"><strong>{tra('pl_tong_thu_nhap')}</strong></span>
              <span className="pl-dong-tien"><strong>{tien(p.tong_thu_nhap)} đ</strong></span>
            </div>
          </section>

          <section className="pl-the" aria-label={tra('pl_khau_tru')}>
            <h3>{tra('pl_khau_tru')}</h3>
            <div className="pl-dong">
              <span className="pl-dong-ten">BHXH (8%)
                <span className="mo-ta">{tra('pl_tien_luong_dong', { n: tien(p.muc_dong_bh) })}</span></span>
              <span className="pl-dong-tien">-{tien(p.bhxh_nld)}</span>
            </div>
            <div className="pl-dong">
              <span className="pl-dong-ten">BHYT (1,5%)
                <span className="mo-ta">{tra('pl_tien_luong_dong', { n: tien(p.muc_dong_bh) })}</span></span>
              <span className="pl-dong-tien">-{tien(p.bhyt_nld)}</span>
            </div>
            <div className="pl-dong">
              <span className="pl-dong-ten">BHTN (1%)
                <span className="mo-ta">{tra('pl_tien_luong_dong', { n: tien(p.muc_dong_bh) })}</span></span>
              <span className="pl-dong-tien">-{tien(p.bhtn_nld)}</span>
            </div>
            {Number(p.thue_tncn) > 0 && (
              <div className="pl-dong">
                <span className="pl-dong-ten">{tra('pl_thu_nhap_tinh_thue')}
                  <span className="mo-ta">{tra('pl_sau_giam_tru')}</span></span>
                <span className="pl-dong-tien">-{tien(p.thue_tncn)}</span>
              </div>
            )}
            {khau_tru.map((k) => {
              const co_ct = k.chi_tiet !== undefined && k.chi_tiet.length > 0;
              return (
                <div className="pl-dong" key={k.khoan_ma}>
                  <span className="pl-dong-ten">{co_ct ? <strong>{k.ten}</strong> : k.ten}{mo_ta_khoan(k)}</span>
                  <span className="pl-dong-tien">{co_ct
                    ? <strong>{tien(k.thanh_tien)}</strong> : tien(k.thanh_tien)}</span>
                </div>
              );
            })}
            {Number(p.tru_khac) > 0 && (
              <div className="pl-dong">
                <span className="pl-dong-ten">{tra('pl_tru_khac')}{p.ly_do_tru_khac !== null && p.ly_do_tru_khac !== ''
                  ? <span className="mo-ta"> — {p.ly_do_tru_khac}</span> : null}</span>
                <span className="pl-dong-tien">-{tien(p.tru_khac)}</span>
              </div>
            )}
            {p.mien_phat && !co_khoan_phat && (
              <div className="mo-ta" style={{ padding: '6px 2px' }}>
                {tra('pl_da_mien_phat_ky')}
              </div>
            )}
            {chi_tiet_tru.length > 0 && (
              <div className="pl-muon">
                <strong>{tra('pl_cac_lan_dm_vs')}</strong>
                <div className="pl-muon-chip">
                  {chi_tiet_tru.flatMap(({ chi }) => chi.cac_lan ?? []).map((mo_ta, i) => (
                    <span className="pl-chip-muon" key={khoa_tinh(mo_ta, i)}>
                      {mo_ta.replace(/: (vào|ra) /, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="pl-dong pl-dong-tong pl-tong-do">
              <span className="pl-dong-ten"><strong>{tra('pl_tong_khau_tru')}</strong></span>
              <span className="pl-dong-tien"><strong>-{tien(p.tong_tru)} đ</strong></span>
            </div>
          </section>

          <section className="pl-the" aria-label={tra('pl_can_cu_tinh_luong')}>
              <h3>{tra('pl_can_cu_tinh_luong')}</h3>
              <div className="pl-dong">
                <span className="pl-dong-ten">{tra('pl_cong_chuan')}</span>
                <span className="pl-dong-tien"><strong>{p.so_ngay_cong_chuan}</strong> {tra('pl_ngay_unit')}</span>
              </div>
              <div className="pl-dong">
                <span className="pl-dong-ten">{tra('cn_luong_co_ban')}</span>
                <span className="pl-dong-tien">{tien(p.luong_co_ban)} đ</span>
              </div>
              <div className="pl-dong">
                <span className="pl-dong-ten">{tra('pl_luong_ngay_cong')}</span>
                <span className="pl-dong-tien">{tien(p.luong_ngay)} đ</span>
              </div>
              <div className="pl-dong">
                <span className="pl-dong-ten">{tra('pl_muc_dong_bh')}</span>
                <span className="pl-dong-tien">{tien(p.muc_dong_bh)} đ</span>
              </div>
              <div className="pl-dong">
                <span className="pl-dong-ten">{tra('pl_giam_tru_gia_canh')}</span>
                <span className="pl-dong-tien">{tien(p.giam_tru_tong)} đ</span>
              </div>
              <div className="pl-dong">
                <span className="pl-dong-ten">{tra('cn_nguoi_phu_thuoc')}</span>
                <span className="pl-dong-tien"><strong>{p.so_nguoi_phu_thuoc}</strong></span>
              </div>
              <div className="pl-dong">
                <span className="pl-dong-ten">{tra('pl_thu_nhap_tinh_thue')}</span>
                <span className="pl-dong-tien">{tien(p.thu_nhap_tinh_thue)} đ</span>
              </div>
              {p.phep !== null && (
                <div className="pl-phep">
                  <span className="pl-phep-nhan">
                    <span>{tra('pl_phep_nam')}</span>
                    <strong>{tra('pl_con_ngay_xy', { n: p.phep.con_lai, m: p.phep.quy })}</strong>
                  </span>
                  <div className="pl-phep-thanh">
                    <div className="pl-phep-day" style={{
                      width: `${Math.min(100, Math.round((p.phep.da_dung / Math.max(p.phep.quy, 1)) * 100))}%`,
                    }} />
                  </div>
                  <span className="mo-ta">{tra('pl_da_dung_x_ngay', { n: p.phep.da_dung })}{p.phep.cho_duyet > 0
                    ? ` · ${tra('pl_x_dang_cho_duyet', { n: p.phep.cho_duyet })}` : ''}</span>
                </div>
              )}
          </section>

          <div className="pl-cot-phai">
            <section className="pl-the" aria-label={tra('pl_co_so_cham_cong')}>
              <h3>{tra('pl_co_so_cham_cong')}</h3>
              {cc !== null ? (
                <>
                  <div className="pl-co-so-luoi">
                    <div className="pl-co-so-o">
                      <span>{tra('cn_cong_thuc_te')}</span>
                      <strong>{cc.so_ngay_co_mat}</strong>
                      <span className="mo-ta">{tra('cn_ngay_da_co_du_lieu', { n: cc.so_ngay_co_mat })}</span>
                    </div>
                    <div className="pl-co-so-o">
                      <span>{tra('pl_gio_cong')}</span>
                      <strong>{gio_phut(cc.tong_phut_lam)}</strong>
                      <span className="mo-ta">{tra('cn_da_tru_gio_nghi_trua')}</span>
                    </div>
                    <div className="pl-co-so-o">
                      <span>{tra('cn_ot_ghi_nhan')}</span>
                      <strong>{Number(p.phut_ot) > 0 ? gio_ot(p.phut_ot) : '—'}</strong>
                      <span className="mo-ta">{tra('pl_da_duyet_tu_tren')}</span>
                    </div>
                    <div className="pl-co-so-o">
                      <span>{tra('cn_tt_vang')}</span>
                      <strong>{cc.so_ngay_vang}</strong>
                      <span className="mo-ta">{tra('cn_khong_phep')}</span>
                    </div>
                  </div>
                  <span className="mo-ta" style={{ paddingTop: 4 }}>
                    {tra('pl_tong_x_ngay', { n: cc.tong_ngay_du_lieu })}
                  </span>
                </>
              ) : (
                <span className="mo-ta">{tra('pl_chua_co_du_lieu_ky')}</span>
              )}
            </section>

            <section className="pl-the" aria-label={tra('pl_chi_tiet_ky', { m: p.thang.slice(5, 7), n: p.thang.slice(0, 4) })}>
              <h3>{tra('pl_chi_tiet_ky', { m: p.thang.slice(5, 7), n: p.thang.slice(0, 4) })}</h3>
              {cc !== null ? (
                <>
                  <div className="pl-dong">
                    <span className="pl-dong-ten">{tra('cn_ngay_co_mat')}</span>
                    <span className="pl-dong-tien"><strong>{cc.so_ngay_co_mat}</strong></span>
                  </div>
                  <div className="pl-dong">
                    <span className="pl-dong-ten">{tra('cn_tt_nghi_phep')}</span>
                    <span className="pl-dong-tien">{cc.so_ngay_nghi_phep}</span>
                  </div>
                  <div className="pl-dong">
                    <span className="pl-dong-ten">{tra('cn_tt_ngay_le')}</span>
                    <span className="pl-dong-tien">{cc.so_ngay_le}</span>
                  </div>
                  <div className="pl-dong">
                    <span className="pl-dong-ten">{tra('cn_di_muon')}</span>
                    <span className="pl-dong-tien">{cc.so_lan_di_muon} {tra('pl_lan')} - {gio_phut(cc.tong_phut_muon)}</span>
                  </div>
                  <div className="pl-dong">
                    <span className="pl-dong-ten">{tra('cn_ve_som')}</span>
                    <span className="pl-dong-tien">{cc.so_lan_ve_som} {tra('pl_lan')} - {gio_phut(cc.tong_phut_ve_som)}</span>
                  </div>
                  <div className="pl-dong">
                    <span className="pl-dong-ten">{tra('pl_quen_cham_cong')}</span>
                    <span className="pl-dong-tien">{cc.so_lan_quen_quet ?? 0} {tra('pl_lan')}</span>
                  </div>
                </>
              ) : (
                <span className="mo-ta">{tra('pl_chua_co_du_lieu_ky')}</span>
              )}
              <div className="pl-kn-khoi">
                <span className="mo-ta">{tra('pl_sai_so_lieu')}</span>
                <button type="button" className="pl-kn-nut" onClick={() => dat_mo_kn(true)}>{tra('pl_khieu_nai')}</button>
              </div>
            </section>
          </div>
        </div>

        {(kn.du_lieu ?? []).length > 0 && (
          <div className="pl-kn">
            <DanhSachKhieuNai ds={kn.du_lieu ?? []} khi_doi={() => kn.nap_lai()} />
          </div>
        )}

        {thang_loc == null && (
          <div className="hop-thong-bao hop-luu-y">
            {tra('pl_chi_hien_khi_duyet')}
          </div>
        )}
      </div>

      {mo_kn && (
        <HopThoaiKhieuNaiLuong
          phieu_id={p.id} thang={thang_viet(p.thang)}
          khi_dong={() => dat_mo_kn(false)}
          khi_xong={() => { dat_mo_kn(false); kn.nap_lai(); }}
        />
      )}
    </>
  );
}

function HopThoaiKhieuNaiLuong(
  { phieu_id, thang, khi_dong, khi_xong }:
  { phieu_id: string; thang: string; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [noi_dung, dat_noi_dung] = useState('');
  const [anh, dat_anh] = useState<File[]>([]);
  const hd = dung_hanh_dong();
  const { tra } = dung_chuoi();

  const gui = (): void => {
    void hd.chay(async () => {
      const kq = await goi<{ id: string }>(
        '/api/toi/khieu-nai-luong',
        { method: 'POST', body: { phieu_luong_id: phieu_id, noi_dung } },
      );
      // Co anh thi dinh kem sau khi tao khieu nai (can id vua tao). Gui LAN LUOT tung anh —
      // moi anh mot ban ghi tep, khong gioi han so luong.
      if (anh.length > 0 && typeof kq.id === 'string') {
        for (const f of anh) {
          const fd = new FormData();
          fd.append('anh', f);
          await gui_tep(`/api/toi/khieu-nai-luong/${kq.id}/anh`, fd);
        }
      }
      return kq;
    }, tra('pl_da_gui_kn')).then((ok) => { if (ok) khi_xong(); });
  };

  return (
    <HopThoai tieu_de={tra('pl_khieu_nai_phieu_x', { n: thang })} khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <p className="mo-ta">
        {tra('pl_mo_ta_khoan')}
      </p>
      <label htmlFor="knnd">{tra('pl_noi_dung_kn')}</label>
      <textarea id="knnd" value={noi_dung} onChange={(e) => dat_noi_dung(e.target.value)}
        placeholder="Ví dụ: Công thực tế tháng này là 24 nhưng phiếu ghi 22…" rows={4} />
      <label htmlFor="knanh" style={{ marginTop: 10, display: 'block' }}>{tra('pl_anh_kem')}</label>
      <OKeoTep
        ma="knanh"
        nhieu
        accept="image/*"
        khi_nhan={(ds) => dat_anh(Array.from(ds ?? []))}
      />
      {anh.length > 0 && (
        <div className="mo-ta" style={{ marginTop: 4 }}>
          {tra('pl_da_chon_x_anh', { n: anh.length, ten: anh.map((f) => f.name).join(', ') })}
        </div>
      )}
      <div className="hang-nut" style={{ marginTop: 12 }}>
        <button className="nut-lanh" disabled={hd.dang_chay || noi_dung.trim().length < 5} onClick={gui}>
          {tra('pl_gui_khieu_nai')}
        </button>
        <button className="nut-phang" onClick={khi_dong}>{tra('cn_dong')}</button>
      </div>
    </HopThoai>
  );
}

/** O tra loi cua NGUOI LAO DONG vao thread khieu nai (khi ticket con mo). */
function OTraLoiKN({ kn_id, khi_gui }: { kn_id: string; khi_gui: () => void }): ReactNode {
  const [noi_dung, dat_noi_dung] = useState('');
  const hd = dung_hanh_dong();
  const { tra } = dung_chuoi();
  const gui = (): void => {
    void hd.chay(
      () => goi(`/api/toi/khieu-nai-luong/${kn_id}/tra-loi`, { method: 'POST', body: { noi_dung } }),
      tra('pl_da_gui_tra_loi'),
    ).then((ok) => { if (ok) { dat_noi_dung(''); khi_gui(); } });
  };
  return (
    <div style={{ marginTop: 8 }}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <textarea value={noi_dung} onChange={(e) => dat_noi_dung(e.target.value)} rows={2}
        placeholder={tra('pl_tra_loi_bo_sung')} />
      <div className="hang-nut" style={{ marginTop: 6 }}>
        <button className="nut-lanh" disabled={hd.dang_chay || noi_dung.trim().length < 1} onClick={gui}>
          {tra('pl_gui_tra_loi')}
        </button>
      </div>
    </div>
  );
}

/** Them nhieu anh minh chung vao mot khieu nai DANG MO (nguoi lao dong). */
function OThemAnhKN({ kn_id, khi_gui }: { kn_id: string; khi_gui: () => void }): ReactNode {
  const hd = dung_hanh_dong();
  const { tra } = dung_chuoi();
  const them = (files: FileList | null): void => {
    const ds = Array.from(files ?? []);
    if (ds.length === 0) return;
    void hd.chay(async () => {
      for (const f of ds) {
        const fd = new FormData();
        fd.append('anh', f);
        await gui_tep(`/api/toi/khieu-nai-luong/${kn_id}/anh`, fd);
      }
      return true;
    }, tra('pl_da_them_x_anh', { n: ds.length })).then((ok) => { if (ok) khi_gui(); });
  };
  return (
    <div style={{ marginTop: 6 }}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <label className="mo-ta" style={{ display: 'block', marginBottom: 2 }}>
        {tra('pl_them_anh_minh_chung')}
      </label>
      <OKeoTep
        ma={`them-anh-kn-${kn_id}`}
        accept="image/*"
        nhieu
        vo_hieu={hd.dang_chay}
        gui_ngay
        khi_nhan={(ds) => them(ds)}
      />
    </div>
  );
}

/** Danh sach khieu nai + thread trao doi; dung o ca man Phieu luong lan tab Khieu nai. */
export function DanhSachKhieuNai(
  { ds, khi_doi }: { ds: KhieuNai[]; khi_doi: () => void },
): ReactNode {
  // Muc tieu tu thong bao: cuon toi dung ticket + lam noi bat thoang qua (thao luan da hien san
  // trong tung ticket). Doc luc mount VA nghe tin hieu sau (dang o san tab nay ma bam thong bao).
  const [can_mo, dat_can_mo] = useState<string | null>(() => lay_muc_tieu_bao('khieu-nai-luong'));
  const [noi_bat, dat_noi_bat] = useState<string | null>(null);

  useEffect(() => nghe_muc_tieu_bao(() => {
    const id = lay_muc_tieu_bao('khieu-nai-luong');
    if (id !== null) dat_can_mo(id);
  }), []);

  useEffect(() => {
    if (can_mo === null) return;
    if (!ds.some((x) => x.id === can_mo)) return; // chua co trong danh sach -> cho lan nap sau
    const id = can_mo;
    dat_can_mo(null);
    // Cho DOM ve xong roi cuon toi; lam noi bat ~2,5s roi tat.
    const t = window.setTimeout(() => {
      document.getElementById(`kn-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dat_noi_bat(id);
      window.setTimeout(() => dat_noi_bat(null), 2500);
    }, 60);
    return () => window.clearTimeout(t);
  }, [ds, can_mo]);

  return (
    <div className="the">
      <h3 style={{ marginTop: 0 }}>{tra_hien_tai('pl_khieu_nai_cua_ban')}</h3>
      {ds.map((x) => {
        const mo = x.trang_thai === 'moi' || x.trang_thai === 'dang_xem';
        return (
          <div key={x.id} id={`kn-${x.id}`} className="hop-thong-bao"
            style={{
              marginBottom: 12,
              transition: 'box-shadow .3s, background-color .3s',
              ...(x.id === noi_bat
                ? { boxShadow: '0 0 0 2px var(--mau-chinh, #2563eb)', borderRadius: 8 }
                : {}),
            }}>
            <div>
              <span className={`nhan ${KHOA_TT_KN[x.trang_thai]?.lop ?? 'nhan-mo'}`}>
                {tra_khoa(KHOA_TT_KN[x.trang_thai]?.khoa, x.trang_thai)}
              </span>
              <span className="mo-ma"> {x.ma ?? ''} · {tra_hien_tai('pl_ky_x', { n: thang_viet(x.thang) })} · {ngay_gio(x.tao_luc)}</span>
            </div>
            <ThreadKhieuNai noi_dung={x.noi_dung} tao_luc={x.tao_luc} tra_loi={x.tra_loi} />
            {x.anh.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {x.anh.map((a) => (
                  <AnhCoToken key={a.id} duong_dan={`/api/toi/khieu-nai-luong/anh/${a.id}`} alt={a.ten} cao={72} />
                ))}
              </div>
            )}
            {mo ? (
              <>
                <OTraLoiKN kn_id={x.id} khi_gui={khi_doi} />
                <OThemAnhKN kn_id={x.id} khi_gui={khi_doi} />
              </>
            ) : (
              <div className="mo-ta" style={{ marginTop: 6 }}>
                {tra_hien_tai('pl_ticket_da_dong', { n: tra_khoa(KHOA_TT_KN[x.trang_thai]?.khoa, x.trang_thai) })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Tab "Khieu nai" ben ca nhan: lap khieu nai moi (chon ky) + theo doi & trao doi. */
export function TrangKhieuNaiToi(): ReactNode {
  const phieu = dung_nap<{ id: string; thang: string; trang_thai_ky: string }[]>('/api/toi/phieu-luong');
  const kn = dung_nap<KhieuNai[]>('/api/toi/khieu-nai-luong');
  const { tra } = dung_chuoi();
  const [chon, dat_chon] = useState(0);
  const [mo, dat_mo] = useState(false);

  if (phieu.dang_tai || kn.dang_tai) return <DangTai />;
  if (phieu.loi !== null) return <HopLoi loi={phieu.loi} />;
  const ds_phieu = phieu.du_lieu ?? [];
  const ds_kn = kn.du_lieu ?? [];
  const p = ds_phieu[Math.min(chon, Math.max(0, ds_phieu.length - 1))];

  return (
    <div className="cn-cot-gap" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="the">
        <h3 style={{ marginTop: 0 }}>{tra('pl_lap_khieu_nai')}</h3>
        {ds_phieu.length === 0 ? (
          <div className="mo-ta">{tra('pl_chua_co_phieu_kn')}</div>
        ) : (
          <>
            <label htmlFor="kn_ky">{tra('pl_chon_ky')}</label>
            <Chon gia_tri={String(chon)}
              dat_gia_tri={(ma) => dat_chon(Number(ma))}
              cac_tuy_chon={ds_phieu.map((x, i): TuyChonChon => ({
                ma: String(i), nhan: thang_viet(x.thang),
              }))}
              nhan={tra('pl_chon_ky')} />
            <div className="hang-nut" style={{ marginTop: 8 }}>
              <button className="nut-lanh" onClick={() => dat_mo(true)}>{tra('pl_lap_kn_ky_nay')}</button>
            </div>
          </>
        )}
      </div>

      {ds_kn.length === 0 ? (
        <Trong tieu_de={tra('pl_chua_co_kn')}
          mo_ta={tra('pl_kn_mo_ta')} />
      ) : (
        <DanhSachKhieuNai ds={ds_kn} khi_doi={() => kn.nap_lai()} />
      )}

      {mo && p !== undefined && (
        <HopThoaiKhieuNaiLuong
          phieu_id={p.id} thang={thang_viet(p.thang)}
          khi_dong={() => dat_mo(false)}
          khi_xong={() => { dat_mo(false); kn.nap_lai(); }}
        />
      )}
    </div>
  );
}
