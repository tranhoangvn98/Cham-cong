/* Sinh tu thiet_ke/token.json boi thiet_ke/sinh_token.mjs — DUNG SUA TAY.
   Sua token.json roi chay: npm run sinh_token
   Bang mau, ho chu, bo goc cho app dien thoai. Theme: Be Vietnam Pro + Compose Boltuix. */

export interface BangMau {
  chinh: string;
  chinh_nhat: string;
  chinh_dam: string;
  nhan: string;
  nhan_nen: string;
  nen: string;
  nen_the: string;
  nen_mo: string;
  vien: string;
  vien_dam: string;
  chu: string;
  chu_nhat: string;
  chu_mo: string;
  tot: string;
  tot_nen: string;
  canh_bao: string;
  canh_bao_nen: string;
  xau: string;
  xau_nen: string;
  lanh: string;
  lanh_nen: string;
  tren_chinh: string;
}

export const SANG: BangMau = {
  chinh: '#4285F4',
  chinh_nhat: '#E8F0FE',
  chinh_dam: '#1967D2',
  nhan: '#C1273A',
  nhan_nen: '#FDEAEC',
  nen: '#F4F5F7',
  nen_the: '#FFFFFF',
  nen_mo: '#EDEEF1',
  vien: '#EAEAEA',
  vien_dam: '#C8CBD0',
  chu: '#101820',
  chu_nhat: '#6B7076',
  chu_mo: '#6E737A',
  tot: '#1A7F37',
  tot_nen: '#E6F6EC',
  canh_bao: '#B45309',
  canh_bao_nen: '#FDF3E3',
  xau: '#C5221F',
  xau_nen: '#FDECEA',
  lanh: '#0C447C',
  lanh_nen: '#E8F0FE',
  tren_chinh: '#FFFFFF',
};

export const TOI: BangMau = {
  chinh: '#8AB4F8',
  chinh_nhat: '#1B2740',
  chinh_dam: '#AFC9FA',
  nhan: '#FF8A95',
  nhan_nen: '#33191D',
  nen: '#14171C',
  nen_the: '#1B1F26',
  nen_mo: '#22262E',
  vien: '#2E343D',
  vien_dam: '#3D444F',
  chu: '#E7EAEE',
  chu_nhat: '#A3ABB6',
  chu_mo: '#98A0AB',
  tot: '#30D158',
  tot_nen: '#10291A',
  canh_bao: '#FF9F0A',
  canh_bao_nen: '#2B2114',
  xau: '#FF6259',
  xau_nen: '#2D1A18',
  lanh: '#5EA9FF',
  lanh_nen: '#16243A',
  tren_chinh: '#0B0F14',
};

/**
 * Ten ho chu da dang ky trong nguon/font.ts.
 *
 * Chon do dam bang fontFamily, KHONG bang fontWeight: React Native tren Android
 * khong suy ra do dam tu mot ho font, dat fontWeight se ra chu thuong.
 */
export const HO_CHU = {
  thuong: 'BeVietnamPro-Regular',
  vua: 'BeVietnamPro-Medium',
  dam: 'BeVietnamPro-SemiBold',
  rat_dam: 'BeVietnamPro-Bold',
} as const;

export const BO_GOC = {
  nho: 8,
  vua: 12,
  lon: 16,
  tron: 999,
} as const;

export const KHOANG = {
  rat_nho: 4,
  nho: 8,
  vua: 12,
  lon: 16,
  rat_lon: 24,
} as const;

/** Trang thai nghiep vu -> khoa mau trong BangMau. Dung chung voi web. */
export const Y_NGHIA_MAU: Record<string, keyof BangMau> = {
  du_cong: 'tot',
  di_muon: 'canh_bao',
  cho_duyet: 'canh_bao',
  vang: 'xau',
  tu_choi: 'xau',
  nghi_phep: 'lanh',
  ot: 'lanh',
  ngay_le: 'canh_bao',
  nghi_tuan: 'chu_mo',
};
