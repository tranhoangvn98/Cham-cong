// Tu dien tieng TRUNG (Gian the, thuong mai chuyen nghiep) cho cac chuoi do MAY CHU sinh ra.
// Bat buoc dung dung tu trong bang thuat ngu (tai_lieu/SONG-NGU-TRUNG.md) — khong dich may.
// `satisfies` lam TypeScript bat luon khi quen mot khoa hoac them khoa lech.
import type { CHUOI_VI } from './vi.ts';

export const CHUOI_ZH = {
  ngon_ngu_da_doi: '语言已切换。',
  ngon_ngu_khong_hop_le: '语言无效。',
  ngon_ngu_tieng_viet: '越南语',
  ngon_ngu_tieng_trung: '中文',

  // ================================ 通知铃状态标签
  tt_cho_duyet: '待审批',
  tt_cho_duyet_2: '待二级审批',
  tt_da_duyet: '已批准',
  tt_tu_choi: '已拒绝',
  tt_da_huy: '已取消',
  tt_moi: '待处理',
  tt_dang_xem: '处理中',
  tt_chap_nhan: '已接受',
  tt_da_nhac: '已提醒',
  tt_da_ap_dung: '已执行',
  tt_bac_bo: '已驳回',
  tt_mien: '已免除',
  tt_da_xac_nhan: '已确认',
  tt_da_xu_ly: '已处理',
  tt_cho_giai_trinh: '待说明',
  tt_dang_lam: '进行中',
  tt_hoan_thanh: '已完成',
  tt_khong_hoan_thanh: '未完成',
  tt_huy: '已取消',
  tt_da_dong: '已办结',
  tt_da_tiep_nhan: '已受理',

  // ================================ 助手
  tl_chua_co_quy_trinh: '您当前没有进行中的离职流程。',
} as const satisfies Record<keyof typeof CHUOI_VI, string>;
