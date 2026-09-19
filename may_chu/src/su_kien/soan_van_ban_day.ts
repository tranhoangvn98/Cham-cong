// Worker pipeline van ban AI — lop MONG noi cac module doc lap voi CSDL.
//
// Mot vong lap ngan nhan ban nhap `dang_soan` bang UPDATE NGUYEN TU (for update skip
// locked — nhieu instance chay song song khong xu ly trung), chay buoc ② (AI soan) +
// buoc ③ (build docx + gate + tu sua), roi ghi ket qua ve hang.
//
// KHONG goi DeepSeek trong luong request HTTP: route /nhap chi ghi hang va tra ve;
// moi viec cham (AI, Python) chay o day.
//
// Che do `tu_soan` (fallback khong-LLM — REQ-22): ban nhap da co san spec_json do route
// dung, worker chi build docx + gate, KHONG goi AI.
import { cau_hinh } from '../cau_hinh.ts';
import { truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { bo_sinh_docx } from '../ai/sinh_docx.ts';
import { goi_deepseek } from '../ai/deepseek.ts';
import { xu_ly_tu_sua, LoiGateCode, LoiHetLuot } from '../ai/vong_lap_tu_sua.ts';
import { LoiSoanVanBan } from '../ai/soan_van_ban.ts';
import { LoiSinhDocx } from '../ai/sinh_docx.ts';
import { ghep_spec, kiem_tra_spec } from '../ai/ghep_spec.ts';
import { chay_gate, dat_tat_ca, muc_loi } from '../ai/gate_kiem_tra.ts';
import { luu_van_ban_cong_ty } from '../tien_ich/luu_tep.ts';
import { bo_dau, lam_doan } from '../tien_ich/ten_tep.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import type {
  KetQuaGate, KieuVanBan, PhamViNhan, QuanHe, SpecVanBan, TruongHeThong,
} from '../ai/kieu.ts';
import type { BoiCanhSoan } from '../ai/prompt_soan.ts';

/** Dang hang cho — chu ky quet nhanh de nguoi soan thay ket qua gan nhu ngay. */
const CHU_KY_MS = 3000;

interface DongNhapAi {
  id: string;
  ma: string;
  loai: KieuVanBan;
  pham_vi: PhamViNhan;
  quan_he: QuanHe;
  phong_ban_id: string | null;
  nhan_vien_id: string | null;
  muc_dich: string;
  muc_do: 'thuong' | 'quan_trong' | 'khan';
  can_giai_trinh: boolean;
  het_han: Date | null;
  la_qd_nghi_viec: boolean;
  ngay_nghi_viec: string | null;
  noi_dung_tho: string;
  che_do: 'ai' | 'tu_soan';
  spec_json: unknown;
  nguoi_tao: string | null;
}

/**
 * Nhan MOT ban nhap dang cho. Tra null neu hang doi trong.
 *
 * `for update skip locked` + danh dau `dang_xu_ly`: nhieu instance an toan, va neu worker
 * chet giua chung thi sau 5 phut ban nhap duoc lay lai (khong ket vinh vien).
 */
async function nhan_mot_viec(): Promise<DongNhapAi | null> {
  return truy_van_mot<DongNhapAi>(
    `update thong_bao_nhap_ai set dang_xu_ly = now()
      where id in (
        select id from thong_bao_nhap_ai
         where trang_thai = 'dang_soan'
           and (dang_xu_ly is null or dang_xu_ly < now() - interval '5 minutes')
         order by tao_luc
         for update skip locked
         limit 1
      )
      returning id, ma, loai, pham_vi, quan_he, phong_ban_id, nhan_vien_id, muc_dich,
                muc_do, can_giai_trinh, het_han, la_qd_nghi_viec,
                ngay_nghi_viec::text as ngay_nghi_viec,
                noi_dung_tho, che_do, spec_json, nguoi_tao`,
  );
}

/** Ho ten + chuc danh cua nguoi tao (mac dinh la nguoi ky). */
export async function nguoi_ky_cua(nguoi_tao: string | null): Promise<{ ten: string; chuc_vu: string }> {
  if (nguoi_tao === null) return { ten: '', chuc_vu: '' };
  const r = await truy_van_mot<{ ho_ten: string | null; chuc_danh: string | null }>(
    `select nv.ho_ten, nv.chuc_danh
       from nguoi_dung nd join nhan_vien nv on nv.id = nd.nhan_vien_id
      where nd.id = $1`,
    [nguoi_tao],
  );
  return {
    ten: r?.ho_ten ?? '',
    chuc_vu: (r?.chuc_danh ?? 'GIÁM ĐỐC').toUpperCase(),
  };
}

/** Ben nhan theo pham vi — tra ca chuoi cho giong AI lan danh sach noi nhan in docx. */
export async function ben_nhan(d: DongNhapAi): Promise<{ chu: string; noi_nhan: string[] }> {
  // I-07: dong cuoi "Nơi nhận" luon la "- Lưu: VT, <viet tat don vi soan>.".
  const luu_tru = 'Lưu: VT, HCNS.';
  const ghep = (danh: string[]): string[] => {
    if (d.loai !== 'cong_van') return danh;
    // I-01: cong van co ca Kinh gui lan Nơi nhận — dong dau noi nhan la "- Như trên;".
    danh.unshift('Như trên;');
    return danh;
  };
  if (d.pham_vi === 'ca_nhan' && d.nhan_vien_id !== null) {
    const r = await truy_van_mot<{ ho_ten: string; chuc_danh: string | null; phong: string | null }>(
      `select nv.ho_ten, nv.chuc_danh, pb.ten as phong
         from nhan_vien nv left join phong_ban pb on pb.id = nv.phong_ban_id
        where nv.id = $1`,
      [d.nhan_vien_id],
    );
    if (r === null) return { chu: '', noi_nhan: ghep([luu_tru]) };
    const bo_phan = r.phong === null ? '' : `, ${r.phong}`;
    return {
      chu: `Ông/Bà ${r.ho_ten} (${r.chuc_danh ?? 'Nhân viên'}${bo_phan})`,
      noi_nhan: ghep([`Ông/Bà ${r.ho_ten}${bo_phan}`, luu_tru]),
    };
  }
  if (d.pham_vi === 'phong_ban' && d.phong_ban_id !== null) {
    const r = await truy_van_mot<{ ten: string }>(
      'select ten from phong_ban where id = $1', [d.phong_ban_id],
    );
    const ten = r?.ten ?? 'đơn vị';
    return { chu: `toàn thể CBNV ${ten}`, noi_nhan: ghep([`Toàn thể CBNV ${ten}`, luu_tru]) };
  }
  return {
    chu: 'toàn thể cán bộ, nhân viên Công ty',
    noi_nhan: ghep(['Toàn thể cán bộ, nhân viên Công ty', luu_tru]),
  };
}

/** Ten tep docx ngan, khong dau, an toan: TBN000123_ThongBaoNghiLe.docx. */
function ten_tep_docx(ma: string, spec: SpecVanBan): string {
  const doan = lam_doan(bo_dau(spec.trich_yeu), 40).replace(/[^A-Za-z0-9]+/g, '_');
  return `${ma}${doan === '' ? '' : `_${doan}`}.docx`;
}

/** Ket qua that bai de ghi vao cot ket_qua_gate kem ly do ro rang. */
function gate_loi(ly_do: string): KetQuaGate[] {
  return [{ ma_check: 'AI', dat: false, ly_do, loai_loi: 'code' }];
}

/** Ghi ket qua cuoi cung ve ban nhap, nha danh dau dang xu ly. */
async function ghi_ket_qua(
  id: string, trang_thai: string, spec: SpecVanBan | null, kq: KetQuaGate[], so_lan_thu: number,
  ten_luu: string | null, mime: string | null, kich_thuoc: number | null,
): Promise<void> {
  await thuc_thi(
    `update thong_bao_nhap_ai
        set trang_thai = $2, spec_json = $3::jsonb, ket_qua_gate = $4::jsonb, so_lan_thu = $5,
            ten_luu_docx = $6, mime = $7, kich_thuoc = $8,
            dang_xu_ly = null, cap_nhat_luc = now()
      where id = $1`,
    [
      id, trang_thai, spec === null ? null : JSON.stringify(spec),
      JSON.stringify(kq), so_lan_thu, ten_luu, mime, kich_thuoc,
    ],
  );
}

async function xu_ly_mot(d: DongNhapAi, ghi_log: (s: string, ...t: unknown[]) => void): Promise<void> {
  try {
    // Chot chan dau vao: thieu cau hinh the thuc thi bao loi ro cho nguoi soan, khong
    // tieu mot lan goi AI roi moi sap o buoc dung docx.
    if (cau_hinh.van_ban.co_quan_ban_hanh.trim() === '' || cau_hinh.van_ban.dia_danh.trim() === '') {
      await ghi_ket_qua(d.id, 'loi', null,
        gate_loi('Chưa cấu hình tên cơ quan ban hành (CO_QUAN_BAN_HANH) và địa danh '
          + '(DIA_DANH_VAN_BAN) trên máy chủ — liên hệ quản trị.'), 0, null, null, null);
      ghi_log(`[vb-ai] ${d.ma} thieu cau hinh CO_QUAN_BAN_HANH / DIA_DANH_VAN_BAN`);
      return;
    }
    // ---------------------------------------------------------- che do tu_soan (khong AI)
    if (d.che_do === 'tu_soan') {
      const loi_spec = kiem_tra_spec(d.spec_json);
      if (loi_spec.length > 0) {
        await ghi_ket_qua(d.id, 'loi', null,
          [{ ma_check: 'AI', dat: false, ly_do: loi_spec.join(' '), loai_loi: 'code' }], 0,
          null, null, null);
        return;
      }
      const spec = d.spec_json as SpecVanBan;
      const docx = await bo_sinh_docx.dung(spec);
      const kq = await chay_gate(spec, docx);
      if (!dat_tat_ca(kq)) {
        await ghi_ket_qua(d.id, 'loi', spec, kq, 0, null, null, null);
        await ghi_nhat_ky(d.nguoi_tao, 'thong_bao_ai_gate_fail', 'thong_bao_nhap_ai', d.id,
          { cac_loi: muc_loi(kq).map((k) => k.ma_check) }, null);
        return;
      }
      const da_luu = await luu_van_ban_cong_ty(docx, ten_tep_docx(d.ma, spec), 'khac',
        ngay_dia_phuong(new Date()));
      await ghi_ket_qua(d.id, 'cho_duyet', spec, kq, 0,
        da_luu.ten_luu, da_luu.mime, da_luu.kich_thuoc);
      return;
    }

    // ---------------------------------------------------------- che do AI
    const ky = await nguoi_ky_cua(d.nguoi_tao);
    const nhan = await ben_nhan(d);
    const he_thong: TruongHeThong = {
      co_quan_ban_hanh: cau_hinh.van_ban.co_quan_ban_hanh,
      dia_danh: cau_hinh.van_ban.dia_danh,
      ngay: ngay_dia_phuong(new Date()),
      nguoi_ky: ky.ten,
      chuc_vu_nguoi_ky: ky.chuc_vu,
      noi_nhan: nhan.noi_nhan,
    };
    const boi_canh: BoiCanhSoan = {
      loai: d.loai,
      quan_he: d.quan_he,
      pham_vi: d.pham_vi,
      ben_ban_hanh: cau_hinh.van_ban.co_quan_ban_hanh,
      nguoi_ky: ky.ten,
      chuc_vu_nguoi_ky: ky.chuc_vu,
      ben_nhan: nhan.chu,
      muc_dich: d.muc_dich,
      muc_do: d.muc_do,
      ngay_nghi_viec: d.la_qd_nghi_viec && d.ngay_nghi_viec !== null
        ? ngay_dia_phuong(new Date(`${d.ngay_nghi_viec}T00:00:00`))
        : null,
      can_giai_trinh: d.can_giai_trinh,
      het_han: d.het_han === null ? null : ngay_dia_phuong(new Date(d.het_han)),
    };

    const kq = await xu_ly_tu_sua(boi_canh, d.noi_dung_tho, he_thong,
      { nhan_vien_id: d.nhan_vien_id, phong_ban_id: d.phong_ban_id },
      d.pham_vi, d.quan_he, d.loai,
      {
        goi_llm: (prompt) => goi_deepseek(prompt, { ghi_log: (s) => ghi_log(s) }),
        dung_docx: bo_sinh_docx,
        so_lan_toi_da: cau_hinh.deepseek.max_retry,
        ghi_log: (s) => ghi_log(s),
      });

    const da_luu = await luu_van_ban_cong_ty(kq.docx, ten_tep_docx(d.ma, kq.spec), 'khac',
      ngay_dia_phuong(new Date()));
    await ghi_ket_qua(d.id, 'cho_duyet', kq.spec, kq.ket_qua_gate, kq.so_lan_thu,
      da_luu.ten_luu, da_luu.mime, da_luu.kich_thuoc);
    ghi_log(`[vb-ai] ${d.ma} soan xong, gate dat, so lan AI: ${kq.so_lan_thu}`);
  } catch (loi) {
    const thong_diep = (loi as Error).message;
    if (loi instanceof LoiSoanVanBan && loi.ma === 'llm') {
      // REQ-22: mat key / loi mang / DeepSeek sap -> nguoi tao tu soan van xuoi.
      await ghi_ket_qua(d.id, 'loi', null,
        gate_loi('Khong goi duoc AI. Chon che do "Tự soạn" và nhập văn xuôi trực tiếp, '
          + 'hoặc thử lại sau.'), 0, null, null, null);
      ghi_log(`[vb-ai] ${d.ma} khong goi duoc AI: ${thong_diep}`);
      return;
    }
    if (loi instanceof LoiHetLuot) {
      await ghi_ket_qua(d.id, 'loi', null, loi.ket_qua_gate,
        cau_hinh.deepseek.max_retry + 1, null, null, null);
      await ghi_nhat_ky(d.nguoi_tao, 'thong_bao_ai_gate_fail', 'thong_bao_nhap_ai', d.id,
        { cac_loi: muc_loi(loi.ket_qua_gate).map((k) => k.ma_check) }, null);
      return;
    }
    if (loi instanceof LoiGateCode) {
      await ghi_ket_qua(d.id, 'loi', null, loi.ket_qua_gate, 0, null, null, null);
      ghi_log(`[vb-ai] ${d.ma} GATE CODE LOI (loi lap trinh): ${thong_diep}`);
      return;
    }
    if (loi instanceof LoiSinhDocx) {
      await ghi_ket_qua(d.id, 'loi', null,
        gate_loi(`Loi dung tep docx: ${thong_diep}`), 0, null, null, null);
      ghi_log(`[vb-ai] ${d.ma} loi sinh docx: ${thong_diep}`);
      return;
    }
    // Loi bat ngo — nha viec de vong sau thu lai, ghi log ro.
    ghi_log(`[vb-ai] ${d.ma} loi bat ngo, se thu lai: ${thong_diep}`);
    await thuc_thi('update thong_bao_nhap_ai set dang_xu_ly = null where id = $1', [d.id]);
  }
}

let bo_hen: NodeJS.Timeout | null = null;
let dang_chay = false;

async function quet_mot_lan(ghi_log: (s: string, ...t: unknown[]) => void): Promise<void> {
  if (dang_chay) return;
  dang_chay = true;
  try {
    const d = await nhan_mot_viec();
    if (d !== null) await xu_ly_mot(d, ghi_log);
  } catch (loi) {
    ghi_log(`[vb-ai] loi vong quet: ${(loi as Error).message}`);
  } finally {
    dang_chay = false;
  }
}

/** Bat worker. Goi tu index.ts nhu bat_lich. */
export function bat_soan_van_ban(ghi_log: (s: string, ...t: unknown[]) => void): void {
  if (bo_hen !== null) return;
  bo_hen = setInterval(() => { void quet_mot_lan(ghi_log); }, CHU_KY_MS);
}

export function dung_soan_van_ban(): void {
  if (bo_hen !== null) {
    clearInterval(bo_hen);
    bo_hen = null;
  }
}
