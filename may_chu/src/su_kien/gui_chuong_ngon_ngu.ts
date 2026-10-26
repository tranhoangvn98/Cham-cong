// Gui chuong bao (thong bao rieng trong web + push) theo NGON NGU CUA NGUOI NHAN.
//
// Vi sao gom ve mot ham: moi thong bao nguoi dung doc deu phai du hai ngon ngu (CLAUDE.md,
// muc Song ngu Viet - Trung), ma cach lam cu la moi noi tu doc `nguoi_dung.ngon_ngu` roi tu
// chia nhom — ba noi thi ba ban sao, quen mot noi la mot nhom nguoi nhan chu sai ngon ngu.
//
// KHONG chan luong chinh: `gui_ngam` tu nuot loi cua no (xem thong_bao_day.ts).
import { truy_van } from '../csdl/ket_noi.ts';
import { chuan_ngon_ngu, tra_chuoi, type ChuoiKhoa, type NgonNgu } from '../chuoi/chi_muc.ts';
import { gui_ngam } from './thong_bao_day.ts';

export type ThamSoChuoi = Record<string, string | number>;

export interface ThongBaoNgonNgu {
  nguoi_dung_ids: string[];
  tieu_de: ChuoiKhoa;
  noi_dung: ChuoiKhoa;
  /**
   * Tham so lap `{khoa}` — hoac ham theo ngon ngu khi chuoi can duoc dung theo tung thu tieng
   * (vi du danh sach ten noi bang dau phay tieng Viet / dau lien tieng Trung).
   */
  tham_so?: ThamSoChuoi | ((ngon_ngu: NgonNgu) => ThamSoChuoi);
  du_lieu?: Record<string, unknown>;
}

/**
 * Chia nguoi nhan theo `nguoi_dung.ngon_ngu` roi gui MỘT thong bao cho moi nhom.
 * Tra ve so tai khoan da nhan (khong phai so push that su di duoc).
 */
export async function gui_chuong_ngon_ngu(tb: ThongBaoNgonNgu): Promise<number> {
  if (tb.nguoi_dung_ids.length === 0) return 0;
  const dong = await truy_van<{ id: string; ngon_ngu: string | null }>(
    'select id, ngon_ngu from nguoi_dung where id = any($1::uuid[])',
    [tb.nguoi_dung_ids],
  );
  const nhom: Record<NgonNgu, string[]> = { vi: [], zh: [] };
  for (const d of dong) nhom[chuan_ngon_ngu(d.ngon_ngu)].push(d.id);

  let so = 0;
  for (const nn of ['vi', 'zh'] as const) {
    const ids = nhom[nn];
    if (ids.length === 0) continue;
    const tham_so = typeof tb.tham_so === 'function' ? tb.tham_so(nn) : tb.tham_so;
    gui_ngam({
      nguoi_dung_ids: ids,
      tieu_de: tra_chuoi(nn, tb.tieu_de, tham_so),
      noi_dung: tra_chuoi(nn, tb.noi_dung, tham_so),
      du_lieu: tb.du_lieu,
    });
    so += ids.length;
  }
  return so;
}
