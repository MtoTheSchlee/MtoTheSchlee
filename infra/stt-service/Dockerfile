# STT sidecar – faster-whisper HTTP service.
# Default runs on CPU with int8; override env for GPU deployments.
FROM python:3.11-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py ./
ENV PORT=9010
EXPOSE 9010

HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD curl -fsS http://localhost:${PORT}/healthz || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "9010"]
