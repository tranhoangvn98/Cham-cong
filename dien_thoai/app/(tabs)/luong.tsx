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
  Chu, DangTai, Dong, Hop, HopLoi, KyHieu, Nut, OChiSo, The, ThanhTienDo, dung_nap,
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
  phieu_luong: PhieuLuong | null;
  ghi_chu_ot: string;
  ly_do_chua_co_phieu_luong: string;
}

/** Phiếu lương đã duyệt/trả của chính người xem (cùng dữ liệu web + email). */
interface PhieuLuong {
  id: string;
  thang: string;
  trang_thai_ky: string;
  luong_co_ban: string;
  phu_cap: string;
  so_ngay_cong_chuan: string;
  so_ngay_cong_thuc: string;
  luong_ngay: string;
  luong_theo_cong: string;
  phut_ot: string;
  he_so_ot: string;
  tien_ot: string;
  phut_ot_nghi_tuan: string;
  phut_ot_le: string;
  tien_ot_thuong: string;
  tien_ot_nghi_tuan: string;
  tien_ot_le: string;
  he_so_ot_nghi_tuan: string;
  he_so_ot_le: string;
  thuong: string;
  phu_cap_khac: string;
  tong_thu_nhap: string;
  bhxh_nld: string;
  bhyt_nld: string;
  bhtn_nld: string;
  thue_tncn: string;
  tru_khac: string;
  ly_do_tru_khac: string | null;
  tong_tru: string;
  thuc_linh: string;
  thuc_linh_lam_tron: string;
  ep_du_cong: boolean;
  mien_phat: boolean;
  khoan: {
    khoan_ma: string; ten: string; loai: string;
    so_luong: string | null; don_gia: string | null; thanh_tien: string;
    ghi_chu: string | null; chiu_thue: boolean;
    chi_tiet?: {
      id: string; ly_do: string; so_tien: string; thu_tu: number; cac_lan?: string[];
    }[];
  }[];
  phep: { quy: number; da_dung: number; con_lai: number; cho_duyet: number } | null;
  nghi: {
    tu_ngay: string; den_ngay: string; nua_ngay: boolean; loai: string; trang_thai: string;
  }[];
}

const dinh_dang_tien = new Intl.NumberFormat('vi-VN');
const tien = (v: unknown): string => dinh_dang_tien.format(Math.round(Number(v) || 0));
const gio_ot = (phut: unknown): string => {
  const p = Number(phut) || 0;
  return `${Math.floor(p / 60)}h${p % 60 > 0 ? String(p % 60).padStart(2, '0') : ''}`;
};
const he_so = (v: unknown): string =>
  (Number(v) || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const ngay_ngan = (s: string): string => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

/** Mot dong bang cua phieu: nhan + gia tri, kem dong phu mo ta cong thuc / can cu. */
function DongPhieu(
  { nhan, gia, phu, dam }: { nhan: string; gia: unknown; phu?: string; dam?: boolean },
): ReactNode {
  return (
    <Dong>
      <View style={kieu.nhieu}>
        <Chu co={dam === true ? 'h3' : 'nho'}>{nhan}</Chu>
        {phu !== undefined && phu !== '' && <Chu co="bo" mau="mo">{phu}</Chu>}
      </View>
      <Chu co={dam === true ? 'h3' : 'nho'} style={kieu.so}>{tien(gia)}</Chu>
    </Dong>
  );
}

/** Dong OT tong + ba dong theo loai ngay kem he so. */
function DongOT({ p }: { p: PhieuLuong }): ReactNode {
  if (Number(p.tien_ot) <= 0) return null;
  const phut_thuong = Math.max(0,
    Number(p.phut_ot) - Number(p.phut_ot_nghi_tuan) - Number(p.phut_ot_le));
  return (
    <View>
      <DongPhieu nhan="Làm thêm giờ (OT)" gia={p.tien_ot} phu={gio_ot(p.phut_ot)} dam />
      {Number(p.tien_ot_thuong) > 0 && (
        <DongPhieu nhan="— Ngày thường" gia={p.tien_ot_thuong}
          phu={`${gio_ot(phut_thuong)} × hệ số ${he_so(p.he_so_ot)}`} />
      )}
      {Number(p.tien_ot_nghi_tuan) > 0 && (
        <DongPhieu nhan="— Chủ nhật" gia={p.tien_ot_nghi_tuan}
          phu={`${gio_ot(p.phut_ot_nghi_tuan)} × hệ số ${he_so(p.he_so_ot_nghi_tuan)}`} />
      )}
      {Number(p.tien_ot_le) > 0 && (
        <DongPhieu nhan="— Ngày lễ" gia={p.tien_ot_le}
          phu={`${gio_ot(p.phut_ot_le)} × hệ số ${he_so(p.he_so_ot_le)}`} />
      )}
    </View>
  );
}

/** Mot dong khoan (thu nhap / tru) kem chi tiet tung dong neu co. */
function KhoanPhieuRow({ k }: { k: PhieuLuong['khoan'][number] }): ReactNode {
  const dg = k.don_gia !== null ? Number(k.don_gia) : 0;
  const sl = k.so_luong !== null ? Number(k.so_luong) : 0;
  const phu = dg > 0 && sl > 0
    ? `${tien(dg)}đ × ${sl}`
    : sl > 0
      ? `× ${sl}`
      : k.ghi_chu !== null && k.ghi_chu !== ''
        ? k.ghi_chu
        : undefined;
  return (
    <View>
      <Dong>
        <View style={kieu.nhieu}>
          <Chu co="nho">{k.ten}{k.chiu_thue ? '' : ' (miễn thuế)'}</Chu>
          {phu !== undefined && <Chu co="bo" mau="mo">{phu}</Chu>}
        </View>
        <Chu co="nho" style={kieu.so}>{tien(k.thanh_tien)}</Chu>
      </Dong>
      {(k.chi_tiet ?? []).map((c) => (
        <View key={c.id} style={{ paddingHorizontal: 14 }}>
          {c.ly_do !== '' && (
            <View style={[kieu.hang_deu, { marginTop: 2 }]}>
              <Chu co="bo" mau="mo" style={kieu.nhieu}>— {c.ly_do}</Chu>
              <Chu co="bo" mau="mo" style={kieu.so}>{tien(c.so_tien)}</Chu>
            </View>
          )}
          {(c.cac_lan ?? []).map((lan, j) => (
            // eslint-disable-next-line react/no-array-index-key
            <Chu key={`${c.id}:${String(j)}`} co="bo" mau="mo"
              style={{ paddingLeft: c.ly_do !== '' ? 16 : 0, marginTop: 2 }}>
              • {lan}
            </Chu>
          ))}
        </View>
      ))}
    </View>
  );
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

          {/* ------------------------------------------------ phieu luong */}
          {du_lieu.phieu_luong !== null && (
            <View>
              <View style={{ marginTop: 12 }}>
                <Chu co="h2">Phiếu lương</Chu>
              </View>

              <The>
                <View style={kieu.hang_deu}>
                  <Chu co="h3">Thực nhận (đã làm tròn)</Chu>
                  <Chu co="h2" style={kieu.so}>
                    {tien(du_lieu.phieu_luong.thuc_linh_lam_tron)} đ
                  </Chu>
                </View>
                <Chu co="bo" mau="mo" style={{ marginTop: 4 }}>
                  Công {Number(du_lieu.phieu_luong.so_ngay_cong_thuc)}/
                  {Number(du_lieu.phieu_luong.so_ngay_cong_chuan)} · Lương cơ bản{' '}
                  {tien(du_lieu.phieu_luong.luong_co_ban)} đ
                  {du_lieu.phieu_luong.phep !== null
                    ? ` · Phép còn ${du_lieu.phieu_luong.phep.con_lai}/${du_lieu.phieu_luong.phep.quy} ngày`
                    : ''}
                </Chu>
              </The>

              <The>
                <Chu co="h3">Thu nhập</Chu>
                <DongPhieu nhan="Lương theo công" gia={du_lieu.phieu_luong.luong_theo_cong}
                  phu={`${Number(du_lieu.phieu_luong.so_ngay_cong_thuc)}/${Number(du_lieu.phieu_luong.so_ngay_cong_chuan)} công`} />
                <DongOT p={du_lieu.phieu_luong} />
                {du_lieu.phieu_luong.khoan
                  .filter((k) => k.loai === 'thu_nhap')
                  .map((k) => <KhoanPhieuRow key={k.khoan_ma} k={k} />)}
                {Number(du_lieu.phieu_luong.thuong) > 0 && (
                  <DongPhieu nhan="Thưởng" gia={du_lieu.phieu_luong.thuong} />
                )}
                {Number(du_lieu.phieu_luong.phu_cap_khac) > 0 && (
                  <DongPhieu nhan="Phụ cấp khác" gia={du_lieu.phieu_luong.phu_cap_khac} />
                )}
                <Dong cuoi>
                  <Chu co="h3" style={kieu.nhieu}>Tổng thu nhập</Chu>
                  <Chu co="h3" style={kieu.so}>{tien(du_lieu.phieu_luong.tong_thu_nhap)}</Chu>
                </Dong>
              </The>

              <The>
                <Chu co="h3">Khấu trừ</Chu>
                {Number(du_lieu.phieu_luong.bhxh_nld) > 0 && (
                  <DongPhieu nhan="BHXH (8%)" gia={du_lieu.phieu_luong.bhxh_nld} />
                )}
                {Number(du_lieu.phieu_luong.bhyt_nld) > 0 && (
                  <DongPhieu nhan="BHYT (1,5%)" gia={du_lieu.phieu_luong.bhyt_nld} />
                )}
                {Number(du_lieu.phieu_luong.bhtn_nld) > 0 && (
                  <DongPhieu nhan="BHTN (1%)" gia={du_lieu.phieu_luong.bhtn_nld} />
                )}
                {Number(du_lieu.phieu_luong.thue_tncn) > 0 && (
                  <DongPhieu nhan="Thuế TNCN" gia={du_lieu.phieu_luong.thue_tncn} />
                )}
                {du_lieu.phieu_luong.khoan
                  .filter((k) => k.loai === 'tru')
                  .map((k) => <KhoanPhieuRow key={k.khoan_ma} k={k} />)}
                {Number(du_lieu.phieu_luong.tru_khac) > 0 && (
                  <DongPhieu nhan="Trừ khác" gia={du_lieu.phieu_luong.tru_khac}
                    phu={du_lieu.phieu_luong.ly_do_tru_khac ?? undefined} />
                )}
                <Dong cuoi>
                  <Chu co="h3" style={kieu.nhieu}>Tổng khấu trừ</Chu>
                  <Chu co="h3" style={kieu.so}>{tien(du_lieu.phieu_luong.tong_tru)}</Chu>
                </Dong>
              </The>

              {du_lieu.phieu_luong.nghi.length > 0 && (
                <The>
                  <Chu co="h3">Ngày nghỉ trong tháng</Chu>
                  {du_lieu.phieu_luong.nghi.map((d, i) => (
                    <Dong key={`${d.tu_ngay}:${String(i)}`}
                      cuoi={i === du_lieu.phieu_luong!.nghi.length - 1}>
                      <View style={kieu.nhieu}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                          <Chu co="nho">{ngay_ngan(d.tu_ngay)}</Chu>
                          {d.tu_ngay !== d.den_ngay && (
                            <>
                              {/* Mui ten khong co glyph trong Be Vietnam Pro — ve bang font he thong. */}
                              <KyHieu co={13}> → </KyHieu>
                              <Chu co="nho">{ngay_ngan(d.den_ngay)}</Chu>
                            </>
                          )}
                          {d.nua_ngay && <Chu co="nho"> · nửa ngày</Chu>}
                        </View>
                        <Chu co="bo" mau="mo">
                          {d.loai === 'khong_luong' ? 'không lương' : 'phép có lương'}
                          {d.trang_thai === 'cho_duyet' ? ' (chờ duyệt)' : ''}
                        </Chu>
                      </View>
                    </Dong>
                  ))}
                </The>
              )}
            </View>
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
