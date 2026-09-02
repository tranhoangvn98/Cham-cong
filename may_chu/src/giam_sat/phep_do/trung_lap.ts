// Nhom trung lap: co hoi ban hang bi len trung, len khong, hoac bi nang sao thu cong.
import type { DongDo, NguCanh, PhepDo } from './kieu.ts';
import { ts_so } from './kieu.ts';

/** OPPORTUNITY_SALE ben Sale.Domain: HUY = 7, DA_CHOT = 8. */
const CH_HUY = 7;
const CH_DA_CHOT = 8;

const TS_SO_NGAY = {
  ten: 'so_ngay', nhan: 'Số ngày xét trùng', kieu: 'so' as const, mac_dinh: 30,
  goi_y: 'Hai cơ hội cách nhau xa hơn khoảng này thì không coi là trùng.',
};
const TS_NHIN_LAI = {
  ten: 'ngay_nhin_lai', nhan: 'Số ngày nhìn lại', kieu: 'so' as const, mac_dinh: 30,
};

/**
 * Chuan hoa so dien thoai Viet Nam de so sanh.
 *
 * Cung mot so duoc go bang nam cach khac nhau trong thuc te: `0912345678`,
 * `+84912345678`, `84912345678`, `0912.345.678`, `0912 345 678`. Khong chuan hoa thi phep do
 * trung so dien thoai bat duoc gan nhu khong gi — va no se im lang, khong bao loi.
 *
 * Tra ve chuoi rong neu khong con du chu so de coi la mot so dien thoai; ben goi bo qua
 * nhung dong do thay vi gop tat ca chuoi rong lai thanh mot nhom "trung".
 */
export function chuan_hoa_dien_thoai(tho: string | null | undefined): string {
  if (tho === null || tho === undefined) return '';
  let s = String(tho).replace(/[^\d+]/g, '');
  if (s.startsWith('+84')) s = `0${s.slice(3)}`;
  else if (s.startsWith('84') && s.length >= 10) s = `0${s.slice(2)}`;
  s = s.replace(/\D/g, '');
  if (!s.startsWith('0')) s = `0${s}`;
  // So di dong / co dinh VN sau chuan hoa la 10 chu so; 11 chu so voi vai dau so cu.
  return s.length >= 9 && s.length <= 11 ? s : '';
}

/**
 * Tinh lai so sao cua co hoi theo DUNG cong thuc cua ERP 1.
 *
 * Nguon: `Sale.Domain/AggregatesModels/SaleOpportunityAggreate/SaleOpportunity.cs` —
 * `AutoCreateLevel()` dem so nguong bi VUOT (strictly greater), lay max cua hai truc.
 *
 * VI SAO PHAI TINH LAI: `SetLevel(int)` cua ERP 1 cho dat sao bang tay tu 0 den 5 ma khong
 * kiem gi ca. Sao lai tinh vao diem KPI. Nen "sao dang luu cao hon sao tu tinh" la dau hieu
 * co nguoi nang sao thu cong.
 *
 * Neu ben ERP 1 doi nguong thi phep do nay bao sai — nen hai mang nguong duoi day phai
 * duoc doi chieu lai moi khi nang cap ERP 1. Cong cu `doi_chieu_schema` khong bat duoc
 * kieu lech nay vi no la lech LOGIC, khong phai lech schema.
 */
const NGUONG_KG = [200, 1000, 3000, 5000, 10000];
const NGUONG_KHOI = [1, 3, 5, 10, 20];

export function sao_tu_tinh(khoi_luong: number, the_tich: number): number {
  const dem = (v: number, ng: number[]) => ng.filter((n) => v > n).length;
  return Math.max(dem(khoi_luong, NGUONG_KG), dem(the_tich, NGUONG_KHOI));
}

interface DongCoHoi {
  Id: number; sysCode: string | null; ClientCode: string | null; ClientName: string | null;
  Phone: string | null; ProductName: string | null; UserId: number; CustomerId: number | null;
  OrderId: number | null; status: number; Level: number;
  ProductWeight: number; Volume: number; CreatedUtcDate: string;
}

const COT_CO_HOI = `"Id", "sysCode", "ClientCode", "ClientName", "Phone", "ProductName",
                    "UserId", "CustomerId", "OrderId", "status", "Level",
                    "ProductWeight", "Volume", "CreatedUtcDate"`;

/** Co hoi con "dang mo" — chua huy va chua chot. */
const DIEU_KIEN_MO = `"IsDelete" = false and "status" not in (${CH_HUY}, ${CH_DA_CHOT})`;

/**
 * Gom cac co hoi theo mot khoa, giu lai nhom co TU HAI NGUOI PHU TRACH tro len.
 *
 * Hai co hoi cua CUNG mot nhan vien tren cung mot khach khong phai dau hieu tranh khach —
 * do thuong chi la nhap lai. Bat ca hai kieu vao mot phep do se lam nhieu den muc khong ai
 * doc, nen phep do nay chi bat truong hop KHAC nguoi.
 */
function nhom_khac_nguoi(
  ds: DongCoHoi[], khoa: (c: DongCoHoi) => string,
): Map<string, DongCoHoi[]> {
  const nhom = new Map<string, DongCoHoi[]>();
  for (const c of ds) {
    const k = khoa(c);
    if (k === '') continue;
    const cu = nhom.get(k);
    if (cu === undefined) nhom.set(k, [c]);
    else cu.push(c);
  }
  for (const [k, v] of nhom) {
    if (v.length < 2 || new Set(v.map((c) => c.UserId)).size < 2) nhom.delete(k);
  }
  return nhom;
}

/** Dong canh bao chung cho hai phep do trung: gan vao co hoi MOI NHAT trong nhom. */
function dong_tu_nhom(nhom: Map<string, DongCoHoi[]>, nhan_khoa: string): DongDo[] {
  const ra: DongDo[] = [];
  for (const [k, v] of nhom) {
    const sap = [...v].sort((a, b) => a.CreatedUtcDate < b.CreatedUtcDate ? 1 : -1);
    const moi = sap[0];
    // `nhom_khac_nguoi` da bo moi nhom duoi 2 phan tu, nen `sap[0]` luon co. Kiem lai o day
    // de TypeScript yen tam va de mot lan sua ham tren khong am tham thanh loi runtime.
    if (moi === undefined) continue;
    ra.push({
      thuc_the: 'tbl_SaleOpportunity',
      thuc_the_khoa: String(moi.Id),
      gia_tri: v.length,
      tieu_de: `${v.length} cơ hội đang mở cùng ${nhan_khoa} do ${new Set(v.map((c) => c.UserId)).size} người phụ trách`,
      erp_user_id: moi.UserId,
      bang_chung: {
        [nhan_khoa.replace(/\s/g, '_')]: k,
        cac_co_hoi: sap.map((c) => ({
          id: c.Id, ma: c.sysCode, khach: c.ClientName,
          nguoi_phu_trach_erp: c.UserId, tao_luc: c.CreatedUtcDate,
        })),
      },
    });
  }
  return ra;
}

const co_hoi_trung_sdt: PhepDo = {
  ma: 'co_hoi_trung_sdt',
  ten: 'Nhiều người cùng lên cơ hội một số điện thoại',
  mo_ta: 'Đếm số cơ hội đang mở có cùng số điện thoại đã chuẩn hóa, do khác người phụ trách.',
  nhom: 'trung_lap',
  nguon: ['sale'],
  don_vi: 'lần',
  tham_so: [TS_SO_NGAY],
  async do(ctx: NguCanh, ts): Promise<DongDo[]> {
    const ngay = ts_so(co_hoi_trung_sdt, ts, 'so_ngay');
    const ds = await ctx.doc<DongCoHoi>('sale',
      `select ${COT_CO_HOI} from sale."tbl_SaleOpportunity"
        where ${DIEU_KIEN_MO}
          and "CreatedUtcDate" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);
    return dong_tu_nhom(nhom_khac_nguoi(ds, (c) => chuan_hoa_dien_thoai(c.Phone)),
      'số điện thoại');
  },
};

const co_hoi_trung_khach: PhepDo = {
  ma: 'co_hoi_trung_khach',
  ten: 'Nhiều người cùng lên cơ hội một khách hàng',
  mo_ta: 'Đếm số cơ hội đang mở trên cùng mã khách, do khác người phụ trách.',
  nhom: 'trung_lap',
  nguon: ['sale'],
  don_vi: 'lần',
  tham_so: [TS_SO_NGAY],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(co_hoi_trung_khach, ts, 'so_ngay');
    const ds = await ctx.doc<DongCoHoi>('sale',
      `select ${COT_CO_HOI} from sale."tbl_SaleOpportunity"
        where ${DIEU_KIEN_MO}
          and "CreatedUtcDate" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);
    return dong_tu_nhom(
      nhom_khac_nguoi(ds, (c) => c.CustomerId !== null && c.CustomerId > 0
        ? `kh:${c.CustomerId}`
        : (c.ClientCode ?? '').trim() !== '' ? `mkh:${(c.ClientCode ?? '').trim()}` : ''),
      'khách hàng');
  },
};

const co_hoi_khong_dinh_danh: PhepDo = {
  ma: 'co_hoi_khong_dinh_danh',
  ten: 'Cơ hội không truy được về khách thật',
  mo_ta: 'Cơ hội không có mã khách và cũng không có số điện thoại hợp lệ.',
  nhom: 'trung_lap',
  nguon: ['sale'],
  don_vi: 'lần',
  tham_so: [TS_NHIN_LAI],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(co_hoi_khong_dinh_danh, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<DongCoHoi>('sale',
      `select ${COT_CO_HOI} from sale."tbl_SaleOpportunity"
        where "IsDelete" = false and "status" <> ${CH_HUY}
          and "CreatedUtcDate" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);

    return ds
      .filter((c) => (c.CustomerId === null || c.CustomerId <= 0)
        && (c.ClientCode ?? '').trim() === ''
        && chuan_hoa_dien_thoai(c.Phone) === '')
      .map((c) => ({
        thuc_the: 'tbl_SaleOpportunity',
        thuc_the_khoa: String(c.Id),
        gia_tri: 1,
        tieu_de: `Cơ hội ${c.sysCode ?? c.Id} không có mã khách lẫn số điện thoại`,
        erp_user_id: c.UserId,
        bang_chung: {
          ma_co_hoi: c.sysCode, ten_khach_nhap_tay: c.ClientName,
          san_pham: c.ProductName, tao_luc: c.CreatedUtcDate,
        },
      }));
  },
};

const co_hoi_sao_bat_thuong: PhepDo = {
  ma: 'co_hoi_sao_bat_thuong',
  ten: 'Số sao cơ hội cao hơn mức khối lượng cho phép',
  mo_ta: 'Chênh lệch giữa số sao đang lưu và số sao tính lại theo công thức khối lượng / '
    + 'thể tích của ERP 1. Lớn hơn 0 nghĩa là có người nâng sao thủ công.',
  nhom: 'trung_lap',
  nguon: ['sale'],
  don_vi: 'lần',
  tham_so: [{ ...TS_NHIN_LAI, mac_dinh: 90 }],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(co_hoi_sao_bat_thuong, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<DongCoHoi>('sale',
      `select ${COT_CO_HOI} from sale."tbl_SaleOpportunity"
        where "IsDelete" = false
          and "CreatedUtcDate" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);

    const ra: DongDo[] = [];
    for (const c of ds) {
      const tu_tinh = sao_tu_tinh(Number(c.ProductWeight), Number(c.Volume));
      const lech = Number(c.Level) - tu_tinh;
      if (lech <= 0) continue;
      ra.push({
        thuc_the: 'tbl_SaleOpportunity',
        thuc_the_khoa: String(c.Id),
        gia_tri: lech,
        tieu_de: `Cơ hội ${c.sysCode ?? c.Id} đang ${c.Level} sao nhưng khối lượng chỉ đạt ${tu_tinh} sao`,
        erp_user_id: c.UserId,
        bang_chung: {
          ma_co_hoi: c.sysCode,
          sao_dang_luu: c.Level,
          sao_tu_tinh_lai: tu_tinh,
          khoi_luong_kg: c.ProductWeight,
          the_tich_m3: c.Volume,
          cong_thuc: 'AutoCreateLevel: đếm số ngưỡng bị vượt, lấy max của khối lượng và thể tích',
        },
      });
    }
    return ra;
  },
};

const co_hoi_chot_khong_don: PhepDo = {
  ma: 'co_hoi_chot_khong_don',
  ten: 'Cơ hội báo đã chốt nhưng không có đơn hàng',
  mo_ta: 'Số ngày cơ hội ở trạng thái đã chốt mà vẫn không gắn với đơn hàng nào.',
  nhom: 'trung_lap',
  nguon: ['sale'],
  don_vi: 'ngày',
  tham_so: [{ ...TS_NHIN_LAI, mac_dinh: 180 }],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(co_hoi_chot_khong_don, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<DongCoHoi>('sale',
      `select ${COT_CO_HOI} from sale."tbl_SaleOpportunity"
        where "IsDelete" = false and "status" = ${CH_DA_CHOT}
          and ("OrderId" is null or "OrderId" <= 0)
          and ("OrderCode" is null or "OrderCode" = '')
          and "CreatedUtcDate" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);

    return ds.map((c) => {
      const so_ngay = Math.round(
        (ctx.bay_gio.getTime() - new Date(c.CreatedUtcDate).getTime()) / 86_400_000,
      );
      return {
        thuc_the: 'tbl_SaleOpportunity',
        thuc_the_khoa: String(c.Id),
        gia_tri: so_ngay,
        tieu_de: `Cơ hội ${c.sysCode ?? c.Id} đã chốt ${so_ngay} ngày nhưng chưa có đơn hàng`,
        erp_user_id: c.UserId,
        bang_chung: {
          ma_co_hoi: c.sysCode, khach: c.ClientName,
          tao_luc: c.CreatedUtcDate, so_ngay_da_qua: so_ngay,
        },
      };
    });
  },
};

export const PHEP_DO_TRUNG_LAP: readonly PhepDo[] = [
  co_hoi_trung_sdt,
  co_hoi_trung_khach,
  co_hoi_khong_dinh_danh,
  co_hoi_sao_bat_thuong,
  co_hoi_chot_khong_don,
];
