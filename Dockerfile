# ==================== Build Stage ====================
FROM node:20-alpine AS builder

# pnpm 설치
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 의존성 파일 복사 및 설치
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY . .

# Prisma Client 생성
RUN npx prisma generate

# ==================== Production Stage ====================
FROM node:20-alpine AS production

# pnpm 설치
RUN corepack enable && corepack prepare pnpm@latest --activate

# 보안: non-root 사용자 생성
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# 필요한 파일만 복사
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --chown=nodejs:nodejs . .

# Prisma Client 생성 (production용)
RUN npx prisma generate

# 사용자 전환
USER nodejs

# 포트 노출
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 서버 시작
CMD ["node", "app.js"]