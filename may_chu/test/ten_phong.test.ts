// Ten phong ban chuan — chong sinh PHONG BAN TRUNG (loi 27/10/2026).
//
// Bang phong_ban tung co 29 dong, 16 dong rong, vi du lieu duoc tao qua ba dot dat ten
// khac nhau: ten ngan ("Phòng IT"), ten day du ("Phòng Công nghệ thông tin") va viet tat
// ("IT"). Man hinh "Phòng ban kiem nhiem" liet ke du 29 dong nen nguoi dung thay trung.
// Bai kiem nay giu bang anh xa luon tro ve DUNG 13 phong dang co du lieu that.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEN_PHONG_CHUAN, ten_phong_chuan } from '../src/nhan_su/ten_phong.ts';
import { CAC_PHONG } from '../src/to_chuc/du_lieu_jd_danh_muc.ts';

/** 13 phong ban that sau lan gop 27/10/2026 — moi ten trong bang anh xa phai ve mot trong so nay. */
const PHONG_THAT: readonly string[] = [
  'Ban Kiểm soát', 'Phòng CSKH', 'Phòng HCNS', 'Phòng IT', 'Phòng Kế toán',
  'Phòng Kho Hà Nội', 'Phòng Kho TQ', 'Phòng Kho VN', 'Phòng Kinh doanh',
  'Phòng Lái xe', 'Phòng Marketing', 'Phòng OPS Lạng Sơn', 'Phòng XNK',
];

test('moi ten viet tat / bien the deu keo ve mot phong ban that', () => {
  for (const [khoa, ten] of Object.entries(TEN_PHONG_CHUAN)) {
    assert.ok(PHONG_THAT.includes(ten), `"${khoa}" -> "${ten}" khong phai phong ban that`);
  }
});

test('ten day du cu (nguon sinh trung) deu bi keo ve ten ngan', () => {
  assert.equal(ten_phong_chuan('Phòng Công nghệ thông tin'), 'Phòng IT');
  assert.equal(ten_phong_chuan('Phòng Xuất nhập khẩu'), 'Phòng XNK');
  assert.equal(ten_phong_chuan('Phòng Chăm sóc khách hàng'), 'Phòng CSKH');
  assert.equal(ten_phong_chuan('Phòng Hành chính nhân sự'), 'Phòng HCNS');
  assert.equal(ten_phong_chuan('Hành chính nhân sự'), 'Phòng HCNS');
  assert.equal(ten_phong_chuan('Phòng Kho Trung Quốc'), 'Phòng Kho TQ');
  assert.equal(ten_phong_chuan('Phòng Kiểm soát'), 'Ban Kiểm soát');
  assert.equal(ten_phong_chuan('Kho vận'), 'Phòng Kho VN');
});

test('viet tat va lech khoang trang / hoa thuong deu ve cung mot dich', () => {
  assert.equal(ten_phong_chuan('  it  '), 'Phòng IT');
  assert.equal(ten_phong_chuan('IT'), 'Phòng IT');
  assert.equal(ten_phong_chuan('xnk'), 'Phòng XNK');
  assert.equal(ten_phong_chuan('Kinh doanh Sài Gòn'), 'Phòng Kinh doanh');
  assert.equal(ten_phong_chuan('HCNS'), 'Phòng HCNS');
});

test('ten la (chua co trong bang anh xa) giu nguyen, khong bi doan bua', () => {
  assert.equal(ten_phong_chuan('Phòng OPS Lạng Sơn'), 'Phòng OPS Lạng Sơn');
  assert.equal(ten_phong_chuan('Phòng Mới Toanh'), 'Phòng Mới Toanh');
  assert.equal(ten_phong_chuan(''), '');
});

test('danh muc nap JD chi dung phong ban that', () => {
  for (const ten of CAC_PHONG) {
    assert.ok(PHONG_THAT.includes(ten), `CAC_PHONG co "${ten}" khong phai phong ban that`);
  }
});
