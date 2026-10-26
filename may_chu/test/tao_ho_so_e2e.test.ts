// E2E luong them nhan vien BANG FORM (POST /api/nhan-vien) — ma nhan su do he thong sinh.
//
// CAN CSDL THAT (ten bat dau chamcong_test) — xoa sach cac bang lien quan truoc khi chay.
// Chay cung test_e2e (test-concurrency=1).
//
// SAU DIEU DUOC CHOT O DAY:
//
//  1. Khong gui `ma_nv` van tao duoc: ma sinh theo khuon NV + ma ngan khoi + MMYY + so thu tu.
//  2. So thu tu TANG theo (khoi, thang) — hai nguoi cung khoi cung thang khong trung ma.
//  3. Khai khoi la du de cap PIN: may cua khoi nhan duoc lenh DATA UPDATE USERINFO ngay trong
//     transaction (truoc day chi cong duyet de nghi day lenh, nguoi them bang form khong ton tai
//     tren may — im lang).
//  4. Ma ERP1 ghi vao bang ma dinh danh, khong phai cot moi tren nhan_vien.
//  5. Khoi chua khai ma ngan / chua gan may thi bao loi RO RANG, khong sinh ma sai hay tao nguoi
//     khong quet duoc.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';

process.env['JWT_SECRET'] = 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['NODE_ENV'] = 'test';
process.env['DEVICE_TZ_OFFSET_HOURS'] = '7';
process.env['CORS_ORIGIN'] = 'http://localhost:5173';
// Nguoi phu trach "viec nhap viec" — luong tao ho so LUON sinh viec nay (gop tu luong de nghi).
process.env['NHAP_VIEC_NHAN_SU_ID'] = 'HR001';
process.env['DATABASE_URL'] ??=
  'postgres://chamcong:chamcong_dev@localhost:5432/chamcong_test';

const { dung_ung_dung } = await import('../src/ung_dung.ts');
const { chay_di_tru } = await import('../src/csdl/di_tru.ts');
const {
  thuc_thi, truy_van, truy_van_mot, dong_pool,
} = await import('../src/csdl/ket_noi.ts');
const { bam_mat_khau } = await import('../src/bao_mat/mat_khau.ts');
const { tao_token_truy_cap } = await import('../src/bao_mat/jwt.ts');

function ten_csdl(url: string): string {
  const khong_truy_van = url.split('?')[0] ?? '';
  const sau = khong_truy_van.replace(/^[a-z+]+:\/\//i, '');
  const vt = sau.indexOf('/');
  return vt < 0 ? '' : sau.slice(vt + 1);
}
const ten_db = ten_csdl(process.env['DATABASE_URL']);
if (!ten_db.startsWith('chamcong_test')) {
  throw new Error(
    `Bo kiem nay xoa sach du lieu nen chi chay tren DB ten 'chamcong_test*'. `
    + `DATABASE_URL dang tro toi '${ten_db}'.`,
  );
}

let app: FastifyInstance;
let token = '';
let khoi_vp = '';
/** Tai khoan admin — nguoi nhan chuong "co nhan su moi". */
let admin_id = '';
/** Hai vi tri JD + mot nhom trach nhiem seed san cho bai kiem gan vi tri. */
let vt_chinh_id = '';
let vt_phu_id = '';
/** Serial may cua khoi Van Phong trong bai kiem nay (khac serial that). */
const MAY_VP = 'MAYVP0001';

/** Goi API bang token admin cua bai kiem. `body` bo trong = khong gui than. */
async function goi_api(
  phuong: 'GET' | 'POST',
  duong: string,
  body?: Record<string, unknown>,
): Promise<{ ma: number; than: Record<string, unknown> }> {
  const res = await app.inject({
    method: phuong,
    url: duong,
    headers: { authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { payload: body as never }),
  });
  return {
    ma: res.statusCode,
    than: res.body === '' ? {} : (JSON.parse(res.body) as Record<string, unknown>),
  };
}

/** Tao nhan vien qua POST /api/nhan-vien. */
async function goi(
  body: Record<string, unknown>,
): Promise<{ ma: number; than: Record<string, unknown> }> {
  return goi_api('POST', '/api/nhan-vien', body);
}

before(async () => {
  await chay_di_tru();
  for (const b of [
    'lenh_thiet_bi', 'ma_dinh_danh', 'dem_ma_nhan_su', 'hop_thu_di',
    'cong_viec', 'cong_viec_hanh_dong', 'cong_viec_workflow', 'thong_bao_rieng',
    'cong_viec_mau_dinh_ky', 'dau_viec', 'vi_tri', 'nhom_trach_nhiem',
    'nhan_vien_vi_tri',
    'hop_dong_lao_dong',
    'nhat_ky_thao_tac', 'nguoi_dung', 'nhan_vien', 'thiet_bi',
  ]) {
    await thuc_thi(`truncate table ${b} restart identity cascade`);
  }

  // Migration 053 chi seed tai khoan 'he_thong' MOT lan, va `truncate nguoi_dung` o tren xoa no
  // di trong khi `di_tru` khong chay lai tep do. Khong tao lai thi bo kiem cua file chay SAU
  // (va moi lan chay lai ca bo) chet voi "Thieu tai khoan he thong" — loi khong lien quan gi
  // den thu dang kiem. Tao y nguyen: khong dang nhap duoc, chi lam danh tinh cho quyet dinh tu dong.
  await thuc_thi(
    `insert into nguoi_dung (ten_dang_nhap, mat_khau_hash, vai_tro, dang_hoat_dong, phai_doi_mat_khau)
     select 'he_thong', '!', 'nhan_su', false, false
      where not exists (select 1 from nguoi_dung where ten_dang_nhap = 'he_thong')`,
  );

  // Nguoi phu trach nhan su (nhan viec "Nhap viec") — chua co khoi nen khong anh huong bo dem ma.
  await thuc_thi(
    `insert into nhan_vien(ma_nv, ho_ten, dang_hoat_dong)
     values ('HR001', 'Nhân Sự Phụ Trách', true)`,
  );

  // Danh muc To chuc & trach nhiem: mot nhom + hai vi tri JD, moi vi tri co dau viec.
  const nhom = await truy_van_mot<{ id: string }>(
    `insert into nhom_trach_nhiem(ma, ten) values ('KT', 'Kiem thu')
     on conflict (ma) do update set ten = excluded.ten returning id`,
  );
  const vt1 = await truy_van_mot<{ id: string }>(
    `insert into vi_tri(ma, ten, cap_bac, pham_vi, dang_hoat_dong)
     values ('KT.NV', 'Nhân viên kiểm thử', 'nhan_vien', 'toan_cong_ty', true)
     on conflict (ma) do update set ten = excluded.ten returning id`,
  );
  const vt2 = await truy_van_mot<{ id: string }>(
    `insert into vi_tri(ma, ten, cap_bac, pham_vi, dang_hoat_dong)
     values ('KT.PH', 'Phó phòng kiểm thử', 'truong_phong', 'toan_cong_ty', true)
     on conflict (ma) do update set ten = excluded.ten returning id`,
  );
  vt_chinh_id = vt1!.id;
  vt_phu_id = vt2!.id;
  await thuc_thi(
    `insert into dau_viec(vi_tri_id, ten, nhom_id, tan_suat, muc_do_quan_trong, dang_bat)
     values ($1, 'Báo cáo tuần kiểm thử', $3, 'hang_tuan', 'cao', true),
            ($1, 'Việc phát sinh kiểm thử', $3, 'phat_sinh', 'cao', true),
            ($2, 'Họp kiểm thử tháng', $3, 'hang_thang', 'cao', true)`,
    [vt_chinh_id, vt_phu_id, nhom!.id],
  );

  const khoi = await truy_van_mot<{ id: string }>(
    "select id from khoi where ma = 'vp'");
  assert.ok(khoi !== null, 'migration phai co san khoi vp');
  khoi_vp = khoi.id;

  await thuc_thi(
    `insert into thiet_bi(serial, ten, pin_tu, pin_den, dang_bat, khoi_id)
     values ($1, 'May VP kiem thu', 1001, 1999, true, $2)`,
    [MAY_VP, khoi_vp],
  );

  const nd = await truy_van_mot<{ id: string }>(
    `insert into nguoi_dung(ten_dang_nhap, mat_khau_hash, vai_tro, dang_hoat_dong)
     values ('quantri', $1, 'admin', true) returning id`,
    [await bam_mat_khau('matkhau_kiem_thu_1')],
  );
  admin_id = nd!.id;
  token = tao_token_truy_cap({ sub: nd!.id, vai_tro: 'admin', nv: null, ten: 'quantri' }).token;
  app = await dung_ung_dung();
  await app.ready();
});

after(async () => {
  await app?.close();
  await dong_pool();
});

/** Ma nhan su sinh tu dong phai dung khuon: NV + ma ngan khoi + MMYY + so thu tu. */
const KHUON = /^NVVP0526(\d{4})$/;

test('them nhan vien khong gui ma_nv: ma sinh theo khuon, PIN cap, may da nhan lenh', async () => {
  const r = await goi({
    ho_ten: 'Nguyễn Văn Sinh', khoi_id: khoi_vp, ngay_vao: '2026-05-20',
    tu_cap_pin: true, tao_tk_he_thong: false,
  });
  assert.equal(r.ma, 201, JSON.stringify(r.than));

  const ma = String(r.than['ma_nv']);
  const m = KHUON.exec(ma);
  assert.ok(m !== null, `ma phai dung khuon NV + VP + 0526 + so thu tu, nhan duoc "${ma}"`);
  assert.equal(m[1], '0001', 'nguoi dau tien cua khoi trong thang');

  const pin = String(r.than['pin_may']);
  assert.equal(pin, '1001', 'lay so con trong dau tien trong dai cua may thuoc khoi');
  assert.deepEqual(r.than['may_da_day'], [MAY_VP], 'phai day lenh xuong may cua khoi');

  // Ma noi bo phai co trong bang ma dinh danh, khong chi nam o cot `nhan_vien.ma_nv`.
  const md = await truy_van_mot<{ ma: string }>(
    `select md.ma from ma_dinh_danh md join nhan_vien nv on nv.id = md.nhan_vien_id
      where md.he_thong = 'noi_bo' and nv.ma_nv = $1`, [ma]);
  assert.equal(md?.ma, ma);

  // Lenh day user+PIN nam trong hang doi, khoa theo tung may.
  const nv = await truy_van_mot<{ id: string }>(
    'select id from nhan_vien where ma_nv = $1', [ma]);
  const lenh = await truy_van_mot<{ lenh: string; gui_luc: string | null }>(
    'select lenh, gui_luc from lenh_thiet_bi where khoa_chong_trung = $1',
    [`nhap_viec_pin:${nv!.id}:${MAY_VP}`]);
  assert.ok(lenh !== null, 'phai co lenh DATA UPDATE USERINFO');
  assert.match(lenh.lenh, /^DATA UPDATE USERINFO/);
  assert.ok(lenh.lenh.includes('PIN=1001'));
  assert.equal(lenh.gui_luc, null, 'may offline thi lenh nam cho');
});

test('hai nguoi cung khoi cung thang: so thu tu tang, khong trung ma', async () => {
  const r = await goi({
    ho_ten: 'Trần Thị Hai', khoi_id: khoi_vp, ngay_vao: '2026-05-28',
    tu_cap_pin: true, tao_tk_he_thong: false,
  });
  assert.equal(r.ma, 201, JSON.stringify(r.than));
  const m = KHUON.exec(String(r.than['ma_nv']));
  assert.ok(m !== null, `ma sai khuon: ${String(r.than['ma_nv'])}`);
  assert.equal(m[1], '0002', 'thang van la 0526 nen so thu tu phai la 0002');
  assert.equal(r.than['pin_may'], '1002', 'PIN cung phai la so ke tiep');
});

test('ma ERP1: ghi vao bang ma dinh danh he thong erp1', async () => {
  const r = await goi({
    ho_ten: 'Lê Văn ERP', khoi_id: khoi_vp, ngay_vao: '2026-06-02',
    ma_erp1: 'erp1-000777', tu_cap_pin: true, tao_tk_he_thong: false,
  });
  assert.equal(r.ma, 201, JSON.stringify(r.than));
  const md = await truy_van_mot<{ ma: string; ma_chuan: string }>(
    `select md.ma, md.ma_chuan from ma_dinh_danh md join nhan_vien nv on nv.id = md.nhan_vien_id
      where md.he_thong = 'erp1' and nv.ma_nv = $1`, [String(r.than['ma_nv'])]);
  assert.equal(md?.ma, 'erp1-000777', 'giu nguyen van nhu nguoi khai');
  assert.equal(md?.ma_chuan, 'ERP1-000777', 'chuan hoa chu HOA de so sanh');
  // Thang 6 la mot o dem moi: so thu tu quay lai 0001 (ma thang la 0626, khong phai 0526).
  const ma6 = /^NVVP0626(\d{4})$/.exec(String(r.than['ma_nv']));
  assert.ok(ma6 !== null, `ma thang 6 sai khuon: ${String(r.than['ma_nv'])}`);
  assert.equal(ma6[1], '0001', 'sang thang moi thi so thu tu bat dau lai');
});

test('khoi chua khai ma ngan: bao loi ro rang, khong sinh ma sai', async () => {
  const khoi_moi = await truy_van_mot<{ id: string }>(
    `insert into khoi(ma, ten) values ('kt_chua_ma', 'Khoi kiem thu chua ma ngan')
     on conflict (ma) do update set ma_ngan = null
     returning id`);
  const r = await goi({
    ho_ten: 'Chưa Có Mã Khối', khoi_id: khoi_moi!.id, ngay_vao: '2026-05-20',
    tu_cap_pin: false, tao_tk_he_thong: false,
  });
  assert.equal(r.ma, 400, JSON.stringify(r.than));
  assert.match(String(r.than['loi']), /mã ngắn/);
});

test('khoi chua gan may ma van bat tu cap PIN: bao loi ro rang', async () => {
  const khoi_moi = await truy_van_mot<{ id: string }>(
    `insert into khoi(ma, ma_ngan, ten) values ('kt_chua_may', 'KTM', 'Khoi kiem thu chua may')
     on conflict (ma) do update set ma_ngan = 'KTM'
     returning id`);
  const r = await goi({
    ho_ten: 'Chưa Có Máy', khoi_id: khoi_moi!.id, ngay_vao: '2026-05-20',
    tu_cap_pin: true, tao_tk_he_thong: false,
  });
  assert.equal(r.ma, 400, JSON.stringify(r.than));
  assert.match(String(r.than['loi']), /máy chấm công/);
});

// ================================================================ bao PIN cho nguoi moi
// Nguoi vua duoc khoi tao phai BIET so PIN cua minh: so do he thong cap theo dai cua may,
// nguoi lap ho so khong tu biet truoc, va khong biet thi ca dau khong quet duoc.
test('nguoi moi co tai khoan: nhan duoc thong bao mang dung so PIN', async () => {
  const r = await goi({
    ho_ten: 'Phạm Thị Báo', khoi_id: khoi_vp, ngay_vao: '2026-05-29',
    tu_cap_pin: true, tao_tk_he_thong: true,
  });
  assert.equal(r.ma, 201, JSON.stringify(r.than));
  const pin = String(r.than['pin_may']);

  // `gui_ngam` khong chan phan hoi nen thong bao duoc ghi sau khi tra loi — cho toi da 3 giay.
  const doc = (): Promise<{ tieu_de: string; noi_dung: string }[]> =>
    truy_van<{ tieu_de: string; noi_dung: string }>(
      `select tb.tieu_de, tb.noi_dung
         from thong_bao_rieng tb
         join nguoi_dung nd on nd.id = tb.nguoi_dung_id
         join nhan_vien nv on nv.id = nd.nhan_vien_id
        where nv.ma_nv = $1`, [String(r.than['ma_nv'])]);
  let tb = await doc();
  for (let i = 0; i < 30 && tb.length === 0; i++) {
    await new Promise((xong) => setTimeout(xong, 100));
    tb = await doc();
  }

  assert.equal(tb.length, 1, 'dung mot thong bao cho tai khoan vua tao');
  assert.ok(tb[0]!.tieu_de.includes(pin), 'tieu de phai mang so PIN');
  assert.ok(tb[0]!.noi_dung.includes(pin), 'noi dung phai mang so PIN');
  // Thong bao cung phai noi ro so PIN nay khai o may nao.
  assert.ok(tb[0]!.noi_dung.includes('May VP kiem thu'), 'noi dung phai co ten may da day lenh');
});

test('nguoi moi khong co tai khoan: canh bao de nguoi lap ho so bao PIN truc tiep', async () => {
  const r = await goi({
    ho_ten: 'Đỗ Văn KhôngTk', khoi_id: khoi_vp, ngay_vao: '2026-05-30',
    tu_cap_pin: true, tao_tk_he_thong: false,
  });
  assert.equal(r.ma, 201, JSON.stringify(r.than));
  const pin = String(r.than['pin_may']);
  const canh_bao = (r.than['canh_bao'] ?? []) as string[];
  assert.ok(
    canh_bao.some((c) => c.includes(pin) && c.includes('chưa có tài khoản')),
    `phai canh bao chua gui duoc thong bao PIN, nhan duoc: ${JSON.stringify(canh_bao)}`,
  );
});

// ================================================================ MOT luong duy nhat
// Truoc 26/10/2026 co hai loi vao: form them tay va cong duyet de nghi. Nay chi con form, va cac
// phan chi co o luong de nghi (viec "Nhap viec" + checklist) phai chay ngay khi luu.
test('luu ho so la tu sinh viec "Nhap viec" + 15 muc checklist', async () => {
  const r = await goi({
    ho_ten: 'Trịnh Văn Checklist', khoi_id: khoi_vp, ngay_vao: '2026-05-31',
    tu_cap_pin: true, tao_tk_he_thong: false,
    loai_hop_dong: 'xac_dinh', thoi_han_thang: 12,
  });
  assert.equal(r.ma, 201, JSON.stringify(r.than));
  const nv_id = String(r.than['id']);
  const viec_id = String(r.than['viec_id'] ?? '');
  assert.notEqual(viec_id, '', 'phan hoi phai mang viec_id cua viec nhap viec');

  const viec = await truy_van_mot<{ nhan_vien_id: string }>(
    'select nhan_vien_id from cong_viec where khoa_chong_trung = $1', [`nhap_viec:${nv_id}`]);
  assert.ok(viec !== null, 'phai sinh cong viec nhap viec cung transaction');
  const hr = await truy_van_mot<{ id: string }>(
    "select id from nhan_vien where ma_nv = 'HR001'");
  assert.equal(viec.nhan_vien_id, hr?.id, 'viec giao cho nguoi phu trach nhan su');

  const muc = await truy_van<{ ten: string; xong: boolean }>(
    'select ten, xong from cong_viec_hanh_dong where cong_viec_id = $1 order by thu_tu', [viec_id]);
  assert.equal(muc.length, 15, 'checklist phai du 15 muc');
  assert.equal(muc[0]?.xong, false, 'khong tao tai khoan Microsoft thi muc MS365 chua tick');
  assert.equal(muc[1]?.xong, true, 'muc ERP1 luon tick san');
  assert.ok((muc[5]?.ten ?? '').includes('1 năm'), 'checklist ky HD dung loai + ki han');
});

test('chon nguoi da co Microsoft 365: khong tao lai tai khoan, checklist tick san', async () => {
  const r = await goi({
    ho_ten: 'Ngô Thị Đã Có', khoi_id: khoi_vp, ngay_vao: '2026-05-31',
    email: 'ngo.daco@tranhoangvietnam.com',
    tu_cap_pin: true, tao_tk_ms365: true, ms365_da_co: true, tao_tk_he_thong: false,
  });
  assert.equal(r.ma, 201, JSON.stringify(r.than));
  const ma_nv = String(r.than['ma_nv']);
  assert.equal(r.than['tai_khoan_ms365'], undefined, 'khong duoc tra mat khau khoi tao nao');
  const sk = await truy_van<{ loai_su_kien: string }>(
    `select loai_su_kien from hop_thu_di where du_lieu ->> 'ma_nv' = $1`, [ma_nv]);
  assert.ok(!sk.some((s) => s.loai_su_kien === 'ms365.tao_tai_khoan'),
    'da co tai khoan thi khong ban su kien tao lai');

  const viec_id = String(r.than['viec_id']);
  const muc1 = await truy_van_mot<{ xong: boolean }>(
    'select xong from cong_viec_hanh_dong where cong_viec_id = $1 order by thu_tu limit 1',
    [viec_id]);
  assert.equal(muc1?.xong, true, 'tai khoan da co san thi muc MS365 tick san');
});

test('quan tri vien nhan chuong "co nhan su moi" — khong phai yeu cau duyet', async () => {
  const r = await goi({
    ho_ten: 'Lý Văn Báo', khoi_id: khoi_vp, ngay_vao: '2026-05-31',
    tu_cap_pin: true, tao_tk_he_thong: false,
  });
  assert.equal(r.ma, 201, JSON.stringify(r.than));

  // `gui_ngam` khong chan phan hoi — cho toi da 3 giay, va cho DUNG thong bao cua nguoi nay
  // (cac bai truoc da tao thong bao cho admin roi).
  const doc = (): Promise<{ tieu_de: string; noi_dung: string }[]> =>
    truy_van<{ tieu_de: string; noi_dung: string }>(
      `select tieu_de, noi_dung from thong_bao_rieng
        where nguoi_dung_id = $1 and du_lieu ->> 'man' = 'nhan-vien'`, [admin_id]);
  let tb = await doc();
  for (let i = 0; i < 30 && !tb.some((x) => x.tieu_de.includes('Lý Văn Báo')); i++) {
    await new Promise((xong) => setTimeout(xong, 100));
    tb = await doc();
  }
  assert.ok(tb.length > 0, 'admin phai nhan thong bao co nhan su moi');
  assert.ok(tb.some((x) => x.tieu_de.includes('Lý Văn Báo')), 'tieu de phai mang ten nguoi moi');
});

// ================================================================ gan vi tri To chuc & trach nhiem
test('chon vi tri khi tao ho so: gan nhan_vien_vi_tri, vi tri chinh, sinh mau viec dinh ky', async () => {
  const r = await goi({
    ho_ten: 'Vũ Thị Vị Trí', khoi_id: khoi_vp, ngay_vao: '2026-05-31',
    tu_cap_pin: true, tao_tk_he_thong: false,
    vi_tri_ids: [vt_chinh_id, vt_phu_id],
  });
  assert.equal(r.ma, 201, JSON.stringify(r.than));
  const nv_id = String(r.than['id']);
  assert.equal(r.than['so_vi_tri_to_chuc'], 2, 'phan hoi phai dem du 2 vi tri da gan');
  assert.equal(r.than['so_dau_viec_dinh_ky'], 2,
    'chi dem dau viec dang bat + co tan suat sinh tu dong (bo qua phat_sinh)');

  const giu = await truy_van<{ vi_tri_id: string; la_chinh: boolean }>(
    'select vi_tri_id, la_chinh from nhan_vien_vi_tri where nhan_vien_id = $1', [nv_id]);
  assert.equal(giu.length, 2);
  assert.deepEqual(
    giu.filter((x) => x.la_chinh).map((x) => x.vi_tri_id), [vt_chinh_id],
    'vi tri chon DAU TIEN la vi tri chinh, va chi co mot vi tri chinh');

  const nv = await truy_van_mot<{ vi_tri_chinh_id: string | null; chuc_danh: string | null }>(
    'select vi_tri_chinh_id, chuc_danh from nhan_vien where id = $1', [nv_id]);
  assert.equal(nv?.vi_tri_chinh_id, vt_chinh_id);
  assert.equal(nv?.chuc_danh, 'Nhân viên kiểm thử', 'chuc danh trong thi dien theo vi tri chinh');

  const mau = await truy_van<{ ten: string; nguon: string; dang_bat: boolean }>(
    'select ten, nguon, dang_bat from cong_viec_mau_dinh_ky where nhan_vien_id = $1 order by ten',
    [nv_id]);
  assert.deepEqual(mau.map((m) => m.ten), ['Báo cáo tuần kiểm thử', 'Họp kiểm thử tháng'],
    'viec kieu phat_sinh khong sinh mau dinh ky');
  assert.ok(mau.every((m) => m.nguon === 'jd' && m.dang_bat));
});

test('chuc danh nguoi lap ho so tu go KHONG bi de boi ten vi tri', async () => {
  const r = await goi({
    ho_ten: 'Đinh Văn Chức Danh', khoi_id: khoi_vp, ngay_vao: '2026-05-31',
    chuc_danh: 'Chuyên viên kiểm thử nội bộ',
    tu_cap_pin: true, tao_tk_he_thong: false,
    vi_tri_ids: [vt_phu_id],
  });
  assert.equal(r.ma, 201, JSON.stringify(r.than));
  const nv = await truy_van_mot<{ vi_tri_chinh_id: string | null; chuc_danh: string | null }>(
    'select vi_tri_chinh_id, chuc_danh from nhan_vien where id = $1', [String(r.than['id'])]);
  assert.equal(nv?.vi_tri_chinh_id, vt_phu_id);
  assert.equal(nv?.chuc_danh, 'Chuyên viên kiểm thử nội bộ');
});

test('vi tri khong ton tai: 400 va KHONG tao ho so nao', async () => {
  const truoc = await truy_van_mot<{ so: number }>('select count(*)::int as so from nhan_vien');
  const r = await goi({
    ho_ten: 'Người Có Vị Trí Sai', khoi_id: khoi_vp, ngay_vao: '2026-05-31',
    tu_cap_pin: true, tao_tk_he_thong: false,
    vi_tri_ids: ['00000000-0000-4000-8000-000000000000'],
  });
  assert.equal(r.ma, 400, JSON.stringify(r.than));
  assert.match(String(r.than['loi']), /vị trí/i);
  const sau = await truy_van_mot<{ so: number }>('select count(*)::int as so from nhan_vien');
  assert.equal(sau?.so, truoc?.so, 'giao dich phai cuon lai — khong tao ho so nua vời');
});

// ================================================================ hop dong lao dong khi tao ho so
test('chon loai hop dong: tao hop_dong_lao_dong dung loai + ngay het han', async () => {
  const r = await goi({
    ho_ten: 'Đặng Thị Hợp Đồng', khoi_id: khoi_vp, ngay_vao: '2026-05-31',
    tu_cap_pin: true, tao_tk_he_thong: false,
    loai_hop_dong: 'xac_dinh', thoi_han_thang: 6,
  });
  assert.equal(r.ma, 201, JSON.stringify(r.than));
  const hd = await truy_van_mot<{
    loai: string; hieu_luc_tu: string; hieu_luc_den: string | null; trang_thai: string;
  }>(
    `select loai, to_char(hieu_luc_tu, 'YYYY-MM-DD') as hieu_luc_tu,
            to_char(hieu_luc_den, 'YYYY-MM-DD') as hieu_luc_den, trang_thai
       from hop_dong_lao_dong where nhan_vien_id = $1`, [String(r.than['id'])]);
  assert.equal(hd?.loai, 'xac_dinh');
  assert.equal(hd?.hieu_luc_tu, '2026-05-31', 'ngay vao lam la ngay hieu luc');
  assert.equal(hd?.hieu_luc_den, '2026-11-30', '6 thang tinh tu 31/05, thang 11 chi co 30 ngay');
  assert.equal(hd?.trang_thai, 'hieu_luc');
});

test('hop dong khong xac dinh ki han: khong dat hieu_luc_den; thieu ki han thi 400', async () => {
  const r = await goi({
    ho_ten: 'Bùi Văn Vô Hạn', khoi_id: khoi_vp, ngay_vao: '2026-05-31',
    tu_cap_pin: true, tao_tk_he_thong: false,
    loai_hop_dong: 'khong_xac_dinh',
  });
  assert.equal(r.ma, 201, JSON.stringify(r.than));
  const hd = await truy_van_mot<{ hieu_luc_den: string | null }>(
    `select to_char(hieu_luc_den, 'YYYY-MM-DD') as hieu_luc_den
       from hop_dong_lao_dong where nhan_vien_id = $1`, [String(r.than['id'])]);
  assert.equal(hd?.hieu_luc_den, null);

  const truoc = await truy_van_mot<{ so: number }>('select count(*)::int as so from nhan_vien');
  const sai = await goi({
    ho_ten: 'Thiếu Kì Hạn', khoi_id: khoi_vp, ngay_vao: '2026-05-31',
    tu_cap_pin: true, tao_tk_he_thong: false,
    loai_hop_dong: 'xac_dinh',
  });
  assert.equal(sai.ma, 400, JSON.stringify(sai.than));
  assert.match(String(sai.than['loi']), /6 tháng hoặc 1 năm/);
  const sau = await truy_van_mot<{ so: number }>('select count(*)::int as so from nhan_vien');
  assert.equal(sau?.so, truoc?.so, 'khong duoc tao ho so khi hop dong thieu ki han');
});

// ================================================================ tai khoan Microsoft cho nguoi lap ho so
test('nguoi lap ho so nhan chuong tai khoan Microsoft + mat khau khoi tao', async () => {
  const email = 'ban.giao@tranhoangvietnam.com';
  const r = await goi({
    ho_ten: 'Hoàng Văn Bàn Giao', khoi_id: khoi_vp, ngay_vao: '2026-05-31',
    email, tu_cap_pin: true, tao_tk_ms365: true, tao_tk_he_thong: false,
  });
  assert.equal(r.ma, 201, JSON.stringify(r.than));
  const tk = r.than['tai_khoan_ms365'] as Record<string, unknown>;
  assert.equal(tk['upn'], email, 'UPN chinh la email ho so');
  const mk = String(tk['mat_khau']);
  assert.ok(mk.length >= 12, 'phai sinh mat khau khoi tao');

  // `gui_ngam` khong chan phan hoi — cho toi da 3 giay cho dung thong bao cua lan tao nay.
  const doc = (): Promise<{ tieu_de: string; noi_dung: string }[]> =>
    truy_van<{ tieu_de: string; noi_dung: string }>(
      `select tieu_de, noi_dung from thong_bao_rieng
        where nguoi_dung_id = $1 and noi_dung like '%' || $2 || '%'`, [admin_id, email]);
  let tb = await doc();
  for (let i = 0; i < 30 && tb.length === 0; i++) {
    await new Promise((xong) => setTimeout(xong, 100));
    tb = await doc();
  }
  assert.ok(tb.length > 0, 'nguoi lap ho so phai nhan chuong tai khoan Microsoft');
  assert.ok(tb.some((x) => x.tieu_de.includes(email) && x.noi_dung.includes(mk)),
    'chuong phai mang UPN + mat khau khoi tao de ban giao');
  assert.ok(tb.some((x) => x.noi_dung.includes('đổi mật khẩu')),
    'noi dung phai nhac nhan vien doi mat khau o lan dang nhap dau');
});

// ================================================================ cap lai ma nhan su
// CAP LAI MA LA VIEC CUA IT, khong co nut tren giao dien: doi ma la doi danh tinh (ten thu muc
// kho tep, lech ma ben cong). Bo kiem goi thang module ma lenh IT dung — khong qua HTTP, vi
// he thong khong mo route nay ra web.
const {
  cap_lai_ma_hang_loat, cap_lai_ma_nhan_su, danh_sach_ma_cu,
} = await import('../src/dinh_danh/cap_lai_ma.ts');

/** Tao mot nguoi dung ma kieu cu, kem dong ma dinh danh nhu migration 025 da backfill. */
async function tao_nguoi_ma_cu(ma: string, khoi_id: string | null): Promise<string> {
  const nv = await truy_van_mot<{ id: string }>(
    `insert into nhan_vien(ma_nv, ho_ten, khoi_id, ngay_vao, dang_hoat_dong)
     values ($1, 'Nguyễn Văn Cũ', $2, '2026-05-20', true) returning id`,
    [ma, khoi_id]);
  await thuc_thi(
    `insert into ma_dinh_danh(nhan_vien_id, he_thong, ma, ma_chuan, nguon)
     values ($1, 'noi_bo', $2, upper($2), 'di_tru')`,
    [nv!.id, ma]);
  return nv!.id;
}

test('danh sach ma cu: liet ke nguoi chua dung khuon, kem ma du kien', async () => {
  const id = await tao_nguoi_ma_cu('ERP69', khoi_vp);
  const ds = await danh_sach_ma_cu();
  const dong = ds.find((d) => d.id === id);
  assert.ok(dong !== undefined, 'phai co nguoi vua tao trong danh sach ma cu');
  assert.equal(dong?.ma_nv, 'ERP69');
  assert.equal(dong?.ma_du_kien, 'NVVP0526####', 'ma du kien ghep tu ma ngan khoi + thang vao lam');
  assert.equal(dong?.ngay_sinh_ma, '2026-05-20', 'lay ngay vao lam chu khong phai hom nay');
});

test('cap lai ma: ma cu dong lai (giu lich su), cot ma_nv doi, ra khoi danh sach ma cu', async () => {
  const id = await tao_nguoi_ma_cu('NV0156', khoi_vp);
  const r = await cap_lai_ma_nhan_su(id);
  assert.match(r.ma_moi, /^NVVP0526\d{4,}$/, `ma moi phai dung khuon: ${r.ma_moi}`);
  assert.equal(r.ma_cu, 'NV0156');
  assert.equal(r.ma_cu_dung_khuon, false);
  assert.ok(r.canh_bao.some((c) => c.includes('cổng phân quyền')),
    `phai canh bao ma ben cong van la ma cu, nhan duoc: ${JSON.stringify(r.canh_bao)}`);

  const nv = await truy_van_mot<{ ma_nv: string }>(
    'select ma_nv from nhan_vien where id = $1', [id]);
  assert.equal(nv?.ma_nv, r.ma_moi, 'cot ma_nv phai doi theo');

  // Ma cu khong bi xoa: dong lai de lich su van tra loi duoc "ma nay tung cua ai".
  const md = await truy_van<{ ma: string; hieu_luc_den: string | null }>(
    `select ma, hieu_luc_den from ma_dinh_danh
      where nhan_vien_id = $1 and he_thong = 'noi_bo' order by hieu_luc_tu`,
    [id]);
  assert.equal(md.length, 2, 'phai co dong ma cu va dong ma moi');
  assert.equal(md[0]?.ma, 'NV0156');
  assert.ok(md[0]?.hieu_luc_den !== null, 'ma cu phai duoc dong lai');
  assert.equal(md[1]?.ma, r.ma_moi);
  assert.equal(md[1]?.hieu_luc_den, null, 'ma moi dang hieu luc');

  const sau = await danh_sach_ma_cu();
  assert.ok(!sau.some((d) => d.id === id), 'cap lai xong thi ra khoi danh sach ma cu');
});

test('cap lai ma hai lan: so thu tu tang, khong dung lai ma vua cap', async () => {
  const id = await tao_nguoi_ma_cu('TAM14', khoi_vp);
  const l1 = await cap_lai_ma_nhan_su(id);
  const l2 = await cap_lai_ma_nhan_su(id);
  assert.notEqual(l1.ma_moi, l2.ma_moi);
  assert.equal(l2.ma_cu, l1.ma_moi, 'lan hai dong lai ma cua lan mot');
  const so1 = Number(/(\d{4,})$/.exec(l1.ma_moi)?.[1] ?? 0);
  const so2 = Number(/(\d{4,})$/.exec(l2.ma_moi)?.[1] ?? 0);
  assert.ok(so2 > so1, `so thu tu phai tang: ${String(so1)} -> ${String(so2)}`);
});

test('cap lai ma khi chua gan khoi: bao loi ro rang (khong doan khoi)', async () => {
  const nv = await truy_van_mot<{ id: string }>(
    `insert into nhan_vien(ma_nv, ho_ten, dang_hoat_dong)
     values ('BGD', 'Người Không Khối', true) returning id`);
  await assert.rejects(
    () => cap_lai_ma_nhan_su(nv!.id),
    (loi: Error) => /khối/.test(loi.message),
    'phai bao loi ve khoi, khong tu doan');
});

test('xem truoc: khoi mac dinh duoc tinh ngay trong ban chay thu', async () => {
  const nv = await truy_van_mot<{ id: string }>(
    `insert into nhan_vien(ma_nv, ho_ten, ngay_vao, dang_hoat_dong)
     values ('HR-03', 'Người Xem Trước', '2026-05-20', true) returning id`);
  // Khong truyen khoi mac dinh: ban xem truoc phai noi that la chua sinh duoc ma.
  const khong_mac_dinh = (await danh_sach_ma_cu()).find((d) => d.id === nv!.id);
  assert.equal(khong_mac_dinh?.ma_du_kien, '');
  // Truyen khoi mac dinh: phai ra DUNG ma se cap. Truoc day ban chay thu bo qua tham so nay nen
  // nguoi chay thu thay "chua gan khoi", them --that, roi moi nguoi do bi cap ma khac y.
  const co_mac_dinh = (await danh_sach_ma_cu(khoi_vp)).find((d) => d.id === nv!.id);
  assert.equal(co_mac_dinh?.ma_du_kien, 'NVVP0526####');
  assert.equal(co_mac_dinh?.khoi_ten !== null, true, 'phai hien ten khoi mac dinh');
  // Xem truoc KHONG duoc ghi khoi vao ho so — chi buoc --that moi gan.
  const trong_csdl = await truy_van_mot<{ khoi_id: string | null }>(
    'select khoi_id from nhan_vien where id = $1', [nv!.id]);
  assert.equal(trong_csdl?.khoi_id, null, 'xem truoc khong duoc ghi khoi vao ho so');

  // Khoi mac dinh khong co trong danh muc: bao loi ngay, khong lang le bo qua tung nguoi.
  await assert.rejects(
    () => danh_sach_ma_cu('khong_co_khoi_nay'),
    (loi: Error) => /khối/.test(loi.message));
});

test('hang loat: chon khoi mac dinh thi nguoi chua gan khoi cung duoc cap ma', async () => {
  const nv = await truy_van_mot<{ id: string }>(
    `insert into nhan_vien(ma_nv, ho_ten, dang_hoat_dong)
     values ('HR-01', 'Người Chưa Khối', true) returning id`);
  const kq = await cap_lai_ma_hang_loat(() => {}, khoi_vp);
  const dong = kq.da_cap.find((d) => d.id === nv!.id);
  assert.ok(dong !== undefined, 'phai cap ma cho nguoi chua gan khoi khi co khoi mac dinh');
  // Ho so khong co ngay_vao nen MMYY lay theo ngay TAO HO SO (hom nay), khong phai 0526.
  assert.match(dong!.ma_moi, /^NVVP\d{4}\d{4,}$/, `ma phai dung khuon: ${dong!.ma_moi}`);
  // Chon khoi mac dinh la GAN khoi that: ma phai nhat quan voi du lieu ho so.
  const sau = await truy_van_mot<{ khoi_id: string | null }>(
    'select khoi_id from nhan_vien where id = $1', [nv!.id]);
  assert.equal(sau?.khoi_id, khoi_vp, 'khoi mac dinh duoc ghi vao ho so');
});

test('hang loat: khoi chua khai ma ngan thi bo qua, khong bia ra ma', async () => {
  const khoi = await truy_van_mot<{ id: string }>(
    `insert into khoi(ma, ten) values ('kt_khong_ma', 'Khoi kiem thu khong ma ngan')
     on conflict (ma) do update set ma_ngan = null returning id`);
  const id = await tao_nguoi_ma_cu('HR-02', khoi!.id);
  const ds = await danh_sach_ma_cu();
  const dong = ds.find((d) => d.id === id);
  assert.equal(dong?.ma_du_kien, '', 'khong co ma ngan thi khong doan ma');
  const kq = await cap_lai_ma_hang_loat(() => {});
  const bo_qua = kq.bo_qua.find((d) => d.id === id);
  assert.ok(bo_qua !== undefined,
    `phai bo qua nguoi thuoc khoi chua khai ma ngan, nhan duoc: `
    + `${JSON.stringify(kq.bo_qua)} / ${JSON.stringify(kq.loi)}`);
  assert.match(bo_qua!.ly_do, /mã ngắn/, 'ly do phai noi ro thieu ma ngan chu khong phai loi chung');
  assert.equal(kq.da_cap.some((d) => d.id === id), false);
});

test('hang loat: chi cap cho nguoi con ma cu, chay lai khong dung toi nguoi da doi', async () => {
  const truoc = await danh_sach_ma_cu();
  const id_truoc = new Set(truoc.map((d) => d.id));
  const kq = await cap_lai_ma_hang_loat(() => {});
  for (const d of kq.da_cap) {
    assert.ok(id_truoc.has(d.id),
      `chi nguoi con ma cu moi bi doi, nhan duoc ${d.ma_cu} (${d.ho_ten})`);
  }
  // Chay lai ngay: khong ai bi doi lan hai, vi khong con ai mang ma kieu cu.
  const lai = await cap_lai_ma_hang_loat(() => {});
  assert.deepEqual(lai.da_cap, [], 'chay lai khong duoc doi ma cua ai nua');
});
