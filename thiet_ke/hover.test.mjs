// Nut/tab CO MAU phai GIU MAU khi hover.
//
// Quy tac chung `button:hover:not(:disabled) { background: var(--nen-mo); }` trong kieu.css
// lam moi nut khong co hover rieng bien thanh xam khi di chuot — nut xanh bien thanh xam,
// chu trang tren nen xam chim xuong, tab dang chon mat lop nen mau. Nguoi dung da phan nan
// "di chuot vao nut bi mat mau" (2026-09-21, trang Cong viec).
//
// Test nay canh cac lop mau DA BI MAC PHai (ke ca cac mau "rua troi" xam) — them mot nut mau
// moi thi PHai khai hover rieng o day, khong duoc de no roi vao quy tac chung.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'src');
const css = readFileSync(join(GOC, 'kieu.css'), 'utf8');

/** Cac nen "rua troi": hover rơi vao nen nay tren nut co mau = mat mau. */
const NEN_RUA = ['var(--nen-mo)', 'var(--nen-nhat)', 'var(--nen-the)', 'var(--vien-ben)'];

/** Lop mau bat buoc co hover rieng (ky tu `^` de mong mat tham chieu khi sai ten). */
const CAC_LOP_MAU = [
  '.nut-chinh', '.nut-nguy', '.nut-lanh', '.nut-phang',
  '.cn-nut-chinh-dam', '.cn-nut-canh-bao', '.cn-chip-chon',
  '.vt-nut-chon', '.cv-tab-chon', '.cv-tab',
  '.hang-tab button.dang-chon', '.hang-tab a.dang-chon',
  '.thanh-tab .tab-dang-mo',
  '.cn-tab-ben-chon', '.cn-ben-phu-chon',
  '.dieu-huong a.dang-chon',
  '.troly-dau .nut-phang', '.troly-hd-xac-nhan', '.troly-chip-mo',
];

/** Tim than cac quy tac `selector:hover...` DUNG DAU DONG (bo qua ngữ cảnh khac, vi du
 *  `.chan-thanh-ben .nut-phang:hover` o thanh ben toi dung vien-ben la DUNG, khong phai rua). */
function hover_rules(selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^[ \\t]*${esc}:hover[^{]*\\{`, 'gm');
  const ra = [];
  for (const m of css.matchAll(re)) {
    const bat_dau = m.index + m[0].length;
    const ket = css.indexOf('}', bat_dau);
    assert.notEqual(ket, -1, `${selector}:hover thieu dau dong "}"`);
    ra.push(css.slice(bat_dau, ket));
  }
  return ra;
}

test('nut/tab co mau deu co hover rieng khong rua troi mau', () => {
  for (const lop of CAC_LOP_MAU) {
    const cac = hover_rules(lop);
    assert.ok(cac.length >= 1, `${lop} khong co quy tac hover rieng — se roi vao nen xam chung`);
    for (const than of cac) {
      for (const nen of NEN_RUA) {
        assert.ok(!than.includes(`background: ${nen}`),
          `${lop}:hover dung nen rua troi ${nen} — mat mau khi di chuot`);
      }
    }
  }
});
