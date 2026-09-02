// Test van tay phat hien sua len.
//
// Ba tinh chat phai dung, va ca ba deu tung la nguon loi that o cac he thong kieu nay:
//   1. Du lieu khong doi -> van tay khong doi (khong thi bao dong gia moi vong quet)
//   2. Truong theo doi doi -> van tay doi (khong thi bo sot chinh cai can bat)
//   3. Thu tu khoa doi -> van tay KHONG doi (khong thi sua mot cau SELECT la bao "toan bo
//      ban ghi vua bi sua")
import { test } from 'node:test';
import assert from 'node:assert/strict';

// `cau_hinh.ts` doc bien moi truong ngay khi nap, nen phai dat truoc va import DONG —
// dung khuon cua `tinh_cong.test.ts`.
process.env['JWT_SECRET'] ??= 'khoa_kiem_thu_du_dai_de_khong_bi_tu_choi_0001';
process.env['DATABASE_URL'] ??= 'postgres://khong_dung@localhost:5432/khong_dung';
process.env['DEVICE_TZ_OFFSET_HOURS'] ??= '7';

const { van_tay, truong_da_doi } = await import('../src/giam_sat/anh_chup.ts');

test('van tay on dinh khi du lieu khong doi', () => {
  const a = { Total: 1000, MissaStatus: 1, SaleCode: 'BH1' };
  assert.equal(van_tay(a), van_tay({ ...a }));
});

test('van tay KHONG phu thuoc thu tu khoa', () => {
  // Day la tinh chat quan trong nhat. Thu tu cot tra ve tu Postgres doi khi ai do sua cau
  // SELECT; neu van tay phu thuoc thu tu thi mot lan sua truy van se sinh hang nghin canh
  // bao gia trong mot vong quet.
  assert.equal(
    van_tay({ Total: 1000, MissaStatus: 1, SaleCode: 'BH1' }),
    van_tay({ SaleCode: 'BH1', Total: 1000, MissaStatus: 1 }),
  );
});

test('van tay doi khi mot truong theo doi doi', () => {
  const a = { Total: 1000, MissaStatus: 1 };
  assert.notEqual(van_tay(a), van_tay({ Total: 999, MissaStatus: 1 }));
  assert.notEqual(van_tay(a), van_tay({ Total: 1000, MissaStatus: 2 }));
});

test('null va undefined coi nhu nhau', () => {
  // Mot cot doi tu NULL sang "khong co trong ket qua" khong phai la sua du lieu.
  assert.equal(van_tay({ a: null, b: 1 }), van_tay({ a: undefined, b: 1 }));
});

test('van tay phan biet duoc so 1 voi chuoi "1"? — KHONG, va do la co y', () => {
  // pg tra ve numeric duoi dang chuoi tuy cau hinh type parser. Neu van tay phan biet kieu
  // thi mot thay doi cau hinh parser se bao "moi ban ghi deu bi sua". Gia tri moi la thu
  // dang quan tam, khong phai kieu JavaScript cua no.
  assert.equal(van_tay({ Total: 1000 }), van_tay({ Total: '1000' }));
});

test('van tay la sha256 hex', () => {
  const vt = van_tay({ a: 1 });
  assert.equal(vt.length, 64);
  assert.match(vt, /^[0-9a-f]{64}$/);
});

test('truong_da_doi liet ke dung cot da doi, da sap xep', () => {
  const truoc = { Total: 1000, MissaStatus: 1, SaleCode: 'BH1' };
  const sau = { Total: 900, MissaStatus: 1, SaleCode: 'BH2' };
  assert.deepEqual(truong_da_doi(truoc, sau), ['SaleCode', 'Total']);
});

test('truong_da_doi voi ban ghi moi (chua co anh chup) tra ve rong', () => {
  assert.deepEqual(truong_da_doi(null, { Total: 1000 }), []);
});

test('truong_da_doi coi null va chuoi rong la nhu nhau', () => {
  // Tranh bao dong khi ERP 1 doi mot cot tu NULL sang '' — do khong phai sua so tien.
  assert.deepEqual(truong_da_doi({ Note: null }, { Note: '' }), []);
});
