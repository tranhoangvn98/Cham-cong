// Bang phan quyen ho so nhan su. Day la noi de ro ri du lieu nhat he thong, nen tung o
// cua bang deu co test rieng — nhat la hai o "truong phong KHONG duoc xem".
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CAC_NHOM, cac_nhom_doc_duoc, chi_duoc_sua_o, doc_duoc, sua_duoc,
  type NhomHoSo,
} from '../src/bao_mat/quyen_ho_so.ts';

const ADMIN = { vai_tro: 'admin', nv: 'a' };
const NHAN_SU = { vai_tro: 'nhan_su', nv: 'b' };
const TRUONG_PHONG = { vai_tro: 'truong_phong', nv: 'tp' };
const NHAN_VIEN = { vai_tro: 'nhan_vien', nv: 'nv' };

const CAP_DUOI = { la_chinh_minh: false, la_cap_tren: true };
const CHINH_MINH = { la_chinh_minh: true, la_cap_tren: false };
const NGUOI_LA = { la_chinh_minh: false, la_cap_tren: false };

test('nhan su va admin doc duoc moi nhom', () => {
  for (const nhom of CAC_NHOM) {
    assert.equal(doc_duoc(ADMIN, nhom, NGUOI_LA), true, `admin phai doc duoc ${nhom}`);
    assert.equal(doc_duoc(NHAN_SU, nhom, NGUOI_LA), true, `nhan su phai doc duoc ${nhom}`);
  }
});

test('TRUONG PHONG KHONG duoc doc khieu nai cua cap duoi', () => {
  // O quan trong nhat cua ca bang: khieu nai rat thuong nham vao chinh nguoi quan ly
  // truc tiep. Cho ho doc duoc thi khong ai dam gui.
  assert.equal(doc_duoc(TRUONG_PHONG, 'khieu_nai', CAP_DUOI), false);
  assert.equal(sua_duoc(TRUONG_PHONG, 'khieu_nai', CAP_DUOI), false);
});

test('truong phong khong duoc doc luong, hop dong, bien ban cua cap duoi', () => {
  for (const nhom of ['luong', 'hop_dong', 'bien_ban'] as NhomHoSo[]) {
    assert.equal(doc_duoc(TRUONG_PHONG, nhom, CAP_DUOI), false, `${nhom} khong duoc lo ra`);
  }
});

test('truong phong doc duoc cong viec, bao cao, thiet bi cua cap duoi', () => {
  for (const nhom of ['cong_viec', 'bao_cao', 'thiet_bi'] as NhomHoSo[]) {
    assert.equal(doc_duoc(TRUONG_PHONG, nhom, CAP_DUOI), true, `${nhom} phai xem duoc`);
  }
});

test('truong phong KHONG dong nghia voi doc duoc moi nguoi trong cong ty', () => {
  for (const nhom of CAC_NHOM) {
    assert.equal(doc_duoc(TRUONG_PHONG, nhom, NGUOI_LA), false,
      `nguoi khong thuoc phong minh: ${nhom} phai bi chan`);
  }
});

test('nhan vien doc duoc toan bo ho so cua CHINH MINH', () => {
  for (const nhom of CAC_NHOM) {
    assert.equal(doc_duoc(NHAN_VIEN, nhom, CHINH_MINH), true, `chinh minh phai xem duoc ${nhom}`);
  }
});

test('nhan vien khong doc duoc gi cua nguoi khac', () => {
  for (const nhom of CAC_NHOM) {
    assert.equal(doc_duoc(NHAN_VIEN, nhom, NGUOI_LA), false, `${nhom} cua nguoi khac phai bi chan`);
  }
});

test('nhan vien KHONG tu sua duoc hop dong, luong, thiet bi cua chinh minh', () => {
  // Doc duoc khong co nghia la sua duoc: day la ho so do cong ty lap.
  for (const nhom of ['hop_dong', 'bien_ban', 'luong', 'thiet_bi'] as NhomHoSo[]) {
    assert.equal(doc_duoc(NHAN_VIEN, nhom, CHINH_MINH), true, `${nhom}: van phai xem duoc`);
    assert.equal(sua_duoc(NHAN_VIEN, nhom, CHINH_MINH), false, `${nhom}: khong duoc tu sua`);
  }
});

test('nhan vien PHAI tu gui duoc khieu nai va bao cao cua minh', () => {
  // Neu chan cho nay thi hai muc do khong con y nghia gi.
  assert.equal(sua_duoc(NHAN_VIEN, 'khieu_nai', CHINH_MINH), true);
  assert.equal(sua_duoc(NHAN_VIEN, 'bao_cao', CHINH_MINH), true);
  assert.equal(sua_duoc(NHAN_VIEN, 'cong_viec', CHINH_MINH), true);
});

test('nhan vien chi sua duoc mot so o tren ban ghi cua minh', () => {
  const o_cong_viec = chi_duoc_sua_o(NHAN_VIEN, 'cong_viec', CHINH_MINH);
  assert.deepEqual(o_cong_viec, ['trang_thai', 'ket_qua']);
  assert.ok(!o_cong_viec!.includes('han'), 'khong duoc tu doi han cong viec');
  assert.ok(!o_cong_viec!.includes('nhan_vien_id'), 'khong duoc day viec sang nguoi khac');

  const o_khieu_nai = chi_duoc_sua_o(NHAN_VIEN, 'khieu_nai', CHINH_MINH);
  assert.ok(!o_khieu_nai!.includes('trang_thai'),
    'khong duoc tu ket luan khieu nai cua chinh minh la da giai quyet');
  assert.ok(!o_khieu_nai!.includes('phan_hoi'), 'khong duoc tu viet phan hoi cua cong ty');
});

test('nhan su khong bi gioi han o nao', () => {
  assert.equal(chi_duoc_sua_o(NHAN_SU, 'cong_viec', NGUOI_LA), null);
  assert.equal(chi_duoc_sua_o(TRUONG_PHONG, 'cong_viec', CAP_DUOI), null);
});

test('danh sach nhom doc duoc khop voi doc_duoc tung nhom', () => {
  for (const [nd, bc] of [
    [ADMIN, NGUOI_LA], [TRUONG_PHONG, CAP_DUOI], [NHAN_VIEN, CHINH_MINH], [NHAN_VIEN, NGUOI_LA],
  ] as const) {
    const ds = cac_nhom_doc_duoc(nd, bc);
    for (const nhom of CAC_NHOM) {
      assert.equal(ds.includes(nhom), doc_duoc(nd, nhom, bc),
        `${nd.vai_tro}/${nhom}: danh sach tab va quy tac doc phai noi cung mot dieu`);
    }
  }
});

test('truong phong cua chinh minh van doc duoc luong cua minh', () => {
  // Truong phong cung la nhan vien: ho so cua chinh ho thi ho xem duoc, ke ca luong.
  assert.equal(doc_duoc(TRUONG_PHONG, 'luong', CHINH_MINH), true);
  assert.equal(doc_duoc(TRUONG_PHONG, 'khieu_nai', CHINH_MINH), true);
  assert.equal(sua_duoc(TRUONG_PHONG, 'luong', CHINH_MINH), false);
});
