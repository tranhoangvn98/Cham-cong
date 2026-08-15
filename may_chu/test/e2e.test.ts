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
import { createServer, type Server } from 'node:http';
import type { FastifyInstance } from 'fastify';

process.env['JWT_SECRET'] = 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['NODE_ENV'] = 'test';
process.env['DEVICE_TZ_OFFSET_HOURS'] = '7';
process.env['CORS_ORIGIN'] = 'http://localhost:5173';
// Bat lop chan IP cho /iclock: cac test hien co goi tu 127.0.0.1 nen van qua,
// va co test rieng kiem IP ngoai danh sach bi chan.
process.env['ICLOCK_IP_CHO_PHEP'] = '127.0.0.1,192.168.9.0/24';
// Tro thong bao day vao may chu gia dung trong tep nay, KHONG goi ra Expo that.
process.env['EXPO_PUSH_URL'] = 'http://127.0.0.1:39217/push';
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
const { tao_token_truy_cap } = await import('../src/bao_mat/jwt.ts');
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
  await dung_may_expo();
  await chay_di_tru(() => {});

  // Xoa sach de moi lan chay doc lap.
  await thuc_thi(`truncate table
    nhat_ky_thao_tac, token_push, token_lam_moi, hop_thu_di, lenh_thiet_bi,
    bang_cong_ngay, don_giai_trinh, don_nghi_phep, ngay_le, lan_quet,
    ho_so_tep, hop_dong_lao_dong, bien_ban_thoa_thuan, quyet_dinh_luong,
    cong_viec, bao_cao, khieu_nai, thiet_bi_cap_phat,
    ho_so_ca_nhan, tai_lieu_nhan_vien, nguoi_phu_thuoc, bhxh_su_kien,
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

// ---------------------------------------------------------------- Expo gia lap
//
// Thong bao day duoc gui NGAM (khong await trong route) nen test phai cho no toi noi.
// `cho_push` doi cho den khi may chu gia nhan du so goi mong doi, thay vi ngu mot khoang
// co dinh — ngu it thi test chap chon, ngu nhieu thi ca bo test cham di vo ich.
interface GoiPush { to: string; title: string; body: string; data?: Record<string, unknown> }
let expo_nhan: GoiPush[] = [];
let expo_tra_loi: 'ok' | 'chet' = 'ok';
let may_expo: Server | null = null;

function cho_push(so_luong: number, han_ms = 2000): Promise<void> {
  const het = Date.now() + han_ms;
  return new Promise((xong, hong) => {
    const kiem = (): void => {
      if (expo_nhan.length >= so_luong) { xong(); return; }
      if (Date.now() > het) {
        hong(new Error(`cho ${so_luong} thong bao, chi nhan ${expo_nhan.length}`));
        return;
      }
      setTimeout(kiem, 20);
    };
    kiem();
  });
}

function dung_may_expo(): Promise<void> {
  may_expo = createServer((req, res) => {
    let than = '';
    req.on('data', (m) => { than += String(m); });
    req.on('end', () => {
      const ds = JSON.parse(than) as GoiPush[];
      expo_nhan.push(...ds);
      // Expo tra mot ket qua cho MOI thong bao, dung thu tu gui len.
      const data = ds.map(() => (expo_tra_loi === 'ok'
        ? { status: 'ok' }
        : { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } }));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data }));
    });
  });
  return new Promise((ok) => may_expo!.listen(39217, '127.0.0.1', () => { ok(); }));
}

after(async () => {
  await app?.close();
  await new Promise<void>((ok) => { may_expo === null ? ok() : may_expo.close(() => { ok(); }); });
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

// Firmware PUSH 3.x mo phien bang POST /iclock/registry. Thieu endpoint nay thi may lap vo
// tan "GET /cdata -> POST /registry -> cho -> lap lai" va khong bao gio day ATTLOG. Da gap
// that voi may SenseFace 2A NYU7261300256.
test('registry: may da khai bao nhan duoc RegistryCode', async () => {
  const r = await app.inject({
    method: 'POST',
    url: `/iclock/registry?SN=${SERIAL}`,
    headers: { 'content-type': 'text/plain' },
    payload: '~DeviceType=acc,FirmVer=Ver 8.0.4.1',
  });
  assert.equal(r.statusCode, 200);
  assert.match(r.headers['content-type'] ?? '', /text\/plain/);
  assert.match(r.body, /^RegistryCode=/m);
});

test('registry: ma khong doi qua nhieu lan goi (may khong phai dang ky lai)', async () => {
  const goi_registry = async (): Promise<string> => (await app.inject({
    method: 'POST',
    url: `/iclock/registry?SN=${SERIAL}`,
    headers: { 'content-type': 'text/plain' },
    payload: '~DeviceType=acc',
  })).body;
  assert.equal(await goi_registry(), await goi_registry());
});

// PUSH 3.x hoi lenh bang POST /iclock/push chu khong phai GET /iclock/getrequest.
const hoi_lenh_qua_push = async (): Promise<string> => (await app.inject({
  method: 'POST',
  url: `/iclock/push?SN=${SERIAL}`,
  headers: { 'content-type': 'text/plain' },
  payload: '',
})).body;

test('push: lay duoc lenh dang cho, va lenh khong bi lay hai lan', async () => {
  const dat = await goi('POST', `/api/thiet-bi/${SERIAL}/gui-lai-log`, { token: token_admin });
  assert.equal(dat.ma, 200);

  const lan_1 = await hoi_lenh_qua_push();
  assert.match(lan_1, /CHECK/);
  assert.match(lan_1, /^C:\d+:/m, 'phai dung dinh dang C:<id>:<lenh>');

  assert.doesNotMatch(await hoi_lenh_qua_push(), /CHECK/, 'lenh da gui roi khong duoc gui lai');
});

test('push va getrequest dung CHUNG mot hang doi', async () => {
  const dat = await goi('POST', `/api/thiet-bi/${SERIAL}/dong-bo-gio`, { token: token_admin });
  assert.equal(dat.ma, 200);

  assert.match(await hoi_lenh_qua_push(), /DateTime=/);
  // Lay lai bang duong cu: khong duoc thay lenh do nua, neu khong may se thuc thi hai lan.
  const qua_getrequest = await goi('GET', `/iclock/getrequest?SN=${SERIAL}`);
  assert.doesNotMatch(qua_getrequest.tho, /DateTime=/);
});

test('push: may LA bi tu choi 401', async () => {
  const r = await app.inject({
    method: 'POST',
    url: '/iclock/push?SN=MAY-LA-999',
    headers: { 'content-type': 'text/plain' },
    payload: '',
  });
  assert.equal(r.statusCode, 401);
});

test('registry: may LA van bi tu choi 401', async () => {
  const r = await app.inject({
    method: 'POST',
    url: '/iclock/registry?SN=MAY-LA-999',
    headers: { 'content-type': 'text/plain' },
    payload: '~DeviceType=acc',
  });
  assert.equal(r.statusCode, 401);
});

test('endpoint /iclock la tra text/plain chu khong phai JSON cua Fastify', async () => {
  const r = await app.inject({ method: 'GET', url: `/iclock/khong-co-that?SN=${SERIAL}` });
  assert.equal(r.statusCode, 404);
  assert.match(r.headers['content-type'] ?? '', /text\/plain/);
  assert.doesNotMatch(r.body, /\{/);
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

// Firmware PUSH kiem soat ra vao day cham cong bang table=rtlog. Truoc khi ho tro, nhanh
// nay roi vao "bang khac, bo qua" nen moi lan quet bi vut im lang — may bao thanh cong,
// webapp khong co gi.
//
// CHU Y: bai nay them mot lan quet luc 07:58:11 — SOM hon moc 08:12:03 cua bai ATTLOG o
// tren, nen gio vao cua ngay NGAY doi. MOI kiem tra phut_lam / phut_ot cua ngay do o cac
// bai PHIA SAU deu phai tinh tu 07:58:11. Doi gio o day thi phai sua ca nhung cho ay.
test('may day RTLOG -> vao lan quet va tinh vao bang cong', async () => {
  const r = await app.inject({
    method: 'POST',
    url: `/iclock/cdata?SN=${SERIAL}&table=rtlog`,
    headers: { 'content-type': 'text/plain' },
    payload: `time=${NGAY} 07:58:11\tpin=${PIN}\tcardno=0\teventaddr=1`
      + '\tevent=0\tinoutstatus=0\tverifytype=15\tindex=0\n',
  });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.trim(), 'OK: 1');

  const lq = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from lan_quet
      where thiet_bi_serial = $1 and pin_may = $2 and thoi_diem::date = $3`,
    [SERIAL, PIN, NGAY],
  );
  assert.equal(lq!.so > 0, true, 'ban ghi rtlog phai vao bang lan_quet');
});

test('RTLOG rong (nhip tim) khong sinh ban ghi', async () => {
  const r = await app.inject({
    method: 'POST',
    url: `/iclock/cdata?SN=${SERIAL}&table=rtlog`,
    headers: { 'content-type': 'text/plain' },
    payload: '',
  });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.trim(), 'OK: 0');
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
  // Sau bai RTLOG, gio vao la 07:58:11 -> kep ve dau ca 08:00.
  // 08:00 -> 17:00 = 540p, tru 90p nghi trua = 450p.
  assert.equal(ds[0]!.phut_lam, 450);
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
  // Ngay le khong co gio chuan de kep: tinh TOAN BO thoi gian co mat, ke ca truoc dau ca.
  // 07:58:11 -> 18:05:20 = 607 phut, tru 90 phut nghi trua = 517.
  assert.equal(bc?.phut_ot, 517, 'lam viec ngay le -> toan bo thoi gian co mat tinh OT');
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
  // Nhu bai "bang cong tra ve dong da tinh": 450p sau khi RTLOG them moc 07:58:11.
  assert.equal(Number(tong['tong_phut_lam']), 450);
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

// ============================================================ tai khoan cho duyet
test('tai khoan cho_duyet: dang nhap duoc nhung bi chan khoi moi API nghiep vu', async () => {
  // Tao truc tiep trong CSDL dung nhu luong Microsoft tu tao khi email thuoc ten mien.
  const nd = await truy_van_mot<{ id: string }>(
    `insert into nguoi_dung(ten_dang_nhap, mat_khau_hash, vai_tro, email_microsoft, phai_doi_mat_khau)
     values ('nguoi.moi@congty.vn', $1, 'cho_duyet', 'nguoi.moi@congty.vn', false)
     returning id`,
    [await bam_mat_khau('MatKhauTam2026')],
  );
  assert.ok(nd);

  const dn = await goi('POST', '/api/xac-thuc/dang-nhap', {
    body: { ten_dang_nhap: 'nguoi.moi@congty.vn', mat_khau: 'MatKhauTam2026' },
  });
  assert.equal(dn.ma, 200, 'van dang nhap duoc — chi la chua co quyen');
  const token = dn.body['token_truy_cap'] as string;

  // /toi phai qua duoc, de webapp biet ma hien man hinh cho duyet.
  const toi = await goi('GET', '/api/xac-thuc/toi', { token });
  assert.equal(toi.ma, 200);
  assert.equal(toi.body['vai_tro'], 'cho_duyet');

  // Moi duong nghiep vu deu 403, ke ca duong chi doc.
  for (const duong of ['/api/nhan-vien', '/api/bang-cong?tu=2026-08-01&den=2026-08-02',
                       '/api/ca-lam', '/api/thiet-bi', '/api/toi/bang-cong?thang=2026-08']) {
    const r = await goi('GET', duong, { token });
    assert.equal(r.ma, 403, `${duong} phai tu choi tai khoan cho duyet`);
    assert.equal(r.body['cho_duyet'], true, 'phan hoi phai noi ro ly do de webapp xu ly');
  }

  // Admin phan quyen -> vao duoc.
  const cap = await goi('PATCH', `/api/nguoi-dung/${nd!.id}`, {
    token: token_admin, body: { vai_tro: 'nhan_su' },
  });
  assert.equal(cap.ma, 200);

  // Token CU van mang vai tro cu — vai tro nam trong token, khong tra CSDL moi request.
  const van_cu = await goi('GET', '/api/nhan-vien', { token });
  assert.equal(van_cu.ma, 403, 'token phat truoc khi duoc cap quyen thi van la cho_duyet');

  // Lam moi token -> may chu doc lai vai tro tu CSDL -> vao duoc.
  const lm = await goi('POST', '/api/xac-thuc/lam-moi', {
    body: { token_lam_moi: dn.body['token_lam_moi'] },
  });
  assert.equal(lm.ma, 200, `lam moi phai duoc: ${JSON.stringify(lm.body)}`);
  const sau = await goi('GET', '/api/nhan-vien', { token: lm.body['token_truy_cap'] as string });
  assert.equal(sau.ma, 200, 'duoc cap quyen roi thi vao duoc');

  // Va co ghi lai ai duyet.
  const ds = await goi('GET', '/api/nguoi-dung', { token: token_admin });
  const dong = (ds.body as unknown as Record<string, unknown>[]).find((t) => t['id'] === nd!.id);
  assert.notEqual(dong?.['duyet_luc'], null, 'phai ghi lai thoi diem phan quyen');
  assert.equal(dong?.['duyet_boi_ten'], 'admin');
});

test('khong tao duoc tai khoan cho_duyet bang tay qua API', async () => {
  const r = await goi('POST', '/api/nguoi-dung', {
    token: token_admin,
    body: { ten_dang_nhap: 'ai_do', mat_khau: 'MatKhau2026xyz', vai_tro: 'cho_duyet' },
  });
  assert.equal(r.ma, 400, 'cho_duyet la trang thai do he thong dat, khong phai vai tro de cap');
});

// ============================================================ quan ly log cham cong
test('loc log cham cong theo nhan vien, may, nguon, trang thai duyet', async () => {
  const chung = `tu=${NGAY}&den=${NGAY}`;

  const tat_ca = await goi('GET', `/api/lan-quet?${chung}`, { token: token_admin });
  assert.equal(tat_ca.ma, 200);
  const so_tat_ca = (tat_ca.body as unknown as unknown[]).length;
  assert.ok(so_tat_ca > 0, 'phai co du lieu de loc');

  const theo_may = await goi('GET', `/api/lan-quet?${chung}&thiet_bi_serial=${SERIAL}`,
    { token: token_admin });
  assert.ok((theo_may.body as unknown as unknown[]).length > 0);

  const may_khac = await goi('GET', `/api/lan-quet?${chung}&thiet_bi_serial=KHONG-CO-THAT`,
    { token: token_admin });
  assert.equal((may_khac.body as unknown as unknown[]).length, 0, 'may khac phai ra rong');

  const theo_nguon = await goi('GET', `/api/lan-quet?${chung}&nguon=may`, { token: token_admin });
  assert.ok((theo_nguon.body as unknown as Record<string, unknown>[]).every((d) => d['nguon'] === 'may'));

  const dien_thoai = await goi('GET', `/api/lan-quet?${chung}&nguon=dien_thoai`, { token: token_admin });
  assert.ok((dien_thoai.body as unknown as Record<string, unknown>[])
    .every((d) => d['nguon'] === 'dien_thoai'), 'loc nguon phai loai het ban ghi tu may');

  const theo_nv = await goi('GET', `/api/lan-quet?${chung}&nhan_vien_id=${nhan_vien_id}`,
    { token: token_admin });
  assert.ok((theo_nv.body as unknown as Record<string, unknown>[])
    .every((d) => d['nhan_vien_id'] === nhan_vien_id));

  // Gia tri khong hop le bi tu choi thay vi im lang bo qua bo loc.
  const sai = await goi('GET', `/api/lan-quet?${chung}&nguon=linh_tinh`, { token: token_admin });
  assert.equal(sai.ma, 400);
});

test('xuat CSV log cham cong: co BOM, dung gio may, chong CSV injection', async () => {
  const r = await app.inject({
    method: 'GET',
    url: `/api/lan-quet/xuat-csv?tu=${NGAY}&den=${NGAY}`,
    headers: { authorization: `Bearer ${token_admin}` },
  });
  assert.equal(r.statusCode, 200);
  assert.match(r.headers['content-type'] as string, /text\/csv/);
  assert.match(r.headers['content-disposition'] as string, /lan_quet_/);
  assert.ok(r.body.startsWith('﻿'), 'phai co BOM UTF-8 de Excel doc dung tieng Viet');

  const dong = r.body.split('\r\n');
  assert.match(dong[0] ?? '', /Thời điểm/);
  // Moc thoi gian phai theo gio noi dat may (UTC+7), khong phai gio may chu.
  assert.ok(dong.slice(1).some((d) => d.includes(`${NGAY} 08:12:03`)),
    `phai co moc 08:12:03 theo gio may. Nhan duoc:\n${dong.slice(1, 4).join('\n')}`);

  // Nhan vien thuong khong duoc xuat.
  const cam = await goi('GET', `/api/lan-quet/xuat-csv?tu=${NGAY}&den=${NGAY}`, { token: token_nhan_vien });
  assert.equal(cam.ma, 403);
});

// ============================================================ nhap hang loat
test('nhap nhan vien: xem truoc khong ghi gi, bao dung tung dong', async () => {
  const csv = [
    'Mã NV;Họ và tên;PIN máy;Bộ phận;Ngày vào;Email',
    'NVI001;Nguyễn Thị Nhập;7001;Kinh doanh;05/01/2026;nhap1@congty.vn',
    'NVI002;Trần Văn Nhập;7002;Kinh doanh;2026-02-10;',
    'NVI003;Lê Lỗi PIN;abc;Kinh doanh;;',      // PIN co chu -> loi
    'NVI004;;7004;;;',                          // thieu ho ten -> loi
    'NVI001;Trùng mã;7005;;;',                  // trung ma trong tep -> loi
  ].join('\n');

  const xem = await goi('POST', '/api/nhap/nhan-vien', {
    token: token_admin, body: { noi_dung: csv, xem_truoc: true, tao_thieu: true },
  });
  assert.equal(xem.ma, 200);
  assert.equal(xem.body['se_tao'], 2);
  assert.equal(xem.body['loi'], 3);

  const chua_ghi = await truy_van_mot<{ so: number }>(
    "select count(*)::int as so from nhan_vien where ma_nv like 'NVI%'");
  assert.equal(chua_ghi?.so, 0, 'xem truoc TUYET DOI khong duoc ghi gi');
});

test('nhap nhan vien: ghi that, ngay doc dung dd/mm/yyyy', async () => {
  const csv = [
    'Mã NV;Họ và tên;PIN máy;Bộ phận;Ngày vào',
    'NVI001;Nguyễn Thị Nhập;7001;Kinh doanh;05/01/2026',
    'NVI002;Trần Văn Nhập;7002;Kinh doanh;2026-02-10',
  ].join('\n');

  const r = await goi('POST', '/api/nhap/nhan-vien', {
    token: token_admin, body: { noi_dung: csv, xem_truoc: false, tao_thieu: true },
  });
  assert.equal(r.ma, 200);
  assert.equal(r.body['se_tao'], 2);

  const a = await truy_van_mot<{ ho_ten: string; pin_may: string; ngay_vao: string }>(
    "select ho_ten, pin_may, ngay_vao from nhan_vien where ma_nv = 'NVI001'");
  assert.equal(a?.ho_ten, 'Nguyễn Thị Nhập');
  assert.equal(a?.pin_may, '7001');
  // 05/01/2026 la NGAY 5 THANG 1 theo thong le Viet Nam, khong phai 1 thang 5.
  assert.equal(String(a!.ngay_vao).slice(0, 10), '2026-01-05');

  const pb = await truy_van_mot<{ so: number }>(
    "select count(*)::int as so from phong_ban where ten = 'Kinh doanh'");
  assert.equal(pb?.so, 1, 'tao_thieu phai tao phong ban dung mot lan');
});

test('nhap nhan vien lan hai: cap nhat, o de trong KHONG xoa gia tri cu', async () => {
  const csv = [
    'Mã NV;Họ và tên;PIN máy;Ngày vào',
    'NVI001;Nguyễn Thị Nhập (đã đổi tên);;',   // PIN va ngay de trong
  ].join('\n');

  const r = await goi('POST', '/api/nhap/nhan-vien', {
    token: token_admin, body: { noi_dung: csv, xem_truoc: false },
  });
  assert.equal(r.ma, 200, `phai thanh cong: ${JSON.stringify(r.body)}`);
  assert.equal(r.body['se_cap_nhat'], 1);

  const a = await truy_van_mot<{ ho_ten: string; pin_may: string; ngay_vao: string }>(
    "select ho_ten, pin_may, ngay_vao from nhan_vien where ma_nv = 'NVI001'");
  assert.match(a!.ho_ten, /đã đổi tên/);
  assert.equal(a?.pin_may, '7001', 'o de trong = khong doi, KHONG phai xoa');
  assert.equal(String(a!.ngay_vao).slice(0, 10), '2026-01-05');
});

test('nhap nhan vien: PIN dang thuoc nguoi khac thi bi tu choi', async () => {
  const csv = 'Mã NV;Họ và tên;PIN máy\nNVI002;Trần Văn Nhập;7001';
  const r = await goi('POST', '/api/nhap/nhan-vien', {
    token: token_admin, body: { noi_dung: csv, xem_truoc: true },
  });
  assert.equal(r.body['loi'], 1);
  const dong = (r.body['dong'] as unknown as Record<string, unknown>[])[0];
  assert.match(String(dong?.['loi']), /thuộc về một nhân viên khác/);
});

test('nhap nhan vien: thieu cot bat buoc thi tu choi ca tep', async () => {
  const r = await goi('POST', '/api/nhap/nhan-vien', {
    token: token_admin, body: { noi_dung: 'ten;pin\nAn;1', xem_truoc: true },
  });
  assert.equal(r.ma, 400);
  assert.match(String(r.body['loi']), /Mã NV/);
});

test('nhap lich su cham cong tu CSV co tieu de, ngay va gio o hai cot', async () => {
  const csv = [
    'User ID,Ngày,Giờ,Status',
    '7001,05/08/2026,08:03:00,0',
    '7001,05/08/2026,17:35:00,1',
    '7002,05/08/2026,08:10:00,0',
    'khong-co-gio,05/08/2026,,0',
  ].join('\n');

  const xem = await goi('POST', '/api/nhap/lan-quet', {
    token: token_admin, body: { noi_dung: csv, xem_truoc: true },
  });
  assert.equal(xem.ma, 200);
  assert.equal(xem.body['ban_ghi'], 3);
  assert.equal(xem.body['dong_bo_qua'], 1);
  assert.equal(xem.body['so_pin'], 2);

  const chua_ghi = await truy_van_mot<{ so: number }>(
    "select count(*)::int as so from lan_quet where pin_may = '7001'");
  assert.equal(chua_ghi?.so, 0, 'xem truoc khong duoc ghi');

  const that = await goi('POST', '/api/nhap/lan-quet', {
    token: token_admin, body: { noi_dung: csv, xem_truoc: false, serial: 'TEP-USB-01' },
  });
  assert.equal(that.body['da_nhan'], 3);

  // Nhap lai dung tep do -> chong trung, khong nhan them ban ghi nao.
  const lai = await goi('POST', '/api/nhap/lan-quet', {
    token: token_admin, body: { noi_dung: csv, xem_truoc: false, serial: 'TEP-USB-01' },
  });
  assert.equal(lai.body['da_nhan'], 0, 'nhap lai cung tep khong duoc nhan doi cong');
  assert.equal(lai.body['trung'], 3);

  // Va bang cong cua ngay do phai duoc tinh.
  const nv = await truy_van_mot<{ id: string }>("select id from nhan_vien where ma_nv = 'NVI001'");
  const bc = await truy_van_mot<{ trang_thai: string; phut_lam: number }>(
    'select trang_thai, phut_lam from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2',
    [nv!.id, '2026-08-05']);
  assert.notEqual(bc, null, 'nhap lich su phai tinh lai bang cong nhu may day truc tiep');
  assert.equal(bc!.trang_thai, 'co_mat');
});

test('nhap lich su: xem truoc bao PIN chua gan cho ai — truoc khi ghi, khong phai sau', async () => {
  const csv = [
    'PIN;Thời điểm',
    '7001;07/08/2026 08:00:00',   // NVI001 da nhan
    '96001;07/08/2026 08:01:00',  // khong ai nhan
    '96002;07/08/2026 08:02:00',  // khong ai nhan
  ].join('\n');

  const xem = await goi('POST', '/api/nhap/lan-quet', {
    token: token_admin, body: { noi_dung: csv, xem_truoc: true },
  });
  assert.equal(xem.ma, 200);
  const chua = [...(xem.body['chua_map_pin'] as string[])].sort();
  assert.deepEqual(chua, ['96001', '96002'],
    'PIN da co chu phai duoc loai ra, PIN vo chu phai bao het');

  const da_ghi = await truy_van_mot<{ so: number }>(
    "select count(*)::int as so from lan_quet where pin_may in ('96001','96002')");
  assert.equal(da_ghi?.so, 0, 'xem truoc van tuyet doi khong duoc ghi');
});

test('nhap lich su: chap nhan ca dinh dang ATTLOG tho cua may', async () => {
  const tho = ['7002\t2026-08-06 08:00:00\t0\t15\t0', '7002\t2026-08-06 17:30:00\t1\t15\t0'].join('\n');
  const r = await goi('POST', '/api/nhap/lan-quet', {
    token: token_admin, body: { noi_dung: tho, xem_truoc: false, serial: 'TEP-USB-01' },
  });
  assert.equal(r.body['da_nhan'], 2);
});

test('nhap: nhan vien thuong khong duoc nhap gi', async () => {
  for (const duong of ['/api/nhap/nhan-vien', '/api/nhap/lan-quet']) {
    const r = await goi('POST', duong, {
      token: token_nhan_vien, body: { noi_dung: 'a\n1', xem_truoc: true },
    });
    assert.equal(r.ma, 403, `${duong} phai chan nhan vien thuong`);
  }
});

// ============================================================ HO SO NHAN SU
// Day la noi de ro ri du lieu nhat he thong. Cac test duoi day khong kiem "chuc nang
// chay duoc" ma kiem "du lieu KHONG lo ra ngoai dung nguoi khong duoc xem".
let hs_nv_a = '';           // nhan vien A, phong Kinh doanh
let hs_nv_b = '';           // nhan vien B, cung phong voi A
let hs_token_a = '';        // tai khoan nhan vien thuong cua A
let hs_token_tp = '';       // truong phong cua chinh phong do (la B)
let hs_phong_id = '';

test('ho so: dung boi canh — hai nhan vien cung phong, mot nguoi la truong phong', async () => {
  const pb = await goi('POST', '/api/phong-ban', {
    token: token_admin, body: { ten: 'Kinh doanh HS' },
  });
  hs_phong_id = pb.body['id'] as string;

  for (const [ma, ten, bien] of [['HSA01', 'Nguyễn Hồ Sơ A', 'a'], ['HSB01', 'Trần Hồ Sơ B', 'b']] as const) {
    const r = await goi('POST', '/api/nhan-vien', {
      token: token_admin, body: { ma_nv: ma, ho_ten: ten, phong_ban_id: hs_phong_id },
    });
    assert.equal(r.ma, 201);
    if (bien === 'a') hs_nv_a = r.body['id'] as string;
    else hs_nv_b = r.body['id'] as string;
  }

  // Ky token truc tiep thay vi goi /dang-nhap: den luc nay bo test da dang nhap nhieu lan
  // nen se dinh rate limit (429). Rate limit do la co that va co test rieng; o day ta chi
  // can hai danh tinh de kiem phan quyen.
  for (const [tk, vai, lay_nv] of [
    ['hs_a', 'nhan_vien', () => hs_nv_a],
    ['hs_tp', 'truong_phong', () => hs_nv_b],
  ] as const) {
    const tao = await goi('POST', '/api/nguoi-dung', {
      token: token_admin,
      body: { ten_dang_nhap: tk, mat_khau: 'HoSo@2026', vai_tro: vai, nhan_vien_id: lay_nv() },
    });
    assert.equal(tao.ma, 201, JSON.stringify(tao.body));
    const token = tao_token_truy_cap({
      sub: tao.body['id'] as string, vai_tro: vai, nv: lay_nv(), ten: tk,
    }).token;
    if (tk === 'hs_a') hs_token_a = token;
    else hs_token_tp = token;
  }
});

test('ho so: nhan su tao duoc hop dong, luong, thiet bi cho nhan vien', async () => {
  const hd = await goi('POST', `/api/nhan-vien/${hs_nv_a}/hop-dong`, {
    token: token_admin,
    body: {
      so_hd: 'HD-2026-001', loai: 'xac_dinh', chuc_danh: 'Nhân viên kinh doanh',
      ngay_ky: '2026-01-02', hieu_luc_tu: '2026-01-05', hieu_luc_den: '2027-01-04',
      luong_co_ban: 12000000, trang_thai: 'hieu_luc',
    },
  });
  assert.equal(hd.ma, 201, JSON.stringify(hd.body));
  assert.equal(hd.body['so_hd'], 'HD-2026-001');

  const l = await goi('POST', `/api/nhan-vien/${hs_nv_a}/luong`, {
    token: token_admin,
    body: { hieu_luc_tu: '2026-01-05', luong_co_ban: 12000000, phu_cap: 1500000, ly_do: 'Ký HĐ chính thức' },
  });
  assert.equal(l.ma, 201, JSON.stringify(l.body));

  const tb = await goi('POST', `/api/nhan-vien/${hs_nv_a}/thiet-bi-cap-phat`, {
    token: token_admin,
    body: {
      loai: 'laptop', ten: 'Dell Latitude 5440', so_seri: 'DL5440X1',
      dia_chi_ip: '192.168.10.21', dia_chi_mac: '00-1A-2B-3C-4D-5E', ngay_cap: '2026-01-05',
    },
  });
  assert.equal(tb.ma, 201, JSON.stringify(tb.body));
  assert.equal(tb.body['dia_chi_ip'], '192.168.10.21');
  assert.equal(tb.body['dia_chi_mac'], '00:1a:2b:3c:4d:5e', 'MAC phai duoc chuan hoa');
});

test('ho so: TRUONG PHONG KHONG doc duoc luong va khieu nai cua cap duoi', async () => {
  for (const duong of ['luong', 'hop-dong', 'bien-ban', 'khieu-nai']) {
    const r = await goi('GET', `/api/nhan-vien/${hs_nv_a}/${duong}`, { token: hs_token_tp });
    assert.equal(r.ma, 403, `truong phong khong duoc xem ${duong} cua cap duoi`);
  }
});

test('ho so: truong phong VAN doc duoc cong viec, bao cao, thiet bi cua cap duoi', async () => {
  for (const duong of ['cong-viec', 'bao-cao', 'thiet-bi-cap-phat']) {
    const r = await goi('GET', `/api/nhan-vien/${hs_nv_a}/${duong}`, { token: hs_token_tp });
    assert.equal(r.ma, 200, `truong phong phai xem duoc ${duong}`);
  }
});

test('ho so: tong quan KHONG lo so luong cua nhom bi cam', async () => {
  // "Nhan vien nay co 3 khieu nai" tu no da la mot thong tin.
  const r = await goi('GET', `/api/nhan-vien/${hs_nv_a}/ho-so`, { token: hs_token_tp });
  assert.equal(r.ma, 200);
  const dem = r.body['dem'] as Record<string, number>;
  assert.equal(dem['khieu_nai'], undefined, 'khong duoc dem khieu nai cho truong phong');
  assert.equal(dem['luong'], undefined, 'khong duoc dem quyet dinh luong cho truong phong');
  assert.equal(r.body['luong_hien_tai'], null, 'khong duoc kem muc luong hien tai');
  assert.equal(r.body['hop_dong_hien_tai'], null);
  assert.ok((r.body['nhom_xem_duoc'] as string[]).includes('cong_viec'));
});

test('ho so: nhan vien xem duoc TOAN BO ho so cua chinh minh, ke ca luong', async () => {
  const r = await goi('GET', `/api/nhan-vien/${hs_nv_a}/ho-so`, { token: hs_token_a });
  assert.equal(r.ma, 200);
  // Doi chieu voi danh sach nhom trong ma nguon thay vi go so cung: them nhom moi thi
  // test nay phai van dung, khong phai sua theo.
  const { CAC_NHOM } = await import('../src/bao_mat/quyen_ho_so.ts');
  assert.deepEqual(
    [...(r.body['nhom_xem_duoc'] as string[])].sort(),
    [...CAC_NHOM].sort(),
    'chinh chu phai xem duoc moi nhom trong ho so cua minh',
  );
  const luong = r.body['luong_hien_tai'] as Record<string, unknown>;
  assert.equal(Number(luong['luong_co_ban']), 12000000);

  const l = await goi('GET', `/api/nhan-vien/${hs_nv_a}/luong`, { token: hs_token_a });
  assert.equal(l.ma, 200);
  assert.equal(l.body['sua_duoc'], false, 'xem duoc nhung KHONG sua duoc luong cua chinh minh');
});

test('ho so: nhan vien KHONG tu sua duoc luong / hop dong cua chinh minh', async () => {
  const l = await goi('POST', `/api/nhan-vien/${hs_nv_a}/luong`, {
    token: hs_token_a, body: { hieu_luc_tu: '2026-06-01', luong_co_ban: 99000000 },
  });
  assert.equal(l.ma, 403);

  const hd = await goi('POST', `/api/nhan-vien/${hs_nv_a}/hop-dong`, {
    token: hs_token_a, body: { hieu_luc_tu: '2026-06-01', luong_co_ban: 99000000 },
  });
  assert.equal(hd.ma, 403);
});

test('ho so: nhan vien KHONG xem duoc ho so cua nguoi khac', async () => {
  for (const duong of ['ho-so', 'luong', 'cong-viec', 'thiet-bi-cap-phat']) {
    const r = await goi('GET', `/api/nhan-vien/${hs_nv_b}/${duong}`, { token: hs_token_a });
    assert.equal(r.ma, 403, `${duong} cua nguoi khac phai bi chan`);
  }
});

test('ho so: nhan vien tu gui khieu nai duoc, nhung khong tu dat trang thai', async () => {
  const kn = await goi('POST', `/api/nhan-vien/${hs_nv_a}/khieu-nai`, {
    token: hs_token_a,
    body: {
      tieu_de: 'Chưa nhận phụ cấp tháng 7', noi_dung: 'Bảng lương tháng 7 thiếu phụ cấp xăng xe.',
      loai: 'luong_thuong', muc_do: 'cao',
      // Co tinh gui kem: phai bi bo qua, khong duoc tu ket luan la da giai quyet.
      trang_thai: 'da_giai_quyet', phan_hoi: 'Tự duyệt luôn',
    },
  });
  assert.equal(kn.ma, 201, JSON.stringify(kn.body));
  assert.equal(kn.body['trang_thai'], 'moi', 'nguoi gui khong duoc tu dat trang thai');
  assert.equal(kn.body['phan_hoi'], null, 'nguoi gui khong duoc tu viet phan hoi cua cong ty');
});

test('ho so: nguoi gui khong sua duoc trang thai khieu nai qua PATCH', async () => {
  const ds = await goi('GET', `/api/nhan-vien/${hs_nv_a}/khieu-nai`, { token: hs_token_a });
  const id = (ds.body['danh_sach'] as Record<string, unknown>[])[0]?.['id'];

  const r = await goi('PATCH', `/api/khieu-nai/${id}`, {
    token: hs_token_a, body: { trang_thai: 'da_giai_quyet' },
  });
  assert.equal(r.ma, 403);

  // Nhung van sua duoc noi dung khieu nai cua chinh minh.
  const ok = await goi('PATCH', `/api/khieu-nai/${id}`, {
    token: hs_token_a, body: { noi_dung: 'Bổ sung: thiếu cả phụ cấp điện thoại.' },
  });
  assert.equal(ok.ma, 200);
});

test('ho so: nguoi gui khong XOA duoc khieu nai — chi doi trang thai', async () => {
  // Neu xoa duoc thi mot khieu nai "bien mat" ma khong de lai vet nao.
  const ds = await goi('GET', `/api/nhan-vien/${hs_nv_a}/khieu-nai`, { token: hs_token_a });
  const id = (ds.body['danh_sach'] as Record<string, unknown>[])[0]?.['id'];
  const r = await goi('DELETE', `/api/khieu-nai/${id}`, { token: hs_token_a });
  assert.equal(r.ma, 403);
});

test('ho so: nhan su xu ly khieu nai thi tu dong dong moc thoi gian', async () => {
  const ds = await goi('GET', `/api/nhan-vien/${hs_nv_a}/khieu-nai`, { token: token_admin });
  const id = (ds.body['danh_sach'] as Record<string, unknown>[])[0]?.['id'];
  const r = await goi('PATCH', `/api/khieu-nai/${id}`, {
    token: token_admin, body: { trang_thai: 'da_giai_quyet', phan_hoi: 'Đã bổ sung vào kỳ lương tháng 8.' },
  });
  assert.equal(r.ma, 200);
  assert.notEqual(r.body['giai_quyet_luc'], null, 'phai ghi moc giai quyet');
});

test('ho so: nhan vien cap nhat duoc tien do cong viec nhung khong doi duoc han', async () => {
  const tao = await goi('POST', `/api/nhan-vien/${hs_nv_a}/cong-viec`, {
    token: hs_token_tp,
    body: { tieu_de: 'Chốt hợp đồng khách A', han: '2026-08-20', uu_tien: 'cao' },
  });
  assert.equal(tao.ma, 201, JSON.stringify(tao.body));
  const id = tao.body['id'];

  const doi_han = await goi('PATCH', `/api/cong-viec/${id}`, {
    token: hs_token_a, body: { han: '2026-12-31' },
  });
  assert.equal(doi_han.ma, 403, 'khong duoc tu doi han cong viec cua minh');

  const xong = await goi('PATCH', `/api/cong-viec/${id}`, {
    token: hs_token_a, body: { trang_thai: 'hoan_thanh', ket_qua: 'Đã ký, giá trị 240tr.' },
  });
  assert.equal(xong.ma, 200);
  assert.notEqual(xong.body['hoan_thanh_luc'], null, 'phai ghi moc hoan thanh');
});

test('ho so: hop dong khong xac dinh thoi han + ngay het han bi chan, kem giai thich', async () => {
  const r = await goi('POST', `/api/nhan-vien/${hs_nv_b}/hop-dong`, {
    token: token_admin,
    body: { loai: 'khong_xac_dinh', hieu_luc_tu: '2026-01-01', hieu_luc_den: '2027-01-01' },
  });
  assert.equal(r.ma, 400);
  assert.match(String(r.body['loi']), /Điều 20/);
});

test('ho so: hai thiet bi dang dung khong duoc trung IP', async () => {
  const r = await goi('POST', `/api/nhan-vien/${hs_nv_b}/thiet-bi-cap-phat`, {
    token: token_admin,
    body: { loai: 'laptop', ten: 'Máy trùng IP', dia_chi_ip: '192.168.10.21' },
  });
  assert.equal(r.ma, 400);
  assert.match(String(r.body['loi']), /đang được gán/);
});

test('ho so: IP sai dinh dang bi tu choi voi thong diep doc duoc', async () => {
  const r = await goi('POST', `/api/nhan-vien/${hs_nv_b}/thiet-bi-cap-phat`, {
    token: token_admin, body: { ten: 'Máy IP rác', dia_chi_ip: '999.1.1.1' },
  });
  assert.equal(r.ma, 400);
  assert.match(String(r.body['loi']), /IP không hợp lệ/);
});

test('ho so: thu hoi may cu roi thi IP do cap lai duoc', async () => {
  const ds = await goi('GET', `/api/nhan-vien/${hs_nv_a}/thiet-bi-cap-phat`, { token: token_admin });
  const cu = (ds.body['danh_sach'] as Record<string, unknown>[])
    .find((x) => x['dia_chi_ip'] === '192.168.10.21');
  const thu_hoi = await goi('PATCH', `/api/thiet-bi-cap-phat/${cu?.['id']}`, {
    token: token_admin, body: { tinh_trang: 'da_thu_hoi', ngay_thu_hoi: '2026-08-01' },
  });
  assert.equal(thu_hoi.ma, 200);

  const moi = await goi('POST', `/api/nhan-vien/${hs_nv_b}/thiet-bi-cap-phat`, {
    token: token_admin, body: { ten: 'Máy thay thế', dia_chi_ip: '192.168.10.21' },
  });
  assert.equal(moi.ma, 201, 'IP cua may da thu hoi phai dung lai duoc');
});

test('ho so: tai tep len, tai ve LUON dang tai xuong chu khong mo trong tab', async () => {
  // Tep dinh kem va webapp dung chung mot goc. Mot PDF mo inline chay duoc JavaScript
  // trong ngu canh cua chinh webapp — tuc XSS voi day du quyen nguoi dang dang nhap.
  const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(64, 0x20)]);
  const ranh_gioi = '----hoso';
  const than = Buffer.concat([
    Buffer.from(`--${ranh_gioi}\r\nContent-Disposition: form-data; name="nhom"\r\n\r\nhop_dong\r\n`),
    Buffer.from(`--${ranh_gioi}\r\nContent-Disposition: form-data; name="tep"; filename="Hợp đồng A.pdf"\r\n`
      + 'Content-Type: application/pdf\r\n\r\n'),
    pdf,
    Buffer.from(`\r\n--${ranh_gioi}--\r\n`),
  ]);

  const len = await app.inject({
    method: 'POST', url: `/api/nhan-vien/${hs_nv_a}/tep`,
    headers: {
      authorization: `Bearer ${token_admin}`,
      'content-type': `multipart/form-data; boundary=${ranh_gioi}`,
    },
    payload: than,
  });
  assert.equal(len.statusCode, 201, len.body);
  const tep_id = len.json()['id'];

  const ve = await goi('GET', `/api/ho-so/tep/${tep_id}`, { token: token_admin });
  assert.equal(ve.ma, 200);

  const res = await app.inject({
    method: 'GET', url: `/api/ho-so/tep/${tep_id}`,
    headers: { authorization: `Bearer ${token_admin}` },
  });
  assert.match(String(res.headers['content-disposition']), /^attachment;/,
    'KHONG duoc tra ve dang inline');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.ok(res.rawPayload.subarray(0, 5).equals(Buffer.from('%PDF-')), 'noi dung phai nguyen ven');

  // Truong phong khong doc duoc hop dong -> cung khong tai duoc tep hop dong.
  const tp = await goi('GET', `/api/ho-so/tep/${tep_id}`, { token: hs_token_tp });
  assert.equal(tp.ma, 403, 'quyen cua tep phai theo quyen cua NHOM chua no');

  // Chinh chu thi tai duoc.
  const chinh_chu = await goi('GET', `/api/ho-so/tep/${tep_id}`, { token: hs_token_a });
  assert.equal(chinh_chu.ma, 200);
});

test('ho so: tep khong phai PDF/anh/Office bi tu choi du doi duoi thanh .pdf', async () => {
  const ranh_gioi = '----hoso2';
  const than = Buffer.concat([
    Buffer.from(`--${ranh_gioi}\r\nContent-Disposition: form-data; name="nhom"\r\n\r\nhop_dong\r\n`),
    Buffer.from(`--${ranh_gioi}\r\nContent-Disposition: form-data; name="tep"; filename="virus.pdf"\r\n`
      + 'Content-Type: application/pdf\r\n\r\n'),
    Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff'), // header .exe
    Buffer.from(`\r\n--${ranh_gioi}--\r\n`),
  ]);
  const r = await app.inject({
    method: 'POST', url: `/api/nhan-vien/${hs_nv_a}/tep`,
    headers: {
      authorization: `Bearer ${token_admin}`,
      'content-type': `multipart/form-data; boundary=${ranh_gioi}`,
    },
    payload: than,
  });
  assert.equal(r.statusCode, 400, 'phai nhan dang bang magic byte, khong tin duoi ten');
});

test('ho so: bien ban KHONG bat buoc gan vao hop dong nao', async () => {
  // Phu luc thi gan vao hop dong, con bien ban hop / cam ket thi dung rieng. Doc truong
  // nay bang `uuid_bat_buoc` se bat moi bien ban phai co hop dong — loi im lang vi form
  // tren web khong he gui truong do.
  const r = await goi('POST', `/api/nhan-vien/${hs_nv_a}/bien-ban`, {
    token: token_admin,
    body: { loai: 'bien_ban_hop', tieu_de: 'Biên bản họp đánh giá quý 2', ngay_ky: '2026-07-01' },
  });
  assert.equal(r.ma, 201, JSON.stringify(r.body));
  assert.equal(r.body['hop_dong_id'], null);
});

test('ho so: gan duoc bien ban vao mot hop dong cu the', async () => {
  const hd = await goi('GET', `/api/nhan-vien/${hs_nv_a}/hop-dong`, { token: token_admin });
  const hop_dong_id = (hd.body['danh_sach'] as Record<string, unknown>[])[0]?.['id'];
  const r = await goi('POST', `/api/nhan-vien/${hs_nv_a}/bien-ban`, {
    token: token_admin,
    body: { loai: 'phu_luc', tieu_de: 'Phụ lục 01', hop_dong_id },
  });
  assert.equal(r.ma, 201, JSON.stringify(r.body));
  assert.equal(r.body['hop_dong_id'], hop_dong_id);
});

// ============================================================ HO SO DAY DU (checklist HCNS)
test('thong tin ca nhan: nhan su luu va doc lai duoc ban day du', async () => {
  const luu = await goi('PUT', `/api/nhan-vien/${hs_nv_a}/thong-tin`, {
    token: token_admin,
    body: {
      cccd_so: '001199012345', cccd_ngay_cap: '2021-03-15', cccd_noi_cap: 'Cục CS QLHC',
      ngay_sinh: '1990-07-20', gioi_tinh: 'nam',
      dia_chi_thuong_tru: '12 Nguyễn Trãi, Thanh Xuân, Hà Nội',
      lien_he_khan_ten: 'Nguyễn Thị B', lien_he_khan_quan_he: 'Vợ',
      lien_he_khan_sdt: '0912345678',
      ma_so_thue: '8123456789', so_bhxh: '0123456789',
      so_tai_khoan: '19001234567890', ngan_hang: 'Techcombank',
      kham_suc_khoe_ngay: '2026-01-10', kham_suc_khoe_ket_luan: 'Loại II',
    },
  });
  assert.equal(luu.ma, 200, JSON.stringify(luu.body));

  const doc = await goi('GET', `/api/nhan-vien/${hs_nv_a}/thong-tin`, { token: token_admin });
  assert.equal(doc.ma, 200);
  const h = doc.body['ho_so'] as Record<string, unknown>;
  assert.equal(h['cccd_so'], '001199012345', 'nhan su phai doc duoc ban day du');
  assert.equal(h['da_che'], false);
  assert.equal(doc.body['xem_day_du'], true);
});

test('thong tin ca nhan: TRUONG PHONG xem duoc nhung o dang DA CHE', async () => {
  const r = await goi('GET', `/api/nhan-vien/${hs_nv_a}/thong-tin`, { token: hs_token_tp });
  assert.equal(r.ma, 200, 'ho can lien he khan cap cua cap duoi khi co su co');
  const h = r.body['ho_so'] as Record<string, unknown>;

  assert.equal(r.body['xem_day_du'], false);
  assert.equal(h['da_che'], true);
  assert.notEqual(h['cccd_so'], '001199012345', 'so CCCD KHONG duoc lo nguyen ven');
  assert.match(String(h['cccd_so']), /•/);
  assert.equal(h['dia_chi_thuong_tru'], '(đã ẩn)');
  assert.equal(h['kham_suc_khoe_ket_luan'], '(đã ẩn)', 'ket luan suc khoe la du lieu nhay cam');
  assert.notEqual(h['so_tai_khoan'], '19001234567890');

  // Nhung thu ho THUC SU can thi van doc duoc.
  assert.equal(h['lien_he_khan_ten'], 'Nguyễn Thị B');
  assert.equal(h['ngay_sinh'], '1990-07-20');
  assert.equal(r.body['sua_duoc'], false);
});

test('thong tin ca nhan: doc ban DA CHE thi KHONG ghi nhat ky', async () => {
  // Nhat ky la de truy vet ai doc du lieu that. Ghi ca luot doc ban da che thi nhat ky
  // day rac va cai can tim chim mat trong do.
  const truoc = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from nhat_ky_thao_tac
      where hanh_dong = 'ho_so.xem_thong_tin_ca_nhan'`);
  await goi('GET', `/api/nhan-vien/${hs_nv_a}/thong-tin`, { token: hs_token_tp });
  const sau = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from nhat_ky_thao_tac
      where hanh_dong = 'ho_so.xem_thong_tin_ca_nhan'`);
  assert.equal(sau?.so, truoc?.so);
});

test('thong tin ca nhan: chinh chu doc duoc ban day du cua minh', async () => {
  const r = await goi('GET', `/api/nhan-vien/${hs_nv_a}/thong-tin`, { token: hs_token_a });
  assert.equal(r.ma, 200);
  const h = r.body['ho_so'] as Record<string, unknown>;
  assert.equal(h['cccd_so'], '001199012345', 'du lieu cua chinh ho thi ho xem duoc');
  assert.equal(r.body['sua_duoc'], false, 'nhung KHONG tu sua duoc');
});

test('thong tin ca nhan: nhan vien KHONG tu sua duoc so BHXH cua chinh minh', async () => {
  const r = await goi('PUT', `/api/nhan-vien/${hs_nv_a}/thong-tin`, {
    token: hs_token_a, body: { so_bhxh: '9999999999' },
  });
  assert.equal(r.ma, 403);
});

test('thong tin ca nhan: doc ban day du CUA NGUOI KHAC thi phai co vet trong nhat ky', async () => {
  const truoc = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from nhat_ky_thao_tac
      where hanh_dong = 'ho_so.xem_thong_tin_ca_nhan'`);
  await goi('GET', `/api/nhan-vien/${hs_nv_a}/thong-tin`, { token: token_admin });
  const sau = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from nhat_ky_thao_tac
      where hanh_dong = 'ho_so.xem_thong_tin_ca_nhan'`);
  assert.equal((sau?.so ?? 0) - (truoc?.so ?? 0), 1, 'moi lan doc du lieu ca nhan phai ghi lai');
});

test('thong tin ca nhan: CCCD trung nguoi khac bi chan kem thong diep ro', async () => {
  const r = await goi('PUT', `/api/nhan-vien/${hs_nv_b}/thong-tin`, {
    token: token_admin, body: { cccd_so: '001199012345' },
  });
  assert.equal(r.ma, 400);
  assert.match(String(r.body['loi']), /CCCD/);
});

test('checklist tai lieu: tra DU danh muc ke ca dong chua co gi', async () => {
  const r = await goi('GET', `/api/nhan-vien/${hs_nv_a}/tai-lieu`, { token: token_admin });
  assert.equal(r.ma, 200);
  const ds = r.body['danh_sach'] as Record<string, unknown>[];
  assert.ok(ds.length >= 11, 'phai tra ca nhung tai lieu CON THIEU, khong chi thu da nop');
  assert.ok(ds.some((d) => d['ma'] === 'cccd' && d['bat_buoc'] === true));
});

test('checklist tai lieu: nguoi DANG LAM duoc mien tai lieu chi phat sinh khi nghi viec', async () => {
  // Neu tinh ca "Quyet dinh nghi viec" vao tien do thi khong ai day duoc len 100%.
  const r = await goi('GET', `/api/nhan-vien/${hs_nv_a}/tai-lieu`, { token: token_admin });
  const ds = r.body['danh_sach'] as Record<string, unknown>[];
  const qd = ds.find((d) => d['ma'] === 'qd_nghi_viec');
  assert.equal(qd?.['tam_mien'], true);
  assert.equal(r.body['dang_nghi_viec'], false);

  const td = r.body['tien_do'] as { can_co: number; da_du: number };
  assert.equal(td.da_du, 0);
  assert.ok(td.can_co > 0 && td.can_co < ds.filter((d) => d['bat_buoc'] === true).length,
    'tai lieu offboarding phai bi tru khoi mau so');
});

test('checklist tai lieu: cap nhat trang thai thi tien do tang', async () => {
  const dat = await goi('PUT', `/api/nhan-vien/${hs_nv_a}/tai-lieu/cccd`, {
    token: token_admin,
    body: { trang_thai: 'da_len_phan_mem', nguoi_phu_trach: 'Nguyễn Thị HCNS', han_hoan_thanh: '2026-09-01' },
  });
  assert.equal(dat.ma, 200, JSON.stringify(dat.body));

  const r = await goi('GET', `/api/nhan-vien/${hs_nv_a}/tai-lieu`, { token: token_admin });
  assert.equal((r.body['tien_do'] as { da_du: number }).da_du, 1);
  const d = (r.body['danh_sach'] as Record<string, unknown>[]).find((x) => x['ma'] === 'cccd');
  assert.equal(d?.['trang_thai'], 'da_len_phan_mem');
  assert.equal(d?.['nguoi_phu_trach'], 'Nguyễn Thị HCNS');
});

test('checklist tai lieu: khong gan duoc tep cua nhan vien khac', async () => {
  // Neu gan duoc thi tu do doc duoc noi dung tep cua nguoi khac qua duong ho so cua minh.
  const tep = await truy_van_mot<{ id: string }>(
    'select id from ho_so_tep where nhan_vien_id = $1 limit 1', [hs_nv_a]);
  const r = await goi('PUT', `/api/nhan-vien/${hs_nv_b}/tai-lieu/cccd`, {
    token: token_admin, body: { trang_thai: 'da_so_hoa', tep_id: tep?.id },
  });
  assert.equal(r.ma, 400);
  assert.match(String(r.body['loi']), /không thuộc hồ sơ/);
});

test('nguoi phu thuoc va BHXH dung chung co che phan quyen voi cac nhom khac', async () => {
  const npt = await goi('POST', `/api/nhan-vien/${hs_nv_a}/nguoi-phu-thuoc`, {
    token: token_admin,
    body: { ho_ten: 'Nguyễn Văn Con', quan_he: 'con', ngay_sinh: '2018-05-02', da_dang_ky: true },
  });
  assert.equal(npt.ma, 201, JSON.stringify(npt.body));

  const bh = await goi('POST', `/api/nhan-vien/${hs_nv_a}/bhxh`, {
    token: token_admin,
    body: { loai: 'bao_tang', thang: '2026-01-01', muc_dong: 12000000, so_ho_so: '600a/2026' },
  });
  assert.equal(bh.ma, 201, JSON.stringify(bh.body));

  // Truong phong khong duoc dom ngo hai nhom nay.
  for (const duong of ['nguoi-phu-thuoc', 'bhxh']) {
    const r = await goi('GET', `/api/nhan-vien/${hs_nv_a}/${duong}`, { token: hs_token_tp });
    assert.equal(r.ma, 403, `${duong} khong duoc lo cho truong phong`);
  }
});

test('tong quan ho so: co tien do tai lieu, va truong phong khong thay tien do do', async () => {
  const ns = await goi('GET', `/api/nhan-vien/${hs_nv_a}/ho-so`, { token: token_admin });
  const td = ns.body['tien_do_tai_lieu'] as { can_co: number; da_du: number };
  assert.ok(td.can_co > 0);
  assert.equal(td.da_du, 1);

  const tp = await goi('GET', `/api/nhan-vien/${hs_nv_a}/ho-so`, { token: hs_token_tp });
  assert.equal(tp.body['tien_do_tai_lieu'], null);
});

// ============================================================ PHAN QUYEN TAI KHOAN
test('phan quyen: vai tro can ho so ma tai khoan chua co -> 400 co huong dan, KHONG phai 500', async () => {
  // Truoc day cau UPDATE di thang xuong CSDL, rang buoc CHECK no ra 23514 khong ai bat, va
  // nguoi dung nhan "Loi he thong" cho mot tinh huong hoan toan doan truoc duoc.
  // Tao GIONG luong dang nhap Microsoft: ghi thang vao CSDL voi ten_dang_nhap la email va
  // vai tro `cho_duyet`. Duong POST /nguoi-dung khong nhan ky tu '@' trong ten dang nhap,
  // nen goi qua do se khong tai hien dung tinh huong that.
  await thuc_thi(
    `insert into nguoi_dung(ten_dang_nhap, mat_khau_hash, vai_tro, email_microsoft,
                            phai_doi_mat_khau)
     values ($1, 'x', 'cho_duyet', $1, false)`,
    ['chua.co.hoso@congty.vn'],
  );
  const tk = (await truy_van_mot<{ id: string }>(
    "select id from nguoi_dung where ten_dang_nhap = 'chua.co.hoso@congty.vn'"))?.id as string;

  const r = await goi('PATCH', `/api/nguoi-dung/${tk}`, {
    token: token_admin, body: { vai_tro: 'truong_phong' },
  });
  assert.equal(r.ma, 400, 'phai la loi dau vao, khong phai loi he thong');
  assert.match(String(r.body['loi']), /hồ sơ nhân viên/);
  assert.match(String(r.body['loi']), /chua\.co\.hoso@congty\.vn/, 'phai chi ro email can khai');
});

test('phan quyen: tao ho so nhan vien dung email roi cap quyen lai thi TU NOI', async () => {
  const tk = (await truy_van_mot<{ id: string }>(
    "select id from nguoi_dung where ten_dang_nhap = 'chua.co.hoso@congty.vn'"))?.id;

  const nv = await goi('POST', '/api/nhan-vien', {
    token: token_admin,
    body: { ma_nv: 'NVLINK1', ho_ten: 'Người Được Nối', email: 'chua.co.hoso@congty.vn' },
  });
  assert.equal(nv.ma, 201, JSON.stringify(nv.body));

  const r = await goi('PATCH', `/api/nguoi-dung/${tk}`, {
    token: token_admin, body: { vai_tro: 'truong_phong' },
  });
  assert.equal(r.ma, 200, JSON.stringify(r.body));

  const sau = await truy_van_mot<{ nhan_vien_id: string | null; vai_tro: string }>(
    'select nhan_vien_id, vai_tro from nguoi_dung where id = $1', [tk]);
  assert.equal(sau?.vai_tro, 'truong_phong');
  assert.equal(sau?.nhan_vien_id, nv.body['id'], 'phai tu noi vao dung ho so vua tao');
});

test('phan quyen: chi dinh thang nhan_vien_id cung duoc', async () => {
  const nv = await goi('POST', '/api/nhan-vien', {
    token: token_admin, body: { ma_nv: 'NVLINK2', ho_ten: 'Người Chỉ Định' },
  });
  const tao = await goi('POST', '/api/nguoi-dung', {
    token: token_admin,
    body: { ten_dang_nhap: 'chi.dinh', mat_khau: 'ChiDinh@2026', vai_tro: 'nhan_su' },
  });
  assert.equal(tao.ma, 201, JSON.stringify(tao.body));
  const r = await goi('PATCH', `/api/nguoi-dung/${tao.body['id']}`, {
    token: token_admin, body: { vai_tro: 'nhan_vien', nhan_vien_id: nv.body['id'] },
  });
  assert.equal(r.ma, 200, JSON.stringify(r.body));
  const sau = await truy_van_mot<{ nhan_vien_id: string }>(
    'select nhan_vien_id from nguoi_dung where id = $1', [tao.body['id']]);
  assert.equal(sau?.nhan_vien_id, nv.body['id']);
});

test('phan quyen: nhan vien da co tai khoan thi bao dung ly do, khong bao nham email', async () => {
  // Truoc day moi loi trung khoa deu tra "Email Microsoft nay da gan cho tai khoan khac",
  // ke ca khi that ra la nhan vien do da co tai khoan — sua mai khong ra.
  const tao = await goi('POST', '/api/nguoi-dung', {
    token: token_admin,
    body: { ten_dang_nhap: 'trung.nv', mat_khau: 'TrungNV@2026', vai_tro: 'nhan_su' },
  });
  const r = await goi('PATCH', `/api/nguoi-dung/${tao.body['id']}`, {
    token: token_admin, body: { vai_tro: 'nhan_vien', nhan_vien_id: hs_nv_b },
  });
  assert.equal(r.ma, 409);
  assert.match(String(r.body['loi']), /đã có một tài khoản khác/);
});

// ============================================================ XEM NHANH TEP
test('xem nhanh: PDF tra inline nhung van bi nhot trong sandbox', async () => {
  const t = await truy_van_mot<{ id: string }>(
    "select id from ho_so_tep where kieu_mime = 'application/pdf' limit 1");
  const res = await app.inject({
    method: 'GET', url: `/api/ho-so/tep/${t?.id}/xem`,
    headers: { authorization: `Bearer ${token_admin}` },
  });
  assert.equal(res.statusCode, 200);
  assert.match(String(res.headers['content-disposition']), /^inline;/);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  // `sandbox` dat noi dung vao mot goc rieng — mot PDF co JavaScript khong voi duoc token
  // cua nguoi dang dang nhap.
  assert.match(String(res.headers['content-security-policy']), /sandbox/);
  assert.match(String(res.headers['content-security-policy']), /default-src 'none'/);
});

test('xem nhanh: duong tai ve VAN giu attachment, khong bi lay theo', async () => {
  const t = await truy_van_mot<{ id: string }>(
    "select id from ho_so_tep where kieu_mime = 'application/pdf' limit 1");
  const res = await app.inject({
    method: 'GET', url: `/api/ho-so/tep/${t?.id}`,
    headers: { authorization: `Bearer ${token_admin}` },
  });
  assert.match(String(res.headers['content-disposition']), /^attachment;/);
});

test('xem nhanh: quyen di theo NHOM chua tep, ke ca duong xem moi', async () => {
  // Them mot duong xem ma quen kiem quyen la mo cua sau cho ca kho tep.
  const t = await truy_van_mot<{ id: string }>(
    "select id from ho_so_tep where nhom = 'hop_dong' limit 1");
  for (const duong of ['xem', 'trich']) {
    const r = await goi('GET', `/api/ho-so/tep/${t?.id}/${duong}`, { token: hs_token_tp });
    assert.equal(r.ma, 403, `/${duong} phai chan nguoi khong doc duoc nhom hop_dong`);
  }
});

test('xem nhanh: boc noi dung DOCX ra van ban', async () => {
  const { deflateRawSync } = await import('node:zlib');
  // Dung mot DOCX toi thieu that (ZIP + word/document.xml).
  const xml = Buffer.from(
    '<w:body><w:p><w:r><w:t>PHỤ LỤC HỢP ĐỒNG</w:t></w:r></w:p></w:body>', 'utf8');
  const nen = deflateRawSync(xml);
  const ten = Buffer.from('word/document.xml', 'utf8');
  const h = Buffer.alloc(30);
  h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(8, 8);
  h.writeUInt32LE(nen.length, 18); h.writeUInt32LE(xml.length, 22);
  h.writeUInt16LE(ten.length, 26);
  const c = Buffer.alloc(46);
  c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(8, 10);
  c.writeUInt32LE(nen.length, 20); c.writeUInt32LE(xml.length, 24);
  c.writeUInt16LE(ten.length, 28); c.writeUInt32LE(0, 42);
  const cuc_bo = Buffer.concat([h, ten, nen]);
  const tt = Buffer.concat([c, ten]);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(tt.length, 12); eocd.writeUInt32LE(cuc_bo.length, 16);
  const docx = Buffer.concat([cuc_bo, tt, eocd]);

  const rg = '----docx';
  const than = Buffer.concat([
    Buffer.from(`--${rg}\r\nContent-Disposition: form-data; name="nhom"\r\n\r\nbien_ban\r\n`),
    Buffer.from(`--${rg}\r\nContent-Disposition: form-data; name="tep"; filename="phu-luc.docx"\r\n\r\n`),
    docx,
    Buffer.from(`\r\n--${rg}--\r\n`),
  ]);
  const len = await app.inject({
    method: 'POST', url: `/api/nhan-vien/${hs_nv_a}/tep`,
    headers: {
      authorization: `Bearer ${token_admin}`,
      'content-type': `multipart/form-data; boundary=${rg}`,
    },
    payload: than,
  });
  assert.equal(len.statusCode, 201, len.body);

  const r = await goi('GET', `/api/ho-so/tep/${len.json()['id']}/trich`, { token: token_admin });
  assert.equal(r.ma, 200, JSON.stringify(r.body));
  assert.equal(r.body['loai'], 'van_ban');
  assert.deepEqual(r.body['doan'], ['PHỤ LỤC HỢP ĐỒNG']);
});

test('xem nhanh: DOCX KHONG duoc tra inline du da boc duoc noi dung', async () => {
  // Boc chu ra thi an toan; tra nguyen tep inline thi trinh duyet co the doan nham kieu.
  const t = await truy_van_mot<{ id: string }>(
    "select id from ho_so_tep where ten_goc like '%.docx' limit 1");
  const r = await goi('GET', `/api/ho-so/tep/${t?.id}/xem`, { token: token_admin });
  assert.equal(r.ma, 400);
});

test('ban truy xuat tep: co duong dan da luu tren dia va tong dung luong', async () => {
  const r = await goi('GET', '/api/ho-so/tep', { token: token_admin });
  assert.equal(r.ma, 200);
  const ds = r.body['danh_sach'] as Record<string, unknown>[];
  assert.ok(ds.length > 0);
  assert.match(String(ds[0]?.['ten_luu']), /^\d{4}-\d{2}\/[0-9a-f-]{36}\./,
    'phai tra ve duong dan tuong doi da luu trong CSDL');
  assert.ok(String(ds[0]?.['ma_nv']).length > 0, 'phai biet tep cua ai');
  assert.ok(Number((r.body['tong'] as Record<string, unknown>)['so']) > 0);
  assert.ok(String(r.body['thu_muc_goc']).length > 0, 'phai cho biet thu muc goc tren dia');
});

test('ban truy xuat tep: nhan vien thuong khong duoc xem', async () => {
  const r = await goi('GET', '/api/ho-so/tep', { token: hs_token_a });
  assert.equal(r.ma, 403);
});

// ============================================================ API TICH HOP /api/v1
//
// Cong danh cho he thong ngoai: khoa API + pham vi quyen, khong dung JWT cua webapp.
// Phan quan trong nhat can chung minh la KHOA CHI-DOC KHONG GHI DUOC — do la ly do ton
// tai cua pham vi quyen.
let khoa_doc = '';
let khoa_ghi = '';
let khoa_doc_id = '';

const goi_v1 = async (duong_dan: string, khoa: string | null, tuy: {
  method?: string; body?: unknown;
} = {}) => {
  const r = await app.inject({
    method: (tuy.method ?? 'GET') as 'GET',
    url: duong_dan,
    headers: khoa === null ? {} : { authorization: `Bearer ${khoa}` },
    ...(tuy.body === undefined ? {} : { payload: tuy.body as object }),
  });
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(r.body) as Record<string, unknown>; } catch { /* khong phai JSON */ }
  return { ma: r.statusCode, body, tho: r.body };
};

test('khoa API: admin tao duoc, khoa goc chi hien MOT lan', async () => {
  const r = await goi('POST', '/api/khoa-api', {
    token: token_admin,
    body: { ten: 'ERP kế toán', pham_vi: ['bang_cong:doc', 'nhan_vien:doc'] },
  });
  assert.equal(r.ma, 201);
  khoa_doc = r.body['khoa'] as string;
  khoa_doc_id = r.body['id'] as string;
  assert.ok(khoa_doc.startsWith('ck_'));

  // Doc lai danh sach: KHONG duoc lo khoa goc, chi con tien to.
  const ds = await goi('GET', '/api/khoa-api', { token: token_admin });
  assert.equal(ds.ma, 200);
  assert.doesNotMatch(JSON.stringify(ds.body), new RegExp(khoa_doc.slice(3, 20)),
    'danh sach khoa API khong duoc chua khoa goc');
});

test('khoa API: pham vi bia bi tu choi ngay luc tao', async () => {
  const r = await goi('POST', '/api/khoa-api', {
    token: token_admin, body: { ten: 'Bịa', pham_vi: ['nhan_vien:xoa'] },
  });
  assert.equal(r.ma, 400);
});

test('khoa API: pham vi rong bi tu choi (khoa vo dung)', async () => {
  const r = await goi('POST', '/api/khoa-api', {
    token: token_admin, body: { ten: 'Rỗng', pham_vi: [] },
  });
  assert.equal(r.ma, 400);
});

test('khoa API: nhan vien thuong khong tao duoc', async () => {
  const r = await goi('POST', '/api/khoa-api', {
    token: token_nhan_vien, body: { ten: 'Lén', pham_vi: ['bang_cong:doc'] },
  });
  assert.equal(r.ma, 403);
});

test('/api/v1: khong co khoa -> 401 kem ma loi on dinh', async () => {
  const r = await goi_v1('/api/v1/nhan-vien', null);
  assert.equal(r.ma, 401);
  assert.equal((r.body['loi'] as Record<string, unknown>)['ma'], 'thieu_khoa');
});

test('/api/v1: khoa bia -> 401', async () => {
  const r = await goi_v1('/api/v1/nhan-vien', 'ck_khoa_bia_khong_ton_tai_gi_ca_12345');
  assert.equal(r.ma, 401);
  assert.equal((r.body['loi'] as Record<string, unknown>)['ma'], 'khoa_sai');
});

test('/api/v1: JWT cua webapp KHONG dung duoc lam khoa API', async () => {
  // Hai he xac thuc phai tach han. Lot duoc bang JWT nghia la moi nhan vien deu goi duoc
  // API tich hop voi quyen cua khoa.
  const r = await goi_v1('/api/v1/nhan-vien', token_admin);
  assert.equal(r.ma, 401);
});

test('/api/v1/toi: tra ve ten va pham vi cua chinh khoa do', async () => {
  const r = await goi_v1('/api/v1/toi', khoa_doc);
  assert.equal(r.ma, 200);
  const d = r.body['du_lieu'] as Record<string, unknown>;
  assert.equal(d['ten'], 'ERP kế toán');
  assert.deepEqual(d['pham_vi'], ['bang_cong:doc', 'nhan_vien:doc']);
});

test('/api/v1/nhan-vien: tra ve hinh dang { du_lieu, phan_trang }', async () => {
  const r = await goi_v1('/api/v1/nhan-vien', khoa_doc);
  assert.equal(r.ma, 200);
  assert.ok(Array.isArray(r.body['du_lieu']));
  const pt = r.body['phan_trang'] as Record<string, unknown>;
  assert.equal(typeof pt['tong'], 'number');
  // Dinh danh doi ngoai la ma_nv, khong lo uuid noi bo.
  const d0 = (r.body['du_lieu'] as Record<string, unknown>[])[0];
  if (d0 !== undefined) {
    assert.ok('ma_nv' in d0, 'phai co ma_nv');
    assert.ok(!('id' in d0), 'khong duoc lo uuid noi bo ra ngoai');
  }
});

test('/api/v1: khoa CHI-DOC khong ghi duoc nhan vien -> 403', async () => {
  const r = await goi_v1('/api/v1/nhan-vien/NV-KHONG-CO', khoa_doc, {
    method: 'PUT', body: { ho_ten: 'Ai đó' },
  });
  assert.equal(r.ma, 403);
  assert.equal((r.body['loi'] as Record<string, unknown>)['ma'], 'thieu_pham_vi');
});

test('/api/v1: khoa thieu pham vi bang_cong khong doc duoc bang cong', async () => {
  const r0 = await goi('POST', '/api/khoa-api', {
    token: token_admin, body: { ten: 'Chỉ nhân viên', pham_vi: ['nhan_vien:doc'] },
  });
  const r = await goi_v1('/api/v1/bang-cong?tu=2026-08-01&den=2026-08-31',
    r0.body['khoa'] as string);
  assert.equal(r.ma, 403);
});

test('/api/v1: khoa co pham vi ghi thi tao va sua duoc nhan vien', async () => {
  const r0 = await goi('POST', '/api/khoa-api', {
    token: token_admin, body: { ten: 'HRM đồng bộ', pham_vi: ['nhan_vien:doc', 'nhan_vien:ghi'] },
  });
  khoa_ghi = r0.body['khoa'] as string;

  const tao = await goi_v1('/api/v1/nhan-vien/TICHHOP01', khoa_ghi, {
    method: 'PUT', body: { ho_ten: 'Trần Tích Hợp', pin_may: '7777' },
  });
  assert.equal(tao.ma, 200);
  assert.equal(tao.body['da_tao'], true);

  // Goi LAI cung ma: phai la cap nhat, khong tao them nguoi thu hai.
  const lai = await goi_v1('/api/v1/nhan-vien/TICHHOP01', khoa_ghi, {
    method: 'PUT', body: { chuc_danh: 'Kỹ sư' },
  });
  assert.equal(lai.ma, 200);
  assert.equal(lai.body['da_tao'], false);

  // Truong khong gui phai GIU NGUYEN — gui thieu ma bi xoa mat PIN la mat cham cong.
  const doc = await goi_v1('/api/v1/nhan-vien/TICHHOP01', khoa_ghi);
  const d = doc.body['du_lieu'] as Record<string, unknown>;
  assert.equal(d['pin_may'], '7777', 'PIN phai con nguyen sau lan cap nhat khong gui pin_may');
  assert.equal(d['chuc_danh'], 'Kỹ sư');
});

test('/api/v1: khoa da tat thi khong goi duoc nua', async () => {
  const tat = await goi('PATCH', `/api/khoa-api/${khoa_doc_id}`, {
    token: token_admin, body: { dang_bat: false },
  });
  assert.equal(tat.ma, 200);

  const r = await goi_v1('/api/v1/toi', khoa_doc);
  assert.equal(r.ma, 401);
  assert.equal((r.body['loi'] as Record<string, unknown>)['ma'], 'khoa_da_tat');

  // Bat lai de cac test sau con dung.
  await goi('PATCH', `/api/khoa-api/${khoa_doc_id}`, {
    token: token_admin, body: { dang_bat: true },
  });
});

test('/api/v1: duong dan la tra JSON dung hinh dang, khong phai 404 cua Fastify', async () => {
  const r = await goi_v1('/api/v1/khong-co-that', khoa_doc);
  assert.equal(r.ma, 404);
  assert.equal((r.body['loi'] as Record<string, unknown>)['ma'], 'khong_co_duong_dan');
});

test('/api/v1/su-kien: doc theo con tro tu_id, khong dam nhau giua cac ben', async () => {
  const r0 = await goi('POST', '/api/khoa-api', {
    token: token_admin, body: { ten: 'Nguồn sự kiện', pham_vi: ['su_kien:doc'] },
  });
  const k = r0.body['khoa'] as string;

  const lan_1 = await goi_v1('/api/v1/su-kien?tu_id=0&gioi_han=5', k);
  assert.equal(lan_1.ma, 200);
  const ds = lan_1.body['du_lieu'] as Record<string, unknown>[];
  if (ds.length > 0) {
    const id_cuoi = lan_1.body['id_cuoi'];
    // Hoi tiep tu con tro: khong duoc tra lai chinh nhung su kien vua doc.
    const lan_2 = await goi_v1(`/api/v1/su-kien?tu_id=${String(id_cuoi)}&gioi_han=5`, k);
    const ds2 = lan_2.body['du_lieu'] as Record<string, unknown>[];
    const trung = ds2.filter((x) => ds.some((y) => y['id'] === x['id']));
    assert.equal(trung.length, 0, 'khong duoc tra lai su kien da doc');
  } else {
    assert.equal(lan_1.body['id_cuoi'], null, 'het du lieu thi id_cuoi phai la null');
  }
});

test('nhat ky API: lan goi cua khoa duoc ghi lai de con doi chieu', async () => {
  await goi_v1('/api/v1/toi', khoa_doc);
  // onResponse chay sau khi tra loi — cho mot nhip cho ghi xong.
  await new Promise((ok) => setTimeout(ok, 150));
  const r = await goi('GET', `/api/khoa-api/${khoa_doc_id}/nhat-ky`, { token: token_admin });
  assert.equal(r.ma, 200);
  const ds = r.body as unknown as Record<string, unknown>[];
  assert.ok(Array.isArray(ds) && ds.length > 0, 'phai co it nhat mot dong nhat ky');
});

// ============================================================ thong bao day (push)
//
// Truoc ban nay, app dang ky token day du roi may chu luu vao token_push — nhung KHONG co
// gi doc bang do. Nhan vien nop don thi quan ly khong hay, don duoc duyet thi nhan vien
// khong hay. Cac bai duoi kiem dung mat xich cuoi do.

test('push: dang ky token cho ca nhan vien va admin', async () => {
  const a = await goi('POST', '/api/toi/token-push', {
    token: token_nhan_vien,
    body: { token: 'ExponentPushToken[nv001]', nen_tang: 'android' },
  });
  assert.equal(a.ma, 200);

  const b = await goi('POST', '/api/toi/token-push', {
    token: token_admin,
    body: { token: 'ExponentPushToken[admin]', nen_tang: 'ios' },
  });
  assert.equal(b.ma, 200);
});

test('push: nhan vien nop don nghi phep -> NGUOI DUYET nhan thong bao', async () => {
  expo_nhan = [];
  const tu = cong_ngay(ngay_dia_phuong(new Date()), 30);
  const r = await goi('POST', '/api/toi/nghi-phep', {
    token: token_nhan_vien,
    body: { loai: 'phep_nam', tu_ngay: tu, den_ngay: tu, ly_do: 'Viec rieng' },
  });
  assert.equal(r.ma, 201);

  await cho_push(1);
  // Admin la nguoi duyet -> nhan; nguoi nop KHONG duoc tu nhan thong bao cua chinh minh.
  const den_admin = expo_nhan.filter((g) => g.to === 'ExponentPushToken[admin]');
  const den_nv = expo_nhan.filter((g) => g.to === 'ExponentPushToken[nv001]');
  assert.equal(den_admin.length, 1, 'nguoi duyet phai nhan dung mot thong bao');
  assert.equal(den_nv.length, 0, 'nguoi nop don khong duoc nhan thong bao ve don cua minh');
  assert.match(den_admin[0]!.title, /chờ duyệt/);
  // Noi dung phai du de quyet dinh ma khong can mo app: ai, loai gi, ngay nao.
  assert.match(den_admin[0]!.body, /nghỉ phép năm/);
  assert.match(den_admin[0]!.body, /^\S/);
  assert.equal(den_admin[0]!.data?.['man'], 'duyet-don');
});

test('push: duyet don -> NGUOI NOP nhan thong bao, kem ghi chu cua nguoi duyet', async () => {
  const ds = await goi('GET', '/api/duyet/nghi-phep?trang_thai=cho_duyet', { token: token_admin });
  const don = (ds.body as unknown as Record<string, unknown>[])[0]!;

  expo_nhan = [];
  const r = await goi('POST', `/api/duyet/nghi-phep/${String(don['id'])}/quyet`, {
    token: token_admin,
    body: { quyet_dinh: 'da_duyet', ghi_chu: 'Đồng ý' },
  });
  assert.equal(r.ma, 200);

  await cho_push(1);
  const den_nv = expo_nhan.filter((g) => g.to === 'ExponentPushToken[nv001]');
  assert.equal(den_nv.length, 1);
  assert.match(den_nv[0]!.title, /được duyệt/);
  assert.match(den_nv[0]!.body, /Đồng ý/, 'ghi chu cua nguoi duyet phai den tay nhan vien');
  // Ngay phai o dang nguoi Viet doc duoc, khong phai 2026-09-14.
  assert.match(den_nv[0]!.body, /\d{2}\/\d{2}\/\d{4}/);
});

test('push: Expo bao token da chet -> token bi xoa khoi CSDL', async () => {
  expo_tra_loi = 'chet';
  expo_nhan = [];

  const ngay = cong_ngay(ngay_dia_phuong(new Date()), -3);
  const r = await goi('POST', '/api/toi/giai-trinh', {
    token: token_nhan_vien,
    body: { ngay, gio_vao_de_xuat: '08:00', ly_do: 'Quen quet the hom do' },
  });
  assert.equal(r.ma, 201);

  await cho_push(1);
  // Cho vong xoa token chay xong (chay sau khi da nhan phan hoi cua Expo).
  for (let i = 0; i < 50; i++) {
    const con = await truy_van_mot<{ so: number }>(
      `select count(*)::int as so from token_push where token = 'ExponentPushToken[admin]'`,
    );
    if (con!.so === 0) break;
    await new Promise((ok) => setTimeout(ok, 20));
  }
  const con = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from token_push where token = 'ExponentPushToken[admin]'`,
  );
  assert.equal(con!.so, 0, 'token DeviceNotRegistered phai bi xoa, neu khong bang se phinh mai');
  expo_tra_loi = 'ok';
});

test('push: tat bang THONG_BAO_DAY thi khong goi Expo nua', async () => {
  const { cau_hinh } = await import('../src/cau_hinh.ts');
  const cu = cau_hinh.thong_bao_day_bat;
  (cau_hinh as { thong_bao_day_bat: boolean }).thong_bao_day_bat = false;
  expo_nhan = [];

  const tu = cong_ngay(ngay_dia_phuong(new Date()), 60);
  const r = await goi('POST', '/api/toi/nghi-phep', {
    token: token_nhan_vien,
    body: { loai: 'khong_luong', tu_ngay: tu, den_ngay: tu, ly_do: 'Viec gia dinh' },
  });
  assert.equal(r.ma, 201, 'tat thong bao KHONG duoc lam hong viec nop don');

  await new Promise((ok) => setTimeout(ok, 200));
  assert.equal(expo_nhan.length, 0);
  (cau_hinh as { thong_bao_day_bat: boolean }).thong_bao_day_bat = cu;
});

test('push: Expo chet thi don van nop duoc — thong bao khong duoc chan luong chinh', async () => {
  const url_cu = process.env['EXPO_PUSH_URL'];
  const { cau_hinh } = await import('../src/cau_hinh.ts');
  // Cong khong ai nghe -> fetch that bai ngay.
  (cau_hinh as { expo_push_url: string }).expo_push_url = 'http://127.0.0.1:39218/khong-co';

  const tu = cong_ngay(ngay_dia_phuong(new Date()), 90);
  const r = await goi('POST', '/api/toi/nghi-phep', {
    token: token_nhan_vien,
    body: { loai: 'om', tu_ngay: tu, den_ngay: tu, ly_do: 'Om sot' },
  });
  assert.equal(r.ma, 201, 'Expo chet van phai nop don thanh cong');

  const con = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from don_nghi_phep where tu_ngay = $1`, [tu],
  );
  assert.equal(con!.so, 1, 'don phai duoc luu du thong bao that bai');
  (cau_hinh as { expo_push_url: string }).expo_push_url = url_cu ?? '';
});

// ============================================================ xuat CSV cho ke toan
//
// Man Bang cong hien BANG TONG HOP (moi nhan vien mot dong) nhung truoc ban nay nut Xuat
// lai tai ve chi tiet tung ngay — thay mot dang, tai ve mot neo.

test('xuat CSV tong hop: moi nhan vien MOT dong, co BOM de Excel doc dung tieng Viet', async () => {
  const thang = NGAY.slice(0, 7);
  const r = await goi('GET', `/api/bang-cong/xuat-csv?thang=${thang}&kieu=thang`,
    { token: token_admin });
  assert.equal(r.ma, 200);

  const csv = r.tho;
  assert.equal(csv.charCodeAt(0), 0xFEFF, 'thieu BOM thi Excel tren Windows hien chu loan');

  const dong = csv.replace(/^﻿/, '').trim().split('\r\n');
  assert.match(dong[0]!, /^Mã NV,Họ tên,Phòng ban/);
  assert.match(dong[0]!, /Số công/);

  const cua_nv = dong.filter((d) => d.startsWith('NV001,'));
  assert.equal(cua_nv.length, 1, 'tong hop thang phai gom ca thang vao MOT dong moi nguoi');
});

test('xuat CSV chi tiet: moi NGAY mot dong', async () => {
  const thang = NGAY.slice(0, 7);
  const r = await goi('GET', `/api/bang-cong/xuat-csv?thang=${thang}&kieu=ngay`,
    { token: token_admin });
  assert.equal(r.ma, 200);
  const dong = r.tho.replace(/^﻿/, '').trim().split('\r\n');
  assert.match(dong[0]!, /Ngày,Trạng thái/);
  assert.ok(dong.some((d) => d.includes(NGAY)), 'phai co dong cua ngay da cham cong');
});

test('xuat CSV: thieu kieu thi van ra chi tiet nhu truoc — khong pha link cu', async () => {
  const thang = NGAY.slice(0, 7);
  const r = await goi('GET', `/api/bang-cong/xuat-csv?thang=${thang}`, { token: token_admin });
  assert.equal(r.ma, 200);
  assert.match(r.tho.replace(/^﻿/, '').split('\r\n')[0]!, /Ngày,Trạng thái/);
});

test('xuat CSV: kieu la thi bao loi ro rang chu khong im lang tra chi tiet', async () => {
  const thang = NGAY.slice(0, 7);
  const r = await goi('GET', `/api/bang-cong/xuat-csv?thang=${thang}&kieu=quy`,
    { token: token_admin });
  assert.equal(r.ma, 400);
});

test('xuat CSV: nhan vien thuong KHONG duoc xuat ca cong ty', async () => {
  const thang = NGAY.slice(0, 7);
  const r = await goi('GET', `/api/bang-cong/xuat-csv?thang=${thang}&kieu=thang`,
    { token: token_nhan_vien });
  assert.equal(r.ma, 403);
});
