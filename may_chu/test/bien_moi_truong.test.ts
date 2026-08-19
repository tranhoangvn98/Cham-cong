// Moi bien cau_hinh.ts doc PHAI co ten trong docker-compose.yml.
//
// docker-compose.yml khai `environment:` tuong minh chu khong dung `env_file`. Nghia la
// bien nam trong .env cua VPS van KHONG vao duoc container neu quen them dong tuong ung.
// Ung dung khong bao loi — no chay bang gia tri mac dinh, lang le sai. Da dinh dung bay
// nay that: API_GOC_CONG_KHAI khai trong .env nhung thieu trong compose, ban mo ta OpenAPI
// mat muc `servers` va bo sinh client tro het ve http://localhost.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Bien khong den tu compose — co ly do rieng, ghi ro de nguoi sau khong phai doan. */
const MIEN_TRU = new Map<string, string>([
  // Compose ghep tu POSTGRES_PASSWORD thanh DATABASE_URL, khong truyen thang.
  ['POSTGRES_PASSWORD', 'compose ghep vao DATABASE_URL'],
]);

function bien_cau_hinh_doc(): Set<string> {
  const ma = readFileSync(join(GOC, 'may_chu', 'src', 'cau_hinh.ts'), 'utf8');
  const ra = new Set<string>();
  // bat_buoc('X') | so('X', ...) | chu('X', ...) — chi bat chuoi hang, bien dong thi
  // khong the kiem tinh duoc va cung khong nen dung o day.
  for (const m of ma.matchAll(/\b(?:bat_buoc|so|chu)\(\s*'([A-Z][A-Z0-9_]*)'/g)) {
    ra.add(m[1]!);
  }
  return ra;
}

/** Ten bien duoc dat trong khoi `environment:` cua service may_chu. */
function bien_compose_dat(): Set<string> {
  const yml = readFileSync(join(GOC, 'docker-compose.yml'), 'utf8').split('\n');
  const ra = new Set<string>();
  let trong_khoi = false;
  let thut_khoi = 0;
  for (const dong of yml) {
    if (dong.trim() === '' || dong.trim().startsWith('#')) continue;
    const thut = dong.length - dong.trimStart().length;
    if (/^\s*environment:\s*$/.test(dong)) {
      trong_khoi = true;
      thut_khoi = thut;
      continue;
    }
    if (!trong_khoi) continue;
    if (thut <= thut_khoi) { trong_khoi = false; continue; }
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(dong);
    if (m !== null) ra.add(m[1]!);
  }
  return ra;
}

test('bien cau_hinh.ts doc deu co trong docker-compose.yml', () => {
  const can = bien_cau_hinh_doc();
  const co = bien_compose_dat();
  assert.ok(can.size > 10, `chi doc duoc ${can.size} bien tu cau_hinh.ts — regex hong?`);
  assert.ok(co.size > 10, `chi doc duoc ${co.size} bien tu docker-compose.yml — bo doc hong?`);

  const thieu = [...can].filter((b) => !co.has(b) && !MIEN_TRU.has(b));
  assert.deepEqual(thieu, [],
    `Thieu trong khoi environment: cua docker-compose.yml: ${thieu.join(', ')}.\n`
    + 'Them dong `TEN_BIEN: ${TEN_BIEN:-mac_dinh}` vao service may_chu. Dat trong .env thoi\n'
    + 'la KHONG du: compose khai environment tuong minh nen bien khong co ten o do se bi bo.');
});

test('bien nao cung duoc ta trong .env.example', () => {
  const vd = readFileSync(join(GOC, '.env.example'), 'utf8');
  const co = new Set<string>();
  for (const dong of vd.split('\n')) {
    const m = /^\s*#?\s*([A-Z][A-Z0-9_]*)=/.exec(dong);
    if (m !== null) co.add(m[1]!);
  }
  // NODE_ENV / PORT do compose dat cung, nguoi trien khai khong can biet toi.
  const khong_can_ta = new Set(['NODE_ENV', 'PORT']);
  const thieu = [...bien_cau_hinh_doc()].filter((b) => !co.has(b) && !khong_can_ta.has(b));
  assert.deepEqual(thieu, [],
    `Thieu trong .env.example: ${thieu.join(', ')} — nguoi trien khai khong co cach nao biet.`);
});
