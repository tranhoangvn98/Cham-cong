// Parser CHANGELOG — nguon "tinh nang moi" cua tinh nang cong bo phat hanh.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cac_phien_ban, muc_chua_cong_bo, phan_tich_changelog } from '../src/ai/doc_changelog.ts';

const MAU = `# Nhật ký thay đổi

Theo [SemVer](https://semver.org/lang/vi/).

## [1.105.3] — 2026-09-24

**Văn bản yêu cầu Cổng cấp token dịch vụ.**

- Nêu vấn đề và thông số token cần cấp.
  Dòng nối tiếp thụt đầu dòng.

## [1.105.1] — 2026-09-23

**Cập nhật hồ sơ nhân sự.**

- Route mới.

## [1.105.0] — 2026-09-22

**Tính năng một.**

- Mô tả một.

**Tính năng hai.**

- Mô tả hai.

## [1.104.8]

**Webhook ERP1.**

- Mô tả.
`;

test('tach cac muc theo thu tu trong tep (moi nhat truoc)', () => {
  const muc = phan_tich_changelog(MAU);
  assert.equal(muc.length, 4);
  assert.equal(muc[0]?.phien_ban, '1.105.3');
  assert.equal(muc[0]?.ngay, '2026-09-24');
  assert.equal(muc[3]?.phien_ban, '1.104.8');
});

test('dong tieu de tinh nang + bullet noi tiep duoc gop', () => {
  const muc = phan_tich_changelog(MAU);
  const dau = muc[0];
  assert.ok(dau !== undefined);
  assert.deepEqual(dau.tieu_de, ['Văn bản yêu cầu Cổng cấp token dịch vụ.']);
  assert.equal(dau.cac_y[0], 'Nêu vấn đề và thông số token cần cấp. Dòng nối tiếp thụt đầu dòng.');
});

test('mot phien ban co the co nhieu dong tieu de', () => {
  const muc = phan_tich_changelog(MAU);
  const da_nang = muc[2];
  assert.ok(da_nang !== undefined);
  assert.deepEqual(da_nang.tieu_de, ['Tính năng một.', 'Tính năng hai.']);
});

test('muc khong ghi ngay thi ngay la chuoi rong', () => {
  const muc = phan_tich_changelog(MAU);
  assert.equal(muc[3]?.ngay, '');
});

test('cac_phien_ban giu thu tu trong tep', () => {
  const muc = phan_tich_changelog(MAU);
  assert.deepEqual(cac_phien_ban(muc), ['1.105.3', '1.105.1', '1.105.0', '1.104.8']);
});

test('muc_chua_cong_bo: moi hon ban da cong bo, toi ban chon', () => {
  const muc = phan_tich_changelog(MAU);
  const khoang = muc_chua_cong_bo(muc, '1.104.8', '1.105.1');
  assert.deepEqual(cac_phien_ban(khoang), ['1.105.1', '1.105.0']);
});

test('muc_chua_cong_bo: ban da cong bo khong con trong CHANGELOG thi lay tu dau', () => {
  const muc = phan_tich_changelog(MAU);
  const khoang = muc_chua_cong_bo(muc, '1.103.0', '1.104.8');
  assert.deepEqual(cac_phien_ban(khoang), ['1.105.3', '1.105.1', '1.105.0', '1.104.8']);
});

test('muc_chua_cong_bo: phien ban dich khong co thi tra rong', () => {
  const muc = phan_tich_changelog(MAU);
  assert.deepEqual(muc_chua_cong_bo(muc, '1.104.8', '9.9.9'), []);
});
