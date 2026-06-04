# Stage 1: Build React static files
FROM node:20-alpine AS builder

WORKDIR /build

# Install dependencies (cache layer - include devDeps because Vite/Tailwind
# are needed for `npm run build`; devDeps are NOT copied into the runtime image)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_TELEGRAM_BOT_USERNAME=EventFlow_Bot
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_TELEGRAM_BOT_USERNAME=${VITE_TELEGRAM_BOT_USERNAME}
RUN npm run build

# Stage 2: Serve with Nginx Alpine
FROM nginx:1.27-alpine

# Copy built static files from builder
COPY --from=builder /build/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
