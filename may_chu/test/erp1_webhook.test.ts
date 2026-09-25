// Webhook ERP1 (deactive tai khoan khi nghi viec) — kiem phan THUAN.
//
// Khuon payload duoc khoa bang test vi sai khuon = sai hop dong voi ERP1, va no chi bi
// phat hien khi mot nguoi da nghi van con tai khoan song ben ERP1 — qua muon.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { di_sang_erp1, dung_than_erp1, dung_than_erp1_da_tao } =
  await import('../src/su_kien/hop_thu_di.ts');

const dong = (du_lieu: Record<string, unknown>) => ({
  id: 18234, loai_su_kien: 'erp1.nhan_su.nghi_viec', du_lieu, so_lan: 0,
});

test('dinh tuyen: chi tien to erp1. di sang ERP1, khong lan sang cong hay ERP cu', () => {
  assert.equal(di_sang_erp1('erp1.nhan_su.nghi_viec'), true);
  assert.equal(di_sang_erp1('erp1.nhan_su.da_tao'), true);
  assert.equal(di_sang_erp1('nhan_su.nghi_viec'), false);
  assert.equal(di_sang_erp1('lan_quet.da_ghi'), false);
  assert.equal(di_sang_erp1('ms365.nghi_viec'), false);
});

test('khuon payload: su_kien_id on dinh, du cac dinh danh ERP1 can', () => {
  const than = JSON.parse(dung_than_erp1(dong({
    ma_nv: 'NV0123',
    ma_erp: 'THVN-0456',
    email: 'nguyenvana@tranhoangvietnam.com',
    ngay_nghi_viec: '2026-09-22',
    luc: '2026-09-22T01:05:00.000Z',
  })));
  assert.deepEqual(than, {
    su_kien_id: 'chamcong-18234',
    loai_su_kien: 'erp1.nhan_su.nghi_viec',
    ma_nv: 'NV0123',
    ma_erp: 'THVN-0456',
    email: 'nguyenvana@tranhoangvietnam.com',
    ngay_nghi_viec: '2026-09-22',
    luc: '2026-09-22T01:05:00.000Z',
  });
});

test('khuon payload: truong trong tra null, khong phai chuoi rong', () => {
  const than = JSON.parse(dung_than_erp1(dong({
    ma_nv: 'NV0123', ma_erp: '', email: null, ngay_nghi_viec: '2026-09-22', luc: '',
  })));
  assert.equal(than.ma_erp, null);
  assert.equal(than.email, null);
  assert.equal(than.luc, null);
  assert.equal(than.su_kien_id, 'chamcong-18234');
});

test('su_kien_id ghep tu id dong outbox — khong doi giua cac lan gui lai', () => {
  const mot = JSON.parse(dung_than_erp1(dong({ ma_nv: 'A' })));
  assert.equal(mot.su_kien_id, 'chamcong-18234');
});

// ============================================================ erp1.nhan_su.da_tao

const dong_tao = (du_lieu: Record<string, unknown>) => ({
  id: 21991, loai_su_kien: 'erp1.nhan_su.da_tao', du_lieu, so_lan: 0,
});

test('da_tao: khuon payload du cac dinh danh ERP1 can de thiet lap tai khoan', () => {
  const than = JSON.parse(dung_than_erp1_da_tao(dong_tao({
    ma_nv: 'NV0156',
    ma_erp: 'THVN-0789',
    email: 'tranthib@tranhoangvietnam.com',
    ho_ten: 'Trần Thị Bình',
    so_dien_thoai: '0912345678',
    ngay_vao: '2026-09-22',
    pin_may: '1013',
    chuc_danh: 'Trưởng phòng Kinh doanh',
    phong_ban: 'Kinh doanh',
  })));
  assert.deepEqual(than, {
    su_kien_id: 'chamcong-21991',
    loai_su_kien: 'erp1.nhan_su.da_tao',
    ma_nv: 'NV0156',
    ma_erp: 'THVN-0789',
    email: 'tranthib@tranhoangvietnam.com',
    ho_ten: 'Trần Thị Bình',
    so_dien_thoai: '0912345678',
    ngay_vao: '2026-09-22',
    pin_may: '1013',
    chuc_danh: 'Trưởng phòng Kinh doanh',
    phong_ban: 'Kinh doanh',
  });
});

test('da_tao: truong trong tra null, khong phai chuoi rong', () => {
  const than = JSON.parse(dung_than_erp1_da_tao(dong_tao({
    ma_nv: 'NV0156', ma_erp: '', email: null, ho_ten: 'Trần Thị Bình',
  })));
  assert.equal(than.ma_erp, null);
  assert.equal(than.email, null);
  assert.equal(than.so_dien_thoai, null);
  assert.equal(than.ngay_vao, null);
  assert.equal(than.pin_may, null);
  assert.equal(than.chuc_danh, null);
  assert.equal(than.phong_ban, null);
  assert.equal(than.su_kien_id, 'chamcong-21991');
});
