# Optional reproducible build (plan §8: Docker is optional, no VPS needed).
#   docker build -t erechnung-finder .
#   docker run --rm -p 8080:80 erechnung-finder   → http://localhost:8080
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run test && npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
