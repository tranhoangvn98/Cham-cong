// Bang dac ta cac he thong dinh danh. Module thuan, nen kiem duoc bang du lieu mau.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAC_HE_THONG, MA_CAC_HE_THONG, cac_nhom, chuan_ma, dac_ta_he_thong,
} from '../src/dinh_danh/he_thong.ts';
import { LoiDauVao } from '../src/tien_ich/kiem_tra.ts';

test('moi he thong khai du va khong trung ma', () => {
  assert.ok(CAC_HE_THONG.length >= 7, `chi co ${String(CAC_HE_THONG.length)} he thong`);
  assert.equal(new Set(MA_CAC_HE_THONG).size, MA_CAC_HE_THONG.length, 'trung ma he thong');
  for (const h of CAC_HE_THONG) {
    assert.notEqual(h.ten.trim(), '', `${h.ma} thieu ten`);
    assert.notEqual(h.nhom.trim(), '', `${h.ma} thieu nhom`);
    // Chuan hoa PHAI on dinh khi goi hai lan: `f(f(x)) === f(x)`. Neu khong thi mot ma luu vao
    // roi doc ra chuan hoa lai se khac chinh no, va khong khop voi gi ca.
    for (const mau of ['  Abc-123  ', 'X', 'a@B.com', '000123']) {
      const mot = h.chuan_hoa(mau);
      assert.equal(h.chuan_hoa(mot), mot, `${h.ma}: chuan hoa khong on dinh voi "${mau}"`);
    }
  }
});

test('cac nhom giu dung thu tu khai, khong lap', () => {
  const nhom = cac_nhom();
  assert.equal(new Set(nhom).size, nhom.length);
  assert.equal(nhom[0], 'Hệ thống chấm công', 'nhom dau tien phai la he thong nay');
});

test('PIN may cham cong chi gom chu so', () => {
  // May ZKTeco gui PIN nhu mot chuoi so. Chu cai o day gan nhu chac chan la go nham cot — va
  // mot PIN sai dang thi khong bao gio khop voi lan quet nao, no nam im.
  assert.equal(chuan_ma('may_cham_cong', ' 0123 ').ma_chuan, '0123');
  assert.throws(() => chuan_ma('may_cham_cong', 'A12'), LoiDauVao);
  assert.throws(() => chuan_ma('may_cham_cong', 'Nguyễn Văn A'), LoiDauVao);
  assert.throws(() => chuan_ma('may_cham_cong', '   '), LoiDauVao);
});

test('userId ERP phai la so nguyen duong', () => {
  assert.equal(chuan_ma('erp_cu', '147').ma_chuan, '147');
  assert.throws(() => chuan_ma('erp_cu', '0'), LoiDauVao);
  assert.throws(() => chuan_ma('erp_cu', '-3'), LoiDauVao);
  assert.throws(() => chuan_ma('erp_cu', 'abc'), LoiDauVao);
});

test('Object ID cua Entra phai la UUID', () => {
  const oid = '3F2504E0-4F89-11D3-9A0C-0305E82C3301';
  assert.equal(chuan_ma('microsoft_oid', oid).ma_chuan, oid.toLowerCase());
  assert.throws(() => chuan_ma('microsoft_oid', 'vinh@thvn.com'), LoiDauVao);
  assert.throws(() => chuan_ma('microsoft_oid', '12345'), LoiDauVao);
});

test('email chuan hoa ve chu thuong, va giu nguyen van ban goc', () => {
  const k = chuan_ma('microsoft_email', '  Vinh@TranHoangVietNam.com ');
  assert.equal(k.ma_chuan, 'vinh@tranhoangvietnam.com');
  assert.equal(k.ma, 'Vinh@TranHoangVietNam.com', 'ban nguyen van bi doi');
  assert.throws(() => chuan_ma('microsoft_email', 'vinh'), LoiDauVao);
  assert.throws(() => chuan_ma('microsoft_email', 'vinh@thvn'), LoiDauVao);
});

test('ma noi bo va ma ERP chuan hoa ve chu hoa', () => {
  assert.equal(chuan_ma('noi_bo', ' hr-01 ').ma_chuan, 'HR-01');
  assert.equal(chuan_ma('erp_cu_ma', ' e147 ').ma_chuan, 'E147');
  // Tai khoan ERP thi nguoc lai — ten dang nhap la chu thuong.
  assert.equal(chuan_ma('erp_cu_tai_khoan', ' Vinh ').ma_chuan, 'vinh');
});

test('he thong khong ton tai thi tu choi, kem danh sach nhan duoc', () => {
  assert.throws(() => dac_ta_he_thong('facebook'), (loi: Error) => {
    assert.ok(loi instanceof LoiDauVao);
    assert.match(loi.message, /microsoft_oid/);
    return true;
  });
});

test('chi hai he thong cho NHIEU ma, va do la co y', () => {
  // Nhieu ma la ngoai le, khong phai mac dinh: mot nguoi mot ma ERP, mot ma noi bo. Con PIN may
  // (nhieu may) va email Microsoft (alias) thi nhieu la binh thuong.
  const nhieu = CAC_HE_THONG.filter((h) => h.nhieu_ma).map((h) => h.ma);
  assert.deepEqual(nhieu.sort(), ['may_cham_cong', 'microsoft_email']);
});

test('chi cac ma ON DINH duoc coi la khoa khop nguoi tin duoc', () => {
  // `microsoft_oid` va `erp_cu` khong doi; email va PIN thi doi duoc. Bai kiem nay giu dung cai
  // phan biet do, vi dang nhap Microsoft khop `oid` TRUOC email chinh vi le nay.
  const on_dinh = CAC_HE_THONG.filter((h) => h.on_dinh).map((h) => h.ma);
  assert.deepEqual(on_dinh.sort(), ['erp_cu', 'microsoft_oid']);
});

test('cot_cu va cot_nhan_vien phai noi cung mot chuyen', () => {
  // Hai truong mo ta cung mot cot: `cot_cu` de hien va de doi soat, `cot_nhan_vien` de duong ghi
  // ma biet phai dong bo cot nao. Lech nhau thi doi soat kiem mot cot ma duong ghi sua cot khac.
  for (const h of CAC_HE_THONG) {
    if (h.cot_nhan_vien === null) {
      assert.equal(h.cot_cu, null, `${h.ma}: co cot_cu nhung khong co cot_nhan_vien`);
      assert.equal(h.dong_bo_cot, 'khong', `${h.ma}: dong bo cot ma khong biet cot nao`);
    } else {
      assert.equal(h.cot_cu, `nhan_vien.${h.cot_nhan_vien}`,
        `${h.ma}: cot_cu va cot_nhan_vien khong khop`);
    }
  }
});

test('chi `noi_bo` bi chan khoi trang ma dinh danh', () => {
  // Doi `ma_nv` con keo theo doi ten thu muc kho tep va duong dan SharePoint, nen no chi doi
  // duoc o form ho so. Con lai thi phai sua duoc tu trang ma dinh danh, neu khong thi khong ai
  // gan lai duoc PIN cho nguoi moi.
  const chan = CAC_HE_THONG.filter((h) => h.chi_tu_form_ho_so).map((h) => h.ma);
  assert.deepEqual(chan, ['noi_bo']);
});

test('he thong NHIEU MA ma cot chi chua mot thi khong duoc ghi de bua', () => {
  // `microsoft_email` cho nhieu ma nhung cot `email` chi chua mot: ghi `luon` thi them mot alias
  // se de len email chinh — khoa dang nhap Microsoft duong du phong. Nen no phai la `khi_trong`.
  const ms = CAC_HE_THONG.find((h) => h.ma === 'microsoft_email');
  assert.equal(ms?.nhieu_ma, true);
  assert.equal(ms?.dong_bo_cot, 'khi_trong');

  // `may_cham_cong` thi CO Y ghi `luon` — cot giu PIN moi nhat, va bo tiep nhan ADMS doc bang
  // truoc nen ca cac PIN khac van khop. Cot chi con la duong du phong.
  const pin = CAC_HE_THONG.find((h) => h.ma === 'may_cham_cong');
  assert.equal(pin?.nhieu_ma, true);
  assert.equal(pin?.dong_bo_cot, 'luon');
});
