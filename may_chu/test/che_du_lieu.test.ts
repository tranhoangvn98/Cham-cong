// Che du lieu ca nhan (Nghi dinh 13/2023/ND-CP). Che sai o day thi hoac lo du lieu, hoac
// che den muc nhan su khong lam viec duoc — nen tung truong deu co test rieng.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  TRUONG_NHAY_CAM, che_dien_thoai, che_email, che_giua, che_ho_so, duoc_xem_day_du,
} from '../src/bao_mat/che_du_lieu.ts';

test('che giua: giu dau va cuoi, phan giua thay bang dau cham', () => {
  assert.equal(che_giua('001234567890', 0, 4), '••••••••7890');
  assert.equal(che_giua('0912345678', 3, 3), '091••••678');
});

test('chuoi qua ngan thi che HET, khong de lo gan nhu toan bo', () => {
  // Giu 4 ky tu cuoi cua mot chuoi 5 ky tu la che duoc dung 1 ky tu — vo nghia.
  assert.equal(che_giua('12345', 0, 4), '•••••');
  assert.equal(che_giua('123', 0, 4), '••••');
});

test('che rong / null tra ve null chu khong tra chuoi dau cham', () => {
  assert.equal(che_giua(null), null);
  assert.equal(che_giua('   '), null);
});

test('che email: giu ky tu dau va nguyen ten mien de con nhan ra cong ty', () => {
  assert.equal(che_email('an.nguyen@congty.vn'), 'a••••••••@congty.vn');
  assert.equal(che_email('ab@x.vn'), 'a••@x.vn');
});

test('che dien thoai giu dau so va 3 so cuoi', () => {
  assert.equal(che_dien_thoai('0901234567'), '090••••567');
});

test('ho so bi che: moi truong nhay cam deu bi doi, truong thuong giu nguyen', () => {
  const goc = {
    ho_ten: 'Nguyễn Văn An',
    cccd_so: '001234567890',
    ma_so_thue: '8123456789',
    so_bhxh: '0123456789',
    so_tai_khoan: '19001234567890',
    lien_he_khan_sdt: '0912345678',
    dia_chi_thuong_tru: '12 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    kham_suc_khoe_ket_luan: 'Loại II — theo dõi huyết áp',
    ngay_sinh: '1995-04-12',
  };
  const che = che_ho_so(goc, false) as Record<string, unknown>;

  assert.equal(che['ho_ten'], 'Nguyễn Văn An', 'ho ten khong phai thu can che');
  assert.equal(che['ngay_sinh'], '1995-04-12', 'ngay sinh giu nguyen de con tinh tuoi/che do');
  assert.equal(che['da_che'], true);

  for (const truong of TRUONG_NHAY_CAM) {
    if (!(truong in goc)) continue;
    assert.notEqual(che[truong], (goc as Record<string, unknown>)[truong],
      `${truong} phai bi che`);
  }
});

test('dia chi va ket luan suc khoe bi AN HAN, khong che mot nua', () => {
  // Che nua dia chi thi van doan ra duoc; con ket luan suc khoe khong co "mot phan" vo hai.
  const che = che_ho_so({
    dia_chi_thuong_tru: '12 Nguyễn Trãi, Hà Nội',
    kham_suc_khoe_ket_luan: 'Loại II',
  }, false) as Record<string, unknown>;
  assert.equal(che['dia_chi_thuong_tru'], '(đã ẩn)');
  assert.equal(che['kham_suc_khoe_ket_luan'], '(đã ẩn)');
});

test('ban day du giu nguyen moi truong va danh dau da_che = false', () => {
  const goc = { cccd_so: '001234567890', ho_ten: 'An' };
  const day_du = che_ho_so(goc, true) as Record<string, unknown>;
  assert.equal(day_du['cccd_so'], '001234567890');
  assert.equal(day_du['da_che'], false);
});

test('truong nhay cam de trong thi van la null sau khi che', () => {
  const che = che_ho_so({ cccd_so: null, ma_so_thue: '' }, false) as Record<string, unknown>;
  assert.equal(che['cccd_so'], null);
  assert.equal(che['ma_so_thue'], null, 'chuoi rong khong duoc bien thanh dau cham');
});

test('quyen xem ban day du: nhan su, admin, va chinh chu', () => {
  assert.equal(duoc_xem_day_du({ vai_tro: 'admin', nv: null }, 'nv1'), true);
  assert.equal(duoc_xem_day_du({ vai_tro: 'nhan_su', nv: 'x' }, 'nv1'), true);
  assert.equal(duoc_xem_day_du({ vai_tro: 'nhan_vien', nv: 'nv1' }, 'nv1'), true);
});

test('TRUONG PHONG khong duoc xem ban day du, ke ca cua cap duoi', () => {
  // Quan ly truc tiep khong can so CCCD hay so tai khoan de lam viec.
  assert.equal(duoc_xem_day_du({ vai_tro: 'truong_phong', nv: 'tp' }, 'nv1'), false);
  // Nhung ho so cua chinh ho thi duoc.
  assert.equal(duoc_xem_day_du({ vai_tro: 'truong_phong', nv: 'tp' }, 'tp'), true);
});

test('nhan vien khac khong xem duoc ban day du cua nguoi khac', () => {
  assert.equal(duoc_xem_day_du({ vai_tro: 'nhan_vien', nv: 'nv2' }, 'nv1'), false);
  assert.equal(duoc_xem_day_du({ vai_tro: 'nhan_vien', nv: null }, 'nv1'), false);
});
