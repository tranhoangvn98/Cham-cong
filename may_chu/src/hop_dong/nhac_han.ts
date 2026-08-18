// Nhac han hop dong lao dong.
//
// VI SAO PHAI TU DONG: het han hop dong la mot cai moc KHONG CO GI KICH HOAT. Khong ai
// quet the, khong ai nop don, khong co su kien nao xay ra vao ngay do. Neu khong co viec
// nay thi cach duy nhat de biet la co nguoi nho ra ma mo ho so len xem.
//
// VA BO SOT NO CO HE QUA PHAP LY THAT, khong chi la bat tien:
//
//   Dieu 45 BLLĐ 2019 — nguoi su dung lao dong phai THONG BAO BANG VAN BAN cho nguoi lao
//   dong ve viec cham dut hop dong, CHAM NHAT 15 NGAY truoc ngay hop dong xac dinh thoi han
//   het han. Moc 15 ngay o day khong phai lua chon cua cong ty; do la han luat.
//
//   Dieu 20.2 BLLĐ 2019 — hop dong het han ma nguoi lao dong VAN LAM VIEC, qua 30 ngay
//   khong ky hop dong moi thi hop dong da giao ket TRO THANH hop dong khong xac dinh thoi
//   han. Bo sot 30 ngay nay la doi loai hop dong ma khong ai ky gi ca.
//
//   Dieu 27 BLLĐ 2019 — het thoi gian thu viec phai thong bao ket qua. Thu viec chi tinh
//   bang tuan nen cac moc 45/30 ngay vo nghia; phai co bo moc rieng.
//
// MOT DIEU NAY KHONG LAM: thong bao day (push) KHONG PHAI "van ban" theo Dieu 45. No chi
// de nhan su khong bo sot han; van ban thong bao van phai lam va van phai giao that.
import { thuc_thi, truy_van } from '../csdl/ket_noi.ts';
import { gui_thong_bao, tai_khoan_nguoi_duyet } from '../su_kien/thong_bao_day.ts';
import { ngay_viet } from '../tien_ich/thoi_gian.ts';

/**
 * Cac moc nhac cho hop dong xac dinh thoi han, tinh bang so ngay con lai.
 *
 * 15 la HAN LUAT (Dieu 45). 30 va 45 la de con kip lam thu tuc — ky hop dong moi, hay ra
 * quyet dinh khong ky tiep, deu can hop va can chu ky. 7 va 0 la luoi hung cuoi.
 */
export const MOC_CHINH: readonly number[] = [45, 30, 15, 7, 0];

/** Thu viec chi vai tuan (Dieu 25: toi da 180/60/30/6 ngay tuy chuc danh). */
export const MOC_THU_VIEC: readonly number[] = [7, 3, 0];

/** Loai hop dong nao dung bo moc nao. */
export function moc_cho_loai(loai: string | null): readonly number[] {
  return loai === 'thu_viec' || loai === 'hoc_viec' ? MOC_THU_VIEC : MOC_CHINH;
}

/**
 * Nhung moc CAN NHAC bay gio, cho mot hop dong con `so_ngay_con` ngay.
 *
 * Tra ve TAT CA moc da cham chua nhac, khong chi moc gan nhat. Ly do: hop dong moi nhap
 * vao he thong khi da con 3 ngay thi cac moc 45/30/15/7 deu da qua — neu chi ghi nhan moc
 * 7 thi vong sau se lai thay 15 chua nhac va nhac tiep, roi 30, roi 45. Bon thong bao cho
 * mot hop dong.
 *
 * Nguoi goi gui MOT thong bao va ghi CA danh sach nay vao `da_nhac_han`.
 */
export function moc_can_nhac(
  so_ngay_con: number,
  da_nhac: readonly number[],
  moc: readonly number[] = MOC_CHINH,
): number[] {
  const da = new Set(da_nhac);
  return moc.filter((m) => so_ngay_con <= m && !da.has(m));
}

/** Lo nhac: cang gan han cang gap. Dung de chon cach viet thong bao. */
export type MucGap = 'som' | 'gap' | 'rat_gap' | 'da_het_han';

export function muc_gap(so_ngay_con: number): MucGap {
  if (so_ngay_con < 0) return 'da_het_han';
  if (so_ngay_con <= 7) return 'rat_gap';
  if (so_ngay_con <= 15) return 'gap';
  return 'som';
}

export interface HopDongSapHan {
  id: string;
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  so_hd: string | null;
  loai: string | null;
  chuc_danh: string | null;
  hieu_luc_den: string;
  so_ngay_con: number;
  da_nhac_han: number[];
}

/**
 * Soan loi nhac.
 *
 * Noi ro SO NGAY THAT con lai, khong noi theo moc. Nguoi doc can biet "con 3 ngay", khong
 * phai "da den moc 7 ngay".
 */
export function loi_nhac(hd: HopDongSapHan): { tieu_de: string; noi_dung: string } {
  const ten = `${hd.ma_nv} — ${hd.ho_ten}`;
  const so = hd.so_hd === null ? '' : ` (${hd.so_hd})`;
  const den = ngay_viet(hd.hieu_luc_den);

  if (hd.so_ngay_con < 0) {
    const qua = -hd.so_ngay_con;
    // Nhac lai Dieu 20.2 vi day la luc no bat dau dem: 30 ngay nua la doi loai hop dong.
    const con_30 = 30 - qua;
    const canh = con_30 > 0
      ? `Còn ${String(con_30)} ngày trước khi hợp đồng tự chuyển thành không xác định thời hạn (Điều 20.2 BLLĐ).`
      : 'Đã quá 30 ngày — nếu người lao động vẫn làm việc thì hợp đồng đã trở thành không xác định thời hạn (Điều 20.2 BLLĐ).';
    return {
      tieu_de: `Hợp đồng ĐÃ HẾT HẠN ${String(qua)} ngày: ${ten}`,
      noi_dung: `Hợp đồng${so} hết hạn ngày ${den}. ${canh}`,
    };
  }

  if (hd.so_ngay_con === 0) {
    return {
      tieu_de: `Hợp đồng hết hạn HÔM NAY: ${ten}`,
      noi_dung: `Hợp đồng${so} hết hạn ngày ${den}.`,
    };
  }

  const han_luat = hd.so_ngay_con <= 15
    ? ' Đã trong hạn 15 ngày phải thông báo bằng văn bản (Điều 45 BLLĐ).'
    : '';
  return {
    tieu_de: `Hợp đồng còn ${String(hd.so_ngay_con)} ngày: ${ten}`,
    noi_dung: `Hợp đồng${so} hết hạn ngày ${den}.${han_luat}`,
  };
}

/**
 * Danh sach hop dong sap het han hoac da het han.
 *
 * `da_het_han` LUON hien, khong phu thuoc `trong_ngay`: mot hop dong het han tu ba thang
 * truoc ma chua ai xu ly la thu can thay nhat, va no khong con "sap" nua nen moi bo loc
 * theo so ngay con lai deu se lam no bien mat.
 */
export async function hop_dong_sap_het_han(
  trong_ngay = 45,
  hom_nay: string | null = null,
): Promise<HopDongSapHan[]> {
  return truy_van<HopDongSapHan>(
    `select hd.id, hd.nhan_vien_id, nv.ma_nv, nv.ho_ten, hd.so_hd, hd.loai, hd.chuc_danh,
            to_char(hd.hieu_luc_den, 'YYYY-MM-DD') as hieu_luc_den,
            (hd.hieu_luc_den - coalesce($2::date, current_date))::int as so_ngay_con,
            hd.da_nhac_han
       from hop_dong_lao_dong hd
       join nhan_vien nv on nv.id = hd.nhan_vien_id
      where hd.trang_thai = 'hieu_luc'
        and hd.hieu_luc_den is not null
        and nv.dang_hoat_dong = true
        and hd.hieu_luc_den - coalesce($2::date, current_date) <= $1
      order by hd.hieu_luc_den`,
    [trong_ngay, hom_nay],
  );
}

export interface KetQuaNhac {
  so_hop_dong: number;
  so_gui: number;
  /** Hop dong da xet nhung khong toi moc nao — de ghi log cho de hieu. */
  so_bo_qua: number;
}

/**
 * Quet mot vong va nhac nhung hop dong toi moc.
 *
 * Ghi `da_nhac_han` TRUOC khi gui thong bao. Neu gui truoc roi ghi sau, mot lan hong o
 * giua se lam vong ke tiep gui lai cung mot loi nhac — va no se gui lai mai. Tha bo sot
 * mot thong bao (hop dong van hien tren danh sach "sap het han") hon la nhac nhu ren moi
 * 15 phut.
 */
export async function quet_nhac_han(hom_nay: string | null = null): Promise<KetQuaNhac> {
  // Lay rong hon moc lon nhat de bat ca hop dong da het han tu lau.
  const ds = await hop_dong_sap_het_han(Math.max(...MOC_CHINH), hom_nay);
  const kq: KetQuaNhac = { so_hop_dong: ds.length, so_gui: 0, so_bo_qua: 0 };

  for (const hd of ds) {
    const can = moc_can_nhac(hd.so_ngay_con, hd.da_nhac_han, moc_cho_loai(hd.loai));
    if (can.length === 0) { kq.so_bo_qua++; continue; }

    await thuc_thi(
      // `array(select distinct ...)` de mang khong phong len khi chay lai nhieu lan.
      `update hop_dong_lao_dong
          set da_nhac_han = array(select distinct unnest(da_nhac_han || $2::int[]))
        where id = $1`,
      [hd.id, can],
    );

    const nguoi = await tai_khoan_nguoi_duyet(hd.nhan_vien_id);
    if (nguoi.length === 0) continue;

    const { tieu_de, noi_dung } = loi_nhac(hd);
    await gui_thong_bao({
      nguoi_dung_ids: nguoi,
      tieu_de,
      noi_dung,
      du_lieu: { man: 'ho_so', nhan_vien_id: hd.nhan_vien_id, nhom: 'hop_dong' },
    });
    kq.so_gui++;
  }

  return kq;
}

/** Ma viec cho bo lich — mot lan moi ngay. */
export function ma_viec_nhac_han(hom_nay: string): string {
  return `nhac_han_hop_dong:${hom_nay}`;
}
