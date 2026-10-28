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
  dung_than_dat_lai_mat_khau, dung_than_dat_quoc_gia, quyet_dinh_giay_phep,
  ten_goi_giay_phep,
  la_truong_phong, sinh_mat_khau_khoi_tao, loc_nguoi_da_cap_phep,
  ten_moi_thanh_chu,
} = await import('../src/nhan_su/ms365.ts');

test('chan dang nhap: accountEnabled phai la false', () => {
  assert.deepEqual(dung_than_chan_dang_nhap(), { accountEnabled: false });
});

test('dat lai mat khau: chi gui passwordProfile, bat buoc doi o lan dang nhap dau', () => {
  assert.deepEqual(dung_than_dat_lai_mat_khau('Xy12#abcD'), {
    passwordProfile: { forceChangePasswordNextSignIn: true, password: 'Xy12#abcD' },
  });
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

test('quoc gia su dung: Graph doi chuoi ma nuoc, viet thuong cung nhan', () => {
  assert.deepEqual(dung_than_dat_quoc_gia('vn'), { usageLocation: 'VN' });
  assert.deepEqual(dung_than_dat_quoc_gia(' VN '), { usageLocation: 'VN' });
});

test('giay phep: chua co giay phep nao thi cap', () => {
  assert.deepEqual(quyet_dinh_giay_phep([], 'sku-basic'), { viec: 'cap' });
  assert.deepEqual(quyet_dinh_giay_phep([''], 'sku-basic'), { viec: 'cap' });
});

test('giay phep: da co dung SKU dich thi khong cap lai (outbox gui lai)', () => {
  assert.deepEqual(quyet_dinh_giay_phep(['sku-basic'], 'sku-basic'), { viec: 'da_co' });
  assert.deepEqual(
    quyet_dinh_giay_phep(['sku-e3', 'sku-basic'], 'sku-basic'), { viec: 'da_co' });
});

test('giay phep: dang dung goi KHAC thi khong cap chong, tra ve danh sach dang co', () => {
  assert.deepEqual(
    quyet_dinh_giay_phep(['sku-standard'], 'sku-basic'),
    { viec: 'khac', dang_co: ['sku-standard'] });
});

test('ten goi giay phep: hai goi cua cong ty co ten doc duoc, sku la thi tra nguyen ma', () => {
  assert.equal(
    ten_goi_giay_phep('3B555118-da6a-4418-894f-7df1e2096870'), 'Microsoft 365 Business Basic');
  assert.equal(
    ten_goi_giay_phep('e0dfc8b9-9531-4ec8-94b4-9fec23b05fc8'), 'Microsoft 365 Business Standard');
  assert.equal(ten_goi_giay_phep('sku-la-hoac'), 'sku-la-hoac');
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

test('loc da cap phep: giu nguoi con hoat dong va co giay phep', () => {
  const kq = loc_nguoi_da_cap_phep([
    {
      id: 'oid-1', displayName: 'Nguyễn Văn A',
      userPrincipalName: 'an.nguyen@tranhoangvietnam.com',
      accountEnabled: true, userType: 'Member',
      assignedLicenses: [{ skuId: 'sku-basic' }],
    },
  ]);
  assert.deepEqual(kq, [{
    oid: 'oid-1', ho_ten: 'Nguyễn Văn A', upn: 'an.nguyen@tranhoangvietnam.com',
  }]);
});

test('loc da cap phep: loai tai khoan da khoa, chua co giay phep, guest #EXT#', () => {
  const kq = loc_nguoi_da_cap_phep([
    {
      id: 'oid-khoa', displayName: 'Đã Nghỉ',
      userPrincipalName: 'nghi@tranhoangvietnam.com',
      accountEnabled: false, userType: 'Member',
      assignedLicenses: [{ skuId: 'sku-basic' }],
    },
    {
      id: 'oid-chua', displayName: 'Chưa Cấp',
      userPrincipalName: 'chua@tranhoangvietnam.com',
      accountEnabled: true, userType: 'Member',
      assignedLicenses: [],
    },
    {
      id: 'oid-guest', displayName: 'Khách Bên Ngoài',
      userPrincipalName: 'khach_outlook.com#EXT#@tranhoangvietnam.com',
      accountEnabled: true, userType: 'Guest',
      assignedLicenses: [{ skuId: 'sku-basic' }],
    },
    {
      id: 'oid-thieu', displayName: '',
      userPrincipalName: '',
      accountEnabled: true, userType: 'Member',
      assignedLicenses: [{ skuId: 'sku-basic' }],
    },
  ]);
  assert.deepEqual(kq, []);
});

test('loc da cap phep: khong chet khi Graph tra thieu truong', () => {
  const kq = loc_nguoi_da_cap_phep([{}, null as never]);
  assert.deepEqual(kq, []);
});

test('ten moi thanh chu: toi da 3 ten, thua thi gom "va N nguoi khac"', () => {
  assert.equal(ten_moi_thanh_chu([]), null);
  assert.equal(ten_moi_thanh_chu(['Nguyễn A']), 'Nguyễn A');
  assert.equal(ten_moi_thanh_chu(['Nguyễn A', 'Trần B']), 'Nguyễn A, Trần B');
  assert.equal(ten_moi_thanh_chu(['A', 'B', 'C']), 'A, B, C');
  assert.equal(ten_moi_thanh_chu(['A', 'B', 'C', 'D', 'E']), 'A, B, C và 2 người khác');
});

test('ten moi thanh chu: ban tieng Trung noi bang dau lien + "deng N ren"', () => {
  assert.equal(ten_moi_thanh_chu(['Nguyễn A'], 'zh'), 'Nguyễn A');
  assert.equal(ten_moi_thanh_chu(['A', 'B', 'C'], 'zh'), 'A、B、C');
  assert.equal(ten_moi_thanh_chu(['A', 'B', 'C', 'D', 'E'], 'zh'), 'A、B、C等2人');
});
