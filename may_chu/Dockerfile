# Build tu thu muc GOC cua repo:  docker build -f may_chu/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app

# Cai phu thuoc truoc, tan dung cache khi ma nguon doi ma phu thuoc khong doi.
COPY package.json package-lock.json ./
COPY may_chu/package.json ./may_chu/
COPY web/package.json ./web/
RUN npm ci --workspace may_chu --include-workspace-root

COPY may_chu ./may_chu
RUN npm run --workspace may_chu build

# Bo phu thuoc dev khoi anh cuoi.
RUN npm prune --omit=dev --workspace may_chu --include-workspace-root

# npm workspaces keo (hoist) phu thuoc len /app/node_modules; /app/may_chu/node_modules
# CHI ton tai khi co xung dot phien ban buoc phai long vao trong. Voi bo phu thuoc hien
# tai thi khong co, nen COPY o anh chay se vo. Tao san thu muc rong de COPY luon chay
# duoc, dong thoi van giu duoc phu thuoc long neu sau nay phat sinh.
RUN mkdir -p /app/may_chu/node_modules

# ---------------------------------------------------------------- anh chay
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# ---------------------------------------------------------------- cong cu doc tep
#
# Ba chuong trinh cho viec "quet noi dung hop dong chuyen sang text":
#
#   poppler-utils          pdftotext (doc lop chu cua PDF) + pdftoppm (rasterise de OCR)
#   tesseract-ocr          OCR ban scan
#   tesseract-ocr-data-vie du lieu tieng Viet. THIEU GOI NAY thi OCR van chay nhung doc
#                          bang tieng Anh: chu tieng Viet se mat dau.
#
# NEU BUOC NAY LOI vi ten goi doi trong ban Alpine moi: may chu VAN CHAY BINH THUONG khi
# thieu ca ba — chi rieng viec trich noi dung se bao "may chu chua cai ...". Trang
# "Hop dong" trong webapp hien san may chu dang co nhung gi, nen khong phai doan.
RUN apk add --no-cache poppler-utils tesseract-ocr tesseract-ocr-data-vie

# Chay bang nguoi dung thuong, khong phai root.
#
# PHAI TAO SAN CA HAI THU MUC, ke ca khi ca hai deu la volume duoc gan luc chay.
#
# Docker khoi tao mot named volume RONG theo noi dung cua anh tai duong dan gan — KE CA
# QUYEN SO HUU. Thu muc co trong anh va thuoc node:node thi volume thuoc node:node. Thu
# muc KHONG co trong anh thi Docker tu tao diem gan, va no thuoc ROOT.
#
# LOI DA XAY RA THAT: ban dau dong nay chi tao `anh_cham_cong`. Anh selfie cham cong ghi
# duoc binh thuong, con `/du_lieu/ho_so` thuoc root nen tien trinh `node` bi EACCES —
# KHONG MOT TEP HO SO NAO LUU DUOC ke tu dau, va trieu chung duy nhat la HTTP 500. Volume
# sao luu hang thang vi the luon rong ma khong ai thay la la.
RUN mkdir -p /du_lieu/anh_cham_cong /du_lieu/ho_so && chown -R node:node /du_lieu

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/may_chu/node_modules ./may_chu/node_modules
COPY --from=build --chown=node:node /app/may_chu/dist ./may_chu/dist
COPY --from=build --chown=node:node /app/may_chu/migrations ./may_chu/migrations
COPY --from=build --chown=node:node /app/may_chu/package.json ./may_chu/

USER node
WORKDIR /app/may_chu
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
