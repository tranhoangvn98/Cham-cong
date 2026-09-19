// Gui email THONG BAO (ke ca van ban AI da ban hanh) kem DOCX toi dung tap nguoi nhan.
//
// Fail-soft va KHONG nam trong luong request: duoc goi fire-and-forget sau khi ban hanh /
// dang thong bao thanh cong, va co vong QUET CHO (lich_chay) de bu nhung lan mat sau crash.
// Ket qua ghi lai tren bang `thong_bao` (da_gui_email / gui_email_luc / gui_email_loi) de
// giao dien hien chip trang thai + nut "Gui lai email".
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { doc_tep_ho_so } from '../tien_ich/luu_tep.ts';
import { email_bat, gui_email } from './gui_email.ts';

export interface DongThongBao {
  id: string;
  ma: string;
  tieu_de: string;
  noi_dung: string;
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
 * Lay dia chi email cua nguoi nhan theo pham vi. Chi nhan vien DANG HOAT DONG va co email.
 * Toan cong ty / phong ban nhan theo phong_ban_id; ca nhan theo dung nguoi do.
 */
export async function lay_dia_chi_nhan(
  pham_vi: string, phong_ban_id: string | null, nhan_vien_id: string | null,
): Promise<string[]> {
  const dong = await truy_van<{ email: string }>(
    `select distinct nv.email
       from nhan_vien nv
      where nv.dang_hoat_dong = true
        and nv.email is not null and btrim(nv.email) <> ''
        and ($1 = 'toan_cong_ty'
             or ($1 = 'phong_ban' and nv.phong_ban_id = $2::uuid)
             or ($1 = 'ca_nhan' and nv.id = $3::uuid))`,
    [pham_vi, phong_ban_id, nhan_vien_id],
  );
  return dong.map((d) => d.email);
}

/** Chuyen noi dung thong bao (van ban thuong) thanh HTML email — chong HTML injection. */
export function html_email_thong_bao(t: DongThongBao): string {
  const thoat = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const doan = t.noi_dung.split(/\n+/).map((d) => `<p>${thoat(d)}</p>`).join('\n');
  return '<!doctype html><html lang="vi"><head><meta charset="utf-8"></head>'
    + `<body style="font-family:sans-serif;font-size:14px;color:#222;">`
    + `<h2 style="margin-bottom:4px;">${thoat(t.tieu_de)}</h2>`
    + `<div style="margin-bottom:12px;color:#666;">Mã: ${thoat(t.ma)}</div>`
    + doan
    + '<p style="margin-top:16px;color:#666;font-size:12px;">'
    + 'Văn bản đầy đủ đính kèm bên dưới. Mở ứng dụng Chấm công để xác nhận đã đọc.</p>'
    + '</body></html>';
}

/** Doc docx ban hanh (neu co) de dinh kem vao email. */
async function dinh_kem_cua(t: DongThongBao): Promise<{ ten: string; mime: string; du_lieu: Buffer }[]> {
  if (t.ten_luu === null) return [];
  const du_lieu = await doc_tep_ho_so(t.ten_luu);
  if (du_lieu === null) return [];
  return [{ ten: `${t.ma}.docx`, mime: t.mime ?? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', du_lieu }];
}

/**
 * Gui email cho mot thong bao. Tra ket qua, KHONG nem loi — moi loi deu ghi vao cot
 * gui_email_loi de giao dien hien ro. Goi lai duoc nhieu lan (nut "Gui lai email").
 */
export async function gui_email_thong_bao(id_thong_bao: string): Promise<KetQuaGuiEmail> {
  const t = await truy_van_mot<DongThongBao>(
    `select id, ma, tieu_de, noi_dung, pham_vi, phong_ban_id, nhan_vien_id,
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

  const den = await lay_dia_chi_nhan(t.pham_vi, t.phong_ban_id, t.nhan_vien_id);
  if (den.length === 0) {
    await thuc_thi(
      `update thong_bao
          set gui_email_loi = $2, gui_email_luc = coalesce(gui_email_luc, now())
        where id = $1`,
      [id_thong_bao, 'Không có nhân viên nào trong phạm vi có email.'],
    );
    return { ok: false, ly_do: 'Không có nhân viên nào trong phạm vi có email.' };
  }

  const dinh_kem = await dinh_kem_cua(t);
  const gui_duoc = await gui_email({
    den,
    tieu_de: `[Chấm công] ${t.tieu_de}`,
    noi_dung_html: html_email_thong_bao(t),
    dinh_kem,
  });
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
  return { ok: true, so_nhan: den.length };
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
