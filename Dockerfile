# 1. 빌드 스테이지
FROM node:24-slim AS builder 

# pnpm 및 필수 빌드 도구 설치 (slim 버전은 가벼워서 좋습니다)
RUN npm install -g pnpm

WORKDIR /app

# 로컬의 node_modules는 절대 복사하지 않습니다! (.dockerignore 필수)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
# 리눅스 환경에 맞는 Prisma 바이너리를 여기서 새로 생성합니다.
RUN npx prisma generate

# 2. 실행 스테이지
FROM node:24-slim AS production

WORKDIR /app

# 빌드 스테이지에서 생성된 '리눅스 전용' 모듈만 가져옵니다.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/prisma ./prisma

EXPOSE 5000

# 경로를 server/app.js로 명시
CMD ["node", "server/app.js"]