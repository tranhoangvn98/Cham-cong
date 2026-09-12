// Quan ly THONG BAO (BGD/HR) + VAN BAN CONG TY — phia quan tri.
//
// Nhan vien thuong DOC qua /api/toi/thong-bao va /api/toi/van-ban (xem toi.ts). Day la dau TAO:
// chi nhan su (can_nhan_su) moi dang thong bao / tai van ban len. Giai trinh cua nhan vien cho
// cac thong bao 'can_giai_trinh' duoc liet ke o /api/thong-bao/giai-trinh de HR quan ly CHUNG voi
// khieu nai (chu cong ty chot: giai trinh noi vao muc Khieu nai & giai trinh san co).
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { gui_ngam } from '../su_kien/thong_bao_day.ts';
import { gui_email, email_bat } from '../su_kien/gui_email.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import { luu_van_ban_cong_ty, lam_sach_ten, xoa_tep_ho_so } from '../tien_ich/luu_tep.ts';
import { cau_hinh } from '../cau_hinh.ts';
import {
  chuoi, chuoi_bat_buoc, luan_ly, ngay, than, trong_tap, uuid,
  LoiDauVao, LoiKhongTim,
} from '../tien_ich/kiem_tra.ts';

const MUC_DO = ['thuong', 'quan_trong', 'khan'] as const;
const PHAM_VI = ['toan_cong_ty', 'phong_ban', 'ca_nhan'] as const;
const DANH_MUC_VB = ['thong_bao', 'quyet_dinh', 'cong_van', 'noi_quy',
  'bieu_mau', 'chinh_sach', 'huong_dan', 'khac'] as const;

/** Nguoi nhan trong mot pham vi: dung cho ca chuong bao he thong lan gui email. */
interface NguoiNhan { nguoi_dung_id: string; email: string | null; ho_ten: string }

async function nguoi_nhan_pham_vi(
  pham_vi: string, phong_ban_id: string | null, nhan_vien_id: string | null,
): Promise<NguoiNhan[]> {
  return truy_van<NguoiNhan>(
    `select u.id as nguoi_dung_id, nv.email, nv.ho_ten
       from nguoi_dung u
       join nhan_vien nv on nv.id = u.nhan_vien_id
      where u.dang_hoat_dong = true and nv.dang_hoat_dong = true
        and ($1 = 'toan_cong_ty'
             or ($1 = 'phong_ban' and nv.phong_ban_id = $2::uuid)
             or ($1 = 'ca_nhan'   and nv.id = $3::uuid))`,
    [pham_vi, phong_ban_id, nhan_vien_id],
  );
}

function thoat_html(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** HTML don gian cho email van ban — giu xuong dong, chong chen the. */
function html_email(tieu_de: string, than_van: string): string {
  return `<div style="font-family:system-ui,Arial,sans-serif;font-size:14px;line-height:1.6">`
    + `<h2 style="margin:0 0 12px">${thoat_html(tieu_de)}</h2>`
    + `<div style="white-space:pre-wrap">${thoat_html(than_van)}</div></div>`;
}

const NHAN_MUC_DO_EMAIL: Record<string, { chu: string; nen: string; chu_mau: string; vien: string }> = {
  khan: { chu: 'KHẨN', nen: '#fdeceb', chu_mau: '#c0392b', vien: '#f3c9c4' },
  quan_trong: { chu: 'QUAN TRỌNG', nen: '#fff8e6', chu_mau: '#8a6d00', vien: '#f0dca0' },
  thuong: { chu: 'THÔNG BÁO', nen: '#eef4fb', chu_mau: '#1f4e79', vien: '#d3e2f2' },
};

/**
 * Render noi dung email theo cu phap nhe (giong ban demo): '## ' -> de muc co vien trai xanh;
 * '- ' hoac '• ' -> gach dau dong; '**dam**' -> in dam; dong trong -> khoang cach. Nguoi soan
 * chi go van ban thuong van ra dep. Escape truoc, chi cho phep the do template sinh.
 */
function render_noi_dung_email(noi_dung: string): string {
  const inline = (s: string): string =>
    thoat_html(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const dong = noi_dung.replace(/\r\n/g, '\n').split('\n');
  const ra: string[] = [];
  let trong_ds = false;
  const dong_ds = (): void => { if (trong_ds) { ra.push('</ul>'); trong_ds = false; } };
  for (const raw of dong) {
    const line = raw.trimEnd();
    if (line.trim() === '') { dong_ds(); continue; }
    if (line.startsWith('## ')) {
      dong_ds();
      ra.push(`<div style="font-size:15px;font-weight:700;color:#1f4e79;border-left:4px solid #1f4e79;padding-left:10px;margin:18px 0 8px;">${inline(line.slice(3).trim())}</div>`);
    } else if (/^[-•]\s+/.test(line.trim())) {
      if (!trong_ds) { ra.push('<ul style="margin:0 0 4px;padding-left:20px;">'); trong_ds = true; }
      ra.push(`<li style="margin:2px 0;">${inline(line.trim().replace(/^[-•]\s+/, ''))}</li>`);
    } else {
      dong_ds();
      ra.push(`<div style="margin:0 0 8px;">${inline(line)}</div>`);
    }
  }
  dong_ds();
  return ra.join('');
}

/**
 * Email THONG BAO khung thuong hieu (dung phong cach ban demo da duyet): header XANH DAM, ten
 * cong ty (uppercase) + tieu de, badge muc do, noi dung render theo cu phap nhe, footer. Neu co
 * CONG_TY_LOGO_URL thi logo nam trong the trang tren header xanh. Style inline, layout bang -
 * an toan voi Outlook/M365/Gmail.
 */
function than_email_thong_bao(tieu_de: string, noi_dung: string, muc_do: string): string {
  const ten_cty = cau_hinh.cong_ty.ten !== '' ? cau_hinh.cong_ty.ten : 'Công ty';
  const md = NHAN_MUC_DO_EMAIL[muc_do] ?? NHAN_MUC_DO_EMAIL['thuong'] as
    { chu: string; nen: string; chu_mau: string; vien: string };
  return `<div style="margin:0;padding:0;background:#eef1f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.08);">
  <tr><td style="background:#1f4e79;padding:24px 28px;">
    <div style="color:#cfe0f3;font-size:12px;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">${thoat_html(ten_cty)} · Phòng Nhân sự</div>
    <div style="color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${thoat_html(tieu_de)}</div>
  </td></tr>
  <tr><td style="padding:18px 28px 0;">
    <span style="display:inline-block;background:${md.nen};color:${md.chu_mau};border:1px solid ${md.vien};font-size:12px;font-weight:700;letter-spacing:.5px;border-radius:4px;padding:3px 12px;">${md.chu}</span>
  </td></tr>
  <tr><td style="padding:16px 28px 6px;font-size:14px;color:#2b3648;line-height:1.7;">${render_noi_dung_email(noi_dung)}</td></tr>
  <tr><td style="background:#f4f7fb;padding:16px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#8792a2;line-height:1.6;">
    Email tự động từ Hệ thống chấm công${cau_hinh.cong_ty.ten !== '' ? ` – ${thoat_html(cau_hinh.cong_ty.ten)}` : ''}. Vui lòng không trả lời email này; mọi thắc mắc gửi qua kênh <strong>Khiếu nại phiếu lương</strong> trong ứng dụng.
  </td></tr>
</table>
</td></tr></table>
</div>`;
}

function lay_id_param(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}

export async function tuyen_thong_bao(app: FastifyInstance): Promise<void> {
  // ------------------------------------------------------------ THONG BAO (quan tri)
  /** Danh sach thong bao + so nguoi da doc / da giai trinh. */
  app.get('/thong-bao', { preHandler: can_nhan_su }, async () => truy_van(
    `select tb.id, tb.ma, tb.tieu_de, tb.noi_dung, tb.muc_do, tb.can_giai_trinh, tb.pham_vi,
            tb.phong_ban_id, pb.ten as phong_ban, tb.tao_luc, tb.het_han, tb.da_go,
            (select count(*) from thong_bao_da_doc dd where dd.thong_bao_id = tb.id)::int as so_da_doc,
            (select count(*) from thong_bao_da_doc dd
              where dd.thong_bao_id = tb.id and dd.giai_trinh is not null)::int as so_giai_trinh
       from thong_bao tb left join phong_ban pb on pb.id = tb.phong_ban_id
      order by tb.tao_luc desc limit 300`));

  /** Tao thong bao moi. */
  app.post('/thong-bao', { preHandler: can_nhan_su }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const tieu_de = chuoi_bat_buoc(b, 'tieu_de', { toi_da: 250, toi_thieu: 3 });
    const noi_dung = chuoi_bat_buoc(b, 'noi_dung', { toi_da: 8000, toi_thieu: 3 });
    const muc_do = trong_tap(b, 'muc_do', MUC_DO, { bat_buoc: false }) ?? 'thuong';
    const can_giai_trinh = luan_ly(b, 'can_giai_trinh') ?? false;
    const pham_vi = trong_tap(b, 'pham_vi', PHAM_VI, { bat_buoc: false }) ?? 'toan_cong_ty';
    const phong_ban_id = pham_vi === 'phong_ban'
      ? uuid(b, 'phong_ban_id', { bat_buoc: true }) as string : null;
    const het_han = b['het_han'] === undefined || b['het_han'] === null || b['het_han'] === ''
      ? null : ngay(b, 'het_han');
    // Hai kenh phat them: popup (hop thoai bat buoc doc) va gui email toan bo nguoi nhan.
    const popup = luan_ly(b, 'popup') ?? false;
    const gui_email_bat = luan_ly(b, 'gui_email') ?? false;

    const dong = await truy_van_mot<{ id: string; ma: string }>(
      `insert into thong_bao(tieu_de, noi_dung, muc_do, can_giai_trinh, pham_vi, phong_ban_id,
                             nguoi_tao, het_han, popup, gui_email)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id, ma`,
      [tieu_de, noi_dung, muc_do, can_giai_trinh, pham_vi, phong_ban_id, nd.sub, het_han,
        popup, gui_email_bat],
    );
    await ghi_nhat_ky(nd.sub, 'tao_thong_bao', 'thong_bao', dong?.id ?? null,
      { pham_vi, muc_do, can_giai_trinh, popup, gui_email: gui_email_bat }, req.ip);

    // Nguoi nhan trong pham vi (kem email de gui thu neu bat). Chuong bao/push + popup deu dua
    // tren cung tap nay.
    const nguoi_nhan = await nguoi_nhan_pham_vi(pham_vi, phong_ban_id, null);
    if (nguoi_nhan.length > 0) {
      gui_ngam({
        nguoi_dung_ids: nguoi_nhan.map((n) => n.nguoi_dung_id),
        tieu_de: `Thông báo mới: ${tieu_de}`,
        noi_dung: can_giai_trinh ? 'Thông báo này yêu cầu bạn giải trình.' : 'Bấm để xem chi tiết.',
        du_lieu: { man: 'thong-bao', thong_bao_id: dong?.id ?? null },
      });
    }

    // Gui email TOAN CONG TY (neu bat) — chi toi nguoi CO email, gui nen, fail-soft: mot dia chi
    // loi khong chan dia chi khac, va khong lam hong viec tao thong bao. Chi gui khi email da bat.
    let so_email = 0;
    if (gui_email_bat) {
      const than_html = than_email_thong_bao(tieu_de, noi_dung, muc_do);
      const ds_email = nguoi_nhan.filter((n) => n.email !== null && n.email !== '');
      so_email = email_bat() ? ds_email.length : 0;
      void (async () => {
        for (const n of ds_email) {
          try {
            await gui_email({ den: [n.email as string], tieu_de: `[Thông báo] ${tieu_de}`,
              noi_dung_html: than_html });
          } catch { /* fail-soft: bo qua dia chi loi, tiep tuc */ }
        }
      })();
    }
    return res.code(201).send({ ...dong, so_nguoi_nhan: nguoi_nhan.length, so_email, popup });
  });

  /** Xem truoc email (khong luu, khong gui): tra ve HTML da render de hien trong app. */
  app.post('/thong-bao/xem-truoc-email', { preHandler: can_nhan_su }, async (req) => {
    const b = than(req.body);
    const tieu_de = chuoi(b, 'tieu_de', { toi_da: 250 }) ?? '(Chưa có tiêu đề)';
    const noi_dung = chuoi(b, 'noi_dung', { toi_da: 8000 }) ?? '';
    const muc_do = trong_tap(b, 'muc_do', MUC_DO, { bat_buoc: false }) ?? 'thuong';
    return { html: than_email_thong_bao(tieu_de, noi_dung, muc_do) };
  });

  /** Sua thong bao: go xuong hoac dat lai han. */
  app.patch('/thong-bao/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id_param(req);
    const b = than(req.body);
    const da_go = luan_ly(b, 'da_go');
    if (da_go === null) throw new LoiDauVao('Không có thay đổi nào.');
    const kq = await thuc_thi('update thong_bao set da_go = $2 where id = $1', [id, da_go]);
    if (kq === 0) throw new LoiKhongTim('Không tìm thấy thông báo.');
    await ghi_nhat_ky(nd.sub, da_go ? 'go_thong_bao' : 'khoi_phuc_thong_bao', 'thong_bao', id,
      {}, req.ip);
    return { ok: true };
  });

  /** Ai da doc / chua doc mot thong bao (kem giai trinh neu co). */
  app.get('/thong-bao/:id/da-doc', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id_param(req);
    return truy_van(
      `select nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              dd.doc_luc, dd.giai_trinh, dd.giai_trinh_luc, dd.ma as ma_giai_trinh
         from thong_bao_da_doc dd
         join nhan_vien nv on nv.id = dd.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where dd.thong_bao_id = $1
        order by dd.doc_luc desc`,
      [id],
    );
  });

  /** Tat ca GIAI TRINH cho thong bao — de HR quan ly chung voi khieu nai. */
  app.get('/thong-bao/giai-trinh', { preHandler: can_nhan_su }, async () => truy_van(
    `select dd.ma, dd.giai_trinh, dd.giai_trinh_luc,
            nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
            tb.ma as ma_thong_bao, tb.tieu_de
       from thong_bao_da_doc dd
       join thong_bao tb on tb.id = dd.thong_bao_id
       join nhan_vien nv on nv.id = dd.nhan_vien_id
       left join phong_ban pb on pb.id = nv.phong_ban_id
      where dd.giai_trinh is not null
      order by dd.giai_trinh_luc desc limit 300`));

  // ------------------------------------------------------------ VAN BAN CONG TY (quan tri)
  /** Danh sach van ban (ke ca da go — quan ly). */
  app.get('/van-ban', { preHandler: can_nhan_su }, async () => truy_van(
    `select vb.id, vb.ma, vb.tieu_de, vb.mo_ta, vb.noi_dung, vb.nguoi_ban_hanh, vb.danh_muc,
            vb.pham_vi, vb.phong_ban_id, pb.ten as phong_ban, vb.nhan_vien_id,
            nv.ho_ten as nhan_vien, vb.gui_he_thong, vb.gui_email, vb.thong_bao_id,
            vb.ten_goc, vb.mime, vb.kich_thuoc, vb.tao_luc, vb.da_go,
            (vb.ten_luu is not null) as co_tep
       from van_ban_cong_ty vb
       left join phong_ban pb on pb.id = vb.phong_ban_id
       left join nhan_vien nv on nv.id = vb.nhan_vien_id
      order by vb.tao_luc desc limit 500`));

  /**
   * Soan / ban hanh mot van ban (multipart — tep KHONG bat buoc nua):
   *   tieu_de, danh_muc (loai/hinh thuc), mo_ta, noi_dung, nguoi_ban_hanh,
   *   pham_vi (+ phong_ban_id / nhan_vien_id), gui_he_thong, gui_email, [tep].
   *
   * Phai co NOI DUNG hoac TEP — mot van ban rong khong co gi de ban hanh. Khi `gui_he_thong`
   * thi tao mot `thong_bao` lien ket (tai dung chuong bao + theo doi da doc); khi `gui_email`
   * thi gui qua Microsoft 365 (fail-soft — thieu cau hinh mail thi bo qua email, van tao van ban).
   */
  app.post('/van-ban', {
    preHandler: can_nhan_su,
    bodyLimit: cau_hinh.tep_toi_da_byte + 1024 * 1024,
  }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const truong: Record<string, string> = {};
    let du_lieu: Buffer | null = null;
    let ten_goc = 'van-ban';
    for await (const phan of req.parts({ limits: { fileSize: cau_hinh.tep_toi_da_byte } })) {
      if (phan.type === 'file') {
        if (phan.fieldname !== 'tep') { await phan.toBuffer(); continue; }
        const co_ten = (phan.filename ?? '').trim();
        if (co_ten === '') { await phan.toBuffer(); continue; } // o chon tep de trong
        ten_goc = lam_sach_ten(co_ten);
        du_lieu = await phan.toBuffer();
      } else if (typeof phan.value === 'string') {
        truong[phan.fieldname] = phan.value;
      }
    }
    const tieu_de = chuoi_bat_buoc(truong, 'tieu_de', { toi_da: 250, toi_thieu: 3 });
    const danh_muc = trong_tap(truong, 'danh_muc', DANH_MUC_VB, { bat_buoc: false }) ?? 'khac';
    const mo_ta = chuoi(truong, 'mo_ta', { toi_da: 1000 });
    const noi_dung = chuoi(truong, 'noi_dung', { toi_da: 20000 });
    const nguoi_ban_hanh = chuoi(truong, 'nguoi_ban_hanh', { toi_da: 200 });
    const pham_vi = trong_tap(truong, 'pham_vi', PHAM_VI, { bat_buoc: false }) ?? 'toan_cong_ty';
    const phong_ban_id = pham_vi === 'phong_ban'
      ? uuid(truong, 'phong_ban_id', { bat_buoc: true }) as string : null;
    const nhan_vien_id = pham_vi === 'ca_nhan'
      ? uuid(truong, 'nhan_vien_id', { bat_buoc: true }) as string : null;
    const gui_he_thong = luan_ly(truong, 'gui_he_thong') ?? false;
    const gui_email_bat = luan_ly(truong, 'gui_email') ?? false;

    if ((noi_dung === null || noi_dung === '') && du_lieu === null) {
      throw new LoiDauVao('Văn bản phải có nội dung hoặc tệp đính kèm.');
    }

    // Tep (neu co) luu truoc — cung co che luu_tep chong path traversal.
    const da_luu = du_lieu === null
      ? null
      : await luu_van_ban_cong_ty(du_lieu, ten_goc, danh_muc, ngay_dia_phuong(new Date()));

    let dong: { id: string; ma: string } | null;
    try {
      dong = await truy_van_mot(
        `insert into van_ban_cong_ty
           (tieu_de, mo_ta, noi_dung, nguoi_ban_hanh, danh_muc, pham_vi, phong_ban_id,
            nhan_vien_id, gui_he_thong, gui_email, ten_luu, ten_goc, mime, kich_thuoc, nguoi_tao)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning id, ma`,
        [
          tieu_de, mo_ta === '' ? null : mo_ta, noi_dung === '' ? null : noi_dung,
          nguoi_ban_hanh === '' ? null : nguoi_ban_hanh, danh_muc, pham_vi, phong_ban_id,
          nhan_vien_id, gui_he_thong, gui_email_bat,
          da_luu?.ten_luu ?? null, da_luu === null ? null : ten_goc,
          da_luu?.mime ?? null, da_luu?.kich_thuoc ?? null, nd.sub,
        ],
      );
    } catch (loi) {
      // Tep da nam tren dia truoc khi co dong CSDL. Ghi that bai -> xoa tep mo coi.
      if (da_luu !== null) await xoa_tep_ho_so(da_luu.ten_luu);
      throw loi;
    }
    const vb_id = dong?.id ?? '';

    // -------------------------------------------------- ban hanh: thong bao he thong + email
    let so_nguoi_nhan = 0;
    let da_gui_email = false;
    if (gui_he_thong || gui_email_bat) {
      const nhan = await nguoi_nhan_pham_vi(pham_vi, phong_ban_id, nhan_vien_id);
      so_nguoi_nhan = nhan.length;

      // Than van ban = so hieu + nguoi ban hanh + noi dung. Dung cho ca thong bao lan email.
      const dau = [`Số hiệu: ${dong?.ma ?? ''}`,
        nguoi_ban_hanh === '' || nguoi_ban_hanh === null ? '' : `Người ban hành: ${nguoi_ban_hanh}`]
        .filter((x) => x !== '').join('\n');
      const than_van = [dau, noi_dung ?? '', da_luu === null ? '' : '(Có tệp đính kèm — xem trên hệ thống.)']
        .filter((x) => x !== '').join('\n\n');

      if (gui_he_thong && nhan.length > 0) {
        const tb = await truy_van_mot<{ id: string }>(
          `insert into thong_bao(tieu_de, noi_dung, muc_do, can_giai_trinh, pham_vi,
                                 phong_ban_id, nhan_vien_id, nguoi_tao)
           values ($1,$2,'thuong',false,$3,$4,$5,$6) returning id`,
          [tieu_de, than_van, pham_vi, phong_ban_id, nhan_vien_id, nd.sub],
        );
        if (tb !== null) {
          await thuc_thi('update van_ban_cong_ty set thong_bao_id = $2 where id = $1',
            [vb_id, tb.id]);
          gui_ngam({
            nguoi_dung_ids: nhan.map((n) => n.nguoi_dung_id),
            tieu_de: `Văn bản mới: ${tieu_de}`,
            noi_dung: `${dong?.ma ?? ''} — bấm để xem chi tiết.`,
            du_lieu: { man: 'thong-bao', thong_bao_id: tb.id },
          });
        }
      }

      if (gui_email_bat) {
        const dia_chi = nhan.map((n) => n.email).filter((e): e is string => e !== null && e.includes('@'));
        if (dia_chi.length > 0) {
          da_gui_email = await gui_email({
            den: dia_chi,
            tieu_de: `[${dong?.ma ?? 'Văn bản'}] ${tieu_de}`,
            noi_dung_html: html_email(tieu_de, than_van),
          });
        }
      }
    }

    await ghi_nhat_ky(nd.sub, 'tai_van_ban', 'van_ban_cong_ty', vb_id,
      { danh_muc, pham_vi, gui_he_thong, gui_email: gui_email_bat, so_nguoi_nhan }, req.ip);
    return res.code(201).send({ ...dong, so_nguoi_nhan, da_gui_email });
  });

  /** Go mot van ban (soft delete — con luu tep de khoi phuc). */
  app.patch('/van-ban/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id_param(req);
    const b = than(req.body);
    const da_go = luan_ly(b, 'da_go');
    if (da_go === null) throw new LoiDauVao('Không có thay đổi nào.');
    const kq = await thuc_thi('update van_ban_cong_ty set da_go = $2 where id = $1', [id, da_go]);
    if (kq === 0) throw new LoiKhongTim('Không tìm thấy văn bản.');
    await ghi_nhat_ky(nd.sub, da_go ? 'go_van_ban' : 'khoi_phuc_van_ban', 'van_ban_cong_ty', id,
      {}, req.ip);
    return { ok: true };
  });
}
