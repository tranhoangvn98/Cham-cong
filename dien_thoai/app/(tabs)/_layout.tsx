import type { ReactNode } from 'react';
import { Text, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { dung_mau } from '../../nguon/kieu';

/**
 * Bieu tuong tab bang ky tu Unicode: khong can thu vien icon, giam kich thuoc app
 * va tranh mot phu thuoc nua phai theo doi ban va.
 */
function BieuTuong({ ky_tu, mau }: { ky_tu: string; mau: ColorValue }): ReactNode {
  return <Text style={{ fontSize: 21, color: mau }}>{ky_tu}</Text>;
}

export default function BoCucTab(): ReactNode {
  const m = dung_mau();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: m.nen_the },
        headerTitleStyle: { color: m.chu, fontSize: 17, fontWeight: '600' },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: m.nen_the, borderTopColor: m.vien },
        tabBarActiveTintColor: m.chinh,
        tabBarInactiveTintColor: m.chu_mo,
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hôm nay',
          tabBarIcon: ({ color }) => <BieuTuong ky_tu="◫" mau={color} />,
        }}
      />
      <Tabs.Screen
        name="bang-cong"
        options={{
          title: 'Bảng công',
          tabBarIcon: ({ color }) => <BieuTuong ky_tu="▤" mau={color} />,
        }}
      />
      <Tabs.Screen
        name="don-tu"
        options={{
          title: 'Đơn từ',
          tabBarIcon: ({ color }) => <BieuTuong ky_tu="✓" mau={color} />,
        }}
      />
      <Tabs.Screen
        name="ca-nhan"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color }) => <BieuTuong ky_tu="☺" mau={color} />,
        }}
      />
    </Tabs>
  );
}
