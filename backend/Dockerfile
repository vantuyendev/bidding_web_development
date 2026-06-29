FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install dependencies first (better Docker caching)
COPY package*.json ./
RUN npm install

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the application files
COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]