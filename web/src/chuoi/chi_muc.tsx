// Cung cap ngon ngu cho toan bo giao dien WEB (song ngu Viet - Trung, xem
// tai_lieu/SONG-NGU-TRUNG.md). Dung `dung_chuoi()` trong moi component thay vi hardcode chuoi.
//
// Thu tu uu tien khi khoi dong:
//   1. `ngon_ngu` trong phien dang nhap (may chu luu theo nguoi dung) — da dang nhap.
//   2. localStorage (nguoi dung chua dang nhap van chon duoc ngon ngu o trang dang nhap).
//   3. 'vi'.
//
// Khi doi ngon ngu: luu localStorage ngay (cho trang dang nhap), va neu da dang nhap thi
// PATCH /api/toi/ngon-ngu de moi thiet bi dong bo. `App` dat `key` theo nguoi dung nen sau
// khi dang nhap Provider duoc tao lai va doc dung ngon ngu tu phien.
import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';
import { dat_ngon_ngu as dat_ngon_ngu_may_chu, nguoi_dung_hien_tai } from '../api.ts';
import { chuan_ngon_ngu, tra_chuoi, type ChuoiKhoa, type NgonNgu } from './chi_muc.ts';

export type { ChuoiKhoa, NgonNgu };

const KHOA_LUU = 'cham_cong_ngon_ngu';

function doc_luu(): NgonNgu {
  try {
    return chuan_ngon_ngu(localStorage.getItem(KHOA_LUU));
  } catch {
    return 'vi';
  }
}

interface GiaTriChuoi {
  ngon_ngu: NgonNgu;
  dat: (moi: NgonNgu) => void;
  tra: (khoa: ChuoiKhoa, tham_so?: Record<string, string | number>) => string;
}

const NguCanhChuoi = createContext<GiaTriChuoi | null>(null);

export function CungCapChuoi({ children }: { children: ReactNode }): ReactNode {
  const [ngon_ngu, dat_nn] = useState<NgonNgu>(() => {
    const tu_phien = nguoi_dung_hien_tai()?.ngon_ngu;
    return la_vi_hoac_zh(tu_phien) ? tu_phien : doc_luu();
  });

  const dat = useCallback((moi: NgonNgu) => {
    dat_nn(moi);
    try {
      localStorage.setItem(KHOA_LUU, moi);
    } catch {
      // Trinh duyet chan localStorage thi chi ap dung trong phien nay.
    }
    if (nguoi_dung_hien_tai() !== null) void dat_ngon_ngu_may_chu(moi).catch(() => {});
  }, []);

  const tra = useCallback(
    (khoa: ChuoiKhoa, tham_so?: Record<string, string | number>) => tra_chuoi(ngon_ngu, khoa, tham_so),
    [ngon_ngu],
  );

  const gia = useMemo(() => ({ ngon_ngu, dat, tra }), [ngon_ngu, dat, tra]);

  return <NguCanhChuoi.Provider value={gia}>{children}</NguCanhChuoi.Provider>;
}

function la_vi_hoac_zh(x: unknown): x is NgonNgu {
  return x === 'vi' || x === 'zh';
}

/** Hook doc chuoi song ngu — bat buoc nam trong <CungCapChuoi>. */
export function dung_chuoi(): GiaTriChuoi {
  const c = useContext(NguCanhChuoi);
  if (c === null) throw new Error('dung_chuoi(): thieu <CungCapChuoi> o phia tren');
  return c;
}

/**
 * Ten nhom menu -> khoa chuoi song ngu. Giu `nhom` dang chu viet khong dau trong MENU de
 * gioi thieu nhanh; hien thi luon qua day (ngon ngu cua nguoi dung quyet dinh chu).
 */
export const KHOA_NHOM: Record<string, ChuoiKhoa> = {
  'Chấm công': 'nhom_cham_cong',
  'Lương': 'nhom_luong',
  'Nhân sự': 'nhom_nhan_su',
  'Công việc & tổ chức': 'nhom_cong_viec_to_chuc',
  'Truyền thông nội bộ': 'nhom_truyen_thong_noi_bo',
  'Hệ thống': 'nhom_he_thong',
  'Nhân sự & lương': 'nhom_nhan_su_luong',
  'Tài khoản & bảo mật': 'nhom_tai_khoan_bao_mat',
  'Tích hợp & dữ liệu': 'nhom_tich_hop_du_lieu',
};

/** Ma vai tro -> khoa chuoi song ngu (thanh ben). Vai tro la thi giu nguyen ma. */
export const KHOA_VAI_TRO: Record<string, ChuoiKhoa> = {
  admin: 'vai_tro_admin',
  nhan_su: 'vai_tro_nhan_su',
  truong_phong: 'vai_tro_truong_phong',
  truong_phong_nhan_su: 'vai_tro_truong_phong_nhan_su',
  nhan_vien: 'vai_tro_nhan_vien',
  cho_duyet: 'vai_tro_cho_duyet',
  tbks: 'vai_tro_tbks',
};
