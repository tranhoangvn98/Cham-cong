// Gan Phong XNK + Khoi Van Phong + danh dau outsource cho ERP128 (Dao Thai Binh), roi cap lai ma.
//
// Chay trong container may_chu (import thang ban da bien dich):
//   docker compose cp <tep> may_chu:/tmp/ && docker compose exec -T may_chu node /tmp/<tep>
//
// Can cu:
//   - Nguoi dung chot 28/10/2026: Dao Thai Binh thuoc Phong XNK, dang outsource.
//   - 574 luot quet cua anh ay deu o may "VP - Cong vao/ra" -> lam viec tai Van phong Ha Noi,
//     nen khoi = vp (Khoi Van Phong Ha Noi & Sai Gon). Phong XNK co 2 nguoi khoi vp, 2 nguoi
//     khoi vp_ls (Lang Son) nen phai chon theo bang chung quet may, khong suy tu ten phong.
//   - Quy uoc outsource (tai_lieu/NHAN-SU-OUTSOURCE.md, cap nhat 27/10/2026): che_do_luong =
//     'khong' (khong sinh phieu luong) + mien_cham_cong = true. Muc luc nay khong co phieu luong
//     nao tu 04/2026 va da thoi quet may tu 08/08/2026 -> khop thuc te dang chay.
//
// AN TOAN: chi dung khi ho so con dung ma cu (ERP128), con dang hoat dong, khong phai quan ly /
// truong phong cua ai. Chay lai lan hai la no-op (da co ma dung khuon NVVP...).
const { truy_van, truy_van_mot, thuc_thi } = await import('/app/may_chu/dist/csdl/ket_noi.js');
const { cap_lai_ma_nhan_su } = await import('/app/may_chu/dist/dinh_danh/cap_lai_ma.js');

const MA_CU = 'ERP128';
const MA_KHOI = 'vp';
const TEN_PHONG = 'XNK';

const nhat_ky = (hanh_dong, thuc_the_id, chi_tiet) => thuc_thi(
  `insert into nhat_ky_thao_tac(nguoi_dung_id, hanh_dong, thuc_the, thuc_the_id, chi_tiet)
   values (null, $1, 'nhan_vien', $2, $3::jsonb)`,
  [hanh_dong, thuc_the_id, JSON.stringify(chi_tiet)],
);

// ---------------------------------------------------------------- 0. Kiem tra
const nv = await truy_van_mot(
  `select nv.id, nv.ma_nv, nv.ho_ten, nv.dang_hoat_dong, nv.khoi_id, nv.phong_ban_id,
          nv.che_do_luong, nv.mien_cham_cong,
          pb.ten as phong_cu, k.ma as khoi_cu,
          (select count(*) from nhan_vien where nguoi_quan_ly_id = nv.id)::int as cap_duoi,
          (select count(*) from phong_ban where truong_phong_id = nv.id)::int as truong_phong
     from nhan_vien nv
     left join phong_ban pb on pb.id = nv.phong_ban_id
     left join khoi k on k.id = nv.khoi_id
    where nv.ma_nv = $1`, [MA_CU]);
if (nv === null) { console.log(`Khong thay ho so ${MA_CU} — khong lam gi.`); process.exit(0); }
if (!nv.dang_hoat_dong) throw new Error(`${MA_CU} da nghi viec — dung lai.`);
if (nv.cap_duoi > 0 || nv.truong_phong > 0) throw new Error(`${MA_CU} dang la quan ly — dung lai.`);

const khoi = await truy_van_mot('select id, ma, ten, ma_ngan from khoi where ma = $1', [MA_KHOI]);
if (khoi === null) throw new Error(`Khong thay khoi ${MA_KHOI} — dung lai.`);
const phong = await truy_van('select id, ten from phong_ban where ten ilike $1', [`%${TEN_PHONG}%`]);
if (phong.length !== 1) {
  throw new Error(`Phong "${TEN_PHONG}" khop ${phong.length} dong — dung lai, khong doan.`);
}

console.log(`Ho so: ${nv.ma_nv} ${nv.ho_ten}`);
console.log(`  truoc: phong=${nv.phong_cu ?? '-'} khoi=${nv.khoi_cu ?? '-'} che_do_luong=${nv.che_do_luong} mien_cham_cong=${nv.mien_cham_cong}`);
console.log(`  sau  : phong=${phong[0].ten} khoi=${khoi.ma} (${khoi.ten}) che_do_luong=khong mien_cham_cong=true`);

// ---------------------------------------------------------------- 1. Gan phong ban + khoi + outsource
await thuc_thi(
  `update nhan_vien
      set phong_ban_id = $2, khoi_id = $3, che_do_luong = 'khong', mien_cham_cong = true,
          cap_nhat_luc = now()
    where id = $1`, [nv.id, phong[0].id, khoi.id]);
console.log('Da gan phong ban, khoi va danh dau outsource.');
await nhat_ky('gan_ho_so_phong_khoi', nv.id, {
  ma_nv: nv.ma_nv,
  phong_cu: nv.phong_cu, phong_moi: phong[0].ten,
  khoi_cu: nv.khoi_cu, khoi_moi: khoi.ma,
  che_do_luong_cu: nv.che_do_luong, che_do_luong_moi: 'khong',
  mien_cham_cong_cu: nv.mien_cham_cong, mien_cham_cong_moi: true,
  ly_do: 'Phong XNK, dang outsource (chot 28/10/2026)',
});

// ---------------------------------------------------------------- 2. Cap lai ma theo khuon moi
const kq = await cap_lai_ma_nhan_su(nv.id,
  'Chuan hoa ma: Phong XNK, Khoi Van Phong, dang outsource (28/10/2026)',
  (s) => console.log('  ', s));
console.log(`\n=== MA ===\n  ${kq.ma_cu} -> ${kq.ma_moi}   (ngay sinh ma: ${kq.ngay_sinh_ma})`);
for (const c of kq.canh_bao) console.log(`  canh bao: ${c}`);
process.exit(0);
