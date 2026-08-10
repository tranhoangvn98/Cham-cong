// Man "Luong" (Phu luc B Man 3).
//
// Module C (tinh luong + BHXH + thue TNCN) chua trien khai, va theo lo trinh v2 con bi
// chan cho ke toan/luat su xac nhan tham so phap ly. Man nay vi vay hien DUNG nhung du
// kien cham cong se la dau vao cua ky luong, va noi ro chua co phieu luong — khong bay
// so tien uoc tinh.
//
// Bo cuc khoi Thu nhap / Giam tru cua Man 3 se lap vao day khi Module C xong.
import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { dung_mau, kieu } from '../../nguon/kieu';
import {
  Chu, DangTai, Dong, Hop, HopLoi, Nut, OChiSo, The, ThanhTienDo, dung_nap,
} from '../../nguon/thanh_phan';
import { doi_thang, phut_thanh_chu, ten_thang, thang_nay } from '../../nguon/tien_ich';

interface CoSoTinhLuong {
  tong_cong: string;
  tong_phut_lam: number;
  tong_phut_ot: number;
  tong_phut_muon: number;
  tong_phut_ve_som: number;
  so_ngay_co_mat: number;
  so_ngay_vang: number;
  so_ngay_nghi_phep: number;
  so_ngay_le: number;
  so_lan_di_muon: number;
  so_lan_ve_som: number;
  so_ngay_phai_lam: number;
}

interface DuLieuLuong {
  thang: string;
  co_so_tinh_luong: CoSoTinhLuong | null;
  phep: { quy: number; da_dung: number; con_lai: number; cho_duyet: number } | null;
  da_chot: boolean;
  phieu_luong: null;
  ghi_chu_ot: string;
  ly_do_chua_co_phieu_luong: string;
}

export default function ManLuong(): ReactNode {
  const m = dung_mau();
  const [thang, dat_thang] = useState(thang_nay());
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<DuLieuLuong>(
    `/api/toi/luong?thang=${thang}`,
  );
  const [dang_keo, dat_dang_keo] = useState(false);

  const keo_de_tai = (): void => {
    dat_dang_keo(true);
    nap_lai();
    setTimeout(() => dat_dang_keo(false), 600);
  };

  const cs = du_lieu?.co_so_tinh_luong ?? null;
  const phep = du_lieu?.phep ?? null;
  const phai_lam = Number(cs?.so_ngay_phai_lam ?? 0);
  const cong = Number(cs?.tong_cong ?? 0);

  return (
    <ScrollView
      style={[kieu.man, { backgroundColor: m.nen }]}
      contentContainerStyle={kieu.cuon}
      refreshControl={
        <RefreshControl refreshing={dang_keo} onRefresh={keo_de_tai} tintColor={m.chinh} />
      }
    >
      <HopLoi loi={loi} />

      {/* ------------------------------------------------ chon ky */}
      <View style={kieu.hang_deu}>
        <Nut chu="‹" kieu_nut="vien" khi_bam={() => dat_thang(doi_thang(thang, -1))} />
        <Chu co="h3">{ten_thang(thang)}</Chu>
        <Nut
          chu="›"
          kieu_nut="vien"
          tat={thang >= thang_nay()}
          khi_bam={() => dat_thang(doi_thang(thang, 1))}
        />
      </View>

      {dang_tai && du_lieu === null ? (
        <DangTai chu="Đang tải…" />
      ) : du_lieu === null ? null : (
        <>
          {/* ------------------------------------------------ chua co phieu luong */}
          <Hop loai="tin" chu={du_lieu.ly_do_chua_co_phieu_luong} />

          {/* ------------------------------------------------ co so tinh luong */}
          <View>
            <Chu co="h2">Cơ sở tính lương</Chu>
            <Chu co="bo" mau="mo">
              Đây là dữ liệu chấm công của kỳ này. Khi có bảng lương, đây là số liệu được
              dùng làm căn cứ — kiểm tra sớm để phát hiện sai lệch trước khi chốt.
            </Chu>
          </View>

          <View style={kieu.luoi_chi_so}>
            <OChiSo
              nhan="CÔNG THỰC TẾ"
              gia_tri={cong.toFixed(1)}
              phu={`trên ${phai_lam} ngày phải làm`}
            />
            <OChiSo
              nhan="GIỜ LÀM"
              gia_tri={phut_thanh_chu(Number(cs?.tong_phut_lam ?? 0))}
            />
            <OChiSo
              nhan="OT GHI NHẬN"
              gia_tri={phut_thanh_chu(Number(cs?.tong_phut_ot ?? 0))}
              phu="chưa duyệt"
              mau="lanh"
            />
            <OChiSo
              nhan="VẮNG"
              gia_tri={`${Number(cs?.so_ngay_vang ?? 0)} ngày`}
              mau={Number(cs?.so_ngay_vang ?? 0) > 0 ? 'xau' : 'chu'}
            />
          </View>

          {/* ------------------------------------------------ tien do cong */}
          <The>
            <View style={kieu.hang_deu}>
              <Chu co="h3">Công thực tế / công chuẩn</Chu>
              <Chu co="nho" mau="nhat" style={kieu.so}>{cong.toFixed(1)}/{phai_lam}</Chu>
            </View>
            <ThanhTienDo
              phan={phai_lam === 0 ? 0 : cong / phai_lam}
              mau={phai_lam > 0 && cong >= phai_lam ? 'tot' : 'chinh'}
            />
          </The>

          {/* ------------------------------------------------ chi tiet */}
          <View style={[kieu.the_mong, { backgroundColor: m.nen_the, borderColor: m.vien }]}>
            <View style={{ padding: 14, paddingBottom: 8 }}>
              <Chu co="h3">Chi tiết kỳ {ten_thang(thang)}</Chu>
            </View>
            <Dong>
              <Chu co="nho" style={kieu.nhieu}>Ngày có mặt</Chu>
              <Chu co="nho" style={kieu.so}>{Number(cs?.so_ngay_co_mat ?? 0)}</Chu>
            </Dong>
            <Dong>
              <Chu co="nho" style={kieu.nhieu}>Nghỉ phép</Chu>
              <Chu co="nho" style={kieu.so}>{Number(cs?.so_ngay_nghi_phep ?? 0)}</Chu>
            </Dong>
            <Dong>
              <Chu co="nho" style={kieu.nhieu}>Ngày lễ</Chu>
              <Chu co="nho" style={kieu.so}>{Number(cs?.so_ngay_le ?? 0)}</Chu>
            </Dong>
            <Dong>
              <Chu co="nho" style={kieu.nhieu}>Đi muộn</Chu>
              <Chu co="nho" style={kieu.so}>
                {Number(cs?.so_lan_di_muon ?? 0)} lần · {phut_thanh_chu(Number(cs?.tong_phut_muon ?? 0))}
              </Chu>
            </Dong>
            <Dong cuoi>
              <Chu co="nho" style={kieu.nhieu}>Về sớm</Chu>
              <Chu co="nho" style={kieu.so}>
                {Number(cs?.so_lan_ve_som ?? 0)} lần · {phut_thanh_chu(Number(cs?.tong_phut_ve_som ?? 0))}
              </Chu>
            </Dong>
          </View>

          {/* ------------------------------------------------ quy phep */}
          {phep !== null && (
            <The>
              <View style={kieu.hang_deu}>
                <Chu co="h3">Quỹ phép năm {thang.slice(0, 4)}</Chu>
                <Chu co="nho" mau="nhat" style={kieu.so}>
                  còn {phep.con_lai}/{phep.quy} ngày
                </Chu>
              </View>
              <ThanhTienDo
                phan={phep.quy === 0 ? 0 : phep.da_dung / phep.quy}
                mau={phep.con_lai <= 0 ? 'canh_bao' : 'lanh'}
              />
              {phep.cho_duyet > 0 && (
                <Chu co="bo" mau="mo">
                  Chưa trừ {phep.cho_duyet} ngày đang chờ duyệt.
                </Chu>
              )}
            </The>
          )}

          {/* ------------------------------------------------ ghi chu */}
          <Hop loai="tin" chu={du_lieu.ghi_chu_ot} />
          {!du_lieu.da_chot && (
            <Hop
              loai="luu_y"
              chu={'Kỳ này chưa chốt. Một lần quẹt về muộn hoặc một đơn được duyệt vẫn có thể '
                + 'làm số liệu thay đổi.'}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}
