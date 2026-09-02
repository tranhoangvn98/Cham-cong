// Nhom giao dich bat thuong: chung tu chi/thu va doi chieu ngan hang.
//
// TEN COT XOA MEM o schema Hola KHONG giong schema `sale`:
//   usr.tbl_DX_chi        -> "IsDeleted" kieu INT  (0/1)
//   thu.tbl_dx_thu        -> "IsDeleted" kieu INT  (0/1)
//   transaction.tbl_bank_transaction -> "IsDeleted" kieu BOOLEAN
//   Shipments             -> "IsDeleted" kieu INT  (0/1)
// Dung nham kieu thi Postgres bao loi ngay (tot), dung nham TEN thi cau van chay va loc sai
// (te). Moi cau duoi day da doi chieu voi EFContextModelSnapshot.cs.
import type { DongDo, NguCanh, PhepDo } from './kieu.ts';
import { ts_so } from './kieu.ts';
import { gio_dia_phuong, ngay_dia_phuong } from '../../tien_ich/thoi_gian.ts';

const TS_NHIN_LAI = {
  ten: 'ngay_nhin_lai', nhan: 'Số ngày nhìn lại', kieu: 'so' as const, mac_dinh: 30,
};
const TS_TIEN = {
  ten: 'so_tien_toi_thieu', nhan: 'Số tiền tối thiểu để xét (đ)', kieu: 'tien' as const,
  mac_dinh: 20_000_000,
  goi_y: 'Dưới mức này thì bỏ qua, để cảnh báo tập trung vào khoản đáng soi.',
};

/** TrangThaiDXChi: NEW=1, DANG_DUYET=2, TU_CHOI=3, DA_DUYET=4, DA_THANH_TOAN=5, SYSTEM_AUTO=6. */
const CHI_DA_DUYET = 4;
const CHI_DA_THANH_TOAN = 5;

// ---------------------------------------------------------------- tu de xuat tu duyet

const chi_tu_de_xuat_tu_duyet: PhepDo = {
  ma: 'chi_tu_de_xuat_tu_duyet',
  ten: 'Người đề xuất chi trùng người duyệt chi',
  mo_ta: 'Đề xuất chi có người tạo trùng với người duyệt ở một bước duyệt bất kỳ. '
    + 'Đây là mất tách biệt nhiệm vụ — một người tự quyết trọn một khoản chi.',
  nhom: 'giao_dich',
  nguon: ['hola'],
  don_vi: 'lần',
  tham_so: [{ ...TS_NHIN_LAI, mac_dinh: 90 }],
  async do(ctx: NguCanh, ts): Promise<DongDo[]> {
    const ngay = ts_so(chi_tu_de_xuat_tu_duyet, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<{
      Id: number; sysCode: string | null; Noi_dung_chi: string | null;
      So_tien_chi: string; FK_User_id: number; ApproveId: number;
      ApproveName: string | null; Appreved_At: string; CreatedDate: string;
      Trang_Thai: number;
    }>('hola',
      `select c."Id", c."sysCode", c."Noi_dung_chi", c."So_tien_chi"::text,
              c."FK_User_id", c."Trang_Thai", c."CreatedDate",
              s."ApproveId", s."ApproveName", s."Appreved_At"
         from usr."tbl_DX_chi" c
         join logs."tbl_dxChiStepLog" s on s."FK_DxChi_id" = c."Id"
        where c."IsDeleted" = 0
          and s."ApproveId" = c."FK_User_id"
          and s."ApproveId" <> 0
          and c."CreatedDate" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);

    return ds.map((c) => ({
      thuc_the: 'tbl_DX_chi',
      thuc_the_khoa: String(c.Id),
      gia_tri: 1,
      tieu_de: `Đề xuất chi ${c.sysCode ?? c.Id} do chính người đề xuất duyệt`,
      erp_user_id: c.FK_User_id,
      so_tien: Number(c.So_tien_chi),
      bang_chung: {
        ma_chung_tu: c.sysCode,
        noi_dung: c.Noi_dung_chi,
        so_tien: Number(c.So_tien_chi),
        nguoi_de_xuat_erp: c.FK_User_id,
        nguoi_duyet_erp: c.ApproveId,
        ten_nguoi_duyet: c.ApproveName,
        duyet_luc: c.Appreved_At,
        tao_luc: c.CreatedDate,
      },
    }));
  },
};

// ---------------------------------------------------------------- duyet sieu toc

const chi_duyet_sieu_toc: PhepDo = {
  ma: 'chi_duyet_sieu_toc',
  ten: 'Chi số tiền lớn được duyệt gần như tức thì',
  mo_ta: 'Số phút từ lúc tạo đề xuất đến lúc duyệt, với khoản từ ngưỡng tiền trở lên. '
    + 'Duyệt nhanh hơn thời gian đủ để đọc chứng từ nghĩa là không ai thực sự kiểm.',
  nhom: 'giao_dich',
  nguon: ['hola'],
  don_vi: 'phút',
  tham_so: [TS_NHIN_LAI, TS_TIEN],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(chi_duyet_sieu_toc, ts, 'ngay_nhin_lai');
    const tien = ts_so(chi_duyet_sieu_toc, ts, 'so_tien_toi_thieu');
    const ds = await ctx.doc<{
      Id: number; sysCode: string | null; Noi_dung_chi: string | null;
      So_tien_chi: string; FK_User_id: number; CreatedDate: string;
      duyet_dau_tien: string; ApproveId: number; so_phut: string;
    }>('hola',
      `select c."Id", c."sysCode", c."Noi_dung_chi", c."So_tien_chi"::text,
              c."FK_User_id", c."CreatedDate",
              min(s."Appreved_At")                                   as duyet_dau_tien,
              min(s."ApproveId")                                     as "ApproveId",
              (extract(epoch from (min(s."Appreved_At") - c."CreatedDate")) / 60)::text
                                                                     as so_phut
         from usr."tbl_DX_chi" c
         join logs."tbl_dxChiStepLog" s on s."FK_DxChi_id" = c."Id"
        where c."IsDeleted" = 0
          and c."So_tien_chi" >= $1
          and s."Appreved_At" > c."CreatedDate"
          and c."CreatedDate" >= now() - ($2 || ' days')::interval
        group by c."Id", c."sysCode", c."Noi_dung_chi", c."So_tien_chi",
                 c."FK_User_id", c."CreatedDate"`,
      [tien, String(ngay)]);

    return ds.map((c) => {
      const phut = Math.round(Number(c.so_phut) * 10) / 10;
      return {
        thuc_the: 'tbl_DX_chi',
        thuc_the_khoa: String(c.Id),
        gia_tri: phut,
        tieu_de: `Đề xuất chi ${c.sysCode ?? c.Id} được duyệt sau ${phut} phút`,
        erp_user_id: c.ApproveId,
        so_tien: Number(c.So_tien_chi),
        bang_chung: {
          ma_chung_tu: c.sysCode, noi_dung: c.Noi_dung_chi,
          so_tien: Number(c.So_tien_chi), tao_luc: c.CreatedDate,
          duyet_luc: c.duyet_dau_tien, so_phut_den_khi_duyet: phut,
          nguoi_duyet_erp: c.ApproveId,
        },
      };
    });
  },
};

// ---------------------------------------------------------------- duyet ngoai gio

const chi_duyet_ngoai_gio: PhepDo = {
  ma: 'chi_duyet_ngoai_gio',
  ten: 'Chi được duyệt ngoài giờ làm việc',
  mo_ta: 'Thời điểm duyệt nằm ngoài khung giờ hành chính. Giờ tính theo múi giờ nơi đặt máy '
    + 'chấm công, không theo múi giờ máy chủ.',
  nhom: 'giao_dich',
  nguon: ['hola'],
  don_vi: 'lần',
  tham_so: [
    TS_NHIN_LAI,
    { ten: 'gio_bat_dau', nhan: 'Giờ bắt đầu làm việc', kieu: 'gio', mac_dinh: 8 },
    { ten: 'gio_ket_thuc', nhan: 'Giờ kết thúc làm việc', kieu: 'gio', mac_dinh: 18 },
  ],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(chi_duyet_ngoai_gio, ts, 'ngay_nhin_lai');
    const tu = ts_so(chi_duyet_ngoai_gio, ts, 'gio_bat_dau');
    const den = ts_so(chi_duyet_ngoai_gio, ts, 'gio_ket_thuc');

    const ds = await ctx.doc<{
      Id: number; sysCode: string | null; So_tien_chi: string;
      Noi_dung_chi: string | null; ApproveId: number; ApproveName: string | null;
      Appreved_At: string;
    }>('hola',
      `select c."Id", c."sysCode", c."So_tien_chi"::text, c."Noi_dung_chi",
              s."ApproveId", s."ApproveName", s."Appreved_At"
         from usr."tbl_DX_chi" c
         join logs."tbl_dxChiStepLog" s on s."FK_DxChi_id" = c."Id"
        where c."IsDeleted" = 0
          and s."Appreved_At" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);

    const ra: DongDo[] = [];
    for (const c of ds) {
      // Loc gio o Node chu khong o SQL: `extract(hour ...)` cua Postgres dung mui gio cua
      // PHIEN KET NOI, tuc mui gio may chu ERP 1 — khong phai mui gio noi dat may cham cong.
      // Day dung la cai bay da tung lam bang cong hien 01:00 thay vi 08:00 (xem CLAUDE.md).
      const d = new Date(c.Appreved_At);
      const gio = Number(gio_dia_phuong(d).slice(0, 2));
      if (gio >= tu && gio < den) continue;
      ra.push({
        thuc_the: 'tbl_DX_chi',
        thuc_the_khoa: String(c.Id),
        gia_tri: 1,
        tieu_de: `Đề xuất chi ${c.sysCode ?? c.Id} được duyệt lúc ${gio_dia_phuong(d)}`,
        erp_user_id: c.ApproveId,
        so_tien: Number(c.So_tien_chi),
        bang_chung: {
          ma_chung_tu: c.sysCode, noi_dung: c.Noi_dung_chi,
          so_tien: Number(c.So_tien_chi),
          duyet_luc: c.Appreved_At,
          gio_theo_mui_gio_thiet_bi: gio_dia_phuong(d),
          ngay_theo_mui_gio_thiet_bi: ngay_dia_phuong(d),
          khung_gio_hanh_chinh: `${tu}:00–${den}:00`,
          nguoi_duyet_erp: c.ApproveId, ten_nguoi_duyet: c.ApproveName,
        },
      });
    }
    return ra;
  },
};

// ---------------------------------------------------------------- khong chung tu

const chi_khong_chung_tu: PhepDo = {
  ma: 'chi_khong_chung_tu',
  ten: 'Chi số tiền lớn không đính kèm chứng từ',
  mo_ta: 'Số tiền của đề xuất chi không có ảnh chứng từ nào trong usr.tbl_Image.',
  nhom: 'giao_dich',
  nguon: ['hola'],
  don_vi: 'VND',
  tham_so: [TS_NHIN_LAI],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(chi_khong_chung_tu, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<{
      Id: number; sysCode: string | null; Noi_dung_chi: string | null;
      So_tien_chi: string; FK_User_id: number; CreatedDate: string; Trang_Thai: number;
    }>('hola',
      // Anh chung tu nam o bang rieng `usr.tbl_Image` noi bang `FK_dxchi_id`, KHONG phai mot
      // cot tren `tbl_DX_chi`.
      `select c."Id", c."sysCode", c."Noi_dung_chi", c."So_tien_chi"::text,
              c."FK_User_id", c."CreatedDate", c."Trang_Thai"
         from usr."tbl_DX_chi" c
        where c."IsDeleted" = 0
          and c."Trang_Thai" = any($1::int[])
          and c."CreatedDate" >= now() - ($2 || ' days')::interval
          and not exists (
            select 1 from usr."tbl_Image" i where i."FK_dxchi_id" = c."Id"
          )`,
      [[CHI_DA_DUYET, CHI_DA_THANH_TOAN], String(ngay)]);

    return ds.map((c) => ({
      thuc_the: 'tbl_DX_chi',
      thuc_the_khoa: String(c.Id),
      gia_tri: Number(c.So_tien_chi),
      tieu_de: `Đề xuất chi ${c.sysCode ?? c.Id} không có chứng từ đính kèm`,
      erp_user_id: c.FK_User_id,
      so_tien: Number(c.So_tien_chi),
      bang_chung: {
        ma_chung_tu: c.sysCode, noi_dung: c.Noi_dung_chi,
        so_tien: Number(c.So_tien_chi), trang_thai: c.Trang_Thai, tao_luc: c.CreatedDate,
      },
    }));
  },
};

// ---------------------------------------------------------------- trung tien NCC

const chi_trung_tien_ncc: PhepDo = {
  ma: 'chi_trung_tien_ncc',
  ten: 'Chi trùng số tiền cho cùng nhà cung cấp',
  mo_ta: 'Đếm số đề xuất chi cùng mã nhà cung cấp và cùng số tiền trong khoảng thời gian ngắn.',
  nhom: 'giao_dich',
  nguon: ['hola'],
  don_vi: 'lần',
  tham_so: [{ ten: 'so_ngay', nhan: 'Số ngày xét trùng', kieu: 'so', mac_dinh: 7 }],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(chi_trung_tien_ncc, ts, 'so_ngay');
    const ds = await ctx.doc<{
      ProviderCode: string; So_tien_chi: string; so_ct: number;
      moi_nhat: number; ma_moi: string | null; nguoi: number; cac_ct: string;
    }>('hola',
      `select "ProviderCode", "So_tien_chi"::text, count(*)::int as so_ct,
              max("Id")                                    as moi_nhat,
              max("sysCode")                               as ma_moi,
              max("FK_User_id")                            as nguoi,
              string_agg("sysCode", ', ' order by "Id")    as cac_ct
         from usr."tbl_DX_chi"
        where "IsDeleted" = 0
          and "ProviderCode" is not null and "ProviderCode" <> ''
          and "So_tien_chi" > 0
          and "CreatedDate" >= now() - ($1 || ' days')::interval
        group by "ProviderCode", "So_tien_chi"
       having count(*) > 1`,
      [String(ngay)]);

    return ds.map((r) => ({
      thuc_the: 'tbl_DX_chi',
      thuc_the_khoa: String(r.moi_nhat),
      gia_tri: r.so_ct,
      tieu_de: `${r.so_ct} đề xuất chi cùng nhà cung cấp ${r.ProviderCode}, cùng số tiền`,
      erp_user_id: r.nguoi,
      so_tien: Number(r.So_tien_chi),
      bang_chung: {
        ma_nha_cung_cap: r.ProviderCode, so_tien: Number(r.So_tien_chi),
        so_chung_tu_trung: r.so_ct, cac_chung_tu: r.cac_ct,
      },
    }));
  },
};

// ---------------------------------------------------------------- lech sao ke

const chi_lech_sao_ke: PhepDo = {
  ma: 'chi_lech_sao_ke',
  ten: 'Chi báo đã thanh toán nhưng chưa khớp sao kê',
  mo_ta: 'Số ngày kể từ khi đề xuất chi chuyển sang đã thanh toán mà cờ đối chiếu ngân hàng '
    + 'vẫn chưa khớp.',
  nhom: 'giao_dich',
  nguon: ['hola'],
  don_vi: 'ngày',
  tham_so: [{ ...TS_NHIN_LAI, mac_dinh: 90 }],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(chi_lech_sao_ke, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<{
      Id: number; sysCode: string | null; So_tien_chi: string; FK_User_id: number;
      LastUpdateTime: string; IsBankOK: boolean; IsCassoOK: boolean; so_ngay: string;
    }>('hola',
      `select "Id", "sysCode", "So_tien_chi"::text, "FK_User_id", "LastUpdateTime",
              "IsBankOK", "IsCassoOK",
              (extract(epoch from (now() - "LastUpdateTime")) / 86400)::text as so_ngay
         from usr."tbl_DX_chi"
        where "IsDeleted" = 0
          and "Trang_Thai" = $1
          and ("IsBankOK" = false or "IsCassoOK" = false)
          and "LastUpdateTime" >= now() - ($2 || ' days')::interval`,
      [CHI_DA_THANH_TOAN, String(ngay)]);

    return ds.map((c) => {
      const sn = Math.round(Number(c.so_ngay) * 10) / 10;
      return {
        thuc_the: 'tbl_DX_chi',
        thuc_the_khoa: String(c.Id),
        gia_tri: sn,
        tieu_de: `Đề xuất chi ${c.sysCode ?? c.Id} đã thanh toán ${sn} ngày nhưng chưa khớp sao kê`,
        erp_user_id: c.FK_User_id,
        so_tien: Number(c.So_tien_chi),
        bang_chung: {
          ma_chung_tu: c.sysCode, so_tien: Number(c.So_tien_chi),
          khop_ngan_hang: c.IsBankOK, khop_casso: c.IsCassoOK,
          cap_nhat_cuoi: c.LastUpdateTime, so_ngay_treo: sn,
        },
      };
    });
  },
};

// ---------------------------------------------------------------- thu lech ton lau

const thu_lech_ton_lau: PhepDo = {
  ma: 'thu_lech_ton_lau',
  ten: 'Phiếu thu có chênh lệch tồn quá lâu',
  mo_ta: 'Số ngày phiếu thu được đánh dấu có chênh lệch mà chưa xử lý.',
  nhom: 'giao_dich',
  nguon: ['hola'],
  don_vi: 'ngày',
  tham_so: [{ ...TS_NHIN_LAI, mac_dinh: 90 }],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(thu_lech_ton_lau, ts, 'ngay_nhin_lai');
    const ds = await ctx.doc<{
      Id: number; sysCode: string | null; So_Tien: string; Fk_User_Id: number;
      Ma_Khach_Hang: string | null; Noi_Dung_Thu: string | null;
      CreatedDate: string; so_ngay: string;
    }>('hola',
      `select "Id", "sysCode", "So_Tien"::text, "Fk_User_Id", "Ma_Khach_Hang",
              "Noi_Dung_Thu", "CreatedDate",
              (extract(epoch from (now() - "CreatedDate")) / 86400)::text as so_ngay
         from thu."tbl_dx_thu"
        where "IsDeleted" = 0
          and "IsDifference" = true
          and "CreatedDate" >= now() - ($1 || ' days')::interval`,
      [String(ngay)]);

    return ds.map((t) => {
      const sn = Math.round(Number(t.so_ngay) * 10) / 10;
      return {
        thuc_the: 'tbl_dx_thu',
        thuc_the_khoa: String(t.Id),
        gia_tri: sn,
        tieu_de: `Phiếu thu ${t.sysCode ?? t.Id} có chênh lệch, tồn ${sn} ngày`,
        erp_user_id: t.Fk_User_Id,
        so_tien: Number(t.So_Tien),
        bang_chung: {
          ma_chung_tu: t.sysCode, ma_khach: t.Ma_Khach_Hang, noi_dung: t.Noi_Dung_Thu,
          so_tien: Number(t.So_Tien), tao_luc: t.CreatedDate, so_ngay_ton: sn,
        },
      };
    });
  },
};

// ---------------------------------------------------------------- bank chua khop

const giao_dich_bank_chua_khop: PhepDo = {
  ma: 'giao_dich_bank_chua_khop',
  ten: 'Giao dịch ngân hàng lớn chưa khớp chứng từ',
  mo_ta: 'Số ngày một giao dịch ghi có từ ngưỡng tiền trở lên chưa được khớp với chứng từ nào.',
  nhom: 'giao_dich',
  nguon: ['hola'],
  don_vi: 'ngày',
  tham_so: [{ ...TS_NHIN_LAI, mac_dinh: 90 }, { ...TS_TIEN, mac_dinh: 10_000_000 }],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(giao_dich_bank_chua_khop, ts, 'ngay_nhin_lai');
    const tien = ts_so(giao_dich_bank_chua_khop, ts, 'so_tien_toi_thieu');
    const ds = await ctx.doc<{
      Id: string; SysCode: string | null; BankName: string | null;
      BankAccount: string | null; SoTienGhiCo: string; Description: string | null;
      TransactionDate: string; so_ngay: string;
    }>('hola',
      // Bang nay dung "IsDeleted" kieu BOOLEAN — khac hai bang tren.
      `select "Id", "SysCode", "BankName", "BankAccount", "SoTienGhiCo"::text,
              "Description", "TransactionDate",
              (extract(epoch from (now() - "TransactionDate")) / 86400)::text as so_ngay
         from transaction."tbl_bank_transaction"
        where "IsDeleted" = false
          and "IsMatched" = false
          and "SoTienGhiCo" >= $1
          and "TransactionDate" >= now() - ($2 || ' days')::interval`,
      [tien, String(ngay)]);

    return ds.map((b) => {
      const sn = Math.round(Number(b.so_ngay) * 10) / 10;
      return {
        thuc_the: 'tbl_bank_transaction',
        thuc_the_khoa: b.Id,
        gia_tri: sn,
        tieu_de: `Giao dịch ${b.SysCode ?? b.Id} chưa khớp chứng từ sau ${sn} ngày`,
        so_tien: Number(b.SoTienGhiCo),
        bang_chung: {
          ma_giao_dich: b.SysCode, ngan_hang: b.BankName, so_tai_khoan: b.BankAccount,
          so_tien_ghi_co: Number(b.SoTienGhiCo), noi_dung: b.Description,
          ngay_giao_dich: b.TransactionDate, so_ngay_chua_khop: sn,
        },
      };
    });
  },
};

// ---------------------------------------------------------------- vuot han muc (CHUA LAM)

const chi_vuot_han_muc: PhepDo = {
  ma: 'chi_vuot_han_muc',
  ten: 'Chi vượt hạn mức của loại chi',
  mo_ta: 'So số tiền chi với hạn mức đã cấu hình cho loại chi đó.',
  nhom: 'giao_dich',
  nguon: ['hola'],
  don_vi: 'VND',
  tham_so: [{ ...TS_NHIN_LAI, mac_dinh: 90 }],
  // Da kiem chung tren EFContextModelSnapshot.cs: bang `chi.tbl_han_muc_chi` chi co
  // Id / CreatedDate / Fk_Approve_id / IsDeleted / LastUpdateTime. Truong `MoneyValue Value`
  // cua entity `HanMucChi` KHONG duoc persist, nen khong co so tien nao de so.
  //
  // Giu phep do trong danh muc thay vi xoa: nghiep vu that su can chi so nay, va khi ERP 1
  // bo sung cot thi chi phai viet phan than ham. Tra ve 0 dong se nguy hiem hon nhieu —
  // no nhin y het "khong co khoan chi nao vuot han muc".
  chua_trien_khai:
    'ERP 1 không lưu số tiền hạn mức: bảng chi.tbl_han_muc_chi chỉ có Id, CreatedDate, '
    + 'Fk_Approve_id, IsDeleted, LastUpdateTime — trường Value của entity HanMucChi không '
    + 'được ghi xuống cơ sở dữ liệu. Cần ERP 1 bổ sung cột số tiền thì phép đo này mới chạy '
    + 'được. Xem TECH_DEBT.md.',
  async do(): Promise<DongDo[]> {
    throw new Error('Phép đo chi_vuot_han_muc chưa triển khai — xem trường chua_trien_khai.');
  },
};

// ---------------------------------------------------------------- ghi khong xac thuc

/** erp_logistic ghi Guid rong khi goi khong xac thuc — xem IdentityService.GetUserIdentity(). */
const GUID_RONG = '00000000-0000-0000-0000-000000000000';

const ghi_khong_xac_thuc: PhepDo = {
  ma: 'ghi_khong_xac_thuc',
  ten: 'Chứng từ được ghi bởi tài khoản rỗng',
  mo_ta: 'Đếm bản ghi bên erp_logistic mang UserId rỗng — dấu hiệu được tạo qua đường gọi '
    + 'không xác thực. Đây là hệ quả của việc erp_logistic không bật xác thực.',
  nhom: 'giao_dich',
  nguon: ['kho'],
  don_vi: 'lần',
  tham_so: [TS_NHIN_LAI],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(ghi_khong_xac_thuc, ts, 'ngay_nhin_lai');
    // Ba bang tien chinh cua erp_logistic. Gop lam mot cau de mot vong quet chi cham CSDL
    // ERP 1 mot lan thay vi ba lan.
    const ds = await ctx.doc<{
      bang: string; khoa: string; ma: string | null; tao_luc: string;
    }>('kho',
      `select 'Tax' as bang, "Id"::text as khoa, "Code" as ma, "CreatedUtcDate" as tao_luc
         from "Tax"
        where "IsDeleted" = false and "UserId" = $1::uuid
          and "CreatedUtcDate" >= now() - ($2 || ' days')::interval
       union all
       select 'PackingList', "Id"::text, "PackingListCode", "CreatedUtcDate"
         from "PackingList"
        where "IsDeleted" = false and "UserId" = $1::uuid
          and "CreatedUtcDate" >= now() - ($2 || ' days')::interval
       union all
       select 'RepositoryChecks', "Id"::text, "RepositoryCheckCode", "CreatedUtcDate"
         from "RepositoryChecks"
        where "IsDeleted" = false and "UserId" = $1::uuid
          and "CreatedUtcDate" >= now() - ($2 || ' days')::interval`,
      [GUID_RONG, String(ngay)]);

    return ds.map((r) => ({
      thuc_the: r.bang,
      thuc_the_khoa: r.khoa,
      gia_tri: 1,
      tieu_de: `${r.bang} ${r.ma ?? r.khoa} được ghi bởi tài khoản rỗng`,
      bang_chung: {
        bang: r.bang, ma_chung_tu: r.ma, tao_luc: r.tao_luc,
        user_id: GUID_RONG,
        ghi_chu: 'erp_logistic ghi Guid.Empty khi request không mang token hợp lệ. '
          + 'Không quy trách nhiệm được cho ai — cần vá phía erp_logistic.',
      },
    }));
  },
};

export const PHEP_DO_GIAO_DICH: readonly PhepDo[] = [
  chi_tu_de_xuat_tu_duyet,
  chi_duyet_sieu_toc,
  chi_duyet_ngoai_gio,
  chi_khong_chung_tu,
  chi_trung_tien_ncc,
  chi_lech_sao_ke,
  thu_lech_ton_lau,
  giao_dich_bank_chua_khop,
  chi_vuot_han_muc,
  ghi_khong_xac_thuc,
];
