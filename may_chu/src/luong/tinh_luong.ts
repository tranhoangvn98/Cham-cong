// Bo tinh luong: tu so ngay cong -> thu nhap -> bao hiem -> thue TNCN -> thuc linh.
//
// Tach thanh ham THUAN (khong CSDL, khong Fastify) vi day la cho sai thi mat tien that
// cua nguoi that. Moi buoc kiem duoc rieng bang so cu the.
//
// KHONG hang so phap ly nao trong tep nay. Ty le trich, tran dong, bac thue, giam tru
// gia canh deu do ben goi truyen vao tu bang `tham_so_luong` — luat doi thi sua du lieu,
// khong sua ma nguon.

/** Tham so phap ly co hieu luc cho ky luong dang tinh. */
export interface ThamSoLuong {
  luong_co_so: number;
  luong_toi_thieu_vung: number;
  ty_le_bhxh_nld: number;
  ty_le_bhyt_nld: number;
  ty_le_bhtn_nld: number;
  ty_le_bhxh_nsdld: number;
  ty_le_bhyt_nsdld: number;
  ty_le_bhtn_nsdld: number;
  giam_tru_ban_than: number;
  giam_tru_phu_thuoc: number;
  bac_thue: BacThue[];
}

export interface BacThue {
  bac: number;
  tu_muc: number;
  /** null = bac cuoi, khong co tran. */
  den_muc: number | null;
  thue_suat: number;
}

export interface DauVaoPhieu {
  luong_co_ban: number;
  phu_cap: number;
  so_ngay_cong_chuan: number;
  so_ngay_cong_thuc: number;
  phut_ot: number;
  he_so_ot: number;
  thuong: number;
  phu_cap_khac: number;
  so_nguoi_phu_thuoc: number;
  tru_khac: number;
}

export interface KetQuaPhieu {
  luong_theo_cong: number;
  tien_ot: number;
  tong_thu_nhap: number;
  muc_dong_bh: number;
  bhxh_nld: number;
  bhyt_nld: number;
  bhtn_nld: number;
  bhxh_nsdld: number;
  bhyt_nsdld: number;
  bhtn_nsdld: number;
  giam_tru_tong: number;
  thu_nhap_tinh_thue: number;
  thue_tncn: number;
  tong_tru: number;
  thuc_linh: number;
}

/**
 * Lam tron ve DONG. Tien Viet khong co don vi nho hon dong, va giu so le thap phan se
 * lam tong cong khong khop voi tung dong khi ke toan cong tay.
 */
function dong(n: number): number {
  return Math.round(n);
}

/**
 * Tran dong BHXH/BHYT: 20 lan muc luong co so.
 * Luat BHXH 2014 Dieu 89 khoan 3; Luat BHYT Dieu 14 khoan 5.
 */
export function tran_bhxh_bhyt(ts: ThamSoLuong): number {
  return ts.luong_co_so * 20;
}

/**
 * Tran dong BHTN: 20 lan muc luong toi thieu VUNG — khac tran BHXH.
 * Luat Viec lam 2013 Dieu 58 khoan 2. Dung nham hai tran nay la sai tien voi nguoi luong cao.
 */
export function tran_bhtn(ts: ThamSoLuong): number {
  return ts.luong_toi_thieu_vung * 20;
}

/**
 * Thue TNCN theo bieu LUY TIEN TUNG PHAN: moi bac chi danh vao phan thu nhap NAM TRONG
 * bac do, khong phai toan bo thu nhap. Tinh nham thanh "vuot bac thi ca cuc chiu thue
 * suat moi" la con so sai rat lon.
 */
export function thue_luy_tien(thu_nhap_tinh_thue: number, bac: BacThue[]): number {
  if (thu_nhap_tinh_thue <= 0) return 0;
  const sap_xep = [...bac].sort((a, b) => a.tu_muc - b.tu_muc);

  let thue = 0;
  for (const b of sap_xep) {
    if (thu_nhap_tinh_thue <= b.tu_muc) break;
    const tran = b.den_muc ?? Infinity;
    const phan_trong_bac = Math.min(thu_nhap_tinh_thue, tran) - b.tu_muc;
    thue += phan_trong_bac * (b.thue_suat / 100);
  }
  return dong(thue);
}

/**
 * Tinh mot phieu luong.
 *
 * Muc dong bao hiem lay theo luong_co_ban + phu_cap CO DINH theo hop dong, KHONG theo
 * luong thuc nhan trong thang: nghi nua thang thi van dong bao hiem tren muc hop dong.
 * (Luat BHXH 2014 Dieu 89: tien luong thang dong BHXH la tien luong ghi trong hop dong.)
 */
export function tinh_phieu_luong(d: DauVaoPhieu, ts: ThamSoLuong): KetQuaPhieu {
  // ------------------------------------------------------------ thu nhap
  // Chia theo ngay cong chuan cua thang, khong phai 26 ngay co dinh: thang 28 ngay va
  // thang 31 ngay co so ngay lam viec khac nhau.
  const luong_theo_cong = d.so_ngay_cong_chuan <= 0
    ? 0
    : dong((d.luong_co_ban + d.phu_cap) * (d.so_ngay_cong_thuc / d.so_ngay_cong_chuan));

  // Don gia gio OT lay tren luong co ban theo gio cua thang chuan.
  const gio_chuan_thang = d.so_ngay_cong_chuan * 8;
  const don_gia_gio = gio_chuan_thang <= 0 ? 0 : (d.luong_co_ban + d.phu_cap) / gio_chuan_thang;
  const tien_ot = dong(don_gia_gio * (d.phut_ot / 60) * d.he_so_ot);

  const tong_thu_nhap = luong_theo_cong + tien_ot + d.thuong + d.phu_cap_khac;

  // ------------------------------------------------------------ bao hiem
  const muc_hop_dong = d.luong_co_ban + d.phu_cap;
  const muc_bhxh_bhyt = Math.min(muc_hop_dong, tran_bhxh_bhyt(ts));
  const muc_bhtn = Math.min(muc_hop_dong, tran_bhtn(ts));

  const bhxh_nld = dong(muc_bhxh_bhyt * (ts.ty_le_bhxh_nld / 100));
  const bhyt_nld = dong(muc_bhxh_bhyt * (ts.ty_le_bhyt_nld / 100));
  const bhtn_nld = dong(muc_bhtn * (ts.ty_le_bhtn_nld / 100));

  const bhxh_nsdld = dong(muc_bhxh_bhyt * (ts.ty_le_bhxh_nsdld / 100));
  const bhyt_nsdld = dong(muc_bhxh_bhyt * (ts.ty_le_bhyt_nsdld / 100));
  const bhtn_nsdld = dong(muc_bhtn * (ts.ty_le_bhtn_nsdld / 100));

  const bao_hiem_nld = bhxh_nld + bhyt_nld + bhtn_nld;

  // ------------------------------------------------------------ thue TNCN
  // Bao hiem bat buoc duoc tru TRUOC khi tinh thue (Luat Thue TNCN Dieu 21).
  const giam_tru_tong = ts.giam_tru_ban_than
    + ts.giam_tru_phu_thuoc * d.so_nguoi_phu_thuoc
    + bao_hiem_nld;

  const thu_nhap_tinh_thue = Math.max(0, tong_thu_nhap - giam_tru_tong);
  const thue_tncn = thue_luy_tien(thu_nhap_tinh_thue, ts.bac_thue);

  // ------------------------------------------------------------ thuc linh
  const tong_tru = bao_hiem_nld + thue_tncn + d.tru_khac;

  return {
    luong_theo_cong,
    tien_ot,
    tong_thu_nhap,
    muc_dong_bh: muc_bhxh_bhyt,
    bhxh_nld,
    bhyt_nld,
    bhtn_nld,
    bhxh_nsdld,
    bhyt_nsdld,
    bhtn_nsdld,
    giam_tru_tong,
    thu_nhap_tinh_thue,
    thue_tncn,
    tong_tru,
    thuc_linh: tong_thu_nhap - tong_tru,
  };
}
