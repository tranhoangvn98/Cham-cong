// Man "Cong viec" tren dien thoai — viec cua chinh minh.
//
// Giao dien ca nhan (nhan vien la nguoi nhan viec): danh sach nhom Qua han / Den han /
// Dang lam / Moi / Cho duyet, mo chi tiet de tick cac buoc con va nop ket qua. Co che do
// Lich (gantt gọn 14 ngay, cuon ngang) giong web.
import { useState, type ReactNode } from 'react';
import {
  Modal, Pressable, RefreshControl, ScrollView, TextInput, View,
} from 'react-native';
import { goi } from '../../nguon/api';
import { dung_mau, kieu } from '../../nguon/kieu';
import {
  Chu, DangTai, HopLoi, KyHieu, Nut, Trong, dung_hanh_dong, dung_nap,
} from '../../nguon/thanh_phan';
import { ngay_viet } from '../../nguon/tien_ich';

interface DongViec {
  id: string;
  nhan_vien_id: string;
  ho_ten: string | null;
  ma_nv: string | null;
  ten_phong_ban: string | null;
  tieu_de: string;
  mo_ta: string | null;
  giao_boi: string | null;
  ten_nguoi_giao: string | null;
  han: string | null;
  han_gio: string;
  han_moc: string | null;
  bat_dau: string | null;
  uu_tien: string;
  nguon: string;
  trang_thai: string;
  ket_qua: string | null;
  phan_hoi: string | null;
  ly_do_huy: string | null;
  nop_luc: string | null;
  hoan_thanh_luc: string | null;
  nhom_id: string | null;
  ten_nhom: string | null;
  mau_dinh_ky_id: string | null;
  tao_luc: string;
  so_hanh_dong: number;
  so_hanh_dong_xong: number;
}

interface HanhDong {
  id: string;
  ten: string;
  xong: boolean;
  xong_luc: string | null;
  thu_tu: number;
}

const NHAN_TT: Record<string, string> = {
  moi: 'Mới', dang_lam: 'Đang làm', cho_duyet: 'Chờ duyệt',
  hoan_thanh: 'Hoàn thành', khong_hoan_thanh: 'Không hoàn thành', huy: 'Đã hủy',
};

const NHAN_NGUON: Record<string, string> = {
  giam_doc: 'Giám đốc giao', he_thong: 'Hệ thống', truong_phong: 'Trưởng phòng giao',
  lien_phong: 'Liên phòng ban', tu_tao: 'Tự tạo', ho_so: 'Hồ sơ',
};

/** 'YYYY-MM-DD' cong them so ngay. */
function cong_ngay(ngay: string, so_ngay: number): string {
  const d = new Date(`${ngay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + so_ngay);
  return d.toISOString().slice(0, 10);
}

function danh_sach_ngay(tu: string, den: string): string[] {
  const kq: string[] = [];
  let d = new Date(`${tu}T00:00:00Z`);
  const cuoi = new Date(`${den}T00:00:00Z`);
  let dem = 0;
  while (d.getTime() <= cuoi.getTime() && dem < 400) {
    kq.push(d.toISOString().slice(0, 10));
    d = new Date(d.getTime() + 86_400_000);
    dem++;
  }
  return kq;
}

export default function ManViec(): ReactNode {
  const m = dung_mau();
  const [xem, dat_xem] = useState<'danh_sach' | 'lich'>('danh_sach');
  const [mo, dat_mo] = useState<string | null>(null);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<{ danh_sach: DongViec[]; tong: number }>(
    '/api/viec/toi');

  const ds = du_lieu?.danh_sach ?? [];
  const hom_nay_str = new Date().toISOString().slice(0, 10);
  const ngay_gan = cong_ngay(hom_nay_str, 2);
  const bay_gio = new Date().toISOString();

  const qua_han = ds.filter((v) => v.han_moc !== null && v.han_moc < bay_gio
    && (v.trang_thai === 'moi' || v.trang_thai === 'dang_lam'));
  const den_han = ds.filter((v) => !qua_han.includes(v) && v.han !== null && v.han <= ngay_gan
    && (v.trang_thai === 'moi' || v.trang_thai === 'dang_lam'));
  const dang_lam = ds.filter((v) => v.trang_thai === 'dang_lam'
    && !qua_han.includes(v) && !den_han.includes(v));
  const cho_duyet = ds.filter((v) => v.trang_thai === 'cho_duyet');
  const moi = ds.filter((v) => v.trang_thai === 'moi'
    && !qua_han.includes(v) && !den_han.includes(v));
  const da_xong = ds.filter((v) => v.trang_thai === 'hoan_thanh'
    || v.trang_thai === 'khong_hoan_thanh' || v.trang_thai === 'huy');
  const con_viec = qua_han.length + den_han.length + dang_lam.length + cho_duyet.length + moi.length;

  const cac_khoi: { ma: string; ten: string; viec: DongViec[]; mau_vien: string }[] = [
    { ma: 'qua_han', ten: 'Quá hạn', viec: qua_han, mau_vien: m.xau },
    { ma: 'den_han', ten: 'Đến hạn', viec: den_han, mau_vien: m.canh_bao },
    { ma: 'dang_lam', ten: 'Đang làm', viec: dang_lam, mau_vien: m.vien },
    { ma: 'moi', ten: 'Mới giao', viec: moi, mau_vien: m.vien },
    { ma: 'cho_duyet', ten: 'Chờ duyệt', viec: cho_duyet, mau_vien: m.vien },
    { ma: 'da_xong', ten: 'Đã xong', viec: da_xong, mau_vien: m.vien },
  ];

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={dang_tai} onRefresh={nap_lai} />}
      contentContainerStyle={{ padding: 14, gap: 12 }}
    >
      <Chu co="h3">{con_viec === 0 ? 'Không còn việc đang chờ' : `Còn ${con_viec} việc chưa xong`}</Chu>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Nut chu="Danh sách" kieu_nut={xem === 'danh_sach' ? 'chinh' : 'vien'}
          khi_bam={() => dat_xem('danh_sach')} />
        <Nut chu="Lịch (gantt)" kieu_nut={xem === 'lich' ? 'chinh' : 'vien'}
          khi_bam={() => dat_xem('lich')} />
      </View>

      {loi !== null && <HopLoi loi={loi} />}
      {dang_tai && ds.length === 0 && <DangTai />}

      {xem === 'lich' ? <ManGanttNho ds={ds} mo={dat_mo} /> : ds.length === 0 && loi === null
        && !dang_tai ? (
        <Trong tieu_de="Chưa có công việc nào"
          mo_ta="Khi được giao việc, bạn sẽ thấy ở đây kèm hạn và các bước cần làm." />
      ) : (
        cac_khoi.map((k) => k.viec.length === 0 ? null : (
          <View key={k.ma} style={{ gap: 6 }}>
            <Chu dam>{`${k.ten} (${k.viec.length})`}</Chu>
            {k.viec.map((v) => (
              <Pressable key={v.id} onPress={() => dat_mo(v.id)}
                style={[kieu.the, { borderLeftWidth: 4, borderLeftColor: k.mau_vien }]}>
                <Chu dam>{v.tieu_de}</Chu>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Chu co="nho">{NHAN_TT[v.trang_thai] ?? v.trang_thai}</Chu>
                  <Chu co="nho">{NHAN_NGUON[v.nguon] ?? v.nguon}</Chu>
                  {v.han !== null && (
                    <Chu co="nho">{`hạn ${ngay_viet(v.han)} ${v.han_gio}`}</Chu>
                  )}
                  {v.so_hanh_dong > 0 && (
                    <Chu co="nho">{`${v.so_hanh_dong_xong}/${v.so_hanh_dong} bước`}</Chu>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        ))
      )}

      {mo !== null && <HopChiTiet id={mo} khi_dong={() => { dat_mo(null); nap_lai(); }} />}
    </ScrollView>
  );
}

// ---------------------------------------------------------------- gantt gọn
function ManGanttNho({ ds, mo }: { ds: DongViec[]; mo: (id: string) => void }): ReactNode {
  const m = dung_mau();
  const hom_nay_str = new Date().toISOString().slice(0, 10);
  const tu = cong_ngay(hom_nay_str, -13);
  const ngay = danh_sach_ngay(tu, hom_nay_str);
  const O_RONG = 24;
  const viec_hien = ds.filter((v) => {
    const bat = (v.bat_dau ?? v.tao_luc ?? '').slice(0, 10);
    const han = (v.han ?? v.tao_luc ?? '').slice(0, 10);
    return han >= tu && bat <= hom_nay_str;
  });

  if (viec_hien.length === 0) {
    return <Trong tieu_de="Không có việc trong 14 ngày này" />;
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 150 }} />
          {ngay.map((n) => (
            <View key={n} style={{
              width: O_RONG, alignItems: 'center',
              backgroundColor: n === hom_nay_str ? m.chinh_nhat : 'transparent',
            }}>
              <Chu co="nho" dam={n === hom_nay_str}>{n.slice(8)}</Chu>
            </View>
          ))}
        </View>
        {viec_hien.map((v) => {
          const bat = (v.bat_dau ?? v.tao_luc ?? '').slice(0, 10);
          const han = (v.han ?? v.tao_luc ?? '').slice(0, 10);
          let i0 = ngay.indexOf(bat);
          let i1 = ngay.indexOf(han);
          if (i0 < 0) i0 = 0;
          if (i1 < 0) i1 = ngay.length - 1;
          if (i1 < i0) i1 = i0;
          return (
            <Pressable key={v.id} onPress={() => mo(v.id)}
              style={{ flexDirection: 'row', marginTop: 4 }}>
              <View style={{ width: 150, paddingRight: 6 }}>
                <Chu co="nho">{v.tieu_de}</Chu>
              </View>
              <View style={{ width: O_RONG * ngay.length, height: 26 }}>
                <View style={{
                  position: 'absolute', left: i0 * O_RONG,
                  width: Math.max((i1 - i0 + 1) * O_RONG - 2, 10), top: 2, height: 22,
                  borderRadius: 6, backgroundColor: m.chinh,
                }} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------- chi tiet
function HopChiTiet({ id, khi_dong }: { id: string; khi_dong: () => void }): ReactNode {
  const m = dung_mau();
  const hd = dung_hanh_dong();
  const [ket_qua, dat_ket_qua] = useState('');
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<{ viec: DongViec; hanh_dong: HanhDong[] }>(
    id === null ? null : `/api/viec/${id}`);

  const v = du_lieu?.viec ?? null;
  const hanh_dong = du_lieu?.hanh_dong ?? [];
  const la_nhan = v !== null;

  const doi_hd = async (hid: string, xong: boolean): Promise<void> => {
    await goi(`/api/viec/${id}/hanh-dong/${hid}`, { method: 'PATCH', body: { xong } });
    nap_lai();
  };

  return (
    <Modal visible animationType="slide" onRequestClose={khi_dong}>
      <View style={{ flex: 1, backgroundColor: m.nen }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingHorizontal: 14, paddingVertical: 12, backgroundColor: m.nen_the,
          borderBottomWidth: 1, borderBottomColor: m.vien,
        }}>
          <Pressable onPress={khi_dong} accessibilityLabel="Đóng">
            <KyHieu co={22} mau="chinh">✕</KyHieu>
          </Pressable>
          <Chu co="h2" style={{ flex: 1 }}>Chi tiết công việc</Chu>
        </View>
        <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
          {dang_tai || v === null ? (
            loi !== null ? <HopLoi loi={loi} /> : <DangTai />
          ) : (
            <>
              <Chu co="h3" dam>{v.tieu_de}</Chu>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Chu co="nho" mau="mo">{NHAN_TT[v.trang_thai] ?? v.trang_thai}</Chu>
                <Chu co="nho" mau="mo">{NHAN_NGUON[v.nguon] ?? v.nguon}</Chu>
              </View>
              {v.mo_ta !== null && <Chu>{v.mo_ta}</Chu>}
              <Chu co="nho">{`Người giao: ${v.ten_nguoi_giao ?? '—'}`}</Chu>
              <Chu co="nho">{v.han === null
                ? 'Không có hạn'
                : `Hạn: ${ngay_viet(v.han)} lúc ${v.han_gio}`}</Chu>
              {v.ket_qua !== null && <Chu>{`Kết quả đã nộp: ${v.ket_qua}`}</Chu>}
              {v.phan_hoi !== null && <Chu>{`Phản hồi: ${v.phan_hoi}`}</Chu>}
              {v.ly_do_huy !== null && <Chu>{`Lý do hủy: ${v.ly_do_huy}`}</Chu>}

              {hanh_dong.length > 0 && (
                <View style={{ gap: 6 }}>
                  <Chu dam>{`Các bước (${hanh_dong.filter((h) => h.xong).length}/${hanh_dong.length})`}</Chu>
                  {hanh_dong.map((h) => (
                    <Pressable key={h.id} onPress={() =>
                      void hd.chay(() => doi_hd(h.id, !h.xong), 'Đã cập nhật')}>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <KyHieu co={18} mau={h.xong ? 'tot' : 'nhat'}>{h.xong ? '✓' : '○'}</KyHieu>
                        <Chu style={h.xong ? { textDecorationLine: 'line-through' } : undefined}>
                          {h.ten}
                        </Chu>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {la_nhan && v.trang_thai === 'moi' && (
                <Nut chu="Bắt đầu làm" khi_bam={() => void hd.chay(
                  () => goi(`/api/viec/${v.id}/trang-thai`,
                    { method: 'PATCH', body: { trang_thai: 'dang_lam' } }),
                  'Đã bắt đầu').then(() => nap_lai())} />
              )}

              {la_nhan && (v.trang_thai === 'moi' || v.trang_thai === 'dang_lam') && (
                <View style={{ gap: 8 }}>
                  <View style={{
                    borderWidth: 1, borderColor: m.vien, borderRadius: 10,
                    paddingHorizontal: 12, paddingVertical: 10,
                  }}>
                    <Chu co="nho" mau="mo">Kết quả thực hiện</Chu>
                    <TextInput
                      multiline value={ket_qua} onChangeText={dat_ket_qua}
                      placeholder="Nêu rõ việc đã làm để người giao xác nhận"
                      placeholderTextColor={m.chu_nhat}
                      style={{ color: m.chu, minHeight: 70, textAlignVertical: 'top' }}
                    />
                  </View>
                  <Nut chu="Nộp kết quả" kieu_nut="chinh" khi_bam={() => void hd.chay(
                    () => goi(`/api/viec/${v.id}/nop`,
                      { method: 'PATCH', body: { ket_qua } }),
                    'Đã nộp kết quả').then(() => { dat_ket_qua(''); nap_lai(); })} />
                </View>
              )}
              {hd.loi !== null && <HopLoi loi={hd.loi} />}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
