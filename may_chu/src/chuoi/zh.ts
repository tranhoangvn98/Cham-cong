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

  // ================================ 兼岗部门
  kn_danh_sach_sai: '兼岗部门列表无效。',
  kn_phong_khong_ton_tai: '存在不存在的兼岗部门。',

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

  // ================================ 离职流程
  tv_thong_bao_qd_tieu_de: '离职决定已发布',
  tv_thong_bao_qd_noi_dung: '您已进入离职流程 — 最后工作日为 {ngay}。请打开离职指引，在该日期前完成交接。',
  tv_thong_bao_qt_moi_tieu_de: '新的离职流程',
  tv_thong_bao_qt_moi_noi_dung: '{ten}（{ma}）— 最后工作日为 {ngay}。请进入离职页面指定交接接收人。',

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

  // ================================ yeu cau bo sung ho so
  bs_tieu_de: '档案补交通知',
  bs_email_tieu_de: '档案补交提醒 — 尚有 {so} 份必需材料未交',
  bs_chao: '{ten} 您好：',
  bs_mo_ta: '您的员工档案尚有 {so} 份必需材料未提交，请提交至人力资源部。',
  bs_danh_sach: '需补交材料',
  bs_han: '补交期限：{ngay}',
  bs_ghi_chu: '人力资源部备注',
  bs_lan: '本次为第 {n} 次提醒。',
  bs_ket: '在档案补齐之前，系统将每周继续发送提醒。',
  bs_huong_dan: '提交方式：打开考勤应用 →「个人」→「我的档案」→「文件」，在缺失材料一栏点击「上传文件」（支持 PDF、JPG、PNG、DOCX、XLSX）。',
  bs_da_huy_nguoi_nhan: '{ten} 的档案补交通知已取消。',
  bs_da_du_nguoi_nhan: '{ten} 的必需档案材料已补齐，通知已自动关闭。',

  // ================================ dong bo email nhan su
  ns_thieu_email_tieu_de: '在职员工尚无邮箱',
  ns_thieu_email_noi_dung: '共有 {so} 名在职员工尚未登记邮箱，将无法收到通知、工资单及档案提醒：{danh_sach}。请进入员工档案补充邮箱。',

  // ================================ quet nghi viec chua khoa tai khoan
  qn_tieu_de: '警告：离职员工账号尚未停用',
  qn_noi_dung: '共有 {so} 名离职员工在 ERP1 或 Microsoft 365 上的账号仍未停用：{danh_sach}。请进入员工档案重新发起账号停用。',
  qn_loi_erp1: 'ERP1 未停用',
  qn_loi_m365_mo: 'M365 仍可登录',
  qn_loi_m365_phep: 'M365 仍持有许可证',

  // ================================ bo sung ma dinh danh
  ma_bs_tieu_de: '有员工缺少系统编号',
  ma_bs_noi_dung:
    '有 {so} 名员工缺少考勤机 PIN 或微软邮箱：{danh_sach}。请进入员工档案 → 各系统编号 补全。',

  // ================================ bao PIN may cham cong cho nguoi moi
  pin_tieu_de: '您的考勤机 PIN：{pin}',
  pin_noi_dung:
    '您在考勤机上的 PIN 为 {pin}{may}。到达考勤机后请选择“登记”，输入该号码完成指纹、人脸或卡片的登记。PIN 是您的考勤身份，请勿告知他人——用该号码的每次打卡都会计入您的出勤。',
  pin_noi_dung_may: '（已下发至设备：{may}）',

  // ================================ 通知管理员：有新员工
  ns_moi_tieu_de: '有新员工：{ho_ten}',
  ns_moi_noi_dung: '{ho_ten}（{ma_nv}）已加入系统。请打开“员工”页面查看档案——无需审批。',

  // ================================ Microsoft 365：新账号获得许可证
  m365_moi_tieu_de: 'Microsoft 365 有新账号获得许可证',
  m365_moi_noi_dung: '{danh_sach} 刚获得 Microsoft 365 许可证——请打开“员工”页面为其添加档案。',

  // ================================ 向创建人发送 Microsoft 初始账号
  tk365_tieu_de: '{ho_ten} 的 Microsoft 365 账号：{upn}',
  tk365_noi_dung:
    '登录名：{upn} — 初始密码：{mat_khau}。请转交给新员工，并提醒其首次登录时必须修改密码（Microsoft 强制）。请勿通过公开渠道传播密码。',
} as const satisfies Record<keyof typeof CHUOI_VI, string>;
