# Single image: builds the PWA, then serves it and the API from one origin.
FROM node:22-slim AS web
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
COPY shared/ /app/shared/
RUN npx vite build

FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 RESCUE_SHARED_DIR=/app/shared
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY shared/ /app/shared/
COPY --from=web /app/frontend/dist /app/frontend/dist
RUN useradd --system --uid 10001 rescue && mkdir -p /data/storage && chown rescue /data/storage
USER rescue
ENV RESCUE_STORAGE_DIR=/data/storage
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers"]
