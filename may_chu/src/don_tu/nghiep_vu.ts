// Nghiep vu cua bon loai don dung chung bang `don_tu`.
//
// Tach khoi tang route de kiem duoc bang CSDL that ma khong phai di qua HTTP, va de tang route
// chi con lam mot viec: doc dau vao roi goi vao day.
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { LoiDauVao, LoiKhongTim, LoiXungDot } from '../tien_ich/kiem_tra.ts';
import {
  canh_bao_bao_truoc, canh_bao_tran_ot, dac_ta, ngay_bao_truoc_toi_thieu, phut_lam_them,
  type DonTu, type MaLoaiDon,
} from './loai_don.ts';

/** Mot don khong dai hon the. Chan don "tu 2026 den 2030" do nhap sai. */
const NGAY_TOI_DA = 180;

export interface KetQuaTaoDon {
  id: string;
  loai: MaLoaiDon;
  trang_thai: string;
  /** Canh bao phap ly, khong chan. Hien cho nguoi lam don VA nguoi duyet. */
  canh_bao: string[];
}

// ---------------------------------------------------------------- canh bao

/** Tong phut lam them DA DUYET trong thang cua mot ngay (khong tinh don dang xet). */
async function phut_ot_da_duyet_trong_thang(
  nhan_vien_id: string, ngay: string, tru_don_id: string | null,
): Promise<number> {
  const thang = ngay.slice(0, 7);
  const dong = await truy_van<{ gio_bat_dau: string; gio_ket_thuc: string }>(
    `select gio_bat_dau::text as gio_bat_dau, gio_ket_thuc::text as gio_ket_thuc
       from don_tu
      where nhan_vien_id = $1 and loai = 'lam_them' and trang_thai = 'da_duyet'
        and to_char(tu_ngay, 'YYYY-MM') = $2
        and ($3::uuid is null or id <> $3::uuid)`,
    [nhan_vien_id, thang, tru_don_id],
  );
  return dong.reduce((t, d) => t + phut_lam_them({
    loai: 'lam_them', gio_bat_dau: d.gio_bat_dau, gio_ket_thuc: d.gio_ket_thuc,
  }), 0);
}

/**
 * Canh bao phap ly cho mot don. KHONG chan.
 *
 * Hai canh bao, hai dieu luat khac nhau:
 *   - `lam_them` -> BLLD 2019 Dieu 107: 40 gio mot thang.
 *   - `thoi_viec` -> BLLD 2019 Dieu 35.1: han bao truoc theo loai hop dong.
 *
 * Ca hai deu la CANH BAO chu khong phai chan, va ly do nam trong `loai_don.ts`: ca hai dieu
 * luat co ngoai le, va chan cung o day la chan sai trong nhung truong hop hop phap.
 */
export async function canh_bao_cho_don(
  nhan_vien_id: string, d: DonTu, tru_don_id: string | null = null,
): Promise<string[]> {
  const ra: string[] = [];

  if (d.loai === 'lam_them') {
    const da_co = await phut_ot_da_duyet_trong_thang(nhan_vien_id, d.tu_ngay, tru_don_id);
    const cb = canh_bao_tran_ot(da_co, phut_lam_them(d));
    if (cb !== null) ra.push(cb);
  }

  if (d.loai === 'thoi_viec') {
    // Hop dong DANG HIEU LUC gan nhat. Khong co thi khong doan mot con so phap ly.
    const hd = await truy_van_mot<{ loai: string; so_thang: number | null }>(
      `select loai,
              case when hieu_luc_den is null then null
                   else round((hieu_luc_den - hieu_luc_tu) / 30.0)::int end as so_thang
         from hop_dong_lao_dong
        where nhan_vien_id = $1 and trang_thai = 'hieu_luc'
        order by hieu_luc_tu desc limit 1`,
      [nhan_vien_id],
    );
    const toi_thieu = ngay_bao_truoc_toi_thieu(hd?.loai ?? null, hd?.so_thang ?? null);
    // Bao truoc tinh tu HOM NAY den ngay lam viec cuoi cung mong muon.
    const hom_nay = new Date().toISOString().slice(0, 10);
    const so_ngay = Math.round(
      (Date.parse(`${d.tu_ngay}T00:00:00Z`) - Date.parse(`${hom_nay}T00:00:00Z`)) / 86_400_000);
    const cb = canh_bao_bao_truoc(so_ngay, toi_thieu);
    if (cb !== null) ra.push(cb);
    if (hd === null) {
      ra.push('Không tìm thấy hợp đồng đang hiệu lực nên chưa tính được hạn báo trước theo '
        + 'BLLĐ 2019 Điều 35.1. Kiểm tra lại hồ sơ hợp đồng của nhân viên này.');
    }
  }

  return ra;
}

// ---------------------------------------------------------------- tao don

/**
 * Nhan vien tu lam don.
 *
 * Ba phep kiem truoc khi ghi, va ca ba deu tu mot nguyen tac: mot don da duoc duyet la mot
 * quyet dinh, nen khong de tao ra hai quyet dinh mau thuan cho cung mot ngay.
 */
export async function tao_don(nhan_vien_id: string, d: DonTu): Promise<KetQuaTaoDon> {
  const dt = dac_ta(d.loai);
  const den = d.den_ngay ?? d.tu_ngay;

  if (den < d.tu_ngay) throw new LoiDauVao('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.');
  const so_ngay = (Date.parse(`${den}T00:00:00Z`) - Date.parse(`${d.tu_ngay}T00:00:00Z`))
    / 86_400_000 + 1;
  if (so_ngay > NGAY_TOI_DA) {
    throw new LoiDauVao(`Một đơn không được dài hơn ${String(NGAY_TOI_DA)} ngày.`);
  }

  // 1. Cong tac doi trang thai ngay cong, nen khong duoc trum ngay DA CHOT bang cong. Cac loai
  //    khac khong doi bang cong nen khong can chan — chan bua chi lam nguoi dung khong lam
  //    duoc don OT cho mot ngay da chot ma khong hieu vi sao.
  if (d.loai === 'cong_tac') {
    const chot = await truy_van_mot<{ co: boolean }>(
      `select true as co from bang_cong_ngay
        where nhan_vien_id = $1 and ngay >= $2 and ngay <= $3 and da_chot = true limit 1`,
      [nhan_vien_id, d.tu_ngay, den],
    );
    if (chot !== null) {
      throw new LoiXungDot('Khoảng ngày này đã chốt bảng công. Đơn công tác sẽ không đổi được '
        + 'số công nữa, nên hãy liên hệ nhân sự.');
    }
  }

  // 2. Khong trum khoang voi mot don CUNG LOAI dang cho hay da duyet.
  const trung = await truy_van_mot<{ id: string }>(
    `select id from don_tu
      where nhan_vien_id = $1 and loai = $2
        and trang_thai in ('cho_duyet','da_duyet')
        and tu_ngay <= $4 and coalesce(den_ngay, tu_ngay) >= $3
      limit 1`,
    [nhan_vien_id, d.loai, d.tu_ngay, den],
  );
  if (trung !== null) {
    throw new LoiXungDot(
      `Đã có ${dt.ten.toLowerCase()} trùng khoảng ngày này (đang chờ duyệt hoặc đã duyệt).`);
  }

  // 3. Doi ca voi mot nguoi khong ton tai thi tu choi som, thay vi de khoa ngoai bao 500.
  if (d.doi_voi_id !== null) {
    const co = await truy_van_mot<{ id: string }>(
      'select id from nhan_vien where id = $1', [d.doi_voi_id]);
    if (co === null) throw new LoiDauVao('Người được đổi ca cùng không tồn tại.');
  }

  const dong = await truy_van_mot<{ id: string; trang_thai: string }>(
    `insert into don_tu(nhan_vien_id, loai, tu_ngay, den_ngay, gio_bat_dau, gio_ket_thuc,
                        doi_voi_id, ca_hien_tai_id, ca_moi_id, noi_den, ly_do)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     returning id, trang_thai`,
    [nhan_vien_id, d.loai, d.tu_ngay, dt.co_khoang_ngay ? d.den_ngay : null,
      d.gio_bat_dau, d.gio_ket_thuc, d.doi_voi_id, d.ca_hien_tai_id, d.ca_moi_id,
      d.noi_den, d.ly_do],
  );

  return {
    id: String(dong?.id ?? ''),
    loai: d.loai,
    trang_thai: String(dong?.trang_thai ?? 'cho_duyet'),
    canh_bao: await canh_bao_cho_don(nhan_vien_id, d),
  };
}

// ---------------------------------------------------------------- doc

export interface DongDonTu extends DonTu {
  id: string;
  nhan_vien_id: string;
  trang_thai: string;
  ghi_chu_duyet: string | null;
  tao_luc: string;
  quyet_luc: string | null;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  chuc_danh: string | null;
  nguoi_duyet: string | null;
  doi_voi_ten: string | null;
  ca_hien_tai_ten: string | null;
  ca_moi_ten: string | null;
}

const CHON = `
  d.id, d.nhan_vien_id, d.loai, d.trang_thai, d.ghi_chu_duyet, d.noi_den, d.ly_do,
  d.doi_voi_id, d.ca_hien_tai_id, d.ca_moi_id,
  to_char(d.tu_ngay, 'YYYY-MM-DD') as tu_ngay,
  to_char(d.den_ngay, 'YYYY-MM-DD') as den_ngay,
  d.gio_bat_dau::text as gio_bat_dau, d.gio_ket_thuc::text as gio_ket_thuc,
  to_char(d.tao_luc, 'YYYY-MM-DD"T"HH24:MI:SSOF') as tao_luc,
  to_char(d.quyet_luc, 'YYYY-MM-DD"T"HH24:MI:SSOF') as quyet_luc,
  nv.ma_nv, nv.ho_ten, pb.ten as phong_ban, nv.chuc_danh,
  nd.ten_dang_nhap as nguoi_duyet,
  dv.ho_ten as doi_voi_ten,
  ch.ten as ca_hien_tai_ten, cm.ten as ca_moi_ten
`;

const TU_BANG = `
  from don_tu d
  join nhan_vien nv on nv.id = d.nhan_vien_id
  left join phong_ban pb on pb.id = nv.phong_ban_id
  left join nguoi_dung nd on nd.id = d.nguoi_duyet_id
  left join nhan_vien dv on dv.id = d.doi_voi_id
  left join ca_lam ch on ch.id = d.ca_hien_tai_id
  left join ca_lam cm on cm.id = d.ca_moi_id
`;

/** Don cua chinh mot nhan vien. */
export async function don_cua_nhan_vien(
  nhan_vien_id: string, loai: MaLoaiDon | null,
): Promise<DongDonTu[]> {
  return truy_van<DongDonTu>(
    `select ${CHON} ${TU_BANG}
      where d.nhan_vien_id = $1 and ($2::text is null or d.loai = $2)
      order by d.tao_luc desc limit 200`,
    [nhan_vien_id, loai],
  );
}

/** Danh sach cho nguoi duyet. `chi_phong` = null nghia la xem duoc tat ca. */
export async function don_cho_nguoi_duyet(
  trang_thai: string, loai: MaLoaiDon | null, chi_phong: string | null,
): Promise<DongDonTu[]> {
  return truy_van<DongDonTu>(
    `select ${CHON} ${TU_BANG}
      where d.trang_thai = $1
        and ($2::text is null or d.loai = $2)
        and ($3::uuid is null
             or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $3::uuid))
      order by case when d.trang_thai = 'cho_duyet' then 0 else 1 end, d.tao_luc desc
      limit 300`,
    [trang_thai, loai, chi_phong],
  );
}

export async function don_theo_id(id: string): Promise<DongDonTu | null> {
  return truy_van_mot<DongDonTu>(`select ${CHON} ${TU_BANG} where d.id = $1`, [id]);
}

// ---------------------------------------------------------------- quyet

export interface KetQuaQuyet {
  loai: MaLoaiDon;
  /** Khoang ngay phai tinh lai bang cong, khi loai don co anh huong. */
  tinh_lai: { tu_ngay: string; den_ngay: string } | null;
}

/**
 * Duyet hoac tu choi. Tra ve khoang ngay can tinh lai bang cong (neu co).
 *
 * `cong_tac` la loai DUY NHAT trong bon loai nay doi bang cong — mot ngay cong tac da duyet
 * chuyen tu `vang` sang `cong_tac` va duoc mot cong. Ba loai con lai khong doi gi:
 *
 *   `lam_them`  — la DANG KY TRUOC. So phut OT tren bang cong van tinh tu lan quet that, nen
 *                 duyet mot don OT khong tu nhien tao ra gio OT. Neu sau nay ban muon "chi
 *                 tinh OT da dang ky" thi do la mot quyet dinh khac va phai noi ra, vi no doi
 *                 cach tinh tien.
 *   `doi_ca`    — doi ca lam la viec cua nhan su tren ho so nhan vien; don chi la de nghi.
 *   `thoi_viec` — ngay nghi viec do nhan su ghi vao `nhan_vien.ngay_nghi_viec`.
 *
 * Ba dong tren la ranh gioi CO Y: don la de nghi va la ban ghi, khong phai lenh tu dong sua
 * du lieu goc. Mot don duyet nham ma tu sua ho so thi khong ai lan lai duoc.
 */
export async function quyet_don(
  id: string, quyet: 'da_duyet' | 'tu_choi', nguoi_duyet_id: string, ghi_chu: string | null,
): Promise<KetQuaQuyet> {
  const d = await don_theo_id(id);
  if (d === null) throw new LoiKhongTim('Không tìm thấy đơn.');
  if (d.trang_thai !== 'cho_duyet') {
    throw new LoiDauVao(`Đơn đã ở trạng thái "${d.trang_thai}", không thể quyết lại.`);
  }

  await thuc_thi(
    `update don_tu
        set trang_thai = $2, nguoi_duyet_id = $3, ghi_chu_duyet = $4, quyet_luc = now()
      where id = $1 and trang_thai = 'cho_duyet'`,
    [id, quyet, nguoi_duyet_id, ghi_chu],
  );

  return {
    loai: d.loai,
    tinh_lai: d.loai === 'cong_tac'
      ? { tu_ngay: d.tu_ngay, den_ngay: d.den_ngay ?? d.tu_ngay }
      : null,
  };
}

/** Nhan vien tu huy don CUA MINH. Tra ve khoang ngay can tinh lai neu co. */
export async function huy_don(
  id: string, nhan_vien_id: string,
): Promise<{ tinh_lai: { tu_ngay: string; den_ngay: string } | null }> {
  const d = await truy_van_mot<{
    loai: MaLoaiDon; trang_thai: string; tu_ngay: string; den_ngay: string | null;
  }>(
    `select loai, trang_thai, to_char(tu_ngay, 'YYYY-MM-DD') as tu_ngay,
            to_char(den_ngay, 'YYYY-MM-DD') as den_ngay
       from don_tu where id = $1 and nhan_vien_id = $2`,
    [id, nhan_vien_id],
  );
  if (d === null) throw new LoiKhongTim('Không tìm thấy đơn của bạn.');
  if (d.trang_thai === 'da_huy') return { tinh_lai: null };
  if (d.trang_thai === 'tu_choi') throw new LoiDauVao('Đơn đã bị từ chối, không cần hủy.');

  await thuc_thi(
    `update don_tu set trang_thai = 'da_huy', quyet_luc = now() where id = $1`, [id]);

  // Don cong tac DA DUYET bi huy -> ngay do khong con la ngay cong tac, phai tinh lai.
  return {
    tinh_lai: d.trang_thai === 'da_duyet' && d.loai === 'cong_tac'
      ? { tu_ngay: d.tu_ngay, den_ngay: d.den_ngay ?? d.tu_ngay }
      : null,
  };
}

/** Dem don dang cho duyet, theo loai. Cho o dem tren giao dien. */
export async function dem_cho_duyet(chi_phong: string | null): Promise<Record<string, number>> {
  const dong = await truy_van<{ loai: string; so: number }>(
    `select d.loai, count(*)::int as so
       from don_tu d
       join nhan_vien nv on nv.id = d.nhan_vien_id
      where d.trang_thai = 'cho_duyet'
        and ($1::uuid is null
             or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $1::uuid))
      group by d.loai`,
    [chi_phong],
  );
  return Object.fromEntries(dong.map((d) => [d.loai, d.so]));
}
