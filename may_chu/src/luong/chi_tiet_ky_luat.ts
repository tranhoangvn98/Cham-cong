// LIET KE CHI TIET tung lenh giam thuong ky luat cho phieu luong — CHI DOC.
//
// Chu cong ty: "chi tiet den doan ngay gio nao cua loi bi tru". Khoan 'tru_giam_thuong_kl' tren
// phieu la MOT cuc; ho_so_ky_luat gom vi pham theo THANG (mot vi pham he_thong / loai / ky), con
// tung LAN loi that (ngay + gio quet) nam o bang_cong_ngay. Ham nay noi hai dau lai:
//   - Loai vi pham + so tien giam thuong: tu ho_so_ky_luat.chi_tiet (da_ap_dung).
//   - Tung lan cu the (ngay, gio vao/ra, so phut muon/ve som): tu bang_cong_ngay dung nguoi + ky.
//
// Tra ve theo tung phieu: moi loai vi pham mot dong (ly_do + so_tien), kem `cac_lan` la danh sach
// mo ta tung lan co ngay + gio. Gio format theo mui gio Viet Nam (Asia/Ho_Chi_Minh).
import { truy_van } from '../csdl/ket_noi.ts';

export interface DongLietKe {
  id: string;
  ly_do: string;
  so_tien: string;
  thu_tu: number;
  /** Tung lan loi cu the (ngay + gio). Rong khi vi pham khong gan voi ngay cham cong. */
  cac_lan: string[];
}

interface HangLoai {
  phieu_luong_id: string;
  ten: string;
  tien: string;
  chi_so_list: string[] | null;
}

interface HangLan {
  phieu_luong_id: string;
  ngay_txt: string;
  vao_txt: string | null;
  ra_txt: string | null;
  phut_muon: number;
  phut_ve_som: number;
  trang_thai: string;
  phut_lam: number;
}

/** Loai lan loi suy ra tu chi_so cua quy tac vi pham. */
type LoaiLan = 'muon' | 've_som' | 'vang' | 'thieu_gio' | null;

function loai_tu_chi_so(chi_so_list: string[] | null): LoaiLan {
  const s = new Set(chi_so_list ?? []);
  if (s.has('so_lan_di_muon') || s.has('tong_phut_muon')) return 'muon';
  if (s.has('so_lan_ve_som') || s.has('tong_phut_ve_som')) return 've_som';
  if (s.has('so_ngay_vang')) return 'vang';
  if (s.has('so_ngay_thieu_gio')) return 'thieu_gio';
  return null;
}

/** Cau mo ta mot lan loi theo loai. */
function mo_ta_lan(l: HangLan, loai: LoaiLan): string {
  switch (loai) {
    case 'muon':
      return `${l.ngay_txt}: vào ${l.vao_txt ?? '—'} (muộn ${String(l.phut_muon)}′)`;
    case 've_som':
      return `${l.ngay_txt}: ra ${l.ra_txt ?? '—'} (về sớm ${String(l.phut_ve_som)}′)`;
    case 'vang':
      return `${l.ngay_txt}: vắng không phép`;
    case 'thieu_gio':
      return `${l.ngay_txt}: có mặt nhưng thiếu giờ công`;
    default:
      return l.ngay_txt;
  }
}

/**
 * Chi tiet giam thuong ky luat cho cac phieu (theo id). Tra Map(phieu_luong_id -> dong liet ke).
 */
export async function chi_tiet_ky_luat_theo_phieu(
  phieu_ids: readonly string[],
): Promise<Map<string, DongLietKe[]>> {
  const map = new Map<string, DongLietKe[]>();
  if (phieu_ids.length === 0) return map;
  const ids = [...phieu_ids];

  // (A) Loai vi pham + tong tien giam thuong (tu ho so da_ap_dung), kem cac chi_so de biet loai lan.
  const loai = await truy_van<HangLoai>(
    `select p.id as phieu_luong_id, (c->>'ten') as ten,
            sum((c->>'tien')::numeric)::text as tien,
            array_remove(array_agg(distinct vp.bang_chung->>'chi_so'), null) as chi_so_list
       from phieu_luong p
       join ky_luong k on k.id = p.ky_luong_id
       join ho_so_ky_luat h on h.nhan_vien_id = p.nhan_vien_id and h.ky = k.thang
            and h.trang_thai = 'da_ap_dung'
       cross join lateral jsonb_array_elements(coalesce(h.chi_tiet, '[]'::jsonb)) as c
       left join vi_pham vp on vp.id = (c->>'vi_pham_id')::uuid
      where p.id = any($1::uuid[])
        and (c->>'tien') is not null and (c->>'tien')::numeric > 0
      group by p.id, (c->>'ten')
      order by p.id, sum((c->>'tien')::numeric) desc`,
    [ids],
  );
  if (loai.length === 0) return map;

  // (B) Tung lan loi that trong ky (ngay + gio) tu bang cong ngay.
  const lan = await truy_van<HangLan>(
    `select p.id as phieu_luong_id,
            to_char(bcn.ngay, 'DD/MM') as ngay_txt,
            to_char(bcn.gio_vao at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI') as vao_txt,
            to_char(bcn.gio_ra  at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI') as ra_txt,
            bcn.phut_muon, bcn.phut_ve_som, bcn.trang_thai, bcn.phut_lam
       from phieu_luong p
       join ky_luong k on k.id = p.ky_luong_id
       join bang_cong_ngay bcn on bcn.nhan_vien_id = p.nhan_vien_id
            and to_char(bcn.ngay, 'YYYY-MM') = k.thang
      where p.id = any($1::uuid[])
        and (bcn.phut_muon > 0 or bcn.phut_ve_som > 0 or bcn.trang_thai = 'vang'
             or (bcn.trang_thai = 'co_mat' and bcn.phut_lam = 0))
      order by bcn.ngay`,
    [ids],
  );
  const lan_theo_phieu = new Map<string, HangLan[]>();
  for (const l of lan) {
    const ds = lan_theo_phieu.get(l.phieu_luong_id) ?? [];
    ds.push(l);
    lan_theo_phieu.set(l.phieu_luong_id, ds);
  }

  // Gom loai vi pham theo tung phieu (giu thu tu tien giam dan tu truy van).
  const loai_theo_phieu = new Map<string, HangLoai[]>();
  for (const h of loai) {
    const ds = loai_theo_phieu.get(h.phieu_luong_id) ?? [];
    ds.push(h);
    loai_theo_phieu.set(h.phieu_luong_id, ds);
  }

  for (const [phieu_id, nhom_loai] of loai_theo_phieu) {
    // TAT CA lan loi cua nguoi nay trong ky — mo ta theo dung loai cua tung ngay (muon/ve som/
    // vang/thieu gio), khong phu thuoc chi_so cua ho so. Nho vay ai co loi la co danh sach —
    // khong con canh "nguoi co chi tiet, nguoi khong".
    const tat_ca_lan = (lan_theo_phieu.get(phieu_id) ?? []).map((l) => {
      const lo: LoaiLan = l.phut_muon > 0 ? 'muon'
        : l.phut_ve_som > 0 ? 've_som'
          : l.trang_thai === 'vang' ? 'vang'
            : (l.trang_thai === 'co_mat' && l.phut_lam === 0) ? 'thieu_gio' : null;
      return { lo, mo_ta: mo_ta_lan(l, lo) };
    });

    const dong: DongLietKe[] = nhom_loai.map((h, i) => ({
      id: `${phieu_id}:${(h.ten ?? '').trim() || 'Vi phạm'}:${String(i)}`,
      ly_do: (h.ten ?? '').trim() || 'Vi phạm',
      so_tien: h.tien,
      thu_tu: i,
      cac_lan: [] as string[],
    }));

    if (dong.length <= 1) {
      // Mot loai (thuong la loai gop "Di muon, ve som, tu y roi vi tri"): liet ke TAT CA lan.
      if (dong.length === 1) dong[0]!.cac_lan = tat_ca_lan.map((x) => x.mo_ta);
    } else {
      // Nhieu loai: chia lan theo dung loai cua no; lan khong khop loai nao don vao dong dau
      // (khong bo sot lan nao).
      const da_gan = new Array<boolean>(tat_ca_lan.length).fill(false);
      nhom_loai.forEach((h, i) => {
        const lo = loai_tu_chi_so(h.chi_so_list);
        const cl: string[] = [];
        tat_ca_lan.forEach((x, j) => {
          if (!da_gan[j] && x.lo === lo) { da_gan[j] = true; cl.push(x.mo_ta); }
        });
        dong[i]!.cac_lan = cl;
      });
      const con_lai = tat_ca_lan.filter((_, j) => !da_gan[j]).map((x) => x.mo_ta);
      if (con_lai.length > 0) dong[0]!.cac_lan.push(...con_lai);
    }
    map.set(phieu_id, dong);
  }
  return map;
}

export interface ChiTietDiMuon {
  /** Cac ngay vao trong tang phat 50k [moc_50k, moc_nua_ngay). */
  tang_50k: string[];
  /** Cac ngay vao tu moc_nua_ngay tro di (tru nua ngay luong). */
  tang_nua_ngay: string[];
}

/**
 * LIET KE tung ngay di muon bi phat (khoan `tru_di_muon` / `tru_nua_ngay`) — CHI DOC. Phan tang
 * theo gio vao THUC TE so voi moc phat hieu luc cua tung nguoi (nhan_vien ghi de, khong thi lay
 * tham so ky). Gio vao lam tron xuong phut (bo giay) — dung ranh gioi 08:11:00 nhu engine phat.
 */
export async function chi_tiet_di_muon_theo_phieu(
  phieu_ids: readonly string[],
): Promise<Map<string, ChiTietDiMuon>> {
  const map = new Map<string, ChiTietDiMuon>();
  if (phieu_ids.length === 0) return map;

  const rows = await truy_van<{
    phieu_luong_id: string; ngay_txt: string; vao_txt: string;
    vao_phut: number; moc_50k: number; moc_nua: number;
  }>(
    `select p.id as phieu_luong_id,
            to_char(bcn.ngay, 'DD/MM') as ngay_txt,
            to_char(bcn.gio_vao at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI') as vao_txt,
            (extract(hour   from bcn.gio_vao at time zone 'Asia/Ho_Chi_Minh') * 60
           + extract(minute from bcn.gio_vao at time zone 'Asia/Ho_Chi_Minh'))::int as vao_phut,
            (extract(hour   from coalesce(nv.di_muon_moc_50k, ts.di_muon_moc_50k)) * 60
           + extract(minute from coalesce(nv.di_muon_moc_50k, ts.di_muon_moc_50k)))::int as moc_50k,
            (extract(hour   from coalesce(nv.di_muon_moc_nua_ngay, ts.di_muon_moc_nua_ngay)) * 60
           + extract(minute from coalesce(nv.di_muon_moc_nua_ngay, ts.di_muon_moc_nua_ngay)))::int
              as moc_nua
       from phieu_luong p
       join ky_luong k on k.id = p.ky_luong_id
       join nhan_vien nv on nv.id = p.nhan_vien_id
       left join tham_so_luong ts on ts.id = k.tham_so_id
       join bang_cong_ngay bcn on bcn.nhan_vien_id = p.nhan_vien_id
            and to_char(bcn.ngay, 'YYYY-MM') = k.thang
            and bcn.trang_thai = 'co_mat' and bcn.gio_vao is not null
      where p.id = any($1::uuid[])
      order by bcn.ngay`,
    [[...phieu_ids]],
  );

  for (const r of rows) {
    if (r.moc_50k === null || r.vao_phut < r.moc_50k) continue;   // trong dung sai, khong phat
    const ct = map.get(r.phieu_luong_id) ?? { tang_50k: [], tang_nua_ngay: [] };
    const cau = `${r.ngay_txt}: vào ${r.vao_txt}`;
    if (r.moc_nua !== null && r.vao_phut >= r.moc_nua) ct.tang_nua_ngay.push(cau);
    else ct.tang_50k.push(cau);
    map.set(r.phieu_luong_id, ct);
  }
  return map;
}
