// Cap nhat PHONG BAN + CHUC DANH tu file danh sach nhan su, khop theo HO TEN.
//
//   npm run cap_nhat_phong_ban -- <file.xlsx> [--that]
//
// MAC DINH CHAY THU (khong ghi gi) — in ra ai se doi gi, phong ban nao se tao, ten nao khong
// khop. Them --that de ghi that.
//
// Doc file LUC CHAY, KHONG nhet du lieu ca nhan vao ma nguon (NĐ 13/2023). Chi dong toi hai thu:
// nhan_vien.phong_ban_id (tao phong_ban neu chua co) va nhan_vien.chuc_danh. KHONG dong cong,
// luong, PIN, hay xoa gi.
import { readFileSync } from 'node:fs';
import { doc_ho_so_xlsx } from './doc_ho_so_xlsx.ts';
import { bo_dau } from './nap_ho_so.ts';
import { truy_van, trong_giao_dich, dong_pool } from '../csdl/ket_noi.ts';

function chuan(s: string): string {
  return bo_dau(s).toLowerCase().replace(/\s+/g, ' ').trim();
}
/** Tap tu (bo dau, thu tu bat ky) — de khop khi lech chu dem / dao thu tu. */
function tap_tu(s: string): string {
  return chuan(s).split(' ').filter(Boolean).sort().join(' ');
}

interface Nguoi { ho_ten: string; phong_ban: string | null; chuc_danh: string | null; }

async function main(): Promise<void> {
  const file = process.argv[2];
  const that = process.argv.includes('--that');
  if (file === undefined || file.startsWith('--')) {
    console.error('Dung: npm run cap_nhat_phong_ban -- <file.xlsx> [--that]');
    process.exit(1);
  }

  const kq = doc_ho_so_xlsx(readFileSync(file));
  // Che moi day so dai (CCCD/CMND/SDT) truoc khi in — NĐ 13/2023, chi hien 4 so cuoi.
  const che = (s: string): string => s.replace(/\d{7,}/g, (m) => `***${m.slice(-4)}`);
  for (const c of kq.canh_bao) console.log(`  [đọc] ${che(c)}`);

  // Gom theo ho ten (mot nguoi co the o nhieu sheet). Lay dong dau co du lieu; canh bao neu lech.
  const theo_ten = new Map<string, Nguoi>();
  for (const d of kq.dong) {
    if (d.ho_ten.trim() === '') continue;
    const pb = d.phong_ban?.trim() || null;
    const cd = d.chuc_danh?.trim() || null;
    if (pb === null && cd === null) continue;
    const khoa = tap_tu(d.ho_ten);
    const cu = theo_ten.get(khoa);
    if (cu === undefined) { theo_ten.set(khoa, { ho_ten: d.ho_ten.trim(), phong_ban: pb, chuc_danh: cd }); continue; }
    if ((pb !== null && cu.phong_ban !== null && pb !== cu.phong_ban)
        || (cd !== null && cu.chuc_danh !== null && cd !== cu.chuc_danh)) {
      console.log(`  ⚠ "${d.ho_ten.trim()}" xuất hiện nhiều lần với dữ liệu khác nhau — lấy lần đầu.`);
    }
    cu.phong_ban ??= pb; cu.chuc_danh ??= cd;
  }

  // Nhan vien dang hoat dong.
  const nv = await truy_van<{ id: string; ma_nv: string; ho_ten: string;
                              phong_ban_id: string | null; chuc_danh: string | null }>(
    `select nv.id, nv.ma_nv, nv.ho_ten, nv.phong_ban_id, nv.chuc_danh
       from nhan_vien nv where nv.dang_hoat_dong = true`,
  );
  const theo_chuan = new Map<string, typeof nv>();
  const theo_tap = new Map<string, typeof nv>();
  for (const n of nv) {
    (theo_chuan.get(chuan(n.ho_ten)) ?? theo_chuan.set(chuan(n.ho_ten), []).get(chuan(n.ho_ten))!).push(n);
    (theo_tap.get(tap_tu(n.ho_ten)) ?? theo_tap.set(tap_tu(n.ho_ten), []).get(tap_tu(n.ho_ten))!).push(n);
  }

  const khop: { nguoi: Nguoi; nv: typeof nv[number] }[] = [];
  const khong: Nguoi[] = [];
  const nhap_nhang: { nguoi: Nguoi; so: number }[] = [];
  for (const p of theo_ten.values()) {
    let ung = theo_chuan.get(chuan(p.ho_ten)) ?? [];
    if (ung.length === 0) ung = theo_tap.get(tap_tu(p.ho_ten)) ?? [];
    if (ung.length === 1) khop.push({ nguoi: p, nv: ung[0]! });
    else if (ung.length === 0) khong.push(p);
    else nhap_nhang.push({ nguoi: p, so: ung.length });
  }

  const cac_pb = [...new Set(khop.map((k) => k.nguoi.phong_ban).filter((x): x is string => x !== null))].sort();

  console.log(`\n=== SẼ CẬP NHẬT (${String(khop.length)} người) ===`);
  for (const k of khop) {
    console.log(`  ${k.nv.ma_nv.padEnd(8)} ${k.nguoi.ho_ten.padEnd(24)} `
      + `phòng: ${(k.nguoi.phong_ban ?? '—').padEnd(16)} chức danh: ${k.nguoi.chuc_danh ?? '—'}`);
  }
  console.log(`\n=== PHÒNG BAN (tạo nếu chưa có): ${cac_pb.join(' | ')}`);
  if (nhap_nhang.length > 0) {
    console.log(`\n=== NHẬP NHẰNG (nhiều hồ sơ cùng tên — bỏ qua) ===`);
    for (const x of nhap_nhang) console.log(`  ${x.nguoi.ho_ten} — ${String(x.so)} hồ sơ`);
  }
  if (khong.length > 0) {
    console.log(`\n=== KHÔNG KHỚP (chưa có hồ sơ đang hoạt động) ===`);
    for (const p of khong) console.log(`  ${p.ho_ten} (${p.phong_ban ?? '—'} / ${p.chuc_danh ?? '—'})`);
  }

  if (!that) {
    console.log('\n>>> CHẠY THỬ. Thêm --that để ghi thật.');
    await dong_pool();
    return;
  }

  const so = await trong_giao_dich(async (khach) => {
    for (const ten of cac_pb) {
      await khach.query(`insert into phong_ban (ten) values ($1) on conflict (ten) do nothing`, [ten]);
    }
    const pb_id = new Map<string, string>();
    for (const r of (await khach.query<{ id: string; ten: string }>('select id, ten from phong_ban')).rows) {
      pb_id.set(r.ten, r.id);
    }
    let n = 0;
    for (const k of khop) {
      await khach.query(
        `update nhan_vien set
           phong_ban_id = coalesce($2, phong_ban_id),
           chuc_danh    = coalesce($3, chuc_danh),
           cap_nhat_luc = now()
         where id = $1`,
        [k.nv.id, k.nguoi.phong_ban === null ? null : pb_id.get(k.nguoi.phong_ban) ?? null,
          k.nguoi.chuc_danh],
      );
      n++;
    }
    return n;
  });
  console.log(`\n✔ ĐÃ CẬP NHẬT ${String(so)} người, ${String(cac_pb.length)} phòng ban.`);
  await dong_pool();
}

main().catch((loi: unknown) => { console.error((loi as Error).message); process.exit(1); });
