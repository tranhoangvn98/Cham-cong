// Cong kiem tra bang code — gate G1..G18 cua dac ta DTKT 01 (muc 7/9).
//
// PASS <=> moi muc dat, TRU G10 (canh bao mem ve PII — nguoi duyet xem lai, khong chan).
// Phan loai loi:
//   loai_loi='code' -> loi deterministic, sua bang logic, KHONG duoc ton luot AI.
//   loai_loi='llm'  -> loi van xuoi cua AI (G8/G9/G12), moi duoc kick goi lai AI.
//
// Sau khi tach truong he thong khoi AI, cac gate `code` gan nhu luon dat — giu de chong
// hoi quy khi ai do sua ghep_spec / cap_so / build_vbhc.py.
import { trich_docx } from '../tien_ich/doc_office.ts';
import { tach_ngay } from './ghep_spec.ts';
import { kiem_tra_so_ky_hieu } from './cap_so.ts';
import { la_dong_nguoi_nhan } from './soan_van_ban.ts';
import type { KetQuaGate, SpecVanBan } from './kieu.ts';

const CAC_LOAI = new Set(['thong_bao', 'quyet_dinh', 'cong_van']);

/** Tron moi van xuoi (kinh gui, can cu, dieu, noi dung) thanh mot chuoi de kiem. */
export function van_xuoi_gop(spec: SpecVanBan): string {
  return [spec.trich_yeu, ...spec.kinh_gui, ...spec.can_cu, ...spec.dieu, ...spec.noi_dung]
    .join('\n');
}

/** Tach chuoi thanh cac doan khong rong. */
function doan_khong_rong(danh_sach: string[]): string[] {
  return danh_sach.map((s) => s.trim()).filter((s) => s !== '');
}

// ---------------------------------------------------------------- cac muc kiem

function kiem_g1(spec: SpecVanBan): KetQuaGate {
  return { ma_check: 'G1', dat: CAC_LOAI.has(spec.loai),
    ly_do: `loai = ${spec.loai}`, loai_loi: 'code' };
}

function kiem_g2(spec: SpecVanBan): KetQuaGate {
  return { ma_check: 'G2', dat: spec.co_quan_ban_hanh.trim() !== '',
    ly_do: spec.co_quan_ban_hanh.trim() === '' ? 'Thieu ten co quan ban hanh.' : 'Co co quan.',
    loai_loi: 'code' };
}

function kiem_g3(spec: SpecVanBan): KetQuaGate {
  if (spec.so_ky_hieu === null) {
    // Ban du thao chua cap so — kiem nay chi ap cho ban cuoi (xem gate o buoc ban hanh).
    return { ma_check: 'G3', dat: true, ly_do: 'Ban du thao chua co so.', loai_loi: 'code' };
  }
  const dat = kiem_tra_so_ky_hieu(spec.loai, spec.so_ky_hieu);
  return { ma_check: 'G3', dat,
    ly_do: dat ? `So ky hieu dung khuon: ${spec.so_ky_hieu}.`
      : `So ky hieu sai khuon: ${spec.so_ky_hieu}.`, loai_loi: 'code' };
}

function kiem_g4(spec: SpecVanBan): KetQuaGate {
  if (spec.loai !== 'cong_van') {
    return { ma_check: 'G4', dat: true, ly_do: 'Khong phai cong van.', loai_loi: 'code' };
  }
  const loi: string[] = [];
  if (spec.ten_loai !== '') loi.push('in ten loai');
  if (spec.kinh_gui.length === 0) loi.push('thieu kinh_gui');
  if (spec.trich_yeu.trim() === '') loi.push('thieu trich_yeu');
  if (!/^v\/v\b/i.test(spec.trich_yeu.trim())) loi.push('trich yeu khong bat dau "V/v"');
  if (spec.so_ky_hieu !== null && spec.so_ky_hieu.includes('CV')) loi.push('ky hieu chua "CV"');
  return { ma_check: 'G4', dat: loi.length === 0,
    ly_do: loi.length === 0 ? 'Cong van dung dac thu.' : loi.join('; '), loai_loi: 'code' };
}

function kiem_g5(spec: SpecVanBan): KetQuaGate {
  if (spec.loai !== 'quyet_dinh') {
    return { ma_check: 'G5', dat: true, ly_do: 'Khong phai quyet dinh.', loai_loi: 'code' };
  }
  const loi: string[] = [];
  if (spec.can_cu.length === 0) loi.push('thieu can cu');
  if (spec.dieu.length === 0) loi.push('thieu Dieu');
  return { ma_check: 'G5', dat: loi.length === 0,
    ly_do: loi.length === 0 ? 'Quyet dinh du can cu va Dieu.' : loi.join('; '), loai_loi: 'code' };
}

function kiem_g6(spec: SpecVanBan): KetQuaGate {
  const t = tach_ngay(spec.ngay);
  const dat = t !== null && t.ngay_trong_thang >= 1 && t.ngay_trong_thang <= 31
    && t.thang >= 1 && t.thang <= 12 && t.nam >= 2000 && t.nam <= 2100;
  return { ma_check: 'G6', dat,
    ly_do: dat ? `Ngay hop le: ${spec.ngay}.` : `Ngay khong hop le: ${spec.ngay}.`,
    loai_loi: 'code' };
}

function kiem_g7(spec: SpecVanBan): KetQuaGate {
  const dat = spec.chuc_vu_nguoi_ky.trim() !== '' && spec.nguoi_ky.trim() !== '';
  return { ma_check: 'G7', dat,
    ly_do: dat ? 'Co chuc vu + nguoi ky.' : 'Thieu chuc vu hoac nguoi ky.', loai_loi: 'code' };
}

function kiem_g8(spec: SpecVanBan): KetQuaGate {
  const loi: string[] = [];
  if (spec.noi_dung.length === 0) loi.push('noi_dung rong');
  if (spec.noi_dung.some((d) => d.trim() === '')) loi.push('co khoi rong trong noi_dung');
  if (spec.dieu.some((d) => d.trim() === '')) loi.push('co Dieu rong');

  // ND30: trich yeu thong bao / quyet dinh bat dau "Về việc" — "V/v" chi danh cho cong van.
  if (spec.loai !== 'cong_van' && !/^về việc\b/i.test(spec.trich_yeu.trim())) {
    loi.push('trich yeu thong bao / quyet dinh phai bat dau "Về việc"');
  }
  // Dong nguoi nhan ("Kính gửi ..." / "Toàn thể ..." tro troi) khong duoc nam trong than bai.
  if (spec.noi_dung.some((d) => la_dong_nguoi_nhan(d))) {
    loi.push('co dong nguoi nhan trong noi_dung (phai o "Nơi nhận" / kinh_gui)');
  }
  // AI co the viet "Kính gửi" GIUA doan (khong phai dau dong) — cung phai chan de
  // vong lap tu sua goi lai AI thay vi de ban nhap chuyen thanh Lỗi.
  if (spec.loai !== 'cong_van' && /k(i|í)nh\s*g(u|ử)i/i.test(van_xuoi_gop(spec))) {
    loi.push('con chu "Kính gửi" trong van ban (thong bao / quyet dinh khong co dong nay)');
  }
  // Quyet dinh: can cu in RIENG o khoi "Căn cứ" — loi dan khong duoc lap lai chung.
  if (spec.loai === 'quyet_dinh' && spec.noi_dung.length > 0) {
    const can_cu_thu = spec.can_cu.map((c) => c.replace(/^căn cứ\s+/i, ''));
    const dau = spec.noi_dung[0] as string;
    if (can_cu_thu.some((c) => c.length >= 8 && dau.includes(c))) {
      loi.push('loi dan quyet dinh lap lai can cu da liet ke (can cu in rieng)');
    }
  }
  // Loi dan quyet dinh phai co dong "QUYẾT ĐỊNH:" — loi AI (llm) de vong lap tu sua.
  if (spec.loai === 'quyet_dinh' && !spec.noi_dung.some((d) => d.includes('QUYẾT ĐỊNH'))) {
    loi.push('loi dan thieu "QUYẾT ĐỊNH:"');
  }

  // Doan cuoi phai ket thuc bang dau cau (dac ta: "doan cuoi ./.").
  const moi = doan_khong_rong([...spec.noi_dung, ...spec.dieu]);
  if (moi.length > 0 && !/[.!)]$/.test(moi[moi.length - 1] as string)) {
    loi.push('doan cuoi khong ket thuc bang dau cham');
  }
  return { ma_check: 'G8', dat: loi.length === 0,
    ly_do: loi.length === 0 ? 'Noi dung co thuc.' : loi.join('; '), loai_loi: 'llm' };
}

function kiem_g9(spec: SpecVanBan): KetQuaGate {
  const chu = van_xuoi_gop(spec);
  const loi: string[] = [];
  if (/u\s*liễu/i.test(chu)) loi.push('co chu "U Liễu"');
  if (/\bwuliu\b/.test(chu)) loi.push('viet "wuliu" sai (phai la "Wuliu")');
  if (/\bwullu\b/i.test(chu)) loi.push('viet "Wullu" sai (phai la "Wuliu")');
  return { ma_check: 'G9', dat: loi.length === 0,
    ly_do: loi.length === 0 ? 'Thuat ngu chuan (Wuliu / uy thac XNK).' : loi.join('; '),
    loai_loi: 'llm' };
}

function kiem_g10(spec: SpecVanBan): KetQuaGate {
  // CANH BAO MEM: chi bat khi pham vi rong (ca nhan duoc dung ten + chuc danh toi thieu).
  if (spec.pham_vi === 'ca_nhan') {
    return { ma_check: 'G10', dat: true, ly_do: 'Ca nhan — PII toi thieu theo ND13.',
      loai_loi: 'code' };
  }
  const chu = van_xuoi_gop(spec);
  const canh_bao: string[] = [];
  if (/\b\d{12}\b/.test(chu)) canh_bao.push('co chuoi 12 chu so giong CCCD');
  if (/\b0\d{9}\b/.test(chu)) canh_bao.push('co chuoi giong so dien thoai');
  if (/(số tài khoản|stk|tài khoản ngân hàng)[^\d]{0,20}\d{6,}/i.test(chu)) {
    canh_bao.push('nhac so tai khoan');
  }
  if (/(lương|mức lương)[^\d]{0,30}\d[\d.,]{2,}/i.test(chu)) canh_bao.push('nhac muc luong');
  return { ma_check: 'G10', dat: canh_bao.length === 0,
    ly_do: canh_bao.length === 0 ? 'Khong thay PII.' : 'CANH BAO PII (ND13): ' + canh_bao.join('; '),
    loai_loi: 'code' };
}

function kiem_g11(spec: SpecVanBan): KetQuaGate {
  let dat = true;
  let ly_do = 'Pham vi nhat quan.';
  if (spec.pham_vi === 'ca_nhan' && (spec.nhan_vien_id === null || spec.phong_ban_id !== null)) {
    dat = false; ly_do = 'ca_nhan phai co nhan_vien_id va khong co phong_ban_id.';
  }
  if (spec.pham_vi === 'phong_ban' && spec.phong_ban_id === null) {
    dat = false; ly_do = 'phong_ban phai co phong_ban_id.';
  }
  if (spec.pham_vi === 'toan_cong_ty' && (spec.nhan_vien_id !== null || spec.phong_ban_id !== null)) {
    dat = false; ly_do = 'toan_cong_ty khong duoc gan id nguoi nhan.';
  }
  return { ma_check: 'G11', dat, ly_do, loai_loi: 'code' };
}

function kiem_g12(spec: SpecVanBan): KetQuaGate {
  const chu = van_xuoi_gop(spec);
  const loi: string[] = [];
  if (/\[[^\]]*\]/.test(chu)) loi.push('con dau ngoac vuong "[...]"');
  if (/\bTODO\b|\bXXX+\b/i.test(chu)) loi.push('con placeholder TODO/XXX');
  if (/<[^>]+>/.test(chu)) loi.push('con dau <...>');
  if (/chèn nội dung|chèn chữ/i.test(chu)) loi.push('con chu "chèn nội dung"');
  return { ma_check: 'G12', dat: loi.length === 0,
    ly_do: loi.length === 0 ? 'Khong con placeholder.' : loi.join('; '), loai_loi: 'llm' };
}

/** G13..G17 kiem TEP docx da build. Khong co tep -> tat ca fail (bao loi build). */
function kiem_tep_docx(spec: SpecVanBan, docx: Buffer | null): KetQuaGate[] {
  const khong_co = (ma: string): KetQuaGate => ({
    ma_check: ma, dat: false, ly_do: 'Khong co tep docx de kiem (build loi).', loai_loi: 'code',
  });
  if (docx === null) return ['G13', 'G14', 'G15', 'G16', 'G17'].map(khong_co);

  const kq: KetQuaGate[] = [];
  const kich = docx.length;
  kq.push({ ma_check: 'G13', dat: kich > 3 * 1024,
    ly_do: kich > 3 * 1024 ? `Tep docx ${kich} byte.` : `Tep docx qua nho: ${kich} byte.`,
    loai_loi: 'code' });

  const trich = trich_docx(docx);
  const chu = (trich?.doan ?? []).join('\n');
  if (trich === null || chu.trim() === '') {
    kq.push({ ma_check: 'G14', dat: false, ly_do: 'Docx khong doc duoc van ban.', loai_loi: 'code' });
    kq.push({ ma_check: 'G15', dat: false, ly_do: 'Docx khong doc duoc van ban.', loai_loi: 'code' });
    kq.push({ ma_check: 'G16', dat: false, ly_do: 'Docx khong doc duoc van ban.', loai_loi: 'code' });
    kq.push({ ma_check: 'G17', dat: false, ly_do: 'Docx khong doc duoc van ban.', loai_loi: 'code' });
    return kq;
  }

  // Ten co quan cat 2 dong xen ke voi quoc hieu trong bang dau thu -> kiem
  // theo TUNG TU cua ten co quan (gop khoang trang + dau xuong dong).
  const chu_chuan = chu.replace(/\s+/g, ' ');
  const co_co_quan = spec.co_quan_ban_hanh.split(/\s+/)
    .every((tu) => chu_chuan.includes(tu));
  kq.push({ ma_check: 'G14', dat: co_co_quan,
    ly_do: co_co_quan ? 'Docx co ten co quan.' : 'Docx THIEU ten co quan.', loai_loi: 'code' });

  const quoc_hieu = /CỘNG\s*HÒA|CỘNG\s*HOÀ/.test(chu);
  const tieu_ngu = /Độc lập\s*-\s*Tự do\s*-\s*Hạnh phúc/.test(chu);
  kq.push({ ma_check: 'G15', dat: quoc_hieu && tieu_ngu,
    ly_do: quoc_hieu && tieu_ngu ? 'Co Quoc hieu – Tieu ngu.' : 'Thieu Quoc hieu hoac Tieu ngu.',
    loai_loi: 'code' });

  if (spec.loai === 'cong_van') {
    const kinh = chu.includes('Kính gửi');
    const khong_ten = !chu.includes('CÔNG VĂN');
    kq.push({ ma_check: 'G16', dat: kinh && khong_ten,
      ly_do: kinh && khong_ten ? 'Cong van co Kinh gui, khong in ten loai.'
        : 'Cong van thieu "Kính gửi" hoac in ten loai.', loai_loi: 'code' });
  } else {
    // NĐ30: thong bao / quyet dinh khong co dong "Kính gửi" — nguoi nhan o "Nơi nhận".
    const co_kinh = chu.includes('Kính gửi');
    kq.push({ ma_check: 'G16', dat: !co_kinh,
      ly_do: co_kinh ? 'Thong bao / quyet dinh khong duoc co dong "Kính gửi".'
        : 'Khong phai cong van, khong co dong Kinh gui.', loai_loi: 'code' });
  }

  const co_so = chu.includes('Số:');
  const so_dung = spec.du_thao
    ? chu.includes('DỰ THẢO')
    : spec.so_ky_hieu !== null && chu.includes(spec.so_ky_hieu);
  kq.push({ ma_check: 'G17', dat: co_so && so_dung,
    ly_do: co_so && so_dung
      ? spec.du_thao ? 'O so co watermark "DỰ THẢO".' : `O so co so ky hieu ${spec.so_ky_hieu}.`
      : 'O so sai: thieu "Số:" hoac so ky hieu khong khop.',
    loai_loi: 'code' });

  return kq;
}

/**
 * Chay toan bo gate.
 *
 * `docx` la tep da build (Buffer). Truyen null khi build loi — G13..G17 se bao loi build.
 * G18 (render PDF) la tuy chon — bo o ban 1.
 */
export async function chay_gate(spec: SpecVanBan, docx: Buffer | null): Promise<KetQuaGate[]> {
  return [
    kiem_g1(spec),
    kiem_g2(spec),
    kiem_g3(spec),
    kiem_g4(spec),
    kiem_g5(spec),
    kiem_g6(spec),
    kiem_g7(spec),
    kiem_g8(spec),
    kiem_g9(spec),
    kiem_g10(spec),
    kiem_g11(spec),
    kiem_g12(spec),
    ...kiem_tep_docx(spec, docx),
  ];
}

/** Gate dat het khong? G10 la canh bao mem — khong tinh. */
export function dat_tat_ca(kq: KetQuaGate[]): boolean {
  return kq.every((k) => k.ma_check === 'G10' || k.dat);
}

/** Chi nhung muc LOI (dung de ghi ket_qua_gate gon hon). */
export function muc_loi(kq: KetQuaGate[]): KetQuaGate[] {
  return kq.filter((k) => !k.dat);
}
