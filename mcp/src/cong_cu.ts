// Khai bao cac cong cu MCP cho phan he Cham cong — moi cong cu la mot goi REST /api/v1.
//
// QUY TAC:
//   - Mo ta cong cu viet tieng Viet CO DAU vi LLM doc de hieu ngu canh.
//   - Ten tham so va ten cong cu khong dau (quy uoc dat ten cua du an).
//   - Cong cu CHI doc nhung duong da biet san — khong co cong cu "goi duong tuy y".
//   - Cong cu ghi (luu_nhan_vien, ghi_nhan_vi_pham) chi chay duoc khi khoa co pham vi ghi;
//     may chu se tu choi bang loi co ma de LLM giai thich lai cho nguoi dung.
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { goi_api, LoiApi } from './goi_api.ts';

/** Than noi dung tra ve cho LLM — luon la mot khoi van ban JSON hoa. */
function tra_ve(du_lieu: unknown): { content: [{ type: 'text'; text: string }] } {
  return { content: [{ type: 'text', text: JSON.stringify(du_lieu, null, 2) }] };
}

/** Boc loi thanh ket qua MCP isError de LLM doc duoc nguyen nhan. */
function tra_loi(loi: unknown): { content: [{ type: 'text'; text: string }]; isError: true } {
  const chu = loi instanceof LoiApi
    ? `${loi.message} (ma: ${loi.ma_loi}, HTTP ${loi.ma})`
    : `Lỗi khi gọi máy chủ chấm công: ${(loi as Error).message}`;
  return { content: [{ type: 'text', text: chu }], isError: true };
}

/** Chuan so (zod tra number) thanh chuoi cho tham so truy van. */
function chu_so(n: number | undefined): string {
  return n === undefined ? '' : String(n);
}

const PHEP_PHAN_TRANG = {
  gioi_han: z.number().int().min(1).max(500).default(50)
    .describe('Số bản ghi tối đa một lần gọi (1-500).'),
  bo_qua: z.number().int().min(0).default(0)
    .describe('Bỏ qua bao nhiêu bản ghi đầu — dùng để phân trang.'),
};

const PHEP_NGAY = {
  tu: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Ngày bắt đầu, dạng YYYY-MM-DD.'),
  den: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Ngày kết thúc, dạng YYYY-MM-DD.'),
};

/** Danh sach ten cong cu — de bo kiem doi chieu khong thieu cong cu nao. */
export const TEN_CONG_CU = [
  'lay_thong_tin_khoa',
  'tim_nhan_vien',
  'doc_nhan_vien',
  'luu_nhan_vien',
  'doc_bang_cong',
  'tong_hop_bang_cong',
  'doc_lan_quet',
  'doc_nghi_phep',
  'doc_don',
  'doc_vi_pham',
  'ghi_nhan_vi_pham',
  'doc_ky_luat',
  'doc_van_ban',
  'doc_thong_bao',
  'doc_su_kien',
] as const;

/**
 * Dang ky toan bo cong cu vao mot McpServer.
 */
export function dang_ky_cong_cu(mc: McpServer): void {
  mc.registerTool('lay_thong_tin_khoa', {
    description: 'Kiểm tra khóa API đang dùng còn sống không và có những phạm vi nào. '
      + 'Gọi đầu tiên để biết MCP được phép đọc/ghi gì trước khi gọi công cụ khác.',
    inputSchema: {},
  }, async () => {
    try {
      return tra_ve(await goi_api('/api/v1/toi'));
    } catch (loi) { return tra_loi(loi); }
  });

  // ------------------------------------------------------------ nhan vien
  mc.registerTool('tim_nhan_vien', {
    description: 'Tìm nhân viên theo mã hoặc họ tên. Mặc định chỉ trả người đang làm; '
      + 'đặt gom_da_nghi=true để lấy cả người đã nghỉ.',
    inputSchema: {
      tim: z.string().max(100).optional().describe('Từ khóa tìm theo mã nhân viên hoặc họ tên.'),
      gom_da_nghi: z.boolean().optional().describe('true = lấy cả người đã nghỉ việc.'),
      ...PHEP_PHAN_TRANG,
    },
  }, async (dau) => {
    try {
      return tra_ve(await goi_api('/api/v1/nhan-vien', {
        truy_van: {
          tim: dau.tim ?? '', gom_da_nghi: dau.gom_da_nghi === true ? 'true' : '',
          gioi_han: chu_so(dau.gioi_han), bo_qua: chu_so(dau.bo_qua),
        },
      }));
    } catch (loi) { return tra_loi(loi); }
  });

  mc.registerTool('doc_nhan_vien', {
    description: 'Xem chi tiết một nhân viên theo mã nhân viên (không phải UUID nội bộ).',
    inputSchema: {
      ma_nv: z.string().min(1).max(64).describe('Mã nhân viên, không phân biệt hoa thường.'),
    },
  }, async (dau) => {
    try {
      return tra_ve(await goi_api(`/api/v1/nhan-vien/${dau.ma_nv}`));
    } catch (loi) { return tra_loi(loi); }
  });

  mc.registerTool('luu_nhan_vien', {
    description: 'Tạo hoặc cập nhật hồ sơ nhân viên theo mã nhân viên (upsert). Trường không '
      + 'gửi thì giữ nguyên, không xóa trắng. Cần phạm vi `nhan_vien:ghi` — khóa chỉ đọc sẽ '
      + 'bị từ chối.',
    inputSchema: {
      ma_nv: z.string().min(1).max(64).describe('Mã nhân viên.'),
      ho_ten: z.string().max(200).optional().describe('Họ tên. Bắt buộc khi tạo mới.'),
      email: z.string().max(200).optional(),
      so_dien_thoai: z.string().max(30).optional(),
      chuc_danh: z.string().max(200).optional(),
      pin_may: z.string().max(32).optional().describe('PIN trên máy chấm công.'),
      ma_erp: z.string().max(64).optional().describe('Mã nhân viên bên ERP.'),
      ngay_vao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Ngày vào làm, YYYY-MM-DD.'),
      ngay_nghi_viec: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
        .describe('Ngày nghỉ việc, YYYY-MM-DD.'),
      dang_hoat_dong: z.boolean().optional()
        .describe('false = cho nghỉ việc (không xóa dữ liệu chấm công).'),
    },
  }, async (dau) => {
    try {
      const { ma_nv, ...than } = dau;
      return tra_ve(await goi_api(`/api/v1/nhan-vien/${ma_nv}`, {
        phuong_thuc: 'PUT', than,
      }));
    } catch (loi) { return tra_loi(loi); }
  });

  // ------------------------------------------------------------ bang cong
  mc.registerTool('doc_bang_cong', {
    description: 'Đọc bảng công theo từng ngày (đã tính sẵn công, phút đi muộn, tăng ca...). '
      + 'Mặc định chỉ trả ngày đã chốt; đặt gom_chua_chot=true để lấy cả ngày chưa chốt. '
      + 'Khoảng ngày tối đa 400 ngày một lần gọi.',
    inputSchema: {
      ...PHEP_NGAY,
      ma_nv: z.string().max(64).optional().describe('Lọc theo một nhân viên.'),
      gom_chua_chot: z.boolean().optional().describe('true = lấy cả ngày chưa chốt.'),
      ...PHEP_PHAN_TRANG,
    },
  }, async (dau) => {
    try {
      return tra_ve(await goi_api('/api/v1/bang-cong', {
        truy_van: {
          tu: dau.tu, den: dau.den, ma_nv: dau.ma_nv ?? '',
          gom_chua_chot: dau.gom_chua_chot === true ? 'true' : '',
          gioi_han: chu_so(dau.gioi_han), bo_qua: chu_so(dau.bo_qua),
        },
      }));
    } catch (loi) { return tra_loi(loi); }
  });

  mc.registerTool('tong_hop_bang_cong', {
    description: 'Tổng hợp bảng công theo tháng cho một kỳ lương: số ngày công, tổng phút làm, '
      + 'tăng ca, đi muộn, về sớm của từng nhân viên.',
    inputSchema: {
      thang: z.string().regex(/^\d{4}-\d{2}$/).describe('Tháng dạng YYYY-MM.'),
      gom_chua_chot: z.boolean().optional().describe('true = tính cả ngày chưa chốt.'),
    },
  }, async (dau) => {
    try {
      return tra_ve(await goi_api('/api/v1/bang-cong/tong-hop', {
        truy_van: {
          thang: dau.thang, gom_chua_chot: dau.gom_chua_chot === true ? 'true' : '',
        },
      }));
    } catch (loi) { return tra_loi(loi); }
  });

  mc.registerTool('doc_lan_quet', {
    description: 'Đọc log quẹt thô từ máy chấm công (chưa qua bộ tính công). Khoảng ngày tối '
      + 'đa 92 ngày một lần gọi vì dữ liệu rất dày.',
    inputSchema: {
      ...PHEP_NGAY,
      ma_nv: z.string().max(64).optional().describe('Lọc theo một nhân viên.'),
      ...PHEP_PHAN_TRANG,
    },
  }, async (dau) => {
    try {
      return tra_ve(await goi_api('/api/v1/lan-quet', {
        truy_van: {
          tu: dau.tu, den: dau.den, ma_nv: dau.ma_nv ?? '',
          gioi_han: chu_so(dau.gioi_han), bo_qua: chu_so(dau.bo_qua),
        },
      }));
    } catch (loi) { return tra_loi(loi); }
  });

  mc.registerTool('doc_nghi_phep', {
    description: 'Đọc các đơn nghỉ phép đã duyệt trong khoảng ngày (loại giao nhau với khoảng). '
      + 'Đơn chờ duyệt chưa phải sự thật, không nằm ở đây — dùng doc_don.',
    inputSchema: {
      ...PHEP_NGAY,
      ...PHEP_PHAN_TRANG,
    },
  }, async (dau) => {
    try {
      return tra_ve(await goi_api('/api/v1/nghi-phep', {
        truy_van: {
          tu: dau.tu, den: dau.den,
          gioi_han: chu_so(dau.gioi_han), bo_qua: chu_so(dau.bo_qua),
        },
      }));
    } catch (loi) { return tra_loi(loi); }
  });

  // ------------------------------------------------------------ don, vi pham, ky luat
  mc.registerTool('doc_don', {
    description: 'Đọc đơn từ của nhân viên: nghỉ phép, giải trình quên quẹt, đơn tự do (làm '
      + 'thêm, đổi ca, công tác, thôi việc, đi muộn) và đề xuất. Lọc theo loại, trạng thái, '
      + 'mã nhân viên và khoảng ngày của đơn.',
    inputSchema: {
      loai: z.string().max(30).optional()
        .describe('Loại: nghi_phep, giai_trinh, don_tu, de_xuat. Trống = tất cả.'),
      trang_thai: z.string().max(30).optional()
        .describe('Trạng thái, ví dụ cho_duyet, da_duyet. Trống = tất cả.'),
      ma_nv: z.string().max(64).optional().describe('Lọc theo một nhân viên.'),
      tu: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
        .describe('Chỉ lấy đơn có ngày từ (YYYY-MM-DD).'),
      den: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
        .describe('Chỉ lấy đơn có ngày đến (YYYY-MM-DD).'),
      ...PHEP_PHAN_TRANG,
    },
  }, async (dau) => {
    try {
      return tra_ve(await goi_api('/api/v1/don', {
        truy_van: {
          loai: dau.loai ?? '', trang_thai: dau.trang_thai ?? '', ma_nv: dau.ma_nv ?? '',
          tu: dau.tu ?? '', den: dau.den ?? '',
          gioi_han: chu_so(dau.gioi_han), bo_qua: chu_so(dau.bo_qua),
        },
      }));
    } catch (loi) { return tra_loi(loi); }
  });

  mc.registerTool('doc_vi_pham', {
    description: 'Đọc bản ghi vi phạm nội quy: loại vi phạm, ngày, mô tả, trạng thái xử lý. '
      + 'Lọc theo mã nhân viên, khoảng ngày hoặc trạng thái.',
    inputSchema: {
      ma_nv: z.string().max(64).optional().describe('Lọc theo một nhân viên.'),
      tu: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
        .describe('Ngày vi phạm từ (YYYY-MM-DD).'),
      den: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
        .describe('Ngày vi phạm đến (YYYY-MM-DD).'),
      trang_thai: z.string().max(30).optional()
        .describe('Trạng thái: moi, cho_giai_trinh, da_xac_nhan, bac_bo, da_xu_ly.'),
      ...PHEP_PHAN_TRANG,
    },
  }, async (dau) => {
    try {
      return tra_ve(await goi_api('/api/v1/vi-pham', {
        truy_van: {
          ma_nv: dau.ma_nv ?? '', tu: dau.tu ?? '', den: dau.den ?? '',
          trang_thai: dau.trang_thai ?? '',
          gioi_han: chu_so(dau.gioi_han), bo_qua: chu_so(dau.bo_qua),
        },
      }));
    } catch (loi) { return tra_loi(loi); }
  });

  mc.registerTool('ghi_nhan_vi_pham', {
    description: 'Ghi nhận một vi phạm từ hệ thống ngoài (nguồn CSKH). Gọi lại cùng id_ngoai '
      + 'không ghi trùng. Cần phạm vi `vi_pham:ghi`. Mọi quyết định kỷ luật vẫn phải qua biên '
      + 'bản theo BLLD Điều 122 — công cụ này chỉ tạo bản ghi vi phạm.',
    inputSchema: {
      ma_nv: z.string().min(1).max(64).describe('Mã nhân viên (bắt buộc).'),
      ngay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Ngày vi phạm, YYYY-MM-DD (bắt buộc).'),
      mo_ta: z.string().min(1).max(2000).describe('Mô tả vi phạm (bắt buộc).'),
      id_ngoai: z.string().min(1).max(120)
        .describe('Mã bản ghi bên hệ thống gửi — dùng để chống ghi trùng (bắt buộc).'),
      loai_ma: z.string().max(40).optional().describe('Mã loại vi phạm; thiếu thì dùng loại KHAC.'),
      bang_chung: z.string().max(4000).optional().describe('Chứng cứ dạng JSON.'),
      lien_ket: z.string().max(500).optional().describe('Liên kết về hồ sơ gốc.'),
    },
  }, async (dau) => {
    try {
      return tra_ve(await goi_api('/api/v1/vi-pham', { phuong_thuc: 'POST', than: dau }));
    } catch (loi) { return tra_loi(loi); }
  });

  mc.registerTool('doc_ky_luat', {
    description: 'Đọc hồ sơ kỷ luật theo tháng: mức độ, số vi phạm gộp, mức giảm thưởng P3, '
      + 'trạng thái xử lý. Lọc theo mã nhân viên, tháng (YYYY-MM) hoặc trạng thái.',
    inputSchema: {
      ma_nv: z.string().max(64).optional().describe('Lọc theo một nhân viên.'),
      ky: z.string().regex(/^\d{4}-\d{2}$/).optional().describe('Lọc theo tháng, dạng YYYY-MM.'),
      trang_thai: z.string().max(30).optional()
        .describe('Trạng thái: moi, da_nhac, cho_duyet, da_ap_dung, bac_bo, huy.'),
      ...PHEP_PHAN_TRANG,
    },
  }, async (dau) => {
    try {
      return tra_ve(await goi_api('/api/v1/ky-luat', {
        truy_van: {
          ma_nv: dau.ma_nv ?? '', ky: dau.ky ?? '', trang_thai: dau.trang_thai ?? '',
          gioi_han: chu_so(dau.gioi_han), bo_qua: chu_so(dau.bo_qua),
        },
      }));
    } catch (loi) { return tra_loi(loi); }
  });

  // ------------------------------------------------------------ tri thuc cong ty
  mc.registerTool('doc_van_ban', {
    description: 'Đọc danh sách văn bản công ty: nội quy, biểu mẫu, chính sách, hướng dẫn. '
      + 'Chỉ trả thông tin mô tả, không kèm nội dung tệp.',
    inputSchema: {
      tim: z.string().max(100).optional().describe('Tìm theo tiêu đề hoặc mô tả.'),
      danh_muc: z.string().max(30).optional()
        .describe('Lọc danh mục: noi_quy, bieu_mau, chinh_sach, huong_dan, khac.'),
      ...PHEP_PHAN_TRANG,
    },
  }, async (dau) => {
    try {
      return tra_ve(await goi_api('/api/v1/van-ban', {
        truy_van: {
          tim: dau.tim ?? '', danh_muc: dau.danh_muc ?? '',
          gioi_han: chu_so(dau.gioi_han), bo_qua: chu_so(dau.bo_qua),
        },
      }));
    } catch (loi) { return tra_loi(loi); }
  });

  mc.registerTool('doc_thong_bao', {
    description: 'Đọc thông báo nội bộ còn hiệu lực. Lọc theo tiêu đề, mức độ hoặc khoảng '
      + 'ngày tạo. Chi tiết nội dung xem trên webapp.',
    inputSchema: {
      tim: z.string().max(100).optional().describe('Tìm theo tiêu đề.'),
      muc_do: z.string().max(30).optional().describe('Mức: thuong, quan_trong, khan.'),
      tu: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
        .describe('Chỉ lấy thông báo tạo từ ngày này (YYYY-MM-DD).'),
      den: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
        .describe('Chỉ lấy thông báo tạo đến ngày này (YYYY-MM-DD).'),
      ...PHEP_PHAN_TRANG,
    },
  }, async (dau) => {
    try {
      return tra_ve(await goi_api('/api/v1/thong-bao', {
        truy_van: {
          tim: dau.tim ?? '', muc_do: dau.muc_do ?? '', tu: dau.tu ?? '', den: dau.den ?? '',
          gioi_han: chu_so(dau.gioi_han), bo_qua: chu_so(dau.bo_qua),
        },
      }));
    } catch (loi) { return tra_loi(loi); }
  });

  mc.registerTool('doc_su_kien', {
    description: 'Kéo dòng sự kiện của hệ thống về để đồng bộ tăng dần: truyền id_cuoi của lần '
      + 'trước vào tu_id (lần đầu truyền 0). Hết dữ liệu thì id_cuoi trả về null — giữ nguyên '
      + 'con trỏ cũ.',
    inputSchema: {
      tu_id: z.number().int().min(0).default(0)
        .describe('Chỉ lấy sự kiện có id lớn hơn số này. Lần đầu truyền 0.'),
      loai: z.string().max(64).optional().describe('Lọc theo loại, ví dụ bang_cong.da_chot.'),
      gioi_han: z.number().int().min(1).max(500).default(100)
        .describe('Số sự kiện tối đa một lần gọi.'),
    },
  }, async (dau) => {
    try {
      return tra_ve(await goi_api('/api/v1/su-kien', {
        truy_van: {
          tu_id: chu_so(dau.tu_id), loai: dau.loai ?? '', gioi_han: chu_so(dau.gioi_han),
        },
      }));
    } catch (loi) { return tra_loi(loi); }
  });
}
