// Bo cuc goc: cung cap phien va dieu huong theo trang thai dang nhap.
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CungCapPhien, dung_phien } from '../nguon/phien';
import { DangTai } from '../nguon/thanh_phan';
import { dung_mau, kieu } from '../nguon/kieu';

/** Chuyen huong theo trang thai phien: chua dang nhap -> /dang-nhap, ... */
function CongXacThuc({ children }: { children: ReactNode }): ReactNode {
  const { dang_nap, nguoi_dung } = dung_phien();
  const doan = useSegments();
  const router = useRouter();

  const dang_o_dang_nhap = doan[0] === 'dang-nhap';
  const dang_o_doi_mat_khau = doan[0] === 'doi-mat-khau';
  const phai_doi = nguoi_dung?.phai_doi_mat_khau === true;

  useEffect(() => {
    if (dang_nap) return;

    if (nguoi_dung === null) {
      if (!dang_o_dang_nhap) router.replace('/dang-nhap');
      return;
    }
    // Tai khoan moi tao / vua bi dat lai mat khau: chan het cho den khi doi.
    if (phai_doi) {
      if (!dang_o_doi_mat_khau) router.replace('/doi-mat-khau');
      return;
    }
    if (dang_o_dang_nhap || dang_o_doi_mat_khau) router.replace('/');
  }, [dang_nap, nguoi_dung, phai_doi, dang_o_dang_nhap, dang_o_doi_mat_khau, router]);

  const m = dung_mau();
  if (dang_nap) {
    return (
      <View style={[kieu.man, kieu.giua, { backgroundColor: m.nen }]}>
        <DangTai chu="Đang mở ứng dụng…" />
      </View>
    );
  }
  return children;
}

export default function BoCucGoc(): ReactNode {
  return (
    <SafeAreaProvider>
      <CungCapPhien>
        <StatusBar style="auto" />
        <CongXacThuc>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="dang-nhap" />
            <Stack.Screen name="doi-mat-khau" />
          </Stack>
        </CongXacThuc>
      </CungCapPhien>
    </SafeAreaProvider>
  );
}
