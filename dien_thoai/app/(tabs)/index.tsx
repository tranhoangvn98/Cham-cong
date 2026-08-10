import { useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { dung_mau, kieu } from '../../nguon/kieu';
import { NutChamCong } from '../../nguon/cham_cong';
import {
  Chu, DangTai, Dong, Hop, HopLoi, NhanNgay, OChiSo, The, TheNhan, ThanhTienDo, Trong,
  dung_nap,
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

interface NgayTuan {
  ngay: string;
  trang_thai: string;
  phut_muon: number;
  phut_lam: number;
  so_cong: string;
}

interface TongHopThang {
  tong_cong: string;
  tong_phut_lam: number;
  tong_phut_ot: number;
  tong_phut_muon: number;
  so_lan_di_muon: number;
  so_ngay_vang: number;
  so_ngay_co_mat: number;
  so_ngay_phai_lam: number;
}

interface HomNay {
  ngay: string;
  dau_tuan: string;
  thang: string;
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
  tuan: NgayTuan[];
  thang_tong_hop: TongHopThang | null;
  phep: { quy: number; da_dung: number; con_lai: number; cho_duyet: number } | null;
  can_chu_y: {
    don_cua_toi_cho_duyet: number;
    don_cho_toi_duyet: number;
    hop_dong_sap_het_han: null;
  } | null;
  lan_quet: LanQuet[];
}

const CHU_THU = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Cong so ngay vao mot ngay dang YYYY-MM-DD, khong qua Date de tranh lech mui gio. */
function cong_ngay(ngay: string, so: number): string {
  const [n, t, d] = ngay.split('-').map(Number);
  const moc = new Date(Date.UTC(n ?? 1970, (t ?? 1) - 1, (d ?? 1) + so));
  return moc.toISOString().slice(0, 10);
}

export default function ManTrangChu(): ReactNode {
  const m = dung_mau();
  const router = useRouter();
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
  const th = du_lieu?.thang_tong_hop ?? null;
  const phep = du_lieu?.phep ?? null;
  const ccy = du_lieu?.can_chu_y ?? null;
  const cho_phep_mobile = nv?.duoc_cham_cong_dien_thoai === true;

  // Chuyen can: so ngay du cong / so ngay phai lam trong thang (VD 18/22). Ngay nghi
  // tuan va ngay le khong nam trong mau so.
  const ngay_du_cong = th === null ? 0 : Number(th.so_ngay_co_mat) - Number(th.so_lan_di_muon);
  const ngay_phai_lam = th === null ? 0 : Number(th.so_ngay_phai_lam);

  const theo_ngay = new Map((du_lieu?.tuan ?? []).map((n) => [n.ngay, n]));

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

          {/* ------------------------------------------------ the hom nay */}
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
                  <TheNhan chu={`OT ghi nhận ${phut_thanh_chu(Number(bc.phut_ot))}`} mau="lanh" />
                )}
                {Number(bc.phut_lam) > 0 && (
                  <TheNhan chu={`Làm ${phut_thanh_chu(Number(bc.phut_lam))}`} mau="mo" />
                )}
              </View>
            )}

            {bc?.ghi_chu !== null && bc?.ghi_chu !== undefined && (
              <Chu co="bo" mau="mo">{bc.ghi_chu}</Chu>
            )}

            {/*
              Phu luc B Man 1: trang chu KHONG co nut cham cong, thay bang dong noi ro
              cham cong dien ra o may van phong. Nut chi hien voi nguoi duoc HR bat rieng
              (mac dinh TAT) — thuong la nguoi di cong tac.
            */}
            {!cho_phep_mobile && (
              <Chu co="bo" mau="mo">Đã chấm qua máy tại văn phòng</Chu>
            )}
          </The>

          {/* ------------------------------------------------ nut cham cong (neu duoc bat) */}
          {cho_phep_mobile ? (
            <>
              <View style={kieu.hang}>
                <NutChamCong trang_thai={0} khi_xong={nap_lai} />
                <NutChamCong trang_thai={1} khi_xong={nap_lai} />
              </View>
              <Chu co="bo" mau="mo">
                Chấm công bằng điện thoại chỉ dành cho lúc đi công tác. Ở văn phòng vẫn quẹt
                tại máy.
              </Chu>
            </>
          ) : (
            <Hop
              loai="tin"
              chu={'Ứng dụng này để xem bảng công, xin nghỉ phép và giải trình khi quên quẹt. '
                + 'Chấm công vẫn thực hiện tại máy của công ty.'}
            />
          )}

          {/* ------------------------------------------------ dai tuan T2..CN */}
          <The>
            <Chu co="h3">Tuần này</Chu>
            <View style={kieu.dai_tuan}>
              {CHU_THU.map((chu_thu, i) => {
                const ngay = cong_ngay(du_lieu.dau_tuan, i);
                const n = theo_ngay.get(ngay) ?? null;
                const la_hom_nay = ngay === du_lieu.ngay;
                const tt = n?.trang_thai ?? null;
                const mau_o = tt === null ? m.nen_mo
                  : tt === 'co_mat' ? (Number(n?.phut_muon) > 0 ? m.canh_bao_nen : m.tot_nen)
                  : tt === 'vang' ? m.xau_nen
                  : tt === 'nghi_phep' ? m.lanh_nen
                  : tt === 'ngay_le' ? m.canh_bao_nen
                  : m.nen_mo;
                return (
                  <View
                    key={ngay}
                    style={[
                      kieu.o_tuan,
                      {
                        backgroundColor: mau_o,
                        borderColor: la_hom_nay ? m.chinh : 'transparent',
                      },
                    ]}
                  >
                    <Chu co="bo" mau="nhat">{chu_thu}</Chu>
                    <Chu co="nho" style={kieu.dam}>{ngay.slice(8)}</Chu>
                    <Chu co="bo" mau="mo">
                      {tt === null ? '·' : Number(n?.so_cong) > 0 ? Number(n?.so_cong).toFixed(1) : '–'}
                    </Chu>
                  </View>
                );
              })}
            </View>
          </The>

          {/* ------------------------------------------------ 4 chi so thang */}
          <View style={kieu.luoi_chi_so}>
            <OChiSo
              nhan="CÔNG THÁNG"
              gia_tri={th === null ? '–' : Number(th.tong_cong).toFixed(1)}
              phu={`trên ${ngay_phai_lam} ngày phải làm`}
            />
            <OChiSo
              nhan="ĐI MUỘN"
              gia_tri={th === null ? '–' : `${th.so_lan_di_muon} lần`}
              phu={th === null ? undefined : phut_thanh_chu(Number(th.tong_phut_muon ?? 0))}
              mau={Number(th?.so_lan_di_muon) > 0 ? 'canh_bao' : 'chu'}
            />
            <OChiSo
              nhan="OT GHI NHẬN"
              gia_tri={th === null ? '–' : phut_thanh_chu(Number(th.tong_phut_ot))}
              phu="chưa duyệt"
              mau="lanh"
            />
            <OChiSo
              nhan="PHÉP CÒN"
              gia_tri={phep === null ? '–' : `${phep.con_lai} ngày`}
              phu={phep === null ? undefined
                : phep.cho_duyet > 0 ? `${phep.cho_duyet} ngày chờ duyệt`
                : `đã dùng ${phep.da_dung}/${phep.quy}`}
            />
          </View>

          {/* ------------------------------------------------ chuyen can */}
          <The>
            <View style={kieu.hang_deu}>
              <Chu co="h3">Chuyên cần tháng này</Chu>
              <Chu co="nho" mau="nhat" style={kieu.so}>
                {ngay_du_cong}/{ngay_phai_lam}
              </Chu>
            </View>
            <ThanhTienDo
              phan={ngay_phai_lam === 0 ? 0 : ngay_du_cong / ngay_phai_lam}
              mau={ngay_phai_lam > 0 && ngay_du_cong === ngay_phai_lam ? 'tot' : 'chinh'}
            />
            <Chu co="bo" mau="mo">
              Số ngày đủ công, không đi muộn. Đây là số liệu chấm công — điều kiện hưởng phụ
              cấp chuyên cần do quy chế lương của công ty quy định.
            </Chu>
          </The>

          {/* ------------------------------------------------ can chu y */}
          {ccy !== null && (ccy.don_cua_toi_cho_duyet > 0 || ccy.don_cho_toi_duyet > 0) && (
            <View style={[kieu.the_mong, { backgroundColor: m.nen_the, borderColor: m.vien }]}>
              <View style={{ padding: 14, paddingBottom: 8 }}>
                <Chu co="h3">Cần chú ý</Chu>
              </View>
              {ccy.don_cho_toi_duyet > 0 && (
                <Pressable
                  onPress={() => router.push('/don-tu')}
                  accessibilityRole="button"
                  accessibilityLabel={`${ccy.don_cho_toi_duyet} đơn chờ bạn duyệt`}
                >
                  <Dong>
                    <View style={kieu.nhieu}>
                      <Chu co="nho">Đơn chờ bạn duyệt</Chu>
                      <Chu co="bo" mau="mo">Nhân viên trong phòng của bạn</Chu>
                    </View>
                    <TheNhan chu={String(ccy.don_cho_toi_duyet)} mau="canh_bao" />
                  </Dong>
                </Pressable>
              )}
              {ccy.don_cua_toi_cho_duyet > 0 && (
                <Pressable
                  onPress={() => router.push('/don-tu')}
                  accessibilityRole="button"
                  accessibilityLabel={`${ccy.don_cua_toi_cho_duyet} đơn của bạn đang chờ duyệt`}
                >
                  <Dong cuoi>
                    <View style={kieu.nhieu}>
                      <Chu co="nho">Đơn của bạn đang chờ duyệt</Chu>
                      <Chu co="bo" mau="mo">Xem trạng thái ở màn Đơn từ</Chu>
                    </View>
                    <TheNhan chu={String(ccy.don_cua_toi_cho_duyet)} mau="lanh" />
                  </Dong>
                </Pressable>
              )}
            </View>
          )}

          {/* ------------------------------------------------ loi vao man don tu */}
          <Pressable
            onPress={() => router.push('/don-tu')}
            accessibilityRole="button"
            accessibilityLabel="Mở màn Đơn từ để xin nghỉ phép hoặc giải trình quên quẹt"
            style={({ pressed }) => [
              kieu.the,
              {
                backgroundColor: m.nen_the,
                borderColor: m.vien,
                opacity: pressed ? 0.85 : 1,
                flexDirection: 'row',
                alignItems: 'center',
              },
            ]}
          >
            <View style={kieu.nhieu}>
              <Chu co="h3">Nghỉ phép & đơn từ</Chu>
              <Chu co="bo" mau="mo">Xin nghỉ, giải trình quên quẹt, xem đơn đã gửi</Chu>
            </View>
            <Chu co="h2" mau="chinh">›</Chu>
          </Pressable>

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
                  <Chu style={[kieu.so, kieu.rat_dam, { width: 54 }]}>
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
