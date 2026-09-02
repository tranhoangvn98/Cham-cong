// Ban tin canh bao gui qua email moi ngay mot lan.
//
// TAT SACH KHI THIEU CAU HINH, va do la mot TRANG THAI HOP LE chu khong phai loi: man hinh
// web va xuat CSV van chay day du. Cung nguyen tac voi `ERP_WEBHOOK_URL` — thieu cau hinh
// thi tinh nang tat, khong lam sap tien trinh.
//
// NOI DUNG EMAIL CO Y GIU MONG: ma chung tu, so tien, loai loi, va mot lien ket ve he thong.
// KHONG dua bang chung chi tiet vao email — email di qua may chu thu cua ben thu ba, nam
// trong hop thu ca nhan, va duoc chuyen tiep de dang hon nhieu so voi mot man hinh co dang
// nhap. Ai can chi tiet thi bam vao he thong, noi co phan quyen that.
import nodemailer from 'nodemailer';
import { cau_hinh } from '../cau_hinh.ts';
import { truy_van, thuc_thi } from '../csdl/ket_noi.ts';
import { ngay_dia_phuong, gio_dia_phuong } from '../tien_ich/thoi_gian.ts';

export function bat_email(): boolean {
  return cau_hinh.thu_dien_tu.host !== ''
    && cau_hinh.thu_dien_tu.nguoi_gui !== ''
    && cau_hinh.thu_dien_tu.nguoi_nhan.length > 0;
}

interface DongBanTin {
  tieu_de: string;
  muc_do: string;
  nhom_ten: string;
  loai_loi_ten: string;
  so_tien: string | null;
  nhan_vien_ten: string | null;
  phat_hien_luc: string;
}

/** Canh bao moi ke tu lan gui truoc, sap theo muc do roi den thoi diem. */
export async function canh_bao_moi(tu_luc: Date): Promise<DongBanTin[]> {
  return truy_van<DongBanTin>(
    `select cb.tieu_de, cb.muc_do, lcb.ten as nhom_ten, ll.ten as loai_loi_ten,
            cb.so_tien::text, nv.ho_ten as nhan_vien_ten, cb.phat_hien_luc::text
       from canh_bao cb
       join loai_loi ll on ll.id = cb.loai_loi_id
       join loai_canh_bao lcb on lcb.id = ll.loai_canh_bao_id
       left join nhan_vien nv on nv.id = cb.nhan_vien_id
      where cb.trang_thai = 'moi' and cb.phat_hien_luc >= $1
      order by case cb.muc_do
                 when 'nghiem_trong' then 0 when 'cao' then 1
                 when 'trung' then 2 else 3 end,
               cb.phat_hien_luc desc
      limit 200`,
    [tu_luc.toISOString()],
  );
}

const TEN_MUC_DO: Record<string, string> = {
  thap: 'Thấp', trung: 'Trung bình', cao: 'Cao', nghiem_trong: 'Nghiêm trọng',
};

/** Thoat ky tu HTML. Tieu de canh bao chua du lieu tu ERP 1 — du lieu nguoi ngoai go duoc. */
export function thoat_html(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function dung_noi_dung(
  dong: readonly DongBanTin[], ngay: string, dia_chi_he_thong: string,
): { tieu_de: string; chu: string; html: string } {
  const nghiem_trong = dong.filter((d) => d.muc_do === 'nghiem_trong').length;
  const tieu_de = nghiem_trong > 0
    ? `[Giám sát] ${dong.length} dấu hiệu mới, ${nghiem_trong} nghiêm trọng — ${ngay}`
    : `[Giám sát] ${dong.length} dấu hiệu mới — ${ngay}`;

  const dau = 'Đây là các dấu hiệu cần kiểm tra do hệ thống phát hiện trên dữ liệu ERP 1. '
    + 'Chúng KHÔNG phải kết luận — hãy đối chiếu chứng từ gốc và hỏi người liên quan '
    + 'trước khi xử lý.';

  const chu = [
    dau, '',
    ...dong.map((d) => {
      const tien = d.so_tien === null || Number(d.so_tien) === 0
        ? '' : ` — ${Number(d.so_tien).toLocaleString('vi-VN')} đ`;
      const ai = d.nhan_vien_ten === null ? '' : ` — ${d.nhan_vien_ten}`;
      return `[${TEN_MUC_DO[d.muc_do] ?? d.muc_do}] ${d.nhom_ten}: ${d.tieu_de}${tien}${ai}`;
    }),
    '', `Xem chi tiết: ${dia_chi_he_thong}/giam-sat`,
  ].join('\n');

  const hang = dong.map((d) => {
    const tien = d.so_tien === null || Number(d.so_tien) === 0
      ? '' : `${Number(d.so_tien).toLocaleString('vi-VN')} đ`;
    return `<tr>
      <td>${thoat_html(TEN_MUC_DO[d.muc_do] ?? d.muc_do)}</td>
      <td>${thoat_html(d.nhom_ten)}</td>
      <td>${thoat_html(d.tieu_de)}</td>
      <td align="right">${thoat_html(tien)}</td>
      <td>${thoat_html(d.nhan_vien_ten ?? '')}</td>
    </tr>`;
  }).join('');

  // HTML co y giu don gian: khong CSS ngoai, khong anh, khong font tu tai. Hop thu doanh
  // nghiep thuong chan nhung thu do, va mot email khong doc duoc thi khong ai mo lan hai.
  const html = `<p>${thoat_html(dau)}</p>
<table border="1" cellpadding="6" cellspacing="0">
  <thead><tr>
    <th>Mức độ</th><th>Nhóm</th><th>Dấu hiệu</th><th>Số tiền</th><th>Liên quan</th>
  </tr></thead>
  <tbody>${hang}</tbody>
</table>
<p><a href="${thoat_html(dia_chi_he_thong)}/giam-sat">Mở màn hình Giám sát</a></p>`;

  return { tieu_de, chu, html };
}

/** Moc thoi gian lan gui truoc, luu trong `cong_viec_da_chay`. */
const MA_VIEC_TIEN_TO = 'ban_tin_giam_sat:';

export interface KetQuaGui {
  da_gui: boolean;
  so_canh_bao: number;
  ly_do: string | null;
}

/**
 * Gui ban tin cho mot ngay. Chi gui MOT LAN moi ngay nho khoa `cong_viec_da_chay`.
 *
 * KHONG gui khi khong co canh bao nao: mot email "hom nay khong co gi" moi ngay se duoc loc
 * vao thu muc rac sau hai tuan, va den ngay co chuyen that thi no nam chung o do.
 */
export async function gui_ban_tin(luc = new Date()): Promise<KetQuaGui> {
  if (!bat_email()) {
    return { da_gui: false, so_canh_bao: 0, ly_do: 'Chưa cấu hình SMTP.' };
  }

  const ngay = ngay_dia_phuong(luc);
  const ma_viec = `${MA_VIEC_TIEN_TO}${ngay}`;
  const nhan = await thuc_thi(
    'insert into cong_viec_da_chay(ma_viec) values ($1) on conflict (ma_viec) do nothing',
    [ma_viec],
  );
  if (nhan === 0) {
    return { da_gui: false, so_canh_bao: 0, ly_do: 'Hôm nay đã gửi rồi.' };
  }

  try {
    const tu_luc = new Date(luc.getTime() - 24 * 3600 * 1000);
    const dong = await canh_bao_moi(tu_luc);
    if (dong.length === 0) {
      await thuc_thi('update cong_viec_da_chay set ket_qua = $2 where ma_viec = $1',
        [ma_viec, 'khong co canh bao moi, khong gui']);
      return { da_gui: false, so_canh_bao: 0, ly_do: 'Không có dấu hiệu mới trong 24 giờ.' };
    }

    // Dia chi cong khai cua he thong, de nguoi doc email bam vao xem chi tiet. De trong thi
    // email khong co lien ket — van doc duoc, chi bat tien hon.
    const nd = dung_noi_dung(dong, ngay, cau_hinh.api_goc_cong_khai);
    const van_chuyen = nodemailer.createTransport({
      host: cau_hinh.thu_dien_tu.host,
      port: cau_hinh.thu_dien_tu.port,
      secure: cau_hinh.thu_dien_tu.bao_mat,
      auth: cau_hinh.thu_dien_tu.user === ''
        ? undefined
        : { user: cau_hinh.thu_dien_tu.user, pass: cau_hinh.thu_dien_tu.mat_khau },
    });
    await van_chuyen.sendMail({
      from: cau_hinh.thu_dien_tu.nguoi_gui,
      to: cau_hinh.thu_dien_tu.nguoi_nhan.join(', '),
      subject: nd.tieu_de,
      text: nd.chu,
      html: nd.html,
    });

    await thuc_thi('update cong_viec_da_chay set ket_qua = $2 where ma_viec = $1',
      [ma_viec, `da gui ${dong.length} canh bao luc ${gio_dia_phuong(luc)}`]);
    return { da_gui: true, so_canh_bao: dong.length, ly_do: null };
  } catch (loi) {
    // NHA KHOA de vong sau thu lai. Giu khoa khi gui that bai la mat han ban tin cua ngay do.
    await thuc_thi('delete from cong_viec_da_chay where ma_viec = $1', [ma_viec]);
    throw loi;
  }
}
