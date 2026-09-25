// Email MOI GOP Y ban du thao van ban AI.
//
// Khi nhan su mo "lay y kien" cho mot ban nhap o trang thai cho_duyet, he thong gui email
// toi DUNG TAP NGUOI NHAN (theo pham vi cua van ban) kem link:
//
//   {goc_web}/gop-y-du-thao?van_ban_id=<id>
//
// Nguoi nhan bam link -> webapp bat dang nhap (neu chua) -> trang gop y. Ngoai pham vi thi
// trang tra "khong tim thay" (404) — dung yeu cau "dang nhap + tai khoan co trong he thong".
//
// FAIL-SOFT: chua bat email thi tra {ok:false} khong nem loi; route goi fire-and-forget.
import { gui_email, email_bat } from '../su_kien/gui_email.ts';
import { lay_dia_chi_nhan } from '../su_kien/gui_email_thong_bao.ts';
import { truy_van_mot } from '../csdl/ket_noi.ts';
import { cau_hinh } from '../cau_hinh.ts';
import type { SpecVanBan } from '../ai/kieu.ts';

/** Cat text de nhet vao email an toan (chan HTML injection). */
const thoat = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface ThongTinMoi {
  /** Goc web cong khai — trong thi email khong co nut gop y. */
  goc: string;
  /** Ma ban nhap (TBN-...) de hien thi. */
  ma: string;
  /** Id ban nhap — dung trong link ?van_ban_id=. */
  van_ban_id: string;
  trich_yeu: string;
}

/**
 * Than email moi gop y — HTML thuan, style inline. Ham THUAN (khong mang, khong doc cau
 * hinh) de unit test duoc.
 */
export function html_email_moi_y_kien(o: ThongTinMoi): string {
  const nut = o.goc === ''
    ? ''
    : `<p style="margin:16px 0 0">
         <a href="${o.goc}/gop-y-du-thao?van_ban_id=${o.van_ban_id}"
            style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;
                   padding:10px 18px;border-radius:8px;font-weight:600">Đọc dự thảo và góp ý</a>
       </p>
       <p style="margin:12px 0 0;color:#6B7280;font-size:12px">Cần đăng nhập bằng tài khoản
         Chấm công của bạn.</p>`;
  return '<!doctype html><html lang="vi"><head><meta charset="utf-8"></head>'
    + '<body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5">'
    + `<div style="max-width:600px;margin:0 auto">
         <div style="background:#2563EB;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
           <div style="font-size:17px;font-weight:700">Mời góp ý dự thảo văn bản</div>
           <div style="font-size:13px;opacity:.9;margin-top:2px">${thoat(o.ma)}</div>
         </div>
         <div style="border:1px solid #E5E7EB;border-top:0;border-radius:0 0 8px 8px;padding:18px">
           <p style="margin:0 0 12px">Công ty đang soạn thảo văn bản:</p>
           <div style="background:#F9FAFB;border-left:3px solid #2563EB;border-radius:6px;
                       padding:12px 14px;font-size:14px">${thoat(o.trich_yeu)}</div>
           <p style="margin:14px 0 0">Xin mời anh/chị đọc bản dự thảo và gửi ý kiến đóng góp.
             Mọi ý kiến đều được Phòng Nhân sự tiếp nhận và phản hồi.</p>`
    + (o.goc === ''
      ? '<p style="margin:14px 0 0;color:#B45309">Mở ứng dụng Chấm công, đăng nhập rồi vào '
        + 'mục "Hòm thư ý kiến" để góp ý.</p>'
      : nut)
    + `<p style="margin:16px 0 0;color:#6B7280;font-size:12px">
         Email tự động từ hệ thống chấm công — vui lòng không trả lời trực tiếp email này.<br/>
         Trân trọng,<br/><b>Phòng Nhân sự — Công ty TNHH Trần Hoàng Việt Nam</b></p>
       </div>
       </div></body></html>`;
}

/** Ket qua gui email moi gop y. Khong nem loi — luon tra ket qua de ghi log. */
export interface KetQuaMoiYKien {
  ok: boolean;
  so_nhan?: number;
  ly_do?: string;
}

/**
 * Gui email moi gop y cho DUNG TAP nguoi nhan cua ban nhap (theo pham vi). Goi fire-and-forget
 * tu route lay-y-kien. Tra {ok, so_nhan} de ghi log/ghi loi.
 */
export async function email_moi_y_kien(nhap_ai_id: string): Promise<KetQuaMoiYKien> {
  if (!email_bat()) return { ok: false, ly_do: 'Chưa khai báo MS_MAIL_* trong .env.' };
  try {
    const d = await truy_van_mot<{
      id: string;
      ma: string; pham_vi: string; phong_ban_id: string | null; nhan_vien_id: string | null;
      spec_json: unknown;
    }>(
      `select id::text, ma, pham_vi, phong_ban_id, nhan_vien_id, spec_json
         from thong_bao_nhap_ai where id = $1`,
      [nhap_ai_id],
    );
    if (d === null) return { ok: false, ly_do: 'Không tìm thấy bản nháp.' };
    const spec = d.spec_json as SpecVanBan | null;
    const trich_yeu = spec?.trich_yeu ?? 'văn bản mới';

    const den = await lay_dia_chi_nhan(d.pham_vi, d.phong_ban_id, d.nhan_vien_id);
    if (den.length === 0) return { ok: false, ly_do: 'Không có nhân viên nào trong phạm vi có email.' };

    const gui_duoc = await gui_email({
      den,
      tieu_de: `[Chấm công] Mời góp ý dự thảo ${d.ma}: ${trich_yeu}`,
      noi_dung_html: html_email_moi_y_kien({
        goc: cau_hinh.api_goc_cong_khai,
        ma: d.ma,
        van_ban_id: d.id,
        trich_yeu,
      }),
    });
    return gui_duoc
      ? { ok: true, so_nhan: den.length }
      : { ok: false, ly_do: 'Microsoft Graph từ chối gửi email.' };
  } catch (loi) {
    console.error('[ho_thu_email] email_moi_y_kien loi:', (loi as Error).message);
    return { ok: false, ly_do: 'Lỗi không mong đợi khi gửi email mời.' };
  }
}
