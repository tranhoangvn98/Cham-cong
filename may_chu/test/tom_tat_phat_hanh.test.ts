// Tong hop phat hanh — AI chi lam giong noi, fallback deterministic khi LLM loi.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tom_tat_kho, tom_tat_phat_hanh } from '../src/ai/tom_tat_phat_hanh.ts';
import type { MucPhatHanh } from '../src/ai/doc_changelog.ts';

const CAC_MUC: MucPhatHanh[] = [
  {
    phien_ban: '1.105.3', ngay: '2026-09-24',
    tieu_de: ['Tính năng hòm thư ý kiến.'],
    cac_y: ['- Nơi tiếp nhận góp ý.', '- Phản hồi qua email.'],
  },
  {
    phien_ban: '1.105.2', ngay: '2026-09-24',
    tieu_de: ['Sửa lỗi mạng.'],
    cac_y: ['- Không phụ thuộc mạng ngoài.'],
  },
];

test('LLM tra JSON dung khuon thi dung ket qua LLM', async () => {
  const kq = await tom_tat_phat_hanh(CAC_MUC, async () =>
    JSON.stringify({ tieu_de: 'Chấm công có tính năng mới', noi_dung: '- Hòm thư ý kiến\n- Sửa lỗi' }));
  assert.equal(kq.tieu_de, 'Chấm công có tính năng mới');
  assert.match(kq.noi_dung, /Hòm thư ý kiến/);
});

test('LLM tra thieu truong thi dung ban deterministic', async () => {
  const kq = await tom_tat_phat_hanh(CAC_MUC, async () =>
    JSON.stringify({ tieu_de: '   ' }));
  assert.match(kq.tieu_de, /phiên bản/);
  assert.match(kq.noi_dung, /Tính năng hòm thư ý kiến/);
});

test('LLM nem loi (thieu khoa / mang) thi van co ban deterministic', async () => {
  const kq = await tom_tat_phat_hanh(CAC_MUC, async () => {
    throw new Error('khong goi duoc LLM');
  });
  assert.match(kq.tieu_de, /phiên bản/);
  assert.match(kq.noi_dung, /1\.105\.3/);
});

test('LLM tra chuoi khong phai JSON thi fallback, khong nem loi', async () => {
  const kq = await tom_tat_phat_hanh(CAC_MUC, async () => 'toi khong phai json');
  assert.match(kq.tieu_de, /phiên bản/);
});

test('tom_tat_kho: mot muc ghi dung mot phien ban, nhieu muc ghi khoang', () => {
  const mot = tom_tat_kho([CAC_MUC[0] as MucPhatHanh]);
  assert.equal(mot.tieu_de, 'Cập nhật phần mềm Chấm công — phiên bản 1.105.3');
  const nhieu = tom_tat_kho(CAC_MUC);
  assert.match(nhieu.tieu_de, /1\.105\.2–1\.105\.3/);
  assert.match(nhieu.noi_dung, /Sửa lỗi mạng/);
});
