// Ho thu y kien — ham thuần dung trong email (khong cham CSDL, khong mang).
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { noi_dung_hoan_tat, than_email_ho_thu, type CtxHoThu } from '../src/ho_thu_y_kien/email.ts';
import { html_email_moi_y_kien } from '../src/ho_thu_y_kien/email_du_thao.ts';
import { CAC_LOAI_GOP_Y, NHAN_TRANG_THAI_HO_THU } from '../src/ho_thu_y_kien/nghiep_vu.ts';

const CTX: CtxHoThu = {
  ma: 'HTYK-000001',
  tieu_de: 'Đề xuất thêm quạt',
  ho_ten: 'Nguyễn Văn A',
  ma_nv: 'NVA',
  email: 'a@congty.vn',
  nhan_vien_id: '9f0e9a12-0000-4000-8000-000000000001',
  noi_dung: 'Phòng họp nóng quá.',
};

test('than_email_ho_thu thoat HTML de chong injection', () => {
  const than = than_email_ho_thu({
    goc: '', tieu_de_hop: 'Phản hồi', mau_hop: '#2563EB', mau_vien: '#2563EB', ctx: CTX,
    loi_dan: 'Phòng Nhân sự trả lời:', noi_dung: '<script>alert(1)</script> & xem',
    chan: 'Xem trong ứng dụng.',
  });
  assert.equal(than.includes('<script>'), false);
  assert.ok(than.includes('&lt;script&gt;'));
  assert.ok(than.includes('&amp;'));
  assert.ok(than.includes('HTYK-000001'));
  assert.ok(than.includes('Nguyễn Văn A'));
});

test('than_email_ho_thu: co nut mo app khi co goc web, khong nut khi trong', () => {
  const co = than_email_ho_thu({
    goc: 'https://teams.tranhoangvietnam.com/chamcong', tieu_de_hop: 'Phản hồi',
    mau_hop: '#2563EB', mau_vien: '#2563EB', ctx: CTX, loi_dan: 'x', noi_dung: 'y',
    chan: 'z',
  });
  assert.ok(co.includes('/ca-nhan/y-kien'));
  const khong = than_email_ho_thu({
    goc: '', tieu_de_hop: 'Phản hồi', mau_hop: '#2563EB', mau_vien: '#2563EB', ctx: CTX,
    loi_dan: 'x', noi_dung: 'y', chan: 'z',
  });
  assert.equal(khong.includes('/ca-nhan/y-kien'), false);
});

test('email moi gop y: link kem dung van_ban_id, thoat trich yeu', () => {
  const than = html_email_moi_y_kien({
    goc: 'https://teams.tranhoangvietnam.com/chamcong',
    ma: 'TBN-000012',
    van_ban_id: 'abc-123',
    trich_yeu: 'Về việc <b>nội quy</b> lao động',
    han: '',
  });
  assert.ok(than.includes('/gop-y-du-thao?van_ban_id=abc-123'));
  assert.ok(than.includes('TBN-000012'));
  assert.equal(than.includes('<b>nội quy</b>'), false);
  assert.ok(than.includes('&lt;b&gt;'));
});

test('email moi gop y: khong co goc web thi khong co link', () => {
  const than = html_email_moi_y_kien({
    goc: '', ma: 'TBN-000012', van_ban_id: 'abc-123', trich_yeu: 'Về việc x', han: '',
  });
  assert.equal(than.includes('gop-y-du-thao?van_ban_id'), false);
});

test('email moi gop y: in dong han gop y khi co, khong hien khi rong', () => {
  const co = html_email_moi_y_kien({
    goc: '', ma: 'TBN-000012', van_ban_id: 'abc-123', trich_yeu: 'Về việc x',
    han: '12/10/2026 17:00',
  });
  assert.ok(co.includes('Hạn góp ý: 12/10/2026 17:00'));
  const khong = html_email_moi_y_kien({
    goc: '', ma: 'TBN-000012', van_ban_id: 'abc-123', trich_yeu: 'Về việc x', han: '',
  });
  assert.equal(khong.includes('Hạn góp ý'), false);
});

test('loai gop y chung khong chua du_thao; nhan trang thai du ba gia tri', () => {
  assert.ok(CAC_LOAI_GOP_Y.includes('gop_y'));
  assert.ok(CAC_LOAI_GOP_Y.includes('phan_anh'));
  assert.ok(CAC_LOAI_GOP_Y.includes('yeu_cau'));
  assert.ok(CAC_LOAI_GOP_Y.includes('thac_mac'));
  assert.equal((CAC_LOAI_GOP_Y as readonly string[]).includes('du_thao'), false);
  assert.equal(NHAN_TRANG_THAI_HO_THU.moi, 'Chờ xử lý');
  assert.equal(NHAN_TRANG_THAI_HO_THU.dang_xem, 'Đã tiếp nhận');
  assert.equal(NHAN_TRANG_THAI_HO_THU.da_dong, 'Đã hoàn tất');
});

test('noi dung hoan tat: co ket luan thi trinh ket luan, khong thi loi cam on chung', () => {
  const co = noi_dung_hoan_tat('Đã kiểm tra và sửa xong.');
  assert.equal(co.loi_dan.includes('Kết luận xử lý'), true);
  assert.equal(co.noi_dung, 'Đã kiểm tra và sửa xong.');
  const khong = noi_dung_hoan_tat(null);
  assert.equal(khong.loi_dan.includes('Kết luận xử lý'), false);
  assert.ok(khong.noi_dung.length > 0);
});
