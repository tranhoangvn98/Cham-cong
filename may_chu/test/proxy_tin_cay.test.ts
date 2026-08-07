// X-Forwarded-For chi duoc tin khi den tu proxy da khai trong PROXY_TIN_CAY.
//
// Vi sao co tep rieng: cau_hinh doc bien moi truong MOT LAN luc nap module, nen khong the
// doi PROXY_TIN_CAY giua chung trong e2e. Tep nay dung moi truong "co proxy tin cay" —
// dung cai ma ban trien khai that su chay khi dat sau Caddy.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env['NODE_ENV'] = 'production';
process.env['JWT_SECRET'] = 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['DATABASE_URL'] ??= 'postgres://khong_dung@127.0.0.1:5432/khong_dung';
process.env['DEVICE_TZ_OFFSET_HOURS'] = '7';
// Chi tin proxy trong dai 10.0.0.0/8. May cham cong duoc phep goi tu 192.168.9.0/24.
process.env['PROXY_TIN_CAY'] = '10.0.0.0/8';
process.env['ICLOCK_IP_CHO_PHEP'] = '192.168.9.0/24';

const { dung_ung_dung } = await import('../src/ung_dung.ts');
const { dong_pool } = await import('../src/csdl/ket_noi.ts');

const app = await dung_ung_dung();

/**
 * Chi quan tam co bi lop chan IP tu choi hay khong.
 *
 * Qua duoc lop chan thi request di tiep vao handler va se dung o buoc khac (401 vi serial
 * chua khai bao, hoac 500 neu khong co CSDL) — deu KHAC 403. Nho vay test khong phu thuoc
 * vao CSDL.
 */
async function goi_iclock(dia_chi_that: string, chuyen_tiep?: string) {
  return app.inject({
    method: 'GET',
    url: '/iclock/cdata?SN=KHONG-CO-THAT',
    remoteAddress: dia_chi_that,
    ...(chuyen_tiep === undefined ? {} : { headers: { 'x-forwarded-for': chuyen_tiep } }),
  });
}

test('proxy da khai: X-Forwarded-For duoc dung lam IP client', async () => {
  const r = await goi_iclock('10.1.2.3', '192.168.9.50');
  assert.notEqual(r.statusCode, 403, 'IP that trong header phai duoc chap nhan');
});

test('proxy da khai nhung IP trong header ngoai danh sach -> van chan', async () => {
  const r = await goi_iclock('10.1.2.3', '203.0.113.99');
  assert.equal(r.statusCode, 403);
});

test('KHONG phai proxy: X-Forwarded-For bi bo qua, lay dia chi that cua ket noi', async () => {
  // Day la lo hong da vá: truoc kia header nay duoc tin vo dieu kien nen ke tan cong tu
  // Internet chi can khai bao IP van phong la qua duoc danh sach trang.
  for (const gia_mao of ['192.168.9.50', '192.168.9.50, 203.0.113.99', '10.1.2.3']) {
    const r = await goi_iclock('203.0.113.99', gia_mao);
    assert.equal(r.statusCode, 403, `header "${gia_mao}" khong duoc phep vuot danh sach trang`);
  }
});

test('KHONG phai proxy va dia chi that hop le -> van cho qua', async () => {
  const r = await goi_iclock('192.168.9.50');
  assert.notEqual(r.statusCode, 403);
});

test('chuoi nhieu chang: chi lay chang do proxy tin cay ghi vao', async () => {
  // Client gui san "X-Forwarded-For: 192.168.9.50", proxy noi them IP that phia sau.
  // Fastify lay chang ngoai cung khong phai proxy tin cay -> 203.0.113.99, phai bi chan.
  const r = await goi_iclock('10.1.2.3', '192.168.9.50, 203.0.113.99');
  assert.equal(r.statusCode, 403, 'khong duoc tin chang do client tu ghi');
});

test.after(async () => {
  await app.close();
  await dong_pool();
});
