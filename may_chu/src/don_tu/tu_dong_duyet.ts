// TU DONG DUYET don nghi (giai doan 1 — giam duyet tay).
//
// QUY TAC (chu cong ty chot), ap dung cho don co tu_ngay >= TU_NGAY_AP:
//   1. Don 'khong_luong'        -> tu dong DUYET (khong xet quy).
//   2. Cac loai con lai (phep_nam, om, thai_san, ket_hon, hieu) -> XET QUY PHEP NAM theo Luat
//      (chia theo thang lam):
//        - het phep (con_lai <= 0)        -> TU CHOI ca don, email bao ly do.
//        - du phep (con_lai >= so ngay)    -> DUYET het la phep nam.
//        - thieu (0 < con_lai < so ngay)   -> DUYET: con_lai ngay dau = phep nam, con lai = khong
//                                             luong (tach don), email ghi ro.
//   Duyet la phep nam nghia la TRU vao quy (quy_phep chi dem loai='phep_nam' da_duyet).
//
// Email quyet dinh gui cho nguoi lao dong. Backlog (don ton) xu ly IM (khong email) de tranh gui
// hang loat email hoi to; don NOP MOI gui email.
import type pg from 'pg';
import { truy_van, truy_van_mot, trong_giao_dich } from '../csdl/ket_noi.ts';
import { tinh_lai_khoang } from '../cong/tinh_cong.ts';
import { gui_ngam, tai_khoan_cua_nhan_vien } from '../su_kien/thong_bao_day.ts';
import { gui_email, email_bat } from '../su_kien/gui_email.ts';
import { ghi_su_kien } from '../su_kien/hop_thu_di.ts';
import { ban_don_am_tham } from './ban_don.ts';
import { so_thang_lam_trong_nam, quy_phep_theo_luat } from './quy_phep_nam.ts';
import { id_tai_khoan_he_thong } from '../bao_mat/tai_khoan_he_thong.ts';
import { danh_sach_ngay, ngay_viet } from '../tien_ich/thoi_gian.ts';

/** Tu ngay nay tro di don duoc tu dong duyet (chu cong ty chot). */
export const TU_NGAY_AP = '2026-08-01';

const NHAN_LOAI: Record<string, string> = {
  phep_nam: 'Nghỉ phép năm', khong_luong: 'Nghỉ không lương', om: 'Nghỉ ốm',
  thai_san: 'Nghỉ thai sản', ket_hon: 'Nghỉ kết hôn', hieu: 'Nghỉ việc riêng (hiếu)',
};

export interface DonNghi {
  id: string;
  nhan_vien_id: string;
  loai: string;
  tu_ngay: string;   // 'YYYY-MM-DD'
  den_ngay: string;
  nua_ngay: boolean;
  ly_do: string | null;
}

// ---------------------------------------------------------------- phan quyet dinh (thuan)

export type QuyetDinh =
  | { kieu: 'duyet_khong_luong' }
  | { kieu: 'duyet_phep' }
  | { kieu: 'tach'; giu_den: string; kl_tu: string; so_phep: number; so_kl: number }
  | { kieu: 'tu_choi'; ly_do: string };

/**
 * Quyet dinh cho MOT don da biet quy con lai. `ngays` = danh sach ngay nghi (da cat trong nam),
 * `w` = trong so moi ngay (0.5 neu nua ngay, 1 neu ca ngay).
 */
export function quyet_dinh_don(
  loai: string, ngays: readonly string[], nua_ngay: boolean, con_lai: number,
): QuyetDinh {
  if (loai === 'khong_luong') return { kieu: 'duyet_khong_luong' };
  if (con_lai <= 1e-9) {
    return { kieu: 'tu_choi', ly_do: 'Đã hết phép năm — không đủ phép để duyệt.' };
  }
  const w = nua_ngay ? 0.5 : 1;
  let con = con_lai;
  let so_phep = 0;
  for (let i = 0; i < ngays.length; i++) {
    if (con + 1e-9 >= w) { con -= w; so_phep += 1; } else break;
  }
  if (so_phep === ngays.length) return { kieu: 'duyet_phep' };
  if (so_phep === 0) return { kieu: 'duyet_khong_luong' }; // con phep nhung khong du 1 ngay -> khong luong
  return {
    kieu: 'tach',
    giu_den: ngays[so_phep - 1] as string,
    kl_tu: ngays[so_phep] as string,
    so_phep, so_kl: ngays.length - so_phep,
  };
}

// ---------------------------------------------------------------- quy con lai

/** So ngay phep nam DA DUYET trong `nam` (khong tinh don `tru_don_id`). Nua ngay = 0.5. */
async function da_dung_phep(nv_id: string, nam: number, tru_don_id: string): Promise<number> {
  const dau = `${nam}-01-01`;
  const cuoi = `${nam}-12-31`;
  const dons = await truy_van<{ tu_ngay: string; den_ngay: string; nua_ngay: boolean }>(
    `select to_char(tu_ngay,'YYYY-MM-DD') as tu_ngay, to_char(den_ngay,'YYYY-MM-DD') as den_ngay,
            nua_ngay
       from don_nghi_phep
      where nhan_vien_id = $1 and loai = 'phep_nam' and trang_thai = 'da_duyet'
        and id <> $4 and tu_ngay <= $3 and den_ngay >= $2`,
    [nv_id, dau, cuoi, tru_don_id],
  );
  let s = 0;
  for (const d of dons) {
    const tu = d.tu_ngay > dau ? d.tu_ngay : dau;
    const den = d.den_ngay < cuoi ? d.den_ngay : cuoi;
    const n = danh_sach_ngay(tu, den).length;
    if (n > 0) s += (d.nua_ngay ? 0.5 : 1) * n;
  }
  return s;
}

/** Quy phep nam con lai cua nhan vien tinh den thoi diem xet (chua tinh don dang xet). */
export async function con_lai_phep(nv_id: string, don_id: string, nam: number): Promise<number> {
  const nv = await truy_van_mot<{ ngay_vao: string | null; ngay_nghi_viec: string | null; base: number }>(
    `select to_char(ngay_vao,'YYYY-MM-DD') as ngay_vao,
            to_char(ngay_nghi_viec,'YYYY-MM-DD') as ngay_nghi_viec,
            coalesce(so_ngay_phep_nam, 12)::float8 as base
       from nhan_vien where id = $1`,
    [nv_id],
  );
  if (nv === null) return 0;
  const quy = quy_phep_theo_luat(nv.base, so_thang_lam_trong_nam(nv.ngay_vao, nv.ngay_nghi_viec, nam));
  const da = await da_dung_phep(nv_id, nam, don_id);
  return Math.round((quy - da) * 10) / 10;
}

// ---------------------------------------------------------------- ap dung + email

const MARKER = '[auto_duyet]';

export interface KetQuaDon {
  don_id: string;
  quyet: 'da_duyet' | 'tu_choi';
  // 'chuyen_quy' = don bi bo can doi quy phep nam (ap_quy_phep_nam) chuyen sang khong luong.
  kieu: QuyetDinh['kieu'] | 'chuyen_quy';
  so_phep: number;
  so_kl: number;
  ly_do?: string;
}

function than_email(
  ho_ten: string, loai: string, tu: string, den: string, kq: KetQuaDon,
): { tieu_de: string; html: string } {
  const khoang = tu === den ? ngay_viet(tu) : `${ngay_viet(tu)}–${ngay_viet(den)}`;
  const chuyen_quy = kq.kieu === 'chuyen_quy';
  const duyet = kq.quyet === 'da_duyet';
  const mau = chuyen_quy ? '#2563EB' : duyet ? '#16A34A' : '#DC2626';
  const tieu_de = chuyen_quy ? 'Cập nhật đơn nghỉ (quỹ phép năm)'
    : duyet ? 'Đơn nghỉ đã được duyệt' : 'Đơn nghỉ bị từ chối';

  let chi_tiet = '';
  if (chuyen_quy) {
    chi_tiet = `<p style="margin:0 0 10px">Do đã dùng hết/vượt <b>quỹ phép năm</b>,
      ${kq.quyet === 'tu_choi' ? '<b>toàn bộ</b>' : '<b>một phần</b>'} ngày nghỉ của đơn này được
      chuyển sang <b>nghỉ không lương</b>. Xem chi tiết từng ngày trong ứng dụng (mục
      <b>Đơn của tôi</b>).</p>`;
  } else if (kq.kieu === 'tach') {
    chi_tiet = `<p style="margin:0 0 10px">Kết quả: <b>${String(kq.so_phep)} ngày nghỉ phép năm</b>
      (có lương) + <b>${String(kq.so_kl)} ngày nghỉ không lương</b> (do vượt quỹ phép năm).</p>`;
  } else if (kq.kieu === 'duyet_phep') {
    chi_tiet = `<p style="margin:0 0 10px">Kết quả: duyệt <b>nghỉ phép năm</b> (trừ vào quỹ phép năm).</p>`;
  } else if (kq.kieu === 'duyet_khong_luong') {
    chi_tiet = `<p style="margin:0 0 10px">Kết quả: duyệt <b>nghỉ không lương</b>.</p>`;
  } else {
    chi_tiet = `<p style="margin:0 0 10px;color:#B91C1C">Lý do: ${kq.ly_do ?? 'Đã hết phép năm.'}</p>`;
  }

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.55;max-width:560px">
    <div style="background:${mau};color:#fff;padding:14px 18px;border-radius:8px 8px 0 0;font-size:16px;font-weight:700">
      ${tieu_de}
    </div>
    <div style="border:1px solid #E5E7EB;border-top:0;border-radius:0 0 8px 8px;padding:18px">
      <p style="margin:0 0 10px">Kính gửi <b>${ho_ten}</b>,</p>
      <p style="margin:0 0 10px">Đơn <b>${NHAN_LOAI[loai] ?? loai}</b> ngày <b>${khoang}</b> của bạn đã được
        hệ thống xử lý tự động.</p>
      ${chi_tiet}
      <p style="margin:10px 0 0">Nếu chưa rõ, bạn xem chi tiết trong ứng dụng chấm công (mục
        <b>Đơn của tôi</b>) hoặc liên hệ Phòng Nhân sự.</p>
      <p style="margin:14px 0 0;color:#6B7280;font-size:12px">
        Email tự động từ hệ thống chấm công — vui lòng không trả lời trực tiếp.<br/>
        Trân trọng,<br/><b>Phòng Nhân sự — Công ty TNHH Trần Hoàng Việt Nam</b></p>
    </div>
  </div>`;
  return { tieu_de: `${tieu_de} (${khoang})`, html };
}

/**
 * Xu ly tu dong MOT don nghi da o trang thai 'cho_duyet'. Ap quyet dinh (duyet/tu choi/tach),
 * tinh lai cong, sinh ban don, thong bao app, va (neu `email=true`) gui email quyet dinh.
 */
export async function xu_ly_mot_don(don: DonNghi, opts: { email?: boolean } = {}): Promise<KetQuaDon> {
  const nam = Number(don.tu_ngay.slice(0, 4));
  const dau_nam = `${nam}-01-01`;
  const cuoi_nam = `${nam}-12-31`;
  const tu = don.tu_ngay > dau_nam ? don.tu_ngay : dau_nam;
  const den = don.den_ngay < cuoi_nam ? don.den_ngay : cuoi_nam;
  const ngays = danh_sach_ngay(tu, den);

  const con = don.loai === 'khong_luong' ? 1 : await con_lai_phep(don.nhan_vien_id, don.id, nam);
  const qd = quyet_dinh_don(don.loai, ngays, don.nua_ngay, con);

  const kq: KetQuaDon = {
    don_id: don.id,
    quyet: qd.kieu === 'tu_choi' ? 'tu_choi' : 'da_duyet',
    kieu: qd.kieu,
    so_phep: qd.kieu === 'tach' ? qd.so_phep : qd.kieu === 'duyet_phep' ? ngays.length : 0,
    so_kl: qd.kieu === 'tach' ? qd.so_kl : qd.kieu === 'duyet_khong_luong' ? ngays.length : 0,
    ly_do: qd.kieu === 'tu_choi' ? qd.ly_do : undefined,
  };

  // Quyet dinh tu dong phai mang danh tinh he thong ro rang (KHONG de nguoi_duyet_id NULL).
  const nd_he_thong = await id_tai_khoan_he_thong();

  await trong_giao_dich(async (khach) => {
    if (qd.kieu === 'tu_choi') {
      await khach.query(
        `update don_nghi_phep set trang_thai = 'tu_choi', quyet_luc = now(),
                nguoi_duyet_id = $3, ghi_chu_duyet = $2 where id = $1 and trang_thai = 'cho_duyet'`,
        [don.id, `${MARKER} ${qd.ly_do}`, nd_he_thong],
      );
      return;
    }
    const loai_moi = qd.kieu === 'duyet_khong_luong' ? 'khong_luong' : 'phep_nam';
    if (qd.kieu === 'tach') {
      // Giu phan phep (rut ngan den giu_den, loai phep_nam), tao don khong luong cho phan vuot.
      await khach.query(
        `update don_nghi_phep set trang_thai = 'da_duyet', loai = 'phep_nam', den_ngay = $2,
                nua_ngay = false, quyet_luc = now(), nguoi_duyet_id = $4, ghi_chu_duyet = $3
          where id = $1 and trang_thai = 'cho_duyet'`,
        [don.id, qd.giu_den, `${MARKER} Duyệt ${qd.so_phep} ngày phép + ${qd.so_kl} ngày không lương`,
          nd_he_thong],
      );
      await khach.query(
        `insert into don_nghi_phep
           (nhan_vien_id, loai, tu_ngay, den_ngay, nua_ngay, ly_do, trang_thai, quyet_luc,
            nguoi_duyet_id, ghi_chu_duyet)
         values ($1,'khong_luong',$2,$3,false,$4,'da_duyet', now(), $6, $5)`,
        [don.nhan_vien_id, qd.kl_tu, don.den_ngay,
          don.ly_do ?? `Vượt quỹ phép năm (${NHAN_LOAI[don.loai] ?? don.loai})`,
          `${MARKER} Phần vượt quỹ phép năm từ đơn gốc`, nd_he_thong],
      );
    } else {
      await khach.query(
        `update don_nghi_phep set trang_thai = 'da_duyet', loai = $2, quyet_luc = now(),
                nguoi_duyet_id = $4, ghi_chu_duyet = $3 where id = $1 and trang_thai = 'cho_duyet'`,
        [don.id, loai_moi, `${MARKER} Tự động duyệt (${NHAN_LOAI[loai_moi]})`, nd_he_thong],
      );
    }

    const nv = await khach.query<{ ma_nv: string; ma_erp: string | null }>(
      'select ma_nv, ma_erp from nhan_vien where id = $1', [don.nhan_vien_id],
    );
    await ghi_su_kien('nghi_phep.da_duyet', {
      don_id: don.id, nhan_vien_id: don.nhan_vien_id,
      ma_nv: nv.rows[0]?.ma_nv ?? null, ma_erp: nv.rows[0]?.ma_erp ?? null,
      loai: loai_moi, tu_ngay: don.tu_ngay, den_ngay: don.den_ngay,
      so_ngay: ngays.length - (don.nua_ngay ? 0.5 : 0),
    }, khach);
  });

  // Ngoai giao dich: tinh lai cong khoang ngay, sinh ban don (neu duyet), thong bao + email.
  await tinh_lai_khoang(don.tu_ngay, don.den_ngay, don.nhan_vien_id);
  if (kq.quyet === 'da_duyet') await ban_don_am_tham('nghi_phep', don.id);

  const nguoi = await truy_van_mot<{ ho_ten: string; email: string | null }>(
    'select ho_ten, email from nhan_vien where id = $1', [don.nhan_vien_id],
  );
  const tk = await tai_khoan_cua_nhan_vien(don.nhan_vien_id).catch(() => []);
  if (tk.length > 0) {
    gui_ngam({
      nguoi_dung_ids: tk,
      tieu_de: kq.quyet === 'da_duyet' ? 'Đơn nghỉ đã được duyệt (tự động)' : 'Đơn nghỉ bị từ chối (tự động)',
      noi_dung: kq.ly_do ?? `${NHAN_LOAI[don.loai] ?? don.loai} ${ngay_viet(don.tu_ngay)}`,
      du_lieu: { man: 'don-tu', loai: 'nghi_phep', don_id: don.id, quyet_dinh: kq.quyet },
    });
  }
  if ((opts.email ?? false) && email_bat() && nguoi?.email != null && nguoi.email.includes('@')) {
    const e = than_email(nguoi.ho_ten, don.loai, don.tu_ngay, don.den_ngay, kq);
    await gui_email({ den: [nguoi.email], tieu_de: e.tieu_de, noi_dung_html: e.html });
  }
  return kq;
}

/**
 * Gui (hoac gui lai) email QUYET DINH cho cac don da TU DONG quyet (marker [auto_duyet]) tu
 * `tu_ngay`. Dung khi backlog da chay voi email tat. Bo qua don khong co email. KHONG gui cho don
 * khong luong "phan vuot" cua mot don tach (de moi don goc chi mot email).
 */
export async function gui_email_da_quyet(
  tu_ngay: string = TU_NGAY_AP, opts: { chi_quy_phep?: boolean } = {},
): Promise<{ so_gui: number; so_bo_qua: number }> {
  if (!email_bat()) return { so_gui: 0, so_bo_qua: 0 };
  // `chi_quy_phep` = chi gui cho don bi bo can doi quy phep ([auto_quy_phep]) — de gui bo sung ma
  // KHONG gui lai cho cac don [auto_duyet] da gui truoc do.
  const chi_quy = opts.chi_quy_phep ?? false;
  const dons = await truy_van<{
    loai: string; tu_ngay: string; den_ngay: string; trang_thai: string;
    ghi_chu_duyet: string | null; ho_ten: string; email: string | null;
  }>(
    `select d.loai, to_char(d.tu_ngay,'YYYY-MM-DD') as tu_ngay,
            to_char(d.den_ngay,'YYYY-MM-DD') as den_ngay, d.trang_thai, d.ghi_chu_duyet,
            nv.ho_ten, nv.email
       from don_nghi_phep d join nhan_vien nv on nv.id = d.nhan_vien_id
      where ($2::boolean is not true and d.ghi_chu_duyet like '${MARKER}%'
             or d.ghi_chu_duyet like '[auto_quy_phep]%')
        and d.ghi_chu_duyet not like '${MARKER} Phần vượt%'
        and d.ghi_chu_duyet not like '[auto_quy_phep] Tao tu phan vuot%'
        and d.trang_thai in ('da_duyet', 'tu_choi') and d.tu_ngay >= $1
      order by d.tu_ngay`,
    [tu_ngay, chi_quy],
  );
  let so_gui = 0;
  let so_bo_qua = 0;
  for (const d of dons) {
    if (d.email === null || !d.email.includes('@')) { so_bo_qua += 1; continue; }
    const la_quy = (d.ghi_chu_duyet ?? '').startsWith('[auto_quy_phep]');
    const tach = /Duyệt (\d+) ngày phép \+ (\d+) ngày/.exec(d.ghi_chu_duyet ?? '');
    const kq: KetQuaDon = la_quy
      ? { don_id: '', quyet: d.trang_thai === 'tu_choi' ? 'tu_choi' : 'da_duyet',
        kieu: 'chuyen_quy', so_phep: 0, so_kl: 0 }
      : d.trang_thai === 'tu_choi'
        ? { don_id: '', quyet: 'tu_choi', kieu: 'tu_choi', so_phep: 0, so_kl: 0,
          ly_do: 'Đã hết phép năm — không đủ phép để duyệt.' }
        : tach !== null
          ? { don_id: '', quyet: 'da_duyet', kieu: 'tach', so_phep: Number(tach[1]), so_kl: Number(tach[2]) }
          : d.loai === 'khong_luong'
            ? { don_id: '', quyet: 'da_duyet', kieu: 'duyet_khong_luong', so_phep: 0, so_kl: 0 }
            : { don_id: '', quyet: 'da_duyet', kieu: 'duyet_phep', so_phep: 0, so_kl: 0 };
    const e = than_email(d.ho_ten, d.loai, d.tu_ngay, d.den_ngay, kq);
    const ok = await gui_email({ den: [d.email], tieu_de: e.tieu_de, noi_dung_html: e.html });
    if (ok) so_gui += 1; else so_bo_qua += 1;
  }
  return { so_gui, so_bo_qua };
}

/** Tu dong xu ly mot don theo id (dung khi nop don moi). Bo qua neu don khong con 'cho_duyet'. */
export async function tu_dong_quyet_don(don_id: string, opts: { email?: boolean } = {}): Promise<KetQuaDon | null> {
  const don = await truy_van_mot<DonNghi>(
    `select id, nhan_vien_id, loai, to_char(tu_ngay,'YYYY-MM-DD') as tu_ngay,
            to_char(den_ngay,'YYYY-MM-DD') as den_ngay, nua_ngay, ly_do
       from don_nghi_phep where id = $1 and trang_thai = 'cho_duyet'`,
    [don_id],
  );
  if (don === null) return null;
  if (don.tu_ngay < TU_NGAY_AP) return null; // truoc moc ap dung: giu nguyen (duyet tay)
  return xu_ly_mot_don(don, opts);
}

export interface DongXemTruoc {
  ma_nv: string; ho_ten: string; loai: string; tu_ngay: string; den_ngay: string;
  quyet: 'da_duyet' | 'tu_choi'; kieu: QuyetDinh['kieu']; so_phep: number; so_kl: number;
}

/**
 * XEM TRUOC (dry-run) backlog: tinh quyet dinh cho tung don ma KHONG sua CSDL. Mo phong tich luy
 * quy phep trong bo nho theo thu tu thoi gian de ket qua khop voi khi chay that.
 */
export async function xem_truoc_backlog(tu_ngay: string = TU_NGAY_AP): Promise<DongXemTruoc[]> {
  const dons = await truy_van<DonNghi & { ma_nv: string; ho_ten: string }>(
    `select d.id, d.nhan_vien_id, d.loai, to_char(d.tu_ngay,'YYYY-MM-DD') as tu_ngay,
            to_char(d.den_ngay,'YYYY-MM-DD') as den_ngay, d.nua_ngay, d.ly_do,
            nv.ma_nv, nv.ho_ten
       from don_nghi_phep d join nhan_vien nv on nv.id = d.nhan_vien_id
      where d.trang_thai = 'cho_duyet' and d.tu_ngay >= $1
      order by d.nhan_vien_id, d.tu_ngay, d.id`,
    [tu_ngay],
  );
  const con = new Map<string, number>();
  const kq: DongXemTruoc[] = [];
  for (const d of dons) {
    const nam = Number(d.tu_ngay.slice(0, 4));
    if (!con.has(d.nhan_vien_id)) {
      // Don dang xet 'cho_duyet' khong tinh vao da_dung (chi dem da_duyet), nen truyen id gia.
      con.set(d.nhan_vien_id, await con_lai_phep(d.nhan_vien_id, d.id, nam));
    }
    const c = con.get(d.nhan_vien_id)!;
    const dau = `${nam}-01-01`;
    const cuoi = `${nam}-12-31`;
    const ngays = danh_sach_ngay(d.tu_ngay > dau ? d.tu_ngay : dau, d.den_ngay < cuoi ? d.den_ngay : cuoi);
    const qd = quyet_dinh_don(d.loai, ngays, d.nua_ngay, d.loai === 'khong_luong' ? 1 : c);
    const so_phep = qd.kieu === 'tach' ? qd.so_phep : qd.kieu === 'duyet_phep' ? ngays.length : 0;
    const so_kl = qd.kieu === 'tach' ? qd.so_kl : qd.kieu === 'duyet_khong_luong' ? ngays.length : 0;
    if (d.loai !== 'khong_luong') con.set(d.nhan_vien_id, c - so_phep * (d.nua_ngay ? 0.5 : 1));
    kq.push({
      ma_nv: d.ma_nv, ho_ten: d.ho_ten, loai: d.loai, tu_ngay: d.tu_ngay, den_ngay: d.den_ngay,
      quyet: qd.kieu === 'tu_choi' ? 'tu_choi' : 'da_duyet', kieu: qd.kieu, so_phep, so_kl,
    });
  }
  return kq;
}

export interface KetQuaBacklog {
  so_xet: number; so_duyet_phep: number; so_tach: number; so_khong_luong: number; so_tu_choi: number;
}

/**
 * Xu ly BACKLOG: tat ca don 'cho_duyet' co tu_ngay >= `tu_ngay`. Theo THU TU THOI GIAN (moi nguoi
 * don som tieu quy truoc). Mac dinh KHONG email (tranh gui hang loat hoi to).
 */
export async function chay_backlog(
  tu_ngay: string = TU_NGAY_AP, opts: { email?: boolean } = {},
): Promise<KetQuaBacklog> {
  const dons = await truy_van<DonNghi>(
    `select id, nhan_vien_id, loai, to_char(tu_ngay,'YYYY-MM-DD') as tu_ngay,
            to_char(den_ngay,'YYYY-MM-DD') as den_ngay, nua_ngay, ly_do
       from don_nghi_phep
      where trang_thai = 'cho_duyet' and tu_ngay >= $1
      order by nhan_vien_id, tu_ngay, id`,
    [tu_ngay],
  );
  const kq: KetQuaBacklog = {
    so_xet: 0, so_duyet_phep: 0, so_tach: 0, so_khong_luong: 0, so_tu_choi: 0,
  };
  for (const don of dons) {
    try {
      const r = await xu_ly_mot_don(don, { email: opts.email ?? false });
      kq.so_xet += 1;
      if (r.kieu === 'duyet_phep') kq.so_duyet_phep += 1;
      else if (r.kieu === 'tach') kq.so_tach += 1;
      else if (r.kieu === 'duyet_khong_luong') kq.so_khong_luong += 1;
      else kq.so_tu_choi += 1;
    } catch (loi) {
      console.error(`[tu_dong_duyet] loi don ${don.id}:`, (loi as Error).message);
    }
  }
  return kq;
}
