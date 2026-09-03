// Cong kiem soat J1.5: cuong che ranh gioi module bang CONG CU, khong bang quy uoc thu muc.
//
// Quy uoc thu muc chi song duoc den khi co nguoi voi. Mot bai kiem chay trong CI thi song
// duoc lau hon bat ky ai trong doi.
//
// Bon luat o day deu la cho da tung hong hoac chac chan se hong:
//   1. Chi mot tep duoc mo ket noi sang ERP 1 — neu khong, ba lop chan chi-doc thanh tuy chon
//      va so ket noi ta mo vao CSDL cua he thong khac khong ai dem duoc.
//   2. Khong noi chuoi vao SQL — mot cho noi chuoi la mot lo SQL injection tren CSDL san xuat.
//   3. Module giam sat khong nhap nguoc len tang tuyen — dao chieu phu thuoc.
//   4. Moi phep do phai co trong chi muc — phep do khong dang ky la phep do khong bao gio chay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const GOC = new URL('..', import.meta.url).pathname;
const NGUON = join(GOC, 'may_chu', 'src');

/** Duyet de quy, tra ve [duong_dan_tuong_doi, noi_dung]. */
function cac_tep(thu_muc, tien_to = '') {
  const ra = [];
  for (const ten of readdirSync(thu_muc)) {
    const day_du = join(thu_muc, ten);
    if (statSync(day_du).isDirectory()) {
      ra.push(...cac_tep(day_du, `${tien_to}${ten}/`));
    } else if (ten.endsWith('.ts')) {
      ra.push([`${tien_to}${ten}`, readFileSync(day_du, 'utf8')]);
    }
  }
  return ra;
}

/** Bo comment de khong bat nham vi du viet trong ghi chu. */
function bo_ghi_chu(ma) {
  return ma.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const TEP = cac_tep(NGUON);
const TEP_GIAM_SAT = TEP.filter(([t]) => t.startsWith('giam_sat/'));

test('chi `giam_sat/ket_noi_erp.ts` duoc mo ket noi sang ERP 1', () => {
  // Ba lop chan ghi (GRANT o Postgres, options trong chuoi ket noi, `begin read only` moi
  // truy van) deu nam trong tep do. Mot tep khac tu tao `pg.Pool` la di vong qua ca ba.
  const vi_pham = [];
  for (const [ten, ma] of TEP_GIAM_SAT) {
    if (ten === 'giam_sat/ket_noi_erp.ts') continue;
    const sach = bo_ghi_chu(ma);
    if (/from\s+'pg'/.test(sach) || /new\s+pg\.Pool/.test(sach) || /new\s+Pool\(/.test(sach)) {
      vi_pham.push(`${ten}: tu mo ket noi pg`);
    }
  }
  assert.deepEqual(vi_pham, [],
    `Chi \`giam_sat/ket_noi_erp.ts\` duoc mo ket noi ERP 1:\n${vi_pham.join('\n')}`);
});

test('khong noi chuoi vao SQL trong module giam sat', () => {
  // Tham so PHAI di qua $1,$2. Mot cho noi chuoi la mot lo SQL injection tren CSDL san xuat
  // cua he thong khac.
  //
  // HAI DIEU BAI KIEM NAY PHAI PHAN BIET DUOC, neu khong no vo dung:
  //
  //   a) Chuoi CO PHAI SQL khong. Khong the do bang "co chua tu khoa SQL": `.join(',')` cua
  //      JavaScript chua tu `join`, va mot thong bao loi tieng Viet co the chua tu `from`.
  //      Nen chi xet chuoi BAT DAU bang mot dong tu SQL sau khi bo khoang trang.
  //
  //   b) Cai duoc noi vao la HANG SO hay BIEN. Noi mot hang so viet HOA o cap module
  //      (`${COT_CO_HOI}`) la an toan — gia tri co dinh luc bien dich, khong ai tu ngoai
  //      dat duoc. Noi mot bien thuong thi khong.
  const vi_pham = [];
  const can_kiem = [...TEP_GIAM_SAT, ...TEP.filter(([t]) => t === 'tuyen/giam_sat.ts')];
  for (const [ten, ma] of can_kiem) {
    const sach = bo_ghi_chu(ma);
    for (const m of sach.matchAll(/`([^`]*)`/g)) {
      const noi_dung = m[1];
      if (!noi_dung.includes('${')) continue;
      // (a) chi xet chuoi that su la mot cau SQL
      if (!/^\s*(select|insert|update|delete|with)\b/i.test(noi_dung)) continue;
      // (b) chi bat khi cai duoc noi KHONG phai hang so viet HOA
      for (const bt of noi_dung.matchAll(/\$\{([^}]+)\}/g)) {
        const bieu_thuc = bt[1].trim();
        if (/^[A-Z][A-Z0-9_]*$/.test(bieu_thuc)) continue;
        vi_pham.push(`${ten}: noi \`${bieu_thuc}\` vao SQL`);
      }
    }
  }
  assert.deepEqual(vi_pham, [],
    `Dung tham so $1,$2 thay cho noi chuoi:\n${vi_pham.join('\n')}`);
});

test('module giam sat khong nhap nguoc len tang tuyen', () => {
  // `tuyen/` goi `giam_sat/`, khong bao gio nguoc lai. Dao chieu la mot vong phu thuoc, va
  // vong phu thuoc lam viec tach module ra de test tro nen bat kha thi.
  const vi_pham = [];
  for (const [ten, ma] of TEP_GIAM_SAT) {
    if (/from\s+'\.\.\/tuyen\//.test(bo_ghi_chu(ma))) vi_pham.push(`${ten} nhap tu tuyen/`);
  }
  assert.deepEqual(vi_pham, [], vi_pham.join('\n'));
});

test('moi phep do deu duoc dang ky trong chi muc', () => {
  // Mot phep do khong co trong `chi_muc.ts` la mot phep do KHONG BAO GIO CHAY: rule engine
  // chi tra cuu qua chi muc. No se nam do, duoc doc, duoc review, va khong lam gi ca.
  const chi_muc = TEP.find(([t]) => t === 'giam_sat/phep_do/chi_muc.ts')?.[1] ?? '';
  const nhom = TEP_GIAM_SAT.filter(([t]) =>
    t.startsWith('giam_sat/phep_do/') && !t.endsWith('chi_muc.ts') && !t.endsWith('kieu.ts'));

  const vi_pham = [];
  for (const [ten, ma] of nhom) {
    const xuat = [...bo_ghi_chu(ma).matchAll(/export const (PHEP_DO_\w+)/g)].map((m) => m[1]);
    if (xuat.length === 0) {
      vi_pham.push(`${ten}: khong xuat mang PHEP_DO_*`);
      continue;
    }
    for (const x of xuat) {
      if (!chi_muc.includes(x)) vi_pham.push(`${ten}: ${x} chua duoc them vao chi_muc.ts`);
    }
  }
  assert.deepEqual(vi_pham, [], vi_pham.join('\n'));
});

test('phep do khong tu goi CSDL cham cong truc tiep', () => {
  // Phep do doc du lieu qua `ctx.doc` / `ctx.doc_noi_bo` de test tiem duoc du lieu gia.
  // Nhap thang `csdl/ket_noi.ts` la lam phep do do khong test duoc neu khong co CSDL that.
  const vi_pham = [];
  for (const [ten, ma] of TEP_GIAM_SAT) {
    if (!ten.startsWith('giam_sat/phep_do/')) continue;
    if (/from\s+'\.\.\/\.\.\/csdl\//.test(bo_ghi_chu(ma))) {
      vi_pham.push(`${ten}: nhap thang csdl/, phai dung ctx.doc_noi_bo`);
    }
  }
  assert.deepEqual(vi_pham, [], vi_pham.join('\n'));
});

test('khong hardcode ten database ERP 1 trong ma nguon', () => {
  // Ten database chon tren man hinh va luu o bang `nguon_du_lieu`. Chet cung mot ten trong
  // code la thu phai sua bang mot lan deploy — va ten trong ma nguon ERP 1 la ten UAT,
  // chua chac dung.
  const TEN_UAT = ['cms_uat', 'xnk_banhang', 'xnk_debt_uat', 'xnk_logs_uat', 'inventorydb',
    'hrm_db'];
  const vi_pham = [];
  for (const [ten, ma] of [...TEP_GIAM_SAT, ...TEP.filter(([t]) => t === 'tuyen/giam_sat.ts')]) {
    const sach = bo_ghi_chu(ma);
    for (const db of TEN_UAT) {
      if (sach.includes(`'${db}'`) || sach.includes(`"${db}"`)) {
        vi_pham.push(`${ten}: hardcode ten database "${db}"`);
      }
    }
  }
  assert.deepEqual(vi_pham, [], vi_pham.join('\n'));
});
