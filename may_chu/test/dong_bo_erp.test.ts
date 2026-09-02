// Bo anh xa nguoi dung ERP -> nhan vien.
//
// Truoc bo bai nay, `erp/dong_bo_nhan_vien.ts` KHONG CO MOT BAI KIEM NAO — va no la doan ma ghi
// truc tiep vao bang `nhan_vien` cua nguoi that, hang loat, tu du lieu cua mot he thong khac
// khong ai o day kiem soat. Cai gia phai tra hien ra dung the: ERP tra HO TEN trong truong
// `phoneNumber` va he thong ghi thang no vao cot `so_dien_thoai`.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chuan_chuoi, chuan_dien_thoai, chuan_email, ly_do_bo_qua, ma_nv_tu_erp, truong_can_doi,
} from '../src/erp/dong_bo_nhan_vien.ts';
import { la_so_dien_thoai } from '../src/tien_ich/kiem_tra.ts';

test('la_so_dien_thoai: loai ten nguoi, giu moi cach viet so that', () => {
  // Cac gia tri THAT tu du lieu ERP va tu cach nhan su go tay — khong duoc tu choi cai nao.
  for (const s of [
    '0912345678', '0912.345.678', '0912 345 678', '+84912345678', '+84 91 234 5678',
    '024 3822 1234', '(024) 3822 1234', '0243822-1234', '0912345678/0987654321',
    '38221234',
  ]) {
    assert.equal(la_so_dien_thoai(s), true, `tu choi so that: "${s}"`);
  }

  // Va nhung thu KHONG phai so dien thoai. Dong dau la du lieu that (ERP4).
  for (const s of [
    'Trần Hoàng Anh Vinh', 'N/A', 'không có', '-', 'chưa cập nhật', '', '   ', '0', '0912',
  ]) {
    assert.equal(la_so_dien_thoai(s), false, `nhan cai khong phai so: "${s}"`);
  }
});

test('chuan_dien_thoai: ten nguoi trong o dien thoai -> null', () => {
  // Day la lo hong da xay ra that: ERP4 co phoneNumber = ho ten, va no vao thang CSDL.
  assert.equal(chuan_dien_thoai('Trần Hoàng Anh Vinh'), null);
  assert.equal(chuan_dien_thoai('0912345678'), '0912345678');
  assert.equal(chuan_dien_thoai('  0912 345 678  '), '0912 345 678');
  assert.equal(chuan_dien_thoai(''), null);
  assert.equal(chuan_dien_thoai(undefined), null);
  assert.equal(chuan_dien_thoai(12345678), null, 'so nguyen khong phai chuoi -> null');
});

test('truong_can_doi dung DUNG bo loc ma cau ghi dung', () => {
  // BAI QUAN TRONG NHAT o day. Neu `truong_can_doi` nhan mot gia tri ma cau `update` lai bo, thi
  // moi lan dong bo se bao `cap_nhat` cho nguoi do, ghi khong duoc gi, va bao lai o lan sau —
  // mai mai. Kieu hong nay khong ai truy ra duoc tu giao dien.
  const nv = {
    id: 'x', ma_nv: 'ERP4', ho_ten: 'Trần Hoàng Anh Vinh',
    email: 'vinh@tranhoangvietnam.com', so_dien_thoai: null,
    erp_user_id: 4, dang_hoat_dong: true,
  };
  const doi = truong_can_doi({
    userId: 4, name: 'Trần Hoàng Anh Vinh', email: 'vinh@tranhoangvietnam.com',
    phoneNumber: 'Trần Hoàng Anh Vinh',
  }, nv);
  assert.deepEqual(doi, [],
    'coi ten nguoi la so dien thoai can doi -> se bao cap_nhat moi lan dong bo');

  // Con so THAT thi phai bao la can doi.
  assert.deepEqual(
    truong_can_doi({
      userId: 4, name: 'Trần Hoàng Anh Vinh', email: 'vinh@tranhoangvietnam.com',
      phoneNumber: '0912345678',
    }, nv),
    ['so_dien_thoai']);
});

test('truong_can_doi: ERP de trong thi khong coi la can doi', () => {
  // `coalesce($4, so_dien_thoai)` trong cau ghi giu nguyen so dang co. Neu o day bao "can doi"
  // thi lan nao cung `cap_nhat` ma khong doi gi.
  const doi = truong_can_doi({
    userId: 7, name: 'Lê Thị Hoa', email: 'hoa@example.com',
  }, {
    id: 'y', ma_nv: 'ERP7', ho_ten: 'Lê Thị Hoa', email: 'hoa@example.com',
    so_dien_thoai: '0912345678', erp_user_id: 7, dang_hoat_dong: true,
  });
  assert.deepEqual(doi, []);
});

test('ly_do_bo_qua: khong email thi khong noi duoc voi Microsoft 365', () => {
  assert.match(ly_do_bo_qua({ userId: 1, name: 'A' }) ?? '', /email/);
  assert.match(ly_do_bo_qua({ name: 'A', email: 'a@b.c' }) ?? '', /userId/);
  assert.match(ly_do_bo_qua({ userId: 1, email: 'a@b.c' }) ?? '', /họ tên/);
  assert.equal(ly_do_bo_qua({ userId: 1, name: 'A', email: 'a@b.c' }), null);
});

test('ma_nv_tu_erp: ma on dinh, truy nguoc duoc ve ban ghi goc', () => {
  assert.equal(ma_nv_tu_erp({ userId: 147 }), 'ERP147');
  assert.equal(ma_nv_tu_erp({ userId: 4 }), 'ERP4');
});

test('chuan_email ha chu thuong, chuan_chuoi bo chuoi rong', () => {
  // Khoa noi ba he thong la email, va Microsoft khop theo `lower(email)`.
  assert.equal(chuan_email('  Vinh@TranHoangVietNam.com '), 'vinh@tranhoangvietnam.com');
  assert.equal(chuan_email(''), null);
  assert.equal(chuan_email(null), null);
  assert.equal(chuan_chuoi('  '), null);
  assert.equal(chuan_chuoi(' Lê Thị Hoa '), 'Lê Thị Hoa');
});
