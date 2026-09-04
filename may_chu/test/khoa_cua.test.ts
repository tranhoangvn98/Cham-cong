// Kiem thu logic KHOA CUA THEO GIO — ham thuan, khong cham CSDL.
// Chan VAO ngoai gio: chi chan chieu vao, loi ra tu do bang phan cung.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env['JWT_SECRET'] ??= 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['DATABASE_URL'] ??= 'postgres://khong_dung@localhost:5432/khong_dung';
// OFFSET mac dinh +7 (VN) — cac moc duoi tinh theo gio may = UTC+7.

const { trang_thai_mong_muon } = await import('../src/ra_vao/khoa_cua.ts');

const LICH = {
  thiet_bi_serial: 'X', bat: true, gio_mo: '07:00:00', gio_dong: '19:00:00',
  cuoi_tuan_chan: true, lenh_mo: '', lenh_chan: '', trang_thai: null,
} as const;

test('trong gio hanh chinh ngay thuong -> mo (cho vao)', () => {
  // 2026-08-31 la Thu Hai. 01:00 UTC = 08:00 gio may.
  assert.equal(trang_thai_mong_muon(LICH, new Date('2026-08-31T01:00:00Z')), 'mo');
});

test('ngoai gio (toi) ngay thuong -> chan', () => {
  // 13:00 UTC = 20:00 gio may.
  assert.equal(trang_thai_mong_muon(LICH, new Date('2026-08-31T13:00:00Z')), 'chan');
});

test('sang som truoc gio mo -> chan', () => {
  // 22:30 UTC hom truoc = 05:30 gio may Thu Hai.
  assert.equal(trang_thai_mong_muon(LICH, new Date('2026-08-30T22:30:00Z')), 'chan');
});

test('cuoi tuan chan ca ngay du trong khung gio', () => {
  // 2026-09-05 la Thu Bay. 05:00 UTC = 12:00 gio may (trong [07,19]) nhung cuoi tuan -> chan.
  assert.equal(trang_thai_mong_muon(LICH, new Date('2026-09-05T05:00:00Z')), 'chan');
});

test('cuoi_tuan_chan = false thi thu Bay trong gio van mo', () => {
  const l = { ...LICH, cuoi_tuan_chan: false };
  assert.equal(trang_thai_mong_muon(l, new Date('2026-09-05T05:00:00Z')), 'mo');
});

test('dung ranh gio dong -> chan (khung dong nua ho [mo, dong))', () => {
  // 12:00 UTC = 19:00 gio may = gio_dong -> khong con cho vao.
  assert.equal(trang_thai_mong_muon(LICH, new Date('2026-08-31T12:00:00Z')), 'chan');
});
