// Tu dien tieng VIET cho cac chuoi do MAY CHU sinh ra (loi API, thong bao, email...).
// Chuoi nguoi dung doc PHẢI co du hai khoa vi + zh — xem tai_lieu/SONG-NGU-TRUNG.md.
// Khong hardcode chuoi o bat ky dau khac; tra qua tra_chuoi() trong chi_muc.ts.
export const CHUOI_VI = {
  ngon_ngu_da_doi: 'Đã chuyển ngôn ngữ.',
  ngon_ngu_khong_hop_le: 'Ngôn ngữ không hợp lệ.',
  ngon_ngu_tieng_viet: 'Tiếng Việt',
  ngon_ngu_tieng_trung: 'Tiếng Trung',
} as const;
