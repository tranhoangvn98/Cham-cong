// Van tay ban ghi ERP 1 — de phat hien viec sua ma khong de lai dau vet.
//
// VI SAO CAN: nhieu bang tien cua ERP 1 KHONG co cot ModifiedDate/ModifiedBy. Da kiem chung:
// `xnk.Logistic.Core/SharedKernel/BaseEntity.cs` chi co Id/CreatedUtcDate/IsDeleted;
// `DatabaseCore.Domain/Entities/Base/BaseEntity.cs` chi co CreatedDate/LastUpdateTime/
// IsDeleted. Nghia la sua so tien tren mot phieu da duyet KHONG de lai gi trong CSDL de truy
// van. Khong the phat hien bang mot cau SELECT, du viet kheo den may.
//
// CACH BU: moi vong quet, ta bam cac truong trong yeu cua ban ghi thanh mot van tay va luu
// lai. Van tay doi giua hai vong => co nguoi sua trong khoang giua.
//
// GIOI HAN PHAI NOI RO (va da ghi trong tai lieu): cach nay tra loi duoc CAI GI doi va TRONG
// KHOANG NAO, KHONG tra loi duoc AI doi. ERP 1 khong luu thong tin do. Dung de ai hieu nham
// rang module tra loi duoc cau hoi thu ba.
import { createHash } from 'node:crypto';
import { truy_van, trong_giao_dich } from '../csdl/ket_noi.ts';

/** Ket qua so sanh mot ban ghi voi anh chup lan truoc. */
export interface KetQuaSoSanh {
  khoa: string;
  /** 'moi' = lan dau thay; 'doi' = van tay khac lan truoc; 'nguyen' = khong doi. */
  tinh_trang: 'moi' | 'doi' | 'nguyen';
  truoc: Record<string, unknown> | null;
  sau: Record<string, unknown>;
  /** Thoi diem chup anh truoc do — can duoi cua khoang thoi gian xay ra viec sua. */
  chup_truoc_luc: string | null;
}

/**
 * Bam mot doi tuong thanh van tay on dinh.
 *
 * SAP XEP KHOA truoc khi bam: thu tu khoa trong doi tuong JS phu thuoc thu tu chen, va thu
 * tu cot tra ve tu Postgres co the doi khi ai do sua cau SELECT. Khong sap xep thi mot lan
 * sua cau truy van se bao "toan bo ban ghi vua bi sua" — hang nghin canh bao gia trong mot
 * vong quet.
 *
 * `null` va `undefined` deu thanh chuoi 'null' de mot cot doi tu NULL sang thieu han khong bi
 * tinh la thay doi du lieu.
 */
export function van_tay(du_lieu: Record<string, unknown>): string {
  const khoa = Object.keys(du_lieu).sort();
  const phang = khoa.map((k) => {
    const v = du_lieu[k];
    if (v === null || v === undefined) return `${k}=null`;
    if (v instanceof Date) return `${k}=${v.toISOString()}`;
    if (typeof v === 'object') return `${k}=${JSON.stringify(v)}`;
    return `${k}=${String(v)}`;
  });
  return createHash('sha256').update(phang.join('')).digest('hex');
}

/**
 * Doi chieu mot lo ban ghi voi anh chup lan truoc, roi ghi de anh chup moi.
 *
 * Chay TRONG MOT TRANSACTION de mot vong quet bi dut giua chung khong de lai anh chup mot
 * nua — lan quet sau se so voi du lieu nua cu nua moi va bao sai.
 *
 * Lan dau thay mot ban ghi tra ve 'moi', KHONG phai 'doi'. Neu tra 'doi' thi vong quet dau
 * tien se bao toan bo du lieu lich su la "vua bi sua" — vo dung va lam nguoi ta mat long tin
 * vao module ngay tu ngay dau.
 */
export async function doi_chieu_va_chup(
  nguon_ma: string,
  bang: string,
  ban_ghi: ReadonlyArray<{ khoa: string; du_lieu: Record<string, unknown> }>,
): Promise<KetQuaSoSanh[]> {
  if (ban_ghi.length === 0) return [];

  const khoa_list = ban_ghi.map((b) => b.khoa);
  const cu = await truy_van<{ khoa: string; van_tay: string; du_lieu: Record<string, unknown>;
    quet_luc: string }>(
    `select khoa, van_tay, du_lieu, quet_luc
       from anh_chup_erp
      where nguon_ma = $1 and bang = $2 and khoa = any($3::text[])`,
    [nguon_ma, bang, khoa_list],
  );
  const ban_do = new Map(cu.map((d) => [d.khoa, d]));

  const ket_qua: KetQuaSoSanh[] = [];
  const can_ghi: { khoa: string; vt: string; du_lieu: Record<string, unknown> }[] = [];

  for (const b of ban_ghi) {
    const vt = van_tay(b.du_lieu);
    const truoc = ban_do.get(b.khoa);
    if (truoc === undefined) {
      ket_qua.push({ khoa: b.khoa, tinh_trang: 'moi', truoc: null, sau: b.du_lieu,
        chup_truoc_luc: null });
      can_ghi.push({ khoa: b.khoa, vt, du_lieu: b.du_lieu });
    } else if (truoc.van_tay !== vt) {
      ket_qua.push({ khoa: b.khoa, tinh_trang: 'doi', truoc: truoc.du_lieu, sau: b.du_lieu,
        chup_truoc_luc: truoc.quet_luc });
      can_ghi.push({ khoa: b.khoa, vt, du_lieu: b.du_lieu });
    } else {
      ket_qua.push({ khoa: b.khoa, tinh_trang: 'nguyen', truoc: truoc.du_lieu, sau: b.du_lieu,
        chup_truoc_luc: truoc.quet_luc });
      // Khong ghi lai ban ghi khong doi: ghi de vo ich lam bang phinh WAL moi vong quet.
    }
  }

  if (can_ghi.length > 0) {
    await trong_giao_dich(async (khach) => {
      for (const g of can_ghi) {
        await khach.query(
          `insert into anh_chup_erp (nguon_ma, bang, khoa, van_tay, du_lieu, quet_luc)
           values ($1,$2,$3,$4,$5::jsonb, now())
           on conflict (nguon_ma, bang, khoa)
           do update set van_tay = excluded.van_tay,
                         du_lieu = excluded.du_lieu,
                         quet_luc = excluded.quet_luc`,
          [nguon_ma, bang, g.khoa, g.vt, JSON.stringify(g.du_lieu)],
        );
      }
    });
  }

  return ket_qua;
}

/**
 * Cac truong doi giua hai ban ghi — de bang chung chi ra dung cho da sua thay vi bat nguoi
 * doc tu do chieu hai khoi JSON.
 */
export function truong_da_doi(
  truoc: Record<string, unknown> | null, sau: Record<string, unknown>,
): string[] {
  if (truoc === null) return [];
  const khoa = new Set([...Object.keys(truoc), ...Object.keys(sau)]);
  return [...khoa].filter((k) => String(truoc[k] ?? '') !== String(sau[k] ?? '')).sort();
}
