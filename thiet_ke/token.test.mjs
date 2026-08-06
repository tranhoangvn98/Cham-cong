// Test cho design token. Chay bang `npm test` o thu muc goc.
//
// Hai viec test nay giu:
//   1. Tuong phan mau dat WCAG AA (4.5:1 cho chu thuong, 3:1 cho vien/o mau) o CA HAI
//      che do sang/toi. Nghiem thu F1 doi "render dung o ca sang/toi" — mot token doc
//      duoc o che do sang nhung mo o che do toi la loi, khong phai y thich.
//   2. Hai tep sinh ra con khop token.json. Sua token.json ma quen `npm run sinh_token`
//      la test do ngay, khong de lech am tham.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { doc_token, noi_dung_du_kien, DUONG_DAN_CSS, DUONG_DAN_TS } from './sinh_token.mjs';

const t = doc_token();

/** Hai nen tang, hai bo theme (Metronic cho web, Compose Boltuix cho mobile). */
const NEN_TANG = ['web', 'mobile'];

// ---------------------------------------------------------------- tuong phan WCAG
function ve_rgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

/** Do sang tuong doi theo WCAG 2.1. */
function do_sang(hex) {
  const [r, g, b] = ve_rgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function tuong_phan(a, b) {
  const [x, y] = [do_sang(a), do_sang(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// [chu, nen, ty le toi thieu, mo ta]
const CAP_CHU = [
  ['chu', 'nen', 4.5], ['chu', 'nen_the', 4.5], ['chu', 'nen_mo', 4.5],
  ['chu_nhat', 'nen', 4.5], ['chu_nhat', 'nen_the', 4.5],
  ['chu_mo', 'nen_the', 4.5],
  // `chinh` (#4285F4) chi to mang, khong bao gio dat chu len — xem token.json.
  // Chu / nhan nut / lien ket dung `chinh_dam`.
  ['chinh_dam', 'nen_the', 4.5], ['chinh_dam', 'nen', 4.5],
  ['chinh_dam', 'chinh_nhat', 4.5],
  ['tren_chinh', 'chinh_dam', 4.5],
  ['nhan', 'nen_the', 4.5], ['nhan', 'nhan_nen', 4.5],
  ['tot', 'nen_the', 4.5], ['tot', 'tot_nen', 4.5],
  ['canh_bao', 'nen_the', 4.5], ['canh_bao', 'canh_bao_nen', 4.5],
  ['xau', 'nen_the', 4.5], ['xau', 'xau_nen', 4.5],
  ['lanh', 'nen_the', 4.5], ['lanh', 'lanh_nen', 4.5],
];

// Thanh phan phi van ban: WCAG 1.4.11 doi 3:1 cho thanh phan giao dien, vien trang tri
// thi thap hon cung duoc.
const CAP_VIEN = [
  ['chinh', 'nen_the', 3], ['chinh', 'nen', 3],
  ['vien', 'nen_the', 1.2], ['vien_dam', 'nen_the', 1.5],
];

// Cap chi co o mot nen tang. Thanh ben cua web la mang TOI co dinh nen mau chu tren no
// khong the lay tu bang mau chung.
const CAP_RIENG = {
  web: [
    ['chu_ben', 'nen_ben', 4.5],
    ['chu_ben_mo', 'nen_ben', 4.5],
    ['chu_ben_sang', 'nen_ben', 4.5],
    ['lien_ket_ben', 'nen_ben', 4.5],
  ],
  mobile: [],
};

for (const nt of NEN_TANG) for (const che_do of ['sang', 'toi']) {
  test(`tuong phan mau dat WCAG AA — ${nt} / che do ${che_do}`, () => {
    const m = t[nt].mau[che_do];
    const loi = [];
    for (const [chu, nen, toi_thieu] of [...CAP_CHU, ...CAP_VIEN, ...CAP_RIENG[nt]]) {
      assert.ok(m[chu] !== undefined, `thieu token mau: ${chu}`);
      assert.ok(m[nen] !== undefined, `thieu token mau: ${nen}`);
      const ty_le = tuong_phan(m[chu], m[nen]);
      if (ty_le < toi_thieu) {
        loi.push(`${chu}(${m[chu]}) tren ${nen}(${m[nen]}) = ${ty_le.toFixed(2)}:1, can >= ${toi_thieu}`);
      }
    }
    assert.deepEqual(loi, [], `\n  ${loi.join('\n  ')}\n`);
  });
}

for (const nt of NEN_TANG) {
  test(`hai che do co cung tap khoa mau — ${nt}`, () => {
    const sang = Object.keys(t[nt].mau.sang).sort();
    const toi = Object.keys(t[nt].mau.toi).sort();
    assert.deepEqual(toi, sang);
  });
}

test('y_nghia_mau dung duoc tren CA HAI nen tang', () => {
  // Mot ngay "du cong" khong duoc ra hai mau khac nhau o web va app.
  for (const [trang_thai, khoa] of Object.entries(t.y_nghia_mau)) {
    if (trang_thai.startsWith('_')) continue;
    for (const nt of NEN_TANG) {
      assert.ok(t[nt].mau.sang[khoa] !== undefined,
        `y_nghia_mau.${trang_thai} tro toi '${khoa}' — ${nt} khong co khoa nay`);
    }
  }
});

// ---------------------------------------------------------------- tep sinh ra con khop
test('tep sinh ra khop token.json (da chay npm run sinh_token?)', () => {
  const { css, ts } = noi_dung_du_kien();
  assert.equal(readFileSync(DUONG_DAN_CSS, 'utf8'), css,
    'web/src/token_thiet_ke.css lech token.json — chay: npm run sinh_token');
  assert.equal(readFileSync(DUONG_DAN_TS, 'utf8'), ts,
    'dien_thoai/nguon/token_thiet_ke.ts lech token.json — chay: npm run sinh_token');
});

// ---------------------------------------------------------------- font
test('khong quay ve Poppins o bat ky nen tang nao', () => {
  // Poppins (token spec v2 de nghi cho mobile) chi co 471 glyph va thieu 88 ky tu Viet —
  // xem token.json. Test nay chan viec doi nguoc lai.
  for (const nt of NEN_TANG) {
    assert.notEqual(t[nt].chu_viet.ho, 'Poppins',
      `${nt}: Poppins khong ho tro tieng Viet (thieu o u va khoi U+1EA0-1EF9).`);
    assert.ok(t[nt].chu_viet.du_phong.includes('system-ui'), `${nt}: phai co font du phong`);
  }
});

test('web va mobile la HAI bo theme khac nhau (dung y ke hoach v2 muc 4.5)', () => {
  assert.notEqual(t.web.chu_viet.ho, t.mobile.chu_viet.ho, 'hai nen tang phai khac font');
  assert.notEqual(t.web.mau.sang.chinh, t.mobile.mau.sang.chinh, 'hai nen tang phai khac mau chinh');
});
