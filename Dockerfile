FROM node:22-bookworm-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . .
RUN npm run build && mkdir -p /app/.questgo && chown -R node:node /app/.next /app/.questgo
ENV NODE_ENV=production
ENV PORT=3000
USER node
EXPOSE 3000
CMD ["npm", "start"]
