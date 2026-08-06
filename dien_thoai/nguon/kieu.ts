// Kieu dung chung cho app. Mau/font/bo goc lay tu design token (thiet_ke/token.json),
// khong hard-code o day — sua mau thi sua token roi chay `npm run sinh_token` o goc.
import { StyleSheet, useColorScheme } from 'react-native';
import { BO_GOC, HO_CHU, KHOANG, SANG, TOI, Y_NGHIA_MAU } from './token_thiet_ke';
import type { BangMau } from './token_thiet_ke';

export type { BangMau };
export { HO_CHU, BO_GOC, KHOANG, Y_NGHIA_MAU };

export function dung_mau(): BangMau {
  return useColorScheme() === 'dark' ? TOI : SANG;
}

/**
 * Kieu khong phu thuoc mau — dinh nghia mot lan de khong tao lai moi lan render.
 *
 * Do dam chon bang `fontFamily` chu khong phai `fontWeight`: Android khong tu tao do dam
 * tu mot ho font, dat fontWeight se ra chu thuong. Xem nguon/font.ts.
 */
export const kieu = StyleSheet.create({
  man: { flex: 1 },
  cuon: { padding: KHOANG.lon, paddingBottom: 40, gap: KHOANG.vua },
  giua: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: KHOANG.vua },

  the: { borderRadius: BO_GOC.vua, borderWidth: 1, padding: KHOANG.lon, gap: 10 },
  the_mong: { borderRadius: BO_GOC.vua, borderWidth: 1, overflow: 'hidden' },

  h1: { fontSize: 24, fontFamily: HO_CHU.rat_dam, letterSpacing: -0.3 },
  h2: { fontSize: 17, fontFamily: HO_CHU.dam },
  h3: { fontSize: 15, fontFamily: HO_CHU.dam },
  chu: { fontSize: 15, fontFamily: HO_CHU.thuong },
  chu_nho: { fontSize: 13, fontFamily: HO_CHU.thuong },
  chu_bo: { fontSize: 12, fontFamily: HO_CHU.thuong },
  so_lon: {
    fontSize: 34,
    fontFamily: HO_CHU.rat_dam,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  so: { fontVariant: ['tabular-nums'] },
  dam: { fontFamily: HO_CHU.dam },
  rat_dam: { fontFamily: HO_CHU.rat_dam },

  hang: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hang_deu: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cot: { gap: 10 },
  nhieu: { flex: 1 },

  nut: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: BO_GOC.vua,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: KHOANG.nho,
  },
  nut_nho: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: BO_GOC.nho },
  nut_chu: { fontSize: 15, fontFamily: HO_CHU.dam },

  nhap: {
    borderWidth: 1,
    borderRadius: BO_GOC.vua,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: HO_CHU.thuong,
  },
  nhan: { fontSize: 13, fontFamily: HO_CHU.dam, marginBottom: 6 },

  the_nhan: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: BO_GOC.tron,
    alignSelf: 'flex-start',
  },
  the_nhan_chu: { fontSize: 12, fontFamily: HO_CHU.rat_dam },

  hop: { padding: KHOANG.vua, borderRadius: BO_GOC.vua, borderWidth: 1, gap: KHOANG.rat_nho },

  dong_bang: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    gap: 10,
  },

  trong: { alignItems: 'center', padding: 28, gap: KHOANG.rat_nho },

  // ---------------------------------------------------------------- dai tuan (Man 1)
  dai_tuan: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  o_tuan: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: KHOANG.nho,
    borderRadius: BO_GOC.nho,
    borderWidth: 1,
    gap: 3,
  },

  // ---------------------------------------------------------------- thanh tien do
  thanh_ngoai: { height: 8, borderRadius: BO_GOC.tron, overflow: 'hidden' },
  thanh_trong: { height: '100%', borderRadius: BO_GOC.tron },

  // ---------------------------------------------------------------- luoi chi so
  luoi_chi_so: { flexDirection: 'row', flexWrap: 'wrap', gap: KHOANG.nho },
  o_chi_so: {
    flexGrow: 1,
    flexBasis: '47%',
    borderRadius: BO_GOC.vua,
    borderWidth: 1,
    padding: KHOANG.vua,
    gap: 2,
  },

  // ---------------------------------------------------------------- lich thang (Man 2)
  // Khong dung `gap` o luoi 7 cot: 7 x 14.28% + gap se tran dong. Khoang cach lam bang
  // padding cua tung o, phan mau nam o lop trong.
  luoi_lich: { flexDirection: 'row', flexWrap: 'wrap' },
  o_lich: { width: '14.28%', aspectRatio: 1, padding: 2 },
  o_lich_trong: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BO_GOC.nho,
  },
  dau_thu: { width: '14.28%', alignItems: 'center', paddingBottom: KHOANG.rat_nho },
});
