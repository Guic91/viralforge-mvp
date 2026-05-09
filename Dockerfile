FROM node:20-alpine
WORKDIR /app
COPY apps/api/package*.json ./
RUN npm ci --omit=dev
COPY apps/api/src ./src
EXPOSE 3001
CMD ["node", "src/index.js"]