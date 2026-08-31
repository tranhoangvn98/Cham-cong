// Chay mot chuong trinh ngoai mot cach an toan.
//
// VI SAO PHAI CO LOP NAY: hai viec o day — doc chu trong PDF va OCR ban scan — khong lam
// duoc bang JavaScript thuan. Chung can `pdftotext` / `pdftoppm` / `tesseract`. Nhung goi
// mot tien trinh ngoai voi du lieu NGUOI LA TAI LEN la mot be mat tan cong that: bo phan
// tich PDF va bo OCR deu viet bang C, va deu tung co lo hong doc bo nho.
//
// Bon rang buoc, va deu la rang buoc CUNG, khong phai khuyen nghi:
//
//   1. KHONG BAO GIO qua shell. `spawn` voi mang doi so, `shell: false`. Ten tep do nguoi
//      dung dat khong the bien thanh cau lenh.
//   2. CO HAN GIO. Mot tep PDF vong lap co the lam pdftotext chay mai. Het gio thi SIGKILL,
//      khong phai SIGTERM — chuong trinh dang treo thi khong xu ly tin hieu.
//   3. CO TRAN DAU RA. Mot tep nho co the bung ra hang GB chu.
//   4. THIEU CHUONG TRINH LA MOT LOI RIENG, khong phai loi chung. `LoiThieuCongCu` de lop
//      tren noi duoc "may chu chua cai OCR" thay vi "loi khong xac dinh" — vi day la tinh
//      huong BINH THUONG tren may lap trinh va tren may kiem thu.
import { spawn } from 'node:child_process';

/** Chuong trinh khong co tren may. Khong phai loi cua nguoi dung, cung khong phai loi bug. */
export class LoiThieuCongCu extends Error {
  // Khai truong roi gan trong than ham: `--experimental-strip-types` cua Node khong ho tro
  // tham so-thuoc tinh (`constructor(public x)`) — no can bien doi ma, khong chi cat kieu.
  readonly cong_cu: string;

  constructor(cong_cu: string) {
    super(`Máy chủ chưa cài "${cong_cu}".`);
    this.name = 'LoiThieuCongCu';
    this.cong_cu = cong_cu;
  }
}

/** Chuong trinh chay xong nhung bao loi, hoac bi giet vi het gio / vuot tran. */
export class LoiLenhNgoai extends Error {
  readonly cong_cu: string;

  constructor(message: string, cong_cu: string) {
    super(message);
    this.name = 'LoiLenhNgoai';
    this.cong_cu = cong_cu;
  }
}

export interface TuyChonLenh {
  /** Day vao stdin. Bo trong thi dong stdin ngay. */
  vao?: Buffer;
  /** Het gio thi giet. */
  han_giay?: number;
  /** Tran stdout. Vuot thi giet va bao loi. */
  ra_toi_da?: number;
  /** Thu muc lam viec. */
  thu_muc?: string;
}

export interface KetQuaLenh {
  ma: number;
  ra: Buffer;
  /** stderr dang chu — de dua vao thong bao loi cho nguoi doc. */
  loi: string;
}

const HAN_GIAY_MAC_DINH = 60;
const RA_TOI_DA_MAC_DINH = 16 * 1024 * 1024;

/**
 * Chay `ten` voi `doi_so`. Tra ve ma thoat va stdout.
 *
 * KHONG nem loi khi ma thoat != 0 — nhieu chuong trinh (vd tesseract) ghi canh bao ra
 * stderr va van thanh cong, va co truong hop lop tren muon tu quyet dinh. Chi nem khi
 * khong chay duoc, het gio, hoac vuot tran.
 */
export async function chay_lenh(
  ten: string,
  doi_so: string[],
  tc: TuyChonLenh = {},
): Promise<KetQuaLenh> {
  const han_ms = (tc.han_giay ?? HAN_GIAY_MAC_DINH) * 1000;
  const ra_toi_da = tc.ra_toi_da ?? RA_TOI_DA_MAC_DINH;

  return new Promise<KetQuaLenh>((xong, hong) => {
    const tt = spawn(ten, doi_so, {
      shell: false,
      cwd: tc.thu_muc,
      stdio: ['pipe', 'pipe', 'pipe'],
      // NHOM TIEN TRINH RIENG. Khong co cai nay, `kill` chi giet dung tien trinh con truc
      // tiep; cac chau no de lai van chay va van GIU DAU RA — nen su kien 'close' khong
      // bao gio den va han gio tro thanh treo vinh vien. Da gap that: mot bai kiem chay
      // `sh -c 'yes'`, giet `sh` xong `yes` moc ra ngoai va quay 80% CPU.
      //
      // `detached` doi lai mot rui ro nho: may chu chet bat ngo thi tien trinh con song
      // sot. Chap nhan duoc vi moi cong cu o day deu ngan va deu co han gio rieng.
      detached: true,
      // Khong ke thua bien moi truong cua may chu: trong do co mat khau CSDL va khoa JWT.
      // Chi giu nhung bien cac cong cu nay thuc su can.
      env: {
        PATH: process.env['PATH'] ?? '/usr/local/bin:/usr/bin:/bin',
        LANG: 'C.UTF-8',
        ...(process.env['TESSDATA_PREFIX'] === undefined
          ? {}
          : { TESSDATA_PREFIX: process.env['TESSDATA_PREFIX'] }),
      },
    });

    const manh_ra: Buffer[] = [];
    const manh_loi: Buffer[] = [];
    let do_dai = 0;
    let da_xong = false;
    let ly_do_giet: string | null = null;

    /**
     * Giet ca nhom tien trinh, roi bao loi NGAY — khong doi 'close'.
     *
     * Hai buoc, va thieu buoc nao cung treo:
     *   - `process.kill(-pid)` giet ca nhom (dau tru), khong chi tien trinh dau.
     *   - Pha luon ba duong ong. Neu con mot chau chua chet va con giu dau ra thi 'close'
     *     se khong bao gio den; ta khong duoc phu thuoc vao no de tra loi.
     */
    const giet = (ly_do: string): void => {
      if (da_xong) return;
      da_xong = true;
      ly_do_giet = ly_do;
      clearTimeout(bo_hen);

      try {
        if (tt.pid !== undefined) process.kill(-tt.pid, 'SIGKILL');
      } catch {
        tt.kill('SIGKILL'); // nhom da chet, hoac he dieu hanh khong cho — thu cach thuong
      }
      tt.stdout.destroy();
      tt.stderr.destroy();
      tt.stdin.destroy();

      hong(new LoiLenhNgoai(`${ten} bị dừng: ${ly_do}.`, ten));
    };

    const bo_hen = setTimeout(() => giet(`quá ${tc.han_giay ?? HAN_GIAY_MAC_DINH} giây`), han_ms);

    tt.stdout.on('data', (m: Buffer) => {
      do_dai += m.length;
      if (do_dai > ra_toi_da) { giet('vượt trần dữ liệu trả về'); return; }
      manh_ra.push(m);
    });
    // stderr chi giu mot doan dau: du de bao loi, khong du de lam het bo nho.
    tt.stderr.on('data', (m: Buffer) => {
      if (manh_loi.reduce((n, x) => n + x.length, 0) < 8192) manh_loi.push(m);
    });

    tt.on('error', (loi: NodeJS.ErrnoException) => {
      if (da_xong) return;
      da_xong = true;
      clearTimeout(bo_hen);
      // ENOENT = khong co chuong trinh nay; EACCES = co nhung khong chay duoc.
      if (loi.code === 'ENOENT' || loi.code === 'EACCES') hong(new LoiThieuCongCu(ten));
      else hong(new LoiLenhNgoai(`Không chạy được ${ten}: ${loi.message}`, ten));
    });

    tt.on('close', (ma) => {
      // `giet` da tra loi roi thi bo qua — 'close' co the den sau, hoac khong bao gio den.
      if (da_xong || ly_do_giet !== null) return;
      da_xong = true;
      clearTimeout(bo_hen);
      xong({
        ma: ma ?? -1,
        ra: Buffer.concat(manh_ra),
        loi: Buffer.concat(manh_loi).toString('utf8').trim(),
      });
    });

    // EPIPE khi chuong trinh dong stdin truoc luc ta ghi xong (vd tep loi, no bo cuoc
    // ngay). Do khong phai loi cua ta — ket qua that nam o ma thoat.
    tt.stdin.on('error', () => { /* bo qua */ });
    if (tc.vao !== undefined) tt.stdin.end(tc.vao);
    else tt.stdin.end();
  });
}

// Nho ket qua do tim: `co_cong_cu` bi goi moi lan trich mot tep, va tap tin he thong khong
// tu moc chuong trinh moi giua hai lan chay.
const da_do = new Map<string, boolean>();

/** Chuong trinh nay co tren may khong? */
export async function co_cong_cu(ten: string): Promise<boolean> {
  const nho = da_do.get(ten);
  if (nho !== undefined) return nho;

  let co = false;
  try {
    // `-v` / `--version`: khong phai chuong trinh nao cung nhan cung mot co, nhung ta chi
    // can biet no CHAY DUOC — ma thoat bao nhieu khong quan trong.
    await chay_lenh(ten, ['--version'], { han_giay: 10, ra_toi_da: 64 * 1024 });
    co = true;
  } catch (loi) {
    if (!(loi instanceof LoiThieuCongCu)) co = true; // chay duoc nhung khong hieu co
  }
  da_do.set(ten, co);
  return co;
}

/** Xoa bo nho do cong cu. Chi dung trong bai kiem. */
export function quen_cong_cu(): void {
  da_do.clear();
}
