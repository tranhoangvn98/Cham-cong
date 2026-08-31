// API xu ly ky luat tu dong: gom vi pham theo thang -> ho so ky luat, danh sach, tong quan,
// quet, duyet, bac bo.
//
// RANH GIOI PHAP LY: che tai tai chinh o day la GIAM THUONG P3 (Dieu 104 BLLD, Dieu 14 Noi quy),
// KHONG phai phat tien (Dieu 127). Ky luat lao dong that (khien trach tro len) van lam o tab Vi
// pham qua bien ban (Dieu 122/124) — khong endpoint nao o day ap ky luat do.
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import {
  can_admin, can_nhan_su, can_nguoi_duyet, nguoi_dung_hien_tai, xem_duoc_tat_ca,
} from '../bao_mat/xac_thuc.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import {
  chuoi, chuoi_bat_buoc, trong_tap, uuid, than,
  LoiDauVao, LoiKhongQuyen, LoiKhongTim, LoiXungDot,
} from '../tien_ich/kiem_tra.ts';
import { gui_ngam, tai_khoan_cua_nhan_vien } from '../su_kien/thong_bao_day.ts';
import { quet_vi_pham } from '../vi_pham/phat_hien.ts';
import { gom_va_xu_ly_thang, duyet_ho_so, bac_bo_ho_so, mien_ky_luat } from '../ky_luat/xu_ly.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';

const MUC_DO = ['nhe', 'trung', 'nang', 'rat_nang'] as const;
const TRANG_THAI = ['moi', 'da_nhac', 'cho_duyet', 'da_ap_dung', 'bac_bo', 'huy', 'mien'] as const;
const TRANG_THAI_KN = ['moi', 'dang_xem', 'chap_nhan', 'tu_choi'] as const;

function lay_id(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}

/** Ky mac dinh = thang hien tai (theo gio may). */
function ky_hien(q: Record<string, unknown>): string {
  const k = chuoi(q, 'ky', { toi_da: 7 });
  if (k !== undefined && k !== null && /^\d{4}-\d{2}$/.test(k)) return k;
  return ngay_dia_phuong(new Date()).slice(0, 7);
}

export async function tuyen_ky_luat(app: FastifyInstance): Promise<void> {
  // ------------------------------------------------------------ danh sach ho so
  app.get('/ky-luat', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = than(req.query) as Record<string, unknown>;
    const ky = ky_hien(q);
    const tt = trong_tap(q, 'trang_thai', TRANG_THAI);   // undefined = tat ca
    const md = trong_tap(q, 'muc_do', MUC_DO);
    const chi_phong_minh = !xem_duoc_tat_ca(nd);

    return truy_van(
      `select h.*, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              (select count(*) from khieu_nai_ky_luat kn
                where kn.ho_so_ky_luat_id = h.id
                  and kn.trang_thai in ('moi','dang_xem'))::int as so_khieu_nai
         from ho_so_ky_luat h
         join nhan_vien nv on nv.id = h.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where h.ky = $1
          and ($2::text is null or h.trang_thai = $2)
          and ($3::text is null or h.muc_do = $3)
          and ($4::boolean is not true
               or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $5))
        order by h.tong_tien desc, h.cap_nhat_luc desc
        limit 500`,
      [ky, tt ?? null, md ?? null, chi_phong_minh, nd.nv],
    );
  });

  // ------------------------------------------------------------ tong quan (dashboard ky luat)
  app.get('/ky-luat/tong-quan', { preHandler: can_nguoi_duyet }, async (req) => {
    const q = than(req.query) as Record<string, unknown>;
    const ky = ky_hien(q);

    const [tong, theo_trang_thai, theo_muc_do, top_nguoi] = await Promise.all([
      truy_van_mot<{ so_ho_so: number; so_nguoi: number; cho_duyet: number; tong_tien: string }>(
        `select count(*)::int as so_ho_so,
                count(distinct nhan_vien_id)::int as so_nguoi,
                count(*) filter (where trang_thai = 'cho_duyet')::int as cho_duyet,
                coalesce(sum(tong_tien) filter (where trang_thai = 'da_ap_dung'), 0)::text as tong_tien
           from ho_so_ky_luat where ky = $1`,
        [ky],
      ),
      truy_van<{ trang_thai: string; so: number }>(
        `select trang_thai, count(*)::int as so from ho_so_ky_luat
          where ky = $1 group by trang_thai`,
        [ky],
      ),
      truy_van<{ muc_do: string; so: number; tien: string }>(
        `select muc_do, count(*)::int as so, coalesce(sum(tong_tien),0)::text as tien
           from ho_so_ky_luat where ky = $1 group by muc_do`,
        [ky],
      ),
      truy_van<{ nhan_vien_id: string; ma_nv: string; ho_ten: string; phong_ban: string | null;
                 so_ho_so: number; so_vi_pham: number; tong_tien: string }>(
        `select h.nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
                count(*)::int as so_ho_so, sum(h.so_vi_pham)::int as so_vi_pham,
                coalesce(sum(h.tong_tien),0)::text as tong_tien
           from ho_so_ky_luat h
           join nhan_vien nv on nv.id = h.nhan_vien_id
           left join phong_ban pb on pb.id = nv.phong_ban_id
          where h.ky = $1
          group by h.nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten
          order by tong_tien desc, so_vi_pham desc limit 10`,
        [ky],
      ),
    ]);

    return { ky, tong, theo_trang_thai, theo_muc_do, top_nguoi };
  });

  // ------------------------------------------------------------ quet & xu ly mot ky
  /**
   * Quet vi pham cua ky (theo quy tac dang bat) roi gom & tu xu ly thanh ho so ky luat.
   * Nhac nho / giam thuong duoi nguong tu ap; giam thuong tu nguong chuyen 'cho_duyet'.
   */
  app.post('/ky-luat/quet', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const thang = chuoi_bat_buoc(b, 'thang', { toi_da: 7 });
    if (!/^\d{4}-\d{2}$/.test(thang)) throw new LoiDauVao('Tháng phải có dạng YYYY-MM.');

    // Phat hien vi pham he thong truoc (idempotent), roi gom.
    const phat_hien = await quet_vi_pham(thang, nd.sub);
    const gom = await gom_va_xu_ly_thang(thang, { tu_dong: false });
    await ghi_nhat_ky(nd.sub, 'quet_ky_luat', 'ho_so_ky_luat', null,
      { thang, phat_hien, gom }, req.ip);
    return { phat_hien, gom };
  });

  // ------------------------------------------------------------ duyet (giam thuong >= nguong)
  app.post('/ky-luat/:id/duyet', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const ghi_chu = chuoi(b, 'ghi_chu', { toi_da: 1000 }) ?? null;
    const kq = await duyet_ho_so(id, nd.sub, ghi_chu);
    await ghi_nhat_ky(nd.sub, 'duyet_ky_luat', 'ho_so_ky_luat', id, { ghi_chu, ...kq }, req.ip);
    return { ok: true, ...kq };
  });

  // ------------------------------------------------------------ bac bo / huy
  app.post('/ky-luat/:id/bac-bo', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const ly_do = chuoi_bat_buoc(b, 'ly_do', { toi_thieu: 3, toi_da: 1000 });
    const kq = await bac_bo_ho_so(id, nd.sub, ly_do);
    await ghi_nhat_ky(nd.sub, 'bac_bo_ky_luat', 'ho_so_ky_luat', id, { ly_do, ...kq }, req.ip);
    return { ok: true };
  });

  // ------------------------------------------------------------ MIEN KY LUAT (chi admin, hang loat)
  /**
   * Mien mot hoac nhieu ho so: chuyen sang 'mien', go giam thuong khoi luong. CHI admin
   * (`can_admin`). Nhan mang `ids` — mot phan tu = mien le, nhieu = mien dong loat.
   */
  app.post('/ky-luat/mien', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body) as Record<string, unknown>;
    const ly_do = chuoi_bat_buoc(b, 'ly_do', { toi_thieu: 3, toi_da: 1000 });
    const tho = b['ids'];
    if (!Array.isArray(tho) || tho.length === 0) {
      throw new LoiDauVao('Phải chọn ít nhất một hồ sơ để miễn.');
    }
    if (tho.length > 500) throw new LoiDauVao('Chỉ miễn tối đa 500 hồ sơ mỗi lần.');
    const ids = tho.map((x) => uuid({ v: x }, 'v', { bat_buoc: true }) as string);

    const kq = await mien_ky_luat(ids, nd.sub, ly_do);
    await ghi_nhat_ky(nd.sub, 'mien_ky_luat', 'ho_so_ky_luat', null,
      { so: ids.length, ly_do, ...kq }, req.ip);
    return { ok: true, ...kq };
  });

  // ============================================================ KHIEU NAI (quan ly)
  // ------------------------------------------------------------ danh sach khieu nai
  app.get('/khieu-nai', { preHandler: can_nguoi_duyet }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const q = than(req.query) as Record<string, unknown>;
    const tt = trong_tap(q, 'trang_thai', TRANG_THAI_KN);   // undefined = tat ca
    const chi_phong_minh = !xem_duoc_tat_ca(nd);

    return truy_van(
      `select kn.*, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              h.ma as ma_ky_luat, h.ky as ky_ky_luat, h.muc_do, h.tong_tien, h.trang_thai as tt_ky_luat,
              v.ngay as ngay_vi_pham, lvp.ten as ten_vi_pham
         from khieu_nai_ky_luat kn
         join nhan_vien nv on nv.id = kn.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
         left join ho_so_ky_luat h on h.id = kn.ho_so_ky_luat_id
         left join vi_pham v on v.id = kn.vi_pham_id
         left join loai_vi_pham lvp on lvp.id = v.loai_vi_pham_id
        where ($1::text is null or kn.trang_thai = $1)
          and ($2::boolean is not true
               or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $3))
        order by (kn.trang_thai in ('moi','dang_xem')) desc, kn.tao_luc desc
        limit 500`,
      [tt ?? null, chi_phong_minh, nd.nv],
    );
  });

  // ------------------------------------------------------------ xu ly mot khieu nai
  /**
   * Xu ly khieu nai: 'dang_xem' (tiep nhan), 'chap_nhan' (dong y), 'tu_choi' (giu quyet dinh).
   * Chap nhan mot khieu nai VE KY LUAT + `mien_luon=true` -> mien luon ho so do (chi admin lam duoc
   * viec mien; neu nguoi xu ly khong phai admin thi bao loi).
   */
  app.post('/khieu-nai/:id/xu-ly', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body) as Record<string, unknown>;
    const trang_thai = trong_tap(b, 'trang_thai', ['dang_xem', 'chap_nhan', 'tu_choi'] as const,
      { bat_buoc: true }) as 'dang_xem' | 'chap_nhan' | 'tu_choi';
    const phan_hoi = chuoi(b, 'phan_hoi', { toi_da: 2000 }) ?? null;
    const mien_luon = b['mien_luon'] === true;

    const kn = await truy_van_mot<{ nhan_vien_id: string; ho_so_ky_luat_id: string | null;
                                    trang_thai: string }>(
      'select nhan_vien_id, ho_so_ky_luat_id, trang_thai from khieu_nai_ky_luat where id = $1', [id],
    );
    if (kn === null) throw new LoiKhongTim('Không tìm thấy khiếu nại.');
    if (kn.trang_thai === 'chap_nhan' || kn.trang_thai === 'tu_choi') {
      throw new LoiXungDot('Khiếu nại đã được xử lý xong, không sửa được nữa.');
    }

    await thuc_thi(
      `update khieu_nai_ky_luat set trang_thai = $2, phan_hoi = coalesce($3, phan_hoi),
              nguoi_xu_ly = $4, xu_ly_luc = case when $2 in ('chap_nhan','tu_choi') then now() else xu_ly_luc end,
              cap_nhat_luc = now()
        where id = $1`,
      [id, trang_thai, phan_hoi, nd.sub],
    );

    // Chap nhan + mien_luon: mien ho so ky luat lien quan. Chi admin duoc mien.
    if (trang_thai === 'chap_nhan' && mien_luon && kn.ho_so_ky_luat_id !== null) {
      if (nd.vai_tro !== 'admin') {
        throw new LoiKhongQuyen('Chỉ admin được miễn kỷ luật khi chấp nhận khiếu nại.');
      }
      await mien_ky_luat([kn.ho_so_ky_luat_id], nd.sub,
        phan_hoi ?? 'Miễn kỷ luật theo khiếu nại được chấp nhận.');
    }

    await ghi_nhat_ky(nd.sub, 'xu_ly_khieu_nai', 'khieu_nai', id,
      { trang_thai, mien_luon }, req.ip);

    gui_ngam({
      nguoi_dung_ids: await tai_khoan_cua_nhan_vien(kn.nhan_vien_id).catch(() => []),
      tieu_de: trang_thai === 'chap_nhan' ? 'Khiếu nại được chấp nhận'
        : trang_thai === 'tu_choi' ? 'Khiếu nại bị từ chối' : 'Khiếu nại đang được xem xét',
      noi_dung: phan_hoi ?? 'Phòng Nhân sự đã cập nhật khiếu nại của bạn.',
      du_lieu: { man: 'ky-luat', khieu_nai_id: id },
    });
    return { ok: true };
  });
}
