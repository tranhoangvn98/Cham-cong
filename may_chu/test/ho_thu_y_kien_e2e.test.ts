// e2e HO THU Y KIEN + LAY Y KIEN DU THAO + CONG BO PHAT HANH.
//
// - Lay y kien du thao: van ban cho_duyet -> dang_lay_y_kien -> nhan vien TRONG pham vi gop
//   y (ngoai pham vi 404) -> nhan su tra loi -> nhan vien tra loi -> dong -> ket thuc lay y
//   kien -> ban hanh binh thuong.
// - Ho thu y kien: gop y chung + phan quyen (moi nguoi chi thay cua minh; nhan su thay het).
// - Cong bo phat hanh: soan (AI tat -> fallback deterministic) -> sua -> cong bo -> thong bao
//   popup=true xuat hien o /api/toi/thong-bao/popup.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';

process.env['JWT_SECRET'] ??= 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['NODE_ENV'] = 'test';
process.env['DEVICE_TZ_OFFSET_HOURS'] = '7';
process.env['CO_QUAN_BAN_HANH'] ??= 'CÔNG TY TNHH TRẦN HOÀNG VIỆT NAM';
process.env['DIA_DANH_VAN_BAN'] ??= 'Lạng Sơn';
process.env['EXPO_PUSH_URL'] = 'http://127.0.0.1:1/push';
process.env['DATABASE_URL'] ??=
  'postgres://chamcong:chamcong_dev@localhost:5432/chamcong_test';

const { dung_ung_dung } = await import('../src/ung_dung.ts');
const { chay_di_tru } = await import('../src/csdl/di_tru.ts');
const { thuc_thi, truy_van_mot, dong_pool } = await import('../src/csdl/ket_noi.ts');
const { tao_token_truy_cap } = await import('../src/bao_mat/jwt.ts');
const { bat_soan_van_ban, dung_soan_van_ban } = await import('../src/su_kien/soan_van_ban_day.ts');

const PHONG = '9f0e9a12-1000-4000-8000-0000000000a1';
const NV_ADMIN = '9f0e9a12-1000-4000-8000-0000000000b1';
const NV_A = '9f0e9a12-1000-4000-8000-0000000000b2';
const NV_B = '9f0e9a12-1000-4000-8000-0000000000b3';
const ND_ADMIN = '9f0e9a12-1000-4000-8000-0000000000c1';
const ND_A = '9f0e9a12-1000-4000-8000-0000000000c2';
const ND_B = '9f0e9a12-1000-4000-8000-0000000000c3';

let app: FastifyInstance;
let token_admin = '';
let token_a = '';
let token_b = '';

async function goi(
  method: 'GET' | 'POST' | 'PATCH',
  url: string,
  tuy_chon: { token?: string; body?: unknown } = {},
): Promise<{ ma: number; body: Record<string, unknown>; tho: string }> {
  const res = await app.inject({
    method,
    url,
    headers: tuy_chon.token === undefined ? {} : { authorization: `Bearer ${tuy_chon.token}` },
    ...(tuy_chon.body === undefined ? {} : { payload: tuy_chon.body as object }),
  });
  let json: unknown = null;
  try { json = res.json(); } catch { json = res.body; }
  return { ma: res.statusCode, body: json as Record<string, unknown>, tho: res.body };
}

async function cho_trang_thai(id: string, mong: string, han_ms = 30_000): Promise<void> {
  const het = Date.now() + han_ms;
  for (;;) {
    const d = await truy_van_mot<{ trang_thai: string }>(
      'select trang_thai from thong_bao_nhap_ai where id = $1', [id],
    );
    if (d?.trang_thai === mong) return;
    if (Date.now() > het) {
      throw new Error(`cho trang thai ${mong} het gio, hien tai: ${String(d?.trang_thai)}`);
    }
    await new Promise((xong) => setTimeout(xong, 200));
  }
}

/** Tao ban nhap tu_soan phong_ban va doi den cho_duyet. */
async function nhap_cho_duyet(trich_yeu: string): Promise<string> {
  const r = await goi('POST', '/api/thong-bao/ai/nhap', {
    token: token_admin,
    body: {
      loai: 'thong_bao', pham_vi: 'phong_ban', quan_he: 'noi_bo', muc_dich: 'pho_bien',
      che_do: 'tu_soan', phong_ban_id: PHONG,
      trich_yeu, kinh_gui: [], noi_dung: ['Nội dung dự thảo để lấy ý kiến.'],
    },
  });
  assert.equal(r.ma, 201, `nhap that bai: ${r.tho}`);
  const id = r.body['id'] as string;
  await cho_trang_thai(id, 'cho_duyet');
  return id;
}

before(async () => {
  app = await dung_ung_dung();
  await chay_di_tru(() => {});

  // Don bang cua rieng module nay.
  await thuc_thi(`truncate table thong_bao_da_doc, thong_bao_nhap_ai, thong_bao,
                  thong_bao_rieng, ho_thu_y_kien, cong_bo_phat_hanh, bo_dem_so_vb
                  restart identity cascade`);

  await thuc_thi(
    `insert into phong_ban(id, ten) values ($1, 'Phòng Kinh doanh')
     on conflict (id) do nothing`, [PHONG],
  );
  for (const [id, ma_nv, ho_ten, chuc_danh, phong] of [
    [NV_ADMIN, 'HT-ADMIN', 'Trần Đức Hoàng', 'GIÁM ĐỐC', null],
    [NV_A, 'HT-NVA', 'Nguyễn Văn A', 'Nhân viên', PHONG],
    [NV_B, 'HT-NVB', 'Nguyễn Văn B', 'Nhân viên', null],
  ] as const) {
    await thuc_thi(
      `insert into nhan_vien(id, ma_nv, ho_ten, chuc_danh, phong_ban_id, dang_hoat_dong)
       values ($1,$2,$3,$4,$5,true)
       on conflict (id) do update set ho_ten = excluded.ho_ten`,
      [id, ma_nv, ho_ten, chuc_danh, phong],
    );
  }
  for (const [id, ten_dn, vai_tro, nv] of [
    [ND_ADMIN, 'ht_admin', 'admin', NV_ADMIN],
    [ND_A, 'ht_nva', 'nhan_vien', NV_A],
    [ND_B, 'ht_nvb', 'nhan_vien', NV_B],
  ] as const) {
    await thuc_thi(
      `insert into nguoi_dung(id, ten_dang_nhap, mat_khau_hash, vai_tro, phai_doi_mat_khau,
                              nhan_vien_id, dang_hoat_dong)
       values ($1,$2,'x',$3,false,$4,true)
       on conflict (id) do nothing`,
      [id, ten_dn, vai_tro, nv],
    );
  }

  token_admin = tao_token_truy_cap({
    sub: ND_ADMIN, vai_tro: 'admin', nv: NV_ADMIN, ten: 'ht_admin',
  }).token;
  token_a = tao_token_truy_cap({
    sub: ND_A, vai_tro: 'nhan_vien', nv: NV_A, ten: 'ht_nva',
  }).token;
  token_b = tao_token_truy_cap({
    sub: ND_B, vai_tro: 'nhan_vien', nv: NV_B, ten: 'ht_nvb',
  }).token;

  bat_soan_van_ban(() => {});
});

after(async () => {
  dung_soan_van_ban();
  await dong_pool();
});

test('lay y kien: chi mo duoc tu cho_duyet, chan ban hanh khi dang lay y kien', async () => {
  const id = await nhap_cho_duyet('Về việc nội quy đeo thẻ nhân viên');
  const r = await goi('POST', `/api/thong-bao/ai/${id}/lay-y-kien`, { token: token_admin });
  assert.equal(r.ma, 200, `lay y kien loi: ${r.tho}`);
  assert.equal(r.body['trang_thai'], 'dang_lay_y_kien');

  // Mo lai khi dang lay y kien -> 409.
  const lai = await goi('POST', `/api/thong-bao/ai/${id}/lay-y-kien`, { token: token_admin });
  assert.equal(lai.ma, 409);

  // Dang lay y kien thi khong ban hanh duoc.
  const ban = await goi('POST', `/api/thong-bao/ai/${id}/phat-hanh`, { token: token_admin });
  assert.equal(ban.ma, 409);

  // Ngoai trang thai cho_duyet thi khong mo lay y kien duoc (ban khac o cho_ky).
  const ky_id = await nhap_cho_duyet('Về việc phòng cháy chữa cháy toàn công ty');
  const trinh = await goi('POST', `/api/thong-bao/ai/${ky_id}/trinh-ky`, { token: token_admin });
  assert.equal(trinh.ma, 409, 'phong_ban 1 cap khong trinh ky duoc');
});

test('nhan vien TRONG pham vi gop y duoc; ngoai pham vi nhan 404', async () => {
  const id = await nhap_cho_duyet('Về việc sắp xếp chỗ để xe công ty');
  const mo = await goi('POST', `/api/thong-bao/ai/${id}/lay-y-kien`, { token: token_admin });
  assert.equal(mo.ma, 200);

  // Trong pham vi: xem duoc du thao + gop y thanh cong.
  const xem = await goi('GET', `/api/toi/van-ban-du-thao/${id}`, { token: token_a });
  assert.equal(xem.ma, 200, `xem du thao loi: ${xem.tho}`);
  assert.match(String(xem.body['trich_yeu']), /chỗ để xe/);
  assert.ok(Array.isArray(xem.body['y_kien_cua_toi']));

  const gop = await goi('POST', '/api/toi/y-kien-du-thao', {
    token: token_a, body: { nhap_ai_id: id, noi_dung: 'Nên bổ sung chỗ để xe cho khách.' },
  });
  assert.equal(gop.ma, 201, `gop y loi: ${gop.tho}`);
  assert.match(String(gop.body['ma']), /^HTYK-/);

  // Ngoai pham vi: 404 (khong lo su ton tai).
  const xem_b = await goi('GET', `/api/toi/van-ban-du-thao/${id}`, { token: token_b });
  assert.equal(xem_b.ma, 404);
  const gop_b = await goi('POST', '/api/toi/y-kien-du-thao', {
    token: token_b, body: { nhap_ai_id: id, noi_dung: 'Lạm dụng quyền?' },
  });
  assert.equal(gop_b.ma, 404);

  // Admin thay y kien trong danh sach cua van ban.
  const ds = await goi('GET', `/api/thong-bao/ai/${id}/y-kien`, { token: token_admin });
  assert.equal(ds.ma, 200);
  assert.equal((ds.body as unknown as unknown[]).length, 1);
  const dong = (ds.body as unknown as Record<string, unknown>[])[0];
  assert.ok(dong !== undefined);
  assert.equal(typeof dong['id'], 'string');
});

test('hoi thoai: nhan su tra loi -> nhan vien tra loi -> dong chan tra loi tiep', async () => {
  const id = await nhap_cho_duyet('Về việc giờ giấc ra vào công ty');
  await goi('POST', `/api/thong-bao/ai/${id}/lay-y-kien`, { token: token_admin });
  const gop = await goi('POST', '/api/toi/y-kien-du-thao', {
    token: token_a, body: { nhap_ai_id: id, noi_dung: 'Đề nghị linh hoạt 15 phút.' },
  });
  const ht_id = gop.body['id'] as string;

  // Nhan su tra loi: moi -> dang_xem, nhan vien nhan duoc qua /toi.
  const tl = await goi('POST', `/api/ho-thu-y-kien/${ht_id}/tra-loi`, {
    token: token_admin, body: { noi_dung: 'Cảm ơn bạn. Chúng tôi sẽ xem xét.' },
  });
  assert.equal(tl.ma, 200, `tra loi loi: ${tl.tho}`);
  assert.equal(tl.body['trang_thai'], 'dang_xem');

  const cua_a = await goi('GET', '/api/toi/ho-thu-y-kien', { token: token_a });
  assert.equal(cua_a.ma, 200);
  const cua_toi = (cua_a.body as unknown as Record<string, unknown>[]).find(
    (h) => h['id'] === ht_id);
  assert.ok(cua_toi !== undefined);
  const tra_loi = cua_toi['tra_loi'] as unknown[];
  assert.equal(tra_loi.length, 1);

  // Nhan vien tra loi tiep.
  const tl_a = await goi('POST', `/api/toi/ho-thu-y-kien/${ht_id}/tra-loi`, {
    token: token_a, body: { noi_dung: 'Cảm ơn Phòng Nhân sự.' },
  });
  assert.equal(tl_a.ma, 201);

  // Nguoi khong phai chu ho thu khong tra loi duoc (404).
  const tl_b = await goi('POST', `/api/toi/ho-thu-y-kien/${ht_id}/tra-loi`, {
    token: token_b, body: { noi_dung: 'Lạm dụng?' },
  });
  assert.equal(tl_b.ma, 404);

  // Dong ho thu -> nhan vien khong tra loi duoc nua.
  const dong = await goi('POST', `/api/ho-thu-y-kien/${ht_id}/dong`, { token: token_admin });
  assert.equal(dong.ma, 200);
  const tl_au = await goi('POST', `/api/toi/ho-thu-y-kien/${ht_id}/tra-loi`, {
    token: token_a, body: { noi_dung: 'Cho tra loi them.' },
  });
  assert.equal(tl_au.ma, 409);

  // Ket thuc lay y kien -> cho_duyet -> ban hanh chay binh thuong.
  const kt = await goi('POST', `/api/thong-bao/ai/${id}/ket-thuc-y-kien`, { token: token_admin });
  assert.equal(kt.ma, 200);
  assert.equal(kt.body['trang_thai'], 'cho_duyet');
  const ban = await goi('POST', `/api/thong-bao/ai/${id}/phat-hanh`, { token: token_admin });
  assert.equal(ban.ma, 200, `ban hanh sau lay y kien loi: ${ban.tho}`);
});

test('gop y chung: nhan vien gui, chi chu so huu thay trong /toi, nhan su thay het', async () => {
  const gop = await goi('POST', '/api/toi/ho-thu-y-kien', {
    token: token_a,
    body: { loai: 'phan_anh', tieu_de: 'Máy lạnh phòng KD hỏng', noi_dung: 'Đã 3 ngày chưa sửa.' },
  });
  assert.equal(gop.ma, 201, `gui gop y loi: ${gop.tho}`);
  assert.equal(gop.body['trang_thai'], 'moi');
  const ht_id = gop.body['id'] as string;

  // Loai khong hop le bi chan.
  const sai = await goi('POST', '/api/toi/ho-thu-y-kien', {
    token: token_a,
    body: { loai: 'du_thao', tieu_de: 'x', noi_dung: 'y' },
  });
  assert.equal(sai.ma, 400);

  // Chi cua minh: B khong thay.
  const cua_b = await goi('GET', '/api/toi/ho-thu-y-kien', { token: token_b });
  assert.equal(String(cua_b.tho).includes('Máy lạnh phòng KD hỏng'), false);

  // Quan tri thay trong danh sach chung.
  const ds = await goi('GET', '/api/ho-thu-y-kien', { token: token_admin });
  assert.equal(ds.ma, 200);
  const mang = ds.body as unknown as Record<string, unknown>[];
  assert.ok(mang.some((d) => d['id'] === ht_id));

  // Nhan vien thuong KHONG vao duoc trang quan tri.
  const cam = await goi('GET', '/api/ho-thu-y-kien', { token: token_a });
  assert.equal(cam.ma, 403);
});

test('cong bo phat hanh: soan (fallback) -> sua -> cong bo -> popup + email', async () => {
  // Danh sach phien ban doc tu CHANGELOG that (tep duoc COPY vao anh kiem).
  const pb = await goi('GET', '/api/phat-hanh/phien-ban', { token: token_admin });
  assert.equal(pb.ma, 200, `doc phien ban loi: ${pb.tho}`);
  const cac = pb.body['cac_phien_ban'] as string[];
  assert.ok(Array.isArray(cac) && cac.length >= 2, 'CHANGELOG phai co it nhat 2 phien ban');
  const den = cac[0] as string;

  // Soan: DEEPSEEK_API_KEY trong -> tom_tat fallback deterministic van tra ban nhap.
  const soan = await goi('POST', '/api/phat-hanh/soan', {
    token: token_admin, body: { den_phien_ban: den },
  });
  assert.equal(soan.ma, 201, `soan loi: ${soan.tho}`);
  const id = soan.body['id'] as string;
  assert.match(String(soan.body['tieu_de']), /Cập nhật|phiên bản/i);

  // Khoang phiên ban khong co muc -> 400.
  const sai = await goi('POST', '/api/phat-hanh/soan', {
    token: token_admin, body: { tu_phien_ban: den, den_phien_ban: den },
  });
  assert.equal(sai.ma, 400);

  // Sua ban nhap.
  const sua = await goi('PATCH', `/api/phat-hanh/${id}`, {
    token: token_admin,
    body: { tieu_de: 'Cập nhật Chấm công — nhiều tính năng mới', noi_dung: '- Tính năng mới\n- Sửa lỗi' },
  });
  assert.equal(sua.ma, 200);

  // Nhan vien thuong khong duoc cong bo.
  const cam = await goi('POST', `/api/phat-hanh/${id}/cong-bo`, { token: token_a });
  assert.equal(cam.ma, 403);

  // Cong bo: tao thong bao toan cong ty popup=true.
  const cb = await goi('POST', `/api/phat-hanh/${id}/cong-bo`, { token: token_admin });
  assert.equal(cb.ma, 200, `cong bo loi: ${cb.tho}`);
  const thong_bao_id = cb.body['thong_bao_id'] as string;
  assert.ok(typeof thong_bao_id === 'string' && thong_bao_id !== '');

  const tb = await truy_van_mot<{ popup: boolean; gui_email: boolean; pham_vi: string }>(
    'select popup, gui_email, pham_vi from thong_bao where id = $1', [thong_bao_id],
  );
  assert.ok(tb !== null, 'thong bao duoc tao');
  assert.equal(tb?.popup, true);
  assert.equal(tb?.gui_email, true);
  assert.equal(tb?.pham_vi, 'toan_cong_ty');

  // Nhan vien thay popup o duong popup khi dang nhap.
  const popup = await goi('GET', '/api/toi/thong-bao/popup', { token: token_a });
  assert.equal(popup.ma, 200);
  const mang = popup.body as unknown as { id: string }[];
  assert.ok(mang.some((t) => t.id === thong_bao_id));

  // Cong bo lai -> 409.
  const lai = await goi('POST', `/api/phat-hanh/${id}/cong-bo`, { token: token_admin });
  assert.equal(lai.ma, 409);
});
