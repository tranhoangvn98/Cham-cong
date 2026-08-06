import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { dung_mau, kieu, type BangMau } from '../../nguon/kieu';
import {
  Chu, DangTai, Dong, HopLoi, NhanNgay, Nut, OChiSo, The, TheNhan, ThanhTienDo, Trong,
  dung_nap,
} from '../../nguon/thanh_phan';
import {
  TEN_TRANG_THAI_NGAY, doi_thang, gio_ngan, phut_thanh_chu, ten_thang, thang_nay, thu_cua_ngay,
} from '../../nguon/tien_ich';

const CHU_THU = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Mau o lich theo trang thai ngay. Di muon lam ngay co mat doi sang mau cam. */
function mau_o_lich(m: BangMau, n: { trang_thai: string; phut_muon: number } | undefined): string {
  if (n === undefined) return 'transparent';
  if (n.trang_thai === 'co_mat') return Number(n.phut_muon) > 0 ? m.canh_bao_nen : m.tot_nen;
  if (n.trang_thai === 'vang') return m.xau_nen;
  if (n.trang_thai === 'nghi_phep') return m.lanh_nen;
  if (n.trang_thai === 'ngay_le') return m.canh_bao_nen;
  return m.nen_mo;
}

/**
 * Thu cua ngay mung 1, tinh theo tuan bat dau THU HAI (0 = T2 ... 6 = CN).
 * Dung Date.UTC de khong bi mui gio may keo ngay lui/tien mot ngay.
 */
function lech_dau_thang(thang: string): number {
  const [nam, t] = thang.split('-').map(Number);
  const thu = new Date(Date.UTC(nam ?? 1970, (t ?? 1) - 1, 1)).getUTCDay();
  return thu === 0 ? 6 : thu - 1;
}

function so_ngay_trong_thang(thang: string): number {
  const [nam, t] = thang.split('-').map(Number);
  return new Date(Date.UTC(nam ?? 1970, t ?? 1, 0)).getUTCDate();
}

interface NgayCong {
  ngay: string;
  trang_thai: string;
  gio_vao: string | null;
  gio_ra: string | null;
  phut_lam: number;
  phut_muon: number;
  phut_ve_som: number;
  phut_ot: number;
  so_cong: number;
  co_dieu_chinh: boolean;
  da_chot: boolean;
  ghi_chu: string | null;
}

interface BangCongThang {
  thang: string;
  tong_hop: {
    tong_cong: number;
    tong_phut_lam: number;
    tong_phut_ot: number;
    tong_phut_muon: number;
    so_ngay_co_mat: number;
    so_ngay_vang: number;
    so_ngay_nghi_phep: number;
    so_lan_di_muon: number;
    so_ngay_phai_lam: number;
  } | null;
  ngay: NgayCong[];
}

export default function ManBangCong(): ReactNode {
  const m = dung_mau();
  const [thang, dat_thang] = useState(thang_nay());
  const { du_lieu, dang_tai, loi } = dung_nap<BangCongThang>(`/api/toi/bang-cong?thang=${thang}`);

  const th = du_lieu?.tong_hop ?? null;
  const la_thang_nay = thang === thang_nay();
  const theo_ngay = new Map((du_lieu?.ngay ?? []).map((n) => [n.ngay, n]));

  return (
    <ScrollView style={[kieu.man, { backgroundColor: m.nen }]} contentContainerStyle={kieu.cuon}>
      {/* ------------------------------------------------ chon thang */}
      <View style={kieu.hang}>
        <Nut chu="‹" khi_bam={() => dat_thang(doi_thang(thang, -1))} style={{ minWidth: 52 }} />
        <View style={[kieu.nhieu, { alignItems: 'center' }]}>
          <Chu co="h3">{ten_thang(thang)}</Chu>
        </View>
        <Nut
          chu="›"
          khi_bam={() => dat_thang(doi_thang(thang, 1))}
          tat={la_thang_nay}
          style={{ minWidth: 52 }}
        />
      </View>

      <HopLoi loi={loi} />

      {dang_tai && du_lieu === null ? (
        <DangTai />
      ) : du_lieu === null ? null : (
        <>
          {/* ------------------------------------------------ tong hop */}
          <The>
            <View style={kieu.hang_deu}>
              <View style={kieu.nhieu}>
                <Chu co="bo" mau="nhat">TỔNG CÔNG</Chu>
                <Chu style={kieu.so_lon}>{Number(th?.tong_cong ?? 0).toFixed(1)}</Chu>
              </View>
              <View style={kieu.nhieu}>
                <Chu co="bo" mau="nhat">GIỜ LÀM</Chu>
                <Chu co="h2" style={kieu.so}>
                  {phut_thanh_chu(Number(th?.tong_phut_lam ?? 0))}
                </Chu>
              </View>
              <View style={kieu.nhieu}>
                <Chu co="bo" mau="nhat">TĂNG CA</Chu>
                <Chu co="h2" style={kieu.so}>
                  {phut_thanh_chu(Number(th?.tong_phut_ot ?? 0))}
                </Chu>
              </View>
            </View>

            <View style={[kieu.hang, { flexWrap: 'wrap' }]}>
              {Number(th?.so_lan_di_muon ?? 0) > 0 && (
                <TheNhan chu={`${th?.so_lan_di_muon} lần muộn`} mau="canh_bao" />
              )}
              {Number(th?.tong_phut_muon ?? 0) > 0 && (
                <TheNhan
                  chu={`Tổng muộn ${phut_thanh_chu(Number(th?.tong_phut_muon))}`}
                  mau="canh_bao"
                />
              )}
              {Number(th?.so_ngay_vang ?? 0) > 0 && (
                <TheNhan chu={`${th?.so_ngay_vang} ngày vắng`} mau="xau" />
              )}
              {Number(th?.so_ngay_nghi_phep ?? 0) > 0 && (
                <TheNhan chu={`${th?.so_ngay_nghi_phep} ngày phép`} mau="lanh" />
              )}
            </View>
          </The>

          {/* ------------------------------------------------ 4 chi so phan loai (Man 2) */}
          <View style={kieu.luoi_chi_so}>
            <OChiSo
              nhan="ĐỦ CÔNG"
              gia_tri={String(Math.max(0,
                Number(th?.so_ngay_co_mat ?? 0) - Number(th?.so_lan_di_muon ?? 0)))}
              phu="ngày"
              mau="tot"
            />
            <OChiSo
              nhan="ĐI MUỘN"
              gia_tri={String(Number(th?.so_lan_di_muon ?? 0))}
              phu="lần"
              mau={Number(th?.so_lan_di_muon ?? 0) > 0 ? 'canh_bao' : 'chu'}
            />
            <OChiSo
              nhan="NGHỈ PHÉP"
              gia_tri={String(Number(th?.so_ngay_nghi_phep ?? 0))}
              phu="ngày"
              mau="lanh"
            />
            <OChiSo
              nhan="VẮNG"
              gia_tri={String(Number(th?.so_ngay_vang ?? 0))}
              phu="ngày"
              mau={Number(th?.so_ngay_vang ?? 0) > 0 ? 'xau' : 'chu'}
            />
          </View>

          {/* ------------------------------------------------ cong chuan / thuc te */}
          <The>
            <View style={kieu.hang_deu}>
              <Chu co="h3">Công thực tế / công chuẩn</Chu>
              <Chu co="nho" mau="nhat" style={kieu.so}>
                {Number(th?.tong_cong ?? 0).toFixed(1)}/{Number(th?.so_ngay_phai_lam ?? 0)}
              </Chu>
            </View>
            <ThanhTienDo
              phan={Number(th?.so_ngay_phai_lam ?? 0) === 0
                ? 0
                : Number(th?.tong_cong ?? 0) / Number(th?.so_ngay_phai_lam)}
              mau={Number(th?.tong_cong ?? 0) >= Number(th?.so_ngay_phai_lam ?? 0) ? 'tot' : 'chinh'}
            />
          </The>

          {/* ------------------------------------------------ lich thang dang heatmap */}
          <The>
            <Chu co="h3">Lịch tháng</Chu>
            <View style={kieu.luoi_lich}>
              {CHU_THU.map((c) => (
                <View key={c} style={kieu.dau_thu}>
                  <Chu co="bo" mau="nhat">{c}</Chu>
                </View>
              ))}
              {/* O trong dau thang de mung 1 roi dung cot thu cua no. */}
              {Array.from({ length: lech_dau_thang(thang) }, (_, i) => (
                <View key={`trong-${i}`} style={kieu.o_lich} />
              ))}
              {Array.from({ length: so_ngay_trong_thang(thang) }, (_, i) => {
                const ngay = `${thang}-${String(i + 1).padStart(2, '0')}`;
                const n = theo_ngay.get(ngay);
                return (
                  <View key={ngay} style={kieu.o_lich}>
                    <View style={[kieu.o_lich_trong, { backgroundColor: mau_o_lich(m, n) }]}>
                      <Chu co="bo" mau={n === undefined ? 'mo' : 'chu'}>{i + 1}</Chu>
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={[kieu.hang, { flexWrap: 'wrap', gap: 8 }]}>
              <TheNhan chu="Đủ công" mau="tot" />
              <TheNhan chu="Đi muộn / lễ" mau="canh_bao" />
              <TheNhan chu="Nghỉ phép" mau="lanh" />
              <TheNhan chu="Vắng" mau="xau" />
              <TheNhan chu="Nghỉ tuần" mau="mo" />
            </View>
          </The>

          {/* ------------------------------------------------ tung ngay */}
          <View style={[kieu.the_mong, { backgroundColor: m.nen_the, borderColor: m.vien }]}>
            {du_lieu.ngay.length === 0 ? (
              <Trong
                tieu_de="Chưa có ngày công nào"
                mo_ta={la_thang_nay
                  ? 'Dữ liệu xuất hiện sau lần quẹt đầu tiên trong tháng.'
                  : 'Tháng này không có dữ liệu chấm công.'}
              />
            ) : (
              du_lieu.ngay.map((n, i) => (
                <Dong key={n.ngay} cuoi={i === du_lieu.ngay.length - 1}>
                  <View style={{ width: 62 }}>
                    <Chu co="nho" dam>{thu_cua_ngay(n.ngay)} {n.ngay.slice(8)}</Chu>
                    <Chu co="bo" mau="mo">{n.ngay.slice(5, 7)}/{n.ngay.slice(0, 4)}</Chu>
                  </View>

                  <View style={kieu.nhieu}>
                    <Chu co="nho" style={kieu.so}>
                      {n.gio_vao === null
                        ? '—'
                        : `${gio_ngan(n.gio_vao)} – ${n.gio_vao === n.gio_ra ? '?' : gio_ngan(n.gio_ra)}`}
                    </Chu>
                    <View style={[kieu.hang, { gap: 6, flexWrap: 'wrap' }]}>
                      <NhanNgay
                        trang_thai={n.trang_thai}
                        chu={TEN_TRANG_THAI_NGAY[n.trang_thai] ?? n.trang_thai}
                      />
                      {Number(n.phut_muon) > 0 && (
                        <Chu co="bo" mau="canh_bao">muộn {phut_thanh_chu(Number(n.phut_muon))}</Chu>
                      )}
                      {Number(n.phut_ve_som) > 0 && (
                        <Chu co="bo" mau="canh_bao">sớm {phut_thanh_chu(Number(n.phut_ve_som))}</Chu>
                      )}
                      {Number(n.phut_ot) > 0 && (
                        <Chu co="bo" mau="chinh">OT {phut_thanh_chu(Number(n.phut_ot))}</Chu>
                      )}
                      {n.co_dieu_chinh && <Chu co="bo" mau="mo">đã sửa</Chu>}
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Chu co="nho" dam style={kieu.so}>{Number(n.so_cong).toFixed(1)}</Chu>
                    <Chu co="bo" mau="mo" style={kieu.so}>
                      {phut_thanh_chu(Number(n.phut_lam))}
                    </Chu>
                  </View>
                </Dong>
              ))
            )}
          </View>

          <Chu co="bo" mau="mo" canh="giua">
            Thấy sai lệch? Mở "Nghỉ phép & đơn từ" ở Trang chủ để gửi giải trình cho nhân sự.
          </Chu>
        </>
      )}
    </ScrollView>
  );
}
