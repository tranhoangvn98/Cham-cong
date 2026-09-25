// Routes /phat-hanh/* — CONG BO PHAT HANH (goc quan tri).
//
// Moi dot phat hanh: AI tong hop cac muc moi cua CHANGELOG.md thanh van xuoi, roi DU NG THANH
// VAN BAN CONG TY dung luong NĐ30 (bang thong_bao_nhap_ai: worker dung docx + gate) —
// giong het chuc nang soan van ban cong ty. Nhan su xem truoc / sua van xuoi / trinh ky ngay
// trong trinh soan van ban; admin CONG BO = ban hanh cap so DUNG luong van ban AI (co DOCX
// chinh thuc) voi popup + gui email. Van ban xuat hien o tab "Van ban ban hanh" cua trang
// Van ban cong ty.
//
// Nguyen tac: CHANGELOG la nguon su that; AI chi lam giong noi (fallback deterministic khi
// thieu khoa / loi mang). Khong goi AI trong luong request cua nguoi doc — chi goi o route
// `soan` do admin bam.
import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { can_admin, can_nhan_su, nguoi_dung_hien_tai } from '../bao_mat/xac_thuc.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import {
  chuoi, than, uuid, LoiDauVao, LoiKhongTim, LoiXungDot,
} from '../tien_ich/kiem_tra.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { goi_deepseek } from '../ai/deepseek.ts';
import { cac_phien_ban, muc_chua_cong_bo, phan_tich_changelog } from '../ai/doc_changelog.ts';
import { tom_tat_phat_hanh } from '../ai/tom_tat_phat_hanh.ts';
import { chuan_hoa_van_ai, la_dong_nguoi_nhan } from '../ai/soan_van_ban.ts';
import { ghep_spec, kiem_tra_spec } from '../ai/ghep_spec.ts';
import { ben_nhan, nguoi_ky_cua } from '../su_kien/soan_van_ban_day.ts';
import { ban_hanh_nhap_ai } from './thong_bao_ai.ts';

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
              p.thong_bao_id, p.nhap_ai_id, n.ma as ma_van_ban,
              n.trang_thai as tt_van_ban, n.so_ky_hieu, p.tao_luc, p.cap_nhat_luc
         from cong_bo_phat_hanh p
         left join thong_bao_nhap_ai n on n.id = p.nhap_ai_id
        order by p.tao_luc desc limit 100`,
    );
  });

  // ------------------------------------------------------------ chi tiet mot dot
  app.get('/phat-hanh/:id', { preHandler: can_nhan_su }, async (req) => {
    const id = lay_id(req);
    const d = await truy_van_mot(
      `select p.id, p.tu_phien_ban, p.den_phien_ban, p.tieu_de, p.noi_dung, p.trang_thai,
              p.thong_bao_id, p.nhap_ai_id, n.ma as ma_van_ban,
              n.trang_thai as tt_van_ban, n.so_ky_hieu, p.tao_luc, p.cap_nhat_luc
         from cong_bo_phat_hanh p
         left join thong_bao_nhap_ai n on n.id = p.nhap_ai_id
        where p.id = $1`,
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

    // Dung van xuoi cho ban nhap van ban AI NĐ30 (che do tu_soan) — worker dung docx + gate
    // het nhu soan van ban cong ty thuong. Bo cac dong nham than nguoi nhan, them dau cham
    // doan cuoi cho qua G8.
    const cac_doan = ban.noi_dung.split('\n').map((s) => s.trim())
      .filter((s) => s !== '' && !la_dong_nguoi_nhan(s))
      .map((s) => s.replace(/^[-•]\s*/, ''));
    const goc = cac_doan.length > 0 ? cac_doan : [ban.noi_dung];
    const doan_cuoi = goc.map((s, i) =>
      i === goc.length - 1 && !/[.!)]$/.test(s) ? `${s}.` : s);
    const van_ai = chuan_hoa_van_ai('thong_bao', {
      trich_yeu: ban.tieu_de, kinh_gui: [], can_cu: [], dieu: [], noi_dung: doan_cuoi,
    });
    const ky = await nguoi_ky_cua(nd.sub);
    const nhan = await ben_nhan({
      id: '', ma: '', loai: 'thong_bao', pham_vi: 'toan_cong_ty', quan_he: 'noi_bo',
      phong_ban_id: null, nhan_vien_id: null, muc_dich: 'pho_bien', muc_do: 'thuong',
      can_giai_trinh: false, het_han: null, noi_dung_tho: ban.noi_dung,
      la_qd_nghi_viec: false, ngay_nghi_viec: null,
      che_do: 'tu_soan', spec_json: null, nguoi_tao: nd.sub,
    });
    const spec = ghep_spec({
      co_quan_ban_hanh: cau_hinh.van_ban.co_quan_ban_hanh,
      dia_danh: cau_hinh.van_ban.dia_danh,
      ngay: ngay_dia_phuong(new Date()),
      nguoi_ky: ky.ten,
      chuc_vu_nguoi_ky: ky.chuc_vu,
      noi_nhan: nhan.noi_nhan,
    }, 'thong_bao', 'toan_cong_ty', 'noi_bo', van_ai,
      { nhan_vien_id: null, phong_ban_id: null });
    const loi_spec = kiem_tra_spec(spec);
    if (loi_spec.length > 0) throw new LoiDauVao(`Văn xuôi chưa đủ: ${loi_spec.join(' ')}`);

    const nhap = await truy_van_mot<{ id: string; ma: string }>(
      `insert into thong_bao_nhap_ai(loai, pham_vi, quan_he, phong_ban_id, nhan_vien_id,
                                     muc_dich, muc_do, can_giai_trinh, het_han,
                                     la_qd_nghi_viec, ngay_nghi_viec,
                                     noi_dung_tho, che_do, spec_json, nguoi_tao)
       values ('thong_bao','toan_cong_ty','noi_bo',null,null,'pho_bien','thuong',false,null,
               false,null,$1,'tu_soan',$2::jsonb,$3)
       returning id, ma`,
      [ban.noi_dung, JSON.stringify(spec), nd.sub],
    );
    const dong = await truy_van_mot<{ id: string }>(
      `insert into cong_bo_phat_hanh
         (tu_phien_ban, den_phien_ban, tieu_de, noi_dung, nhap_ai_id, nguoi_tao)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [tu_thuc, den_thuc, ban.tieu_de, ban.noi_dung, nhap?.id ?? null, nd.sub],
    );
    await ghi_nhat_ky(nd.sub, 'phat_hanh.soan', 'cong_bo_phat_hanh', dong?.id ?? null,
      { tu_phien_ban: tu_thuc, den_phien_ban: den_thuc, nhap_ai_id: nhap?.id ?? null }, req.ip);
    return res.code(201).send({
      ...dong, tu_phien_ban: tu_thuc, den_phien_ban: den_thuc,
      nhap_ai_id: nhap?.id ?? null, ma_van_ban: nhap?.ma ?? null, ...ban,
    });
  });

  // ------------------------------------------------------------ cong bo (admin)
  app.post('/phat-hanh/:id/cong-bo', { preHandler: can_admin }, async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const id = lay_id(req);

    const d = await truy_van_mot<{ nhap_ai_id: string | null; trang_thai: string }>(
      'select nhap_ai_id, trang_thai from cong_bo_phat_hanh where id = $1', [id],
    );
    if (d === null) throw new LoiKhongTim('Không tìm thấy bản nháp công bố.');
    if (d.trang_thai !== 'nhap') {
      throw new LoiXungDot('Bản công bố này đã được công bố rồi.');
    }
    if (d.nhap_ai_id === null) {
      throw new LoiXungDot('Bản công bố chưa có văn bản để ban hành.');
    }

    // Ban hanh DUNG luong van ban AI: cap so + gate lan cuoi + DOCX chinh thuc, bat popup
    // + gui email. Van ban sau do xuat hien o tab "Van ban ban hanh" cua Van ban cong ty.
    const kq = await ban_hanh_nhap_ai(d.nhap_ai_id, nd,
      { ip: req.ip, popup: true, gui_email: true });

    await thuc_thi(
      `update cong_bo_phat_hanh
          set trang_thai = 'da_cong_bo', thong_bao_id = $2, cap_nhat_luc = now()
        where id = $1 and trang_thai = 'nhap'`,
      [id, kq.thong_bao_id],
    );
    await ghi_nhat_ky(nd.sub, 'phat_hanh.cong_bo', 'cong_bo_phat_hanh', id,
      { thong_bao_id: kq.thong_bao_id, so_ky_hieu: kq.so_ky_hieu }, req.ip);
    return { ok: true, thong_bao_id: kq.thong_bao_id, so_ky_hieu: kq.so_ky_hieu };
  });
}
