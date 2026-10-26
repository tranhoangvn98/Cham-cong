// Onboarding nhan su moi (DTKT 02/2026) — kiem cac ham THUAN: checklist nhap viec, khoa
// chong trung va dinh dang lenh day user xuong may cua. Sai khuon lenh la may cua khong
// hieu — loi chi lo ra khi nguoi moi khong quet duoc cua, nen khoa bang test.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  danh_sach_checklist_nhap_viec, khoa_nhap_viec, khoa_lenh_pin, nhan_vien_tu_khoa_lenh_pin,
  TIEN_TO_MUC_PIN, TEN_MUC_PIN_MAY_CUA, MA_WORKFLOW_NHAP_VIEC,
} = await import('../src/nhan_su/nhap_viec.ts');
const { lenh_cap_nhat_userinfo } = await import('../src/adms/giao_thuc.ts');

test('checklist nhap viec: du 15 muc, muc he thong tick dung quy tac', () => {
  const muc = danh_sach_checklist_nhap_viec(true, 'HĐLĐ 12 tháng', 'bhxh@tranhoangvietnam.com');
  assert.equal(muc.length, 15);
  assert.equal(muc[0]?.ten, 'Tạo tài khoản MS365 + cấp giấy phép');
  assert.equal(muc[0]?.xong, true, 'cap MS365 thi muc 1 tick san');
  assert.equal(muc[1]?.xong, true, 'ERP1 luon tick san');
  assert.equal(muc[2]?.ten, TEN_MUC_PIN_MAY_CUA);
  assert.equal(muc[2]?.xong, false, 'PIN may cua chi tick khi may xac nhan');
  assert.ok((muc[5]?.ten ?? '').includes('HĐLĐ 12 tháng'));
  assert.ok((muc[6]?.ten ?? '').includes('bhxh@tranhoangvietnam.com'));
});

test('checklist nhap viec: khong cap MS365 thi muc 1 khong tick', () => {
  const muc = danh_sach_checklist_nhap_viec(false, null, '');
  assert.equal(muc[0]?.xong, false);
  assert.ok((muc[5]?.ten ?? '').includes('đã khai báo'), 'loai HD rong dung ten mac dinh');
  assert.ok((muc[6]?.ten ?? '').includes('đơn vị dịch vụ BHXH'), 'email BHXH rong dung ten mac dinh');
});

test('checklist nhap viec: muc 3 mang so PIN he thong vua cap', () => {
  const co_pin = danh_sach_checklist_nhap_viec(true, null, '', '1013');
  assert.equal(co_pin[2]?.ten, 'Cấp số PIN 1013 + đẩy xuống máy cửa',
    'nguoi di cai may phai thay dung so PIN, khong phai mo lai ho so');
  // Khong cap PIN (nguoi da co PIN tren may) thi giu nguyen ten cu.
  assert.equal(danh_sach_checklist_nhap_viec(true, null, '', null)[2]?.ten, TEN_MUC_PIN_MAY_CUA);
  assert.equal(danh_sach_checklist_nhap_viec(true, null, '', '   ')[2]?.ten, TEN_MUC_PIN_MAY_CUA);
  // tick_pin_may_cua_nhan khop theo TIEN TO, nen ca hai dang deu phai cung tien to.
  assert.ok(co_pin[2]!.ten.startsWith(TIEN_TO_MUC_PIN));
  assert.ok(TEN_MUC_PIN_MAY_CUA.startsWith(TIEN_TO_MUC_PIN));
});

test('khoa chong trung: viec theo nhan vien, lenh PIN theo tung may', () => {
  assert.equal(khoa_nhap_viec('abc-123'), 'nhap_viec:abc-123');
  assert.equal(khoa_lenh_pin('abc-123', '8116254600435'),
    'nhap_viec_pin:abc-123:8116254600435');
  // Hai may khac nhau phai ra hai khoa khac nhau — neu khong, may thu hai khong bao gio nhan lenh.
  assert.notEqual(khoa_lenh_pin('abc-123', '8116254600435'),
    khoa_lenh_pin('abc-123', '8116254600440'));
  assert.equal(MA_WORKFLOW_NHAP_VIEC, 'nhap_viec_nhan_su');
});

test('doc lai nhan vien tu khoa lenh PIN — dung cho luc may xac nhan lenh', () => {
  for (const id of ['abc-123', '0f8fad5b-d9cb-469f-a165-70867728950e']) {
    assert.equal(nhan_vien_tu_khoa_lenh_pin(khoa_lenh_pin(id, '8116254600435')), id);
  }
  // Khoa cua viec khac khong duoc nhan nham.
  assert.equal(nhan_vien_tu_khoa_lenh_pin(khoa_nhap_viec('abc-123')), null);
  assert.equal(nhan_vien_tu_khoa_lenh_pin(''), null);
});

test('lenh day user xuong may cua: DATA UPDATE USERINFO dung dinh dang khoa=gia tri', () => {
  const lenh = lenh_cap_nhat_userinfo('4002', 'NGUYEN VAN A');
  assert.ok(lenh.startsWith('DATA UPDATE USERINFO\t'));
  assert.ok(lenh.includes('PIN=4002'));
  assert.ok(lenh.includes('Name=NGUYEN VAN A'));
  assert.ok(lenh.includes('Pri=0'));
  assert.ok(lenh.includes('TZ=0000000000000000'));
  // Khong co ky tu xuong dong (mot lenh = mot dong C:ID:CMD).
  assert.ok(!/[\r\n]/.test(lenh));
});
