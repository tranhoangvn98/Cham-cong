// Test don vi module to chuc: anh xa tan suat -> mau dinh ky, lich lap dai (2 tuan /
// quy / nam / 6 thang), va TINH TOAN VEN cua du lieu JD (296 dau viec phai noi dung
// 23 nhom / 67 tn / 45 vi tri, RACI va ma BC hop le). Toan bo ham thuan.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { quy_tac_cua, tu_dong_sinh_duoc } from '../src/to_chuc/sinh_mau.ts';
import { cac_ngay_lap, type MauDinhKy } from '../src/viec/dinh_ky.ts';
import { CAC_NHOM, CAC_TN, CAC_VI_TRI } from '../src/to_chuc/du_lieu_jd_danh_muc.ts';
import { CAC_DAU_VIEC } from '../src/to_chuc/du_lieu_jd.ts';

function mau(phu: Partial<MauDinhKy>): MauDinhKy {
  return {
    id: 'm1', ten: 'Mau', mo_ta: null, nguoi_giao: null, nhan_vien_id: 'nv',
    nguon: 'jd', quy_tac: 'hang_ngay', cac_thu: [], ngay_trong_thang: [],
    so_ngay: null, gio_han: '18:00', bat_dau: '2026-09-01', ket_thuc: null,
    uu_tien: 'thuong', sinh_den: '2026-09-01', dau_viec_id: null,
    ...phu,
  };
}

// ---------------------------------------------------------------- du lieu JD toan ven
test('JD du 296 dau viec, 23 nhom, 67 tn, 45 vi tri', () => {
  assert.equal(CAC_DAU_VIEC.length, 296);
  assert.equal(CAC_NHOM.length, 23);
  assert.equal(CAC_TN.length, 67);
  assert.equal(CAC_VI_TRI.length, 45);
});

test('moi dau viec noi dung vi tri / nhom / tn co san trong danh muc', () => {
  const vt = new Set(CAC_VI_TRI.map((v) => v.ma));
  const nhom = new Set(CAC_NHOM.map((n) => n.ma));
  const tn = new Set(CAC_TN.filter((t) => t.ma !== null).map((t) => `${t.nhom}:${t.ma}`));
  for (const dv of CAC_DAU_VIEC) {
    assert.ok(vt.has(dv.vt), `vi tri khong ton tai: ${dv.vt} (${dv.ten})`);
    assert.ok(nhom.has(dv.nhom), `nhom khong ton tai: ${dv.nhom} (${dv.ten})`);
    if (dv.tn !== null) {
      assert.ok(tn.has(`${dv.nhom}:${dv.tn}`), `tn khong ton tai: ${dv.nhom}.${dv.tn} (${dv.ten})`);
    }
  }
});

test('RACI chi dung vai tro R/A/C/I va kieu nguoi hop le; co BC thi phai co ma BC', () => {
  const vai_tro = new Set(['R', 'A', 'C', 'I']);
  const kieu = new Set(['ceo', 'tp', 'tn', 'nv_cv', 'tbks']);
  for (const dv of CAC_DAU_VIEC) {
    for (const [v, k] of dv.raci) {
      assert.ok(vai_tro.has(v), `vai tro sai: ${v} (${dv.ten})`);
      assert.ok(kieu.has(k), `kieu nguoi sai: ${k} (${dv.ten})`);
    }
    if (dv.co_bc) {
      assert.ok(dv.ma_bc !== null && dv.ma_bc !== '', `co_bc nhung thieu ma BC (${dv.ten})`);
    }
  }
});

test('moi dau viec co it nhat mot nguoi R', () => {
  for (const dv of CAC_DAU_VIEC) {
    const co_r = dv.raci.some(([v]) => v === 'R');
    assert.ok(co_r, `thieu R (${dv.ten})`);
  }
});

// ---------------------------------------------------------------- anh xa tan suat
test('phat_sinh va lien_tuc khong sinh viec tu dong', () => {
  assert.equal(tu_dong_sinh_duoc('phat_sinh'), false);
  assert.equal(tu_dong_sinh_duoc('lien_tuc'), false);
  assert.equal(tu_dong_sinh_duoc('hang_ngay'), true);
  assert.equal(tu_dong_sinh_duoc('hang_nam'), true);
});

test('anh xa tan suat sang quy tac mau dinh ky', () => {
  assert.equal(quy_tac_cua('hang_ngay').quy_tac, 'hang_ngay');
  assert.equal(quy_tac_cua('hang_tuan').quy_tac, 'hang_tuan');
  assert.deepEqual(quy_tac_cua('hang_tuan').cac_thu, [1]);
  assert.equal(quy_tac_cua('hai_tuan').quy_tac, 'hai_tuan');
  assert.equal(quy_tac_cua('hang_thang').quy_tac, 'hang_thang');
  assert.deepEqual(quy_tac_cua('hang_thang').ngay_trong_thang, [1]);
  assert.equal(quy_tac_cua('hang_quy').quy_tac, 'hang_quy');
  assert.equal(quy_tac_cua('hang_nam').quy_tac, 'hang_nam');
  assert.equal(quy_tac_cua('6_thang').quy_tac, '6_thang');
});

// ---------------------------------------------------------------- lich lap dai
test('hai_tuan: moc 14 ngay ke tu bat_dau', () => {
  const kq = cac_ngay_lap(
    mau({ quy_tac: 'hai_tuan', bat_dau: '2026-09-07' }), '2026-09-07', '2026-10-10',
  );
  assert.deepEqual(kq, ['2026-09-07', '2026-09-21', '2026-10-05']);
});

test('hang_quy: ngay goc lap moi 3 thang', () => {
  const kq = cac_ngay_lap(
    mau({ quy_tac: 'hang_quy', bat_dau: '2026-01-15' }), '2026-01-01', '2026-12-31',
  );
  assert.deepEqual(kq, ['2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15']);
});

test('hang_quy: ngay 31 kep vao cuoi thang thieu ngay', () => {
  const kq = cac_ngay_lap(
    mau({ quy_tac: 'hang_quy', bat_dau: '2026-01-31' }), '2026-01-01', '2026-10-31',
  );
  assert.deepEqual(kq, ['2026-01-31', '2026-04-30', '2026-07-31', '2026-10-31']);
});

test('hang_nam: dung ngay + thang goc, khong lap trong nam', () => {
  // Khoang phai nam trong tran 400 ngay cua danh_sach_ngay.
  const kq = cac_ngay_lap(
    mau({ quy_tac: 'hang_nam', bat_dau: '2026-03-10' }), '2026-03-01', '2027-03-31',
  );
  assert.deepEqual(kq, ['2026-03-10', '2027-03-10']);
});

test('6_thang: ngay goc lap moi 6 thang', () => {
  const kq = cac_ngay_lap(
    mau({ quy_tac: '6_thang', bat_dau: '2026-01-20' }), '2026-01-20', '2027-01-31',
  );
  assert.deepEqual(kq, ['2026-01-20', '2026-07-20', '2027-01-20']);
});

test('lich dai ton trong khoang tu..den va khong sinh truoc tu', () => {
  const kq = cac_ngay_lap(
    mau({ quy_tac: 'hang_quy', bat_dau: '2026-01-15' }), '2026-05-01', '2026-06-30',
  );
  assert.deepEqual(kq, []);
});
