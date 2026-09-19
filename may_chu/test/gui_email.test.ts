// Kiem thu gui email thong bao: dung payload sendMail (ke ca dinh kem) va HTML email.
// KHONG can CSDL / mang — chi kiem ham thuan.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { dung_than_mail } = await import('../src/su_kien/gui_email.ts');
const { html_email_thong_bao } = await import('../src/su_kien/gui_email_thong_bao.ts');
import type { DongThongBao } from '../src/su_kien/gui_email_thong_bao.ts';

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

test('html_email_thong_bao: tieu de + noi dung + chan HTML injection', () => {
  const t: DongThongBao = {
    id: 'x', ma: 'TB-000123', tieu_de: 'Thong bao <b>moi</b>',
    noi_dung: 'Dong 1 <script>alert(1)</script>\n\nDong 2 & ky tu',
    pham_vi: 'toan_cong_ty', phong_ban_id: null, nhan_vien_id: null,
    ten_luu: null, mime: null, da_go: false, da_gui_email: false,
  };
  const html = html_email_thong_bao(t);
  assert.match(html, /TB-000123/);
  // Chuoi dau vao bi thoat, khong con the script song.
  assert.equal(html.includes('<script>alert'), false);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Dong 2 &amp; ky tu/);
  // Moi doan thanh mot the <p> (ke ca doan chan trang co thuoc tinh style).
  assert.ok((html.match(/<p[\s>]/g) ?? []).length >= 3);
});
