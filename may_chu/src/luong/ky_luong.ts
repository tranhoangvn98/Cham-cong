// Sinh phieu luong cho ca mot ky tu du lieu cham cong da co.
//
// Tach khoi tuyen HTTP de kiem duoc bang CSDL that ma khong phai di qua route, va de
// lich chay dinh ky sau nay goi lai duoc.
import { truy_van, truy_van_mot, trong_giao_dich } from '../csdl/ket_noi.ts';
import { khoang_thang, danh_sach_ngay, thu_trong_tuan } from '../tien_ich/thoi_gian.ts';
import { OFFSET_MAY_MS, cau_hinh } from '../cau_hinh.ts';
import { tinh_phieu_luong, type BacThue, type ThamSoLuong } from './tinh_luong.ts';
import type { CachTinhKhoan, LoaiKhoan } from './khoan.ts';
import { khoan_tu_chinh_sach, type DongChinhSach } from './chinh_sach.ts';
import { tinh_phat_di_muon, gio_sang_phut, type CauHinhDiMuon } from './phat_di_muon.ts';

/** Mot dong chinh sach doc tu CSDL — them `nhan_vien_id` de nhom lai. */
interface DongChinhSachDb extends DongChinhSach {
  nhan_vien_id: string;
}

/** Cach tra luong cua cong ty — khong phai tham so phap ly, nhung cung theo bo hieu luc. */
export interface ChinhSachTra {
  /** Cong chuan CO DINH cua thang. 0 = dem theo lich (so ngay lam viec that). */
  cong_chuan_thang: number;
  /** Lam tron thuc linh den boi so nay khi tra. 0 = khong lam tron. */
  lam_tron_den: number;
  /** Ty le luong thu viec tren luong cung (0.85 = 85%). */
  ty_le_thu_viec: number;
  /** Cau hinh phat di muon (gio da quy ve phut tu 00:00). */
  di_muon: CauHinhDiMuon;
  /** Han gui don di muon, phut tu 00:00 (07:30 -> 450). */
  di_muon_han_don_phut: number;
}

/** Tham so phap ly co hieu luc tai ngay dau cua ky. */
export async function tham_so_cho_thang(thang: string): Promise<
  { id: string; ts: ThamSoLuong; cs: ChinhSachTra } | null
> {
  const { tu } = khoang_thang(thang);
  const d = await truy_van_mot<Record<string, unknown>>(
    `select * from tham_so_luong
      where hieu_luc_tu <= $1
      order by hieu_luc_tu desc limit 1`,
    [tu],
  );
  if (d === null) return null;

  const bac = await truy_van<BacThue>(
    `select bac, tu_muc::float8 as tu_muc, den_muc::float8 as den_muc,
            thue_suat::float8 as thue_suat
       from bac_thue_tncn where tham_so_id = $1 order by bac`,
    [d['id']],
  );

  return {
    id: String(d['id']),
    cs: {
      cong_chuan_thang: Number(d['cong_chuan_thang'] ?? 0),
      lam_tron_den: Number(d['lam_tron_den'] ?? 0),
      ty_le_thu_viec: Number(d['ty_le_thu_viec'] ?? 0.85),
      di_muon: {
        bat: Boolean(d['phat_di_muon_bat'] ?? false),
        moc_50k_phut: gio_sang_phut(String(d['di_muon_moc_50k'] ?? '08:10')),
        moc_nua_ngay_phut: gio_sang_phut(String(d['di_muon_moc_nua_ngay'] ?? '08:30')),
        muc_50k: Number(d['di_muon_muc_50k'] ?? 50000),
        mien_moi_thang: Number(d['di_muon_mien_moi_thang'] ?? 3),
      },
      di_muon_han_don_phut: gio_sang_phut(String(d['di_muon_han_don'] ?? '07:30')),
    },
    ts: {
      luong_co_so: Number(d['luong_co_so']),
      luong_toi_thieu_vung: Number(d['luong_toi_thieu_vung']),
      ty_le_bhxh_nld: Number(d['ty_le_bhxh_nld']),
      ty_le_bhyt_nld: Number(d['ty_le_bhyt_nld']),
      ty_le_bhtn_nld: Number(d['ty_le_bhtn_nld']),
      ty_le_bhxh_nsdld: Number(d['ty_le_bhxh_nsdld']),
      ty_le_bhyt_nsdld: Number(d['ty_le_bhyt_nsdld']),
      ty_le_bhtn_nsdld: Number(d['ty_le_bhtn_nsdld']),
      giam_tru_ban_than: Number(d['giam_tru_ban_than']),
      giam_tru_phu_thuoc: Number(d['giam_tru_phu_thuoc']),
      bac_thue: bac,
    },
  };
}

/**
 * So ngay cong CHUAN cua thang cho mot ca lam: dem ngay trong tuan thuoc `cac_ngay_lam`,
 * tru ngay le da khai.
 *
 * Dem theo lich that chu khong lay 26 ngay co dinh: thang 28 ngay va thang 31 ngay co so
 * ngay lam viec khac nhau, dung mot con so chung la sai luong theo cong.
 */
export function ngay_cong_chuan(
  tu: string,
  den: string,
  cac_ngay_lam: number[],
  ngay_le: Set<string>,
): number {
  let so = 0;
  for (const ng of danh_sach_ngay(tu, den)) {
    if (ngay_le.has(ng)) continue;
    if (cac_ngay_lam.includes(thu_trong_tuan(ng))) so++;
  }
  return so;
}

interface DongNhanVien {
  nhan_vien_id: string;
  /** Luong co ban theo quyet dinh luong (chinh thuc). Null = chua co quyet dinh. */
  luong_ql: number | null;
  /** Phu cap theo quyet dinh luong. */
  phu_cap_ql: number;
  /** Luong co ban ghi trong hop dong dang hieu luc. */
  luong_hd: number | null;
  cac_ngay_lam: number[];
  so_cong: number;
  phut_ot: number;
  so_nguoi_phu_thuoc: number;
  loai_hop_dong: string | null;
  /** Lich nghi le theo noi lam viec (mac dinh 'vn'). */
  lich_nghi_ma: string;
}

/**
 * Tinh lai toan bo phieu luong cua mot ky.
 *
 * GIU LAI phan nguoi sua tay (thuong, tru khac, ghi chu): tinh lai vi cham cong doi thi
 * khong duoc phep xoa mat khoan thuong ke toan da nhap. Muon bo thi sua ve 0 bang tay.
 *
 * Tra ve so phieu da tinh.
 */
export async function tinh_ky_luong(ky_luong_id: string, thang: string): Promise<number> {
  const ts = await tham_so_cho_thang(thang);
  if (ts === null) {
    throw new Error(`Chưa khai tham số lương có hiệu lực cho tháng ${thang}.`);
  }
  const { tu, den } = khoang_thang(thang);

  // Ngay le theo TUNG LICH (vn/tq...): mot ngay co the la le o lich nay ma khong phai lich kia.
  // Nhan vien lam o VN dung lich VN, lam o TQ dung lich TQ (theo noi lam viec).
  const le = await truy_van<{ ngay: string; lich_ma: string }>(
    `select to_char(ngay, 'YYYY-MM-DD') as ngay, lich_ma from ngay_le
      where ngay >= $1 and ngay <= $2`,
    [tu, den],
  );
  const le_theo_lich = new Map<string, Set<string>>();
  for (const r of le) {
    const s = le_theo_lich.get(r.lich_ma) ?? new Set<string>();
    s.add(r.ngay);
    le_theo_lich.set(r.lich_ma, s);
  }
  const le_cua = (lich: string): Set<string> => le_theo_lich.get(lich) ?? new Set<string>();

  // Muc luong: uu tien quyet dinh luong moi nhat co hieu luc trong/truoc ky; khong co thi
  // lay luong ghi trong hop dong dang hieu luc. Thu viec -> 85% (xu ly o duoi).
  const ds = await truy_van<DongNhanVien>(
    `select nv.id                                            as nhan_vien_id,
            ql.luong_co_ban::float8                                as luong_ql,
            coalesce(ql.phu_cap, 0)::float8                        as phu_cap_ql,
            hd.luong_co_ban::float8                                as luong_hd,
            coalesce(cl.cac_ngay_lam, '{1,2,3,4,5}')               as cac_ngay_lam,
            coalesce(bc.so_cong, 0)::float8                        as so_cong,
            coalesce(bc.phut_ot, 0)::int                           as phut_ot,
            coalesce(pt.so_nguoi, 0)::int                          as so_nguoi_phu_thuoc,
            hd.loai                                               as loai_hop_dong,
            coalesce(nlv.lich_nghi_ma, 'vn')                      as lich_nghi_ma
       from nhan_vien nv
       left join ca_lam cl on cl.id = nv.ca_lam_id
       left join noi_lam_viec nlv on nlv.id = nv.noi_lam_viec_id
       left join lateral (
         select luong_co_ban, phu_cap from quyet_dinh_luong
          where nhan_vien_id = nv.id and hieu_luc_tu <= $2
          order by hieu_luc_tu desc limit 1
       ) ql on true
       left join lateral (
         select luong_co_ban, loai from hop_dong_lao_dong
          where nhan_vien_id = nv.id and trang_thai = 'hieu_luc'
            and hieu_luc_tu <= $2 and (hieu_luc_den is null or hieu_luc_den >= $1)
          order by hieu_luc_tu desc limit 1
       ) hd on true
       left join lateral (
         select sum(so_cong) as so_cong, sum(phut_ot) as phut_ot
           from bang_cong_ngay
          where nhan_vien_id = nv.id and ngay >= $1 and ngay <= $2
       ) bc on true
       left join lateral (
         select count(*) as so_nguoi from nguoi_phu_thuoc
          where nhan_vien_id = nv.id and da_dang_ky = true
            and (tu_thang is null or tu_thang <= $2)
            and (den_thang is null or den_thang >= $1)
       ) pt on true
      where nv.dang_hoat_dong = true
      order by nv.ma_nv`,
    [tu, den],
  );

  // Chinh sach phu cap con hieu luc trong ky, cua CA cong ty, doc mot lan.
  //
  // `distinct on`: mot nguoi co the co nhieu dong cho cung mot khoan (dong cu da dong lai, dong
  // moi mo ra). Lay dong co `hieu_luc_tu` moi nhat — cung quy tac voi `quyet_dinh_luong`.
  const chinh_sach = await truy_van<DongChinhSachDb>(
    `select distinct on (cs.nhan_vien_id, cs.khoan_ma)
            cs.nhan_vien_id, cs.khoan_ma, cs.nguon_so_luong,
            cs.so_luong::float8 as so_luong, cs.so_tien::float8 as so_tien,
            cs.don_gia::float8 as don_gia, d.cach_tinh
       from chinh_sach_phu_cap cs
       join khoan_luong d on d.ma = cs.khoan_ma
      where cs.hieu_luc_tu <= $2
        and (cs.hieu_luc_den is null or cs.hieu_luc_den >= $1)
      order by cs.nhan_vien_id, cs.khoan_ma, cs.hieu_luc_tu desc`,
    [tu, den],
  );
  const theo_nguoi = new Map<string, DongChinhSach[]>();
  for (const c of chinh_sach) {
    const ds_c = theo_nguoi.get(c.nhan_vien_id);
    const dong: DongChinhSach = {
      khoan_ma: c.khoan_ma,
      cach_tinh: c.cach_tinh,
      nguon_so_luong: c.nguon_so_luong,
      so_luong: c.so_luong,
      so_tien: c.so_tien,
      don_gia: c.don_gia,
    };
    if (ds_c === undefined) theo_nguoi.set(c.nhan_vien_id, [dong]); else ds_c.push(dong);
  }

  // ------------------------------------------------------------ ngay di muon cua ca cong ty
  // Doc mot lan moi ngay co gio vao trong ky, kem co / khong co don di muon da duyet gui truoc
  // han. Quy gio vao ve gio may cham cong (OFFSET_MAY_MS) roi phan tang o buoc tinh phat.
  const han_don = ts.cs.di_muon_han_don_phut;
  const han_don_chuoi =
    `${String(Math.floor(han_don / 60)).padStart(2, '0')}:${String(han_don % 60).padStart(2, '0')}`;
  const muon_ngay = ts.cs.di_muon.bat
    ? await truy_van<{ nhan_vien_id: string; gio_vao: Date; co_don: boolean }>(
        `select bc.nhan_vien_id, bc.gio_vao,
                exists(
                  select 1 from don_tu dt
                   where dt.nhan_vien_id = bc.nhan_vien_id
                     and dt.loai = 'di_muon' and dt.trang_thai = 'da_duyet'
                     and dt.tu_ngay = bc.ngay
                     and ((dt.tao_luc + make_interval(hours => $3))::time) <= $4::time
                ) as co_don
           from bang_cong_ngay bc
          where bc.ngay >= $1 and bc.ngay <= $2 and bc.gio_vao is not null`,
        [tu, den, cau_hinh.device_tz_offset_hours, han_don_chuoi],
      )
    : [];
  const muon_theo_nguoi = new Map<string, { phut_trong_ngay: number; co_don_truoc_han: boolean }[]>();
  for (const m of muon_ngay) {
    const dia = new Date(m.gio_vao.getTime() + OFFSET_MAY_MS);
    const phut = dia.getUTCHours() * 60 + dia.getUTCMinutes();
    const ds_m = muon_theo_nguoi.get(m.nhan_vien_id) ?? [];
    ds_m.push({ phut_trong_ngay: phut, co_don_truoc_han: m.co_don });
    muon_theo_nguoi.set(m.nhan_vien_id, ds_m);
  }

  await trong_giao_dich(async (khach) => {
    for (const nv of ds) {
      // Cong chuan CO DINH neu cong ty da khai; khong khai thi dem theo lich that CUA LICH
      // NGHI LE tuong ung noi lam viec (VN/TQ).
      const chuan = ts.cs.cong_chuan_thang > 0
        ? ts.cs.cong_chuan_thang
        : ngay_cong_chuan(tu, den, nv.cac_ngay_lam, le_cua(nv.lich_nghi_ma));

      // Muc luong ap dung. Thu viec (BLLD 2019 D.26): 85% luong cung (P1 luong co ban + P2
      // phu cap). HR nhap luong CHINH THUC mot lan o quyet_dinh_luong; thu viec tu tinh 85%.
      // Neu hop dong thu viec ghi thang mot muc luong -> coi la GHI DE, dung dung muc do.
      const official_base = nv.luong_ql ?? nv.luong_hd ?? 0;
      const official_pc = nv.phu_cap_ql;
      let luong_co_ban = official_base;
      let phu_cap = official_pc;
      if (nv.loai_hop_dong === 'thu_viec') {
        if (nv.luong_hd !== null) {
          luong_co_ban = nv.luong_hd; // ghi de tuong minh tren hop dong thu viec
          phu_cap = official_pc;
        } else {
          luong_co_ban = Math.round(official_base * ts.cs.ty_le_thu_viec);
          phu_cap = Math.round(official_pc * ts.cs.ty_le_thu_viec);
        }
      }

      // Doc lai phan nguoi da sua tay de khong ghi de len.
      const cu = await khach.query<{
        id: string; thuong: string; phu_cap_khac: string; tru_khac: string;
      }>(
        'select id, thuong, phu_cap_khac, tru_khac from phieu_luong where ky_luong_id = $1 and nhan_vien_id = $2',
        [ky_luong_id, nv.nhan_vien_id],
      );
      const phieu_cu = cu.rows[0];
      const thuong = Number(phieu_cu?.thuong ?? 0);
      const phu_cap_khac = Number(phieu_cu?.phu_cap_khac ?? 0);
      const tru_khac = Number(phieu_cu?.tru_khac ?? 0);

      // Phai co ID phieu TRUOC khi ap chinh sach, vi dong khoan tro ve phieu. Chua co thi tao
      // mot dong rong — cac con so duoc ghi o buoc cuoi, va ca vong nay nam trong mot giao
      // dich nen khong ai nhin thay trang thai giua chung.
      const phieu_id = phieu_cu?.id ?? (await khach.query<{ id: string }>(
        `insert into phieu_luong (ky_luong_id, nhan_vien_id) values ($1, $2)
         on conflict (ky_luong_id, nhan_vien_id)
           do update set ky_luong_id = excluded.ky_luong_id
         returning id`,
        [ky_luong_id, nv.nhan_vien_id],
      )).rows[0]!.id;

      // ---------------------------------------------------------- ap chinh sach phu cap
      //
      // Khoan nguoi dung GO TAY cho thang nay thang chinh sach: chinh sach khong sinh them
      // dong cho khoan da co dong go tay. Ghi de la ghi de, khong phai cong don.
      const go_tay = new Set(
        (await khach.query<{ khoan_ma: string }>(
          'select khoan_ma from phieu_luong_khoan where phieu_luong_id = $1 and tu_chinh_sach = false',
          [phieu_id],
        )).rows.map((r) => r.khoan_ma),
      );

      const sinh = khoan_tu_chinh_sach(
        theo_nguoi.get(nv.nhan_vien_id) ?? [],
        { so_cong: nv.so_cong },
        go_tay,
      );

      // ---- Phat di muon TU DONG: dua thanh dong khoan `tru_di_muon` / `tru_nua_ngay` (danh muc
      // da co san). Chay chung co che voi chinh sach phu cap: tat cong tac -> so_lan = 0 ->
      // dong tu dong nay bien mat o buoc delete duoi. Nguoi da GO TAY khoan do thi ton trong.
      const muon = tinh_phat_di_muon(muon_theo_nguoi.get(nv.nhan_vien_id) ?? [], ts.cs.di_muon);
      if (muon.so_lan_50k_phat > 0 && !go_tay.has('tru_di_muon')) {
        sinh.push({
          khoan_ma: 'tru_di_muon', so_luong: muon.so_lan_50k_phat,
          don_gia: ts.cs.di_muon.muc_50k, so_tien: muon.tien_50k,
        });
      }
      if (muon.so_lan_nua_ngay > 0 && !go_tay.has('tru_nua_ngay')) {
        // `nua_ngay_luong`: so tien tinh lai theo luong ngay o tinh_phieu_luong; day chi can so_luong.
        sinh.push({
          khoan_ma: 'tru_nua_ngay', so_luong: muon.so_lan_nua_ngay, don_gia: null, so_tien: 0,
        });
      }

      // Chinh sach het hieu luc / bi ghi de thi dong may sinh ra phai BIEN MAT, khong de lai
      // mot khoan khong con can cu nao.
      await khach.query(
        `delete from phieu_luong_khoan
          where phieu_luong_id = $1 and tu_chinh_sach = true and khoan_ma <> all($2::text[])`,
        [phieu_id, sinh.map((x) => x.khoan_ma)],
      );
      for (const s of sinh) {
        await khach.query(
          `insert into phieu_luong_khoan
             (phieu_luong_id, khoan_ma, so_luong, don_gia, thanh_tien, tu_chinh_sach)
           values ($1,$2,$3,$4,$5,true)
           on conflict (phieu_luong_id, khoan_ma) do update set
             so_luong = excluded.so_luong, don_gia = excluded.don_gia,
             thanh_tien = excluded.thanh_tien
           -- CO Y TRUNG voi go_tay o tren: khoan_tu_chinh_sach() da khong sinh dong cho khoan
           -- da go tay, nen menh de nay khong chan gi trong luong hien tai. No o day de rang
           -- buoc "khong de len so nguoi da go" nam o lop gan du lieu nhat — day la tien that.
           -- Bo MOT trong hai lop thi test van xanh; bo ca hai thi do.
           where phieu_luong_khoan.tu_chinh_sach = true`,
          [phieu_id, s.khoan_ma, s.so_luong, s.don_gia, s.so_tien],
        );
      }

      // Cac khoan cua phieu: doc lai het (ca dong go tay lan dong tu chinh sach), gop voi dac
      // ta trong danh muc de biet cach tinh. Khoan da tat trong danh muc (`dang_dung = false`)
      // van giu lai o phieu da co — tat mot khoan la de khong THEM moi nua, khong phai de xoa
      // khoan da tinh cho nguoi ta.
      const khoan = (await khach.query<{
        ma: string; loai: LoaiKhoan; cach_tinh: CachTinhKhoan;
        don_gia: string | null; don_gia_danh_muc: string | null;
        chiu_thue: boolean; so_luong: string | null; so_tien: string | null;
      }>(
        `select d.ma, d.loai, d.cach_tinh,
                k.don_gia, d.don_gia as don_gia_danh_muc, d.chiu_thue,
                k.so_luong, k.thanh_tien as so_tien
           from phieu_luong_khoan k
           join khoan_luong d on d.ma = k.khoan_ma
          where k.phieu_luong_id = $1
          order by d.thu_tu, k.khoan_ma`,
        [phieu_id],
      )).rows.map((r) => ({
        ma: r.ma,
        loai: r.loai,
        cach_tinh: r.cach_tinh,
        don_gia: r.don_gia === null ? null : Number(r.don_gia),
        don_gia_danh_muc: r.don_gia_danh_muc === null ? null : Number(r.don_gia_danh_muc),
        chiu_thue: r.chiu_thue,
        so_luong: r.so_luong === null ? null : Number(r.so_luong),
        so_tien: r.so_tien === null ? null : Number(r.so_tien),
      }));

      const kq = tinh_phieu_luong({
        luong_co_ban,
        phu_cap,
        so_ngay_cong_chuan: chuan,
        so_ngay_cong_thuc: nv.so_cong,
        phut_ot: nv.phut_ot,
        he_so_ot: 1.5,
        thuong,
        phu_cap_khac,
        so_nguoi_phu_thuoc: nv.so_nguoi_phu_thuoc,
        tru_khac,
        khoan,
        lam_tron_den: ts.cs.lam_tron_den,
      }, ts.ts);

      await khach.query(
        `update phieu_luong set
           luong_co_ban = $2, phu_cap = $3,
           so_ngay_cong_chuan = $4, so_ngay_cong_thuc = $5, phut_ot = $6, he_so_ot = $7,
           luong_theo_cong = $8, tien_ot = $9, thuong = $10, phu_cap_khac = $11,
           tong_thu_nhap = $12, muc_dong_bh = $13,
           bhxh_nld = $14, bhyt_nld = $15, bhtn_nld = $16,
           bhxh_nsdld = $17, bhyt_nsdld = $18, bhtn_nsdld = $19,
           so_nguoi_phu_thuoc = $20, giam_tru_tong = $21, thu_nhap_tinh_thue = $22,
           thue_tncn = $23, tru_khac = $24, tong_tru = $25, thuc_linh = $26,
           luong_ngay = $27, khoan_thu_nhap = $28, khoan_tru = $29, thu_nhap_mien_thue = $30,
           thuc_linh_lam_tron = $31, loai_hop_dong = $32, tinh_luc = now()
         where id = $1`,
        [
          phieu_id, luong_co_ban, phu_cap,
          chuan, nv.so_cong, nv.phut_ot, 1.5,
          kq.luong_theo_cong, kq.tien_ot, thuong, phu_cap_khac,
          kq.tong_thu_nhap, kq.muc_dong_bh,
          kq.bhxh_nld, kq.bhyt_nld, kq.bhtn_nld,
          kq.bhxh_nsdld, kq.bhyt_nsdld, kq.bhtn_nsdld,
          nv.so_nguoi_phu_thuoc, kq.giam_tru_tong, kq.thu_nhap_tinh_thue,
          kq.thue_tncn, tru_khac, kq.tong_tru, kq.thuc_linh,
          kq.luong_ngay, kq.khoan_thu_nhap, kq.khoan_tru, kq.thu_nhap_mien_thue,
          kq.thuc_linh_lam_tron, nv.loai_hop_dong,
        ],
      );

      // Ghi lai so tien tung khoan. Cac khoan tinh theo cong thuc (`so_luong_x_don_gia`,
      // `nua_ngay_luong`) doi so khi cham cong doi hoac khi luong doi, nen phai ghi lai —
      // de nguyen la de phieu va tong cua no lech nhau.
      for (const k of kq.cac_khoan) {
        await khach.query(
          `update phieu_luong_khoan set don_gia = $3, thanh_tien = $4
            where phieu_luong_id = $1 and khoan_ma = $2`,
          [phieu_id, k.ma, k.don_gia, k.thanh_tien],
        );
      }
    }

    await khach.query(
      'update ky_luong set tham_so_id = $2, cap_nhat_luc = now() where id = $1',
      [ky_luong_id, ts.id],
    );
  });

  return ds.length;
}
