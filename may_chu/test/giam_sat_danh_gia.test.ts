// Test rule engine: cach dieu kien duoc noi bang AND, va cach no xu ly cau hinh hong.
//
// `chay_dieu_kien` la ham THUAN theo nghia no chi goi `pd.do(ctx, ...)` — ngu canh duoc tiem
// vao, nen test khong can CSDL that lan ket noi ERP 1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LoiCanQuet } from '../src/giam_sat/danh_gia.ts';
import type { NguCanh } from '../src/giam_sat/phep_do/kieu.ts';

// `cau_hinh.ts` doc bien moi truong ngay khi nap, nen phai dat truoc va import DONG —
// dung khuon cua `tinh_cong.test.ts`.
process.env['JWT_SECRET'] ??= 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['DATABASE_URL'] ??= 'postgres://khong_dung@localhost:5432/khong_dung';
process.env['DEVICE_TZ_OFFSET_HOURS'] ??= '7';

const { chay_dieu_kien } = await import('../src/giam_sat/danh_gia.ts');

/** Ngu canh gia: khong doc gi ca. Phep do that khong duoc goi trong cac test nay. */
const ctx_gia: NguCanh = {
  doc: async () => [],
  doc_noi_bo: async () => [],
  bay_gio: new Date('2026-09-02T03:00:00Z'),
};

function loi(dieu_kien: LoiCanQuet['dieu_kien']): LoiCanQuet {
  return {
    loai_loi_id: '11111111-1111-1111-1111-111111111111',
    loai_loi_ma: 'THU', loai_loi_ten: 'Thử', muc_do: 'trung', dieu_kien,
  };
}

function dk(phep_do: string, toan_tu: string, nguong: number) {
  return {
    id: 'x', loai_loi_id: 'y', phep_do, tham_so: {}, toan_tu, nguong,
  };
}

test('phep do khong ton tai: bo qua va ghi ly do, KHONG nem loi', async () => {
  // Mot dong cau hinh cu (ma phep do da bi doi ten) khong duoc lam sap ca vong quet.
  const kq = await chay_dieu_kien(loi([dk('ma_khong_co_that', '>=', 1)]), ctx_gia);
  assert.equal(kq.khop.length, 0);
  assert.equal(kq.bo_qua.length, 1);
  assert.match(kq.bo_qua[0] ?? '', /không tồn tại/);
});

test('phep do chua trien khai: bo qua kem ly do, KHONG tra 0 dong im lang', async () => {
  // Day la diem mau chot: `chi_vuot_han_muc` khong chay duoc vi ERP 1 khong luu so tien han
  // muc. Neu no am tham tra 0 dong thi nguoi dung tuong "khong co khoan chi nao vuot".
  const kq = await chay_dieu_kien(loi([dk('chi_vuot_han_muc', '>', 0)]), ctx_gia);
  assert.equal(kq.khop.length, 0);
  assert.equal(kq.bo_qua.length, 1);
  assert.match(kq.bo_qua[0] ?? '', /chưa triển khai/);
  assert.match(kq.bo_qua[0] ?? '', /hạn mức/);
});

test('loai loi khong co dieu kien nao: tra ve rong, khong doc gi', async () => {
  const kq = await chay_dieu_kien(loi([]), ctx_gia);
  assert.equal(kq.khop.length, 0);
  assert.equal(kq.so_doc, 0);
  assert.equal(kq.bo_qua.length, 0);
});

// ---------------------------------------------------------------- AND nhieu dieu kien
//
// Dung phep do THAT nhung tiem du lieu qua `ctx.doc`, de test di qua dung duong ma
// production di qua.

/** Ngu canh tra ve san mot tap dong cho moi cau truy van. */
function ctx_voi(dong: Record<string, unknown>[]): NguCanh {
  return {
    doc: async () => dong as never,
    doc_noi_bo: async () => [] as never,
    bay_gio: new Date('2026-09-02T03:00:00Z'),
  };
}

test('mot dieu kien: chi giu dong vuot nguong', async () => {
  // `co_hoi_khong_dinh_danh` tra ve gia_tri = 1 cho moi co hoi thieu dinh danh.
  const ctx = ctx_voi([
    { Id: 1, sysCode: 'CH1', ClientCode: null, ClientName: 'A', Phone: null,
      ProductName: 'x', UserId: 7, CustomerId: null, OrderId: null, status: 1, Level: 0,
      ProductWeight: 0, Volume: 0, CreatedUtcDate: '2026-09-01T00:00:00Z' },
    { Id: 2, sysCode: 'CH2', ClientCode: 'KH01', ClientName: 'B', Phone: '0912345678',
      ProductName: 'y', UserId: 8, CustomerId: 5, OrderId: null, status: 1, Level: 0,
      ProductWeight: 0, Volume: 0, CreatedUtcDate: '2026-09-01T00:00:00Z' },
  ]);
  const kq = await chay_dieu_kien(loi([dk('co_hoi_khong_dinh_danh', '>=', 1)]), ctx);
  assert.equal(kq.khop.length, 1, 'chi co hoi 1 thieu ca ma khach lan so dien thoai');
  assert.equal(kq.khop[0]?.dong.thuc_the_khoa, '1');
});

test('hai dieu kien noi bang AND: chi giu dong khop CA HAI', async () => {
  // Co hoi 1: thieu dinh danh (khop dk1) VA sao 5 nhung khoi luong 0 (khop dk2).
  // Co hoi 2: thieu dinh danh (khop dk1) nhung sao dung voi khoi luong (KHONG khop dk2).
  const ctx = ctx_voi([
    { Id: 1, sysCode: 'CH1', ClientCode: null, ClientName: 'A', Phone: null,
      ProductName: 'x', UserId: 7, CustomerId: null, OrderId: null, status: 1, Level: 5,
      ProductWeight: 0, Volume: 0, CreatedUtcDate: '2026-09-01T00:00:00Z' },
    { Id: 2, sysCode: 'CH2', ClientCode: null, ClientName: 'B', Phone: null,
      ProductName: 'y', UserId: 8, CustomerId: null, OrderId: null, status: 1, Level: 0,
      ProductWeight: 0, Volume: 0, CreatedUtcDate: '2026-09-01T00:00:00Z' },
  ]);
  const kq = await chay_dieu_kien(loi([
    dk('co_hoi_khong_dinh_danh', '>=', 1),
    dk('co_hoi_sao_bat_thuong', '>=', 1),
  ]), ctx);
  assert.equal(kq.khop.length, 1, 'chi co hoi 1 khop ca hai dieu kien');
  assert.equal(kq.khop[0]?.dong.thuc_the_khoa, '1');
  assert.equal(kq.khop[0]?.dieu_kien_khop.length, 2, 'bang chung neu du ca hai dieu kien');
});

test('AND: giao rong thi tra ve rong', async () => {
  const ctx = ctx_voi([
    { Id: 2, sysCode: 'CH2', ClientCode: 'KH', ClientName: 'B', Phone: '0912345678',
      ProductName: 'y', UserId: 8, CustomerId: 5, OrderId: null, status: 1, Level: 0,
      ProductWeight: 0, Volume: 0, CreatedUtcDate: '2026-09-01T00:00:00Z' },
  ]);
  const kq = await chay_dieu_kien(loi([
    dk('co_hoi_khong_dinh_danh', '>=', 1),
    dk('co_hoi_sao_bat_thuong', '>=', 1),
  ]), ctx);
  assert.equal(kq.khop.length, 0);
});

test('toan tu la: KHONG khop — tha bo sot con hon bat oan', async () => {
  const ctx = ctx_voi([
    { Id: 1, sysCode: 'CH1', ClientCode: null, ClientName: 'A', Phone: null,
      ProductName: 'x', UserId: 7, CustomerId: null, OrderId: null, status: 1, Level: 0,
      ProductWeight: 0, Volume: 0, CreatedUtcDate: '2026-09-01T00:00:00Z' },
  ]);
  const kq = await chay_dieu_kien(loi([dk('co_hoi_khong_dinh_danh', 'xxx', 1)]), ctx);
  assert.equal(kq.khop.length, 0, 'toan tu khong hieu duoc thi khong ket toi ai');
});

test('bang chung ghi lai dung nguong va gia tri da dung', async () => {
  const ctx = ctx_voi([
    { Id: 1, sysCode: 'CH1', ClientCode: null, ClientName: 'A', Phone: null,
      ProductName: 'x', UserId: 7, CustomerId: null, OrderId: null, status: 1, Level: 0,
      ProductWeight: 0, Volume: 0, CreatedUtcDate: '2026-09-01T00:00:00Z' },
  ]);
  const kq = await chay_dieu_kien(loi([dk('co_hoi_khong_dinh_danh', '>=', 1)]), ctx);
  const d = kq.khop[0]?.dieu_kien_khop[0];
  assert.equal(d?.phep_do, 'co_hoi_khong_dinh_danh');
  assert.equal(d?.toan_tu, '>=');
  assert.equal(d?.nguong, 1);
  assert.equal(d?.gia_tri, 1);
});
