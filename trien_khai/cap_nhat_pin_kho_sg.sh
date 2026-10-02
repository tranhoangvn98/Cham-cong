#!/usr/bin/env bash
# ============================================================================
# CAP NHAT MA PIN MAY KHO HA NOI VA MAY SAI GON THEO DANH SACH USER MOI (01/10/2026)
#
# Nguon danh sach: bang Excel HR cung cap, doc tu hai may:
#
#   May Sai Gon (2145254601578):
#     28 Hien | 39 Ta | 3001 Tien | 3002 Van | 3004 Ly | 3005 Son | 3007 Kly
#   May Kho Ha Noi (NYU7261300256):
#     1 Hao | 2 Ngoc | 6 Yenkho | 1000 Duydanh | 1001 Vannam | 1002 Vannon | 1003 Ngocvinh
#
# KET QUA KIEM TRA TRUOC KHI CHAY (xem cac ghi chu cuoi tep):
#   * Sai Gon: da dung het, khong sua gi.
#   * Kho: PIN 1000-1003 chua gan cho ai -> ca thang 9 bon nguoi Kho toan "vang".
#   * Kho: luot quet PIN cu 3/4/5 (01-07/09) dang tinh cho 3 nguoi VP khong lien quan.
#   * Kho: luot quet PIN 6 (29/08-19/09) dang tinh cho ERP2 (IT) nhung may khai ten "Yenkho".
#
# VIEC SCRIPT LAM (chi tiet trong .mjs, chay trong container):
#   1. Gan PIN 1000-1003 cho 4 nguoi Kho Ha Noi (qua gan_ma chinh thuc).
#   2. Gan lai luot quet 1000-1003 dang "chua map" tren may Kho.
#   3. Chuyen luot quet PIN cu 3/4/5 tren may Kho (TU 01/09) tu nguoi VP sang nguoi Kho.
#   4. Bo gan luot quet PIN 6 tren may Kho (TU 01/09) khoi ERP2 — de "chua gan".
#   5. Cap nhat bang may_nguoi_dung cho ca hai may theo danh sach moi.
#   6. Dat dai PIN may Kho 4000-4999 de "Cap PIN" tu dong khong trung VP.
#   7. Tinh lai bang cong thang 9 cho 8 nguoi anh huong.
#
# VIEC CON LAI CHO HR (script CO TINH khong lam):
#   * Thang 8 (29-31/08): cac luot quet gan nham nam trong ky luong DA DUYET. Muon sua phai
#     huy duyet ky 2026-08 truoc — viec phai co nguoi chiu trach nhiem.
#   * PIN 1 "Hao" va PIN 2 "Ngoc" may Kho: chua ro danh tinh, de chua gan.
#   * PIN 6 "Yenkho": luot quet thang 9 da bo gan; HR lap ho so xong gan lai o trang Lan quet.
#
# Chay TREN VPS (thu muc goc repo):  bash trien_khai/cap_nhat_pin_kho_sg.sh
# ============================================================================
set -euo pipefail

xanh() { printf '\033[32m%s\033[0m\n' "$*"; }
vang() { printf '\033[33m%s\033[0m\n' "$*"; }
do_()  { printf '\033[31m%s\033[0m\n' "$*"; }

[[ -f docker-compose.yml ]] || { do_ 'Hay chay trong thu muc goc repo.'; exit 1; }
[[ -f .env ]] || { do_ 'Khong thay .env.'; exit 1; }

# ---------------------------------------------------------------- sao luu
vang '=== Sao luu CSDL truoc khi sua ==='
TM="sao_luu/truoc-pin-kho-sg-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TM"
docker compose exec -T postgres pg_dump -U chamcong chamcong | gzip > "$TM/csdl.sql.gz"
xanh "  $TM/csdl.sql.gz ($(du -h "$TM/csdl.sql.gz" | cut -f1))"

# ---------------------------------------------------------------- chay trong container
vang '=== Chay cap nhat trong container may_chu ==='
docker compose cp trien_khai/cap_nhat_pin_kho_sg.mjs may_chu:/tmp/cap_nhat_pin_kho_sg.mjs
docker compose exec -T may_chu node /tmp/cap_nhat_pin_kho_sg.mjs

xanh '=== Xong. Xem ghi chu dau tep ve viec con lai cho HR (thang 8, PIN 1/2/6). ==='
