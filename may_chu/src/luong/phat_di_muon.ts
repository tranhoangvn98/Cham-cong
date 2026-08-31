// Phat di muon theo chinh sach cong ty (bat/tat trong tham so luong).
//
// Ham THUAN, khong CSDL — cung ly do voi tinh_luong.ts / khoan.ts: tinh sai la mat tien that,
// nen tach ra de kiem duoc bang bang so.
//
// Quy tac (ban giam doc chot):
//   - Gio vao chuan 08:00. Vao trong [moc_50k, moc_nua_ngay) (08:10–08:29) -> phat muc_50k/lan.
//   - Vao tu moc_nua_ngay tro di (>= 08:30) -> tru NUA ngay luong cung/lan.
//   - Moi nguoi duoc mien `mien_moi_thang` lan/thang NEU co don di muon gui truoc han (07:30)
//     va vao <= moc_nua_ngay (08:30). Vi tang 50k la [08:10, 08:30) nen dieu kien "<= 08:30"
//     luon dung cho tang nay; tang nua ngay (>= 08:30) KHONG bao gio duoc mien.

/** Mot ngay di muon da quy ve gio dia phuong (phut tính từ 00:00) + co don hop le hay khong. */
export interface NgayDiMuon {
  /** Gio vao trong ngay, tinh bang phut tu 00:00 theo gio may cham cong. */
  phut_trong_ngay: number;
  /** Co don di muon DA DUYET, gui truoc han cho ngay do. */
  co_don_truoc_han: boolean;
}

export interface CauHinhDiMuon {
  bat: boolean;
  /** Moc bat dau phat 50k, phut tu 00:00 (08:10 -> 490). */
  moc_50k_phut: number;
  /** Moc bat dau tru nua ngay, phut tu 00:00 (08:30 -> 510). */
  moc_nua_ngay_phut: number;
  /** So tien phat moi lan o tang 50k. */
  muc_50k: number;
  /** So lan duoc mien moi thang (chi ap cho tang 50k, can co don). */
  mien_moi_thang: number;
}

export interface KetQuaDiMuon {
  /** Tong so lan roi vao tang 50k (truoc khi mien). */
  so_lan_50k: number;
  /** So lan tang 50k THUC BI PHAT (da tru phan duoc mien). */
  so_lan_50k_phat: number;
  /** So lan tang nua ngay (khong bao gio duoc mien). */
  so_lan_nua_ngay: number;
  /** So lan da duoc mien. */
  so_lan_mien: number;
  /** Tien phat tang 50k = so_lan_50k_phat * muc_50k. */
  tien_50k: number;
}

const RONG: KetQuaDiMuon = {
  so_lan_50k: 0, so_lan_50k_phat: 0, so_lan_nua_ngay: 0, so_lan_mien: 0, tien_50k: 0,
};

/** Tinh phat di muon cho MOT nguoi trong MOT thang. */
export function tinh_phat_di_muon(ngay: readonly NgayDiMuon[], ch: CauHinhDiMuon): KetQuaDiMuon {
  if (!ch.bat) return { ...RONG };

  let so_50k = 0;
  let so_nua = 0;
  let so_50k_co_don = 0;

  for (const d of ngay) {
    if (d.phut_trong_ngay >= ch.moc_nua_ngay_phut) {
      so_nua++;
    } else if (d.phut_trong_ngay >= ch.moc_50k_phut) {
      so_50k++;
      if (d.co_don_truoc_han) so_50k_co_don++;
    }
  }

  const mien = Math.min(so_50k_co_don, Math.max(0, ch.mien_moi_thang));
  const so_lan_50k_phat = so_50k - mien;

  return {
    so_lan_50k: so_50k,
    so_lan_50k_phat,
    so_lan_nua_ngay: so_nua,
    so_lan_mien: mien,
    tien_50k: so_lan_50k_phat * ch.muc_50k,
  };
}

/** Doi chuoi gio PG 'HH:MM[:SS]' sang so phut tu 00:00. Sai dinh dang -> 0. */
export function gio_sang_phut(gio: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(gio);
  if (m === null) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}
