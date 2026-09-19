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
  phan_tich_gio, phan_tich_noi_den, phan_tich_noi_dung_khieu_nai, buoi_trong_ngay,
  tra_loi_mo_trang, tra_loi_ung_luong,
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

test('nhan_dang_y_dinh: cac tac vu ca nhan moi', () => {
  assert.equal(nhan_dang_y_dinh('đăng kí OT cho tôi'), 'dang_ky_ot');
  assert.equal(nhan_dang_y_dinh('đăng ký OT ngày 25/09 từ 18:00 đến 20:00'), 'dang_ky_ot');
  assert.equal(nhan_dang_y_dinh('tôi muốn làm thêm giờ'), 'dang_ky_ot');
  assert.equal(nhan_dang_y_dinh('tôi muốn xin đổi ca'), 'doi_ca');
  assert.equal(nhan_dang_y_dinh('xin đi muộn ngày mai'), 'xin_di_muon');
  // Xin VE SOM la yeu cau hanh dong; "ve som may lan" van la cau hoi so lieu.
  assert.equal(nhan_dang_y_dinh('xin về sớm hôm nay'), 'xin_ve_som');
  assert.equal(nhan_dang_y_dinh('tháng này tôi về sớm mấy lần'), 'di_muon');
  assert.equal(nhan_dang_y_dinh('tôi đi công tác từ 26/09 đến 27/09'), 'cong_tac');
  // "nghi viec"/"nghi lam" la xin nghi phep (mot buoi/ngay) — CHI "thoi viec" moi la thoi viec.
  assert.equal(nhan_dang_y_dinh('tôi muốn nghỉ việc'), 'xin_nghi_phep');
  assert.equal(nhan_dang_y_dinh('xin nghỉ làm ngày mai'), 'xin_nghi_phep');
  assert.equal(nhan_dang_y_dinh('tôi muốn xin thôi việc'), 'nghi_viec');
  assert.equal(nhan_dang_y_dinh('nộp đơn thôi việc ngày 25/10'), 'nghi_viec');
  assert.equal(nhan_dang_y_dinh('khiếu nại phiếu lương vì thiếu phụ cấp'), 'khieu_nai_luong');
  assert.equal(nhan_dang_y_dinh('khiếu nại kỷ luật'), 'khieu_nai_ky_luat');
  assert.equal(nhan_dang_y_dinh('ứng lương thế nào'), 'ung_luong');
  // Nghi viec hieu la NGHI CHE DO, khong phai thoi viec.
  assert.equal(nhan_dang_y_dinh('nghỉ việc hiếu'), 'xin_nghi_phep');
});

test('nhan_dang_y_dinh: y dinh cu khong bi lan', () => {
  assert.equal(nhan_dang_y_dinh('tháng này tôi đi muộn mấy lần'), 'di_muon');
  assert.equal(nhan_dang_y_dinh('xin nghỉ phép ngày 25/09'), 'xin_nghi_phep');
  assert.equal(nhan_dang_y_dinh('công tháng này của tôi thế nào'), 'cong_thang');
  assert.equal(nhan_dang_y_dinh('ca làm của tôi'), 'ca_lam');
  // "ot" khop theo tu nguyen, khong bam phai chu khac.
  assert.notEqual(nhan_dang_y_dinh('thời tiết rất tốt'), 'dang_ky_ot');
});

test('nhan_dang_y_dinh: chao hoi va tham hoi nhu nguoi that', () => {
  assert.equal(nhan_dang_y_dinh('chào bạn'), 'chao');
  assert.equal(nhan_dang_y_dinh('hi'), 'chao');
  assert.equal(nhan_dang_y_dinh('alo'), 'chao');
  assert.equal(nhan_dang_y_dinh('cảm ơn nhé'), 'hoi_tham');
  assert.equal(nhan_dang_y_dinh('tạm biệt'), 'hoi_tham');
  assert.equal(nhan_dang_y_dinh('bạn khỏe không'), 'hoi_tham');
  assert.equal(nhan_dang_y_dinh('ăn cơm chưa'), 'hoi_tham');
  assert.equal(nhan_dang_y_dinh('bạn là ai'), 'hoi_tham');
  assert.equal(nhan_dang_y_dinh('mệt quá'), 'hoi_tham');
  assert.equal(nhan_dang_y_dinh('hôm nay chán quá'), 'hoi_tham');
  // Yeu cau mo trang la dieu huong, khong phai cau hoi du lieu.
  assert.equal(nhan_dang_y_dinh('mở đơn của tôi'), 'mo_trang');
  assert.equal(nhan_dang_y_dinh('mở chỗ ứng lương'), 'mo_trang');
  // "den" trong khoang gio KHONG phai yeu cau dieu huong.
  assert.equal(nhan_dang_y_dinh('đăng ký OT ngày 25/09 từ 18:00 đến 20:00'), 'dang_ky_ot');
  // "hi" khop theo tu nguyen: cau chua "nghi" khong bi nham thanh chao.
  assert.notEqual(nhan_dang_y_dinh('xin nghỉ phép ngày mai'), 'chao');
  // Chao kem viec can lam: y dinh viec thang.
  assert.equal(nhan_dang_y_dinh('chào, tôi còn bao nhiêu ngày phép'), 'phep');
});

test('buoi_trong_ngay: chao dung buoi theo mui gio may cham cong', () => {
  assert.equal(buoi_trong_ngay(0), 'toi');
  assert.equal(buoi_trong_ngay(7), 'sang');
  assert.equal(buoi_trong_ngay(11), 'trua');
  assert.equal(buoi_trong_ngay(14), 'chieu');
  assert.equal(buoi_trong_ngay(18), 'toi');
  assert.equal(buoi_trong_ngay(23), 'toi');
});

test('tra_loi_mo_trang: ung luong chi mo cho nhan su/quan tri, nhan vien thi huong dan', () => {
  // Nhan su/quan tri mo duoc trang ung luong ngay ca tu tro ly ca nhan.
  const hr = tra_loi_mo_trang('mở cho cái ứng lương', 'nhan_su');
  assert.equal(hr.y_dinh, 'mo_trang');
  assert.equal(hr.den, '/ung-luong');
  assert.equal(tra_loi_mo_trang('mở chỗ ứng lương', 'admin').den, '/ung-luong');
  // Nhan vien thuong khong co trang de mo — tra loi huong dan, khong tra den.
  const nv = tra_loi_mo_trang('mở cho cái ứng lương', 'nhan_vien');
  assert.equal(nv.den, undefined);
  assert.match(nv.tra_loi, /nhân sự/);
  // Trang thuong thi mo cho moi nguoi.
  assert.equal(tra_loi_mo_trang('mở đơn của tôi', 'nhan_vien').den, '/ca-nhan/don-tu');
});
test('tra_loi_ung_luong: bat duoc tu khoa thi de xuat mo trang cho nhan su', () => {
  // Nhan su/quan tri: tra loi kem nut de xuat mo trang ung luong.
  const hr = tra_loi_ung_luong('nhan_su');
  assert.equal(hr.mo_de_xuat?.den, '/ung-luong');
  assert.equal(tra_loi_ung_luong('admin').mo_de_xuat?.den, '/ung-luong');
  // Nhan vien thuong: chi huong dan, khong co nut mo.
  const nv = tra_loi_ung_luong('nhan_vien');
  assert.equal(nv.mo_de_xuat, undefined);
  assert.match(nv.tra_loi, /nhân sự/);
});
test('phan_tich_gio: doc gio OT tu cau noi', () => {
  assert.deepEqual(phan_tich_gio('đăng ký OT từ 18:00 đến 20:00'),
    { bat_dau: '18:00', ket_thuc: '20:00' });
  assert.deepEqual(phan_tich_gio('từ 18h đến 20h'), { bat_dau: '18:00', ket_thuc: '20:00' });
  assert.deepEqual(phan_tich_gio('làm thêm 2 giờ'), { bat_dau: '02:00', ket_thuc: null });
  assert.deepEqual(phan_tich_gio('6 giờ tối đến 8 giờ tối'),
    { bat_dau: '18:00', ket_thuc: '20:00' });
  assert.deepEqual(phan_tich_gio('từ 2 giờ chiều đến 4 giờ chiều'),
    { bat_dau: '14:00', ket_thuc: '16:00' });
  // Gio vo ly bi bo qua; khong co gio thi ca hai null.
  assert.equal(phan_tich_gio('ngày 25/09').bat_dau, null);
  assert.equal(phan_tich_gio('từ 25:99').bat_dau, null);
});

test('phan_tich_noi_den: boc noi den cua don cong tac', () => {
  assert.equal(phan_tich_noi_den('đi công tác Hà Nội từ 26/09 đến 27/09'), 'Hà Nội');
  assert.equal(phan_tich_noi_den('đi công tác từ 26/09'), null);
  assert.equal(phan_tich_noi_den('đi Cần Thơ vì ký hợp đồng'), 'Cần Thơ');
  assert.equal(phan_tich_noi_den('xin nghỉ phép'), null);
});

test('phan_tich_noi_dung_khieu_nai: boc noi dung, uu tien phan sau "vi"', () => {
  assert.equal(phan_tich_noi_dung_khieu_nai('khiếu nại phiếu lương vì thiếu phụ cấp đi lại'),
    'thiếu phụ cấp đi lại');
  assert.equal(phan_tich_noi_dung_khieu_nai('tôi muốn khiếu nại kỷ luật vì mức phạt chưa đúng'),
    'mức phạt chưa đúng');
  assert.equal(phan_tich_noi_dung_khieu_nai('khiếu nại phiếu lương tháng này: thiếu công'),
    'tháng này: thiếu công');
  assert.equal(phan_tich_noi_dung_khieu_nai('khiếu nại phiếu lương'), null);
});
