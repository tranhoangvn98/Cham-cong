// Thanh phan giao dien dung chung.
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, Text, TextInput, View,
  type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import { goi, LoiApi } from './api';
import { dung_mau, kieu } from './kieu';

// ============================================================ chu
export function Chu(
  { children, co, dam, mau, canh, style }: {
    children: ReactNode;
    co?: 'bo' | 'nho' | 'thuong' | 'h3' | 'h2' | 'h1';
    dam?: boolean;
    mau?: 'chu' | 'nhat' | 'mo' | 'tot' | 'xau' | 'canh_bao' | 'lanh' | 'nhan' | 'chinh';
    canh?: 'trai' | 'giua' | 'phai';
    style?: StyleProp<TextStyle>;
  },
): ReactNode {
  const m = dung_mau();
  const co_kieu = {
    bo: kieu.chu_bo, nho: kieu.chu_nho, thuong: kieu.chu,
    h3: kieu.h3, h2: kieu.h2, h1: kieu.h1,
  }[co ?? 'thuong'];
  const mau_chu = {
    chu: m.chu, nhat: m.chu_nhat, mo: m.chu_mo,
    tot: m.tot, xau: m.xau, canh_bao: m.canh_bao, lanh: m.lanh, nhan: m.nhan,
    // Chu dung `chinh_dam`: `chinh` (#4285F4) chi dat 3.56:1 tren nen trang nen chi de
    // to mang, khong dat chu len. Xem thiet_ke/token.json.
    chinh: m.chinh_dam,
  }[mau ?? 'chu'];
  return (
    <Text
      style={[
        co_kieu,
        { color: mau_chu },
        dam === true && kieu.rat_dam,
        canh !== undefined && { textAlign: canh === 'giua' ? 'center' : canh === 'phai' ? 'right' : 'left' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ============================================================ ky hieu
/**
 * Ky hieu ve bang FONT HE THONG, khong dat fontFamily.
 *
 * Be Vietnam Pro khong co mot so ky hieu (→ U+2192, ✓ U+2713). React Native KHONG tu tim
 * font du phong nhu trinh duyet: dat fontFamily roi thieu glyph la ra o vuong rong tren
 * may that, con tren web van hien binh thuong — nen loi nay khong the phat hien bang
 * chay thu tren trinh duyet. Font he thong cua Android/iOS deu co day du.
 *
 * Test `thiet_ke/font.test.mjs` chan viec dat ky hieu thieu glyph vao <Chu>.
 */
export function KyHieu(
  { children, co, mau }: {
    children: string;
    co?: number;
    mau?: 'chu' | 'nhat' | 'mo' | 'tot' | 'xau' | 'canh_bao' | 'lanh' | 'chinh' | 'tren_chinh';
  },
): ReactNode {
  const m = dung_mau();
  const mau_chu = {
    chu: m.chu, nhat: m.chu_nhat, mo: m.chu_mo, tot: m.tot, xau: m.xau,
    canh_bao: m.canh_bao, lanh: m.lanh, chinh: m.chinh_dam, tren_chinh: m.tren_chinh,
  }[mau ?? 'chu'];
  return <Text style={{ fontSize: co ?? 15, color: mau_chu }}>{children}</Text>;
}

// ============================================================ the
export function The({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }): ReactNode {
  const m = dung_mau();
  return (
    <View style={[kieu.the, { backgroundColor: m.nen_the, borderColor: m.vien }, style]}>
      {children}
    </View>
  );
}

// ============================================================ nut
export function Nut(
  { chu, khi_bam, kieu_nut, dang_chay, tat, style }: {
    chu: string;
    khi_bam: () => void;
    kieu_nut?: 'chinh' | 'vien' | 'phang' | 'nguy';
    dang_chay?: boolean;
    tat?: boolean;
    style?: StyleProp<ViewStyle>;
  },
): ReactNode {
  const m = dung_mau();
  const k = kieu_nut ?? 'vien';
  const bi_tat = tat === true || dang_chay === true;

  // Nut dac dung `chinh_dam` chu khong phai `chinh`: chu trang tren #4285F4 chi dat
  // 3.56:1, khong du WCAG AA. Xem thiet_ke/token.json.
  const nen = k === 'chinh' ? m.chinh_dam : k === 'nguy' ? m.xau : k === 'phang' ? 'transparent' : m.nen_the;
  const vien = k === 'chinh' ? m.chinh_dam : k === 'nguy' ? m.xau : k === 'phang' ? 'transparent' : m.vien;
  const chu_mau = k === 'chinh' || k === 'nguy' ? m.tren_chinh : k === 'phang' ? m.chinh_dam : m.chu;

  return (
    <Pressable
      onPress={bi_tat ? undefined : khi_bam}
      disabled={bi_tat}
      accessibilityRole="button"
      accessibilityState={{ disabled: bi_tat }}
      style={({ pressed }) => [
        kieu.nut,
        { backgroundColor: nen, borderColor: vien, opacity: bi_tat ? 0.55 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {dang_chay === true && <ActivityIndicator size="small" color={chu_mau} />}
      <Text style={[kieu.nut_chu, { color: chu_mau }]}>{chu}</Text>
    </Pressable>
  );
}

// ============================================================ nhap lieu
export function Nhap(
  { nhan, gia_tri, khi_doi, goi_y, mat_khau, so, nhieu_dong, tu_dong, goi_y_duoi }: {
    nhan: string;
    gia_tri: string;
    khi_doi: (v: string) => void;
    goi_y?: string;
    mat_khau?: boolean;
    so?: boolean;
    nhieu_dong?: boolean;
    tu_dong?: 'username' | 'password' | 'new-password' | 'off';
    goi_y_duoi?: string;
  },
): ReactNode {
  const m = dung_mau();
  return (
    <View>
      <Text style={[kieu.nhan, { color: m.chu_nhat }]}>{nhan}</Text>
      <TextInput
        value={gia_tri}
        onChangeText={khi_doi}
        placeholder={goi_y}
        placeholderTextColor={m.chu_mo}
        secureTextEntry={mat_khau === true}
        keyboardType={so === true ? 'numeric' : 'default'}
        autoCapitalize={tu_dong === 'username' ? 'none' : 'sentences'}
        autoCorrect={tu_dong === 'username' || mat_khau === true ? false : undefined}
        autoComplete={tu_dong}
        multiline={nhieu_dong === true}
        style={[
          kieu.nhap,
          {
            backgroundColor: m.nen_the,
            borderColor: m.vien,
            color: m.chu,
            minHeight: nhieu_dong === true ? 80 : undefined,
            textAlignVertical: nhieu_dong === true ? 'top' : 'center',
          },
        ]}
      />
      {goi_y_duoi !== undefined && (
        <Chu co="bo" mau="mo" style={{ marginTop: 4 }}>{goi_y_duoi}</Chu>
      )}
    </View>
  );
}

// ============================================================ hop thong bao
type LoaiHop = 'loi' | 'tot' | 'luu_y' | 'tin';

export function Hop({ loai, chu }: { loai: LoaiHop; chu: string }): ReactNode {
  const m = dung_mau();
  const bo = {
    loi: { nen: m.xau_nen, vien: m.xau, chu: m.xau },
    tot: { nen: m.tot_nen, vien: m.tot, chu: m.tot },
    luu_y: { nen: m.canh_bao_nen, vien: m.canh_bao, chu: m.canh_bao },
    tin: { nen: m.lanh_nen, vien: m.lanh, chu: m.lanh },
  }[loai];
  return (
    <View style={[kieu.hop, { backgroundColor: bo.nen, borderColor: bo.vien }]}>
      <Text style={[kieu.chu_nho, { color: bo.chu }]}>{chu}</Text>
    </View>
  );
}

export function HopLoi({ loi }: { loi: unknown }): ReactNode {
  if (loi === null || loi === undefined) return null;
  return <Hop loai="loi" chu={loi instanceof Error ? loi.message : String(loi)} />;
}

// ============================================================ nhan trang thai
export function TheNhan(
  { chu, mau }: { chu: string; mau: 'tot' | 'xau' | 'canh_bao' | 'lanh' | 'mo' },
): ReactNode {
  const m = dung_mau();
  const bo = {
    tot: { nen: m.tot_nen, chu: m.tot },
    xau: { nen: m.xau_nen, chu: m.xau },
    canh_bao: { nen: m.canh_bao_nen, chu: m.canh_bao },
    lanh: { nen: m.lanh_nen, chu: m.lanh },
    mo: { nen: m.nen_mo, chu: m.chu_nhat },
  }[mau];
  return (
    <View style={[kieu.the_nhan, { backgroundColor: bo.nen }]}>
      <Text style={[kieu.the_nhan_chu, { color: bo.chu }]}>{chu}</Text>
    </View>
  );
}

const MAU_TRANG_THAI_NGAY: Record<string, 'tot' | 'xau' | 'canh_bao' | 'lanh' | 'mo'> = {
  co_mat: 'tot', vang: 'xau', nghi_phep: 'lanh', ngay_le: 'canh_bao', nghi_tuan: 'mo',
};

export function NhanNgay({ trang_thai, chu }: { trang_thai: string; chu: string }): ReactNode {
  return <TheNhan chu={chu} mau={MAU_TRANG_THAI_NGAY[trang_thai] ?? 'mo'} />;
}

const MAU_TRANG_THAI_DON: Record<string, 'tot' | 'xau' | 'canh_bao' | 'lanh' | 'mo'> = {
  cho_duyet: 'canh_bao', da_duyet: 'tot', tu_choi: 'xau', da_huy: 'mo', tu_dong: 'tot',
};

export function NhanDon({ trang_thai, chu }: { trang_thai: string; chu: string }): ReactNode {
  return <TheNhan chu={chu} mau={MAU_TRANG_THAI_DON[trang_thai] ?? 'mo'} />;
}

// ============================================================ thanh tien do
/**
 * Thanh tien do (chuyen can, quy phep). Nen dung `chinh` — day la mang mau khong co chu
 * de len nen 3:1 la du.
 */
export function ThanhTienDo(
  { phan, mau }: { phan: number; mau?: 'chinh' | 'tot' | 'canh_bao' | 'xau' | 'lanh' },
): ReactNode {
  const m = dung_mau();
  const mau_thanh = {
    chinh: m.chinh, tot: m.tot, canh_bao: m.canh_bao, xau: m.xau, lanh: m.lanh,
  }[mau ?? 'chinh'];
  // Ket mien [0..1] de mot con so la (VD nghi vuot quy phep) khong ve tran ra ngoai the.
  const rong = Math.max(0, Math.min(1, Number.isFinite(phan) ? phan : 0));
  return (
    <View style={[kieu.thanh_ngoai, { backgroundColor: m.nen_mo }]}>
      <View style={[kieu.thanh_trong, { width: `${rong * 100}%`, backgroundColor: mau_thanh }]} />
    </View>
  );
}

// ============================================================ o chi so
export function OChiSo(
  { nhan, gia_tri, phu, mau }: {
    nhan: string;
    gia_tri: string;
    phu?: string;
    mau?: 'chu' | 'tot' | 'xau' | 'canh_bao' | 'lanh';
  },
): ReactNode {
  const m = dung_mau();
  return (
    <View style={[kieu.o_chi_so, { backgroundColor: m.nen_the, borderColor: m.vien }]}>
      <Chu co="bo" mau="nhat">{nhan}</Chu>
      <Chu co="h2" mau={mau ?? 'chu'} style={kieu.so}>{gia_tri}</Chu>
      {phu !== undefined && <Chu co="bo" mau="mo">{phu}</Chu>}
    </View>
  );
}

// ============================================================ trang thai tai
export function DangTai({ chu }: { chu?: string }): ReactNode {
  const m = dung_mau();
  return (
    <View style={kieu.trong}>
      <ActivityIndicator color={m.chinh} />
      {chu !== undefined && <Chu co="nho" mau="nhat">{chu}</Chu>}
    </View>
  );
}

export function Trong({ tieu_de, mo_ta }: { tieu_de: string; mo_ta?: string }): ReactNode {
  return (
    <View style={kieu.trong}>
      <Chu co="h3" canh="giua">{tieu_de}</Chu>
      {mo_ta !== undefined && <Chu co="nho" mau="nhat" canh="giua">{mo_ta}</Chu>}
    </View>
  );
}

// ============================================================ nap du lieu
export interface KetQuaNap<T> {
  du_lieu: T | null;
  dang_tai: boolean;
  loi: unknown;
  nap_lai: () => void;
}

export function dung_nap<T>(duong_dan: string | null): KetQuaNap<T> {
  const [du_lieu, dat_du_lieu] = useState<T | null>(null);
  const [dang_tai, dat_dang_tai] = useState(duong_dan !== null);
  const [loi, dat_loi] = useState<unknown>(null);
  const [lan, dat_lan] = useState(0);

  useEffect(() => {
    if (duong_dan === null) {
      dat_dang_tai(false);
      return;
    }
    let con_dung = true;
    dat_dang_tai(true);
    dat_loi(null);
    goi<T>(duong_dan)
      .then((kq) => { if (con_dung) dat_du_lieu(kq); })
      .catch((e: unknown) => { if (con_dung) dat_loi(e); })
      .finally(() => { if (con_dung) dat_dang_tai(false); });
    return () => { con_dung = false; };
  }, [duong_dan, lan]);

  return { du_lieu, dang_tai, loi, nap_lai: () => dat_lan((n) => n + 1) };
}

// ============================================================ hanh dong ghi du lieu
export interface KetQuaHanhDong {
  chay: (ham: () => Promise<unknown>, thong_bao_tot?: string) => Promise<boolean>;
  /**
   * Nhu `chay` nhung TRA VE THAN PHAN HOI (null khi loi).
   *
   * Can khi may chu tra ve thu phai hien cho nguoi dung — vi du canh bao phap ly kem ket qua
   * tao don. Voi `chay` (tra boolean) thi than phan hoi khong den duoc tang giao dien, va cach
   * "sua" de mac nhat la ep kieu `as` roi doc mot truong khong ton tai: man hinh trang.
   */
  chay_lay: <T>(ham: () => Promise<T>, thong_bao_tot?: string) => Promise<T | null>;
  dang_chay: boolean;
  loi: unknown;
  tot: string | null;
  xoa: () => void;
}

export function dung_hanh_dong(): KetQuaHanhDong {
  const [dang_chay, dat_dang_chay] = useState(false);
  const [loi, dat_loi] = useState<unknown>(null);
  const [tot, dat_tot] = useState<string | null>(null);

  const chay = async (ham: () => Promise<unknown>, thong_bao_tot?: string): Promise<boolean> => {
    dat_dang_chay(true);
    dat_loi(null);
    dat_tot(null);
    try {
      await ham();
      if (thong_bao_tot !== undefined) dat_tot(thong_bao_tot);
      return true;
    } catch (e) {
      dat_loi(e instanceof LoiApi ? e : new Error(e instanceof Error ? e.message : String(e)));
      return false;
    } finally {
      dat_dang_chay(false);
    }
  };

  const chay_lay = async <T,>(ham: () => Promise<T>, thong_bao_tot?: string): Promise<T | null> => {
    dat_dang_chay(true);
    dat_loi(null);
    dat_tot(null);
    try {
      const kq = await ham();
      if (thong_bao_tot !== undefined) dat_tot(thong_bao_tot);
      return kq;
    } catch (e) {
      dat_loi(e instanceof LoiApi ? e : new Error(e instanceof Error ? e.message : String(e)));
      return null;
    } finally {
      dat_dang_chay(false);
    }
  };

  return {
    chay, chay_lay, dang_chay, loi, tot, xoa: () => { dat_loi(null); dat_tot(null); },
  };
}

// ============================================================ dong danh sach
export function Dong(
  { children, cuoi }: { children: ReactNode; cuoi?: boolean },
): ReactNode {
  const m = dung_mau();
  return (
    <View style={[kieu.dong_bang, { borderBottomColor: cuoi === true ? 'transparent' : m.vien }]}>
      {children}
    </View>
  );
}
