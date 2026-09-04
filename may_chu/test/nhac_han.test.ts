// Nhac han hop dong: chon moc, va soan loi nhac.
//
// Phan quan trong nhat o day khong phai "co nhac khong" ma la "nhac BAO NHIEU LAN". Mot
// he thong nhac han sai cach se gui bon thong bao cho mot hop dong, roi gui lai moi 15
// phut — va nguoi nhan se tat thong bao, va tu do khong con nhac han nao den duoc ai.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MOC_CHINH, MOC_THU_VIEC, loi_nhac, moc_can_nhac, moc_cho_loai, muc_gap,
  type HopDongSapHan,
} from '../src/hop_dong/nhac_han.ts';

function hd(sua: Partial<HopDongSapHan> = {}): HopDongSapHan {
  return {
    id: 'x', nhan_vien_id: 'y', ma_nv: 'NV01', ho_ten: 'Nguyễn Văn A',
    so_hd: '07/2026/HĐLĐ-TPVN', loai: 'xac_dinh', chuc_danh: 'Chuyên viên',
    hieu_luc_den: '2026-09-30', so_ngay_con: 30, da_nhac_han: [], so_hd_xac_dinh: 1,
    ...sua,
  };
}

// ---------------------------------------------------------------- chon moc

test('chua toi moc nao thi khong nhac', () => {
  assert.deepEqual(moc_can_nhac(60, [], MOC_CHINH), []);
  assert.deepEqual(moc_can_nhac(46, [], MOC_CHINH), []);
});

test('vua cham moc thi nhac dung moc do', () => {
  assert.deepEqual(moc_can_nhac(45, [], MOC_CHINH), [45]);
  assert.deepEqual(moc_can_nhac(30, [45], MOC_CHINH), [30]);
  assert.deepEqual(moc_can_nhac(15, [45, 30], MOC_CHINH), [15]);
});

test('da nhac roi thi khong nhac lai — day la ranh giua "nhac" va "spam"', () => {
  assert.deepEqual(moc_can_nhac(30, [45, 30], MOC_CHINH), []);
  assert.deepEqual(moc_can_nhac(1, [45, 30, 15, 7], MOC_CHINH), []);
});

test('hop dong nhap muon: tra VE HET moc da qua, de chi gui MOT thong bao', () => {
  // Nhap vao he thong khi chi con 3 ngay. Neu chi tra [7] thi vong sau se thay 15 chua
  // nhac va nhac tiep, roi 30, roi 45 — bon thong bao cho mot hop dong.
  assert.deepEqual(moc_can_nhac(3, [], MOC_CHINH), [45, 30, 15, 7]);
});

test('da het han thi moc 0 cung duoc tinh la da cham', () => {
  assert.deepEqual(moc_can_nhac(-5, [], MOC_CHINH), [45, 30, 15, 7, 0]);
  // Va da nhac het thi im.
  assert.deepEqual(moc_can_nhac(-40, [45, 30, 15, 7, 0], MOC_CHINH), []);
});

test('thu viec dung bo moc rieng — 45/30 ngay vo nghia voi hop dong hai tuan', () => {
  assert.equal(moc_cho_loai('thu_viec'), MOC_THU_VIEC);
  assert.equal(moc_cho_loai('hoc_viec'), MOC_THU_VIEC);
  assert.equal(moc_cho_loai('xac_dinh'), MOC_CHINH);
  assert.equal(moc_cho_loai('thoi_vu'), MOC_CHINH);
  assert.equal(moc_cho_loai(null), MOC_CHINH);

  // Thu viec con 10 ngay: chua toi moc nao. Bo moc chinh se da nhac tu 45 ngay truoc —
  // tuc la truoc ca khi hop dong bat dau.
  assert.deepEqual(moc_can_nhac(10, [], MOC_THU_VIEC), []);
  assert.deepEqual(moc_can_nhac(7, [], MOC_THU_VIEC), [7]);
  assert.deepEqual(moc_can_nhac(3, [7], MOC_THU_VIEC), [3]);
});

test('moc 15 ngay — han luat Dieu 45 — nam trong bo moc chinh', () => {
  // Neu ai do sua bo moc va bo mat 15, cong ty se bo sot han thong bao bang van ban.
  assert.ok(MOC_CHINH.includes(15));
});

// ---------------------------------------------------------------- muc gap

test('muc gap doi theo so ngay con lai', () => {
  assert.equal(muc_gap(40), 'som');
  assert.equal(muc_gap(16), 'som');
  assert.equal(muc_gap(15), 'gap');
  assert.equal(muc_gap(8), 'gap');
  assert.equal(muc_gap(7), 'rat_gap');
  assert.equal(muc_gap(0), 'rat_gap');
  assert.equal(muc_gap(-1), 'da_het_han');
});

// ---------------------------------------------------------------- loi nhac

test('loi nhac noi so ngay THAT, khong noi theo moc', () => {
  // Hop dong con 3 ngay, moc vua cham la 7. Nguoi doc can biet "3", khong phai "7".
  const l = loi_nhac(hd({ so_ngay_con: 3 }));
  assert.match(l.tieu_de, /còn 3 ngày/);
  assert.equal(l.tieu_de.includes('7'), false);
});

test('trong 15 ngay thi loi nhac dan Dieu 45', () => {
  assert.match(loi_nhac(hd({ so_ngay_con: 15 })).noi_dung, /Điều 45/);
  assert.match(loi_nhac(hd({ so_ngay_con: 7 })).noi_dung, /Điều 45/);
  // Ngoai 15 ngay thi chua toi han luat, khong dan cho roi.
  assert.equal(loi_nhac(hd({ so_ngay_con: 30 })).noi_dung.includes('Điều 45'), false);
});

test('het han hom nay noi ro la HOM NAY', () => {
  const l = loi_nhac(hd({ so_ngay_con: 0 }));
  assert.match(l.tieu_de, /HÔM NAY/);
});

test('da het han: dem nguoc 30 ngay cua Dieu 20.2', () => {
  const l = loi_nhac(hd({ so_ngay_con: -10 }));
  assert.match(l.tieu_de, /ĐÃ HẾT HẠN 10 ngày/);
  // Con 20 ngay truoc khi hop dong tu doi thanh khong xac dinh thoi han.
  assert.match(l.noi_dung, /Còn 20 ngày/);
  assert.match(l.noi_dung, /Điều 20\.2/);
});

test('qua 30 ngay: noi thang la hop dong DA doi loai, khong dem nguoc so am', () => {
  const l = loi_nhac(hd({ so_ngay_con: -45 }));
  assert.match(l.noi_dung, /đã trở thành không xác định thời hạn/);
  assert.equal(/Còn -\d+ ngày/.test(l.noi_dung), false);
});

test('loi nhac luon co ma nhan vien va ho ten — de doc tren man hinh khoa', () => {
  const l = loi_nhac(hd({ ma_nv: 'HR-01', ho_ten: 'Trần Thị B', so_ngay_con: 15 }));
  assert.match(l.tieu_de, /HR-01/);
  assert.match(l.tieu_de, /Trần Thị B/);
});

test('hop dong khong co so thi loi nhac van doc duoc, khong co ngoac rong', () => {
  const l0 = loi_nhac(hd({ so_hd: null, so_ngay_con: 15 }));
  assert.ok(l0 !== null);

  // Dieu 20.2c: HD xac dinh lan 2 tro len -> canh bao buoc chuyen khong xac dinh thoi han.
  const lan2 = loi_nhac(hd({ loai: 'xac_dinh', so_hd_xac_dinh: 2, so_ngay_con: 15 }));
  assert.match(lan2.noi_dung, /20\.2c/);
  assert.match(lan2.noi_dung, /không xác định thời hạn/);
  // Lan 1 thi khong canh bao 20.2c.
  const lan1 = loi_nhac(hd({ loai: 'xac_dinh', so_hd_xac_dinh: 1, so_ngay_con: 15 }));
  assert.equal(lan1.noi_dung.includes('20.2c'), false);
  const l = loi_nhac(hd({ so_hd: null, so_ngay_con: 15 }));
  assert.equal(l.noi_dung.includes('()'), false);
  assert.match(l.noi_dung, /Hợp đồng hết hạn/);
});
