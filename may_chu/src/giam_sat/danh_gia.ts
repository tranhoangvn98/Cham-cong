// Rule engine: chay phep do, so voi nguong, ghi canh bao.
//
// TACH BACH CO Y:
//   - `phep_do/*` biet CACH DO, khong biet nguong.
//   - Bang `dieu_kien_loi` giu NGUONG, khong biet cach do.
//   - Tep nay noi hai thu lai.
// Nho vay doi nguong khong phai sua code, va sua cach do khong pha nguong nguoi ta da chot.
import { truy_van, trong_giao_dich } from '../csdl/ket_noi.ts';
import { doc } from './ket_noi_erp.ts';
import { la_ma_nguon, type MaNguon } from './nguon.ts';
import { tim_phep_do } from './phep_do/chi_muc.ts';
import type { DongDo, NguCanh, PhepDo } from './phep_do/kieu.ts';
// TAI DUNG nguyen ham so sanh cua module vi pham thay vi viet lai: no da co test, va da xu
// ly dung ca "toan tu la thi KHONG khop" — tha bo sot con hon bat oan.
import { thoa_man } from '../vi_pham/phat_hien.ts';

export interface DieuKien {
  id: string;
  loai_loi_id: string;
  phep_do: string;
  tham_so: Record<string, number>;
  toan_tu: string;
  nguong: string | number;
}

export interface LoiCanQuet {
  loai_loi_id: string;
  loai_loi_ma: string;
  loai_loi_ten: string;
  muc_do: string;
  dieu_kien: DieuKien[];
}

export interface KetQuaQuetLoi {
  loai_loi_ma: string;
  so_ban_ghi_doc: number;
  so_canh_bao_moi: number;
  so_bo_qua: number;
  thanh_cong: boolean;
  thong_diep: string | null;
  mili_giay: number;
}

/** Ngu canh that: doc ERP 1 qua lop chi-doc, doc CSDL cham cong qua pool san co. */
export function ngu_canh_that(bay_gio = new Date()): NguCanh {
  return {
    // `as Promise<T[]>` la can: pg tra ve dong dong nhat kieu, con phep do tu khai kieu
    // dong cua no. Ep kieu o DUNG MOT CHO nay thay vi moi phep do phai tu ep.
    doc: <T extends object>(
      ma: MaNguon, sql: string, tham_so: ReadonlyArray<unknown> = [],
    ) => doc(ma, sql, tham_so) as Promise<T[]>,
    doc_noi_bo: <T extends object>(
      sql: string, tham_so: ReadonlyArray<unknown> = [],
    ) => truy_van(sql, tham_so) as Promise<T[]>,
    bay_gio,
  };
}

/**
 * Cac loai loi dang bat, kem dieu kien dang bat cua chung.
 *
 * Loai loi khong con dieu kien nao bat thi KHONG tra ve: quet mot loai loi khong co dieu
 * kien nao se doc het du lieu ERP 1 roi khong bat gi — ton mot vong quet vo ich tren CSDL
 * cua he thong khac.
 */
export async function cac_loi_can_quet(loai_loi_id?: string): Promise<LoiCanQuet[]> {
  const dong = await truy_van<{
    loai_loi_id: string; loai_loi_ma: string; loai_loi_ten: string; muc_do: string;
    dk_id: string; phep_do: string; tham_so: Record<string, number>;
    toan_tu: string; nguong: string;
  }>(
    `select ll.id as loai_loi_id, ll.ma as loai_loi_ma, ll.ten as loai_loi_ten, ll.muc_do,
            dk.id as dk_id, dk.phep_do, dk.tham_so, dk.toan_tu, dk.nguong::text
       from loai_loi ll
       join loai_canh_bao cb on cb.id = ll.loai_canh_bao_id
       join dieu_kien_loi dk on dk.loai_loi_id = ll.id
      where ll.dang_bat = true and cb.dang_bat = true and dk.dang_bat = true
        and ($1::uuid is null or ll.id = $1::uuid)
      order by ll.ma, dk.thu_tu, dk.id`,
    [loai_loi_id ?? null],
  );

  const gop = new Map<string, LoiCanQuet>();
  for (const d of dong) {
    let l = gop.get(d.loai_loi_id);
    if (l === undefined) {
      l = {
        loai_loi_id: d.loai_loi_id, loai_loi_ma: d.loai_loi_ma,
        loai_loi_ten: d.loai_loi_ten, muc_do: d.muc_do, dieu_kien: [],
      };
      gop.set(d.loai_loi_id, l);
    }
    l.dieu_kien.push({
      id: d.dk_id, loai_loi_id: d.loai_loi_id, phep_do: d.phep_do,
      tham_so: d.tham_so ?? {}, toan_tu: d.toan_tu, nguong: d.nguong,
    });
  }
  return [...gop.values()];
}

/** Mot dong da qua sang loc, kem dieu kien da khop de dua vao bang chung. */
export interface DongKhop {
  dong: DongDo;
  nguon_ma: MaNguon;
  dieu_kien_khop: { phep_do: string; toan_tu: string; nguong: number; gia_tri: number }[];
}

/**
 * Chay het dieu kien cua MOT loai loi, tra ve cac dong thoa man TAT CA dieu kien (AND).
 *
 * Giao theo (thuc_the, thuc_the_khoa): mot doi tuong phai khop moi dieu kien moi thanh canh
 * bao. Dieu kien dau tien quyet dinh tap ung vien; cac dieu kien sau chi thu hep lai.
 */
export async function chay_dieu_kien(
  loi: LoiCanQuet, ctx: NguCanh,
): Promise<{ khop: DongKhop[]; so_doc: number; bo_qua: string[] }> {
  const bo_qua: string[] = [];
  let so_doc = 0;
  let giao: Map<string, DongKhop> | null = null;

  for (const dk of loi.dieu_kien) {
    const pd = tim_phep_do(dk.phep_do);
    if (pd === null) {
      // Ma phep do khong con trong danh sach dong (vi du bi doi ten sau nang cap). Ghi lai
      // va BO QUA dieu kien nay — khong lam sap ca vong quet vi mot dong cau hinh cu.
      bo_qua.push(`Phép đo "${dk.phep_do}" không tồn tại trong hệ thống.`);
      continue;
    }
    if (pd.chua_trien_khai !== undefined) {
      bo_qua.push(`Phép đo "${pd.ten}" chưa triển khai: ${pd.chua_trien_khai}`);
      continue;
    }

    const dong = await pd.do(ctx, dk.tham_so);
    so_doc += dong.length;
    const nguong = Number(dk.nguong);

    const khop_dk = new Map<string, DongKhop>();
    for (const d of dong) {
      if (!thoa_man(d.gia_tri, dk.toan_tu, nguong)) continue;
      khop_dk.set(`${d.thuc_the}|${d.thuc_the_khoa}`, {
        dong: d,
        // Phep do luon khai it nhat mot nguon; lay nguon dau lam noi ghi nhan canh bao.
        nguon_ma: pd.nguon[0] ?? 'hola',
        dieu_kien_khop: [{
          phep_do: pd.ma, toan_tu: dk.toan_tu, nguong, gia_tri: d.gia_tri,
        }],
      });
    }

    if (giao === null) {
      giao = khop_dk;
    } else {
      // Giao hai tap, gop lai chung cu de bang chung nêu du moi dieu kien da khop.
      const moi = new Map<string, DongKhop>();
      for (const [k, v] of giao) {
        const b = khop_dk.get(k);
        if (b === undefined) continue;
        moi.set(k, { ...v, dieu_kien_khop: [...v.dieu_kien_khop, ...b.dieu_kien_khop] });
      }
      giao = moi;
    }
    if (giao.size === 0) break; // giao da rong, cac dieu kien sau khong doi duoc gi
  }

  return { khop: giao === null ? [] : [...giao.values()], so_doc, bo_qua };
}

/**
 * Ghi cac dong khop thanh canh bao.
 *
 * `on conflict do nothing` + chi muc duy nhat `canh_bao_mot_lan`: chay lai vong quet KHONG
 * sinh ban trung, va KHONG ghi de ket luan nguoi ta da viet. Day la luat cua repo — chong
 * trung bang rang buoc, khong bang "select truoc roi insert".
 */
export async function ghi_canh_bao(
  loi: LoiCanQuet, khop: readonly DongKhop[],
): Promise<number> {
  if (khop.length === 0) return 0;
  let moi = 0;
  await trong_giao_dich(async (khach) => {
    for (const k of khop) {
      const d = k.dong;
      const dk_cuoi = k.dieu_kien_khop[k.dieu_kien_khop.length - 1];
      const bang_chung = { ...d.bang_chung, dieu_kien_da_khop: k.dieu_kien_khop };

      const kq = await khach.query(
        `insert into canh_bao
           (loai_loi_id, nguon_ma, thuc_the, thuc_the_khoa, ky, muc_do, tieu_de,
            bang_chung, gia_tri, nguong, erp_user_id, nhan_vien_id, so_tien, trang_thai)
         values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,
                 (select id from nhan_vien where erp_user_id = $11),
                 $12,'moi')
         on conflict do nothing
         returning id`,
        [
          loi.loai_loi_id, k.nguon_ma, d.thuc_the, d.thuc_the_khoa, d.ky ?? null,
          loi.muc_do, d.tieu_de, JSON.stringify(bang_chung),
          d.gia_tri, dk_cuoi?.nguong ?? null,
          d.erp_user_id ?? null, d.so_tien ?? null,
        ],
      );
      moi += kq.rowCount ?? 0;
    }
  });
  return moi;
}

/** Quet mot loai loi tu dau den cuoi, ghi nhat ky chay. */
export async function quet_mot_loi(
  loi: LoiCanQuet, ctx: NguCanh, ghi_that = true,
): Promise<KetQuaQuetLoi> {
  const bat_dau = Date.now();
  try {
    const { khop, so_doc, bo_qua } = await chay_dieu_kien(loi, ctx);
    const so_moi = ghi_that ? await ghi_canh_bao(loi, khop) : 0;
    const kq: KetQuaQuetLoi = {
      loai_loi_ma: loi.loai_loi_ma,
      so_ban_ghi_doc: so_doc,
      so_canh_bao_moi: so_moi,
      so_bo_qua: khop.length - so_moi,
      thanh_cong: true,
      thong_diep: bo_qua.length === 0 ? null : bo_qua.join(' | '),
      mili_giay: Date.now() - bat_dau,
    };
    if (ghi_that) await ghi_nhat_ky(loi, kq);
    return kq;
  } catch (loi_chay) {
    // MOT LAN QUET THAT BAI MA BAO "0 canh bao" LA KIEU THAT BAI TE NHAT — nhin nhu thanh
    // cong. Ghi thanh_cong = false de nguoi van hanh phan biet duoc "khong co gi" voi "hong".
    const kq: KetQuaQuetLoi = {
      loai_loi_ma: loi.loai_loi_ma,
      so_ban_ghi_doc: 0, so_canh_bao_moi: 0, so_bo_qua: 0,
      thanh_cong: false,
      thong_diep: (loi_chay as Error).message.slice(0, 500),
      mili_giay: Date.now() - bat_dau,
    };
    if (ghi_that) await ghi_nhat_ky(loi, kq);
    return kq;
  }
}

async function ghi_nhat_ky(loi: LoiCanQuet, kq: KetQuaQuetLoi): Promise<void> {
  await truy_van(
    `insert into lan_quet_giam_sat
       (loai_loi_id, pham_vi, so_ban_ghi_doc, so_canh_bao_moi, so_bo_qua,
        thanh_cong, thong_diep, mili_giay, ket_thuc_luc)
     values ($1,$2,$3,$4,$5,$6,$7,$8, now())`,
    [
      loi.loai_loi_id, loi.loai_loi_ma, kq.so_ban_ghi_doc, kq.so_canh_bao_moi,
      kq.so_bo_qua, kq.thanh_cong, kq.thong_diep, kq.mili_giay,
    ],
  );
}

/** Kiem tra mot ma nguon doc tu cau hinh co hop le khong. Dung o bien API. */
export function nguon_hop_le(ma: string): ma is MaNguon {
  return la_ma_nguon(ma);
}

export type { PhepDo };
