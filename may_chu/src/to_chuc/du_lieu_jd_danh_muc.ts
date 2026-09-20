// Danh muc phan tang trach nhiem lay tu file "SO LAM VIEC SO 01 - PHAN TANG 3 CAP
// TRACH NHIEM - TASK - 20.09.2026": 23 nhom trach nhiem cap 1, 67 trach nhiem chi
// tiet cap 2 (kem nguoi quan tri), 45 vi tri thuc thi. Khong co logic nghiep vu —
// chi la du lieu dau vao cho ham nap_jd_neu_trong() o du_lieu_jd.ts.

export interface DongNhom {
  ma: string;
  ten: string;
}

/** 23 nhom trach nhiem cap 1 (ma theo so thu tu trong file). */
export const CAC_NHOM: DongNhom[] = [
  { ma: '1', ten: 'Sản phẩm' },
  { ma: '2', ten: 'Nguyên liệu & Mua hàng đầu nguồn' },
  { ma: '3', ten: 'MMTB / Tài sản / Phương tiện' },
  { ma: '4', ten: 'Tài chính - Kế toán' },
  { ma: '5', ten: 'Nhân sự' },
  { ma: '6', ten: 'Công nghệ - IT' },
  { ma: '7', ten: 'Khách hàng - Kinh doanh' },
  { ma: '8', ten: 'PR Marketing' },
  { ma: '9', ten: 'Báo cáo định kỳ' },
  { ma: '10', ten: 'Quy trình - Biểu mẫu' },
  { ma: '11', ten: 'Hành chính - Lễ tân' },
  { ma: '12', ten: 'Đào tạo - Phát triển nhân lực' },
  { ma: '13', ten: 'Pháp lý - Tuân thủ - PCCC' },
  { ma: '14', ten: 'Yêu cầu chuyên môn nghề' },
  { ma: '15', ten: 'Thẩm quyền quản lý' },
  { ma: '16', ten: 'Vai trò & Tính chất công việc' },
  { ma: '17', ten: 'Duyệt báo cáo & Phát hiện lỗi (Ban KS)' },
  { ma: '18', ten: 'Nghiệp vụ XNK chuyên sâu' },
  { ma: '19', ten: 'Kiểm soát chéo liên phòng ban' },
  { ma: '20', ten: 'Phát hiện lỗi - Giám sát - Kỷ luật' },
  { ma: '21', ten: 'Vận hành Kho Trung Quốc' },
  { ma: '22', ten: 'Vận hành Kho Việt Nam' },
  { ma: '23', ten: 'Quản lý Chất lượng theo ISO 9001' },
];

export interface DongTn {
  ma: string | null;
  ten: string;
  nhom: string;
  /** Ma vi tri cua nguoi quan tri trach nhiem chi tiet (thuong la truong phong). */
  quan_tri: string | null;
}

/** 67 trach nhiem chi tiet cap 2. `ma = null` la khoi "(chua gan)" trong file. */
export const CAC_TN: DongTn[] = [
  { ma: '1.1', ten: 'Nghiên cứu & Phát triển sản phẩm mới', nhom: '1', quan_tri: 'TP-XNK' },
  { ma: '1.2', ten: 'Cập nhật thông tin sản phẩm', nhom: '1', quan_tri: 'TP-KD' },
  { ma: '1.3', ten: 'Quản lý chất lượng sản phẩm', nhom: '1', quan_tri: 'TP-XNK' },
  { ma: '1.4', ten: 'Xử lý hàng hóa thời gian nghỉ lễ', nhom: '1', quan_tri: 'TP-XNK' },
  { ma: '2.1', ten: 'Quản lý đối tác vận chuyển & dịch vụ', nhom: '2', quan_tri: 'TP-XNK' },
  { ma: '2.2', ten: 'Mua hàng đầu nguồn TQ (1688, Taobao)', nhom: '2', quan_tri: 'TP-XNK' },
  { ma: '2.3', ten: 'Khai báo Hải quan', nhom: '2', quan_tri: 'TP-XNK' },
  { ma: '2.4', ten: 'Giám sát hàng tại cửa khẩu', nhom: '2', quan_tri: 'TP-XNK' },
  { ma: '3.1', ten: 'Quản lý Tài sản – MMTB', nhom: '3', quan_tri: 'TP-HCNS' },
  { ma: null, ten: '(chưa gán)', nhom: '22', quan_tri: null },
  { ma: '4.1', ten: 'Lập kế hoạch & Kiểm soát Ngân sách', nhom: '4', quan_tri: 'KTT' },
  { ma: '4.2', ten: 'Kế toán nội bộ (Sổ sách, hạch toán)', nhom: '4', quan_tri: 'KTT' },
  { ma: '4.3', ten: 'Quản lý Công nợ', nhom: '4', quan_tri: 'KTT' },
  { ma: '4.4', ten: 'Kế toán Thuế', nhom: '4', quan_tri: 'KTT' },
  { ma: '4.5', ten: 'Kế toán Ngoại tệ (do TBKS chỉ đạo)', nhom: '4', quan_tri: 'KTT' },
  { ma: '4.6', ten: 'Báo cáo Tài chính', nhom: '4', quan_tri: 'KTT' },
  { ma: '4.7', ten: 'Lưu trữ hồ sơ kế toán', nhom: '4', quan_tri: 'KTT' },
  { ma: '5.1', ten: 'Tuyển dụng', nhom: '5', quan_tri: 'TP-HCNS' },
  { ma: '5.2', ten: 'Đánh giá nhân sự', nhom: '5', quan_tri: 'TP-HCNS' },
  { ma: '5.3', ten: 'Lương - BHXH - Chế độ', nhom: '5', quan_tri: 'TP-HCNS' },
  { ma: '7.1', ten: 'Chiến lược & Kế hoạch Kinh doanh', nhom: '7', quan_tri: 'TP-KD' },
  { ma: '7.2', ten: 'Phát triển & Quản lý khách hàng', nhom: '7', quan_tri: 'TP-KD' },
  { ma: null, ten: '(chưa gán)', nhom: '7', quan_tri: null },
  { ma: '7.3', ten: 'Thu hồi Công nợ', nhom: '7', quan_tri: 'TP-KD' },
  { ma: '7.4', ten: 'Vận hành đơn hàng & Khiếu nại (CSKH)', nhom: '7', quan_tri: 'TP-CSKH' },
  { ma: '8.1', ten: 'Lập kế hoạch & Triển khai Marketing', nhom: '8', quan_tri: 'TP-KD' },
  { ma: '8.2', ten: 'Trực page & Lead Generation', nhom: '8', quan_tri: 'TP-KD' },
  { ma: '9.1', ten: 'Báo cáo chuyên môn các phòng', nhom: '9', quan_tri: 'TP-MOI' },
  { ma: '10.1', ten: 'Xây dựng và cải tiến quy trình', nhom: '10', quan_tri: 'TP-HCNS' },
  { ma: '11.1', ten: 'Lập kế hoạch & Thực hiện Hành chính', nhom: '11', quan_tri: 'TP-HCNS' },
  { ma: '12.1', ten: 'Xây dựng và triển khai đào tạo', nhom: '12', quan_tri: 'TP-HCNS' },
  { ma: '13.1', ten: 'Cập nhật & Tuân thủ pháp luật', nhom: '13', quan_tri: 'TP-HCNS' },
  { ma: '13.2', ten: 'Kiểm soát chứng từ pháp lý', nhom: '13', quan_tri: 'TP-XNK' },
  { ma: '13.3', ten: 'Thanh tra & Tuân thủ cơ quan NN', nhom: '13', quan_tri: 'CEO' },
  { ma: '14.1', ten: 'Tiêu chí chuyên môn theo vị trí', nhom: '14', quan_tri: 'TP-HCNS' },
  { ma: '15.1', ten: 'Phân cấp thẩm quyền quản trị', nhom: '15', quan_tri: 'CEO' },
  { ma: '16.1', ten: 'Phân loại vai trò công việc', nhom: '16', quan_tri: 'TP-HCNS' },
  { ma: '17.1', ten: 'Duyệt báo cáo định kỳ', nhom: '17', quan_tri: 'TBKS' },
  { ma: '17.2', ten: 'Phát hiện lỗi trên hệ thống', nhom: '17', quan_tri: 'TBKS' },
  { ma: '17.3', ten: 'Audit nội bộ định kỳ', nhom: '17', quan_tri: 'TBKS' },
  { ma: '18.1', ten: 'Đánh giá rủi ro đối tác quốc tế', nhom: '18', quan_tri: 'TP-XNK' },
  { ma: '19.1', ten: 'Đối chiếu chéo dữ liệu hệ thống', nhom: '19', quan_tri: 'TBKS' },
  { ma: '20.1', ten: 'Phát hiện lỗi & gian lận', nhom: '20', quan_tri: 'TBKS' },
  { ma: '20.2', ten: 'Xử lý kỷ luật theo BLLĐ 2019', nhom: '20', quan_tri: 'TP-HCNS' },
  { ma: '21.1', ten: 'Tracking & Tiếp nhận hàng', nhom: '21', quan_tri: 'TK-TQ' },
  { ma: '21.2', ten: 'Khai thác hàng & Nhập kho cơ bản', nhom: '21', quan_tri: 'TK-TQ' },
  { ma: '21.3', ten: 'Nhập kho chính thức trên CMS', nhom: '21', quan_tri: 'TK-TQ' },
  { ma: '21.4', ten: 'Thanh toán cước & Chi phí kho', nhom: '21', quan_tri: 'TK-TQ' },
  { ma: '22.1', ten: 'Tiếp nhận hàng từ cửa khẩu', nhom: '22', quan_tri: 'TK-VN' },
  { ma: '22.2', ten: 'Lưu kho và Bảo quản', nhom: '22', quan_tri: 'TK-VN' },
  { ma: '22.3', ten: 'Xuất kho giao hàng', nhom: '22', quan_tri: 'TK-VN' },
  { ma: '22.4', ten: 'Tồn kho và Kiểm kê', nhom: '22', quan_tri: 'TK-VN' },
  { ma: '22.5', ten: 'Quản lý nhân sự + Vận hành Kho VN', nhom: '22', quan_tri: 'TK-VN' },
  { ma: '23.1', ten: 'Bối cảnh tổ chức (Clause 4)', nhom: '23', quan_tri: 'CEO' },
  { ma: '23.2', ten: 'Lãnh đạo & Chính sách Chất lượng (Clause 5)', nhom: '23', quan_tri: 'CEO' },
  { ma: '23.3', ten: 'Quản lý Rủi ro & Cơ hội (Clause 6.1)', nhom: '23', quan_tri: 'TBKS' },
  { ma: '23.4', ten: 'Quản lý Tri thức tổ chức (Clause 7.1.6)', nhom: '23', quan_tri: 'TP-HCNS' },
  { ma: '23.5', ten: 'Khảo sát Sự hài lòng Khách hàng (Clause 9.1.2)', nhom: '23', quan_tri: 'TP-CSKH' },
  { ma: '23.6', ten: 'Non-Conformity & CAPA (Clause 10.2)', nhom: '23', quan_tri: 'TBKS' },
  { ma: '23.7', ten: 'Management Review (Clause 9.3)', nhom: '23', quan_tri: 'CEO' },
  { ma: '23.8', ten: 'Internal Audit ISO 9001 (Clause 9.2)', nhom: '23', quan_tri: 'TBKS' },
  { ma: '23.9', ten: 'Quản lý Tài liệu QMS (Clause 7.5)', nhom: '23', quan_tri: 'TP-HCNS' },
  { ma: '6.1', ten: 'Phân tích & Thiết kế hệ thống', nhom: '6', quan_tri: 'TECHLEAD' },
  { ma: '6.2', ten: 'Phát triển Backend', nhom: '6', quan_tri: 'TECHLEAD' },
  { ma: '6.3', ten: 'Phát triển Frontend', nhom: '6', quan_tri: 'TECHLEAD' },
  { ma: '6.4', ten: 'Vận hành & Bảo trì hệ thống', nhom: '6', quan_tri: 'TECHLEAD' },
  { ma: '6.5', ten: 'Bảo mật & Audit chéo IT', nhom: '6', quan_tri: 'TBKS' },
];

export interface DongViTri {
  ma: string;
  ten: string;
  cap_bac: 'cap_cao' | 'truong_phong' | 'truong_nhom' | 'chuyen_vien' | 'nhan_vien';
  /** Ten phong; null voi vi tri pham vi toan cong ty / moi phong. */
  phong: string | null;
  pham_vi: 'cu_the' | 'toan_cong_ty' | 'moi_phong';
}

/** 45 vi tri thuc thi theo file JD. */
export const CAC_VI_TRI: DongViTri[] = [
  { ma: 'CEO', ten: 'CEO', cap_bac: 'cap_cao', phong: null, pham_vi: 'toan_cong_ty' },
  { ma: 'TECHLEAD', ten: 'Tech Lead', cap_bac: 'truong_phong', phong: 'Phòng IT', pham_vi: 'cu_the' },
  { ma: 'TBKS', ten: 'Trưởng Ban Kiểm Soát', cap_bac: 'truong_phong', phong: 'Ban Kiểm soát', pham_vi: 'cu_the' },
  { ma: 'TBKS-TC', ten: 'Trưởng Ban Kiểm soát', cap_bac: 'truong_phong', phong: null, pham_vi: 'toan_cong_ty' },
  { ma: 'TK-VN', ten: 'Trưởng kho VN', cap_bac: 'truong_phong', phong: 'Phòng Kho VN', pham_vi: 'cu_the' },
  { ma: 'TP-CHUNG', ten: 'Trưởng phòng (chung)', cap_bac: 'truong_phong', phong: null, pham_vi: 'toan_cong_ty' },
  { ma: 'TP-CM', ten: 'Trưởng phòng (chuyên môn)', cap_bac: 'truong_phong', phong: 'Phòng HCNS', pham_vi: 'cu_the' },
  { ma: 'TP-TL', ten: 'Trưởng phòng (chủ tài liệu)', cap_bac: 'truong_phong', phong: null, pham_vi: 'moi_phong' },
  { ma: 'TP-MOI', ten: 'Trưởng phòng (mỗi phòng)', cap_bac: 'truong_phong', phong: null, pham_vi: 'moi_phong' },
  { ma: 'TP-CSKH', ten: 'Trưởng phòng CSKH', cap_bac: 'truong_phong', phong: 'Phòng CSKH', pham_vi: 'cu_the' },
  { ma: 'TP-HCNS', ten: 'Trưởng phòng HCNS', cap_bac: 'truong_phong', phong: 'Phòng HCNS', pham_vi: 'cu_the' },
  { ma: 'TP-KD', ten: 'Trưởng phòng KD', cap_bac: 'truong_phong', phong: 'Phòng Kinh doanh', pham_vi: 'cu_the' },
  { ma: 'KTT', ten: 'Trưởng phòng Kế toán (KTT)', cap_bac: 'truong_phong', phong: 'Phòng Kế toán', pham_vi: 'cu_the' },
  { ma: 'TP-XNK', ten: 'Trưởng phòng XNK', cap_bac: 'truong_phong', phong: 'Phòng XNK', pham_vi: 'cu_the' },
  { ma: 'TP-LQ', ten: 'Trưởng phòng liên quan', cap_bac: 'truong_phong', phong: null, pham_vi: 'moi_phong' },
  { ma: 'TK-TQ', ten: 'Trưởng kho TQ (anh Liao)', cap_bac: 'truong_nhom', phong: 'Phòng Kho TQ', pham_vi: 'cu_the' },
  { ma: 'TN', ten: 'Trưởng nhóm', cap_bac: 'truong_nhom', phong: null, pham_vi: 'toan_cong_ty' },
  { ma: 'BE', ten: 'Backend Dev (Middle)', cap_bac: 'chuyen_vien', phong: 'Phòng IT', pham_vi: 'cu_the' },
  { ma: 'CV-QC', ten: 'CV Quảng cáo (Marketing)', cap_bac: 'chuyen_vien', phong: 'Phòng Marketing', pham_vi: 'cu_the' },
  { ma: 'CV-CS', ten: 'CV chính sách NK', cap_bac: 'chuyen_vien', phong: 'Phòng XNK', pham_vi: 'cu_the' },
  { ma: 'CV-NC', ten: 'CV nghiên cứu sản phẩm (Phòng XNK)', cap_bac: 'chuyen_vien', phong: 'Phòng XNK', pham_vi: 'cu_the' },
  { ma: 'KBHQ', ten: 'Chuyên viên KBHQ', cap_bac: 'chuyen_vien', phong: 'Phòng XNK', pham_vi: 'cu_the' },
  { ma: 'CV-XNK', ten: 'Chuyên viên XNK', cap_bac: 'chuyen_vien', phong: 'Phòng XNK', pham_vi: 'cu_the' },
  { ma: 'FE', ten: 'Frontend Dev (Middle)', cap_bac: 'chuyen_vien', phong: 'Phòng IT', pham_vi: 'cu_the' },
  { ma: 'KSV', ten: 'Kiểm soát viên (KSV)', cap_bac: 'nhan_vien', phong: 'Ban Kiểm soát', pham_vi: 'cu_the' },
  { ma: 'NV-MOI', ten: 'NV (mỗi phòng)', cap_bac: 'nhan_vien', phong: null, pham_vi: 'moi_phong' },
  { ma: 'NV-CSKH', ten: 'NV CSKH', cap_bac: 'nhan_vien', phong: 'Phòng CSKH', pham_vi: 'cu_the' },
  { ma: 'NV-CHECK-TQ', ten: 'NV Check hàng kho TQ', cap_bac: 'nhan_vien', phong: 'Phòng Kho TQ', pham_vi: 'cu_the' },
  { ma: 'NV-HCNS', ten: 'NV HCNS', cap_bac: 'nhan_vien', phong: 'Phòng HCNS', pham_vi: 'cu_the' },
  { ma: 'NV-PL', ten: 'NV HCNS (Pháp luật)', cap_bac: 'nhan_vien', phong: 'Phòng HCNS', pham_vi: 'cu_the' },
  { ma: 'NV-TD', ten: 'NV HCNS (Tuyển dụng)', cap_bac: 'nhan_vien', phong: 'Phòng HCNS', pham_vi: 'cu_the' },
  { ma: 'NV-DT', ten: 'NV HCNS (Đào tạo)', cap_bac: 'nhan_vien', phong: 'Phòng HCNS', pham_vi: 'cu_the' },
  { ma: 'NV-KT-TQ', ten: 'NV Khai thác kho TQ', cap_bac: 'nhan_vien', phong: 'Phòng Kho TQ', pham_vi: 'cu_the' },
  { ma: 'NV-KT-VN', ten: 'NV Khai thác kho VN', cap_bac: 'nhan_vien', phong: 'Phòng Kho VN', pham_vi: 'cu_the' },
  { ma: 'NVKD', ten: 'NV Kinh doanh', cap_bac: 'nhan_vien', phong: 'Phòng Kinh doanh', pham_vi: 'cu_the' },
  { ma: 'NV-KT-NT', ten: 'NV Kế toán ngoại tệ', cap_bac: 'nhan_vien', phong: 'Phòng Kế toán', pham_vi: 'cu_the' },
  { ma: 'NV-KT-NB', ten: 'NV Kế toán nội bộ', cap_bac: 'nhan_vien', phong: 'Phòng Kế toán', pham_vi: 'cu_the' },
  { ma: 'NV-KT-THUE', ten: 'NV Kế toán thuế', cap_bac: 'nhan_vien', phong: 'Phòng Kế toán', pham_vi: 'cu_the' },
  { ma: 'NV-LX-VN', ten: 'NV Lái xe + Bốc xếp Kho VN', cap_bac: 'nhan_vien', phong: 'Phòng Kho VN', pham_vi: 'cu_the' },
  { ma: 'NV-LX-TQ', ten: 'NV Lái xe kho TQ', cap_bac: 'nhan_vien', phong: 'Phòng Kho TQ', pham_vi: 'cu_the' },
  { ma: 'NV-MKT', ten: 'NV Marketing', cap_bac: 'nhan_vien', phong: 'Phòng Marketing', pham_vi: 'cu_the' },
  { ma: 'NV-MUA', ten: 'NV Mua hàng (Phòng XNK)', cap_bac: 'nhan_vien', phong: 'Phòng XNK', pham_vi: 'cu_the' },
  { ma: 'NV-CM', ten: 'NV chuyên môn (mỗi phòng)', cap_bac: 'nhan_vien', phong: null, pham_vi: 'moi_phong' },
  { ma: 'NV-PAGE', ten: 'NV trực page (Marketing)', cap_bac: 'nhan_vien', phong: 'Phòng Marketing', pham_vi: 'cu_the' },
  { ma: 'OPS-LS', ten: 'Ops Lạng Sơn', cap_bac: 'nhan_vien', phong: 'Phòng XNK', pham_vi: 'cu_the' },
];

/** Ten cac phong xuat hien trong file JD — nap thieu phong nao thi seed tu tao. */
export const CAC_PHONG = [
  'Phòng HCNS', 'Phòng XNK', 'Phòng Kế toán', 'Ban Kiểm soát', 'Phòng Kinh doanh',
  'Phòng Kho TQ', 'Phòng IT', 'Phòng CSKH', 'Phòng Kho VN', 'Phòng Marketing',
] as const;
