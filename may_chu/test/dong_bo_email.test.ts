// Kiem phan THUAN cua luong cap nhat email nhan su hang ngay.
//
// Chon sai nguon email thi he thong gui thu ve dia chi cua nguoi khac — ho so ca nhan, phieu
// luong, nhac ky luat. Do la loai loi khong the sua sau khi email da di.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { chon_email, la_email } = await import('../src/nhan_su/dong_bo_email.ts');

test('la_email: nhan dia chi hop le, tu choi chuoi thieu @ hoac thieu ten mien', () => {
  assert.equal(la_email('an.nguyen@congty.vn'), true);
  assert.equal(la_email('  an.nguyen@congty.vn  '), true);
  assert.equal(la_email('an.nguyen'), false);
  assert.equal(la_email('an@'), false);
  assert.equal(la_email('an@congty'), false);
  assert.equal(la_email('an nguyen@congty.vn'), false);
  assert.equal(la_email(null), false);
  assert.equal(la_email(''), false);
});

test('chon_email: uu tien UPN Microsoft', () => {
  assert.equal(
    chon_email('an.nguyen@congty.vn', 'annguyen'),
    'an.nguyen@congty.vn',
  );
});

test('chon_email: khong co UPN thi dung ten dang nhap khi no la email', () => {
  assert.equal(chon_email(null, 'an.nguyen@congty.vn'), 'an.nguyen@congty.vn');
  assert.equal(chon_email('', 'an.nguyen@congty.vn'), 'an.nguyen@congty.vn');
});

test('chon_email: khong co nguon nao dung thi tra null (KHONG doan tu ten)', () => {
  assert.equal(chon_email(null, 'lengoc'), null);
  assert.equal(chon_email('', ''), null);
  assert.equal(chon_email('khong-phai-email', 'cung-khong-phai'), null);
});

test('chon_email: cat khoang trang thua o ca hai nguon', () => {
  assert.equal(chon_email('  a@b.vn ', null), 'a@b.vn');
  assert.equal(chon_email(null, '  c@d.vn '), 'c@d.vn');
});
