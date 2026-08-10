// Trich noi dung DOCX / XLSX. Tu dung tep ZIP that trong test — khong mock, vi thu de sai
// nhat o day chinh la doc sai cau truc ZIP.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';

import { cot_sang_so, trich_docx, trich_theo_duoi, trich_xlsx } from '../src/tien_ich/doc_office.ts';

/** Dung mot tep ZIP toi thieu (co central directory) tu danh sach muc. */
function tao_zip(muc: { ten: string; noi_dung: string; nen?: boolean }[]): Buffer {
  const cuc_bo: Buffer[] = [];
  const trung_tam: Buffer[] = [];
  let cho = 0;

  for (const m of muc) {
    const ten = Buffer.from(m.ten, 'utf8');
    const goc = Buffer.from(m.noi_dung, 'utf8');
    const nen = m.nen === false ? 0 : 8;
    const du_lieu = nen === 0 ? goc : deflateRawSync(goc);

    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(nen, 8);
    h.writeUInt32LE(0, 14);              // crc — bo doc cua ta khong kiem
    h.writeUInt32LE(du_lieu.length, 18);
    h.writeUInt32LE(goc.length, 22);
    h.writeUInt16LE(ten.length, 26);
    h.writeUInt16LE(0, 28);

    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(nen, 10);
    c.writeUInt32LE(0, 16);
    c.writeUInt32LE(du_lieu.length, 20);
    c.writeUInt32LE(goc.length, 24);
    c.writeUInt16LE(ten.length, 28);
    c.writeUInt32LE(cho, 42);

    cuc_bo.push(h, ten, du_lieu);
    trung_tam.push(Buffer.concat([c, ten]));
    cho += 30 + ten.length + du_lieu.length;
  }

  const phan_cuc_bo = Buffer.concat(cuc_bo);
  const phan_trung_tam = Buffer.concat(trung_tam);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(muc.length, 8);
  eocd.writeUInt16LE(muc.length, 10);
  eocd.writeUInt32LE(phan_trung_tam.length, 12);
  eocd.writeUInt32LE(phan_cuc_bo.length, 16);

  return Buffer.concat([phan_cuc_bo, phan_trung_tam, eocd]);
}

test('doi ten cot Excel sang chi so', () => {
  assert.equal(cot_sang_so('A'), 0);
  assert.equal(cot_sang_so('B'), 1);
  assert.equal(cot_sang_so('Z'), 25);
  assert.equal(cot_sang_so('AA'), 26);
  assert.equal(cot_sang_so('AB'), 27);
});

test('trich DOCX lay dung tung doan van', () => {
  const docx = tao_zip([{
    ten: 'word/document.xml',
    noi_dung: `<?xml version="1.0"?><w:document><w:body>
      <w:p><w:r><w:t>HỢP ĐỒNG LAO ĐỘNG</w:t></w:r></w:p>
      <w:p><w:r><w:t>Số: </w:t></w:r><w:r><w:t>HD-2026-001</w:t></w:r></w:p>
      <w:p></w:p>
      <w:p><w:r><w:t>Bên A &amp; Bên B thỏa thuận như sau:</w:t></w:r></w:p>
    </w:body></w:document>`,
  }]);

  const kq = trich_docx(docx);
  assert.notEqual(kq, null);
  assert.equal(kq!.loai, 'van_ban');
  assert.deepEqual(kq!.doan, [
    'HỢP ĐỒNG LAO ĐỘNG',
    // Hai <w:t> trong cung mot doan phai duoc noi lai, khong tach thanh hai dong.
    'Số: HD-2026-001',
    'Bên A & Bên B thỏa thuận như sau:',
  ]);
});

test('trich DOCX bo doan rong thay vi tra ve dong trang', () => {
  const docx = tao_zip([{
    ten: 'word/document.xml',
    noi_dung: '<w:body><w:p></w:p><w:p><w:r><w:t>  </w:t></w:r></w:p><w:p><w:r><w:t>A</w:t></w:r></w:p></w:body>',
  }]);
  assert.deepEqual(trich_docx(docx)!.doan, ['A']);
});

test('trich XLSX doc chuoi dung chung va giu dung vi tri cot', () => {
  const xlsx = tao_zip([
    {
      ten: 'xl/sharedStrings.xml',
      noi_dung: '<sst><si><t>Mã NV</t></si><si><t>Họ tên</t></si><si><t>Nguyễn Văn An</t></si></sst>',
    },
    {
      ten: 'xl/worksheets/sheet1.xml',
      noi_dung: `<worksheet><sheetData>
        <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
        <row r="2"><c r="A2" t="s"><v>2</v></c><c r="C2"><v>1001</v></c></row>
      </sheetData></worksheet>`,
    },
  ]);

  const kq = trich_xlsx(xlsx);
  assert.notEqual(kq, null);
  assert.equal(kq!.loai, 'bang');
  assert.deepEqual(kq!.hang[0], ['Mã NV', 'Họ tên', '']);
  // O B2 trong: gia tri 1001 phai nam o cot C chu khong don len cot B.
  assert.deepEqual(kq!.hang[1], ['Nguyễn Văn An', '', '1001']);
});

test('trich XLSX doc duoc chuoi noi thang trong o (inlineStr)', () => {
  const xlsx = tao_zip([{
    ten: 'xl/worksheets/sheet1.xml',
    noi_dung: '<sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Trực tiếp</t></is></c></row></sheetData>',
  }]);
  assert.deepEqual(trich_xlsx(xlsx)!.hang[0], ['Trực tiếp']);
});

test('tep ZIP khong nen (store) van doc duoc', () => {
  const docx = tao_zip([{
    ten: 'word/document.xml',
    noi_dung: '<w:body><w:p><w:r><w:t>Không nén</w:t></w:r></w:p></w:body>',
    nen: false,
  }]);
  assert.deepEqual(trich_docx(docx)!.doan, ['Không nén']);
});

test('tep khong phai ZIP thi tra null chu khong nem loi', () => {
  assert.equal(trich_docx(Buffer.from('day khong phai zip')), null);
  assert.equal(trich_xlsx(Buffer.from('%PDF-1.4')), null);
});

test('ZIP hop le nhung thieu muc can tim thi tra null', () => {
  const zip = tao_zip([{ ten: 'linh/tinh.xml', noi_dung: '<a/>' }]);
  assert.equal(trich_docx(zip), null);
  assert.equal(trich_xlsx(zip), null);
});

test('chon bo trich theo duoi tep da luu', () => {
  const docx = tao_zip([{
    ten: 'word/document.xml',
    noi_dung: '<w:body><w:p><w:r><w:t>X</w:t></w:r></w:p></w:body>',
  }]);
  assert.equal(trich_theo_duoi(docx, '2026-08/abc.docx')?.loai, 'van_ban');
  assert.equal(trich_theo_duoi(docx, '2026-08/abc.pdf'), null, 'PDF khong di qua duong nay');
});

test('giai ma thuc the XML mot lan, khong giai hai lan', () => {
  // '&amp;lt;' phai ra '&lt;' chu khong ra '<' — giai hai lan la mot loi kinh dien.
  const docx = tao_zip([{
    ten: 'word/document.xml',
    noi_dung: '<w:body><w:p><w:r><w:t>a &amp;amp;lt; b</w:t></w:r></w:p></w:body>',
  }]);
  assert.deepEqual(trich_docx(docx)!.doan, ['a &amp;lt; b']);
});
