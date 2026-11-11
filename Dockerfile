FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN --network=none npm test && npm run build
RUN npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/data
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/src/tailoring.ts ./src/tailoring.ts
COPY --from=build --chown=node:node /app/src/lib/tailoring.ts ./src/lib/tailoring.ts
COPY --from=build --chown=node:node /app/src/lib/validation.ts ./src/lib/validation.ts
COPY --from=build --chown=node:node /app/src/lib/version-types.ts ./src/lib/version-types.ts
COPY --from=build --chown=node:node /app/src/types.ts ./src/types.ts
COPY --from=build --chown=node:node /app/package.json ./package.json
RUN mkdir /data && chown node:node /data
USER node
RUN --network=none node --input-type=module -e "await import('./server/app.ts')"
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server/index.ts"]
