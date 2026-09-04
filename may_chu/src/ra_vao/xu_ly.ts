// Quy trinh xu ly canh bao ra/vao: phat hien -> nhac nho (email + thong bao app) -> ky luat.
//
// QUY TAC LEO THANG (chu cong ty chon: tu dong): cung mot loi trong thang
//   * duoi nguong (cau_hinh.ra_vao.nguong_ky_luat) -> NHAC NHO: gui email + thong bao app.
//   * tu nguong tro len                            -> CHUYEN KY LUAT: tao ho so vi_pham de nhan
//     su doi chieu dieu noi quy + muc phat (module vi_pham lo phan do), roi quyet dinh.
//
// Nhan su van ep tay duoc mot hanh dong khac tren tab (hop_le / bo_qua / nhac lai / ky luat).
//
// Ky luat KHONG tu ap che tai: vi_pham tao o trang thai 'moi' — mot DE XUAT. Ap ky luat that
// (khien trach tro len) van phai qua quyet dinh + bien ban theo BLLD Dieu 122, lam o tab Vi pham.
import { truy_van_mot, trong_giao_dich } from '../csdl/ket_noi.ts';
import type { PoolClient } from 'pg';
import { cau_hinh } from '../cau_hinh.ts';
import { gui_ngam, tai_khoan_cua_nhan_vien } from '../su_kien/thong_bao_day.ts';
import { gui_email, email_bat } from '../su_kien/gui_email.ts';

/** Ten hien thi cua tung ma loi — dung chung voi giao dien. */
export const TEN_MA_LOI: Record<string, string> = {
  QUEN_QUET_VAO: 'Quên quẹt vào',
  QUEN_QUET_RA: 'Quên quẹt ra',
  VAO_KHI_DANG_TRONG: 'Vào khi đang trong văn phòng',
  RA_KHI_DANG_NGOAI: 'Ra khi đang ngoài văn phòng',
  CHI_MOT_LAN_QUET: 'Chỉ có một lần quẹt trong ngày',
};
export const ten_loi = (ma: string): string => TEN_MA_LOI[ma] ?? ma;

export type HanhDong = 'nhac_nho' | 'ky_luat' | 'hop_le' | 'bo_qua';
const TRANG_THAI: Record<HanhDong, string> = {
  nhac_nho: 'da_nhac',
  ky_luat: 'chuyen_ky_luat',
  hop_le: 'hop_le',
  bo_qua: 'bo_qua',
};

export interface CanhBao {
  nhan_vien_id: string;
  ngay: string;          // 'YYYY-MM-DD'
  ma_loi: string;
  mo_ta: string;
}

/** So lan cung loi trong thang cua `ngay` (doc canh_bao_ra_vao — luon phan anh trang thai moi). */
async function dem_loi_thang(
  khach: PoolClient, nhan_vien_id: string, ma_loi: string, ngay: string,
): Promise<number> {
  const r = await khach.query<{ so: number }>(
    `select count(distinct ngay)::int as so from canh_bao_ra_vao
      where nhan_vien_id = $1 and ma_loi = $2 and to_char(ngay, 'YYYY-MM') = $3`,
    [nhan_vien_id, ma_loi, ngay.slice(0, 7)],
  );
  return r.rows[0]?.so ?? 0;
}

function ngay_viet(ngay: string): string {
  const [y, m, d] = ngay.split('-');
  return d === undefined ? ngay : `${d}/${m}/${y}`;
}

function than_email(ho_ten: string, ngay: string, ma_loi: string, so_lan: number): string {
  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
    <p>Kính gửi ${ho_ten},</p>
    <p>Hệ thống chấm công ghi nhận một mâu thuẫn ra/vào văn phòng của bạn:</p>
    <ul>
      <li><b>Ngày:</b> ${ngay_viet(ngay)}</li>
      <li><b>Nội dung:</b> ${ten_loi(ma_loi)}</li>
      <li><b>Số lần trong tháng:</b> ${String(so_lan)}</li>
    </ul>
    <p>Đây là <b>nhắc nhở</b> để bạn quẹt thẻ đầy đủ khi ra/vào. Nếu có lý do chính đáng
       (đi gặp khách, ra ngân hàng…), vui lòng nộp đơn giải trình trên ứng dụng chấm công.</p>
    <p>Trân trọng,<br/>Phòng Nhân sự</p>
  </div>`;
}

export interface KetQuaXuLy {
  trang_thai: string;
  so_lan_thang: number;
  da_gui_email: boolean;
  da_gui_push: boolean;
  vi_pham_id: string | null;
}

/**
 * Xu ly MOT canh bao. `hanh_dong_ep` = nhan su ep tay; bo trong = tu dong theo nguong.
 * `nguoi_id` = tai khoan nhan su bam (null khi he thong tu chay).
 */
export async function xu_ly_canh_bao(
  cb: CanhBao,
  tuy: { hanh_dong_ep?: HanhDong; nguoi_id?: string | null; ghi_chu?: string } = {},
): Promise<KetQuaXuLy> {
  return trong_giao_dich(async (khach) => {
    const so_lan = await dem_loi_thang(khach, cb.nhan_vien_id, cb.ma_loi, cb.ngay);
    const tu_dong = tuy.nguoi_id === undefined || tuy.nguoi_id === null;

    const hanh_dong: HanhDong = tuy.hanh_dong_ep
      ?? (so_lan >= cau_hinh.ra_vao.nguong_ky_luat ? 'ky_luat' : 'nhac_nho');

    let da_gui_email = false;
    let da_gui_push = false;
    let vi_pham_id: string | null = null;

    if (hanh_dong === 'nhac_nho') {
      const nv = await khach.query<{ ho_ten: string; email: string | null }>(
        'select ho_ten, email from nhan_vien where id = $1', [cb.nhan_vien_id],
      );
      const ho_ten = nv.rows[0]?.ho_ten ?? '';
      const email = nv.rows[0]?.email ?? '';
      if (email_bat() && email.includes('@')) {
        da_gui_email = await gui_email({
          den: [email],
          tieu_de: `Nhắc nhở chấm công ra/vào — ${ngay_viet(cb.ngay)}`,
          noi_dung_html: than_email(ho_ten, cb.ngay, cb.ma_loi, so_lan),
        });
      }
      // Luon gui kem thong bao trong app (nguoi khong mo mail van thay).
      const tk = await tai_khoan_cua_nhan_vien(cb.nhan_vien_id);
      if (tk.length > 0) {
        gui_ngam({
          nguoi_dung_ids: tk,
          tieu_de: 'Nhắc nhở chấm công ra/vào',
          noi_dung: `${ten_loi(cb.ma_loi)} — ngày ${ngay_viet(cb.ngay)}`,
          du_lieu: { man: 'ra-vao', ngay: cb.ngay, ma_loi: cb.ma_loi },
        });
        da_gui_push = true;
      }
    } else if (hanh_dong === 'ky_luat') {
      // Tao ho so vi_pham (de xuat) — module vi_pham lo doi chieu dieu noi quy + muc phat.
      const loai = await khach.query<{ id: string }>(
        `select id from loai_vi_pham where ma = 'QUEN_QUET' and dang_bat = true limit 1`,
      );
      const loai_id = loai.rows[0]?.id ?? null;
      if (loai_id !== null) {
        const vp = await khach.query<{ id: string }>(
          `insert into vi_pham (nhan_vien_id, loai_vi_pham_id, ngay, ky, mo_ta, nguon,
                                trang_thai, nguoi_ghi)
           values ($1,$2,$3,$4,$5,$6,'moi',$7) returning id`,
          [
            cb.nhan_vien_id, loai_id, cb.ngay, cb.ngay.slice(0, 7),
            `${ten_loi(cb.ma_loi)} — lần thứ ${String(so_lan)} trong tháng (từ cảnh báo ra/vào)`,
            tu_dong ? 'he_thong' : 'nguoi',
            tuy.nguoi_id ?? null,
          ],
        );
        vi_pham_id = vp.rows[0]?.id ?? null;
      }
      // Bao nhan su co ho so ky luat moi.
      // (thong bao nguoi duyet de o route khi can — o day giu gon.)
    }

    const up = await khach.query<{ id: string }>(
      `insert into xu_ly_ra_vao
         (nhan_vien_id, ngay, ma_loi, so_lan_thang, trang_thai, tu_dong,
          da_gui_email, da_gui_push, vi_pham_id, ghi_chu, nguoi_xu_ly)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (nhan_vien_id, ngay, ma_loi) do update set
         so_lan_thang = excluded.so_lan_thang,
         trang_thai   = excluded.trang_thai,
         tu_dong      = excluded.tu_dong,
         da_gui_email = xu_ly_ra_vao.da_gui_email or excluded.da_gui_email,
         da_gui_push  = xu_ly_ra_vao.da_gui_push  or excluded.da_gui_push,
         vi_pham_id   = coalesce(excluded.vi_pham_id, xu_ly_ra_vao.vi_pham_id),
         ghi_chu      = excluded.ghi_chu,
         nguoi_xu_ly  = excluded.nguoi_xu_ly,
         cap_nhat_luc = now()
       returning id`,
      [
        cb.nhan_vien_id, cb.ngay, cb.ma_loi, so_lan, TRANG_THAI[hanh_dong], tu_dong,
        da_gui_email, da_gui_push, vi_pham_id, tuy.ghi_chu ?? null, tuy.nguoi_id ?? null,
      ],
    );
    void up;

    return { trang_thai: TRANG_THAI[hanh_dong], so_lan_thang: so_lan, da_gui_email, da_gui_push, vi_pham_id };
  });
}

/**
 * Quet canh bao cua MOT ngay va tu xu ly nhung cai CHUA co dong xu_ly_ra_vao. Dung cho job dem.
 * Gom theo (nhan_vien_id, ma_loi) — moi loai loi trong ngay xu ly mot lan. Tra so canh bao da xu ly.
 */
export async function quet_va_xu_ly_ngay(ngay: string): Promise<number> {
  const chua = await truy_van_mot<{ ds: CanhBao[] }>(
    `select coalesce(json_agg(t), '[]'::json) as ds from (
       select distinct cb.nhan_vien_id, cb.ngay::text as ngay, cb.ma_loi,
              min(cb.mo_ta) as mo_ta
         from canh_bao_ra_vao cb
        where cb.ngay = $1
          and not exists (
            select 1 from xu_ly_ra_vao x
             where x.nhan_vien_id = cb.nhan_vien_id and x.ngay = cb.ngay and x.ma_loi = cb.ma_loi)
        group by cb.nhan_vien_id, cb.ngay, cb.ma_loi
     ) t`,
    [ngay],
  );
  const ds = chua?.ds ?? [];
  let so = 0;
  for (const cb of ds) {
    try {
      await xu_ly_canh_bao(cb);   // tu dong: nguoi_id undefined
      so++;
    } catch (loi) {
      console.error(`[ra_vao] loi xu ly ${cb.nhan_vien_id} ${cb.ngay} ${cb.ma_loi}:`,
        (loi as Error).message);
    }
  }
  return so;
}
