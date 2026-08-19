// Trich noi dung hop dong: DOCX -> chu, PDF co lop chu -> chu, ban scan -> OCR.
//
// KHONG MOCK CAC CONG CU. Cai de sai nhat o day khong phai logic dieu huong ma la co dong
// lenh: `pdftotext` mac dinh tra ve Latin-1 (tieng Viet thanh dau hoi neu thieu
// `-enc UTF-8`), va `tesseract` hieu 'vie' la tep cau hinh neu `-l vie` dat sau ten dinh
// dang dau ra. Mock thi ca hai loi do deu di qua test.
//
// Vi the: nhung bai can `pdftotext` / `tesseract` se TU BO QUA khi may khong co chuong
// trinh do, co kem ly do. Bo qua CO TIENG chu khong bo qua im lang — de tren may lap trinh
// nguoi doc thay ro minh dang khong kiem phan nao.
//
// Tep thu `tep_thu/hop_dong_scan.jpg`: mot trang hop dong tieng Viet ket xuat thanh anh
// (DejaVu Serif 28px, anh xam 900x300, JPEG q85). Day la ban scan gia lap nhung la ANH
// THAT — OCR phai doc duoc no.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { join } from 'node:path';

import {
  KY_TU_TOI_DA, LoiDinhDang, TOI_THIEU_CO_CHU, cat_ve_tran, chuan_van_ban, cong_cu_trich,
  duong_trich, ocr_anh, trich_pdf_text, trich_tu_tep,
} from '../src/hop_dong/trich_noi_dung.ts';
import { LoiLenhNgoai, LoiThieuCongCu, chay_lenh, co_cong_cu } from '../src/tien_ich/lenh_ngoai.ts';

const THU_MUC_TEP = join(import.meta.dirname, 'tep_thu');
const ANH_SCAN = readFileSync(join(THU_MUC_TEP, 'hop_dong_scan.jpg'));

// ---------------------------------------------------------------- dung tep PDF trong test

/**
 * Dung mot tep PDF toi thieu nhung HOP LE tu than cac doi tuong.
 *
 * `pdftotext` doi bang xref dung byte, nen phai dem offset that — khong the ghep chuoi bua.
 */
function tao_pdf(than: string[], goc = 1): Buffer {
  const phan: Buffer[] = [Buffer.from('%PDF-1.4\n', 'latin1')];
  const cho: number[] = [];
  let dai = phan[0]!.length;

  than.forEach((t, i) => {
    cho.push(dai);
    const b = Buffer.from(`${String(i + 1)} 0 obj\n${t}\nendobj\n`, 'latin1');
    phan.push(b);
    dai += b.length;
  });

  const cho_xref = dai;
  let xref = `xref\n0 ${String(than.length + 1)}\n0000000000 65535 f \n`;
  for (const c of cho) xref += `${String(c).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${String(than.length + 1)} /Root ${String(goc)} 0 R >>\n`
    + `startxref\n${String(cho_xref)}\n%%EOF\n`;

  phan.push(Buffer.from(xref, 'latin1'));
  return Buffer.concat(phan);
}

/** PDF mot trang co lop chu that (font co san Helvetica, nen chi ASCII). */
function pdf_co_chu(cac_dong: string[]): Buffer {
  let noi_dung = 'BT /F1 14 Tf\n';
  cac_dong.forEach((d, i) => {
    // Dau ngoac trong chuoi PDF phai duoc thoat, neu khong se dong chuoi som.
    const an_toan = d.replace(/[\\()]/g, (c) => `\\${c}`);
    noi_dung += `1 0 0 1 50 ${String(780 - i * 24)} Tm (${an_toan}) Tj\n`;
  });
  noi_dung += 'ET\n';

  return tao_pdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] '
      + '/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    // `/Encoding /WinAnsiEncoding` la BAT BUOC. Bo di thi PDF dung StandardEncoding, va
    // byte 0xE9 se ra 'Ø' (Oslash) thay vi 'é' — mot cai bay de tuong la loi giai ma.
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${String(Buffer.byteLength(noi_dung, 'latin1'))} >>\n`
      + `stream\n${noi_dung}endstream`,
  ]);
}

/** Doc kich thuoc anh JPEG tu dau hieu SOF. Can de khai /Width /Height trong PDF. */
function co_jpeg(du_lieu: Buffer): { rong: number; cao: number } {
  let i = 2;
  while (i + 9 < du_lieu.length) {
    if (du_lieu[i] !== 0xff) { i++; continue; }
    const ma = du_lieu[i + 1]!;
    // SOF0..SOF3 va SOF5..SOF15, tru cac dau hieu khong phai SOF.
    if (ma >= 0xc0 && ma <= 0xcf && ma !== 0xc4 && ma !== 0xc8 && ma !== 0xcc) {
      return { cao: du_lieu.readUInt16BE(i + 5), rong: du_lieu.readUInt16BE(i + 7) };
    }
    i += 2 + du_lieu.readUInt16BE(i + 2);
  }
  throw new Error('không đọc được kích thước JPEG của tệp thử');
}

/**
 * PDF chi chua mot anh, KHONG co lop chu — dung ban scan that.
 *
 * JPEG nhet thang vao PDF duoc nho `/DCTDecode`: PDF hieu luon dinh dang JPEG.
 */
function pdf_chi_anh(jpeg: Buffer): Buffer {
  const { rong, cao } = co_jpeg(jpeg);
  const noi_dung = `q ${String(rong)} 0 0 ${String(cao)} 0 0 cm /Im1 Do Q\n`;

  const phan: Buffer[] = [Buffer.from('%PDF-1.4\n', 'latin1')];
  const cho: number[] = [];
  let dai = phan[0]!.length;
  const them = (b: Buffer): void => { phan.push(b); dai += b.length; };
  const them_obj = (so: number, than: Buffer): void => {
    cho.push(dai);
    them(Buffer.from(`${String(so)} 0 obj\n`, 'latin1'));
    them(than);
    them(Buffer.from('\nendobj\n', 'latin1'));
  };

  them_obj(1, Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'latin1'));
  them_obj(2, Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', 'latin1'));
  them_obj(3, Buffer.from(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${String(rong)} ${String(cao)}] `
    + '/Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>', 'latin1'));
  them_obj(4, Buffer.concat([
    Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${String(rong)} `
      + `/Height ${String(cao)} /ColorSpace /DeviceGray /BitsPerComponent 8 `
      + `/Filter /DCTDecode /Length ${String(jpeg.length)} >>\nstream\n`, 'latin1'),
    jpeg,
    Buffer.from('\nendstream', 'latin1'),
  ]));
  them_obj(5, Buffer.from(
    `<< /Length ${String(noi_dung.length)} >>\nstream\n${noi_dung}endstream`, 'latin1'));

  const cho_xref = dai;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (const c of cho) xref += `${String(c).padStart(10, '0')} 00000 n \n`;
  xref += 'trailer\n<< /Size 6 /Root 1 0 R >>\n'
    + `startxref\n${String(cho_xref)}\n%%EOF\n`;
  them(Buffer.from(xref, 'latin1'));

  return Buffer.concat(phan);
}

/** DOCX toi thieu: mot tep ZIP khong nen chua word/document.xml. */
function tao_docx(cac_doan: string[]): Buffer {
  const xml = '<?xml version="1.0"?><w:document><w:body>'
    + cac_doan.map((d) => `<w:p><w:r><w:t>${d}</w:t></w:r></w:p>`).join('')
    + '</w:body></w:document>';
  const ten = Buffer.from('word/document.xml', 'utf8');
  const goc = Buffer.from(xml, 'utf8');
  const nen = deflateRawSync(goc);

  const h = Buffer.alloc(30);
  h.writeUInt32LE(0x04034b50, 0);
  h.writeUInt16LE(20, 4);
  h.writeUInt16LE(8, 8);
  h.writeUInt32LE(nen.length, 18);
  h.writeUInt32LE(goc.length, 22);
  h.writeUInt16LE(ten.length, 26);

  const c = Buffer.alloc(46);
  c.writeUInt32LE(0x02014b50, 0);
  c.writeUInt16LE(20, 6);
  c.writeUInt16LE(8, 10);
  c.writeUInt32LE(nen.length, 20);
  c.writeUInt32LE(goc.length, 24);
  c.writeUInt16LE(ten.length, 28);
  c.writeUInt32LE(0, 42);

  const cuc_bo = Buffer.concat([h, ten, nen]);
  const trung_tam = Buffer.concat([c, ten]);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(trung_tam.length, 12);
  eocd.writeUInt32LE(cuc_bo.length, 16);

  return Buffer.concat([cuc_bo, trung_tam, eocd]);
}

// ---------------------------------------------------------------- chuan hoa van ban

test('chuan hoa van ban: bo CRLF, gom dong trong, bo khoang trang cuoi dong', () => {
  assert.equal(chuan_van_ban('a\r\nb'), 'a\nb');
  assert.equal(chuan_van_ban('a   \nb\t\n'), 'a\nb');
  assert.equal(chuan_van_ban('a\n\n\n\n\nb'), 'a\n\nb');
  // Dau ngat trang cua pdftotext thanh dong moi, khong bi mat chu hai ben.
  assert.equal(chuan_van_ban('trang1\fTRANG2'), 'trang1\nTRANG2');
  assert.equal(chuan_van_ban('  \n \n  '), '');
});

test('chuan hoa KHONG dung toi noi dung, chi dung toi khoang trang', () => {
  const goc = 'Mức lương cơ bản: 12.500.000 đồng/tháng';
  assert.equal(chuan_van_ban(goc), goc);
});

test('cat ve tran: cat o ranh dong khi ranh do du gan tran', () => {
  // Ranh dong o vi tri 90, tran 100 -> 90 vuot 80% cua 100 nen cat dung o ranh dong,
  // khong dut giua cau.
  const chu = `${'x'.repeat(90)}\n${'y'.repeat(30)}`;
  const kq = cat_ve_tran(chu, 100);
  assert.equal(kq.cat_bot, true);
  assert.equal(kq.chu, 'x'.repeat(90));
});

test('cat ve tran: ranh dong qua som thi cat thang, khong bo mat 80% van ban', () => {
  // Ranh dong duy nhat o vi tri 5. Cat o day se nem di gan het noi dung — tha cat cung.
  const kq = cat_ve_tran(`ngắn\n${'y'.repeat(300)}`, 100);
  assert.equal(kq.cat_bot, true);
  assert.equal(kq.chu.length, 100);
});

test('cat ve tran: khong co ranh dong nao thi cat thang', () => {
  const kq = cat_ve_tran('z'.repeat(500), 100);
  assert.equal(kq.cat_bot, true);
  assert.equal(kq.chu.length, 100);
});

test('van ban ngan hon tran thi khong bi danh dau cat', () => {
  const kq = cat_ve_tran('ngắn', KY_TU_TOI_DA);
  assert.equal(kq.cat_bot, false);
  assert.equal(kq.chu, 'ngắn');
});

test('duong trich doc theo duoi tep, khong phan biet chu to nho', () => {
  assert.equal(duong_trich('a.docx'), 'docx');
  assert.equal(duong_trich('A.DOCX'), 'docx');
  assert.equal(duong_trich('b.pdf'), 'pdf');
  assert.equal(duong_trich('c.JPG'), 'anh');
  assert.equal(duong_trich('c.jpeg'), 'anh');
  assert.equal(duong_trich('d.png'), 'anh');
  assert.equal(duong_trich('e.xlsx'), null);
  assert.equal(duong_trich('f.doc'), null);
});

// ---------------------------------------------------------------- chay lenh ngoai

test('chay lenh: chuong trinh khong ton tai -> LoiThieuCongCu, khong phai loi chung', async () => {
  await assert.rejects(
    () => chay_lenh('cong-cu-khong-he-ton-tai-o-day', []),
    (loi: unknown) => loi instanceof LoiThieuCongCu
      && (loi as LoiThieuCongCu).cong_cu === 'cong-cu-khong-he-ton-tai-o-day',
  );
});

test('chay lenh: het gio thi bi giet, khong treo mai', async () => {
  await assert.rejects(
    () => chay_lenh('sh', ['-c', 'sleep 30'], { han_giay: 1 }),
    (loi: unknown) => loi instanceof LoiLenhNgoai && /quá 1 giây/.test((loi as Error).message),
  );
});

test('chay lenh: het gio thi tra loi NGAY, khong cho tien trinh chau chet', async () => {
  // BAI KIEM CHO MOT LOI THAT. Ban dau `giet` chi goi `tt.kill()` roi cho su kien 'close'.
  // Voi `sh -c 'yes'`, giet `sh` xong `yes` moc ra ngoai, van giu dau ra, nen 'close' khong
  // bao gio den — han gio 1 giay bien thanh treo vinh vien. Cach chua: nhom tien trinh
  // rieng + pha duong ong + tra loi ngay.
  const bat_dau = process.hrtime.bigint();
  await assert.rejects(
    () => chay_lenh('sh', ['-c', 'yes khong-bao-gio-dung'], { han_giay: 1, ra_toi_da: 1 << 30 }),
    (loi: unknown) => loi instanceof LoiLenhNgoai,
  );
  const giay = Number(process.hrtime.bigint() - bat_dau) / 1e9;
  assert.ok(giay < 5, `lẽ ra trả lời ngay sau hạn 1 giây, thực tế mất ${giay.toFixed(1)} giây`);
});

test('chay lenh: vuot tran dau ra thi bi giet', async () => {
  await assert.rejects(
    () => chay_lenh('sh', ['-c', 'yes abcdefgh'], { ra_toi_da: 4096, han_giay: 20 }),
    (loi: unknown) => loi instanceof LoiLenhNgoai && /vượt trần/.test((loi as Error).message),
  );
});

test('chay lenh KHONG qua shell — ten tep chua ky tu shell van an toan', async () => {
  // Neu di qua shell, `; echo HACKED` se chay. `cat` se coi ca chuoi la mot ten tep.
  const kq = await chay_lenh('cat', ['/khong-co-tep; echo HACKED'], { han_giay: 10 });
  assert.notEqual(kq.ma, 0);
  assert.equal(kq.ra.toString('utf8').includes('HACKED'), false);
});

test('chay lenh: day duoc du lieu vao stdin va nhan lai stdout', async () => {
  const kq = await chay_lenh('cat', [], { vao: Buffer.from('xin chào'), han_giay: 10 });
  assert.equal(kq.ma, 0);
  assert.equal(kq.ra.toString('utf8'), 'xin chào');
});

test('chay lenh: ma thoat khac 0 KHONG nem loi — lop tren tu quyet', async () => {
  const kq = await chay_lenh('sh', ['-c', 'echo loi 1>&2; exit 3'], { han_giay: 10 });
  assert.equal(kq.ma, 3);
  assert.equal(kq.loi, 'loi');
});

test('chay lenh KHONG chuyen bien moi truong cua may chu sang tien trinh con', async () => {
  // Bien moi truong cua may chu co mat khau CSDL va khoa JWT. Mot bo OCR khong can biet.
  process.env['BI_MAT_THU_NGHIEM'] = 'khong-duoc-lot-ra';
  try {
    const kq = await chay_lenh('sh', ['-c', 'echo "[$BI_MAT_THU_NGHIEM]"'], { han_giay: 10 });
    assert.equal(kq.ra.toString('utf8').trim(), '[]');
  } finally {
    delete process.env['BI_MAT_THU_NGHIEM'];
  }
});

// ---------------------------------------------------------------- DOCX

test('trich DOCX: lay du chu, cach_trich la docx', async () => {
  const kq = await trich_tu_tep(tao_docx([
    'HỢP ĐỒNG LAO ĐỘNG', 'Số: 07/2026/HĐLĐ-TPVN', 'Mức lương: 12.500.000 đồng',
  ]), 'a.docx');

  assert.equal(kq.cach_trich, 'docx');
  assert.equal(kq.canh_bao, null);
  assert.match(kq.noi_dung_text, /HỢP ĐỒNG LAO ĐỘNG/);
  assert.match(kq.noi_dung_text, /12\.500\.000/);
  assert.equal(kq.so_ky_tu, kq.noi_dung_text.length);
});

test('trich DOCX vuot tran 400 doan cua "xem nhanh" — luu tru phai lay het', async () => {
  const doan = Array.from({ length: 900 }, (_, i) => `Điều ${String(i + 1)}`);
  const kq = await trich_tu_tep(tao_docx(doan), 'dai.docx');
  assert.match(kq.noi_dung_text, /Điều 900/);
});

test('trich DOCX hong -> canh bao, KHONG im lang tra chuoi rong', async () => {
  const kq = await trich_tu_tep(Buffer.from('đây không phải zip'), 'hong.docx');
  assert.equal(kq.so_ky_tu, 0);
  assert.notEqual(kq.canh_bao, null);
});

test('trich DOCX rong chu -> canh bao goi y noi dung nam trong anh', async () => {
  const kq = await trich_tu_tep(tao_docx([]), 'rong.docx');
  assert.equal(kq.so_ky_tu, 0);
  assert.match(kq.canh_bao ?? '', /ảnh/);
});

test('dinh dang khong doc duoc thi nem LoiDinhDang', async () => {
  await assert.rejects(
    () => trich_tu_tep(Buffer.from('x'), 'bang.xlsx'),
    (loi: unknown) => loi instanceof LoiDinhDang,
  );
});

// ---------------------------------------------------------------- PDF co lop chu

const co_pdftotext = await co_cong_cu('pdftotext');
const co_tesseract = await co_cong_cu('tesseract');
const co_pdftoppm = await co_cong_cu('pdftoppm');

test('PDF co lop chu -> doc thang, cach_trich la pdf_text', {
  skip: co_pdftotext ? false : 'máy này chưa cài pdftotext',
}, async () => {
  const pdf = pdf_co_chu([
    'HOP DONG LAO DONG',
    'So: 07/2026/HDLD-TPVN',
    'Muc luong co ban: 12.500.000 dong/thang',
  ]);
  const kq = await trich_tu_tep(pdf, 'hd.pdf');

  assert.equal(kq.cach_trich, 'pdf_text');
  assert.equal(kq.canh_bao, null);
  assert.match(kq.noi_dung_text, /HOP DONG LAO DONG/);
  assert.match(kq.noi_dung_text, /12\.500\.000/);
});

test('pdftotext tra ve UTF-8, khong phai Latin-1', {
  skip: co_pdftotext ? false : 'máy này chưa cài pdftotext',
}, async () => {
  // Font Helvetica co san chi phu WinAnsi, nen dung mot ky tu WinAnsi khong thuoc ASCII
  // de bat loi thieu `-enc UTF-8`: neu thieu, byte 0xE9 se ra ky tu thay the.
  const pdf = pdf_co_chu(['caf\xe9 et r\xe9sum\xe9']);
  const chu = await trich_pdf_text(pdf);
  assert.match(chu, /café et résumé/);
  assert.equal(chu.includes('�'), false);
});

test('PDF chi co anh -> pdftotext ra qua it chu, phai roi sang OCR', {
  skip: co_pdftotext ? false : 'máy này chưa cài pdftotext',
}, async () => {
  const chu = chuan_van_ban(await trich_pdf_text(pdf_chi_anh(ANH_SCAN)));
  assert.ok(chu.length < TOI_THIEU_CO_CHU,
    `PDF ảnh lẽ ra không có lớp chữ, nhưng đọc ra ${String(chu.length)} ký tự: ${chu}`);
});

// ---------------------------------------------------------------- OCR

test('OCR anh scan doc dung tieng Viet co dau', {
  skip: co_tesseract ? false : 'máy này chưa cài tesseract',
}, async () => {
  const chu = await ocr_anh(ANH_SCAN);

  // Neu thieu `-l vie`, tesseract OCR bang tieng Anh va chu se mat dau.
  assert.match(chu, /HỢP ĐỒNG LAO ĐỘNG/);
  assert.match(chu, /Chức danh/);
  assert.match(chu, /12\.500\.000/);
});

test('trich anh scan: cach_trich la ocr VA co canh bao do tin cay', {
  skip: co_tesseract ? false : 'máy này chưa cài tesseract',
}, async () => {
  const kq = await trich_tu_tep(ANH_SCAN, 'scan.jpg');

  assert.equal(kq.cach_trich, 'ocr');
  // Canh bao la BAT BUOC voi OCR: nguoi doc phai biet chu nay do may doan.
  assert.notEqual(kq.canh_bao, null);
  assert.match(kq.canh_bao ?? '', /OCR/);
  assert.match(kq.noi_dung_text, /HỢP ĐỒNG LAO ĐỘNG/);
});

test('anh trang khong co chu -> canh bao, KHONG luu chuoi rong im lang', {
  skip: co_tesseract ? false : 'máy này chưa cài tesseract',
}, async () => {
  // JPEG 8x8 mot mau, khong co chu nao.
  const trang = Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB'
    + 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAAIAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAA'
    + 'AAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAA'
    + 'AAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJQA/9k=', 'base64');
  const kq = await trich_tu_tep(trang, 'trang.jpg');

  assert.equal(kq.so_ky_tu, 0);
  assert.notEqual(kq.canh_bao, null);
});

test('PDF ban scan: tu roi sang OCR va bao so trang', {
  skip: co_pdftotext && co_tesseract && co_pdftoppm
    ? false : 'máy này chưa cài đủ pdftotext + pdftoppm + tesseract',
}, async () => {
  const kq = await trich_tu_tep(pdf_chi_anh(ANH_SCAN), 'scan.pdf');

  assert.equal(kq.cach_trich, 'ocr');
  assert.equal(kq.so_trang, 1);
  assert.notEqual(kq.canh_bao, null);
  assert.match(kq.noi_dung_text, /HỢP ĐỒNG/);
});

test('cong cu trich bao dung nhung gi may nay co', async () => {
  const cc = await cong_cu_trich();
  assert.equal(cc.pdf, co_pdftotext);
  assert.equal(cc.ocr, co_tesseract);
  assert.equal(cc.pdf_sang_anh, co_pdftoppm);
});
