// Parser CHANGELOG.md — tach cac muc "phat hanh" de phuc vu tinh nang cong bo phat hanh.
//
// Khuon CHANGELOG cua repo (xem CHANGELOG.md goc):
//
//   ## [1.105.3] — 2026-09-24
//
//   **Tieu de tinh nang.**
//
//   - Dong mo ta (co the xuong dong, dong noi tiep thut dau dong).
//
// Mot muc co the co NHIEU dong **tieu de** (mot phien ban gom nhieu tinh nang).
//
// Ham THUAN (khong doc tep, khong cham CSDL) — test don vi chay duoc trong docker build.

/** Mot muc phat hanh trong CHANGELOG (mot phien ban). */
export interface MucPhatHanh {
  /** Vi du '1.105.3'. */
  phien_ban: string;
  /** 'YYYY-MM-DD' hoac '' khi dong khong ghi ngay. */
  ngay: string;
  /** Cac dong **tieu de** trong muc — moi dong la mot tinh nang. */
  tieu_de: string[];
  /** Cac dong gach dau dong (da gop dong noi tiep thut dau dong). */
  cac_y: string[];
}

/**
 * Tach noi dung CHANGELOG thanh danh sach muc phat hanh, theo THU TU TRONG FILE
 * (muc moi nhat dung dau).
 */
export function phan_tich_changelog(noi_dung: string): MucPhatHanh[] {
  const muc: MucPhatHanh[] = [];
  let hien: MucPhatHanh | null = null;

  for (const d0 of noi_dung.split(/\r?\n/)) {
    const s = d0.trimEnd();

    // Dau muc moi: `## [1.105.3] — 2026-09-24` (ngay co the thieu).
    const dau = /^##\s+(.+)$/.exec(s);
    if (dau !== null) {
      const thong_tin = dau[1] ?? '';
      const phien_ban = /(\d+\.\d+\.\d+)/.exec(thong_tin)?.[1] ?? thong_tin.trim();
      const ngay = /(\d{4}-\d{2}-\d{2})/.exec(thong_tin)?.[1] ?? '';
      hien = { phien_ban, ngay, tieu_de: [], cac_y: [] };
      muc.push(hien);
      continue;
    }
    if (hien === null) continue;

    const t = s.trim();

    // Dong tieu de tinh nang: **...** (mot muc co the co nhieu dong).
    if (/^\*\*.+\*\*\.?$/.test(t)) {
      const tua = t.replace(/^\*\*/, '').replace(/\*\*\.?$/, '').trim();
      if (tua !== '') hien.tieu_de.push(tua);
      continue;
    }

    // Bullet moi.
    if (t.startsWith('- ')) {
      hien.cac_y.push(t.slice(2).trim());
      continue;
    }

    // Dong noi tiep cua bullet truoc (thut dau dong).
    if (/^\s+/.test(s) && hien.cac_y.length > 0) {
      const i = hien.cac_y.length - 1;
      const cu = hien.cac_y[i];
      if (cu !== undefined) hien.cac_y[i] = `${cu} ${t}`;
    }
    // Cac dong khac (trong, ghi chu) bo qua.
  }

  return muc;
}

/** Danh sach phien ban theo thu tu trong file (moi nhat truoc). */
export function cac_phien_ban(cac_muc: MucPhatHanh[]): string[] {
  return cac_muc.map((m) => m.phien_ban);
}

/**
 * Lay cac muc CHUA cong bo: moi hon `tu_phien_ban` (ban nay da cong bo roi, bo qua no)
 * va toi `den_phien_ban` (ban moi nhat duoc cong bo lan nay, bao gom). Thu tu: moi nhat truoc.
 *
 * `tu_phien_ban` khong co trong danh sach (vi CHANGELOG da cat muc cu) thi lay tu dau
 * danh sach — tat ca nhung muc den `den_phien_ban`.
 */
export function muc_chua_cong_bo(
  cac_muc: MucPhatHanh[], tu_phien_ban: string, den_phien_ban: string,
): MucPhatHanh[] {
  const vi = (v: string): number => cac_muc.findIndex((m) => m.phien_ban === v);
  const i_den = vi(den_phien_ban);
  if (i_den === -1) return [];
  const i_tu = vi(tu_phien_ban);
  // tu khong con trong danh sach (CHANGELOG da cat muc cu): lay tat ca den den.
  if (i_tu === -1) return cac_muc.slice(0, i_den + 1);
  // Danh sach moi nhat truoc: cac muc CHUA cong bo nam giua den va tu (khong gom tu).
  if (i_tu > i_den) return cac_muc.slice(i_den, i_tu);
  // tu moi hon hoac bang den: khong con muc nao moi.
  return [];
}
