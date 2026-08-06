// Luong cham cong bang dien thoai: xin quyen -> lay GPS -> chup selfie -> gui len.
//
// Thu tu nay co chu y: lay GPS TRUOC khi mo camera de neu khong co vi tri thi bao ngay,
// khong de nhan vien chup anh xong moi biet la khong gui duoc.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { gui_cham_cong, type KetQuaChamCong } from './api';
import { dung_mau, kieu } from './kieu';
import { Chu, Hop, HopLoi, Nut } from './thanh_phan';

type Buoc = 'chuan_bi' | 'lay_vi_tri' | 'chup_anh' | 'dang_gui' | 'xong' | 'loi';

interface ViTri {
  vi_do: number;
  kinh_do: number;
  do_chinh_xac_m: number | null;
  gia_lap: boolean;
}

interface Props {
  /** 0 = chấm vào, 1 = chấm ra */
  trang_thai: 0 | 1;
  khi_dong: () => void;
  khi_xong: () => void;
}

export function HopChamCong({ trang_thai, khi_dong, khi_xong }: Props): ReactNode {
  const m = dung_mau();
  const [buoc, dat_buoc] = useState<Buoc>('chuan_bi');
  const [loi, dat_loi] = useState<string | null>(null);
  const [vi_tri, dat_vi_tri] = useState<ViTri | null>(null);
  const [ket_qua, dat_ket_qua] = useState<KetQuaChamCong | null>(null);
  const [quyen_camera, xin_quyen_camera] = useCameraPermissions();
  const camera = useRef<CameraView | null>(null);
  const con_song = useRef(true);

  useEffect(() => {
    con_song.current = true;
    return () => { con_song.current = false; };
  }, []);

  const nhan_ten = trang_thai === 0 ? 'VÀO' : 'RA';

  // ---------------------------------------------------------------- lay vi tri
  const lay_vi_tri = async (): Promise<void> => {
    dat_loi(null);
    dat_buoc('lay_vi_tri');
    try {
      // Dich vu dinh vi cua may co bat khong (khac voi quyen cua app).
      if (!(await Location.hasServicesEnabledAsync())) {
        throw new Error('Định vị của điện thoại đang tắt. Hãy bật GPS rồi thử lại.');
      }

      const quyen = await Location.requestForegroundPermissionsAsync();
      if (quyen.status !== 'granted') {
        throw new Error(
          quyen.canAskAgain
            ? 'Cần quyền vị trí để xác minh bạn đang ở đúng nơi làm việc.'
            : 'Quyền vị trí đã bị chặn. Vào Cài đặt của điện thoại để bật lại cho ứng dụng này.',
        );
      }

      const v = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!con_song.current) return;
      dat_vi_tri({
        vi_do: v.coords.latitude,
        kinh_do: v.coords.longitude,
        do_chinh_xac_m: v.coords.accuracy,
        // Android bao cho biet toa do do app gia lap vi tri tao ra.
        gia_lap: v.mocked === true,
      });

      // Xin quyen camera ngay sau khi co vi tri.
      const qc = quyen_camera?.granted === true ? quyen_camera : await xin_quyen_camera();
      if (!con_song.current) return;
      if (qc.granted !== true) {
        throw new Error(
          qc.canAskAgain
            ? 'Cần quyền camera để chụp ảnh xác nhận.'
            : 'Quyền camera đã bị chặn. Vào Cài đặt của điện thoại để bật lại.',
        );
      }
      dat_buoc('chup_anh');
    } catch (e) {
      if (!con_song.current) return;
      dat_loi(e instanceof Error ? e.message : String(e));
      dat_buoc('loi');
    }
  };

  // ---------------------------------------------------------------- chup va gui
  const chup_va_gui = async (): Promise<void> => {
    if (camera.current === null || vi_tri === null) return;
    dat_loi(null);
    dat_buoc('dang_gui');
    try {
      const anh = await camera.current.takePictureAsync({
        quality: 0.5,
        imageType: 'jpg',
        // Bo hau xu ly de chup nhanh hon va tep nho hon; anh chi de doi chieu mat nguoi.
        skipProcessing: true,
        shutterSound: false,
      });
      if (anh === undefined) throw new Error('Không chụp được ảnh. Thử lại.');

      const kq = await gui_cham_cong({
        anh_uri: anh.uri,
        vi_do: vi_tri.vi_do,
        kinh_do: vi_tri.kinh_do,
        do_chinh_xac_m: vi_tri.do_chinh_xac_m,
        trang_thai,
        gps_gia_lap: vi_tri.gia_lap,
      });

      if (!con_song.current) return;
      dat_ket_qua(kq);
      dat_buoc('xong');
    } catch (e) {
      if (!con_song.current) return;
      dat_loi(e instanceof Error ? e.message : String(e));
      dat_buoc('loi');
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={khi_dong}>
      <View style={[kieu.man, { backgroundColor: m.nen }]}>
        {/* ------------------------------------------------- buoc chup anh */}
        {buoc === 'chup_anh' || buoc === 'dang_gui' ? (
          <View style={kieu.man}>
            <CameraView
              ref={camera}
              style={{ flex: 1 }}
              facing="front"
              // Tat quet ma vach: khong dung, va bat se ton pin.
              barcodeScannerSettings={{ barcodeTypes: [] }}
            />
            <View style={{ padding: 16, gap: 10, backgroundColor: m.nen }}>
              {vi_tri !== null && vi_tri.gia_lap && (
                <Hop
                  loai="luu_y"
                  chu={'Điện thoại báo vị trí này do ứng dụng giả lập tạo ra. Lần chấm công sẽ '
                    + 'phải chờ nhân sự xác nhận. Hãy tắt app giả lập vị trí.'}
                />
              )}
              {vi_tri !== null && vi_tri.do_chinh_xac_m !== null && vi_tri.do_chinh_xac_m > 100 && (
                <Hop
                  loai="luu_y"
                  chu={`Độ chính xác GPS hiện tại chỉ ±${Math.round(vi_tri.do_chinh_xac_m)}m. `
                    + 'Ra chỗ thoáng hoặc gần cửa sổ để định vị chính xác hơn.'}
                />
              )}
              <Chu co="nho" mau="nhat" canh="giua">
                Đưa mặt vào khung rồi bấm chụp để chấm công {nhan_ten}.
              </Chu>
              <Nut
                chu={buoc === 'dang_gui' ? 'Đang gửi…' : `Chụp và chấm công ${nhan_ten}`}
                kieu_nut="chinh"
                khi_bam={() => void chup_va_gui()}
                dang_chay={buoc === 'dang_gui'}
              />
              <Nut chu="Hủy" kieu_nut="phang" khi_bam={khi_dong} tat={buoc === 'dang_gui'} />
            </View>
          </View>
        ) : (
          /* ------------------------------------------------- cac buoc khac */
          <View style={[kieu.man, kieu.giua]}>
            {buoc === 'chuan_bi' && (
              <>
                <Chu co="h1" canh="giua">Chấm công {nhan_ten}</Chu>
                <Hop
                  loai="tin"
                  chu={'Ứng dụng sẽ lấy vị trí GPS và chụp một ảnh của bạn để nhân sự đối chiếu. '
                    + 'Nếu bạn đang trong phạm vi địa điểm công ty đã khai, công được tính ngay; '
                    + 'ngoài phạm vi thì phải chờ nhân sự duyệt.'}
                />
                <Nut
                  chu="Bắt đầu"
                  kieu_nut="chinh"
                  khi_bam={() => void lay_vi_tri()}
                  style={{ alignSelf: 'stretch' }}
                />
                <Nut chu="Hủy" kieu_nut="phang" khi_bam={khi_dong} style={{ alignSelf: 'stretch' }} />
              </>
            )}

            {buoc === 'lay_vi_tri' && (
              <>
                <Chu co="h2" canh="giua">Đang lấy vị trí…</Chu>
                <Chu co="nho" mau="nhat" canh="giua">
                  Có thể mất vài giây. Nếu ở trong nhà, hãy ra gần cửa sổ.
                </Chu>
              </>
            )}

            {buoc === 'loi' && (
              <>
                <Chu co="h2" canh="giua" mau="xau">Chưa chấm công được</Chu>
                <HopLoi loi={loi} />
                <Nut
                  chu="Thử lại"
                  kieu_nut="chinh"
                  khi_bam={() => void lay_vi_tri()}
                  style={{ alignSelf: 'stretch' }}
                />
                <Nut chu="Đóng" kieu_nut="phang" khi_bam={khi_dong} style={{ alignSelf: 'stretch' }} />
              </>
            )}

            {buoc === 'xong' && ket_qua !== null && (
              <>
                <Chu co="h1" canh="giua" mau={ket_qua.trang_thai_duyet === 'tu_dong' ? 'tot' : 'canh_bao'}>
                  {ket_qua.trang_thai_duyet === 'tu_dong' ? 'Đã chấm công' : 'Đã ghi nhận'}
                </Chu>
                <Hop
                  loai={ket_qua.trang_thai_duyet === 'tu_dong' ? 'tot' : 'luu_y'}
                  chu={ket_qua.thong_bao}
                />
                {ket_qua.dia_diem !== null && (
                  <Chu co="nho" mau="nhat" canh="giua">
                    {ket_qua.dia_diem}
                    {ket_qua.khoang_cach_m === null ? '' : ` · cách ${ket_qua.khoang_cach_m}m`}
                  </Chu>
                )}
                <Nut
                  chu="Xong"
                  kieu_nut="chinh"
                  khi_bam={() => { khi_xong(); khi_dong(); }}
                  style={{ alignSelf: 'stretch' }}
                />
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

/** Nut lon mo luong cham cong. */
export function NutChamCong(
  { trang_thai, khi_xong, tat, ly_do_tat }: {
    trang_thai: 0 | 1;
    khi_xong: () => void;
    tat?: boolean;
    ly_do_tat?: string;
  },
): ReactNode {
  const m = dung_mau();
  const [mo, dat_mo] = useState(false);
  const la_vao = trang_thai === 0;

  return (
    <>
      <Pressable
        onPress={tat === true ? undefined : () => dat_mo(true)}
        disabled={tat === true}
        accessibilityRole="button"
        accessibilityLabel={la_vao ? 'Chấm công vào' : 'Chấm công ra'}
        style={({ pressed }) => [
          {
            flex: 1,
            paddingVertical: 20,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            backgroundColor: la_vao ? m.chinh : m.nen_the,
            borderWidth: 1,
            borderColor: la_vao ? m.chinh : m.vien,
            opacity: tat === true ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Chu co="h2" style={{ color: la_vao ? m.tren_chinh : m.chu }}>
          {la_vao ? 'Chấm VÀO' : 'Chấm RA'}
        </Chu>
        <Chu co="bo" style={{ color: la_vao ? m.tren_chinh : m.chu_mo }}>
          {tat === true ? (ly_do_tat ?? 'Không khả dụng') : 'GPS + ảnh'}
        </Chu>
      </Pressable>

      {mo && (
        <HopChamCong
          trang_thai={trang_thai}
          khi_dong={() => dat_mo(false)}
          khi_xong={khi_xong}
        />
      )}
    </>
  );
}
