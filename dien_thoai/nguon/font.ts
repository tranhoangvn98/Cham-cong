// Nap font Be Vietnam Pro cho app.
//
// React Native tren Android KHONG suy ra do dam tu mot ho font nhu trinh duyet: dat
// fontFamily: 'BeVietnamPro' + fontWeight: '600' se ra chu thuong. Vi vay moi trong so
// duoc dang ky thanh mot ho rieng va chon bang fontFamily (xem HO_CHU trong
// token_thiet_ke.ts).
//
// Vi sao Be Vietnam Pro chu khong phai Poppins nhu spec: Poppins thieu 88/133 ky tu
// tieng Viet — xem thiet_ke/token.json.
import { useFonts } from 'expo-font';

export function nap_font(): { xong: boolean; loi: Error | null } {
  const [xong, loi] = useFonts({
    'BeVietnamPro-Regular': require('../tai_nguyen/font/BeVietnamPro-Regular.ttf'),
    'BeVietnamPro-Medium': require('../tai_nguyen/font/BeVietnamPro-Medium.ttf'),
    'BeVietnamPro-SemiBold': require('../tai_nguyen/font/BeVietnamPro-SemiBold.ttf'),
    'BeVietnamPro-Bold': require('../tai_nguyen/font/BeVietnamPro-Bold.ttf'),
  });
  return { xong, loi: loi ?? null };
}
