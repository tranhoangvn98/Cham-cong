// Loi "email da thuoc ho so khac" — phai noi ro AI va MO DUOC dung ho so do.
//
// Su co 27/10/2026: nhan su lap ho so, phien dang nhap rot giua chung nen ho so DA duoc tao
// (va tai khoan Microsoft da co). Lan sau lap lai thi bi chan "Email ... đã thuộc ..." — man
// hinh chi dua ra nut "Cấp lại mật khẩu". Bam vao thi cap lai THAT, nhung bam Luu van khong
// duoc, vi viec can lam la MO HO SO DA CO chu khong phai lay lai mat khau.
//
// Bai kiem nay giu hai thu: thong diep phai noi ro ma + ten (de nhan su biet dang mo ho so nao),
// va `chi_tiet` phai du du lieu de giao dien dung duoc lien ket — khong doan chuoi.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MA_LOI_EMAIL_DA_CO_HO_SO, loi_trung_email, type HoSoTrungEmail,
} from '../src/nhan_su/loi_ho_so.ts';

const HSO: HoSoTrungEmail = {
  id: '44641e70-66a1-4145-b894-987bccddef56',
  ma_nv: 'NVVP10260001',
  ho_ten: 'Bùi Khánh Huyền',
  dang_hoat_dong: true,
};

test('thong diep neu ro ma nhan vien, ho ten va email dang dung', () => {
  const { thong_diep } = loi_trung_email('huyen@tranhoangvietnam.com', HSO);
  assert.match(thong_diep, /huyen@tranhoangvietnam\.com/);
  assert.match(thong_diep, /NVVP10260001/);
  assert.match(thong_diep, /Bùi Khánh Huyền/);
  // Phai noi viec can lam, khong chi noi "khong duoc".
  assert.match(thong_diep, /mở hồ sơ đó để sửa/);
});

test('chi_tiet du de giao dien mo dung ho so', () => {
  const { chi_tiet } = loi_trung_email('huyen@tranhoangvietnam.com', HSO);
  assert.equal(chi_tiet.ma, MA_LOI_EMAIL_DA_CO_HO_SO);
  assert.equal(chi_tiet.nhan_vien_id, HSO.id);
  assert.equal(chi_tiet.ma_nv, 'NVVP10260001');
  assert.equal(chi_tiet.ho_ten, 'Bùi Khánh Huyền');
  assert.equal(chi_tiet.dang_hoat_dong, true);
});

test('ho so da nghi viec thi phai noi ro — de khong tuong he thong bao nham', () => {
  const { thong_diep, chi_tiet } = loi_trung_email(
    'cu@tranhoangvietnam.com', { ...HSO, dang_hoat_dong: false });
  assert.match(thong_diep, /đã nghỉ việc/);
  assert.equal(chi_tiet.dang_hoat_dong, false);
});

test('ma nhan vien trong thi chi neu ten, khong de dau gach mo coi', () => {
  const { thong_diep } = loi_trung_email('x@y.z', { ...HSO, ma_nv: '' });
  assert.match(thong_diep, /đã thuộc hồ sơ Bùi Khánh Huyền/);
  assert.doesNotMatch(thong_diep, /—\s*Bùi/);
});
