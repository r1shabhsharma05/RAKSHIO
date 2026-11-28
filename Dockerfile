# RAKSHIO — multi-stage Docker build.
# Stage 1 builds the static PWA; stage 2 serves it with nginx on port 3000.
# No env vars, no secret keys, no backend: `docker compose up` is enough.
# NOTE: `docker compose up` itself was NOT run on the build VM (no Docker
# there). The served-dist path was verified with a plain static server on
# port 3000 instead — see BUILD_LEDGER.md (Step 18).

# ---- Stage 1: build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Stage 2: serve ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
