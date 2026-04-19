# TTS sidecar – Chatterbox Multilingual HTTP service.
# The actual model weights are pulled at first run; swap the image for a
# Qwen3-TTS variant by changing the build context in docker-compose.yml.
FROM python:3.11-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py ./
ENV PORT=9020
EXPOSE 9020

HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD curl -fsS http://localhost:${PORT}/healthz || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "9020"]
