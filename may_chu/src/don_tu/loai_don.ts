// Dang ky BON LOAI DON dung chung bang `don_tu`: lam them, doi ca, cong tac, thoi viec.
//
// MOT CHO KHAI, CA TANG DUOI DUNG THEO. Moi loai khai o day mot lan: ten hien thi, cac o du
// lieu no dung, cach doc dau vao, va cac hang trong ban don DOCX. Route thi mot bo duy nhat va
// chung cho ca bon.
//
// VI SAO LAM THE: bon loai don khac nhau o vai o du lieu, con vong doi thi giong het — lam
// don, duyet, sinh ban don. Viet bon bo route la bon cho de lech: sua quyen o mot cho quen ba
// cho, doi thong diep loi o mot cho con ba cho noi khac. Them loai thu nam sau nay la them mot
// muc trong `CAC_LOAI` va khong sua route nao.
//
// Module NAY THUAN: khong CSDL, khong Fastify. Nho the kiem duoc tung loai bang du lieu mau.
import { LoiDauVao } from '../tien_ich/kiem_tra.ts';

export type MaLoaiDon = 'lam_them' | 'doi_ca' | 'cong_tac' | 'thoi_viec';

export const MA_LOAI_DON: readonly MaLoaiDon[] =
  ['lam_them', 'doi_ca', 'cong_tac', 'thoi_viec'] as const;

/** Mot don sau khi da doc tu dau vao — khop tung cot cua bang `don_tu`. */
export interface DonTu {
  loai: MaLoaiDon;
  tu_ngay: string;
  den_ngay: string | null;
  gio_bat_dau: string | null;
  gio_ket_thuc: string | null;
  doi_voi_id: string | null;
  ca_hien_tai_id: string | null;
  ca_moi_id: string | null;
  noi_den: string | null;
  ly_do: string | null;
}

/** Mot dong trong bang cua ban don DOCX. */
export type HangBanDon = readonly [string, string];

export interface DacTaLoaiDon {
  ma: MaLoaiDon;
  /** Ten cho nguoi doc, vi du "Đơn xin làm thêm giờ". */
  ten: string;
  /** Tieu de in tren ban don DOCX. */
  tieu_de: string;
  /** Tien to ten tep ban don. Khong dau, khong dau cach. */
  tien_to_tep: string;
  /**
   * `tu_ngay` cua loai nay nghia la gi. Vao ban don, va vao thong diep loi.
   *
   * Voi `thoi_viec` no la NGAY LAM VIEC CUOI CUNG, khong phai ngay lap don — mot cho rat de
   * hieu nguoc, va hieu nguoc thi tinh sai han bao truoc theo BLLD Dieu 35.
   */
  nhan_tu_ngay: string;
  /** Loai nay co khoang ngay (den_ngay) hay chi mot ngay. */
  co_khoang_ngay: boolean;
  /** Cac hang rieng cua loai nay trong ban don DOCX. */
  hang_ban_don: (d: DonTuDayDu) => HangBanDon[];
}

/** Don kem ten cac doi tuong lien quan, du de in ban don. */
export interface DonTuDayDu extends DonTu {
  /** Ho ten nguoi duoc doi ca cung, khi co. */
  doi_voi_ten: string | null;
  ca_hien_tai_ten: string | null;
  ca_moi_ten: string | null;
  /** DD/MM/YYYY. */
  tu_ngay_viet: string;
  den_ngay_viet: string | null;
}

function gio(g: string | null): string {
  return g === null || g === '' ? '—' : g.slice(0, 5);
}

/**
 * Bang dac ta. THU TU O DAY LA THU TU HIEN TREN GIAO DIEN.
 *
 * Sap theo tan suat dung that: lam them va doi ca la viec hang tuan, cong tac thua thot, thoi
 * viec thi vai lan mot nam. Nguoi dung khong phai cuon qua "Đơn xin thôi việc" moi lan xin OT.
 */
export const CAC_LOAI: readonly DacTaLoaiDon[] = [
  {
    ma: 'lam_them',
    ten: 'Đơn xin làm thêm giờ',
    tieu_de: 'ĐƠN XIN LÀM THÊM GIỜ',
    tien_to_tep: 'Don-xin-lam-them-gio',
    nhan_tu_ngay: 'Ngày làm thêm',
    co_khoang_ngay: false,
    hang_ban_don: (d) => [
      ['Ngày làm thêm', d.tu_ngay_viet],
      ['Từ giờ', gio(d.gio_bat_dau)],
      ['Đến giờ', gio(d.gio_ket_thuc)],
      ['Số giờ', so_gio_lam_them(d.gio_bat_dau, d.gio_ket_thuc)],
      ['Lý do', d.ly_do ?? '—'],
    ],
  },
  {
    ma: 'doi_ca',
    ten: 'Đơn xin đổi ca',
    tieu_de: 'ĐƠN XIN ĐỔI CA LÀM VIỆC',
    tien_to_tep: 'Don-xin-doi-ca',
    nhan_tu_ngay: 'Từ ngày',
    co_khoang_ngay: true,
    hang_ban_don: (d) => [
      ['Từ ngày', d.tu_ngay_viet],
      ['Đến ngày', d.den_ngay_viet ?? d.tu_ngay_viet],
      ['Ca hiện tại', d.ca_hien_tai_ten ?? '—'],
      ['Ca đề nghị', d.ca_moi_ten ?? '—'],
      ['Đổi với', d.doi_voi_ten ?? '— (không đổi với ai cụ thể)'],
      ['Lý do', d.ly_do ?? '—'],
    ],
  },
  {
    ma: 'cong_tac',
    ten: 'Đơn xin đi công tác',
    tieu_de: 'ĐƠN XIN ĐI CÔNG TÁC',
    tien_to_tep: 'Don-xin-di-cong-tac',
    nhan_tu_ngay: 'Từ ngày',
    co_khoang_ngay: true,
    hang_ban_don: (d) => [
      ['Từ ngày', d.tu_ngay_viet],
      ['Đến ngày', d.den_ngay_viet ?? d.tu_ngay_viet],
      ['Nơi đến', d.noi_den ?? '—'],
      ['Nội dung công tác', d.ly_do ?? '—'],
    ],
  },
  {
    ma: 'thoi_viec',
    ten: 'Đơn xin thôi việc',
    tieu_de: 'ĐƠN XIN THÔI VIỆC',
    tien_to_tep: 'Don-xin-thoi-viec',
    nhan_tu_ngay: 'Ngày làm việc cuối cùng',
    co_khoang_ngay: false,
    hang_ban_don: (d) => [
      ['Ngày làm việc cuối cùng', d.tu_ngay_viet],
      ['Lý do', d.ly_do ?? '—'],
    ],
  },
];

const THEO_MA = new Map(CAC_LOAI.map((l) => [l.ma, l]));

export function dac_ta(ma: string): DacTaLoaiDon {
  const d = THEO_MA.get(ma as MaLoaiDon);
  if (d === undefined) {
    throw new LoiDauVao(
      `Loại đơn không hợp lệ: "${ma}". Các loại nhận được: `
      + CAC_LOAI.map((l) => l.ma).join(', '),
    );
  }
  return d;
}

/**
 * So gio lam them, dang chu de in.
 *
 * Khong xu ly qua nua dem: mot don OT tu 22:00 den 02:00 se ra so am. Do la co y — bo doc dau
 * vao tu choi `gio_ket_thuc <= gio_bat_dau` (va CSDL cung co rang buoc), nen truong hop do
 * khong vao duoc den day. Ca dem thi lam hai don, mot cho moi ngay.
 */
export function so_gio_lam_them(bat_dau: string | null, ket_thuc: string | null): string {
  if (bat_dau === null || ket_thuc === null) return '—';
  const phut = (t: string): number => {
    const [g, p] = t.split(':');
    return Number(g) * 60 + Number(p);
  };
  const d = phut(ket_thuc) - phut(bat_dau);
  if (!Number.isFinite(d) || d <= 0) return '—';
  const gio_le = Math.floor(d / 60);
  const phut_le = d % 60;
  return phut_le === 0 ? `${String(gio_le)} giờ` : `${String(gio_le)} giờ ${String(phut_le)} phút`;
}

/** Tong so phut lam them cua mot don. 0 khi don khong phai `lam_them`. */
export function phut_lam_them(d: Pick<DonTu, 'loai' | 'gio_bat_dau' | 'gio_ket_thuc'>): number {
  if (d.loai !== 'lam_them' || d.gio_bat_dau === null || d.gio_ket_thuc === null) return 0;
  const phut = (t: string): number => {
    const [g, p] = t.split(':');
    return Number(g) * 60 + Number(p);
  };
  return Math.max(0, phut(d.gio_ket_thuc) - phut(d.gio_bat_dau));
}

// ---------------------------------------------------------------- canh bao phap ly

/** Tran lam them theo BLLD 2019 Dieu 107: 40 gio mot thang. */
export const PHUT_OT_TOI_DA_THANG = 40 * 60;

/**
 * Canh bao khi mot don lam them day tong OT cua thang vuot tran.
 *
 * CANH BAO, KHONG CHAN. Dieu 107 dat tran 40 gio/thang, nhung con so that phu thuoc ca vao OT
 * DA LAM (tu lan quet) lan OT DA DUYET nhung chua lam, va co nganh duoc 300 gio/nam theo Dieu
 * 107.3. Chan cung o day la chan sai trong nhung truong hop hop phap; noi ro con so de nguoi
 * duyet quyet thi dung hon.
 */
export function canh_bao_tran_ot(phut_da_co: number, phut_don_moi: number): string | null {
  const tong = phut_da_co + phut_don_moi;
  if (tong <= PHUT_OT_TOI_DA_THANG) return null;
  const gio = (p: number): string => (p / 60).toFixed(1).replace(/\.0$/, '');
  return `Tổng làm thêm tháng này sẽ là ${gio(tong)} giờ, vượt mức 40 giờ/tháng của `
    + `BLLĐ 2019 Điều 107 (đã có ${gio(phut_da_co)} giờ). Vẫn duyệt được, nhưng cần xem lại — `
    + 'một số ngành được 300 giờ/năm theo Điều 107.3, còn lại thì không.';
}

/**
 * So ngay bao truoc toi thieu khi nguoi lao dong don phuong cham dut HDLD.
 *
 * BLLD 2019 Dieu 35.1:
 *   - Hop dong khong xac dinh thoi han:            45 ngay
 *   - Hop dong xac dinh thoi han tu 12 den 36 thang: 30 ngay
 *   - Hop dong duoi 12 thang:                       3 ngay lam viec
 *
 * Tra null khi khong biet loai hop dong — thieu du lieu thi khong doan mot con so phap ly.
 */
export function ngay_bao_truoc_toi_thieu(
  loai_hop_dong: string | null,
  so_thang_hop_dong: number | null,
): number | null {
  if (loai_hop_dong === null) return null;
  if (loai_hop_dong === 'khong_xac_dinh') return 45;
  if (loai_hop_dong === 'thu_viec') return 3;
  if (loai_hop_dong === 'xac_dinh') {
    if (so_thang_hop_dong === null) return 30;
    return so_thang_hop_dong < 12 ? 3 : 30;
  }
  // thoi_vu, cong_tac_vien, hoc_viec: khong nam trong bang cua Dieu 35.1.
  return null;
}

/** Canh bao khi don thoi viec bao truoc it hon muc BLLD Dieu 35 doi. */
export function canh_bao_bao_truoc(
  so_ngay_bao_truoc: number,
  toi_thieu: number | null,
): string | null {
  if (toi_thieu === null || so_ngay_bao_truoc >= toi_thieu) return null;
  return `Đơn báo trước ${String(so_ngay_bao_truoc)} ngày, ít hơn mức `
    + `${String(toi_thieu)} ngày mà BLLĐ 2019 Điều 35.1 quy định cho loại hợp đồng này. `
    + 'Vẫn duyệt được — Điều 35.2 có các trường hợp không cần báo trước — nhưng nếu không '
    + 'thuộc trường hợp đó thì đây là vi phạm thời hạn báo trước.';
}
