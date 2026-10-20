// Tu dien tieng TRUNG (Gian the, thuong mai chuyen nghiep) cho cac chuoi do MAY CHU sinh ra.
// Bat buoc dung dung tu trong bang thuat ngu (tai_lieu/SONG-NGU-TRUNG.md) — khong dich may.
// `satisfies` lam TypeScript bat luon khi quen mot khoa hoac them khoa lech.
import type { CHUOI_VI } from './vi.ts';

export const CHUOI_ZH = {
  ngon_ngu_da_doi: '语言已切换。',
  ngon_ngu_khong_hop_le: '语言无效。',
  ngon_ngu_tieng_viet: '越南语',
  ngon_ngu_tieng_trung: '中文',
  khong_duoc_tu_duyet: '您不能审批本人提交的申请。',

  // ================================ ung luong tu phuc vu
  ul_tk_khong_nhan_vien: '此账号未关联员工档案，无法使用个人预支工资。',
  ul_thang_thieu: '缺少预支月份。',
  ul_thang_sai_dang: '月份格式应为 YYYY-MM（例如 2026-10）。',
  ul_so_tien_sai: '预支金额必须为大于 0 的数字。',
  ul_ngay_sai: '日期格式应为 YYYY-MM-DD。',
  ul_thang_qua_khu: '不能为已过去的月份提交预支申请。',
  ul_trung_thang: '该月份已有待审批或已审批的预支申请。',
  ul_khong_tim_thay: '找不到您的预支记录。',
  ul_chi_huy_khi_cho_duyet: '只有待审批的申请可以取消。',
  ul_thong_bao_de_nghi: '有新的预支工资申请',
  ul_thong_bao_noi_dung: '{ten} 提交了 {thang} 月的预支工资申请。',
  ul_thong_bao_duyet: '您的预支工资申请已获批',
  ul_thong_bao_duyet_noi_dung: '您 {thang} 月的预支工资申请已获批。',
  ul_thong_bao_chi: '您的预支工资已发放',
  ul_thong_bao_chi_noi_dung: '您 {thang} 月的预支工资已标记发放。',
  ul_thong_bao_huy: '您的预支工资申请已取消',
  ul_thong_bao_huy_noi_dung: '您 {thang} 月的预支工资申请已取消。',

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

  // ================================ 邮件通知（框架 + 签名）
  email_chu_de_tien_to: '考勤',
  email_thong_bao_noi_bo: '内部通知',
  email_ma_thong_bao: '通知编号',
  email_tep_dinh_kem: '完整公文见下方附件。',
  email_xac_nhan_da_doc: '请打开考勤应用确认已读。',
  email_tran_trong: '此致敬礼',
  email_phong_nhan_su: '人力资源部',
  email_cong_ty: '陈黄越南有限公司',
  email_tu_dong: '本邮件由考勤系统自动发送，请勿直接回复。',
} as const satisfies Record<keyof typeof CHUOI_VI, string>;
