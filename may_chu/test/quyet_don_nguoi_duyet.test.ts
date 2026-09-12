// Chan quyet don ma khong ro nguoi duyet.
//
// Ban dieu hanh chot: he thong KHONG duoc duyet don duoi mot nguoi dung khong ro rang. Guard nay
// nam NGAY DAU quyet_don, truoc moi truy van CSDL, nen kiem duoc ma khong can DB: truyen
// nguoi_duyet_id rong/null thi nem loi truoc khi cham vao bang.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { quyet_don } = await import('../src/don_tu/nghiep_vu.ts');

const ID_GIA = '00000000-0000-0000-0000-000000000000';

test('quyet_don chan nguoi_duyet_id rong', async () => {
  await assert.rejects(
    () => quyet_don(ID_GIA, 'da_duyet', '', null),
    /không rõ người duyệt/i,
  );
});

test('quyet_don chan nguoi_duyet_id null', async () => {
  await assert.rejects(
    () => quyet_don(ID_GIA, 'da_duyet', null as unknown as string, null),
    /không rõ người duyệt/i,
  );
});

test('quyet_don chan nguoi_duyet_id undefined', async () => {
  await assert.rejects(
    () => quyet_don(ID_GIA, 'tu_choi', undefined as unknown as string, null),
    /không rõ người duyệt/i,
  );
});
