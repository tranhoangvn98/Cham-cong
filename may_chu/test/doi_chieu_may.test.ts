// Doi chieu user tren may voi nguoi giu PIN trong he thong. Module thuan nen bai kiem chay
// bang du lieu mau — khong can CSDL.
//
// Ten dung trong bai nay lay tu `may_nguoi_dung` that cua may VP (8116254600435) ngay
// 26/10/2026: nhan su go tay ten RUT GON, va do chinh la ly do 42/44 canh bao "PIN lech"
// truoc day la bao dong gia.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { khop_ten_manh, xep_khop } from '../src/dinh_danh/doi_chieu_may.ts';

const KHONG_QUET = 0;
const CO_QUET = 12;

test('ten rut gon van khop voi ho ten day du', () => {
  const truong_hop: [string, string][] = [
    ['Thuyhang', 'Nguyễn Thúy Hằng'],
    ['Hoanganh', 'Nguyễn Thị Hoàng Anh'],
    ['Quynhanh', 'Nguyễn Quỳnh Anh'],
    ['Minhanh', 'Trần Minh Anh'],
    ['Thanhthao', 'Phạm Thanh Thảo'],
    ['Linhdan', 'Nguyễn Linh Đan'],
    ['Huyenanh', 'Trần Huyền Anh'],
    ['Lankt', 'Phan Mai Lan'],
    ['Linhkt', 'Lê Thùy Linh'],
    ['Huongkt', 'Nguyễn Mai Hương'],
    ['Maianhkd', 'Phạm Mai Anh'],
    ['Vietkd', 'Vũ Hoàng Việt'],
    ['Huyenkd', 'Nguyễn Minh Huyền'],
    ['Thaottskt', 'Nguyễn Phương Thảo'],
    ['Nhikd', 'Nguyễn Thị Yến Nhi'],
    ['Trangads', 'Đặng Lê Hà Trang'],
    ['LiChengZhen', 'LI CHENG ZHEN'],
    ['Hoang Thi Thu Hien', 'Hoàng Thị Thu Hiền'],
  ];
  for (const [may, he_thong] of truong_hop) {
    assert.equal(xep_khop(may, 'id', he_thong, true, KHONG_QUET), 'khop', `${may} ~ ${he_thong}`);
  }
});

test('ten tren may la nguoi khac thi van bao lech', () => {
  // PIN 5001 may Kho Trung Quoc: may giu ten nguoi khac han.
  assert.equal(xep_khop('ThanThiVanAnh', 'id', 'Huang Shu Ping', true, KHONG_QUET), 'lech');
  assert.equal(xep_khop('HuangSuPing', 'id', 'XIAZIFENG', true, KHONG_QUET), 'lech');
  assert.equal(xep_khop('Tien', 'id', 'Nguyễn Hải Yến', true, KHONG_QUET), 'lech');
  assert.equal(xep_khop('Sep', 'id', 'Trần Đức Hoàng', true, KHONG_QUET), 'lech');
});

test('PIN chua gan: tach nguoi con quet khoi rac tren may', () => {
  assert.equal(xep_khop('Phuongkt', null, null, null, CO_QUET), 'co_quet_chua_gan');
  assert.equal(xep_khop('Thaokt', null, null, null, KHONG_QUET), 'chua_gan');
});

test('PIN cua nguoi da nghi viec khong bi coi la trung nguoi', () => {
  assert.equal(xep_khop('Nguyen Ngan Ha', 'id', 'Hoàng Minh Ngọc', false, KHONG_QUET), 'da_nghi');
});

test('may khong gui ten nhung PIN da gan thi bao khong ten, khong bao lech', () => {
  assert.equal(xep_khop('', 'id', 'Phan Song Hào', true, KHONG_QUET), 'khong_ten');
  assert.equal(xep_khop(null, 'id', 'Phan Song Hào', true, KHONG_QUET), 'khong_ten');
});

// Ten goi tat (`Sep`, `Tanh`, `Kly`) khong phai gan nham — chi bao "lech" khi ten tren may la
// cua MOT nhan vien khac. `khop_ten_manh` la phep so dung cho viec do: phai ghep duoc tu cac
// tu cua ho ten THEO THU TU va an het ten may.
test('khop_ten_manh: ten may ghep duoc ho ten day du', () => {
  const dung: [string, string][] = [
    ['ThanThiVanAnh', 'Thân Thị Vân Anh'],
    ['NguyenNganHa', 'Nguyễn Ngân Hà'],
    ['XiaZiFeng', 'XIAZIFENG'],
    ['Tien', 'Lê Thị Thủy Tiên'],
  ];
  for (const [may, he_thong] of dung) {
    assert.equal(khop_ten_manh(may, he_thong), true, `${may} ~ ${he_thong}`);
  }
});

test('khop_ten_manh: khong buoc toi ai chi vi ho hay ten dem', () => {
  // `Nguyen Ngan Ha` tung khop voi 19 nguoi ho Nguyen khi dung quy tac "bat dau bang mot tu".
  const sai: [string, string][] = [
    ['Nguyen Ngan Ha', 'Nguyễn Quỳnh Anh'],
    ['Nguyen Ngan Ha', 'Nguyễn Hải Yến'],
    ['Nguyen Ngan Ha', 'Nguyễn Thị Hoàng Anh'],
    ['Nguyen Ngan Ha', 'Nguyễn Tuấn Anh'],
    ['Sep', 'Trần Đức Hoàng'],
    ['Tanh', 'Nguyễn Tuấn Anh'],
    ['Ta', 'Nguyễn Tuấn Anh'],
    ['Kly', 'Trần Khánh Ly'],
  ];
  for (const [may, he_thong] of sai) {
    assert.equal(khop_ten_manh(may, he_thong), false, `${may} KHONG duoc khop ${he_thong}`);
  }
});
