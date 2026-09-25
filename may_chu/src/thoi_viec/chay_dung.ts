// CONG 2 — script dung hoat dong. NOI DUY NHAT duoc cat truy cap.
//
// REQ-G2-02: mot transaction, dung thu tu:
//   1. Kiem dieu kien (moi muc bat buoc xong, lastday chot, email cau hinh du).
//   2. Thu giu du lieu (chuyen quyen du lieu, xoay mat khau dung chung, da reassign viec).
//   3. Sinh & gui van ban (QD cham dut, xac nhan BHXH, bao giam BHXH, chung tu thue, bang
//      quyet toan) — luu ho so, email qua outbox.
//   4. Cat truy cap (cho_nghi_viec: khoa login + thu hoi token + su kien phan quyen/ERP1/MS365).
//   5. Dat da_khoa + nhat ky ai bam.
//
// Bat bien REQ-QT-03 nam o ca `kiem_dieu_kien_chay` (code) lan rang buoc CSDL.
import type { PoolClient } from 'pg';
import { trong_giao_dich, truy_van_mot } from '../csdl/ket_noi.ts';
import { LoiDauVao, LoiKhongTim } from '../tien_ich/kiem_tra.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { ngay_dia_phuong, ngay_viet } from '../tien_ich/thoi_gian.ts';
import { ghi_docx, type KhoiDocx } from '../tien_ich/ghi_docx.ts';
import { luu_tep_ho_so } from '../tien_ich/luu_tep.ts';
import { ghi_su_kien } from '../su_kien/hop_thu_di.ts';
import { gui_ngam, tai_khoan_cua_nhan_vien } from '../su_kien/thong_bao_day.ts';
import { cho_nghi_viec } from '../nhan_su/nghi_viec.ts';
import { doc_cau_hinh_thoi_viec, quy_trinh_theo_id } from './quy_trinh.ts';
import { kiem_dieu_kien_chay } from './tinh_toan.ts';
import { cac_tai_khoan_admin } from './nghiep_vu.ts';

/** Thong tin toi thieu de sinh van ban — chup trong transaction. */
interface QtChoChay {
  id: string;
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  chuc_danh: string | null;
  phong_ban: string | null;
  loai_hop_dong: string;
  ngay_lam_viec_cuoi: string;
  ngay_vao: string | null;
  email: string | null;
  email_microsoft: string | null;
  so_bhxh: string | null;
  trang_thai: string;
}

/**
 * Chay script dung hoat dong. Tra `da_chay = true` neu da chay truoc do (idempotent —
 * REQ-TEST-07: chay hai lan / hai instance chi khoa mot lan).
 */
export async function chay_dung_hoat_dong(
  quy_trinh_id: string, nguoi_dung_id: string, ip: string | null,
): Promise<{ ok: boolean; da_chay: boolean }> {
  const qt = await quy_trinh_theo_id(quy_trinh_id);
  if (qt === null) throw new LoiKhongTim('Không tìm thấy quy trình.');
  if (qt.trang_thai === 'da_khoa') return { ok: true, da_chay: true };
  if (qt.trang_thai === 'da_huy') throw new LoiDauVao('Quy trình đã hủy.');

  const cfg = await doc_cau_hinh_thoi_viec();
  const loi = kiem_dieu_kien_chay(
    qt.muc, qt.trang_thai, qt.lastday_da_chot, qt.ngay_lam_viec_cuoi,
    cfg.email_dich_vu_bhxh, cfg.email_chung_tu_thue,
  );
  if (loi.length > 0) throw new LoiDauVao(loi.join('\n'));

  await trong_giao_dich(async (khach) => {
    const hang = await khach.query<QtChoChay & { trang_thai: string }>(
      `select qt.id, qt.nhan_vien_id, qt.trang_thai, qt.loai_hop_dong,
              to_char(qt.ngay_lam_viec_cuoi, 'YYYY-MM-DD') as ngay_lam_viec_cuoi,
              to_char(nv.ngay_vao, 'YYYY-MM-DD') as ngay_vao,
              nv.ma_nv, nv.ho_ten, nv.chuc_danh, nv.email,
              pb.ten as phong_ban, hscn.so_bhxh,
              (select email_microsoft from nguoi_dung
                where nhan_vien_id = nv.id and email_microsoft is not null limit 1)
                as email_microsoft
         from quy_trinh_thoi_viec qt
         join nhan_vien nv on nv.id = qt.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
         left join ho_so_ca_nhan hscn on hscn.nhan_vien_id = nv.id
        where qt.id = $1
        for update of qt`,
      [quy_trinh_id],
    );
    const qtc = hang.rows[0];
    if (qtc === undefined) throw new LoiKhongTim('Không tìm thấy quy trình.');
    if (qtc.trang_thai === 'da_khoa') return { ok: true, da_chay: true }; // idempotent

    // Buoc 1 da kiem o ngoai; kiem lai trang thai trong khoa (khong doi giua hai luc).
    if (qtc.trang_thai !== 'san_sang_chot') {
      throw new LoiDauVao('Quy trình chưa sẵn sàng chốt — còn mục bắt buộc chưa xong.');
    }

    // Buoc 2: thu giu du lieu — ghi moc, bao admin IT lam phan can quyen he thong ngoai.
    await danh_dau_muc(khach, quy_trinh_id, 'chuyen_quyen_du_lieu', {
      ghi_chu: 'Yêu cầu chuyển quyền OneDrive/SharePoint đã ghi nhận. Chưa có API tự động '
        + '— thực hiện trên cổng Microsoft 365 (giữ quyền admin Entra).',
    });
    await danh_dau_muc(khach, quy_trinh_id, 'doi_mk_dung_chung', {
      ghi_chu: 'Yêu cầu xoay mật khẩu dùng chung đã ghi nhận — thực hiện trên hệ thống '
        + 'tương ứng (MISA/ERP/thiết bị mạng).',
    });

    // Buoc 3: sinh & gui van ban (teo ghi ra dia TRUOC khi dua vao hop thu de outbox gui
    // kem duoc tep).
    const bang_quyet_toan_id = await sinh_bang_quyet_toan(khach, qtc);

    const qd_id = await sinh_quyet_dinh_cham_dut(khach, qtc);
    await danh_dau_muc(khach, quy_trinh_id, 'ra_qd_cham_dut', { tep_id: qd_id });

    const xac_nhan_id = await sinh_xac_nhan_bhxh(khach, qtc);
    await danh_dau_muc(khach, quy_trinh_id, 'tra_so_giay_to', { tep_id: xac_nhan_id });
    if (qtc.email !== null && qtc.email !== '') {
      await ghi_su_kien('gui_email', {
        ma_nv: qtc.ma_nv,
        den: [qtc.email],
        cc: [],
        tieu_de: 'Giấy xác nhận quá trình đóng BHXH-BHTN',
        noi_dung: `<p>Kính gửi ${qtc.ho_ten},</p><p>Công ty gửi kèm giấy xác nhận quá `
          + 'trình đóng BHXH-BHTN. Vui lòng kiểm tra và phản hồi nếu có sai sót.</p>',
        tep_ids: [xac_nhan_id],
      }, khach);
    }

    if (await co_muc_ap_dung(khach, quy_trinh_id, 'chot_bhxh', qtc)) {
      const bhxh_id = await sinh_ho_so_bao_giam(khach, qtc);
      await danh_dau_muc(khach, quy_trinh_id, 'chot_bhxh', { tep_id: bhxh_id });
      await ghi_su_kien('gui_email', {
        ma_nv: qtc.ma_nv,
        den: [cfg.email_dich_vu_bhxh],
        cc: cfg.email_dich_vu_bhxh_cc === '' ? [] : [cfg.email_dich_vu_bhxh_cc],
        tieu_de: `[Chấm công] Hồ sơ báo giảm BHXH — ${qtc.ma_nv} ${qtc.ho_ten}`,
        noi_dung: `<p>Kính gửi đơn vị dịch vụ BHXH,</p><p>Gửi kèm hồ sơ báo giảm/chốt sổ `
          + `của ${qtc.ho_ten} (${qtc.ma_nv}), ngày chấm dứt ${ngay_viet(qtc.ngay_lam_viec_cuoi)}.`
          + '</p><p>Vui lòng xử lý và phản hồi kết quả.</p>',
        tep_ids: [bhxh_id, bang_quyet_toan_id],
      }, khach);
    }

    if (await co_muc_ap_dung(khach, quy_trinh_id, 'chung_tu_thue', qtc)) {
      const thue_id = await sinh_chung_tu_thue(khach, qtc);
      await danh_dau_muc(khach, quy_trinh_id, 'chung_tu_thue', { tep_id: thue_id });
      const den_thue = cfg.email_chung_tu_thue === '' ? cfg.email_dich_vu_bhxh : cfg.email_chung_tu_thue;
      await ghi_su_kien('gui_email', {
        ma_nv: qtc.ma_nv,
        den: [den_thue],
        cc: [],
        tieu_de: `[Chấm công] Chứng từ khấu trừ thuế TNCN — ${qtc.ma_nv} ${qtc.ho_ten}`,
        noi_dung: `<p>Kính gửi bộ phận kế toán,</p><p>Gửi kèm chứng từ khấu trừ thuế TNCN `
          + `của ${qtc.ho_ten} (${qtc.ma_nv}) theo NĐ126/2020.</p>`,
        tep_ids: [thue_id],
      }, khach);
    }

    // Buoc 4: cat truy cap — CUOI CUNG. cho_nghi_viec nam trong cung transaction nay nen
    // cac su kien nhan_su.nghi_viec / erp1 / ms365 di cung mot luot.
    const nv = await khach.query<{ dang_hoat_dong: boolean }>(
      'select dang_hoat_dong from nhan_vien where id = $1', [qtc.nhan_vien_id]);
    if (nv.rows[0]?.dang_hoat_dong === true) {
      await cho_nghi_viec(khach, qtc.nhan_vien_id, qtc.ngay_lam_viec_cuoi);
    } else {
      await khach.query(
        `update muc_checklist set ghi_chu = 'Đã cho nghỉ bằng tay trước đó — không khóa lại.'
          where quy_trinh_id = $1 and ma_muc = 'khoa_tai_khoan'`,
        [quy_trinh_id],
      );
    }
    await danh_dau_muc(khach, quy_trinh_id, 'thu_hoi_quyen_erp', {
      ghi_chu: 'Sự kiện erp1.nhan_su.nghi_viec đã vào hàng gửi (cùng bước khóa tài khoản).',
    });
    await danh_dau_muc(khach, quy_trinh_id, 'khoa_tai_khoan', {});
    await danh_dau_muc(khach, quy_trinh_id, 'luu_ho_so', {
      ghi_chu: 'Hồ sơ đóng, lịch sử chấm công giữ nguyên (nghỉ việc không phải xóa dữ liệu).',
    });

    // Buoc 5: chot.
    await khach.query(
      `update quy_trinh_thoi_viec
          set trang_thai = 'da_khoa', cap_nhat_luc = now()
        where id = $1 and trang_thai = 'san_sang_chot'`,
      [quy_trinh_id],
    );

    // Bao nguoi nghi viec: quy trinh da hoan tat.
    gui_ngam({
      nguoi_dung_ids: await tai_khoan_cua_nhan_vien(qtc.nhan_vien_id),
      tieu_de: 'Thủ tục thôi việc đã hoàn tất',
      noi_dung: 'Mọi thủ tục đã hoàn tất. Các giấy tờ (quyết định chấm dứt, xác nhận BHXH) '
        + 'đã lưu trong hồ sơ của bạn.',
      du_lieu: { man: 'thoi-viec', loai: 'thoi_viec', quy_trinh_id },
    });

    return { ok: true, da_chay: false };
  });

  await ghi_nhat_ky(nguoi_dung_id, 'thoi_viec_chay_dung', 'quy_trinh_thoi_viec', quy_trinh_id,
    null, ip);
  return { ok: true, da_chay: false };
}

/** Muc co ap dung cho loai hop dong nay khong (khuon da sinh no chua). */
async function co_muc_ap_dung(
  khach: PoolClient, quy_trinh_id: string, ma_muc: string, _qtc: QtChoChay,
): Promise<boolean> {
  const d = await khach.query<{ co: boolean }>(
    `select true as co from muc_checklist
      where quy_trinh_id = $1 and ma_muc = $2 and trang_thai <> 'bo_qua'`,
    [quy_trinh_id, ma_muc],
  );
  return (d.rowCount ?? 0) > 0;
}

/** Danh dau mot muc script_cuoi la xong, kem ket_qua. */
async function danh_dau_muc(
  khach: PoolClient, quy_trinh_id: string, ma_muc: string, ket_qua: Record<string, unknown>,
): Promise<void> {
  await khach.query(
    `update muc_checklist
        set trang_thai = 'xong', ket_qua = $3::jsonb, xac_nhan_luc = now()
      where quy_trinh_id = $1 and ma_muc = $2`,
    [quy_trinh_id, ma_muc, JSON.stringify(ket_qua)],
  );
}

/**
 * Luu mot van ban sinh ra tu `khoi` vao ho so nhan vien. Tra tep_id de outbox gui kem.
 * `danh_muc_ma` khac null thi ghi them vao danh muc tai lieu (checklist HCNS).
 */
async function luu_van_ban_quy_trinh(
  khach: PoolClient, qtc: QtChoChay, ten_goc: string, khoi: readonly KhoiDocx[],
  nhom: string, danh_muc_ma: string | null,
): Promise<string> {
  const du_lieu = ghi_docx({ khoi });
  const da_luu = await luu_tep_ho_so(du_lieu, ten_goc, {
    ma_nv: qtc.ma_nv, ho_ten: qtc.ho_ten, nhom, ngay: ngay_dia_phuong(new Date()),
  });
  await khach.query(
    `insert into ho_so_tep(id, nhan_vien_id, nhom, thuoc_id, ten_goc, ten_luu, kieu_mime,
                           kich_thuoc, tai_len_boi)
     values ($1,$2,$3,null,$4,$5,$6,$7,null)`,
    [da_luu.ma_tep, qtc.nhan_vien_id, nhom, ten_goc, da_luu.ten_luu, da_luu.mime,
      da_luu.kich_thuoc],
  );
  if (danh_muc_ma !== null) {
    await khach.query(
      `insert into tai_lieu_nhan_vien (nhan_vien_id, danh_muc_id, trang_thai, tep_id)
       select $1, id, 'da_len_phan_mem', $3
         from danh_muc_tai_lieu where ma = $2
       on conflict (nhan_vien_id, danh_muc_id) do update set tep_id = excluded.tep_id`,
      [qtc.nhan_vien_id, danh_muc_ma, da_luu.ma_tep],
    );
  }
  return da_luu.ma_tep;
}

/** Bang quyet toan — so lieu tu ket_qua cua cac muc tu dong. */
async function sinh_bang_quyet_toan(khach: PoolClient, qtc: QtChoChay): Promise<string> {
  const muc = await khach.query<{ ma_muc: string; ket_qua: Record<string, unknown> | null }>(
    `select ma_muc, ket_qua from muc_checklist
      where quy_trinh_id = $1 and ma_muc in
        ('quyet_toan_luong','thanh_toan_phep','tinh_tro_cap','hen_quyet_toan_14n')`,
    [qtc.id],
  );
  const theo = new Map(muc.rows.map((d) => [d.ma_muc, d.ket_qua as Record<string, unknown>]));
  const l = theo.get('quyet_toan_luong');
  const p = theo.get('thanh_toan_phep');
  const t = theo.get('tinh_tro_cap');
  const h = theo.get('hen_quyet_toan_14n');
  const so = (v: unknown, mac_dinh = '—'): string =>
    v === null || v === undefined ? mac_dinh : String(v);
  const tien = (v: unknown): string =>
    typeof v === 'number' ? new Intl.NumberFormat('vi-VN').format(v) + ' đ' : '—';

  return luu_van_ban_quy_trinh(khach, qtc, `Bang-quyet-toan_${qtc.ma_nv}.docx`, [
    { loai: 'tieu_de', chu: 'BẢNG QUYẾT TOÁN KHI CHẤM DỨT HỢP ĐỒNG LAO ĐỘNG' },
    { loai: 'doan', chu: `Nhân viên: ${qtc.ho_ten} (${qtc.ma_nv}) — ${qtc.chuc_danh ?? '—'}` },
    { loai: 'doan', chu: `Ngày làm việc cuối: ${ngay_viet(qtc.ngay_lam_viec_cuoi)}` },
    { loai: 'bang', hang: [
      ['Lương tháng gần nhất', tien(l?.['thuc_linh_moi_nhat'])],
      ['Số công tích lũy', so(l?.['so_cong_tich_luy'])],
      ['Phép năm còn lại', `${so(p?.['con_lai'])} ngày`],
      ['Thanh toán phép chưa nghỉ', tien(p?.['tien_phep'])],
      ['Trợ cấp thôi việc', tien(t?.['tro_cap'])],
      ['Hạn quyết toán', h?.['han_quyet_toan'] === null || h?.['han_quyet_toan'] === undefined
        ? '—' : ngay_viet(String(h['han_quyet_toan']))],
    ] },
    { loai: 'doan', chu: 'Thanh toán mọi khoản trong 14 ngày làm việc kể từ ngày chấm dứt '
      + 'HĐLĐ (BLLĐ 2019 Điều 48 khoản 1).' },
  ], 'luong', null);
}

/** Quyet dinh cham dut HDLD — the thuc theo mau chung cua cong ty. */
async function sinh_quyet_dinh_cham_dut(khach: PoolClient, qtc: QtChoChay): Promise<string> {
  return luu_van_ban_quy_trinh(khach, qtc, `Quyet-dinh-cham-dut-HDLD_${qtc.ma_nv}.docx`, [
    { loai: 'tieu_de', chu: 'QUYẾT ĐỊNH' },
    { loai: 'doan', chu: 'Về việc chấm dứt hợp đồng lao động', giua: true },
    { loai: 'doan', chu: 'Căn cứ Bộ luật Lao động 2019 (Điều 34, 35, 46, 48);' },
    { loai: 'doan', chu: 'Căn cứ đơn xin thôi việc và biên bản bàn giao của nhân viên;' },
    { loai: 'doan', chu: 'QUYẾT ĐỊNH:' },
    { loai: 'doan', chu: `Điều 1. Chấm dứt hợp đồng lao động với ông/bà ${qtc.ho_ten} `
      + `(mã nhân viên ${qtc.ma_nv}) kể từ ngày ${ngay_viet(qtc.ngay_lam_viec_cuoi)}.` },
    { loai: 'doan', chu: 'Điều 2. Quyền lợi của người lao động được thanh toán theo quy '
      + 'định tại Điều 48 Bộ luật Lao động 2019, gồm tiền lương, phép năm chưa nghỉ, trợ '
      + 'cấp thôi việc, và xác nhận quá trình đóng BHXH-BHTN.' },
    { loai: 'doan', chu: 'Điều 3. Các bộ phận liên quan và người lao động có trách nhiệm '
      + 'thi hành quyết định này.' },
    { loai: 'bang', hang: [
      ['Họ và tên', qtc.ho_ten],
      ['Mã nhân viên', qtc.ma_nv],
      ['Phòng ban', qtc.phong_ban ?? '—'],
      ['Chức danh', qtc.chuc_danh ?? '—'],
      ['Ngày chấm dứt', ngay_viet(qtc.ngay_lam_viec_cuoi)],
    ] },
  ], 'tai_lieu', 'qd_cham_dut_hd');
}

/** Giay xac nhan qua trinh dong BHXH-BHTN. */
async function sinh_xac_nhan_bhxh(khach: PoolClient, qtc: QtChoChay): Promise<string> {
  const bhtn = await khach.query<{ so_thang: number }>(
    `select count(distinct kl.thang)::int as so_thang
       from phieu_luong pl join ky_luong kl on kl.id = pl.ky_luong_id
      where pl.nhan_vien_id = $1 and pl.bhxh_nld > 0`,
    [qtc.nhan_vien_id],
  );
  const so_thang = bhtn.rows[0]?.so_thang ?? 0;
  return luu_van_ban_quy_trinh(khach, qtc, `Xac-nhan-BHXH-BHTN_${qtc.ma_nv}.docx`, [
    { loai: 'tieu_de', chu: 'GIẤY XÁC NHẬN QUÁ TRÌNH ĐÓNG BHXH-BHTN' },
    { loai: 'doan', chu: `Xác nhận ông/bà ${qtc.ho_ten} (${qtc.ma_nv})` },
    { loai: 'doan', chu: qtc.ngay_vao === null ? 'Ngày vào làm: —'
      : `Ngày vào làm: ${ngay_viet(qtc.ngay_vao)}` },
    { loai: 'doan', chu: `Ngày chấm dứt: ${ngay_viet(qtc.ngay_lam_viec_cuoi)}` },
    { loai: 'doan', chu: `Số BHXH: ${qtc.so_bhxh ?? '—'}` },
    { loai: 'doan', chu: `Thời gian đã đóng BHXH: ${String(so_thang)} tháng (theo phiếu `
      + 'lương đã phát hành trên hệ thống chấm công).' },
    { loai: 'doan', chu: 'Công ty cam kết chốt sổ và trả sổ BHXH cho người lao động theo '
      + 'Điều 48 khoản 3 Bộ luật Lao động 2019.' },
  ], 'bhxh', 'xac_nhan_bhxh');
}

/** Ho so bao giam / chot so BHXH gui don vi dich vu. */
async function sinh_ho_so_bao_giam(khach: PoolClient, qtc: QtChoChay): Promise<string> {
  return luu_van_ban_quy_trinh(khach, qtc, `Ho-so-bao-giam-BHXH_${qtc.ma_nv}.docx`, [
    { loai: 'tieu_de', chu: 'HỒ SƠ BÁO GIẢM / CHỐT SỔ BHXH' },
    { loai: 'bang', hang: [
      ['Họ và tên', qtc.ho_ten],
      ['Mã nhân viên', qtc.ma_nv],
      ['Số BHXH', qtc.so_bhxh ?? '—'],
      ['Loại HĐLĐ', qtc.loai_hop_dong],
      ['Ngày chấm dứt HĐLĐ', ngay_viet(qtc.ngay_lam_viec_cuoi)],
      ['Lý do', 'Chấm dứt hợp đồng lao động — thôi việc'],
    ] },
    { loai: 'doan', chu: 'Kính đề nghị đơn vị dịch vụ thực hiện thủ tục báo giảm và chốt '
      + 'sổ BHXH. Kết quả gửi về bộ phận nhân sự công ty.' },
  ], 'bhxh', 'ho_so_bao_giam_bhxh');
}

/** Chung tu khau tru thue TNCN (NĐ126/2020). */
async function sinh_chung_tu_thue(khach: PoolClient, qtc: QtChoChay): Promise<string> {
  const thue = await khach.query<{ tong: number }>(
    `select coalesce(sum(pl.thue_tncn), 0)::float8 as tong
       from phieu_luong pl
      where pl.nhan_vien_id = $1`,
    [qtc.nhan_vien_id],
  );
  return luu_van_ban_quy_trinh(khach, qtc, `Chung-tu-khau-tru-thue-TNCN_${qtc.ma_nv}.docx`, [
    { loai: 'tieu_de', chu: 'CHỨNG TỪ KHẤU TRỪ THUẾ TNCN' },
    { loai: 'bang', hang: [
      ['Họ và tên', qtc.ho_ten],
      ['Mã nhân viên', qtc.ma_nv],
      ['Thuế TNCN đã khấu trừ (tổng phiếu lương)', new Intl.NumberFormat('vi-VN')
        .format(thue.rows[0]?.tong ?? 0) + ' đ'],
      ['Căn cứ', 'NĐ126/2020 — cấp khi người lao động có yêu cầu'],
    ] },
  ], 'tai_lieu', 'chung_tu_tncn');
}

/** Doc mot muc ket_qua — dung cho UI xem so lieu. */
export async function ket_qua_muc(quy_trinh_id: string, ma_muc: string): Promise<unknown> {
  const d = await truy_van_mot<{ ket_qua: unknown }>(
    `select ket_qua from muc_checklist where quy_trinh_id = $1 and ma_muc = $2`,
    [quy_trinh_id, ma_muc],
  );
  return d?.ket_qua ?? null;
}

/** Bao admin IT sau khi chay (phan can nguoi tren he thong ngoai). */
export async function bao_admin_it_thu_cong(quy_trinh_id: string): Promise<void> {
  const qt = await truy_van_mot<{ ho_ten: string; ma_nv: string }>(
    `select nv.ho_ten, nv.ma_nv from quy_trinh_thoi_viec qt
       join nhan_vien nv on nv.id = qt.nhan_vien_id where qt.id = $1`,
    [quy_trinh_id],
  );
  if (qt === null) return;
  gui_ngam({
    nguoi_dung_ids: await cac_tai_khoan_admin(),
    tieu_de: 'Cần xoay mật khẩu dùng chung sau thôi việc',
    noi_dung: `${qt.ho_ten} (${qt.ma_nv}) vừa hoàn tất thôi việc — xoay mọi mật khẩu dùng `
      + 'chung mà người này từng biết (MISA, ERP, thiết bị mạng, tài khoản dịch vụ).',
    du_lieu: { man: 'thoi-viec', loai: 'thoi_viec', quy_trinh_id },
  });
}
