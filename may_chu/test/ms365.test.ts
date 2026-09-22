// Chan dang nhap + rut giay phep Microsoft 365 khi nghi viec — kiem phan THUAN.
//
// Payload Graph duoc tach thanh ham thuan `dung_than_*` de kiem duoc ma khong can goi
// Graph that: sai khuon payload la sai hop dong voi Microsoft, va no chi bi phat hien
// khi ai do nhin thay mot tai khoan da nghi van dang nhap duoc — qua muon. Nen khuon
// payload duoc khoa bang test.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  dung_than_chan_dang_nhap, dung_than_rut_giay_phep,
  dung_than_tao_tai_khoan, dung_than_cap_giay_phep,
  la_truong_phong, sinh_mat_khau_khoi_tao,
} = await import('../src/nhan_su/ms365.ts');

test('chan dang nhap: accountEnabled phai la false', () => {
  assert.deepEqual(dung_than_chan_dang_nhap(), { accountEnabled: false });
});

test('rut giay phep: addLicenses rong, removeLicenses la danh sach sku dang gan', () => {
  const than = dung_than_rut_giay_phep(['sku-e3', 'sku-f3']);
  assert.deepEqual(than, { addLicenses: [], removeLicenses: ['sku-e3', 'sku-f3'] });
});

test('rut giay phep: khong con giay phep nao thi danh sach rut rong', () => {
  assert.deepEqual(dung_than_rut_giay_phep([]), { addLicenses: [], removeLicenses: [] });
});

test('tao tai khoan: UPN la email, mailNickname la phan truoc @, bat buoc doi mat khau lan dau', () => {
  const than = dung_than_tao_tai_khoan('An.nguyen@tranhoangvietnam.com', 'Nguyễn Văn An', 'Xy12#abcD');
  assert.deepEqual(than, {
    accountEnabled: true,
    displayName: 'Nguyễn Văn An',
    mailNickname: 'An.nguyen',
    userPrincipalName: 'An.nguyen@tranhoangvietnam.com',
    passwordProfile: {
      forceChangePasswordNextSignIn: true,
      password: 'Xy12#abcD',
    },
  });
});

test('cap giay phep: dung mot skuId trong addLicenses', () => {
  assert.deepEqual(dung_than_cap_giay_phep('sku-basic'), {
    addLicenses: [{ skuId: 'sku-basic' }], removeLicenses: [],
  });
});

test('chuc danh: truong phong duoc giay phep Standard, nhan su con lai dung Basic', () => {
  assert.equal(la_truong_phong('Trưởng phòng Kinh doanh'), true);
  assert.equal(la_truong_phong('trưởng bộ phận kho'), true);
  assert.equal(la_truong_phong('Nhân viên kinh doanh'), false);
  assert.equal(la_truong_phong(null), false);
  assert.equal(la_truong_phong(''), false);
});

test('chuc danh: pho truong phong khong duoc tinh la truong phong', () => {
  assert.equal(la_truong_phong('Phó trưởng phòng Kinh doanh'), false);
});

test('mat khau khoi tao: du dai, du 4 nhom ky tu', () => {
  for (let i = 0; i < 20; i++) {
    const mk = sinh_mat_khau_khoi_tao();
    assert.equal(mk.length, 16);
    assert.match(mk, /[A-Z]/);
    assert.match(mk, /[a-z]/);
    assert.match(mk, /[0-9]/);
    assert.match(mk, /[!@#$%^&*\-_=+]/);
  }
});
