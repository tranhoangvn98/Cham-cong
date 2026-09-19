// Vong lap tu sua — chi loi LLM moi goi lai AI; loi code dung ngay (khong ton tien).
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { xu_ly_tu_sua, LoiGateCode, LoiHetLuot } from '../src/ai/vong_lap_tu_sua.ts';
import type { BoSinhDocx, GoiLlm } from '../src/ai/kieu.ts';
import type { BoiCanhSoan } from '../src/ai/prompt_soan.ts';
import type { TruongHeThong } from '../src/ai/kieu.ts';
import { docx_du, spec_mau } from './tien_ich_van_ban.ts';
import type { SpecVanBan } from '../src/ai/kieu.ts';

const BOI_CANH: BoiCanhSoan = {
  loai: 'thong_bao',
  quan_he: 'noi_bo',
  pham_vi: 'toan_cong_ty',
  ben_ban_hanh: 'CÔNG TY TNHH TRẦN HOÀNG VIỆT NAM',
  nguoi_ky: 'Trần Đức Hoàng',
  chuc_vu_nguoi_ky: 'GIÁM ĐỐC',
  ben_nhan: 'toàn thể cán bộ, nhân viên Công ty',
  muc_dich: 'Phổ biến chính sách',
  muc_do: 'thuong',
  can_giai_trinh: false,
  het_han: null,
  ngay_nghi_viec: null,
};

const HE_THONG: TruongHeThong = {
  co_quan_ban_hanh: 'CÔNG TY TNHH TRẦN HOÀNG VIỆT NAM',
  dia_danh: 'Lạng Sơn',
  ngay: '2026-09-07',
  nguoi_ky: 'Trần Đức Hoàng',
  chuc_vu_nguoi_ky: 'GIÁM ĐỐC',
  noi_nhan: ['Toàn thể cán bộ, nhân viên'],
};

const NGUOI_NHAN = { nhan_vien_id: null, phong_ban_id: null };

/** GoiLlm gia tra lan luot cac chuoi — het thi lap chuoi cuoi. */
function llm_lan_luot(...cac: string[]): { goi: GoiLlm; so_lan: () => number } {
  let lan = 0;
  return {
    goi: async () => {
      const cho = cac[Math.min(lan, cac.length - 1)] as string;
      lan++;
      return cho;
    },
    so_lan: () => lan,
  };
}

/** Bo sinh docx gia: dung docx DU cho spec vua ghep (moi truong kiem doc lai duoc). */
const DUNG_DOCX_GIA: BoSinhDocx = {
  dung: async (spec: SpecVanBan) => docx_du(spec),
};

const VAN_AI_TOT = JSON.stringify({
  trich_yeu: 'Về việc đổi phần mềm chấm công',
  kinh_gui: [],
  noi_dung: ['Doan thu nhat.', 'Doan thu hai.'],
});
const VAN_AI_U_LIEU = JSON.stringify({
  trich_yeu: 'Về việc kiểm tra quy trình',
  kinh_gui: [],
  noi_dung: ['Cong ty lam U Liễu o bien gioi.'],
});

test('lan dau da dat: khong goi lai AI', async () => {
  const llm = llm_lan_luot(VAN_AI_TOT);
  const kq = await xu_ly_tu_sua(BOI_CANH, 'doi phan mem cham cong', HE_THONG, NGUOI_NHAN,
    'toan_cong_ty', 'noi_bo', 'thong_bao',
    { goi_llm: llm.goi, dung_docx: DUNG_DOCX_GIA, so_lan_toi_da: 2 });
  assert.equal(kq.so_lan_thu, 0);
  assert.equal(llm.so_lan(), 1);
});

test('truot G9 ("U Liễu") thi goi lai AI va sua duoc', async () => {
  const llm = llm_lan_luot(VAN_AI_U_LIEU, VAN_AI_TOT);
  const kq = await xu_ly_tu_sua(BOI_CANH, 'x', HE_THONG, NGUOI_NHAN,
    'toan_cong_ty', 'noi_bo', 'thong_bao',
    { goi_llm: llm.goi, dung_docx: DUNG_DOCX_GIA, so_lan_toi_da: 2 });
  assert.equal(kq.so_lan_thu, 1);
  assert.equal(llm.so_lan(), 2, 'goi lai dung mot lan');
});

test('het luot van loi LLM: nem LoiHetLuot kem ket qua gate', async () => {
  const llm = llm_lan_luot(VAN_AI_U_LIEU);
  await assert.rejects(
    () => xu_ly_tu_sua(BOI_CANH, 'x', HE_THONG, NGUOI_NHAN,
      'toan_cong_ty', 'noi_bo', 'thong_bao',
      { goi_llm: llm.goi, dung_docx: DUNG_DOCX_GIA, so_lan_toi_da: 2 }),
    (loi: unknown) => loi instanceof LoiHetLuot && loi.ket_qua_gate.length > 0,
  );
  assert.equal(llm.so_lan(), 3, '1 lan dau + 2 lan thu lai');
});

test('loi CODE (thieu nguoi ky): nem LoiGateCode, KHONG goi lai AI', async () => {
  const llm = llm_lan_luot(VAN_AI_TOT);
  await assert.rejects(
    () => xu_ly_tu_sua(BOI_CANH, 'x', { ...HE_THONG, nguoi_ky: '' }, NGUOI_NHAN,
      'toan_cong_ty', 'noi_bo', 'thong_bao',
      { goi_llm: llm.goi, dung_docx: DUNG_DOCX_GIA, so_lan_toi_da: 2 }),
    LoiGateCode,
  );
  assert.equal(llm.so_lan(), 1, 'loi code khong ton luot AI');
});

test('AI tra JSON sai khuon: thu lai, sau do dat', async () => {
  const llm = llm_lan_luot('khong phai json', VAN_AI_TOT);
  const kq = await xu_ly_tu_sua(BOI_CANH, 'x', HE_THONG, NGUOI_NHAN,
    'toan_cong_ty', 'noi_bo', 'thong_bao',
    { goi_llm: llm.goi, dung_docx: DUNG_DOCX_GIA, so_lan_toi_da: 2 });
  assert.equal(kq.so_lan_thu, 1);
  assert.equal(llm.so_lan(), 2);
});

// Dung lai spec_mau chi de bao dam helper dong bo voi test gate.
void spec_mau;
