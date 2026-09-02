// Gop hai ho so nhan vien la CUNG MOT NGUOI.
//
// VI SAO CAN: `ERP147` va `HR-01` la cung mot nguoi (Hoang Minh Ngoc) — mot ban do nhan su khai
// tay, mot ban do dong bo tu ERP cu. Hau qua thay duoc ngay:
//   - Dashboard dem "tong nhan vien" va "vang hom nay" thanh hai lan mot nguoi.
//   - Tren SharePoint, tep cua mot nguoi tach thanh HAI thu muc `ERP147-...` va `HR-01-...`.
//   - Bang cong, bang luong, KPI cua cung mot nguoi nam o hai cho.
//
// KHONG GO TAY DANH SACH BANG. Bo gop nay doc khoa ngoai TU CATALOG cua Postgres, nen mot bang
// moi tro toi `nhan_vien` sau nay se duoc gop theo ma khong ai phai nho sua tep nay. Go tay la
// dung cach hong im lang nhat: gop xong, mot bang bi bo lai, va du lieu cua nguoi do mat mot
// nua ma khong bao gi.
//
// MAC DINH CHAY THU. Day la thao tac khong hoan tac duoc bang mot lenh, tren du lieu cham cong
// va tien luong cua nguoi that.
import { truy_van, truy_van_mot, trong_giao_dich } from '../csdl/ket_noi.ts';
import { LoiDauVao, LoiXungDot, la_so_dien_thoai } from '../tien_ich/kiem_tra.ts';
import { bo_dau } from '../tien_ich/ten_tep.ts';

export type CheDoGop = 'thu' | 'that';

// ---------------------------------------------------------------- doc catalog

export interface CotThamChieu {
  bang: string;
  cot: string;
  /** Cot nay co nam trong mot rang buoc UNIQUE / khoa chinh khong. */
  co_rang_buoc_don: boolean;
  /** Cac cot con lai cua rang buoc do — dung de tim va xu ly cham nhau. */
  cot_kem: string[];
}

/**
 * Moi cot tro toi `nhan_vien(id)`, doc tu catalog.
 *
 * `pg_constraint` la nguon su that duy nhat o day. Truy van nay cung tra ve luon cac rang buoc
 * UNIQUE co chua cot do — vi chinh chung la cho gop se cham nhau: `bang_cong_ngay` co
 * `unique (nhan_vien_id, ngay)`, nen neu CA HAI ho so deu co dong cho ngay 14/08 thi khong the
 * doi thang ca hai sang mot nguoi.
 */
export async function cot_tro_toi_nhan_vien(): Promise<CotThamChieu[]> {
  const fk = await truy_van<{ bang: string; cot: string }>(
    `select c.conrelid::regclass::text as bang, a.attname as cot
       from pg_constraint c
       join unnest(c.conkey) with ordinality as k(attnum, ord) on true
       join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
      where c.contype = 'f'
        and c.confrelid = 'nhan_vien'::regclass
        and array_length(c.conkey, 1) = 1
      order by 1, 2`,
  );

  const uq = await truy_van<{ bang: string; cot_ds: string[] }>(
    // `a.attname` la kieu `name`, va node-postgres KHONG phan giai `name[]` thanh mang JS —
    // no tra ve chuoi `{nhan_vien_id,ngay}`. Phai cast tung phan tu sang `text` de thanh
    // `text[]`, kieu ma bo phan giai co ho tro. Thieu cast thi `.filter` no bao "not a function".
    `select c.conrelid::regclass::text as bang,
            array_agg(a.attname::text order by k.ord) as cot_ds
       from pg_constraint c
       join unnest(c.conkey) with ordinality as k(attnum, ord) on true
       join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
      where c.contype in ('u','p')
      group by c.oid, c.conrelid`,
  );

  return fk.map((f) => {
    const lien_quan = uq.filter((u) => u.bang === f.bang && u.cot_ds.includes(f.cot));
    // Neu co nhieu rang buoc, lay cai NHIEU COT NHAT: no la cai chat nhat, va xu ly duoc no thi
    // cac cai kia cung qua.
    const chat = lien_quan.sort((a, b) => b.cot_ds.length - a.cot_ds.length)[0];
    return {
      bang: f.bang,
      cot: f.cot,
      co_rang_buoc_don: chat !== undefined,
      cot_kem: (chat?.cot_ds ?? []).filter((c) => c !== f.cot),
    };
  });
}

// ---------------------------------------------------------------- mang truong theo

/**
 * Cac cot cua `nhan_vien` duoc MANG TU BAN BO SANG BAN GIU khi ban giu de trong o do.
 *
 * VI SAO PHAI CO: thieu buoc nay thi VIEC GOP TU HUY. `erp_user_id` co unique index, va bo dong
 * bo ERP khop nguoi theo `erp_user_id` truoc, roi moi den `email`. Xoa ban `ERP147` la xoa luon
 * so 147 khoi CSDL; luot dong bo ke tiep khong tim thay ai mang so do, khong khop duoc email,
 * nen TAO LAI mot ban ghi moi — va cap trung quay ve dung nhu truoc khi gop. Da xay ra that
 * (Hoang Minh Ngoc, HR-01 / ERP147).
 *
 * `pin_may` cung the: no la khoa noi log may ZKTeco -> nhan vien. Neu nguoi dung chon giu ban
 * KHONG co PIN, mat PIN nghia la moi lan quet sau do khong biet la cua ai.
 *
 * Chi dien khi ban giu DE TRONG. Hai ben deu co gia tri va khac nhau thi KHONG ghi de — do la
 * du lieu that ca hai phia, may khong chon duoc.
 */
export const COT_MANG_THEO: readonly string[] = [
  // Khoa noi ra ngoai — mat la viec gop tu huy.
  'erp_user_id', 'erp_username', 'erp_dong_bo_luc', 'ma_erp', 'email', 'pin_may',
  // Thong tin nhan su — mat la mat du lieu nguoi ta da nhap.
  'phong_ban_id', 'ca_lam_id', 'chuc_danh', 'nguoi_quan_ly_id',
  'ngay_vao', 'ngay_chinh_thuc', 'so_dien_thoai', 'noi_lam_viec_id',
] as const;

/**
 * Cac cot CO Y KHONG mang theo. Moi cot o day la mot quyet dinh, khong phai cho sot.
 *
 *   - `id`, `ma_nv`: chinh la thu phan biet hai ban. Chon giu ban nao la chon hai o nay.
 *   - `ho_ten`: ten cua ban giu thang. Khac ten thi da co canh bao rieng.
 *   - `tao_luc`, `cap_nhat_luc`: so sach cua CSDL.
 *   - `dang_hoat_dong`, `ngay_nghi_viec`: mang theo la co the AM THAM cho mot nguoi da nghi
 *     thanh dang lam, hoac nguoc lai. Bao de nguoi that doi.
 *   - `duoc_cham_cong_dien_thoai`: mac dinh TAT de chong gian lan (xem `001_khoi_tao.sql`).
 *     Mang theo `true` tu mot ban ghi sap bi xoa la am tham mo mot cua chong gian lan.
 *   - `so_ngay_phep_nam`: `not null default 12`, nen "de trong" khong phan biet duoc voi "co y
 *     dat 12". Khac nhau thi bao, khong tu chon.
 */
export const COT_KHONG_MANG: readonly string[] = [
  'id', 'ma_nv', 'ho_ten', 'tao_luc', 'cap_nhat_luc',
  'dang_hoat_dong', 'ngay_nghi_viec', 'duoc_cham_cong_dien_thoai', 'so_ngay_phep_nam',
] as const;

/** Cac cot khong mang theo nhung LECH NHAU thi phai bao. Tap con cua `COT_KHONG_MANG`. */
export const COT_CANH_BAO_LECH: readonly string[] = [
  'dang_hoat_dong', 'ngay_nghi_viec', 'duoc_cham_cong_dien_thoai', 'so_ngay_phep_nam',
] as const;

export interface TruongMangTheo {
  cot: string;
  gia_tri: unknown;
}

function trong(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

function de_doc(v: unknown): string {
  if (v === null || v === undefined) return '(trống)';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'boolean') return v ? 'có' : 'không';
  return String(v);
}

/**
 * Tinh xem nhung o nao cua ban giu dang trong va ban bo co, cong cac cho lech can bao.
 *
 * Doc CA HAI dong bang `select *` roi so tren JS — khong dung cot nao tu dau vao nguoi dung, nen
 * khong co cho nao noi chuoi vao SQL.
 */
export function tinh_mang_theo(
  hang_giu: Record<string, unknown>,
  hang_bo: Record<string, unknown>,
): { mang: TruongMangTheo[]; canh_bao: string[] } {
  const mang: TruongMangTheo[] = [];
  const canh_bao: string[] = [];

  for (const c of COT_MANG_THEO) {
    if (!(c in hang_giu)) continue;
    if (trong(hang_giu[c]) && !trong(hang_bo[c])) {
      // ERP cu tra HO TEN trong o dien thoai. Mang cai do sang ban giu la chuyen rac tu mot ban
      // ghi sap bi xoa vao mot ho so con song tiep — dung dung bo kiem ma dong bo ERP dung.
      if (c === 'so_dien_thoai' && !la_so_dien_thoai(String(hang_bo[c]))) {
        canh_bao.push(
          `\`so_dien_thoai\` của hồ sơ bỏ là "${String(hang_bo[c])}" — không phải số điện thoại `
          + '(ERP cũ trả họ tên vào ô này), nên KHÔNG mang sang.');
        continue;
      }
      mang.push({ cot: c, gia_tri: hang_bo[c] });
    } else if (!trong(hang_giu[c]) && !trong(hang_bo[c])
               && String(hang_giu[c]) !== String(hang_bo[c])) {
      canh_bao.push(
        `\`${c}\`: hai hồ sơ khác nhau (giữ: ${de_doc(hang_giu[c])}, `
        + `bỏ: ${de_doc(hang_bo[c])}). Giữ nguyên bản của hồ sơ giữ — sửa tay nếu cần.`);
    }
  }

  for (const c of COT_CANH_BAO_LECH) {
    if (!(c in hang_giu)) continue;
    if (String(hang_giu[c]) !== String(hang_bo[c])) {
      canh_bao.push(
        `\`${c}\` lệch nhau (giữ: ${de_doc(hang_giu[c])}, bỏ: ${de_doc(hang_bo[c])}) và CỐ Ý `
        + 'không mang theo — đây là trạng thái làm việc / quyền, phải người quyết.');
    }
  }

  return { mang, canh_bao };
}

// ---------------------------------------------------------------- tim ho so trung

export interface CapTrung {
  a_id: string;
  a_ma_nv: string;
  b_id: string;
  b_ma_nv: string;
  ho_ten: string;
  /** Vi sao nghi la trung: 'ho_ten' | 'ma_erp' | 'pin_may' | 'email'. */
  ly_do: string;
}

/**
 * Tim cac cap ho so NGHI LA trung.
 *
 * CHI NGHI, khong ket luan. Hai nguoi cung ten la chuyen thuong o Viet Nam, nen ket qua o day
 * la danh sach de NGUOI XEM, khong phai danh sach de may tu gop. Bo gop chi chay khi duoc chi
 * dinh dung hai ma nhan vien.
 */
export async function tim_ho_so_trung(): Promise<CapTrung[]> {
  const nv = await truy_van<{
    id: string; ma_nv: string; ho_ten: string; ma_erp: string | null;
    pin_may: string | null; email: string | null;
  }>(
    'select id, ma_nv, ho_ten, ma_erp, pin_may, email from nhan_vien order by ma_nv',
  );

  const ra: CapTrung[] = [];
  const da_co = new Set<string>();

  const them = (a: typeof nv[number], b: typeof nv[number], ly_do: string): void => {
    const khoa = [a.id, b.id].sort().join('|');
    if (da_co.has(khoa)) return;
    da_co.add(khoa);
    ra.push({
      a_id: a.id, a_ma_nv: a.ma_nv, b_id: b.id, b_ma_nv: b.ma_nv, ho_ten: a.ho_ten, ly_do,
    });
  };

  /** Chuan hoa ho ten de so: bo dau, bo dau cach lien tiep, ve chu thuong. */
  const chuan = (s: string): string =>
    bo_dau(s).toLowerCase().replace(/\s+/g, ' ').trim();

  for (let i = 0; i < nv.length; i++) {
    for (let j = i + 1; j < nv.length; j++) {
      const a = nv[i]!;
      const b = nv[j]!;
      if (a.ma_erp !== null && a.ma_erp === b.ma_erp) them(a, b, 'ma_erp');
      else if (a.pin_may !== null && a.pin_may === b.pin_may) them(a, b, 'pin_may');
      else if (a.email !== null && a.email !== '' && a.email === b.email) them(a, b, 'email');
      else if (chuan(a.ho_ten) === chuan(b.ho_ten)) them(a, b, 'ho_ten');
    }
  }
  return ra;
}

// ---------------------------------------------------------------- gop

export interface DongDoiCho {
  bang: string;
  cot: string;
  /** So dong doi duoc sang ho so giu lai. */
  so_doi: number;
  /** So dong KHONG doi duoc vi cham rang buoc UNIQUE — se bi bo lai o ban bo. */
  so_cham: number;
}

export interface KetQuaGop {
  che_do: CheDoGop;
  giu: { id: string; ma_nv: string; ho_ten: string };
  bo: { id: string; ma_nv: string; ho_ten: string };
  chi_tiet: DongDoiCho[];
  /** Cac o cua ban giu duoc dien tu ban bo (khoa noi ERP, PIN may, phong ban...). */
  mang_theo: TruongMangTheo[];
  /** Tong so dong da (hoac se) doi cho. */
  so_doi: number;
  /** Tong so dong cham nhau — nam o ban bo va se mat khi xoa ban do. */
  so_cham: number;
  canh_bao: string[];
  /** Da xoa ho so bo hay chua. Che do `thu` thi luon false. */
  da_xoa_ban_bo: boolean;
}

/**
 * Ho so nao duoc giu.
 *
 * Giu ban co PIN may cham cong, va neu ca hai deu co (hoac ca hai deu khong) thi giu ban CO
 * NHIEU LUOT QUET HON. Ly do: PIN va lich su quet la thu KHONG TAI TAO DUOC — chung den tu
 * thiet bi. Con ma nhan vien, ho ten, phong ban thi go lai duoc trong mot phut.
 */
export async function nen_giu_ban_nao(
  id_a: string, id_b: string,
): Promise<{ giu: string; bo: string; ly_do: string }> {
  const d = await truy_van<{ id: string; pin_may: string | null; so_quet: number }>(
    `select nv.id, nv.pin_may,
            (select count(*)::int from lan_quet lq where lq.nhan_vien_id = nv.id) as so_quet
       from nhan_vien nv where nv.id = any($1::uuid[])`,
    [[id_a, id_b]],
  );
  const a = d.find((x) => x.id === id_a);
  const b = d.find((x) => x.id === id_b);
  if (a === undefined || b === undefined) {
    throw new LoiDauVao('Không tìm thấy một trong hai hồ sơ.');
  }

  const co_pin_a = a.pin_may !== null && a.pin_may !== '';
  const co_pin_b = b.pin_may !== null && b.pin_may !== '';
  if (co_pin_a !== co_pin_b) {
    return co_pin_a
      ? { giu: a.id, bo: b.id, ly_do: 'bản này có PIN máy chấm công' }
      : { giu: b.id, bo: a.id, ly_do: 'bản này có PIN máy chấm công' };
  }
  if (a.so_quet !== b.so_quet) {
    return a.so_quet > b.so_quet
      ? { giu: a.id, bo: b.id, ly_do: `bản này có nhiều lượt quẹt hơn (${String(a.so_quet)})` }
      : { giu: b.id, bo: a.id, ly_do: `bản này có nhiều lượt quẹt hơn (${String(b.so_quet)})` };
  }
  return { giu: a.id, bo: b.id, ly_do: 'hai bản tương đương, giữ bản được nêu trước' };
}

/**
 * Gop `bo_id` vao `giu_id`.
 *
 * `che_do = 'thu'` (mac dinh): DOC va bao se doi gi, KHONG ghi mot dong nao.
 *
 * Ba dieu khong lam, va deu co ly do:
 *
 *   1. KHONG gop khi ca hai ho so deu co TAI KHOAN dang nhap. `nguoi_dung.nhan_vien_id` la
 *      `unique`, nen mot trong hai tai khoan se mat lien ket — va do la quyet dinh ve quyen
 *      truy cap, phai co nguoi lam chu khong phai mot cong cu doan.
 *   2. KHONG gop hai nguoi KHAC TEN ma khong bao. Khac ten thi rat co the la hai nguoi that.
 *      Van gop duoc, nhung phai co canh bao trong bao cao.
 *   3. KHONG doi ten thu muc tren dia o day. `ho_so_tep.ten_luu` van tro vao thu muc cu, va
 *      viec sap xep kho tep (`ho_so/sap_xep_tep.ts`) se don — no da la mot lan quet hang ngay,
 *      va lam hai viec trong mot giao dich la hai thu co the do rieng.
 *
 * Mot dieu CO lam va de bi bo sot: mang cac khoa noi (`erp_user_id`, `pin_may`, `email`...) tu
 * ban bo sang ban giu khi ban giu de trong. Xem `COT_MANG_THEO` — thieu buoc do thi lan dong bo
 * ERP ke tiep tao lai dung ban vua xoa.
 */
export async function gop_ho_so(
  giu_id: string, bo_id: string, che_do: CheDoGop = 'thu',
): Promise<KetQuaGop> {
  if (giu_id === bo_id) throw new LoiDauVao('Hai hồ sơ phải khác nhau.');

  // `select *`: can DU cot de tinh phan mang theo. Ten cot khong den tu dau vao nguoi dung.
  const nv = await truy_van<Record<string, unknown>>(
    'select * from nhan_vien where id = any($1::uuid[])', [[giu_id, bo_id]]);
  const hang_giu = nv.find((x) => x['id'] === giu_id);
  const hang_bo = nv.find((x) => x['id'] === bo_id);
  if (hang_giu === undefined || hang_bo === undefined) {
    throw new LoiDauVao('Không tìm thấy một trong hai hồ sơ nhân viên.');
  }
  const ten_ma = (h: Record<string, unknown>): { id: string; ma_nv: string; ho_ten: string } => ({
    id: String(h['id']), ma_nv: String(h['ma_nv']), ho_ten: String(h['ho_ten']),
  });
  const giu = ten_ma(hang_giu);
  const bo = ten_ma(hang_bo);

  const { mang, canh_bao: canh_bao_truong } = tinh_mang_theo(hang_giu, hang_bo);
  const canh_bao: string[] = [...canh_bao_truong];

  // Chan 1: hai tai khoan dang nhap.
  const tk = await truy_van<{ ten_dang_nhap: string; nhan_vien_id: string }>(
    'select ten_dang_nhap, nhan_vien_id from nguoi_dung where nhan_vien_id = any($1::uuid[])',
    [[giu_id, bo_id]]);
  if (tk.length > 1) {
    throw new LoiXungDot(
      `Cả hai hồ sơ đều có tài khoản đăng nhập (${tk.map((t) => t.ten_dang_nhap).join(', ')}). `
      + 'Hãy xoá hoặc gỡ liên kết một tài khoản trước — đó là quyết định về quyền truy cập, '
      + 'không phải việc công cụ gộp tự đoán.',
    );
  }

  // Canh bao 2: khac ten.
  const chuan = (s: string): string => bo_dau(s).toLowerCase().replace(/\s+/g, ' ').trim();
  if (chuan(giu.ho_ten) !== chuan(bo.ho_ten)) {
    canh_bao.push(
      `Hai hồ sơ KHÁC TÊN: "${giu.ho_ten}" và "${bo.ho_ten}". Rất có thể là hai người thật. `
      + 'Kiểm tra lại trước khi chạy thật.');
  }

  const cot = await cot_tro_toi_nhan_vien();
  const chi_tiet: DongDoiCho[] = [];

  const lam = async (
    chay: (sql: string, ts: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>,
  ): Promise<void> => {
    for (const c of cot) {
      // Bang `nhan_vien` tu tro vao no (vi du `quan_ly_id`) cung nam trong danh sach — doi
      // binh thuong, chi bo qua dong chinh no.
      const dem_cham = c.co_rang_buoc_don && c.cot_kem.length > 0
        ? `select count(*)::int as so
             from ${c.bang} b
            where b.${c.cot} = $2::uuid
              and exists (select 1 from ${c.bang} g
                           where g.${c.cot} = $1::uuid
                             and ${c.cot_kem.map((k) => `g.${k} is not distinct from b.${k}`).join(' and ')})`
        : null;

      const so_cham = dem_cham === null
        ? 0
        : Number((await chay(dem_cham, [giu_id, bo_id])).rows[0]?.['so'] ?? 0);

      // Cau doi cho. `where not exists` bo qua dung nhung dong se cham — chung o lai ban bo va
      // se mat khi xoa. Bao cao noi ro con so do.
      //
      // `::uuid` tuong minh o moi tham so: cau DEM cho bang khong co rang buoc UNIQUE chi dung
      // MOT tham so, va Postgres tu choi han mot tham so khong xuat hien trong cau
      // ("could not determine data type of parameter $1"). Nen cau dem va cau update co so
      // tham so khac nhau, va chung duoc dung rieng chu khong dung chung mot chuoi.
      const dieu_kien_cham = c.co_rang_buoc_don && c.cot_kem.length > 0
        ? ` and not exists (select 1 from ${c.bang} g
                             where g.${c.cot} = $1::uuid
                               and ${c.cot_kem.map((k) => `g.${k} is not distinct from ${c.bang}.${k}`).join(' and ')})`
        : c.co_rang_buoc_don
          ? ` and not exists (select 1 from ${c.bang} g where g.${c.cot} = $1::uuid)`
          : '';

      let so_doi = 0;
      if (che_do === 'that') {
        const kq = await chay(
          `update ${c.bang} set ${c.cot} = $1::uuid
            where ${c.cot} = $2::uuid${dieu_kien_cham} returning 1`,
          [giu_id, bo_id]);
        so_doi = kq.rows.length;
      } else if (dieu_kien_cham === '') {
        // Khong co rang buoc UNIQUE -> khong can biet ban giu, va khong duoc truyen tham so du.
        const kq = await chay(
          `select count(*)::int as so from ${c.bang} where ${c.cot} = $1::uuid`, [bo_id]);
        so_doi = Number(kq.rows[0]?.['so'] ?? 0);
      } else {
        const kq = await chay(
          `select count(*)::int as so from ${c.bang}
            where ${c.cot} = $2::uuid${dieu_kien_cham}`, [giu_id, bo_id]);
        so_doi = Number(kq.rows[0]?.['so'] ?? 0);
      }

      if (so_doi > 0 || so_cham > 0) {
        chi_tiet.push({ bang: c.bang, cot: c.cot, so_doi, so_cham });
      }
    }
  };

  let da_xoa = false;
  if (che_do === 'that') {
    await trong_giao_dich(async (khach) => {
      await lam((sql, ts) => khach.query(sql, ts) as Promise<{ rows: Record<string, unknown>[] }>);
      // Xoa ban bo SAU KHI da doi het. Nhung dong cham nhau con lai se bi cascade xoa theo —
      // dung nhu mong doi: chung la ban trung cua nhung dong da co o ban giu.
      await khach.query('delete from nhan_vien where id = $1', [bo_id]);
      da_xoa = true;

      // Dien cac o trong cua ban giu SAU KHI XOA ban bo, va thu tu do la bat buoc: `pin_may` va
      // `erp_user_id` deu UNIQUE, nen ghi truoc khi xoa la va ngay vao rang buoc voi chinh ban
      // dang bi bo. Gia tri da doc vao JS o tren roi nen khong mat gi.
      if (mang.length > 0) {
        const dat = mang.map((m, i) => `${m.cot} = $${String(i + 2)}`).join(', ');
        await khach.query(
          `update nhan_vien set ${dat}, cap_nhat_luc = now() where id = $1`,
          [giu_id, ...mang.map((m) => m.gia_tri)],
        );
      }
    });
  } else {
    await lam(async (sql, ts) => ({ rows: await truy_van(sql, ts) }));
  }

  const so_doi = chi_tiet.reduce((t, c) => t + c.so_doi, 0);
  const so_cham = chi_tiet.reduce((t, c) => t + c.so_cham, 0);

  if (so_cham > 0) {
    canh_bao.push(
      `${String(so_cham)} dòng ở hồ sơ bỏ trùng với dòng đã có ở hồ sơ giữ (cùng ngày, cùng kỳ, `
      + 'cùng danh mục...). Chúng sẽ bị xoá theo hồ sơ bỏ. Bản ở hồ sơ giữ được giữ lại.');
  }
  if (che_do === 'that') {
    // `-- --that`: hai dau gach la de npm chuyen tham so cho script chu khong tu an. Thieu chung
    // thi lenh chay o che do thu va nguoi doc tuong da don xong.
    canh_bao.push(
      'Đường dẫn tệp trên đĩa vẫn còn tên thư mục cũ. Chạy `npm run sap_xep_tep -- --that` để '
      + 'dọn, hoặc chờ lượt quét hằng ngày. Bảng đồng bộ SharePoint tự tính lại đường dẫn ở '
      + 'lượt sau.');
  }

  return {
    che_do,
    giu: { id: giu.id, ma_nv: giu.ma_nv, ho_ten: giu.ho_ten },
    bo: { id: bo.id, ma_nv: bo.ma_nv, ho_ten: bo.ho_ten },
    chi_tiet: chi_tiet.sort((a, b) => b.so_doi - a.so_doi),
    mang_theo: mang,
    so_doi,
    so_cham,
    canh_bao,
    da_xoa_ban_bo: da_xoa,
  };
}

/** Tim ho so theo ma nhan vien. Dung cho CLI va cho route. */
export async function id_theo_ma_nv(ma_nv: string): Promise<string> {
  const d = await truy_van_mot<{ id: string }>(
    'select id from nhan_vien where ma_nv = $1', [ma_nv]);
  if (d === null) throw new LoiDauVao(`Không có nhân viên mã "${ma_nv}".`);
  return d.id;
}
