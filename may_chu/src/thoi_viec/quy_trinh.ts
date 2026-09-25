// Quy trinh thoi viec: sinh tu don da duyet, phat sinh checklist + ban giao, va doc du lieu.
//
// Mot don thoi viec DUY NHAT mot quy trinh (unique don_tu_id). Sinh lai thi `on conflict`
// bo qua — khong bao gio co hai quy trinh chay song song cho cung mot nguoi theo cung mot don.
import type { PoolClient } from 'pg';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { id_tai_khoan_he_thong } from '../bao_mat/tai_khoan_he_thong.ts';

/** Mot muc trong checklist cua quy trinh. */
export interface DongMucThoiViec {
  id: string;
  quy_trinh_id: string;
  ma_muc: string;
  nhom: string;
  loai_tu_dong: 'nhan_vien' | 'tu_dong' | 'script_cuoi';
  tieu_de: string;
  bat_buoc: boolean;
  trang_thai: 'chua' | 'dang' | 'xong' | 'bo_qua';
  bang_chung_tep_id: string | null;
  bang_chung_ten_goc: string | null;
  ket_qua: unknown;
  xac_nhan_boi: string | null;
  xac_nhan_luc: string | null;
  ghi_chu: string | null;
}

/** Mot muc ban giao cua mot ban giao. */
export interface DongBanGiaoMuc {
  id: string;
  ban_giao_id: string;
  mo_ta: string;
  bat_buoc: boolean;
  trang_thai: 'chua' | 'da_ban_giao';
  nguoi_xac_nhan_id: string | null;
  nguoi_xac_nhan_ten: string | null;
  xac_nhan_luc: string | null;
  ghi_chu: string | null;
}

/** Mot ban giao cua quy trinh. */
export interface DongBanGiao {
  id: string;
  quy_trinh_id: string;
  bien_ban_tep_id: string | null;
  bien_ban_ten_goc: string | null;
  nguoi_nhan_id: string | null;
  nguoi_nhan_ten: string | null;
  ky_nguoi_giao_id: string | null;
  ky_nguoi_giao_ten: string | null;
  ky_nguoi_giao_luc: string | null;
  ky_nguoi_nhan_id: string | null;
  ky_nguoi_nhan_ten: string | null;
  ky_nguoi_nhan_luc: string | null;
  muc: DongBanGiaoMuc[];
}

/** Mot dong quy trinh thoi viec, kem thong tin nhan vien + don. */
export interface DongQuyTrinh {
  id: string;
  don_tu_id: string;
  nhan_vien_id: string;
  loai_hop_dong: string;
  chuc_danh: string | null;
  ngay_lam_viec_cuoi: string | null;
  lastday_da_chot: boolean;
  khong_can_bao_truoc: boolean;
  la_quan_ly_dn: boolean;
  trang_thai: string;
  ly_do_nghi: string | null;
  admin_duyet1_id: string | null;
  admin_duyet1_ten: string | null;
  admin_duyet1_luc: string | null;
  admin_duyet2_id: string | null;
  admin_duyet2_ten: string | null;
  admin_duyet2_luc: string | null;
  tao_luc: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  muc: DongMucThoiViec[];
  ban_giao: DongBanGiao[];
}

const CHON_QT = `
  qt.id, qt.don_tu_id, qt.nhan_vien_id, qt.loai_hop_dong, qt.chuc_danh,
  to_char(qt.ngay_lam_viec_cuoi, 'YYYY-MM-DD') as ngay_lam_viec_cuoi,
  qt.lastday_da_chot, qt.khong_can_bao_truoc, qt.la_quan_ly_dn, qt.trang_thai,
  qt.ly_do_nghi, qt.admin_duyet1_id, qt.admin_duyet1_luc,
  qt.admin_duyet2_id, qt.admin_duyet2_luc,
  to_char(qt.tao_luc, 'YYYY-MM-DD"T"HH24:MI:SSOF') as tao_luc,
  nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
  nd1.ten_dang_nhap as admin_duyet1_ten,
  nd2.ten_dang_nhap as admin_duyet2_ten
`;

/** Loai hop dong DANG HIEU LUC gan nhat cua nhan vien — chup luc sinh quy trinh. */
async function loai_hop_dong_hien_hanh(
  khach: PoolClient,
  nhan_vien_id: string,
): Promise<{ loai: string; so_thang: number | null }> {
  const hd = await khach.query<{ loai: string; so_thang: number | null }>(
    `select loai,
            case when hieu_luc_den is null then null
                 else round((hieu_luc_den - hieu_luc_tu) / 30.0)::int end as so_thang
       from hop_dong_lao_dong
      where nhan_vien_id = $1 and trang_thai = 'hieu_luc'
      order by hieu_luc_tu desc limit 1`,
    [nhan_vien_id],
  );
  // Khong co hop dong hieu luc: dung khuon chat nhat (khong xac dinh thoi han) de checklist
  // khong thieu muc bat buoc — con thieu hop dong thi muc kiem_tra_bao_truoc se canh bao.
  return hd.rows[0] ?? { loai: 'khong_xac_dinh', so_thang: null };
}

/** Chuc danh co phai nguoi quan ly doanh nghiep khong (D.7 ND145/2020). */
function la_quan_ly_dn_cua(chuc_danh: string | null): boolean {
  if (chuc_danh === null) return false;
  return /giám đốc|tổng giám|quản lý|trưởng phòng|phó giám/i.test(chuc_danh);
}

/**
 * Sinh quy trinh thoi viec cho mot don THOI VIEC DA DUYET, kem checklist tu khuon va ban
 * giao theo chuc danh. PHAI chay TRONG transaction cua nguoi goi.
 *
 * Tra id quy trinh (moi hoac da co). `on conflict` chong trung: mot don chi mot quy trinh.
 */
export async function sinh_quy_trinh_thoi_viec(
  khach: PoolClient,
  don_tu_id: string,
  nguoi_duyet_id: string | null = null,
): Promise<string | null> {
  const don = await khach.query<{
    nhan_vien_id: string; tu_ngay: string; ly_do: string | null; chuc_danh: string | null;
  }>(
    `select d.nhan_vien_id, to_char(d.tu_ngay, 'YYYY-MM-DD') as tu_ngay, d.ly_do,
            nv.chuc_danh
       from don_tu d
       join nhan_vien nv on nv.id = d.nhan_vien_id
      where d.id = $1 and d.loai = 'thoi_viec' and d.trang_thai = 'da_duyet'`,
    [don_tu_id],
  );
  const d = don.rows[0];
  if (d === undefined) return null;

  const hd = await loai_hop_dong_hien_hanh(khach, d.nhan_vien_id);
  const quan_ly = la_quan_ly_dn_cua(d.chuc_danh);

  const qt = await khach.query<{ id: string }>(
    `insert into quy_trinh_thoi_viec
       (don_tu_id, nhan_vien_id, loai_hop_dong, chuc_danh, ngay_lam_viec_cuoi,
        ly_do_nghi, la_quan_ly_dn, admin_duyet1_id, admin_duyet1_luc)
     values ($1,$2,$3,$4,$5,$6,$7,$8,
             case when $8::uuid is null then null else now() end)
     on conflict (don_tu_id) do nothing
     returning id`,
    [don_tu_id, d.nhan_vien_id, hd.loai, d.chuc_danh, d.tu_ngay, d.ly_do, quan_ly,
      nguoi_duyet_id],
  );
  let quy_trinh_id = qt.rows[0]?.id;
  if (quy_trinh_id === undefined) {
    const cu = await khach.query<{ id: string }>(
      'select id from quy_trinh_thoi_viec where don_tu_id = $1', [don_tu_id]);
    quy_trinh_id = cu.rows[0]?.id;
    if (quy_trinh_id === undefined) return null;
  }

  // Phat sinh checklist theo loai hop dong da chup.
  await khach.query(
    `insert into muc_checklist (quy_trinh_id, ma_muc, nhom, loai_tu_dong, bat_buoc, tieu_de)
     select $1, ma_muc, nhom, loai_tu_dong, bat_buoc, tieu_de
       from khuon_checklist
      where loai_hop_dong = $2
      order by thu_tu
     on conflict (quy_trinh_id, ma_muc) do nothing`,
    [quy_trinh_id, hd.loai],
  );

  // Phat sinh ban giao theo chuc danh (khuon ban giao). Khong trung mo_ta trong mot ban giao.
  let ban_giao_id = (await khach.query<{ id: string }>(
    'select id from ban_giao where quy_trinh_id = $1 limit 1', [quy_trinh_id])).rows[0]?.id;
  if (ban_giao_id === undefined) {
    const bg = await khach.query<{ id: string }>(
      'insert into ban_giao (quy_trinh_id) values ($1) returning id', [quy_trinh_id]);
    ban_giao_id = bg.rows[0]?.id;
  }
  if (ban_giao_id !== undefined) {
    const chuc = (d.chuc_danh ?? '').trim().toLowerCase();
    const dong = await khach.query<{ so: number }>(
      `with khuon as (
         select mo_ta, min(thu_tu) as thu_tu
           from khuon_ban_giao
          where $2 <> '' and $2 like '%' || chuc_danh || '%'
          group by mo_ta
       )
       insert into ban_giao_muc (ban_giao_id, mo_ta, bat_buoc)
       select $1, mo_ta, true from khuon order by thu_tu
       on conflict (ban_giao_id, mo_ta) do nothing`,
      [ban_giao_id, chuc],
    );
    if (dong.rowCount === 0) {
      // Khong khuon nao khop chuc danh: ban giao mac dinh hai muc chung.
      await khach.query(
        `insert into ban_giao_muc (ban_giao_id, mo_ta, bat_buoc) values
           ($1, 'Công việc đang phụ trách', true),
           ($1, 'Tài khoản và quyền truy cập đang dùng', true)
         on conflict (ban_giao_id, mo_ta) do nothing`,
        [ban_giao_id],
      );
    }
  }

  return quy_trinh_id;
}

/** Muc checklist cua mot quy trinh, theo thu tu khuon. */
export async function muc_cua_quy_trinh(quy_trinh_id: string): Promise<DongMucThoiViec[]> {
  return truy_van<DongMucThoiViec>(
    `select m.id, m.quy_trinh_id, m.ma_muc, m.nhom, m.loai_tu_dong, m.tieu_de, m.bat_buoc,
            m.trang_thai, m.bang_chung_tep_id, t.ten_goc as bang_chung_ten_goc,
            m.ket_qua, m.xac_nhan_boi, m.xac_nhan_luc, m.ghi_chu
       from muc_checklist m
       join quy_trinh_thoi_viec q on q.id = m.quy_trinh_id
       left join ho_so_tep t on t.id = m.bang_chung_tep_id
      where m.quy_trinh_id = $1
      order by (select k.thu_tu from khuon_checklist k
                 where k.loai_hop_dong = q.loai_hop_dong and k.ma_muc = m.ma_muc), m.ma_muc`,
    [quy_trinh_id],
  );
}

/** Ban giao + muc ban giao cua mot quy trinh. */
export async function ban_giao_cua_quy_trinh(quy_trinh_id: string): Promise<DongBanGiao[]> {
  const ds = await truy_van<Omit<DongBanGiao, 'muc'> & { muc_ban_giao: never }>(
    `select bg.id, bg.quy_trinh_id, bg.bien_ban_tep_id, t.ten_goc as bien_ban_ten_goc,
            bg.nguoi_nhan_id, ndn.ten_dang_nhap as nguoi_nhan_ten,
            bg.ky_nguoi_giao_id, ndg.ten_dang_nhap as ky_nguoi_giao_ten,
            to_char(bg.ky_nguoi_giao_luc, 'YYYY-MM-DD"T"HH24:MI:SSOF') as ky_nguoi_giao_luc,
            bg.ky_nguoi_nhan_id, ndk.ten_dang_nhap as ky_nguoi_nhan_ten,
            to_char(bg.ky_nguoi_nhan_luc, 'YYYY-MM-DD"T"HH24:MI:SSOF') as ky_nguoi_nhan_luc
       from ban_giao bg
       left join ho_so_tep t on t.id = bg.bien_ban_tep_id
       left join nguoi_dung ndn on ndn.id = bg.nguoi_nhan_id
       left join nguoi_dung ndg on ndg.id = bg.ky_nguoi_giao_id
       left join nguoi_dung ndk on ndk.id = bg.ky_nguoi_nhan_id
      where bg.quy_trinh_id = $1`,
    [quy_trinh_id],
  );
  const ra: DongBanGiao[] = [];
  for (const d of ds) {
    const muc = await truy_van<DongBanGiaoMuc>(
      `select bgm.id, bgm.ban_giao_id, bgm.mo_ta, bgm.bat_buoc, bgm.trang_thai,
              bgm.nguoi_xac_nhan_id, nd.ten_dang_nhap as nguoi_xac_nhan_ten,
              to_char(bgm.xac_nhan_luc, 'YYYY-MM-DD"T"HH24:MI:SSOF') as xac_nhan_luc,
              bgm.ghi_chu
         from ban_giao_muc bgm
         left join nguoi_dung nd on nd.id = bgm.nguoi_xac_nhan_id
        where bgm.ban_giao_id = $1
        order by bgm.mo_ta`,
      [d.id],
    );
    ra.push({ ...d, muc });
  }
  return ra;
}

/** Chi tiet mot quy trinh — dung cho ca trang admin lan trang nhan vien. */
export async function quy_trinh_theo_id(id: string): Promise<DongQuyTrinh | null> {
  const qt = await truy_van_mot<DongQuyTrinh>(
    `select ${CHON_QT}
       from quy_trinh_thoi_viec qt
       join nhan_vien nv on nv.id = qt.nhan_vien_id
       left join phong_ban pb on pb.id = nv.phong_ban_id
       left join nguoi_dung nd1 on nd1.id = qt.admin_duyet1_id
       left join nguoi_dung nd2 on nd2.id = qt.admin_duyet2_id
      where qt.id = $1`,
    [id],
  );
  if (qt === null) return null;
  const [muc, ban_giao] = await Promise.all([
    muc_cua_quy_trinh(id),
    ban_giao_cua_quy_trinh(id),
  ]);
  return { ...qt, muc, ban_giao };
}

/** Danh sach quy trinh cho admin, loc theo trang thai. */
export async function danh_sach_quy_trinh(
  trang_thai: string | null,
  tim: string | null,
): Promise<DongQuyTrinh[]> {
  const dong = await truy_van<Omit<DongQuyTrinh, 'muc' | 'ban_giao'>>(
    `select ${CHON_QT}
       from quy_trinh_thoi_viec qt
       join nhan_vien nv on nv.id = qt.nhan_vien_id
       left join phong_ban pb on pb.id = nv.phong_ban_id
       left join nguoi_dung nd1 on nd1.id = qt.admin_duyet1_id
       left join nguoi_dung nd2 on nd2.id = qt.admin_duyet2_id
      where ($1::text is null or qt.trang_thai = $1)
        and ($2::text is null
             or nv.ho_ten ilike '%' || $2 || '%' or nv.ma_nv ilike '%' || $2 || '%')
      order by case qt.trang_thai
                 when 'dang_thuc_hien' then 0
                 when 'san_sang_chot' then 1
                 else 2 end,
               qt.tao_luc desc
      limit 300`,
    [trang_thai, tim],
  );
  return dong.map((d) => ({ ...d, muc: [], ban_giao: [] }));
}

/** Quy trinh cua mot nhan vien — dung cho trang ca nhan va widget. */
export async function quy_trinh_cua_nhan_vien(nhan_vien_id: string): Promise<string[]> {
  const dong = await truy_van<{ id: string }>(
    `select id from quy_trinh_thoi_viec
      where nhan_vien_id = $1 and trang_thai in ('dang_thuc_hien','san_sang_chot')
      order by tao_luc desc limit 5`,
    [nhan_vien_id],
  );
  return dong.map((d) => d.id);
}

/** Quy trinh dang mo cua mot nhan vien theo don thoi viec (bat ky trang thai). */
export async function quy_trinh_theo_don(don_tu_id: string): Promise<string | null> {
  const qt = await truy_van_mot<{ id: string }>(
    'select id from quy_trinh_thoi_viec where don_tu_id = $1', [don_tu_id]);
  return qt?.id ?? null;
}

/**
 * REQ-MIG-01 (hoi to): dam bao quy trinh thoi viec TON TAI cho mot Quyet dinh nghi viec da
 * phat hanh tren he van ban AI. Neu chua co don `thoi_viec` thi tao don da_duyet (tai khoan
 * he thong), neu chua co quy trinh thi sinh + chot lastday theo QD + bo qua muc `nhan_vien`
 * (khong truy thu thu tuc cua nguoi da lam truoc ngay co quy trinh). PHAI chay trong
 * transaction cua nguoi goi.
 */
export async function dam_bao_quy_trinh_tu_qd(
  khach: PoolClient, nhan_vien_id: string, ngay_nghi_viec: string,
): Promise<{ quy_trinh_id: string | null; tao_moi_don: boolean; tao_moi_qt: boolean }> {
  const don = await khach.query<{ id: string }>(
    `select id from don_tu
      where nhan_vien_id = $1 and loai = 'thoi_viec'
        and trang_thai in ('cho_duyet','da_duyet') and tu_ngay = $2::date
      limit 1`,
    [nhan_vien_id, ngay_nghi_viec],
  );
  let don_id = don.rows[0]?.id;
  let tao_moi_don = false;
  if (don_id === undefined) {
    tao_moi_don = true;
    const nd_he_thong = await id_tai_khoan_he_thong();
    const kq = await khach.query<{ id: string }>(
      `insert into don_tu(nhan_vien_id, loai, tu_ngay, trang_thai, ly_do, nguoi_duyet_id,
                          quyet_luc)
       values ($1,'thoi_viec',$2::date,'da_duyet','Hồi tố từ Quyết định nghỉ việc trên '
               || 'hệ văn bản', $3, now())
       returning id`,
      [nhan_vien_id, ngay_nghi_viec, nd_he_thong],
    );
    don_id = kq.rows[0]?.id;
  }
  if (don_id === undefined) return { quy_trinh_id: null, tao_moi_don, tao_moi_qt: false };

  const co = await khach.query<{ id: string }>(
    'select id from quy_trinh_thoi_viec where don_tu_id = $1', [don_id]);
  if (co.rows[0] !== undefined) {
    return { quy_trinh_id: co.rows[0].id, tao_moi_don, tao_moi_qt: false };
  }

  const qt_id = await sinh_quy_trinh_thoi_viec(khach, don_id, null);
  if (qt_id === null) return { quy_trinh_id: null, tao_moi_don, tao_moi_qt: false };
  // QD da an dinh ngay — coi nhu lastday da chot; cac muc nhan_vien bo qua vi khong the
  // doi nguoi da nghi truoc ngay co he thong lam lai thu tuc. Admin van phai bam Cong 2.
  await khach.query(
    'update quy_trinh_thoi_viec set lastday_da_chot = true where id = $1', [qt_id]);
  await khach.query(
    `update muc_checklist
        set trang_thai = 'bo_qua',
            ghi_chu = 'Hồi tố từ Quyết định nghỉ việc — không truy thu thủ tục'
      where quy_trinh_id = $1 and loai_tu_dong = 'nhan_vien'`,
    [qt_id],
  );
  return { quy_trinh_id: qt_id, tao_moi_don, tao_moi_qt: true };
}

/**
 * Chuyen `dang_thuc_hien -> san_sang_chot` khi moi muc bat buoc PHI SCRIPT da xong/bo_qua.
 * Muc `script_cuoi` chay TRONG Cong 2 nen khong duoc tinh vao dieu kien nay — no khong
 * the xong truoc khi Admin bam chay. Bat bien REQ-QT-03 van giu o tang CSDL.
 * Tra true neu da chuyen.
 */
export async function chuyen_san_sang_chot(khach: PoolClient, quy_trinh_id: string): Promise<boolean> {
  const kq = await khach.query(
    `update quy_trinh_thoi_viec qt
        set trang_thai = 'san_sang_chot', cap_nhat_luc = now()
      where qt.id = $1 and qt.trang_thai = 'dang_thuc_hien'
        and not exists (
          select 1 from muc_checklist m
           where m.quy_trinh_id = qt.id and m.bat_buoc
             and m.loai_tu_dong <> 'script_cuoi'
             and m.trang_thai not in ('xong','bo_qua')
        )`,
    [quy_trinh_id],
  );
  return (kq.rowCount ?? 0) > 0;
}

/** So quy trinh toi ngay nghi ma chua khoa — cham do tren dashboard Admin. */
export async function dem_den_han_chua_khoa(hom_nay: string): Promise<number> {
  const d = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so
       from quy_trinh_thoi_viec
      where trang_thai in ('dang_thuc_hien','san_sang_chot')
        and ngay_lam_viec_cuoi is not null
        and ngay_lam_viec_cuoi <= $1::date`,
    [hom_nay],
  );
  return d?.so ?? 0;
}

// ---------------------------------------------------------------- cau hinh admin sua duoc

export interface CauHinhThoiViec {
  email_dich_vu_bhxh: string;
  email_dich_vu_bhxh_cc: string;
  email_chung_tu_thue: string;
}

/**
 * Doc cau hinh quy trinh thoi viec: bang `cau_hinh_thoi_viec` UU TIEN hon env — admin
 * sua trong app, khong can deploy. Env la gia tri mac dinh ban dau.
 */
export async function doc_cau_hinh_thoi_viec(): Promise<CauHinhThoiViec> {
  const dong = await truy_van<{ khoa: string; gia_tri: string }>(
    'select khoa, gia_tri from cau_hinh_thoi_viec');
  const theo_khoa = new Map(dong.map((d) => [d.khoa, d.gia_tri]));
  const lay = (khoa: string, env: string): string => {
    const v = theo_khoa.get(khoa);
    if (v !== undefined && v !== '') return v.trim();
    return env.trim();
  };
  return {
    email_dich_vu_bhxh: lay('email_dich_vu_bhxh', cau_hinh.thoi_viec.email_dich_vu_bhxh),
    email_dich_vu_bhxh_cc: lay('email_dich_vu_bhxh_cc', cau_hinh.thoi_viec.email_dich_vu_bhxh_cc),
    email_chung_tu_thue: lay('email_chung_tu_thue', cau_hinh.thoi_viec.email_chung_tu_thue),
  };
}

/** Khuon han bao truoc (admin sua duoc bang route, khong can deploy). */
export async function doc_khuon_han_bao_truoc(): Promise<Record<string, number | null>> {
  const dong = await truy_van<{ loai_hop_dong: string; so_ngay: number | null }>(
    'select loai_hop_dong, so_ngay from khuon_han_bao_truoc');
  return Object.fromEntries(dong.map((d) => [d.loai_hop_dong, d.so_ngay]));
}

/** Cap nhat mot khoa cau hinh thoi viec (chi admin goi). */
export async function dat_cau_hinh_thoi_viec(khoa: string, gia_tri: string): Promise<void> {
  await thuc_thi(
    `insert into cau_hinh_thoi_viec (khoa, gia_tri) values ($1, $2)
     on conflict (khoa) do update set gia_tri = excluded.gia_tri`,
    [khoa, gia_tri],
  );
}

/** Cap nhat nguong bao truoc cua mot loai hop dong. */
export async function dat_han_bao_truoc(
  loai_hop_dong: string, so_ngay: number | null,
): Promise<void> {
  await thuc_thi(
    `insert into khuon_han_bao_truoc (loai_hop_dong, so_ngay, ghi_chu)
     values ($1, $2, 'Admin chỉnh trong ứng dụng')
     on conflict (loai_hop_dong) do update set so_ngay = excluded.so_ngay`,
    [loai_hop_dong, so_ngay],
  );
}
