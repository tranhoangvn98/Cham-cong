// Xem truoc mau email nhac bo sung ho so (chi de xem giao dien, khong gui di dau).
// Chay: node --experimental-strip-types web/_xem_email_bo_sung.mjs
import { writeFileSync } from 'node:fs';

process.env['JWT_SECRET'] ??= 'khoa_xem_truoc_du_dai_de_khong_bi_tu_choi_0001';
process.env['DATABASE_URL'] ??= 'postgres://x:y@127.0.0.1:5432/x';
process.env['DEVICE_TZ_OFFSET_HOURS'] ??= '7';

const { html_nhac_bo_sung } = await import('../may_chu/src/ho_so/bo_sung.ts');

const mau = {
  ho_ten: 'Nguyễn Thị Minh Anh',
  thieu: [
    { ma: 'cccd', ten: 'Căn cước công dân (scan 2 mặt)' },
    { ma: 'so_yeu_ly_lich', ten: 'Sơ yếu lý lịch' },
    { ma: 'kham_suc_khoe', ten: 'Giấy khám sức khỏe' },
  ],
  han_bo_sung: '2026-11-07',
  ghi_chu: 'Vui lòng nộp bản gốc hoặc bản sao công chứng cho phòng Nhân sự trước hạn.',
  lan: 2,
};

const mau_zh = {
  ...mau,
  ho_ten: '阮氏明英',
  thieu: [
    { ma: 'cccd', ten: '身份证（正反面扫描件）' },
    { ma: 'so_yeu_ly_lich', ten: '个人简历' },
    { ma: 'kham_suc_khoe', ten: '健康检查证明' },
  ],
  ghi_chu: '请在截止日期前将原件或公证复印件提交至人力资源部。',
};

writeFileSync('web/_xem_email_bo_sung_vi.html', html_nhac_bo_sung(mau, 'vi'));
writeFileSync('web/_xem_email_bo_sung_zh.html', html_nhac_bo_sung(mau_zh, 'zh'));
console.log('da ghi web/_xem_email_bo_sung_vi.html va web/_xem_email_bo_sung_zh.html');
