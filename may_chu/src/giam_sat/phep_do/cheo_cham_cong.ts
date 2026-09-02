// Nhom doi chieu cheo: thao tac tren ERP 1 so voi bang cong ben ERP 2.
//
// DAY LA LY DO MODULE NAY DAT O ERP 2. Khong he thong nao khac co dong thoi bang cong va du
// lieu nghiep vu, nen phep doi chieu nay chi lam duoc o day.
//
// CANH BAO VE CACH DOC KET QUA — bat buoc phai in ra giao dien va tai lieu:
//
// Dau hieu o nhom nay co RAT NHIEU nguyen nhan vo toi: lam tu xa, quen quet the, di cong tac,
// tai khoan bi dung chung, lech mui gio, hoac don giai trinh chua duyet kip. Mot dong o day
// KHONG chung minh dieu gi ca — no chi dang de HOI. Vi vay ca hai phep do deu seed o muc do
// thap/trung va tat mac dinh, va van ban huong dan cua nhom noi thang "hoi nguoi lien quan
// truoc, dung suy doan".
//
// Khoa doi chieu la `nhan_vien.erp_user_id` (di tru 017). Nguoi chua map thi BO QUA — khong
// bao gio doan theo ten, vi trung ten trong mot cong ty 50 nguoi la chuyen binh thuong va
// doan sai o day la vu oan cho mot con nguoi cu the.
import type { DongDo, NguCanh, PhepDo } from './kieu.ts';
import { ts_so } from './kieu.ts';
import { gio_dia_phuong, ngay_dia_phuong } from '../../tien_ich/thoi_gian.ts';

const TS_NHIN_LAI = {
  ten: 'ngay_nhin_lai', nhan: 'Số ngày nhìn lại', kieu: 'so' as const, mac_dinh: 30,
};

interface DongThaoTac {
  Id: number; EmployeeId: number; Name: string | null; Page: string | null;
  tableName: string | null; Action: string | null; CreatedUtcDate: string;
}

interface NhanVienMap {
  nhan_vien_id: string; erp_user_id: number; ho_ten: string;
}

/** Doc anh xa erp_user_id -> nhan vien. Chi lay nguoi DA map va dang lam viec. */
async function lay_anh_xa(ctx: NguCanh): Promise<Map<number, NhanVienMap>> {
  const ds = await ctx.doc_noi_bo<NhanVienMap>(
    `select id as nhan_vien_id, erp_user_id, ho_ten
       from nhan_vien
      where erp_user_id is not null and dang_hoat_dong = true`,
  );
  return new Map(ds.map((n) => [Number(n.erp_user_id), n]));
}

/** Lay thao tac tren ERP 1 trong khoang, cho nhung erp_user_id da map. */
async function lay_thao_tac(
  ctx: NguCanh, ngay: number, erp_ids: number[],
): Promise<DongThaoTac[]> {
  if (erp_ids.length === 0) return [];
  return ctx.doc<DongThaoTac>('logs',
    `select "Id", "EmployeeId", "Name", "Page", "tableName", "Action", "CreatedUtcDate"
       from xnk_logs."EmployeeActionLog"
      where "IsDelete" = false
        and "EmployeeId" = any($1::int[])
        and "CreatedUtcDate" >= now() - ($2 || ' days')::interval`,
    [erp_ids, String(ngay)]);
}

// ---------------------------------------------------------------- thao tac ngay nghi

const thao_tac_ngay_nghi: PhepDo = {
  ma: 'thao_tac_ngay_nghi',
  ten: 'Có thao tác trên ERP 1 vào ngày không đi làm',
  mo_ta: 'Đếm số thao tác trên ERP 1 vào ngày mà bảng công ghi là vắng hoặc nghỉ phép. '
    + 'Đây là dấu hiệu cần hỏi, KHÔNG phải bằng chứng — làm từ xa và quên quẹt thẻ đều '
    + 'tạo ra dấu hiệu này.',
  nhom: 'cheo_cham_cong',
  nguon: ['logs'],
  don_vi: 'lần',
  tham_so: [TS_NHIN_LAI],
  async do(ctx: NguCanh, ts): Promise<DongDo[]> {
    const ngay = ts_so(thao_tac_ngay_nghi, ts, 'ngay_nhin_lai');
    const anh_xa = await lay_anh_xa(ctx);
    if (anh_xa.size === 0) return [];

    const thao_tac = await lay_thao_tac(ctx, ngay, [...anh_xa.keys()]);
    if (thao_tac.length === 0) return [];

    // Gom thao tac theo (nhan_vien, ngay theo mui gio THIET BI). Ngay phai tinh bang
    // `ngay_dia_phuong` — dung `date()` cua Postgres la lay mui gio may chu ERP 1, va mot
    // thao tac luc 23:30 se roi sang ngay hom sau hoac hom truoc tuy may.
    const theo_nguoi_ngay = new Map<string, DongThaoTac[]>();
    for (const t of thao_tac) {
      const nv = anh_xa.get(Number(t.EmployeeId));
      if (nv === undefined) continue;
      const k = `${nv.nhan_vien_id}|${ngay_dia_phuong(new Date(t.CreatedUtcDate))}`;
      const cu = theo_nguoi_ngay.get(k);
      if (cu === undefined) theo_nguoi_ngay.set(k, [t]);
      else cu.push(t);
    }
    if (theo_nguoi_ngay.size === 0) return [];

    const cac_ngay = [...new Set([...theo_nguoi_ngay.keys()].map((k) => k.split('|')[1]))];
    const cac_nv = [...new Set([...theo_nguoi_ngay.keys()].map((k) => k.split('|')[0]))];

    const bang_cong = await ctx.doc_noi_bo<{
      nhan_vien_id: string; ngay: string; trang_thai: string;
    }>(
      `select nhan_vien_id, ngay::text, trang_thai
         from bang_cong_ngay
        where nhan_vien_id = any($1::uuid[]) and ngay = any($2::date[])`,
      [cac_nv, cac_ngay]);
    const bc = new Map(bang_cong.map((b) => [`${b.nhan_vien_id}|${b.ngay}`, b.trang_thai]));

    const NGHI = new Set(['vang', 'nghi_phep']);
    const ra: DongDo[] = [];
    for (const [k, ds] of theo_nguoi_ngay) {
      const trang_thai = bc.get(k);
      // Khong co dong bang cong = chua chot ngay do (hoac ngoai pham vi) -> BO QUA.
      // Coi "khong co du lieu" la "nghi" se sinh canh bao hang loat cho moi ngay chua chot.
      if (trang_thai === undefined || !NGHI.has(trang_thai)) continue;

      const [nv_id = '', ngay_str = ''] = k.split('|');
      const nv = [...anh_xa.values()].find((n) => n.nhan_vien_id === nv_id);
      ra.push({
        thuc_the: 'EmployeeActionLog',
        thuc_the_khoa: k,
        gia_tri: ds.length,
        tieu_de: `${nv?.ho_ten ?? nv_id} có ${ds.length} thao tác trên ERP 1 ngày ${ngay_str} `
          + `(bảng công ghi: ${trang_thai === 'vang' ? 'vắng' : 'nghỉ phép'})`,
        erp_user_id: Number(ds[0]?.EmployeeId ?? 0),
        ky: ngay_str.slice(0, 7),
        bang_chung: {
          nhan_vien: nv?.ho_ten,
          ngay: ngay_str,
          trang_thai_bang_cong: trang_thai,
          so_thao_tac: ds.length,
          vai_thao_tac_dau: ds.slice(0, 5).map((t) => ({
            luc: t.CreatedUtcDate, man_hinh: t.Page, bang: t.tableName, hanh_dong: t.Action,
          })),
          luu_y: 'Làm từ xa, quên quẹt thẻ, đi công tác và tài khoản dùng chung đều tạo ra '
            + 'dấu hiệu này. Hỏi người liên quan trước khi kết luận.',
        },
      });
    }
    return ra;
  },
};

// ---------------------------------------------------------------- thao tac ngoai ca

const thao_tac_ngoai_ca: PhepDo = {
  ma: 'thao_tac_ngoai_ca',
  ten: 'Có thao tác trên ERP 1 ngoài ca làm việc',
  mo_ta: 'Số phút thao tác nằm ngoài ca làm việc của nhân viên (trước giờ vào hoặc sau giờ ra). '
    + 'Chỉ có ý nghĩa khi lặp lại đều đặn, không dùng để kết luận một lần.',
  nhom: 'cheo_cham_cong',
  nguon: ['logs'],
  don_vi: 'phút',
  tham_so: [TS_NHIN_LAI],
  async do(ctx, ts): Promise<DongDo[]> {
    const ngay = ts_so(thao_tac_ngoai_ca, ts, 'ngay_nhin_lai');
    const anh_xa = await lay_anh_xa(ctx);
    if (anh_xa.size === 0) return [];

    const thao_tac = await lay_thao_tac(ctx, ngay, [...anh_xa.keys()]);
    if (thao_tac.length === 0) return [];

    const ca = await ctx.doc_noi_bo<{
      nhan_vien_id: string; gio_vao: string; gio_ra: string;
    }>(
      `select nv.id as nhan_vien_id, c.gio_vao::text, c.gio_ra::text
         from nhan_vien nv
         join ca_lam c on c.id = nv.ca_lam_id
        where nv.erp_user_id is not null and nv.dang_hoat_dong = true
          and c.dang_hoat_dong = true and c.qua_dem = false`);
    const ca_theo_nv = new Map(ca.map((c) => [c.nhan_vien_id, c]));

    /** 'HH:MM:SS' -> so phut tu dau ngay. */
    const phut_cua = (hhmmss: string): number => {
      const [h = 0, m = 0] = hhmmss.split(':').map(Number);
      return h * 60 + m;
    };

    const gop = new Map<string, { lech: number; ds: DongThaoTac[]; nv: NhanVienMap }>();
    for (const t of thao_tac) {
      const nv = anh_xa.get(Number(t.EmployeeId));
      if (nv === undefined) continue;
      const c = ca_theo_nv.get(nv.nhan_vien_id);
      if (c === undefined) continue; // chua gan ca lam, hoac ca qua dem -> bo qua

      const d = new Date(t.CreatedUtcDate);
      const phut = phut_cua(gio_dia_phuong(d));
      const vao = phut_cua(c.gio_vao);
      const ra_ca = phut_cua(c.gio_ra);
      const lech = phut < vao ? vao - phut : phut > ra_ca ? phut - ra_ca : 0;
      if (lech === 0) continue;

      const k = `${nv.nhan_vien_id}|${ngay_dia_phuong(d)}`;
      const cu = gop.get(k);
      if (cu === undefined) gop.set(k, { lech, ds: [t], nv });
      else {
        cu.ds.push(t);
        // Giu do lech LON NHAT trong ngay — mot thao tac luc 2 gio sang dang chu y hon
        // muoi thao tac muon 5 phut.
        if (lech > cu.lech) cu.lech = lech;
      }
    }

    const ra: DongDo[] = [];
    for (const [k, v] of gop) {
      const [, ngay_str = ''] = k.split('|');
      const c = ca_theo_nv.get(v.nv.nhan_vien_id);
      ra.push({
        thuc_the: 'EmployeeActionLog',
        thuc_the_khoa: k,
        gia_tri: v.lech,
        tieu_de: `${v.nv.ho_ten} thao tác trên ERP 1 lệch ${v.lech} phút ngoài ca ngày ${ngay_str}`,
        erp_user_id: Number(v.ds[0]?.EmployeeId ?? 0),
        ky: ngay_str.slice(0, 7),
        bang_chung: {
          nhan_vien: v.nv.ho_ten,
          ngay: ngay_str,
          ca_lam: c === undefined ? null : `${c.gio_vao}–${c.gio_ra}`,
          do_lech_lon_nhat_phut: v.lech,
          so_thao_tac_ngoai_ca: v.ds.length,
          vai_thao_tac_dau: v.ds.slice(0, 5).map((t) => ({
            luc_theo_mui_gio_thiet_bi: gio_dia_phuong(new Date(t.CreatedUtcDate)),
            man_hinh: t.Page, bang: t.tableName, hanh_dong: t.Action,
          })),
          luu_y: 'Chỉ số này chỉ có ý nghĩa khi lặp lại đều đặn. Làm thêm giờ có phép, '
            + 'trực lễ tết và xử lý sự cố đều nằm ngoài ca một cách hợp lệ.',
        },
      });
    }
    return ra;
  },
};

export const PHEP_DO_CHEO_CHAM_CONG: readonly PhepDo[] = [
  thao_tac_ngay_nghi,
  thao_tac_ngoai_ca,
];
