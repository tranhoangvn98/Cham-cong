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
import { LoiDauVao, LoiXungDot } from '../tien_ich/kiem_tra.ts';
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
    `select c.conrelid::regclass::text as bang,
            array_agg(a.attname order by k.ord) as cot_ds
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
 */
export async function gop_ho_so(
  giu_id: string, bo_id: string, che_do: CheDoGop = 'thu',
): Promise<KetQuaGop> {
  if (giu_id === bo_id) throw new LoiDauVao('Hai hồ sơ phải khác nhau.');

  const nv = await truy_van<{ id: string; ma_nv: string; ho_ten: string }>(
    'select id, ma_nv, ho_ten from nhan_vien where id = any($1::uuid[])', [[giu_id, bo_id]]);
  const giu = nv.find((x) => x.id === giu_id);
  const bo = nv.find((x) => x.id === bo_id);
  if (giu === undefined || bo === undefined) {
    throw new LoiDauVao('Không tìm thấy một trong hai hồ sơ nhân viên.');
  }

  const canh_bao: string[] = [];

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
            where b.${c.cot} = $2
              and exists (select 1 from ${c.bang} g
                           where g.${c.cot} = $1
                             and ${c.cot_kem.map((k) => `g.${k} is not distinct from b.${k}`).join(' and ')})`
        : null;

      const so_cham = dem_cham === null
        ? 0
        : Number((await chay(dem_cham, [giu_id, bo_id])).rows[0]?.['so'] ?? 0);

      // Cau doi cho. `where not exists` bo qua dung nhung dong se cham — chung o lai ban bo va
      // se mat khi xoa. Bao cao noi ro con so do.
      const dieu_kien_cham = c.co_rang_buoc_don && c.cot_kem.length > 0
        ? ` and not exists (select 1 from ${c.bang} g
                             where g.${c.cot} = $1
                               and ${c.cot_kem.map((k) => `g.${k} is not distinct from ${c.bang}.${k}`).join(' and ')})`
        : c.co_rang_buoc_don
          ? ` and not exists (select 1 from ${c.bang} g where g.${c.cot} = $1)`
          : '';

      const sql_doi = `update ${c.bang} set ${c.cot} = $1 where ${c.cot} = $2${dieu_kien_cham}`;

      let so_doi = 0;
      if (che_do === 'that') {
        const kq = await chay(`${sql_doi} returning 1`, [giu_id, bo_id]);
        so_doi = kq.rows.length;
      } else {
        const dem = `select count(*)::int as so from ${c.bang}
                      where ${c.cot} = $2${dieu_kien_cham.replace(new RegExp(`${c.bang}\\.`, 'g'), `${c.bang}.`)}`;
        so_doi = Number((await chay(dem, [giu_id, bo_id])).rows[0]?.['so'] ?? 0);
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
    canh_bao.push(
      'Đường dẫn tệp trên đĩa vẫn còn tên thư mục cũ. Chạy `npm run sap_xep_tep --that` để dọn, '
      + 'hoặc chờ lượt quét hằng ngày. Bảng đồng bộ SharePoint tự tính lại đường dẫn ở lượt sau.');
  }

  return {
    che_do,
    giu: { id: giu.id, ma_nv: giu.ma_nv, ho_ten: giu.ho_ten },
    bo: { id: bo.id, ma_nv: bo.ma_nv, ho_ten: bo.ho_ten },
    chi_tiet: chi_tiet.sort((a, b) => b.so_doi - a.so_doi),
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
