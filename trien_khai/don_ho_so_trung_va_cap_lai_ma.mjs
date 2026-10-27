// Don 3 ho so TRUNG (rong) + chuyen ma con dung sang ho so that + cap lai ma mot luot.
//
// Chay trong container may_chu (import thang ban da bien dich):
//   docker compose cp <tep> may_chu:/tmp/ && docker compose exec -T may_chu node /tmp/<tep>
//
// THU TU BAT BUOC: dong ma cua ho so rong TRUOC, roi moi gan cung ma do cho ho so that — rang
// buoc "mot ma dang hieu luc chi thuoc mot nguoi" chan neu lam nguoc (da gap: LoiXungDot 409).
//
// AN TOAN: chi xoa ho so KHONG co luot quet / phieu luong / hop dong / don tu / cap duoi / la
// truong phong; kiem lai ngay trong script va dung lai neu khong dung.
const { truy_van, truy_van_mot, thuc_thi } = await import('/app/may_chu/dist/csdl/ket_noi.js');
const { gan_ma } = await import('/app/may_chu/dist/dinh_danh/nghiep_vu.js');
const { cap_lai_ma_hang_loat } = await import('/app/may_chu/dist/dinh_danh/cap_lai_ma.js');

const KHOA_VP = 'b4f3b6ff-92d2-47bd-9a25-8a1ce1cd9cdb';        // Khối Văn Phòng
const RONG = ['ERP117', 'ERP200', 'nam123'];                    // ho so se XOA
const GAN_KHOI_VP = ['minhhuyenkd', 'maianhkd', 'hoangvietkd']; // Phòng Kinh doanh -> Khối VP
const CHUYEN_EMAIL = [
  { tu: 'ERP117', sang: 'NVKHN08260003', ma: 'vinh.khn@tranhoangvietnam.com', ghi_chu: 'Chuyển từ hồ sơ trùng ERP117 khi gộp 28/10/2026' },
  { tu: 'nam123', sang: 'NVKHN08260005', ma: 'nam.khn@tranhoangvietnam.com', ghi_chu: 'Chuyển từ hồ sơ trùng nam123 khi gộp 28/10/2026' },
  { tu: 'ERP200', sang: 'khanhlykd', ma: 'khanhly.kd@tranhoangvietnam.com', ghi_chu: 'Email phụ, chuyển từ hồ sơ trùng ERP200 khi gộp 28/10/2026' },
];

const id_cua = async (ma_nv) => {
  const d = await truy_van_mot('select id from nhan_vien where ma_nv = $1', [ma_nv]);
  return d === null ? null : d.id;
};
const nhat_ky = (hanh_dong, thuc_the_id, chi_tiet) => thuc_thi(
  `insert into nhat_ky_thao_tac(nguoi_dung_id, hanh_dong, thuc_the, thuc_the_id, chi_tiet)
   values (null, $1, 'nhan_vien', $2, $3::jsonb)`,
  [hanh_dong, thuc_the_id, JSON.stringify(chi_tiet)],
);

// ---------------------------------------------------------------- 0. Kiem tra an toan
const ids = {};
for (const ma of RONG) {
  const id = await id_cua(ma);
  if (id === null) { console.log(`BO QUA ${ma}: khong con ton tai`); continue; }
  ids[ma] = id;
  const d = await truy_van_mot(
    `select (select count(*) from lan_quet where nhan_vien_id = $1)::int as quet,
            (select count(*) from phieu_luong where nhan_vien_id = $1)::int as phieu,
            (select count(*) from hop_dong_lao_dong where nhan_vien_id = $1)::int as hd,
            (select count(*) from don_tu where nhan_vien_id = $1)::int as don,
            (select count(*) from nhan_vien where nguoi_quan_ly_id = $1)::int as cap_duoi,
            (select count(*) from phong_ban where truong_phong_id = $1)::int as truong_phong`,
    [id]);
  console.log(`Kiem ${ma}: quet=${d.quet} phieu=${d.phieu} hd=${d.hd} don=${d.don} cap_duoi=${d.cap_duoi} truong_phong=${d.truong_phong}`);
  if (d.quet > 0 || d.phieu > 0 || d.hd > 0 || d.don > 0) {
    throw new Error(`${ma} KHONG rong (co du lieu nghiep vu) — dung lai, khong xoa.`);
  }
  if (d.cap_duoi > 0 || d.truong_phong > 0) {
    throw new Error(`${ma} dang la quan ly / truong phong cua nguoi khac — dung lai.`);
  }
}
// Ho so nhan phai con ton tai truoc khi dong ma cua ho so rong.
for (const c of CHUYEN_EMAIL) {
  if (await id_cua(c.sang) === null) throw new Error(`Khong thay ho so nhan ${c.sang} — dung lai.`);
}

// ---------------------------------------------------------------- 1. Dong ma cua ho so rong
for (const [ma, id] of Object.entries(ids)) {
  const ds = await truy_van(
    `update ma_dinh_danh set hieu_luc_den = now(),
            ghi_chu = coalesce(ghi_chu || ' | ', '') || 'Thu hồi khi gộp hồ sơ trùng 28/10/2026'
      where nhan_vien_id = $1 and hieu_luc_den is null
      returning he_thong, ma`, [id]);
  console.log(`Dong ${ds.length} ma cua ${ma}: ${ds.map((x) => `${x.he_thong}=${x.ma}`).join(', ')}`);
  await nhat_ky('gop_ho_so_dong_ma', id, { ma_nv: ma, cac_ma: ds });
}

// ---------------------------------------------------------------- 2. Chuyen email sang ho so that
for (const c of CHUYEN_EMAIL) {
  const id_moi = await id_cua(c.sang);
  const kq = await gan_ma(id_moi, 'microsoft_email', c.ma, { nguon: 'gop_ho_so', ghi_chu: c.ghi_chu });
  console.log(`Chuyen email ${c.ma}: ${c.tu} -> ${c.sang}: ${kq.ket_cuc}`);
  await nhat_ky('gop_ho_so_chuyen_ma', id_moi, { tu: c.tu, sang: c.sang, he_thong: 'microsoft_email', ma: c.ma });
}

// ---------------------------------------------------------------- 3. Xoa tai khoan + ho so rong
for (const [ma, id] of Object.entries(ids)) {
  const nd = await truy_van('delete from nguoi_dung where nhan_vien_id = $1 returning ten_dang_nhap', [id]);
  const xoa = await truy_van('delete from nhan_vien where id = $1 returning ma_nv', [id]);
  console.log(`Xoa ho so ${ma}: tai khoan=${nd.map((x) => x.ten_dang_nhap).join(',') || '(khong co)'}, ho so=${xoa.length}`);
  await nhat_ky('gop_ho_so_xoa_trung', id, { ma_nv: ma, tai_khoan: nd.map((x) => x.ten_dang_nhap) });
}

// ---------------------------------------------------------------- 4. Gan khoi cho nguoi con ma cu
for (const ma of GAN_KHOI_VP) {
  const id = await id_cua(ma);
  if (id === null) { console.log(`BO QUA gan khoi ${ma}: khong con ho so`); continue; }
  await thuc_thi('update nhan_vien set khoi_id = $2, cap_nhat_luc = now() where id = $1 and khoi_id is null',
    [id, KHOA_VP]);
  console.log(`Gan khoi Van Phong cho ${ma}`);
  await nhat_ky('gan_khoi_ho_so', id, { khoi: 'VP', ly_do: 'Phòng Kinh doanh, gộp hồ sơ 28/10/2026' });
}

// ---------------------------------------------------------------- 5. Cap lai ma mot luot
const kq = await cap_lai_ma_hang_loat((s) => console.log('  ', s), null,
  'Chuyển sang mã mới sau khi gộp hồ sơ trùng (28/10/2026)');
console.log('\n=== CAP LAI MA ===');
console.log(`Da cap: ${kq.da_cap.length}`);
for (const d of kq.da_cap) console.log(`  ${d.ma_cu} -> ${d.ma_moi}  (${d.ho_ten})`);
console.log(`Bo qua: ${kq.bo_qua.length}`);
for (const d of kq.bo_qua) console.log(`  ${d.ma_nv} (${d.ho_ten}): ${d.ly_do}`);
console.log(`Loi: ${kq.loi.length}`);
for (const d of kq.loi) console.log(`  ${d.ma_nv}: ${d.ly_do}`);
process.exit(0);
