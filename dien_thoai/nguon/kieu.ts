// Mau va kieu dung chung. Ho tro giao dien sang/toi theo cai dat cua may.
import { StyleSheet, useColorScheme } from 'react-native';

export interface BangMau {
  chinh: string;
  chinh_nhat: string;
  nen: string;
  nen_the: string;
  nen_mo: string;
  vien: string;
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

const SANG: BangMau = {
  chinh: '#1d4ed8',
  chinh_nhat: '#eef2ff',
  nen: '#f6f7f9',
  nen_the: '#ffffff',
  nen_mo: '#f1f3f5',
  vien: '#dfe3e8',
  chu: '#1a1d21',
  chu_nhat: '#5c6570',
  chu_mo: '#8b949e',
  tot: '#067647',
  tot_nen: '#e7f6ee',
  canh_bao: '#b45309',
  canh_bao_nen: '#fdf3e3',
  xau: '#b42318',
  xau_nen: '#fdecea',
  lanh: '#175cd3',
  lanh_nen: '#eaf1fd',
  tren_chinh: '#ffffff',
};

const TOI: BangMau = {
  chinh: '#6592f5',
  chinh_nhat: '#1c2438',
  nen: '#14171c',
  nen_the: '#1b1f26',
  nen_mo: '#22262e',
  vien: '#2e343d',
  chu: '#e7eaee',
  chu_nhat: '#a3abb6',
  chu_mo: '#7b838f',
  tot: '#4ec38a',
  tot_nen: '#14291f',
  canh_bao: '#e0a355',
  canh_bao_nen: '#2b2114',
  xau: '#f0736a',
  xau_nen: '#2d1a18',
  lanh: '#7fabf7',
  lanh_nen: '#182233',
  tren_chinh: '#0b0f14',
};

export function dung_mau(): BangMau {
  return useColorScheme() === 'dark' ? TOI : SANG;
}

/** Kieu khong phu thuoc mau — dinh nghia mot lan de khong tao lai moi lan render. */
export const kieu = StyleSheet.create({
  man: { flex: 1 },
  cuon: { padding: 16, paddingBottom: 40, gap: 12 },
  giua: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },

  the: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 10 },
  the_mong: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },

  h1: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  h2: { fontSize: 17, fontWeight: '600' },
  h3: { fontSize: 15, fontWeight: '600' },
  chu: { fontSize: 15 },
  chu_nho: { fontSize: 13 },
  chu_bo: { fontSize: 12 },
  so_lon: { fontSize: 34, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  so: { fontVariant: ['tabular-nums'] },

  hang: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hang_deu: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cot: { gap: 10 },
  nhieu: { flex: 1 },

  nut: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
  },
  nut_nho: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  nut_chu: { fontSize: 15, fontWeight: '600' },

  nhap: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 16,
  },
  nhan: { fontSize: 13, fontWeight: '600', marginBottom: 6 },

  the_nhan: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  the_nhan_chu: { fontSize: 12, fontWeight: '700' },

  hop: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 4 },

  dong_bang: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    gap: 10,
  },

  trong: { alignItems: 'center', padding: 28, gap: 4 },
});
