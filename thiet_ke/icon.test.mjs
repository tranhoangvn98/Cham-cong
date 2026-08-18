// Moi icon dung trong webapp PHAI co trong web/src/icon.css VA co glyph that trong font.
//
// Font icon cua du an la ban CAT SUBSET, chi chua dung so icon dang dung (bo day du la
// 840 KB cho 5.800 icon). Nghia la go ten mot icon co that cua Tabler nhung chua nam
// trong subset thi khong co gi bao loi — no chi don gian KHONG HIEN, va lot qua ca
// typecheck lan build.
//
// Da dinh dung bay nay ba lan: 'cash', 'scale', 'folder'.
//
// BA MAT XICH, VA MAT NAO DUT CUNG IM LANG NHU NHAU:
//
//   ma nguon  ->  icon.css  ->  glyph trong tabler-cham-cong.woff2
//
// Bai kiem thu nhat doi chieu hai mat dau. Bai thu hai doi chieu mat cuoi — vi "them dong
// CSS nhung quen cat lai font" cho ra dung mot ket qua: o vuong rong tren man hinh that,
// khong loi, khong canh bao.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..');
const THU_MUC_WEB = join(GOC, 'web', 'src');
const TEP_FONT = join(GOC, 'web', 'public', 'font', 'tabler-cham-cong.woff2');

/** Ten icon co trong subset — lay tu chinh tep CSS. */
function icon_co_san() {
  const css = readFileSync(join(THU_MUC_WEB, 'icon.css'), 'utf8');
  const ra = new Set();
  for (const m of css.matchAll(/^\.bt-([a-z0-9-]+)::before/gm)) ra.add(m[1]);
  return ra;
}

/** Ten icon -> code point khai trong CSS, dang { 'file-text': 0xeaa2 }. */
function ma_trong_css() {
  const css = readFileSync(join(THU_MUC_WEB, 'icon.css'), 'utf8');
  const ra = new Map();
  for (const m of css.matchAll(/^\.bt-([a-z0-9-]+)::before\s*\{\s*content:\s*"\\([0-9a-fA-F]+)"/gm)) {
    ra.set(m[1], parseInt(m[2], 16));
  }
  return ra;
}

/** Doc de quy moi tep .tsx/.ts trong web/src. */
function cac_tep(thu_muc) {
  const ra = [];
  for (const m of readdirSync(thu_muc, { withFileTypes: true })) {
    const duong = join(thu_muc, m.name);
    if (m.isDirectory()) ra.push(...cac_tep(duong));
    else if (/\.tsx?$/.test(m.name)) ra.push(duong);
  }
  return ra;
}

/**
 * Tim ten icon trong ma nguon. Bat hai dang dang dung:
 *   icon: 'ten-icon'      (muc menu)
 *   className="bt bt-ten" (dung thang trong JSX)
 */
function icon_dang_dung() {
  const ra = new Map();
  for (const tep of cac_tep(THU_MUC_WEB)) {
    const ma = readFileSync(tep, 'utf8');
    const ten_tep = tep.slice(GOC.length + 1);
    for (const m of ma.matchAll(/icon:\s*'([a-z0-9-]+)'/g)) {
      if (!ra.has(m[1])) ra.set(m[1], ten_tep);
    }
    for (const m of ma.matchAll(/\bbt-([a-z0-9-]+)\b/g)) {
      if (!ra.has(m[1])) ra.set(m[1], ten_tep);
    }
  }
  return ra;
}

// ---------------------------------------------------------------- doc glyph trong WOFF2
//
// WOFF2 = header + bang thu muc + MOT khoi brotli chua toan bo cac bang sfnt noi tiep.
// Ta chi can bang `cmap`, va cmap KHONG bao gio bi bien doi (chi glyf/loca/hmtx co bien
// doi), nen chi can biet cmap nam o byte thu bao nhieu trong khoi da giai nen: bang tong
// do dai cac bang dung truoc no.

/** Doc so nguyen kieu UIntBase128 cua WOFF2: 7 bit moi byte, bit cao la bit tiep tuc. */
function doc_base128(b, cho) {
  let gia_tri = 0;
  for (let i = 0; i < 5; i++) {
    const byte = b[cho + i];
    gia_tri = (gia_tri << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) return [gia_tri, cho + i + 1];
  }
  throw new Error('UIntBase128 quá 5 byte — tệp WOFF2 hỏng');
}

/**
 * Danh sach the biet truoc cua WOFF2. Ta chi thuc su can biet CHI SO NAO LA 'cmap' (0) va
 * chi so cua glyf (10) / loca (11) — vi hai bang do co quy tac doc transformLength rieng.
 * Cac bang khac chi can do dai de tinh offset, khong can biet ten.
 */
const CHI_SO_CMAP = 0;
const CHI_SO_GLYF = 10;
const CHI_SO_LOCA = 11;

/** Tap code point ma font WOFF2 co glyph. */
function code_point_cua_woff2(duong_dan) {
  const b = readFileSync(duong_dan);
  assert.equal(b.toString('latin1', 0, 4), 'wOF2', 'không phải tệp WOFF2');

  const so_bang = b.readUInt16BE(12);
  let cho = 48;
  let cho_trong_khoi = 0;
  let cmap = null; // { bat_dau, do_dai }

  for (let i = 0; i < so_bang; i++) {
    const co = b[cho];
    cho += 1;
    const chi_so = co & 0x3f;
    const ban_bien_doi = (co >> 6) & 0x03;
    if (chi_so === 0x3f) cho += 4; // the tuy y, 4 byte theo sau

    let goc;
    [goc, cho] = doc_base128(b, cho);

    // glyf/loca: ban 3 = KHONG bien doi. Cac bang khac: ban 0 = khong bien doi.
    const co_bien_doi = (chi_so === CHI_SO_GLYF || chi_so === CHI_SO_LOCA)
      ? ban_bien_doi !== 3
      : ban_bien_doi !== 0;

    let dai = goc;
    if (co_bien_doi) [dai, cho] = doc_base128(b, cho);

    if (chi_so === CHI_SO_CMAP) {
      assert.equal(co_bien_doi, false, 'cmap lẽ ra không bao giờ bị biến đổi trong WOFF2');
      cmap = { bat_dau: cho_trong_khoi, do_dai: dai };
    }
    cho_trong_khoi += dai;
  }

  assert.notEqual(cmap, null, 'không tìm thấy bảng cmap trong tệp font');

  const khoi = brotliDecompressSync(b.subarray(cho));
  return code_point_trong_cmap(khoi.subarray(cmap.bat_dau, cmap.bat_dau + cmap.do_dai));
}

/** Doc bang cmap sfnt -> tap code point. Chi can dinh dang 4 va 12. */
function code_point_trong_cmap(t) {
  const ra = new Set();
  const so_bang = t.readUInt16BE(2);

  for (let i = 0; i < so_bang; i++) {
    const cho = t.readUInt32BE(4 + i * 8 + 4);
    const dinh_dang = t.readUInt16BE(cho);

    if (dinh_dang === 4) {
      const so_doan = t.readUInt16BE(cho + 6) / 2;
      const cuoi = cho + 14;
      const dau = cuoi + so_doan * 2 + 2;
      for (let d = 0; d < so_doan; d++) {
        const c2 = t.readUInt16BE(cuoi + d * 2);
        const c1 = t.readUInt16BE(dau + d * 2);
        if (c2 === 0xffff && c1 === 0xffff) continue;
        for (let c = c1; c <= c2; c++) ra.add(c);
      }
    } else if (dinh_dang === 12) {
      const so_nhom = t.readUInt32BE(cho + 12);
      for (let g = 0; g < so_nhom; g++) {
        const o = cho + 16 + g * 12;
        const c1 = t.readUInt32BE(o);
        const c2 = t.readUInt32BE(o + 4);
        for (let c = c1; c <= c2; c++) ra.add(c);
      }
    }
  }
  return ra;
}

// ---------------------------------------------------------------- bai kiem

test('moi icon dung trong webapp deu co trong subset font', () => {
  const co = icon_co_san();
  const dung = icon_dang_dung();

  assert.ok(co.size > 10, `chi doc duoc ${co.size} icon tu icon.css — regex hong?`);
  assert.ok(dung.size > 5, `chi tim duoc ${dung.size} icon trong ma nguon — regex hong?`);

  const thieu = [...dung].filter(([ten]) => !co.has(ten));
  assert.deepEqual(
    thieu.map(([ten, tep]) => `${ten} (${tep})`), [],
    'Icon khong co trong subset font se KHONG HIEN ma khong bao loi gi.\n'
    + 'Hoac doi sang mot icon da co trong web/src/icon.css, hoac cat lai subset font\n'
    + 'theo huong dan ghi o dau tep do.',
  );
});

test('moi icon khai trong icon.css deu co GLYPH THAT trong tep woff2', () => {
  const trong_css = ma_trong_css();
  const trong_font = code_point_cua_woff2(TEP_FONT);

  assert.ok(trong_css.size > 10,
    `chi doc duoc ${trong_css.size} ma icon tu icon.css — regex hong?`);
  assert.ok(trong_font.size > 10,
    `chi doc duoc ${trong_font.size} code point tu font — bo doc woff2 hong?`);

  const thieu = [...trong_css]
    .filter(([, ma]) => !trong_font.has(ma))
    .map(([ten, ma]) => `${ten} (U+${ma.toString(16).toUpperCase()})`);

  assert.deepEqual(thieu, [],
    'Nhung icon nay co dong trong icon.css nhung KHONG co glyph trong font.\n'
    + 'Them icon la HAI viec: them dong CSS, va cat lai font. Chay lai lenh\n'
    + 'fontTools.subset ghi o dau web/src/icon.css voi day du danh sach ma icon.',
  );
});

test('font khong mang glyph du — moi glyph trong font deu duoc khai trong CSS', () => {
  // Chieu nguoc lai. Khong phai loi hien thi, nhung mot subset phinh len la dau hieu ai do
  // cat font bang danh sach ma khac danh sach trong CSS — va lan sau se cat thieu.
  const ma_css = new Set([...ma_trong_css().values()]);
  const du = [...code_point_cua_woff2(TEP_FONT)]
    .filter((ma) => !ma_css.has(ma))
    .map((ma) => `U+${ma.toString(16).toUpperCase()}`);

  assert.deepEqual(du, [],
    'Font chua glyph khong dung o dau. Cat lai font theo dung danh sach ma trong icon.css.');
});
