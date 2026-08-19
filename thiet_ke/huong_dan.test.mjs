// Moi trang trong thanh dieu huong PHAI co huong dan, va moi vai tro trong huong dan PHAI co that.
//
// Hai chieu, vi mat nao dut cung im lang nhu nhau:
//
//   App.tsx (thanh dieu huong)  <->  huong_dan.ts (bang quy trinh)  <->  api.ts (vai tro that)
//
// Them mot trang moi ma quen huong dan thi khong co gi bao — trang do don gian khong hien khung
// quy trinh, va nguoi dung moi khong biet phai lam gi o do. Go mot trang ma quen go huong dan thi
// bang phinh ra nhung muc chet ma khong ai doc lai.
//
// Va go sai ten mot vai tro (`truong_phong_hr` thay vi `truong_phong_nhan_su`) thi TypeScript bat
// duoc — nhung chi khi ten vai tro trong `huong_dan.ts` con noi voi kieu that cua `api.ts`. Bai
// thu ba giu dung moi noi do.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'src');
const app = readFileSync(join(GOC, 'App.tsx'), 'utf8');
const huong_dan = readFileSync(join(GOC, 'huong_dan.ts'), 'utf8');
const api = readFileSync(join(GOC, 'api.ts'), 'utf8');

/** Cac duong dan khai trong thanh dieu huong cua App.tsx. */
function duong_dan_menu() {
  return [...app.matchAll(/duong_dan: '([^']+)'/g)].map((m) => m[1]);
}

/** Cac duong dan co huong dan. */
function duong_dan_huong_dan() {
  return [...huong_dan.matchAll(/duong_dan: '([^']+)'/g)].map((m) => m[1]);
}

test('moi trang trong thanh dieu huong deu co huong dan', () => {
  const menu = duong_dan_menu();
  const co = new Set(duong_dan_huong_dan());
  assert.ok(menu.length >= 15, `chi doc duoc ${menu.length} muc menu — App.tsx da doi cau truc?`);

  const thieu = menu.filter((d) => !co.has(d));
  assert.deepEqual(thieu, [],
    `Cac trang sau chua co huong dan trong web/src/huong_dan.ts: ${thieu.join(', ')}`);
});

test('khong co huong dan cho trang khong ton tai', () => {
  const menu = new Set(duong_dan_menu());
  const thua = duong_dan_huong_dan().filter((d) => !menu.has(d));
  assert.deepEqual(thua, [],
    `Huong dan cho trang khong con trong thanh dieu huong: ${thua.join(', ')}`);
});

test('moi vai tro nhac trong huong dan deu co that trong api.ts', () => {
  // `VaiTroNguoiDung` la nguon su that ve vai tro. Mot ten vai tro go nham trong `huong_dan.ts`
  // se lam buoc do KHONG hien voi ai ca — im lang tuyet doi.
  const khai = /export type VaiTroNguoiDung =\s*([^;]+);/.exec(api);
  assert.notEqual(khai, null, 'khong tim thay khai bao VaiTroNguoiDung trong api.ts');
  const that = new Set([...khai[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));
  assert.ok(that.size >= 5, `chi doc duoc ${that.size} vai tro`);

  // Chi lay chuoi trong cac mang `vai_tro: [...]` cua bang huong dan.
  const dung = new Set();
  for (const m of huong_dan.matchAll(/vai_tro: \[([^\]]*)\]/g)) {
    for (const v of m[1].matchAll(/'([a-z_]+)'/g)) dung.add(v[1]);
  }
  // Va ca hang so NHAN_SU o dau tep.
  const ns = /export const NHAN_SU: readonly VaiTro\[\] = \[([^\]]*)\]/.exec(huong_dan);
  assert.notEqual(ns, null, 'khong tim thay hang so NHAN_SU');
  for (const v of ns[1].matchAll(/'([a-z_]+)'/g)) dung.add(v[1]);

  const la = [...dung].filter((v) => !that.has(v));
  assert.deepEqual(la, [], `Vai tro khong co that duoc nhac trong huong_dan.ts: ${la.join(', ')}`);
});

test('moi huong dan co tom tat va it nhat mot buoc', () => {
  // Mot muc rong van qua duoc hai bai tren, va tren man hinh no ra mot khung trong.
  const khoi = huong_dan.split(/\n  \{\n    duong_dan: /).slice(1);
  assert.ok(khoi.length >= 15, `chi tach duoc ${khoi.length} khoi huong dan`);
  for (const k of khoi) {
    const ten = /^'([^']+)'/.exec(k)?.[1] ?? '(?)';
    assert.match(k, /tom_tat: '/, `${ten}: thieu tom_tat`);
    assert.match(k, /buoc: \[\s*\{/, `${ten}: khong co buoc nao`);
  }
});

test('`la_nhan_su` cua giao dien khop `can_nhan_su` cua may chu', () => {
  // Lech hai ben la kieu hong te nhat cua phan quyen: may chu cho vao, giao dien AN di. Nguoi
  // dung thay mot ung dung cut va khong co gi noi vi sao. Da xay ra that voi
  // `truong_phong_nhan_su`.
  const xac_thuc = readFileSync(
    join(GOC, '..', '..', 'may_chu', 'src', 'bao_mat', 'xac_thuc.ts'), 'utf8');
  const may_chu = /export const can_nhan_su = can_vai_tro\(([^)]*)\)/.exec(xac_thuc);
  assert.notEqual(may_chu, null, 'khong tim thay can_nhan_su trong may chu');
  const ben_may_chu = new Set([...may_chu[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));

  const web = /export function la_nhan_su\(\): boolean \{[\s\S]*?\n\}/.exec(api);
  assert.notEqual(web, null, 'khong tim thay la_nhan_su trong api.ts');
  const ben_web = new Set([...web[0].matchAll(/v === '([a-z_]+)'/g)].map((m) => m[1]));

  assert.deepEqual([...ben_web].sort(), [...ben_may_chu].sort(),
    'la_nhan_su (web) va can_nhan_su (may chu) khong cung mot tap vai tro');
});
