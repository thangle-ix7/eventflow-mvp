# Stage 1: Build React static files
FROM node:20-alpine AS builder

WORKDIR /build

# Install dependencies (cache layer — include devDeps because Vite/Tailwind
# are needed for `npm run build`; devDeps are NOT copied into the runtime image)
COPY package.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx Alpine
FROM nginx:1.27-alpine

# Copy built static files from builder
COPY --from=builder /build/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
