// Bang phan quyen ho so nhan su. Day la noi de ro ri du lieu nhat he thong, nen tung o
// cua bang deu co test rieng — nhat la hai o "truong phong KHONG duoc xem".
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CAC_NHOM, LY_DO_KHONG_THAY_XOA_DUOC, cac_nhom_doc_duoc, chi_duoc_sua_o, doc_duoc,
  la_nguoi_duyet, sua_duoc, thay_xoa_tep_duoc,
  type BoiCanh, type NguoiXem, type NhomHoSo,
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

test('truong phong doc duoc thong tin ca nhan cua cap duoi — nhung o dang DA CHE', () => {
  // Ho can lien he khan cap khi co su co. Con che den dau la viec cua che_du_lieu.ts;
  // o day chi khang dinh ho KHONG bi chan han, neu khong lop che thanh code chet.
  assert.equal(doc_duoc(TRUONG_PHONG, 'thong_tin', CAP_DUOI), true);
  assert.equal(sua_duoc(TRUONG_PHONG, 'thong_tin', CAP_DUOI), false, 'doc duoc nhung khong sua');
});

test('truong phong KHONG doc duoc tai lieu, nguoi phu thuoc, BHXH cua cap duoi', () => {
  for (const nhom of ['tai_lieu', 'nguoi_phu_thuoc', 'bhxh'] as NhomHoSo[]) {
    assert.equal(doc_duoc(TRUONG_PHONG, nhom, CAP_DUOI), false, `${nhom} khong duoc lo ra`);
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

// ==================================================================== thay / go tep da nap
//
// RANH GIOI: nap them mot ban scan la THEM chung cu — nhan su lam hang ngay. Thay hay go
// mot ban DA NAP la LAM MAT chung cu — phai co nguoi chiu trach nhiem.
//
// Ho so nhan su la ho so phap ly: hop dong, CCCD, bang cap, giay kham suc khoe. Khi co
// tranh chap lao dong hay khi co quan BHXH hoi, cai tra loi duoc la ban goc trong kho tep.

test('thay/go tep: TP nhan su duoc', () => {
  assert.equal(thay_xoa_tep_duoc({ vai_tro: 'truong_phong_nhan_su', nv: 'x' }), true);
});

test('thay/go tep: admin duoc — khong bao gio khoa chet he thong', () => {
  assert.equal(thay_xoa_tep_duoc({ vai_tro: 'admin', nv: null }), true);
});

test('thay/go tep: nhan su thuong KHONG duoc, du ho sua duoc moi nhom ho so', () => {
  const nd: NguoiXem = { vai_tro: 'nhan_su', nv: null };
  const bc: BoiCanh = { la_chinh_minh: false, la_cap_tren: false };

  // Ho van sua duoc ho so va van nap duoc tep moi...
  assert.equal(sua_duoc(nd, 'tai_lieu', bc), true);
  assert.equal(sua_duoc(nd, 'hop_dong', bc), true);
  // ...nhung khong go duoc ban da nap.
  assert.equal(thay_xoa_tep_duoc(nd), false);
});

test('thay/go tep: truong phong phong ban khac KHONG duoc', () => {
  // Ho von khong doc duoc ho so nhan su cua cap duoi thi cang khong sua duoc.
  assert.equal(thay_xoa_tep_duoc({ vai_tro: 'truong_phong', nv: 'x' }), false);
});

test('thay/go tep: nguoi lao dong KHONG go duoc tep trong ho so cua CHINH MINH', () => {
  // Quan trong: ho so nhan su la ho so do CONG TY lap va nop cho co quan nha nuoc. Chinh
  // chu khong duoc tu go bang cap hay giay kham suc khoe cua minh ra khoi ho so.
  assert.equal(thay_xoa_tep_duoc({ vai_tro: 'nhan_vien', nv: 'toi' }), false);
});

test('thay/go tep: tai khoan cho duyet KHONG duoc gi', () => {
  assert.equal(thay_xoa_tep_duoc({ vai_tro: 'cho_duyet', nv: null }), false);
});

test('TP nhan su doc va sua duoc ho so nhu nhan su', () => {
  const nd: NguoiXem = { vai_tro: 'truong_phong_nhan_su', nv: 'x' };
  const bc: BoiCanh = { la_chinh_minh: false, la_cap_tren: false };
  for (const nhom of CAC_NHOM) {
    assert.equal(doc_duoc(nd, nhom, bc), true, `TP nhan su phai doc duoc ${nhom}`);
    assert.equal(sua_duoc(nd, nhom, bc), true, `TP nhan su phai sua duoc ${nhom}`);
  }
});

test('ly do tu choi noi ro nap them thi VAN LAM DUOC', () => {
  // Neu chi bao "khong co quyen" thi nhan su se tuong ca viec nap tep cung bi cam.
  assert.match(LY_DO_KHONG_THAY_XOA_DUOC, /Trưởng phòng nhân sự/);
  assert.match(LY_DO_KHONG_THAY_XOA_DUOC, /Nạp thêm tệp vào ô còn trống/);
});

// ==================================================================== rao: mot cho duy nhat
//
// LOI SUYT XAY RA: them vai tro `truong_phong_nhan_su` xong, cau
// `vai_tro === 'admin' || vai_tro === 'nhan_su'` con nam rai o NAM cho khac nhau —
// `can_nhan_su`, `can_nguoi_duyet`, `xem_duoc_tat_ca`, lop che du lieu ca nhan, va bo dem
// don cho duyet. Bo sot mot cho la nguoi do dang nhap vao thay MOT NUA he thong, va nua
// khong thay se im lang y nhu no khong ton tai.
//
// Bai kiem nay doc ma nguon va cam so sanh chuoi vai tro o ngoai module nay.

test('khong tep nao khac duoc so sanh vai_tro === "nhan_su" bang tay', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');

  const GOC = join(import.meta.dirname, '..', 'src');
  const CHO_PHEP = new Set(['bao_mat/quyen_ho_so.ts']);

  function cac_tep(thu_muc: string): string[] {
    const ra: string[] = [];
    for (const m of readdirSync(thu_muc, { withFileTypes: true })) {
      const duong = join(thu_muc, m.name);
      if (m.isDirectory()) ra.push(...cac_tep(duong));
      else if (m.name.endsWith('.ts')) ra.push(duong);
    }
    return ra;
  }

  const pham: string[] = [];
  for (const tep of cac_tep(GOC)) {
    const ten = tep.slice(GOC.length + 1).replace(/\\/g, '/');
    if (CHO_PHEP.has(ten)) continue;
    const ma = readFileSync(tep, 'utf8');
    for (const m of ma.matchAll(/vai_tro\s*===\s*'(nhan_su|admin)'/g)) {
      pham.push(`${ten}: vai_tro === '${m[1]}'`);
    }
  }

  assert.deepEqual(pham, [],
    'So sanh vai tro bang tay o day se BO SOT vai tro nhan su moi.\n'
    + 'Dung `la_vai_tro_nhan_su()` hoac `xem_duoc_tat_ca()` thay vi so sanh chuoi.');
});

test('moi vai tro nhan su deu xem duoc du lieu cua moi nhan vien', async () => {
  const { xem_duoc_tat_ca } = await import('../src/bao_mat/xac_thuc.ts');
  for (const v of ['admin', 'nhan_su', 'truong_phong_nhan_su']) {
    assert.equal(xem_duoc_tat_ca({ vai_tro: v }), true, `${v} phai xem duoc tat ca`);
  }
  for (const v of ['truong_phong', 'nhan_vien', 'cho_duyet']) {
    assert.equal(xem_duoc_tat_ca({ vai_tro: v }), false, `${v} KHONG duoc xem tat ca`);
  }
});

test('moi vai tro nhan su deu xem duoc du lieu ca nhan day du (khong bi che)', async () => {
  const { duoc_xem_day_du } = await import('../src/bao_mat/che_du_lieu.ts');
  for (const v of ['admin', 'nhan_su', 'truong_phong_nhan_su']) {
    assert.equal(duoc_xem_day_du({ vai_tro: v, nv: null }, 'nguoi-khac'), true,
      `${v} phai xem duoc ban day du`);
  }
  // Truong phong phong ban khac thi VAN bi che — do la ranh gioi cu, khong duoc noi ra.
  assert.equal(duoc_xem_day_du({ vai_tro: 'truong_phong', nv: 'tp' }, 'nguoi-khac'), false);
});

test('TP nhan su duyet duoc don tu', () => {
  for (const v of ['admin', 'nhan_su', 'truong_phong_nhan_su', 'truong_phong']) {
    assert.equal(la_nguoi_duyet(v), true, `${v} phai duyet duoc don`);
  }
  assert.equal(la_nguoi_duyet('nhan_vien'), false);
  assert.equal(la_nguoi_duyet('cho_duyet'), false);
});
