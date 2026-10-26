// Kiem tra quy uoc goi y: khong con khoi mo ta dai .goi-y trong web; moi mo ta dung <GoiY>.
//
// Trang thai / loi duoc phep hien truc tiep bang `goi-y giu-hien` hoac `goi-y chu-xau`.
// Muc dich: sau nay them o nhap moi khong vo tinh bày lai mot doan huong dan dai duoi o.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const goc = path.resolve('web/src');

function tep_tsx(dir) {
  const ra = [];
  for (const ten of fs.readdirSync(dir)) {
    const p = path.join(dir, ten);
    if (fs.statSync(p).isDirectory()) ra.push(...tep_tsx(p));
    else if (p.endsWith('.tsx')) ra.push(p);
  }
  return ra;
}

test('khong con khoi mo ta .goi-y truc tiep — dung component GoiY', () => {
  const sai = [];
  for (const tep of tep_tsx(goc)) {
    const noi_dung = fs.readFileSync(tep, 'utf8');
    for (const dong of noi_dung.split('\n')) {
      if (dong.includes('className="goi-y"')) {
        sai.push(`${path.relative(goc, tep)}: ${dong.trim()}`);
      }
    }
  }
  assert.deepEqual(sai, [], 'Cac khoi mo ta sau phai doi sang <GoiY> hoac them giu-hien:\n'
    + sai.join('\n'));
});

test('GoiY co nut ? va bong goi y; CSS co lop tuong ung', () => {
  const component = fs.readFileSync(path.join(goc, 'goi_y.tsx'), 'utf8');
  assert.match(component, /tro-giup-nut/);
  assert.match(component, /tro-giup-bong/);
  const css = fs.readFileSync(path.join(goc, 'kieu.css'), 'utf8');
  assert.match(css, /\.tro-giup-nut\s*\{/);
  assert.match(css, /\.tro-giup-bong\s*\{/);
});
