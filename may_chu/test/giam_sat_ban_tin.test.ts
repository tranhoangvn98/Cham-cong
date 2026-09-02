// Test noi dung ban tin email — cac ham THUAN, khong gui mail that.
//
// HAI THU DUOC KIEM O DAY, ca hai deu la rui ro that:
//   1. Thoat HTML: tieu de canh bao chua du lieu tu ERP 1, tuc du lieu NGUOI NGOAI go duoc.
//      Mot tieu de don hang chua `<script>` ma khong thoat se chay trong hop thu nguoi doc.
//   2. Ngon tu: ban tin phai noi ro day la dau hieu can kiem tra, khong phai ket luan.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env['JWT_SECRET'] ??= 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['DATABASE_URL'] ??= 'postgres://khong_dung@localhost:5432/khong_dung';
process.env['DEVICE_TZ_OFFSET_HOURS'] ??= '7';

const { dung_noi_dung, thoat_html, bat_email } =
  await import('../src/giam_sat/ban_tin.ts');

const DONG = {
  tieu_de: 'Đề xuất chi CT001 do chính người đề xuất duyệt',
  muc_do: 'nghiem_trong',
  nhom_ten: 'Giao dịch bất thường',
  loai_loi_ten: 'Người đề xuất chi trùng người duyệt chi',
  so_tien: '25000000',
  nhan_vien_ten: 'Nguyễn Văn A',
  phat_hien_luc: '2026-09-02T03:00:00.000Z',
};

test('thoat HTML chan the script tu du lieu ERP 1', () => {
  const doc = thoat_html('<script>alert(1)</script>');
  assert.ok(!doc.includes('<script>'), 'khong duoc de the script nguyen ven');
  assert.equal(doc, '&lt;script&gt;alert(1)&lt;/script&gt;');
});

test('thoat HTML xu ly du ca nam ky tu nguy hiem', () => {
  assert.equal(thoat_html(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});

test('tieu de canh bao doc hai duoc thoat trong phan HTML cua email', () => {
  const nd = dung_noi_dung(
    [{ ...DONG, tieu_de: 'Đơn <img src=x onerror=alert(1)> bị sửa' }],
    '2026-09-02', 'https://vidu.local');
  assert.ok(!nd.html.includes('<img src=x'), 'the img phai bi thoat');
  assert.ok(nd.html.includes('&lt;img src=x'));
});

test('ban tin noi ro day la dau hieu can kiem tra, KHONG phai ket luan', () => {
  const nd = dung_noi_dung([DONG], '2026-09-02', 'https://vidu.local');
  // Neu cau nay bien mat, email tro thanh mot ban cao trang gui vao hop thu — va nguoi bi
  // neu ten mat co hoi giai thich truoc khi cai nhin da hinh thanh.
  assert.match(nd.chu, /KHÔNG phải kết luận/);
  assert.match(nd.html, /KHÔNG phải kết luận/);
});

test('tieu de email neu so luong va so canh bao nghiem trong', () => {
  const nd = dung_noi_dung([DONG, { ...DONG, muc_do: 'trung' }],
    '2026-09-02', 'https://vidu.local');
  assert.match(nd.tieu_de, /2 dấu hiệu mới/);
  assert.match(nd.tieu_de, /1 nghiêm trọng/);
});

test('khong co canh bao nghiem trong thi tieu de khong nhac toi', () => {
  const nd = dung_noi_dung([{ ...DONG, muc_do: 'trung' }],
    '2026-09-02', 'https://vidu.local');
  assert.ok(!nd.tieu_de.includes('nghiêm trọng'));
});

test('so tien duoc dinh dang theo kieu Viet Nam', () => {
  const nd = dung_noi_dung([DONG], '2026-09-02', 'https://vidu.local');
  assert.match(nd.chu, /25\.000\.000 đ/);
});

test('canh bao khong co so tien thi khong hien "0 đ"', () => {
  const nd = dung_noi_dung([{ ...DONG, so_tien: null }], '2026-09-02', 'https://vidu.local');
  assert.ok(!nd.chu.includes('đ\n'), 'khong duoc de mot dau tien tro troi');
  const nd0 = dung_noi_dung([{ ...DONG, so_tien: '0' }], '2026-09-02', 'https://vidu.local');
  assert.ok(!nd0.chu.includes('0 đ'), 'so tien bang 0 coi nhu khong co');
});

test('email chua lien ket ve man hinh giam sat', () => {
  const nd = dung_noi_dung([DONG], '2026-09-02', 'https://vidu.local');
  assert.match(nd.chu, /https:\/\/vidu\.local\/giam-sat/);
  assert.match(nd.html, /href="https:\/\/vidu\.local\/giam-sat"/);
});

test('bat_email tra false khi chua khai SMTP', () => {
  // Mac dinh trong moi truong test la chua khai -> tinh nang tat sach, khong nem loi.
  assert.equal(bat_email(), false);
});
