// Tu dien tieng TRUNG (Gian the, thuong mai chuyen nghiep) cho cac chuoi do MAY CHU sinh ra.
// Bat buoc dung dung tu trong bang thuat ngu (tai_lieu/SONG-NGU-TRUNG.md) — khong dich may.
// `satisfies` lam TypeScript bat luon khi quen mot khoa hoac them khoa lech.
import type { CHUOI_VI } from './vi.ts';

export const CHUOI_ZH = {
  ngon_ngu_da_doi: '语言已切换。',
  ngon_ngu_khong_hop_le: '语言无效。',
  ngon_ngu_tieng_viet: '越南语',
  ngon_ngu_tieng_trung: '中文',
} as const satisfies Record<keyof typeof CHUOI_VI, string>;
