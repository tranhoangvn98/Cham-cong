// Hang rao KHOANG CACH giua cac khoi giao dien.
//
// Loi co that (27/10/2026): hop thoai "Mat khau Microsoft moi" co mot hang nut nam TRONG o nhap
// (nut "Sao chep") va mot hang nut nua ngay sau hop thoai (nut "Dong"). Khong luat CSS nao bao dam
// khoang cach giua hai hang do, nen tren may nguoi dung hai nut dinh vao nhau — trong khi ban xem
// thu tren may khac van thay binh thuong.
//
// Bai kiem nay giu hai lop bao ve:
//   1. Luat CSS "chong dinh nhau" trong web/src/kieu.css phai con nguyen (khong ai xoa duoc am tham).
//   2. Nut phu cua mot o nhap phai nam CANH o (khung `.o-nhap-nut`), khong duoc xep duoi o bang
//      `.hang-nut` — vi hang nut thu hai de bi dinh vao hang nut hanh dong cua hop thoai.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'src');
const KIEU_CSS = readFileSync(join(GOC, 'kieu.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Moi tep .tsx trong web/src, dang [duong_dan_ngan, noi_dung]. */
function cac_tep_tsx(thu_muc = GOC, tien_to = '') {
  const ra = [];
  for (const m of readdirSync(thu_muc, { withFileTypes: true })) {
    const duong = join(thu_muc, m.name);
    const ten = tien_to === '' ? m.name : `${tien_to}/${m.name}`;
    if (m.isDirectory()) ra.push(...cac_tep_tsx(duong, ten));
    else if (/\.tsx$/.test(m.name)) ra.push([ten, readFileSync(duong, 'utf8')]);
  }
  return ra;
}

/** Doan CSS cua mot selector (gop moi lan khai bao, ke ca khi nam trong danh sach gop), '' neu khong co. */
function luat(selector) {
  const dich = selector.replace(/\s+/g, ' ').trim();
  const ra = [];
  for (const m of KIEU_CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    // Selector co the nam trong danh sach gop nhieu dong: lay danh sach, tach dau phay, bo dong
    // prelude cua @media neu co.
    const ds = m[1]
      .split(',')
      .map((s) => s.trim().split('\n').pop().trim().replace(/\s+/g, ' '));
    if (ds.includes(dich)) ra.push(m[2]);
  }
  return ra.join(';');
}

/** Khoa cang: `.hang-nut { ... }` khong duoc dinh nghia lai lung tung. */
test('.hang-nut luon co gap giua cac nut', () => {
  // `gap` la thu duy nhat tach hai nut nam canh nhau trong cung mot hang. Bo no di thi nut
  // "Luu" dan vao nut "Huy" — dung thu nguoi dung nhin thay.
  const css = luat('.hang-nut');
  assert.match(css, /gap:\s*\d/, '.hang-nut phai khai bao gap (px) giua cac nut');
});

test('hai khoi hanh dong lien nhau khong bao gio dinh nhau', () => {
  // Hai `.hang-nut` canh nhau (vi du hang nut phu cua o nhap va hang nut hanh dong cua hop
  // thoai) phai cach nhau mot khoang doc. Dung `var(--khoang-lon, 16px)` de neu token bi doi
  // ten thi van con gia tri du phong, khong thanh 0.
  for (const cap of ['.hang-nut + .hang-nut', '.o-nhap + .hang-nut', '.hop-thong-bao + .hang-nut']) {
    const css = luat(cap);
    assert.notEqual(css, '', `thieu luat "${cap}" trong kieu.css`);
    assert.match(css, /margin-top:\s*var\(--khoang-(lon|vua),\s*\d+px\)/,
      `"${cap}" phai co margin-top dung token kem gia tri du phong px`);
  }
  // Hàng nút NẰM TRONG khối (ô nhập, hộp thông báo) cũng phải cách khối một khoảng.
  for (const trong of ['.o-nhap > .hang-nut', '.hop-thong-bao > .hang-nut']) {
    assert.match(luat(trong), /margin-top:\s*var\(--khoang-(lon|vua),\s*\d+px\)/,
      `"${trong}" phai co margin-top dung token kem gia tri du phong px`);
  }
});

test('nut phu cua o nhap nam canh o, khong nam duoi o', () => {
  // Khung `.o-nhap-nut`: [o nhap ....][nut]. Nho vay nut "Sao chep" khong bao gio roi xuong
  // hang thu hai roi dan vao hang nut hanh dong ben duoi.
  const css = luat('.o-nhap-nut');
  assert.notEqual(css, '', 'thieu khung .o-nhap-nut trong kieu.css');
  assert.match(css, /display:\s*flex/);
  assert.match(css, /gap:\s*\d/);
  assert.match(luat('.o-nhap-nut > input'), /flex:\s*1/, 'o nhap phai dan rong');
  assert.match(luat('.o-nhap-nut > button'), /flex:\s*0/, 'nut phai giu nguyen be rong');
});

test('nut sao chep khong nam duoi o nhap', () => {
  // Anti-pattern da gay loi: `.o-nhap` chua mot `.hang-nut` chi de chua nut "Sao chep". Nut phu
  // nhu vay phai nam CANH o (`.o-nhap-nut`) — xep duoi o la no thanh hang nut thu hai, de dinh
  // vao hang nut hanh dong cua hop thoai.
  //
  // Hang nut trong `.o-nhap` van hop le khi do la NUT DIEU KHIEN cua chinh o do (chon cac ngay
  // lam viec, dong bo lai danh sach...), khong phai nut chep gia tri.
  const vi_pham = [];
  for (const [ten, ma] of cac_tep_tsx()) {
    const re = /<div className="o-nhap">/g;
    let m;
    while ((m = re.exec(ma)) !== null) {
      // Quet toi khi dong du `<div>` cua khoi nay lai.
      let i = m.index + 4;
      let sau = 1;
      let cuoi = ma.length;
      while (i < ma.length && sau > 0) {
        const mo = ma.indexOf('<div', i);
        const dong = ma.indexOf('</div>', i);
        if (dong === -1) break;
        if (mo !== -1 && mo < dong) { sau += 1; i = mo + 4; } else { sau -= 1; i = dong + 6; }
        if (sau === 0) cuoi = i;
      }
      const khoi = ma.slice(m.index, cuoi);
      if (khoi.includes('className="hang-nut"') && khoi.includes('clipboard.writeText')) {
        const dong = ma.slice(0, m.index).split('\n').length;
        vi_pham.push(`${ten}:${dong}`);
      }
    }
  }
  assert.deepEqual(vi_pham, [],
    `Dat nut sao chep vao .o-nhap-nut (canh o) thay vi .hang-nut trong .o-nhap:\n${vi_pham.join('\n')}`);
});
