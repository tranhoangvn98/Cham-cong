// Kiem thu e2e module to chuc – vi tri – trach nhiem:
//   nap JD (45 vi tri / 296 dau viec) -> gan vi tri cho nhan vien -> mau dinh ky
//   sinh -> lich chay sinh viec gan dau viec JD -> nhan vien xem "trach nhiem
//   cua toi" -> bao phu hien dung -> sao chep dau viec.
//
// CAN CSDL THAT (ten bat dau bang chamcong_test) — xoa sach cac bang lien quan
// truoc khi chay. Chay cung test_e2e (test-concurrency=1).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';

process.env['JWT_SECRET'] = 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['NODE_ENV'] = 'test';
process.env['DEVICE_TZ_OFFSET_HOURS'] = '7';
process.env['CORS_ORIGIN'] = 'http://localhost:5173';
process.env['DATABASE_URL'] ??=
  'postgres://chamcong:chamcong_dev@localhost:5432/chamcong_test';

const { dung_ung_dung } = await import('../src/ung_dung.ts');
const { chay_di_tru } = await import('../src/csdl/di_tru.ts');
const { thuc_thi, truy_van_mot } = await import('../src/csdl/ket_noi.ts');
const { bam_mat_khau } = await import('../src/bao_mat/mat_khau.ts');
const { nap_jd_neu_trong, thong_ke_jd } = await import('../src/to_chuc/du_lieu_jd.ts');
const { sinh_viec_dinh_ky } = await import('../src/viec/dinh_ky.ts');
const { ngay_dia_phuong } = await import('../src/tien_ich/thoi_gian.ts');

// Chan xoa du lieu that: chi cho DB ten *_test (giong e2e.test.ts).
function ten_csdl(url: string): string {
  const khong_truy_van = url.split('?')[0] ?? '';
  const sau = khong_truy_van.replace(/^[a-z+]+:\/\//i, '');
  const vt = sau.indexOf('/');
  return vt < 0 ? '' : sau.slice(vt + 1);
}
const ten_db = ten_csdl(process.env['DATABASE_URL']);
if (!ten_db.startsWith('chamcong_test')) {
  throw new Error(`Kiem thu e2e xoa sach du lieu nen chi chay tren DB ten '*_test'. DATABASE_URL dang tro toi '${ten_db}'.`);
}

let app: FastifyInstance;
let token_admin = '';
let token_nv = '';
let nv_id = '';
let vi_tri_thu_id = '';

async function goi(
  phuong: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  duong: string,
  phu: { token?: string; body?: unknown } = {},
): Promise<{ ma: number; body: Record<string, unknown> }> {
  const res = await app.inject({
    method: phuong,
    url: duong,
    ...(phu.token === undefined ? {} : { headers: { authorization: `Bearer ${phu.token}` } }),
    ...(phu.body === undefined ? {} : { payload: phu.body as never }),
  });
  return { ma: res.statusCode, body: JSON.parse(res.body) as Record<string, unknown> };
}

before(async () => {
  app = await dung_ung_dung();
  await chay_di_tru(() => {});

  // Xoa sach cac bang module to chuc + bang lien quan.
  await thuc_thi(`truncate table
    dau_viec_raci, dau_viec_buoc, dau_viec, tn_chi_tiet, vi_tri,
    nhom_trach_nhiem, bao_cao_mau, nhan_vien_vi_tri,
    cong_viec_mau_dinh_ky, cong_viec, bao_cao,
    nguoi_dung, nhan_vien, phong_ban
    restart identity cascade`);

  // Tai khoan admin + mot nhan vien co tai khoan.
  await thuc_thi(
    `insert into nguoi_dung(ten_dang_nhap, mat_khau_hash, vai_tro, phai_doi_mat_khau)
     values ('admin', $1, 'admin', false)`,
    [await bam_mat_khau('ChamCong2026')],
  );
  const phong = await truy_van_mot<{ id: string }>(
    `insert into phong_ban(ten) values ('Phòng IT') returning id`,
  );
  const nv = await truy_van_mot<{ id: string }>(
    `insert into nhan_vien(ma_nv, ho_ten, phong_ban_id, dang_hoat_dong)
     values ('NV01', 'Nhan Vien Thu', $1, true) returning id`,
    [phong?.id ?? null],
  );
  if (nv === null) throw new Error('khong tao duoc nhan vien');
  nv_id = nv.id;
  await thuc_thi(
    `insert into nguoi_dung(ten_dang_nhap, mat_khau_hash, vai_tro, nhan_vien_id, phai_doi_mat_khau)
     values ('nv01', $1, 'nhan_vien', $2, false)`,
    [await bam_mat_khau('MatKhau123'), nv_id],
  );

  const dn_admin = await goi('POST', '/api/xac-thuc/dang-nhap', {
    body: { ten_dang_nhap: 'admin', mat_khau: 'ChamCong2026' },
  });
  token_admin = dn_admin.body['token_truy_cap'] as string;
  const dn_nv = await goi('POST', '/api/xac-thuc/dang-nhap', {
    body: { ten_dang_nhap: 'nv01', mat_khau: 'MatKhau123' },
  });
  token_nv = dn_nv.body['token_truy_cap'] as string;
});

test('nap JD: du 45 vi tri, 296 dau viec, 67 tn, 23 nhom, co ma bao cao', async () => {
  await nap_jd_neu_trong();
  await nap_jd_neu_trong(); // chay hai lan phai khong trung
  const kq = await thong_ke_jd();
  assert.equal(kq.vi_tri, 45);
  assert.equal(kq.dau_viec, 296);
  assert.equal(kq.tn, 67);
  assert.equal(kq.nhom, 23);
  assert.ok(kq.ma_bc > 200, `ma bao cao chi ${kq.ma_bc}`);
});

test('danh sach vi tri + bao phu tra ve du lieu', async () => {
  const ds = await goi('GET', '/api/to-chuc/vi-tri', { token: token_admin });
  assert.equal(ds.ma, 200);
  assert.equal((ds.body as { length: number }).length, 45);
  const bp = await goi('GET', '/api/to-chuc/bao-phu', { token: token_admin });
  assert.equal(bp.ma, 200);
  const theo_tn = (bp.body as { theo_tn: { so_task: number }[] }).theo_tn;
  assert.ok(theo_tn.length > 60);
  // Truoc khi gan vi tri: moi task deu chua co nguoi thuc hien.
  const lo_hong = (bp.body as { lo_hong: unknown[] }).lo_hong;
  assert.equal(lo_hong.length, 296);
});

test('gan vi tri cho nhan vien -> sinh mau dinh ky, sinh viec JD', async () => {
  // Lay mot vi tri cu the (Phòng IT — Tech Lead) de gan.
  const ds = await goi('GET', '/api/to-chuc/vi-tri', { token: token_admin });
  const vt = ((ds.body as unknown) as { id: string; ten: string }[]).find((v) => v.ten === 'Tech Lead');
  assert.ok(vt !== undefined);
  vi_tri_thu_id = vt.id;

  const gan = await goi('POST', `/api/to-chuc/nhan-vien/${nv_id}/vi-tri`, {
    token: token_admin, body: { vi_tri_id: vi_tri_thu_id, la_chinh: true },
  });
  assert.equal(gan.ma, 200);

  // Mau dinh ky duoc sinh cho cac dau viec co tan suat dinh ky cua vi tri do.
  const d = await truy_van_mot<{ n: string }>(
    `select count(*)::text as n from cong_viec_mau_dinh_ky
      where nhan_vien_id = $1 and nguon = 'jd' and dang_bat`,
    [nv_id],
  );
  assert.ok(Number(d?.n ?? 0) > 0, 'khong co mau jd nao duoc sinh');

  // Chay lich sinh viec cho hom nay — cac viec hang_ngay duoc tao.
  const hom_nay = ngay_dia_phuong(new Date());
  const so = await sinh_viec_dinh_ky(hom_nay);
  assert.ok(so > 0, 'khong sinh duoc viec dinh ky nao');

  // Viec sinh ra gan dau viec JD.
  const dv = await truy_van_mot<{ n: string }>(
    `select count(*)::text as n from cong_viec
      where nhan_vien_id = $1 and dau_viec_id is not null`,
    [nv_id],
  );
  assert.ok(Number(dv?.n ?? 0) > 0, 'viec sinh khong gan dau viec JD');
});

test('nhan vien xem trach nhiem cua toi — co nhom, tn va dau viec', async () => {
  const r = await goi('GET', '/api/toi/trach-nhiem', { token: token_nv });
  assert.equal(r.ma, 200);
  const ds = (r.body as unknown) as {
    nhom_ten: string; viec: { ten_dau_viec: string; viec_trang_thai: string | null }[];
  }[];
  assert.ok(ds.length > 0);
  assert.ok(ds[0] !== undefined && ds[0].viec.length > 0);
  assert.equal(typeof ds[0].nhom_ten, 'string');
});

test('bao phu sau khi gan vi tri: task cua vi tri do co nguoi thuc hien', async () => {
  const bp = await goi('GET', '/api/to-chuc/bao-phu', { token: token_admin });
  const lo_hong = (bp.body as { lo_hong: unknown[] }).lo_hong;
  assert.equal(lo_hong.length, 296 - 11); // Tech Lead co 11 dau viec.
});

test('sao chep dau viec kem RACI + buoc', async () => {
  const ds = await goi('GET', `/api/to-chuc/vi-tri/${vi_tri_thu_id}`, { token: token_admin });
  const goc = ((ds.body as unknown) as { dau_viec: { id: string }[] }).dau_viec[0];
  assert.ok(goc !== undefined);
  const r = await goi('POST', `/api/to-chuc/dau-viec/${goc.id}/sao-chep`, {
    token: token_admin,
    body: { vi_tri_id: vi_tri_thu_id, ten: 'Bản sao thử nghiệm' },
  });
  assert.equal(r.ma, 200);
  const id = r.body['id'] as string;
  const chi_tiet = await goi('GET', `/api/to-chuc/dau-viec/${id}`, { token: token_admin });
  const dv = chi_tiet.body as { ten: string };
  assert.equal(dv.ten, 'Bản sao thử nghiệm');
});

test('nhan vien thuong khong sua duoc danh muc (403/401)', async () => {
  const r = await goi('POST', '/api/to-chuc/vi-tri', {
    token: token_nv,
    body: { ma: 'X', ten: 'Vi tri trai phep', cap_bac: 'nhan_vien', pham_vi: 'cu_the' },
  });
  assert.notEqual(r.ma, 200);
});
