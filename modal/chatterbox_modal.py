import modal
import io
import warnings
import logging
import os

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)
logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("diffusers").setLevel(logging.ERROR)

app = modal.App("chatterbox-tts")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install([
        "chatterbox-tts",
        "torch",
        "torchaudio",
        "fastapi",
        "python-multipart",
    ])
    .run_commands(
        "python -c \"from chatterbox.tts import ChatterboxTTS; ChatterboxTTS.from_pretrained('cpu')\""
    )
)

# Load model once when container starts, not on every request
with image.imports():
    import torch
    import torchaudio
    from chatterbox.tts import ChatterboxTTS

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = ChatterboxTTS.from_pretrained(device=device)


@app.function(
    image=image,
    gpu="A10G",
    timeout=60,
    scaledown_window=60,
    secrets=[modal.Secret.from_name("tts-env")],
)
@modal.fastapi_endpoint(method="POST")
async def generate_tts(item: dict):
    phrase = item.get("phrase", "")
    voice_id = item.get("voice_id", "default")
    exaggeration = item.get("exaggeration", 0.5)

    if not phrase:
        return {"error": "phrase is required"}, 400

    wav = model.generate(
        phrase,
        exaggeration=exaggeration,
    )

    buffer = io.BytesIO()
    torchaudio.save(buffer, wav, model.sr, format="wav")
    buffer.seek(0)

    import base64
    audio_b64 = base64.b64encode(buffer.read()).decode("utf-8")

    return {
        "audio_b64": audio_b64,
        "sample_rate": model.sr,
        "format": "wav",
    }