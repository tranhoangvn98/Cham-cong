// Test don vi module cong viec: quyen/nguon, lich lap dinh ky, han workflow, va ban do
// man/loai cua chuong bao. Toan bo ham thuan — chay duoc trong docker build khong can CSDL.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  nguon_khi_giao, pham_vi_doc, pham_vi_giao, khoa_pham_vi_doc, THU_TU_NGUON,
} from '../src/viec/quyen.ts';
import {
  cac_ngay_lap, lap_trong_thang, ngay_cuoi_thang, type MauDinhKy,
} from '../src/viec/dinh_ky.ts';
import { han_sau, CAC_SU_KIEN } from '../src/viec/workflow.ts';
import { doi_tuong_truy, NHAN_TRANG_THAI } from '../src/tuyen/trang_thai_bao.ts';
import { gio_dia_phuong, ngay_dia_phuong } from '../src/tien_ich/thoi_gian.ts';

// ---------------------------------------------------------------- nguon theo vai tro
test('admin giao viec luon la nguon giam_doc', () => {
  assert.equal(nguon_khi_giao('admin', true), 'giam_doc');
  assert.equal(nguon_khi_giao('admin', false), 'giam_doc');
});

test('truong phong giao cung phong la truong_phong, khac phong la lien_phong', () => {
  assert.equal(nguon_khi_giao('truong_phong', true), 'truong_phong');
  assert.equal(nguon_khi_giao('truong_phong', false), 'lien_phong');
  assert.equal(nguon_khi_giao('truong_phong_nhan_su', false), 'lien_phong');
});

test('nhan vien chi duoc tu tao viec cho minh', () => {
  assert.equal(nguon_khi_giao('nhan_vien', false), 'tu_tao');
});

test('thu tu uu tien nguon dung nhu da chot', () => {
  assert.ok(THU_TU_NGUON['giam_doc']! < THU_TU_NGUON['he_thong']!);
  assert.ok(THU_TU_NGUON['he_thong']! < THU_TU_NGUON['truong_phong']!);
  assert.ok(THU_TU_NGUON['truong_phong']! < THU_TU_NGUON['lien_phong']!);
  assert.ok(THU_TU_NGUON['lien_phong']! < THU_TU_NGUON['tu_tao']!);
  assert.ok(THU_TU_NGUON['tu_tao']! < THU_TU_NGUON['ho_so']!);
});

// ---------------------------------------------------------------- pham vi
test('nhan vien chi xem viec cua minh, khong duoc giao cho nguoi khac', () => {
  const nd = { sub: 'u1', vai_tro: 'nhan_vien', nv: 'nv1' };
  assert.equal(pham_vi_doc(nd), 'cua_minh');
  assert.equal(pham_vi_giao(nd), 'chi_minh');
  assert.match(khoa_pham_vi_doc('cua_minh'), /nhan_vien_id = \$1/);
});

test('truong phong xem viec cua phong minh va duoc giao cho moi nguoi', () => {
  const nd = { sub: 'u2', vai_tro: 'truong_phong', nv: 'tp1' };
  assert.equal(pham_vi_doc(nd), 'phong_minh');
  assert.equal(pham_vi_giao(nd), 'moi_nguoi');
  const khoa = khoa_pham_vi_doc('phong_minh');
  assert.match(khoa, /truong_phong_id = \$1/);
});

// ---------------------------------------------------------------- lich lap dinh ky
function mau(phu: Partial<MauDinhKy>): MauDinhKy {
  return {
    id: 'm1', ten: 'Mau', mo_ta: null, nguoi_giao: null, nhan_vien_id: 'nv',
    nguon: 'truong_phong', quy_tac: 'hang_ngay', cac_thu: [1, 2, 3, 4, 5],
    ngay_trong_thang: [1], so_ngay: null, gio_han: '18:00',
    bat_dau: '2026-09-01', ket_thuc: null, uu_tien: 'thuong', sinh_den: '2026-09-01',
    ...phu,
  };
}

test('hang_ngay: sinh het cac ngay trong khoang', () => {
  const kq = cac_ngay_lap(mau({ quy_tac: 'hang_ngay' }), '2026-09-01', '2026-09-05');
  assert.deepEqual(kq, ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05']);
});

test('hang_tuan: chi sinh cac thu da chon (0=CN)', () => {
  // 2026-09-06 la CN, 2026-09-07 la T2.
  const kq = cac_ngay_lap(mau({ quy_tac: 'hang_tuan', cac_thu: [0, 1] }), '2026-09-06', '2026-09-13');
  assert.deepEqual(kq, ['2026-09-06', '2026-09-07', '2026-09-13']);
});

test('hang_thang: ngay qua dai thi kep vao cuoi thang', () => {
  // Thang 2-2026 co 28 ngay; chon ngay 31 thi sinh dung ngay 28.
  const kq = cac_ngay_lap(mau({ quy_tac: 'hang_thang', ngay_trong_thang: [1, 31] }),
    '2026-02-01', '2026-02-28');
  assert.deepEqual(kq, ['2026-02-01', '2026-02-28']);
  assert.equal(lap_trong_thang('2026-02-28', [31]), true);
  assert.equal(lap_trong_thang('2026-02-27', [31]), false);
  assert.equal(ngay_cuoi_thang('2026-02-15'), 28);
});

test('khoang_ngay: moi N ngay mot lan, moc dau la bat_dau', () => {
  const kq = cac_ngay_lap(mau({ quy_tac: 'khoang_ngay', so_ngay: 3 }), '2026-09-02', '2026-09-12');
  assert.deepEqual(kq, ['2026-09-04', '2026-09-07', '2026-09-10']);
});

test('ket_thuc cua mau gioi han ngay lap', () => {
  const kq = cac_ngay_lap(
    mau({ quy_tac: 'hang_ngay', ket_thuc: '2026-09-03' }), '2026-09-01', '2026-09-10',
  );
  assert.deepEqual(kq, ['2026-09-01', '2026-09-02', '2026-09-03']);
});

test('khoang bat dau sau ket thuc thi khong sinh gi', () => {
  assert.deepEqual(cac_ngay_lap(mau({}), '2026-09-05', '2026-09-01'), []);
});

// ---------------------------------------------------------------- han workflow
test('han_sau: deadline = bay gio + so gio, theo mui gio may cham cong', () => {
  const bay_gio = new Date(Date.UTC(2026, 8, 20, 5, 0));
  const kq = han_sau(bay_gio, 4);
  const mong_doi = new Date(Date.UTC(2026, 8, 20, 9, 0));
  assert.equal(kq.han, ngay_dia_phuong(mong_doi));
  assert.equal(kq.han_gio, gio_dia_phuong(mong_doi));
});

test('danh muc su kien workflow co ma duy nhat va co may mat ket noi', () => {
  const ma = CAC_SU_KIEN.map((x) => x.ma);
  assert.equal(new Set(ma).size, ma.length);
  assert.ok(ma.includes('may_mat_ket_noi'));
});

// ---------------------------------------------------------------- chuong bao
test('chuong bao man cong-viec tra ve doi tuong viec de suy trang thai', () => {
  assert.deepEqual(
    doi_tuong_truy({ man: 'cong-viec', loai: 'giao', viec_id: 'v1' }),
    { bang: 'cong_viec', id: 'v1' },
  );
  assert.equal(NHAN_TRANG_THAI['khong_hoan_thanh'], 'Không hoàn thành');
  assert.equal(NHAN_TRANG_THAI['dang_lam'], 'Đang làm');
  assert.equal(NHAN_TRANG_THAI['hoan_thanh'], 'Đã hoàn thành');
});
