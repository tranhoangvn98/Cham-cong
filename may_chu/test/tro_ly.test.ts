// Kiem phan thuan tuy cua tro ly: nhan dang y dinh + phan tich ngay/don tu cau noi.
//
// Phan tra loi truy van CSDL nam o e2e (test e2e chamcong_test) — o day chi kiem ham khong
// can CSDL, chay duoc ngay trong lan build.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  chuan, nhan_dang_y_dinh, phan_tich_ngay, phan_tich_khoang_nghi,
  phan_tich_loai_nghi, phan_tich_giai_trinh, phan_tich_de_xuat, tu_khoa, ngay_hop_le,
} = await import('../src/ca_nhan/tro_ly.ts');

const HOM_NAY = '2026-09-19';

test('chuan: bo dau va thuong hoa', () => {
  assert.equal(chuan('Xin Nghỉ Phép'), 'xin nghi phep');
  assert.equal(chuan('Đi muộn thế nào'), 'di muon the nao');
});

test('phan_tich_ngay: cac tu tuong doi', () => {
  assert.equal(phan_tich_ngay('hom nay', HOM_NAY), '2026-09-19');
  assert.equal(phan_tich_ngay('ngay mai', HOM_NAY), '2026-09-20');
  assert.equal(phan_tich_ngay('mai', HOM_NAY), '2026-09-20');
  assert.equal(phan_tich_ngay('hom qua', HOM_NAY), '2026-09-18');
  assert.equal(phan_tich_ngay('ngay kia', HOM_NAY), '2026-09-21');
});

test('phan_tich_ngay: dang dd/mm, thieu nam lay nam hien tai', () => {
  assert.equal(phan_tich_ngay('nghi 25/09', HOM_NAY), '2026-09-25');
  assert.equal(phan_tich_ngay('nghi 25/09/2027', HOM_NAY), '2027-09-25');
  assert.equal(phan_tich_ngay('nghi 25-9', HOM_NAY), '2026-09-25');
  assert.equal(phan_tich_ngay('nghi 01/12', HOM_NAY), '2026-12-01');
});

test('phan_tich_ngay: tu choi ngay khong co that', () => {
  assert.equal(phan_tich_ngay('nghi 31/02', HOM_NAY), null);
  assert.equal(phan_tich_ngay('nghi 32/13', HOM_NAY), null);
  assert.equal(phan_tich_ngay('khong noi ngay nao', HOM_NAY), null);
});

test('phan_tich_khoang_nghi: mot ngay va khoang ngay', () => {
  assert.deepEqual(phan_tich_khoang_nghi('xin nghi 25/09', HOM_NAY),
    { tu: '2026-09-25', den: '2026-09-25', nua_ngay: false });
  assert.deepEqual(phan_tich_khoang_nghi('xin nghi tu 25/09 den 28/09', HOM_NAY),
    { tu: '2026-09-25', den: '2026-09-28', nua_ngay: false });
  assert.deepEqual(phan_tich_khoang_nghi('xin nghi hom nay', HOM_NAY),
    { tu: '2026-09-19', den: '2026-09-19', nua_ngay: false });
  assert.deepEqual(phan_tich_khoang_nghi('xin nghi tu ngay mai den ngay kia', HOM_NAY),
    { tu: '2026-09-20', den: '2026-09-21', nua_ngay: false });
});

test('phan_tich_khoang_nghi: nua ngay va khoang nguoc bi tu choi', () => {
  assert.deepEqual(phan_tich_khoang_nghi('xin nghi nua ngay 25/09', HOM_NAY),
    { tu: '2026-09-25', den: '2026-09-25', nua_ngay: true });
  assert.equal(phan_tich_khoang_nghi('xin nghi tu 28/09 den 25/09', HOM_NAY), null);
  assert.equal(phan_tich_khoang_nghi('khong co ngay', HOM_NAY), null);
});

test('phan_tich_loai_nghi: suy dung loai tu cau noi', () => {
  assert.equal(phan_tich_loai_nghi('xin nghi om'), 'om');
  assert.equal(phan_tich_loai_nghi('xin nghi khong luong'), 'khong_luong');
  assert.equal(phan_tich_loai_nghi('nghi viec hieu'), 'hieu');
  assert.equal(phan_tich_loai_nghi('xin nghi phep'), 'phep_nam');
});

test('nhan_dang_y_dinh: y dinh hep thang y dinh rong', () => {
  assert.equal(nhan_dang_y_dinh('xin nghi phep ngay 25/09'), 'xin_nghi_phep');
  assert.equal(nhan_dang_y_dinh('toi con bao nhieu ngay phep'), 'phep');
  assert.equal(nhan_dang_y_dinh('toi quen quet vao hom qua'), 'giai_trinh');
  assert.equal(nhan_dang_y_dinh('di muon bi xu ly the nao'), 'noi_quy');
  assert.equal(nhan_dang_y_dinh('cong thang nay cua toi the nao'), 'cong_thang');
  assert.equal(nhan_dang_y_dinh('huy don nghi phep'), 'huy_don');
  assert.equal(nhan_dang_y_dinh('toi muon de xuat mua ghe'), 'de_xuat');
  assert.equal(nhan_dang_y_dinh('thong bao gi moi nhat'), 'thong_bao');
  assert.equal(nhan_dang_y_dinh('quy dinh ve trang phuc'), 'van_ban');
  assert.equal(nhan_dang_y_dinh(''), 'chao');
});

test('phan_tich_giai_trinh: ngay + ly do + buoi quen quet', () => {
  const kq = phan_tich_giai_trinh('giai trinh quen quet vao ngay 24/09 vì kẹt xe', HOM_NAY);
  assert.equal(kq.ngay, '2026-09-24');
  assert.equal(kq.ly_do, 'kẹt xe');
  assert.equal(kq.quen_vao, true);

  const ra = phan_tich_giai_trinh('quen cham cong ra hom qua', HOM_NAY);
  assert.equal(ra.ngay, '2026-09-18');
  assert.equal(ra.quen_vao, false);
});

test('phan_tich_de_xuat: boc tien to, giu tieu de va noi dung', () => {
  const kq = phan_tich_de_xuat('Đề xuất: mua thêm ghế cho văn phòng');
  assert.equal(kq?.tieu_de, 'mua thêm ghế cho văn phòng');
  assert.equal(phan_tich_de_xuat('ok'), null);
});

test('ngay_hop_le: ngay AI trich ra phai duoc kiem lai', () => {
  assert.equal(ngay_hop_le('2026-09-25'), true);
  assert.equal(ngay_hop_le('2026-02-29'), false);
  assert.equal(ngay_hop_le('2026-13-01'), false);
  assert.equal(ngay_hop_le('25/09/2026'), false);
  assert.equal(ngay_hop_le(''), false);
});

test('tu_khoa: bo tu dung, giu tu co nghia, khong trung lap', () => {
  // Tu duoi 3 ky tu ("xu", "ly") va tu dung ("bi", "the", "nao") bi loai.
  assert.deepEqual(tu_khoa('đi muộn bị xử lý thế nào'), ['di muon', 'muon']);
  assert.deepEqual(tu_khoa('đi muộn đi muộn'), ['di muon', 'muon']);
  // Cum tu nhan dien dai 2 chu van duoc giu; tu "tre" dai 3 ky tu cung giu.
  assert.deepEqual(tu_khoa('đi trễ bị phạt'), ['di tre', 'tre', 'phat']);
});

test('nhan_dang_y_dinh: hoi mau don la tim van ban, khong phai lam don', () => {
  assert.equal(nhan_dang_y_dinh('mẫu đơn xin nghỉ phép ở đâu'), 'van_ban');
  assert.equal(nhan_dang_y_dinh('có biểu mẫu đề xuất nào không'), 'van_ban');
});
