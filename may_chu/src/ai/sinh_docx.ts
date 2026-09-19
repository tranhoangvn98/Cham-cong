// Bo sinh docx NĐ30 — interface `BoSinhDocx` hien thuc bang PYTHON SIDECAR.
//
// Tai sao Python sidecar ma khong viet OOXML bang tay: the thuc ND30 (quoc hieu, tieu ngu,
// so ky hieu, can le, thu tu khoi) nhieu chi tiet de sai am tham, con `python-docx` da xu ly
// san kho giay + font + bang. Sidecar doc lap: nhan spec JSON qua TEP TAM + MANG THAM SO
// (khong noi suy shell — chong injection), tra tep docx, xoa tep tam sau khi xong.
//
// Interface giu nguyen `dung(spec): Buffer` nen sau nay co the thay ruot bang TypeScript ma
// khong dung gi den phan con lai.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { cau_hinh } from '../cau_hinh.ts';
import type { BoSinhDocx, SpecVanBan } from './kieu.ts';

/** Loi sinh docx — worker chuyen ban nhap sang trang thai `loi` va giu so da cap. */
export class LoiSinhDocx extends Error {
  /** 'khong_tim_script' | 'chay_loi' | 'het_gio' */
  readonly ma: string;

  constructor(ma: string, thong_diep: string) {
    super(thong_diep);
    this.ma = ma;
  }
}

/** Cau hinh sidecar. Bo test bơm cau hinh gia qua tham so (cau_hinh la `as const`). */
export interface CauHinhVanBanHc {
  script: string;
  ung_vien_script: readonly string[];
  python_bin: string;
  timeout_ms: number;
}

/** Tim duong dan build_vbhc.py: khai truc tiep hoac do theo cwd (dev / Docker). */
export function tim_script_python(c: CauHinhVanBanHc = cau_hinh.van_ban_hc): string {
  if (c.script !== '') return resolve(c.script);
  for (const ung_vien of c.ung_vien_script) {
    const p = resolve(process.cwd(), ung_vien);
    if (existsSync(p)) return p;
  }
  throw new LoiSinhDocx(
    'khong_tim_script',
    `Khong tim thay build_vbhc.py (da thu: ${c.ung_vien_script.join(', ')}).`,
  );
}

/** Chay mot lenh Python, gioi han thoi gian, giu stderr de bao loi. */
function chay_python(script: string, tham_so: string[]): Promise<void> {
  return new Promise<void>((xong, loi) => {
    const con = spawn(cau_hinh.van_ban_hc.python_bin, [script, ...tham_so], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let err = '';
    con.stderr.on('data', (d) => {
      err += String(d);
      if (err.length > 4000) err = err.slice(-4000);
    });

    const hen = setTimeout(() => {
      con.kill();
      loi(new LoiSinhDocx('het_gio', 'Bo sinh docx chay qua thoi gian cho phep.'));
    }, cau_hinh.van_ban_hc.timeout_ms);

    con.on('error', (e) => {
      clearTimeout(hen);
      loi(new LoiSinhDocx('chay_loi',
        `Khong chay duoc ${cau_hinh.van_ban_hc.python_bin}: ${e.message}`));
    });
    con.on('close', (ma) => {
      clearTimeout(hen);
      if (ma === 0) { xong(); return; }
      loi(new LoiSinhDocx('chay_loi', `Bo sinh docx thoat ma ${ma}: ${err.trim()}`));
    });
  });
}

/** Hien thuc thu: ghi spec vao tep tam, goi Python, doc docx ra Buffer, don dep. */
export class BoSinhDocxPython implements BoSinhDocx {
  async dung(spec: SpecVanBan): Promise<Buffer> {
    const script = tim_script_python();
    const thu_muc = await mkdtemp(join(tmpdir(), 'vbhc-'));
    const duong_spec = join(thu_muc, 'spec.json');
    const duong_ra = join(thu_muc, 'ket_qua.docx');
    try {
      await writeFile(duong_spec, JSON.stringify(spec), 'utf8');
      await chay_python(script, [duong_spec, duong_ra]);
      return await readFile(duong_ra);
    } finally {
      // Tep tam co the chua noi dung van ban (du lieu ca nhan) — xoa trong moi truong hop.
      await rm(thu_muc, { recursive: true, force: true });
    }
  }
}

/** Dung cho moi noi can mot bo sinh: mot the hien dung chung ca tien trinh. */
export const bo_sinh_docx: BoSinhDocx = new BoSinhDocxPython();
