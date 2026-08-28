// Doc du lieu tu CSDL -> goi quy tac tinh cong -> ghi bang_cong_ngay + su kien ERP.
import { truy_van, truy_van_mot, trong_giao_dich } from '../csdl/ket_noi.ts';
import { ghi_su_kien } from '../su_kien/hop_thu_di.ts';
import { cong_ngay, danh_sach_ngay, ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import {
  ca_cua_ngay,
  khoang_lay_quet,
  tinh_cong_ngay,
  type CaLam,
  type CaTheoThu,
  type KetQuaTinhCong,
  type KhoangLamThem,
} from './quy_tac_tinh_cong.ts';
import { chieu_quet, type ChieuMay } from './chieu_quet.ts';
import {
  loc_bam_dup,
  suy_luan_ra_vao,
  type KetQuaRaVao,
  type LanQuetCoChieu,
} from './ra_vao.ts';

interface DongNhanVien {
  id: string;
  ma_nv: string;
  ma_erp: string | null;
  ca_lam_id: string | null;
}

async function nap_ca(ca_lam_id: string | null): Promise<CaLam | null> {
  if (ca_lam_id === null) return null;
  const ca = await truy_van_mot<CaLam>(
    `select gio_vao, gio_ra, nghi_tu, nghi_den,
            dung_sai_muon_phut, dung_sai_som_phut, nguong_ot_phut,
            qua_dem, phut_du_cong, cac_ngay_lam
       from ca_lam where id = $1`,
    [ca_lam_id],
  );
  if (ca === null) return null;
  // Khung gio rieng theo thu (vd sang thu Bay). Khong co dong nao = ca dung mot khung
  // gio cho moi ngay lam, y het hanh vi truoc khi co bang nay.
  ca.theo_thu = await truy_van<CaTheoThu>(
    `select thu, gio_vao, gio_ra, nghi_tu, nghi_den, phut_du_cong
       from ca_lam_theo_thu where ca_lam_id = $1 order by thu`,
    [ca_lam_id],
  );
  return ca;
}

/**
 * Tinh lai bang cong cua mot nhan vien trong mot ngay.
 * Bo qua neu ngay do da chot (khoa so luong) — tru khi `bo_qua_chot` = true.
 * Tra ve ket qua da ghi, hoac null neu khong tinh (nhan vien khong ton tai / da chot).
 */
export async function tinh_lai_ngay(
  nhan_vien_id: string,
  ngay: string,
  bo_qua_chot = false,
): Promise<KetQuaTinhCong | null> {
  const nv = await truy_van_mot<DongNhanVien>(
    'select id, ma_nv, ma_erp, ca_lam_id from nhan_vien where id = $1',
    [nhan_vien_id],
  );
  if (nv === null) return null;

  if (!bo_qua_chot) {
    const da_chot = await truy_van_mot<{ da_chot: boolean }>(
      'select da_chot from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2',
      [nhan_vien_id, ngay],
    );
    if (da_chot?.da_chot === true) return null;
  }

  const ca = await nap_ca(nv.ca_lam_id);
  const khoang = khoang_lay_quet(ngay, ca);

  // Chi tinh cac lan quet DUOC TIN: may quet (tu_dong) hoac nhan su da duyet.
  // Lan quet bang dien thoai dang 'cho_duyet' khong duoc tinh cong.
  // Lay them serial + trang_thai (Status) + chieu cua may de suy luan ra/vao van phong.
  const quet = await truy_van<{
    thoi_diem: Date;
    thiet_bi_serial: string | null;
    trang_thai: number | null;
    chieu_may: ChieuMay | null;
  }>(
    `select lq.thoi_diem, lq.thiet_bi_serial, lq.trang_thai, tb.chieu as chieu_may
       from lan_quet lq
       left join thiet_bi tb on tb.serial = lq.thiet_bi_serial
      where lq.nhan_vien_id = $1
        and lq.thoi_diem >= $2 and lq.thoi_diem < $3
        and lq.trang_thai_duyet in ('tu_dong','da_duyet')
      order by lq.thoi_diem`,
    [nhan_vien_id, khoang.tu, khoang.den],
  );

  const nghi_phep = await truy_van_mot<{ loai: string; nua_ngay: boolean }>(
    `select loai, nua_ngay
       from don_nghi_phep
      where nhan_vien_id = $1 and trang_thai = 'da_duyet'
        and tu_ngay <= $2 and den_ngay >= $2
      order by tao_luc desc limit 1`,
    [nhan_vien_id, ngay],
  );

  const ngay_le = await truy_van_mot<{ huong_luong: boolean }>(
    'select huong_luong from ngay_le where ngay = $1',
    [ngay],
  );

  // Don di cong tac DA DUYET trum ngay nay. Khong co thi ngay do tinh nhu binh thuong.
  const cong_tac = await truy_van_mot<{ noi_den: string | null }>(
    `select noi_den
       from don_tu
      where nhan_vien_id = $1 and loai = 'cong_tac' and trang_thai = 'da_duyet'
        and tu_ngay <= $2 and coalesce(den_ngay, tu_ngay) >= $2
      order by tao_luc desc limit 1`,
    [nhan_vien_id, ngay],
  );

  // Don LAM THEM DA DUYET trum ngay nay. Khong co don thi OT = 0 du o lai bao lau.
  //
  // `to_char(...,'HH24:MI')` chu khong de kieu `time` tra ve nguyen: `quy_tac_tinh_cong` la
  // ham thuan va nhan chuoi 'HH:MM' o moi cho khac (gio ca, gio nghi, gio giai trinh). Tra ve
  // mot kieu khac chi cho rieng cho nay la mot cho de lech.
  const lam_them = await truy_van<KhoangLamThem>(
    `select to_char(gio_bat_dau, 'HH24:MI')  as gio_bat_dau,
            to_char(gio_ket_thuc, 'HH24:MI') as gio_ket_thuc
       from don_tu
      where nhan_vien_id = $1 and loai = 'lam_them' and trang_thai = 'da_duyet'
        and tu_ngay <= $2 and coalesce(den_ngay, tu_ngay) >= $2
        and gio_bat_dau is not null and gio_ket_thuc is not null
      order by gio_bat_dau`,
    [nhan_vien_id, ngay],
  );

  const giai_trinh = await truy_van_mot<{
    gio_vao_de_xuat: string | null;
    gio_ra_de_xuat: string | null;
  }>(
    `select gio_vao_de_xuat, gio_ra_de_xuat
       from don_giai_trinh
      where nhan_vien_id = $1 and ngay = $2 and trang_thai = 'da_duyet'
      limit 1`,
    [nhan_vien_id, ngay],
  );

  const kq = tinh_cong_ngay({
    ngay,
    ca,
    quet: quet.map((q) => q.thoi_diem),
    nghi_phep,
    ngay_le,
    giai_trinh,
    cong_tac,
    lam_them,
  });

  await trong_giao_dich(async (khach) => {
    await khach.query(
      `insert into bang_cong_ngay
         (nhan_vien_id, ngay, ca_lam_id, trang_thai, gio_vao, gio_ra,
          phut_lam, phut_muon, phut_ve_som, phut_ot, so_cong, co_dieu_chinh, ghi_chu, tinh_luc)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
       on conflict (nhan_vien_id, ngay) do update set
         ca_lam_id     = excluded.ca_lam_id,
         trang_thai    = excluded.trang_thai,
         gio_vao       = excluded.gio_vao,
         gio_ra        = excluded.gio_ra,
         phut_lam      = excluded.phut_lam,
         phut_muon     = excluded.phut_muon,
         phut_ve_som   = excluded.phut_ve_som,
         phut_ot       = excluded.phut_ot,
         so_cong       = excluded.so_cong,
         co_dieu_chinh = excluded.co_dieu_chinh,
         ghi_chu       = excluded.ghi_chu,
         tinh_luc      = now()
       where bang_cong_ngay.da_chot = false`,
      [
        nhan_vien_id, ngay, nv.ca_lam_id, kq.trang_thai, kq.gio_vao, kq.gio_ra,
        kq.phut_lam, kq.phut_muon, kq.phut_ve_som, kq.phut_ot, kq.so_cong,
        kq.co_dieu_chinh, kq.ghi_chu,
      ],
    );

    await ghi_su_kien('bang_cong.da_chot', {
      nhan_vien_id,
      ma_nv: nv.ma_nv,
      ma_erp: nv.ma_erp,
      ngay,
      trang_thai: kq.trang_thai,
      phut_lam: kq.phut_lam,
      phut_muon: kq.phut_muon,
      phut_ve_som: kq.phut_ve_som,
      phut_ot: kq.phut_ot,
      so_cong: kq.so_cong,
    }, khach);
  });

  // Suy luan ra/vao van phong (Phuong an A: chi DO, KHONG tru cong). Tach khoi giao dich tinh
  // cong o tren — mot loi o day khong duoc lam hong bang_cong_ngay da ghi.
  try {
    const ca_ngay = ca_cua_ngay(ca, ngay);
    const lan_quet: LanQuetCoChieu[] = quet.map((q) => ({
      thoi_diem: q.thoi_diem,
      // May chua khai chieu (hoac lan quet khong gan may) -> 'hai_chieu', doc theo Status.
      // chi_co_status_0 = false: hai cua that da khai 'vao'/'ra' nen Status bi bo qua o do; may
      // 'hai_chieu' con lai (Cua chinh) chi vai lan quet, khong dang ke.
      chieu: chieu_quet(q.chieu_may ?? 'hai_chieu', q.trang_thai ?? 0, false),
      thiet_bi: q.thiet_bi_serial,
    }));
    const rv = suy_luan_ra_vao(loc_bam_dup(lan_quet), ngay, ca_ngay);
    await ghi_ra_vao(nhan_vien_id, ngay, rv);
  } catch (loi) {
    console.error(
      `[ra_vao] loi nhan vien ${nhan_vien_id} ngay ${ngay}:`, (loi as Error).message,
    );
  }

  return kq;
}

/**
 * Ghi ket qua suy luan ra/vao cua mot ngay-nguoi: upsert `ra_vao_ngay` va thay toan bo canh bao
 * cua ngay do trong `canh_bao_ra_vao`. Xoa truoc khi chen nen chay lai khong tich luy rac.
 */
async function ghi_ra_vao(
  nhan_vien_id: string, ngay: string, rv: KetQuaRaVao,
): Promise<void> {
  await trong_giao_dich(async (khach) => {
    await khach.query(
      `insert into ra_vao_ngay
         (nhan_vien_id, ngay, gio_den, gio_ra_ve, phut_ra_ngoai, so_phien_ra_ngoai,
          con_trong_van_phong, suy_doan, tinh_luc)
       values ($1,$2,$3,$4,$5,$6,$7,$8, now())
       on conflict (nhan_vien_id, ngay) do update set
         gio_den             = excluded.gio_den,
         gio_ra_ve           = excluded.gio_ra_ve,
         phut_ra_ngoai       = excluded.phut_ra_ngoai,
         so_phien_ra_ngoai   = excluded.so_phien_ra_ngoai,
         con_trong_van_phong = excluded.con_trong_van_phong,
         suy_doan            = excluded.suy_doan,
         tinh_luc            = now()`,
      [
        nhan_vien_id, ngay, rv.gio_den, rv.gio_ra_ve, rv.phut_ra_ngoai,
        rv.phien_ra_ngoai.length, rv.con_trong_van_phong, rv.suy_doan,
      ],
    );

    await khach.query(
      'delete from canh_bao_ra_vao where nhan_vien_id = $1 and ngay = $2',
      [nhan_vien_id, ngay],
    );
    for (const l of rv.loi) {
      await khach.query(
        `insert into canh_bao_ra_vao (nhan_vien_id, ngay, ma_loi, thoi_diem, mo_ta)
         values ($1,$2,$3,$4,$5)`,
        [nhan_vien_id, ngay, l.ma, l.thoi_diem, l.mo_ta],
      );
    }
  });
}

/** Tinh lai nhieu (nhan vien, ngay). Chay tuan tu de khong lam nghen pool ket noi. */
export async function tinh_lai_nhieu(
  cap: Iterable<{ nhan_vien_id: string; ngay: string }>,
): Promise<number> {
  let so = 0;
  for (const c of cap) {
    try {
      const kq = await tinh_lai_ngay(c.nhan_vien_id, c.ngay);
      if (kq !== null) so++;
    } catch (loi) {
      // Mot nhan vien loi khong duoc lam dung ca lo.
      console.error(
        `[tinh_cong] loi nhan vien ${c.nhan_vien_id} ngay ${c.ngay}:`,
        (loi as Error).message,
      );
    }
  }
  return so;
}

/**
 * Tinh lai toan bo nhan vien dang hoat dong trong khoang ngay.
 * Dung khi nhan su doi ca / them ngay le / duyet don hang loat.
 */
export async function tinh_lai_khoang(
  tu: string,
  den: string,
  nhan_vien_id?: string,
): Promise<number> {
  const ds_ngay = danh_sach_ngay(tu, den);
  const nv = nhan_vien_id !== undefined
    ? await truy_van<{ id: string }>('select id from nhan_vien where id = $1', [nhan_vien_id])
    : await truy_van<{ id: string }>('select id from nhan_vien where dang_hoat_dong = true');

  const cap: { nhan_vien_id: string; ngay: string }[] = [];
  for (const n of nv) for (const ng of ds_ngay) cap.push({ nhan_vien_id: n.id, ngay: ng });
  return tinh_lai_nhieu(cap);
}

/**
 * Tinh lai ngay hom qua cho toan bo nhan vien — dung cho lich chay dem.
 * Can thiet vi nhung nguoi VANG khong he co lan quet nao nen khong co gi kich hoat
 * tinh cong; neu khong chay dinh ky thi ngay vang se khong xuat hien tren bang cong.
 */
export async function chot_ngay_hom_qua(hom_nay: Date = new Date()): Promise<number> {
  const hom_qua = cong_ngay(ngay_dia_phuong(hom_nay), -1);
  return tinh_lai_khoang(hom_qua, hom_qua);
}
