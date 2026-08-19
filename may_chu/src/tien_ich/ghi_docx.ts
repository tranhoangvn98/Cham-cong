// Sinh tep DOCX. Khong dung thu vien ngoai.
//
// VI SAO DOCX CHU KHONG PHAI PDF cho ban don da duyet:
//
//   PDF can NHUNG FONT de hien duoc tieng Viet. Bang ma WinAnsi khong co `ạ`, `ề`, `ộ` —
//   muon dung phai nhung mot font TrueType va tu cat bo (subset) no. Do la mot bo ma dai,
//   de sai am tham, va sai kieu "tep mo duoc nhung mat het dau".
//
//   DOCX thi Unicode san. Khong font, khong subset, khong bang ma. Va HR mo ra sua duoc, in
//   duoc, ky duoc — dung nhung viec ho lam voi mot to don.
//
// Dung lai bo dong ZIP cua `ghi_xlsx.ts`. DOCX toi thieu can bon tep:
//
//   [Content_Types].xml            khai kieu MIME cho tung phan
//   _rels/.rels                    tro tu goc sang document
//   word/document.xml              noi dung that
//   word/_rels/document.xml.rels   quan he cua document (de trong cung phai co)
import { dong_zip, thoat_xml } from './ghi_xlsx.ts';

/** Mot khoi trong van ban. Chi ba loai — du cho mot to don, va khong hon. */
export type KhoiDocx =
  | { loai: 'tieu_de'; chu: string }
  | { loai: 'doan'; chu: string; dam?: boolean; giua?: boolean }
  | { loai: 'bang'; hang: readonly (readonly [string, string])[] };

export interface VanBanDocx {
  /** Cac khoi, theo thu tu tu tren xuong. */
  khoi: readonly KhoiDocx[];
}

/** Nua diem (half-point) — don vi co chu cua OOXML. 28 = 14pt. */
const CO_TIEU_DE = 32;
const CO_CHU = 22;

function chay_chu(chu: string, dam: boolean, co: number): string {
  // Tach theo dong: DOCX khong hieu `\n` trong `<w:t>`, phai dung `<w:br/>`.
  const dong = chu.split('\n');
  const kieu = `<w:rPr>${dam ? '<w:b/>' : ''}<w:sz w:val="${String(co)}"/>`
    + `<w:szCs w:val="${String(co)}"/></w:rPr>`;
  const noi_dung = dong
    .map((d) => `<w:t xml:space="preserve">${thoat_xml(d)}</w:t>`)
    .join('<w:br/>');
  return `<w:r>${kieu}${noi_dung}</w:r>`;
}

function doan_xml(chu: string, dam: boolean, giua: boolean, co: number): string {
  const pPr = giua ? '<w:pPr><w:jc w:val="center"/></w:pPr>' : '';
  return `<w:p>${pPr}${chay_chu(chu, dam, co)}</w:p>`;
}

/**
 * Bang hai cot nhan/gia tri.
 *
 * `tblW` dat theo phan tram (`pct`) chu khong theo twip: khoi giay A4 va Letter khac chieu
 * rong, va mot bang do bang twip se tran le tren mot trong hai.
 */
function bang_xml(hang: readonly (readonly [string, string])[]): string {
  const vien = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map((c) => `<w:${c} w:val="single" w:sz="4" w:color="999999"/>`).join('');

  const cac_hang = hang.map(([nhan, gia_tri]) => (
    '<w:tr>'
    + `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="pct"/></w:tcPr>`
    + `${doan_xml(nhan, true, false, CO_CHU)}</w:tc>`
    + `<w:tc><w:tcPr><w:tcW w:w="7000" w:type="pct"/></w:tcPr>`
    + `${doan_xml(gia_tri, false, false, CO_CHU)}</w:tc>`
    + '</w:tr>'
  )).join('');

  return `<w:tbl><w:tblPr><w:tblW w:w="10000" w:type="pct"/>`
    + `<w:tblBorders>${vien}</w:tblBorders></w:tblPr>${cac_hang}</w:tbl>`
    // Word doi mot doan NGAY SAU bang, khong thi bang cuoi tai lieu lam tep hong o mot so
    // ban Word. Doan rong la du.
    + '<w:p/>';
}

function than_xml(vb: VanBanDocx): string {
  const phan = vb.khoi.map((k) => {
    if (k.loai === 'tieu_de') return doan_xml(k.chu, true, true, CO_TIEU_DE);
    if (k.loai === 'bang') return bang_xml(k.hang);
    return doan_xml(k.chu, k.dam ?? false, k.giua ?? false, CO_CHU);
  }).join('');

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    + `<w:body>${phan}`
    // Khai kho giay A4 (11906 x 16838 twip) va le 2cm. Thieu `sectPr` thi Word dung Letter,
    // va mot to don in ra bi cat le o Viet Nam.
    + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
    + '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>'
    + '</w:body></w:document>';
}

/**
 * Sinh mot tep DOCX mot trang tu cac khoi.
 *
 * TEP TAI LAP DUOC: `dong_zip` khong ghi thoi diem, nen cung dau vao ra dung cung byte.
 */
export function ghi_docx(vb: VanBanDocx): Buffer {
  const types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    + '</Types>';

  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    + '</Relationships>';

  const doc_rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>';

  return dong_zip([
    { ten: '[Content_Types].xml', du_lieu: Buffer.from(types, 'utf8') },
    { ten: '_rels/.rels', du_lieu: Buffer.from(rels, 'utf8') },
    { ten: 'word/document.xml', du_lieu: Buffer.from(than_xml(vb), 'utf8') },
    { ten: 'word/_rels/document.xml.rels', du_lieu: Buffer.from(doc_rels, 'utf8') },
  ]);
}
