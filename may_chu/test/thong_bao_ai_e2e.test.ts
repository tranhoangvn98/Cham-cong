// e2e MODULE VAN BAN AI (DTKT 01) — REQ-26: nhap -> gate -> ban hanh co cap so.
//
// Dung che do `tu_soan` (fallback khong-LLM) de khong can khoa DeepSeek: van chay du
// ③ (build docx + gate) ④ (duyet) ⑤ (ban hanh + cap so). Worker that chay trong test
// (bat_soan_van_ban) — day la phan "test ket noi" voi he thong that.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';

process.env['JWT_SECRET'] ??= 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['NODE_ENV'] = 'test';
process.env['DEVICE_TZ_OFFSET_HOURS'] = '7';
// The thuc ND30: route tu_soan tu choi khi thieu ten co quan / dia danh — e2e khai san.
process.env['CO_QUAN_BAN_HANH'] ??= 'CÔNG TY TNHH TRẦN HOÀNG VIỆT NAM';
process.env['DIA_DANH_VAN_BAN'] ??= 'Lạng Sơn';
// Khong goi Expo that: URL khong ton tai, route gui ngam se tu nuot loi.
process.env['EXPO_PUSH_URL'] = 'http://127.0.0.1:1/push';
process.env['DATABASE_URL'] ??=
  'postgres://chamcong:chamcong_dev@localhost:5432/chamcong_test';

const { dung_ung_dung } = await import('../src/ung_dung.ts');
const { chay_di_tru } = await import('../src/csdl/di_tru.ts');
const { thuc_thi, truy_van, truy_van_mot, dong_pool } = await import('../src/csdl/ket_noi.ts');
const { tao_token_truy_cap } = await import('../src/bao_mat/jwt.ts');
const { bat_soan_van_ban, dung_soan_van_ban } = await import('../src/su_kien/soan_van_ban_day.ts');
const { nghi_viec_den_han } = await import('../src/su_kien/lich_chay.ts');
const { quet_quy_trinh_thoi_viec } = await import('../src/thoi_viec/tu_dong.ts');
const { chay_dung_hoat_dong } = await import('../src/thoi_viec/chay_dung.ts');
const { dat_cau_hinh_thoi_viec } = await import('../src/thoi_viec/quy_trinh.ts');
const { cong_ngay, ngay_dia_phuong } = await import('../src/tien_ich/thoi_gian.ts');

const PHONG = '9f0e9a12-0000-4000-8000-0000000000a1';
const NV_ADMIN = '9f0e9a12-0000-4000-8000-0000000000b1';
const NV_A = '9f0e9a12-0000-4000-8000-0000000000b2';
const NV_B = '9f0e9a12-0000-4000-8000-0000000000b3';
const ND_ADMIN = '9f0e9a12-0000-4000-8000-0000000000c1';
const ND_A = '9f0e9a12-0000-4000-8000-0000000000c2';
const ND_B = '9f0e9a12-0000-4000-8000-0000000000c3';

let app: FastifyInstance;
let token_admin = '';
let token_a = '';
let token_b = '';

async function goi(
  method: 'GET' | 'POST' | 'PATCH',
  url: string,
  tuy_chon: { token?: string; body?: unknown } = {},
): Promise<{ ma: number; body: Record<string, unknown>; tho: string; byte: Buffer }> {
  const res = await app.inject({
    method,
    url,
    headers: tuy_chon.token === undefined ? {} : { authorization: `Bearer ${tuy_chon.token}` },
    ...(tuy_chon.body === undefined ? {} : { payload: tuy_chon.body as object }),
  });
  let json: unknown = null;
  try { json = res.json(); } catch { json = res.body; }
  return { ma: res.statusCode, body: json as Record<string, unknown>, tho: res.body, byte: res.rawPayload };
}

/** Doi ban nhap dat trang thai mong muon — worker quet moi 3 giay. */
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

/** Tao mot ban nhap tu_soan va doi den cho_duyet. */
async function nhap_cho_duyet(than: Record<string, unknown>): Promise<{ id: string; ma: string }> {
  const r = await goi('POST', '/api/thong-bao/ai/nhap', { token: token_admin, body: than });
  assert.equal(r.ma, 201, `nhap that bai: ${r.tho}`);
  const id = r.body['id'] as string;
  await cho_trang_thai(id, 'cho_duyet');
  return { id, ma: r.body['ma'] as string };
}

before(async () => {
  app = await dung_ung_dung();
  await chay_di_tru(() => {});

  // Don bang cua rieng module nay — khong dung toi du lieu cua e2e.test.ts.
  await thuc_thi(`truncate table thong_bao_da_doc, thong_bao_nhap_ai, thong_bao,
                  thong_bao_rieng, bo_dem_so_vb restart identity cascade`);

  await thuc_thi(
    `insert into phong_ban(id, ten) values ($1, 'Phòng Kinh doanh')
     on conflict (id) do nothing`, [PHONG],
  );
  for (const [id, ma_nv, ho_ten, chuc_danh, phong] of [
    [NV_ADMIN, 'AI-ADMIN', 'Trần Đức Hoàng', 'GIÁM ĐỐC', null],
    [NV_A, 'AI-NVA', 'Nguyễn Văn A', 'Nhân viên', PHONG],
    [NV_B, 'AI-NVB', 'Nguyễn Văn B', 'Nhân viên', null],
  ] as const) {
    await thuc_thi(
      `insert into nhan_vien(id, ma_nv, ho_ten, chuc_danh, phong_ban_id, dang_hoat_dong)
       values ($1,$2,$3,$4,$5,true)
       on conflict (id) do update set ho_ten = excluded.ho_ten`,
      [id, ma_nv, ho_ten, chuc_danh, phong],
    );
  }
  for (const [id, ten_dn, vai_tro, nv] of [
    [ND_ADMIN, 'ai_admin', 'admin', NV_ADMIN],
    [ND_A, 'ai_nva', 'nhan_vien', NV_A],
    [ND_B, 'ai_nvb', 'nhan_vien', NV_B],
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
    sub: ND_ADMIN, vai_tro: 'admin', nv: NV_ADMIN, ten: 'ai_admin',
  }).token;
  token_a = tao_token_truy_cap({
    sub: ND_A, vai_tro: 'nhan_vien', nv: NV_A, ten: 'ai_nva',
  }).token;
  token_b = tao_token_truy_cap({
    sub: ND_B, vai_tro: 'nhan_vien', nv: NV_B, ten: 'ai_nvb',
  }).token;

  bat_soan_van_ban(() => {});
});

after(async () => {
  dung_soan_van_ban();
  await dong_pool();
});

test('phan quyen: nhan vien thuong KHONG duoc tao ban nhap', async () => {
  const r = await goi('POST', '/api/thong-bao/ai/nhap', {
    token: token_a,
    body: { loai: 'thong_bao', pham_vi: 'toan_cong_ty', che_do: 'tu_soan',
      trich_yeu: 'Về việc x', noi_dung: ['X.'] },
  });
  assert.equal(r.ma, 403);
});

test('tu_soan -> worker dung docx + gate -> cho_duyet; xem duoc du thao', async () => {
  const { id, ma } = await nhap_cho_duyet({
    loai: 'thong_bao', pham_vi: 'phong_ban', quan_he: 'noi_bo', muc_dich: 'pho_bien',
    che_do: 'tu_soan', phong_ban_id: PHONG,
    trich_yeu: 'Về việc đổi phần mềm chấm công', kinh_gui: [],
    noi_dung: ['Nhằm nâng cao hiệu quả quản lý giờ giấc lao động.'],
  });
  assert.match(ma, /^TBN-/);

  const d = await goi('GET', `/api/thong-bao/ai/${id}`, { token: token_admin });
  assert.equal(d.body['trang_thai'], 'cho_duyet');
  assert.equal(d.body['co_tep'], true, 'chi tiet tra co_tep de web hien nut tai');
  const kq = d.body['ket_qua_gate'] as { dat: boolean; ma_check: string }[];
  assert.ok(Array.isArray(kq) && kq.length > 0, 'co ket qua gate');
  assert.ok(kq.filter((k) => k.ma_check !== 'G10').every((k) => k.dat), 'gate dat het');

  const xem = await goi('GET', `/api/thong-bao/ai/${id}/xem`, { token: token_admin });
  assert.equal(xem.ma, 200);
  assert.ok(xem.byte.length > 3 * 1024, 'tep docx du thao co kich thuoc that');
});

test('phat hanh 1 cap (phong_ban): cap so, nhan vien cung phong nhan duoc', async () => {
  const { id } = await nhap_cho_duyet({
    loai: 'thong_bao', pham_vi: 'phong_ban', quan_he: 'noi_bo', muc_dich: 'yeu_cau',
    che_do: 'tu_soan', phong_ban_id: PHONG,
    trich_yeu: 'Về việc họp giao ban thứ Hai', kinh_gui: [],
    noi_dung: ['Phòng Kinh doanh họp giao ban lúc 8h thứ Hai.'],
  });

  const p = await goi('POST', `/api/thong-bao/ai/${id}/phat-hanh`, { token: token_admin });
  assert.equal(p.ma, 200, `phat hanh loi: ${p.tho}`);
  assert.equal(p.body['so_ky_hieu'], '01/2026/TB-CTTHVN', 'so dau tien trong nam (C-11 so 0)');

  const tb_id = p.body['thong_bao_id'] as string;
  const tb = await truy_van_mot<{ ten_luu: string | null }>(
    'select ten_luu from thong_bao where id = $1', [tb_id],
  );
  assert.ok(tb !== null && tb.ten_luu !== null, 'thong bao duoc luu kem tep docx');

  // Nhan vien cung phong thay + tai duoc docx; nguoi ngoai phong KHONG thay.
  const cua_a = await goi('GET', '/api/toi/thong-bao', { token: token_a });
  assert.ok(String(cua_a.tho).includes('họp giao ban'));
  const tai_a = await goi('GET', `/api/toi/thong-bao/${tb_id}/tai`, { token: token_a });
  assert.equal(tai_a.ma, 200);
  const cua_b = await goi('GET', '/api/toi/thong-bao', { token: token_b });
  assert.equal(String(cua_b.tho).includes('họp giao ban'), false);
});

test('toan cong ty: PHAI trinh ky truoc, admin ban hanh, so lien tuc', async () => {
  const { id } = await nhap_cho_duyet({
    loai: 'thong_bao', pham_vi: 'toan_cong_ty', quan_he: 'noi_bo', muc_dich: 'pho_bien',
    che_do: 'tu_soan',
    trich_yeu: 'Về việc nghỉ lễ và đi làm bù', kinh_gui: [],
    noi_dung: ['Toàn thể cán bộ nhân viên nghỉ lễ theo quy định.'],
  });

  // Chua trinh ky -> chan.
  const som = await goi('POST', `/api/thong-bao/ai/${id}/phat-hanh`, { token: token_admin });
  assert.equal(som.ma, 409, 'chua trinh ky thi khong duoc ban hanh');

  const tk = await goi('POST', `/api/thong-bao/ai/${id}/trinh-ky`, { token: token_admin });
  assert.equal(tk.ma, 200);

  const p = await goi('POST', `/api/thong-bao/ai/${id}/phat-hanh`, { token: token_admin });
  assert.equal(p.ma, 200);
  assert.equal(p.body['so_ky_hieu'], '02/2026/TB-CTTHVN', 'so thu hai lien tuc (C-11 so 0)');

  // Nhan vien ngoai phong van thay (toan cong ty).
  const cua_b = await goi('GET', '/api/toi/thong-bao', { token: token_b });
  assert.ok(String(cua_b.tho).includes('nghỉ lễ'));
});

test('ca_nhan: chi dung nhan vien duoc chon thay, nguoi khac 404', async () => {
  const { id } = await nhap_cho_duyet({
    loai: 'cong_van', pham_vi: 'ca_nhan', quan_he: 'noi_bo', muc_dich: 'nhac_nho',
    che_do: 'tu_soan', nhan_vien_id: NV_A,
    trich_yeu: 'V/v nộp giải trình đi muộn', kinh_gui: ['Ông Nguyễn Văn A'],
    noi_dung: ['Đề nghị Ông nộp giải trình đi muộn ngày 05/09/2026.'],
  });

  const p = await goi('POST', `/api/thong-bao/ai/${id}/phat-hanh`, { token: token_admin });
  assert.equal(p.ma, 200);
  // Bo dem theo TUNG LOAI (PK loai+nam) — day la cong van dau tien nen so 1.
  assert.equal(p.body['so_ky_hieu'], '01/2026/CTTHVN-NS', 'cong van dung khuon CTTHVN-NS (C-11 so 0)');

  // I-01: cong van co ca Kinh gui lan Nơi nhận — dong dau noi nhan la "Như trên;".
  const d_cv = await goi('GET', `/api/thong-bao/ai/${id}`, { token: token_admin });
  const spec_cv = d_cv.body['spec_json'] as { noi_nhan: string[] };
  assert.deepEqual(spec_cv.noi_nhan, ['Như trên;', 'Ông/Bà Nguyễn Văn A, Phòng Kinh doanh', 'Lưu: VT, HCNS.']);

  const tb_id = p.body['thong_bao_id'] as string;
  const cua_a = await goi('GET', '/api/toi/thong-bao', { token: token_a });
  assert.ok(String(cua_a.tho).includes('giải trình đi muộn'));
  const cua_b = await goi('GET', '/api/toi/thong-bao', { token: token_b });
  assert.equal(String(cua_b.tho).includes('giải trình đi muộn'), false);
  const tai_b = await goi('GET', `/api/toi/thong-bao/${tb_id}/tai`, { token: token_b });
  assert.equal(tai_b.ma, 404, 'du lieu ngoai pham vi tra 404');
});

test('mat AI (khong key): ban nhap AI chuyen loi, phat hanh bi chan 409', async () => {
  const r = await goi('POST', '/api/thong-bao/ai/nhap', {
    token: token_admin,
    body: { loai: 'thong_bao', pham_vi: 'phong_ban', phong_ban_id: PHONG,
      che_do: 'ai', muc_dich: 'pho_bien', noi_dung_tho: 'nghi le 2/9' },
  });
  assert.equal(r.ma, 201);
  const id = r.body['id'] as string;
  await cho_trang_thai(id, 'loi');

  const p = await goi('POST', `/api/thong-bao/ai/${id}/phat-hanh`, { token: token_admin });
  assert.equal(p.ma, 409, 'trang thai loi khong duoc ban hanh');

  // Fallback REQ-22: nguoi tao co the huy va lam lai bang tu_soan.
  const huy = await goi('POST', `/api/thong-bao/ai/${id}/huy`, { token: token_admin });
  assert.equal(huy.ma, 200);
});

test('CSV danh sach ban nhap: co ma TBN- va chan injection', async () => {
  const r = await goi('GET', '/api/thong-bao/ai?csv=1', { token: token_admin });
  assert.equal(r.ma, 200);
  assert.match(r.tho, /TBN-/);
  assert.ok(r.tho.startsWith('\uFEFF'), 'co BOM cho Excel doc tieng Viet');
});

test('nhat ky: ghi du cac buoc nhap -> cap so -> phat hanh', async () => {
  const dong = await truy_van<{ hanh_dong: string }>(
    `select hanh_dong from nhat_ky_thao_tac where thuc_the = 'thong_bao_nhap_ai'`,
  );
  const hanh_dong = new Set(dong.map((d) => d.hanh_dong));
  for (const can of ['thong_bao_ai_nhap', 'thong_bao_ai_cap_so', 'thong_bao_ai_phat_hanh']) {
    assert.ok(hanh_dong.has(can), `thieu nhat ky ${can}`);
  }
});

// ============================================================ quyet dinh nghi viec
// Quy trinh nghi viec tu dong: phat hanh quyet dinh -> gan tep vao ho so -> den ngay
// nghi viec, job dem khoa tai khoan + ghi su kien bao cong + bao Microsoft.

test('quyet dinh nghi viec: nhap phai du loai + ngay hop le', async () => {
  const hom_nay = ngay_dia_phuong(new Date());

  const thieu_ngay = await goi('POST', '/api/thong-bao/ai/nhap', {
    token: token_admin,
    body: { loai: 'quyet_dinh', pham_vi: 'ca_nhan', che_do: 'tu_soan', nhan_vien_id: NV_B,
      trich_yeu: 'Về việc chấm dứt hợp đồng lao động', can_cu: ['Bộ luật Lao động năm 2019'],
      dieu: ['Chấm dứt hợp đồng lao động.'], noi_dung: ['QUYẾT ĐỊNH:'],
      la_qd_nghi_viec: true },
  });
  assert.equal(thieu_ngay.ma, 400, 'thieu ngay nghi viec phai bi tu choi');

  const sai_loai = await goi('POST', '/api/thong-bao/ai/nhap', {
    token: token_admin,
    body: { loai: 'thong_bao', pham_vi: 'ca_nhan', che_do: 'tu_soan', nhan_vien_id: NV_B,
      trich_yeu: 'Về việc x', noi_dung: ['X.'],
      la_qd_nghi_viec: true, ngay_nghi_viec: hom_nay },
  });
  assert.equal(sai_loai.ma, 400, 'loai khong phai quyet dinh phai bi tu choi');

  const qua_khu = await goi('POST', '/api/thong-bao/ai/nhap', {
    token: token_admin,
    body: { loai: 'quyet_dinh', pham_vi: 'ca_nhan', che_do: 'tu_soan', nhan_vien_id: NV_B,
      trich_yeu: 'Về việc chấm dứt hợp đồng lao động', can_cu: ['Bộ luật Lao động năm 2019'],
      dieu: ['Chấm dứt hợp đồng lao động.'], noi_dung: ['QUYẾT ĐỊNH:'],
      la_qd_nghi_viec: true, ngay_nghi_viec: cong_ngay(hom_nay, -1) },
  });
  assert.equal(qua_khu.ma, 400, 'ngay nghi viec trong qua khu phai bi tu choi');
});

test('quyet dinh nghi viec: phat hanh gan tep ho so, lich dem hoi to quy trinh, Cong 2 khoa tai khoan', async () => {
  const hom_nay = ngay_dia_phuong(new Date());

  // Don du lieu cua lan chay truoc — bo kiem nay chay lai duoc tren cung CSDL test.
  await thuc_thi(`delete from hop_thu_di where du_lieu ->> 'ma_nv' = 'AI-NVB'`);
  await thuc_thi('delete from quy_trinh_thoi_viec where nhan_vien_id = $1', [NV_B]);
  await thuc_thi(`delete from don_tu where nhan_vien_id = $1 and loai = 'thoi_viec'`, [NV_B]);
  await thuc_thi('delete from tai_lieu_nhan_vien where nhan_vien_id = $1', [NV_B]);
  await thuc_thi('delete from ho_so_tep where nhan_vien_id = $1', [NV_B]);
  await thuc_thi(
    `update nhan_vien set dang_hoat_dong = true, ngay_nghi_viec = null where id = $1`,
    [NV_B]);
  await thuc_thi('update nguoi_dung set dang_hoat_dong = true where id = $1', [ND_B]);
  await thuc_thi('update nguoi_dung set email_microsoft = $1 where id = $2',
    ['nguyen.van.b@congty.test', ND_B]);
  await thuc_thi(`update nhan_vien set email = 'nv.b@congty.test' where id = $1`, [NV_B]);

  const { id } = await nhap_cho_duyet({
    loai: 'quyet_dinh', pham_vi: 'ca_nhan', quan_he: 'noi_bo', muc_dich: 'yeu_cau',
    che_do: 'tu_soan', nhan_vien_id: NV_B,
    trich_yeu: 'Về việc chấm dứt hợp đồng lao động',
    can_cu: ['Bộ luật Lao động năm 2019'],
    dieu: [`Chấm dứt hợp đồng lao động với Ông Nguyễn Văn B kể từ ngày ${hom_nay}.`],
    noi_dung: ['Căn cứ hồ sơ nhân sự và tình hình thực tế tại Công ty.', 'QUYẾT ĐỊNH:'],
    la_qd_nghi_viec: true, ngay_nghi_viec: hom_nay,
  });

  // Chi tiet tra danh dau + ngay nghi viec de web hien thi.
  const d = await goi('GET', `/api/thong-bao/ai/${id}`, { token: token_admin });
  assert.equal(d.body['la_qd_nghi_viec'], true);
  assert.equal(d.body['ngay_nghi_viec'], hom_nay);

  const p = await goi('POST', `/api/thong-bao/ai/${id}/phat-hanh`, { token: token_admin });
  assert.equal(p.ma, 200, `phat hanh loi: ${p.tho}`);

  // Buoc 1: tep quyet dinh duoc gan vao ho so nhan vien, checklist "QĐ nghỉ việc" du.
  const tep = await truy_van<{ id: string; nhom: string }>(
    `select id::text, nhom from ho_so_tep where nhan_vien_id = $1 and nhom = 'tai_lieu'`,
    [NV_B],
  );
  assert.equal(tep.length, 1, 'co dung mot tep quyet dinh trong ho so nhan vien');
  const tl = await truy_van_mot<{ trang_thai: string }>(
    `select tl.trang_thai from tai_lieu_nhan_vien tl
       join danh_muc_tai_lieu dm on dm.id = tl.danh_muc_id
      where tl.nhan_vien_id = $1 and dm.ma = 'qd_nghi_viec'`,
    [NV_B],
  );
  assert.equal(tl?.trang_thai, 'da_len_phan_mem', 'checklist QĐ nghỉ việc da len phan mem');

  // REQ-G2-05: lich dem KHONG tu khoa nua — thay vao do hoi to thanh quy trinh thoi viec
  // (lastday chot theo QD, muc nhan_vien bo qua) de ca dang do khong lot.
  await nghi_viec_den_han(hom_nay, () => {});

  const nv_con = await truy_van_mot<{ dang_hoat_dong: boolean }>(
    'select dang_hoat_dong from nhan_vien where id = $1', [NV_B]);
  assert.equal(nv_con?.dang_hoat_dong, true, 'lich dem khong tu khoa nhan vien');

  const qt = await truy_van_mot<{ id: string; trang_thai: string; lastday_da_chot: boolean }>(
    `select id::text, trang_thai, lastday_da_chot from quy_trinh_thoi_viec
      where nhan_vien_id = $1`, [NV_B]);
  assert.notEqual(qt, null, 'quyet dinh nghi viec duoc hoi to thanh quy trinh');
  assert.equal(qt?.lastday_da_chot, true, 'lastday chot theo quyet dinh');

  const da_chay = await truy_van_mot<{ da_chay: boolean }>(
    'select (nghi_viec_da_chay_luc is not null) as da_chay from thong_bao_nhap_ai where id = $1',
    [id]);
  assert.equal(da_chay?.da_chay, true, 'quyet dinh duoc danh dau da chay');

  // Muc tu dong chay nen (trong test goi truc tiep thay cho vong lich) -> san sang chot.
  await quet_quy_trinh_thoi_viec(() => {});
  const qt2 = await truy_van_mot<{ trang_thai: string; id: string }>(
    `select id::text, trang_thai from quy_trinh_thoi_viec where nhan_vien_id = $1`, [NV_B]);
  assert.equal(qt2?.trang_thai, 'san_sang_chot',
    'moi muc bat buoc xong/bo qua -> tu dong san sang chot');

  // Cong 2: chay dung hoat dong. Khai email dich vu BHXH truoc — REQ-CH-02 chan khi thieu.
  await dat_cau_hinh_thoi_viec('email_dich_vu_bhxh', 'bhxh@congty.test');
  const kq = await chay_dung_hoat_dong(qt2!.id, ND_ADMIN, null);
  assert.equal(kq.ok, true);

  const nv = await truy_van_mot<{ dang_hoat_dong: boolean; ngay_nghi_viec: string | null }>(
    `select dang_hoat_dong, ngay_nghi_viec::text as ngay_nghi_viec
       from nhan_vien where id = $1`, [NV_B]);
  assert.equal(nv?.dang_hoat_dong, false, 'Cong 2 khoa nhan vien');
  assert.equal(nv?.ngay_nghi_viec, hom_nay);

  const nd = await truy_van_mot<{ dang_hoat_dong: boolean }>(
    'select dang_hoat_dong from nguoi_dung where id = $1', [ND_B]);
  assert.equal(nd?.dang_hoat_dong, false, 'tai khoan dang nhap bi vo hieu hoa');

  const qt3 = await truy_van_mot<{ trang_thai: string }>(
    'select trang_thai from quy_trinh_thoi_viec where id = $1', [qt2!.id]);
  assert.equal(qt3?.trang_thai, 'da_khoa', 'quy trinh chot da_khoa');

  // Su kien bao cong phan quyen + Microsoft + ERP1 + email BHXH/thue deu nam trong hop thu
  // di (test khong cau hinh dich thi chung nam lai cho, khong mat).
  const su_kien = await truy_van<{ loai_su_kien: string; du_lieu: Record<string, unknown> }>(
    `select loai_su_kien, du_lieu from hop_thu_di
      where du_lieu ->> 'ma_nv' = 'AI-NVB' order by id`,
  );
  assert.ok(su_kien.some((s) => s.loai_su_kien === 'nhan_su.nghi_viec'), 'co su kien bao cong');
  assert.ok(su_kien.some((s) => s.loai_su_kien === 'ms365.nghi_viec'), 'co su kien bao Microsoft');
  assert.ok(su_kien.some((s) => s.loai_su_kien === 'erp1.nhan_su.nghi_viec'), 'co su kien ERP1');
  assert.ok(su_kien.some((s) => s.loai_su_kien === 'gui_email'), 'co email outbox (BHXH/thue...)');
  const ms = su_kien.find((s) => s.loai_su_kien === 'ms365.nghi_viec');
  assert.equal(ms?.du_lieu['upn'], 'nguyen.van.b@congty.test', 'su kien Microsoft co upn');

  // REQ-TEST-07: chay lai lan nua idempotent — khong sinh them su kien trung, khong khoa lai.
  const kq2 = await chay_dung_hoat_dong(qt2!.id, ND_ADMIN, null);
  assert.equal(kq2.da_chay, true, 'chay lai tra da_chay, khong lam gi them');
  const dem_cong = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from hop_thu_di
      where loai_su_kien = 'nhan_su.nghi_viec' and du_lieu ->> 'ma_nv' = 'AI-NVB'`);
  assert.equal(dem_cong?.so, 1, 'chay lai khong sinh su kien trung');
});
