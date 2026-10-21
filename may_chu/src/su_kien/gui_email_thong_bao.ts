// Gui email THONG BAO (ke ca van ban AI da ban hanh) kem DOCX toi dung tap nguoi nhan.
//
// Fail-soft va KHONG nam trong luong request: duoc goi fire-and-forget sau khi ban hanh /
// dang thong bao thanh cong, va co vong QUET CHO (lich_chay) de bu nhung lan mat sau crash.
// Ket qua ghi lai tren bang `thong_bao` (da_gui_email / gui_email_luc / gui_email_loi) de
// giao dien hien chip trang thai + nut "Gui lai email".
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { doc_tep_ho_so } from '../tien_ich/luu_tep.ts';
import { chuan_ngon_ngu, tra_chuoi } from '../chuoi/chi_muc.ts';
import type { NgonNgu } from '../chuoi/chi_muc.ts';
import { dich_van_ban_zh } from '../ai/dich_van_ban.ts';
import { goi_deepseek } from '../ai/deepseek.ts';
import { email_bat, gui_email } from './gui_email.ts';

export interface DongThongBao {
  id: string;
  ma: string;
  tieu_de: string;
  noi_dung: string;
  /** Ban tieng Trung (AI dich) — trong = chua dich. */
  tieu_de_zh: string | null;
  noi_dung_zh: string | null;
  pham_vi: string;
  phong_ban_id: string | null;
  nhan_vien_id: string | null;
  ten_luu: string | null;
  mime: string | null;
  da_go: boolean;
  da_gui_email: boolean;
}

export interface KetQuaGuiEmail {
  ok: boolean;
  ly_do?: string;
  so_nhan?: number;
}

/**
 * Lay dia chi email cua nguoi nhan theo pham vi, NHOM THEO NGON NGU cua tai khoan nguoi
 * dung (nhan vien chua co tai khoan mac dinh 'vi'). Chi nhan vien DANG HOAT DONG va co
 * email; moi dia chi chi nam trong mot nhom — khong gui trung.
 * Toan cong ty / phong ban nhan theo phong_ban_id; ca nhan theo dung nguoi do.
 */
export async function lay_dia_chi_nhan_theo_ngon_ngu(
  pham_vi: string, phong_ban_id: string | null, nhan_vien_id: string | null,
): Promise<Record<NgonNgu, string[]>> {
  const dong = await truy_van<{ email: string; ngon_ngu: string | null }>(
    `select distinct nv.email, nd.ngon_ngu
       from nhan_vien nv
       left join nguoi_dung nd on nd.nhan_vien_id = nv.id
      where nv.dang_hoat_dong = true
        and nv.email is not null and btrim(nv.email) <> ''
        and ($1 = 'toan_cong_ty'
             or ($1 = 'phong_ban' and (
                   nv.phong_ban_id = $2::uuid
                   or exists (select 1 from phong_ban_kiem_nhiem pbk
                               where pbk.nhan_vien_id = nv.id
                                 and pbk.phong_ban_id = $2::uuid)
                   or nd.vai_tro = 'admin'))
             or ($1 = 'ca_nhan' and nv.id = $3::uuid))`,
    [pham_vi, phong_ban_id, nhan_vien_id],
  );
  const ket: Record<NgonNgu, string[]> = { vi: [], zh: [] };
  const da_co = new Set<string>();
  for (const d of dong) {
    const khoa = d.email.trim().toLowerCase();
    if (khoa === '' || da_co.has(khoa)) continue;
    da_co.add(khoa);
    ket[chuan_ngon_ngu(d.ngon_ngu)].push(d.email.trim());
  }
  return ket;
}

/**
 * Lay tat ca dia chi email cua nguoi nhan theo pham vi (gom ca hai ngon ngu). Dung cho cac
 * email he thong khac (vd moi gop y du thao van ban).
 */
export async function lay_dia_chi_nhan(
  pham_vi: string, phong_ban_id: string | null, nhan_vien_id: string | null,
): Promise<string[]> {
  const g = await lay_dia_chi_nhan_theo_ngon_ngu(pham_vi, phong_ban_id, nhan_vien_id);
  return [...g.vi, ...g.zh];
}

/** Tieu de email co tien to ten he thong ([Chấm công] / [考勤]) theo ngon ngu nguoi nhan. */
export function tieu_de_email_thong_bao(t: DongThongBao, ngon_ngu: NgonNgu = 'vi'): string {
  const tieu_de = ngon_ngu === 'zh' && (t.tieu_de_zh ?? '').trim() !== ''
    ? (t.tieu_de_zh as string)
    : t.tieu_de;
  return `[${tra_chuoi(ngon_ngu, 'email_chu_de_tien_to')}] ${tieu_de}`;
}

/**
 * Chuyen noi dung thong bao (van ban thuong) thanh HTML email chuyen nghiep theo mau chung
 * cua he thong: dai bang xanh, the noi dung, hop ghi chu va CHU KY Phong Nhan su + ten cong
 * ty o chan thu. Khung lay tu tu dien song ngu theo ngon ngu NGUOI NHAN; noi dung thong bao
 * giu nguyen van ban goc. Chong HTML injection: moi du lieu tu CSDL/nguoi nhap deu thoat.
 */
export function html_email_thong_bao(t: DongThongBao, ngon_ngu: NgonNgu = 'vi'): string {
  const thoat = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Email tieng Trung dung noi dung TQ neu co; chua dich thi giu nguyen van ban goc.
  const noi_dung_goc = ngon_ngu === 'zh' && (t.noi_dung_zh ?? '').trim() !== ''
    ? (t.noi_dung_zh as string)
    : t.noi_dung;
  const doan = noi_dung_goc
    .split(/\n+/)
    .map((d) => d.trim())
    .filter((d) => d !== '')
    .map((d) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#111">${thoat(d)}</p>`)
    .join('\n');
  const ghi_chu_dinh_kem = t.ten_luu !== null ? `${tra_chuoi(ngon_ngu, 'email_tep_dinh_kem')} ` : '';
  const tieu_de = ngon_ngu === 'zh' && (t.tieu_de_zh ?? '').trim() !== ''
    ? (t.tieu_de_zh as string)
    : t.tieu_de;
  return '<!doctype html><html lang="' + (ngon_ngu === 'zh' ? 'zh-CN' : 'vi')
    + '"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1"></head>'
    + '<body style="margin:0;padding:0;background:#F3F4F6">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6">'
    + '<tr><td align="center" style="padding:24px 12px">'
    + '<div style="max-width:600px;width:100%;text-align:left;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5">'
    + '<div style="background:#2563EB;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0">'
    + `<div style="font-size:12px;letter-spacing:2px;opacity:.85">${tra_chuoi(ngon_ngu, 'email_thong_bao_noi_bo')}</div>`
    + `<div style="font-size:18px;font-weight:700;margin-top:4px">${thoat(tieu_de)}</div>`
    + '</div>'
    + '<div style="background:#fff;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 8px 8px;padding:22px 24px">'
    + `<div style="font-size:12px;color:#6B7280;margin-bottom:14px">${tra_chuoi(ngon_ngu, 'email_ma_thong_bao')}: ${thoat(t.ma)}</div>`
    + doan
    + '<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:12px 14px;margin-top:16px;font-size:13px;color:#1E40AF">'
    + ghi_chu_dinh_kem + tra_chuoi(ngon_ngu, 'email_xac_nhan_da_doc')
    + '</div>'
    + '<div style="border-top:1px solid #E5E7EB;margin-top:20px;padding-top:16px">'
    + `<p style="margin:0 0 8px;font-size:14px;color:#111">${tra_chuoi(ngon_ngu, 'email_tran_trong')}</p>`
    + `<p style="margin:0;font-size:14px;color:#111"><b>${tra_chuoi(ngon_ngu, 'email_phong_nhan_su')}</b><br/>`
    + tra_chuoi(ngon_ngu, 'email_cong_ty')
    + '</p>'
    + '</div>'
    + `<p style="margin:18px 0 0;color:#9CA3AF;font-size:11px">${tra_chuoi(ngon_ngu, 'email_tu_dong')}</p>`
    + '</div>'
    + '</div>'
    + '</td></tr></table></body></html>';
}

/** Doc docx ban hanh (neu co) + cac tep kem cua van ban de dinh kem vao email. */
async function dinh_kem_cua(t: DongThongBao): Promise<{ ten: string; mime: string; du_lieu: Buffer }[]> {
  const ds: { ten: string; mime: string; du_lieu: Buffer }[] = [];
  if (t.ten_luu !== null) {
    const du_lieu = await doc_tep_ho_so(t.ten_luu);
    if (du_lieu !== null) {
      ds.push({
        ten: `${t.ma}.docx`,
        mime: t.mime ?? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        du_lieu,
      });
    }
  }
  const tep_kem = await truy_van<{ ten_goc: string; ten_luu: string; kieu_mime: string }>(
    `select ten_goc, ten_luu, kieu_mime from ho_so_tep
      where nhom = 'thong_bao_tep_kem' and thuoc_id = $1
      order by tao_luc`,
    [t.id],
  );
  for (const k of tep_kem) {
    const du_lieu = await doc_tep_ho_so(k.ten_luu);
    if (du_lieu !== null) {
      ds.push({ ten: k.ten_goc, mime: k.kieu_mime, du_lieu });
    }
  }
  return ds;
}

/**
 * Dam bao co ban dich tieng Trung truoc khi gui email cho nhom TQ. Dich on-the-fly qua
 * LLM neu chua co (ban nhap tu_soan, thong bao thu cong, du lieu cu) roi LUU LAI vao bang
 * de lan gui lai khong phai dich nua. Fail-soft tuyet doi: LLM loi thi giu nguyen tieng Viet.
 */
async function bao_dam_ban_dich(t: DongThongBao): Promise<void> {
  if ((t.noi_dung_zh ?? '').trim() !== '') return;
  const ban_dich = await dich_van_ban_zh(
    (prompt) => goi_deepseek(prompt),
    t.tieu_de,
    t.noi_dung.split(/\n+/).filter((d) => d.trim() !== ''),
  );
  if (ban_dich === null) return;
  t.tieu_de_zh = ban_dich.trich_yeu_zh;
  t.noi_dung_zh = ban_dich.noi_dung_zh.join('\n');
  await thuc_thi(
    `update thong_bao set tieu_de_zh = $2, noi_dung_zh = $3 where id = $1`,
    [t.id, t.tieu_de_zh, t.noi_dung_zh],
  ).catch(() => {});
}

/**
 * Gui email cho mot thong bao. Tra ket qua, KHONG nem loi — moi loi deu ghi vao cot
 * gui_email_loi de giao dien hien ro. Goi lai duoc nhieu lan (nut "Gui lai email").
 */
export async function gui_email_thong_bao(id_thong_bao: string): Promise<KetQuaGuiEmail> {
  const t = await truy_van_mot<DongThongBao>(
    `select id, ma, tieu_de, noi_dung, tieu_de_zh, noi_dung_zh,
            pham_vi, phong_ban_id, nhan_vien_id,
            ten_luu, mime, da_go, da_gui_email
       from thong_bao where id = $1`,
    [id_thong_bao],
  );
  if (t === null) return { ok: false, ly_do: 'Không tìm thấy thông báo.' };
  if (t.da_go) return { ok: false, ly_do: 'Thông báo đã gỡ, không gửi email.' };

  if (!email_bat()) {
    await thuc_thi(
      `update thong_bao
          set gui_email_loi = $2, gui_email_luc = coalesce(gui_email_luc, now())
        where id = $1`,
      [id_thong_bao, 'Chưa khai báo MS_MAIL_* trong .env (Graph sendMail).'],
    );
    return { ok: false, ly_do: 'Máy chủ chưa khai báo hộp thư gửi (MS_MAIL_*).' };
  }

  const theo_ngon_ngu = await lay_dia_chi_nhan_theo_ngon_ngu(t.pham_vi, t.phong_ban_id, t.nhan_vien_id);
  const so_nhan = theo_ngon_ngu.vi.length + theo_ngon_ngu.zh.length;
  if (so_nhan === 0) {
    await thuc_thi(
      `update thong_bao
          set gui_email_loi = $2, gui_email_luc = coalesce(gui_email_luc, now())
        where id = $1`,
      [id_thong_bao, 'Không có nhân viên nào trong phạm vi có email.'],
    );
    return { ok: false, ly_do: 'Không có nhân viên nào trong phạm vi có email.' };
  }

  const dinh_kem = await dinh_kem_cua(t);
  // Nhom TQ co nguoi nhan thi can ban dich — dich on-the-fly neu thong bao chua co (fail-soft).
  if (theo_ngon_ngu.zh.length > 0) await bao_dam_ban_dich(t);
  // Gui RIENG theo ngon ngu nguoi nhan (vi / zh): khung email song ngu, noi dung theo
  // ngon ngu. Nhom nao khong co nguoi thi bo qua; chi can mot nhom that bai la coi nhu gui
  // chua xong.
  let gui_duoc = true;
  for (const ngon_ngu of ['vi', 'zh'] as const) {
    const den = theo_ngon_ngu[ngon_ngu];
    if (den.length === 0) continue;
    const ok = await gui_email({
      den,
      tieu_de: tieu_de_email_thong_bao(t, ngon_ngu),
      noi_dung_html: html_email_thong_bao(t, ngon_ngu),
      dinh_kem,
    });
    if (!ok) gui_duoc = false;
  }
  if (!gui_duoc) {
    await thuc_thi(
      `update thong_bao
          set gui_email_loi = $2, gui_email_luc = coalesce(gui_email_luc, now())
        where id = $1`,
      [id_thong_bao, 'Graph từ chối gửi email — bấm "Gửi lại email" để thử lại.'],
    );
    return { ok: false, ly_do: 'Microsoft Graph từ chối gửi email.' };
  }

  await thuc_thi(
    `update thong_bao
        set da_gui_email = true, gui_email_luc = now(), gui_email_loi = null
      where id = $1`,
    [id_thong_bao],
  );
  return { ok: true, so_nhan };
}

/**
 * Quet cac thong bao chua gui duoc email (fire-and-forget bi mat sau crash). Goi moi vong
 * lich_chay; moi lan xu ly toi da 20 dong de khong lam cham vong.
 */
export async function quet_email_cho(): Promise<number> {
  const cho = await truy_van<{ id: string }>(
    `select id from thong_bao
      where da_gui_email = false and da_go = false
      order by tao_luc limit 20`,
  );
  for (const d of cho) {
    await gui_email_thong_bao(d.id).catch((loi: unknown) => {
      console.error('[gui_email_thong_bao] loi khi gui:', (loi as Error).message);
    });
  }
  return cho.length;
}
