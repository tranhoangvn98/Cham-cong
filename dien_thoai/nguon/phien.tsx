// Ngu canh phien dang nhap dung chung cho toan app.
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import * as Device from 'expo-device';
import {
  dang_nhap as api_dang_nhap,
  dang_xuat as api_dang_xuat,
  dat_may_chu as api_dat_may_chu,
  may_chu,
  nap_phien_da_luu,
  type NguoiDung,
  type Phien,
} from './api';

interface NgamPhien {
  dang_nap: boolean;
  nguoi_dung: NguoiDung | null;
  dia_chi_may_chu: string;
  dang_nhap: (ten: string, mat_khau: string) => Promise<void>;
  dang_xuat: () => Promise<void>;
  dat_may_chu: (dia_chi: string) => Promise<void>;
  /** Doc lai phien tu SecureStore — goi sau khi doi mat khau. */
  lam_moi_phien: () => Promise<void>;
}

const Ngam = createContext<NgamPhien | null>(null);

export function CungCapPhien({ children }: { children: ReactNode }): ReactNode {
  const [dang_nap, dat_dang_nap] = useState(true);
  const [nguoi_dung, dat_nguoi_dung] = useState<NguoiDung | null>(null);
  const [dia_chi_may_chu, dat_dia_chi] = useState('');

  useEffect(() => {
    void (async () => {
      const p = await nap_phien_da_luu();
      dat_nguoi_dung(p?.nguoi_dung ?? null);
      dat_dia_chi(may_chu());
      dat_dang_nap(false);
    })();
  }, []);

  const dang_nhap = useCallback(async (ten: string, mat_khau: string): Promise<void> => {
    // Ten thiet bi giup nhan vien nhan ra phien nao la cua may nao khi can thu hoi.
    const mo_ta = `${Device.manufacturer ?? ''} ${Device.modelName ?? 'Điện thoại'}`.trim();
    const p: Phien = await api_dang_nhap(ten, mat_khau, mo_ta);
    dat_nguoi_dung(p.nguoi_dung);
  }, []);

  const dang_xuat = useCallback(async (): Promise<void> => {
    await api_dang_xuat();
    dat_nguoi_dung(null);
  }, []);

  const dat_may_chu = useCallback(async (dia_chi: string): Promise<void> => {
    await api_dat_may_chu(dia_chi);
    dat_dia_chi(may_chu());
  }, []);

  const lam_moi_phien = useCallback(async (): Promise<void> => {
    const p = await nap_phien_da_luu();
    dat_nguoi_dung(p?.nguoi_dung ?? null);
  }, []);

  const gia_tri = useMemo<NgamPhien>(
    () => ({
      dang_nap, nguoi_dung, dia_chi_may_chu,
      dang_nhap, dang_xuat, dat_may_chu, lam_moi_phien,
    }),
    [dang_nap, nguoi_dung, dia_chi_may_chu, dang_nhap, dang_xuat, dat_may_chu, lam_moi_phien],
  );

  return <Ngam.Provider value={gia_tri}>{children}</Ngam.Provider>;
}

export function dung_phien(): NgamPhien {
  const v = useContext(Ngam);
  if (v === null) throw new Error('dung_phien phai nam trong CungCapPhien.');
  return v;
}
