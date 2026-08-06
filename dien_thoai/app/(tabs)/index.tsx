import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { dung_mau, kieu } from '../../nguon/kieu';
import { NutChamCong } from '../../nguon/cham_cong';
import {
  Chu, DangTai, Dong, Hop, HopLoi, NhanNgay, The, TheNhan, Trong, dung_nap,
} from '../../nguon/thanh_phan';
import {
  TEN_NGUON, TEN_TRANG_THAI_DON, TEN_TRANG_THAI_NGAY,
  gio_ngan, ngay_viet, phut_thanh_chu, thu_cua_ngay,
} from '../../nguon/tien_ich';

interface LanQuet {
  id: string;
  thoi_diem: string;
  trang_thai: number;
  nguon: string;
  trang_thai_duyet: string;
  nhan_trang_thai: string;
  nhan_xac_thuc: string;
}

interface HomNay {
  ngay: string;
  nhan_vien: {
    ho_ten: string;
    ma_nv: string;
    duoc_cham_cong_dien_thoai: boolean;
    ca_lam: string | null;
    ca_gio_vao: string | null;
    ca_gio_ra: string | null;
  } | null;
  bang_cong: {
    trang_thai: string;
    gio_vao: string | null;
    gio_ra: string | null;
    phut_lam: number;
    phut_muon: number;
    phut_ve_som: number;
    phut_ot: number;
    so_cong: number;
    ghi_chu: string | null;
  } | null;
  lan_quet: LanQuet[];
}

export default function ManHomNay(): ReactNode {
  const m = dung_mau();
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<HomNay>('/api/toi/hom-nay');
  const [dang_keo, dat_dang_keo] = useState(false);

  const keo_de_tai = (): void => {
    dat_dang_keo(true);
    nap_lai();
    // nap_lai la dong bo; tra ve trang thai keo sau mot nhip de nguoi dung thay phan hoi.
    setTimeout(() => dat_dang_keo(false), 600);
  };

  const bc = du_lieu?.bang_cong ?? null;
  const nv = du_lieu?.nhan_vien ?? null;
  const cho_phep_mobile = nv?.duoc_cham_cong_dien_thoai === true;

  return (
    <ScrollView
      style={[kieu.man, { backgroundColor: m.nen }]}
      contentContainerStyle={kieu.cuon}
      refreshControl={
        <RefreshControl refreshing={dang_keo} onRefresh={keo_de_tai} tintColor={m.chinh} />
      }
    >
      <HopLoi loi={loi} />

      {dang_tai && du_lieu === null ? (
        <DangTai chu="Đang tải dữ liệu hôm nay…" />
      ) : du_lieu === null ? null : (
        <>
          {/* ------------------------------------------------ loi chao */}
          <View>
            <Chu co="h1">{nv?.ho_ten ?? 'Xin chào'}</Chu>
            <Chu co="nho" mau="nhat">
              {thu_cua_ngay(du_lieu.ngay)}, {ngay_viet(du_lieu.ngay)}
              {nv?.ca_lam === null || nv?.ca_lam === undefined
                ? ''
                : ` · ${nv.ca_lam} ${nv.ca_gio_vao?.slice(0, 5)}–${nv.ca_gio_ra?.slice(0, 5)}`}
            </Chu>
          </View>

          {/* ------------------------------------------------ gio vao / ra */}
          <The>
            <View style={kieu.hang_deu}>
              <View style={kieu.nhieu}>
                <Chu co="bo" mau="nhat">GIỜ VÀO</Chu>
                <Chu style={kieu.so_lon} mau={bc?.gio_vao === null ? 'mo' : 'chu'}>
                  {gio_ngan(bc?.gio_vao)}
                </Chu>
              </View>
              <View style={kieu.nhieu}>
                <Chu co="bo" mau="nhat">GIỜ RA</Chu>
                <Chu style={kieu.so_lon} mau={bc?.gio_ra === null ? 'mo' : 'chu'}>
                  {bc !== null && bc.gio_vao === bc.gio_ra ? '--:--' : gio_ngan(bc?.gio_ra)}
                </Chu>
              </View>
            </View>

            {bc !== null && (
              <View style={[kieu.hang, { flexWrap: 'wrap' }]}>
                <NhanNgay
                  trang_thai={bc.trang_thai}
                  chu={TEN_TRANG_THAI_NGAY[bc.trang_thai] ?? bc.trang_thai}
                />
                {Number(bc.phut_muon) > 0 && (
                  <TheNhan chu={`Muộn ${phut_thanh_chu(Number(bc.phut_muon))}`} mau="canh_bao" />
                )}
                {Number(bc.phut_ve_som) > 0 && (
                  <TheNhan chu={`Về sớm ${phut_thanh_chu(Number(bc.phut_ve_som))}`} mau="canh_bao" />
                )}
                {Number(bc.phut_ot) > 0 && (
                  <TheNhan chu={`OT ${phut_thanh_chu(Number(bc.phut_ot))}`} mau="lanh" />
                )}
                {Number(bc.phut_lam) > 0 && (
                  <TheNhan chu={`Làm ${phut_thanh_chu(Number(bc.phut_lam))}`} mau="mo" />
                )}
              </View>
            )}

            {bc?.ghi_chu !== null && bc?.ghi_chu !== undefined && (
              <Chu co="bo" mau="mo">{bc.ghi_chu}</Chu>
            )}
          </The>

          {/* ------------------------------------------------ nut cham cong */}
          {cho_phep_mobile ? (
            <View style={kieu.hang}>
              <NutChamCong trang_thai={0} khi_xong={nap_lai} />
              <NutChamCong trang_thai={1} khi_xong={nap_lai} />
            </View>
          ) : (
            <Hop
              loai="tin"
              chu={'Bạn chấm công tại máy chấm công của công ty. Ứng dụng này để xem bảng công, '
                + 'xin nghỉ phép và giải trình khi quên quẹt.'}
            />
          )}

          {/* ------------------------------------------------ cac lan quet hom nay */}
          <View style={[kieu.the_mong, { backgroundColor: m.nen_the, borderColor: m.vien }]}>
            <View style={{ padding: 14, paddingBottom: 8 }}>
              <Chu co="h3">Các lần quẹt hôm nay</Chu>
            </View>
            {du_lieu.lan_quet.length === 0 ? (
              <Trong
                tieu_de="Chưa có lần quẹt nào"
                mo_ta="Dữ liệu xuất hiện ngay sau khi bạn quẹt tại máy."
              />
            ) : (
              du_lieu.lan_quet.map((q, i) => (
                <Dong key={q.id} cuoi={i === du_lieu.lan_quet.length - 1}>
                  <Chu style={[kieu.so, { width: 54, fontWeight: '700' }]}>
                    {gio_ngan(q.thoi_diem)}
                  </Chu>
                  <View style={kieu.nhieu}>
                    <Chu co="nho">{q.nhan_trang_thai}</Chu>
                    <Chu co="bo" mau="mo">
                      {TEN_NGUON[q.nguon] ?? q.nguon} · {q.nhan_xac_thuc}
                    </Chu>
                  </View>
                  {q.trang_thai_duyet !== 'tu_dong' && (
                    <TheNhan
                      chu={TEN_TRANG_THAI_DON[q.trang_thai_duyet] ?? q.trang_thai_duyet}
                      mau={q.trang_thai_duyet === 'cho_duyet' ? 'canh_bao'
                        : q.trang_thai_duyet === 'tu_choi' ? 'xau' : 'tot'}
                    />
                  )}
                </Dong>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}
