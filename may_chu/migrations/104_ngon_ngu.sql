-- Song ngu Viet - Trung (xem tai_lieu/SONG-NGU-TRUNG.md): ngon ngu hien thi cua nguoi dung.
-- 'vi' mac dinh; 'zh' = tieng Trung Gian the. CSDL khong luu chu TQ nao khac —
-- moi chuoi deu nam trong tu dien may_chu/src/chuoi/, dich o lop hien thi.
alter table nguoi_dung add column ngon_ngu text not null default 'vi'
  check (ngon_ngu in ('vi', 'zh'));
