# Multi-stage build for production
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN npm install --workspaces --include-workspace-root
COPY frontend ./frontend
RUN npm run build --workspace=frontend

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY backend/package.json ./backend/
RUN npm install --omit=dev --workspace=backend --include-workspace-root
COPY backend ./backend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
EXPOSE 4000
CMD ["npm", "run", "start"]
