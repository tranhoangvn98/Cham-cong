// Dang ky bon loai don, va hai canh bao phap ly.
//
// Module `loai_don.ts` thuan (khong CSDL, khong Fastify) nen kiem duoc tung loai bang du lieu
// mau. Hai canh bao la cho dang chu y nhat: chung dan chieu dieu luat that, va mot con so sai
// o day di vao mot to don co nguoi ky.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CAC_LOAI, MA_LOAI_DON, PHUT_OT_TOI_DA_THANG, canh_bao_bao_truoc, canh_bao_tran_ot, dac_ta,
  ngay_bao_truoc_toi_thieu, phut_lam_them, so_gio_lam_them,
} from '../src/don_tu/loai_don.ts';

// ================================================================ dang ky

test('dang ky: MA_LOAI_DON khop CAC_LOAI', () => {
  // Hai danh sach lech nhau thi mot loai co dac ta ma khong nhan duoc o dau vao (hoac nguoc
  // lai), va trieu chung la "loai don khong hop le" cho mot loai dang hien tren giao dien.
  assert.deepEqual([...MA_LOAI_DON].sort(), CAC_LOAI.map((l) => l.ma).sort());
});

test('dang ky: moi loai co du ten, tieu de, tien to tep', () => {
  for (const l of CAC_LOAI) {
    assert.ok(l.ten.trim() !== '', `${l.ma}: thieu ten`);
    assert.ok(l.tieu_de.trim() !== '', `${l.ma}: thieu tieu de`);
    assert.ok(l.nhan_tu_ngay.trim() !== '', `${l.ma}: thieu nhan cho tu_ngay`);
    // Tien to tep di vao ten tep tren dia, nen KHONG duoc co dau hay dau cach.
    assert.match(l.tien_to_tep, /^[A-Za-z0-9-]+$/,
      `${l.ma}: tien to tep phai khong dau, khong dau cach: ${l.tien_to_tep}`);
  }
});

test('dang ky: tien to tep khong trung nhau', () => {
  const ds = CAC_LOAI.map((l) => l.tien_to_tep);
  assert.equal(new Set(ds).size, ds.length, 'hai loai dung cung tien to ten tep');
});

test('dang ky: loai la thi bao loi liet ke cac loai nhan duoc', () => {
  assert.throws(() => dac_ta('khong_co_that'), /lam_them/);
  assert.throws(() => dac_ta(''), /Loại đơn không hợp lệ/);
});

test('dang ky: thoi viec noi ro tu_ngay la NGAY LAM VIEC CUOI CUNG', () => {
  // Hieu nguoc cho nay la tinh sai han bao truoc theo BLLD Dieu 35.
  assert.match(dac_ta('thoi_viec').nhan_tu_ngay, /cuối cùng/);
});

test('dang ky: chi doi_ca va cong_tac co khoang ngay', () => {
  // `lam_them` va `thoi_viec` la mot ngay. Neu cho chung co khoang ngay thi mot don OT "tu
  // 01/08 den 31/08" duoc tao ra va khong ai biet no nghia la gi.
  assert.equal(dac_ta('lam_them').co_khoang_ngay, false);
  assert.equal(dac_ta('thoi_viec').co_khoang_ngay, false);
  assert.equal(dac_ta('doi_ca').co_khoang_ngay, true);
  assert.equal(dac_ta('cong_tac').co_khoang_ngay, true);
});

// ================================================================ so gio lam them

test('so gio lam them: doc duoc, co ca truong hop le phut', () => {
  assert.equal(so_gio_lam_them('18:00', '20:00'), '2 giờ');
  assert.equal(so_gio_lam_them('18:00', '20:30'), '2 giờ 30 phút');
  assert.equal(so_gio_lam_them('18:00:00', '19:00:00'), '1 giờ');
});

test('so gio lam them: thieu moc hay nguoc thu tu thi tra dau gach', () => {
  assert.equal(so_gio_lam_them(null, '20:00'), '—');
  assert.equal(so_gio_lam_them('18:00', null), '—');
  // Qua nua dem khong xu ly — bo doc dau vao va CSDL deu tu choi, nen khong vao duoc den day.
  assert.equal(so_gio_lam_them('22:00', '02:00'), '—');
  assert.equal(so_gio_lam_them('18:00', '18:00'), '—');
});

test('phut lam them: chi tinh cho loai lam_them', () => {
  assert.equal(phut_lam_them({ loai: 'lam_them', gio_bat_dau: '18:00', gio_ket_thuc: '20:30' }), 150);
  // Cac loai khac co gio (vi du du lieu cu) cung tra 0: gio cua chung khong phai gio lam them.
  assert.equal(phut_lam_them({ loai: 'cong_tac', gio_bat_dau: '18:00', gio_ket_thuc: '20:30' }), 0);
  assert.equal(phut_lam_them({ loai: 'lam_them', gio_bat_dau: null, gio_ket_thuc: '20:30' }), 0);
});

// ================================================================ tran OT (Dieu 107)

test('tran OT: 40 gio mot thang', () => {
  assert.equal(PHUT_OT_TOI_DA_THANG, 2400);
});

test('tran OT: duoi tran thi khong canh bao', () => {
  assert.equal(canh_bao_tran_ot(0, 120), null);
  assert.equal(canh_bao_tran_ot(30 * 60, 10 * 60), null, 'dung 40 gio la CHUA vuot');
});

test('tran OT: vuot tran thi canh bao, co ca hai con so', () => {
  const cb = canh_bao_tran_ot(38 * 60, 3 * 60);
  assert.notEqual(cb, null);
  assert.match(cb!, /41/, 'thieu tong so gio');
  assert.match(cb!, /38/, 'thieu so gio da co');
  assert.match(cb!, /107/, 'thieu dan chieu dieu luat');
  // Phai noi ro la VAN DUYET DUOC: chan cung la chan sai voi nganh duoc 300 gio/nam.
  assert.match(cb!, /duyệt được/);
});

// ================================================================ han bao truoc (Dieu 35)

test('han bao truoc: dung bang cua BLLD 2019 Dieu 35.1', () => {
  assert.equal(ngay_bao_truoc_toi_thieu('khong_xac_dinh', null), 45);
  assert.equal(ngay_bao_truoc_toi_thieu('xac_dinh', 24), 30);
  assert.equal(ngay_bao_truoc_toi_thieu('xac_dinh', 12), 30, 'dung 12 thang la 30 ngay');
  assert.equal(ngay_bao_truoc_toi_thieu('xac_dinh', 6), 3, 'duoi 12 thang la 3 ngay lam viec');
  assert.equal(ngay_bao_truoc_toi_thieu('thu_viec', null), 3);
});

test('han bao truoc: thieu du lieu thi KHONG doan mot con so phap ly', () => {
  assert.equal(ngay_bao_truoc_toi_thieu(null, null), null);
  // thoi_vu / cong_tac_vien / hoc_viec khong nam trong bang cua Dieu 35.1.
  assert.equal(ngay_bao_truoc_toi_thieu('thoi_vu', 3), null);
  assert.equal(ngay_bao_truoc_toi_thieu('cong_tac_vien', null), null);
});

test('canh bao bao truoc: du han thi khong canh bao', () => {
  assert.equal(canh_bao_bao_truoc(45, 45), null, 'dung han la du');
  assert.equal(canh_bao_bao_truoc(60, 45), null);
  // Khong biet han thi khong canh bao — noi "vi pham" khi khong biet la noi bua.
  assert.equal(canh_bao_bao_truoc(1, null), null);
});

test('canh bao bao truoc: thieu han thi canh bao, va noi ro co ngoai le', () => {
  const cb = canh_bao_bao_truoc(10, 45);
  assert.notEqual(cb, null);
  assert.match(cb!, /10/);
  assert.match(cb!, /45/);
  assert.match(cb!, /35/, 'thieu dan chieu dieu luat');
  // Dieu 35.2 co cac truong hop khong can bao truoc — canh bao phai noi ra, khong ket luan.
  assert.match(cb!, /35\.2/);
  assert.match(cb!, /duyệt được/);
});
