// Xu ly ky luat TU DONG: gom vi pham theo thang & muc do -> ho so ky luat -> che tai.
//
// QUY TRINH (chu cong ty chot):
//   1. Gom tat ca vi_pham cua mot nguoi trong mot ky theo TUNG MUC DO thanh MOT ho so.
//   2. Tong muc giam thuong = sum(muc_tru_tien) cua cac loai vi pham trong ho so.
//   3. Tu dong:
//        tong_tien = 0            -> NHAC NHO (email + thong bao app), luu ho so.
//        0 < tong_tien < nguong   -> GIAM THUONG P3 tu ap (chinh_sach_phu_cap), bao nguoi lao dong.
//        tong_tien >= nguong      -> CHO DUYET: bao nguoi duyet, cho quyet dinh moi ap.
//
// RANH GIOI PHAP LY:
//   - Che tai tai chinh la GIAM THUONG P3 (Dieu 104 BLLD) theo Dieu 14 Noi quy, KHONG phai phat
//     tien / cat luong (Dieu 127 CAM). Ap qua khoan 'tru_giam_thuong_kl' -> chi dong toi
//     thuong/phu cap khi tinh luong, KHONG BAO GIO tru luong co ban.
//   - Ky luat lao dong THAT (khien trach tro len) VAN khong tu dong: phai qua hop + giai trinh
//     + bien ban (Dieu 122/124), lam o tab Vi pham. Ho so o day chi lo gom + nhac nho + giam thuong.
import type { PoolClient } from 'pg';
import { truy_van, trong_giao_dich } from '../csdl/ket_noi.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { khoang_thang } from '../tien_ich/thoi_gian.ts';
import {
  gui_ngam, tai_khoan_cua_nhan_vien, tai_khoan_nguoi_duyet,
} from '../su_kien/thong_bao_day.ts';
import { gui_email, email_bat } from '../su_kien/gui_email.ts';

/** Khoan luong dung de ghi giam thuong ky luat vao phieu (qua chinh_sach_phu_cap). */
export const KHOAN_GIAM_THUONG = 'tru_giam_thuong_kl';

export type MucDo = 'nhe' | 'trung' | 'nang' | 'rat_nang';
export const TEN_MUC_DO: Record<MucDo, string> = {
  nhe: 'Nhẹ', trung: 'Trung bình', nang: 'Nặng', rat_nang: 'Rất nặng',
};

// =====================================================================================
// PHAN THUAN (khong CSDL) — gom nhom + quyet hinh thuc. Kiem duoc bang unit test.
// =====================================================================================

/** Mot dong vi pham dau vao de gom. */
export interface DongViPham {
  vi_pham_id: string;
  nhan_vien_id: string;
  muc_do: MucDo;
  loai_ma: string;
  loai_ten: string;
  muc_tru_tien: number;
}

export interface ChiTietViPham {
  vi_pham_id: string;
  ma: string;
  ten: string;
  tien: number;
}

/** Mot ho so ky luat gom lai theo (nguoi, muc do). */
export interface NhomKyLuat {
  nhan_vien_id: string;
  muc_do: MucDo;
  so_vi_pham: number;
  tong_tien: number;
  chi_tiet: ChiTietViPham[];
}

const THU_TU_MUC_DO: Record<MucDo, number> = { nhe: 0, trung: 1, nang: 2, rat_nang: 3 };

/**
 * Gom vi pham theo (nhan_vien_id, muc_do). Tong tien = sum(muc_tru_tien). "Ky luat 1 lan theo
 * tung muc do": moi nguoi moi ky co toi da 4 ho so (nhe/trung/nang/rat_nang).
 */
export function gom_theo_muc_do(ds: readonly DongViPham[]): NhomKyLuat[] {
  const map = new Map<string, NhomKyLuat>();
  for (const d of ds) {
    const khoa = `${d.nhan_vien_id}::${d.muc_do}`;
    let n = map.get(khoa);
    if (n === undefined) {
      n = { nhan_vien_id: d.nhan_vien_id, muc_do: d.muc_do, so_vi_pham: 0, tong_tien: 0, chi_tiet: [] };
      map.set(khoa, n);
    }
    n.so_vi_pham += 1;
    n.tong_tien += d.muc_tru_tien;
    n.chi_tiet.push({ vi_pham_id: d.vi_pham_id, ma: d.loai_ma, ten: d.loai_ten, tien: d.muc_tru_tien });
  }
  return [...map.values()].sort((a, b) =>
    a.nhan_vien_id === b.nhan_vien_id
      ? THU_TU_MUC_DO[a.muc_do] - THU_TU_MUC_DO[b.muc_do]
      : a.nhan_vien_id.localeCompare(b.nhan_vien_id));
}

export interface QuyetHinhThuc {
  hinh_thuc: 'nhac_nho' | 'giam_thuong';
  can_duyet: boolean;
}

/**
 * Quyet hinh thuc tu tong tien. tong_tien = 0 -> nhac nho; > 0 -> giam thuong. can_duyet khi
 * >= nguong (chu cong ty chot). Nguong <= 0 nghia la MOI khoan giam thuong deu phai duyet.
 */
export function quyet_hinh_thuc(tong_tien: number, nguong_duyet: number): QuyetHinhThuc {
  if (tong_tien <= 0) return { hinh_thuc: 'nhac_nho', can_duyet: false };
  return { hinh_thuc: 'giam_thuong', can_duyet: nguong_duyet <= 0 || tong_tien >= nguong_duyet };
}

// =====================================================================================
// PHAN CSDL — orchestration.
// =====================================================================================

/** Trang thai vi pham duoc tinh vao ho so (chua bi bac bo / chua xu ly rieng). */
const TRANG_THAI_TINH = ['moi', 'cho_giai_trinh', 'da_xac_nhan'];

/** Trang thai ho so da CHOT — quet lai khong ghi de len. */
const DA_CHOT = new Set(['da_ap_dung', 'bac_bo', 'huy']);

function tien_viet(n: number): string {
  return `${Math.round(n).toLocaleString('vi-VN')} đ`;
}

function than_email_ky_luat(
  ho_ten: string, ky: string, muc_do: MucDo, so_vi_pham: number,
  tong_tien: number, chi_tiet: ChiTietViPham[],
): string {
  const hang = chi_tiet
    .map((c) => `<li>${c.ten}${c.tien > 0 ? ` — giảm thưởng ${tien_viet(c.tien)}` : ''}</li>`)
    .join('');
  const phan_tien = tong_tien > 0
    ? `<p>Theo Điều 14 Nội quy lao động và Quy chế thưởng, kỳ ${ky} bị
         <b>giảm thưởng/phụ cấp ${tien_viet(tong_tien)}</b> (giảm thưởng P3 theo Điều 104 Bộ luật
         Lao động — <b>không phải phạt tiền, không trừ lương cơ bản</b>).</p>`
    : `<p>Đây là <b>nhắc nhở</b>. Kỳ này chưa phát sinh giảm thưởng.</p>`;
  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
    <p>Kính gửi ${ho_ten},</p>
    <p>Hệ thống ghi nhận trong kỳ <b>${ky}</b> bạn có <b>${String(so_vi_pham)}</b> vi phạm mức
       <b>${TEN_MUC_DO[muc_do]}</b>:</p>
    <ul>${hang}</ul>
    ${phan_tien}
    <p>Nếu có lý do chính đáng, vui lòng phản hồi Phòng Nhân sự (Bộ luật Lao động 2019 Điều 122
       cho bạn quyền giải trình).</p>
    <p>Trân trọng,<br/>Phòng Nhân sự</p>
  </div>`;
}

/**
 * Dong bo dong giam thuong tren chinh_sach_phu_cap cho MOT nguoi trong MOT ky. Gom tat ca ho so
 * da_ap_dung (moi muc do) thanh MOT dong khoan cho ky do — vi phieu_luong_khoan chi cho mot dong
 * moi khoan_ma. Xoa dong cu cua ky roi tao lai theo tong hien tai. Tra ve id dong moi (hoac null).
 */
async function dong_bo_giam_thuong(
  khach: PoolClient, nhan_vien_id: string, ky: string,
): Promise<string | null> {
  const { tu, den } = khoang_thang(ky);

  const t = await khach.query<{ tong: string }>(
    `select coalesce(sum(tong_tien), 0)::text as tong from ho_so_ky_luat
      where nhan_vien_id = $1 and ky = $2 and trang_thai = 'da_ap_dung' and hinh_thuc = 'giam_thuong'`,
    [nhan_vien_id, ky],
  );
  const tong = Number(t.rows[0]?.tong ?? 0);

  // Xoa dong cu cua dung ky nay (khoi trung khi ap lai). Chi dong cua khoan ky luat, dung thang.
  await khach.query(
    `delete from chinh_sach_phu_cap
      where nhan_vien_id = $1 and khoan_ma = $2 and hieu_luc_tu = $3`,
    [nhan_vien_id, KHOAN_GIAM_THUONG, tu],
  );

  let chinh_sach_id: string | null = null;
  if (tong > 0) {
    const r = await khach.query<{ id: string }>(
      `insert into chinh_sach_phu_cap
         (nhan_vien_id, khoan_ma, nguon_so_luong, so_tien, hieu_luc_tu, hieu_luc_den, ly_do)
       values ($1,$2,'co_dinh',$3,$4,$5,$6) returning id`,
      [nhan_vien_id, KHOAN_GIAM_THUONG, tong, tu, den,
        `Giảm thưởng theo kỷ luật kỳ ${ky} (Điều 14 Nội quy, Điều 104 BLLĐ)`],
    );
    chinh_sach_id = r.rows[0]?.id ?? null;
  }

  // Cap nhat lai con tro chinh_sach_id cho moi ho so da_ap_dung cua ky (chung tro ve mot dong).
  await khach.query(
    `update ho_so_ky_luat set chinh_sach_id = $3, cap_nhat_luc = now()
      where nhan_vien_id = $1 and ky = $2 and trang_thai = 'da_ap_dung'`,
    [nhan_vien_id, ky, chinh_sach_id],
  );
  return chinh_sach_id;
}

interface NguoiTin { ho_ten: string; email: string | null; }

async function lay_nguoi(khach: PoolClient, nhan_vien_id: string): Promise<NguoiTin> {
  const r = await khach.query<NguoiTin>(
    'select ho_ten, email from nhan_vien where id = $1', [nhan_vien_id],
  );
  return r.rows[0] ?? { ho_ten: '', email: null };
}

export interface KetQuaMotHoSo {
  ho_so_id: string;
  trang_thai: string;
  hinh_thuc: string;
  tong_tien: number;
  can_duyet: boolean;
  da_gui_email: boolean;
  da_gui_push: boolean;
}

/**
 * Xu ly MOT ho so (mot nguoi, mot ky, mot muc do). Upsert ho so, roi tu xu ly theo hinh thuc.
 * `tu_dong` = he thong chay (khong co nguoi bam). Ho so DA CHOT thi chi cap nhat khi ep.
 */
async function xu_ly_mot_ho_so(
  nhom: NhomKyLuat, ky: string, tu_dong: boolean,
): Promise<KetQuaMotHoSo> {
  const { hinh_thuc, can_duyet } = quyet_hinh_thuc(nhom.tong_tien, cau_hinh.ky_luat.nguong_duyet);

  return trong_giao_dich(async (khach) => {
    // Da co ho so chua? Chot roi thi khong dung toi.
    const cu = await khach.query<{ id: string; trang_thai: string }>(
      'select id, trang_thai from ho_so_ky_luat where nhan_vien_id = $1 and ky = $2 and muc_do = $3',
      [nhom.nhan_vien_id, ky, nhom.muc_do],
    );
    if (cu.rows[0] !== undefined && DA_CHOT.has(cu.rows[0].trang_thai)) {
      const r = cu.rows[0];
      return {
        ho_so_id: r.id, trang_thai: r.trang_thai, hinh_thuc, tong_tien: nhom.tong_tien,
        can_duyet, da_gui_email: false, da_gui_push: false,
      };
    }

    // Upsert phan gom (so lieu). Trang thai tam thoi 'moi' — quyet ngay ben duoi.
    const up = await khach.query<{ id: string }>(
      `insert into ho_so_ky_luat
         (nhan_vien_id, ky, muc_do, so_vi_pham, tong_tien, hinh_thuc, trang_thai, can_duyet,
          tu_dong, chi_tiet)
       values ($1,$2,$3,$4,$5,$6,'moi',$7,$8,$9)
       on conflict (nhan_vien_id, ky, muc_do) do update set
         so_vi_pham = excluded.so_vi_pham, tong_tien = excluded.tong_tien,
         hinh_thuc = excluded.hinh_thuc, can_duyet = excluded.can_duyet,
         chi_tiet = excluded.chi_tiet, cap_nhat_luc = now()
       returning id`,
      [nhom.nhan_vien_id, ky, nhom.muc_do, nhom.so_vi_pham, nhom.tong_tien, hinh_thuc,
        can_duyet, tu_dong, JSON.stringify(nhom.chi_tiet)],
    );
    const ho_so_id = up.rows[0]!.id;

    let trang_thai = 'moi';
    let da_gui_email = false;
    let da_gui_push = false;

    if (hinh_thuc === 'nhac_nho') {
      trang_thai = 'da_nhac';
      const ng = await lay_nguoi(khach, nhom.nhan_vien_id);
      if (email_bat() && ng.email !== null && ng.email.includes('@')) {
        da_gui_email = await gui_email({
          den: [ng.email],
          tieu_de: `Nhắc nhở vi phạm nội quy — kỳ ${ky}`,
          noi_dung_html: than_email_ky_luat(ng.ho_ten, ky, nhom.muc_do, nhom.so_vi_pham,
            nhom.tong_tien, nhom.chi_tiet),
        });
      }
      const tk = await tai_khoan_cua_nhan_vien(nhom.nhan_vien_id);
      if (tk.length > 0) {
        gui_ngam({
          nguoi_dung_ids: tk,
          tieu_de: 'Nhắc nhở vi phạm nội quy',
          noi_dung: `Kỳ ${ky}: ${String(nhom.so_vi_pham)} vi phạm mức ${TEN_MUC_DO[nhom.muc_do]}.`,
          du_lieu: { man: 'ky-luat', ky, muc_do: nhom.muc_do },
        });
        da_gui_push = true;
      }
    } else if (!can_duyet) {
      // Duoi nguong: tu ap giam thuong.
      trang_thai = 'da_ap_dung';
      await khach.query(
        `update ho_so_ky_luat set trang_thai = 'da_ap_dung', cap_nhat_luc = now() where id = $1`,
        [ho_so_id],
      );
      await dong_bo_giam_thuong(khach, nhom.nhan_vien_id, ky);
      const ng = await lay_nguoi(khach, nhom.nhan_vien_id);
      if (email_bat() && ng.email !== null && ng.email.includes('@')) {
        da_gui_email = await gui_email({
          den: [ng.email],
          tieu_de: `Thông báo giảm thưởng theo kỷ luật — kỳ ${ky}`,
          noi_dung_html: than_email_ky_luat(ng.ho_ten, ky, nhom.muc_do, nhom.so_vi_pham,
            nhom.tong_tien, nhom.chi_tiet),
        });
      }
      const tk = await tai_khoan_cua_nhan_vien(nhom.nhan_vien_id);
      if (tk.length > 0) {
        gui_ngam({
          nguoi_dung_ids: tk,
          tieu_de: 'Giảm thưởng theo kỷ luật',
          noi_dung: `Kỳ ${ky}: giảm thưởng ${tien_viet(nhom.tong_tien)} `
            + `(${String(nhom.so_vi_pham)} vi phạm mức ${TEN_MUC_DO[nhom.muc_do]}).`,
          du_lieu: { man: 'ky-luat', ky, muc_do: nhom.muc_do },
        });
        da_gui_push = true;
      }
    } else {
      // Tu nguong: cho nguoi duyet.
      trang_thai = 'cho_duyet';
      await khach.query(
        `update ho_so_ky_luat set trang_thai = 'cho_duyet', cap_nhat_luc = now() where id = $1`,
        [ho_so_id],
      );
      const duyet = await tai_khoan_nguoi_duyet(nhom.nhan_vien_id);
      if (duyet.length > 0) {
        gui_ngam({
          nguoi_dung_ids: duyet,
          tieu_de: 'Hồ sơ kỷ luật cần duyệt',
          noi_dung: `Giảm thưởng ${tien_viet(nhom.tong_tien)} (≥ ngưỡng duyệt) — kỳ ${ky}.`,
          du_lieu: { man: 'ky-luat', ky, ho_so_id },
        });
        da_gui_push = true;
      }
    }

    await khach.query(
      `update ho_so_ky_luat set da_gui_email = da_gui_email or $2,
              da_gui_push = da_gui_push or $3 where id = $1`,
      [ho_so_id, da_gui_email, da_gui_push],
    );

    return { ho_so_id, trang_thai, hinh_thuc, tong_tien: nhom.tong_tien, can_duyet,
      da_gui_email, da_gui_push };
  });
}

export interface KetQuaGom {
  so_vi_pham: number;
  so_ho_so: number;
  so_nhac_nho: number;
  so_giam_thuong: number;
  so_cho_duyet: number;
  tong_tien: number;
}

/**
 * Gom & xu ly ky luat cho ca mot ky. Doc vi pham dang tinh (trang thai chua bac bo / chua xu ly
 * rieng) cua ky, gom theo (nguoi, muc do), roi tu xu ly tung ho so. Chay lai idempotent: ho so
 * DA CHOT giu nguyen, ho so chua chot cap nhat theo so lieu moi.
 */
export async function gom_va_xu_ly_thang(
  thang: string, tuy: { tu_dong?: boolean } = {},
): Promise<KetQuaGom> {
  const tu_dong = tuy.tu_dong ?? true;

  const ds = await truy_van<DongViPham & { muc_tru_tien_txt: string }>(
    `select v.id as vi_pham_id, v.nhan_vien_id, l.muc_do, l.ma as loai_ma, l.ten as loai_ten,
            l.muc_tru_tien::text as muc_tru_tien_txt
       from vi_pham v
       join loai_vi_pham l on l.id = v.loai_vi_pham_id
       join nhan_vien nv on nv.id = v.nhan_vien_id and nv.dang_hoat_dong = true
      where v.ky = $1 and v.trang_thai = any($2)`,
    [thang, TRANG_THAI_TINH],
  );

  const nhom = gom_theo_muc_do(ds.map((d) => ({
    vi_pham_id: d.vi_pham_id, nhan_vien_id: d.nhan_vien_id, muc_do: d.muc_do,
    loai_ma: d.loai_ma, loai_ten: d.loai_ten, muc_tru_tien: Number(d.muc_tru_tien_txt),
  })));

  const kq: KetQuaGom = {
    so_vi_pham: ds.length, so_ho_so: 0, so_nhac_nho: 0, so_giam_thuong: 0, so_cho_duyet: 0,
    tong_tien: 0,
  };
  for (const n of nhom) {
    try {
      const r = await xu_ly_mot_ho_so(n, thang, tu_dong);
      kq.so_ho_so += 1;
      if (r.trang_thai === 'da_nhac') kq.so_nhac_nho += 1;
      else if (r.trang_thai === 'da_ap_dung') { kq.so_giam_thuong += 1; kq.tong_tien += r.tong_tien; }
      else if (r.trang_thai === 'cho_duyet') kq.so_cho_duyet += 1;
    } catch (loi) {
      console.error(`[ky_luat] loi xu ly ${n.nhan_vien_id} ${thang} ${n.muc_do}:`,
        (loi as Error).message);
    }
  }
  return kq;
}

/** Duyet mot ho so cho_duyet -> ap giam thuong. Chi cho ho so dang cho_duyet. */
export async function duyet_ho_so(
  ho_so_id: string, nguoi_id: string, ghi_chu: string | null,
): Promise<{ nhan_vien_id: string; ky: string; tong_tien: number }> {
  return trong_giao_dich(async (khach) => {
    const r = await khach.query<{ nhan_vien_id: string; ky: string; tong_tien: string;
                                  trang_thai: string }>(
      `select nhan_vien_id, ky, tong_tien::text as tong_tien, trang_thai
         from ho_so_ky_luat where id = $1 for update`,
      [ho_so_id],
    );
    const ho = r.rows[0];
    if (ho === undefined) throw new Error('Không tìm thấy hồ sơ kỷ luật.');
    if (ho.trang_thai !== 'cho_duyet') {
      throw new Error(`Hồ sơ đang ở trạng thái "${ho.trang_thai}", không duyệt được.`);
    }
    await khach.query(
      `update ho_so_ky_luat set trang_thai = 'da_ap_dung', nguoi_duyet = $2, duyet_luc = now(),
              ghi_chu = coalesce($3, ghi_chu), cap_nhat_luc = now() where id = $1`,
      [ho_so_id, nguoi_id, ghi_chu],
    );
    await dong_bo_giam_thuong(khach, ho.nhan_vien_id, ho.ky);

    gui_ngam({
      nguoi_dung_ids: await tai_khoan_cua_nhan_vien(ho.nhan_vien_id),
      tieu_de: 'Giảm thưởng theo kỷ luật đã được duyệt',
      noi_dung: `Kỳ ${ho.ky}: giảm thưởng ${tien_viet(Number(ho.tong_tien))}.`,
      du_lieu: { man: 'ky-luat', ky: ho.ky, ho_so_id },
    });
    return { nhan_vien_id: ho.nhan_vien_id, ky: ho.ky, tong_tien: Number(ho.tong_tien) };
  });
}

/** Bac bo mot ho so cho_duyet -> khong ap. Cung dung de huy mot ho so da_ap_dung (go giam thuong). */
export async function bac_bo_ho_so(
  ho_so_id: string, nguoi_id: string, ly_do: string,
): Promise<{ nhan_vien_id: string; ky: string }> {
  return trong_giao_dich(async (khach) => {
    const r = await khach.query<{ nhan_vien_id: string; ky: string; trang_thai: string }>(
      'select nhan_vien_id, ky, trang_thai from ho_so_ky_luat where id = $1 for update',
      [ho_so_id],
    );
    const ho = r.rows[0];
    if (ho === undefined) throw new Error('Không tìm thấy hồ sơ kỷ luật.');
    if (!['cho_duyet', 'da_ap_dung', 'moi', 'da_nhac'].includes(ho.trang_thai)) {
      throw new Error(`Hồ sơ đang ở trạng thái "${ho.trang_thai}", không bác bỏ được.`);
    }
    await khach.query(
      `update ho_so_ky_luat set trang_thai = 'bac_bo', nguoi_duyet = $2, duyet_luc = now(),
              ly_do_bac_bo = $3, chinh_sach_id = null, cap_nhat_luc = now() where id = $1`,
      [ho_so_id, nguoi_id, ly_do],
    );
    // Ho so bi bac bo khong con tinh vao tong -> ap lai (co the go dong giam thuong cua ky).
    await dong_bo_giam_thuong(khach, ho.nhan_vien_id, ho.ky);

    gui_ngam({
      nguoi_dung_ids: await tai_khoan_cua_nhan_vien(ho.nhan_vien_id),
      tieu_de: 'Hồ sơ kỷ luật đã được bãi bỏ',
      noi_dung: `Kỳ ${ho.ky}. Lý do: ${ly_do}`,
      du_lieu: { man: 'ky-luat', ky: ho.ky, ho_so_id },
    });
    return { nhan_vien_id: ho.nhan_vien_id, ky: ho.ky };
  });
}
