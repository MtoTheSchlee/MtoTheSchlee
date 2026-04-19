"""TTS sidecar – Chatterbox Multilingual HTTP service.

Contract (stable, used by @kk/speech ChatterboxTtsAdapter):

GET  /healthz                       -> {"ok": true, "voices": [...]}
POST /v1/synthesize                 -> audio/wav
     body JSON: {"text": "...", "voice": "de-female-warm",
                  "format": "wav", "watermark": false,
                  "voice_profile_ref": null}

For local dev without the heavy Chatterbox weights, this service falls
back to a sine-tone WAV so the full pipeline is testable end-to-end.
Production images should ship the real model and replace `_synthesize`.
"""
from __future__ import annotations

import io
import math
import os
import struct
import wave
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

VOICE_DEFAULT = os.getenv("VOICE_DEFAULT", "de-female-warm")
SAMPLE_RATE = 22050

app = FastAPI(title="KK-OS TTS", version="0.1.0")


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10_000)
    voice: str = VOICE_DEFAULT
    format: str = "wav"
    watermark: bool = False
    voice_profile_ref: str | None = None


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    return {
        "ok": True,
        "default_voice": VOICE_DEFAULT,
        "voices": [VOICE_DEFAULT, "de-male-calm", "de-female-bright"],
    }


def _synthesize_stub(text: str, watermark: bool) -> bytes:
    """Deterministic sine-tone WAV so the full pipeline is testable.

    Real deployments replace this with a Chatterbox Multilingual call.
    """
    duration_s = min(10.0, max(0.4, len(text) * 0.06))
    freq = 220.0 if not watermark else 221.3  # tiny shift = proxy watermark
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        n = int(SAMPLE_RATE * duration_s)
        for i in range(n):
            v = int(0.2 * 32767 * math.sin(2 * math.pi * freq * (i / SAMPLE_RATE)))
            w.writeframesraw(struct.pack("<h", v))
    return buf.getvalue()


@app.post("/v1/synthesize")
def synthesize(req: SynthesizeRequest) -> Response:
    if req.format.lower() != "wav":
        raise HTTPException(400, "only wav supported in stub")
    audio = _synthesize_stub(req.text, watermark=req.watermark)
    headers = {
        "x-kkos-voice": req.voice,
        "x-kkos-watermark": "1" if req.watermark else "0",
    }
    return Response(content=audio, media_type="audio/wav", headers=headers)
