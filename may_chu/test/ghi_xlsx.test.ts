// Bo sinh XLSX.
//
// CACH KIEM O DAY LA VONG KIN: sinh tep bang `ghi_xlsx`, roi doc lai bang `trich_xlsx` —
// bo doc da co san trong `doc_office.ts` va da duoc dung that de xem noi dung tep dinh kem.
// Neu bo sinh viet sai ZIP, sai XML, hay sai dia chi o, bo doc se khong tra ve dung bang.
//
// Vong kin nay bat duoc nhieu hon la doc chuoi XML rieng: no di qua ca ZIP (CRC, do dai, thu
// tu muc, central directory) lan XML. Doc chuoi thi chi kiem duoc mot nua.
//
// Cai no KHONG chung minh: Excel that mo duoc tep. Hai bo doc do cung mot nguoi viet nen
// chung co the sai giong nhau. Nen o day co them cac bai kiem cau truc ZIP bang byte, va cac
// bai kiem nhung rang buoc cua dac ta OOXML ma toi biet la de mac.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync, crc32 } from 'node:zlib';

import { ghi_xlsx, ten_cot, ten_sheet_hop_le, thoat_xml } from '../src/tien_ich/ghi_xlsx.ts';
import { trich_xlsx } from '../src/tien_ich/doc_office.ts';

/** Ky tu dieu khien dung lam du lieu thu — dung `dk()` chu khong dan byte that vao tep test. */
const dk = (ma: number): string => String.fromCharCode(ma);

/** Doc tho cac muc trong ZIP, de kiem cau truc ma khong qua bo doc XLSX. */
function doc_muc_zip(z: Buffer): Map<string, Buffer> {
  const ra = new Map<string, Buffer>();
  let i = 0;
  while (i + 30 <= z.length && z.readUInt32LE(i) === 0x04034b50) {
    const nen = z.readUInt16LE(i + 8);
    const co_nen = z.readUInt32LE(i + 18);
    const goc = z.readUInt32LE(i + 22);
    const dai_ten = z.readUInt16LE(i + 26);
    const dai_extra = z.readUInt16LE(i + 28);
    const ten = z.toString('utf8', i + 30, i + 30 + dai_ten);
    const dau = i + 30 + dai_ten + dai_extra;
    const tho = z.subarray(dau, dau + co_nen);
    const noi_dung = nen === 8 ? inflateRawSync(tho) : tho;
    assert.equal(noi_dung.length, goc, `${ten}: do dai goc khai sai trong header`);
    assert.equal(crc32(noi_dung), z.readUInt32LE(i + 14), `${ten}: CRC sai`);
    ra.set(ten, noi_dung);
    i = dau + co_nen;
  }
  return ra;
}

// ================================================================ ten cot

test('ten cot: A, Z, AA, AZ, BA', () => {
  assert.equal(ten_cot(0), 'A');
  assert.equal(ten_cot(25), 'Z');
  // Ranh gioi kinh dien: cot 26 la AA, khong phai BA. Sai o day thi tu cot 27 tro di moi o
  // deu lech mot cot, va Excel doc duoc tep nhung du lieu nam sai cho.
  assert.equal(ten_cot(26), 'AA');
  assert.equal(ten_cot(51), 'AZ');
  assert.equal(ten_cot(52), 'BA');
  assert.equal(ten_cot(701), 'ZZ');
  assert.equal(ten_cot(702), 'AAA');
});

// ================================================================ thoat XML

test('thoat XML: & < > " duoc thoat', () => {
  assert.equal(thoat_xml('a & b'), 'a &amp; b');
  assert.equal(thoat_xml('<x>'), '&lt;x&gt;');
  assert.equal(thoat_xml('nói "thế"'), 'nói &quot;thế&quot;');
  // `&` phai thoat TRUOC cac ky tu khac, khong thi `&lt;` thanh `&amp;lt;`.
  assert.equal(thoat_xml('<&>'), '&lt;&amp;&gt;');
});

test('thoat XML: ky tu dieu khien bi XOA, nhung tab/LF/CR thi GIU', () => {
  // XML 1.0 khong cho phep ky tu dieu khien o BAT CU dang nao, ke ca `&#x1;`. Mot ky tu 0x01
  // lot vao (tu ghi chu nguoi dung dan tu Word) lam Excel bao "tep bi hong" khong noi vi sao.
  assert.equal(thoat_xml(`a${dk(0x00)}b`), 'ab');
  assert.equal(thoat_xml(`a${dk(0x01)}b`), 'ab');
  assert.equal(thoat_xml(`a${dk(0x1f)}b`), 'ab');
  assert.equal(thoat_xml(`a${dk(0x7f)}b`), 'ab');
  // Ba ky tu nay XML CHO PHEP va chung co nghia trong o Excel (xuong dong trong o).
  assert.equal(thoat_xml('a\tb'), 'a\tb');
  assert.equal(thoat_xml('a\nb'), 'a\nb');
  assert.equal(thoat_xml('a\rb'), 'a\rb');
});

test('thoat XML: giu dau tieng Viet', () => {
  assert.equal(thoat_xml('Nguyễn Thị Ánh Tuyết'), 'Nguyễn Thị Ánh Tuyết');
  assert.equal(thoat_xml('HĐLĐ'), 'HĐLĐ');
});

// ================================================================ ten sheet

test('ten sheet: bo ky tu Excel cam, cat ve 31 ky tu', () => {
  assert.equal(ten_sheet_hop_le('Bảng công'), 'Bảng công');
  assert.equal(ten_sheet_hop_le('a/b\\c?d*e[f]g:h'), 'a b c d e f g h');
  assert.equal(ten_sheet_hop_le(''), 'Sheet1');
  assert.equal(ten_sheet_hop_le('   '), 'Sheet1');
  assert.equal(ten_sheet_hop_le('X'.repeat(50)).length, 31);
});

// ================================================================ vong kin

test('vong kin: sinh roi doc lai duoc dung bang', () => {
  const b = ghi_xlsx({
    ten_sheet: 'Bảng công',
    tieu_de: ['Mã NV', 'Họ tên', 'Số công'],
    hang: [
      ['NV001', 'Nguyễn Thị Ánh Tuyết', 22],
      ['NV002', 'Trần Đức Đạt', 21.5],
    ],
  });

  const doc = trich_xlsx(b);
  assert.notEqual(doc, null, 'bo doc khong doc duoc tep vua sinh');
  assert.equal(doc?.loai, 'bang');
  assert.deepEqual(doc?.hang, [
    ['Mã NV', 'Họ tên', 'Số công'],
    ['NV001', 'Nguyễn Thị Ánh Tuyết', '22'],
    ['NV002', 'Trần Đức Đạt', '21.5'],
  ]);
});

test('vong kin: chu co ky tu can thoat van doc lai dung', () => {
  const b = ghi_xlsx({
    hang: [['a & b', '<thẻ>', 'nói "thế"', "dấu ' đơn"]],
  });
  assert.deepEqual(trich_xlsx(b)?.hang, [['a & b', '<thẻ>', 'nói "thế"', "dấu ' đơn"]]);
});

test('vong kin: o rong giu dung vi tri cot', () => {
  // Bo sinh bo qua o rong (khong ghi the `<c>`), nen dia chi o cua nhung o SAU no phai van
  // dung. Neu bo sinh dung so thu tu ngam thay vi dia chi tuyet doi thi bai nay do.
  const b = ghi_xlsx({ hang: [['a', '', '', 'd'], [null, 'b', undefined, 'd2']] });
  assert.deepEqual(trich_xlsx(b)?.hang, [['a', '', '', 'd'], ['', 'b', '', 'd2']]);
});

test('vong kin: dau cach dau va cuoi o KHONG bi cat', () => {
  // Can `xml:space="preserve"`. Thieu no thi Excel cat dau cach, va mot ma nhan vien dinh
  // dau cach se im lang thanh mot ma khac.
  assert.deepEqual(trich_xlsx(ghi_xlsx({ hang: [['  NV001  ']] }))?.hang, [['  NV001  ']]);
});

test('vong kin: bang rong van la tep doc duoc', () => {
  const doc = trich_xlsx(ghi_xlsx({ hang: [] }));
  assert.notEqual(doc, null, 'bang rong sinh ra tep khong doc duoc');
  assert.deepEqual(doc?.hang, []);
});

test('vong kin: bang chi co tieu de', () => {
  assert.deepEqual(trich_xlsx(ghi_xlsx({ tieu_de: ['A', 'B'], hang: [] }))?.hang, [['A', 'B']]);
});

test('vong kin: 30 cot — qua moc AA', () => {
  // 30 cot chu khong 60: `trich_xlsx` la bo doc cho popup XEM NHANH va no cat o 30 cot / 200
  // hang. Do la gioi han cua vong kiem, khong phai cua bo sinh — nen cot xa hon duoc kiem
  // bang cach doc thang XML o bai duoi.
  //
  // 30 > 26 nen bai nay van di qua moc AA, la cho de sai nhat.
  const hang = Array.from({ length: 30 }, (_, i) => `c${String(i)}`);
  assert.deepEqual(trich_xlsx(ghi_xlsx({ hang: [hang] }))?.hang, [hang]);
});

test('cot xa: dia chi o dung tuyet doi, kiem thang trong XML', () => {
  // Vuot gioi han cua bo doc xem nhanh, nen doc thang sheet1.xml. Bang cham cong ca thang co
  // 31 cot ngay cong voi ma va ho ten, tuc la LUON vuot 30 cot — nen duong nay chay that.
  const so_cot = 40;
  const hang = Array.from({ length: so_cot }, (_, i) => `c${String(i)}`);
  const xml = doc_muc_zip(ghi_xlsx({ hang: [hang] }))
    .get('xl/worksheets/sheet1.xml')?.toString('utf8') ?? '';

  assert.ok(xml.includes('r="Z1"'), 'thieu o Z1');
  assert.ok(xml.includes('r="AA1"'), 'thieu o AA1 — moc 26 bi tinh sai');
  assert.ok(xml.includes('r="AB1"'), 'thieu o AB1');
  assert.ok(xml.includes('r="AN1"'), `thieu o AN1 (cot ${String(so_cot)})`);
  // Va khong duoc co cot "BA1" o day: cot 52 vuot so cot da ghi.
  assert.ok(!xml.includes('r="BA1"'), 'sinh ra o vuot so cot da ghi');
});

test('cot xa: bang cham cong ca thang (33 cot) doc lai duoc bang XML', () => {
  // Bang that: ma nhan vien, ho ten, 31 ngay. Day la hinh dang tep se day len nhanh 05.1.
  const tieu_de = ['Mã NV', 'Họ tên', ...Array.from({ length: 31 }, (_, i) => String(i + 1))];
  const xml = doc_muc_zip(ghi_xlsx({ tieu_de, hang: [['NV001', 'Trần Đức Đạt', ...Array(31).fill(1)]] }))
    .get('xl/worksheets/sheet1.xml')?.toString('utf8') ?? '';
  // Cot thu 33 la AG.
  assert.ok(xml.includes('r="AG1"'), 'thieu cot ngay 31 o dong tieu de');
  assert.ok(xml.includes('r="AG2"'), 'thieu cot ngay 31 o dong du lieu');
  assert.ok(xml.includes('Trần Đức Đạt'), 'mat dau tieng Viet trong XML');
});

test('vong kin: so am, so 0, so thap phan', () => {
  // So 0 KHONG duoc coi la o rong. Trong bang luong, 0 va "khong co gi" la hai chuyen khac
  // nhau: 0 dong bao hiem la mot con so da tinh, o rong la chua tinh.
  const b = ghi_xlsx({ hang: [[0, -1500, 0.25, 1_000_000]] });
  assert.deepEqual(trich_xlsx(b)?.hang, [['0', '-1500', '0.25', '1000000']]);
});

// ================================================================ cau truc ZIP

test('ZIP: du nam phan bat buoc, va [Content_Types].xml o dau tien', () => {
  const muc = doc_muc_zip(ghi_xlsx({ hang: [['x']] }));
  const ten = [...muc.keys()];
  assert.equal(ten[0], '[Content_Types].xml',
    'mot so bo doc tim [Content_Types].xml o dau tep thay vi tra central directory');
  for (const can of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml',
    'xl/_rels/workbook.xml.rels', 'xl/worksheets/sheet1.xml']) {
    assert.ok(muc.has(can), `thieu phan ${can}`);
  }
});

test('ZIP: header cuc bo khai dung CRC va do dai (da kiem trong doc_muc_zip)', () => {
  // `doc_muc_zip` tu assert CRC va do dai goc cho tung muc. Bai nay chi de ten no hien ra
  // trong ket qua chay: mot ZIP sai CRC thi Excel tu choi mo va khong noi ly do.
  const muc = doc_muc_zip(ghi_xlsx({
    tieu_de: ['a'], hang: Array.from({ length: 200 }, (_, i) => [i, `dòng ${String(i)}`]),
  }));
  assert.ok(muc.size === 5);
});

test('ZIP: ten tep trong ZIP danh dau la UTF-8', () => {
  // Bit 11 cua co chung. Khong dat thi ten co dau hien sai tren Windows. O day moi ten deu
  // la ASCII nen khong thay ngay, nhung co van phai dung.
  const z = ghi_xlsx({ hang: [['x']] });
  assert.equal(z.readUInt16LE(6) & 0x0800, 0x0800, 'thieu co UTF-8 trong header cuc bo');
});

test('ZIP: so muc trong EOCD khop so muc that', () => {
  const z = ghi_xlsx({ hang: [['x']] });
  let eocd = -1;
  for (let i = z.length - 22; i >= 0; i--) {
    if (z.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  assert.ok(eocd >= 0, 'khong tim thay EOCD');
  assert.equal(z.readUInt16LE(eocd + 8), 5);
  assert.equal(z.readUInt16LE(eocd + 10), 5);
});

// ================================================================ tep tai lap duoc

test('tep TAI LAP DUOC: cung du lieu vao thi ra dung cung byte', () => {
  // Khong ghi thoi diem vao ZIP. Nho the ma mot ban chot khong doi khong bi coi la ban moi
  // moi lan sinh lai — neu khong, `sharepoint_tep` se day len lai mot tep giong het cu moi
  // ngay, va lich su phien ban tren SharePoint day ban trung nhau.
  const dung = { ten_sheet: 'X', tieu_de: ['a', 'b'], hang: [['1', 2], ['3', 4]] };
  const a = ghi_xlsx(dung);
  const b = ghi_xlsx(dung);
  assert.ok(a.equals(b), 'hai lan sinh cho ra hai tep khac nhau');
});

test('tep khac du lieu thi khac byte', () => {
  const a = ghi_xlsx({ hang: [['1']] });
  const b = ghi_xlsx({ hang: [['2']] });
  assert.ok(!a.equals(b));
});
