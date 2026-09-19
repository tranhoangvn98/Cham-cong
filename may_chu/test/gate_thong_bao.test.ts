// Gate G1..G18 (REQ-14) — LAM TRUOC khi noi ban hanh.
//
// Moi muc gate co it nhat mot case DUNG va mot case CO TINH SAI, dung tep docx gia sinh boi
// `ghi_docx` co san (khong can Python). Neu mot trong nhung case nay do ma khong ai sua,
// nghia la mot van ban sai the thuc da lot ra toi nhan vien.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { chay_gate, dat_tat_ca, muc_loi } from '../src/ai/gate_kiem_tra.ts';
import type { KetQuaGate, SpecVanBan } from '../src/ai/kieu.ts';
import {
  docx_du, docx_gia, spec_cong_van, spec_mau, spec_quyet_dinh,
} from './tien_ich_van_ban.ts';

/** Tra ve ket qua cua mot muc gate theo ma. */
function muc(kq: KetQuaGate[], ma: string): KetQuaGate {
  const k = kq.find((x) => x.ma_check === ma);
  assert.ok(k !== undefined, `thieu muc gate ${ma}`);
  return k;
}

/** Chay gate voi docx du va tra danh sach muc. */
async function chay(spec: SpecVanBan, docx: Buffer | null = docx_du(spec)): Promise<KetQuaGate[]> {
  return chay_gate(spec, docx);
}

// ---------------------------------------------------------------- G1 loai

test('G1: loai hop le dat; loai la dat loi', async () => {
  const du = await chay(spec_mau());
  assert.ok(muc(du, 'G1').dat);
  const sai = await chay(spec_mau({ loai: 'hop_dong' as never }));
  assert.equal(muc(sai, 'G1').dat, false);
});

// ---------------------------------------------------------------- G2 co quan

test('G2: thieu ten co quan la loi', async () => {
  const kq = await chay(spec_mau({ co_quan_ban_hanh: '   ' }));
  assert.equal(muc(kq, 'G2').dat, false);
});

// ---------------------------------------------------------------- G3 so ky hieu

test('G3: ban du thao chua co so van dat; so sai khuon la loi', async () => {
  const du = await chay(spec_mau());
  assert.ok(muc(du, 'G3').dat);

  const sai_tb = await chay(spec_mau({ du_thao: false, so_ky_hieu: 'CV-12/THVN' }));
  assert.equal(muc(sai_tb, 'G3').dat, false);

  const sai_cv = await chay(spec_cong_van({ du_thao: false, so_ky_hieu: '12/THVN-CV' }));
  assert.equal(muc(sai_cv, 'G3').dat, false, 'cong van khong duoc chua "CV"');

  const dung = await chay(spec_mau({ du_thao: false, so_ky_hieu: '12/2026/TB-CTTHVN' }));
  assert.ok(muc(dung, 'G3').dat);
});

// ---------------------------------------------------------------- G4 cong van

test('G4: cong van dung dac thu dat; thieu kinh gui / in ten loai la loi', async () => {
  const du = await chay(spec_cong_van());
  assert.ok(muc(du, 'G4').dat);

  const thieu_kinh = await chay(spec_cong_van({ kinh_gui: [] }));
  assert.equal(muc(thieu_kinh, 'G4').dat, false);

  const in_ten_loai = await chay(spec_cong_van({ ten_loai: 'CÔNG VĂN' }));
  assert.equal(muc(in_ten_loai, 'G4').dat, false);

  const thieu_vv = await chay(spec_cong_van({ trich_yeu: 'phối hợp bàn giao dữ liệu' }));
  assert.equal(muc(thieu_vv, 'G4').dat, false, 'cong van trich yeu phai bat dau V/v');
});

// ---------------------------------------------------------------- G5 quyet dinh

test('G5: quyet dinh thieu can cu hoac thieu Dieu la loi', async () => {
  const du = await chay(spec_quyet_dinh());
  assert.ok(muc(du, 'G5').dat);

  const thieu_can_cu = await chay(spec_quyet_dinh({ can_cu: [] }));
  assert.equal(muc(thieu_can_cu, 'G5').dat, false);

  const thieu_dieu = await chay(spec_quyet_dinh({ dieu: [] }));
  assert.equal(muc(thieu_dieu, 'G5').dat, false);
});

test('G8: loi dan quyet dinh thieu "QUYẾT ĐỊNH:" la loi LLM (tu goi lai AI)', async () => {
  const thieu_loi_dan = await chay(spec_quyet_dinh({ noi_dung: ['Loi dan khong chua khoi quyet dinh.'] }));
  const g8 = muc(thieu_loi_dan, 'G8');
  assert.equal(g8.dat, false);
  assert.equal(g8.loai_loi, 'llm');
});

// ---------------------------------------------------------------- G6 ngay

test('G6: ngay khong ton tai (thang 13) la loi', async () => {
  const kq = await chay(spec_mau({ ngay: '2026-13-40' }));
  assert.equal(muc(kq, 'G6').dat, false);
});

// ---------------------------------------------------------------- G7 nguoi ky

test('G7: thieu chuc vu hoac thieu nguoi ky la loi', async () => {
  const thieu_cv = await chay(spec_mau({ chuc_vu_nguoi_ky: '' }));
  assert.equal(muc(thieu_cv, 'G7').dat, false);
  const thieu_ten = await chay(spec_mau({ nguoi_ky: '' }));
  assert.equal(muc(thieu_ten, 'G7').dat, false);
});

// ---------------------------------------------------------------- G8 noi dung co thuc (llm)

test('G8: noi dung rong hoac doan cuoi khong ket thuc dau cham la loi LLM', async () => {
  const rong = await chay(spec_mau({ noi_dung: [] }));
  const g8_rong = muc(rong, 'G8');
  assert.equal(g8_rong.dat, false);
  assert.equal(g8_rong.loai_loi, 'llm');

  const khong_cham = await chay(spec_mau({ noi_dung: ['Doan khong ket thuc dau cham'] }));
  assert.equal(muc(khong_cham, 'G8').dat, false);
});
test('G8: thong bao trich yeu "V/v" hoac dong nguoi nhan trong noi_dung la loi', async () => {
  const vv = await chay(spec_mau({ trich_yeu: 'V/v phổ biến kết quả kiểm tra' }));
  assert.equal(muc(vv, 'G8').dat, false);

  const nguoi_nhan = await chay(spec_mau({
    noi_dung: ['Toàn thể cán bộ, nhân viên Công ty TNHH Trần Hoàng Việt Nam.', 'Đoạn thật.'],
  }));
  assert.equal(muc(nguoi_nhan, 'G8').dat, false);

  // Dong co hanh dong van dat.
  const co_hanh_dong = await chay(spec_mau({
    noi_dung: ['Toàn thể cán bộ, nhân viên phải thực hiện nghiêm túc.'],
  }));
  assert.ok(muc(co_hanh_dong, 'G8').dat);
});

test('G8: "Kính gửi" nam GIUA doan cua thong bao cung la loi (AI lach dau dong)', async () => {
  const giua_doan = await chay(spec_mau({
    noi_dung: ['Nay Công ty thông báo như sau. Kính gửi toàn thể cán bộ, nhân viên. ' +
      'Mọi người nghiêm túc thực hiện.'],
  }));
  assert.equal(muc(giua_doan, 'G8').dat, false);
});

test('G8: loi dan quyet dinh khong duoc lap lai can cu da liet ke', async () => {
  const lap = await chay(spec_quyet_dinh({
    noi_dung: ['Căn cứ Bộ luật Lao động 2019, Giám đốc QUYẾT ĐỊNH:'],
  }));
  assert.equal(muc(lap, 'G8').dat, false);

  const khong_lap = await chay(spec_quyet_dinh());
  assert.ok(muc(khong_lap, 'G8').dat);
});
// ---------------------------------------------------------------- G9 thuat ngu (llm)

test('G9: chu "U Liễu" la loi LLM; "Wuliu" viet dung thi dat', async () => {
  const u_lieu = await chay(spec_mau({ noi_dung: ['Cong ty lam U Liễu o bien gioi.'] }));
  const g9 = muc(u_lieu, 'G9');
  assert.equal(g9.dat, false);
  assert.equal(g9.loai_loi, 'llm');

  const wuliu_dung = await chay(spec_mau({
    noi_dung: ['Cong ty hoat dong linh vuc Wuliu va uy thac XNK.'],
  }));
  assert.ok(muc(wuliu_dung, 'G9').dat);

  const wuliu_sai = await chay(spec_mau({ noi_dung: ['Cong ty lam wuliu.'] }));
  assert.equal(muc(wuliu_sai, 'G9').dat, false, 'viet thuong "wuliu" la sai');

  const wullu_sai = await chay(spec_mau({ noi_dung: ['Hoat dong kinh doanh Wullu.'] }));
  assert.equal(muc(wullu_sai, 'G9').dat, false, 'viet "Wullu" (hai chu l) la sai');
});

// ---------------------------------------------------------------- G10 PII (canh bao mem)

test('G10: PII pham vi rong chi CANH BAO, khong chan ban hanh', async () => {
  const co_sdt = await chay(spec_mau({
    noi_dung: ['Lien he so 0912345678 de duoc ho tro.'],
  }));
  assert.equal(muc(co_sdt, 'G10').dat, false, 'phat hien PII');
  assert.ok(dat_tat_ca(co_sdt), 'G10 la canh bao mem — khong chan ban hanh');

  const ca_nhan = await chay(spec_mau({ pham_vi: 'ca_nhan', nhan_vien_id: '9f0e9a12-0000-4000-8000-000000000001', phong_ban_id: null }));
  assert.ok(muc(ca_nhan, 'G10').dat, 'ca nhan chi dung ten + chuc danh');
});

// ---------------------------------------------------------------- G11 pham vi - id

test('G11: ca_nhan thieu nhan_vien_id la loi; toan_cong_ty thua id la loi', async () => {
  const thieu = await chay(spec_mau({ pham_vi: 'ca_nhan', nhan_vien_id: null, phong_ban_id: null }));
  assert.equal(muc(thieu, 'G11').dat, false);

  const thua = await chay(spec_mau({
    pham_vi: 'toan_cong_ty', nhan_vien_id: null,
    phong_ban_id: '9f0e9a12-0000-4000-8000-000000000001',
  }));
  assert.equal(muc(thua, 'G11').dat, false);

  const dung = await chay(spec_mau({
    pham_vi: 'phong_ban', nhan_vien_id: null,
    phong_ban_id: '9f0e9a12-0000-4000-8000-000000000001',
  }));
  assert.ok(muc(dung, 'G11').dat);
});

// ---------------------------------------------------------------- G12 placeholder (llm)

test('G12: con placeholder "[...]" hay "TODO" la loi LLM', async () => {
  const ngoac = await chay(spec_mau({ noi_dung: ['Vui long dien [ten phong ban] vao day.'] }));
  const g12 = muc(ngoac, 'G12');
  assert.equal(g12.dat, false);
  assert.equal(g12.loai_loi, 'llm');

  const todo = await chay(spec_mau({ noi_dung: ['TODO: kiem tra lai.'] }));
  assert.equal(muc(todo, 'G12').dat, false);
});

// ---------------------------------------------------------------- G13..G17 tep docx

test('G13: khong co tep docx la loi build; tep nho hon 3KB la loi', async () => {
  const khong_tep = await chay(spec_mau(), null);
  assert.equal(muc(khong_tep, 'G13').dat, false);

  const nho = await chay(spec_mau(), docx_gia(['Mot dong duy nhat.']));
  assert.equal(muc(nho, 'G13').dat, false);

  const du = await chay(spec_mau());
  assert.ok(muc(du, 'G13').dat);
});

test('G14: docx thieu ten co quan la loi', async () => {
  const docx = docx_du(spec_mau());
  // Thay ten co quan bang chu khac bang cach dung spec khac nhung docx cua spec cu.
  const kq = await chay_gate(spec_mau({ co_quan_ban_hanh: 'CÔNG TY KHÁC' }), docx);
  assert.equal(muc(kq, 'G14').dat, false);
});

test('G15: docx thieu Quoc hieu – Tieu ngu la loi', async () => {
  const docx = docx_gia(['Chi co mot dong van ban.'.repeat(300)]);
  const kq = await chay_gate(spec_mau(), docx);
  assert.equal(muc(kq, 'G15').dat, false);
});

test('G16: cong van thieu "Kính gửi" trong docx la loi', async () => {
  const spec = spec_cong_van();
  const docx_thieu = docx_gia([
    'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 'Độc lập - Tự do - Hạnh phúc', spec.co_quan_ban_hanh,
    'Số: DỰ THẢO', spec.trich_yeu, 'Nội dung công văn.'.repeat(200),
  ]);
  const kq = await chay_gate(spec, docx_thieu);
  assert.equal(muc(kq, 'G16').dat, false);
});

test('G16: thong bao / quyet dinh co dong "Kính gửi" trong docx la loi (NĐ30)', async () => {
  const docx_co_kinh = docx_gia([
    'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 'Độc lập - Tự do - Hạnh phúc',
    spec_mau().co_quan_ban_hanh, 'Số: DỰ THẢO',
    'Kính gửi: Toàn thể cán bộ, nhân viên.', 'Nội dung thông báo.'.repeat(200),
  ]);
  const tb = await chay_gate(spec_mau(), docx_co_kinh);
  assert.equal(muc(tb, 'G16').dat, false);
  const qd = await chay_gate(spec_quyet_dinh(), docx_co_kinh);
  assert.equal(muc(qd, 'G16').dat, false);
});

test('G17: ban cuoi phai in so ky hieu that; ban du thao phai co "DỰ THẢO"', async () => {
  const cuoi = spec_mau({ du_thao: false, so_ky_hieu: '12/2026/TB-CTTHVN' });
  const docx_cuoi = docx_du(cuoi);
  assert.ok(muc(await chay_gate(cuoi, docx_cuoi), 'G17').dat);

  // Docx du thao (in DỰ THẢO) dem di ban hanh voi so that -> G17 loi: ban duyet khac ban hanh.
  const kq = await chay_gate(cuoi, docx_du(spec_mau()));
  assert.equal(muc(kq, 'G17').dat, false);

  // Nguoc lai: ban cuoi in so ma thieu watermark cua ban thao.
  const thao = spec_mau({ du_thao: true });
  const kq2 = await chay_gate(thao, docx_cuoi);
  assert.equal(muc(kq2, 'G17').dat, false);
});

// ---------------------------------------------------------------- tong the

test('spec + docx hop le: tat ca gate dat (tru G10 khong bat) va dat_tat_ca = true', async () => {
  const kq = await chay(spec_mau());
  assert.deepEqual(muc_loi(kq), [], `con muc loi: ${muc_loi(kq).map((k) => k.ma_check).join(',')}`);
  assert.ok(dat_tat_ca(kq));

  const kq_cv = await chay(spec_cong_van());
  assert.ok(dat_tat_ca(kq_cv), 'cong van du cung phai dat');

  const kq_qd = await chay(spec_quyet_dinh());
  assert.ok(dat_tat_ca(kq_qd), 'quyet dinh du cung phai dat');
});
