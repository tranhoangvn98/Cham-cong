import { useEffect, useState, type ReactNode } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { goi, may_chu } from '../../nguon/api';
import { dung_phien } from '../../nguon/phien';
import { dung_mau, kieu } from '../../nguon/kieu';
import {
  Chu, DangTai, Hop, HopLoi, Nut, The, dung_hanh_dong, dung_nap,
} from '../../nguon/thanh_phan';

interface ThongTinToi {
  ten_dang_nhap: string;
  vai_tro: string;
  ho_ten: string | null;
  ma_nv: string | null;
  phong_ban: string | null;
  duoc_cham_cong_dien_thoai: boolean | null;
  mui_gio_offset_gio: number;
}

const TEN_VAI_TRO: Record<string, string> = {
  admin: 'Quản trị',
  nhan_su: 'Nhân sự',
  truong_phong: 'Trưởng phòng',
  nhan_vien: 'Nhân viên',
};

export default function ManCaNhan(): ReactNode {
  const m = dung_mau();
  const router = useRouter();
  const { dang_xuat } = dung_phien();
  const { du_lieu, dang_tai, loi } = dung_nap<ThongTinToi>('/api/xac-thuc/toi');
  const hd = dung_hanh_dong();
  const [trang_thai_push, dat_trang_thai_push] = useState<string | null>(null);

  // Dang ky nhan thong bao day (nghi phep duoc duyet, nhac quen quet...).
  useEffect(() => {
    void (async () => {
      // Gia lap khong co push token that.
      if (!Device.isDevice) {
        dat_trang_thai_push('Thông báo đẩy chỉ hoạt động trên máy thật, không chạy trên giả lập.');
        return;
      }
      try {
        const hien_tai = await Notifications.getPermissionsAsync();
        let trang_thai = hien_tai.status;
        if (trang_thai !== 'granted' && hien_tai.canAskAgain) {
          trang_thai = (await Notifications.requestPermissionsAsync()).status;
        }
        if (trang_thai !== 'granted') {
          dat_trang_thai_push('Chưa bật thông báo. Bạn sẽ không được nhắc khi đơn được duyệt.');
          return;
        }

        // projectId lay tu cau hinh EAS; khong co thi khong xin duoc token Expo.
        const project_id =
          (Constants.expoConfig?.extra?.['eas'] as { projectId?: string } | undefined)?.projectId
          ?? (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
        if (project_id === undefined) {
          dat_trang_thai_push(
            'Chưa cấu hình EAS projectId nên không đăng ký được thông báo đẩy. '
            + 'Chạy "eas init" trước khi build bản phát hành.',
          );
          return;
        }

        const token = await Notifications.getExpoPushTokenAsync({ projectId: project_id });
        await goi('/api/toi/token-push', {
          method: 'POST',
          body: { token: token.data, nen_tang: Device.osName ?? 'unknown' },
        });
        dat_trang_thai_push(null);
      } catch (e) {
        dat_trang_thai_push(`Không đăng ký được thông báo đẩy: ${(e as Error).message}`);
      }
    })();
  }, []);

  const ra = (): void => {
    Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất khỏi ứng dụng?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => void hd.chay(() => dang_xuat()),
      },
    ]);
  };

  return (
    <ScrollView style={[kieu.man, { backgroundColor: m.nen }]} contentContainerStyle={kieu.cuon}>
      <HopLoi loi={loi} />
      <HopLoi loi={hd.loi} />

      {dang_tai && du_lieu === null ? (
        <DangTai />
      ) : du_lieu === null ? null : (
        <>
          <The>
            <Chu co="h1">{du_lieu.ho_ten ?? du_lieu.ten_dang_nhap}</Chu>
            <View style={kieu.cot}>
              <MucThongTin nhan="Mã nhân viên" gia_tri={du_lieu.ma_nv ?? '—'} />
              <MucThongTin nhan="Phòng ban" gia_tri={du_lieu.phong_ban ?? '—'} />
              <MucThongTin
                nhan="Vai trò"
                gia_tri={TEN_VAI_TRO[du_lieu.vai_tro] ?? du_lieu.vai_tro}
              />
              <MucThongTin nhan="Tên đăng nhập" gia_tri={du_lieu.ten_dang_nhap} />
              <MucThongTin
                nhan="Chấm công bằng điện thoại"
                gia_tri={du_lieu.duoc_cham_cong_dien_thoai === true ? 'Được phép' : 'Không'}
              />
            </View>
          </The>

          {trang_thai_push !== null && <Hop loai="luu_y" chu={trang_thai_push} />}

          <The>
            <Chu co="h3">Máy chủ</Chu>
            <Chu co="nho" mau="nhat" style={kieu.so}>{may_chu()}</Chu>
            <Chu co="bo" mau="mo">
              Múi giờ tính công: UTC+{du_lieu.mui_gio_offset_gio}. Mọi giờ trong ứng dụng hiển thị
              theo múi giờ này, không theo cài đặt của điện thoại.
            </Chu>
          </The>

          <Nut chu="Đổi mật khẩu" khi_bam={() => router.push('/doi-mat-khau')} />
          <Nut chu="Đăng xuất" kieu_nut="nguy" khi_bam={ra} dang_chay={hd.dang_chay} />

          <Chu co="bo" mau="mo" canh="giua">
            Chấm công · phiên bản {Constants.expoConfig?.version ?? '1.0.0'}
          </Chu>
        </>
      )}
    </ScrollView>
  );
}

function MucThongTin({ nhan, gia_tri }: { nhan: string; gia_tri: string }): ReactNode {
  return (
    <View style={kieu.hang_deu}>
      <Chu co="nho" mau="nhat">{nhan}</Chu>
      <Chu co="nho" dam>{gia_tri}</Chu>
    </View>
  );
}
