// Prompt soan van ban AI — noi quy tac the thuc + quy uoc THVN + ma tran giong.
//
// Boi canh chi DINH HUONG GIONG, khong phai nguon du kien: AI khong duoc sinh ten cong ty,
// so ky hieu, ngay, dia danh, nguoi ky tu day — cac truong do code dien (xem ghep_spec.ts).
// Prompt cam AI noi PII (ND 13/2023) va khang dinh phap ly thay luat su.
import type {
  KieuVanBan, KetQuaGate, MucDo, PhamViNhan, QuanHe,
} from './kieu.ts';

/** Boi canh do CODE dung truoc khi goi AI (can DB de resolve nguoi nhan). */
export interface BoiCanhSoan {
  loai: KieuVanBan;
  quan_he: QuanHe;
  pham_vi: PhamViNhan;
  /** 'CÔNG TY TNHH ...' — de AI biet ai dang noi. */
  ben_ban_hanh: string;
  nguoi_ky: string;
  chuc_vu_nguoi_ky: string;
  /** Ai nhan: 'toàn thể CBNV Phòng Kinh doanh' / 'Ông Nguyễn Văn A (Nhân viên, Phòng KD)'. */
  ben_nhan: string;
  /** Nhan muc dich tieng Viet, vd 'Phổ biến chính sách'. */
  muc_dich: string;
  muc_do: MucDo;
  can_giai_trinh: boolean;
  het_han: string | null;
  /** Ngay nghi viec 'YYYY-MM-DD' — chi co khi day la quyet dinh nghi viec. */
  ngay_nghi_viec: string | null;
}

const QUY_TAC_ND30 = [
  'Thể thức theo Nghị định 30/2020/NĐ-CP (doanh nghiệp vận dụng).',
  'CÔNG VĂN: không in tên loại; bắt buộc có "Kính gửi"; trích yếu bắt đầu bằng "V/v"; ',
    + 'ký hiệu văn bản KHÔNG chứa chữ "CV".',
  'QUYẾT ĐỊNH: bắt buộc có phần căn cứ (can_cu), lời dẫn kết thúc bằng "QUYẾT ĐỊNH:", ',
    + 'sau đó là các Điều đánh số; TUYỆT ĐỐI KHÔNG viết dòng "Kính gửi".',
  'THÔNG BÁO: in tên loại "THÔNG BÁO", trích yếu bắt đầu bằng "Về việc"; TUYỆT ĐỐI '
    + 'KHÔNG viết dòng "Kính gửi" trong nội dung — người nhận ghi ở khối "Nơi nhận" cuối văn bản.',
  'THÔNG BÁO / QUYẾT ĐỊNH: trích yếu BẮT ĐẦU BẰNG "Về việc", TUYỆT ĐỐI KHÔNG dùng "V/v" '
    + '("V/v" chỉ dành cho công văn).',
  'NGƯỜI NHẬN KHÔNG NẰM TRONG noi_dung: không viết bất kỳ dòng người nhận nào vào nội dung '
    + '(kể cả "Toàn thể cán bộ, nhân viên ..." hoặc "Kính gửi ...") — hệ thống tự in người nhận '
    + 'ở "Nơi nhận" cuối văn bản (thông báo/quyết định) hoặc dòng "Kính gửi" (công văn).',
  'Đoạn cuối văn bản phải kết thúc bằng dấu chấm.',
].join('\n');

const QUY_UOC_THVN = [
  'Công ty hoạt động lĩnh vực Wuliu (物流) / thông quan / ủy thác xuất nhập khẩu biên giới '
    + 'Việt – Trung.',
  'Tuyệt đối không viết "U Liễu". Khi nhắc tới ngành, viết "Wuliu" và "ủy thác XNK".',
  'Không nêu số CCCD, số điện thoại, số tài khoản, mức lương cá nhân trong văn bản gửi '
    + 'nhiều người (Nghị định 13/2023/NĐ-CP). Với cá nhân, chỉ dùng họ tên và chức danh.',
  'Chỉ soạn nháp trình bày; không khẳng định điều khoản pháp lý thay luật sư.',
].join('\n');

/** Ma tran giong — doi chieu quan he + pham vi thanh chi dan cu the. */
function chi_dan_giong(b: BoiCanhSoan): string {
  if (b.quan_he === 'doi_ngoai') {
    return 'Quan hệ đối ngoại: mở đầu "Kính gửi Quý cơ quan/Quý Công ty"; giọng trang trọng; '
      + 'dùng "kính đề nghị", "trân trọng".';
  }
  if (b.pham_vi === 'ca_nhan') {
    return `Quan hệ nội bộ, gửi 1 cá nhân: xưng hô "Ông/Bà [tên]", giọng yêu cầu/nhắc nhở `
      + 'nghiêm, đúng mực.';
  }
  return 'Quan hệ nội bộ, gửi tập thể: xưng hô "toàn thể cán bộ, nhân viên [đơn vị]"; '
    + 'giọng điều hành: "Yêu cầu/Đề nghị ... nghiêm túc thực hiện".';
}

/** Schema JSON AI phai tra — chi van xuoi, khong co truong he thong. */
function chi_dan_khuon(b: BoiCanhSoan): string {
  const co_quyet_dinh = b.loai === 'quyet_dinh';
  const co_cong_van = b.loai === 'cong_van';
  return [
    'Chỉ trả về MỘT đối tượng JSON, đúng khóa, không thêm khóa khác:',
    '  trich_yeu: chuỗi trích yếu (công văn bắt đầu "V/v"; thông báo/quyết định bắt đầu "Về việc", '
      + 'không dùng "V/v").',
    `  kinh_gui: mảng chuỗi nơi gửi${co_cong_van ? ' (BẮT BUỘC, ≥1)' : ' (thường rỗng)'}.`,
    co_quyet_dinh
      ? '  can_cu: mảng chuỗi căn cứ ban hành (BẮT BUỘC, ≥1, không kết thúc bằng dấu chấm).'
      : '  can_cu: KHÔNG dùng cho loại văn bản này (bỏ khóa).',
    co_quyet_dinh
      ? '  dieu: mảng chuỗi nội dung các Điều (BẮT BUỘC, ≥1).'
      : '  dieu: KHÔNG dùng cho loại văn bản này (bỏ khóa).',
    `  noi_dung: mảng chuỗi các đoạn${co_quyet_dinh
      ? '; đoạn đầu là lời dẫn KẾT THÚC BẰNG "QUYẾT ĐỊNH:", KHÔNG lặp lại các căn cứ '
        + 'đã ghi ở can_cu (căn cứ do hệ thống in riêng ở khối "Căn cứ")'
      : ''} (BẮT BUỘC, ≥1, không rỗng; KHÔNG có dòng người nhận).`,
  ].join('\n');
}

/** Gom ly do truot gate lan truoc de AI sua cho dung. */
function chi_dan_sua(loi_lan_truoc: KetQuaGate[] | undefined): string {
  if (loi_lan_truoc === undefined || loi_lan_truoc.length === 0) return '';
  const ly_do = loi_lan_truoc
    .filter((k) => !k.dat)
    .map((k) => `- ${k.ma_check}: ${k.ly_do}`)
    .join('\n');
  return `\nBản trước bị trượt kiểm tra, phải sửa các lỗi sau:\n${ly_do}`;
}

/**
 * Dung prompt hoan chinh cho mot lan soan.
 *
 * Boi canh chi nhung vao prompt — khong vao spec, khong vao tep docx.
 */
export function prompt_soan(
  b: BoiCanhSoan,
  noi_dung_tho: string,
  loi_lan_truoc?: KetQuaGate[],
): string {
  const muc_do = b.muc_do === 'khan'
    ? ' Mức độ KHẨN: thể hiện sự khẩn trương.'
    : b.muc_do === 'quan_trong' ? ' Mức độ quan trọng.' : '';
  const giai_trinh = b.can_giai_trinh
    ? '\nNgười nhận có nghĩa vụ phản hồi/giải trình — nêu rõ yêu cầu và hạn phản hồi.'
    : '';
  const het_han = b.het_han !== null
    ? `\nThời hạn hiệu lực của thông báo: ${b.het_han}.`
    : '';
  const nghi_viec = b.ngay_nghi_viec !== null
    ? `\nĐây là QUYẾT ĐỊNH CHẤM DỨT HỢP ĐỒNG LAO ĐỘNG (nghỉ việc). `
      + `Điều đầu tiên phải ghi rõ ngày nghỉ việc: ${b.ngay_nghi_viec}.`
    : '';

  return [
    'Bạn là chuyên viên soạn văn bản hành chính của một doanh nghiệp Việt Nam.',
    '',
    '## Quy tắc thể thức',
    QUY_TAC_ND30,
    '',
    '## Quy ước riêng của công ty',
    QUY_UOC_THVN,
    '',
    '## Bối cảnh bản này (CHỈ dùng để định giọng, không sinh dữ kiện từ đây)',
    `- Bên ban hành: ${b.ben_ban_hanh}; người ký: ${b.nguoi_ky}, ${b.chuc_vu_nguoi_ky}.`,
    `- Bên nhận: ${b.ben_nhan}.`,
    `- Mục đích: ${b.muc_dich}.${muc_do}${giai_trinh}${het_han}${nghi_viec}`,
    `- Giọng: ${chi_dan_giong(b)}`,
    '',
    'Số ký hiệu, ngày tháng, địa danh, tên công ty, người ký do hệ thống tự điền — '
      + 'KHÔNG tự nghĩ ra những dữ kiện đó, KHÔNG chèn dấu ngoặc vuông hay chỗ trống '
      + 'như "[...]", "XXX", "TODO".',
    '',
    '## Đầu ra',
    chi_dan_khuon(b),
    chi_dan_sua(loi_lan_truoc),
    '',
    '## Nội dung thô người tạo nhập',
    noi_dung_tho.trim(),
  ].join('\n');
}
