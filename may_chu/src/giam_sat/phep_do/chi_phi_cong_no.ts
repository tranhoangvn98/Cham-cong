// Nhom chi phi va cong no: cuoc van chuyen, chi phi khong gan lo, cong no khach / nhan vien /
// nha cung cap.
//
// Schema `manage_debt` dung `IsDelete` (giong `sale`), khong phai `IsDeleted`.
import type { DongDo, NguCanh, PhepDo } from './kieu.ts';
import { ts_so } from './kieu.ts';
import { doi_chieu_va_chup, truong_da_doi } from '../anh_chup.ts';

const TS_NHIN_LAI = {
  ten: 'ngay_nhin_lai', nhan: 'Số ngày nhìn lại', kieu: 'so' as const, mac_dinh: 30,
};

// ---------------------------------------------------------------- don gia cuoc

const cuoc_don_gia_vuot: PhepDo = {
  ma: 'cuoc_don_gia_vuot',
  ten: 'Đơn giá cước vận chuyển vượt định mức',
  mo_ta: 'Tổng cước của một vận đơn chia cho số kiện, tính ra đơn giá mỗi kiện.',
  nhom: 'chi_phi_cong_no',
  nguon: ['hola'],
  don_vi: 'VND',
  tham_so: [TS_NHIN_LAI],
  async do(ctx: NguCanh, ts): Promise<DongDo[]> {
    const ngay = ts_so(cuoc_don_gia_vuot, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<{
      Id: number; MaVanDon: string | null; MaHeThongVanDon: string | null;
      MaKhachHang: string | null; TenCongTyVanChuyen: string | null;
      SoKien: number; tong_cuoc: string; fk_user_id: number; NgayBill: string;
      CuocVanChuyenNoiDia: string; CuocVanChuyenBuuCucKho: string;
      CuocXeNang: string; CuocCongNhan: string;
    }>('hola',
      // `SoKien > 0` loc o SQL chu khong chia roi bo: chia cho 0 la loi that, khong phai mot
      // dong du lieu can bao cao.
      `select "Id", "MaVanDon", "MaHeThongVanDon", "MaKhachHang", "TenCongTyVanChuyen",
              "SoKien", "fk_user_id", "NgayBill",
              "CuocVanChuyenNoiDia"::text, "CuocVanChuyenBuuCucKho"::text,
              "CuocXeNang"::text, "CuocCongNhan"::text,
              ("CuocVanChuyenNoiDia" + "CuocVanChuyenBuuCucKho"
               + "CuocXeNang" + "CuocCongNhan")::text as tong_cuoc
         from "Shipments"
        where "IsDeleted" = 0
          and "SoKien" > 0
          and "NgayBill" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);

    return ds.map((s) => {
      const tong = Number(s.tong_cuoc);
      const don_gia = Math.round(tong / s.SoKien);
      return {
        thuc_the: 'Shipments',
        thuc_the_khoa: String(s.Id),
        gia_tri: don_gia,
        tieu_de: `Vận đơn ${s.MaVanDon ?? s.MaHeThongVanDon ?? s.Id} có đơn giá `
          + `${don_gia.toLocaleString('vi-VN')} đ/kiện`,
        erp_user_id: s.fk_user_id,
        so_tien: tong,
        bang_chung: {
          ma_van_don: s.MaVanDon, ma_he_thong: s.MaHeThongVanDon,
          ma_khach: s.MaKhachHang, cong_ty_van_chuyen: s.TenCongTyVanChuyen,
          so_kien: s.SoKien, tong_cuoc: tong, don_gia_moi_kien: don_gia,
          chi_tiet_cuoc: {
            noi_dia: Number(s.CuocVanChuyenNoiDia),
            buu_cuc_kho: Number(s.CuocVanChuyenBuuCucKho),
            xe_nang: Number(s.CuocXeNang),
            cong_nhan: Number(s.CuocCongNhan),
          },
          ngay_bill: s.NgayBill,
        },
      };
    });
  },
};

// ---------------------------------------------------------------- cuoc sua len

/** Hai truong tien cua phieu nhap kho — dung cai nao khac la doi bang chung. */
const TRUONG_THEO_DOI_NKCT = ['TransportFee', 'DomesticFreight'] as const;

const cuoc_sua_len: PhepDo = {
  ma: 'cuoc_sua_len',
  ten: 'Cước phiếu nhập kho bị sửa sau khi lập',
  mo_ta: 'Mức chênh tuyệt đối của cước vận chuyển / cước nội địa giữa hai lần quét. '
    + 'erp_logistic cho sửa hai trường này không giới hạn khi phiếu chưa gắn phiếu xuất, '
    + 'và không lưu lại ai sửa.',
  nhom: 'chi_phi_cong_no',
  nguon: ['kho'],
  don_vi: 'VND',
  dung_anh_chup: true,
  tham_so: [{ ...TS_NHIN_LAI, mac_dinh: 90 }],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(cuoc_sua_len, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<{
      Id: string; RepositoryCheckCode: string | null; OrderCode: string | null;
      CustomerCode: string | null; TransportFee: number; DomesticFreight: number;
      UserId: string;
    }>('kho',
      `select "Id", "RepositoryCheckCode", "OrderCode", "CustomerCode",
              "TransportFee", "DomesticFreight", "UserId"
         from "RepositoryChecks"
        where "IsDeleted" = false
          and "CreatedUtcDate" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);
    if (ds.length === 0) return [];

    const so_sanh = await doi_chieu_va_chup('kho', 'RepositoryChecks',
      ds.map((r) => ({
        khoa: r.Id,
        du_lieu: Object.fromEntries(
          TRUONG_THEO_DOI_NKCT.map((c) => [c, r[c] ?? null]),
        ) as Record<string, unknown>,
      })));

    const theo_id = new Map(ds.map((r) => [r.Id, r]));
    const ra: DongDo[] = [];
    for (const s of so_sanh) {
      if (s.tinh_trang !== 'doi') continue;
      const truoc_tong = Number(s.truoc?.TransportFee ?? 0)
        + Number(s.truoc?.DomesticFreight ?? 0);
      const sau_tong = Number(s.sau.TransportFee ?? 0) + Number(s.sau.DomesticFreight ?? 0);
      const chenh = Math.abs(sau_tong - truoc_tong);
      const goc = theo_id.get(s.khoa);
      ra.push({
        thuc_the: 'RepositoryChecks',
        thuc_the_khoa: s.khoa,
        gia_tri: chenh,
        tieu_de: `Phiếu nhập kho ${goc?.RepositoryCheckCode ?? s.khoa} bị sửa cước `
          + `${chenh.toLocaleString('vi-VN')} đ`,
        so_tien: chenh,
        bang_chung: {
          ma_phieu: goc?.RepositoryCheckCode,
          ma_don_hang: goc?.OrderCode, ma_khach: goc?.CustomerCode,
          truong_da_doi: truong_da_doi(s.truoc, s.sau),
          truoc: s.truoc, sau: s.sau,
          tong_cuoc_truoc: truoc_tong, tong_cuoc_sau: sau_tong, muc_chenh: chenh,
          khoang_thoi_gian: { tu: s.chup_truoc_luc, den: ctx.bay_gio.toISOString() },
          ghi_chu: 'Không tra được AI sửa — erp_logistic không lưu thông tin đó.',
        },
      });
    }
    return ra;
  },
};

// ---------------------------------------------------------------- chi phi khong gan lo

const chi_phi_khong_gan_lo: PhepDo = {
  ma: 'chi_phi_khong_gan_lo',
  ten: 'Chi phí mua hàng không gắn lô và không gắn đơn',
  mo_ta: 'Số tiền của đơn mua hàng không gắn container lẫn đơn hàng — không phân bổ được '
    + 'vào giá vốn lô nào.',
  nhom: 'chi_phi_cong_no',
  nguon: ['sale'],
  don_vi: 'VND',
  tham_so: [{ ...TS_NHIN_LAI, mac_dinh: 90 }],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(chi_phi_khong_gan_lo, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<{
      Id: number; SysCode: string | null; Note: string | null; Total: string;
      Fk_provider_id: number | null; CreatedBy: number | null; CreatedUtcDate: string;
      Nhom_dich_vu: string | null;
    }>('sale',
      `select "Id", "SysCode", "Note", "Total"::text, "Fk_provider_id",
              "CreatedBy", "CreatedUtcDate", "Nhom_dich_vu"
         from sale."tbl_OrderM"
        where "IsDelete" = false
          and ("Fk_container_id" is null or "Fk_container_id" <= 0)
          and ("Fk_order_id" is null or "Fk_order_id" <= 0)
          and "Total" > 0
          and "CreatedUtcDate" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);

    return ds.map((o) => ({
      thuc_the: 'tbl_OrderM',
      thuc_the_khoa: String(o.Id),
      gia_tri: Number(o.Total),
      tieu_de: `Đơn mua hàng ${o.SysCode ?? o.Id} không gắn lô lẫn đơn hàng`,
      erp_user_id: o.CreatedBy ?? undefined,
      so_tien: Number(o.Total),
      bang_chung: {
        ma_don_mua: o.SysCode, ghi_chu: o.Note, nhom_dich_vu: o.Nhom_dich_vu,
        so_tien: Number(o.Total), ma_nha_cung_cap_erp: o.Fk_provider_id,
        tao_luc: o.CreatedUtcDate,
      },
    }));
  },
};

// ---------------------------------------------------------------- cong no khach

const cong_no_vuot_han_muc: PhepDo = {
  ma: 'cong_no_vuot_han_muc',
  ten: 'Công nợ khách vượt hạn mức tín dụng',
  mo_ta: 'Phần dư nợ vượt quá hạn mức tín dụng đã cấp cho khách.',
  nhom: 'chi_phi_cong_no',
  nguon: ['debt'],
  don_vi: 'VND',
  tham_so: [],
  async do(ctx): Promise<DongDo[]> {
    const ds = await ctx.doc<{
      Id: number; Code: string | null; Name: string | null; Phone: string | null;
      DebtAmount: string; CreditLimit: number; OwnerId: number; SaleCustomerId: number;
    }>('debt',
      // `CreditLimit > 0` la co y: han muc 0 nghia la CHUA CAP han muc, khong phai "han muc
      // bang khong". Bo dieu kien nay thi moi khach chua duoc cap han muc deu thanh canh bao.
      `select "Id", "Code", "Name", "Phone", "DebtAmount"::text,
              "CreditLimit", "OwnerId", "SaleCustomerId"
         from manage_debt."dbt_customer"
        where "IsDelete" = false
          and "CreditLimit" > 0
          and "DebtAmount" > "CreditLimit"`);

    return ds.map((k) => {
      const no = Number(k.DebtAmount);
      const vuot = no - k.CreditLimit;
      return {
        thuc_the: 'dbt_customer',
        thuc_the_khoa: String(k.Id),
        gia_tri: vuot,
        tieu_de: `Khách ${k.Code ?? k.Name ?? k.Id} nợ vượt hạn mức `
          + `${vuot.toLocaleString('vi-VN')} đ`,
        erp_user_id: k.OwnerId,
        so_tien: no,
        bang_chung: {
          ma_khach: k.Code, ten_khach: k.Name, dien_thoai: k.Phone,
          du_no: no, han_muc_tin_dung: k.CreditLimit, phan_vuot: vuot,
          nguoi_phu_trach_erp: k.OwnerId,
        },
      };
    });
  },
};

const cong_no_khong_phat_sinh_thu: PhepDo = {
  ma: 'cong_no_khong_phat_sinh_thu',
  ten: 'Khách nợ lớn không phát sinh thu',
  mo_ta: 'Số ngày kể từ lần cập nhật công nợ gần nhất của khách có dư nợ từ ngưỡng trở lên.',
  nhom: 'chi_phi_cong_no',
  nguon: ['debt'],
  don_vi: 'ngày',
  tham_so: [{
    ten: 'so_tien_toi_thieu', nhan: 'Dư nợ tối thiểu để xét (đ)', kieu: 'tien',
    mac_dinh: 50_000_000,
  }],
  async do(ctx, ts): Promise<DongDo[]> {
    const tien = ts_so(cong_no_khong_phat_sinh_thu, ts, 'so_tien_toi_thieu');
    const ds = await ctx.doc<{
      Id: number; Code: string | null; Name: string | null; DebtAmount: string;
      TotalReceipts: string; OwnerId: number; moc: string; so_ngay: string;
    }>('debt',
      `select "Id", "Code", "Name", "DebtAmount"::text, "TotalReceipts"::text, "OwnerId",
              coalesce("UpdatedDate", "CreatedUtcDate")::text as moc,
              (extract(epoch from (now() - coalesce("UpdatedDate", "CreatedUtcDate")))
                / 86400)::text                                as so_ngay
         from manage_debt."dbt_customer"
        where "IsDelete" = false
          and "DebtAmount" >= $1`,
      [tien]);

    return ds.map((k) => {
      const sn = Math.round(Number(k.so_ngay) * 10) / 10;
      return {
        thuc_the: 'dbt_customer',
        thuc_the_khoa: String(k.Id),
        gia_tri: sn,
        tieu_de: `Khách ${k.Code ?? k.Name ?? k.Id} nợ `
          + `${Number(k.DebtAmount).toLocaleString('vi-VN')} đ, ${sn} ngày không cập nhật`,
        erp_user_id: k.OwnerId,
        so_tien: Number(k.DebtAmount),
        bang_chung: {
          ma_khach: k.Code, ten_khach: k.Name, du_no: Number(k.DebtAmount),
          tong_da_thu: Number(k.TotalReceipts), cap_nhat_cuoi: k.moc,
          so_ngay_khong_cap_nhat: sn, nguoi_phu_trach_erp: k.OwnerId,
        },
      };
    });
  },
};

const cong_no_nhan_vien_cao: PhepDo = {
  ma: 'cong_no_nhan_vien_cao',
  ten: 'Công nợ nhân viên vượt ngưỡng',
  mo_ta: 'Dư nợ tạm ứng của một nhân viên.',
  nhom: 'chi_phi_cong_no',
  nguon: ['debt'],
  don_vi: 'VND',
  tham_so: [],
  async do(ctx): Promise<DongDo[]> {
    // Cot `EmployeeName` la kieu INT — do la id nhan vien ben ERP 1, khong phai ten.
    // Ten cot dat sai o ERP 1; giu nguyen khi doc, va noi ro trong bang chung de nguoi doc
    // khong tuong day la chuoi ten.
    const ds = await ctx.doc<{ Id: number; EmployeeName: number; DebtAmount: string }>('debt',
      `select "Id", "EmployeeName", "DebtAmount"::text
         from manage_debt."dbt_employees"
        where "IsDelete" = false and "DebtAmount" > 0`);

    return ds.map((n) => ({
      thuc_the: 'dbt_employees',
      thuc_the_khoa: String(n.Id),
      gia_tri: Number(n.DebtAmount),
      tieu_de: `Nhân viên ERP ${n.EmployeeName} còn dư nợ tạm ứng `
        + `${Number(n.DebtAmount).toLocaleString('vi-VN')} đ`,
      erp_user_id: n.EmployeeName,
      so_tien: Number(n.DebtAmount),
      bang_chung: {
        ma_nhan_vien_erp: n.EmployeeName,
        du_no: Number(n.DebtAmount),
        ghi_chu: 'Cột EmployeeName của ERP 1 là kiểu số — nó chứa id nhân viên, không phải tên.',
      },
    }));
  },
};

const ncc_no_am: PhepDo = {
  ma: 'ncc_no_am',
  ten: 'Đã trả thừa nhà cung cấp',
  mo_ta: 'Giá trị tuyệt đối của dư nợ âm — tiền công ty đang nằm ở nhà cung cấp.',
  nhom: 'chi_phi_cong_no',
  nguon: ['debt'],
  don_vi: 'VND',
  tham_so: [],
  async do(ctx): Promise<DongDo[]> {
    const ds = await ctx.doc<{
      Id: number; Code: string | null; ProviderName: string | null; ProviderId: number;
      CurrentDebt: string; TotalIncurred: string; TotalPaymented: string;
      GroupName: string | null;
    }>('debt',
      `select "Id", "Code", "ProviderName", "ProviderId", "CurrentDebt"::text,
              "TotalIncurred"::text, "TotalPaymented"::text, "GroupName"
         from manage_debt."dbt_provider_debts"
        where "IsDelete" = false and "CurrentDebt" < 0`);

    return ds.map((n) => {
      const am = Math.abs(Number(n.CurrentDebt));
      return {
        thuc_the: 'dbt_provider_debts',
        thuc_the_khoa: String(n.Id),
        gia_tri: am,
        tieu_de: `Đã trả thừa nhà cung cấp ${n.ProviderName ?? n.Code ?? n.Id} `
          + `${am.toLocaleString('vi-VN')} đ`,
        so_tien: am,
        bang_chung: {
          ma_nha_cung_cap: n.Code, ten: n.ProviderName, nhom: n.GroupName,
          du_no_hien_tai: Number(n.CurrentDebt),
          tong_phat_sinh: Number(n.TotalIncurred),
          tong_da_tra: Number(n.TotalPaymented),
          so_tra_thua: am,
        },
      };
    });
  },
};

export const PHEP_DO_CHI_PHI_CONG_NO: readonly PhepDo[] = [
  cuoc_don_gia_vuot,
  cuoc_sua_len,
  chi_phi_khong_gan_lo,
  cong_no_vuot_han_muc,
  cong_no_khong_phat_sinh_thu,
  cong_no_nhan_vien_cao,
  ncc_no_am,
];
