// Kiem phan THUAN cua luong yeu cau bo sung ho so: moc tinh ky nhac va khung email song ngu.
//
// Sai moc nhac thi hoac nguoi lao dong bi lam phien moi ngay (ho bo qua email va het nhac
// dung luc can), hoac khong bao gio duoc nhac — ca hai deu lam yeu cau vo nghia.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { den_han_nhac, html_nhac_bo_sung } = await import('../src/ho_so/bo_sung.ts');

const NGAY = 86_400_000;

test('den_han_nhac: chua nhac lan nao thi tinh tu luc mo yeu cau', () => {
  const tao = new Date('2026-10-01T08:00:00Z');
  assert.equal(den_han_nhac(null, tao, new Date('2026-10-07T08:00:00Z')), false, 'moi 6 ngay');
  assert.equal(den_han_nhac(null, tao, new Date('2026-10-08T08:00:00Z')), true, 'du 7 ngay');
  assert.equal(den_han_nhac(null, tao, new Date('2026-10-20T08:00:00Z')), true, 'qua han');
});

test('den_han_nhac: da nhac roi thi tinh tu lan nhac cuoi, khong phai tu luc mo', () => {
  const tao = new Date('2026-09-01T08:00:00Z');
  const nhac = new Date('2026-10-20T08:00:00Z');
  assert.equal(den_han_nhac(nhac, tao, new Date('2026-10-26T08:00:00Z')), false, '5 ngay sau nhac');
  assert.equal(den_han_nhac(nhac, tao, new Date('2026-10-27T08:00:00Z')), true, '7 ngay sau nhac');
});

test('den_han_nhac: chu ky doi duoc (nhan su muon nhac 3 ngay/lan)', () => {
  const tao = new Date('2026-10-01T00:00:00Z');
  assert.equal(den_han_nhac(null, tao, new Date('2026-10-03T23:00:00Z'), 3), false);
  assert.equal(den_han_nhac(null, tao, new Date('2026-10-04T00:00:00Z'), 3), true);
  // Chu ky 0 = moi vong deu nhac; dung trong kiem thu, khong dung o production.
  assert.equal(den_han_nhac(null, tao, tao, 0), true);
});

test('html_nhac_bo_sung: liet ke du tai lieu, co han va so lan nhac', () => {
  const html = html_nhac_bo_sung({
    ho_ten: 'Nguyễn Văn A',
    thieu: [{ ma: 'cccd', ten: 'Căn cước công dân' }, { ma: 'hdld', ten: 'Hợp đồng lao động' }],
    han_bo_sung: '2026-11-01',
    ghi_chu: 'Nộp bản gốc',
    lan: 2,
  }, 'vi');

  assert.ok(html.includes('Nguyễn Văn A'));
  assert.ok(html.includes('Căn cước công dân'));
  assert.ok(html.includes('Hợp đồng lao động'));
  assert.ok(html.includes('Hạn bổ sung: 2026-11-01'));
  assert.ok(html.includes('Nộp bản gốc'));
  assert.ok(html.includes('lần nhắc thứ 2'));
  // Huong dan phai noi RO nop o dau — nguoi nhan khong tu tim ra tab Tai lieu trong khu ca nhan.
  assert.ok(html.includes('Cách nộp'));
  assert.ok(html.includes('Hồ sơ của tôi'));
  assert.ok(html.includes('Nộp tệp'));
});

test('html_nhac_bo_sung: ban tieng Trung dung thuat ngu chuan va van giu so lieu', () => {
  const html = html_nhac_bo_sung({
    ho_ten: '王小明',
    thieu: [{ ma: 'cccd', ten: '身份证' }],
    han_bo_sung: null,
    ghi_chu: null,
    lan: 1,
  }, 'zh');

  assert.ok(html.includes('档案补交通知'));
  assert.ok(html.includes('需补交材料'));
  assert.ok(html.includes('身份证'));
  assert.ok(html.includes('第 1 次提醒'));
  assert.ok(html.includes('提交方式'), 'phai co huong dan nop tep bang tieng Trung');
  assert.ok(html.includes('我的档案'));
  assert.ok(!html.includes('补交期限'), 'khong co han thi khong in dong han');
});

test('html_nhac_bo_sung: thoat HTML — ten tai lieu tu CSDL khong duoc chen the', () => {
  const html = html_nhac_bo_sung({
    ho_ten: '<img src=x onerror=alert(1)>',
    thieu: [{ ma: 'x', ten: '<script>alert(2)</script>' }],
    han_bo_sung: null,
    ghi_chu: '<b>dam</b>',
    lan: 1,
  }, 'vi');

  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;b&gt;dam&lt;/b&gt;'));
});

test('html_nhac_bo_sung: so tai lieu lay tu do dai danh sach thuc te', () => {
  const html = html_nhac_bo_sung({
    ho_ten: 'A',
    thieu: [
      { ma: 'a', ten: 'Một' }, { ma: 'b', ten: 'Hai' }, { ma: 'c', ten: 'Ba' },
    ],
    han_bo_sung: null,
    ghi_chu: null,
    lan: 1,
  }, 'vi');
  assert.ok(html.includes('còn 3 tài liệu bắt buộc'));
});

void NGAY;
