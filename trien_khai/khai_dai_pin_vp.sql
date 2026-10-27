-- Khai DAI PIN cho 2 may VP (Cong vao / Cong ra) — 28/10/2026.
--
-- VI SAO: hai may nay chua khai dai nen he thong cap PIN tu 1 den 999.999.999. PIN la danh tinh
-- TOAN CONG TY (khong loc theo may), va may VP con user cu voi cac so 1..69 — cap so thap de trung
-- voi nguoi khac. Dai 1000-2999 KHONG GIAO voi: Kho HN 4000-4999, SG 3001-3999, Kho TQ 5000-5999.
-- Ham cap PIN tu bo qua so da dung (1000-1003 dang thuoc nguoi Kho HN), nen so dau tien cap ra se
-- la 1004.
--
-- Chay lai nhieu lan khong sao (chi dat dung mot gia tri).
update thiet_bi
   set pin_tu = 1000, pin_den = 2999
 where serial in ('8116254600435', '8116254600440')
   and (pin_tu is distinct from 1000 or pin_den is distinct from 2999);

select serial, ten, pin_tu::text as tu, pin_den::text as den
from thiet_bi order by ten;
