// Doi chieu schema THAT cua ERP 1 voi schema ma cac phep do dang gia dinh.
//
// VI SAO CAN CONG CU NAY:
//
// SQL cua phep do viet theo schema SUY RA tu ma nguon ERP 1 (`WriteDbContextModelSnapshot.cs`
// cua erp_logistic, `EFContextModelSnapshot.cs` / `MyDbContextModelSnapshot.cs` cua
// erp_manager). Nguon do dang tin o muc kha cao — EF sinh ra chinh DDL do — nhung KHONG thay
// the viec soi CSDL that: cot them tay, view, doi ten sau nang cap deu khong phan anh trong
// ma nguon.
//
// Va kieu hong o day rat kho thay: mot cot doi ten khong lam vong quet bao loi, no chi lam
// truy van tra 0 dong. Nhin y het "khong co canh bao nao".
//
// Cong cu nay bien cai im lang do thanh mot bao cao doc duoc. Chay:
//
//     npm --workspace may_chu run doi_chieu_schema
//
// tren MOT MAY CO MANG toi ERP 1. Thoat ma 1 neu co bang/cot thieu ma phep do dang bat.
import { doc_tren_database, ten_database_cua, bat_giam_sat, thong_diep_loi } from './ket_noi_erp.ts';
import { truy_van } from '../csdl/ket_noi.ts';
import { MA_NGUON, type MaNguon } from './nguon.ts';

/** Mot bang ma phep do can doc, kem cac cot no dung. */
export interface BangCan {
  nguon: MaNguon;
  /** Ten schema. Chuoi rong = schema mac dinh (public). */
  schema: string;
  bang: string;
  cot: readonly string[];
  /** Cac phep do dung bang nay — de bao cao noi ro hong cai gi. */
  phep_do: readonly string[];
}

/**
 * SCHEMA KY VONG — khai bao thu cong, doi chieu voi SQL trong `phep_do/*`.
 *
 * KHONG tu suy ra tu chuoi SQL: phan tich SQL bang bieu thuc chinh quy la thu dung duoc
 * 90% truong hop roi sai im lang o 10% con lai. Khai tay thi nguoi sua phep do phai sua o
 * day, va do la dieu ta MUON — no buoc nguoi ta doi dien voi cau hoi "bang nay co that
 * khong".
 */
export const SCHEMA_KY_VONG: readonly BangCan[] = [
  // ---------------------------------------------------------------- sale
  {
    nguon: 'sale', schema: 'sale', bang: 'tbl_DonHang',
    cot: ['Id', 'Ma_don_hang', 'Total', 'MissaStatus', 'PAYMENT_STATUS', 'EditOrderStatus',
      'DateConvertToBh', 'CreatedUtcDate', 'Fk_nhanvien_id', 'Fk_khach_hang_id',
      'Fk_lohang_id', 'SaleCode', 'IsDelete'],
    phep_do: ['pkl_chua_co_sau_n_gio', 'pkl_tao_muon', 'don_sua_sau_chot', 'don_sua_nhieu_lan',
      'don_sua_giam_tien', 'don_sua_khong_qua_duyet', 'don_giam_tru_ty_le_cao',
      'don_tong_bang_khong', 'don_trung_khach_ngay_tien', 'don_sua_len'],
  },
  {
    nguon: 'sale', schema: 'sale', bang: 'tbl_OrderHistory',
    cot: ['Id', 'Fk_order_Id', 'Action', 'ChangedByUserId', 'ChangedDate',
      'OldDataJson', 'NewDataJson', 'IsDelete'],
    phep_do: ['don_sua_sau_chot', 'don_sua_nhieu_lan', 'don_sua_giam_tien', 'don_sua_len'],
  },
  {
    nguon: 'sale', schema: 'sale', bang: 'tbl_SaleOpportunity',
    cot: ['Id', 'sysCode', 'ClientCode', 'ClientName', 'Phone', 'ProductName', 'UserId',
      'CustomerId', 'OrderId', 'OrderCode', 'status', 'Level', 'ProductWeight', 'Volume',
      'CreatedUtcDate', 'IsDelete'],
    phep_do: ['co_hoi_trung_sdt', 'co_hoi_trung_khach', 'co_hoi_khong_dinh_danh',
      'co_hoi_sao_bat_thuong', 'co_hoi_chot_khong_don'],
  },
  {
    nguon: 'sale', schema: 'sale', bang: 'tbl_DonHangEditRequest',
    cot: ['Id', 'Fk_order_Id', 'Status', 'IsDelete'],
    phep_do: ['don_sua_khong_qua_duyet'],
  },
  {
    nguon: 'sale', schema: 'sale', bang: 'tbl_GiamTruDonHang',
    cot: ['Id', 'Fk_order_id', 'MaDonHang', 'Amount', 'CreatedBy', 'CreatedUtcDate',
      'IsDelete'],
    phep_do: ['don_giam_tru_ty_le_cao'],
  },
  {
    nguon: 'sale', schema: 'sale', bang: 'tbl_OrderM',
    cot: ['Id', 'SysCode', 'Note', 'Total', 'Fk_container_id', 'Fk_order_id',
      'Fk_provider_id', 'Nhom_dich_vu', 'CreatedBy', 'CreatedUtcDate', 'IsDelete'],
    phep_do: ['chi_phi_khong_gan_lo'],
  },

  // ---------------------------------------------------------------- kho (erp_logistic)
  {
    nguon: 'kho', schema: '', bang: 'PackingList',
    cot: ['Id', 'PackingListCode', 'PackingListName', 'OrderId', 'Status',
      'NumberOfPackage', 'UserId', 'CreatedUtcDate', 'IsDeleted'],
    phep_do: ['pkl_chua_co_sau_n_gio', 'pkl_tao_muon', 'pkl_cho_nhap_kho_lau',
      'ghi_khong_xac_thuc'],
  },
  {
    nguon: 'kho', schema: '', bang: 'RepositoryChecks',
    cot: ['Id', 'RepositoryCheckCode', 'MismatchReason', 'Status', 'OrderCode',
      'CustomerCode', 'TransportFee', 'DomesticFreight', 'UserId', 'CreatedUtcDate',
      'IsDeleted'],
    phep_do: ['nkct_lech_lon', 'cuoc_sua_len', 'ghi_khong_xac_thuc'],
  },
  {
    nguon: 'kho', schema: '', bang: 'Tax',
    cot: ['Id', 'Code', 'ContainerId', 'UserId', 'TaxStatus', 'SlaStatus',
      'FinishedDateTimeUTC', 'ApprovedDateTimeUTC', 'CreatedUtcDate', 'IsDeleted'],
    phep_do: ['to_khai_sla_cham', 'to_khai_gio_duyet', 'to_khai_treo_chua_duyet',
      'ghi_khong_xac_thuc'],
  },

  // ---------------------------------------------------------------- hola
  {
    nguon: 'hola', schema: 'usr', bang: 'tbl_DX_chi',
    cot: ['Id', 'sysCode', 'Noi_dung_chi', 'So_tien_chi', 'FK_User_id', 'FK_Approve_id',
      'Trang_Thai', 'ProviderCode', 'IsBankOK', 'IsCassoOK', 'CreatedDate',
      'LastUpdateTime', 'IsDeleted'],
    phep_do: ['chi_tu_de_xuat_tu_duyet', 'chi_duyet_sieu_toc', 'chi_duyet_ngoai_gio',
      'chi_khong_chung_tu', 'chi_trung_tien_ncc', 'chi_lech_sao_ke'],
  },
  {
    nguon: 'hola', schema: 'logs', bang: 'tbl_dxChiStepLog',
    cot: ['PK_history_id', 'FK_DxChi_id', 'ApproveId', 'ApproveName', 'Appreved_At',
      'Status', 'StepOrder', 'Amount'],
    phep_do: ['chi_tu_de_xuat_tu_duyet', 'chi_duyet_sieu_toc', 'chi_duyet_ngoai_gio'],
  },
  {
    nguon: 'hola', schema: 'usr', bang: 'tbl_Image',
    cot: ['PK_index_id', 'FK_dxchi_id'],
    phep_do: ['chi_khong_chung_tu'],
  },
  {
    nguon: 'hola', schema: 'thu', bang: 'tbl_dx_thu',
    cot: ['Id', 'sysCode', 'So_Tien', 'Fk_User_Id', 'Ma_Khach_Hang', 'Noi_Dung_Thu',
      'IsDifference', 'CreatedDate', 'IsDeleted'],
    phep_do: ['thu_lech_ton_lau'],
  },
  {
    nguon: 'hola', schema: 'transaction', bang: 'tbl_bank_transaction',
    cot: ['Id', 'SysCode', 'BankName', 'BankAccount', 'SoTienGhiCo', 'Description',
      'TransactionDate', 'IsMatched', 'IsDeleted'],
    phep_do: ['giao_dich_bank_chua_khop'],
  },
  {
    nguon: 'hola', schema: '', bang: 'Shipments',
    cot: ['Id', 'MaVanDon', 'MaHeThongVanDon', 'MaKhachHang', 'TenCongTyVanChuyen',
      'SoKien', 'CuocVanChuyenNoiDia', 'CuocVanChuyenBuuCucKho', 'CuocXeNang',
      'CuocCongNhan', 'NgayBill', 'fk_user_id', 'IsDeleted'],
    phep_do: ['cuoc_don_gia_vuot'],
  },

  // ---------------------------------------------------------------- debt
  {
    nguon: 'debt', schema: 'manage_debt', bang: 'dbt_customer',
    cot: ['Id', 'Code', 'Name', 'Phone', 'DebtAmount', 'CreditLimit', 'TotalReceipts',
      'OwnerId', 'SaleCustomerId', 'CreatedUtcDate', 'UpdatedDate', 'IsDelete'],
    phep_do: ['cong_no_vuot_han_muc', 'cong_no_khong_phat_sinh_thu'],
  },
  {
    nguon: 'debt', schema: 'manage_debt', bang: 'dbt_employees',
    cot: ['Id', 'EmployeeName', 'DebtAmount', 'IsDelete'],
    phep_do: ['cong_no_nhan_vien_cao'],
  },
  {
    nguon: 'debt', schema: 'manage_debt', bang: 'dbt_provider_debts',
    cot: ['Id', 'Code', 'ProviderName', 'ProviderId', 'CurrentDebt', 'TotalIncurred',
      'TotalPaymented', 'GroupName', 'IsDelete'],
    phep_do: ['ncc_no_am'],
  },

  // ---------------------------------------------------------------- logs
  {
    nguon: 'logs', schema: 'xnk_logs', bang: 'EmployeeActionLog',
    cot: ['Id', 'EmployeeId', 'Name', 'Page', 'tableName', 'Action', 'CreatedUtcDate',
      'IsDelete'],
    phep_do: ['thao_tac_ngay_nghi', 'thao_tac_ngoai_ca'],
  },
];

export interface KetQuaBang {
  nguon: MaNguon;
  bang: string;
  /** 'ok' | 'thieu_bang' | 'thieu_cot' | 'khong_doc_duoc' | 'nguon_chua_cau_hinh' */
  tinh_trang: 'ok' | 'thieu_bang' | 'thieu_cot' | 'khong_doc_duoc' | 'nguon_chua_cau_hinh';
  cot_thieu: string[];
  cot_thua: string[];
  thong_diep: string | null;
  phep_do: readonly string[];
  /** true neu co it nhat mot phep do cua bang nay dang duoc bat trong cau hinh. */
  dang_dung: boolean;
}

/** Cac ma phep do dang duoc bat (co dieu kien bat + loai loi bat + nhom bat). */
async function phep_do_dang_bat(): Promise<Set<string>> {
  const ds = await truy_van<{ phep_do: string }>(
    `select distinct dk.phep_do
       from dieu_kien_loi dk
       join loai_loi ll on ll.id = dk.loai_loi_id
       join loai_canh_bao cb on cb.id = ll.loai_canh_bao_id
      where dk.dang_bat = true and ll.dang_bat = true and cb.dang_bat = true`,
  );
  return new Set(ds.map((d) => d.phep_do));
}

/** Doi chieu toan bo schema ky vong voi ERP 1. */
export async function doi_chieu(): Promise<KetQuaBang[]> {
  const dang_bat = await phep_do_dang_bat();
  const db_cua_nguon = new Map<MaNguon, string | null>();
  for (const n of MA_NGUON) db_cua_nguon.set(n, await ten_database_cua(n));

  const ra: KetQuaBang[] = [];
  for (const b of SCHEMA_KY_VONG) {
    const chung: Pick<KetQuaBang, 'nguon' | 'bang' | 'phep_do' | 'dang_dung'> = {
      nguon: b.nguon,
      bang: b.schema === '' ? b.bang : `${b.schema}.${b.bang}`,
      phep_do: b.phep_do,
      dang_dung: b.phep_do.some((p) => dang_bat.has(p)),
    };

    const ten_db = db_cua_nguon.get(b.nguon) ?? null;
    if (ten_db === null) {
      ra.push({ ...chung, tinh_trang: 'nguon_chua_cau_hinh', cot_thieu: [], cot_thua: [],
        thong_diep: `Nguồn "${b.nguon}" chưa chọn database hoặc đang tắt.` });
      continue;
    }

    try {
      const cot_that = await doc_tren_database<{ column_name: string; data_type: string }>(
        ten_db,
        `select column_name, data_type
           from information_schema.columns
          where table_name = $1
            and ($2 = '' or table_schema = $2)
            and table_schema not in ('pg_catalog','information_schema')`,
        [b.bang, b.schema],
      );

      if (cot_that.length === 0) {
        ra.push({ ...chung, tinh_trang: 'thieu_bang', cot_thieu: [...b.cot], cot_thua: [],
          thong_diep: 'Không tìm thấy bảng này trong database đã chọn.' });
        continue;
      }

      const co = new Set(cot_that.map((c) => c.column_name));
      const thieu = b.cot.filter((c) => !co.has(c));
      const can = new Set(b.cot);
      const thua = cot_that.map((c) => c.column_name).filter((c) => !can.has(c));

      ra.push({
        ...chung,
        tinh_trang: thieu.length === 0 ? 'ok' : 'thieu_cot',
        cot_thieu: thieu,
        // `cot_thua` chi de tham khao: bang ERP 1 co them cot la binh thuong, khong phai loi.
        cot_thua: thua,
        thong_diep: thieu.length === 0
          ? null
          : `Thiếu ${thieu.length} cột mà phép đo đang dùng.`,
      });
    } catch (loi) {
      ra.push({ ...chung, tinh_trang: 'khong_doc_duoc', cot_thieu: [], cot_thua: [],
        thong_diep: thong_diep_loi(loi) });
    }
  }
  return ra;
}

/** Bao cao dang chu cho lenh CLI. Tra ve `true` neu co van de CHAN (phep do dang bat bi hong). */
export function in_bao_cao(kq: readonly KetQuaBang[], in_ra: (s: string) => void): boolean {
  const NHAN: Record<KetQuaBang['tinh_trang'], string> = {
    ok: 'OK        ',
    thieu_cot: 'THIEU COT ',
    thieu_bang: 'THIEU BANG',
    khong_doc_duoc: 'KHONG DOC ',
    nguon_chua_cau_hinh: 'CHUA C.HINH',
  };

  in_ra('');
  in_ra('DOI CHIEU SCHEMA ERP 1 <-> PHEP DO CUA MODULE GIAM SAT');
  in_ra('='.repeat(78));

  let chan = false;
  for (const r of kq) {
    const dau = r.dang_dung ? '*' : ' ';
    in_ra(`${dau} ${NHAN[r.tinh_trang]} ${r.nguon.padEnd(5)} ${r.bang}`);
    if (r.thong_diep !== null) in_ra(`      ${r.thong_diep}`);
    if (r.cot_thieu.length > 0) in_ra(`      Cot thieu: ${r.cot_thieu.join(', ')}`);
    if (r.tinh_trang !== 'ok' && r.dang_dung) {
      chan = true;
      in_ra(`      => CHAN: cac phep do dang BAT dung bang nay: ${r.phep_do.join(', ')}`);
    }
  }

  const so_ok = kq.filter((r) => r.tinh_trang === 'ok').length;
  in_ra('='.repeat(78));
  in_ra(`${so_ok}/${kq.length} bang khop. Dau '*' = co phep do dang bat dung bang do.`);
  if (chan) {
    in_ra('');
    in_ra('CO VAN DE CHAN: mot phep do dang BAT tro toi bang/cot khong ton tai.');
    in_ra('Truy van cua no se tra 0 dong ma khong bao loi — tuc la khong bat duoc gi,');
    in_ra('nhung nhin y het "khong co canh bao nao". Sua SQL phep do hoac tat dieu kien.');
  } else {
    in_ra('Khong co phep do dang bat nao tro toi bang/cot thieu.');
  }
  in_ra('');
  return chan;
}

export function bat_duoc(): boolean {
  return bat_giam_sat();
}
