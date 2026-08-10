import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { thu_ket_noi } from '../nguon/api';
import { dung_phien } from '../nguon/phien';
import { dung_mau, kieu } from '../nguon/kieu';
import { Chu, Hop, HopLoi, Nhap, Nut, dung_hanh_dong } from '../nguon/thanh_phan';

export default function ManDangNhap(): ReactNode {
  const m = dung_mau();
  const { dang_nhap, dat_may_chu, dia_chi_may_chu } = dung_phien();

  const [ten, dat_ten] = useState('');
  const [mk, dat_mk] = useState('');
  const [dia_chi, dat_dia_chi] = useState(dia_chi_may_chu);
  const [sua_may_chu, dat_sua_may_chu] = useState(dia_chi_may_chu === '');
  const hd = dung_hanh_dong();

  const luu_may_chu = async (): Promise<void> => {
    const ok = await hd.chay(async () => {
      // Thu /health truoc de bao loi dia chi ngay, khong de nguoi dung nghi sai mat khau.
      await thu_ket_noi(dia_chi);
      await dat_may_chu(dia_chi);
    }, 'Đã kết nối được máy chủ.');
    if (ok) dat_sua_may_chu(false);
  };

  const vao = async (): Promise<void> => {
    await hd.chay(() => dang_nhap(ten.trim(), mk));
  };

  return (
    <SafeAreaView style={[kieu.man, { backgroundColor: m.nen }]}>
      <KeyboardAvoidingView
        style={kieu.man}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={[kieu.cuon, { flexGrow: 1, justifyContent: 'center' }]}>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <Chu co="h1">Chấm công</Chu>
            <Chu co="nho" mau="nhat" canh="giua">
              Xem bảng công, xin nghỉ phép và chấm công khi đi công tác.
            </Chu>
          </View>

          <HopLoi loi={hd.loi} />
          {hd.tot !== null && <Hop loai="tot" chu={hd.tot} />}

          {sua_may_chu ? (
            <>
              <Hop
                loai="tin"
                chu={'Nhập địa chỉ máy chủ chấm công của công ty. Nhân sự sẽ cho bạn địa chỉ này. '
                  + 'Điện thoại phải cùng mạng nội bộ với máy chủ, hoặc máy chủ phải có địa chỉ công khai.'}
              />
              <Nhap
                nhan="Địa chỉ máy chủ"
                gia_tri={dia_chi}
                khi_doi={dat_dia_chi}
                goi_y="192.168.1.10:8080"
                tu_dong="off"
                goi_y_duoi="Ví dụ: 192.168.1.10:8080 hoặc chamcong.congty.vn"
              />
              <Nut
                chu="Kiểm tra và lưu"
                kieu_nut="chinh"
                khi_bam={() => void luu_may_chu()}
                dang_chay={hd.dang_chay}
                tat={dia_chi.trim() === ''}
              />
              {dia_chi_may_chu !== '' && (
                <Nut chu="Quay lại" kieu_nut="phang" khi_bam={() => dat_sua_may_chu(false)} />
              )}
            </>
          ) : (
            <>
              <Nhap
                nhan="Tên đăng nhập"
                gia_tri={ten}
                khi_doi={dat_ten}
                tu_dong="username"
                goi_y="Nhân sự cấp cho bạn"
              />
              <Nhap
                nhan="Mật khẩu"
                gia_tri={mk}
                khi_doi={dat_mk}
                mat_khau
                tu_dong="password"
              />
              <Nut
                chu="Đăng nhập"
                kieu_nut="chinh"
                khi_bam={() => void vao()}
                dang_chay={hd.dang_chay}
                tat={ten.trim() === '' || mk === ''}
              />
              <Nut
                chu={`Máy chủ: ${dia_chi_may_chu}`}
                kieu_nut="phang"
                khi_bam={() => {
                  dat_dia_chi(dia_chi_may_chu);
                  hd.xoa();
                  dat_sua_may_chu(true);
                }}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
