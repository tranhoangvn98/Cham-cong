// Sinh ban xem truoc email THONG BAO moi (chay: node --experimental-strip-types web/_xem_email_demo.mjs)
// Dung CHINH ham html_email_thong_bao cua may_chu de sinh — email xem duoc la email that se gui.
process.env['JWT_SECRET'] ??= 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['DATABASE_URL'] ??= 'postgres://khong_dung@localhost:5432/khong_dung';
process.env['DEVICE_TZ_OFFSET_HOURS'] ??= '7';
process.env['NODE_ENV'] ??= 'test';

import { writeFile } from 'node:fs/promises';

const { html_email_thong_bao, tieu_de_email_thong_bao } =
  await import('../may_chu/src/su_kien/gui_email_thong_bao.ts');

const mau = {
  id: 'demo',
  ma: 'TB-000045',
  tieu_de: 'Về việc điều chỉnh giờ làm việc từ ngày 01/11/2026',
  noi_dung: [
    'Kính gửi: Toàn thể cán bộ, nhân viên Công ty TNHH Trần Hoàng Việt Nam.',
    'Căn cứ nhu cầu sản xuất kinh doanh, Công ty thông báo điều chỉnh giờ làm việc kể từ ngày 01/11/2026: buổi sáng từ 08:00 đến 12:00, buổi chiều từ 13:30 đến 17:30 (nghỉ trưa 90 phút).',
    'Đề nghị các phòng ban phổ biến đến từng nhân viên và chấp hành nghiêm túc. Mọi thắc mắc xin liên hệ Phòng Nhân sự.',
  ].join('\n\n'),
  pham_vi: 'toan_cong_ty',
  phong_ban_id: null,
  nhan_vien_id: null,
  ten_luu: 'tb-000045.docx',
  mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  da_go: false,
  da_gui_email: false,
};

const thoat_html = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Ban tieng Trung do AI dich (luu cot tieu_de_zh / noi_dung_zh) — email TQ dung ban nay.
const mau_zh = {
  ...mau,
  tieu_de_zh: '关于自 2026 年 11 月 1 日起调整工作时间的通知',
  noi_dung_zh: [
    '致：陈黄越南有限公司全体干部和员工。',
    '根据生产经营需要，公司通知自 2026 年 11 月 1 日起调整工作时间：上午 08:00 至 12:00，下午 13:30 至 17:30（午休 90 分钟）。',
    '请各部门传达到每一位员工并严格执行。如有疑问，请联系人力资源部。',
  ].join('\n\n'),
};

const email_vi = html_email_thong_bao(mau, 'vi');
const email_zh = html_email_thong_bao(mau_zh, 'zh');
const chu_de_vi = tieu_de_email_thong_bao(mau, 'vi');
const chu_de_zh = tieu_de_email_thong_bao(mau_zh, 'zh');

await writeFile(new URL('./_xem_email_thong_bao_vi.html', import.meta.url), email_vi, 'utf8');
await writeFile(new URL('./_xem_email_thong_bao_zh.html', import.meta.url), email_zh, 'utf8');

const khung = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Xem trước email thông báo</title></head>
<body style="margin:0;padding:0;background:#111827;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:1100px;margin:0 auto;padding:28px 16px 48px">
  <div style="color:#fff;margin-bottom:6px;font-size:22px;font-weight:700">Xem trước email thông báo mới</div>
  <div style="color:#9CA3AF;font-size:13px;margin-bottom:24px">
    Sinh bằng đúng hàm <b>html_email_thong_bao</b> của máy chủ — đây là email thật sẽ gửi đi.
    Nội dung tiếng Trung do AI dịch (bản soạn AI sinh cả hai ngôn ngữ).
  </div>
  <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:stretch">
    <div style="flex:1 1 480px;min-width:320px">
      <div style="background:#1F2937;color:#D1D5DB;padding:10px 14px;border-radius:8px 8px 0 0;font-size:13px">
        <b style="color:#fff">Người nhận tiếng Việt</b> — chủ đề:
        <span style="color:#93C5FD">${thoat_html(chu_de_vi)}</span>
      </div>
      <iframe src="./_xem_email_thong_bao_vi.html" title="Email tiếng Việt"
        style="width:100%;height:720px;border:0;border-radius:0 0 8px 8px;background:#F3F4F6"></iframe>
    </div>
    <div style="flex:1 1 480px;min-width:320px">
      <div style="background:#1F2937;color:#D1D5DB;padding:10px 14px;border-radius:8px 8px 0 0;font-size:13px">
        <b style="color:#fff">Người nhận tiếng Trung</b> — 主题:
        <span style="color:#93C5FD">${thoat_html(chu_de_zh)}</span>
      </div>
      <iframe src="./_xem_email_thong_bao_zh.html" title="Email tiếng Trung"
        style="width:100%;height:720px;border:0;border-radius:0 0 8px 8px;background:#F3F4F6"></iframe>
    </div>
  </div>
</div>
</body></html>`;

await writeFile(new URL('./_xem_email_thong_bao.html', import.meta.url), khung, 'utf8');
console.log('Da sinh: web/_xem_email_thong_bao.html (+ _vi, _zh)');
