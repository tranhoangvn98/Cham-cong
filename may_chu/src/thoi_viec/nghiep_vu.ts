// Thao tac cua con nguoi tren quy trinh thoi viec: tick muc, ky dien tu, dinh kem bang
// chung, dat lastday, ky bien ban ban giao hai chieu, huy va bo qua muc.
//
// Nguyen tac chung:
//   - Nhan vien chi thao tac muc `loai_tu_dong = 'nhan_vien'` cua CHINH minh, va chi khi
//     quy trinh con mo (dang_thuc_hien / san_sang_chot).
//   - Muc `tu_dong` va `script_cuoi` chi he thong duoc chay — nhan vien khong tu tick duoc.
//   - Moi lan tick xong deu thu chuyen trang thai san_sang_chot NGAY trong transaction.
import type { PoolClient } from 'pg';
import { trong_giao_dich, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { LoiDauVao, LoiKhongTim, LoiXungDot } from '../tien_ich/kiem_tra.ts';
import { ngay_dia_phuong, ngay_viet } from '../tien_ich/thoi_gian.ts';
import { lam_sach_ten, luu_tep_ho_so, xoa_tep_ho_so } from '../tien_ich/luu_tep.ts';
import { gui_ngam, tai_khoan_cua_nhan_vien } from '../su_kien/thong_bao_day.ts';
import {
  chuyen_san_sang_chot, doc_khuon_han_bao_truoc,
  type DongBanGiao, type DongMucThoiViec,
} from './quy_trinh.ts';
import { nguong_bao_truoc, NHAN_TRANG_THAI_MUC } from './tinh_toan.ts';

/** Nguoi dang thao tac: id tai khoan + nhan vien gan voi tai khoan. */
export interface NguoiThaoTac {
  sub: string;
  nv: string | null;
}

/** Muc can bang chung (tep dinh kem) moi duoc tick xong — REQ-NV-06. */
const MUC_CAN_BANG_CHUNG = new Set(['tra_tai_san', 'thanh_ly_tam_ung', 'ban_giao_ho_so']);

interface MucKeQuyTrinh {
  muc: DongMucThoiViec;
  quy_trinh_id: string;
  nhan_vien_id: string;
  trang_thai_qt: string;
  ho_ten: string;
  ma_nv: string;
}

/** Nap muc + quy trinh chu, kiem quy trinh con mo. */
async function nap_muc(id: string): Promise<MucKeQuyTrinh> {
  const d = await truy_van_mot<{
    id: string; quy_trinh_id: string; nhan_vien_id: string; trang_thai_qt: string;
    ho_ten: string; ma_nv: string;
  } & DongMucThoiViec>(
    `select m.*, qt.id as quy_trinh_id, qt.nhan_vien_id, qt.trang_thai as trang_thai_qt,
            nv.ho_ten, nv.ma_nv
       from muc_checklist m
       join quy_trinh_thoi_viec qt on qt.id = m.quy_trinh_id
       join nhan_vien nv on nv.id = qt.nhan_vien_id
      where m.id = $1`,
    [id],
  );
  if (d === null) throw new LoiKhongTim('Không tìm thấy mục checklist.');
  return {
    muc: d,
    quy_trinh_id: d.quy_trinh_id,
    nhan_vien_id: d.nhan_vien_id,
    trang_thai_qt: d.trang_thai_qt,
    ho_ten: d.ho_ten,
    ma_nv: d.ma_nv,
  };
}

function bat_buoc_quy_trinh_mo(trang_thai: string): void {
  if (trang_thai === 'da_khoa') {
    throw new LoiXungDot('Quy trình đã khóa — không thể thao tác thêm.');
  }
  if (trang_thai === 'da_huy') {
    throw new LoiXungDot('Quy trình đã hủy.');
  }
}

/** Tick (xong/chua) mot muc `nhan_vien` cua CHINH minh. */
export async function tick_muc(
  muc_id: string, nd: NguoiThaoTac, trang_thai: 'xong' | 'chua', ghi_chu: string | null,
): Promise<{ trang_thai: string; muc_chua: number; quy_trinh_id: string }> {
  const kq = await trong_giao_dich(async (khach) => {
    const { muc, quy_trinh_id, nhan_vien_id, trang_thai_qt } = await nap_muc(muc_id);
    bat_buoc_quy_trinh_mo(trang_thai_qt);
    if (nd.nv === null || nd.nv !== nhan_vien_id) {
      throw new LoiKhongTim('Không tìm thấy mục thuộc phạm vi của bạn.');
    }
    if (muc.loai_tu_dong !== 'nhan_vien') {
      throw new LoiDauVao('Mục này do hệ thống tự chạy — bạn không thể tự tick.');
    }
    if (trang_thai === 'xong' && MUC_CAN_BANG_CHUNG.has(muc.ma_muc) && muc.bang_chung_tep_id === null) {
      throw new LoiDauVao(`Mục "${muc.tieu_de}" cần đính kèm bằng chứng trước khi xác nhận.`);
    }
    await khach.query(
      `update muc_checklist
          set trang_thai = $2,
              xac_nhan_boi = case when $2 = 'xong' then $3 else xac_nhan_boi end,
              xac_nhan_luc = case when $2 = 'xong' then now() else xac_nhan_luc end,
              ghi_chu = coalesce($4, ghi_chu)
        where id = $1`,
      [muc_id, trang_thai, nd.sub, ghi_chu],
    );
    const da_chuyen = await chuyen_san_sang_chot(khach, quy_trinh_id);
    const muc_chua = await so_muc_bat_buoc_chua_trong(khach, quy_trinh_id);
    return { trang_thai: da_chuyen ? 'san_sang_chot' : trang_thai_qt, muc_chua, quy_trinh_id };
  });
  if (kq.trang_thai === 'san_sang_chot') {
    await bao_admin_san_sang(kq.quy_trinh_id);
  }
  return kq;
}

async function so_muc_bat_buoc_chua_trong(khach: PoolClient, quy_trinh_id: string): Promise<number> {
  const d = await khach.query<{ so: number }>(
    `select count(*)::int as so from muc_checklist
      where quy_trinh_id = $1 and bat_buoc and trang_thai not in ('xong','bo_qua')`,
    [quy_trinh_id],
  );
  return d.rows[0]?.so ?? 0;
}

async function bao_admin_san_sang(quy_trinh_id: string): Promise<void> {
  const qt = await truy_van_mot<{ ho_ten: string; ma_nv: string }>(
    `select nv.ho_ten, nv.ma_nv from quy_trinh_thoi_viec qt
       join nhan_vien nv on nv.id = qt.nhan_vien_id where qt.id = $1`,
    [quy_trinh_id],
  );
  if (qt === null) return;
  gui_ngam({
    nguoi_dung_ids: await cac_tai_khoan_admin(),
    tieu_de: 'Quy trình thôi việc sẵn sàng chốt',
    noi_dung: `${qt.ho_ten} (${qt.ma_nv}) đã hoàn tất thủ tục — mở Cổng 2 để duyệt cuối.`,
    du_lieu: { man: 'thoi-viec', loai: 'thoi_viec', quy_trinh_id },
  });
}

/** Danh sach tai khoan admin dang hoat dong (dung nhieu cho). */
export async function cac_tai_khoan_admin(): Promise<string[]> {
  const d = await truy_van_mot<{ ids: string[] }>(
    'select array_agg(id) as ids from nguoi_dung where dang_hoat_dong = true and vai_tro = \'admin\'');
  return d?.ids ?? [];
}

/**
 * Ky dien tu trong he thong: ghi nguoi ky + thoi diem + co `ky_dien_tu` trong ket_qua.
 * Khong phai chu ky so bang certificate — la xac nhan danh tinh bang tai khoan da dang nhap,
 * dung cho cam ket bao mat va bien ban ban giao (REQ-NV-06).
 */
export async function ky_muc(muc_id: string, nd: NguoiThaoTac): Promise<{ ok: boolean }> {
  await trong_giao_dich(async (khach) => {
    const { muc, nhan_vien_id, trang_thai_qt } = await nap_muc(muc_id);
    bat_buoc_quy_trinh_mo(trang_thai_qt);
    if (nd.nv === null || nd.nv !== nhan_vien_id) {
      throw new LoiKhongTim('Không tìm thấy mục thuộc phạm vi của bạn.');
    }
    if (muc.loai_tu_dong !== 'nhan_vien') {
      throw new LoiDauVao('Mục này không thể ký.');
    }
    if (MUC_CAN_BANG_CHUNG.has(muc.ma_muc) && muc.bang_chung_tep_id === null) {
      throw new LoiDauVao(`Mục "${muc.tieu_de}" cần đính kèm bằng chứng trước khi ký.`);
    }
    await khach.query(
      `update muc_checklist
          set trang_thai = 'xong',
              xac_nhan_boi = $2,
              xac_nhan_luc = now(),
              ket_qua = coalesce(ket_qua, '{}'::jsonb) || jsonb_build_object(
                'ky_dien_tu', true, 'ky_luc', now())
        where id = $1`,
      [muc_id, nd.sub],
    );
    await chuyen_san_sang_chot(khach, muc.quy_trinh_id);
  });
  return { ok: true };
}

/** Dinh kem bang chung cho mot muc cua chinh minh. Tra tep_id moi. */
export async function dinh_kem_bang_chung(
  muc_id: string, nd: NguoiThaoTac, du_lieu: Buffer, ten_goc: string,
): Promise<{ tep_id: string; ten_goc: string }> {
  const { muc, nhan_vien_id, trang_thai_qt, ho_ten, ma_nv } = await nap_muc(muc_id);
  bat_buoc_quy_trinh_mo(trang_thai_qt);
  if (nd.nv === null || nd.nv !== nhan_vien_id) {
    throw new LoiKhongTim('Không tìm thấy mục thuộc phạm vi của bạn.');
  }
  if (muc.loai_tu_dong !== 'nhan_vien') {
    throw new LoiDauVao('Mục này do hệ thống tự chạy — không đính kèm được.');
  }
  const ten_sach = lam_sach_ten(ten_goc);
  const da_luu = await luu_tep_ho_so(du_lieu, ten_sach, {
    ma_nv, ho_ten, nhom: 'khac', ngay: ngay_dia_phuong(new Date()),
  });
  await thuc_thi(
    `insert into ho_so_tep(id, nhan_vien_id, nhom, thuoc_id, ten_goc, ten_luu, kieu_mime,
                           kich_thuoc, tai_len_boi)
     values ($1,$2,'khac',$3,$4,$5,$6,$7,$8)`,
    [da_luu.ma_tep, nhan_vien_id, muc_id, ten_sach, da_luu.ten_luu, da_luu.mime,
      da_luu.kich_thuoc, nd.sub],
  );
  // Go tep cu cua CHINH muc nay (giu mot ban bang chung moi nhat, khong de ro rao).
  if (muc.bang_chung_tep_id !== null) {
    const cu = await truy_van_mot<{ ten_luu: string }>(
      'select ten_luu from ho_so_tep where id = $1', [muc.bang_chung_tep_id]);
    await thuc_thi('update muc_checklist set bang_chung_tep_id = $2 where id = $1',
      [muc_id, da_luu.ma_tep]);
    await thuc_thi('delete from ho_so_tep where id = $1', [muc.bang_chung_tep_id]);
    if (cu !== null) {
      await xoa_tep_ho_so(cu.ten_luu).catch(() => { /* tep mo coi khong sao */ });
    }
  } else {
    await thuc_thi('update muc_checklist set bang_chung_tep_id = $2 where id = $1',
      [muc_id, da_luu.ma_tep]);
  }
  return { tep_id: da_luu.ma_tep, ten_goc: ten_sach };
}

/**
 * Nhan vien xac nhan hoac de nghi chinh ngay lam viec cuoi (lastday). Chi chot CUNG o
 * Cong 2 (`lastday_da_chot`) — day moi la de nghi, Admin duyet cuoi moi dinh.
 */
export async function de_nghi_lastday(
  quy_trinh_id: string, nd: NguoiThaoTac, ngay_moi: string,
): Promise<{ ok: boolean; canh_bao: string[] }> {
  const qt = await truy_van_mot<{
    nhan_vien_id: string; trang_thai: string; loai_hop_dong: string; la_quan_ly_dn: boolean;
    lastday_da_chot: boolean; tao_luc: string;
  }>(
    `select qt.nhan_vien_id, qt.trang_thai, qt.loai_hop_dong, qt.la_quan_ly_dn,
            qt.lastday_da_chot, to_char(qt.tao_luc, 'YYYY-MM-DD') as tao_luc
       from quy_trinh_thoi_viec qt where qt.id = $1`,
    [quy_trinh_id],
  );
  if (qt === null) throw new LoiKhongTim('Không tìm thấy quy trình.');
  if (nd.nv === null || nd.nv !== qt.nhan_vien_id) {
    throw new LoiKhongTim('Không tìm thấy quy trình thuộc phạm vi của bạn.');
  }
  bat_buoc_quy_trinh_mo(qt.trang_thai);
  if (qt.lastday_da_chot) {
    throw new LoiXungDot('Ngày làm việc cuối đã được Admin chốt — liên hệ nhân sự nếu cần đổi.');
  }
  const hom_nay = ngay_dia_phuong(new Date());
  if (ngay_moi < hom_nay) {
    throw new LoiDauVao('Ngày làm việc cuối phải từ hôm nay trở đi.');
  }

  await thuc_thi('update quy_trinh_thoi_viec set ngay_lam_viec_cuoi = $2::date where id = $1',
    [quy_trinh_id, ngay_moi]);

  // Validate theo muc 8: so sanh han bao truoc — CANH BAO, khong chan.
  const khuon = await doc_khuon_han_bao_truoc();
  const toi_thieu = nguong_bao_truoc(khuon, qt.loai_hop_dong, null, qt.la_quan_ly_dn);
  const so_ngay = Math.round(
    (Date.parse(`${ngay_moi}T00:00:00Z`) - Date.parse(`${hom_nay}T00:00:00Z`)) / 86_400_000);
  const canh_bao: string[] = [];
  if (toi_thieu !== null && so_ngay < toi_thieu) {
    canh_bao.push(`Đề nghị báo trước ${String(so_ngay)} ngày, ít hơn mức ${String(toi_thieu)} `
      + 'ngày theo loại hợp đồng. Vẫn ghi nhận — Admin quyết định cuối cùng ở Cổng 2.');
  }
  return { ok: true, canh_bao };
}

/**
 * Cong 2 (a+b): Admin duyet cuoi va chot lastday. Tu day nhan vien khong doi duoc ngay.
 * `khong_can_bao_truoc` = D.35 khoan 2 (thoa thuan), Admin quyet.
 */
export async function chot_lastday(
  quy_trinh_id: string, nd: NguoiThaoTac, ngay_moi: string | null, khong_can_bao_truoc: boolean,
): Promise<{ ok: boolean }> {
  await trong_giao_dich(async (khach) => {
    const qt = await khach.query<{ trang_thai: string }>(
      `select trang_thai from quy_trinh_thoi_viec where id = $1 for update`, [quy_trinh_id]);
    const d = qt.rows[0];
    if (d === undefined) throw new LoiKhongTim('Không tìm thấy quy trình.');
    if (d.trang_thai !== 'san_sang_chot') {
      throw new LoiDauVao('Chỉ chốt được khi mọi mục bắt buộc đã hoàn tất (sẵn sàng chốt).');
    }
    if (ngay_moi !== null) {
      const hom_nay = ngay_dia_phuong(new Date());
      if (ngay_moi < hom_nay) {
        throw new LoiDauVao('Ngày làm việc cuối phải từ hôm nay trở đi.');
      }
      await khach.query(
        'update quy_trinh_thoi_viec set ngay_lam_viec_cuoi = $2::date where id = $1',
        [quy_trinh_id, ngay_moi]);
    }
    await khach.query(
      `update quy_trinh_thoi_viec
          set lastday_da_chot = true,
              khong_can_bao_truoc = $2,
              admin_duyet2_id = $3,
              admin_duyet2_luc = now(),
              cap_nhat_luc = now()
        where id = $1`,
      [quy_trinh_id, khong_can_bao_truoc, nd.sub],
    );
  });
  return { ok: true };
}

/** Huy quy trinh (Admin/BGD) — bat ky trang thai, tru da_khoa. */
export async function huy_quy_trinh(quy_trinh_id: string, _nd: NguoiThaoTac): Promise<void> {
  const kq = await thuc_thi(
    `update quy_trinh_thoi_viec set trang_thai = 'da_huy', cap_nhat_luc = now()
      where id = $1 and trang_thai <> 'da_khoa'`,
    [quy_trinh_id],
  );
  if (kq === 0) {
    const co = await truy_van_mot<{ trang_thai: string }>(
      'select trang_thai from quy_trinh_thoi_viec where id = $1', [quy_trinh_id]);
    if (co === null) throw new LoiKhongTim('Không tìm thấy quy trình.');
    throw new LoiXungDot('Quy trình đã khóa — không thể hủy sau khi chạy dừng hoạt động.');
  }
}

/** Admin bo qua (hoac bo bo qua) mot muc — chi muc con `chua`/`dang`. */
export async function bo_qua_muc(
  muc_id: string, bo: boolean, ghi_chu: string | null,
): Promise<{ muc_chua: number }> {
  return trong_giao_dich(async (khach) => {
    const { muc, quy_trinh_id, trang_thai_qt } = await nap_muc(muc_id);
    bat_buoc_quy_trinh_mo(trang_thai_qt);
    if (muc.loai_tu_dong === 'script_cuoi') {
      throw new LoiDauVao('Mục này chạy trong script Cổng 2 — không thể bỏ qua.');
    }
    if (!bo && muc.trang_thai !== 'bo_qua') {
      throw new LoiDauVao(`Mục đang ở trạng thái "${NHAN_TRANG_THAI_MUC[muc.trang_thai]}".`);
    }
    if (bo && !['chua', 'dang'].includes(muc.trang_thai)) {
      throw new LoiDauVao(`Mục đang ở trạng thái "${NHAN_TRANG_THAI_MUC[muc.trang_thai]}", `
        + 'chỉ bỏ qua được mục chưa làm.');
    }
    await khach.query(
      `update muc_checklist
          set trang_thai = $2, ghi_chu = coalesce($3, ghi_chu)
        where id = $1`,
      [muc_id, bo ? 'bo_qua' : 'chua', ghi_chu],
    );
    await chuyen_san_sang_chot(khach, quy_trinh_id);
    return { muc_chua: await so_muc_bat_buoc_chua_trong(khach, quy_trinh_id) };
  });
}

// ---------------------------------------------------------------- ban giao

interface BanGiaoKeQt {
  quy_trinh_id: string;
  nhan_vien_id: string;
  trang_thai_qt: string;
  nguoi_nhan_id: string | null;
}

async function nap_ban_giao(id: string): Promise<BanGiaoKeQt> {
  const d = await truy_van_mot<BanGiaoKeQt>(
    `select bg.quy_trinh_id, qt.nhan_vien_id, qt.trang_thai as trang_thai_qt,
            bg.nguoi_nhan_id
       from ban_giao bg
       join quy_trinh_thoi_viec qt on qt.id = bg.quy_trinh_id
      where bg.id = $1`,
    [id],
  );
  if (d === null) throw new LoiKhongTim('Không tìm thấy bàn giao.');
  return d;
}

/** Xac nhan mot muc ban giao (da_ban_giao / chua) — nguoi giao hoac nguoi nhan duoc chi dinh. */
export async function xac_nhan_ban_giao_muc(
  ban_giao_muc_id: string, nd: NguoiThaoTac, trang_thai: 'da_ban_giao' | 'chua', ghi_chu: string | null,
): Promise<void> {
  await trong_giao_dich(async (khach) => {
    const bgm = await khach.query<{ ban_giao_id: string }>(
      'select ban_giao_id from ban_giao_muc where id = $1', [ban_giao_muc_id]);
    const d = bgm.rows[0];
    if (d === undefined) throw new LoiKhongTim('Không tìm thấy mục bàn giao.');
    const bg = await nap_ban_giao(d.ban_giao_id);
    bat_buoc_quy_trinh_mo(bg.trang_thai_qt);
    const la_nguoi_giao = nd.nv !== null && nd.nv === bg.nhan_vien_id;
    const la_nguoi_nhan = nd.sub !== ''
      && nd.sub === bg.nguoi_nhan_id;
    if (!la_nguoi_giao && !la_nguoi_nhan) {
      throw new LoiKhongTim('Không tìm thấy mục bàn giao thuộc phạm vi của bạn.');
    }
    await khach.query(
      `update ban_giao_muc
          set trang_thai = $2,
              nguoi_xac_nhan_id = case when $2 = 'da_ban_giao' then $3 else nguoi_xac_nhan_id end,
              xac_nhan_luc = case when $2 = 'da_ban_giao' then now() else xac_nhan_luc end,
              ghi_chu = coalesce($4, ghi_chu)
        where id = $1`,
      [ban_giao_muc_id, trang_thai, nd.sub, ghi_chu],
    );
  });
}

/**
 * Ky bien ban ban giao hai chieu. Khi DU CA hai chu ky va moi muc ban giao bat buoc da
 * da_ban_giao thi muc `ky_bien_ban_ban_giao` tu dong thanh xong.
 */
export async function ky_ban_giao(
  ban_giao_id: string, nd: NguoiThaoTac, ben: 'nguoi_giao' | 'nguoi_nhan',
): Promise<void> {
  await trong_giao_dich(async (khach) => {
    const bg = await nap_ban_giao(ban_giao_id);
    bat_buoc_quy_trinh_mo(bg.trang_thai_qt);
    if (ben === 'nguoi_giao') {
      if (nd.nv === null || nd.nv !== bg.nhan_vien_id) {
        throw new LoiKhongTim('Chỉ người nghỉ việc mới ký được bên giao.');
      }
      await khach.query(
        `update ban_giao set ky_nguoi_giao_id = $2, ky_nguoi_giao_luc = now(), cap_nhat_luc = now()
          where id = $1`,
        [ban_giao_id, nd.sub],
      );
    } else {
      if (bg.nguoi_nhan_id === null) {
        throw new LoiDauVao('Chưa chỉ định người nhận bàn giao — liên hệ Admin.');
      }
      if (nd.sub === '' || nd.sub !== bg.nguoi_nhan_id) {
        throw new LoiKhongTim('Chỉ người được chỉ định nhận bàn giao mới ký được bên nhận.');
      }
      await khach.query(
        `update ban_giao set ky_nguoi_nhan_id = $2, ky_nguoi_nhan_luc = now(), cap_nhat_luc = now()
          where id = $1`,
        [ban_giao_id, nd.sub],
      );
    }
    await cap_nhat_muc_bien_ban(khach, bg.quy_trinh_id);
  });
}

/** Admin chi dinh nguoi nhan ban giao (dung tai khoan he thong cham cong). */
export async function gan_nguoi_nhan_ban_giao(
  ban_giao_id: string, _nd: NguoiThaoTac, nguoi_dung_id: string,
): Promise<void> {
  const co = await truy_van_mot<{ co: boolean }>(
    `select true as co from nguoi_dung where id = $1 and dang_hoat_dong = true`, [nguoi_dung_id]);
  if (co === null) throw new LoiDauVao('Không tìm thấy tài khoản để gán làm người nhận.');
  const bg = await nap_ban_giao(ban_giao_id);
  bat_buoc_quy_trinh_mo(bg.trang_thai_qt);
  await thuc_thi(
    'update ban_giao set nguoi_nhan_id = $2, cap_nhat_luc = now() where id = $1',
    [ban_giao_id, nguoi_dung_id],
  );
}

/** Khi du ca hai chu ky + moi muc bat buoc da ban giao: tick muc ky_bien_ban_ban_giao. */
async function cap_nhat_muc_bien_ban(khach: PoolClient, quy_trinh_id: string): Promise<void> {
  await khach.query(
    `update muc_checklist m
        set trang_thai = 'xong'
      where m.quy_trinh_id = $1 and m.ma_muc = 'ky_bien_ban_ban_giao'
        and exists (
          select 1 from ban_giao bg
           where bg.quy_trinh_id = $1
             and bg.ky_nguoi_giao_id is not null
             and bg.ky_nguoi_nhan_id is not null
             and not exists (
               select 1 from ban_giao_muc bgm
                where bgm.ban_giao_id = bg.id and bgm.bat_buoc
                  and bgm.trang_thai <> 'da_ban_giao'
             )
        )`,
    [quy_trinh_id],
  );
  await chuyen_san_sang_chot(khach, quy_trinh_id);
}

// ---------------------------------------------------------------- tien ich

/** Ngay viet dang DD/MM/YYYY cho thong bao. */
export function viet_ngay(ngay: string | null): string {
  return ngay === null ? '—' : ngay_viet(ngay);
}
