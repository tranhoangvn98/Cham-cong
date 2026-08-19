// Bo sinh DOCX cho ban don da duyet.
//
// VONG KIN nhu bo XLSX: sinh bang `ghi_docx`, doc lai bang `trich_docx` — bo doc da co san va
// da duoc dung that de xem noi dung tep dinh kem trong ho so.
//
// VI SAO DOCX CHU KHONG PHAI PDF: PDF can nhung font TrueType va tu cat bo (subset) no de hien
// duoc tieng Viet, vi WinAnsi khong co `ạ`, `ề`, `ộ`. Do la mot bo ma dai va sai kieu "tep mo
// duoc nhung mat het dau" — kieu sai khong ai phat hien den luc in ra. DOCX thi Unicode san.
//
// Cac bai o day kiem dung nhung cho de sai ma toi biet: dau tieng Viet, xuong dong trong mot
// doan (`<w:br/>` chu khong phai `\n`), va `sectPr` khai kho giay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';

import { ghi_docx } from '../src/tien_ich/ghi_docx.ts';
import { trich_docx } from '../src/tien_ich/doc_office.ts';

/** Doc mot phan trong goi OPC, khong qua bo doc DOCX. */
function phan(z: Buffer, ten: string): string {
  let i = 0;
  while (i + 30 <= z.length && z.readUInt32LE(i) === 0x04034b50) {
    const co_nen = z.readUInt32LE(i + 18);
    const dai_ten = z.readUInt16LE(i + 26);
    const dai_extra = z.readUInt16LE(i + 28);
    const t = z.toString('utf8', i + 30, i + 30 + dai_ten);
    const dau = i + 30 + dai_ten + dai_extra;
    if (t === ten) return inflateRawSync(z.subarray(dau, dau + co_nen)).toString('utf8');
    i = dau + co_nen;
  }
  return '';
}

test('vong kin: doan doc lai duoc dung thu tu', () => {
  const b = ghi_docx({
    khoi: [
      { loai: 'tieu_de', chu: 'ĐƠN XIN NGHỈ PHÉP' },
      { loai: 'doan', chu: 'Kính gửi: Ban Giám đốc' },
      { loai: 'doan', chu: 'Tôi tên là Nguyễn Thị Ánh Tuyết.' },
    ],
  });
  const d = trich_docx(b);
  assert.notEqual(d, null, 'bo doc khong doc duoc tep vua sinh');
  assert.deepEqual(d?.doan, [
    'ĐƠN XIN NGHỈ PHÉP',
    'Kính gửi: Ban Giám đốc',
    'Tôi tên là Nguyễn Thị Ánh Tuyết.',
  ]);
});

test('vong kin: DAU TIENG VIET nguyen ven', () => {
  // Ly do ca tep nay ton tai. Neu cho nay do, ban don in ra mat het dau va khong ai ky.
  const chu = 'Đơn xin nghỉ việc — Trần Đức Đạt, phòng Kỹ thuật, ngày 19/08/2026';
  const d = trich_docx(ghi_docx({ khoi: [{ loai: 'doan', chu }] }));
  assert.deepEqual(d?.doan, [chu]);
});

test('vong kin: bang nhan/gia tri doc lai duoc ca hai cot', () => {
  const d = trich_docx(ghi_docx({
    khoi: [{
      loai: 'bang',
      hang: [['Họ tên', 'Lê Thị B'], ['Loại đơn', 'Nghỉ phép năm'], ['Số ngày', '2']],
    }],
  }));
  // Bo doc tra tung `<w:p>`, va moi o bang la mot `<w:p>` rieng.
  assert.deepEqual(d?.doan, ['Họ tên', 'Lê Thị B', 'Loại đơn', 'Nghỉ phép năm', 'Số ngày', '2']);
});

test('vong kin: xuong dong trong MOT doan khong lam mat chu', () => {
  // DOCX khong hieu `\n` trong `<w:t>` — phai dung `<w:br/>`. Neu quen thi hai dong bi noi
  // lien nhau khong co dau cach, va mot ly do hai dong thanh mot chuoi doc khong ra.
  const d = trich_docx(ghi_docx({
    khoi: [{ loai: 'doan', chu: 'Dòng một\nDòng hai' }],
  }));
  assert.equal(d?.doan.length, 1, 'phai la MOT doan');
  assert.ok(d?.doan[0]?.includes('Dòng một'), d?.doan[0]);
  assert.ok(d?.doan[0]?.includes('Dòng hai'), d?.doan[0]);
});

test('vong kin: ky tu can thoat XML', () => {
  const chu = 'Lý do: nghỉ <việc> & "riêng"';
  assert.deepEqual(trich_docx(ghi_docx({ khoi: [{ loai: 'doan', chu }] }))?.doan, [chu]);
});

test('vong kin: van ban rong van la tep doc duoc', () => {
  const d = trich_docx(ghi_docx({ khoi: [] }));
  assert.notEqual(d, null);
  assert.deepEqual(d?.doan, []);
});

test('goi OPC: du bon phan bat buoc, [Content_Types].xml o dau', () => {
  const z = ghi_docx({ khoi: [{ loai: 'doan', chu: 'x' }] });
  for (const t of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml',
    'word/_rels/document.xml.rels']) {
    assert.notEqual(phan(z, t), '', `thieu phan ${t}`);
  }
  assert.equal(z.toString('utf8', 30, 30 + '[Content_Types].xml'.length), '[Content_Types].xml');
});

test('kho giay A4 duoc khai — khong de Word dung Letter', () => {
  // Letter hep hon A4 21mm va cao hon 18mm. Mot to don in ra tren A4 voi thiet lap Letter bi
  // cat le, va do la thu chi phat hien luc da in.
  const xml = phan(ghi_docx({ khoi: [{ loai: 'doan', chu: 'x' }] }), 'word/document.xml');
  assert.ok(xml.includes('w:w="11906"'), 'thieu chieu rong A4');
  assert.ok(xml.includes('w:h="16838"'), 'thieu chieu cao A4');
});

test('bang co doan rong theo sau', () => {
  // Mot so ban Word coi tai lieu ket thuc bang mot bang la tep hong. Doan rong la du.
  const xml = phan(ghi_docx({ khoi: [{ loai: 'bang', hang: [['a', 'b']] }] }), 'word/document.xml');
  assert.ok(xml.includes('</w:tbl><w:p/>'), 'thieu doan rong sau bang');
});

test('tep TAI LAP DUOC: cung dau vao ra dung cung byte', () => {
  const vb = { khoi: [{ loai: 'doan' as const, chu: 'x' }] };
  assert.ok(ghi_docx(vb).equals(ghi_docx(vb)));
});
