// Nhom SLA: packing list va to khai lam / duyet co dung han khong.
//
// MOT BAY DA KIEM CHUNG, doc truoc khi sua SQL o day: ben erp_logistic, `Tax.TaxStatus` va
// `Tax.SlaStatus` KHONG luu chuoi tran. `TaxConfiguration.cs` cau hinh
// `HasConversion(v => JsonSerializer.Serialize(v, ...))` voi `JsonStringEnumConverter`, nen
// gia tri trong CSDL la chuoi JSON CO DAU NHAY KEP: `"APPROVED"`, `"SLA_SLOW"`.
//
// Viet `where "TaxStatus" = 'APPROVED'` se luon tra 0 dong — va do la kieu hong te nhat, vi
// no nhin y het "khong co canh bao nao". Moi cho so sanh o day deu boc qua
// `replace(cot, '"', '')` de chay dung voi ca hai dang luu.
import type { DongDo, NguCanh, PhepDo } from './kieu.ts';
import { ts_so } from './kieu.ts';

const TS_NHIN_LAI = {
  ten: 'ngay_nhin_lai', nhan: 'Số ngày nhìn lại', kieu: 'so' as const, mac_dinh: 30,
  goi_y: 'Chỉ quét chứng từ tạo trong khoảng này, để vòng quét không đọc lại toàn bộ lịch sử.',
};

/** Chenh lech gio giua hai moc, lam tron 1 chu so. */
function gio_giua(tu: Date | string, den: Date | string): number {
  const a = tu instanceof Date ? tu : new Date(tu);
  const b = den instanceof Date ? den : new Date(den);
  return Math.round(((b.getTime() - a.getTime()) / 3_600_000) * 10) / 10;
}

// ---------------------------------------------------------------- don da chot chua co PKL

interface DongDon {
  Id: number; Ma_don_hang: string | null; CreatedUtcDate: string;
  DateConvertToBh: string | null; Fk_nhanvien_id: number; Total: string | number;
}

const pkl_chua_co_sau_n_gio: PhepDo = {
  ma: 'pkl_chua_co_sau_n_gio',
  ten: 'Đơn đã chốt bán nhưng chưa có packing list',
  mo_ta: 'Số giờ trôi qua kể từ khi đơn chuyển sang bán mà vẫn chưa có packing list nào '
    + 'gắn với đơn đó.',
  nhom: 'sla',
  // Hai nguon: don o `sale`, packing list o `kho`. Postgres khong join cheo database duoc,
  // nen ghep trong Node — xem ADR-0002.
  nguon: ['sale', 'kho'],
  don_vi: 'giờ',
  tham_so: [TS_NHIN_LAI],
  async do(ctx: NguCanh, ts): Promise<DongDo[]> {
    const ngay = ts_so(pkl_chua_co_sau_n_gio, ts, 'ngay_nhin_lai');

    const don = await ctx.doc<DongDon>('sale',
      `select "Id", "Ma_don_hang", "CreatedUtcDate", "DateConvertToBh",
              "Fk_nhanvien_id", "Total"
         from sale."tbl_DonHang"
        where "IsDelete" = false
          and "DateConvertToBh" is not null
          and "DateConvertToBh" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);
    if (don.length === 0) return [];

    const ma_don = don.map((d) => d.Id);
    const co_pkl = await ctx.doc<{ OrderId: number }>('kho',
      `select distinct "OrderId"
         from "PackingList"
        where "IsDeleted" = false and "OrderId" = any($1::int[])`,
      [ma_don]);
    const da_co = new Set(co_pkl.map((p) => p.OrderId));

    return don
      .filter((d) => !da_co.has(d.Id))
      .map((d) => ({
        thuc_the: 'tbl_DonHang',
        thuc_the_khoa: String(d.Id),
        gia_tri: gio_giua(d.DateConvertToBh as string, ctx.bay_gio),
        tieu_de: `Đơn ${d.Ma_don_hang ?? d.Id} đã chốt bán nhưng chưa có packing list`,
        erp_user_id: d.Fk_nhanvien_id,
        so_tien: Number(d.Total),
        bang_chung: {
          ma_don_hang: d.Ma_don_hang,
          chot_ban_luc: d.DateConvertToBh,
          so_gio_da_troi: gio_giua(d.DateConvertToBh as string, ctx.bay_gio),
        },
      }));
  },
};

// ---------------------------------------------------------------- PKL lap muon

const pkl_tao_muon: PhepDo = {
  ma: 'pkl_tao_muon',
  ten: 'Packing list lập muộn so với lúc chốt đơn',
  mo_ta: 'Số giờ từ lúc đơn chuyển sang bán đến lúc packing list đầu tiên được tạo.',
  nhom: 'sla',
  nguon: ['sale', 'kho'],
  don_vi: 'giờ',
  tham_so: [TS_NHIN_LAI],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(pkl_tao_muon, ts, 'ngay_nhin_lai');

    const don = await ctx.doc<DongDon>('sale',
      `select "Id", "Ma_don_hang", "CreatedUtcDate", "DateConvertToBh",
              "Fk_nhanvien_id", "Total"
         from sale."tbl_DonHang"
        where "IsDelete" = false
          and "DateConvertToBh" is not null
          and "DateConvertToBh" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);
    if (don.length === 0) return [];

    const pkl = await ctx.doc<{ OrderId: number; dau_tien: string; ma: string }>('kho',
      `select "OrderId", min("CreatedUtcDate") as dau_tien,
              min("PackingListCode")           as ma
         from "PackingList"
        where "IsDeleted" = false and "OrderId" = any($1::int[])
        group by "OrderId"`,
      [don.map((d) => d.Id)]);
    const ban_do = new Map(pkl.map((p) => [p.OrderId, p]));

    const ra: DongDo[] = [];
    for (const d of don) {
      const p = ban_do.get(d.Id);
      if (p === undefined) continue; // chua co PKL -> thuoc phep do tren, khong dem hai lan
      const gio = gio_giua(d.DateConvertToBh as string, p.dau_tien);
      if (gio < 0) continue; // PKL tao truoc khi chot ban — hop le, khong phai cham
      ra.push({
        thuc_the: 'tbl_DonHang',
        thuc_the_khoa: String(d.Id),
        gia_tri: gio,
        tieu_de: `Packing list của đơn ${d.Ma_don_hang ?? d.Id} lập sau ${gio} giờ`,
        erp_user_id: d.Fk_nhanvien_id,
        so_tien: Number(d.Total),
        bang_chung: {
          ma_don_hang: d.Ma_don_hang,
          chot_ban_luc: d.DateConvertToBh,
          packing_list: p.ma,
          packing_list_tao_luc: p.dau_tien,
          so_gio: gio,
        },
      });
    }
    return ra;
  },
};

// ---------------------------------------------------------------- PKL treo cho nhap kho

/** PackingListStatus ben erp_logistic: NONE=0, KHOI_TAO=1, DA_NHAP_KHO=2, CHO_NHAP_KHO=3. */
const PKL_CHO_NHAP_KHO = 3;

const pkl_cho_nhap_kho_lau: PhepDo = {
  ma: 'pkl_cho_nhap_kho_lau',
  ten: 'Packing list treo ở trạng thái chờ nhập kho',
  mo_ta: 'Số giờ packing list nằm ở trạng thái chờ nhập kho mà chưa chuyển tiếp.',
  nhom: 'sla',
  nguon: ['kho'],
  don_vi: 'giờ',
  tham_so: [{ ...TS_NHIN_LAI, mac_dinh: 60 }],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(pkl_cho_nhap_kho_lau, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<{
      Id: string; PackingListCode: string; PackingListName: string;
      CreatedUtcDate: string; OrderId: number; NumberOfPackage: number;
    }>('kho',
      `select "Id", "PackingListCode", "PackingListName", "CreatedUtcDate",
              "OrderId", "NumberOfPackage"
         from "PackingList"
        where "IsDeleted" = false
          and "Status" = $1
          and "CreatedUtcDate" >= now() - ($2 || ' days')::interval`,
      [PKL_CHO_NHAP_KHO, String(ngay)]);

    return ds.map((p) => ({
      thuc_the: 'PackingList',
      thuc_the_khoa: p.Id,
      gia_tri: gio_giua(p.CreatedUtcDate, ctx.bay_gio),
      tieu_de: `Packing list ${p.PackingListCode} chờ nhập kho quá lâu`,
      bang_chung: {
        ma_packing_list: p.PackingListCode,
        ten: p.PackingListName,
        ma_don_hang_erp: p.OrderId,
        so_kien: p.NumberOfPackage,
        tao_luc: p.CreatedUtcDate,
      },
    }));
  },
};

// ---------------------------------------------------------------- NKCT lech lon treo

/** ERepositoryCheckStatus: None=0, Mismatched=1, Matched=2, DoubleCheck=3. */
const NKCT_DOUBLE_CHECK = 3;

const nkct_lech_lon: PhepDo = {
  ma: 'nkct_lech_lon',
  ten: 'Phiếu nhập kho lệch lớn chưa xử lý',
  mo_ta: 'Số ngày phiếu nhập kho nằm ở trạng thái phải kiểm tra lại (lệch trên 10%).',
  nhom: 'sla',
  nguon: ['kho'],
  don_vi: 'ngày',
  tham_so: [{ ...TS_NHIN_LAI, mac_dinh: 90 }],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(nkct_lech_lon, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<{
      Id: string; RepositoryCheckCode: string; MismatchReason: string | null;
      CreatedUtcDate: string; OrderCode: string | null; CustomerCode: string | null;
      TransportFee: number; DomesticFreight: number;
    }>('kho',
      `select "Id", "RepositoryCheckCode", "MismatchReason", "CreatedUtcDate",
              "OrderCode", "CustomerCode", "TransportFee", "DomesticFreight"
         from "RepositoryChecks"
        where "IsDeleted" = false
          and "Status" = $1
          and "CreatedUtcDate" >= now() - ($2 || ' days')::interval`,
      [NKCT_DOUBLE_CHECK, String(ngay)]);

    return ds.map((r) => ({
      thuc_the: 'RepositoryChecks',
      thuc_the_khoa: r.Id,
      gia_tri: Math.round(gio_giua(r.CreatedUtcDate, ctx.bay_gio) / 24 * 10) / 10,
      tieu_de: `Phiếu nhập kho ${r.RepositoryCheckCode} lệch trên 10% chưa xử lý`,
      bang_chung: {
        ma_phieu: r.RepositoryCheckCode,
        ly_do_lech: r.MismatchReason,
        ma_don_hang: r.OrderCode,
        ma_khach: r.CustomerCode,
        cuoc_van_chuyen: r.TransportFee,
        cuoc_noi_dia: r.DomesticFreight,
        tao_luc: r.CreatedUtcDate,
      },
    }));
  },
};

// ---------------------------------------------------------------- to khai

interface DongToKhai {
  Id: string; Code: string; ContainerId: number; UserId: string;
  CreatedUtcDate: string; FinishedDateTimeUTC: string | null;
  ApprovedDateTimeUTC: string | null; TaxStatus: string | null; SlaStatus: string | null;
}

const to_khai_sla_cham: PhepDo = {
  ma: 'to_khai_sla_cham',
  ten: 'Tờ khai bị hệ thống đánh dấu duyệt chậm',
  mo_ta: 'Đếm tờ khai có SlaStatus = SLA_SLOW. Đây là chỉ số do chính erp_logistic tính, '
    + 'module chỉ đọc lại chứ không tính lại.',
  nhom: 'sla',
  nguon: ['kho'],
  don_vi: 'lần',
  tham_so: [TS_NHIN_LAI],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(to_khai_sla_cham, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<DongToKhai>('kho',
      `select "Id", "Code", "ContainerId", "UserId", "CreatedUtcDate",
              "FinishedDateTimeUTC", "ApprovedDateTimeUTC",
              replace("TaxStatus", '"', '') as "TaxStatus",
              replace("SlaStatus", '"', '') as "SlaStatus"
         from "Tax"
        where "IsDeleted" = false
          and replace("SlaStatus", '"', '') = 'SLA_SLOW'
          and "CreatedUtcDate" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);

    return ds.map((t) => ({
      thuc_the: 'Tax',
      thuc_the_khoa: t.Id,
      gia_tri: 1,
      tieu_de: `Tờ khai ${t.Code} bị đánh dấu duyệt chậm`,
      bang_chung: {
        ma_to_khai: t.Code,
        container: t.ContainerId,
        hoan_thanh_luc: t.FinishedDateTimeUTC,
        duyet_luc: t.ApprovedDateTimeUTC,
        trang_thai: t.TaxStatus,
      },
    }));
  },
};

const to_khai_gio_duyet: PhepDo = {
  ma: 'to_khai_gio_duyet',
  ten: 'Thời gian duyệt tờ khai sau khi hoàn thành',
  mo_ta: 'Số phút từ FinishedDateTimeUTC đến ApprovedDateTimeUTC.',
  nhom: 'sla',
  nguon: ['kho'],
  don_vi: 'phút',
  tham_so: [TS_NHIN_LAI],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(to_khai_gio_duyet, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<DongToKhai>('kho',
      `select "Id", "Code", "ContainerId", "UserId", "CreatedUtcDate",
              "FinishedDateTimeUTC", "ApprovedDateTimeUTC",
              replace("TaxStatus", '"', '') as "TaxStatus",
              replace("SlaStatus", '"', '') as "SlaStatus"
         from "Tax"
        where "IsDeleted" = false
          and "FinishedDateTimeUTC" is not null
          and "ApprovedDateTimeUTC" is not null
          and "ApprovedDateTimeUTC" >= "FinishedDateTimeUTC"
          and "CreatedUtcDate" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);

    return ds.map((t) => {
      const phut = Math.round(
        gio_giua(t.FinishedDateTimeUTC as string, t.ApprovedDateTimeUTC as string) * 60,
      );
      return {
        thuc_the: 'Tax',
        thuc_the_khoa: t.Id,
        gia_tri: phut,
        tieu_de: `Tờ khai ${t.Code} duyệt sau ${phut} phút kể từ khi hoàn thành`,
        bang_chung: {
          ma_to_khai: t.Code,
          container: t.ContainerId,
          hoan_thanh_luc: t.FinishedDateTimeUTC,
          duyet_luc: t.ApprovedDateTimeUTC,
          so_phut: phut,
        },
      };
    });
  },
};

const to_khai_treo_chua_duyet: PhepDo = {
  ma: 'to_khai_treo_chua_duyet',
  ten: 'Tờ khai hoàn thành nhưng chưa được duyệt',
  mo_ta: 'Số giờ tờ khai ở trạng thái FINISH mà chưa chuyển sang APPROVED.',
  nhom: 'sla',
  nguon: ['kho'],
  don_vi: 'giờ',
  tham_so: [TS_NHIN_LAI],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(to_khai_treo_chua_duyet, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<DongToKhai>('kho',
      `select "Id", "Code", "ContainerId", "UserId", "CreatedUtcDate",
              "FinishedDateTimeUTC", "ApprovedDateTimeUTC",
              replace("TaxStatus", '"', '') as "TaxStatus",
              replace("SlaStatus", '"', '') as "SlaStatus"
         from "Tax"
        where "IsDeleted" = false
          and "FinishedDateTimeUTC" is not null
          and "ApprovedDateTimeUTC" is null
          and replace("TaxStatus", '"', '') <> 'REJECTED'
          and "CreatedUtcDate" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);

    return ds.map((t) => ({
      thuc_the: 'Tax',
      thuc_the_khoa: t.Id,
      gia_tri: gio_giua(t.FinishedDateTimeUTC as string, ctx.bay_gio),
      tieu_de: `Tờ khai ${t.Code} đã hoàn thành nhưng chưa duyệt`,
      bang_chung: {
        ma_to_khai: t.Code,
        container: t.ContainerId,
        hoan_thanh_luc: t.FinishedDateTimeUTC,
        trang_thai: t.TaxStatus,
      },
    }));
  },
};

export const PHEP_DO_SLA: readonly PhepDo[] = [
  pkl_chua_co_sau_n_gio,
  pkl_tao_muon,
  pkl_cho_nhap_kho_lau,
  nkct_lech_lon,
  to_khai_sla_cham,
  to_khai_gio_duyet,
  to_khai_treo_chua_duyet,
];
