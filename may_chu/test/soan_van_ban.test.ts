// Soan van ban AI — kiem bang GoiLlm GIA, khong can mang hay khoa DeepSeek.
//
// Kiem ba dieu cot loi cua dac ta:
//   1. AI chi sinh van xuoi — dau ra chuan hoa dung khuon cua tung loai.
//   2. Prompt co boi canh (ai -> ai), muc dich, ma tran giong, cam PII, cam "U Liễu".
//   3. AI tra JSON sai khuon thi nem LoiSoanVanBan ma 'khuon_dang' de vong lap tu sua xu ly.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { soan_van_ban, LoiSoanVanBan, chuan_hoa_van_ai } from '../src/ai/soan_van_ban.ts';
import { prompt_soan, type BoiCanhSoan } from '../src/ai/prompt_soan.ts';
import type { GoiLlm } from '../src/ai/kieu.ts';

const BOI_CANH: BoiCanhSoan = {
  loai: 'thong_bao',
  quan_he: 'noi_bo',
  pham_vi: 'toan_cong_ty',
  ben_ban_hanh: 'CÔNG TY TNHH TRẦN HOÀNG VIỆT NAM',
  nguoi_ky: 'Trần Đức Hoàng',
  chuc_vu_nguoi_ky: 'GIÁM ĐỐC',
  ben_nhan: 'toàn thể cán bộ, nhân viên Công ty',
  muc_dich: 'Phổ biến chính sách',
  muc_do: 'khan',
  can_giai_trinh: true,
  het_han: null,
  ngay_nghi_viec: null,
};

/** GoiLlm gia tra dung chuoi da cho, dem so lan goi. */
function llm_gia(cho: string): { goi: GoiLlm; so_lan: () => number } {
  let lan = 0;
  return {
    goi: async () => { lan++; return cho; },
    so_lan: () => lan,
  };
}

test('thong bao: parse dung van xuoi', async () => {
  const { goi } = llm_gia(JSON.stringify({
    trich_yeu: 'Về việc đổi phần mềm chấm công',
    kinh_gui: [],
    noi_dung: ['Doan thu nhat.', 'Doan thu hai.'],
  }));
  const kq = await soan_van_ban(goi, BOI_CANH, 'doi phan mem cham cong, quet van tay du');
  assert.equal(kq.trich_yeu, 'Về việc đổi phần mềm chấm công');
  assert.deepEqual(kq.noi_dung, ['Doan thu nhat.', 'Doan thu hai.']);
});

test('cong van: trich yeu khong co "V/v" duoc chuan hoa; thieu kinh_gui la loi khuon dang', async () => {
  const bc = { ...BOI_CANH, loai: 'cong_van' as const, quan_he: 'doi_ngoai' as const };
  const { goi } = llm_gia(JSON.stringify({
    trich_yeu: 'phối hợp bàn giao dữ liệu',
    kinh_gui: ['Quý Công ty'],
    noi_dung: ['Trân trọng đề nghị Quý Công ty phối hợp.'],
  }));
  const kq = await soan_van_ban(goi, bc, 'phoi hop');
  assert.ok(kq.trich_yeu.startsWith('V/v'), 'cong van phai bat dau bang V/v');

  const thieu = llm_gia(JSON.stringify({ trich_yeu: 'V/v x', kinh_gui: [], noi_dung: ['x.'] }));
  await assert.rejects(() => soan_van_ban(thieu.goi, bc, 'x'), (loi: unknown) =>
    loi instanceof LoiSoanVanBan && loi.ma === 'khuon_dang');
});

test('quyet dinh: bat buoc can_cu va dieu', async () => {
  const bc = { ...BOI_CANH, loai: 'quyet_dinh' as const };
  const thieu = llm_gia(JSON.stringify({
    trich_yeu: 'Về việc ban hành nội quy', kinh_gui: [], noi_dung: ['Giam doc QUYẾT ĐỊNH:'],
  }));
  await assert.rejects(() => soan_van_ban(thieu.goi, bc, 'x'), (loi: unknown) =>
    loi instanceof LoiSoanVanBan && loi.ma === 'khuon_dang');

  const du = llm_gia(JSON.stringify({
    trich_yeu: 'Về việc ban hành nội quy', kinh_gui: [],
    can_cu: ['Bộ luật Lao động 2019'], dieu: ['Moi nguoi phai tuan thu.'],
    noi_dung: ['Giam doc QUYẾT ĐỊNH:'],
  }));
  const kq = await soan_van_ban(du.goi, bc, 'x');
  assert.equal(kq.dieu?.length, 1);
});

test('AI tra khong phai JSON -> loi khuon dang (de vong lap tu sua thu lai)', async () => {
  const { goi } = llm_gia('day khong phai json');
  await assert.rejects(() => soan_van_ban(goi, BOI_CANH, 'x'), (loi: unknown) =>
    loi instanceof LoiSoanVanBan && loi.ma === 'khuon_dang');
});

test('GoiLlm nem loi -> LoiSoanVanBan ma llm (de route chuyen fallback khong-LLM)', async () => {
  const goi: GoiLlm = async () => { throw new Error('mat mang'); };
  await assert.rejects(() => soan_van_ban(goi, BOI_CANH, 'x'), (loi: unknown) =>
    loi instanceof LoiSoanVanBan && loi.ma === 'llm');
});

test('prompt: co boi canh ai -> ai, ma tran giong, cam PII va cam "U Liễu"', () => {
  const p = prompt_soan(BOI_CANH, 'doi phan mem cham cong');
  assert.ok(p.includes('CÔNG TY TNHH TRẦN HOÀNG VIỆT NAM'), 'co ben ban hanh');
  assert.ok(p.includes('toàn thể cán bộ, nhân viên Công ty'), 'co ben nhan');
  assert.ok(p.includes('Wuliu'), 'co quy uoc THVN');
  assert.ok(p.includes('U Liễu'), 'cam viet "U Liễu"');
  assert.ok(p.includes('CCCD'), 'cam PII');
  assert.ok(p.includes('QUYẾT ĐỊNH:'), 'quy tac the thuc ND30');
  assert.ok(p.includes('khẩn'), 'muc do khan duoc dua vao giong');
  assert.ok(p.includes('doi phan mem cham cong'), 'co noi dung tho');
});

test('chuan_hoa_van_ai: bo khong phai doi tuong JSON', () => {
  assert.throws(() => chuan_hoa_van_ai('thong_bao', [1, 2]), LoiSoanVanBan);
  assert.throws(() => chuan_hoa_van_ai('thong_bao', null), LoiSoanVanBan);
});

test('chuan_hoa_van_ai: thong bao / quyet dinh BO kinh_gui (NĐ30 chi cong van moi co)', () => {
  const tho = { trich_yeu: 'Về việc x', kinh_gui: ['Toàn thể CBNV'], noi_dung: ['x.'] };
  const tb = chuan_hoa_van_ai('thong_bao', tho);
  assert.deepEqual(tb.kinh_gui, []);
  const qd = chuan_hoa_van_ai('quyet_dinh', {
    trich_yeu: 'Về việc y', kinh_gui: ['Toàn thể CBNV'],
    can_cu: ['Luật X'], dieu: ['Điều 1.'], noi_dung: ['y.'],
  });
  assert.deepEqual(qd.kinh_gui, []);
  const cv = chuan_hoa_van_ai('cong_van', tho);
  assert.deepEqual(cv.kinh_gui, ['Toàn thể CBNV']);
});

test('chuan_hoa_van_ai: bo dong "Kính gửi" AI loi viet vao noi_dung cua thong bao / quyet dinh', () => {
  const kinh = 'Kính gửi: Toàn thể cán bộ, nhân viên Công ty.';
  const tb = chuan_hoa_van_ai('thong_bao', {
    trich_yeu: 'Về việc x', kinh_gui: [], noi_dung: [kinh, 'Đoạn thật.'],
  });
  assert.deepEqual(tb.noi_dung, ['Đoạn thật.']);
  const qd = chuan_hoa_van_ai('quyet_dinh', {
    trich_yeu: 'Về việc y', kinh_gui: [],
    can_cu: ['Luật X'], dieu: ['Điều 1.'], noi_dung: [kinh, 'QUYẾT ĐỊNH:', 'Điều 1.'],
  });
  assert.deepEqual(qd.noi_dung, ['QUYẾT ĐỊNH:', 'Điều 1.']);
  // Công văn cũng bỏ dòng Kính gửi khỏi than bai — in rieng tu truong kinh_gui.
  const cv = chuan_hoa_van_ai('cong_van', {
    trich_yeu: 'V/v x', kinh_gui: ['Quý Công ty'], noi_dung: [kinh, 'Nội dung thật.'],
  });
  assert.deepEqual(cv.noi_dung, ['Nội dung thật.']);
  assert.deepEqual(cv.kinh_gui, ['Quý Công ty']);
});

test('chuan_hoa_van_ai: bo dong nguoi nhan KHONG co chu "Kính gửi" (bien the AI lach)', () => {
  const nguoi_nhan = 'Toàn thể cán bộ, nhân viên Công ty TNHH Trần Hoàng Việt Nam.';
  const tb = chuan_hoa_van_ai('thong_bao', {
    trich_yeu: 'Về việc x', kinh_gui: [], noi_dung: [nguoi_nhan, 'Đoạn thật.'],
  });
  assert.deepEqual(tb.noi_dung, ['Đoạn thật.']);
  // Dong co hanh dong la cau van thuc — phai GIU.
  const giu = chuan_hoa_van_ai('thong_bao', {
    trich_yeu: 'Về việc x', kinh_gui: [],
    noi_dung: ['Toàn thể cán bộ, nhân viên phải thực hiện nghiêm túc.'],
  });
  assert.deepEqual(giu.noi_dung, ['Toàn thể cán bộ, nhân viên phải thực hiện nghiêm túc.']);
});

test('chuan_hoa_van_ai: thong bao / quyet dinh trich yeu phai bat dau "Về việc", khong "V/v"', () => {
  const tb_vv = chuan_hoa_van_ai('thong_bao', {
    trich_yeu: 'V/v phổ biến kết quả kiểm tra', kinh_gui: [], noi_dung: ['x.'],
  });
  assert.equal(tb_vv.trich_yeu, 'Về việc phổ biến kết quả kiểm tra');
  const tb_thieu = chuan_hoa_van_ai('thong_bao', {
    trich_yeu: 'đổi giờ làm việc', kinh_gui: [], noi_dung: ['x.'],
  });
  assert.equal(tb_thieu.trich_yeu, 'Về việc đổi giờ làm việc');
  const qd_vv = chuan_hoa_van_ai('quyet_dinh', {
    trich_yeu: 'V/v ban hành nội quy', kinh_gui: [],
    can_cu: ['Luật X'], dieu: ['Điều 1.'], noi_dung: ['QUYẾT ĐỊNH:'],
  });
  assert.equal(qd_vv.trich_yeu, 'Về việc ban hành nội quy');
  // Cong van van la "V/v".
  const cv = chuan_hoa_van_ai('cong_van', {
    trich_yeu: 'phối hợp', kinh_gui: ['Quý Công ty'], noi_dung: ['x.'],
  });
  assert.equal(cv.trich_yeu, 'V/v phối hợp');
});

test('chuan_hoa_van_ai: bo tien to "Căn cứ" AI tu chen san trong can_cu', () => {
  const qd = chuan_hoa_van_ai('quyet_dinh', {
    trich_yeu: 'Về việc x', kinh_gui: [],
    can_cu: ['Căn cứ Bộ luật Lao động 2019', 'Điều lệ Công ty'],
    dieu: ['Điều 1.'], noi_dung: ['QUYẾT ĐỊNH:'],
  });
  assert.deepEqual(qd.can_cu, ['Bộ luật Lao động 2019', 'Điều lệ Công ty']);
});
