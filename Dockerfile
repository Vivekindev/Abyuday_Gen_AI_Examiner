FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY client/package.json client/package-lock.json ./client/
RUN npm ci --prefix client
COPY . .
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/config ./config
COPY --from=build /app/db ./db
COPY --from=build /app/functions ./functions
COPY --from=build /app/models ./models
COPY --from=build /app/routes ./routes
COPY --from=build /app/public ./public
COPY --from=build /app/index.js /app/worker.js ./
EXPOSE 4040
CMD ["node", "index.js"]
