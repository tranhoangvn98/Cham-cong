// Routes /phat-hanh/* — CONG BO PHAT HANH (goc quan tri).
//
// Moi dot phat hanh: AI tong hop cac muc moi cua CHANGELOG.md thanh BAN NHAP thong bao,
// admin sua roi CONG BO — luc do tao mot dong `thong_bao` toan cong ty bat popup + gui
// email (co che san co cua thong bao). Popup khi dang nhap hien tu dong qua PopupThongBao.
//
// Nguyen tac: CHANGELOG la nguon su that; AI chi lam giong noi (fallback deterministic khi
// thieu khoa / loi mang). Khong goi AI trong luong request cua nguoi doc — chi goi o route
// `soan` do admin bam.
import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, trong_giao_dich } from '../csdl/ket_noi.ts';
import { can_admin, can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { gui_ngam } from '../su_kien/thong_bao_day.ts';
import { gui_email_thong_bao } from '../su_kien/gui_email_thong_bao.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import {
  chuoi, chuoi_bat_buoc, than, uuid, LoiDauVao, LoiKhongTim, LoiXungDot,
} from '../tien_ich/kiem_tra.ts';
import { goi_deepseek } from '../ai/deepseek.ts';
import { cac_phien_ban, muc_chua_cong_bo, phan_tich_changelog } from '../ai/doc_changelog.ts';
import { tom_tat_phat_hanh } from '../ai/tom_tat_phat_hanh.ts';

function lay_id(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}

/**
 * Tim tep CHANGELOG.md: trong image cwd=/app/may_chu va tep nam o /app/CHANGELOG.md
 * (Dockerfile COPY). Chay truc tiep tu goc repo cung tim thay. Khong tim thay -> null.
 */
function tim_changelog(): string | null {
  const cac = [
    path.join(process.cwd(), 'CHANGELOG.md'),
    path.join(process.cwd(), '..', 'CHANGELOG.md'),
  ];
  for (const p of cac) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // existsSync it khi nem — bo qua, thu ung vien ke tiep.
    }
  }
  return null;
}

/** Doc CHANGELOG thanh chuoi. Thieu tep thi nem loi ro rang de admin biet xu ly. */
function doc_noi_dung_changelog(): string {
  const p = tim_changelog();
  if (p === null) {
    throw new LoiXungDot('Không tìm thấy CHANGELOG.md bên cạnh mã nguồn máy chủ.');
  }
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (loi) {
    throw new LoiXungDot(`Không đọc được CHANGELOG.md: ${(loi as Error).message}`);
  }
}

export async function tuyen_cong_bo_phat_hanh(app: FastifyInstance): Promise<void> {
  // ------------------------------------------------------------ danh sach dot cong bo
  app.get('/phat-hanh', { preHandler: can_nhan_su }, async () => {
    return truy_van(
      `select p.id, p.tu_phien_ban, p.den_phien_ban, p.tieu_de, p.noi_dung, p.trang_thai,
              p.thong_bao_id, p.tao_luc, p.cap_nhat_luc
         from cong_bo_phat_hanh p
        order by p.tao_luc desc limit 100`,
    );
  });

  // ------------------------------------------------------------ chi tiet mot dot
  app.get('/phat-hanh/:id', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    const d = await truy_van_mot(
      `select id, tu_phien_ban, den_phien_ban, tieu_de, noi_dung, trang_thai,
              thong_bao_id, tao_luc, cap_nhat_luc
         from cong_bo_phat_hanh where id = $1`,
      [id],
    );
    if (d === null) throw new LoiKhongTim('Không tìm thấy bản công bố.');
    return d;
  });

  // ------------------------------------------------------------ phien ban + de xuat
  app.get('/phat-hanh/phien-ban', { preHandler: can_nhan_su }, async () => {
    const cac = cac_phien_ban(phan_tich_changelog(doc_noi_dung_changelog()));
    const den = cac[0] ?? '';
    const cuoi = await truy_van_mot<{ den_phien_ban: string }>(
      `select den_phien_ban from cong_bo_phat_hanh
        where trang_thai = 'da_cong_bo' order by tao_luc desc limit 1`,
    );
    return {
      cac_phien_ban: cac,
      de_xuat: { tu: cuoi?.den_phien_ban ?? '', den },
    };
  });

  // ------------------------------------------------------------ soan ban nhap (AI)
  app.post('/phat-hanh/soan', { preHandler: can_nhan_su }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const cac = phan_tich_changelog(doc_noi_dung_changelog());
    const den = chuoi(b, 'den_phien_ban', { toi_da: 30 })
      ?? cac_phien_ban(cac)[0] ?? '';
    const tu = chuoi(b, 'tu_phien_ban', { toi_da: 30 }) ?? '';

    const khoang = muc_chua_cong_bo(cac, tu, den);
    if (khoang.length === 0) {
      throw new LoiDauVao('Khoảng phiên bản chọn không có mục nào trong CHANGELOG.');
    }
    const tu_thuc = khoang[khoang.length - 1]?.phien_ban ?? den;
    const den_thuc = khoang[0]?.phien_ban ?? den;

    // AI chi lam giong noi; LLM loi thi tom_tat_phat_hanh tu tra ban deterministic.
    const ban = await tom_tat_phat_hanh(khoang, (prompt) =>
      goi_deepseek(prompt, { ghi_log: (s) => console.info(`[phat-hanh] ${s}`) }));

    const dong = await truy_van_mot<{ id: string }>(
      `insert into cong_bo_phat_hanh (tu_phien_ban, den_phien_ban, tieu_de, noi_dung, nguoi_tao)
       values ($1,$2,$3,$4,$5) returning id`,
      [tu_thuc, den_thuc, ban.tieu_de, ban.noi_dung, nd.sub],
    );
    await ghi_nhat_ky(nd.sub, 'phat_hanh.soan', 'cong_bo_phat_hanh', dong?.id ?? null,
      { tu_phien_ban: tu_thuc, den_phien_ban: den_thuc }, req.ip);
    return res.code(201).send({ ...dong, tu_phien_ban: tu_thuc, den_phien_ban: den_thuc, ...ban });
  });

  // ------------------------------------------------------------ sua ban nhap
  app.patch('/phat-hanh/:id', { preHandler: can_nhan_su }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);
    const b = than(req.body);
    const tieu_de = chuoi_bat_buoc(b, 'tieu_de', { toi_thieu: 3, toi_da: 300 });
    const noi_dung = chuoi_bat_buoc(b, 'noi_dung', { toi_thieu: 1, toi_da: 8000 });

    const hien = await truy_van_mot<{ trang_thai: string }>(
      'select trang_thai from cong_bo_phat_hanh where id = $1', [id]);
    if (hien === null) throw new LoiKhongTim('Không tìm thấy bản nháp công bố.');
    if (hien.trang_thai !== 'nhap') {
      throw new LoiXungDot('Bản công bố đã phát hành rồi, không sửa được nữa.');
    }
    const dong = await truy_van_mot<{ id: string; tu_phien_ban: string; den_phien_ban: string }>(
      `update cong_bo_phat_hanh set tieu_de = $2, noi_dung = $3, cap_nhat_luc = now()
        where id = $1 returning id, tu_phien_ban, den_phien_ban`,
      [id, tieu_de, noi_dung],
    );
    await ghi_nhat_ky(nd.sub, 'phat_hanh.sua', 'cong_bo_phat_hanh', id, {}, req.ip);
    return { ...dong, tieu_de, noi_dung };
  });

  // ------------------------------------------------------------ cong bo (admin)
  app.post('/phat-hanh/:id/cong-bo', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);

    const d = await truy_van_mot<{
      tieu_de: string | null; noi_dung: string | null; trang_thai: string;
    }>(
      'select tieu_de, noi_dung, trang_thai from cong_bo_phat_hanh where id = $1', [id],
    );
    if (d === null) throw new LoiKhongTim('Không tìm thấy bản nháp công bố.');
    if (d.trang_thai !== 'nhap') {
      throw new LoiXungDot('Bản công bố này đã được công bố rồi.');
    }
    if (d.tieu_de === null || d.noi_dung === null
      || d.tieu_de.trim() === '' || d.noi_dung.trim() === '') {
      throw new LoiDauVao('Bản nháp chưa có tiêu đề / nội dung.');
    }

    // Mot transaction: tao thong bao toan cong ty (popup + gui email) + danh dau da cong bo.
    const thong_bao = await trong_giao_dich(async (khach) => {
      const kq = await khach.query<{ id: string; ma: string }>(
        `insert into thong_bao (tieu_de, noi_dung, muc_do, can_giai_trinh, pham_vi,
                                nguoi_tao, popup, gui_email)
         values ($1,$2,'thuong',false,'toan_cong_ty',$3,true,true)
         returning id, ma`,
        [d.tieu_de, d.noi_dung, nd.sub],
      );
      const dong = kq.rows[0];
      if (dong === undefined) throw new LoiXungDot('Không tạo được dòng thông báo.');

      const cap_nhat = await khach.query(
        `update cong_bo_phat_hanh
            set trang_thai = 'da_cong_bo', thong_bao_id = $2, cap_nhat_luc = now()
          where id = $1 and trang_thai = 'nhap'`,
        [id, dong.id],
      );
      if (cap_nhat.rowCount === 0) {
        throw new LoiXungDot('Bản công bố này đã được công bố rồi.');
      }
      return dong;
    });

    await ghi_nhat_ky(nd.sub, 'phat_hanh.cong_bo', 'cong_bo_phat_hanh', id,
      { thong_bao_id: thong_bao.id }, req.ip);

    // Chuong bao + push cho toan the tai khoan dang hoat dong.
    const nguoi_nhan = await truy_van<{ id: string }>(
      `select u.id from nguoi_dung u
         join nhan_vien nv on nv.id = u.nhan_vien_id
        where u.dang_hoat_dong = true and nv.dang_hoat_dong = true`,
    );
    if (nguoi_nhan.length > 0) {
      gui_ngam({
        nguoi_dung_ids: nguoi_nhan.map((n) => n.id),
        tieu_de: `Có bản cập nhật mới: ${d.tieu_de}`,
        noi_dung: 'Bấm để xem chi tiết các tính năng mới.',
        du_lieu: { man: 'thong-bao', thong_bao_id: thong_bao.id },
      });
    }

    // Gui email toan cong ty — fire-and-forget, vong quet quet_email_cho bu lai.
    void gui_email_thong_bao(thong_bao.id).catch((loi) => {
      console.error('[phat-hanh] gui email cong bo loi:', (loi as Error).message);
    });

    return { ok: true, thong_bao_id: thong_bao.id };
  });
}
