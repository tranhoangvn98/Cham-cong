// Luat doi chieu tep nhan su cua HCNS voi bang `nhan_vien` — HAM THUAN, khong cham CSDL.
//
// Tach khoi `nap_ho_so_csdl.ts` de kiem duoc bang bai kiem thuan. Cung ly do va cung cach
// chia nhu `dinh_danh/tra_pin.ts` va `dinh_danh/lich_pin_csdl.ts`: nhap mot `ket_noi.ts` vao
// day la keo theo `cau_hinh.ts`, va bai kiem se doi ca JWT_SECRET lan DATABASE_URL chi de
// kiem mot phep so ten.
//
// PHAM VI CO Y HEP. Ba thu KHONG lam o day, va deu vi cung mot ly do — chung can mot quyet dinh
// cua nguoi, khong suy ra duoc tu tep:
//
//   * KHONG tao ho so moi. Tep khong co cot "Ma nhan vien" (trong toan bo), ma `ma_nv` la khoa
//     nhan su dung tren phieu luong. Nguoi chua co trong he thong duoc LIET KE ra de nhan su cap
//     ma, roi nap sau.
//   * KHONG doi phong ban. Tep ghi viet tat (KD, KT, XNK...) con he thong dang dung ten day du
//     ("Phong kinh doanh"...). Nap thang la sinh ra mot bo phong ban thu hai song song.
//   * KHONG tao hop dong lao dong. Cot "Thoi han HD" va "Ngay het han" trong toan bo, va nhieu
//     dong ghi chu "Chua ky HD". Sinh ban ghi hop dong tu do la bia ra giay to phap ly.
import { chuan_ten, type DongNhanSu } from './doc_ho_so_xlsx.ts';

export interface HoSoHienCo {
  id: string;
  ma_nv: string;
  ho_ten: string;
  dang_hoat_dong: boolean;
  ngay_nghi_viec: string | null;
  quet_cuoi: string | null;
}

export interface CapDoiChieu {
  dong: DongNhanSu;
  ho_so: HoSoHienCo | null;
  /** Nhieu ho so cung ten — khong chon ho, de nguoi quyet. */
  nhieu_ho_so: HoSoHienCo[];
}

export interface KetQuaDoiChieu {
  cap_nhat: CapDoiChieu[];
  chua_co_ho_so: DongNhanSu[];
  trung_ten: CapDoiChieu[];
  /** Ten khac nhau nhung nghi la cung nguoi — KHONG tu cap nhat, cho nguoi xac nhan. */
  nghi_cung_nguoi: CapDoiChieu[];
  /** Da cap nhat, nhung khop nho bo dau / dao thu tu tu — in ra de nguoi soat lai. */
  khop_gan_dung: { dong: DongNhanSu; ho_so: HoSoHienCo }[];
  /** Tep noi da nghi nhung KHONG co ngay nghi; ngay lay tu lan quet cuoi. */
  se_tat: { dong: DongNhanSu; ho_so: HoSoHienCo; ngay_nghi: string | null }[];
  /** Nguoi trong he thong ma tep khong nhac den. */
  khong_co_trong_tep: HoSoHienCo[];
}

/**
 * Bo dau tieng Viet de so ten. KHONG dung de hien thi hay de ghi — chi de TIM UNG VIEN.
 *
 * "Nguyen Thuy Hang" va "Nguyen Thuy Hang" (Thuý / Thúy) la hai cach danh dau thanh deu dung
 * chinh ta, va hai nguon dang dung hai cach khac nhau cho cung mot nguoi.
 */
export function bo_dau(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

/** Tap tu cua ho ten, da bo dau — de so khong ke thu tu. */
function tap_tu(s: string): Set<string> {
  return new Set(bo_dau(chuan_ten(s)).split(' ').filter((t) => t !== ''));
}

function cung_tap(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((t) => b.has(t));
}

function la_tap_con(a: Set<string>, b: Set<string>): boolean {
  return a.size < b.size && [...a].every((t) => b.has(t));
}

/** Ghep tung dong cua tep voi ho so trong he thong theo ho ten da chuan hoa. */
export function doi_chieu(dong: DongNhanSu[], ho_so: HoSoHienCo[]): KetQuaDoiChieu {
  const theo_ten = new Map<string, HoSoHienCo[]>();
  for (const h of ho_so) {
    const k = chuan_ten(h.ho_ten).toLowerCase();
    theo_ten.set(k, [...(theo_ten.get(k) ?? []), h]);
  }

  const cap_nhat: CapDoiChieu[] = [];
  const chua_co_ho_so: DongNhanSu[] = [];
  const trung_ten: CapDoiChieu[] = [];
  const nghi_cung_nguoi: CapDoiChieu[] = [];
  const khop_gan_dung: { dong: DongNhanSu; ho_so: HoSoHienCo }[] = [];
  const se_tat: KetQuaDoiChieu['se_tat'] = [];
  const da_cham = new Set<string>();

  for (const d of dong) {
    // BA BUOC, tu chat den long. Chi khop tuyet doi la khong du: chay that tren tep cua HCNS
    // cho thay ba nguoi DA CO ho so bi xep nham vao "chua co ho so", va lam theo danh sach do
    // la lap ho so trung — dung cai benh dang phai go o PIN 4 va PIN 57.
    //
    //   1. Khop tuyet doi sau khi chuan hoa khoang trang.
    //   2. Cung TAP TU sau khi bo dau: bat "Dao Thanh Binh" ↔ "Thanh Binh Dao" (dao thu tu)
    //      va "Nguyen Thuy Hang" ↔ "Nguyen Thuy Hang" (Thuy/Thuy). Van la mot nguoi.
    //   3. Tap tu la TAP CON cua nhau: "Tran Thi Minh Khanh" ↔ "Tran Minh Khanh" (thieu chu
    //      dem). Buoc nay KHONG tu cap nhat — thieu mot chu dem cung co the la hai chi em —
    //      chi bao ra de nguoi xac nhan.
    const chuan = chuan_ten(d.ho_ten).toLowerCase();
    let ung_vien = theo_ten.get(chuan) ?? [];
    let cach_khop: 'tuyet_doi' | 'gan_dung' = 'tuyet_doi';

    if (ung_vien.length === 0) {
      const t = tap_tu(d.ho_ten);
      ung_vien = ho_so.filter((h) => cung_tap(t, tap_tu(h.ho_ten)));
      if (ung_vien.length > 0) cach_khop = 'gan_dung';
    }
    if (ung_vien.length === 0) {
      const t = tap_tu(d.ho_ten);
      const nghi = ho_so.filter((h) =>
        la_tap_con(t, tap_tu(h.ho_ten)) || la_tap_con(tap_tu(h.ho_ten), t));
      if (nghi.length > 0) { nghi_cung_nguoi.push({ dong: d, ho_so: null, nhieu_ho_so: nghi }); continue; }
      chua_co_ho_so.push(d); continue;
    }
    if (ung_vien.length > 1) { trung_ten.push({ dong: d, ho_so: null, nhieu_ho_so: ung_vien }); continue; }
    if (cach_khop === 'gan_dung') khop_gan_dung.push({ dong: d, ho_so: ung_vien[0] as HoSoHienCo });

    const h = ung_vien[0] as HoSoHienCo;
    da_cham.add(h.id);
    cap_nhat.push({ dong: d, ho_so: h, nhieu_ho_so: [] });
    // Tep khong co cot ngay nghi. Lan quet cuoi la bang chung duy nhat co — ai khong quet lan
    // nao thi de trong va bao ra, chu khong dat bua mot ngay.
    if (d.con_lam_viec === false && h.dang_hoat_dong) {
      se_tat.push({ dong: d, ho_so: h, ngay_nghi: h.ngay_nghi_viec ?? h.quet_cuoi });
    }
  }

  return {
    cap_nhat, chua_co_ho_so, trung_ten, nghi_cung_nguoi, khop_gan_dung, se_tat,
    khong_co_trong_tep: ho_so.filter((h) => !da_cham.has(h.id)),
  };
}


/**
 * Gop cac dong CHUA CO HO SO cua cung mot nguoi thanh mot.
 *
 * Mot nguoi co the nam o hai sheet — vi du nguoi lam ca VP Ha Noi lan VP Sai Gon. Xuat ra hai
 * dong la nhan su lap HAI ho so cho MOT nguoi, dung cai benh dang phai go o PIN 4 va PIN 57.
 * Gop theo ten da bo dau, giu dong dien nhieu o nhat, va ghi lai moi sheet da thay ho.
 *
 * Neu hai sheet ghi khac nhau ve phong ban / chuc danh / ngay vao thi KHONG chon ho ben nao —
 * ghi ca hai gia tri vao cot "Can kiem lai" de nhan su quyet.
 */
export function gop_nguoi_trung(dong: readonly DongNhanSu[]): {
  dong: DongNhanSu; cac_sheet: string[]; khac_nhau: string[];
}[] {
  const nhom = new Map<string, DongNhanSu[]>();
  for (const d of dong) {
    const k = bo_dau(chuan_ten(d.ho_ten));
    nhom.set(k, [...(nhom.get(k) ?? []), d]);
  }
  return [...nhom.values()].map((ds) => {
    const chinh = [...ds].sort((a, b) => so_o_da_dien(b) - so_o_da_dien(a))[0] as DongNhanSu;
    const khac_nhau: string[] = [];
    const truong: readonly [string, (d: DongNhanSu) => string | null][] = [
      ['phòng ban', (d) => d.phong_ban],
      ['chức danh', (d) => d.chuc_danh],
      ['ngày vào', (d) => d.ngay_vao],
    ];
    for (const [ten, lay] of truong) {
      const gt = [...new Set(ds.map(lay).filter((v): v is string => v !== null && v !== ''))];
      if (gt.length > 1) khac_nhau.push(`${ten}: ${gt.join(' / ')}`);
    }
    return { dong: chinh, cac_sheet: ds.map((d) => d.sheet), khac_nhau };
  });
}

/** So o da dien cua mot dong — de chon dong day du nhat lam dai dien khi gop. */
function so_o_da_dien(d: DongNhanSu): number {
  return [d.cccd, d.ngay_sinh, d.so_dien_thoai, d.email, d.dia_chi_thuong_tru,
    d.que_quan, d.phong_ban, d.chuc_danh, d.ngay_vao].filter((v) => v !== null && v !== '').length;
}
