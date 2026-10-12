// Kiem thu gui email thong bao: dung payload sendMail (ke ca dinh kem) va HTML email.
// KHONG can CSDL / mang — chi kiem ham thuan.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { dung_than_mail } = await import('../src/su_kien/gui_email.ts');
const { html_email_thong_bao, tieu_de_email_thong_bao } = await import('../src/su_kien/gui_email_thong_bao.ts');
import type { DongThongBao } from '../src/su_kien/gui_email_thong_bao.ts';

const dong_mau = (): DongThongBao => ({
  id: 'x', ma: 'TB-000123', tieu_de: 'Thong bao <b>moi</b>',
  noi_dung: 'Dong 1 <script>alert(1)</script>\n\nDong 2 & ky tu',
  tieu_de_zh: null, noi_dung_zh: null,
  pham_vi: 'toan_cong_ty', phong_ban_id: null, nhan_vien_id: null,
  ten_luu: null, mime: null, da_go: false, da_gui_email: false,
});

test('dung_than_mail: khong dinh kem thi khong co truong attachments', () => {
  const than = dung_than_mail(
    { den: ['a@x.com'], tieu_de: 'Tieu de', noi_dung_html: '<p>Xin chao</p>' },
    ['a@x.com'],
  ) as { message: Record<string, unknown> };
  const msg = than.message;
  assert.equal(msg['subject'], 'Tieu de');
  assert.deepEqual(msg['toRecipients'], [
    { emailAddress: { address: 'a@x.com' } },
  ]);
  assert.equal(msg['attachments'], undefined);
});

test('dung_than_mail: dinh kem duoc ma hoa base64 dung kieu Graph', () => {
  const du_lieu = Buffer.from('PK\x03\x04docx-gia', 'utf8');
  const than = dung_than_mail(
    {
      den: ['a@x.com'], tieu_de: 'Co tep',
      noi_dung_html: '<p>Xem tep.</p>',
      dinh_kem: [{
        ten: 'TB-000001.docx',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        du_lieu,
      }],
    },
    ['a@x.com'],
  ) as { message: Record<string, unknown> };
  const kem = (than.message['attachments'] as Record<string, unknown>[])[0];
  assert.equal(kem?.['@odata.type'], '#microsoft.graph.fileAttachment');
  assert.equal(kem?.['name'], 'TB-000001.docx');
  assert.equal(kem?.['contentBytes'], du_lieu.toString('base64'));
});

test('html_email_thong_bao: tieu de + noi dung + chan HTML injection + chu ky cong ty', () => {
  const html = html_email_thong_bao(dong_mau());
  assert.match(html, /TB-000123/);
  // Chuoi dau vao bi thoat, khong con the script song.
  assert.equal(html.includes('<script>alert'), false);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Dong 2 &amp; ky tu/);
  // Moi doan thanh mot the <p> (ke ca doan chan trang co thuoc tinh style).
  assert.ok((html.match(/<p[\s>]/g) ?? []).length >= 3);
  // Bo khung chuyen nghiep + chu ky cong ty (phong nhan su, ten phap nhan, ghi chu tu dong).
  assert.match(html, /THÔNG BÁO NỘI BỘ/);
  assert.match(html, /Trân trọng,/);
  assert.match(html, /Phòng Nhân sự/);
  assert.match(html, /Công ty TNHH Trần Hoàng Việt Nam/);
  assert.match(html, /Email tự động từ hệ thống chấm công/);
  assert.match(html, /lang="vi"/);
});

test('html_email_thong_bao: khung theo ngon ngu nguoi nhan (zh) — chua dich thi giu noi dung goc', () => {
  const html = html_email_thong_bao(dong_mau(), 'zh');
  assert.match(html, /内部通知/);
  assert.match(html, /通知编号/);
  assert.match(html, /人力资源部/);
  assert.match(html, /考勤/);
  assert.match(html, /lang="zh-CN"/);
  // Thong bao chua co ban dich (noi_dung_zh rong) thi giu nguyen van ban goc, khong bi dich.
  assert.match(html, /Dong 1 &lt;script&gt;/);
});

test('html_email_thong_bao: co ban dich thi email TQ dung noi dung TQ (va van thoat HTML)', () => {
  const t = {
    ...dong_mau(),
    tieu_de_zh: '关于自 2026 年 11 月 1 日起调整工作时间的通知',
    noi_dung_zh: '第一段 <b>要转义</b>。\n\n第二段：公司自 2026 年 11 月 1 日起调整工作时间。',
  };
  const html = html_email_thong_bao(t, 'zh');
  assert.match(html, /关于自 2026 年 11 月 1 日起调整工作时间的通知/);
  assert.match(html, /第一段 &lt;b&gt;要转义&lt;\/b&gt;。/);
  assert.match(html, /第二段：公司自 2026 年 11 月 1 日起调整工作时间。/);
  assert.equal(html.includes('Dong 1'), false);
  // Ban tieng Viet khong doi.
  const vi = html_email_thong_bao(t);
  assert.match(vi, /Dong 1 &lt;script&gt;/);
});

test('tieu_de_email_thong_bao: dung tieu de TQ khi co ban dich', () => {
  assert.equal(tieu_de_email_thong_bao(dong_mau()), '[Chấm công] Thong bao <b>moi</b>');
  assert.equal(tieu_de_email_thong_bao(dong_mau(), 'zh'), '[考勤] Thong bao <b>moi</b>');
  const co_dich = { ...dong_mau(), tieu_de_zh: '关于调整工作时间的通知' };
  assert.equal(tieu_de_email_thong_bao(co_dich, 'zh'), '[考勤] 关于调整工作时间的通知');
  assert.equal(tieu_de_email_thong_bao(co_dich), '[Chấm công] Thong bao <b>moi</b>');
});

test('html_email_thong_bao: co tep dinh kem thi ghi chu ro van ban day du dinh kem', () => {
  const html = html_email_thong_bao({ ...dong_mau(), ten_luu: 'tb-123.docx' });
  assert.match(html, /Văn bản đầy đủ đính kèm bên dưới/);
  const khong_kem = html_email_thong_bao(dong_mau());
  assert.equal(khong_kem.includes('Văn bản đầy đủ đính kèm'), false);
});

test('tieu_de_email_thong_bao: tien to [Chấm công] / [考勤] theo ngon ngu', () => {
  assert.equal(tieu_de_email_thong_bao(dong_mau()), '[Chấm công] Thong bao <b>moi</b>');
  assert.equal(tieu_de_email_thong_bao(dong_mau(), 'zh'), '[考勤] Thong bao <b>moi</b>');
});
