FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:24-alpine
ARG BUILD_VERSION=0.0.1
ARG BUILD_ARCH=amd64
WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY package.json .
COPY server.js .
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV DASHBOARD_DATA_DIR=/app/data
LABEL io.hass.version="${BUILD_VERSION}" \
      io.hass.type="app" \
      io.hass.arch="${BUILD_ARCH}" \
      org.opencontainers.image.source="https://github.com/mdegrootnl/svelte5-ha-dashboard-md3" \
      org.opencontainers.image.description="Material Design 3 dashboard for Home Assistant"
CMD [ "node", "server.js" ]
