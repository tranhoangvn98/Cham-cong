// Sinh tep XLSX. Khong dung thu vien ngoai.
//
// VI SAO TU VIET THAY VI KEO `exceljs`: bo doc XLSX (`doc_office.ts`) da tu viet roi, va thu
// duy nhat can sinh ra o day la mot bang chu nhat co dong tieu de. Them mot phu thuoc nang
// vao may chu de lam viec do la doi lay be mat tan cong va mot lan `npm audit` moi nam.
//
// Doi lai: bo nay CHI sinh duoc mot bang phang. Khong cong thuc, khong bieu do, khong nhieu
// sheet, khong dinh dang so. Neu can nhung thu do thi luc do hay tinh den thu vien.
//
// XLSX la mot tep ZIP chua vai tep XML. Toi thieu can bon tep:
//
//   [Content_Types].xml        khai kieu MIME cho tung phan
//   _rels/.rels                tro tu goc sang workbook
//   xl/workbook.xml            danh sach sheet
//   xl/_rels/workbook.xml.rels tro tu workbook sang sheet
//   xl/worksheets/sheet1.xml   du lieu that
//
// KHONG dung sharedStrings: chu viet thang vao o bang `t="inlineStr"`. Tep to hon mot chut,
// nhung khong phai giu mot bang tra cuu va khong the sinh ra chi so lech — kieu loi ma
// sharedStrings de mac nhat.
import { deflateRawSync } from 'node:zlib';
import { crc32 } from 'node:zlib';

/** Excel chi co 16384 cot va 1048576 hang. Vuot la tep hong, khong phai tep to. */
const COT_TOI_DA = 16_384;
const HANG_TOI_DA = 1_048_576;

export interface BangXlsx {
  /** Ten sheet. Excel gioi han 31 ky tu va khong nhan  : \ / ? * [ ] */
  ten_sheet?: string;
  /** Dong tieu de. Bo trong thi khong co tieu de. */
  tieu_de?: readonly string[];
  /** Cac dong du lieu. `null`/`undefined` thanh o rong. */
  hang: readonly (readonly (string | number | null | undefined)[])[];
}

export class LoiGhiXlsx extends Error {
  constructor(thong_diep: string) {
    super(thong_diep);
    this.name = 'LoiGhiXlsx';
  }
}

// ---------------------------------------------------------------- XML

/**
 * Thoat ky tu cho XML.
 *
 * Ba ky tu `& < >` la bat buoc. Nhung ky tu DIEU KHIEN moi la cho de mat: XML 1.0 KHONG cho
 * phep chung o bat cu dang nao, ke ca dang `&#x1;`. Mot ky tu 0x01 lot vao (tu ghi chu do
 * nguoi dung dan tu Word chang han) se lam Excel bao "tep bi hong" va khong noi vi sao.
 */
export function thoat_xml(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** So thu tu cot -> ten cot Excel: 0 -> A, 25 -> Z, 26 -> AA. */
export function ten_cot(chi_so: number): string {
  let n = chi_so + 1;
  let ra = '';
  while (n > 0) {
    const du = (n - 1) % 26;
    ra = String.fromCharCode(65 + du) + ra;
    n = Math.floor((n - du) / 26);
  }
  return ra;
}

/** Ten sheet hop le theo gioi han cua Excel. */
export function ten_sheet_hop_le(ten: string): string {
  const sach = ten.replace(/[:\\/?*[\]]/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return (sach === '' ? 'Sheet1' : sach).slice(0, 31);
}

function o_xlsx(cot: number, hang: number, gia_tri: string | number | null | undefined): string {
  const dia_chi = `${ten_cot(cot)}${String(hang)}`;
  if (gia_tri === null || gia_tri === undefined || gia_tri === '') return '';

  if (typeof gia_tri === 'number') {
    // NaN / Infinity khong bieu dien duoc trong XLSX — ghi thanh chu de nguoi doc thay ro
    // co gi sai, thay vi de Excel bao tep hong.
    if (!Number.isFinite(gia_tri)) {
      return `<c r="${dia_chi}" t="inlineStr"><is><t>${thoat_xml(String(gia_tri))}</t></is></c>`;
    }
    return `<c r="${dia_chi}"><v>${String(gia_tri)}</v></c>`;
  }
  // `xml:space="preserve"` de dau cach dau/cuoi khong bi Excel cat.
  return `<c r="${dia_chi}" t="inlineStr"><is><t xml:space="preserve">`
    + `${thoat_xml(gia_tri)}</t></is></c>`;
}

function sheet_xml(b: BangXlsx): string {
  const cac_hang: string[] = [];
  let so_hang = 0;

  const ghi_hang = (o: readonly (string | number | null | undefined)[]): void => {
    so_hang += 1;
    const cac_o = o.slice(0, COT_TOI_DA).map((v, i) => o_xlsx(i, so_hang, v)).join('');
    cac_hang.push(`<row r="${String(so_hang)}">${cac_o}</row>`);
  };

  if (b.tieu_de !== undefined && b.tieu_de.length > 0) ghi_hang(b.tieu_de);
  for (const h of b.hang) {
    if (so_hang >= HANG_TOI_DA) {
      throw new LoiGhiXlsx(`Bảng vượt ${String(HANG_TOI_DA)} hàng — Excel không mở được.`);
    }
    ghi_hang(h);
  }

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + `<sheetData>${cac_hang.join('')}</sheetData>`
    + '</worksheet>';
}

// ---------------------------------------------------------------- ZIP

export interface MucZip {
  ten: string;
  du_lieu: Buffer;
}

/**
 * Dong goi cac tep thanh mot ZIP.
 *
 * Xuat ra vi `ghi_docx.ts` dung lai: DOCX va XLSX la cung mot dinh dang goi (OPC), chi khac
 * cac tep XML ben trong. Viet hai bo dong ZIP la hai cho de sai khac nhau.
 *
 * Dung deflate (phuong thuc 8) chu khong "store": mot bang cong ca thang la XML lap di lap
 * lai, nen ti le nen rat cao va tep gui qua mang nho han nhieu.
 *
 * Khong dung ZIP64, khong dung data descriptor: kich thuoc biet truoc nen ghi thang vao
 * header cuc bo duoc. Doi lai gioi han 4 GB mot tep — khong lien quan gi den viec nay.
 */
export function dong_zip(muc: readonly MucZip[]): Buffer {
  const cuc_bo: Buffer[] = [];
  const trung_tam: Buffer[] = [];
  let cho = 0;

  for (const m of muc) {
    const ten = Buffer.from(m.ten, 'utf8');
    const nen = deflateRawSync(m.du_lieu, { level: 9 });
    const ma_kiem = crc32(m.du_lieu);

    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);            // can phien ban 2.0
    // Bit 11 = ten tep la UTF-8. Khong dat thi ten co dau se hien sai tren Windows.
    h.writeUInt16LE(0x0800, 6);
    h.writeUInt16LE(8, 8);             // deflate
    h.writeUInt16LE(0, 10);            // gio — de 0, xem ghi chu ve tep tai lap duoi day
    h.writeUInt16LE(0, 12);            // ngay
    h.writeUInt32LE(ma_kiem, 14);
    h.writeUInt32LE(nen.length, 18);
    h.writeUInt32LE(m.du_lieu.length, 22);
    h.writeUInt16LE(ten.length, 26);
    h.writeUInt16LE(0, 28);
    cuc_bo.push(h, ten, nen);

    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(8, 10);
    c.writeUInt16LE(0, 12);
    c.writeUInt16LE(0, 14);
    c.writeUInt32LE(ma_kiem, 16);
    c.writeUInt32LE(nen.length, 20);
    c.writeUInt32LE(m.du_lieu.length, 24);
    c.writeUInt16LE(ten.length, 28);
    c.writeUInt16LE(0, 30);
    c.writeUInt16LE(0, 32);
    c.writeUInt16LE(0, 34);
    c.writeUInt16LE(0, 36);
    c.writeUInt32LE(0, 38);
    c.writeUInt32LE(cho, 42);
    trung_tam.push(c, ten);

    cho += 30 + ten.length + nen.length;
  }

  const than = Buffer.concat(cuc_bo);
  const cd = Buffer.concat(trung_tam);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(muc.length, 8);
  eocd.writeUInt16LE(muc.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(than.length, 16);

  return Buffer.concat([than, cd, eocd]);
}

// ---------------------------------------------------------------- ghi

/**
 * Sinh mot tep XLSX mot sheet tu mot bang phang.
 *
 * TEP TAI LAP DUOC: khong ghi thoi diem vao ZIP (gio/ngay = 0). Cung du lieu vao thi ra dung
 * cung byte. Nho the ma `sharepoint_tep` khong coi mot ban chot khong doi la mot ban moi moi
 * lan sinh lai, va bo kiem so sanh duoc bang byte.
 */
export function ghi_xlsx(b: BangXlsx): Buffer {
  const ten_sheet = ten_sheet_hop_le(b.ten_sheet ?? 'Sheet1');

  const noi_dung_types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    + '</Types>';

  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
    + '</Relationships>';

  const workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
    + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + `<sheets><sheet name="${thoat_xml(ten_sheet)}" sheetId="1" r:id="rId1"/></sheets>`
    + '</workbook>';

  const wb_rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
    + '</Relationships>';

  return dong_zip([
    // `[Content_Types].xml` PHAI la muc dau tien — mot so bo doc (ke ca Excel cu) tim no o
    // dau tep thay vi tra central directory.
    { ten: '[Content_Types].xml', du_lieu: Buffer.from(noi_dung_types, 'utf8') },
    { ten: '_rels/.rels', du_lieu: Buffer.from(rels, 'utf8') },
    { ten: 'xl/workbook.xml', du_lieu: Buffer.from(workbook, 'utf8') },
    { ten: 'xl/_rels/workbook.xml.rels', du_lieu: Buffer.from(wb_rels, 'utf8') },
    { ten: 'xl/worksheets/sheet1.xml', du_lieu: Buffer.from(sheet_xml(b), 'utf8') },
  ]);
}
