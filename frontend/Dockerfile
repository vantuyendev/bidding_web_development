# --- Stage 1: Cài đặt dependencies ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# --- Stage 2: Build ứng dụng ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Tắt dữ liệu viễn thám của Next.js trong quá trình build
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# --- Stage 3: Runner (Môi trường chạy Production) ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Tạo user mới để đảm bảo bảo mật (Không chạy bằng quyền root)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Chỉ copy những file thực sự cần thiết sau khi build độc lập (Standalone)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
