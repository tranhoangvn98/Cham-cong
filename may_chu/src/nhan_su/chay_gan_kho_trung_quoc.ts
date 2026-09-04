// Gan NOI LAM VIEC = "Kho Trung quốc" (lịch nghỉ lễ Trung Quốc) cho nhân sự làm bên Trung Quốc,
// để ngày lễ tính theo lịch Trung Quốc (không bị trừ công vào lễ TQ, và KHÔNG nghỉ lễ VN).
//
//   npm run gan_kho_tq                       # CHẠY THỬ: chỉ in ai sẽ đổi, không ghi gì
//   npm run gan_kho_tq -- --that             # ghi thật
//   npm run gan_kho_tq -- --ten "A,B" --that # gán thêm người theo tên (ngoài phòng Kho TQ)
//
// TIÊU CHÍ gán:
//   1. Phòng ban = "Phòng Kho Trung Quốc" (đã có từ lệnh cap_nhat_phong_ban), CỘNG
//   2. Các tên chỉ định (mặc định: Thân Thị Vân Anh; thêm bằng --ten "Tên 1,Tên 2").
//
// MẶC ĐỊNH CHẠY THỬ theo đúng nếp các lệnh khác — xem trước rồi mới --that.
import { truy_van, truy_van_mot, thuc_thi, dong_pool } from '../csdl/ket_noi.ts';

const TEN_NOI = 'Kho Trung quốc';
const PHONG_TQ = 'Phòng Kho Trung Quốc';
const TEN_CHI_DINH_MAC_DINH = ['Thân Thị Vân Anh', 'Huang Shu Ping', 'Huang Li Hua'];

/** Bỏ dấu + thường hoá để khớp tên dù lệch dấu/hoa-thường. */
function chuan(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
/** Tập từ (bỏ dấu, thứ tự bất kỳ) — khớp khi đảo thứ tự chữ đệm. */
function tap_tu(s: string): string {
  return chuan(s).split(' ').filter(Boolean).sort().join(' ');
}

interface DongNv {
  id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  noi_hien_tai: string | null;
}

async function main(): Promise<void> {
  const that = process.argv.includes('--that');
  const idx = process.argv.indexOf('--ten');
  const them = idx >= 0 && typeof process.argv[idx + 1] === 'string'
    ? process.argv[idx + 1]!.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const ten_chi_dinh = new Set([...TEN_CHI_DINH_MAC_DINH, ...them].map(tap_tu));

  // 1. Chắc chắn có lịch nghỉ TQ + nơi làm việc "Kho Trung quốc" (chỉ tạo khi --that).
  if (that) {
    await thuc_thi(
      `insert into lich_nghi_le(ma, ten, quoc_gia) values ('tq','Lịch nghỉ lễ Trung Quốc','Trung Quốc')
       on conflict (ma) do nothing`,
    );
    await thuc_thi(
      `insert into noi_lam_viec(ten, lich_nghi_ma) select $1, 'tq'
        where not exists (select 1 from noi_lam_viec where ten = $1)`,
      [TEN_NOI],
    );
  }
  const noi = await truy_van_mot<{ id: string; lich_nghi_ma: string }>(
    'select id, lich_nghi_ma from noi_lam_viec where ten = $1',
    [TEN_NOI],
  );
  if (noi === null) {
    console.log(`(chạy thử) Sẽ TẠO nơi làm việc "${TEN_NOI}" (lịch TQ) khi chạy với --that.`);
  } else if (noi.lich_nghi_ma !== 'tq') {
    console.log(`⚠ Nơi làm việc "${TEN_NOI}" đang gắn lịch "${noi.lich_nghi_ma}", KHÔNG phải TQ — kiểm tra lại.`);
  }

  // 2. Ứng viên: phòng Kho TQ hoặc tên chỉ định.
  const ds = await truy_van<DongNv>(
    `select nv.id, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban, nlv.ten as noi_hien_tai
       from nhan_vien nv
       left join phong_ban   pb  on pb.id  = nv.phong_ban_id
       left join noi_lam_viec nlv on nlv.id = nv.noi_lam_viec_id
      where nv.dang_hoat_dong = true
      order by nv.ho_ten`,
  );
  const chon = ds.filter((n) =>
    n.phong_ban === PHONG_TQ || ten_chi_dinh.has(tap_tu(n.ho_ten)));

  if (chon.length === 0) {
    console.log('Không có nhân sự nào khớp (phòng Kho Trung Quốc hoặc tên chỉ định).');
    await dong_pool();
    return;
  }

  console.log(`\nCác nhân sự sẽ gán về "${TEN_NOI}" (lịch nghỉ TQ):`);
  for (const n of chon) {
    const ly_do = n.phong_ban === PHONG_TQ ? 'phòng Kho TQ' : 'tên chỉ định';
    const trang_thai = n.noi_hien_tai === TEN_NOI ? 'đã đúng' : `đang: ${n.noi_hien_tai ?? '(mặc định VN)'}`;
    console.log(`  ${n.ma_nv.padEnd(8)} ${n.ho_ten.padEnd(24)} [${ly_do}] — ${trang_thai}`);
  }

  // Tên chỉ định mà không tìm thấy — báo để không im lặng bỏ sót.
  const thay = new Set(chon.map((n) => tap_tu(n.ho_ten)));
  for (const t of ten_chi_dinh) {
    if (!thay.has(t)) console.log(`  ⚠ Không tìm thấy nhân sự tên "${t}" (đang hoạt động).`);
  }

  if (!that) {
    console.log('\n(CHẠY THỬ — chưa ghi gì). Thêm --that để gán thật.');
    await dong_pool();
    return;
  }

  const so = await thuc_thi(
    'update nhan_vien set noi_lam_viec_id = $1, cap_nhat_luc = now() where id = any($2::uuid[]) and (noi_lam_viec_id is distinct from $1)',
    [noi!.id, chon.map((n) => n.id)],
  );
  console.log(`\n✔ ĐÃ GÁN ${String(so)} người về "${TEN_NOI}" (lịch nghỉ Trung Quốc).`);
  await dong_pool();
}

main().catch((loi: unknown) => { console.error((loi as Error).message); process.exit(1); });
