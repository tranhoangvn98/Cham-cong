// Chan VAO ngoai gio lam viec, theo lich cua tung may.
//
// AN TOAN: chi chan chieu VAO. Loi RA phai tu do bang phan cung — phan mem o day KHONG bao gio
// gui lenh khoa loi thoat. Lenh MO/CHAN do admin cau hinh + test tren may that (firmware acc kén
// lenh), RONG thi khong ban gi.
//
// Cach hoat dong: bo lich (lich_chay.ts) goi `dong_bo_khoa_cua` moi vong. Ham tinh trang thai
// MONG MUON (mo/chan) theo gio hien tai, so voi trang thai DA AP DUNG lan cuoi, chi gui lenh KHI
// DOI — nen khong spam lenh moi vong.
import { OFFSET_MAY_MS } from '../cau_hinh.ts';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { xep_lenh } from '../adms/tuyen.ts';

export interface LichKhoaCua {
  thiet_bi_serial: string;
  bat: boolean;
  gio_mo: string;      // 'HH:MM:SS'
  gio_dong: string;
  cuoi_tuan_chan: boolean;
  lenh_mo: string;
  lenh_chan: string;
  trang_thai: 'mo' | 'chan' | null;
}

/** Phut trong ngay tu chuoi 'HH:MM[:SS]'. */
function phut_cua(gio: string): number {
  const [h, m] = gio.split(':');
  return (Number(h) || 0) * 60 + (Number(m) || 0);
}

/**
 * Trang thai MONG MUON cua cua tai `bay_gio` theo lich: 'mo' (cho vao) hoac 'chan' (chan vao).
 * Tinh theo gio MAY CHAM CONG (OFFSET_MAY_MS), khong theo gio may chu.
 */
export function trang_thai_mong_muon(lich: LichKhoaCua, bay_gio: Date = new Date()): 'mo' | 'chan' {
  const dia = new Date(bay_gio.getTime() + OFFSET_MAY_MS);
  const thu = dia.getUTCDay(); // 0 = CN, 6 = T7
  if (lich.cuoi_tuan_chan && (thu === 0 || thu === 6)) return 'chan';
  const phut = dia.getUTCHours() * 60 + dia.getUTCMinutes();
  const mo = phut_cua(lich.gio_mo);
  const dong = phut_cua(lich.gio_dong);
  return phut >= mo && phut < dong ? 'mo' : 'chan';
}

/**
 * Dong bo trang thai cua cho MOI may co lich bat. Chi gui lenh khi trang thai DOI, va chi khi
 * lenh tuong ung DA CAU HINH (rong = bo qua, an toan). Tra ve so may vua doi trang thai.
 */
export async function dong_bo_khoa_cua(bay_gio: Date = new Date()): Promise<number> {
  const ds = await truy_van<LichKhoaCua>(
    `select thiet_bi_serial, bat, gio_mo::text as gio_mo, gio_dong::text as gio_dong,
            cuoi_tuan_chan, lenh_mo, lenh_chan, trang_thai
       from khoa_cua_lich where bat = true`,
  );
  let doi = 0;
  for (const l of ds) {
    const mong = trang_thai_mong_muon(l, bay_gio);
    if (mong === l.trang_thai) continue;
    const lenh = (mong === 'chan' ? l.lenh_chan : l.lenh_mo).trim();
    if (lenh === '') continue; // chua cau hinh lenh -> khong ban gi
    await xep_lenh(l.thiet_bi_serial, lenh);
    await thuc_thi(
      'update khoa_cua_lich set trang_thai = $2, cap_nhat_luc = now() where thiet_bi_serial = $1',
      [l.thiet_bi_serial, mong],
    );
    doi++;
  }
  return doi;
}

/** Lich cua mot may (tao dong mac dinh neu chua co). */
export async function lich_cua_may(serial: string): Promise<LichKhoaCua> {
  const dong = await truy_van_mot<LichKhoaCua>(
    `select thiet_bi_serial, bat, gio_mo::text as gio_mo, gio_dong::text as gio_dong,
            cuoi_tuan_chan, lenh_mo, lenh_chan, trang_thai
       from khoa_cua_lich where thiet_bi_serial = $1`,
    [serial],
  );
  if (dong !== null) return dong;
  return {
    thiet_bi_serial: serial, bat: false, gio_mo: '07:00:00', gio_dong: '19:00:00',
    cuoi_tuan_chan: true, lenh_mo: '', lenh_chan: '', trang_thai: null,
  };
}
