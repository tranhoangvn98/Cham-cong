// Trang thai "da xu ly / chua xu ly" cua thong bao rieng — ham thuan, khong cham CSDL.
// Ve y nghia cua cac nhanh `man` xem comment trong src/tuyen/trang_thai_bao.ts.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NHAN_TRANG_THAI, con_xu_ly, doi_tuong_truy, thong_bao_cong_ty_id,
} from '../src/tuyen/trang_thai_bao.ts';

test('doi tuong truy: don theo loai dung bang', () => {
  assert.deepEqual(
    doi_tuong_truy({ man: 'duyet-don', loai: 'nghi_phep', don_id: 'a' }),
    { bang: 'don_nghi_phep', id: 'a' },
  );
  assert.deepEqual(
    doi_tuong_truy({ man: 'don-tu', loai: 'giai_trinh', don_id: 'b' }),
    { bang: 'don_giai_trinh', id: 'b' },
  );
  assert.deepEqual(
    doi_tuong_truy({ man: 'duyet-ot', loai: 'lam_them', don_id: 'c' }),
    { bang: 'don_tu', id: 'c' },
  );
  assert.deepEqual(
    doi_tuong_truy({ man: 'don-tu', loai: 'di_muon', don_id: 'd' }),
    { bang: 'don_tu', id: 'd' },
  );
});

test('doi tuong truy: de xuat va ket qua OT', () => {
  assert.deepEqual(
    doi_tuong_truy({ man: 'duyet-don', loai: 'de_xuat', de_xuat_id: 'e' }),
    { bang: 'de_xuat', id: 'e' },
  );
  assert.deepEqual(
    doi_tuong_truy({ man: 'don-cua-toi', loai: 'de_xuat', de_xuat_id: 'f' }),
    { bang: 'de_xuat', id: 'f' },
  );
  assert.deepEqual(
    doi_tuong_truy({ man: 'duyet-ket-qua-ot', ket_qua_id: 'g' }),
    { bang: 'ket_qua_ot', id: 'g' },
  );
});

test('doi tuong truy: ky luat, khieu nai luong, vi pham', () => {
  assert.deepEqual(
    doi_tuong_truy({ man: 'ky-luat', khieu_nai_id: 'h' }),
    { bang: 'khieu_nai_ky_luat', id: 'h' },
  );
  assert.deepEqual(
    doi_tuong_truy({ man: 'ky-luat', ky: '2026-09', ho_so_id: 'i' }),
    { bang: 'ho_so_ky_luat', id: 'i' },
  );
  assert.deepEqual(
    doi_tuong_truy({ man: 'khieu-nai-luong', khieu_nai_id: 'j' }),
    { bang: 'khieu_nai_luong', id: 'j' },
  );
  assert.deepEqual(
    doi_tuong_truy({ man: 'vi-pham', vi_pham_id: 'k' }),
    { bang: 'vi_pham', id: 'k' },
  );
});

test('doi tuong truy: thuần tin hoac payload la tra null', () => {
  assert.equal(doi_tuong_truy({ man: 'ho_so', nhan_vien_id: 'x', nhom: 'hop_dong' }), null);
  assert.equal(doi_tuong_truy({ man: 'ra-vao', ngay: '2026-09-19', ma_loi: 'QUEN_QUET' }), null);
  assert.equal(doi_tuong_truy({ man: 'ky-luat', ky: '2026-09' }), null);
  assert.equal(doi_tuong_truy({ man: 'duyet-don', loai: 'nghi_phep' }), null);
  assert.equal(doi_tuong_truy(null), null);
  assert.equal(doi_tuong_truy('khong phai doi tuong'), null);
});

test('thong bao cong ty: lay duoc id chi khi man dung', () => {
  assert.equal(thong_bao_cong_ty_id({ man: 'thong-bao', thong_bao_id: 't' }), 't');
  assert.equal(thong_bao_cong_ty_id({ man: 'duyet-don', don_id: 'a' }), null);
  assert.equal(thong_bao_cong_ty_id(null), null);
});

test('nhan trang thai va con xu ly', () => {
  assert.equal(NHAN_TRANG_THAI['cho_duyet'], 'Chờ duyệt');
  assert.equal(NHAN_TRANG_THAI['cho_duyet_2'], 'Chờ duyệt cấp 2');
  assert.equal(NHAN_TRANG_THAI['da_duyet'], 'Đã duyệt');
  assert.equal(con_xu_ly('cho_duyet'), true);
  assert.equal(con_xu_ly('moi'), true);
  assert.equal(con_xu_ly('dang_xem'), true);
  assert.equal(con_xu_ly('cho_giai_trinh'), true);
  assert.equal(con_xu_ly('da_duyet'), false);
  assert.equal(con_xu_ly('tu_choi'), false);
  assert.equal(con_xu_ly(null), false);
});
