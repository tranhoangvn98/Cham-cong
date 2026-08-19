// Kiem bo giai ma giao thuc vContract.
//
// Chuoi base64 trong bai "login that" duoi day CHEP NGUYEN tu tai lieu dac ta v1.0.11
// muc III.1 — khong phai tu sinh ra. Neu bo giai ma doc duoc chuoi do thi doc duoc phan
// hoi that.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  giai_phan_hoi, doc_data, doc_cap_tho, doc_phien, la_thanh_cong, thong_diep_loi,
  boc_tra_loi, suy_trang_thai,
} = await import('../src/vcontract/giao_thuc.ts');

/** Chep nguyen tu tai lieu vContract v1.0.11, muc III.1 "API login tu dong". */
const LOGIN_THAT = 'eyJjb2RlIjoiMjAwIiwibWVzc2FnZSI6Ik9LIiwiZGF0YSI6IntcInRva2VuXCI6XCJleUpo'
  + 'YkdjaU9pSklVelV4TWlKOS5leUp6ZFdJaU9pSXlNVEExTWpBeU1ETTVMVEV5TUNJc0luTmhiSFFpT2lKUlZH'
  + 'ZHpKbEl0YUVKcElpd2laWGh3SWpveE5qSTBNamswT0RBd0xDSnBZWFFpT2pFMk1qTTBOekl3TURJc0luVnpa'
  + 'WEp1WVcxbElqb2lNakV3TlRJd01qQXpPUzB4TWpBaWZRLklNVTdlLTR6U0NZU2w5c1htRk9mN2RHX3V3aTFx'
  + 'QkNXSndoV0l0TmRNa0JVMklFXzQtdlV2emJyNE1WRW9UdG00WDhXNzJTRDRaazNta05IXzVYcnhnXCIsXCJ0'
  + 'ZW5hbnRJZFwiOlwiTlRSbUpTTWtjMEVtS2pFXFx1MDAzZFwiLFwidXNlcklkXCI6XCJOV0UwWm1Ra2FITkJL'
  + 'alE1TUFcXHUwMDNkXFx1MDAzZFwiLFwiZW50ZXJwcmlzZUlkXCI6XCJOVFJtYzBFbUtqUXhPQVxcdTAwM2Rc'
  + 'XHUwMDNkXCIsXCJ1c2VybmFtZVwiOlwiMjEwNTIwMjAzOS0xMjBcIixcImZ1bGxOYW1lXCI6XCJ0ZXN0XCIs'
  + 'XCJpc1BhcmVudFwiOnRydWUsXCJ1c2VyVHlwZVwiOjEsXCJwZXJtaXNzaW9uc1wiOlswLDEsMiwzLDQsNSw2'
  + 'XX0iLCJzdWNjZXNzIjp0cnVlfQ==';

// ================================================================ giai base64
test('login that tu tai lieu: giai base64 ra dung token va enterpriseId', () => {
  const ph = giai_phan_hoi(LOGIN_THAT);
  assert.equal(ph.code, '200');
  assert.equal(la_thanh_cong(ph), true);

  const phien = doc_phien(ph);
  assert.match(phien.token, /^eyJhbGciOiJIUzUxMiJ9\./, 'token phai la JWT cua vContract');
  assert.equal(phien.username, '2105202039-120');
  assert.equal(phien.fullName, 'test');
  assert.ok((phien.enterpriseId ?? '') !== '', 'phai doc duoc enterpriseId');
});

test('phan hoi tra thang JSON (khong boc base64) van doc duoc', () => {
  const ph = giai_phan_hoi('{"code":"200","message":"OK","success":true}');
  assert.equal(la_thanh_cong(ph), true);
});

test('phan hoi rong bao loi ro rang', () => {
  assert.throws(() => giai_phan_hoi(''), /rỗng/);
  assert.throws(() => giai_phan_hoi('   '), /rỗng/);
});

test('base64 giai ra thu khong phai JSON thi bao loi, KHONG tra doi tuong rong', () => {
  const rac = Buffer.from('502 Bad Gateway', 'utf8').toString('base64');
  assert.throws(() => giai_phan_hoi(rac), /không phải JSON/);
});

test('trang HTML loi cua proxy khong bi nham thanh phan hoi hop le', () => {
  assert.throws(() => giai_phan_hoi('<html><body>504</body></html>'));
});

// ================================================================ doc data
test('data la CHUOI JSON — phai giai lop thu hai', () => {
  const ph = { data: '{"token":"abc","userId":"u1"}' };
  assert.deepEqual(doc_data(ph), { token: 'abc', userId: 'u1' });
});

test('data dang tho (khoa khong co nhay kep) — dung tai lieu vContract ghi', () => {
  // Tai lieu dua vi du chinh xac o dang nay, khong phai JSON hop le.
  const o = doc_cap_tho('{token: abc123,tenantId:NTRm,userId:NWE0,permissions:[0,1,2,3]}');
  assert.equal(o['token'], 'abc123');
  assert.equal(o['tenantId'], 'NTRm');
  assert.equal(o['userId'], 'NWE0');
  assert.equal(o['permissions'], undefined, 'mang bi bo qua, khong lam vo phep tach');
});

test('data la null hoac chuoi rong thi tra doi tuong rong, khong nem loi', () => {
  assert.deepEqual(doc_data({ data: null }), {});
  assert.deepEqual(doc_data({ data: 'null' }), {});
  assert.deepEqual(doc_data({}), {});
});

test('login that bai: khong co token thi PHAI nem loi, khong tra phien rong', () => {
  const that_bai = Buffer.from(JSON.stringify({
    code: '0x00110', message: 'Username or password is invalid.', data: 'null', success: false,
  }), 'utf8').toString('base64');

  const ph = giai_phan_hoi(that_bai);
  assert.equal(la_thanh_cong(ph), false);
  assert.match(thong_diep_loi(ph), /0x00110/, 'phai giu ma loi de con tra tai lieu');
  assert.throws(() => doc_phien(ph), /không trả về token/);
});

test('la_thanh_cong: success uu tien hon code', () => {
  assert.equal(la_thanh_cong({ success: true }), true);
  assert.equal(la_thanh_cong({ success: false, code: '200' }), false);
  assert.equal(la_thanh_cong({ code: '200' }), true);
  assert.equal(la_thanh_cong({ code: '0x10012' }), false);
});

// ================================================================ tra loi callback
test('tra loi callback PHAI boc base64 — tra JSON thuong la vContract coi nhu that bai', () => {
  const tl = boc_tra_loi(true, 'OK');
  // Khong duoc la JSON tran.
  assert.equal(tl.startsWith('{'), false);
  const giai = JSON.parse(Buffer.from(tl, 'base64').toString('utf8')) as Record<string, unknown>;
  assert.deepEqual(giai, { message: 'OK', success: true });
});

test('tra loi callback that bai giu nguyen ly do', () => {
  const giai = JSON.parse(
    Buffer.from(boc_tra_loi(false, 'Phải truyền mã requestCode'), 'base64').toString('utf8'),
  ) as Record<string, unknown>;
  assert.equal(giai['success'], false);
  assert.equal(giai['message'], 'Phải truyền mã requestCode');
});

// ================================================================ suy trang thai
test('contractStatus co san thi dung thang', () => {
  assert.equal(suy_trang_thai('CUSTOMER_SIGNED', 'FINISHED'), 'FINISHED');
});

test('thieu contractStatus thi suy tu status', () => {
  assert.equal(suy_trang_thai('DONE_DRAFT', null), 'DRAFT');
  assert.equal(suy_trang_thai('CUSTOMER_SIGNED', null), 'PROCESSING');
  assert.equal(suy_trang_thai('CUSTOMER_REJECTED', null), 'REJECTED');
  assert.equal(suy_trang_thai('USER_REJECTED', undefined), 'REJECTED');
  assert.equal(suy_trang_thai('USER_CANCELLED', null), 'CANCEL');
  assert.equal(suy_trang_thai('DELETE_CONTRACT', null), 'CANCEL');
  assert.equal(suy_trang_thai('MOIT_DONE', null), 'FINISHED');
});

test('status la thi tra null — giu trang thai cu con hon ghi de bang phong doan', () => {
  assert.equal(suy_trang_thai('CAI_GI_DO_MOI', null), null);
  assert.equal(suy_trang_thai(null, null), null);
  assert.equal(suy_trang_thai('REMIND_PROCESS_NOTI', null), null);
});

test('contractStatus la thi bo qua, quay ve suy tu status', () => {
  assert.equal(suy_trang_thai('DONE_DRAFT', 'KHONG_CO_THAT'), 'DRAFT');
});
