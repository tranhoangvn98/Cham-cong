import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doi_mat_khau } from '../nguon/api';
import { dung_phien } from '../nguon/phien';
import { dung_mau, kieu } from '../nguon/kieu';
import { Chu, Hop, HopLoi, Nhap, Nut, dung_hanh_dong } from '../nguon/thanh_phan';

export default function ManDoiMatKhau(): ReactNode {
  const m = dung_mau();
  const { nguoi_dung, lam_moi_phien } = dung_phien();
  const bat_buoc = nguoi_dung?.phai_doi_mat_khau === true;

  const [cu, dat_cu] = useState('');
  const [moi, dat_moi] = useState('');
  const [lai, dat_lai] = useState('');
  const hd = dung_hanh_dong();

  const khop = moi !== '' && moi === lai;

  const gui = async (): Promise<void> => {
    const ok = await hd.chay(
      () => doi_mat_khau(cu, moi),
      'Đã đổi mật khẩu. Vui lòng đăng nhập lại bằng mật khẩu mới.',
    );
    // May chu thu hoi moi phien sau khi doi mat khau -> phien cuc bo da bi xoa,
    // lam moi ngu canh de bo cuc goc dua ve man dang nhap.
    if (ok) setTimeout(() => void lam_moi_phien(), 1500);
  };

  return (
    <SafeAreaView style={[kieu.man, { backgroundColor: m.nen }]}>
      <KeyboardAvoidingView style={kieu.man} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[kieu.cuon, { flexGrow: 1, justifyContent: 'center' }]}>
          <View style={{ marginBottom: 4 }}>
            <Chu co="h1">Đổi mật khẩu</Chu>
            <Chu co="nho" mau="nhat">
              {bat_buoc
                ? 'Mật khẩu hiện tại do nhân sự đặt. Bạn phải đổi trước khi dùng ứng dụng.'
                : 'Đổi mật khẩu sẽ đăng xuất mọi thiết bị khác.'}
            </Chu>
          </View>

          <HopLoi loi={hd.loi} />
          {hd.tot !== null && <Hop loai="tot" chu={hd.tot} />}

          <Nhap nhan="Mật khẩu hiện tại" gia_tri={cu} khi_doi={dat_cu} mat_khau tu_dong="password" />
          <Nhap
            nhan="Mật khẩu mới"
            gia_tri={moi}
            khi_doi={dat_moi}
            mat_khau
            tu_dong="new-password"
            goi_y_duoi="Tối thiểu 8 ký tự, có cả chữ và số."
          />
          <Nhap
            nhan="Nhập lại mật khẩu mới"
            gia_tri={lai}
            khi_doi={dat_lai}
            mat_khau
            tu_dong="new-password"
            goi_y_duoi={lai !== '' && !khop ? 'Hai lần nhập chưa khớp.' : undefined}
          />

          <Nut
            chu="Đổi mật khẩu"
            kieu_nut="chinh"
            khi_bam={() => void gui()}
            dang_chay={hd.dang_chay}
            tat={!khop || cu === ''}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
