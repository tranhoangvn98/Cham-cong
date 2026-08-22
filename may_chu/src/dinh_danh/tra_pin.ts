// Tra PIN may cham cong ra nhan vien THEO MOC THOI GIAN cua lan quet.
//
// VI SAO CAN MODULE NAY: truoc ban nay bo tiep nhan ADMS tra PIN bang cau
//
//     ... and md.hieu_luc_den is null
//
// tuc la "AI DANG GIU PIN HOM NAY". Voi lo den dung luc thi khong sai. Nhung lo den MUON thi
// sai, va lo den muon la chuyen thuong o day: may mat mang vai ngay (co han bo theo doi may
// offline chinh vi the), hoac nhan su nap lai du lieu cu tu may. Khi PIN 042 doi chu ngay 01.07,
// mot lo den muon mang lan quet thang 6 se gan het cho nguoi dang giu PIN hom nay — tuc la sai
// bang cong thang 6, tuc la sai luong. `CLAUDE.md` goi dung loai loi nay: "sai la sai luong ca
// cong ty."
//
// Chieu thoi gian da co san tu di tru 025: `ma_dinh_danh` co `hieu_luc_tu` / `hieu_luc_den`, dong
// lai chu khong xoa. Module nay chi doc cho dung.
//
// Module NAY THUAN: khong CSDL, khong Fastify. Nho the kiem duoc bang du lieu mau, va bai kiem
// "PIN doi chu giua thang" khong can dung mot may cham cong that.

/** Mot nguoi, du de ghi vao `lan_quet` va vao su kien. */
export interface NguoiMap {
  id: string;
  ma_nv: string;
  ma_erp: string | null;
}

/** Mot khoang thoi gian ma mot PIN thuoc mot nguoi. */
export interface KhoangMa extends NguoiMap {
  hieu_luc_tu: Date;
  /** null = con hieu luc. Moc nay LOAI TRU: `hieu_luc_den` la luc PIN thoi thuoc nguoi nay. */
  hieu_luc_den: Date | null;
}

/**
 * Lich su cua cac PIN trong mot lo, nap mot lan.
 *
 * `khoang` la nguon su that. `cot` la duong doc thu hai (`nhan_vien.pin_may`) — giu lai vi form
 * ho so va duong nhap CSV van ghi vao cot do.
 */
export interface LichPin {
  /** PIN chuan -> cac khoang, SAP THEO `hieu_luc_tu` TANG DAN. */
  khoang: Map<string, KhoangMa[]>;
  /** PIN chuan -> nguoi theo cot `nhan_vien.pin_may`. Khong co chieu thoi gian. */
  cot: Map<string, NguoiMap>;
}

export function lich_pin_rong(): LichPin {
  return { khoang: new Map(), cot: new Map() };
}

/**
 * Dung `LichPin` tu cac dong doc duoc. Sap xep o day mot lan, de `tra_pin` (goi tung ban ghi,
 * co the vai nghin lan mot lo) khong phai sap lai.
 */
export function dung_lich_pin(
  dong_bang: readonly (KhoangMa & { pin: string })[],
  dong_cot: readonly (NguoiMap & { pin: string })[],
): LichPin {
  const khoang = new Map<string, KhoangMa[]>();
  for (const d of dong_bang) {
    const ds = khoang.get(d.pin);
    const k: KhoangMa = {
      id: d.id, ma_nv: d.ma_nv, ma_erp: d.ma_erp,
      hieu_luc_tu: d.hieu_luc_tu, hieu_luc_den: d.hieu_luc_den,
    };
    if (ds === undefined) khoang.set(d.pin, [k]); else ds.push(k);
  }
  for (const ds of khoang.values()) {
    ds.sort((a, b) => a.hieu_luc_tu.getTime() - b.hieu_luc_tu.getTime());
  }

  const cot = new Map<string, NguoiMap>();
  for (const d of dong_cot) {
    cot.set(d.pin, { id: d.id, ma_nv: d.ma_nv, ma_erp: d.ma_erp });
  }
  return { khoang, cot };
}

/**
 * PIN + moc thoi gian -> nguoi, hoac null neu khong biet la ai luc do.
 *
 * BON LUAT, va ba trong so do la de KHONG lam mat khop so voi truoc ban nay:
 *
 * 1. KHOANG DAU TIEN MO VE PHIA TRUOC. `hieu_luc_tu` cua dong dau khong phai mot su that nghiep
 *    vu — voi du lieu cu no la `nhan_vien.tao_luc`, do di tru 025 backfill dat vao. Neu tin no
 *    thi moi lan quet nhap tu lich su CSV truoc ngay tao ho so se thanh "khong biet la ai", tuc
 *    la ban nay lam mat khop mot dong du lieu dang dung duoc. Chi RANH GIOI GIUA HAI DONG moi
 *    mang nghia that: do la luc PIN doi chu.
 *
 * 2. BANG CO DONG NAO CHO PIN NAY LA BANG NOI CUOI. Neu bang co dong nhung khong dong nao phu
 *    moc `t` (PIN da dong lai, chua cap cho ai) thi tra null — KHONG roi xuong cot. Roi xuong
 *    cot la quay lai dung cai loi module nay sinh ra de sua: cot chi biet "hom nay la ai".
 *
 * 3. CHI KHI BANG KHONG CO DONG NAO moi doc cot. Duong nay danh cho PIN vua go tay tren form ho
 *    so ma chua kip sinh dong o bang.
 *
 * 4. KHOANG CHONG NHAU: dong co `hieu_luc_tu` MUON NHAT thang. Index cua di tru 025 chi bao dam
 *    cac dong DANG hieu luc khong trung nhau, nen lich su van chong nhau duoc. Chong nhau la du
 *    lieu can sua tay (xem `trien_khai/pin_trung_khoang.sh`), khong phai chuyen de bo tiep nhan
 *    tu quyet — nhung no phai quyet dinh duoc, va "lan cap gan nhat thang" la luat de ke lai.
 */
export function tra_pin(lich: LichPin, pin: string, thoi_diem: Date): NguoiMap | null {
  const ds = lich.khoang.get(pin);
  if (ds === undefined || ds.length === 0) {
    return lich.cot.get(pin) ?? null;
  }

  const t = thoi_diem.getTime();
  let chon: KhoangMa | null = null;
  for (let i = 0; i < ds.length; i++) {
    const k = ds[i] as KhoangMa;
    // Luat 1: dong dau tien mo ve phia truoc.
    const bat_dau = i === 0 ? -Infinity : k.hieu_luc_tu.getTime();
    const ket_thuc = k.hieu_luc_den === null ? Infinity : k.hieu_luc_den.getTime();
    if (t >= bat_dau && t < ket_thuc) chon = k; // Luat 4: dong sau ghi de dong truoc.
  }
  if (chon === null) return null; // Luat 2.
  return { id: chon.id, ma_nv: chon.ma_nv, ma_erp: chon.ma_erp };
}

/**
 * Cac PIN ma BANG va COT noi khac nhau ve "ai dang giu hom nay".
 *
 * Hai ben noi khac nhau la trieu chung, khong phai chuyen binh thuong: cot `pin_may` co co
 * `dong_bo_cot: 'luon'` trong bang dac ta, nen lech nghia la mot duong ghi da bo qua viec dong
 * bo. Ghi canh bao de no len duoc bao cao doi soat thay vi im lang.
 *
 * So sanh o day dung dong DANG hieu luc, vi do la thu duy nhat cot co the noi ve.
 */
export function cac_pin_lech(lich: LichPin): { pin: string; ma_nv_bang: string; ma_nv_cot: string }[] {
  const ra: { pin: string; ma_nv_bang: string; ma_nv_cot: string }[] = [];
  for (const [pin, nguoi_cot] of lich.cot) {
    const ds = lich.khoang.get(pin);
    if (ds === undefined) continue;
    const dang_mo = ds.filter((k) => k.hieu_luc_den === null);
    // Khong co dong nao dang mo thi khong co gi de so — cot noi ve hom nay, bang noi PIN da dong.
    // Do la mot dang lech khac, va `pin_trung_khoang.sh` la cho bao no.
    if (dang_mo.length === 0) continue;
    const b = dang_mo[dang_mo.length - 1] as KhoangMa;
    if (b.id !== nguoi_cot.id) {
      ra.push({ pin, ma_nv_bang: b.ma_nv, ma_nv_cot: nguoi_cot.ma_nv });
    }
  }
  return ra;
}

/**
 * Khoang hieu luc cua mot PIN doi voi MOT nguoi cu the — de dat mac dinh cho nut "gan lai".
 *
 * Tra ve khoang nho nhat trum het cac dong cua nguoi do voi PIN do. `tu === null` nghia la mo ve
 * phia truoc (luat 1 o tren): nguoi nay la chu dau tien cua PIN.
 *
 * Nguoi do khong co dong nao voi PIN nay thi tra null — va cho goi phai TU CHOI chu khong doan.
 */
export function khoang_cua_nguoi(
  lich: LichPin, pin: string, nhan_vien_id: string,
): { tu: Date | null; den: Date | null } | null {
  const ds = (lich.khoang.get(pin) ?? []).filter((k) => k.id === nhan_vien_id);
  if (ds.length === 0) return null;
  const dau = ds[0] as KhoangMa;
  const la_chu_dau_tien = (lich.khoang.get(pin) as KhoangMa[])[0]?.id === nhan_vien_id;
  const cuoi = ds[ds.length - 1] as KhoangMa;
  return {
    tu: la_chu_dau_tien ? null : dau.hieu_luc_tu,
    den: cuoi.hieu_luc_den,
  };
}
