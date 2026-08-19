// Kho luu tru tren dia: ghi duoc that khong, va bao gi khi khong ghi duoc.
//
// LOI DA XAY RA THAT, va no song sot suot nhieu ban:
//
//   Dockerfile chi `mkdir -p /du_lieu/anh_cham_cong`. Ca hai thu muc deu la volume gan luc
//   chay, nhung Docker khoi tao mot named volume RONG theo noi dung cua ANH tai duong dan
//   gan — ke ca quyen so huu. `anh_cham_cong` co trong anh va thuoc node:node nen volume
//   thuoc node:node. `/du_lieu/ho_so` KHONG co trong anh, nen Docker tu tao diem gan va no
//   thuoc ROOT. Tien trinh chay bang `node` -> EACCES.
//
// Ba dieu lam no vo hinh:
//   1. Anh selfie cham cong VAN GHI DUOC (thu muc kia dung quyen), nen he thong "nhin nhu"
//      dang luu tep binh thuong.
//   2. Trieu chung duy nhat la HTTP 500 "Loi he thong. Vui long thu lai" — mot cau day
//      nguoi dung di thu lai voi tep khac thay vi bao quan tri.
//   3. Volume sao luu hang thang LUON RONG, va khong ai thay la la vi chua ai tai tep len
//      thanh cong bao gio.
//
// Bai kiem o day chan ca ba: thu ghi that, thong diep phai noi ro "loi may chu", va
// Dockerfile phai tao ca hai thu muc.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LoiThuMucLuu, thu_ghi_thu_muc } from '../src/tien_ich/luu_tep.ts';

const GOC = join(import.meta.dirname, '..');

// ---------------------------------------------------------------- thu ghi that

test('thu ghi: thu muc ghi duoc thi tra null', async () => {
  const tm = await mkdtemp(join(tmpdir(), 'luutru-'));
  try {
    assert.equal(await thu_ghi_thu_muc(tm), null);
  } finally {
    await rm(tm, { recursive: true, force: true });
  }
});

test('thu ghi: tu tao thu muc con neu chua co', async () => {
  const tm = await mkdtemp(join(tmpdir(), 'luutru-'));
  try {
    assert.equal(await thu_ghi_thu_muc(join(tm, 'chua', 'ton', 'tai')), null);
  } finally {
    await rm(tm, { recursive: true, force: true });
  }
});

test('thu ghi: KHONG de lai tep thu nao sau khi kiem', async () => {
  const tm = await mkdtemp(join(tmpdir(), 'luutru-'));
  try {
    await thu_ghi_thu_muc(tm);
    await thu_ghi_thu_muc(tm);
    const { readdir } = await import('node:fs/promises');
    assert.deepEqual(await readdir(tm), [], 'ham kiem khong duoc de lai rac');
  } finally {
    await rm(tm, { recursive: true, force: true });
  }
});

test('thu ghi: thu muc chi doc -> tra ma loi cua he dieu hanh', {
  // `root` ghi duoc vao moi thu muc bat ke bit quyen, nen bai kiem nay vo nghia khi chay
  // bang root (trong Docker luc dung anh, hay tren may lap trinh cua ai do).
  skip: process.getuid !== undefined && process.getuid() === 0
    ? 'đang chạy bằng root — root ghi được vào cả thư mục chỉ đọc nên không kiểm được'
    : false,
}, async () => {
  const tm = await mkdtemp(join(tmpdir(), 'luutru-'));
  const khoa = join(tm, 'khoa');
  try {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(khoa);
    await chmod(khoa, 0o500); // r-x: vao duoc nhung khong ghi duoc

    const ma = await thu_ghi_thu_muc(khoa);
    assert.notEqual(ma, null, 'thu muc chi doc le ra phai bao loi');
    assert.match(String(ma), /EACCES|EPERM/);
  } finally {
    await chmod(khoa, 0o700).catch(() => { /* co the chua tao duoc */ });
    await rm(tm, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------- thong diep

test('LoiThuMucLuu: thong diep cong khai noi ro DAY LA LOI MAY CHU', async () => {
  const loi = new LoiThuMucLuu('/du_lieu/ho_so', 'EACCES');

  // Cau quan trong nhat. Khong co no, nhan su se thu lai voi tep khac hang chuc lan.
  assert.match(loi.thong_diep_cong_khai, /lỗi cấu hình máy chủ/);
  assert.match(loi.thong_diep_cong_khai, /thử lại sẽ vẫn thất bại/);
  assert.match(loi.thong_diep_cong_khai, /EACCES/);
});

test('LoiThuMucLuu: KHONG lot duong dan may chu ra thong diep cong khai', async () => {
  const loi = new LoiThuMucLuu('/du_lieu/ho_so', 'EACCES');
  assert.equal(loi.thong_diep_cong_khai.includes('/du_lieu'), false,
    'duong dan tuyet doi chi duoc vao log, khong tra ra client');
  // Nhung log thi PHAI co duong dan — khong co thi khong biet chown cai gi.
  assert.match(loi.message, /\/du_lieu\/ho_so/);
});

test('LoiThuMucLuu: het dia noi thanh "het dung luong", khong noi thanh loi quyen', async () => {
  const loi = new LoiThuMucLuu('/du_lieu/ho_so', 'ENOSPC');
  assert.match(loi.thong_diep_cong_khai, /hết dung lượng/);
  assert.equal(loi.thong_diep_cong_khai.includes('cấu hình'), false);
});

test('LoiThuMucLuu: la 503 chu khong phai 500 — may chu van song, kho luu tru thi khong', async () => {
  assert.equal(new LoiThuMucLuu('/x', 'EACCES').ma_http, 503);
});

// ---------------------------------------------------------------- rao tren Dockerfile

test('Dockerfile tao SAN ca hai thu muc luu tru va chown cho node', async () => {
  // Day la rao chan chinh cho loi goc. Thu muc khong co trong anh thi volume thuoc root, va
  // khong co gi trong ma nguon TypeScript noi len duoc dieu do.
  const df = await readFile(join(GOC, 'Dockerfile'), 'utf8');

  const dong_mkdir = df.split('\n').find((d) => d.includes('mkdir') && d.includes('/du_lieu'));
  assert.ok(dong_mkdir !== undefined, 'khong tim thay dong mkdir /du_lieu trong Dockerfile');

  for (const thu_muc of ['/du_lieu/anh_cham_cong', '/du_lieu/ho_so']) {
    assert.ok(dong_mkdir.includes(thu_muc),
      `Dockerfile khong tao ${thu_muc}. Thu muc khong co trong anh thi Docker tao diem gan `
      + 'thuoc ROOT, va tien trinh node se KHONG GHI DUOC vao volume do.');
  }

  assert.match(df, /chown -R node:node \/du_lieu/,
    'phai chown /du_lieu cho node — anh chay bang USER node');
  assert.match(df, /^USER node$/m, 'anh chay phai doi sang nguoi dung thuong');
});

test('Dockerfile: moi duong dan THU_MUC_* trong compose deu duoc tao trong anh', async () => {
  // Chieu tong quat hon bai tren: doc thang docker-compose.yml. Them mot kho luu tru moi
  // (vd THU_MUC_HOP_DONG_DA_KY) ma quen tao thu muc thi do test ngay, khong phai doi den
  // luc co nguoi tai tep len.
  const compose = await readFile(join(GOC, '..', 'docker-compose.yml'), 'utf8');
  const df = await readFile(join(GOC, 'Dockerfile'), 'utf8');

  const duong_dan = [...compose.matchAll(/^\s*THU_MUC_\w+:\s*(\/\S+)\s*$/gm)].map((m) => m[1]);
  assert.ok(duong_dan.length >= 2,
    `chi doc duoc ${duong_dan.length} duong dan THU_MUC_* tu compose — regex hong?`);

  const thieu = duong_dan.filter((d) => d !== undefined && !df.includes(d));
  assert.deepEqual(thieu, [],
    'Nhung duong dan nay duoc khai trong docker-compose.yml nhung khong duoc tao trong\n'
    + 'Dockerfile. Neu chung la volume thi Docker se tao diem gan thuoc ROOT va tien trinh\n'
    + 'node khong ghi duoc — trieu chung duy nhat la HTTP 500 luc tai tep len.');
});

// ---------------------------------------------------------------- thu muc tam cua OCR

test('thu muc tam cua OCR ghi duoc — neu khong thi trich noi dung PDF/scan chet', async () => {
  // `trich_noi_dung.ts` ghi tep tam vao os.tmpdir(). Trong container do la /tmp, va /tmp
  // thuong ghi duoc — nhung day la mot phu thuoc khong ai khai o dau ca.
  assert.equal(await thu_ghi_thu_muc(tmpdir()), null,
    `khong ghi duoc vao ${tmpdir()} — doc lop chu PDF va OCR se that bai`);
});

test('ghi roi doc lai duoc dung noi dung', async () => {
  const tm = await mkdtemp(join(tmpdir(), 'luutru-'));
  try {
    const t = join(tm, 'thu.bin');
    const noi_dung = Buffer.from('nội dung tiếng Việt có dấu');
    await writeFile(t, noi_dung);
    assert.ok((await readFile(t)).equals(noi_dung));
  } finally {
    await rm(tm, { recursive: true, force: true });
  }
});

// ==================================================================== lenh chay duoc trong anh
//
// LOI DA XAY RA THAT: `npm run sap_xep_tep` tro vao `src/ho_so/chay_sap_xep.ts`, chay tot
// tren may lap trinh, va trong container thi:
//
//   Error: Cannot find module '/app/may_chu/src/ho_so/chay_sap_xep.ts'
//
// Anh chay chi COPY `may_chu/dist`, `may_chu/migrations` va `package.json` — KHONG co `src`.
// Ma nguon TypeScript khong nam trong anh, va do la co y: anh chay khong can trinh bien dich.
//
// `di_tru` va `seed` cung hong y nhu vay tu truoc, chi la chua ai goi den — di tru chay tu
// dong luc khoi dong nen khong ai phat hien.
//
// Bai kiem doi chieu package.json voi Dockerfile: mot lenh tro vao `src/` thi anh phai COPY
// `src`, neu khong lenh do khong ton tai trong container.

test('moi lenh npm "van hanh" deu chay duoc trong anh Docker', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');

  const goc = join(import.meta.dirname, '..');
  const pkg = JSON.parse(readFileSync(join(goc, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  const df = readFileSync(join(goc, 'Dockerfile'), 'utf8');

  // Anh chay = doan sau `FROM` cuoi cung. Nhung gi COPY o giai doan build khong co trong do.
  const anh_chay = df.slice(df.lastIndexOf('\nFROM '));
  const co_src = /COPY[^\n]*may_chu\/src/.test(anh_chay);

  // Lenh chi dung khi phat trien thi khong tinh — dat ten theo quy uoc de doc ra la biet.
  const chi_phat_trien = (ten: string): boolean =>
    ten === 'dev' || ten === 'build' || ten === 'kiem_tra_kieu'
    || ten.startsWith('test') || ten.endsWith('_ma_nguon');

  const hong: string[] = [];
  for (const [ten, lenh] of Object.entries(pkg.scripts)) {
    if (chi_phat_trien(ten)) continue;
    if (/(?:^|\s)src\//.test(lenh) && !co_src) {
      hong.push(`${ten}: ${lenh}`);
    }
  }

  assert.deepEqual(hong, [],
    'Nhung lenh npm nay tro vao `src/`, nhung anh chay KHONG COPY `may_chu/src`.\n'
    + 'Trong container chung se bao "Cannot find module".\n'
    + 'Hoac doi sang `dist/...`, hoac them hau to `_ma_nguon` neu chi dung khi phat trien.');
});

test('moi lenh npm tro vao dist deu co tep that sau khi build', async () => {
  // Chieu con lai: `dist/csdl/chay_di_tru.js` phai la duong dan DUNG. Go sai mot chu thi
  // trong container van ra "Cannot find module", chi la muon hon mot buoc.
  const { readFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');

  const goc = join(import.meta.dirname, '..');
  const pkg = JSON.parse(readFileSync(join(goc, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };

  // Chi kiem khi da build — tren may vua clone thi `dist` chua co, va bai kiem nay khong
  // phai cho de bat buoc phai build truoc khi chay test.
  if (!existsSync(join(goc, 'dist'))) {
    return;
  }

  const thieu: string[] = [];
  for (const [ten, lenh] of Object.entries(pkg.scripts)) {
    for (const m of lenh.matchAll(/(?:^|\s)(dist\/[\w/.-]+\.js)/g)) {
      if (!existsSync(join(goc, m[1] as string))) thieu.push(`${ten}: ${String(m[1])}`);
    }
  }

  assert.deepEqual(thieu, [],
    'Lenh npm tro vao tep dist khong ton tai sau khi build. Kiem lai duong dan.');
});
