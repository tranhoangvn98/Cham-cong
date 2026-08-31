// Doc CSV do nhan su tai len: dinh dang tu Excel bien doi nhieu hon nguoi ta tuong.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { chuan_hoa_tieu_de, doi_chieu_cot, tach_csv } from '../src/tien_ich/csv.ts';

test('tach dung dau phay va bo dong rong', () => {
  const d = tach_csv('a,b,c\n1,2,3\n\n4,5,6\n');
  assert.deepEqual(d, [['a', 'b', 'c'], ['1', '2', '3'], ['4', '5', '6']]);
});

test('Excel ban tieng Viet xuat dau CHAM PHAY — phai tu nhan ra', () => {
  const d = tach_csv('Mã NV;Họ tên;PIN\nNV001;Nguyễn Văn An;1001');
  assert.deepEqual(d[1], ['NV001', 'Nguyễn Văn An', '1001']);
});

test('nhan ra tep tach bang TAB', () => {
  const d = tach_csv('ma_nv\tho_ten\nNV001\tTran Thi B');
  assert.deepEqual(d[1], ['NV001', 'Tran Thi B']);
});

test('o boc trong dau nhay: giu dau phay va xuong dong ben trong', () => {
  const d = tach_csv('ten,ghi_chu\n"Nguyễn Văn An","Kho A, tầng 2"\n"B","dòng 1\ndòng 2"');
  assert.deepEqual(d[1], ['Nguyễn Văn An', 'Kho A, tầng 2']);
  assert.equal(d[2]?.[1], 'dòng 1\ndòng 2');
});

test('hai dau nhay lien tiep la mot dau nhay', () => {
  const d = tach_csv('a\n"noi ""trong ngoac"" day"');
  assert.equal(d[1]?.[0], 'noi "trong ngoac" day');
});

test('bo BOM UTF-8 o dau tep', () => {
  const d = tach_csv('﻿ma_nv,ho_ten\nNV001,An');
  assert.equal(d[0]?.[0], 'ma_nv', 'BOM khong duoc dinh vao ten cot dau tien');
});

test('ket thuc bang CRLF khong sinh dong rong', () => {
  const d = tach_csv('a,b\r\n1,2\r\n');
  assert.equal(d.length, 2);
});

test('chuan hoa tieu de: bo dau, bo hoa thuong, gop ky tu la', () => {
  assert.equal(chuan_hoa_tieu_de('Mã NV'), 'ma_nv');
  assert.equal(chuan_hoa_tieu_de('  HỌ VÀ TÊN  '), 'ho_va_ten');
  assert.equal(chuan_hoa_tieu_de('Số điện thoại'), 'so_dien_thoai');
  assert.equal(chuan_hoa_tieu_de('PIN máy'), 'pin_may');
  // Chu 'd' co gach ngang phai thanh 'd', khong bien mat.
  assert.equal(chuan_hoa_tieu_de('Địa điểm'), 'dia_diem');
});

test('doi chieu cot theo bi danh, khong phan biet dau va hoa thuong', () => {
  const vt = doi_chieu_cot(
    ['STT', 'MÃ NV', 'Họ và tên', 'PIN máy', 'Bộ phận'],
    {
      ma_nv: ['ma_nv', 'ma nv'],
      ho_ten: ['ho_ten', 'ho va ten'],
      pin_may: ['pin_may', 'pin'],
      phong_ban: ['phong_ban', 'bo phan'],
      email: ['email'],
    },
  );
  assert.equal(vt['ma_nv'], 1);
  assert.equal(vt['ho_ten'], 2);
  assert.equal(vt['pin_may'], 3);
  assert.equal(vt['phong_ban'], 4);
  assert.equal(vt['email'], -1, 'cot khong co phai tra -1, khong duoc doan bua');
});
