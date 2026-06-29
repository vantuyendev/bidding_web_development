# --- Stage 1: Build the Vite React SPA ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Stage 2: Serve static files with Nginx ---
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
