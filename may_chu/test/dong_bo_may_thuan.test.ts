// Kiem thu phan THUAN cua dong bo may cham cong — so sanh anh chup hai may va chon
// nguoi da nghi can khoa. Khoa may sai la xoa nham nguoi dang lam, sai la mat cong.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { tinh_thieu_giua_hai_may, chon_nguoi_da_nghi } = await import(
  '../src/adms/dong_bo_may_thuan.ts');

test('tinh_thieu: user + khuon mat thieu tren may dich duoc liet ke', () => {
  const tu = {
    nguoi_dung: [
      { pin: '64', ten_may: 'Huyenkd' },
      { pin: '65', ten_may: 'Vietkd' },
    ],
    sinh_hoc: [
      { pin: '64', no: '0', type: '9', major: '40', minor: '1', tmp: 'YWJj' },
      { pin: '65', no: '0', type: '9', major: '40', minor: '1', tmp: 'ZGVm' },
    ],
  };
  const den = {
    nguoi_dung: [
      { pin: '64', ten_may: 'Huyenkd' },
    ],
    sinh_hoc: [
      { pin: '64', no: '0', type: '9', major: '40', minor: '1', tmp: 'YWJj' },
    ],
  };
  const can = tinh_thieu_giua_hai_may(tu, den);
  assert.equal(can.length, 1);
  assert.equal(can[0]!.pin, '65');
  assert.equal(can[0]!.thieu_user, true);
  assert.equal(can[0]!.sinh_hoc.length, 1);
  assert.equal(can[0]!.sinh_hoc[0]!.tmp, 'ZGVm');
});

test('tinh_thieu: ten giong nhau (khac hoa/thuong) khong bi coi la thieu user', () => {
  const tu = {
    nguoi_dung: [{ pin: '3', ten_may: 'Thu' }],
    sinh_hoc: [],
  };
  const den = {
    nguoi_dung: [{ pin: '3', ten_may: 'THU' }],
    sinh_hoc: [],
  };
  assert.equal(tinh_thieu_giua_hai_may(tu, den).length, 0);
});

test('tinh_thieu: khe da co thi khong day de, du noi dung khac nhau', () => {
  // Khe (pin|no|type) da co tren may dich thi bo qua — khong ghi de len du lieu nguoi khac.
  const tu = {
    nguoi_dung: [{ pin: '2', ten_may: 'A' }],
    sinh_hoc: [{ pin: '2', no: '0', type: '9', major: '40', minor: '1', tmp: 'moi' }],
  };
  const den = {
    nguoi_dung: [{ pin: '2', ten_may: 'A' }],
    sinh_hoc: [{ pin: '2', no: '0', type: '9', major: '40', minor: '1', tmp: 'cu' }],
  };
  assert.equal(tinh_thieu_giua_hai_may(tu, den).length, 0);
});

test('tinh_thieu: bo qua PIN 0 va ten rong; van day template cua PIN khong co user', () => {
  const tu = {
    nguoi_dung: [
      { pin: '0', ten_may: 'ADMIN' },
      { pin: '9', ten_may: '' },
    ],
    sinh_hoc: [
      { pin: '9', no: '0', type: '9', major: '40', minor: '1', tmp: 'dHJ1b3Q' },
    ],
  };
  const den = { nguoi_dung: [], sinh_hoc: [] };
  const can = tinh_thieu_giua_hai_may(tu, den);
  assert.equal(can.length, 1);
  assert.equal(can[0]!.pin, '9');
  assert.equal(can[0]!.thieu_user, false, 'ten nguon rong thi khong day user');
  assert.equal(can[0]!.sinh_hoc.length, 1);
});

test('chon_nguoi_da_nghi: chu nhan PIN theo lich su quet da nghi -> chon', () => {
  const may = [
    { serial: 'MAY-A', pin: '14', ten_may: 'Kien' },
    { serial: 'MAY-A', pin: '2', ten_may: 'Nguyen Ngan Ha' },
    { serial: 'MAY-A', pin: '55', ten_may: 'Nhikd' },
  ];
  // Lan quet gan nhat cua PIN 14 map cho NV1 (da nghi); PIN 2 cho NV2 (con lam);
  // PIN 55 chua tung quet -> khong co bang chung -> giu nguyen.
  const chu_nhan = new Map([
    ['MAY-A|14', 'NV1'],
    ['MAY-A|2', 'NV2'],
  ]);
  const ra = chon_nguoi_da_nghi(may, chu_nhan, new Set(['NV1']), new Set());
  assert.equal(ra.length, 1);
  assert.deepEqual(ra[0], { serial: 'MAY-A', pin: '14', ten_may: 'Kien' });
});

test('chon_nguoi_da_nghi: chu nhan con quet gan day thi giu nguyen', () => {
  // Tien le cho nghi NHAM roi van di lam (Quynh Anh): con quet trong 3 ngay -> khong khoa.
  const may = [{ serial: 'MAY-A', pin: '14', ten_may: 'Kien' }];
  const chu_nhan = new Map([['MAY-A|14', 'NV1']]);
  const ra = chon_nguoi_da_nghi(may, chu_nhan, new Set(['NV1']), new Set(['NV1']));
  assert.equal(ra.length, 0);
});

test('chon_nguoi_da_nghi: PIN duoc gan lai cho nguoi con lam thi khong khoa', () => {
  // Lan quet GAN NHAT cua PIN la nguoi con lam -> chu nhan hien tai khong phai nguoi nghi.
  const may = [{ serial: 'MAY-A', pin: '14', ten_may: 'Minh' }];
  const chu_nhan = new Map([['MAY-A|14', 'NV2']]);
  const ra = chon_nguoi_da_nghi(may, chu_nhan, new Set(['NV1']), new Set());
  assert.equal(ra.length, 0);
});
