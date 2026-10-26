// Doc loi 409 "email da thuoc ho so khac" o phia webapp.
//
// Giao dien can biet MO HO SO NAO de dua ra nut "Mở hồ sơ". May chu moi tra kem `chi_tiet`;
// may chu cu (hoac tab web dang mo tu truoc khi cap nhat) chi co chuoi thong diep — van phai
// nhan ra de noi ro ten nguoi, chi la khong co nut mo ho so.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ho_so_trung_tu_loi, ho_so_tu_mo, MA_LOI_EMAIL_DA_CO_HO_SO,
} from '../src/trang/nhan_vien_loi.ts';

const LOI_TRUNG = {
  message: 'Email huyen@tranhoangvietnam.com đã thuộc hồ sơ NVVP10260001 — Bùi Khánh Huyền.',
  chi_tiet: {
    ma: MA_LOI_EMAIL_DA_CO_HO_SO,
    nhan_vien_id: '44641e70-66a1-4145-b894-987bccddef56',
    ma_nv: 'NVVP10260001',
    ho_ten: 'Bùi Khánh Huyền',
    dang_hoat_dong: true,
  },
};

test('doc duoc chi_tiet may chu moi tra ve', () => {
  const kq = ho_so_trung_tu_loi({
    message: 'Email huyen@tranhoangvietnam.com đã thuộc hồ sơ NVVP10260001 — Bùi Khánh Huyền.',
    chi_tiet: {
      ma: MA_LOI_EMAIL_DA_CO_HO_SO,
      nhan_vien_id: '44641e70-66a1-4145-b894-987bccddef56',
      ma_nv: 'NVVP10260001',
      ho_ten: 'Bùi Khánh Huyền',
      dang_hoat_dong: true,
    },
  });
  assert.deepEqual(kq, {
    id: '44641e70-66a1-4145-b894-987bccddef56',
    ma_nv: 'NVVP10260001',
    ho_ten: 'Bùi Khánh Huyền',
    dang_hoat_dong: true,
  });
});

test('ho so da nghi viec: giu co dang_hoat_dong = false', () => {
  const kq = ho_so_trung_tu_loi({
    message: 'x',
    chi_tiet: { ma: MA_LOI_EMAIL_DA_CO_HO_SO, nhan_vien_id: 'a', ma_nv: 'NV1', ho_ten: 'A', dang_hoat_dong: false },
  });
  assert.equal(kq?.dang_hoat_dong, false);
});

test('may chu ban cu: chi co chuoi thong diep, van nhan ra va doc duoc ten', () => {
  const kq = ho_so_trung_tu_loi({
    message: 'Email huyen@tranhoangvietnam.com đã thuộc Bùi Khánh Huyền — không thể tạo tài khoản Microsoft trùng.',
  });
  assert.equal(kq?.ho_ten, 'Bùi Khánh Huyền');
  // Khong co id thi giao dien khong duoc ve nut "Mo ho so" (se dan toi dia chi sai).
  assert.equal(kq?.id, '');
});

test('loi khac tra null — khong duoc nhan nham thanh loi trung email', () => {
  assert.equal(ho_so_trung_tu_loi(null), null);
  assert.equal(ho_so_trung_tu_loi({ message: 'Lỗi hệ thống. Vui lòng thử lại.' }), null);
  assert.equal(ho_so_trung_tu_loi({ chi_tiet: { ma: 'ma_khac', nhan_vien_id: 'a' } }), null);
  // chi_tiet co ma nhung thieu id ho so → khong dung duoc lien ket, roi xuong nhanh chuoi.
  assert.equal(ho_so_trung_tu_loi({
    message: 'Không có gì', chi_tiet: { ma: MA_LOI_EMAIL_DA_CO_HO_SO },
  }), null);
});

// ---------------------------------------------------------------- tự mở hồ sơ khi bấm Lưu
test('da cap lai mat khau roi thi TU MO ho so da co', () => {
  // Nguoi dung da lay duoc tai khoan (bam "Cap lai mat khau"), viec con lai chi la bo sung
  // thong tin trong ho so da co — khong bat bam them lan nua.
  const kq = ho_so_tu_mo(LOI_TRUNG, true);
  assert.equal(kq?.id, '44641e70-66a1-4145-b894-987bccddef56');
  assert.equal(kq?.ma_nv, 'NVVP10260001');
});

test('CHUA cap lai mat khau thi khong tu mo — de nguoi dung con chon cap lai truoc', () => {
  assert.equal(ho_so_tu_mo(LOI_TRUNG, false), null);
});

test('loi khac (khong phai trung email) thi khong tu mo du da cap lai mat khau', () => {
  assert.equal(ho_so_tu_mo({ message: 'Lỗi hệ thống. Vui lòng thử lại.' }, true), null);
  assert.equal(ho_so_tu_mo(null, true), null);
});

test('may chu ban cu khong co ma ho so thi khong tu mo (khong doan dia chi)', () => {
  assert.equal(ho_so_tu_mo({
    message: 'Email a@b.c đã thuộc Bùi Khánh Huyền — không thể tạo tài khoản Microsoft trùng.',
  }, true), null);
});
