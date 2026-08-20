// Dong bo kho tep ho so sang thu vien HCNS tren SharePoint. MOT CHIEU, xoa lan theo.
//
// CACH LAM LA "SAN BANG HAI COT", KHONG PHAI "CHAY MOT HANG DOI". Bang `sharepoint_tep` giu
// hai cot: tep NEN o duong dan nao (`duong_dan_muon`), va tep DANG o duong dan nao
// (`duong_dan_da_day`). Moi vong quet chi lam mot viec: cho hai cot bang nhau.
//
// Vi sao khong dung hang doi — day la ly do that, khong phai so thich:
//
//   Co BON cho doi duoc ma_nv hay ho_ten (nhan su sua tay, nhap CSV, dong bo ERP, API
//   /api/v1). Ma_nv doi thi ten thu muc doi, tuc la duong dan mong muon doi. Voi hang doi,
//   mot cho quen phat su kien la mot tep nam sai cho VINH VIEN va khong ai biet. Voi hai cot
//   thi lan quet hang ngay tu tim ra, va lech toi da mot ngay.
//
// Va vi the: chay lai bao nhieu lan cung cho cung mot ket qua. Khong co viec "lam hai lan".
import { cau_hinh } from '../cau_hinh.ts';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { doc_tep_ho_so } from '../tien_ich/luu_tep.ts';
import {
  NHAN_LOAI, NHAN_TAI_LIEU, duong_dan_ban_chot_sharepoint, duong_dan_sharepoint,
  type DauVaoDuongDan,
} from './anh_xa.ts';
import { bat_sharepoint, tai_len, xoa, LoiSharePoint } from './khach.ts';

/** Toi da bao nhieu tep trong mot vong quet. Tranh mot vong chay ca dem. */
const MOI_VONG = 200;

/**
 * Thu lai toi da bao nhieu lan cho MOT tep truoc khi bo lai.
 *
 * Co han vi mot tep hong (mat tren dia, ten qua dai) se lam ca vong quet dung lai o do moi
 * ngay va cac tep sau no khong bao gio duoc day. Bo lai KHONG phai bo qua: dong van con
 * `ket_qua = 'loi'` va hien tren trang quan tri.
 */
const THU_TOI_DA = 5;

// ---------------------------------------------------------------- doc duong dan mong muon

/**
 * Moi thu can de tinh duong dan SharePoint cua mot tep.
 *
 * Ba nhom co "so van ban" that (`so_hd`, `so_quyet_dinh`, `so_ho_so`) va cac nhom khac thi
 * khong — dac ta cua HCNS cho phep bo trong phan "SỐ ...".
 */
const SQL_MONG_MUON = `
  select t.id, t.nhan_vien_id, t.nhom, t.ten_goc, t.ten_luu, t.kich_thuoc,
         to_char(t.tao_luc, 'YYYY-MM-DD') as ngay_tep,
         nv.ma_nv, nv.ho_ten,
         bb.loai as bb_loai, bb.tieu_de as bb_tieu_de,
         to_char(bb.ngay_ky, 'YYYY-MM-DD') as bb_ngay,
         hd.so_hd,
         to_char(coalesce(hd.ngay_ky, hd.hieu_luc_tu), 'YYYY-MM-DD') as hd_ngay,
         ql.so_quyet_dinh,
         to_char(ql.hieu_luc_tu, 'YYYY-MM-DD') as ql_ngay,
         bx.loai as bhxh_loai, bx.so_ho_so,
         to_char(bx.thang, 'YYYY-MM-DD') as bhxh_ngay,
         dm.ma as tai_lieu_ma, dm.ten as tai_lieu_ten
    from ho_so_tep t
    join nhan_vien nv on nv.id = t.nhan_vien_id
    left join bien_ban_thoa_thuan bb on t.nhom = 'bien_ban' and bb.id = t.thuoc_id
    left join hop_dong_lao_dong  hd on t.nhom = 'hop_dong' and hd.id = t.thuoc_id
    left join quyet_dinh_luong   ql on t.nhom = 'luong'    and ql.id = t.thuoc_id
    left join bhxh_su_kien       bx on t.nhom = 'bhxh'     and bx.id = t.thuoc_id
    left join tai_lieu_nhan_vien tln on tln.tep_id = t.id
    left join danh_muc_tai_lieu  dm  on dm.id = tln.danh_muc_id
`;

/**
 * Ban chot cap cong ty. `ngay_cuoi_ky` di vao ten tep theo quy uoc DD-MM-YYYY cua HCNS: ngay
 * cuoi thang la moc co nghia cua mot ban chot thang, con `duyet_luc` thi doi moi lan duyet lai
 * va se lam ten tep doi theo — tuc la mot tep moi ben canh tep cu.
 */
const SQL_BAN_CHOT = `
  select b.id, b.loai, b.ky, b.kich_thuoc,
         to_char((to_date(b.ky || '-01', 'YYYY-MM-DD') + interval '1 month - 1 day')::date,
                 'YYYY-MM-DD') as ngay_cuoi_ky
    from ban_chot b
`;

interface DongBanChot {
  id: string;
  loai: 'bang_cong' | 'bang_luong';
  ky: string;
  kich_thuoc: number;
  ngay_cuoi_ky: string;
}

interface DongMongMuon {
  id: string;
  nhan_vien_id: string;
  nhom: string;
  ten_goc: string;
  ten_luu: string;
  kich_thuoc: number;
  ngay_tep: string;
  ma_nv: string;
  ho_ten: string;
  bb_loai: string | null;
  bb_tieu_de: string | null;
  bb_ngay: string | null;
  so_hd: string | null;
  hd_ngay: string | null;
  so_quyet_dinh: string | null;
  ql_ngay: string | null;
  bhxh_loai: string | null;
  so_ho_so: string | null;
  bhxh_ngay: string | null;
  tai_lieu_ma: string | null;
  tai_lieu_ten: string | null;
}

/**
 * Nhan `[LOẠI]` cho mot tep.
 *
 * Ba muc uu tien: nhan rieng cua ma danh muc -> ten danh muc viet hoa -> nhan cua nhom.
 */
function nhan_loai_tep(d: DongMongMuon): string {
  const ma = (d.tai_lieu_ma ?? '').toUpperCase();
  if (ma !== '') {
    const ten_dm = (d.tai_lieu_ten ?? '').trim().toUpperCase();
    return NHAN_TAI_LIEU[ma] ?? (ten_dm === '' ? 'HỒ SƠ' : ten_dm);
  }
  return NHAN_LOAI[d.nhom] ?? 'HỒ SƠ';
}

/** Duoi tep, lay tu ten nguoi dung dat; khong co thi lay tu ten luu tren dia. */
function duoi_tep(ten_goc: string, ten_luu: string): string {
  for (const t of [ten_goc, ten_luu]) {
    const m = /\.([A-Za-z0-9]{1,8})$/.exec(t);
    if (m !== null) return m[1]!.toLowerCase();
  }
  return 'bin';
}

/**
 * Duong dan mong muon cua mot tep. Tra null = KHONG duoc nam tren SharePoint.
 *
 * Tach thanh ham thuan (nhan mot dong, khong doc CSDL) de kiem duoc bang du lieu mau.
 */
export function tinh_duong_dan_muon(d: DongMongMuon): string | null {
  const loai = d.nhom === 'bien_ban' ? d.bb_loai : d.nhom === 'bhxh' ? d.bhxh_loai : null;

  // Phan giua ten tep — quy uoc HCNS: `[LOẠI] SỐ [MÃ] - [TÊN CÓ DẤU] - DD-MM-YYYY`.
  //
  // NHAN DA NOI "LA GI", NEN PHAN GIUA PHAI NOI "LA CUA AI".
  //
  // Lan dau toi uu tien ten danh muc tai lieu, va ket qua tren du lieu that la:
  //     CCCD - CCCD (scan 2 mặt) - 18-08-2026.pdf
  //     CV - CV Đơn xin việc - 19-08-2026.pdf
  // Nhan lap lai chinh no, va ten nguoi mat han. Mo thu muc ra thi thay ba tep cung ten kieu
  // do cua ba nguoi khac nhau.
  //
  // `bien_ban` thi KHAC va van dung trich yeu: nhan cua no la 'BIÊN BẢN' — mot tu chung —
  // nen trich yeu ("Cam kết bảo mật") moi la thu phan biet duoc, dung nhu vi du cua dac ta
  // `QĐ SỐ 05 - BỔ NHIỆM - 15-07-2026`.
  const ten = d.bb_tieu_de ?? d.ho_ten;

  const dv: DauVaoDuongDan = {
    nhom: d.nhom,
    loai,
    ma_tai_lieu: d.tai_lieu_ma,
    ma_nv: d.ma_nv,
    ho_ten: d.ho_ten,
    // Nhan theo dung ma danh muc: mot thu muc co ba tep "HỒ SƠ - Nguyễn Văn A - ..." thi phai
    // mo tung tep moi biet cai nao la CCCD, cai nao la CV.
    //
    // Ma danh muc chua co nhan rieng thi dung CHINH TEN DANH MUC (viet hoa) — van tot hon chu
    // "HỒ SƠ" chung chung. Chi khi khong co ma danh muc nao moi lui ve nhan cua nhom.
    nhan: nhan_loai_tep(d),
    so: d.so_hd ?? d.so_quyet_dinh ?? d.so_ho_so ?? null,
    ten,
    ngay: d.hd_ngay ?? d.bb_ngay ?? d.ql_ngay ?? d.bhxh_ngay ?? d.ngay_tep,
    duoi: duoi_tep(d.ten_goc, d.ten_luu),
  };

  return duong_dan_sharepoint(dv)?.day_du ?? null;
}

// ---------------------------------------------------------------- ghi nhan

export interface KetQuaGhiNhan {
  so_xet: number;
  so_doi: number;
  so_bo_qua: number;
}

/**
 * Doi chieu bang trang thai voi CSDL: dong nao chua co thi them, dong nao lech thi cap nhat.
 *
 * Goi sau moi lan nap / thay / go tep, VA trong lan quet hang ngay. Goi nhieu lan khong sao.
 *
 * KHONG cham vao SharePoint. Sau ham nay, bang co the doc duoc ngay tren trang quan tri de
 * xem duong dan se la gi — truoc khi bat `SHAREPOINT_BAT_DAY`.
 */
export async function ghi_nhan(chi_tep: string | null = null): Promise<KetQuaGhiNhan> {
  const dong = await truy_van<DongMongMuon>(
    chi_tep === null ? SQL_MONG_MUON : `${SQL_MONG_MUON} where t.id = $1`,
    chi_tep === null ? [] : [chi_tep],
  );

  let so_doi = 0;
  let so_bo_qua = 0;

  for (const d of dong) {
    const muon = tinh_duong_dan_muon(d);
    if (muon === null) so_bo_qua += 1;

    // `ket_qua` chi dat lai thanh 'chua_lam' khi duong dan mong muon THAY DOI. Neu khong,
    // mot dong dang 'loi' se bi xoa dau vet loi moi lan quet va so_lan_thu khong bao gio
    // len den tran — vong lap thu lai vinh vien, va bang thi luon nhin nhu binh thuong.
    const so = await thuc_thi(
      `insert into sharepoint_tep(tep_id, nhan_vien_id, duong_dan_muon, so_byte, ket_qua, ly_do)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (tep_id) do update
         set nhan_vien_id   = excluded.nhan_vien_id,
             duong_dan_muon = excluded.duong_dan_muon,
             so_byte        = excluded.so_byte,
             ket_qua        = case
                                when sharepoint_tep.duong_dan_muon is distinct from excluded.duong_dan_muon
                                  then 'chua_lam'
                                else sharepoint_tep.ket_qua
                              end,
             ly_do          = case
                                when sharepoint_tep.duong_dan_muon is distinct from excluded.duong_dan_muon
                                  then excluded.ly_do
                                else sharepoint_tep.ly_do
                              end,
             so_lan_thu     = case
                                when sharepoint_tep.duong_dan_muon is distinct from excluded.duong_dan_muon
                                  then 0
                                else sharepoint_tep.so_lan_thu
                              end,
             cap_nhat_luc   = now()
       where sharepoint_tep.duong_dan_muon is distinct from excluded.duong_dan_muon
          or sharepoint_tep.nhan_vien_id   is distinct from excluded.nhan_vien_id
          or sharepoint_tep.so_byte        is distinct from excluded.so_byte`,
      [
        d.id, d.nhan_vien_id, muon, d.kich_thuoc,
        muon === null ? 'bo_qua' : 'chua_lam',
        muon === null ? ly_do_bo_qua(d.nhom) : null,
      ],
    );
    if (so > 0) so_doi += 1;
  }

  // ---- NGUON THU HAI: ban chot cap cong ty (bang cong thang, bang luong thang).
  //
  // Chung khong nam trong `ho_so_tep` va khong thuoc nhan vien nao, nen `nhan_vien_id` la null
  // va duong dan chi co hai cap: `<nhanh>/<ten tep>`. Xem `NHANH_CAP_CONG_TY`.
  const ban = await truy_van<DongBanChot>(
    chi_tep === null
      ? SQL_BAN_CHOT
      : `${SQL_BAN_CHOT} where b.id = $1`,
    chi_tep === null ? [] : [chi_tep],
  );

  for (const b of ban) {
    const dd = duong_dan_ban_chot_sharepoint(b.loai, b.ky, b.ngay_cuoi_ky);
    const so = await thuc_thi(
      `insert into sharepoint_tep(tep_id, nhan_vien_id, duong_dan_muon, so_byte, ket_qua)
       values ($1, null, $2, $3, 'chua_lam')
       on conflict (tep_id) do update
         set duong_dan_muon = excluded.duong_dan_muon,
             so_byte        = excluded.so_byte,
             ket_qua        = case
                                when sharepoint_tep.duong_dan_muon is distinct from excluded.duong_dan_muon
                                  or sharepoint_tep.so_byte is distinct from excluded.so_byte
                                  then 'chua_lam'
                                else sharepoint_tep.ket_qua
                              end,
             so_lan_thu     = case
                                when sharepoint_tep.duong_dan_muon is distinct from excluded.duong_dan_muon
                                  or sharepoint_tep.so_byte is distinct from excluded.so_byte
                                  then 0
                                else sharepoint_tep.so_lan_thu
                              end,
             cap_nhat_luc   = now()
       where sharepoint_tep.duong_dan_muon is distinct from excluded.duong_dan_muon
          or sharepoint_tep.so_byte        is distinct from excluded.so_byte`,
      [b.id, dd?.day_du ?? null, b.kich_thuoc],
    );
    if (so > 0) so_doi += 1;
  }

  // `so_byte` nam trong dieu kien cap nhat CUA RIENG ban chot, khac nguon tren. Ly do: mot ban
  // chot duyet lai co CUNG duong dan (cung ky) nhung NOI DUNG khac. Neu chi so duong dan thi
  // ban moi khong bao gio duoc day len, va tren SharePoint mai mai la ban duyet lan dau.

  // Tep da bi go khoi CSDL: duong dan mong muon thanh null, de vong quet xoa ban tren
  // SharePoint. Day la ly do bang nay KHONG co khoa ngoai sang ho_so_tep.
  const so_go = await thuc_thi(
    `update sharepoint_tep s
        set duong_dan_muon = null,
            ket_qua        = case when s.duong_dan_da_day is null then 'xong' else 'chua_lam' end,
            ly_do          = 'Tệp đã bị gỡ khỏi hồ sơ; bản trên SharePoint sẽ được xóa theo.',
            so_lan_thu     = 0,
            cap_nhat_luc   = now()
      where s.duong_dan_muon is not null
        and not exists (select 1 from ho_so_tep t where t.id = s.tep_id)
        and not exists (select 1 from ban_chot b where b.id = s.tep_id)`,
  );

  return { so_xet: dong.length + ban.length, so_doi: so_doi + so_go, so_bo_qua };
}

function ly_do_bo_qua(nhom: string): string {
  if (nhom === 'khieu_nai') {
    // Da thanh mot muc trong ke hoach trien khai, khong phai mot cho quen. Khi nao HCNS lap
    // nhanh cho khieu nai thi khai vao `NHANH` va bo nhanh nay khoi duong `default` cua
    // `chon_nhanh` — khong can doi gi khac.
    return 'Khiếu nại nhân sự sẽ xây dựng ở giai đoạn sau (xem tai_lieu/KE-HOACH-TRIEN-KHAI.md). '
      + 'Tới lúc đó mới có nhánh trên SharePoint. Hiện tệp chỉ nằm trên máy chủ — và đó là '
      + 'chỗ an toàn hơn: khiếu nại có thể là về chính người có quyền đọc thư mục đích.';
  }
  if (nhom === 'don_tu') {
    return 'Bản đơn đã duyệt được giữ TRÊN HỆ THỐNG, không đẩy sang SharePoint. Không phải vì '
      + 'thiếu nhánh: đơn nghỉ ốm mang theo lý do nghỉ, tức là dữ liệu sức khỏe — dữ liệu cá '
      + 'nhân nhạy cảm theo NĐ 13/2023. Trong hệ thống, quyền đọc tính theo từng người.';
  }
  return `Nhóm "${nhom}" chưa được khai nhánh nào trong đặc tả thư mục HCNS.`;
}

// ---------------------------------------------------------------- san bang hai cot

interface DongTrangThai {
  tep_id: string;
  ten_luu: string | null;
  duong_dan_muon: string | null;
  duong_dan_da_day: string | null;
  so_lan_thu: number;
}

export interface KetQuaQuet {
  so_con_viec: number;
  so_day: number;
  so_xoa: number;
  so_loi: number;
  /** Da tat `SHAREPOINT_BAT_DAY` nen chi dem viec, khong lam. */
  chi_dem: boolean;
}

/**
 * Lam cho `duong_dan_da_day` bang `duong_dan_muon` cho tung tep.
 *
 * THU TU TRONG MOT LUOT DOI CHO LA CO Y: day len cho MOI truoc, roi moi xoa cho CU. Nguoc lai
 * thi giua hai buoc do tren SharePoint khong con ban nao, va neu may chu chet dung luc do
 * thi ho so bien mat. Day truoc thi truong hop xau nhat la co HAI ban — thay duoc va sua duoc.
 */
export async function quet(gioi_han = MOI_VONG): Promise<KetQuaQuet> {
  const chi_dem = !cau_hinh.sharepoint.bat_day || !bat_sharepoint();

  const dong = await truy_van<DongTrangThai>(
    `select s.tep_id, coalesce(t.ten_luu, b.ten_luu) as ten_luu,
            s.duong_dan_muon, s.duong_dan_da_day, s.so_lan_thu
       from sharepoint_tep s
       left join ho_so_tep t on t.id = s.tep_id
       left join ban_chot  b on b.id = s.tep_id
      where s.duong_dan_muon is distinct from s.duong_dan_da_day
        and s.so_lan_thu < $1
      order by s.cap_nhat_luc
      limit $2`,
    [THU_TOI_DA, gioi_han],
  );

  const kq: KetQuaQuet = {
    so_con_viec: dong.length, so_day: 0, so_xoa: 0, so_loi: 0, chi_dem,
  };
  if (chi_dem) return kq;

  for (const d of dong) {
    try {
      if (d.duong_dan_muon === null) {
        await xoa_ban_cu(d);
        kq.so_xoa += 1;
      } else {
        await day_ban_moi(d, d.duong_dan_muon);
        kq.so_day += 1;
        if (d.duong_dan_da_day !== null) kq.so_xoa += 1;
      }
    } catch (loi) {
      kq.so_loi += 1;
      await ghi_loi(d.tep_id, loi);
    }
  }
  return kq;
}

async function xoa_ban_cu(d: DongTrangThai): Promise<void> {
  if (d.duong_dan_da_day !== null) await xoa(d.duong_dan_da_day);
  await thuc_thi(
    `update sharepoint_tep
        set duong_dan_da_day = null, sp_item_id = null, ket_qua = 'xong', ly_do = null,
            so_lan_thu = 0, lam_luc = now(), cap_nhat_luc = now()
      where tep_id = $1`,
    [d.tep_id],
  );
}

async function day_ban_moi(d: DongTrangThai, den: string): Promise<void> {
  if (d.ten_luu === null) {
    throw new LoiSharePoint(
      'Có dòng trong bảng đồng bộ nhưng không còn tệp trong hồ sơ. Chạy `npm run sap_xep_tep` '
      + 'để xem kho tệp có lệch gì không.',
      404,
    );
  }
  const du_lieu = await doc_tep_ho_so(d.ten_luu);
  if (du_lieu === null) {
    throw new LoiSharePoint(
      `Không đọc được tệp trên đĩa (${d.ten_luu}). Bản ghi còn nhưng tệp thì mất.`, 404,
    );
  }

  const kq = await tai_len(den, du_lieu);

  // Xoa ban cu SAU KHI ban moi da len. Xem ghi chu ve thu tu o `quet`.
  if (d.duong_dan_da_day !== null && d.duong_dan_da_day !== kq.duong_dan) {
    await xoa(d.duong_dan_da_day);
  }

  await thuc_thi(
    `update sharepoint_tep
        set duong_dan_da_day = $2, sp_item_id = $3, so_byte = $4, ket_qua = 'xong',
            ly_do = null, so_lan_thu = 0, lam_luc = now(), cap_nhat_luc = now()
      where tep_id = $1`,
    [d.tep_id, kq.duong_dan, kq.id, kq.so_byte],
  );
}

async function ghi_loi(tep_id: string, loi: unknown): Promise<void> {
  const l = loi as { thong_diep_cong_khai?: string; message?: string };
  const td = (l.thong_diep_cong_khai ?? l.message ?? 'Lỗi không rõ.').slice(0, 500);
  await thuc_thi(
    `update sharepoint_tep
        set ket_qua = 'loi', ly_do = $2, so_lan_thu = so_lan_thu + 1,
            lam_luc = now(), cap_nhat_luc = now()
      where tep_id = $1`,
    [tep_id, td],
  );
}

// ---------------------------------------------------------------- tinh hinh

export interface TinhHinh {
  bat_day: boolean;
  da_cau_hinh: boolean;
  tong: number;
  da_day: number;
  con_viec: number;
  loi: number;
  bo_qua: number;
  /** So dong da het luot thu — phai co nguoi xem, vong quet khong tu sua duoc. */
  bo_lai: number;
}

export async function tinh_hinh(): Promise<TinhHinh> {
  const d = await truy_van_mot<Record<string, string>>(
    `select count(*)::int as tong,
            count(*) filter (where duong_dan_da_day is not null)::int as da_day,
            count(*) filter (where duong_dan_muon is distinct from duong_dan_da_day)::int as con_viec,
            count(*) filter (where ket_qua = 'loi')::int as loi,
            count(*) filter (where ket_qua = 'bo_qua')::int as bo_qua,
            count(*) filter (where duong_dan_muon is distinct from duong_dan_da_day
                               and so_lan_thu >= $1)::int as bo_lai
       from sharepoint_tep`,
    [THU_TOI_DA],
  );
  return {
    bat_day: cau_hinh.sharepoint.bat_day,
    da_cau_hinh: bat_sharepoint(),
    tong: Number(d?.['tong'] ?? 0),
    da_day: Number(d?.['da_day'] ?? 0),
    con_viec: Number(d?.['con_viec'] ?? 0),
    loi: Number(d?.['loi'] ?? 0),
    bo_qua: Number(d?.['bo_qua'] ?? 0),
    bo_lai: Number(d?.['bo_lai'] ?? 0),
  };
}

/** Cho phep thu lai nhung dong da het luot — dung tu trang quan tri sau khi da sua nguyen nhan. */
export async function thu_lai_cac_dong_loi(): Promise<number> {
  return thuc_thi(
    `update sharepoint_tep set so_lan_thu = 0, cap_nhat_luc = now()
      where ket_qua = 'loi' and so_lan_thu > 0`,
  );
}

/** Ma viec cho lich chay hang ngay. */
export function ma_viec_dong_bo(moc: string): string {
  return `dong_bo_sharepoint:${moc}`;
}

/**
 * Moc thoi gian cho `ma_viec_dong_bo` — mot o moi `CHU_KY_PHUT` phut, KHONG phai moi ngay.
 *
 * VI SAO DOI TU MOI-NGAY SANG MOI-15-PHUT: khoa "mot lan mot ngay" la dung cho viec chot bang
 * cong (chay hai lan la sai so lieu), nhung SAI cho viec nay. Nap mot tep luc 13:00 chi GHI NHAN
 * la co viec can day; viec day nam o vong quet. Voi khoa theo ngay, vong quet cua hom nay da
 * chay xong tu 01:00 — nen tep phai cho den 01:00 SANG MAI. Ca mot ngay, va nguoi nap tep khong
 * co cach nao biet.
 *
 * Chay nhieu lan o day KHONG SAO, va do la dieu cho phep doi: `ghi_nhan` la upsert, `quet` chi
 * cham nhung dong co `duong_dan_muon` khac `duong_dan_da_day`, va khong con viec thi `quet` ket
 * thuc sau MOT cau SQL co chi muc — khong mot luot goi Graph nao.
 *
 * Va thu tu trong mot vong VAN giu: viec nay chay sau viec sap xep kho tep. Duong dan SharePoint
 * tinh tu `ma_nv`/`ho_ten` chu khong tu ten tep tren dia, nen mot vong chay truoc luot sap xep
 * cung khong tinh sai gi.
 */
export function moc_dong_bo(bay_gio: Date, chu_ky_phut: number): string {
  const o = Math.floor(bay_gio.getTime() / (chu_ky_phut * 60 * 1000));
  return `o${String(o)}`;
}

/**
 * Danh dau mot tep da bi go khoi ho so: ban tren SharePoint phai xoa theo.
 *
 * Goi NGAY tai cho xoa tep, dung O(1), thay vi doi lan quet hang ngay tim ra. Lan quet van la
 * luoi hung — bo mat mot lan goi thi lech toi da mot ngay, khong lech vinh vien.
 */
export async function danh_dau_da_go(tep_id: string): Promise<void> {
  await thuc_thi(
    `update sharepoint_tep
        set duong_dan_muon = null,
            ket_qua      = case when duong_dan_da_day is null then 'xong' else 'chua_lam' end,
            ly_do        = 'Tệp đã bị gỡ khỏi hồ sơ; bản trên SharePoint sẽ được xóa theo.',
            so_lan_thu   = 0,
            cap_nhat_luc = now()
      where tep_id = $1`,
    [tep_id],
  );
}

/**
 * Goi `ghi_nhan` / `danh_dau_da_go` ma KHONG de loi lam do ca yeu cau dang xu ly.
 *
 * Nap tep len la viec chinh; ghi nhan de dong bo la viec phu. Neu bang dong bo co van de thi
 * nguoi dung van phai nap duoc tep — lan quet hang ngay se don not. Nen o day nuot loi, va
 * do la mot trong rat it cho trong ma nguon nay duoc nuot loi.
 *
 * NHUNG VAN `await`, KHONG "ban roi quen". Ban dau ham nay tra `void` va cho truy van chay
 * tiep sau khi da tra loi. Hai cai gia phai tra:
 *   - Khong kiem duoc: bai kiem doc bang ngay sau loi goi thi thay trang thai cu, va no dua
 *     vao thoi diem chu khong vao ma nguon.
 *   - Truy van co the con dang chay khi ket noi da duoc tra lai pool.
 * Ca hai truy van o day deu la mot lenh co chi muc — dat het vai chuc micro-giay.
 */
export async function ghi_nhan_am_tham(tep_id: string | null, da_go = false): Promise<void> {
  try {
    if (da_go && tep_id !== null) await danh_dau_da_go(tep_id);
    else await ghi_nhan(tep_id);
  } catch (loi) {
    // Lan quet hang ngay se don not — NHUNG VAN PHAI DE LAI DAU VET.
    //
    // Truoc day day la `catch {}` tron. Nuot loi o day la dung (nap tep la viec chinh, dong bo
    // la viec phu), nhung nuot ma khong ghi gi thi khi ai do hoi "toi vua them tep ma sao khong
    // thay dong bo" thi khong co cho nao tra loi duoc: khong co dong trong bang, khong co dong
    // trong log, khong co gi. Ta chi biet noi "cho vong quet hang ngay". Mot dong log bien no
    // thanh mot cau tra loi.
    //
    // Dung `console.error` chu khong phai logger cua Fastify: ham nay duoc goi ca tu vong quet
    // hang ngay va tu lenh CLI, la nhung cho khong co request nao.
    console.error(
      `[sharepoint] khong ghi nhan duoc tep ${tep_id ?? '(tat ca)'}: ${(loi as Error).message}`,
    );
  }
}
