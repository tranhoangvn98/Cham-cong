// Kiem thu END-TO-END: gia lap may ZKTeco day log that qua giao thuc ADMS, roi kiem tra
// bang cong sinh ra dung, va app dien thoai cham cong duoc.
//
// CAN CSDL THAT. Bang bi XOA SACH truoc khi chay nen chi cho phep DB co ten ket thuc
// bang '_test' — de khong bao gio xoa du lieu that.
//
//   createdb chamcong_test
//   DATABASE_URL=postgres://chamcong:...@localhost:5432/chamcong_test npm run test_e2e
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';

process.env['JWT_SECRET'] = 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['NODE_ENV'] = 'test';
process.env['DEVICE_TZ_OFFSET_HOURS'] = '7';
process.env['CORS_ORIGIN'] = 'http://localhost:5173';
// Bat lop chan IP cho /iclock: cac test hien co goi tu 127.0.0.1 nen van qua,
// va co test rieng kiem IP ngoai danh sach bi chan.
process.env['ICLOCK_IP_CHO_PHEP'] = '127.0.0.1,192.168.9.0/24';
process.env['DATABASE_URL'] ??=
  'postgres://chamcong:chamcong_dev@localhost:5432/chamcong_test';

const ten_db = process.env['DATABASE_URL'].split('/').pop() ?? '';
if (!ten_db.startsWith('chamcong_test')) {
  throw new Error(
    `Kiem thu e2e xoa sach du lieu nen chi chay tren DB ten '*_test'. `
    + `DATABASE_URL dang tro toi '${ten_db}'.`,
  );
}

const { dung_ung_dung } = await import('../src/ung_dung.ts');
const { chay_di_tru } = await import('../src/csdl/di_tru.ts');
const { thuc_thi, truy_van_mot, dong_pool } = await import('../src/csdl/ket_noi.ts');
const { bam_mat_khau } = await import('../src/bao_mat/mat_khau.ts');
const { ngay_dia_phuong, cong_ngay } = await import('../src/tien_ich/thoi_gian.ts');
const { chay_mot_vong: giam_sat_may } = await import('../src/su_kien/giam_sat_may.ts');

let app: FastifyInstance;
let token_admin = '';
let token_nhan_vien = '';
let nhan_vien_id = '';
let ca_id = '';

const SERIAL = 'TEST-SN-0001';
const PIN = '5001';
/** Dung ngay hom qua: chac chan da qua, va tranh phu thuoc gio chay test. */
let NGAY = '';

async function goi(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  tuy_chon: { token?: string; body?: unknown } = {},
) {
  const res = await app.inject({
    method,
    url,
    headers: tuy_chon.token === undefined ? {} : { authorization: `Bearer ${tuy_chon.token}` },
    ...(tuy_chon.body === undefined ? {} : { payload: tuy_chon.body as object }),
  });
  let json: unknown = null;
  try {
    json = res.json();
  } catch {
    json = res.body;
  }
  return { ma: res.statusCode, body: json as Record<string, unknown>, tho: res.body };
}

before(async () => {
  app = await dung_ung_dung();
  await chay_di_tru(() => {});

  // Xoa sach de moi lan chay doc lap.
  await thuc_thi(`truncate table
    nhat_ky_thao_tac, token_push, token_lam_moi, hop_thu_di, lenh_thiet_bi,
    bang_cong_ngay, don_giai_trinh, don_nghi_phep, ngay_le, lan_quet,
    dia_diem, thiet_bi, nguoi_dung, nhan_vien, ca_lam, phong_ban
    restart identity cascade`);

  // Ngay lam viec gan nhat trong qua khu (tranh T7/CN de test ca hanh chinh).
  let ng = cong_ngay(ngay_dia_phuong(new Date()), -1);
  for (let i = 0; i < 7; i++) {
    const thu = new Date(`${ng}T00:00:00Z`).getUTCDay();
    if (thu >= 1 && thu <= 5) break;
    ng = cong_ngay(ng, -1);
  }
  NGAY = ng;

  // Tai khoan admin de goi API quan tri.
  await thuc_thi(
    `insert into nguoi_dung(ten_dang_nhap, mat_khau_hash, vai_tro, phai_doi_mat_khau)
     values ('admin', $1, 'admin', false)`,
    [await bam_mat_khau('ChamCong2026')],
  );
});

after(async () => {
  await app?.close();
  await dong_pool();
});

// ============================================================ dang nhap
test('health tra ve ok va ket noi duoc CSDL', async () => {
  const r = await goi('GET', '/health');
  assert.equal(r.ma, 200);
  assert.equal(r.body['trang_thai'], 'ok');
  assert.equal(r.body['csdl'], 'ok');
});

test('dang nhap sai mat khau tra 401 va khong tiet lo ly do', async () => {
  const r = await goi('POST', '/api/xac-thuc/dang-nhap', {
    body: { ten_dang_nhap: 'admin', mat_khau: 'sai_mat_khau_1' },
  });
  assert.equal(r.ma, 401);
  assert.equal(r.body['loi'], 'Tên đăng nhập hoặc mật khẩu không đúng.');
});

test('dang nhap tai khoan khong ton tai tra thong diep Y NGUYEN nhu sai mat khau', async () => {
  const r = await goi('POST', '/api/xac-thuc/dang-nhap', {
    body: { ten_dang_nhap: 'khong_ton_tai', mat_khau: 'MatKhau123' },
  });
  assert.equal(r.ma, 401);
  assert.equal(r.body['loi'], 'Tên đăng nhập hoặc mật khẩu không đúng.');
});

test('dang nhap dung tra ve token truy cap va token lam moi', async () => {
  const r = await goi('POST', '/api/xac-thuc/dang-nhap', {
    body: { ten_dang_nhap: 'admin', mat_khau: 'ChamCong2026' },
  });
  assert.equal(r.ma, 200);
  assert.ok(typeof r.body['token_truy_cap'] === 'string');
  assert.ok(typeof r.body['token_lam_moi'] === 'string');
  token_admin = r.body['token_truy_cap'] as string;
});

test('API quan tri tu choi khi khong co token', async () => {
  const r = await goi('GET', '/api/nhan-vien');
  assert.equal(r.ma, 401);
});

test('token lam moi KHONG dung duoc de goi API', async () => {
  const dn = await goi('POST', '/api/xac-thuc/dang-nhap', {
    body: { ten_dang_nhap: 'admin', mat_khau: 'ChamCong2026' },
  });
  const r = await goi('GET', '/api/nhan-vien', { token: dn.body['token_lam_moi'] as string });
  assert.equal(r.ma, 401);
});

test('token lam moi bi xoay: dung lai lan hai bi tu choi va cat het phien', async () => {
  const dn = await goi('POST', '/api/xac-thuc/dang-nhap', {
    body: { ten_dang_nhap: 'admin', mat_khau: 'ChamCong2026' },
  });
  const tlm = dn.body['token_lam_moi'] as string;

  const lan_1 = await goi('POST', '/api/xac-thuc/lam-moi', { body: { token_lam_moi: tlm } });
  assert.equal(lan_1.ma, 200, 'lan dau phai thanh cong');

  const lan_2 = await goi('POST', '/api/xac-thuc/lam-moi', { body: { token_lam_moi: tlm } });
  assert.equal(lan_2.ma, 401, 'dung lai token da xoay phai bi tu choi');
  assert.match(String(lan_2.body['loi']), /bảo mật/);
});

// ============================================================ khai bao he thong
test('tao ca hanh chinh', async () => {
  const r = await goi('POST', '/api/ca-lam', {
    token: token_admin,
    body: {
      ten: 'Hanh chinh', gio_vao: '08:00', gio_ra: '17:00',
      nghi_tu: '12:00', nghi_den: '13:30',
      dung_sai_muon_phut: 5, nguong_ot_phut: 30, cac_ngay_lam: [1, 2, 3, 4, 5],
    },
  });
  assert.equal(r.ma, 201);
  ca_id = r.body['id'] as string;
  assert.ok(ca_id);
});

test('tu choi ca co gio_ra <= gio_vao khi khong bat qua_dem', async () => {
  const r = await goi('POST', '/api/ca-lam', {
    token: token_admin,
    body: { ten: 'Ca sai', gio_vao: '17:00', gio_ra: '08:00', qua_dem: false },
  });
  assert.equal(r.ma, 400);
  assert.match(String(r.body['loi']), /qua đêm/);
});

test('tao nhan vien gan PIN may va ca', async () => {
  const r = await goi('POST', '/api/nhan-vien', {
    token: token_admin,
    body: {
      ma_nv: 'NV001', ho_ten: 'Nguyen Van A', pin_may: PIN,
      ca_lam_id: ca_id, ngay_vao: '2025-01-06', duoc_cham_cong_dien_thoai: true,
    },
  });
  assert.equal(r.ma, 201);
  nhan_vien_id = r.body['id'] as string;
});

test('tu choi PIN trung cho nhan vien khac', async () => {
  const r = await goi('POST', '/api/nhan-vien', {
    token: token_admin,
    body: { ma_nv: 'NV002', ho_ten: 'Tran Thi B', pin_may: PIN },
  });
  assert.equal(r.ma, 409);
});

test('tu choi PIN co chu (phai la chu so nhu tren may)', async () => {
  const r = await goi('POST', '/api/nhan-vien', {
    token: token_admin,
    body: { ma_nv: 'NV003', ho_ten: 'Le Van C', pin_may: 'ABC' },
  });
  assert.equal(r.ma, 400);
});

test('khai bao may cham cong', async () => {
  const r = await goi('POST', '/api/thiet-bi', {
    token: token_admin,
    body: { serial: SERIAL, ten: 'Cua chinh', vi_tri: 'Tang 1' },
  });
  assert.equal(r.ma, 201);
});

// ============================================================ GIAO THUC ADMS
test('may CHUA khai bao bi tu choi 401 (whitelist theo serial)', async () => {
  const r = await goi('GET', '/iclock/cdata?SN=MAY-LA-999&options=all');
  assert.equal(r.ma, 401);
});

test('handshake tra ve block cau hinh co Realtime=1', async () => {
  const r = await goi('GET', `/iclock/cdata?SN=${SERIAL}&options=all`);
  assert.equal(r.ma, 200);
  assert.match(r.tho, /Realtime=1/);
  assert.match(r.tho, /TimeZone=7/);
  assert.match(r.tho, new RegExp(`GET OPTION FROM: ${SERIAL}`));
});

test('may bao thong tin thiet bi (table=OPTIONS) -> luu firmware', async () => {
  const r = await app.inject({
    method: 'POST',
    url: `/iclock/cdata?SN=${SERIAL}&table=OPTIONS`,
    headers: { 'content-type': 'text/plain' },
    payload: '~DeviceName=SpeedFace-V5L,FirmVer=Ver 8.0.4.1,IPAddress=192.168.1.50',
  });
  assert.equal(r.statusCode, 200);

  const tb = await truy_van_mot<{ phien_ban_firmware: string | null }>(
    'select phien_ban_firmware from thiet_bi where serial = $1', [SERIAL],
  );
  assert.equal(tb?.phien_ban_firmware, 'Ver 8.0.4.1');
});

test('may day ATTLOG -> luu lan quet va TINH LUON bang cong', async () => {
  const body = [
    `${PIN}\t${NGAY} 08:12:03\t0\t15\t0`,
    `${PIN}\t${NGAY} 12:01:10\t2\t15\t0`,
    `${PIN}\t${NGAY} 13:28:44\t3\t15\t0`,
    `${PIN}\t${NGAY} 18:05:20\t1\t15\t0`,
  ].join('\n') + '\n';

  const r = await app.inject({
    method: 'POST',
    url: `/iclock/cdata?SN=${SERIAL}&table=ATTLOG`,
    headers: { 'content-type': 'text/plain' },
    payload: body,
  });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.trim(), 'OK: 4');

  // Bang cong phai duoc tinh ngay, khong cho lich chay dem.
  const bc = await truy_van_mot<{
    trang_thai: string; phut_lam: number; phut_muon: number; phut_ot: number; so_cong: number;
  }>(
    `select trang_thai, phut_lam, phut_muon, phut_ot, so_cong
       from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2`,
    [nhan_vien_id, NGAY],
  );
  assert.notEqual(bc, null, 'phai co dong bang cong sau khi may day log');
  assert.equal(bc!.trang_thai, 'co_mat');
  // Vao 08:12 (muon 12p, dung sai 5p -> phat 7p), ra 18:05.
  assert.equal(bc!.phut_muon, 7);
  // Cong kep trong khung ca 08:12:03 -> 17:00 = 527p (lam tron xuong), tru 90p nghi = 437p.
  assert.equal(bc!.phut_lam, 437);
  // Ra 18:05, sau ca 65 phut > nguong 30 -> OT 65p.
  assert.equal(bc!.phut_ot, 65);
  assert.equal(bc!.so_cong, 1);
});

test('may gui lai cung lo -> chong trung, khong nhan them ban ghi nao', async () => {
  const body = `${PIN}\t${NGAY} 08:12:03\t0\t15\t0\n`;
  const r = await app.inject({
    method: 'POST',
    url: `/iclock/cdata?SN=${SERIAL}&table=ATTLOG`,
    headers: { 'content-type': 'text/plain' },
    payload: body,
  });
  assert.equal(r.body.trim(), 'OK: 0', 'ban ghi trung phai bi bo qua');
});

test('PIN chua map nhan vien: van luu de khong mat du lieu, va bao cho nhan su', async () => {
  await app.inject({
    method: 'POST',
    url: `/iclock/cdata?SN=${SERIAL}&table=ATTLOG`,
    headers: { 'content-type': 'text/plain' },
    payload: `9999\t${NGAY} 09:00:00\t0\t1\t0\n`,
  });

  const r = await goi('GET', '/api/lan-quet/chua-map', { token: token_admin });
  assert.equal(r.ma, 200);
  const ds = r.body as unknown as { pin_may: string; so_lan: number }[];
  assert.ok(ds.some((d) => d.pin_may === '9999'), 'phai liet ke PIN 9999 chua map');
});

test('hang doi lenh: may poll getrequest nhan lenh, lan hai khong nhan lai', async () => {
  const dat = await goi('POST', `/api/thiet-bi/${SERIAL}/dong-bo-gio`, { token: token_admin });
  assert.equal(dat.ma, 200);

  const lan_1 = await goi('GET', `/iclock/getrequest?SN=${SERIAL}`);
  assert.match(lan_1.tho, /^C:\d+:SET OPTION DateTime=\d+/);

  const lan_2 = await goi('GET', `/iclock/getrequest?SN=${SERIAL}`);
  assert.equal(lan_2.tho.trim(), 'OK', 'lenh da gui khong duoc gui lai');
});

test('may bao ket qua lenh -> luu ma tra ve', async () => {
  const dat = await goi('POST', `/api/thiet-bi/${SERIAL}/gui-lai-log`, { token: token_admin });
  const lenh_id = dat.body['lenh_id'] as number;
  await goi('GET', `/iclock/getrequest?SN=${SERIAL}`);

  await app.inject({
    method: 'POST',
    url: `/iclock/devicecmd?SN=${SERIAL}`,
    headers: { 'content-type': 'text/plain' },
    payload: `ID=${lenh_id}&Return=0&CMD=CHECK\n`,
  });

  const l = await truy_van_mot<{ ma_tra_ve: number | null }>(
    'select ma_tra_ve from lenh_thiet_bi where id = $1', [lenh_id],
  );
  assert.equal(l?.ma_tra_ve, 0);
});

// ============================================================ bang cong & bao cao
test('bang cong tra ve dong da tinh', async () => {
  const r = await goi('GET', `/api/bang-cong?tu=${NGAY}&den=${NGAY}`, { token: token_admin });
  assert.equal(r.ma, 200);
  const ds = r.body as unknown as { ma_nv: string; phut_lam: number }[];
  assert.equal(ds.length, 1);
  assert.equal(ds[0]!.ma_nv, 'NV001');
  assert.equal(ds[0]!.phut_lam, 437);
});

test('tu choi khoang ngay qua dai (chong truy van keo sap CSDL)', async () => {
  const r = await goi('GET', '/api/bang-cong?tu=2020-01-01&den=2026-12-31', { token: token_admin });
  assert.equal(r.ma, 400);
  assert.match(String(r.body['loi']), /quá dài/);
});

test('xuat CSV co BOM UTF-8 va chong CSV injection', async () => {
  await goi('PATCH', `/api/bang-cong/${nhan_vien_id}/${NGAY}`, {
    token: token_admin,
    body: { ghi_chu: '=SUM(A1:A9)' },
  });

  const thang = NGAY.slice(0, 7);
  const res = await app.inject({
    method: 'GET',
    url: `/api/bang-cong/xuat-csv?thang=${thang}`,
    headers: { authorization: `Bearer ${token_admin}` },
  });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'] as string, /text\/csv/);
  assert.ok(res.body.startsWith('\uFEFF'), 'phai co BOM de Excel doc dung tieng Viet');
  assert.ok(res.body.includes('Mã NV'), 'tieu de CSV phai co dau tieng Viet');
  assert.ok(
    res.body.includes(",'=SUM(A1:A9)"),
    `cong thuc phai bi vo hieu hoa bang dau nhay dan, nhan duoc: ${res.body.slice(-120)}`,
  );
  assert.ok(!/,=SUM/.test(res.body), 'KHONG duoc de o bat dau bang dau = (Excel se chay cong thuc)');
});

test('dashboard tra ve tong quan hom nay va trang thai may', async () => {
  const r = await goi('GET', '/api/dashboard', { token: token_admin });
  assert.equal(r.ma, 200);
  assert.ok(Array.isArray(r.body['thiet_bi']));
  assert.ok(typeof (r.body['tong_quan'] as Record<string, unknown>)['tong_nhan_vien'] === 'number');
});

// ============================================================ ngay le & tinh lai
test('them ngay le -> tinh lai ngay do thanh nghi le', async () => {
  const r = await goi('POST', '/api/ngay-le', {
    token: token_admin,
    body: { ngay: NGAY, ten: 'Ngay le kiem thu', huong_luong: true },
  });
  assert.equal(r.ma, 201);

  const bc = await truy_van_mot<{ trang_thai: string; so_cong: number; phut_ot: number }>(
    'select trang_thai, so_cong, phut_ot from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2',
    [nhan_vien_id, NGAY],
  );
  assert.equal(bc?.trang_thai, 'ngay_le');
  assert.equal(bc?.so_cong, 1);
  // Ngay le khong co gio chuan de kep: tinh TOAN BO thoi gian co mat
  // 08:12:03 -> 18:05:20 = 593 phut, tru 90 phut nghi trua = 503.
  assert.equal(bc?.phut_ot, 503, 'lam viec ngay le -> toan bo thoi gian co mat tinh OT');
});

test('xoa ngay le -> ngay do tro lai co_mat', async () => {
  const r = await goi('DELETE', `/api/ngay-le/${NGAY}`, { token: token_admin });
  assert.equal(r.ma, 200);
  const bc = await truy_van_mot<{ trang_thai: string }>(
    'select trang_thai from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2',
    [nhan_vien_id, NGAY],
  );
  assert.equal(bc?.trang_thai, 'co_mat');
});

// ============================================================ APP DIEN THOAI
test('tao tai khoan cho nhan vien roi dang nhap', async () => {
  const tao = await goi('POST', '/api/nguoi-dung', {
    token: token_admin,
    body: {
      ten_dang_nhap: 'nv001', mat_khau: 'NhanVien2026',
      vai_tro: 'nhan_vien', nhan_vien_id,
    },
  });
  assert.equal(tao.ma, 201);

  const dn = await goi('POST', '/api/xac-thuc/dang-nhap', {
    body: { ten_dang_nhap: 'nv001', mat_khau: 'NhanVien2026' },
  });
  assert.equal(dn.ma, 200);
  assert.equal((dn.body['nguoi_dung'] as Record<string, unknown>)['phai_doi_mat_khau'], true);
  token_nhan_vien = dn.body['token_truy_cap'] as string;
});

test('nhan vien KHONG duoc goi API quan tri', async () => {
  const r = await goi('POST', '/api/thiet-bi', {
    token: token_nhan_vien,
    body: { serial: 'MAY-LA', ten: 'May la' },
  });
  assert.equal(r.ma, 403);
});

test('nhan vien xem duoc bang cong cua CHINH MINH', async () => {
  const thang = NGAY.slice(0, 7);
  const r = await goi('GET', `/api/toi/bang-cong?thang=${thang}`, { token: token_nhan_vien });
  assert.equal(r.ma, 200);
  const tong = r.body['tong_hop'] as Record<string, number>;
  assert.equal(Number(tong['tong_phut_lam']), 437);
});

test('nhan vien khong xem duoc bang cong nguoi khac (bi loc theo pham vi)', async () => {
  // Tao nhan vien thu hai co du lieu cong
  const nv2 = await goi('POST', '/api/nhan-vien', {
    token: token_admin,
    body: { ma_nv: 'NV009', ho_ten: 'Pham Thi D', pin_may: '5009', ca_lam_id: ca_id },
  });
  const nv2_id = nv2.body['id'] as string;
  await app.inject({
    method: 'POST',
    url: `/iclock/cdata?SN=${SERIAL}&table=ATTLOG`,
    headers: { 'content-type': 'text/plain' },
    payload: `5009\t${NGAY} 08:00:00\t0\t15\t0\n5009\t${NGAY} 17:00:00\t1\t15\t0\n`,
  });

  const r = await goi('GET', `/api/bang-cong?tu=${NGAY}&den=${NGAY}`, { token: token_nhan_vien });
  assert.equal(r.ma, 200);
  const ds = r.body as unknown as { nhan_vien_id: string }[];
  assert.equal(ds.length, 1, 'chi thay dong cua chinh minh');
  assert.equal(ds[0]!.nhan_vien_id, nhan_vien_id);
  assert.ok(!ds.some((d) => d.nhan_vien_id === nv2_id));
});

test('nhan vien gui don nghi phep, admin duyet -> ngay do thanh nghi_phep', async () => {
  const ngay_nghi = cong_ngay(ngay_dia_phuong(new Date()), 3);
  const gui = await goi('POST', '/api/toi/nghi-phep', {
    token: token_nhan_vien,
    body: { loai: 'phep_nam', tu_ngay: ngay_nghi, den_ngay: ngay_nghi, ly_do: 'Viec gia dinh' },
  });
  assert.equal(gui.ma, 201);
  const don_id = gui.body['id'] as string;

  const trung = await goi('POST', '/api/toi/nghi-phep', {
    token: token_nhan_vien,
    body: { loai: 'phep_nam', tu_ngay: ngay_nghi, den_ngay: ngay_nghi, ly_do: 'Trung' },
  });
  assert.equal(trung.ma, 409, 'khong cho gui don trum khoang ngay da co don');

  const duyet = await goi('POST', `/api/duyet/nghi-phep/${don_id}/quyet`, {
    token: token_admin,
    body: { quyet_dinh: 'da_duyet', ghi_chu: 'Dong y' },
  });
  assert.equal(duyet.ma, 200);

  const bc = await truy_van_mot<{ trang_thai: string; so_cong: number }>(
    'select trang_thai, so_cong from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2',
    [nhan_vien_id, ngay_nghi],
  );
  assert.equal(bc?.trang_thai, 'nghi_phep');
  assert.equal(bc?.so_cong, 1);

  const duyet_lai = await goi('POST', `/api/duyet/nghi-phep/${don_id}/quyet`, {
    token: token_admin,
    body: { quyet_dinh: 'tu_choi' },
  });
  assert.equal(duyet_lai.ma, 400, 'khong duoc quyet lai don da xu ly');
});

test('nhan vien gui don giai trinh quen quet, duyet -> bang cong duoc bu gio', async () => {
  // Ngay quen quet ra: chi co 1 moc vao.
  const ngay_quen = cong_ngay(NGAY, -1);
  await app.inject({
    method: 'POST',
    url: `/iclock/cdata?SN=${SERIAL}&table=ATTLOG`,
    headers: { 'content-type': 'text/plain' },
    payload: `${PIN}\t${ngay_quen} 08:00:00\t0\t15\t0\n`,
  });

  const truoc = await truy_van_mot<{ phut_lam: number }>(
    'select phut_lam from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2',
    [nhan_vien_id, ngay_quen],
  );
  assert.equal(truoc?.phut_lam, 0, 'chi 1 moc quet thi khong tinh duoc gio lam');

  const gui = await goi('POST', '/api/toi/giai-trinh', {
    token: token_nhan_vien,
    body: { ngay: ngay_quen, gio_ra_de_xuat: '17:00', ly_do: 'Quen quet the khi ra' },
  });
  assert.equal(gui.ma, 201);

  const duyet = await goi('POST', `/api/duyet/giai-trinh/${gui.body['id']}/quyet`, {
    token: token_admin,
    body: { quyet_dinh: 'da_duyet' },
  });
  assert.equal(duyet.ma, 200);

  const sau = await truy_van_mot<{ phut_lam: number; co_dieu_chinh: boolean }>(
    'select phut_lam, co_dieu_chinh from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2',
    [nhan_vien_id, ngay_quen],
  );
  assert.equal(sau?.phut_lam, 450, '08:00-17:00 tru 90 phut nghi trua');
  assert.equal(sau?.co_dieu_chinh, true);
});

test('chot thang -> khong tinh lai duoc nua', async () => {
  const thang = NGAY.slice(0, 7);
  const chot = await goi('POST', '/api/bang-cong/chot-thang', {
    token: token_admin, body: { thang },
  });
  assert.equal(chot.ma, 200);

  const truoc = await truy_van_mot<{ phut_lam: number }>(
    'select phut_lam from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2',
    [nhan_vien_id, NGAY],
  );

  // Day them mot lan quet muon hon: neu chua chot thi phut_ot se doi.
  await app.inject({
    method: 'POST',
    url: `/iclock/cdata?SN=${SERIAL}&table=ATTLOG`,
    headers: { 'content-type': 'text/plain' },
    payload: `${PIN}\t${NGAY} 21:30:00\t1\t15\t0\n`,
  });

  const sau = await truy_van_mot<{ phut_lam: number }>(
    'select phut_lam from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2',
    [nhan_vien_id, NGAY],
  );
  assert.equal(sau?.phut_lam, truoc?.phut_lam, 'ngay da chot khong duoc thay doi');

  await goi('POST', '/api/bang-cong/mo-chot-thang', { token: token_admin, body: { thang } });
});

// ============================================================ CHAM CONG DIEN THOAI
async function cham_cong_dien_thoai(
  token: string,
  vi_do: number,
  kinh_do: number,
  trang_thai: '0' | '1',
) {
  const bien = '----test-boundary-0001';
  // Anh JPEG toi thieu (magic byte FF D8 FF + duoi).
  const anh = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
    Buffer.alloc(64, 0x20),
    Buffer.from([0xff, 0xd9]),
  ]);

  const phan = (ten: string, gt: string) =>
    `--${bien}\r\nContent-Disposition: form-data; name="${ten}"\r\n\r\n${gt}\r\n`;

  const payload = Buffer.concat([
    Buffer.from(
      phan('vi_do', String(vi_do))
      + phan('kinh_do', String(kinh_do))
      + phan('do_chinh_xac_m', '12')
      + phan('trang_thai', trang_thai)
      + `--${bien}\r\nContent-Disposition: form-data; name="anh"; filename="selfie.jpg"\r\n`
      + 'Content-Type: image/jpeg\r\n\r\n',
    ),
    anh,
    Buffer.from(`\r\n--${bien}--\r\n`),
  ]);

  const res = await app.inject({
    method: 'POST',
    url: '/api/toi/cham-cong',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': `multipart/form-data; boundary=${bien}`,
    },
    payload,
  });
  return { ma: res.statusCode, body: res.json() as Record<string, unknown> };
}

test('cham cong dien thoai TRONG pham vi -> ghi nhan ngay va tinh cong', async () => {
  const dd = await goi('POST', '/api/dia-diem', {
    token: token_admin,
    body: { ten: 'Van phong Ha Noi', vi_do: 21.0278, kinh_do: 105.8342, ban_kinh_m: 200 },
  });
  assert.equal(dd.ma, 201);

  const r = await cham_cong_dien_thoai(token_nhan_vien, 21.0279, 105.8343, '0');
  assert.equal(r.ma, 201);
  assert.equal(r.body['trang_thai_duyet'], 'tu_dong');
  assert.equal(r.body['dia_diem'], 'Van phong Ha Noi');
  assert.ok(Number(r.body['khoang_cach_m']) < 200);

  const lq = await truy_van_mot<{ nguon: string; anh_ten_tep: string | null }>(
    `select nguon, anh_ten_tep from lan_quet where id = $1`, [r.body['id']],
  );
  assert.equal(lq?.nguon, 'dien_thoai');
  assert.ok(lq?.anh_ten_tep, 'phai luu anh selfie');
});

test('cham cong lien tuc trong 60 giay bi chan', async () => {
  const r = await cham_cong_dien_thoai(token_nhan_vien, 21.0279, 105.8343, '1');
  assert.equal(r.ma, 409);
  assert.match(String(r.body['loi']), /đợi 60 giây/);
});

test('cham cong NGOAI pham vi -> cho nhan su duyet, chua tinh cong', async () => {
  // Xoa lan quet cua test truoc de khong bi chan gian cach, roi TINH LAI bang cong
  // (xoa thang trong DB khong tu kich hoat tinh lai).
  const hom_nay_don = ngay_dia_phuong(new Date());
  await thuc_thi(`delete from lan_quet where nguon = 'dien_thoai'`);
  await goi('POST', '/api/bang-cong/tinh-lai', {
    token: token_admin,
    body: { tu: hom_nay_don, den: hom_nay_don, nhan_vien_id },
  });

  const r = await cham_cong_dien_thoai(token_nhan_vien, 21.2000, 105.9000, '0');
  assert.equal(r.ma, 201);
  assert.equal(r.body['trang_thai_duyet'], 'cho_duyet');
  assert.match(String(r.body['thong_bao']), /ngoài phạm vi/);

  // Chua duyet thi khong duoc dua vao tinh cong.
  const hom_nay = ngay_dia_phuong(new Date());
  const bc = await truy_van_mot<{ gio_vao: Date | null }>(
    'select gio_vao from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2',
    [nhan_vien_id, hom_nay],
  );
  assert.ok(bc === null || bc.gio_vao === null, 'lan quet cho duyet khong duoc tinh cong');

  // Nhan su duyet -> moi tinh.
  const cho = await goi('GET', '/api/duyet/quet-dien-thoai', { token: token_admin });
  const ds = cho.body as unknown as { id: string }[];
  assert.equal(ds.length, 1);

  const duyet = await goi('POST', `/api/duyet/quet-dien-thoai/${ds[0]!.id}/quyet`, {
    token: token_admin, body: { quyet_dinh: 'da_duyet' },
  });
  assert.equal(duyet.ma, 200);

  const bc2 = await truy_van_mot<{ gio_vao: Date | null }>(
    'select gio_vao from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2',
    [nhan_vien_id, hom_nay],
  );
  assert.notEqual(bc2?.gio_vao, null, 'sau khi duyet phai duoc tinh vao bang cong');
});

test('nhan vien chua duoc bat cham cong dien thoai thi bi tu choi', async () => {
  await goi('POST', '/api/nguoi-dung', {
    token: token_admin,
    body: { ten_dang_nhap: 'nv009', mat_khau: 'NhanVien2026', vai_tro: 'nhan_vien',
      nhan_vien_id: (await truy_van_mot<{ id: string }>(
        `select id from nhan_vien where ma_nv = 'NV009'`))!.id },
  });
  const dn = await goi('POST', '/api/xac-thuc/dang-nhap', {
    body: { ten_dang_nhap: 'nv009', mat_khau: 'NhanVien2026' },
  });
  const r = await cham_cong_dien_thoai(dn.body['token_truy_cap'] as string, 21.0279, 105.8343, '0');
  assert.equal(r.ma, 403);
  assert.match(String(r.body['loi']), /chưa được bật chấm công bằng điện thoại/);
});

test('anh selfie chi chu so huu / nhan su xem duoc', async () => {
  const lq = await truy_van_mot<{ id: string }>(
    `select id from lan_quet where anh_ten_tep is not null order by ghi_nhan_luc desc limit 1`,
  );
  assert.notEqual(lq, null);

  const chinh_minh = await app.inject({
    method: 'GET', url: `/api/toi/anh/${lq!.id}`,
    headers: { authorization: `Bearer ${token_nhan_vien}` },
  });
  assert.equal(chinh_minh.statusCode, 200);
  assert.equal(chinh_minh.headers['content-type'], 'image/jpeg');

  const nhan_su = await app.inject({
    method: 'GET', url: `/api/toi/anh/${lq!.id}`,
    headers: { authorization: `Bearer ${token_admin}` },
  });
  assert.equal(nhan_su.statusCode, 200);

  const khong_token = await app.inject({ method: 'GET', url: `/api/toi/anh/${lq!.id}` });
  assert.equal(khong_token.statusCode, 401);

  // Nguoi khac -> 404 (khong tiet lo anh co ton tai)
  const dn = await goi('POST', '/api/xac-thuc/dang-nhap', {
    body: { ten_dang_nhap: 'nv009', mat_khau: 'NhanVien2026' },
  });
  const nguoi_khac = await app.inject({
    method: 'GET', url: `/api/toi/anh/${lq!.id}`,
    headers: { authorization: `Bearer ${dn.body['token_truy_cap']}` },
  });
  assert.equal(nguoi_khac.statusCode, 404);
});

// ============================================================ trang chu / luong
test('trang chu tra ve du lieu cho Man 1: dai tuan, tong hop thang, quy phep, can chu y', async () => {
  const r = await goi('GET', '/api/toi/hom-nay', { token: token_nhan_vien });
  assert.equal(r.ma, 200);

  // dau_tuan phai la THU HAI (tuan Viet Nam bat dau T2, khong phai CN).
  const dau_tuan = r.body['dau_tuan'] as string;
  assert.equal(new Date(`${dau_tuan}T00:00:00Z`).getUTCDay(), 1, 'dau_tuan phai la thu Hai');

  const tuan = r.body['tuan'] as { ngay: string }[];
  assert.ok(Array.isArray(tuan));
  assert.ok(tuan.length <= 7, 'dai tuan toi da 7 ngay');
  for (const n of tuan) {
    assert.ok(n.ngay >= dau_tuan && n.ngay <= cong_ngay(dau_tuan, 6),
      `${n.ngay} phai nam trong tuan bat dau ${dau_tuan}`);
  }

  const th = r.body['thang_tong_hop'] as Record<string, unknown>;
  assert.ok(th !== null && typeof th === 'object');
  assert.ok('so_ngay_phai_lam' in th, 'can so_ngay_phai_lam de ve thanh chuyen can');

  const ccy = r.body['can_chu_y'] as Record<string, unknown>;
  // Man Don tu khong con tren thanh tab, so dem nay la duong duy nhat truong phong
  // biet co don cho duyet — thieu la luong duyet bi chon.
  assert.ok('don_cho_toi_duyet' in ccy);
  assert.ok('don_cua_toi_cho_duyet' in ccy);
  assert.equal(ccy['hop_dong_sap_het_han'], null, 'Module D chua co -> null, khong phai 0');
});

test('quy phep: chi tru phep nam da duyet, nghi om KHONG tru, nua ngay tinh 0,5', async () => {
  const dau = await goi('GET', '/api/toi/hom-nay', { token: token_nhan_vien });
  const p0 = dau.body['phep'] as { quy: number; da_dung: number; con_lai: number };
  // Test truoc do da duyet 1 ngay phep nam cho nhan vien nay.
  assert.equal(p0.quy, 12, 'mac dinh 12 ngay/nam theo Dieu 113 BLLD 2019');
  assert.equal(p0.da_dung, 1);
  assert.equal(p0.con_lai, 11);

  // Nghi om da duyet -> KHONG tru quy phep nam.
  const ngay_om = cong_ngay(ngay_dia_phuong(new Date()), 20);
  const don_om = await goi('POST', '/api/toi/nghi-phep', {
    token: token_nhan_vien,
    body: { loai: 'om', tu_ngay: ngay_om, den_ngay: ngay_om, ly_do: 'Cam' },
  });
  assert.equal(don_om.ma, 201);
  await goi('POST', `/api/duyet/nghi-phep/${don_om.body['id'] as string}/quyet`, {
    token: token_admin, body: { quyet_dinh: 'da_duyet' },
  });

  const sau_om = await goi('GET', '/api/toi/hom-nay', { token: token_nhan_vien });
  assert.equal((sau_om.body['phep'] as { da_dung: number }).da_dung, 1,
    'nghi om khong duoc tru vao quy phep nam');

  // Nua ngay phep nam -> tinh 0,5.
  const ngay_nua = cong_ngay(ngay_dia_phuong(new Date()), 25);
  const don_nua = await goi('POST', '/api/toi/nghi-phep', {
    token: token_nhan_vien,
    body: { loai: 'phep_nam', tu_ngay: ngay_nua, den_ngay: ngay_nua, nua_ngay: true, ly_do: 'Viec rieng' },
  });
  assert.equal(don_nua.ma, 201);
  await goi('POST', `/api/duyet/nghi-phep/${don_nua.body['id'] as string}/quyet`, {
    token: token_admin, body: { quyet_dinh: 'da_duyet' },
  });

  const sau_nua = await goi('GET', '/api/toi/hom-nay', { token: token_nhan_vien });
  const p1 = sau_nua.body['phep'] as { da_dung: number; con_lai: number };
  assert.equal(p1.da_dung, 1.5);
  assert.equal(p1.con_lai, 10.5);
});

test('man Luong tra co so tinh cong, KHONG bay so tien nao', async () => {
  const thang = NGAY.slice(0, 7);
  const r = await goi('GET', `/api/toi/luong?thang=${thang}`, { token: token_nhan_vien });
  assert.equal(r.ma, 200);

  // Module C chua trien khai: tuyet doi khong duoc tra so tien uoc tinh.
  assert.equal(r.body['phieu_luong'], null);
  assert.ok(typeof r.body['ly_do_chua_co_phieu_luong'] === 'string');
  assert.match(r.body['ghi_chu_ot'] as string, /chưa qua duyệt/);

  const tho = JSON.stringify(r.body);
  for (const cam of ['luong_co_ban', 'thuc_nhan', 'bhxh', 'thue_tncn', 'khau_tru']) {
    assert.ok(!tho.includes(`"${cam}"`), `khong duoc co truong tien luong: ${cam}`);
  }

  // Co so tinh luong phai TRUNG KHOP voi bang cong cua cung ky — hai man khac nhau
  // khong duoc ra hai con so.
  const bc = await goi('GET', `/api/toi/bang-cong?thang=${thang}`, { token: token_nhan_vien });
  const a = r.body['co_so_tinh_luong'] as Record<string, unknown>;
  const b = bc.body['tong_hop'] as Record<string, unknown>;
  for (const k of ['tong_cong', 'tong_phut_lam', 'tong_phut_ot', 'so_ngay_vang']) {
    assert.equal(String(a[k]), String(b[k]), `lech o truong ${k}`);
  }
});

// ============================================================ chan IP /iclock
test('/iclock chan IP ngoai danh sach cho phep (Task B5)', async () => {
  // Cong 8080 con phuc vu /api/* cho dien thoai o moi noi, nen khong chan bang tuong lua
  // duoc — phai chan theo duong dan o tang ung dung.
  const la = await app.inject({
    method: 'POST',
    url: `/iclock/cdata?SN=${SERIAL}&table=ATTLOG`,
    headers: { 'content-type': 'text/plain' },
    remoteAddress: '203.0.113.99',
    payload: `${PIN}\t${NGAY} 09:00:00\t0\t15\t0\n`,
  });
  assert.equal(la.statusCode, 403, 'IP ngoai danh sach phai bi chan');
  assert.match(la.body, /Forbidden/);

  // Va lan quet do KHONG duoc luu.
  const co = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from lan_quet
      where nhan_vien_id = $1 and thoi_diem = ($2 || ' 09:00:00')::timestamp - make_interval(hours => 7)`,
    [nhan_vien_id, NGAY],
  );
  assert.equal(co?.so, 0, 'request bi chan khong duoc ghi du lieu');

  // IP trong dai CIDR thi qua.
  const trong_dai = await app.inject({
    method: 'GET',
    url: `/iclock/cdata?SN=${SERIAL}`,
    remoteAddress: '192.168.9.50',
  });
  assert.equal(trong_dai.statusCode, 200, 'IP trong dai CIDR phai duoc phep');

  // Handshake tu 127.0.0.1 (cac test khac dung) van qua.
  const noi_bo = await app.inject({ method: 'GET', url: `/iclock/cdata?SN=${SERIAL}` });
  assert.equal(noi_bo.statusCode, 200);
});

test('KHONG gia mao duoc IP nguon bang header X-Forwarded-For', async () => {
  // Lo hong that: neu tin X-Forwarded-For vo dieu kien thi ICLOCK_IP_CHO_PHEP vo tac dung —
  // ke tan cong chi can them header ghi IP van phong la day duoc lan quet gia.
  // PROXY_TIN_CAY de trong trong bo test nay, nen header phai bi bo qua hoan toan.
  for (const header of ['192.168.9.50', '127.0.0.1', '192.168.9.50, 203.0.113.99']) {
    const r = await app.inject({
      method: 'POST',
      url: `/iclock/cdata?SN=${SERIAL}&table=ATTLOG`,
      headers: { 'content-type': 'text/plain', 'x-forwarded-for': header },
      remoteAddress: '203.0.113.99',
      payload: `${PIN}\t${NGAY} 09:30:00\t0\t15\t0\n`,
    });
    assert.equal(r.statusCode, 403, `X-Forwarded-For "${header}" khong duoc dung de vuot danh sach trang`);
  }

  const co = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from lan_quet
      where nhan_vien_id = $1 and thoi_diem = ($2 || ' 09:30:00')::timestamp - make_interval(hours => 7)`,
    [nhan_vien_id, NGAY],
  );
  assert.equal(co?.so, 0, 'request gia mao khong duoc ghi du lieu');
});

test('/api KHONG bi lop chan IP cua /iclock (dien thoai goi tu moi noi)', async () => {
  const r = await app.inject({
    method: 'POST',
    url: '/api/xac-thuc/dang-nhap',
    remoteAddress: '203.0.113.99',
    payload: { ten_dang_nhap: 'admin', mat_khau: 'ChamCong2026' },
  });
  assert.equal(r.statusCode, 200, 'chan IP chi duoc ap cho /iclock, khong duoc lan sang /api');
});

// ============================================================ giam sat may offline
test('may mat ket noi -> DUNG MOT canh bao, ket noi lai -> mot su kien phuc hoi', async () => {
  const dem = async (loai: string): Promise<number> => {
    const r = await truy_van_mot<{ so: number }>(
      `select count(*)::int as so from hop_thu_di
        where loai_su_kien = $1 and du_lieu->>'serial' = $2`,
      [loai, SERIAL],
    );
    return r?.so ?? 0;
  };

  // Day thay_lan_cuoi ve qua khu xa hon nguong, va dat lai co canh bao.
  await thuc_thi(
    `update thiet_bi
        set thay_lan_cuoi = now() - interval '2 hours', da_canh_bao_offline = false
      where serial = $1`,
    [SERIAL],
  );

  const truoc = await dem('thiet_bi.mat_ket_noi');
  await giam_sat_may(() => {});
  assert.equal(await dem('thiet_bi.mat_ket_noi'), truoc + 1, 'vong dau phai phat 1 canh bao');

  // Chay them hai vong nua trong khi may VAN dang offline: khong duoc canh bao lai.
  await giam_sat_may(() => {});
  await giam_sat_may(() => {});
  assert.equal(
    await dem('thiet_bi.mat_ket_noi'), truoc + 1,
    'khong duoc canh bao lai moi chu ky khi may van dang mat ket noi',
  );

  // May bao hieu lai (nhu khi poll /iclock/getrequest) -> co su kien phuc hoi.
  const truoc_lai = await dem('thiet_bi.ket_noi_lai');
  await thuc_thi('update thiet_bi set thay_lan_cuoi = now() where serial = $1', [SERIAL]);
  await giam_sat_may(() => {});
  assert.equal(await dem('thiet_bi.ket_noi_lai'), truoc_lai + 1);

  // Va lan mat ket noi SAU do lai duoc canh bao (co da duoc dat lai).
  await thuc_thi(
    `update thiet_bi set thay_lan_cuoi = now() - interval '2 hours' where serial = $1`,
    [SERIAL],
  );
  await giam_sat_may(() => {});
  assert.equal(await dem('thiet_bi.mat_ket_noi'), truoc + 2);
});

test('may dang_bat = false khong sinh canh bao (may da thao ra)', async () => {
  const nv = await goi('POST', '/api/thiet-bi', {
    token: token_admin,
    body: { serial: 'TEST-SN-TAT', ten: 'May da thao', vi_tri: 'Kho' },
  });
  assert.equal(nv.ma, 201);
  await thuc_thi(
    `update thiet_bi set dang_bat = false, thay_lan_cuoi = now() - interval '2 hours'
      where serial = 'TEST-SN-TAT'`,
  );

  await giam_sat_may(() => {});
  const r = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from hop_thu_di
      where loai_su_kien = 'thiet_bi.mat_ket_noi' and du_lieu->>'serial' = 'TEST-SN-TAT'`,
  );
  assert.equal(r?.so, 0);
});

// ============================================================ outbox
test('su kien duoc ghi vao hop thu di de dong bo ERP', async () => {
  const dong = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from hop_thu_di where loai_su_kien = 'lan_quet.da_ghi'`,
  );
  assert.ok(dong!.so > 0, 'phai co su kien lan_quet.da_ghi');

  const bc = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from hop_thu_di where loai_su_kien = 'bang_cong.da_chot'`,
  );
  assert.ok(bc!.so > 0, 'phai co su kien bang_cong.da_chot');
});

test('doi mat khau -> thu hoi moi phien cu', async () => {
  const dn = await goi('POST', '/api/xac-thuc/dang-nhap', {
    body: { ten_dang_nhap: 'nv001', mat_khau: 'NhanVien2026' },
  });
  const tlm = dn.body['token_lam_moi'] as string;

  const doi = await goi('POST', '/api/xac-thuc/doi-mat-khau', {
    token: dn.body['token_truy_cap'] as string,
    body: { mat_khau_cu: 'NhanVien2026', mat_khau_moi: 'MatKhauMoi2026' },
  });
  assert.equal(doi.ma, 200);

  const lam_moi = await goi('POST', '/api/xac-thuc/lam-moi', { body: { token_lam_moi: tlm } });
  assert.equal(lam_moi.ma, 401, 'token lam moi cu phai het hieu luc sau khi doi mat khau');
});

// ============================================================ khung gio rieng theo thu
// Che do lam viec theo hop dong: T2-T6 ca ngay + SANG THU BAY van la gio chuan.
// Truoc khi co ca_lam_theo_thu, moi thu Bay ca cong ty bi ghi "ve som ~330 phut".
const T7 = '2026-08-01'; // Thu Bay
const PIN_T7 = '5077';
let ca_t7_id = '';

test('tao ca co khung gio rieng cho thu Bay', async () => {
  const r = await goi('POST', '/api/ca-lam', {
    token: token_admin,
    body: {
      ten: 'Hanh chinh + sang T7', gio_vao: '08:00', gio_ra: '17:30',
      nghi_tu: '12:00', nghi_den: '13:30',
      dung_sai_muon_phut: 5, dung_sai_som_phut: 5, nguong_ot_phut: 30,
      phut_du_cong: 480, cac_ngay_lam: [1, 2, 3, 4, 5, 6],
      theo_thu: [{ thu: 6, gio_vao: '08:00', gio_ra: '12:00', phut_du_cong: 480 }],
    },
  });
  assert.equal(r.ma, 201);
  ca_t7_id = r.body['id'] as string;

  const ds = await goi('GET', '/api/ca-lam', { token: token_admin });
  const ca = (ds.body as unknown as Record<string, unknown>[]).find((c) => c['id'] === ca_t7_id);
  const tt = ca?.['theo_thu'] as Record<string, unknown>[];
  assert.equal(tt.length, 1, 'GET phai tra ve khung gio rieng da luu');
  assert.equal(tt[0]?.['thu'], 6);
});

test('tu choi khung gio rieng cho thu KHONG nam trong cac ngay di lam', async () => {
  const r = await goi('POST', '/api/ca-lam', {
    token: token_admin,
    body: {
      ten: 'Ca sai thu', gio_vao: '08:00', gio_ra: '17:00', cac_ngay_lam: [1, 2, 3, 4, 5],
      theo_thu: [{ thu: 0, gio_vao: '08:00', gio_ra: '12:00' }],
    },
  });
  assert.equal(r.ma, 400);
  assert.match(String(r.body['loi']), /Chủ nhật/);
});

test('tu choi khung gio rieng tren ca qua dem', async () => {
  const r = await goi('POST', '/api/ca-lam', {
    token: token_admin,
    body: {
      ten: 'Ca dem co thu rieng', gio_vao: '22:00', gio_ra: '06:00', qua_dem: true,
      cac_ngay_lam: [1, 2, 3, 4, 5, 6],
      theo_thu: [{ thu: 6, gio_vao: '22:00', gio_ra: '02:00' }],
    },
  });
  assert.equal(r.ma, 400);
  assert.match(String(r.body['loi']), /qua đêm/);
});

test('may day log sang thu Bay -> khong ve som, tinh 0,5 cong', async () => {
  const nv = await goi('POST', '/api/nhan-vien', {
    token: token_admin,
    body: { ma_nv: 'NV077', ho_ten: 'Le Thi Bay', pin_may: PIN_T7, ca_lam_id: ca_t7_id },
  });
  assert.equal(nv.ma, 201);
  const nv_id = nv.body['id'] as string;

  const body = [
    `${PIN_T7}\t${T7} 07:58:00\t0\t15\t0`,
    `${PIN_T7}\t${T7} 12:00:00\t1\t15\t0`,
  ].join('\n') + '\n';
  const r = await app.inject({
    method: 'POST',
    url: `/iclock/cdata?SN=${SERIAL}&table=ATTLOG`,
    headers: { 'content-type': 'text/plain' },
    payload: body,
  });
  assert.equal(r.body.trim(), 'OK: 2');

  const bc = await truy_van_mot<{
    trang_thai: string; phut_lam: number; phut_ve_som: number; phut_ot: number; so_cong: number;
  }>(
    `select trang_thai, phut_lam, phut_ve_som, phut_ot, so_cong
       from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2`,
    [nv_id, T7],
  );
  assert.notEqual(bc, null, 'thu Bay phai co dong bang cong');
  assert.equal(bc!.trang_thai, 'co_mat', 'thu Bay la ngay di lam, khong phai nghi tuan');
  assert.equal(bc!.phut_lam, 240, 'kep trong khung 08:00-12:00 cua thu Bay');
  assert.equal(bc!.phut_ve_som, 0, 've 12:00 la dung gio tan ca thu Bay — day la loi cu');
  assert.equal(bc!.phut_ot, 0);
  assert.equal(bc!.so_cong, 0.5, '240 phut / nguong 480 -> nua cong');
});

// ============================================================ dang nhap Microsoft
test('cau hinh cong khai bao dang nhap Microsoft dang TAT khi chua khai', async () => {
  const r = await goi('GET', '/api/xac-thuc/cau-hinh');
  assert.equal(r.ma, 200);
  assert.equal(r.body['dang_nhap_microsoft'], false, 'chua khai MS_* thi phai bao tat');
});

test('chua cau hinh thi /microsoft/bat-dau tu choi thay vi chuyen huong di dau do', async () => {
  const r = await app.inject({ method: 'GET', url: '/api/xac-thuc/microsoft/bat-dau' });
  assert.equal(r.statusCode, 400);
  assert.match(String((r.json() as { loi?: string }).loi), /chưa được cấu hình/);
});

test('/microsoft/goi-ve khong nhan duoc khi tinh nang tat', async () => {
  const r = await app.inject({ method: 'GET', url: '/api/xac-thuc/microsoft/goi-ve?code=abc&state=xyz' });
  assert.equal(r.statusCode, 400);
});

test('admin noi va go email Microsoft cho tai khoan', async () => {
  const ds = await goi('GET', '/api/nguoi-dung', { token: token_admin });
  const admin = (ds.body as unknown as Record<string, unknown>[])
    .find((t) => t['ten_dang_nhap'] === 'admin');
  assert.ok(admin, 'phai co tai khoan admin');
  assert.equal(admin?.['email_microsoft'], null, 'moi tao thi chua noi');
  const id = admin?.['id'] as string;

  const noi = await goi('PATCH', `/api/nguoi-dung/${id}`, {
    token: token_admin, body: { email_microsoft: 'sep@congty.vn' },
  });
  assert.equal(noi.ma, 200);

  const sau = await goi('GET', '/api/nguoi-dung', { token: token_admin });
  const dong = (sau.body as unknown as Record<string, unknown>[]).find((t) => t['id'] === id);
  assert.equal(dong?.['email_microsoft'], 'sep@congty.vn');

  // Email khong hop le bi tu choi.
  const sai = await goi('PATCH', `/api/nguoi-dung/${id}`, {
    token: token_admin, body: { email_microsoft: 'khong-phai-email' },
  });
  assert.equal(sai.ma, 400);

  // Chuoi rong = go lien ket.
  const go = await goi('PATCH', `/api/nguoi-dung/${id}`, {
    token: token_admin, body: { email_microsoft: '' },
  });
  assert.equal(go.ma, 200);
  const cuoi = await goi('GET', '/api/nguoi-dung', { token: token_admin });
  const dong2 = (cuoi.body as unknown as Record<string, unknown>[]).find((t) => t['id'] === id);
  assert.equal(dong2?.['email_microsoft'], null, 'chuoi rong phai go lien ket');
});
