# Build stage
FROM node:22.23.3-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# Production runtime stage with lightweight nginx
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config with MIME types and client-side routing
RUN echo 'server { \
    listen 5173; \
    include /etc/nginx/mime.types; \
    default_type application/octet-stream; \
    location /api/ { \
        proxy_pass http://backend:8000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
