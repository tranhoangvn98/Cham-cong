// Cac hang rao ve GIAO DIEN ma typecheck va build khong bat duoc.
//
// Ba thu duoi day deu "chay duoc" nen khong co gi bao loi — chung chi lam ung dung te hon voi
// nguoi dung that, va lan nao cung quay lai neu khong co bai kiem giu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'src');

/** Moi tep .ts/.tsx trong web/src, dang [duong_dan_ngan, noi_dung]. */
function cac_tep(thu_muc = GOC, tien_to = '') {
  const ra = [];
  for (const m of readdirSync(thu_muc, { withFileTypes: true })) {
    const duong = join(thu_muc, m.name);
    const ten = tien_to === '' ? m.name : `${tien_to}/${m.name}`;
    if (m.isDirectory()) ra.push(...cac_tep(duong, ten));
    else if (/\.tsx?$/.test(m.name)) ra.push([ten, readFileSync(duong, 'utf8')]);
  }
  return ra;
}

/** Bo cac dong comment de khong bat chinh phan giai thich "vi sao khong dung X". */
function bo_ghi_chu(ma) {
  return ma
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((d) => !/^\s*(\/\/|\*)/.test(d))
    .join('\n');
}

test('khong dung hop thoai goc cua trinh duyet', () => {
  // `window.confirm` / `alert` / `prompt` khong theo che do toi, khong theo font va mau cua app,
  // khong to duoc nut xoa khac nut huy — va o nhieu trinh duyet co o "chan trang nay hien hop
  // thoai": nguoi dung tick vao thi tu do moi lan bam Xoa se KHONG hoi gi ma cung KHONG xoa.
  //
  // Thay bang `dung_xac_nhan()` / `dung_nhap_chu()` trong thanh_phan.tsx.
  const vi_pham = [];
  for (const [ten, ma] of cac_tep()) {
    for (const m of bo_ghi_chu(ma).matchAll(/window\.(confirm|alert|prompt)\s*\(/g)) {
      vi_pham.push(`${ten}: window.${m[1]}`);
    }
  }
  assert.deepEqual(vi_pham, [],
    `Dung dung_xac_nhan() / dung_nhap_chu() thay cho hop thoai goc:\n${vi_pham.join('\n')}`);
});

test('moi icon trong thanh dieu huong la RIENG BIET trong cung mot danh sach', () => {
  // Hai muc cung icon thi thanh ben mat tac dung quet nhanh: mat nhin thay hai dong giong nhau
  // va phai doc chu moi phan biet duoc. Da tung co: `fingerprint` cho ca "Chấm công" va "Mã
  // định danh", `key` cho ca "Tài khoản" va "Khóa API".
  //
  // Rang buoc la trong TUNG bang: `MENU` va `MENU_CAI_DAT` la hai danh sach hien o hai cho khac
  // nhau, nen mot icon dung o ca hai khong gay nham lan.
  const app = readFileSync(join(GOC, 'App.tsx'), 'utf8');

  for (const ten_bang of ['MENU', 'MENU_CAI_DAT']) {
    const khoi = new RegExp(`const ${ten_bang}: MucMenu\\[\\] = \\[([\\s\\S]*?)\\n\\];`)
      .exec(app);
    assert.notEqual(khoi, null, `khong tim thay bang ${ten_bang} trong App.tsx`);

    const icon = [...khoi[1].matchAll(/icon: '([a-z0-9-]+)'/g)].map((m) => m[1]);
    assert.ok(icon.length >= 5, `${ten_bang}: chi doc duoc ${icon.length} icon — regex hong?`);

    const trung = icon.filter((v, i) => icon.indexOf(v) !== i);
    assert.deepEqual([...new Set(trung)], [],
      `${ten_bang}: icon dung hai lan trong cung mot danh sach: ${[...new Set(trung)].join(', ')}`);
  }
});

/**
 * Cat mot the JSX mo dau, tu `<ten` den dau `>` DONG THE.
 *
 * Khong the dung `/<tr[\s\S]*?>/`: dau `>` xuat hien som hon trong chinh thuoc tinh — mot
 * `onKeyDown={(e) => ...}` co `=>`, va regex khong tham se cat the ngay tai do roi bao thieu
 * `onKeyDown`. Dem do sau ngoac de biet dau `>` nao that su dong the.
 */
function cac_the(ma, ten) {
  const ra = [];
  const re = new RegExp(`<${ten}\\b`, 'g');
  for (const m of ma.matchAll(re)) {
    let sau = 0;
    let i = m.index + m[0].length;
    for (; i < ma.length; i++) {
      const c = ma[i];
      if (c === '{' || c === '(') sau++;
      else if (c === '}' || c === ')') sau--;
      else if (c === '>' && sau === 0) break;
    }
    ra.push(ma.slice(m.index, i + 1));
  }
  return ra;
}

test('hang bang bam duoc phai dung duoc bang BAN PHIM', () => {
  // Mot `<tr onClick>` khong co `tabIndex` thi ban phim khong toi duoc, va trinh doc man hinh
  // khong biet no bam duoc. Doi voi nguoi khong dung chuot, hang do khong ton tai.
  const vi_pham = [];
  for (const [ten, ma] of cac_tep()) {
    for (const the of cac_the(ma, 'tr')) {
      if (!the.includes('onClick')) continue;
      if (!the.includes('tabIndex')) vi_pham.push(`${ten}: <tr onClick> thieu tabIndex`);
      else if (!the.includes('onKeyDown')) vi_pham.push(`${ten}: <tr onClick> thieu onKeyDown`);
    }
  }
  assert.deepEqual(vi_pham, [], vi_pham.join('\n'));
});

test('khong dung chi so mang lam `key` cua React', () => {
  // `key={i}` dung khi danh sach chi duoc THEM vao cuoi. Ngay khi co loc / xoa / sap xep, React
  // gan lai trang thai cua dong nay cho dong khac — o dang mo van mo nhung thuoc ve nguoi khac.
  //
  // Danh sach chi doc, sinh lai toan bo moi lan, thi dung `khoa_tinh(noi_dung, i)` — van co vi
  // tri trong khoa nhung noi ro y do bang mot cai ten.
  const vi_pham = [];
  for (const [ten, ma] of cac_tep()) {
    for (const m of bo_ghi_chu(ma).matchAll(/key=\{(i|idx|index|so_thu_tu)\}/g)) {
      vi_pham.push(`${ten}: key={${m[1]}}`);
    }
  }
  assert.deepEqual(vi_pham, [],
    `Dung khoa on dinh (id / ma) hoac khoa_tinh() thay cho chi so mang:\n${vi_pham.join('\n')}`);
});

// ---------------------------------------------------------------- dieu huong khu Cai dat
//
// Gom 11 trang cau hinh vao `/cai-dat/<muc>` tao ra ba mat xich moi, va mat nao dut cung im
// lang: muc menu tro toi duong khong co `case` (trang trang), `case` khong co muc menu (khong
// ai vao duoc), va duong dan CU tro toi duong moi khong ton tai (bookmark thanh 404).

function app_tsx() {
  return readFileSync(join(GOC, 'App.tsx'), 'utf8');
}

/** Cac `duong_dan:` trong mot bang MucMenu[]. */
function duong_trong_bang(ten_bang) {
  const m = new RegExp(`const ${ten_bang}: MucMenu\\[\\] = \\[([\\s\\S]*?)\\n\\];`).exec(app_tsx());
  assert.notEqual(m, null, `khong tim thay bang ${ten_bang}`);
  return [...m[1].matchAll(/duong_dan: '([^']+)'/g)].map((x) => x[1]);
}

/** Cac `case '...'` trong mot ham dinh tuyen. */
function case_trong_ham(ten_ham) {
  const m = new RegExp(`function ${ten_ham}\\(([\\s\\S]*?)\\n\\}`).exec(app_tsx());
  assert.notEqual(m, null, `khong tim thay ham ${ten_ham}`);
  return [...m[1].matchAll(/case '([^']+)':/g)].map((x) => x[1]);
}

test('moi muc con cua Cai dat co trang that, va nguoc lai', () => {
  const menu = duong_trong_bang('MENU_CAI_DAT');
  const tuyen = case_trong_ham('NoiDungCaiDat');
  assert.ok(menu.length >= 8, `chi doc duoc ${menu.length} muc con — regex hong?`);

  assert.deepEqual(menu.filter((d) => !tuyen.includes(d)), [],
    'Muc con co trong MENU_CAI_DAT nhung khong co case trong NoiDungCaiDat -> trang trang');
  assert.deepEqual(tuyen.filter((d) => !menu.includes(d)), [],
    'Case trong NoiDungCaiDat nhung khong co muc menu -> khong ai vao duoc');
});

test('moi trang cap mot co case trong bo dinh tuyen', () => {
  // `/cai-dat` di qua nhanh rieng (`KhungCaiDat`) chu khong qua `switch`, nen tru ra.
  const menu = duong_trong_bang('MENU').filter((d) => d !== '/cai-dat');
  const tuyen = case_trong_ham('NoiDung');
  assert.deepEqual(menu.filter((d) => !tuyen.includes(d)), [],
    'Muc menu khong co case trong NoiDung -> bam vao ra "Không có trang này"');
});

test('duong dan cu chuyen huong toi duong moi CO THAT', () => {
  // Nguoi dung da bookmark `/tham-so-luong`. Tro no toi mot duong khong ton tai thi bookmark
  // do thanh 404 — te hon la khong doi duong dan.
  const m = /const CHUYEN_HUONG: Record<string, string> = \{([\s\S]*?)\n\};/.exec(app_tsx());
  assert.notEqual(m, null, 'khong tim thay bang CHUYEN_HUONG');
  const cap = [...m[1].matchAll(/'([^']+)': '([^']+)'/g)].map((x) => [x[1], x[2]]);
  assert.ok(cap.length >= 8, `chi doc duoc ${cap.length} chuyen huong — regex hong?`);

  const co = new Set(duong_trong_bang('MENU_CAI_DAT'));
  const hong = cap.filter(([, moi]) => !co.has(moi)).map(([cu, moi]) => `${cu} -> ${moi}`);
  assert.deepEqual(hong, [], `Chuyen huong tro toi duong khong ton tai:\n${hong.join('\n')}`);

  // Va duong CU khong duoc trung voi mot muc menu dang dung: neu trung thi hieu ung chuyen
  // huong se ban ra khoi chinh trang do, thanh mot vong lap.
  const dang_dung = new Set([...duong_trong_bang('MENU'), ...co]);
  const dam = cap.map(([cu]) => cu).filter((cu) => dang_dung.has(cu));
  assert.deepEqual(dam, [], `Duong dan cu trung voi muc menu that: ${dam.join(', ')}`);
});

// ============================================================ lop CSS co that khong
test('moi className dung trong web deu co dinh nghia trong mot tep .css', () => {
  // VI SAO CAN: `className` la MOT CHUOI. Go sai ten lop thi tsc khong bao gi, build khong bao
  // gi, va tren man hinh ra mot khoi khong co kieu — nhin nhu "quen thiet ke" chu khong nhu mot
  // loi. Bai kiem nay sinh ra sau khi chinh toi go `hop-canh-bao` (lop khong ton tai; lop that
  // la `hop-luu-y`) va khong co gi bat duoc.
  //
  // Quet phat hien 4 lop da nam san trong ma nguon ma khong co dinh nghia nao: `dieu-huong-khoi`,
  // `hang-nhan`, `o`, `o-chon` — tuc la 4 cho tren app dang khong co kieu.
  //
  // CHI kiem `className="..."` dang chuoi hang. Lop tinh theo bieu thuc (`className={...}`) thi
  // khong doc duoc bang cach nay, va co gang doc se ra canh bao gia.
  const css = ['kieu.css', 'icon.css', 'token_thiet_ke.css']
    .map((t) => readFileSync(join(GOC, t), 'utf8')).join('\n');
  const co = new Set([...css.matchAll(/\.([a-z][a-z0-9-]*)/g)].map((m) => m[1]));

  const thieu = new Map();
  for (const [tep, goc] of cac_tep()) {
    if (!tep.endsWith('.tsx')) continue;
    const ma = bo_ghi_chu(goc);
    for (const m of ma.matchAll(/className="([^"{}]+)"/g)) {
      for (const lop of m[1].split(/\s+/).filter((x) => x !== '')) {
        if (!co.has(lop)) {
          if (!thieu.has(lop)) thieu.set(lop, new Set());
          thieu.get(lop).add(tep);
        }
      }
    }
  }

  assert.deepEqual([...thieu.keys()], [],
    'Cac lop CSS sau duoc dung trong markup nhung KHONG co dinh nghia trong tep .css nao:\n'
    + [...thieu].map(([k, v]) => `  ${k}  <- ${[...v].join(', ')}`).join('\n')
    + '\nGo sai ten lop khong lam do build — no chi lam khoi do mat kieu, im lang.');
});

// ============================================================ vai tro can ho so: hai ben
test('danh sach vai tro BAT BUOC co ho so khop giua may chu va giao dien', () => {
  // May chu tu choi tao tai khoan `nhan_vien` / `truong_phong` / `truong_phong_nhan_su` ma khong
  // co `nhan_vien_id`. Giao dien lap lai danh sach do de danh dau o "Nhan vien" la bat buoc va
  // chan nut Tao som. Hai ben lech nhau thi mot trong hai kieu hong:
  //   - giao dien rong hon: nguoi dung bam Tao roi an 400 khong hieu vi sao,
  //   - giao dien hep hon: bat khai nhan vien cho mot vai tro khong can, khong tao duoc tai khoan
  //     nhan su thue ngoai.
  const may = readFileSync(join(GOC, '..', '..', 'may_chu', 'src', 'tuyen', 'danh_muc.ts'), 'utf8');
  const web = readFileSync(join(GOC, 'trang', 'nguoi_dung.tsx'), 'utf8');

  const m = /const VAI_TRO_CAN_HO_SO = \[([^\]]+)\]/.exec(may);
  assert.ok(m !== null, 'khong tim thay VAI_TRO_CAN_HO_SO trong tuyen/danh_muc.ts');
  const ben_may = [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();

  const w = /const can_ho_so = \[([^\]]+)\]\.includes\(vai_tro\)/.exec(web);
  assert.ok(w !== null, 'khong tim thay danh sach can_ho_so trong trang nguoi_dung.tsx');
  const ben_web = [...w[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();

  assert.deepEqual(ben_web, ben_may,
    `giao dien: ${ben_web.join(', ')}\nmay chu : ${ben_may.join(', ')}`);
});
