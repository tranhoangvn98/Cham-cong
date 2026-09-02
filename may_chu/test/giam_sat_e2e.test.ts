// Kiem thu END-TO-END cua module giam sat gian lan.
//
// CAN CSDL THAT (bang bi xoa nen chi chay tren DB ten 'chamcong_test*'), nhung KHONG can
// CSDL cua ERP 1: cac bai o day kiem phan quyen, danh muc, vong doi xu ly canh bao va tinh
// CHONG TRUNG — nhung thu nam hoan toan ben ta.
//
// Rieng phan doc ERP 1 khong kiem duoc o day va do la co y: gia lap mot CSDL ERP 1 day du se
// la mot ban sao schema cua he thong khac, va ban sao do se lech dan ma khong ai biet. Viec
// doi chieu schema that thuoc ve lenh `npm run doi_chieu_schema`, chay tren may co mang.
//
//   createdb chamcong_test
//   DATABASE_URL=postgres://chamcong:...@localhost:5432/chamcong_test \
//     npm --workspace may_chu run test_e2e_giam_sat
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';

process.env['JWT_SECRET'] = 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['NODE_ENV'] = 'test';
process.env['DEVICE_TZ_OFFSET_HOURS'] = '7';
process.env['DATABASE_URL'] ??=
  'postgres://chamcong:chamcong_dev@localhost:5432/chamcong_test';

const ten_db = process.env['DATABASE_URL'].split('/').pop() ?? '';
if (!ten_db.startsWith('chamcong_test')) {
  throw new Error(
    'Kiem thu e2e xoa du lieu nen chi chay tren DB ten "chamcong_test*". '
    + `DATABASE_URL dang tro toi "${ten_db}".`,
  );
}

const { dung_ung_dung } = await import('../src/ung_dung.ts');
const { chay_di_tru } = await import('../src/csdl/di_tru.ts');
const { truy_van, truy_van_mot, thuc_thi, dong_pool } = await import('../src/csdl/ket_noi.ts');
const { tao_token_truy_cap } = await import('../src/bao_mat/jwt.ts');

let app: FastifyInstance;
let token_kiem_soat = '';
let token_nhan_vien = '';
let token_admin = '';
let loai_loi_id = '';
let loai_canh_bao_id = '';

async function goi(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string,
  token: string | null, body?: unknown,
) {
  const r = await app.inject({
    method, url,
    headers: token === null ? {} : { authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { payload: body as object }),
  });
  return { ma: r.statusCode, than: r.payload };
}

function json<T>(than: string): T {
  return JSON.parse(than) as T;
}

before(async () => {
  await chay_di_tru();
  app = await dung_ung_dung();
  await app.ready();

  // Don du lieu cua lan chay truoc — thu tu ton trong khoa ngoai.
  await thuc_thi('delete from canh_bao_xu_ly');
  await thuc_thi('delete from canh_bao');
  await thuc_thi('delete from lan_quet_giam_sat');
  await thuc_thi('delete from anh_chup_erp');
  await thuc_thi("delete from nguoi_dung where ten_dang_nhap in ('ks_e2e','nv_e2e','ad_e2e')");
  await thuc_thi("delete from nhan_vien where ma_nv in ('KSE2E','NVE2E')");

  const nv_ks = await truy_van_mot<{ id: string }>(
    `insert into nhan_vien (ma_nv, ho_ten, erp_user_id) values ('KSE2E','Kiem soat E2E', 990001)
     returning id`);
  const nv_thuong = await truy_van_mot<{ id: string }>(
    `insert into nhan_vien (ma_nv, ho_ten) values ('NVE2E','Nhan vien E2E') returning id`);

  const u_ks = await truy_van_mot<{ id: string }>(
    `insert into nguoi_dung (ten_dang_nhap, mat_khau_hash, vai_tro, nhan_vien_id)
     values ('ks_e2e','x','kiem_soat',$1) returning id`, [nv_ks?.id]);
  const u_nv = await truy_van_mot<{ id: string }>(
    `insert into nguoi_dung (ten_dang_nhap, mat_khau_hash, vai_tro, nhan_vien_id)
     values ('nv_e2e','x','nhan_vien',$1) returning id`, [nv_thuong?.id]);
  const u_ad = await truy_van_mot<{ id: string }>(
    `insert into nguoi_dung (ten_dang_nhap, mat_khau_hash, vai_tro)
     values ('ad_e2e','x','admin') returning id`);

  token_kiem_soat = tao_token_truy_cap({
    sub: u_ks?.id ?? '', vai_tro: 'kiem_soat', nv: nv_ks?.id ?? null, ten: 'KS' }).token;
  token_nhan_vien = tao_token_truy_cap({
    sub: u_nv?.id ?? '', vai_tro: 'nhan_vien', nv: nv_thuong?.id ?? null, ten: 'NV' }).token;
  token_admin = tao_token_truy_cap({
    sub: u_ad?.id ?? '', vai_tro: 'admin', nv: null, ten: 'AD' }).token;

  const ll = await truy_van_mot<{ id: string; loai_canh_bao_id: string }>(
    "select id, loai_canh_bao_id from loai_loi where ma = 'CH_KHONG_DINH_DANH'");
  loai_loi_id = ll?.id ?? '';
  loai_canh_bao_id = ll?.loai_canh_bao_id ?? '';
});

after(async () => {
  await app?.close();
  await dong_pool();
});

// ================================================================ phan quyen

test('nhan vien thuong khong vao duoc module giam sat', async () => {
  for (const url of ['/api/giam-sat/canh-bao', '/api/giam-sat/loai-loi',
    '/api/giam-sat/phep-do', '/api/giam-sat/tong-quan']) {
    const r = await goi('GET', url, token_nhan_vien);
    assert.equal(r.ma, 403, `${url} phai tu choi nhan vien thuong`);
  }
});

test('khong co token thi 401, khong phai 403', async () => {
  const r = await goi('GET', '/api/giam-sat/canh-bao', null);
  assert.equal(r.ma, 401);
});

test('kiem soat vien vao duoc, nhung KHONG cau hinh duoc nguon du lieu', async () => {
  assert.equal((await goi('GET', '/api/giam-sat/canh-bao', token_kiem_soat)).ma, 200);
  // Doi nguon du lieu la doi toan bo tap du lieu bi quet — viec ha tang, chi admin.
  assert.equal((await goi('GET', '/api/giam-sat/nguon', token_kiem_soat)).ma, 403);
  assert.equal((await goi('GET', '/api/giam-sat/nguon', token_admin)).ma, 200);
});

// ================================================================ danh muc

test('seed: du 6 nhom canh bao va 39 loai loi, moi loi co it nhat mot dieu kien', async () => {
  const cb = json<unknown[]>((await goi('GET', '/api/giam-sat/loai-canh-bao', token_kiem_soat)).than);
  assert.equal(cb.length, 6);

  const ll = json<{ so_dieu_kien: number; ma: string }[]>(
    (await goi('GET', '/api/giam-sat/loai-loi', token_kiem_soat)).than);
  assert.equal(ll.length, 39);
  const thieu = ll.filter((l) => l.so_dieu_kien === 0).map((l) => l.ma);
  assert.deepEqual(thieu, [], 'moi loai loi phai co it nhat mot dieu kien');
});

test('seed: KHONG dieu kien nao bat san', async () => {
  // Bat san bang mot con so tu nghi ra la de he thong ket toi nguoi that bang tieu chi khong
  // ai duyet. Nguoi dung phai tu bat sau khi chay thu.
  const dong = await truy_van_mot<{ so: number }>(
    'select count(*)::int as so from dieu_kien_loi where dang_bat = true');
  assert.equal(dong?.so, 0);
});

test('danh muc phep do: 39 phep do, dung mot cai khai chua trien khai', async () => {
  const ds = json<{ ma: string; chua_trien_khai: string | null; tham_so: unknown[] }[]>(
    (await goi('GET', '/api/giam-sat/phep-do', token_kiem_soat)).than);
  assert.equal(ds.length, 39);
  const chua = ds.filter((p) => p.chua_trien_khai !== null).map((p) => p.ma);
  assert.deepEqual(chua, ['chi_vuot_han_muc']);
});

test('tao dieu kien voi ma phep do la bi tu choi kem danh sach ma hop le', async () => {
  const r = await goi('POST', '/api/giam-sat/dieu-kien', token_kiem_soat,
    { loai_loi_id, phep_do: 'ma_bia_dat_khong_co_that', nguong: 1 });
  assert.equal(r.ma, 400);
  assert.match(r.than, /không tồn tại/);
  assert.match(r.than, /co_hoi_trung_sdt/, 'thong bao phai liet ke ma hop le');
});

test('tao dieu kien: mac dinh TAT, va tham so la bi loai', async () => {
  const r = await goi('POST', '/api/giam-sat/dieu-kien', token_kiem_soat, {
    loai_loi_id, phep_do: 'co_hoi_khong_dinh_danh', nguong: 1,
    tham_so: { ngay_nhin_lai: 45, khoa_la: 'xxx' },
  });
  assert.equal(r.ma, 201);
  const id = json<{ id: string }>(r.than).id;
  const dk = await truy_van_mot<{ dang_bat: boolean; tham_so: Record<string, unknown> }>(
    'select dang_bat, tham_so from dieu_kien_loi where id = $1', [id]);
  assert.equal(dk?.dang_bat, false, 'dieu kien moi phai TAT mac dinh');
  assert.deepEqual(dk?.tham_so, { ngay_nhin_lai: 45 }, 'khoa la phai bi loai khoi jsonb');
  await thuc_thi('delete from dieu_kien_loi where id = $1', [id]);
});

test('khong xoa duoc nhom canh bao con loai loi tham chieu', async () => {
  const r = await goi('DELETE', `/api/giam-sat/loai-canh-bao/${loai_canh_bao_id}`,
    token_kiem_soat);
  assert.equal(r.ma, 400);
  assert.match(r.than, /loại lỗi/);
});

// ================================================================ vong doi canh bao

test('vong doi canh bao: doi trang thai ghi nhat ky, va may khong tu dat khac "moi"', async () => {
  const cb = await truy_van_mot<{ id: string }>(
    `insert into canh_bao
       (loai_loi_id, nguon_ma, thuc_the, thuc_the_khoa, muc_do, tieu_de, bang_chung, gia_tri)
     values ($1,'sale','tbl_SaleOpportunity','999','cao','Canh bao kiem thu','{}'::jsonb,1)
     returning id`, [loai_loi_id]);
  const id = cb?.id ?? '';

  const moi = await truy_van_mot<{ trang_thai: string }>(
    'select trang_thai from canh_bao where id = $1', [id]);
  assert.equal(moi?.trang_thai, 'moi', 'canh bao moi ghi luon o trang thai "moi"');

  const r = await goi('POST', `/api/giam-sat/canh-bao/${id}/xu-ly`, token_kiem_soat,
    { trang_thai: 'xac_nhan', ket_luan: 'Da doi chieu, dung la sai.' });
  assert.equal(r.ma, 200);

  const sau = await truy_van_mot<{ trang_thai: string; ket_luan: string; nguoi_xu_ly: string }>(
    'select trang_thai, ket_luan, nguoi_xu_ly from canh_bao where id = $1', [id]);
  assert.equal(sau?.trang_thai, 'xac_nhan');
  assert.equal(sau?.ket_luan, 'Da doi chieu, dung la sai.');
  assert.notEqual(sau?.nguoi_xu_ly, null, 'phai ghi ai xu ly');

  const nk = await truy_van<{ trang_thai_truoc: string; trang_thai_sau: string }>(
    'select trang_thai_truoc, trang_thai_sau from canh_bao_xu_ly where canh_bao_id = $1', [id]);
  assert.equal(nk.length, 1, 'moi lan doi trang thai phai co mot dong nhat ky');
  assert.equal(nk[0]?.trang_thai_truoc, 'moi');
  assert.equal(nk[0]?.trang_thai_sau, 'xac_nhan');

  await thuc_thi('delete from canh_bao where id = $1', [id]);
});

test('chi muc duy nhat chan canh bao trung cho cung mot doi tuong', async () => {
  // Day la co che chong trung cua ca module: chay lai vong quet KHONG duoc sinh ban sao,
  // va KHONG duoc ghi de ket luan nguoi ta da viet.
  const chen = async () => truy_van(
    `insert into canh_bao
       (loai_loi_id, nguon_ma, thuc_the, thuc_the_khoa, muc_do, tieu_de, bang_chung, gia_tri)
     values ($1,'sale','tbl_DonHang','12345','cao','Lan dau','{}'::jsonb,1)
     on conflict do nothing returning id`, [loai_loi_id]);

  const lan1 = await chen();
  assert.equal(lan1.length, 1, 'lan dau phai chen duoc');
  const lan2 = await chen();
  assert.equal(lan2.length, 0, 'lan hai phai bi chi muc duy nhat chan');

  const dem = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from canh_bao
      where thuc_the = 'tbl_DonHang' and thuc_the_khoa = '12345'`);
  assert.equal(dem?.so, 1);

  await thuc_thi("delete from canh_bao where thuc_the_khoa = '12345'");
});

test('tong quan dem dung so canh bao moi va so qua han', async () => {
  await truy_van(
    `insert into canh_bao
       (loai_loi_id, nguon_ma, thuc_the, thuc_the_khoa, muc_do, tieu_de, bang_chung,
        gia_tri, phat_hien_luc)
     values ($1,'sale','tbl_DonHang','tq1','nghiem_trong','Moi','{}'::jsonb,1, now()),
            ($1,'sale','tbl_DonHang','tq2','trung','Qua han','{}'::jsonb,1,
             now() - interval '400 hours')
     on conflict do nothing`, [loai_loi_id]);

  const tq = json<{ moi: number; qua_han: number; nghiem_trong: number }>(
    (await goi('GET', '/api/giam-sat/tong-quan', token_kiem_soat)).than);
  assert.equal(tq.moi, 2);
  assert.equal(tq.nghiem_trong, 1);
  assert.ok(tq.qua_han >= 1, 'canh bao 400 gio truoc phai tinh la qua han');

  await thuc_thi("delete from canh_bao where thuc_the_khoa in ('tq1','tq2')");
});

// ================================================================ xuat CSV

test('xuat CSV: co BOM, va o bat dau bang dau = bi vo hieu hoa', async () => {
  await truy_van(
    `insert into canh_bao
       (loai_loi_id, nguon_ma, thuc_the, thuc_the_khoa, muc_do, tieu_de, bang_chung, gia_tri)
     values ($1,'sale','tbl_DonHang','csv1','cao',$2,'{}'::jsonb,1)
     on conflict do nothing`,
    [loai_loi_id, '=HYPERLINK("http://ke-tan-cong","bam vao day")']);

  const r = await goi('GET', '/api/giam-sat/canh-bao.csv', token_kiem_soat);
  assert.equal(r.ma, 200);
  assert.ok(r.than.startsWith('﻿'), 'phai co BOM de Excel doc dung tieng Viet');
  assert.ok(r.than.includes("'=HYPERLINK"),
    'o bat dau bang "=" phai duoc them dau nhay don — neu khong Excel se CHAY no');
  assert.ok(!/,=HYPERLINK/.test(r.than), 'khong duoc de cong thuc tran vao o');

  await thuc_thi("delete from canh_bao where thuc_the_khoa = 'csv1'");
});

test('nhan vien thuong khong tai duoc CSV', async () => {
  assert.equal((await goi('GET', '/api/giam-sat/canh-bao.csv', token_nhan_vien)).ma, 403);
});

// ================================================================ quet khi chua cau hinh

test('chua cau hinh ERP1_HOST: chay thu bi tu choi kem ly do, khong nem loi 500', async () => {
  const r = await goi('POST', '/api/giam-sat/thu-quy-tac', token_kiem_soat, { loai_loi_id });
  assert.equal(r.ma, 400);
  assert.match(r.than, /Chưa cấu hình/);
});

test('chua cau hinh ERP1_HOST: quet tay tra ly do ro rang thay vi bao "0 canh bao"', async () => {
  const r = await goi('POST', '/api/giam-sat/quet', token_admin);
  assert.equal(r.ma, 200);
  const kq = json<{ bo_qua_ly_do: string | null; so_canh_bao_moi: number }>(r.than);
  assert.equal(kq.so_canh_bao_moi, 0);
  assert.match(kq.bo_qua_ly_do ?? '', /ERP1_HOST/,
    'phai noi ro vi sao khong quet, khong im lang bao 0');
});
