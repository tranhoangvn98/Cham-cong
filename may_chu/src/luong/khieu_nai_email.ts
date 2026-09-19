// Email thong bao khi KHIEU NAI phieu luong co phan hoi moi.
//
// Hai chieu:
//  - Nhan su tra loi / xu ly (chap_nhan / tu_choi)  -> email cho CHINH nguoi lao dong (email rieng).
//  - Nguoi lao dong tra loi vao thread              -> email cho Nhan su / Truong phong phu trach.
//
// Chi gui khi email da bat (email_bat). FAIL-SOFT tuyet doi: moi ham tu nuot loi cua no —
// tra loi / xu ly khieu nai da luu vao CSDL roi thi KHONG duoc phep 500 chi vi mail tam thoi
// khong gui duoc (Graph tu choi, thieu email...). Thong bao trong app (gui_ngam) van chay song song.
import { gui_email, email_bat } from '../su_kien/gui_email.ts';
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { cau_hinh } from '../cau_hinh.ts';

const goc_web = (): string => cau_hinh.api_goc_cong_khai;
const thang_viet = (t: string): string => {
  const [n, m] = t.split('-');
  return `${m}/${n}`;
};
/** Cat text de nhet vao email an toan (chan HTML injection tu noi dung nguoi dung nhap). */
const thoat = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface CtxKN {
  ma: string | null;
  thang: string;
  ho_ten: string;
  ma_nv: string;
  email: string | null;
  nhan_vien_id: string;
}

/** Lay du lieu nen cua mot khieu nai de dung trong email. */
async function ctx_khieu_nai(kn_id: string): Promise<CtxKN | null> {
  return truy_van_mot<CtxKN>(
    `select kn.ma, k.thang, nv.ho_ten, nv.ma_nv, nv.email, kn.nhan_vien_id
       from khieu_nai_luong kn
       join phieu_luong p on p.id = kn.phieu_luong_id
       join ky_luong k on k.id = p.ky_luong_id
       join nhan_vien nv on nv.id = kn.nhan_vien_id
      where kn.id = $1`,
    [kn_id],
  );
}

/**
 * Email cua Nhan su / Admin / Truong phong phu trach mot nhan vien (de bao khi co khieu nai
 * moi hoac nguoi lao dong tra loi). Chi lay tai khoan dang hoat dong co email hop le.
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

interface ThanKN {
  tieu_de_hop: string;
  mau_hop: string;
  mau_vien: string;
  ctx: CtxKN;
  loi_dan: string;
  noi_dung: string;
  chan: string;
}

/** Than email chung cho mot su kien khieu nai — HTML thuan, style inline. */
function than_email(o: ThanKN): string {
  const g = goc_web();
  const nut = g === ''
    ? ''
    : `<div style="margin-top:16px">
         <a href="${g}" style="display:inline-block;background:#2563EB;color:#fff;
            text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">
            Mở khiếu nại trong hệ thống</a>
       </div>`;
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5;max-width:600px">
    <div style="background:${o.mau_hop};color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
      <div style="font-size:17px;font-weight:700">${o.tieu_de_hop}</div>
      <div style="font-size:13px;opacity:.9;margin-top:2px">${thoat(o.ctx.ho_ten)} · ${thoat(o.ctx.ma_nv)} · Kỳ lương ${thang_viet(o.ctx.thang)}${o.ctx.ma !== null ? ` · ${thoat(o.ctx.ma)}` : ''}</div>
    </div>
    <div style="border:1px solid #E5E7EB;border-top:0;border-radius:0 0 8px 8px;padding:18px">
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
 * Nhan su TRA LOI vao thread khieu nai -> email cho nguoi lao dong.
 * `noi_dung` la noi dung tra loi. Tra ve true neu da gui.
 */
export async function email_hr_tra_loi(kn_id: string, noi_dung: string): Promise<boolean> {
  if (!email_bat()) return false;
  try {
    const ctx = await ctx_khieu_nai(kn_id);
    if (ctx === null || ctx.email === null || !ctx.email.includes('@')) return false;
    return await gui_email({
      den: [ctx.email],
      tieu_de: `Phản hồi khiếu nại phiếu lương${ctx.ma !== null ? ` ${ctx.ma}` : ''} — kỳ ${thang_viet(ctx.thang)}`,
      noi_dung_html: than_email({
        tieu_de_hop: 'Khiếu nại phiếu lương có phản hồi mới',
        mau_hop: '#2563EB',
        mau_vien: '#2563EB',
        ctx,
        loi_dan: 'Phòng Nhân sự vừa trả lời khiếu nại phiếu lương của bạn:',
        noi_dung,
        chan: 'Bạn có thể tiếp tục trao đổi trong mục <b>Khiếu nại</b> của ứng dụng.',
      }),
    });
  } catch (loi) {
    console.error('[khieu_nai_email] email_hr_tra_loi loi:', (loi as Error).message);
    return false;
  }
}

/**
 * Nhan su XU LY khieu nai (chap_nhan / tu_choi / dang_xem) -> email ket qua cho nguoi lao dong.
 * `phan_hoi` la loi phan hoi (co the null).
 */
export async function email_hr_xu_ly(
  kn_id: string, trang_thai: 'dang_xem' | 'chap_nhan' | 'tu_choi', phan_hoi: string | null,
): Promise<boolean> {
  if (!email_bat()) return false;
  try {
    const ctx = await ctx_khieu_nai(kn_id);
    if (ctx === null || ctx.email === null || !ctx.email.includes('@')) return false;
    const tt = trang_thai === 'chap_nhan'
      ? { tieu_de: 'Khiếu nại phiếu lương được chấp nhận', mau: '#059669', dan: 'Phòng Nhân sự đã <b>chấp nhận</b> khiếu nại phiếu lương của bạn. Kỳ lương sẽ được mở lại và điều chỉnh theo quy trình.' }
      : trang_thai === 'tu_choi'
        ? { tieu_de: 'Khiếu nại phiếu lương bị từ chối', mau: '#DC2626', dan: 'Phòng Nhân sự đã xem xét và <b>từ chối</b> khiếu nại phiếu lương của bạn.' }
        : { tieu_de: 'Khiếu nại phiếu lương đang được xem xét', mau: '#D97706', dan: 'Phòng Nhân sự đã <b>tiếp nhận</b> và đang xem xét khiếu nại phiếu lương của bạn.' };
    return await gui_email({
      den: [ctx.email],
      tieu_de: `${tt.tieu_de}${ctx.ma !== null ? ` ${ctx.ma}` : ''} — kỳ ${thang_viet(ctx.thang)}`,
      noi_dung_html: than_email({
        tieu_de_hop: tt.tieu_de,
        mau_hop: tt.mau,
        mau_vien: tt.mau,
        ctx,
        loi_dan: tt.dan,
        noi_dung: phan_hoi ?? 'Không có ghi chú thêm.',
        chan: 'Bạn có thể xem chi tiết trong mục <b>Khiếu nại</b> của ứng dụng.',
      }),
    });
  } catch (loi) {
    console.error('[khieu_nai_email] email_hr_xu_ly loi:', (loi as Error).message);
    return false;
  }
}

/**
 * Nguoi lao dong TRA LOI vao thread -> email cho Nhan su / Truong phong phu trach.
 * `ho_ten` la ten nguoi gui (de hien nhanh trong tieu de).
 */
export async function email_nhan_vien_tra_loi(kn_id: string, noi_dung: string): Promise<boolean> {
  if (!email_bat()) return false;
  try {
    const ctx = await ctx_khieu_nai(kn_id);
    if (ctx === null) return false;
    const den = await email_nguoi_duyet(ctx.nhan_vien_id);
    if (den.length === 0) return false;
    return await gui_email({
      den,
      tieu_de: `Khiếu nại phiếu lương${ctx.ma !== null ? ` ${ctx.ma}` : ''} có trả lời mới — ${ctx.ho_ten}`,
      noi_dung_html: than_email({
        tieu_de_hop: 'Người lao động vừa trả lời khiếu nại',
        mau_hop: '#7C3AED',
        mau_vien: '#7C3AED',
        ctx,
        loi_dan: `<b>${thoat(ctx.ho_ten)}</b> vừa trả lời vào khiếu nại phiếu lương:`,
        noi_dung,
        chan: 'Vào mục <b>Khiếu nại lương</b> ở khu quản trị để tiếp tục xử lý.',
      }),
    });
  } catch (loi) {
    console.error('[khieu_nai_email] email_nhan_vien_tra_loi loi:', (loi as Error).message);
    return false;
  }
}
