// Quet viec qua han: chuyen 'moi'/'dang_lam' thanh 'khong_hoan_thanh' khi han_moc da qua.
//
// Chay MOI VONG cua lich chay (khong cho gio cuoi ngay) de trang thai doi dung theo gio
// han. Mot cau UPDATE `where han_moc < now()` + chi muc mot phan nen rẻ; moi viec chi doi
// trang thai MOT LAN nen goi nhieu vong khong spam thong bao.
//
// Nguoi nhan nop truoc han ma dang cho duyet (cho_duyet) thi KHONG bi cham: ho da nop,
// viec con lai la nguoi giao duyet.
import { truy_van } from '../csdl/ket_noi.ts';
import { nguoi_lien_quan } from './cong_viec.ts';
import { gui_ngam } from '../su_kien/thong_bao_day.ts';

interface ViecQuaHan {
  id: string;
  nhan_vien_id: string;
  giao_boi: string | null;
  tieu_de: string;
  ho_ten: string | null;
}

/** Tra ve so viec da chuyen thanh khong hoan thanh. */
export async function quet_qua_han(): Promise<number> {
  const dong = await truy_van<ViecQuaHan>(
    `update cong_viec v
        set trang_thai = 'khong_hoan_thanh', cap_nhat_luc = now()
      where v.han_moc is not null
        and v.han_moc < now()
        and v.trang_thai in ('moi','dang_lam')
      returning v.id, v.nhan_vien_id, v.giao_boi, v.tieu_de,
                (select nv.ho_ten from nhan_vien nv where nv.id = v.nhan_vien_id) as ho_ten`,
  );

  for (const d of dong) {
    const ids = await nguoi_lien_quan(d.nhan_vien_id, d.giao_boi);
    gui_ngam({
      nguoi_dung_ids: [...new Set(ids)],
      tieu_de: 'Công việc đã quá hạn',
      noi_dung: `Việc «${d.tieu_de}» chưa nộp kết quả khi hết hạn — đã chuyển thành không hoàn thành.`,
      du_lieu: { man: 'cong-viec', loai: 'qua_han', viec_id: d.id },
    });
  }
  return dong.length;
}
