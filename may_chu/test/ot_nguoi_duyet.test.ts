// Nguoi duyet don OT: khi nao chuyen Giam doc, va loai don nao duyet xong moi doi bang cong.
//
// Hai ham duoi day la THUAN (khong cham CSDL) nen kiem duoc bang du lieu mau. Chung la cho
// duy nhat quyet dinh hai viec:
//   1. Don OT vao trang thai nao ngay sau khi nhan vien nop (co phai chuyen Giam doc khong).
//   2. Duyet don co phai tinh lai bang cong / bang luong khong.
// Sai o (1) la don nam im khong ai duyet; sai o (2) la bang luong bi dung ngoai y muon.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { la_bac_giam_doc, trang_thai_dau_cua_ot } =
  await import('../src/don_tu/nguoi_duyet_ot.ts');
const { co_doi_bang_cong } = await import('../src/don_tu/loai_don.ts');

// ================================================================ trang thai dau

test('trang thai dau: phong chua gan truong phong thi trinh thang cap 2', () => {
  // Khong co ai duyet cap 1 thi de don cho o cap 1 la de don bi bo quen.
  assert.equal(trang_thai_dau_cua_ot(null, 'nv1'), 'cho_duyet_2');
});

test('trang thai dau: nguoi lap CHINH LA truong phong cua minh thi chuyen Giam doc', () => {
  // Day la lo hong cu: chi chinh ho duyet duoc cap 1, ma `chan_tu_duyet` chan ho.
  assert.equal(trang_thai_dau_cua_ot('nv1', 'nv1'), 'cho_giam_doc');
});

test('trang thai dau: con lai thi cho truong bo phan duyet cap 1', () => {
  assert.equal(trang_thai_dau_cua_ot('nv2', 'nv1'), 'cho_duyet');
});

// ================================================================ bac ho so Giam doc

test('bac ho so Giam doc: chi giam_doc va tong_giam_doc', () => {
  assert.equal(la_bac_giam_doc('giam_doc'), true);
  assert.equal(la_bac_giam_doc('tong_giam_doc'), true);
  assert.equal(la_bac_giam_doc('truong_phong'), false);
  assert.equal(la_bac_giam_doc('nhan_vien'), false);
  assert.equal(la_bac_giam_doc(null), false);
});

// ================================================================ tinh lai bang cong

test('duyet don OT KHONG duoc tinh lai bang cong — chi ket qua OT moi tinh', () => {
  // Yeu cau 1 (09/11/2026): duyet don lam them chi la buoc "dang ky truoc". So phut OT chi vao
  // bang cong khi bang `ket_qua_ot` duoc duyet, nen duyet don khong duoc phep tra ve khoang
  // ngay can tinh lai.
  assert.equal(co_doi_bang_cong('lam_them'), false);
});

test('duyet ba loai don doi ngay cong thi PHAI tinh lai bang cong', () => {
  assert.equal(co_doi_bang_cong('cong_tac'), true);
  assert.equal(co_doi_bang_cong('lam_remote'), true);
  assert.equal(co_doi_bang_cong('ve_som'), true);
});
