// Kiem thu e2e Onboarding nhan su moi (DTKT 02/2026): HR tao de nghi -> Admin duyet mot
// buoc -> he thong khoi tao (nhan_vien + PIN + outbox cong/ERP1/MS365 + tai khoan he thong
// + lenh day user xuong may cua + cong viec nhap viec kem checklist).
//
// CAN CSDL THAT (ten bat dau chamcong_test) — xoa sach cac bang lien quan truoc khi chay.
// Chay cung test_e2e (test-concurrency=1).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';

// Bien moi truong phai dat TRUOC khi import src (cau_hinh doc mot lan luc nap).
process.env['JWT_SECRET'] = 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['NODE_ENV'] = 'test';
process.env['DEVICE_TZ_OFFSET_HOURS'] = '7';
process.env['CORS_ORIGIN'] = 'http://localhost:5173';
process.env['ICLOCK_IP_CHO_PHEP'] = '127.0.0.1';
process.env['MS365_TAO_TAI_KHOAN_BAT'] = '1';
process.env['MS365_SKU_BASIC'] = 'sku-basic-kiem';
process.env['MS365_SKU_STANDARD'] = 'sku-standard-kiem';
process.env['NHAP_VIEC_NHAN_SU_ID'] = 'HR001';
process.env['DATABASE_URL'] ??=
  'postgres://chamcong:chamcong_dev@localhost:5432/chamcong_test';

const { dung_ung_dung } = await import('../src/ung_dung.ts');
const { chay_di_tru } = await import('../src/csdl/di_tru.ts');
const { thuc_thi, truy_van, truy_van_mot } = await import('../src/csdl/ket_noi.ts');
const { bam_mat_khau } = await import('../src/bao_mat/mat_khau.ts');

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
let token_hr = '';
let hr_nv_id = '';

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

/** Tao de nghi va tra id. */
async function tao_de_nghi(than: Record<string, unknown>): Promise<string> {
  const r = await goi('POST', '/api/de-nghi-nhan-su', {
    token: token_hr, body: than,
  });
  assert.equal(r.ma, 201, JSON.stringify(r.body));
  return r.body['id'] as string;
}

/** Doc cac su kien outbox cua mot ma_nv. */
async function su_kien_cua(ma_nv: string): Promise<{ loai: string; du: Record<string, unknown> }[]> {
  const ds = await truy_van<{ loai_su_kien: string; du_lieu: Record<string, unknown> }>(
    `select loai_su_kien, du_lieu from hop_thu_di where du_lieu ->> 'ma_nv' = $1`, [ma_nv]);
  return ds.map((d) => ({ loai: d.loai_su_kien, du: d.du_lieu }));
}

before(async () => {
  app = await dung_ung_dung();
  await chay_di_tru(() => {});

  await thuc_thi(`truncate table
    de_nghi_them_nhan_su, cong_viec_hanh_dong, cong_viec, cong_viec_workflow,
    lenh_thiet_bi, hop_thu_di, ma_dinh_danh, may_nguoi_dung,
    nguoi_dung, nhan_vien, phong_ban, thiet_bi, nhat_ky_thao_tac
    restart identity cascade`);

  // Admin + nhan su (HR) co tai khoan dang nhap.
  await thuc_thi(
    `insert into nguoi_dung(ten_dang_nhap, mat_khau_hash, vai_tro, phai_doi_mat_khau)
     values ('admin', $1, 'admin', false)`,
    [await bam_mat_khau('ChamCong2026')],
  );
  const phong = await truy_van_mot<{ id: string }>(
    `insert into phong_ban(ten) values ('Phòng Nhân sự') returning id`,
  );
  const hr = await truy_van_mot<{ id: string }>(
    `insert into nhan_vien(ma_nv, ho_ten, phong_ban_id, dang_hoat_dong)
     values ('HR001', 'Nhân Sự Phụ Trách', $1, true) returning id`,
    [phong?.id ?? null],
  );
  if (hr === null) throw new Error('khong tao duoc HR');
  hr_nv_id = hr.id;
  await thuc_thi(
    `insert into nguoi_dung(ten_dang_nhap, mat_khau_hash, vai_tro, nhan_vien_id, phai_doi_mat_khau)
     values ('hr001', $1, 'nhan_su', $2, false)`,
    [await bam_mat_khau('MatKhau123'), hr_nv_id],
  );
  // Hai may cua de cap PIN theo dai.
  await thuc_thi(
    `insert into thiet_bi(serial, ten, pin_tu, pin_den, dang_bat)
     values ('CUATEST01', 'Cua chinh', 3001, 3010, true),
            ('CUATEST02', 'Cua kho', 4001, 4002, true)`,
  );

  const dn_admin = await goi('POST', '/api/xac-thuc/dang-nhap', {
    body: { ten_dang_nhap: 'admin', mat_khau: 'ChamCong2026' },
  });
  assert.equal(dn_admin.ma, 200);
  token_admin = dn_admin.body['token_truy_cap'] as string;
  const dn_hr = await goi('POST', '/api/xac-thuc/dang-nhap', {
    body: { ten_dang_nhap: 'hr001', mat_khau: 'MatKhau123' },
  });
  assert.equal(dn_hr.ma, 200);
  token_hr = dn_hr.body['token_truy_cap'] as string;
});

// ================================================================ REQ-TEST-01/05/06
test('duyet de nghi: tao nhan_vien + 3 su kien + PIN + lenh may cua + viec nhap viec', async () => {
  const dn = await tao_de_nghi({
    ho_ten: 'Nguyễn Văn Mới', ma_nv: null, chuc_danh: 'Nhân viên Kinh doanh',
    email: 'nguyen.moi@tranhoangvietnam.com', ngay_vao: '2026-10-01',
    loai_hop_dong: 'HĐLĐ 12 tháng',
    tu_cap_pin: true, serial_may_cua: 'CUATEST01',
    cap_ms365: true, tao_tk_he_thong: true,
  });

  const r = await goi('POST', `/api/de-nghi-nhan-su/${dn}/duyet`, {
    token: token_admin, body: { ma_nv: 'DNV-001' },
  });
  assert.equal(r.ma, 200, JSON.stringify(r.body));
  const nv_id = r.body['nhan_vien_id'] as string;
  const pin = r.body['pin_may'] as string;
  assert.match(pin, /^30\d\d$/);
  const tk = r.body['tai_khoan_ms365'] as Record<string, unknown>;
  assert.equal(tk?.['upn'], 'nguyen.moi@tranhoangvietnam.com');
  assert.equal(tk?.['sku_id'], 'sku-basic-kiem');
  assert.equal(typeof tk?.['mat_khau'], 'string');

  // Ba su kien outbox (cong / ERP1 / MS365) cung transaction.
  const sk = await su_kien_cua('DNV-001');
  const loai = new Set(sk.map((s) => s.loai));
  assert.ok(loai.has('nhan_su.da_tao'), 'cong phai nhan su kien');
  assert.ok(loai.has('erp1.nhan_su.da_tao'), 'ERP1 phai nhan su kien');
  assert.ok(loai.has('ms365.tao_tai_khoan'), 'Graph phai nhan su kien');
  const erp1 = sk.find((s) => s.loai === 'erp1.nhan_su.da_tao');
  assert.equal(erp1?.du['chuc_danh'], 'Nhân viên Kinh doanh');
  assert.equal(erp1?.du['pin_may'], pin);
  const ms = sk.find((s) => s.loai === 'ms365.tao_tai_khoan');
  assert.equal(ms?.du['sku_id'], 'sku-basic-kiem');

  // Tai khoan he thong tu tao, vai tro theo vi tri mac dinh nhan_vien.
  const nd = await truy_van_mot<{ vai_tro: string }>(
    'select vai_tro from nguoi_dung where nhan_vien_id = $1', [nv_id]);
  assert.equal(nd?.vai_tro, 'nhan_vien');

  // Lenh day user+PIN xuong may cua — nam cho (may offline).
  const lenh = await truy_van_mot<{ id: number; lenh: string; gui_luc: string | null }>(
    `select id, lenh, gui_luc from lenh_thiet_bi
      where khoa_chong_trung = $1`, [`nhap_viec_pin:${nv_id}`]);
  assert.ok(lenh !== null, 'phai co lenh day user xuong may cua');
  assert.match(lenh.lenh, /^DATA UPDATE USERINFO/);
  assert.ok(lenh.lenh.includes(`PIN=${pin}`));
  assert.equal(lenh.gui_luc, null, 'may offline thi lenh nam cho, chua gui');

  // Cong viec nhap viec + 15 muc checklist, muc 1-2 tick san, muc 3 chua.
  const viec = await truy_van_mot<{ id: string; nhan_vien_id: string }>(
    `select id, nhan_vien_id from cong_viec where khoa_chong_trung = $1`,
    [`nhap_viec:${nv_id}`]);
  assert.ok(viec !== null, 'phai sinh cong viec nhap viec');
  assert.equal(viec.nhan_vien_id, hr_nv_id, 'viec giao cho nguoi phu trach nhan su');
  const muc = await truy_van<{ ten: string; xong: boolean }>(
    'select ten, xong from cong_viec_hanh_dong where cong_viec_id = $1 order by thu_tu',
    [viec.id]);
  assert.equal(muc.length, 15, 'checklist phai du 15 muc');
  assert.equal(muc[0]?.xong, true, 'muc MS365 tick san khi cap_ms365');
  assert.equal(muc[1]?.xong, true, 'muc ERP1 luon tick san');
  assert.equal(muc[2]?.xong, false, 'muc PIN may cua chi tick khi may xac nhan');
  assert.ok((muc[5]?.ten ?? '').includes('12 tháng'), 'checklist ky HĐ dung loai');

  // De nghi chuyen da_khoi_tao.
  const dn_sau = await truy_van_mot<{ trang_thai: string; nhan_vien_id: string | null }>(
    'select trang_thai, nhan_vien_id from de_nghi_them_nhan_su where id = $1', [dn]);
  assert.equal(dn_sau?.trang_thai, 'da_khoi_tao');
  assert.equal(dn_sau?.nhan_vien_id, nv_id);

  // REQ-TEST-06: duyet lan hai khong tao them gi.
  const r2 = await goi('POST', `/api/de-nghi-nhan-su/${dn}/duyet`, {
    token: token_admin, body: { ma_nv: 'DNV-001' },
  });
  assert.equal(r2.ma, 409);
  const dem_nv = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from nhan_vien where ma_nv = 'DNV-001'`);
  assert.equal(dem_nv?.so, 1);
  const dem_lenh = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from lenh_thiet_bi where khoa_chong_trung = $1`,
    [`nhap_viec_pin:${nv_id}`]);
  assert.equal(dem_lenh?.so, 1, 'lenh khong day trung (khoa chong trung)');

  // May cua xac nhan lenh thanh cong -> tick muc 3 (REQ-TEST-01).
  // Route /iclock tra text/plain "OK" nen goi inject truc tiep, khong JSON.parse.
  const bao = await app.inject({
    method: 'POST',
    url: '/iclock/devicecmd?SN=CUATEST01',
    payload: `ID=${lenh.id}&Return=0&CMD=DATA UPDATE USERINFO`,
  });
  assert.equal(bao.statusCode, 200);
  const muc3 = await truy_van_mot<{ xong: boolean }>(
    `select xong from cong_viec_hanh_dong
      where cong_viec_id = $1 and ten = 'Cấp số PIN + đẩy xuống máy cửa'`, [viec.id]);
  assert.equal(muc3?.xong, true, 'may xac nhan thi tick muc PIN may cua');
});

// ================================================================ REQ-TEST-02
test('chuc danh truong phong nhan SKU Standard, nhan vien nhan Basic', async () => {
  const dn = await tao_de_nghi({
    ho_ten: 'Trần Thị Trưởng', chuc_danh: 'Trưởng phòng Sản xuất',
    email: 'truong.sx@tranhoangvietnam.com', tu_cap_pin: true, serial_may_cua: 'CUATEST01',
    cap_ms365: true, tao_tk_he_thong: false,
  });
  const r = await goi('POST', `/api/de-nghi-nhan-su/${dn}/duyet`, {
    token: token_admin, body: { ma_nv: 'DNV-002' },
  });
  assert.equal(r.ma, 200, JSON.stringify(r.body));
  const tk = r.body['tai_khoan_ms365'] as Record<string, unknown>;
  assert.equal(tk?.['sku_id'], 'sku-standard-kiem', 'truong phong nhan Standard');
  // Tao viec van giao cho HR (workflow chua cau hinh thi dung env NHAP_VIEC_NHAN_SU_ID).
  const viec = await truy_van_mot<{ nhan_vien_id: string }>(
    `select nhan_vien_id from cong_viec where khoa_chong_trung = $1`,
    [`nhap_viec:${r.body['nhan_vien_id'] as string}`]);
  assert.equal(viec?.nhan_vien_id, hr_nv_id);
});

// ================================================================ REQ-TEST-04
test('cap_ms365 = false: khong ban su kien MS365, cac nhanh khac van chay', async () => {
  const dn = await tao_de_nghi({
    ho_ten: 'Không Cấp Microsoft', chuc_danh: 'Nhân viên',
    email: null, tu_cap_pin: true, serial_may_cua: 'CUATEST01',
    cap_ms365: false, tao_tk_he_thong: true,
  });
  const r = await goi('POST', `/api/de-nghi-nhan-su/${dn}/duyet`, {
    token: token_admin, body: { ma_nv: 'DNV-003' },
  });
  assert.equal(r.ma, 200, JSON.stringify(r.body));
  assert.equal(r.body['tai_khoan_ms365'], undefined);
  const sk = await su_kien_cua('DNV-003');
  assert.ok(sk.some((s) => s.loai === 'nhan_su.da_tao'));
  assert.ok(sk.some((s) => s.loai === 'erp1.nhan_su.da_tao'));
  assert.ok(!sk.some((s) => s.loai === 'ms365.tao_tai_khoan'), 'khong duoc ban MS365');
  const viec = await truy_van_mot<{ id: string }>(
    `select id from cong_viec where khoa_chong_trung = $1`,
    [`nhap_viec:${r.body['nhan_vien_id'] as string}`]);
  assert.ok(viec !== null);
  const muc1 = await truy_van_mot<{ xong: boolean }>(
    `select xong from cong_viec_hanh_dong
      where cong_viec_id = $1 and thu_tu = 0`, [viec.id]);
  assert.equal(muc1?.xong, false, 'khong cap MS365 thi muc 1 khong tick san');
});

// ================================================================ REQ-TEST-03
test('dai PIN gan het: he thong chon so con trong, khong loi', async () => {
  // May CUATEST02 chi con 2 PIN (4001, 4002). Nguoi dau lay 4001, nguoi sau phai lay 4002.
  const r1 = await goi('POST', '/api/nhan-vien', {
    token: token_admin,
    body: {
      ma_nv: 'DNV-004A', ho_ten: 'Nguoi Chiem PIN',
      tu_cap_pin: true, thiet_bi_serial: 'CUATEST02', tao_tk_ms365: false,
    },
  });
  assert.equal(r1.ma, 201, JSON.stringify(r1.body));
  const dn = await tao_de_nghi({
    ho_ten: 'Nguoi Lay So Ke Tiep', tu_cap_pin: true, serial_may_cua: 'CUATEST02',
    cap_ms365: false, tao_tk_he_thong: false,
  });
  const r2 = await goi('POST', `/api/de-nghi-nhan-su/${dn}/duyet`, {
    token: token_admin, body: { ma_nv: 'DNV-004' },
  });
  assert.equal(r2.ma, 200, JSON.stringify(r2.body));
  assert.equal(r2.body['pin_may'], '4002', 'phai lay so con trong con lai');
});

// ================================================================ REQ-G-03 + REQ-G-01
test('email thieu khi cap MS365: chan duyet voi loi ro rang', async () => {
  const dn = await tao_de_nghi({
    ho_ten: 'Thiếu Email', email: null, cap_ms365: true, tu_cap_pin: true,
    serial_may_cua: 'CUATEST01', tao_tk_he_thong: false,
  });
  const r = await goi('POST', `/api/de-nghi-nhan-su/${dn}/duyet`, {
    token: token_admin, body: { ma_nv: 'DNV-005' },
  });
  assert.equal(r.ma, 400);
  assert.match(String(r.body['loi']), /email/i);
});

// ================================================================ tu choi + phan quyen
test('tu choi de nghi + chi Admin duoc duyet', async () => {
  const dn = await tao_de_nghi({
    ho_ten: 'Sẽ Bị Từ Chối', cap_ms365: false, tu_cap_pin: true,
    serial_may_cua: 'CUATEST01', tao_tk_he_thong: false,
  });
  // HR khong duoc duyet (403).
  const hr_duyet = await goi('POST', `/api/de-nghi-nhan-su/${dn}/duyet`, {
    token: token_hr, body: { ma_nv: 'DNV-006' },
  });
  assert.equal(hr_duyet.ma, 403);

  // Admin tu choi kem ly do.
  const tc = await goi('POST', `/api/de-nghi-nhan-su/${dn}/tu-choi`, {
    token: token_admin, body: { ly_do: 'Thiếu thông tin hồ sơ' },
  });
  assert.equal(tc.ma, 200, JSON.stringify(tc.body));
  const sau = await truy_van_mot<{ trang_thai: string; ly_do_tu_choi: string | null }>(
    'select trang_thai, ly_do_tu_choi from de_nghi_them_nhan_su where id = $1', [dn]);
  assert.equal(sau?.trang_thai, 'da_tu_choi');
  assert.equal(sau?.ly_do_tu_choi, 'Thiếu thông tin hồ sơ');

  // Da tu choi thi khong duyet duoc nua.
  const lai = await goi('POST', `/api/de-nghi-nhan-su/${dn}/duyet`, {
    token: token_admin, body: { ma_nv: 'DNV-006' },
  });
  assert.equal(lai.ma, 409);

  // PATCH chi duoc khi cho duyet.
  const sua = await goi('PATCH', `/api/de-nghi-nhan-su/${dn}`, {
    token: token_hr, body: { chuc_danh: 'Đổi chức danh' },
  });
  assert.equal(sua.ma, 409);
});

// ================================================================ REQ-CL-03
test('workflow nhap_viec_nhan_su uu tien hon env NHAP_VIEC_NHAN_SU_ID', async () => {
  // Nguoi phu trach khac (HR2) duoc chon qua workflow.
  const phong2 = await truy_van_mot<{ id: string }>(
    `insert into phong_ban(ten) values ('Phòng Nhân sự 2') returning id`,
  );
  const hr2 = await truy_van_mot<{ id: string }>(
    `insert into nhan_vien(ma_nv, ho_ten, phong_ban_id, dang_hoat_dong)
     values ('HR002', 'Nhân Sự Phụ Trách 2', $1, true) returning id`,
    [phong2?.id ?? null],
  );
  assert.ok(hr2 !== null);
  await thuc_thi(
    `insert into cong_viec_workflow(ma, dang_bat, nguoi_nhan_kieu, nhan_vien_id, han_sau_gio, uu_tien)
     values ('nhap_viec_nhan_su', true, 'co_dinh', $1, 0, 'cao')`,
    [hr2.id],
  );
  const dn = await tao_de_nghi({
    ho_ten: 'Người Của Workflow', cap_ms365: false, tu_cap_pin: true,
    serial_may_cua: 'CUATEST01', tao_tk_he_thong: false,
  });
  const r = await goi('POST', `/api/de-nghi-nhan-su/${dn}/duyet`, {
    token: token_admin, body: { ma_nv: 'DNV-007' },
  });
  assert.equal(r.ma, 200, JSON.stringify(r.body));
  const viec = await truy_van_mot<{ nhan_vien_id: string }>(
    `select nhan_vien_id from cong_viec where khoa_chong_trung = $1`,
    [`nhap_viec:${r.body['nhan_vien_id'] as string}`]);
  assert.equal(viec?.nhan_vien_id, hr2.id, 'workflow chon nguoi nhan uu tien hon env');
});
