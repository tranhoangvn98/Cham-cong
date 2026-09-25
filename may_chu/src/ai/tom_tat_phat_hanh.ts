// Tong hop cac muc phat hanh (tu CHANGELOG) thanh ban nhap thong bao cong bo.
//
// Nguyen tac giong tro ly: AI chi lam GIONG NOI — noi dung that la cac muc CHANGELOG.
// LLM loi / thieu khoa thi dung ban deterministic (tom_tat_kho) — khong bao gio tra loi
// "khong co AI nen khong lam duoc".
//
// Ham THUAN (nhan GoiLlm qua tham so) — test don vi chay duoc trong docker build.
import type { GoiLlm } from './kieu.ts';
import type { MucPhatHanh } from './doc_changelog.ts';

/** Ban nhap thong bao cong bo — dau ra chung cua ca LLM lan fallback. */
export interface BanNhapPhatHanh {
  tieu_de: string;
  noi_dung: string;
}

/** Rut gon mot muc phat hanh thanh mot dong (dung cho fallback va prompt). */
function dong_gon(m: MucPhatHanh): string {
  const tua = m.tieu_de[0] ?? m.cac_y[0] ?? '';
  return `${m.phien_ban}${m.ngay !== '' ? ` (${m.ngay})` : ''}: ${tua}`;
}

/** Ban deterministic khi khong co LLM — khong goi AI, luon tra duoc. */
export function tom_tat_kho(cac_muc: MucPhatHanh[]): BanNhapPhatHanh {
  const phien = cac_muc.map((m) => m.phien_ban);
  const den = phien[0] ?? '';
  const tu = phien[phien.length - 1] ?? den;
  const khoang = cac_muc.length <= 1 ? den : `${tu}–${den}`;
  const cac_dong = cac_muc.map((m) => `- ${dong_gon(m)}`).join('\n');
  return {
    tieu_de: `Cập nhật phần mềm Chấm công — phiên bản ${khoang}`,
    noi_dung: `Phần mềm Chấm công vừa có bản cập nhật mới:\n\n${cac_dong}\n\n`
      + 'Mời anh chị trải nghiệm và phản hồi qua mục "Hòm thư ý kiến" để chúng tôi '
      + 'tiếp tục hoàn thiện.',
  };
}

/**
 * Tong hop cac muc phat hanh thanh thong bao than thien cho toan the nhan vien.
 * Tra ban deterministic khi LLM loi — khong nem loi len tren.
 */
export async function tom_tat_phat_hanh(
  cac_muc: MucPhatHanh[], goi_llm: GoiLlm,
): Promise<BanNhapPhatHanh> {
  if (cac_muc.length === 0) {
    return { tieu_de: 'Cập nhật phần mềm Chấm công', noi_dung: '' };
  }
  const danh_sach = cac_muc.map((m) => ({
    phien_ban: m.phien_ban,
    ngay: m.ngay,
    tieu_de: m.tieu_de,
    cac_y: m.cac_y,
  }));
  const prompt =
    'Bạn viết thông báo nội bộ cho nhân viên một công ty về bản cập nhật phần mềm Chấm công.\n'
    + 'Đầu vào là danh sách thay đổi (JSON) lấy từ nhật ký phiên bản:\n'
    + `${JSON.stringify(danh_sach)}\n\n`
    + 'Viết thông báo ngắn gọn, ấm áp, dễ hiểu cho người KHÔNG làm kỹ thuật:\n'
    + '- CHỈ dùng thông tin có trong danh sách trên. KHÔNG bịa thêm tính năng không có.\n'
    + '- tiêu đề: ngắn (dưới 80 ký tự), nêu tinh thần chung của bản cập nhật.\n'
    + '- nội dung: từ 3 đến 6 gạch đầu dòng, mỗi dòng nêu một điểm mới dưới dạng LỢI ÍCH '
    + 'cho người dùng; giữ nguyên tên riêng (ví dụ: Hòm thư ý kiến); dòng cuối là lời mời '
    + 'dùng thử và góp ý.\n'
    + 'Trả về ĐÚNG khuôn JSON: {"tieu_de": "...", "noi_dung": "..."} '
    + '(noi_dung là một chuỗi, xuống dòng bằng \\n).';

  try {
    const tra_loi = await goi_llm(prompt);
    const thao = JSON.parse(tra_loi) as Record<string, unknown>;
    const tieu_de = typeof thao['tieu_de'] === 'string' ? thao['tieu_de'].trim() : '';
    const noi_dung = typeof thao['noi_dung'] === 'string' ? thao['noi_dung'].trim() : '';
    if (tieu_de === '' || noi_dung === '') return tom_tat_kho(cac_muc);
    return { tieu_de, noi_dung };
  } catch {
    return tom_tat_kho(cac_muc);
  }
}
