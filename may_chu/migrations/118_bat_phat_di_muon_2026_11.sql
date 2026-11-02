-- ============================================================================
-- 118 — Bật lại phạt đi muộn từ kỳ lương tháng 11/2026.
--
-- BỐI CẢNH
--   * Bản ghi `tham_so_luong` hiệu lực 01/09/2026 tắt phạt tiền đi muộn
--     (`phat_di_muon_bat = false`) theo chính sách "quá 30 phút mới mất nửa ngày công".
--     Vì tắt, cơ chế "miễn 3 lần/tháng khi có đơn duyệt trước 07:30" cũng KHÔNG chạy:
--     đi muộn lần thứ 4 trở đi không bị trừ gì, và đơn xin đi muộn được duyệt vô hạn.
--   * Mã nguồn đã có sẵn mốc chuyển tiếp `THANG_BAT_BUOC_DON_DI_MUON = '2026-11'`
--     (ky_luong.ts): từ kỳ 11/2026 việc miễn 3 lần/tháng phải có đơn duyệt trước hạn.
--     Tệp này tạo bản ghi tham số cho kỳ đó để chính sách thực sự có hiệu lực.
--
-- NỘI DUNG (chép nguyên bản ghi đang hiệu lực 01/09/2026, chỉ đổi 3 điểm)
--   1. `hieu_luc_tu` = 01/11/2026 — kỳ 10/2026 (còn 'nhap') KHÔNG bị áp hồi tố.
--   2. `phat_di_muon_bat` = true.
--   3. `ghi_chu` ghi rõ cách xử lý: tầng 08:11–08:29 phạt 50.000đ/lần (miễn tối đa
--      3 lần/tháng khi có đơn duyệt trước 07:30); từ 08:30 trở đi mất NỬA NGÀY CÔNG —
--      bảng công đã trừ `so_cong` (giờ đúng luật BLLĐ 2019 Đ.127 hơn là phạt tiền),
--      nên `ky_luong.ts` KHÔNG sinh khoản `tru_nua_ngay` nữa.
--
-- Biểu thuế TNCN chép sang bản ghi mới (tham số thuế không đổi so với 01/09/2026).
-- Chạy lại nhiều lần KHÔNG tạo dòng trùng: chỉ chèn khi chưa có bản ghi 01/11/2026.
-- ============================================================================

do $$
declare
  v_nguon uuid;
  v_moi   uuid;
begin
  select id into v_nguon
    from tham_so_luong
   where hieu_luc_tu < date '2026-11-01'
   order by hieu_luc_tu desc
   limit 1;

  if v_nguon is null then
    -- CSDL chưa có tham số lương nào (CSDL mới, chưa seed) — không có gì để chép.
    return;
  end if;

  select id into v_moi
    from tham_so_luong
   where hieu_luc_tu = date '2026-11-01'
   limit 1;

  if v_moi is null then
    insert into tham_so_luong (
      hieu_luc_tu, ten, luong_co_so, luong_toi_thieu_vung, vung,
      ty_le_bhxh_nld, ty_le_bhyt_nld, ty_le_bhtn_nld,
      ty_le_bhxh_nsdld, ty_le_bhyt_nsdld, ty_le_bhtn_nsdld,
      giam_tru_ban_than, giam_tru_phu_thuoc, can_cu, ghi_chu,
      cong_chuan_thang, lam_tron_den, t7_nua_cong,
      phat_di_muon_bat, di_muon_gio_vao, di_muon_moc_50k, di_muon_muc_50k,
      di_muon_moc_nua_ngay, di_muon_mien_moi_thang, di_muon_han_don, ty_le_thu_viec,
      he_so_ot_ngay_thuong, he_so_ot_nghi_tuan, he_so_ot_ngay_le
    )
    select
      date '2026-11-01',
      ten || ' — bật lại phạt đi muộn từ 01/11/2026',
      luong_co_so, luong_toi_thieu_vung, vung,
      ty_le_bhxh_nld, ty_le_bhyt_nld, ty_le_bhtn_nld,
      ty_le_bhxh_nsdld, ty_le_bhyt_nsdld, ty_le_bhtn_nsdld,
      giam_tru_ban_than, giam_tru_phu_thuoc, can_cu,
      'Từ 01/11/2026: vào 08:11–08:29 phạt 50.000đ/lần, miễn tối đa 3 lần/tháng khi có đơn '
        || 'xin đi muộn được duyệt gửi trước 07:30 của ngày đi muộn. Từ 08:30 trở đi mất '
        || 'nửa ngày công (bảng công tự trừ, không trừ thêm tiền).',
      cong_chuan_thang, lam_tron_den, t7_nua_cong,
      true, di_muon_gio_vao, di_muon_moc_50k, di_muon_muc_50k,
      di_muon_moc_nua_ngay, di_muon_mien_moi_thang, di_muon_han_don, ty_le_thu_viec,
      he_so_ot_ngay_thuong, he_so_ot_nghi_tuan, he_so_ot_ngay_le
      from tham_so_luong
     where id = v_nguon
    returning id into v_moi;
  end if;

  insert into bac_thue_tncn (tham_so_id, bac, tu_muc, den_muc, thue_suat)
  select v_moi, bac, tu_muc, den_muc, thue_suat
    from bac_thue_tncn
   where tham_so_id = v_nguon
     and not exists (select 1 from bac_thue_tncn where tham_so_id = v_moi);
end $$;
