// Test lop chan IP cho /iclock (Task B5).
//
// Phan nay quyet dinh ai duoc phep ghi vao bang cong, tuc la vao co so tinh luong. Sai
// theo huong long tay = ai biet serial may cung day duoc lan quet gia; sai theo huong
// chat tay = may cham cong that bi chan va bang cong dung cap nhat. Ca hai deu nang.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chuan_hoa_ip, doc_danh_sach_ip, ip_duoc_phep } from '../src/tien_ich/dia_chi_ip.ts';

test('danh sach RONG = cho phep tat ca (may chu trong LAN khong phai cau hinh gi)', () => {
  const q = doc_danh_sach_ip('');
  assert.equal(ip_duoc_phep('203.0.113.45', q), true);
  assert.equal(ip_duoc_phep('192.168.1.7', q), true);
  assert.equal(ip_duoc_phep(null, q), true);
});

test('khop mot IPv4 chinh xac', () => {
  const q = doc_danh_sach_ip('203.0.113.45');
  assert.equal(ip_duoc_phep('203.0.113.45', q), true);
  assert.equal(ip_duoc_phep('203.0.113.46', q), false);
  assert.equal(ip_duoc_phep('203.0.113.4', q), false, 'khong duoc khop theo tien to chuoi');
});

test('khop dai CIDR', () => {
  const q = doc_danh_sach_ip('192.168.1.0/24');
  assert.equal(ip_duoc_phep('192.168.1.1', q), true);
  assert.equal(ip_duoc_phep('192.168.1.255', q), true);
  assert.equal(ip_duoc_phep('192.168.2.1', q), false);
});

test('CIDR /32 chi khop dung mot dia chi', () => {
  const q = doc_danh_sach_ip('10.0.0.5/32');
  assert.equal(ip_duoc_phep('10.0.0.5', q), true);
  assert.equal(ip_duoc_phep('10.0.0.6', q), false);
});

test('CIDR /0 khop tat ca IPv4', () => {
  // `0xffffffff << 32` trong JS cho ket qua sai; test nay chan loi do.
  const q = doc_danh_sach_ip('0.0.0.0/0');
  assert.equal(ip_duoc_phep('1.2.3.4', q), true);
  assert.equal(ip_duoc_phep('203.0.113.45', q), true);
});

test('CIDR /8 va /16 tinh dung mat na', () => {
  assert.equal(ip_duoc_phep('10.255.255.255', doc_danh_sach_ip('10.0.0.0/8')), true);
  assert.equal(ip_duoc_phep('11.0.0.1', doc_danh_sach_ip('10.0.0.0/8')), false);
  assert.equal(ip_duoc_phep('172.16.99.1', doc_danh_sach_ip('172.16.0.0/16')), true);
  assert.equal(ip_duoc_phep('172.17.0.1', doc_danh_sach_ip('172.16.0.0/16')), false);
});

test('nhieu muc, phan tach bang dau phay va bo khoang trang', () => {
  const q = doc_danh_sach_ip(' 203.0.113.45 , 192.168.1.0/24 ,, ');
  assert.equal(q.length, 2, 'muc rong bi bo qua');
  assert.equal(ip_duoc_phep('203.0.113.45', q), true);
  assert.equal(ip_duoc_phep('192.168.1.9', q), true);
  assert.equal(ip_duoc_phep('8.8.8.8', q), false);
});

test('IPv4 boc trong IPv6 duoc chuan hoa (Node tra dang nay khi socket la dual-stack)', () => {
  assert.equal(chuan_hoa_ip('::ffff:203.0.113.45'), '203.0.113.45');
  const q = doc_danh_sach_ip('203.0.113.45');
  assert.equal(ip_duoc_phep('::ffff:203.0.113.45', q), true,
    'may that qua dual-stack socket khong duoc bi chan oan');
  // Va nguoc lai: khai bao dang boc, den dang thuong.
  assert.equal(ip_duoc_phep('203.0.113.45', doc_danh_sach_ip('::ffff:203.0.113.45')), true);
});

test('bo vung giao dien khoi IPv6 link-local', () => {
  assert.equal(chuan_hoa_ip('fe80::1%eth0'), 'fe80::1');
});

test('IPv6 khop chinh xac, khong lan sang IPv4', () => {
  const q = doc_danh_sach_ip('2001:db8::1');
  assert.equal(ip_duoc_phep('2001:DB8::1', q), true, 'khong phan biet chu hoa/thuong');
  assert.equal(ip_duoc_phep('2001:db8::2', q), false);
  assert.equal(ip_duoc_phep('203.0.113.45', q), false);
});

test('IP rong hoac null bi chan khi danh sach KHONG rong', () => {
  const q = doc_danh_sach_ip('203.0.113.45');
  assert.equal(ip_duoc_phep(null, q), false);
  assert.equal(ip_duoc_phep(undefined, q), false);
  assert.equal(ip_duoc_phep('', q), false);
});

// Cau hinh sai o lop bao mat phai bao NGAY luc khoi dong, khong im lang cho qua —
// nguoi van hanh se tuong minh da chan trong khi thuc te dang mo.
test('cau hinh sai dinh dang thi nem loi luc doc', () => {
  assert.throws(() => doc_danh_sach_ip('khong-phai-ip'), /khong phai dia chi IP/);
  assert.throws(() => doc_danh_sach_ip('192.168.1.0/33'), /tien to CIDR khong hop le/);
  assert.throws(() => doc_danh_sach_ip('192.168.1.0/-1'), /tien to CIDR khong hop le/);
  assert.throws(() => doc_danh_sach_ip('192.168.1.0/abc'), /tien to CIDR khong hop le/);
  assert.throws(() => doc_danh_sach_ip('2001:db8::/32'), /chi ho tro CIDR cho IPv4/);
  assert.throws(() => doc_danh_sach_ip('999.1.1.1'), /khong phai dia chi IP/);
});
