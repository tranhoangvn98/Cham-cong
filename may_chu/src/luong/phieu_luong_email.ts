// Gui EMAIL PHIEU LUONG chi tiet cho tung nhan vien khi ky luong duoc DUYET.
//
// Email liet ke tung khoan (thu nhap + khau tru) — mot bang luong khong giai thich duoc la mot
// don khieu nai. Chi gui cho CHINH nguoi lao dong (email rieng), tu hop thu HR. HTML thuan, style
// inline (email client khong chay CSS ngoai).
import type { PoolClient } from 'pg';
import { truy_van, truy_van_mot, trong_giao_dich } from '../csdl/ket_noi.ts';
import { gui_email, email_bat } from '../su_kien/gui_email.ts';

interface Khoan {
  ten: string; loai: string; so_luong: string | null; thanh_tien: string; chiu_thue: boolean;
}
interface Phieu extends Record<string, unknown> {
  id: string; thang: string; ho_ten: string; ma_nv: string; email: string | null;
  phong_ban: string | null; chuc_danh: string | null; loai_hop_dong: string | null;
  khoan: Khoan[];
}

const LOAI_HD: Record<string, string> = {
  thu_viec: 'Thử việc', xac_dinh: 'Xác định thời hạn', khong_xac_dinh: 'Không xác định thời hạn',
  thoi_vu: 'Thời vụ', cong_tac_vien: 'Cộng tác viên', hoc_viec: 'Học việc',
};

const fmt = new Intl.NumberFormat('vi-VN');
const tien = (v: unknown): string => fmt.format(Math.round(Number(v) || 0));
const so = (v: unknown): string => { const n = Number(v) || 0; return Number.isInteger(n) ? String(n) : n.toFixed(1); };
function thang_viet(t: string): string { const [n, m] = t.split('-'); return `${m}/${n}`; }
function gio_phut(phut: number): string {
  const h = Math.floor(phut / 60); const m = phut % 60;
  return h > 0 ? `${String(h)}h${m > 0 ? String(m).padStart(2, '0') : ''}` : `${String(m)} phút`;
}

function hang(nhan: string, gia: string, dam = false): string {
  return `<tr>
    <td style="padding:6px 10px;border-bottom:1px solid #eee${dam ? ';font-weight:700' : ''}">${nhan}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap${dam ? ';font-weight:700' : ''}">${gia}</td>
  </tr>`;
}

/** Than email phieu luong chi tiet cho MOT nguoi. */
export function than_email_phieu(p: Phieu): string {
  const n = (k: string): number => Number(p[k]) || 0;
  const thu_nhap = p.khoan.filter((k) => k.loai === 'thu_nhap');
  const khau_tru = p.khoan.filter((k) => k.loai === 'tru');
  const nhan_hd = p.loai_hop_dong !== null ? (LOAI_HD[p.loai_hop_dong] ?? p.loai_hop_dong) : null;

  const hang_thu = [
    hang('Lương theo công', tien(n('luong_theo_cong'))),
    n('tien_ot') > 0 ? hang(`Làm thêm giờ (${gio_phut(n('phut_ot'))})`, tien(n('tien_ot'))) : '',
    n('thuong') > 0 ? hang('Thưởng', tien(n('thuong'))) : '',
    ...thu_nhap.map((k) => hang(
      `${k.ten}${k.chiu_thue ? '' : ' <span style="color:#6B7280;font-size:12px">(miễn thuế)</span>'}`
      + `${k.so_luong !== null && Number(k.so_luong) > 0 ? ` <span style="color:#6B7280;font-size:12px">× ${so(k.so_luong)}</span>` : ''}`,
      tien(k.thanh_tien))),
    n('phu_cap_khac') > 0 ? hang('Phụ cấp khác', tien(n('phu_cap_khac'))) : '',
    hang('TỔNG THU NHẬP', tien(n('tong_thu_nhap')), true),
  ].join('');

  const hang_tru = [
    hang('BHXH (8%)', tien(n('bhxh_nld'))),
    hang('BHYT (1,5%)', tien(n('bhyt_nld'))),
    hang('BHTN (1%)', tien(n('bhtn_nld'))),
    n('thue_tncn') > 0 ? hang('Thuế TNCN', tien(n('thue_tncn'))) : '',
    ...khau_tru.map((k) => hang(
      `${k.ten}${k.so_luong !== null && Number(k.so_luong) > 0 ? ` <span style="color:#6B7280;font-size:12px">× ${so(k.so_luong)}</span>` : ''}`,
      tien(k.thanh_tien))),
    n('tru_khac') > 0 ? hang('Trừ khác', tien(n('tru_khac'))) : '',
    hang('TỔNG KHẤU TRỪ', tien(n('tong_tru')), true),
  ].join('');

  const nhan_badge = (t: string): string =>
    `<span style="display:inline-block;background:#FEF3C7;color:#92400E;border-radius:6px;padding:2px 8px;font-size:12px;margin-left:6px">${t}</span>`;

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.5;max-width:600px">
    <div style="background:#2563EB;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
      <div style="font-size:17px;font-weight:700">Phiếu lương tháng ${thang_viet(p.thang)}</div>
      <div style="font-size:13px;opacity:.9;margin-top:2px">${p.ho_ten} · ${p.ma_nv}${p.phong_ban !== null ? ` · ${p.phong_ban}` : ''}${nhan_hd !== null ? ` · ${nhan_hd}` : ''}</div>
    </div>
    <div style="border:1px solid #E5E7EB;border-top:0;border-radius:0 0 8px 8px;padding:18px">

      <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:12px 14px;margin-bottom:14px">
        <div style="font-size:13px;color:#065F46">Thực nhận (làm tròn)</div>
        <div style="font-size:24px;font-weight:800;color:#065F46">${tien(n('thuc_linh_lam_tron'))} đ</div>
      </div>

      <p style="margin:0 0 12px;font-size:13px">
        <b>Công chuẩn:</b> ${so(p['so_ngay_cong_chuan'])} &nbsp;·&nbsp;
        <b>Công thực tế:</b> ${so(p['so_ngay_cong_thuc'])}
        ${Boolean(p['ep_du_cong']) ? nhan_badge('Đủ công') : ''}${Boolean(p['mien_phat']) ? nhan_badge('Miễn phạt') : ''}
        <br/><b>Lương cơ bản:</b> ${tien(n('luong_co_ban'))} đ &nbsp;·&nbsp;
        <b>Lương/ngày công:</b> ${tien(n('luong_ngay'))} đ
      </p>

      <h3 style="margin:14px 0 6px;font-size:14px">Thu nhập</h3>
      <table style="border-collapse:collapse;width:100%;font-size:13px">${hang_thu}</table>

      <h3 style="margin:16px 0 6px;font-size:14px">Khấu trừ</h3>
      <table style="border-collapse:collapse;width:100%;font-size:13px">${hang_tru}</table>

      <p style="margin:12px 0 0;font-size:12px;color:#6B7280">
        Giảm trừ gia cảnh: bản thân + <b>${so(p['so_nguoi_phu_thuoc'])}</b> người phụ thuộc
        (tổng ${tien(n('giam_tru_tong'))} đ). Thu nhập tính thuế: ${tien(n('thu_nhap_tinh_thue'))} đ.
        Mức lương đóng BHXH: ${tien(n('muc_dong_bh'))} đ.
      </p>

      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:12px 14px;margin-top:14px;font-size:13px;color:#1E40AF">
        <b>Thực nhận: ${tien(n('thuc_linh_lam_tron'))} đ.</b> Nếu thấy sai, bạn gửi <b>Khiếu nại phiếu lương</b>
        trong ứng dụng (mục <b>Phiếu lương</b>) hoặc liên hệ Phòng Nhân sự — mỗi khoản đều ghi rõ để đối chiếu.
      </div>

      <p style="margin:14px 0 0;color:#6B7280;font-size:12px">
        Email tự động từ hệ thống chấm công — vui lòng không trả lời trực tiếp email này.<br/>
        Trân trọng,<br/><b>Phòng Nhân sự — Công ty TNHH Trần Hoàng Việt Nam</b></p>
    </div>
  </div>`;
}

export interface KetQuaGuiPhieu { so_nguoi: number; so_gui: number; so_bo_qua: number }

async function tai_phieu(ky_luong_id: string): Promise<Phieu[]> {
  const phieu = await truy_van<Phieu>(
    `select p.*, k.thang, nv.ho_ten, nv.ma_nv, nv.email, pb.ten as phong_ban, nv.chuc_danh
       from phieu_luong p
       join ky_luong k on k.id = p.ky_luong_id
       join nhan_vien nv on nv.id = p.nhan_vien_id
       left join phong_ban pb on pb.id = nv.phong_ban_id
      where p.ky_luong_id = $1`,
    [ky_luong_id],
  );
  if (phieu.length === 0) return [];
  const khoan = await truy_van<Khoan & { phieu_luong_id: string }>(
    `select pk.phieu_luong_id, pk.so_luong, pk.thanh_tien, d.ten, d.loai, d.chiu_thue
       from phieu_luong_khoan pk join khoan_luong d on d.ma = pk.khoan_ma
      where pk.phieu_luong_id = any($1::uuid[])
      order by d.loai desc, d.thu_tu, d.ten`,
    [phieu.map((p) => p.id)],
  );
  return phieu.map((p) => ({
    ...p,
    khoan: khoan.filter((x) => String(x.phieu_luong_id) === String(p.id)),
  }));
}

/**
 * Gui email phieu luong cho tung nhan vien trong ky. Idempotent: bo qua neu ky da gui (tru khi
 * `bat_buoc`). Set `gui_phieu_luc` khi gui. Chi gui khi email da bat. Moi phieu chi den email
 * CUA CHINH nguoi do.
 */
export async function gui_phieu_luong_ky(
  ky_luong_id: string, opts: { bat_buoc?: boolean } = {},
): Promise<KetQuaGuiPhieu> {
  const kq: KetQuaGuiPhieu = { so_nguoi: 0, so_gui: 0, so_bo_qua: 0 };
  if (!email_bat()) return kq;

  const ky = await truy_van_mot<{ gui_phieu_luc: string | null; thang: string }>(
    'select gui_phieu_luc, thang from ky_luong where id = $1', [ky_luong_id],
  );
  if (ky === null) return kq;
  if (ky.gui_phieu_luc !== null && !(opts.bat_buoc ?? false)) return kq; // da gui

  const phieu = await tai_phieu(ky_luong_id);
  kq.so_nguoi = phieu.length;
  for (const p of phieu) {
    if (p.email === null || !p.email.includes('@')) { kq.so_bo_qua += 1; continue; }
    const ok = await gui_email({
      den: [p.email],
      tieu_de: `Phiếu lương tháng ${thang_viet(ky.thang)} — ${p.ho_ten}`,
      noi_dung_html: than_email_phieu(p),
    });
    if (ok) kq.so_gui += 1; else kq.so_bo_qua += 1;
  }

  await trong_giao_dich(async (khach: PoolClient) => {
    await khach.query('update ky_luong set gui_phieu_luc = now() where id = $1', [ky_luong_id]);
  });
  return kq;
}
