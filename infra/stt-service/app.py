"""STT sidecar – faster-whisper HTTP service.

Contract (stable, used by @kk/speech FasterWhisperSttAdapter):

GET  /healthz                     -> {"ok": true, "model": "..."}
POST /v1/transcribe  (multipart)  -> {"text": "...", "language": "de",
                                       "duration_ms": 1234,
                                       "segments": [{"start": 0.0,
                                                     "end": 1.1,
                                                     "text": "..."}]}
     form fields: file (audio), language?, model?, prompt?

The adapter layer owns retries, timeouts, tenant scoping and storage.
This service is intentionally small and stateless.
"""
from __future__ import annotations

import os
import tempfile
import time
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

try:
    from faster_whisper import WhisperModel  # type: ignore
except Exception:  # pragma: no cover - dev stub when lib missing
    WhisperModel = None  # type: ignore

MODEL_NAME = os.getenv("MODEL", "large-v3")
DEVICE = os.getenv("DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("COMPUTE_TYPE", "int8")
LANGUAGE = os.getenv("LANGUAGE", "de")

app = FastAPI(title="KK-OS STT", version="0.1.0")
_model: Any = None


def get_model() -> Any:
    global _model
    if _model is None:
        if WhisperModel is None:
            raise RuntimeError("faster_whisper is not installed")
        _model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE)
    return _model


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    return {"ok": True, "model": MODEL_NAME, "device": DEVICE}


@app.post("/v1/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str | None = Form(default=None),
    model: str | None = Form(default=None),
    prompt: str | None = Form(default=None),
) -> dict[str, Any]:
    if model and model != MODEL_NAME:
        raise HTTPException(400, f"model '{model}' not loaded; server runs '{MODEL_NAME}'")

    started = time.monotonic()
    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    segments_out: list[dict[str, Any]] = []
    text_parts: list[str] = []
    try:
        segments, info = get_model().transcribe(
            tmp_path,
            language=language or LANGUAGE,
            vad_filter=True,
            initial_prompt=prompt,
        )
        for seg in segments:
            segments_out.append(
                {"start": float(seg.start), "end": float(seg.end), "text": seg.text}
            )
            text_parts.append(seg.text)
        duration_ms = int((time.monotonic() - started) * 1000)
        return {
            "text": "".join(text_parts).strip(),
            "language": info.language,
            "duration_ms": duration_ms,
            "segments": segments_out,
        }
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
