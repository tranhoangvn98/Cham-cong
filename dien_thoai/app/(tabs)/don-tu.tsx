import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { goi } from '../../nguon/api';
import { dung_mau, kieu } from '../../nguon/kieu';
import {
  Chu, DangTai, Dong, Hop, HopLoi, KyHieu, NhanDon, Nhap, Nut, Trong,
  dung_hanh_dong, dung_nap,
} from '../../nguon/thanh_phan';
import {
  TEN_LOAI_NGHI, TEN_TRANG_THAI_DON, hom_nay, ngay_viet,
} from '../../nguon/tien_ich';

type Tab = 'nghi_phep' | 'giai_trinh';

interface DonNghiPhep {
  id: string;
  loai: string;
  tu_ngay: string;
  den_ngay: string;
  nua_ngay: boolean;
  ly_do: string | null;
  trang_thai: string;
  ghi_chu_duyet: string | null;
}

interface DonGiaiTrinh {
  id: string;
  ngay: string;
  gio_vao_de_xuat: string | null;
  gio_ra_de_xuat: string | null;
  ly_do: string;
  trang_thai: string;
  ghi_chu_duyet: string | null;
}

export default function ManDonTu(): ReactNode {
  const m = dung_mau();
  const [tab, dat_tab] = useState<Tab>('nghi_phep');
  const [mo_form, dat_mo_form] = useState(false);

  const nghi = dung_nap<DonNghiPhep[]>('/api/toi/nghi-phep');
  const giai = dung_nap<DonGiaiTrinh[]>('/api/toi/giai-trinh');
  const hd = dung_hanh_dong();

  const huy_don = async (id: string): Promise<void> => {
    await hd.chay(
      () => goi(`/api/toi/nghi-phep/${id}/huy`, { method: 'POST', body: {} }),
      'Đã hủy đơn.',
    );
    nghi.nap_lai();
  };

  const kq = tab === 'nghi_phep' ? nghi : giai;

  return (
    <View style={[kieu.man, { backgroundColor: m.nen }]}>
      {/* ------------------------------------------------ tab */}
      <View style={[kieu.hang, { padding: 12, gap: 8 }]}>
        {(['nghi_phep', 'giai_trinh'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => dat_tab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            accessibilityLabel={t === 'nghi_phep' ? 'Đơn nghỉ phép' : 'Đơn giải trình quên quẹt'}
            style={[
              kieu.nut,
              kieu.nut_nho,
              kieu.nhieu,
              {
                backgroundColor: tab === t ? m.chinh_nhat : m.nen_the,
                borderColor: tab === t ? m.chinh : m.vien,
              },
            ]}
          >
            <Chu co="nho" dam mau={tab === t ? 'chinh' : 'nhat'}>
              {t === 'nghi_phep' ? 'Nghỉ phép' : 'Quên quẹt'}
            </Chu>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[kieu.cuon, { paddingTop: 0 }]}>
        <HopLoi loi={hd.loi} />
        {hd.tot !== null && <Hop loai="tot" chu={hd.tot} />}
        <HopLoi loi={kq.loi} />

        <Nut
          chu={tab === 'nghi_phep' ? '+ Xin nghỉ phép' : '+ Gửi giải trình quên quẹt'}
          kieu_nut="chinh"
          khi_bam={() => dat_mo_form(true)}
        />

        {kq.dang_tai && kq.du_lieu === null ? (
          <DangTai />
        ) : (
          <View style={[kieu.the_mong, { backgroundColor: m.nen_the, borderColor: m.vien }]}>
            {tab === 'nghi_phep' ? (
              (nghi.du_lieu ?? []).length === 0 ? (
                <Trong tieu_de="Chưa có đơn nghỉ phép nào" />
              ) : (
                (nghi.du_lieu ?? []).map((d, i) => (
                  <Dong key={d.id} cuoi={i === (nghi.du_lieu ?? []).length - 1}>
                    <View style={kieu.nhieu}>
                      <Chu co="nho" dam>
                        {TEN_LOAI_NGHI[d.loai] ?? d.loai}
                        {d.nua_ngay ? ' (½ ngày)' : ''}
                      </Chu>
                      <Chu co="bo" mau="nhat">
                        {d.tu_ngay === d.den_ngay
                          ? ngay_viet(d.tu_ngay)
                          : `${ngay_viet(d.tu_ngay)} – ${ngay_viet(d.den_ngay)}`}
                      </Chu>
                      {d.ly_do !== null && <Chu co="bo" mau="mo">{d.ly_do}</Chu>}
                      {d.ghi_chu_duyet !== null && (
                        <Chu co="bo" mau={d.trang_thai === 'tu_choi' ? 'xau' : 'nhat'}>
                          Nhân sự: {d.ghi_chu_duyet}
                        </Chu>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <NhanDon
                        trang_thai={d.trang_thai}
                        chu={TEN_TRANG_THAI_DON[d.trang_thai] ?? d.trang_thai}
                      />
                      {(d.trang_thai === 'cho_duyet' || d.trang_thai === 'da_duyet') && (
                        <Nut
                          chu="Hủy"
                          kieu_nut="phang"
                          khi_bam={() => void huy_don(d.id)}
                          dang_chay={hd.dang_chay}
                          style={kieu.nut_nho}
                        />
                      )}
                    </View>
                  </Dong>
                ))
              )
            ) : (giai.du_lieu ?? []).length === 0 ? (
              <Trong
                tieu_de="Chưa có đơn giải trình nào"
                mo_ta="Dùng khi bạn quên quẹt thẻ và bảng công bị thiếu giờ."
              />
            ) : (
              (giai.du_lieu ?? []).map((d, i) => (
                <Dong key={d.id} cuoi={i === (giai.du_lieu ?? []).length - 1}>
                  <View style={kieu.nhieu}>
                    <Chu co="nho" dam>{ngay_viet(d.ngay)}</Chu>
                    <Chu co="bo" mau="nhat" style={kieu.so}>
                      Đề xuất: {d.gio_vao_de_xuat === null ? '—' : d.gio_vao_de_xuat.slice(0, 5)}
                      {' – '}
                      {d.gio_ra_de_xuat === null ? '—' : d.gio_ra_de_xuat.slice(0, 5)}
                    </Chu>
                    <Chu co="bo" mau="mo">{d.ly_do}</Chu>
                    {d.ghi_chu_duyet !== null && (
                      <Chu co="bo" mau={d.trang_thai === 'tu_choi' ? 'xau' : 'nhat'}>
                        Nhân sự: {d.ghi_chu_duyet}
                      </Chu>
                    )}
                  </View>
                  <NhanDon
                    trang_thai={d.trang_thai}
                    chu={TEN_TRANG_THAI_DON[d.trang_thai] ?? d.trang_thai}
                  />
                </Dong>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {mo_form && (
        tab === 'nghi_phep' ? (
          <FormNghiPhep
            khi_dong={() => dat_mo_form(false)}
            khi_xong={() => { dat_mo_form(false); nghi.nap_lai(); }}
          />
        ) : (
          <FormGiaiTrinh
            khi_dong={() => dat_mo_form(false)}
            khi_xong={() => { dat_mo_form(false); giai.nap_lai(); }}
          />
        )
      )}
    </View>
  );
}

// ============================================================ form nghi phep
const LOAI_NGHI = ['phep_nam', 'khong_luong', 'om', 'ket_hon', 'hieu', 'thai_san'] as const;

function FormNghiPhep(
  { khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const m = dung_mau();
  const [loai, dat_loai] = useState<string>('phep_nam');
  const [tu_ngay, dat_tu_ngay] = useState(hom_nay());
  const [den_ngay, dat_den_ngay] = useState(hom_nay());
  const [nua_ngay, dat_nua_ngay] = useState(false);
  const [ly_do, dat_ly_do] = useState('');
  const hd = dung_hanh_dong();

  const gui = async (): Promise<void> => {
    const ok = await hd.chay(() => goi('/api/toi/nghi-phep', {
      method: 'POST',
      body: {
        loai,
        tu_ngay,
        den_ngay: nua_ngay ? tu_ngay : den_ngay,
        nua_ngay,
        ly_do: ly_do.trim() === '' ? null : ly_do.trim(),
      },
    }));
    if (ok) khi_xong();
  };

  return (
    <Modal visible animationType="slide" onRequestClose={khi_dong}>
      <SafeAreaView style={[kieu.man, { backgroundColor: m.nen }]}>
        <ScrollView contentContainerStyle={kieu.cuon}>
          <Chu co="h1">Xin nghỉ phép</Chu>
          <HopLoi loi={hd.loi} />

          <View>
            <Chu co="nho" dam mau="nhat" style={{ marginBottom: 6 }}>Loại nghỉ</Chu>
            <View style={[kieu.hang, { flexWrap: 'wrap', gap: 8 }]}>
              {LOAI_NGHI.map((l) => (
                <Pressable
                  key={l}
                  onPress={() => dat_loai(l)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: loai === l }}
                  accessibilityLabel={TEN_LOAI_NGHI[l]}
                  style={[
                    kieu.nut, kieu.nut_nho,
                    {
                      backgroundColor: loai === l ? m.chinh_dam : m.nen_the,
                      borderColor: loai === l ? m.chinh_dam : m.vien,
                    },
                  ]}
                >
                  <Chu co="nho" dam style={{ color: loai === l ? m.tren_chinh : m.chu }}>
                    {TEN_LOAI_NGHI[l]}
                  </Chu>
                </Pressable>
              ))}
            </View>
          </View>

          <Nhap
            nhan="Từ ngày"
            gia_tri={tu_ngay}
            khi_doi={dat_tu_ngay}
            goi_y="2026-08-10"
            tu_dong="off"
            goi_y_duoi="Định dạng năm-tháng-ngày, ví dụ 2026-08-10"
          />

          <Pressable
            onPress={() => dat_nua_ngay(!nua_ngay)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: nua_ngay }}
            accessibilityLabel="Chỉ nghỉ nửa ngày"
            style={[kieu.hang, { paddingVertical: 6 }]}
          >
            <View
              style={{
                width: 22, height: 22, borderRadius: 5, borderWidth: 2,
                borderColor: nua_ngay ? m.chinh_dam : m.vien,
                backgroundColor: nua_ngay ? m.chinh_dam : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {/* ✓ khong co trong Be Vietnam Pro -> ve bang font he thong, xem KyHieu. */}
              {nua_ngay && <KyHieu co={13} mau="tren_chinh">✓</KyHieu>}
            </View>
            <Chu co="nho">Chỉ nghỉ nửa ngày</Chu>
          </Pressable>

          {!nua_ngay && (
            <Nhap
              nhan="Đến ngày"
              gia_tri={den_ngay}
              khi_doi={dat_den_ngay}
              goi_y="2026-08-10"
              tu_dong="off"
            />
          )}

          <Nhap nhan="Lý do" gia_tri={ly_do} khi_doi={dat_ly_do} nhieu_dong goi_y="Việc gia đình…" />

          <Nut chu="Gửi đơn" kieu_nut="chinh" khi_bam={() => void gui()} dang_chay={hd.dang_chay} />
          <Nut chu="Hủy" kieu_nut="phang" khi_bam={khi_dong} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ============================================================ form giai trinh
function FormGiaiTrinh(
  { khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const m = dung_mau();
  const [ngay, dat_ngay] = useState(hom_nay());
  const [gio_vao, dat_gio_vao] = useState('');
  const [gio_ra, dat_gio_ra] = useState('');
  const [ly_do, dat_ly_do] = useState('');
  const hd = dung_hanh_dong();

  const gui = async (): Promise<void> => {
    const ok = await hd.chay(() => goi('/api/toi/giai-trinh', {
      method: 'POST',
      body: {
        ngay,
        gio_vao_de_xuat: gio_vao.trim() === '' ? null : gio_vao.trim(),
        gio_ra_de_xuat: gio_ra.trim() === '' ? null : gio_ra.trim(),
        ly_do: ly_do.trim(),
      },
    }));
    if (ok) khi_xong();
  };

  return (
    <Modal visible animationType="slide" onRequestClose={khi_dong}>
      <SafeAreaView style={[kieu.man, { backgroundColor: m.nen }]}>
        <ScrollView contentContainerStyle={kieu.cuon}>
          <Chu co="h1">Giải trình quên quẹt</Chu>
          <Hop
            loai="tin"
            chu={'Chỉ điền mốc giờ bạn bị thiếu. Ví dụ quên quẹt lúc ra thì chỉ điền Giờ ra. '
              + 'Nhân sự duyệt xong bảng công sẽ tự tính lại.'}
          />
          <HopLoi loi={hd.loi} />

          <Nhap
            nhan="Ngày bị thiếu"
            gia_tri={ngay}
            khi_doi={dat_ngay}
            goi_y="2026-08-05"
            tu_dong="off"
            goi_y_duoi="Định dạng năm-tháng-ngày"
          />
          <Nhap
            nhan="Giờ vào đề xuất (bỏ trống nếu không thiếu)"
            gia_tri={gio_vao}
            khi_doi={dat_gio_vao}
            goi_y="08:00"
            tu_dong="off"
          />
          <Nhap
            nhan="Giờ ra đề xuất (bỏ trống nếu không thiếu)"
            gia_tri={gio_ra}
            khi_doi={dat_gio_ra}
            goi_y="17:00"
            tu_dong="off"
          />
          <Nhap
            nhan="Lý do"
            gia_tri={ly_do}
            khi_doi={dat_ly_do}
            nhieu_dong
            goi_y="Máy không nhận khuôn mặt, đi họp ngoài…"
          />

          <Nut
            chu="Gửi giải trình"
            kieu_nut="chinh"
            khi_bam={() => void gui()}
            dang_chay={hd.dang_chay}
            tat={ly_do.trim().length < 5 || (gio_vao.trim() === '' && gio_ra.trim() === '')}
          />
          <Nut chu="Hủy" kieu_nut="phang" khi_bam={khi_dong} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
