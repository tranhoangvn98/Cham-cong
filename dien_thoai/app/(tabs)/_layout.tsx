import type { ReactNode } from 'react';
import { Text, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { dung_mau, HO_CHU } from '../../nguon/kieu';

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
        headerTitleStyle: { color: m.chu, fontSize: 17, fontFamily: HO_CHU.dam },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: m.nen_the, borderTopColor: m.vien },
        // `chinh_dam` chu khong phai `chinh`: nhan tab la chu, can 4.5:1.
        tabBarActiveTintColor: m.chinh_dam,
        tabBarInactiveTintColor: m.chu_nhat,
        tabBarLabelStyle: { fontSize: 11.5, fontFamily: HO_CHU.dam },
      }}
    >
      {/* Bon tab theo Phu luc B: Trang chu · Bang cong · Luong · Ca nhan. */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
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
        name="luong"
        options={{
          title: 'Lương',
          tabBarIcon: ({ color }) => <BieuTuong ky_tu="₫" mau={color} />,
        }}
      />
      <Tabs.Screen
        name="ca-nhan"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color }) => <BieuTuong ky_tu="☺" mau={color} />,
        }}
      />

      {/*
        Don tu KHONG nam tren thanh tab (Phu luc B chi cho 4 tab) nhung van la mot man
        rieng, vao tu the "Can chu y" o Trang chu. `href: null` giu route va an khoi
        thanh tab. Truong phong co don cho duyet se thay so dem tren the o Trang chu —
        khong de luong duyet bi chon.
      */}
      <Tabs.Screen name="don-tu" options={{ title: 'Đơn từ', href: null }} />
    </Tabs>
  );
}
