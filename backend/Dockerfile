# --- Stage 1: Cài đặt tất cả dependencies ---
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

# --- Stage 2: Cài đặt duy nhất các thư viện chạy Production ---
FROM node:20-alpine AS production-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# --- Stage 3: Thực thi ứng dụng ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Tạo user bảo mật
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=production-deps /app/node_modules ./node_modules
COPY . .

# Thay đổi quyền sở hữu thư mục cho appuser
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 5000

CMD ["node", "src/index.js"]
