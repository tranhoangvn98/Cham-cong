// Nhom don hang bat thuong: sua sau khi chot, giam tru lon, trung don, sua len.
//
// LUU Y VE TEN COT XOA MEM: schema `sale` dung `IsDelete` (khong co chu 'd' cuoi), trong khi
// schema `usr`/`thu` cua Hola dung `IsDeleted` kieu `int`. Nham mot chu la cau SQL van chay
// nhung loc sai — kieu hong im lang. Moi cau duoi day da doi chieu voi
// `MyDbContextModelSnapshot.cs`.
import type { DongDo, NguCanh, PhepDo } from './kieu.ts';
import { ts_so } from './kieu.ts';
import { doi_chieu_va_chup, truong_da_doi } from '../anh_chup.ts';

const TS_NHIN_LAI = {
  ten: 'ngay_nhin_lai', nhan: 'Số ngày nhìn lại', kieu: 'so' as const, mac_dinh: 30,
};

/** ORDER_STATUS: DARFT=0, SOLD=1, PRIORITY=2, COLLECTED=3. */
const DON_DA_BAN = [1, 2, 3];

/** EDIT_ORDER_STATUS: NATIVE=0, WARTING_TO_APPROVE=1, APPROVE=2, REJECTED=3. */
const SUA_DON_DA_DUYET = 2;

interface DongLichSu {
  Id: number; Fk_order_Id: number; Action: string | null;
  ChangedByUserId: number; ChangedDate: string;
  OldDataJson: string | null; NewDataJson: string | null;
}

/**
 * Doc mot so tien tu chuoi JSON cua lich su don hang.
 *
 * `OldDataJson`/`NewDataJson` la chuoi do ung dung ERP 1 tu serialize — khong co gi bao dam
 * no luon la JSON hop le, va mot ban ghi hong KHONG duoc phep lam sap ca vong quet. Tra ve
 * `null` khi khong doc duoc, ben goi bo qua dong do.
 */
export function doc_tong_tien(json: string | null): number | null {
  if (json === null || json.trim() === '') return null;
  let doi_tuong: unknown;
  try {
    doi_tuong = JSON.parse(json);
  } catch {
    return null;
  }
  if (doi_tuong === null || typeof doi_tuong !== 'object') return null;
  // ERP 1 khong nhat quan hoa chu dau: gap ca `Total` lan `total`.
  const ho = doi_tuong as Record<string, unknown>;
  const v = ho.Total ?? ho.total;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------- sua sau khi chot

const don_sua_sau_chot: PhepDo = {
  ma: 'don_sua_sau_chot',
  ten: 'Đơn hàng bị sửa sau khi đã chuyển sang bán',
  mo_ta: 'Đếm số lần sửa đơn phát sinh sau ngày chuyển đổi sang bán hàng.',
  nhom: 'don_hang',
  nguon: ['sale'],
  don_vi: 'lần',
  tham_so: [TS_NHIN_LAI],
  async do(ctx: NguCanh, ts): Promise<DongDo[]> {
    const ngay = ts_so(don_sua_sau_chot, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<{
      Fk_order_Id: number; Ma_don_hang: string | null; Total: string;
      DateConvertToBh: string; so_lan: number; lan_cuoi: string; nguoi: number;
    }>('sale',
      `select h."Fk_order_Id",
              d."Ma_don_hang",
              d."Total",
              d."DateConvertToBh",
              count(*)::int          as so_lan,
              max(h."ChangedDate")   as lan_cuoi,
              max(h."ChangedByUserId") as nguoi
         from sale."tbl_OrderHistory" h
         join sale."tbl_DonHang" d on d."Id" = h."Fk_order_Id"
        where h."IsDelete" = false and d."IsDelete" = false
          and d."DateConvertToBh" is not null
          and h."ChangedDate" > d."DateConvertToBh"
          and h."ChangedDate" >= now() - ($1 || ' days')::interval
        group by h."Fk_order_Id", d."Ma_don_hang", d."Total", d."DateConvertToBh"`,
      [String(ngay)]);

    return ds.map((r) => ({
      thuc_the: 'tbl_DonHang',
      thuc_the_khoa: String(r.Fk_order_Id),
      gia_tri: r.so_lan,
      tieu_de: `Đơn ${r.Ma_don_hang ?? r.Fk_order_Id} bị sửa ${r.so_lan} lần sau khi chốt bán`,
      erp_user_id: r.nguoi,
      so_tien: Number(r.Total),
      bang_chung: {
        ma_don_hang: r.Ma_don_hang,
        chot_ban_luc: r.DateConvertToBh,
        so_lan_sua_sau_chot: r.so_lan,
        lan_sua_cuoi: r.lan_cuoi,
      },
    }));
  },
};

// ---------------------------------------------------------------- sua nhieu lan

const don_sua_nhieu_lan: PhepDo = {
  ma: 'don_sua_nhieu_lan',
  ten: 'Đơn hàng bị sửa nhiều lần',
  mo_ta: 'Đếm tổng số lần sửa một đơn trong khoảng thời gian, kể cả trước khi chốt.',
  nhom: 'don_hang',
  nguon: ['sale'],
  don_vi: 'lần',
  tham_so: [{ ten: 'so_ngay', nhan: 'Số ngày xét', kieu: 'so', mac_dinh: 30 }],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(don_sua_nhieu_lan, ts, 'so_ngay');
    const ds = await ctx.doc<{
      Fk_order_Id: number; Ma_don_hang: string | null; Total: string;
      so_lan: number; lan_cuoi: string; nguoi: number;
    }>('sale',
      `select h."Fk_order_Id", d."Ma_don_hang", d."Total",
              count(*)::int as so_lan, max(h."ChangedDate") as lan_cuoi,
              max(h."ChangedByUserId") as nguoi
         from sale."tbl_OrderHistory" h
         join sale."tbl_DonHang" d on d."Id" = h."Fk_order_Id"
        where h."IsDelete" = false and d."IsDelete" = false
          and h."ChangedDate" >= now() - ($1 || ' days')::interval
        group by h."Fk_order_Id", d."Ma_don_hang", d."Total"`,
      [String(ngay)]);

    return ds.map((r) => ({
      thuc_the: 'tbl_DonHang',
      thuc_the_khoa: String(r.Fk_order_Id),
      gia_tri: r.so_lan,
      tieu_de: `Đơn ${r.Ma_don_hang ?? r.Fk_order_Id} bị sửa ${r.so_lan} lần`,
      erp_user_id: r.nguoi,
      so_tien: Number(r.Total),
      bang_chung: {
        ma_don_hang: r.Ma_don_hang, so_lan_sua: r.so_lan, lan_sua_cuoi: r.lan_cuoi,
      },
    }));
  },
};

// ---------------------------------------------------------------- sua giam tien

const don_sua_giam_tien: PhepDo = {
  ma: 'don_sua_giam_tien',
  ten: 'Đơn hàng bị sửa giảm giá trị',
  mo_ta: 'Mức giảm tổng tiền (VND) giữa dữ liệu trước và sau một lần sửa.',
  nhom: 'don_hang',
  nguon: ['sale'],
  don_vi: 'VND',
  tham_so: [TS_NHIN_LAI],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(don_sua_giam_tien, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<DongLichSu & { Ma_don_hang: string | null }>('sale',
      `select h."Id", h."Fk_order_Id", h."Action", h."ChangedByUserId", h."ChangedDate",
              h."OldDataJson", h."NewDataJson", d."Ma_don_hang"
         from sale."tbl_OrderHistory" h
         join sale."tbl_DonHang" d on d."Id" = h."Fk_order_Id"
        where h."IsDelete" = false and d."IsDelete" = false
          and h."OldDataJson" is not null and h."NewDataJson" is not null
          and h."ChangedDate" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);

    const ra: DongDo[] = [];
    for (const h of ds) {
      const truoc = doc_tong_tien(h.OldDataJson);
      const sau = doc_tong_tien(h.NewDataJson);
      if (truoc === null || sau === null) continue; // JSON hong -> bo qua, khong nem loi
      const giam = truoc - sau;
      if (giam <= 0) continue;
      ra.push({
        thuc_the: 'tbl_OrderHistory',
        thuc_the_khoa: String(h.Id),
        gia_tri: giam,
        tieu_de: `Đơn ${h.Ma_don_hang ?? h.Fk_order_Id} bị sửa giảm ${giam.toLocaleString('vi-VN')} đ`,
        erp_user_id: h.ChangedByUserId,
        so_tien: giam,
        bang_chung: {
          ma_don_hang: h.Ma_don_hang,
          tong_tien_truoc: truoc,
          tong_tien_sau: sau,
          muc_giam: giam,
          sua_luc: h.ChangedDate,
          hanh_dong: h.Action,
        },
      });
    }
    return ra;
  },
};

// ---------------------------------------------------------------- sua khong qua duyet

const don_sua_khong_qua_duyet: PhepDo = {
  ma: 'don_sua_khong_qua_duyet',
  ten: 'Đơn ở trạng thái đã duyệt sửa nhưng không có yêu cầu sửa',
  mo_ta: 'Đơn có EditOrderStatus = APPROVE mà không tìm thấy yêu cầu sửa nào đã duyệt.',
  nhom: 'don_hang',
  nguon: ['sale'],
  don_vi: 'lần',
  tham_so: [{ ...TS_NHIN_LAI, mac_dinh: 90 }],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(don_sua_khong_qua_duyet, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<{
      Id: number; Ma_don_hang: string | null; Total: string;
      Fk_nhanvien_id: number; CreatedUtcDate: string;
    }>('sale',
      `select d."Id", d."Ma_don_hang", d."Total", d."Fk_nhanvien_id", d."CreatedUtcDate"
         from sale."tbl_DonHang" d
        where d."IsDelete" = false
          and d."EditOrderStatus" = $1
          and d."CreatedUtcDate" >= now() - ($2 || ' days')::interval
          and not exists (
            select 1 from sale."tbl_DonHangEditRequest" r
             where r."Fk_order_Id" = d."Id" and r."IsDelete" = false
          )`,
      [SUA_DON_DA_DUYET, String(ngay)]);

    return ds.map((d) => ({
      thuc_the: 'tbl_DonHang',
      thuc_the_khoa: String(d.Id),
      gia_tri: 1,
      tieu_de: `Đơn ${d.Ma_don_hang ?? d.Id} ở trạng thái đã duyệt sửa nhưng không có yêu cầu sửa`,
      erp_user_id: d.Fk_nhanvien_id,
      so_tien: Number(d.Total),
      bang_chung: {
        ma_don_hang: d.Ma_don_hang,
        trang_thai_sua_don: 'APPROVE',
        tao_luc: d.CreatedUtcDate,
      },
    }));
  },
};

// ---------------------------------------------------------------- giam tru ty le cao

const don_giam_tru_ty_le_cao: PhepDo = {
  ma: 'don_giam_tru_ty_le_cao',
  ten: 'Giảm trừ đơn hàng chiếm tỷ lệ cao',
  mo_ta: 'Tỷ lệ phần trăm giữa tổng giảm trừ đã duyệt và tổng tiền đơn.',
  nhom: 'don_hang',
  nguon: ['sale'],
  don_vi: '%',
  tham_so: [{ ...TS_NHIN_LAI, mac_dinh: 90 }],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(don_giam_tru_ty_le_cao, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<{
      Fk_order_id: number; MaDonHang: string | null; tong_giam_tru: string;
      Total: string; nguoi: number;
    }>('sale',
      // `Total` = 0 bi loai o day chu khong chia roi loc: chia cho 0 trong SQL ra NULL hoac
      // loi tuy kieu, va mot don tong bang 0 da co phep do rieng bat.
      `select g."Fk_order_id", max(g."MaDonHang") as "MaDonHang",
              sum(g."Amount")::text as tong_giam_tru,
              max(d."Total")::text  as "Total",
              max(g."CreatedBy")    as nguoi
         from sale."tbl_GiamTruDonHang" g
         join sale."tbl_DonHang" d on d."Id" = g."Fk_order_id"
        where g."IsDelete" = false and d."IsDelete" = false
          and d."Total" > 0
          and g."CreatedUtcDate" >= now() - ($1 || ' days')::interval
        group by g."Fk_order_id"`,
      [String(ngay)]);

    return ds.map((r) => {
      const tong = Number(r.Total);
      const giam = Number(r.tong_giam_tru);
      const ty_le = Math.round((giam / tong) * 1000) / 10;
      return {
        thuc_the: 'tbl_DonHang',
        thuc_the_khoa: String(r.Fk_order_id),
        gia_tri: ty_le,
        tieu_de: `Đơn ${r.MaDonHang ?? r.Fk_order_id} có giảm trừ ${ty_le}% tổng giá trị`,
        erp_user_id: r.nguoi,
        so_tien: giam,
        bang_chung: {
          ma_don_hang: r.MaDonHang, tong_tien_don: tong,
          tong_giam_tru: giam, ty_le_phan_tram: ty_le,
        },
      };
    });
  },
};

// ---------------------------------------------------------------- tong bang khong

const don_tong_bang_khong: PhepDo = {
  ma: 'don_tong_bang_khong',
  ten: 'Đơn đã bán nhưng tổng tiền bằng không',
  mo_ta: 'Đơn ở trạng thái đã bán mà tổng tiền bằng 0.',
  nhom: 'don_hang',
  nguon: ['sale'],
  don_vi: 'lần',
  tham_so: [TS_NHIN_LAI],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(don_tong_bang_khong, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<{
      Id: number; Ma_don_hang: string | null; Fk_nhanvien_id: number;
      CreatedUtcDate: string; MissaStatus: number;
    }>('sale',
      `select "Id", "Ma_don_hang", "Fk_nhanvien_id", "CreatedUtcDate", "MissaStatus"
         from sale."tbl_DonHang"
        where "IsDelete" = false
          and "Total" = 0
          and "MissaStatus" = any($1::int[])
          and "CreatedUtcDate" >= now() - ($2 || ' days')::interval`,
      [DON_DA_BAN, String(ngay)]);

    return ds.map((d) => ({
      thuc_the: 'tbl_DonHang',
      thuc_the_khoa: String(d.Id),
      gia_tri: 1,
      tieu_de: `Đơn ${d.Ma_don_hang ?? d.Id} đã bán nhưng tổng tiền bằng 0`,
      erp_user_id: d.Fk_nhanvien_id,
      so_tien: 0,
      bang_chung: {
        ma_don_hang: d.Ma_don_hang, trang_thai: d.MissaStatus, tao_luc: d.CreatedUtcDate,
      },
    }));
  },
};

// ---------------------------------------------------------------- trung khach/ngay/tien

const don_trung_khach_ngay_tien: PhepDo = {
  ma: 'don_trung_khach_ngay_tien',
  ten: 'Đơn hàng trùng khách, trùng ngày, trùng số tiền',
  mo_ta: 'Đếm số đơn cùng khách, cùng ngày tạo và cùng tổng tiền.',
  nhom: 'don_hang',
  nguon: ['sale'],
  don_vi: 'lần',
  tham_so: [TS_NHIN_LAI],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(don_trung_khach_ngay_tien, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<{
      khach: number; ngay: string; tong: string; so_don: number;
      don_moi_nhat: number; ma_don: string | null; nguoi: number; cac_don: string;
    }>('sale',
      `select "Fk_khach_hang_id"                       as khach,
              date("CreatedUtcDate")::text             as ngay,
              "Total"::text                            as tong,
              count(*)::int                            as so_don,
              max("Id")                                as don_moi_nhat,
              max("Ma_don_hang")                       as ma_don,
              max("Fk_nhanvien_id")                    as nguoi,
              string_agg("Id"::text, ',' order by "Id") as cac_don
         from sale."tbl_DonHang"
        where "IsDelete" = false
          and "Fk_khach_hang_id" is not null
          and "Total" > 0
          and "CreatedUtcDate" >= now() - ($1 || ' days')::interval
        group by "Fk_khach_hang_id", date("CreatedUtcDate"), "Total"
       having count(*) > 1`,
      [String(ngay)]);

    return ds.map((r) => ({
      thuc_the: 'tbl_DonHang',
      thuc_the_khoa: String(r.don_moi_nhat),
      gia_tri: r.so_don,
      tieu_de: `${r.so_don} đơn cùng khách, cùng ngày ${r.ngay}, cùng số tiền`,
      erp_user_id: r.nguoi,
      so_tien: Number(r.tong),
      bang_chung: {
        ma_khach_erp: r.khach, ngay_tao: r.ngay, tong_tien: Number(r.tong),
        so_don_trung: r.so_don, cac_don_hang: r.cac_don.split(','),
      },
    }));
  },
};

// ---------------------------------------------------------------- sua len (van tay)

/**
 * Truong theo doi cua don hang. CHI cac truong co y nghia nghiep vu — them `UpdatedDate` vao
 * day la bao dong moi lan ERP 1 cham vao ban ghi, khong con phan biet duoc sua tien voi sua
 * ghi chu.
 */
const TRUONG_THEO_DOI_DON = ['Total', 'MissaStatus', 'PAYMENT_STATUS', 'Fk_khach_hang_id',
  'Fk_lohang_id', 'SaleCode', 'DateConvertToBh'] as const;

const don_sua_len: PhepDo = {
  ma: 'don_sua_len',
  ten: 'Đơn hàng đổi dữ liệu mà không có bản ghi lịch sử',
  mo_ta: 'So vân tay các trường trọng yếu với lần quét trước. Đổi mà không có dòng lịch sử '
    + 'tương ứng là dấu hiệu sửa thẳng vào cơ sở dữ liệu, vòng qua ứng dụng.',
  nhom: 'don_hang',
  nguon: ['sale'],
  don_vi: 'lần',
  dung_anh_chup: true,
  tham_so: [TS_NHIN_LAI],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(don_sua_len, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<Record<string, unknown>>('sale',
      `select "Id", "Ma_don_hang", "Total", "MissaStatus", "PAYMENT_STATUS",
              "Fk_khach_hang_id", "Fk_lohang_id", "SaleCode", "DateConvertToBh",
              "Fk_nhanvien_id"
         from sale."tbl_DonHang"
        where "IsDelete" = false
          and "CreatedUtcDate" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);
    if (ds.length === 0) return [];

    const ban_ghi = ds.map((d) => ({
      khoa: String(d.Id),
      du_lieu: Object.fromEntries(
        TRUONG_THEO_DOI_DON.map((c) => [c, d[c] ?? null]),
      ) as Record<string, unknown>,
    }));
    const so_sanh = await doi_chieu_va_chup('sale', 'tbl_DonHang', ban_ghi);
    const doi = so_sanh.filter((s) => s.tinh_trang === 'doi');
    if (doi.length === 0) return [];

    // Chi bao khi KHONG co dong lich su nao trong khoang giua hai lan chup. Co dong lich su
    // = sua qua ung dung, dung quy trinh — do khong phai viec cua phep do nay.
    const khoa_doi = doi.map((d) => Number(d.khoa));
    const co_lich_su = await ctx.doc<{ Fk_order_Id: number; lan_cuoi: string }>('sale',
      `select "Fk_order_Id", max("ChangedDate") as lan_cuoi
         from sale."tbl_OrderHistory"
        where "IsDelete" = false and "Fk_order_Id" = any($1::int[])
        group by "Fk_order_Id"`,
      [khoa_doi]);
    const ban_do_ls = new Map(co_lich_su.map((h) => [String(h.Fk_order_Id), h.lan_cuoi]));

    const theo_id = new Map(ds.map((d) => [String(d.Id), d]));
    const ra: DongDo[] = [];
    for (const d of doi) {
      const ls_cuoi = ban_do_ls.get(d.khoa);
      if (ls_cuoi !== undefined && d.chup_truoc_luc !== null
        && new Date(ls_cuoi) >= new Date(d.chup_truoc_luc)) continue;

      const goc = theo_id.get(d.khoa);
      ra.push({
        thuc_the: 'tbl_DonHang',
        thuc_the_khoa: d.khoa,
        gia_tri: 1,
        tieu_de: `Đơn ${goc?.Ma_don_hang ?? d.khoa} đổi dữ liệu mà không có bản ghi lịch sử`,
        erp_user_id: goc?.Fk_nhanvien_id as number | undefined,
        so_tien: Number(d.sau.Total ?? 0),
        bang_chung: {
          ma_don_hang: goc?.Ma_don_hang,
          truong_da_doi: truong_da_doi(d.truoc, d.sau),
          truoc: d.truoc,
          sau: d.sau,
          khoang_thoi_gian: { tu: d.chup_truoc_luc, den: ctx.bay_gio.toISOString() },
          ghi_chu: 'Không tra được AI sửa — ERP 1 không lưu thông tin đó.',
        },
      });
    }
    return ra;
  },
};

export const PHEP_DO_DON_HANG: readonly PhepDo[] = [
  don_sua_sau_chot,
  don_sua_nhieu_lan,
  don_sua_giam_tien,
  don_sua_khong_qua_duyet,
  don_giam_tru_ty_le_cao,
  don_tong_bang_khong,
  don_trung_khach_ngay_tien,
  don_sua_len,
];
