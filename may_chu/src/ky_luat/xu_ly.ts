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

/**
 * Trang thai KHONG bao gio xu ly lai (nguoi da quyet bo/huy/mien). Ho so tu dong thi quet lai
 * duoc. 'mien' phai o day: neu khong, quet hang ngay se HOI SINH ho so da mien ve 'da_ap_dung'
 * roi tru thuong lai — mat y nghia mien.
 */
const KHONG_DUNG_LAI = new Set(['bac_bo', 'huy', 'mien']);

function tien_viet(n: number): string {
  return `${Math.round(n).toLocaleString('vi-VN')} đ`;
}

/**
 * Form email nhac nho / thong bao giam thuong. Mot mau dung chung, tu doi tieu de va noi dung
 * theo co giam thuong hay khong. HTML thuan (email client khong chay CSS ngoai) — style inline.
 */
function than_email_ky_luat(
  ho_ten: string, ky: string, muc_do: MucDo, so_vi_pham: number,
  tong_tien: number, chi_tiet: ChiTietViPham[],
): string {
  const co_tien = tong_tien > 0;
  const hang = chi_tiet.map((c) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${c.ten}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${c.tien > 0 ? tien_viet(c.tien) : '—'}</td>
    </tr>`).join('');

  const khoi_tien = co_tien
    ? `<div style="background:#FEF9C3;border:1px solid #FDE68A;border-radius:8px;padding:12px 14px;margin:14px 0">
         <div style="font-size:13px;color:#92400E">Tổng giảm thưởng kỳ ${ky}</div>
         <div style="font-size:20px;font-weight:700;color:#92400E">${tien_viet(tong_tien)}</div>
         <div style="font-size:12px;color:#92400E;margin-top:4px">
           Giảm thưởng P3 theo Điều 14 Nội quy lao động và Điều 104 Bộ luật Lao động —
           <b>không phải phạt tiền, không trừ lương cơ bản</b>. Khoản này thể hiện trên phiếu lương kỳ ${ky}.
         </div>
       </div>`
    : `<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:12px 14px;margin:14px 0;font-size:13px;color:#1E40AF">
         Đây là <b>nhắc nhở</b>. Kỳ này chưa phát sinh giảm thưởng.
       </div>`;

  const tieu_de_khoi = co_tien ? 'Thông báo giảm thưởng theo kỷ luật' : 'Nhắc nhở vi phạm nội quy';

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.55;max-width:560px">
    <div style="background:#2563EB;color:#fff;padding:14px 18px;border-radius:8px 8px 0 0;font-size:16px;font-weight:700">
      ${tieu_de_khoi}
    </div>
    <div style="border:1px solid #E5E7EB;border-top:0;border-radius:0 0 8px 8px;padding:18px">
      <p style="margin:0 0 10px">Kính gửi <b>${ho_ten}</b>,</p>
      <p style="margin:0 0 10px">Hệ thống chấm công ghi nhận trong kỳ <b>${ky}</b> bạn có
         <b>${String(so_vi_pham)}</b> vi phạm mức <b>${TEN_MUC_DO[muc_do]}</b>:</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;margin:6px 0">
        <thead><tr>
          <th style="text-align:left;padding:6px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Nội dung vi phạm</th>
          <th style="text-align:right;padding:6px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Giảm thưởng</th>
        </tr></thead>
        <tbody>${hang}</tbody>
      </table>
      ${khoi_tien}
      <p style="margin:0 0 10px">Nếu có lý do chính đáng, bạn có quyền <b>giải trình</b> (Bộ luật Lao động 2019,
         Điều 122): đăng nhập ứng dụng chấm công vào mục <b>Vi phạm của tôi</b> để gửi giải trình, hoặc phản hồi
         trực tiếp Phòng Nhân sự.</p>
      <p style="margin:14px 0 0;color:#6B7280;font-size:12px">
        Email tự động từ hệ thống chấm công — vui lòng không trả lời trực tiếp email này.<br/>
        Trân trọng,<br/><b>Phòng Nhân sự</b>
      </p>
    </div>
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
    // Da co ho so chua? Bo/huy hoac CO NGUOI quyet dinh -> giu nguyen (ton trong quyet dinh cua
    // nguoi). Ho so tu dong (nhac / tu ap) thi quet lai duoc: chay hang ngay se cap nhat tong
    // tien + dong giam thuong theo so lieu moi, va KHONG gui lai email/push da gui.
    const cu = await khach.query<{ id: string; trang_thai: string; da_gui_email: boolean;
                                   da_gui_push: boolean; nguoi_duyet: string | null }>(
      `select id, trang_thai, da_gui_email, da_gui_push, nguoi_duyet
         from ho_so_ky_luat where nhan_vien_id = $1 and ky = $2 and muc_do = $3`,
      [nhom.nhan_vien_id, ky, nhom.muc_do],
    );
    const truoc = cu.rows[0];
    if (truoc !== undefined
        && (KHONG_DUNG_LAI.has(truoc.trang_thai) || truoc.nguoi_duyet !== null)) {
      return {
        ho_so_id: truoc.id, trang_thai: truoc.trang_thai, hinh_thuc, tong_tien: nhom.tong_tien,
        can_duyet, da_gui_email: false, da_gui_push: false,
      };
    }
    const email_truoc = truoc?.da_gui_email ?? false;   // da gui email lan truoc -> khong gui lai
    const push_truoc = truoc?.da_gui_push ?? false;
    const la_cho_duyet_truoc = truoc?.trang_thai === 'cho_duyet';

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
      if (!email_truoc && email_bat() && ng.email !== null && ng.email.includes('@')) {
        da_gui_email = await gui_email({
          den: [ng.email],
          tieu_de: `Nhắc nhở vi phạm nội quy — kỳ ${ky}`,
          noi_dung_html: than_email_ky_luat(ng.ho_ten, ky, nhom.muc_do, nhom.so_vi_pham,
            nhom.tong_tien, nhom.chi_tiet),
        });
      }
      const tk = await tai_khoan_cua_nhan_vien(nhom.nhan_vien_id);
      if (!push_truoc && tk.length > 0) {
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
      const ng = await lay_nguoi(khach, nhom.nhan_vien_id);
      if (!email_truoc && email_bat() && ng.email !== null && ng.email.includes('@')) {
        da_gui_email = await gui_email({
          den: [ng.email],
          tieu_de: `Thông báo giảm thưởng theo kỷ luật — kỳ ${ky}`,
          noi_dung_html: than_email_ky_luat(ng.ho_ten, ky, nhom.muc_do, nhom.so_vi_pham,
            nhom.tong_tien, nhom.chi_tiet),
        });
      }
      const tk = await tai_khoan_cua_nhan_vien(nhom.nhan_vien_id);
      if (!push_truoc && tk.length > 0) {
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
      if (!la_cho_duyet_truoc && duyet.length > 0) {
        gui_ngam({
          nguoi_dung_ids: duyet,
          tieu_de: 'Hồ sơ kỷ luật cần duyệt',
          noi_dung: `Giảm thưởng ${tien_viet(nhom.tong_tien)} (≥ ngưỡng duyệt) — kỳ ${ky}.`,
          du_lieu: { man: 'ky-luat', ky, ho_so_id },
        });
        da_gui_push = true;
      }
    }

    // Dong bo dong giam thuong theo trang thai HIEN TAI (chi ho so 'da_ap_dung' moi thanh tien):
    // ho so tut xuong nhac_nho hoac len cho_duyet thi khoan giam thuong tu dong bien mat.
    await dong_bo_giam_thuong(khach, nhom.nhan_vien_id, ky);

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

  // `muc_tru_tien_txt`: so tien HIEU LUC cua tung vi pham. Neu loai vi pham `tinh_moi_lan` thi
  // nhan voi SO LAN (chi so trong bang_chung, vd so_lan_di_muon) — di muon 50k * so lan.
  const ds = await truy_van<DongViPham & { muc_tru_tien_txt: string }>(
    `select v.id as vi_pham_id, v.nhan_vien_id, l.muc_do, l.ma as loai_ma, l.ten as loai_ten,
            (case when l.tinh_moi_lan
                  then l.muc_tru_tien * coalesce((v.bang_chung->>'gia_tri')::numeric, 1)
                  else l.muc_tru_tien end)::text as muc_tru_tien_txt
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

/** Trang thai duoc phep chuyen sang 'mien'. Da mien roi thi thoi (idempotent, tra da_mien=true). */
const CHO_PHEP_MIEN = new Set(['moi', 'da_nhac', 'cho_duyet', 'da_ap_dung']);

export interface KetQuaMien {
  ho_so_id: string;
  ma: string | null;
  da_mien: boolean;         // da o trang thai 'mien' truoc do -> khong lam gi.
  nhan_vien_id: string;
  ky: string;
}

/**
 * MIEN mot ho so ky luat (chi admin — kiem o tuyen). Chuyen sang 'mien', go giam thuong khoi ky
 * luong (qua dong_bo_giam_thuong — ho so 'mien' khong tinh vao tong 'da_ap_dung'). Khac `bac_bo`
 * o y nghia: mien = quyet dinh dung nhung cong ty khoan hong; van luu ho so de theo doi.
 */
export async function mien_mot_ho_so(
  ho_so_id: string, nguoi_id: string, ly_do: string,
): Promise<KetQuaMien> {
  return trong_giao_dich(async (khach) => {
    const r = await khach.query<{ nhan_vien_id: string; ky: string; trang_thai: string;
                                  ma: string | null }>(
      'select nhan_vien_id, ky, trang_thai, ma from ho_so_ky_luat where id = $1 for update',
      [ho_so_id],
    );
    const ho = r.rows[0];
    if (ho === undefined) throw new Error('Không tìm thấy hồ sơ kỷ luật.');
    if (ho.trang_thai === 'mien') {
      return { ho_so_id, ma: ho.ma, da_mien: true, nhan_vien_id: ho.nhan_vien_id, ky: ho.ky };
    }
    if (!CHO_PHEP_MIEN.has(ho.trang_thai)) {
      throw new Error(`Hồ sơ đang ở trạng thái "${ho.trang_thai}", không miễn được.`);
    }
    await khach.query(
      `update ho_so_ky_luat set trang_thai = 'mien', nguoi_mien = $2, mien_luc = now(),
              ly_do_mien = $3, chinh_sach_id = null, cap_nhat_luc = now() where id = $1`,
      [ho_so_id, nguoi_id, ly_do],
    );
    // Ho so 'mien' khong con tinh vao tong 'da_ap_dung' -> ap lai (go dong giam thuong cua ky).
    await dong_bo_giam_thuong(khach, ho.nhan_vien_id, ho.ky);

    gui_ngam({
      nguoi_dung_ids: await tai_khoan_cua_nhan_vien(ho.nhan_vien_id),
      tieu_de: 'Được miễn kỷ luật',
      noi_dung: `Kỳ ${ho.ky}: công ty miễn kỷ luật cho bạn. ${ly_do}`,
      du_lieu: { man: 'ky-luat', ky: ho.ky, ho_so_id },
    });
    return { ho_so_id, ma: ho.ma, da_mien: false, nhan_vien_id: ho.nhan_vien_id, ky: ho.ky };
  });
}

/** Mien HANG LOAT. Chay tung ho so; loi mot ho so khong keo do ho so khac. Tra ket qua tung cai. */
export async function mien_ky_luat(
  ids: readonly string[], nguoi_id: string, ly_do: string,
): Promise<{ so_mien: number; so_bo_qua: number; loi: { ho_so_id: string; loi: string }[] }> {
  let so_mien = 0;
  let so_bo_qua = 0;
  const loi: { ho_so_id: string; loi: string }[] = [];
  for (const id of ids) {
    try {
      const r = await mien_mot_ho_so(id, nguoi_id, ly_do);
      if (r.da_mien) so_bo_qua += 1; else so_mien += 1;
    } catch (e) {
      loi.push({ ho_so_id: id, loi: (e as Error).message });
    }
  }
  return { so_mien, so_bo_qua, loi };
}
