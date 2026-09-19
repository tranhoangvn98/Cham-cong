// TU DONG DUYET don xin DI MUON (giai doan 2).
//
// QUY TAC (chu cong ty chot): xin phep TRUOC 7h30 thi duoc den muon (truoc 8h30) KHONG BI PHAT,
// toi da 3 lan/thang. Sau 3 lan -> tu choi, ghi nhan loi di muon nhu thuong. Email bao ket qua.
//
// He thong luong DA CO san co che mien phat: `tinh_phat_di_muon` mien toi da `di_muon_mien_moi_thang`
// lan/thang NEU co don di_muon DA DUYET gui truoc `di_muon_han_don` (7h30) va vao <= 8h30. Viec o
// day chi la TU DONG DUYET don do (thay vi duyet tay): duyet neu truoc han + con luot trong thang,
// nguoc lai tu choi. Phan tinh phat con lai (vao <= 8h30, cap 3 lan) van do buoc tinh luong lo.
import { truy_van_mot } from '../csdl/ket_noi.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { quyet_don } from './nghiep_vu.ts';
import { id_tai_khoan_he_thong } from '../bao_mat/tai_khoan_he_thong.ts';
import { gui_ngam, tai_khoan_cua_nhan_vien } from '../su_kien/thong_bao_day.ts';
import { gui_email, email_bat } from '../su_kien/gui_email.ts';
import { ngay_viet } from '../tien_ich/thoi_gian.ts';

export interface KetQuaDiMuon {
  quyet: 'da_duyet' | 'tu_choi';
  ly_do: string;
  so_da_duyet: number; // so lan da duyet trong thang (truoc don nay)
  mien: number;        // han muc mien/thang
}

interface DongXet {
  nhan_vien_id: string; tu_ngay: string; truoc_han: boolean;
  phat_bat: boolean; mien: number; so_da_duyet: number; ho_ten: string; email: string | null;
}

function than_email_di_muon(ho_ten: string, ngay: string, kq: KetQuaDiMuon): { tieu_de: string; html: string } {
  const duyet = kq.quyet === 'da_duyet';
  const mau = duyet ? '#16A34A' : '#DC2626';
  const tieu_de = duyet ? 'Đơn xin đi muộn đã được duyệt' : 'Đơn xin đi muộn bị từ chối';
  const noi = duyet
    ? `<p style="margin:0 0 10px">Bạn được <b>đi muộn trước 8h30 không bị phạt</b> cho ngày này
        (trong hạn mức <b>${String(kq.mien)} lần/tháng</b>).</p>`
    : `<p style="margin:0 0 10px;color:#B91C1C">Lý do: ${kq.ly_do}</p>
       <p style="margin:0 0 10px">Nếu bạn vẫn đến muộn, ngày này sẽ <b>ghi nhận lỗi đi muộn và xử lý như quy định</b>.</p>`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.55;max-width:560px">
    <div style="background:${mau};color:#fff;padding:14px 18px;border-radius:8px 8px 0 0;font-size:16px;font-weight:700">${tieu_de}</div>
    <div style="border:1px solid #E5E7EB;border-top:0;border-radius:0 0 8px 8px;padding:18px">
      <p style="margin:0 0 10px">Kính gửi <b>${ho_ten}</b>,</p>
      <p style="margin:0 0 10px">Đơn xin đi muộn ngày <b>${ngay_viet(ngay)}</b> đã được hệ thống xử lý tự động.</p>
      ${noi}
      <p style="margin:10px 0 0">Xem chi tiết trong ứng dụng chấm công (mục <b>Đơn của tôi</b>).</p>
      <p style="margin:14px 0 0;color:#6B7280;font-size:12px">Email tự động từ hệ thống chấm công — vui lòng không trả lời trực tiếp.<br/>Trân trọng,<br/><b>Phòng Nhân sự — Công ty TNHH Trần Hoàng Việt Nam</b></p>
    </div>
  </div>`;
  return { tieu_de: `${tieu_de} (${ngay_viet(ngay)})`, html };
}

/**
 * Tu dong duyet mot don di_muon vua nop. Tra ve ket qua (null neu don khong ton tai / khong con
 * cho_duyet). Duyet neu nop truoc han (7h30) va con luot mien trong thang; nguoc lai tu choi.
 */
export async function tu_dong_quyet_di_muon(don_id: string): Promise<KetQuaDiMuon | null> {
  const d = await truy_van_mot<DongXet>(
    `select d.nhan_vien_id, to_char(d.tu_ngay,'YYYY-MM-DD') as tu_ngay,
            ((d.tao_luc + make_interval(hours => $2))::time
              <= coalesce(ts.di_muon_han_don, '07:30'::time)) as truoc_han,
            coalesce(ts.phat_di_muon_bat, false) as phat_bat,
            coalesce(ts.di_muon_mien_moi_thang, 3) as mien,
            (select count(*) from don_tu x
              where x.nhan_vien_id = d.nhan_vien_id and x.loai = 'di_muon'
                and x.trang_thai = 'da_duyet'
                and to_char(x.tu_ngay,'YYYY-MM') = to_char(d.tu_ngay,'YYYY-MM')) as so_da_duyet,
            nv.ho_ten, nv.email
       from don_tu d
       join nhan_vien nv on nv.id = d.nhan_vien_id
       left join lateral (
         select * from tham_so_luong where hieu_luc_tu <= d.tu_ngay
          order by hieu_luc_tu desc limit 1
       ) ts on true
      where d.id = $1 and d.loai = 'di_muon' and d.trang_thai = 'cho_duyet'`,
    [don_id, cau_hinh.device_tz_offset_hours],
  );
  if (d === null) return null;

  let quyet: 'da_duyet' | 'tu_choi';
  let ly_do: string;
  if (!d.phat_bat) {
    // Chua bat phat di muon -> don chi mang tinh ghi nhan, duyet.
    quyet = 'da_duyet';
    ly_do = 'Đã duyệt.';
  } else if (!d.truoc_han) {
    quyet = 'tu_choi';
    ly_do = 'Đơn gửi sau 7h30 nên không được miễn phạt đi muộn.';
  } else if (d.so_da_duyet >= d.mien) {
    quyet = 'tu_choi';
    ly_do = `Đã dùng hết ${String(d.mien)} lần miễn đi muộn trong tháng.`;
  } else {
    quyet = 'da_duyet';
    ly_do = 'Đã duyệt.';
  }

  await quyet_don(don_id, quyet, await id_tai_khoan_he_thong(),
    `[auto] ${quyet === 'da_duyet' ? 'Tự động duyệt đi muộn' : ly_do}`);

  const kq: KetQuaDiMuon = { quyet, ly_do, so_da_duyet: d.so_da_duyet, mien: d.mien };

  const tk = await tai_khoan_cua_nhan_vien(d.nhan_vien_id).catch(() => []);
  if (tk.length > 0) {
    gui_ngam({
      nguoi_dung_ids: tk,
      tieu_de: quyet === 'da_duyet' ? 'Đơn đi muộn đã được duyệt (tự động)' : 'Đơn đi muộn bị từ chối (tự động)',
      noi_dung: quyet === 'da_duyet' ? `Ngày ${ngay_viet(d.tu_ngay)}: miễn phạt đi muộn.` : ly_do,
      du_lieu: { man: 'don-tu', loai: 'di_muon', don_id, quyet_dinh: quyet },
    });
  }
  if (email_bat() && d.email !== null && d.email.includes('@')) {
    const e = than_email_di_muon(d.ho_ten, d.tu_ngay, kq);
    await gui_email({ den: [d.email], tieu_de: e.tieu_de, noi_dung_html: e.html });
  }
  return kq;
}
