// Email NHAC LOI dinh ky (che do 'nhac_nho', 3 ngay/lan).
//
// Chu cong ty chot: TAM THOI chi tong hop loi + nhac nho, CHUA xu phat. Moi <chu_ky> ngay, gui:
//   - cho TUNG nhan vien co loi: mot email tong hop loi cua chinh minh trong ky (chua giam thuong).
//   - cho NHAN SU/BGD: mot email tong hop toan bo loi trong ky de theo doi.
//
// Email la HTML thuan (email client khong chay CSS ngoai) — style inline. Bo cuc khop mau da
// duyet voi chu cong ty (nhac loi, chua xu phat).
import { truy_van } from '../csdl/ket_noi.ts';
import { gui_email, email_bat } from '../su_kien/gui_email.ts';
import { ngay_viet } from '../tien_ich/thoi_gian.ts';
import { cau_hinh } from '../cau_hinh.ts';

/** Trang thai vi pham duoc tinh (chua bac bo / chua xu ly rieng) — khop ky_luat/xu_ly.ts. */
const TRANG_THAI_TINH = ['moi', 'cho_giai_trinh', 'da_xac_nhan'];

interface DongLoi {
  nhan_vien_id: string;
  ho_ten: string;
  ma_nv: string;
  email: string | null;
  phong_ban: string | null;
  loai_ten: string;
  ngay: string;      // 'YYYY-MM-DD'
}

// so_lan = SO BAN GHI vi pham cua loai do (moi ban ghi = mot lan bi ghi nhan). KHONG cong gia_tri
// vi gia_tri co don vi khac nhau tuy loai (di muon = so PHUT, ra/vao = so lan) — cong lai vo nghia.
interface LoaiGop { loai_ten: string; so_lan: number; ngay_gan_nhat: string }
interface NguoiLoi {
  ho_ten: string; ma_nv: string; email: string | null; phong_ban: string | null;
  loai: Map<string, LoaiGop>; tong_lan: number;
}

function thang_viet(thang: string): string {
  const [n, m] = thang.split('-');
  return `${m}/${n}`;
}

function gop_theo_nguoi(ds: readonly DongLoi[]): Map<string, NguoiLoi> {
  const map = new Map<string, NguoiLoi>();
  for (const d of ds) {
    let ng = map.get(d.nhan_vien_id);
    if (ng === undefined) {
      ng = { ho_ten: d.ho_ten, ma_nv: d.ma_nv, email: d.email, phong_ban: d.phong_ban,
        loai: new Map(), tong_lan: 0 };
      map.set(d.nhan_vien_id, ng);
    }
    const lan = 1; // dem theo SO BAN GHI vi pham, khong cong gia_tri (don vi khac nhau tuy loai)
    const g = ng.loai.get(d.loai_ten);
    if (g === undefined) ng.loai.set(d.loai_ten, { loai_ten: d.loai_ten, so_lan: lan, ngay_gan_nhat: d.ngay });
    else { g.so_lan += lan; if (d.ngay > g.ngay_gan_nhat) g.ngay_gan_nhat = d.ngay; }
    ng.tong_lan += lan;
  }
  return map;
}

/** Than email nhac loi cho MOT nhan vien (chua xu phat). Khop mau da duyet voi chu cong ty. */
function than_email_ca_nhan(ng: NguoiLoi, thang: string, den_ngay: string, chu_ky: number): string {
  const hang = [...ng.loai.values()]
    .sort((a, b) => b.so_lan - a.so_lan)
    .map((g) => `
      <tr>
        <td style="padding:7px 10px;border-bottom:1px solid #eee">${g.loai_ten}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:center">${String(g.so_lan)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #eee">${ngay_viet(g.ngay_gan_nhat)}</td>
      </tr>`).join('');

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.55;max-width:600px">
    <div style="background:#2563EB;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;font-size:17px;font-weight:700">
      Nhắc nhở lỗi chấm công — Kỳ ${thang_viet(thang)}
    </div>
    <div style="border:1px solid #E5E7EB;border-top:0;border-radius:0 0 8px 8px;padding:20px">
      <p style="margin:0 0 12px">Kính gửi <b>${ng.ho_ten}</b> (Mã NV: ${ng.ma_nv}${ng.phong_ban !== null ? ` — ${ng.phong_ban}` : ''}),</p>
      <p style="margin:0 0 12px">
        Hệ thống chấm công ghi nhận trong kỳ <b>tháng ${thang_viet(thang)}</b> (tính đến ngày ${ngay_viet(den_ngay)})
        bạn có các vi phạm sau <b>chưa điều chỉnh</b>. Đây là <b>nhắc nhở</b> để bạn nắm và điều chỉnh —
        <b style="color:#1E40AF">chưa áp dụng giảm thưởng / xử phạt</b>.
      </p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;margin:8px 0 4px">
        <thead><tr>
          <th style="text-align:left;padding:7px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Loại vi phạm</th>
          <th style="text-align:center;padding:7px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Số lần ghi nhận</th>
          <th style="text-align:left;padding:7px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Ngày gần nhất</th>
        </tr></thead>
        <tbody>${hang}</tbody>
      </table>
      <p style="margin:2px 0 0;font-size:12px;color:#6B7280">
        Chi tiết cụ thể (số phút đi muộn, ngày vi phạm…) xem trong ứng dụng chấm công, mục
        <b>Vi phạm của tôi</b>.
      </p>
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:12px 14px;margin:14px 0;font-size:13px;color:#1E40AF">
        Hiện công ty <b>tạm thời chỉ nhắc nhở</b>, chưa áp dụng giảm thưởng. Nếu các lỗi tiếp tục lặp lại,
        công ty sẽ xem xét giảm thưởng P3 theo <b>Điều 14 Nội quy lao động</b> và <b>Điều 104 Bộ luật Lao động</b>
        (giảm thưởng, <b>không phải phạt tiền, không trừ lương cơ bản</b>).
      </div>
      <p style="margin:0 0 12px">
        Nếu có lý do chính đáng (quên quẹt thẻ, đi công tác, sự cố…), bạn có quyền <b>giải trình</b>
        (Bộ luật Lao động 2019, Điều 122): đăng nhập ứng dụng chấm công vào mục <b>Vi phạm của tôi</b>
        để gửi giải trình, hoặc phản hồi trực tiếp Phòng Nhân sự.
      </p>
      <p style="margin:0 0 4px;font-size:13px;color:#374151">
        Email nhắc nhở này được gửi định kỳ <b>${String(chu_ky)} ngày một lần</b> khi còn lỗi chưa được xử lý.
      </p>
      <p style="margin:14px 0 0;color:#6B7280;font-size:12px">
        Email tự động từ hệ thống chấm công — vui lòng không trả lời trực tiếp email này.<br/>
        Trân trọng,<br/><b>Phòng Nhân sự — Công ty TNHH Trần Hoàng Việt Nam</b>
      </p>
    </div>
  </div>`;
}

/** Than email TONG HOP cho Nhan su / BGD: danh sach nhan vien co loi trong ky. */
function than_email_tong_hop(nguoi: readonly NguoiLoi[], thang: string, den_ngay: string): string {
  const hang = [...nguoi]
    .sort((a, b) => b.tong_lan - a.tong_lan)
    .map((ng, i) => {
      const chi_tiet = [...ng.loai.values()].sort((a, b) => b.so_lan - a.so_lan)
        .map((g) => `${g.loai_ten} (${String(g.so_lan)})`).join(', ');
      return `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${String(i + 1)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;white-space:nowrap">${ng.ma_nv}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">${ng.ho_ten}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">${ng.phong_ban ?? '—'}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${String(ng.tong_lan)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:12px;color:#374151">${chi_tiet}</td>
        </tr>`;
    }).join('');
  const tong_loi = nguoi.reduce((s, n) => s + n.tong_lan, 0);

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5;max-width:720px">
    <div style="background:#111827;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;font-size:16px;font-weight:700">
      Tổng hợp lỗi chấm công — Kỳ ${thang_viet(thang)} (tính đến ${ngay_viet(den_ngay)})
    </div>
    <div style="border:1px solid #E5E7EB;border-top:0;border-radius:0 0 8px 8px;padding:18px">
      <p style="margin:0 0 12px">
        <b>${String(nguoi.length)}</b> nhân viên còn lỗi chưa xử lý, tổng <b>${String(tong_loi)}</b> lỗi.
        Chế độ hiện tại: <b>chỉ nhắc nhở, chưa xử phạt</b>. Nhân viên đã được gửi email nhắc nhở.
      </p>
      <table style="border-collapse:collapse;width:100%;font-size:13px">
        <thead><tr>
          <th style="text-align:center;padding:6px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">#</th>
          <th style="text-align:left;padding:6px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Mã NV</th>
          <th style="text-align:left;padding:6px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Họ tên</th>
          <th style="text-align:left;padding:6px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Phòng ban</th>
          <th style="text-align:center;padding:6px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Số lỗi</th>
          <th style="text-align:left;padding:6px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Chi tiết</th>
        </tr></thead>
        <tbody>${hang}</tbody>
      </table>
      <p style="margin:14px 0 0;color:#6B7280;font-size:12px">Email tự động từ hệ thống chấm công.</p>
    </div>
  </div>`;
}

async function email_nhan_su(): Promise<string[]> {
  const ds = await truy_van<{ email: string }>(
    `select distinct nv.email
       from nguoi_dung nd
       join nhan_vien nv on nv.id = nd.nhan_vien_id
      where nd.vai_tro in ('admin','nhan_su','truong_phong_nhan_su')
        and nv.email is not null and nv.email like '%@%'`,
  );
  return ds.map((r) => r.email);
}

export interface KetQuaNhacLoi {
  so_nguoi: number;
  so_email_ca_nhan: number;
  so_loi_gui: number;
  hr_gui: boolean;
}

/**
 * Gui email nhac loi cho mot ky (thang 'YYYY-MM'). Tra ve so lieu. Idempotent ve DU LIEU (chi doc
 * + gui email, khong sua CSDL); tan suat do bo lich khoa (3 ngay/lan). Chi chay khi email da bat.
 */
export async function email_nhac_loi(
  thang: string, den_ngay: string = new Date().toISOString().slice(0, 10),
): Promise<KetQuaNhacLoi> {
  const kq: KetQuaNhacLoi = { so_nguoi: 0, so_email_ca_nhan: 0, so_loi_gui: 0, hr_gui: false };
  if (!email_bat()) return kq;

  const ds = await truy_van<DongLoi>(
    `select v.nhan_vien_id, nv.ho_ten, nv.ma_nv, nv.email, pb.ten as phong_ban,
            l.ten as loai_ten,
            to_char(v.ngay,'YYYY-MM-DD') as ngay
       from vi_pham v
       join loai_vi_pham l on l.id = v.loai_vi_pham_id
       join nhan_vien nv on nv.id = v.nhan_vien_id and nv.dang_hoat_dong = true
       left join phong_ban pb on pb.id = nv.phong_ban_id
      where v.ky = $1 and v.trang_thai = any($2)`,
    [thang, TRANG_THAI_TINH],
  );

  const nguoi = gop_theo_nguoi(ds);
  kq.so_nguoi = nguoi.size;
  if (nguoi.size === 0) return kq;

  const chu_ky = cau_hinh.ky_luat.chu_ky_nhac_ngay;
  for (const ng of nguoi.values()) {
    kq.so_loi_gui += ng.tong_lan;
    if (ng.email !== null && ng.email.includes('@')) {
      const ok = await gui_email({
        den: [ng.email],
        tieu_de: `Nhắc nhở lỗi chấm công — kỳ ${thang_viet(thang)}`,
        noi_dung_html: than_email_ca_nhan(ng, thang, den_ngay, chu_ky),
      });
      if (ok) kq.so_email_ca_nhan += 1;
    }
  }

  const hr = await email_nhan_su();
  if (hr.length > 0) {
    kq.hr_gui = await gui_email({
      den: hr,
      tieu_de: `Tổng hợp lỗi chấm công — kỳ ${thang_viet(thang)}`,
      noi_dung_html: than_email_tong_hop([...nguoi.values()], thang, den_ngay),
    });
  }
  return kq;
}
