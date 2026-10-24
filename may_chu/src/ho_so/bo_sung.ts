// Yeu cau bo sung ho so bat buoc: HR mo mot yeu cau cho mot nhan vien, he thong gui email
// nhac HANG TUAN cho den khi ho so day du thi tu dong dong.
//
// DINH NGHIA "DA BO SUNG XONG" CHI NAM O MOT CHO — `tai_lieu_bat_buoc_con_thieu`. Tien do o
// trang ho so va luong nhac nay phai cung mot dinh nghia; chep sang cho khac thi se co luc hai
// noi lech nhau, va cai lech nguy hiem la ben nhac "con thieu" trong khi ben ho so da xanh.
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { email_bat, gui_email } from '../su_kien/gui_email.ts';
import { gui_ngam, tai_khoan_cua_nhan_vien } from '../su_kien/thong_bao_day.ts';
import { chuan_ngon_ngu, tra_chuoi, type NgonNgu } from '../chuoi/chi_muc.ts';

/** Chu ky nhac: 7 ngay mot lan, tinh tu lan nhac truoc (chua nhac lan nao thi tu luc mo). */
export const CHU_KY_NHAC_NGAY = 7;

const MOT_NGAY_MS = 86_400_000;

export interface TaiLieuThieu {
  ma: string;
  ten: string;
}

export type TrangThaiYeuCau = 'dang_mo' | 'da_du' | 'da_huy';

export interface DongYeuCau {
  id: string;
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  email: string | null;
  han_bo_sung: string | null;
  ghi_chu: string | null;
  trang_thai: TrangThaiYeuCau;
  tao_luc: string;
  lan_nhac_cuoi: string | null;
  so_lan_nhac: number;
  danh_muc_ma: string[];
  /** So tai lieu bat buoc con thieu NGAY BAY GIO (khong phai so luc mo yeu cau). */
  con_thieu: number;
  ten_con_thieu: string[];
}

/**
 * Da den ky nhac ke tiep chua. Ham THUAN de kiem duoc ma khong can CSDL: tinh sai moc nay thi
 * hoac nguoi nhan bi lam phien moi ngay, hoac khong bao gio duoc nhac.
 */
export function den_han_nhac(
  lan_nhac_cuoi: Date | null,
  tao_luc: Date,
  bay_gio: Date,
  chu_ky_ngay = CHU_KY_NHAC_NGAY,
): boolean {
  const moc = lan_nhac_cuoi ?? tao_luc;
  return bay_gio.getTime() - moc.getTime() >= chu_ky_ngay * MOT_NGAY_MS;
}

/**
 * Tai lieu BAT BUOC con thieu cua mot nhan vien.
 *
 * Cung dieu kien voi tien do o `tuyen/ho_so.ts`: chi tinh tai lieu dang dung, bat buoc, khong
 * tinh loai chi phat sinh khi nghi viec (voi nguoi dang lam), va chi "du" khi da o muc
 * `da_len_phan_mem`.
 */
export async function tai_lieu_bat_buoc_con_thieu(
  nhan_vien_id: string,
): Promise<TaiLieuThieu[]> {
  return truy_van<TaiLieuThieu>(
    `select dm.ma, dm.ten
       from danh_muc_tai_lieu dm
       cross join nhan_vien nv
       left join tai_lieu_nhan_vien tl
              on tl.danh_muc_id = dm.id and tl.nhan_vien_id = nv.id
      where dm.dang_dung = true
        and dm.bat_buoc
        and (not dm.chi_khi_nghi_viec
             or nv.dang_hoat_dong = false or nv.ngay_nghi_viec is not null)
        and nv.id = $1
        and (tl.trang_thai is null or tl.trang_thai <> 'da_len_phan_mem')
      order by dm.thu_tu, dm.ten`,
    [nhan_vien_id],
  );
}

/** Ngon ngu cua nguoi nhan — doc tu CSDL, khong suy tu nguoi thao tac. */
async function ngon_ngu_cua(nhan_vien_id: string): Promise<NgonNgu> {
  const dong = await truy_van_mot<{ ngon_ngu: string | null }>(
    'select ngon_ngu from nguoi_dung where nhan_vien_id = $1 limit 1', [nhan_vien_id]);
  return chuan_ngon_ngu(dong?.ngon_ngu);
}

/**
 * Mo mot yeu cau bo sung. Tra `da_co = true` khi ho so da day du (khong co gi de yeu cau) —
 * ben goi doi thanh thong bao, khong phai loi he thong.
 *
 * Chong trung bang rang buoc UNIQUE MOT PHAN + `on conflict do nothing`: hai nguoi bam cung luc
 * thi mot dong duoc tao, nguoi kia nhan lai chinh yeu cau do.
 */
export async function tao_yeu_cau(
  nhan_vien_id: string,
  nguoi_tao_id: string | null,
  han_bo_sung: string | null,
  ghi_chu: string | null,
): Promise<{ id: string | null; so_tai_lieu: number; da_co: boolean }> {
  const thieu = await tai_lieu_bat_buoc_con_thieu(nhan_vien_id);
  if (thieu.length === 0) return { id: null, so_tai_lieu: 0, da_co: true };

  const tao = await truy_van_mot<{ id: string }>(
    `insert into yeu_cau_bo_sung_ho_so
            (nhan_vien_id, nguoi_tao_id, danh_muc_ma, han_bo_sung, ghi_chu)
     values ($1, $2, $3::text[], $4::date, $5)
     on conflict (nhan_vien_id) where trang_thai = 'dang_mo' do nothing
     returning id`,
    [nhan_vien_id, nguoi_tao_id, thieu.map((t) => t.ma), han_bo_sung, ghi_chu],
  );

  const id = tao?.id ?? (
    await truy_van_mot<{ id: string }>(
      `select id from yeu_cau_bo_sung_ho_so
        where nhan_vien_id = $1 and trang_thai = 'dang_mo'`, [nhan_vien_id])
  )?.id ?? null;

  return { id, so_tai_lieu: thieu.length, da_co: false };
}

/** Yeu cau dang mo cua mot nhan vien (null neu khong co). */
export async function yeu_cau_dang_mo(nhan_vien_id: string): Promise<DongYeuCau | null> {
  const ds = await danh_sach({ nhan_vien_id, trang_thai: 'dang_mo', gioi_han: 1 });
  return ds[0] ?? null;
}

/** Danh sach yeu cau, moi nhat truoc. Kem so tai lieu con thieu TINH LAI ngay bay gio. */
export async function danh_sach(
  loc: { nhan_vien_id?: string; trang_thai?: TrangThaiYeuCau; gioi_han?: number } = {},
): Promise<DongYeuCau[]> {
  return truy_van<DongYeuCau>(
    `select y.id,
            y.nhan_vien_id,
            nv.ma_nv,
            nv.ho_ten,
            nv.email,
            y.han_bo_sung::text                            as han_bo_sung,
            y.ghi_chu,
            y.trang_thai,
            y.tao_luc::text                                 as tao_luc,
            y.lan_nhac_cuoi::text                           as lan_nhac_cuoi,
            y.so_lan_nhac,
            y.danh_muc_ma,
            coalesce(t.thieu, '{}'::text[])                 as ten_con_thieu,
            coalesce(array_length(t.thieu, 1), 0)           as con_thieu
       from yeu_cau_bo_sung_ho_so y
       join nhan_vien nv on nv.id = y.nhan_vien_id
       left join lateral (
         select array_agg(dm.ten order by dm.thu_tu, dm.ten) as thieu
           from danh_muc_tai_lieu dm
           left join tai_lieu_nhan_vien tl
                  on tl.danh_muc_id = dm.id and tl.nhan_vien_id = nv.id
          where dm.dang_dung = true
            and dm.bat_buoc
            and (not dm.chi_khi_nghi_viec
                 or nv.dang_hoat_dong = false or nv.ngay_nghi_viec is not null)
            and (tl.trang_thai is null or tl.trang_thai <> 'da_len_phan_mem')
       ) t on true
      where ($1::uuid is null or y.nhan_vien_id = $1::uuid)
        and ($2::text is null or y.trang_thai = $2::text)
      order by y.tao_luc desc
      limit $3`,
    [loc.nhan_vien_id ?? null, loc.trang_thai ?? null, loc.gioi_han ?? 500],
  );
}

/** Huy mot yeu cau dang mo. Tra false khi khong con gi de huy (da dong/huy truoc do). */
export async function huy_yeu_cau(id: string): Promise<boolean> {
  const dong = await truy_van_mot<{ id: string }>(
    `update yeu_cau_bo_sung_ho_so
        set trang_thai = 'da_huy', dong_luc = now()
      where id = $1 and trang_thai = 'dang_mo'
      returning id`,
    [id],
  );
  if (dong === null) return false;

  // Yeu cau bo sung la viec cua NGUOI LAO DONG, nhung nguoi mo no (HR) can biet la no da bi
  // huy — neu khong, ho se tuong nguoi kia van dang duoc nhac va khong kiem tra lai.
  const y = await truy_van_mot<{ nhan_vien_id: string; ho_ten: string; nguoi_tao_id: string | null }>(
    `select y.nhan_vien_id, nv.ho_ten, y.nguoi_tao_id
       from yeu_cau_bo_sung_ho_so y join nhan_vien nv on nv.id = y.nhan_vien_id
      where y.id = $1`, [id]);
  if (y?.nguoi_tao_id != null) {
    const nn = await ngon_ngu_cua(y.nhan_vien_id);
    gui_ngam({
      nguoi_dung_ids: [y.nguoi_tao_id],
      tieu_de: tra_chuoi(nn, 'bs_tieu_de'),
      noi_dung: tra_chuoi(nn, 'bs_da_huy_nguoi_nhan', { ten: y.ho_ten }),
      du_lieu: { man: 'ho-so', nhan_vien_id: y.nhan_vien_id },
    });
  }
  return true;
}

// ==================================================================== email nhac

function thoat_html(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface DuLieuNhac {
  ho_ten: string;
  thieu: TaiLieuThieu[];
  han_bo_sung: string | null;
  ghi_chu: string | null;
  lan: number;
}

/**
 * Khung email nhac bo sung — cung phong cach voi email thong bao (bang xanh, the trang, chu
 * ky Phong Nhan su). Noi dung lay tu tu dien song ngu theo ngon ngu NGUOI NHAN; moi du lieu
 * tu CSDL deu duoc thoat HTML.
 */
export function html_nhac_bo_sung(d: DuLieuNhac, ngon_ngu: NgonNgu): string {
  const tra = (khoa: Parameters<typeof tra_chuoi>[1], ts?: Record<string, string | number>): string =>
    tra_chuoi(ngon_ngu, khoa, ts);

  const dong_tai_lieu = d.thieu
    .map((t) => '<li style="margin:0 0 6px;font-size:14px;color:#111">' + thoat_html(t.ten) + '</li>')
    .join('');
  const han = d.han_bo_sung === null
    ? ''
    : '<p style="margin:0 0 10px;font-size:14px;color:#111"><strong>'
      + thoat_html(tra('bs_han', { ngay: d.han_bo_sung })) + '</strong></p>';
  const ghi_chu = d.ghi_chu === null || d.ghi_chu.trim() === ''
    ? ''
    : '<p style="margin:0 0 10px;font-size:14px;color:#111">'
      + thoat_html(tra('bs_ghi_chu')) + ': ' + thoat_html(d.ghi_chu) + '</p>';

  return '<!doctype html><html lang="' + (ngon_ngu === 'zh' ? 'zh-CN' : 'vi') + '">'
    + '<head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1"></head>'
    + '<body style="margin:0;padding:0;background:#F3F4F6">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
    + 'style="background:#F3F4F6;padding:24px 12px"><tr><td align="center">'
    + '<table role="presentation" width="600" cellpadding="0" cellspacing="0" '
    + 'style="max-width:600px;width:100%;background:#fff;border:1px solid #E5E7EB;'
    + 'border-radius:8px;overflow:hidden">'
    + '<tr><td style="background:#2563EB;padding:16px 24px;color:#fff;font-size:16px;'
    + 'font-weight:600">' + thoat_html(tra('bs_tieu_de')) + '</td></tr>'
    + '<tr><td style="padding:24px">'
    + '<p style="margin:0 0 12px;font-size:14px;color:#111">'
    + thoat_html(tra('bs_chao', { ten: d.ho_ten })) + '</p>'
    + '<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#111">'
    + thoat_html(tra('bs_mo_ta', { so: d.thieu.length })) + '</p>'
    + '<p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#111">'
    + thoat_html(tra('bs_danh_sach')) + '</p>'
    + '<ul style="margin:0 0 14px;padding-left:22px">' + dong_tai_lieu + '</ul>'
    + han + ghi_chu
    + '<p style="margin:0 0 12px;font-size:13px;color:#6B7280">'
    + thoat_html(tra('bs_lan', { n: d.lan })) + '</p>'
    + '<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;'
    + 'padding:12px 14px;font-size:13px;color:#1E3A8A;line-height:1.6">'
    + thoat_html(tra('bs_ket')) + '</div>'
    + '<p style="margin:18px 0 0;font-size:14px;color:#111">' + thoat_html(tra('email_tran_trong'))
    + '</p>'
    + '<p style="margin:2px 0 0;font-size:14px;color:#111"><strong>'
    + thoat_html(tra('email_phong_nhan_su')) + '</strong><br>'
    + thoat_html(tra('email_cong_ty')) + '</p>'
    + '<p style="margin:14px 0 0;font-size:12px;color:#6B7280">'
    + thoat_html(tra('email_tu_dong')) + '</p>'
    + '</td></tr></table></td></tr></table></body></html>';
}

export interface KetQuaNhac {
  so_yeu_cau: number;
  so_email: number;
  so_dong: number;
  so_loi: number;
}

/**
 * Mot vong nhac: yeu cau nao da du thi tu dong dong (`da_du`), yeu cau nao den ky thi gui
 * email + chuong, con lai bo qua.
 *
 * CHIEM QUYEN NHAC BANG CAU UPDATE NGUYEN TU truoc khi gui: hai instance chay song song thi
 * chi mot cai gui, va nguoi nhan khong bi hai email cung mot tuan. Dieu kien trong cau update
 * lap lai dung moc thoi gian cua `den_han_nhac` — de ham thuan va SQL khong the lech nhau.
 */
export async function nhac_bo_sung(bay_gio: Date = new Date()): Promise<KetQuaNhac> {
  const kq: KetQuaNhac = { so_yeu_cau: 0, so_email: 0, so_dong: 0, so_loi: 0 };

  const ds = await truy_van<{
    id: string; nhan_vien_id: string; ho_ten: string; email: string | null;
    han_bo_sung: string | null; ghi_chu: string | null;
    tao_luc: string; lan_nhac_cuoi: string | null; so_lan_nhac: number;
  }>(
    `select y.id, y.nhan_vien_id, nv.ho_ten, nv.email,
            y.han_bo_sung::text as han_bo_sung, y.ghi_chu,
            y.tao_luc::text as tao_luc, y.lan_nhac_cuoi::text as lan_nhac_cuoi, y.so_lan_nhac
       from yeu_cau_bo_sung_ho_so y
       join nhan_vien nv on nv.id = y.nhan_vien_id
      where y.trang_thai = 'dang_mo'
        and nv.dang_hoat_dong = true
      order by y.id
      limit 500`,
  );
  kq.so_yeu_cau = ds.length;

  for (const y of ds) {
    try {
      const thieu = await tai_lieu_bat_buoc_con_thieu(y.nhan_vien_id);

      // Da bo sung du -> dong yeu cau. Khong gui email "da du" hang loat: chi bao cho nguoi
      // mo yeu cau, va chi khi chinh cau update nay thang (tranh bao hai lan).
      if (thieu.length === 0) {
        const dong = await truy_van_mot<{ id: string; nguoi_tao_id: string | null }>(
          `update yeu_cau_bo_sung_ho_so
              set trang_thai = 'da_du', dong_luc = now()
            where id = $1 and trang_thai = 'dang_mo'
            returning id, nguoi_tao_id`,
          [y.id],
        );
        if (dong !== null) {
          kq.so_dong += 1;
          if (dong.nguoi_tao_id !== null) {
            const nn = await ngon_ngu_cua(y.nhan_vien_id);
            gui_ngam({
              nguoi_dung_ids: [dong.nguoi_tao_id],
              tieu_de: tra_chuoi(nn, 'bs_tieu_de'),
              noi_dung: tra_chuoi(nn, 'bs_da_du_nguoi_nhan', { ten: y.ho_ten }),
              du_lieu: { man: 'ho-so', nhan_vien_id: y.nhan_vien_id },
            });
          }
        }
        continue;
      }

      const lan_nhac_cuoi = y.lan_nhac_cuoi === null ? null : new Date(y.lan_nhac_cuoi);
      if (!den_han_nhac(lan_nhac_cuoi, new Date(y.tao_luc), bay_gio)) continue;

      const chiem = await truy_van_mot<{ so_lan_nhac: number }>(
        `update yeu_cau_bo_sung_ho_so
            set lan_nhac_cuoi = $2, so_lan_nhac = so_lan_nhac + 1
          where id = $1 and trang_thai = 'dang_mo'
            and coalesce(lan_nhac_cuoi, tao_luc) <= $2::timestamptz - ($3 || ' days')::interval
          returning so_lan_nhac`,
        [y.id, bay_gio.toISOString(), String(CHU_KY_NHAC_NGAY)],
      );
      if (chiem === null) continue;

      const lan = chiem.so_lan_nhac;
      const nn = await ngon_ngu_cua(y.nhan_vien_id);

      if (email_bat() && y.email !== null && y.email.includes('@')) {
        const ok = await gui_email({
          den: [y.email],
          tieu_de: tra_chuoi(nn, 'bs_email_tieu_de', { so: thieu.length }),
          noi_dung_html: html_nhac_bo_sung({
            ho_ten: y.ho_ten,
            thieu,
            han_bo_sung: y.han_bo_sung,
            ghi_chu: y.ghi_chu,
            lan,
          }, nn),
        });
        if (ok) kq.so_email += 1;
      }

      const tai_khoan = await tai_khoan_cua_nhan_vien(y.nhan_vien_id);
      if (tai_khoan.length > 0) {
        gui_ngam({
          nguoi_dung_ids: tai_khoan,
          tieu_de: tra_chuoi(nn, 'bs_tieu_de'),
          noi_dung: tra_chuoi(nn, 'bs_mo_ta', { so: thieu.length }),
          du_lieu: { man: 'ho-so', nhan_vien_id: y.nhan_vien_id },
        });
      }
    } catch (loi) {
      kq.so_loi += 1;
      console.error(`[bo_sung] yeu cau ${y.id}: ${(loi as Error).message}`);
    }
  }

  return kq;
}

/** Ghi nhat ky thao tac (dung chung voi cac route khac). */
export async function ghi_nhat_ky_bo_sung(
  nguoi_dung_id: string | null, hanh_dong: string, yeu_cau_id: string | null,
  nhan_vien_id: string, chi_tiet: Record<string, unknown>,
): Promise<void> {
  await thuc_thi(
    `insert into nhat_ky_thao_tac (nguoi_dung_id, hanh_dong, thuc_the, thuc_the_id, chi_tiet)
     values ($1, $2, 'yeu_cau_bo_sung_ho_so', $3, $4::jsonb)`,
    [nguoi_dung_id, hanh_dong, yeu_cau_id, JSON.stringify({ ...chi_tiet, nhan_vien_id })],
  );
}
