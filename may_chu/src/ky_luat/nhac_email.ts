// Email NHAC LOI (che do 'nhac_nho'): thong ke loi cham cong theo KHOANG NGAY.
//
// Chu cong ty chot:
//   - Email dinh ky 3 ngay/lan: CHI thong ke loi trong 3 NGAY GAN NHAT (khong lap lai ca thang).
//   - Cuoi thang: gui email TONG HOP CA THANG.
// Tam thoi chi nhac nho, CHUA xu phat.
//
// Nguon so lieu la `bang_cong_ngay` (theo TUNG NGAY) — chinh xac cho tung ngay, khac voi bang
// `vi_pham` (gom ca thang, gia_tri lech don vi). Loi lay tu tung ngay:
//   - phut_muon  > 0        -> Di muon (kem so phut)
//   - phut_ve_som > 0       -> Ve som (kem so phut)
//   - trang_thai = 'vang'   -> Vang khong phep (khong co don nghi da duyet trum ngay)
//
// Email la HTML thuan (email client khong chay CSS ngoai) — style inline.
import { truy_van } from '../csdl/ket_noi.ts';
import { gui_email, email_bat } from '../su_kien/gui_email.ts';
import { ngay_viet } from '../tien_ich/thoi_gian.ts';

export interface DongNgay {
  nhan_vien_id: string;
  ho_ten: string;
  ma_nv: string;
  email: string | null;
  phong_ban: string | null;
  ngay: string;       // 'YYYY-MM-DD'
  phut_muon: number;
  phut_ve_som: number;
  trang_thai: string;
}

type MaLoi = 'di_muon' | 've_som' | 'vang';
const TEN_LOI: Record<MaLoi, string> = {
  di_muon: 'Đi muộn', ve_som: 'Về sớm', vang: 'Vắng không phép',
};
const THU_TU: MaLoi[] = ['di_muon', 've_som', 'vang'];

interface LoaiGop { ma: MaLoi; so_ngay: number; tong_phut: number; ngay_gan_nhat: string }
interface NguoiLoi {
  ho_ten: string; ma_nv: string; email: string | null; phong_ban: string | null;
  loai: Map<MaLoi, LoaiGop>; tong_ngay_loi: number;
}

function thang_viet(thang: string): string {
  const [n, m] = thang.split('-');
  return `${m}/${n}`;
}

/** So ngay giua hai chuoi 'YYYY-MM-DD', tinh ca hai dau. */
function so_ngay_khoang(tu: string, den: string): number {
  const a = Date.parse(`${tu}T00:00:00Z`);
  const b = Date.parse(`${den}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000) + 1;
}

function them_loi(ng: NguoiLoi, ma: MaLoi, ngay: string, phut: number): void {
  let g = ng.loai.get(ma);
  if (g === undefined) { g = { ma, so_ngay: 0, tong_phut: 0, ngay_gan_nhat: ngay }; ng.loai.set(ma, g); }
  g.so_ngay += 1;
  g.tong_phut += phut;
  if (ngay > g.ngay_gan_nhat) g.ngay_gan_nhat = ngay;
  ng.tong_ngay_loi += 1;
}

export function gop_theo_nguoi(ds: readonly DongNgay[]): Map<string, NguoiLoi> {
  const map = new Map<string, NguoiLoi>();
  for (const d of ds) {
    let ng = map.get(d.nhan_vien_id);
    if (ng === undefined) {
      ng = { ho_ten: d.ho_ten, ma_nv: d.ma_nv, email: d.email, phong_ban: d.phong_ban,
        loai: new Map(), tong_ngay_loi: 0 };
      map.set(d.nhan_vien_id, ng);
    }
    if (d.phut_muon > 0) them_loi(ng, 'di_muon', d.ngay, d.phut_muon);
    if (d.phut_ve_som > 0) them_loi(ng, 've_som', d.ngay, d.phut_ve_som);
    if (d.trang_thai === 'vang') them_loi(ng, 'vang', d.ngay, 0);
  }
  return map;
}

function hang_loai(ng: NguoiLoi): string {
  return THU_TU.filter((m) => ng.loai.has(m)).map((m) => {
    const g = ng.loai.get(m)!;
    const phut = m === 'vang' ? '—' : `${String(g.tong_phut)} phút`;
    return `
      <tr>
        <td style="padding:7px 10px;border-bottom:1px solid #eee">${TEN_LOI[m]}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:center">${String(g.so_ngay)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:center">${phut}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #eee">${ngay_viet(g.ngay_gan_nhat)}</td>
      </tr>`;
  }).join('');
}

/** Cụm mô tả phạm vi: "trong 3 ngày gần nhất (…)" hoặc "trong cả tháng MM/YYYY". */
function cum_pham_vi(tu: string, den: string, toan_thang: boolean): { tieu_de: string; cau: string } {
  if (toan_thang) {
    const t = thang_viet(den.slice(0, 7));
    return { tieu_de: `Tổng hợp lỗi chấm công tháng ${t}`,
      cau: `trong <b>cả tháng ${t}</b>` };
  }
  const n = so_ngay_khoang(tu, den);
  return { tieu_de: 'Nhắc nhở lỗi chấm công', cau: `trong <b>${String(n)} ngày gần nhất</b> (${ngay_viet(tu)}–${ngay_viet(den)})` };
}

function than_email_ca_nhan(ng: NguoiLoi, tu: string, den: string, toan_thang: boolean): string {
  const pv = cum_pham_vi(tu, den, toan_thang);
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.55;max-width:600px">
    <div style="background:#2563EB;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;font-size:17px;font-weight:700">
      ${pv.tieu_de}
    </div>
    <div style="border:1px solid #E5E7EB;border-top:0;border-radius:0 0 8px 8px;padding:20px">
      <p style="margin:0 0 12px">Kính gửi <b>${ng.ho_ten}</b> (Mã NV: ${ng.ma_nv}${ng.phong_ban !== null ? ` — ${ng.phong_ban}` : ''}),</p>
      <p style="margin:0 0 12px">
        Hệ thống chấm công ghi nhận ${pv.cau} bạn có các lỗi sau. Đây là <b>nhắc nhở</b> để bạn nắm và
        điều chỉnh — <b style="color:#1E40AF">chưa áp dụng giảm thưởng / xử phạt</b>.
      </p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;margin:8px 0 4px">
        <thead><tr>
          <th style="text-align:left;padding:7px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Loại lỗi</th>
          <th style="text-align:center;padding:7px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Số ngày</th>
          <th style="text-align:center;padding:7px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Tổng phút</th>
          <th style="text-align:left;padding:7px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Ngày gần nhất</th>
        </tr></thead>
        <tbody>${hang_loai(ng)}</tbody>
      </table>
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:12px 14px;margin:14px 0;font-size:13px;color:#1E40AF">
        Hiện công ty <b>tạm thời chỉ nhắc nhở</b>, chưa áp dụng giảm thưởng. Nếu các lỗi tiếp tục lặp lại,
        công ty sẽ xem xét giảm thưởng P3 theo <b>Điều 14 Nội quy lao động</b> và <b>Điều 104 Bộ luật Lao động</b>
        (giảm thưởng, <b>không phải phạt tiền, không trừ lương cơ bản</b>).
      </div>
      <p style="margin:0 0 12px">
        Nếu có lý do chính đáng (quên quẹt thẻ, đi công tác, sự cố…), bạn có quyền <b>giải trình</b>
        (Bộ luật Lao động 2019, Điều 122): đăng nhập ứng dụng chấm công vào mục <b>Vi phạm của tôi</b>
        / <b>Đơn của tôi</b>, hoặc phản hồi trực tiếp Phòng Nhân sự.
      </p>
      <p style="margin:14px 0 0;color:#6B7280;font-size:12px">
        Email tự động từ hệ thống chấm công — vui lòng không trả lời trực tiếp email này.<br/>
        Trân trọng,<br/><b>Phòng Nhân sự — Công ty TNHH Trần Hoàng Việt Nam</b>
      </p>
    </div>
  </div>`;
}

function than_email_tong_hop(
  nguoi: readonly NguoiLoi[], tu: string, den: string, toan_thang: boolean,
): string {
  const pv = cum_pham_vi(tu, den, toan_thang);
  const hang = [...nguoi]
    .sort((a, b) => b.tong_ngay_loi - a.tong_ngay_loi)
    .map((ng, i) => {
      const chi_tiet = THU_TU.filter((m) => ng.loai.has(m)).map((m) => {
        const g = ng.loai.get(m)!;
        return m === 'vang' ? `${TEN_LOI[m]} ${String(g.so_ngay)} ngày`
          : `${TEN_LOI[m]} ${String(g.so_ngay)} ngày/${String(g.tong_phut)} phút`;
      }).join('; ');
      return `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${String(i + 1)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;white-space:nowrap">${ng.ma_nv}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">${ng.ho_ten}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">${ng.phong_ban ?? '—'}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${String(ng.tong_ngay_loi)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:12px;color:#374151">${chi_tiet}</td>
        </tr>`;
    }).join('');

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5;max-width:720px">
    <div style="background:#111827;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;font-size:16px;font-weight:700">
      ${pv.tieu_de} — ${ngay_viet(tu)}–${ngay_viet(den)}
    </div>
    <div style="border:1px solid #E5E7EB;border-top:0;border-radius:0 0 8px 8px;padding:18px">
      <p style="margin:0 0 12px">
        <b>${String(nguoi.length)}</b> nhân viên có lỗi ${pv.cau}. Chế độ hiện tại:
        <b>chỉ nhắc nhở, chưa xử phạt</b>. Nhân viên đã được gửi email nhắc nhở.
      </p>
      <table style="border-collapse:collapse;width:100%;font-size:13px">
        <thead><tr>
          <th style="text-align:center;padding:6px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">#</th>
          <th style="text-align:left;padding:6px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Mã NV</th>
          <th style="text-align:left;padding:6px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Họ tên</th>
          <th style="text-align:left;padding:6px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Phòng ban</th>
          <th style="text-align:center;padding:6px 10px;background:#F4F4F5;border-bottom:1px solid #E5E7EB">Số ngày lỗi</th>
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
  so_ngay_loi: number;
  hr_gui: boolean;
}

/**
 * Gui email nhac loi cho khoang ngay [tu_ngay, den_ngay]. `toan_thang=true` -> email "tong hop ca
 * thang" (dung cuoi thang). Tra ve so lieu. Chi doc + gui email (khong sua CSDL); tan suat do bo
 * lich khoa. Chi chay khi email da bat.
 */
export async function email_nhac_loi(
  tu_ngay: string, den_ngay: string, opts: { toan_thang?: boolean } = {},
): Promise<KetQuaNhacLoi> {
  const toan_thang = opts.toan_thang ?? false;
  const kq: KetQuaNhacLoi = { so_nguoi: 0, so_email_ca_nhan: 0, so_ngay_loi: 0, hr_gui: false };
  if (!email_bat()) return kq;

  const ds = await truy_van<DongNgay>(
    `select bc.nhan_vien_id, nv.ho_ten, nv.ma_nv, nv.email, pb.ten as phong_ban,
            to_char(bc.ngay,'YYYY-MM-DD') as ngay,
            bc.phut_muon, bc.phut_ve_som, bc.trang_thai
       from bang_cong_ngay bc
       join nhan_vien nv on nv.id = bc.nhan_vien_id and nv.dang_hoat_dong = true
       left join phong_ban pb on pb.id = nv.phong_ban_id
      where bc.ngay >= $1 and bc.ngay <= $2
        and (bc.phut_muon > 0 or bc.phut_ve_som > 0 or bc.trang_thai = 'vang')`,
    [tu_ngay, den_ngay],
  );

  const nguoi = gop_theo_nguoi(ds);
  kq.so_nguoi = nguoi.size;
  if (nguoi.size === 0) return kq;

  for (const ng of nguoi.values()) {
    kq.so_ngay_loi += ng.tong_ngay_loi;
    if (ng.email !== null && ng.email.includes('@')) {
      const ok = await gui_email({
        den: [ng.email],
        tieu_de: `${cum_pham_vi(tu_ngay, den_ngay, toan_thang).tieu_de} (${ngay_viet(tu_ngay)}–${ngay_viet(den_ngay)})`,
        noi_dung_html: than_email_ca_nhan(ng, tu_ngay, den_ngay, toan_thang),
      });
      if (ok) kq.so_email_ca_nhan += 1;
    }
  }

  const hr = await email_nhan_su();
  if (hr.length > 0) {
    kq.hr_gui = await gui_email({
      den: hr,
      tieu_de: `${cum_pham_vi(tu_ngay, den_ngay, toan_thang).tieu_de} (${ngay_viet(tu_ngay)}–${ngay_viet(den_ngay)})`,
      noi_dung_html: than_email_tong_hop([...nguoi.values()], tu_ngay, den_ngay, toan_thang),
    });
  }
  return kq;
}
