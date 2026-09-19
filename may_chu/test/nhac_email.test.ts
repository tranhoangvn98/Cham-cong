// Kiem gom loi cham cong theo ngay cho email nhac nho: di muon / ve som cong don so ngay + tong
// phut; vang dem theo ngay. Nguon la bang_cong_ngay (theo tung ngay), da loc san chi con dong loi.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { gop_theo_nguoi } = await import('../src/ky_luat/nhac_email.ts');
type Dong = Parameters<typeof gop_theo_nguoi>[0][number];

function dong(over: Partial<Dong>): Dong {
  return {
    nhan_vien_id: 'a', ho_ten: 'Nguyen Van A', ma_nv: 'E1', email: 'a@x.com', phong_ban: 'Kinh doanh',
    ngay: '2026-09-08', phut_muon: 0, phut_ve_som: 0, trang_thai: 'co_mat', ...over,
  };
}

test('di muon nhieu ngay: cong don so ngay + tong phut, ngay gan nhat', () => {
  const m = gop_theo_nguoi([
    dong({ ngay: '2026-09-08', phut_muon: 15 }),
    dong({ ngay: '2026-09-10', phut_muon: 10 }),
  ]);
  const g = m.get('a')!.loai.get('di_muon')!;
  assert.equal(g.so_ngay, 2);
  assert.equal(g.tong_phut, 25);
  assert.equal(g.ngay_gan_nhat, '2026-09-10');
  assert.equal(m.get('a')!.tong_ngay_loi, 2);
});

test('mot ngay vua di muon vua ve som = 2 loi', () => {
  const m = gop_theo_nguoi([dong({ phut_muon: 5, phut_ve_som: 8 })]);
  const ng = m.get('a')!;
  assert.equal(ng.loai.get('di_muon')!.so_ngay, 1);
  assert.equal(ng.loai.get('ve_som')!.so_ngay, 1);
  assert.equal(ng.loai.get('ve_som')!.tong_phut, 8);
  assert.equal(ng.tong_ngay_loi, 2);
});

test('vang khong phep: dem theo ngay, khong tinh phut', () => {
  const m = gop_theo_nguoi([
    dong({ ngay: '2026-09-08', trang_thai: 'vang' }),
    dong({ ngay: '2026-09-09', trang_thai: 'vang' }),
  ]);
  const g = m.get('a')!.loai.get('vang')!;
  assert.equal(g.so_ngay, 2);
  assert.equal(g.tong_phut, 0);
});

test('ngay co mat khong loi: khong cong loi nao', () => {
  const m = gop_theo_nguoi([dong({ trang_thai: 'co_mat' })]);
  assert.equal(m.get('a')!.tong_ngay_loi, 0);
});
