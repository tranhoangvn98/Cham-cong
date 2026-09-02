// Cham cong DAY su kien nhan su sang cong dinh danh (kho `phanquyen`).
//
// CAN CSDL THAT — cung ly do voi `e2e.test.ts`: phep chong mat su kien nam o chO su kien
// duoc ghi CUNG TRANSACTION voi dong nhan vien, va mot transaction gia lap se kiem chinh ban
// gia lap cua no. Bang bi xoa sach nen chi chay tren DB ten '*_test'.
//
// Bo kiem nay dung mot may chu HTTP THAT dong vai cong, khong phai mot `fetch` bi thay the.
// Ly do: thu duoc kiem la HINH DANG cua request (duong dan, header, than JSON) — dung thu
// dang duoc kiem lam khuon do chinh no thi bai kiem xanh du hop dong sai.
//
// SAU DIEU DUOC CHOT O DAY:
//
//  1. Ba moc doi nguoi — tao, doi ten, nghi viec — deu sinh su kien.
//  2. Doi ten ma ten KHONG doi thi KHONG sinh su kien. Nhap lai nguyen si mot tep 900 dong
//     khong duoc de ra 900 dong rac ben cong.
//  3. `su_kien_id` ON DINH qua cac lan gui lai. Day la thu duy nhat chong trung o ben kia;
//     sinh moi moi lan gui la bo phep chong trung do, va voi `nghi_viec` nghia la thu hoi
//     phien mot nguoi HAI lan.
//  4. Su kien nhan su di sang CONG, khong sang ERP. Hai dich, hai hop dong khac han.
//  5. Cong tra loi 4xx thi dong KHONG duoc danh dau da gui, va ly do that phai vao `loi_cuoi`.
//  6. CHUA khai CONG_SU_KIEN_URL thi su kien NAM LAI, khong bi danh dau da gui. Day la cho de mat du
//     lieu nhat: mot dong `return 0` dat nham cho la nhan su nghi viec ma cong khong bao gio
//     biet.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { FastifyInstance } from 'fastify';

// ---------------------------------------------------------------- cong gia lap

interface NhanDuoc {
  url: string;
  authorization: string;
  than: Record<string, unknown>;
}

const da_nhan: NhanDuoc[] = [];
/** Ma HTTP cong se tra ve cho request tiep theo. Doi trong tung bai kiem. */
let ma_tra_ve = 200;
let than_tra_ve = '{"ok":true}';

const cong_gia = createServer((req: IncomingMessage, res: ServerResponse) => {
  let than = '';
  req.on('data', (c) => (than += String(c)));
  req.on('end', () => {
    da_nhan.push({
      url: req.url ?? '',
      authorization: String(req.headers['authorization'] ?? ''),
      than: than === '' ? {} : (JSON.parse(than) as Record<string, unknown>),
    });
    res.writeHead(ma_tra_ve, { 'content-type': 'application/json' });
    res.end(than_tra_ve);
  });
});
await new Promise<void>((xong) => cong_gia.listen(0, '127.0.0.1', xong));
const CONG_GOC = `http://127.0.0.1:${(cong_gia.address() as AddressInfo).port}/cong`;

// ERP gia lap — de kiem rang su kien nhan su KHONG di nham sang day.
const da_nhan_erp: Record<string, unknown>[] = [];
const erp_gia = createServer((req: IncomingMessage, res: ServerResponse) => {
  let than = '';
  req.on('data', (c) => (than += String(c)));
  req.on('end', () => {
    da_nhan_erp.push(than === '' ? {} : (JSON.parse(than) as Record<string, unknown>));
    res.writeHead(200).end('{}');
  });
});
await new Promise<void>((xong) => erp_gia.listen(0, '127.0.0.1', xong));
const ERP_URL = `http://127.0.0.1:${(erp_gia.address() as AddressInfo).port}/hook`;

// ---------------------------------------------------------------- moi truong

process.env['JWT_SECRET'] = 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['NODE_ENV'] = 'test';
process.env['DEVICE_TZ_OFFSET_HOURS'] = '7';
process.env['CONG_SU_KIEN_URL'] = CONG_GOC;
process.env['CONG_TOKEN_DICH_VU'] = 'token-dich-vu-gia-lap';
process.env['ERP_WEBHOOK_URL'] = ERP_URL;
process.env['DATABASE_URL'] ??=
  'postgres://chamcong:chamcong_dev@localhost:5432/chamcong_test';

/**
 * Ten CSDL trong chuoi ket noi. BO CHUOI TRUY VAN TRUOC roi moi cat duong dan.
 *
 * `split('/').pop()` la sai, va sai theo ca hai huong:
 *
 *   postgres://cong@/chamcong_test?host=/var/tmp/pgrun  ->  'pgrun'          (tu choi oan)
 *   postgres://may/that?options=/chamcong_test          ->  'chamcong_test'  (CHO QUA)
 *
 * Huong thu hai moi la huong chet: bo kiem nay `truncate` toan bo bang nhan vien va nguoi
 * dung. Mot phep chan xoa du lieu khong duoc phep doc nham.
 *
 * Khong dung `new URL`: dang socket Unix cua libpq co phan host RONG
 * (`postgres://cong@/ten_db?host=...`), va WHATWG URL tu choi thang no.
 */
function ten_csdl(url: string): string {
  const khong_truy_van = url.split('?')[0] ?? '';
  const sau_giao_thuc = khong_truy_van.replace(/^[a-z+]+:\/\//i, '');
  const vt = sau_giao_thuc.indexOf('/');
  return vt < 0 ? '' : sau_giao_thuc.slice(vt + 1);
}
const ten_db = ten_csdl(process.env['DATABASE_URL']);
if (!ten_db.startsWith('chamcong_test')) {
  throw new Error(
    `Bo kiem nay xoa sach du lieu nen chi chay tren DB ten 'chamcong_test*'. `
    + `DATABASE_URL dang tro toi '${ten_db}'.`,
  );
}

const { dung_ung_dung } = await import('../src/ung_dung.ts');
const { chay_di_tru } = await import('../src/csdl/di_tru.ts');
const { thuc_thi, truy_van, truy_van_mot, dong_pool } = await import('../src/csdl/ket_noi.ts');
const { bam_mat_khau } = await import('../src/bao_mat/mat_khau.ts');
const { tao_token_truy_cap } = await import('../src/bao_mat/jwt.ts');
const { day_hop_thu_di, ghi_su_kien } = await import('../src/su_kien/hop_thu_di.ts');

let app: FastifyInstance;
let token = '';

async function goi(
  method: 'GET' | 'POST' | 'PUT',
  url: string,
  body?: unknown,
): Promise<{ ma: number; than: Record<string, unknown> }> {
  const res = await app.inject({
    method,
    url,
    headers: { authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { payload: body as object }),
  });
  let than: Record<string, unknown> = {};
  try {
    than = res.body === '' ? {} : (JSON.parse(res.body) as Record<string, unknown>);
  } catch {
    than = {};
  }
  return { ma: res.statusCode, than };
}

interface DongHopThu {
  id: string;
  loai_su_kien: string;
  du_lieu: Record<string, unknown>;
  gui_luc: Date | null;
  loi_cuoi: string | null;
}

const hop_thu = (loai_bat_dau = 'nhan_su.'): Promise<DongHopThu[]> =>
  truy_van<DongHopThu>(
    `select id::text, loai_su_kien, du_lieu, gui_luc, loi_cuoi from hop_thu_di
      where loai_su_kien like $1 || '%' order by id`,
    [loai_bat_dau],
  );

before(async () => {
  await chay_di_tru();
  for (const b of ['hop_thu_di', 'token_lam_moi', 'nhat_ky_thao_tac', 'nguoi_dung', 'nhan_vien']) {
    await thuc_thi(`truncate table ${b} restart identity cascade`);
  }
  const nd = await truy_van_mot<{ id: string }>(
    `insert into nguoi_dung(ten_dang_nhap, mat_khau_hash, vai_tro, dang_hoat_dong)
     values ('quantri', $1, 'admin', true) returning id`,
    [await bam_mat_khau('matkhau_kiem_thu_1')],
  );
  token = tao_token_truy_cap({ sub: nd!.id, vai_tro: 'admin', nv: null, ten: 'quantri' }).token;
  app = await dung_ung_dung();
  await app.ready();
});

after(async () => {
  await app?.close();
  await dong_pool();
  cong_gia.close();
  erp_gia.close();
});

// ================================================================ sinh su kien

test('tao nhan vien -> sinh `nhan_su.da_tao`', async () => {
  const r = await goi('POST', '/api/nhan-vien', { ma_nv: 'NV001', ho_ten: 'Trần Văn A' });
  assert.equal(r.ma, 201);

  const ds = await hop_thu();
  assert.equal(ds.length, 1, 'phai co dung mot su kien');
  assert.equal(ds[0]!.loai_su_kien, 'nhan_su.da_tao');
  assert.equal(ds[0]!.du_lieu['ma_nv'], 'NV001');
  assert.equal(ds[0]!.du_lieu['ho_ten'], 'Trần Văn A');
});

test('doi ten -> sinh `nhan_su.doi_ten`', async () => {
  const nv = await truy_van_mot<{ id: string }>("select id from nhan_vien where ma_nv = 'NV001'");
  const r = await goi('PUT', `/api/nhan-vien/${nv!.id}`, {
    ma_nv: 'NV001', ho_ten: 'Trần Văn Ánh',
  });
  assert.equal(r.ma, 200);

  const ds = await hop_thu();
  assert.equal(ds.length, 2);
  assert.equal(ds[1]!.loai_su_kien, 'nhan_su.doi_ten');
  assert.equal(ds[1]!.du_lieu['ho_ten'], 'Trần Văn Ánh');
});

test('luu lai voi ten KHONG doi -> KHONG sinh su kien', async () => {
  // Nhan su sua mot o roi bam Luu la chuyen xay ra ca ngay. Moi lan do sinh mot su kien thi
  // nhat ky ben cong day nhung dong khong noi len dieu gi, va lan doi ten THAT chim mat.
  const truoc = (await hop_thu()).length;
  const nv = await truy_van_mot<{ id: string }>("select id from nhan_vien where ma_nv = 'NV001'");
  const r = await goi('PUT', `/api/nhan-vien/${nv!.id}`, {
    ma_nv: 'NV001', ho_ten: 'Trần Văn Ánh', so_dien_thoai: '0900000001',
  });
  assert.equal(r.ma, 200);
  assert.equal((await hop_thu()).length, truoc, 'ten khong doi ma van sinh su kien');
});

test('doi `ma_nv` -> KHONG bia ra su kien, nhung PHAI ghi nhat ky de doi chieu tay', async () => {
  // Hop dong cua cong khong co dong tu nao cho "doi ma nhan vien". `da_tao` voi ma moi chi tao
  // them mot ban ghi khong ai tro toi; `nghi_viec` + `da_tao` thi da nguoi do ra khoi he thong.
  // Nen: khong gui gi, va de lai mot dau vet doc duoc.
  const truoc = (await hop_thu()).length;
  const nv = await truy_van_mot<{ id: string }>("select id from nhan_vien where ma_nv = 'NV001'");
  const r = await goi('PUT', `/api/nhan-vien/${nv!.id}`, {
    ma_nv: 'NV001-MOI', ho_ten: 'Trần Văn Ánh',
  });
  assert.equal(r.ma, 200);
  assert.equal((await hop_thu()).length, truoc, 'doi ma_nv khong duoc bia ra su kien');

  const nk = await truy_van_mot<{ chi_tiet: Record<string, unknown> }>(
    "select chi_tiet from nhat_ky_thao_tac where hanh_dong = 'doi_ma_nv_lech_cong' order by id desc limit 1",
  );
  assert.ok(nk !== null, 'doi ma_nv phai de lai nhat ky de co nguoi doi chieu');
  assert.equal(nk.chi_tiet['ma_cu'], 'NV001');
  assert.equal(nk.chi_tiet['ma_moi'], 'NV001-MOI');
});

test('cho nghi viec -> sinh `nhan_su.nghi_viec`', async () => {
  const nv = await truy_van_mot<{ id: string }>("select id from nhan_vien where ma_nv = 'NV001-MOI'");
  const r = await goi('POST', `/api/nhan-vien/${nv!.id}/nghi-viec`, {});
  assert.equal(r.ma, 200);

  const ds = await hop_thu();
  assert.equal(ds[ds.length - 1]!.loai_su_kien, 'nhan_su.nghi_viec');
  assert.equal(ds[ds.length - 1]!.du_lieu['ma_nv'], 'NV001-MOI');
});

// ================================================================ gui di

test('day sang CONG: dung duong dan, dung header, dung than', async () => {
  da_nhan.length = 0;
  ma_tra_ve = 200;
  await thuc_thi('truncate table hop_thu_di restart identity');
  await ghi_su_kien('nhan_su.da_tao', { ma_nv: 'NV777', ho_ten: 'Lê Thị B' });

  const so = await day_hop_thu_di();
  assert.equal(so, 1);
  assert.equal(da_nhan.length, 1);

  const g = da_nhan[0]!;
  assert.equal(g.url, '/cong/api/su-kien-nhan-su');
  assert.equal(g.authorization, 'Bearer token-dich-vu-gia-lap');
  assert.equal(g.than['loai'], 'nhan_su.da_tao');
  assert.equal(g.than['nhan_su_ma'], 'NV777');
  assert.deepEqual(g.than['than'], { ho_ten: 'Lê Thị B' });
  assert.equal(g.than['su_kien_id'], 'chamcong-1', 'dinh danh phai co tien to he thong + id dong');
});

test('CHI day `ho_ten` sang cong, khong day ho so nghiep vu', async () => {
  // ADR-002: cong giu DANH TINH, khong giu ho so nhan su. So dien thoai, phong ban, ngay vao
  // la du lieu cua Cham cong; day sang cong la bat dau pha chinh ranh gioi do — va la nhan
  // ban du lieu ca nhan sang mot he thong khong can den no.
  da_nhan.length = 0;
  await thuc_thi('truncate table hop_thu_di restart identity');
  await ghi_su_kien('nhan_su.da_tao', {
    ma_nv: 'NV778', ho_ten: 'Phạm C',
    so_dien_thoai: '0912345678', phong_ban: 'Kho TQ', luong: 99_000_000,
  });
  await day_hop_thu_di();

  assert.deepEqual(da_nhan[0]!.than['than'], { ho_ten: 'Phạm C' });
});

test('su kien nhan su KHONG di sang ERP, va nguoc lai', async () => {
  da_nhan.length = 0;
  da_nhan_erp.length = 0;
  await thuc_thi('truncate table hop_thu_di restart identity');
  await ghi_su_kien('nhan_su.nghi_viec', { ma_nv: 'NV779' });
  await ghi_su_kien('bang_cong.da_chot', { ky: '2026-08' });

  assert.equal(await day_hop_thu_di(), 2);
  assert.equal(da_nhan.length, 1, 'chi su kien nhan su moi sang cong');
  assert.equal(da_nhan[0]!.than['loai'], 'nhan_su.nghi_viec');
  assert.equal(da_nhan_erp.length, 1, 'chi su kien nghiep vu moi sang ERP');
  assert.equal((da_nhan_erp[0] as { loai_su_kien: string }).loai_su_kien, 'bang_cong.da_chot');
});

test('`su_kien_id` KHONG DOI qua cac lan gui lai', async () => {
  // Day la phep chong trung DUY NHAT o ben kia. Neu dinh danh doi moi lan gui thi mot lan gui
  // thanh cong ma mat phan hoi se thanh su kien thu hai — voi `nghi_viec` do la thu hoi phien
  // cua mot nguoi hai lan, va nhat ky ben cong bao "phat hien danh cap" cho mot chuyen khong
  // he xay ra.
  da_nhan.length = 0;
  await thuc_thi('truncate table hop_thu_di restart identity');
  await ghi_su_kien('nhan_su.nghi_viec', { ma_nv: 'NV780' });

  ma_tra_ve = 500;
  assert.equal(await day_hop_thu_di(), 0, 'cong loi thi khong duoc tinh la da gui');

  // Ep dong den luot gui lai ngay thay vi cho het backoff.
  await thuc_thi('update hop_thu_di set gui_lai_sau = now()');
  ma_tra_ve = 200;
  assert.equal(await day_hop_thu_di(), 1);

  assert.equal(da_nhan.length, 2, 'phai co dung hai lan gui');
  assert.equal(
    da_nhan[0]!.than['su_kien_id'],
    da_nhan[1]!.than['su_kien_id'],
    'hai lan gui cung mot su kien phai mang cung mot dinh danh',
  );
});

test('cong tra 4xx: dong KHONG duoc danh dau da gui, va ly do that vao `loi_cuoi`', async () => {
  await thuc_thi('truncate table hop_thu_di restart identity');
  await ghi_su_kien('nhan_su.da_tao', { ma_nv: 'NV781', ho_ten: 'Đỗ D' });

  ma_tra_ve = 403;
  than_tra_ve = '{"loi":"Token này không có quyền \\"cong.day_su_kien_nhan_su\\"."}';
  assert.equal(await day_hop_thu_di(), 0);
  ma_tra_ve = 200;
  than_tra_ve = '{"ok":true}';

  const ds = await hop_thu();
  assert.equal(ds[0]!.gui_luc, null, 'that bai ma van danh dau da gui la MAT su kien');
  // 403 vi sai pham vi token va 400 vi sai hop dong la hai su co khac han. "HTTP 4xx" tran thi
  // nguoi truc khong biet phai sua o dau.
  assert.match(ds[0]!.loi_cuoi ?? '', /403/);
  assert.match(ds[0]!.loi_cuoi ?? '', /day_su_kien_nhan_su/);
});

test('gui lai sau khi that bai thi KHONG tao them dong hop thu', async () => {
  // Hop thu la mot hang doi, khong phai mot so nhat ky gui. Mot su kien = mot dong, du gui
  // bao nhieu lan.
  const ds = await hop_thu();
  assert.equal(ds.length, 1);
});
