// Email hai chieu cua HO THU Y KIEN (khuon cua luong/khieu_nai_email.ts):
//   - Nhan su tra loi / dong ho thu        -> email cho CHINH nguoi lao dong.
//   - Nguoi lao dong tra loi vao hoi thoai -> email cho Nhan su / Truong phong phu trach.
//
// Chi gui khi email da bat (email_bat). FAIL-SOFT tuyet doi: moi ham tu nuot loi cua no —
// tra loi / dong da luu vao CSDL roi thi KHONG duoc phep 500 chi vi mail tam thoi khong
// gui duoc. Thong bao trong app (gui_ngam) van chay song song.
import { gui_email, email_bat } from '../su_kien/gui_email.ts';
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { cau_hinh } from '../cau_hinh.ts';

/** Cat text de nhet vao email an toan (chan HTML injection tu noi dung nguoi dung nhap). */
const thoat = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface CtxHoThu {
  ma: string | null;
  tieu_de: string;
  ho_ten: string;
  ma_nv: string;
  email: string | null;
  nhan_vien_id: string;
}

/** Lay du lieu nen cua mot ho thu de dung trong email. Khong tim thay -> null. */
export async function ctx_ho_thu(ho_thu_id: string): Promise<CtxHoThu | null> {
  return truy_van_mot<CtxHoThu>(
    `select h.ma, h.tieu_de, nv.ho_ten, nv.ma_nv, nv.email, h.nhan_vien_id
       from ho_thu_y_kien h
       join nhan_vien nv on nv.id = h.nhan_vien_id
      where h.id = $1`,
    [ho_thu_id],
  );
}

/**
 * Email cua Nhan su / Admin / Truong phong phu trach mot nhan vien (de bao khi co gop y moi
 * hoac nguoi lao dong tra loi). Chi lay tai khoan dang hoat dong co email hop le.
 */
async function email_nguoi_duyet(nhan_vien_id: string): Promise<string[]> {
  const dong = await truy_van<{ email: string }>(
    `select distinct nv.email
       from nguoi_dung nd
       join nhan_vien nv on nv.id = nd.nhan_vien_id
      where nd.dang_hoat_dong = true
        and nv.email is not null and nv.email like '%@%'
        and (
          nd.vai_tro in ('admin', 'nhan_su')
          or nd.nhan_vien_id = (
            select pb.truong_phong_id from nhan_vien nv2
              join phong_ban pb on pb.id = nv2.phong_ban_id
             where nv2.id = $1
          )
        )`,
    [nhan_vien_id],
  );
  return dong.map((d) => d.email);
}

export interface ThanHoThu {
  /** Goc web cong khai (cau_hinh.api_goc_cong_khai) — trong thi email khong co nut mo app. */
  goc: string;
  tieu_de_hop: string;
  mau_hop: string;
  mau_vien: string;
  ctx: CtxHoThu;
  loi_dan: string;
  noi_dung: string;
  chan: string;
}

/**
 * Than email chung cho mot su kien ho thu — HTML thuan, style inline. Ham THUAN (khong mang,
 * khong doc cau hinh) de unit test duoc ma khong can goi Graph.
 */
export function than_email_ho_thu(o: ThanHoThu): string {
  const nut = o.goc === ''
    ? ''
    : `<div style="margin-top:16px">
         <a href="${o.goc}/ca-nhan/y-kien" style="display:inline-block;background:#2563EB;color:#fff;
            text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">
            Mở Hòm thư ý kiến trong hệ thống</a>
       </div>`;
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5;max-width:600px">
    <div style="background:${o.mau_hop};color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
      <div style="font-size:17px;font-weight:700">${o.tieu_de_hop}</div>
      <div style="font-size:13px;opacity:.9;margin-top:2px">${thoat(o.ctx.ho_ten)} · ${thoat(o.ctx.ma_nv)}${o.ctx.ma !== null ? ` · ${thoat(o.ctx.ma)}` : ''}</div>
    </div>
    <div style="border:1px solid #E5E7EB;border-top:0;border-radius:0 0 8px 8px;padding:18px">
      <p style="margin:0 0 12px;font-size:14px"><b>${thoat(o.ctx.tieu_de)}</b></p>
      <p style="margin:0 0 12px;font-size:14px">${o.loi_dan}</p>
      <div style="background:#F9FAFB;border-left:3px solid ${o.mau_vien};border-radius:6px;padding:12px 14px;font-size:14px;white-space:pre-wrap">${thoat(o.noi_dung)}</div>
      ${nut}
      <p style="margin:16px 0 0;color:#6B7280;font-size:12px">
        ${o.chan}<br/>
        Email tự động từ hệ thống chấm công — vui lòng không trả lời trực tiếp email này.<br/>
        Trân trọng,<br/><b>Phòng Nhân sự — Công ty TNHH Trần Hoàng Việt Nam</b></p>
    </div>
  </div>`;
}

/**
 * Nhan su TRA LOI vao ho thu -> email cho nguoi lao dong.
 * `noi_dung` la noi dung tra loi. Tra ve true neu da gui.
 */
export async function email_nhan_su_tra_loi(ho_thu_id: string, noi_dung: string): Promise<boolean> {
  if (!email_bat()) return false;
  try {
    const ctx = await ctx_ho_thu(ho_thu_id);
    if (ctx === null || ctx.email === null || !ctx.email.includes('@')) return false;
    return await gui_email({
      den: [ctx.email],
      tieu_de: `Hòm thư ý kiến có phản hồi mới${ctx.ma !== null ? ` ${ctx.ma}` : ''}`,
      noi_dung_html: than_email_ho_thu({
        goc: cau_hinh.api_goc_cong_khai,
        tieu_de_hop: 'Hòm thư ý kiến có phản hồi mới',
        mau_hop: '#2563EB',
        mau_vien: '#2563EB',
        ctx,
        loi_dan: 'Phòng Nhân sự vừa trả lời ý kiến của bạn:',
        noi_dung,
        chan: 'Bạn có thể tiếp tục trao đổi trong mục <b>Hòm thư ý kiến</b> của ứng dụng.',
      }),
    });
  } catch (loi) {
    console.error('[ho_thu_email] email_nhan_su_tra_loi loi:', (loi as Error).message);
    return false;
  }
}

/**
 * Nhan su DONG ho thu -> email bao hoan tat cho nguoi lao dong.
 */
export async function email_ho_thu_dong(ho_thu_id: string): Promise<boolean> {
  if (!email_bat()) return false;
  try {
    const ctx = await ctx_ho_thu(ho_thu_id);
    if (ctx === null || ctx.email === null || !ctx.email.includes('@')) return false;
    return await gui_email({
      den: [ctx.email],
      tieu_de: `Hòm thư ý kiến đã hoàn tất${ctx.ma !== null ? ` ${ctx.ma}` : ''}`,
      noi_dung_html: than_email_ho_thu({
        goc: cau_hinh.api_goc_cong_khai,
        tieu_de_hop: 'Hòm thư ý kiến đã hoàn tất',
        mau_hop: '#059669',
        mau_vien: '#059669',
        ctx,
        loi_dan: 'Phòng Nhân sự đã tiếp nhận, giải quyết và đóng hòm thư ý kiến này. '
          + 'Cảm ơn bạn đã chia sẻ để công ty hoàn thiện hơn.',
        noi_dung: 'Nếu còn băn khoăn, bạn có thể gửi một ý kiến mới từ mục "Hòm thư ý kiến".',
        chan: 'Xem lại nội dung trao đổi trong mục <b>Hòm thư ý kiến</b> của ứng dụng.',
      }),
    });
  } catch (loi) {
    console.error('[ho_thu_email] email_ho_thu_dong loi:', (loi as Error).message);
    return false;
  }
}

/**
 * Nguoi lao dong TRA LOI vao ho thu -> email cho Nhan su / Truong phong phu trach.
 * `ho_ten` la ten nguoi gui (de hien nhanh trong tieu de).
 */
export async function email_nhan_vien_tra_loi(
  ho_thu_id: string, noi_dung: string,
): Promise<boolean> {
  if (!email_bat()) return false;
  try {
    const ctx = await ctx_ho_thu(ho_thu_id);
    if (ctx === null) return false;
    const den = await email_nguoi_duyet(ctx.nhan_vien_id);
    if (den.length === 0) return false;
    return await gui_email({
      den,
      tieu_de: `Hòm thư ý kiến có trả lời mới${ctx.ma !== null ? ` ${ctx.ma}` : ''} — ${ctx.ho_ten}`,
      noi_dung_html: than_email_ho_thu({
        goc: cau_hinh.api_goc_cong_khai,
        tieu_de_hop: 'Người lao động vừa trả lời',
        mau_hop: '#7C3AED',
        mau_vien: '#7C3AED',
        ctx,
        loi_dan: `<b>${thoat(ctx.ho_ten)}</b> vừa trả lời trong hòm thư ý kiến:`,
        noi_dung,
        chan: 'Vào mục <b>Hòm thư ý kiến</b> ở khu quản trị để tiếp tục trao đổi.',
      }),
    });
  } catch (loi) {
    console.error('[ho_thu_email] email_nhan_vien_tra_loi loi:', (loi as Error).message);
    return false;
  }
}
