// Ghep spec — truong he thong do CODE dien, AI chi dien van xuoi.
//
// Kiem: spec sinh ra co du truong he thong; ten loai dung theo ND30 (cong van rong);
// kiem_tra_spec bat duoc spec hong; noi_dung_hien_thi cho app giong noi dung docx.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ghep_spec, kiem_tra_spec, noi_dung_hien_thi, ten_loai_cua } from '../src/ai/ghep_spec.ts';
import type { TruongHeThong, VanXuatAI } from '../src/ai/kieu.ts';

const HE_THONG: TruongHeThong = {
  co_quan_ban_hanh: 'CÔNG TY TNHH TRẦN HOÀNG VIỆT NAM',
  dia_danh: 'Lạng Sơn',
  ngay: '2026-09-07',
  nguoi_ky: 'Trần Đức Hoàng',
  chuc_vu_nguoi_ky: 'GIÁM ĐỐC',
  noi_nhan: ['Toàn thể cán bộ, nhân viên'],
};

const VAN_AI: VanXuatAI = {
  trich_yeu: 'Về việc đổi phần mềm chấm công',
  kinh_gui: [],
  noi_dung: ['Doan mot.', 'Doan hai.'],
};

test('ghep: truong he thong giu nguyen, so ky hieu null o ban du thao', () => {
  const spec = ghep_spec(HE_THONG, 'thong_bao', 'toan_cong_ty', 'noi_bo', VAN_AI,
    { nhan_vien_id: null, phong_ban_id: null });
  assert.equal(spec.co_quan_ban_hanh, HE_THONG.co_quan_ban_hanh);
  assert.equal(spec.nguoi_ky, HE_THONG.nguoi_ky);
  assert.equal(spec.ngay, '2026-09-07');
  assert.equal(spec.so_ky_hieu, null, 'ban du thao chua co so');
  assert.equal(spec.du_thao, true);
  assert.equal(spec.ten_loai, 'THÔNG BÁO');
});

test('ten_loai_cua: cong van khong in ten loai (ND30)', () => {
  assert.equal(ten_loai_cua('thong_bao'), 'THÔNG BÁO');
  assert.equal(ten_loai_cua('quyet_dinh'), 'QUYẾT ĐỊNH');
  assert.equal(ten_loai_cua('cong_van'), '');
});

test('kiem_tra_spec: bat duoc spec thieu truong he thong', () => {
  const spec = ghep_spec(HE_THONG, 'thong_bao', 'toan_cong_ty', 'noi_bo', VAN_AI,
    { nhan_vien_id: null, phong_ban_id: null });
  assert.deepEqual(kiem_tra_spec(spec), [], 'spec hop le khong co loi');

  const hong = { ...spec, co_quan_ban_hanh: '' };
  assert.ok(kiem_tra_spec(hong).some((l) => l.includes('co_quan_ban_hanh')));

  const ngay_hong = { ...spec, ngay: '07/09/2026' };
  assert.ok(kiem_tra_spec(ngay_hong).some((l) => l.includes('ngay')));
});

test('noi_dung_hien_thi: quyet dinh ghep can cu + Dieu; app va docx cung mot nguon', () => {
  const spec = ghep_spec(HE_THONG, 'quyet_dinh', 'toan_cong_ty', 'noi_bo', {
    trich_yeu: 'Về việc ban hành nội quy lao động',
    kinh_gui: [],
    can_cu: ['Bộ luật Lao động 2019'],
    dieu: ['Moi nguoi phai tuan thu.'],
    noi_dung: ['Giam doc QUYẾT ĐỊNH:'],
  }, { nhan_vien_id: null, phong_ban_id: null });

  const chu = noi_dung_hien_thi(spec);
  assert.ok(chu.includes('Căn cứ Bộ luật Lao động 2019'));
  assert.ok(chu.includes('QUYẾT ĐỊNH:'));
  assert.ok(chu.includes('Điều 1. Moi nguoi phai tuan thu.'));
});

test('noi_dung_hien_thi: dong QUYẾT ĐỊNH in DUNG MOT LAN khi AI viet thanh doan rieng', () => {
  const spec = ghep_spec(HE_THONG, 'quyet_dinh', 'toan_cong_ty', 'noi_bo', {
    trich_yeu: 'Về việc quy định điều kiện hưởng hoa hồng kinh doanh',
    kinh_gui: [],
    can_cu: ['Luật Doanh nghiệp năm 2020'],
    dieu: ['Pham vi ap dung.', 'Dieu kien huong hoa hong.'],
    // AI viet loi dan + dong danh dau thanh HAI phan tu rieng.
    noi_dung: ['Xét đề xuất của Trưởng phòng Kinh doanh.', 'QUYẾT ĐỊNH:'],
  }, { nhan_vien_id: null, phong_ban_id: null });

  const chu = noi_dung_hien_thi(spec);
  const so_lan = (chu.match(/QUYẾT ĐỊNH:/g) ?? []).length;
  assert.equal(so_lan, 1, 'dong danh dau khong duoc nhan doi');
  // Thu tu dung: loi dan -> QUYẾT ĐỊNH: -> Dieu.
  const vi_loi_dan = chu.indexOf('Xét đề xuất');
  const vi_danh_dau = chu.indexOf('QUYẾT ĐỊNH:');
  const vi_dieu = chu.indexOf('Điều 1.');
  assert.ok(vi_loi_dan < vi_danh_dau && vi_danh_dau < vi_dieu,
    'thu tu: loi dan -> QUYẾT ĐỊNH: -> cac Dieu');
});
