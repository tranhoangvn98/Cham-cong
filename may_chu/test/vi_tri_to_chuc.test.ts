// Anh xa vi tri (bac) ho so nhan su -> vi tri trong co cau to chuc (bang vi_tri).
// Sai anh xa = ho so va man "Co cau to chuc" noi hai thu tieng khac nhau.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { CAC_VI_TRI, BAC_VI_TRI_TO_CHUC, ma_vi_tri_to_chuc } =
  await import('../src/nhan_su/vi_tri.ts');

test('anh xa du 7 bac, ten giong man Nhan vien, ma tien to bac.', () => {
  assert.equal(BAC_VI_TRI_TO_CHUC.length, CAC_VI_TRI.length);
  for (const v of CAC_VI_TRI) {
    const anh_xa = BAC_VI_TRI_TO_CHUC.find((x) => x.ma === v.ma);
    assert.ok(anh_xa !== undefined, `thieu anh xa cho bac ${v.ma}`);
    assert.equal(anh_xa.ten, v.ten, `ten bac ${v.ma} lech so voi ho so`);
    assert.equal(ma_vi_tri_to_chuc(v.ma), `bac.${v.ma}`);
  }
});

test('cap bac anh xa nam trong tap cap_bac cua bang vi_tri', () => {
  const hop_le = new Set(['cap_cao', 'truong_phong', 'truong_nhom', 'chuyen_vien', 'nhan_vien']);
  for (const x of BAC_VI_TRI_TO_CHUC) {
    assert.ok(hop_le.has(x.cap_bac), `cap bac ${x.cap_bac} khong hop le (bac ${x.ma})`);
  }
});

test('lanh dao cap cao, truong phong/nhom dung bac, con lai quy ve nhan vien', () => {
  const cap: Record<string, string | undefined> =
    Object.fromEntries(BAC_VI_TRI_TO_CHUC.map((x) => [x.ma, x.cap_bac]));
  assert.equal(cap['tong_giam_doc'], 'cap_cao');
  assert.equal(cap['giam_doc'], 'cap_cao');
  assert.equal(cap['truong_phong'], 'truong_phong');
  assert.equal(cap['truong_nhom'], 'truong_nhom');
  assert.equal(cap['nhan_vien'], 'nhan_vien');
  assert.equal(cap['thu_viec'], 'nhan_vien');
  assert.equal(cap['hoc_viec'], 'nhan_vien');
});

test('ma vi tri to chuc khong trung ma JD co san (CEO, TN, 6.1...)', () => {
  const ma_jd = new Set(['CEO', 'TECHLEAD', 'TN', 'TP-CHUNG', 'NV-MOI', '6.1', '23.9']);
  for (const x of BAC_VI_TRI_TO_CHUC) {
    assert.ok(!ma_jd.has(ma_vi_tri_to_chuc(x.ma)), `trung ma JD: bac.${x.ma}`);
  }
});
