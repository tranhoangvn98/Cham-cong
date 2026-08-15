// Moi icon dung trong webapp PHAI co trong web/src/icon.css.
//
// Font icon cua du an la ban CAT SUBSET, chi chua dung so icon dang dung (bo day du la
// 840 KB cho 5.800 icon). Nghia la go ten mot icon co that cua Tabler nhung chua nam
// trong subset thi khong co gi bao loi — no chi don gian KHONG HIEN, va lot qua ca
// typecheck lan build.
//
// Da dinh dung bay nay ba lan: 'cash', 'scale', 'folder'.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..');
const THU_MUC_WEB = join(GOC, 'web', 'src');

/** Ten icon co trong subset — lay tu chinh tep CSS. */
function icon_co_san() {
  const css = readFileSync(join(THU_MUC_WEB, 'icon.css'), 'utf8');
  const ra = new Set();
  for (const m of css.matchAll(/^\.bt-([a-z0-9-]+)::before/gm)) ra.add(m[1]);
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
