// Test phu glyph cua font. Chay bang `npm test` o thu muc goc.
//
// Vi sao can test nay: React Native KHONG tu tim font du phong nhu trinh duyet. Neu mot
// <Text> co fontFamily la Be Vietnam Pro va chuoi chua ky tu font khong co glyph, tren
// may that se ra O VUONG RONG — nhung tren web (react-native-web) trinh duyet van tim
// duoc font du phong nen hien binh thuong. Nghia la loi nay KHONG the phat hien bang
// cach chay thu app tren trinh duyet. Test tinh la cach duy nhat bat duoc.
//
// Da tung xay ra: → (U+2192) va ✓ (U+2713) khong co trong Be Vietnam Pro.
// Ky hieu khong co glyph phai ve qua <KyHieu> (khong dat fontFamily, dung font he thong).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEP_FONT = join(GOC, 'dien_thoai', 'tai_nguyen', 'font', 'BeVietnamPro-Regular.ttf');

// ---------------------------------------------------------------- doc cmap cua TTF
/** Doc bang thu muc cua tep TrueType -> { tag: [offset, do_dai] }. */
function bang_tep(b) {
  const so = b.readUInt16BE(4);
  const t = {};
  for (let i = 0; i < so; i++) {
    const o = 12 + i * 16;
    t[b.toString('latin1', o, o + 4)] = [b.readUInt32BE(o + 8), b.readUInt32BE(o + 12)];
  }
  return t;
}

/**
 * Tap code point ma font co glyph. Chi doc subtable Unicode (platform 3/1, 3/10, 0/x)
 * dinh dang 4 va 12 — du cho moi font Latin hien dai.
 */
function code_point_cua_font(duong_dan) {
  const b = readFileSync(duong_dan);
  const [cmap] = bang_tep(b)['cmap'];
  const so_bang = b.readUInt16BE(cmap + 2);

  let sub = null;
  for (let i = 0; i < so_bang; i++) {
    const o = cmap + 4 + i * 8;
    const pid = b.readUInt16BE(o);
    const eid = b.readUInt16BE(o + 2);
    const la_unicode = (pid === 3 && (eid === 1 || eid === 10)) || pid === 0;
    if (la_unicode) sub = cmap + b.readUInt32BE(o + 4);
  }
  assert.ok(sub !== null, 'khong tim thay bang cmap Unicode trong font');

  const cp = new Set();
  const dinh_dang = b.readUInt16BE(sub);
  if (dinh_dang === 4) {
    const doi = b.readUInt16BE(sub + 6);
    const so_doan = doi / 2;
    const o_cuoi = sub + 14;
    const o_dau = o_cuoi + doi + 2;
    for (let i = 0; i < so_doan; i++) {
      const cuoi = b.readUInt16BE(o_cuoi + i * 2);
      const dau = b.readUInt16BE(o_dau + i * 2);
      if (dau === 0xffff) continue;
      for (let c = dau; c <= cuoi; c++) cp.add(c);
    }
  } else if (dinh_dang === 12) {
    const so_nhom = b.readUInt32BE(sub + 12);
    for (let i = 0; i < so_nhom; i++) {
      const o = sub + 16 + i * 12;
      const dau = b.readUInt32BE(o);
      const cuoi = Math.min(b.readUInt32BE(o + 4), dau + 0x3000);
      for (let c = dau; c <= cuoi; c++) cp.add(c);
    }
  } else {
    assert.fail(`chua ho tro cmap dinh dang ${dinh_dang}`);
  }
  return cp;
}

const CO_GLYPH = code_point_cua_font(TEP_FONT);

// ---------------------------------------------------------------- tieng Viet
/** 133 ky tu tieng Viet co dau: khoi U+1EA0-1EF9 + cac ky tu roi rac. */
function ky_tu_tieng_viet() {
  const ds = [];
  for (let c = 0x1ea0; c <= 0x1ef9; c++) ds.push(c);
  ds.push(
    0x0102, 0x0103, 0x0110, 0x0111, 0x01a0, 0x01a1, 0x01af, 0x01b0,
    0x00c0, 0x00e0, 0x00c1, 0x00e1, 0x00c3, 0x00e3, 0x00c8, 0x00e8, 0x00c9, 0x00e9,
    0x00ca, 0x00ea, 0x00cc, 0x00ec, 0x00cd, 0x00ed, 0x00d2, 0x00f2, 0x00d3, 0x00f3,
    0x00d4, 0x00f4, 0x00d5, 0x00f5, 0x00d9, 0x00f9, 0x00da, 0x00fa, 0x00dd, 0x00fd,
    0x0128, 0x0129, 0x0168, 0x0169,
  );
  return [...new Set(ds)];
}

test('font phu du ky tu tieng Viet co dau', () => {
  const thieu = ky_tu_tieng_viet()
    .filter((c) => !CO_GLYPH.has(c))
    .map((c) => `U+${c.toString(16).toUpperCase().padStart(4, '0')} (${String.fromCodePoint(c)})`);
  assert.deepEqual(thieu, [], `font thieu ${thieu.length} ky tu Viet: ${thieu.join(' ')}`);
});

// ---------------------------------------------------------------- quet ma nguon app
function tep_tsx(thu_muc) {
  const ra = [];
  for (const ten of readdirSync(thu_muc)) {
    const dd = join(thu_muc, ten);
    if (statSync(dd).isDirectory()) ra.push(...tep_tsx(dd));
    else if (ten.endsWith('.tsx') || ten.endsWith('.ts')) ra.push(dd);
  }
  return ra;
}

// Ngoai le: ky hieu ve bang font he thong (khong dat fontFamily) thi khong can glyph.
//   - `nguon/thanh_phan.tsx`  : dinh nghia <KyHieu> va vi du trong comment.
//   - `app/(tabs)/_layout.tsx`: bieu tuong tab ve bang <Text> khong co fontFamily.
const MIEN_TRU = ['nguon/thanh_phan.tsx', 'app/(tabs)/_layout.tsx'];

test('ma nguon app khong dung ky tu ma font thieu glyph', () => {
  const goc_app = join(GOC, 'dien_thoai');
  const loi = [];

  for (const dd of [...tep_tsx(join(goc_app, 'app')), ...tep_tsx(join(goc_app, 'nguon'))]) {
    const tuong_doi = dd.slice(goc_app.length + 1).replaceAll('\\', '/');
    if (MIEN_TRU.includes(tuong_doi)) continue;

    const dong = readFileSync(dd, 'utf8').split('\n');
    for (const [i, d] of dong.entries()) {
      // Dong nao ve ky hieu qua <KyHieu> thi khong can glyph — component do co tinh
      // khong dat fontFamily. Duong thoat tuong minh, `grep KyHieu` ra het.
      if (d.includes('KyHieu')) continue;

      for (const ky_tu of d) {
        const c = ky_tu.codePointAt(0);
        if (c > 0x7f && !CO_GLYPH.has(c)) {
          loi.push(
            `${tuong_doi}:${i + 1} dung "${ky_tu}" (U+${c.toString(16).toUpperCase().padStart(4, '0')})`,
          );
        }
      }
    }
  }

  assert.deepEqual(
    loi,
    [],
    '\n  ' + loi.join('\n  ')
      + '\n\n  Font khong co glyph cho nhung ky tu tren. Tren may that se ra o vuong rong'
      + '\n  (tren web thi KHONG thay vi trinh duyet tu tim font du phong).'
      + '\n  Cach xu ly: doi sang ky tu font co (VD → thanh –), hoac ve qua <KyHieu>.\n',
  );
});
