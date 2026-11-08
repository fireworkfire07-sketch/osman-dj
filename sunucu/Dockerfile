FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/opt/hf VERI=/veri

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

# Yapay zekâ (CPU sürümü, ekran kartı gerekmez)
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

# Ses ayırma modelini imaja göm: ilk şarkıda indirme beklenmesin
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs')"

# Her güncellemede YouTube indiricisini tazele (kur.sh GUNCEL'i günün tarihi yapar)
ARG GUNCEL=0
RUN echo "guncel=$GUNCEL" && pip install -U "yt-dlp[default]"

COPY app.py isleyici.py ./
COPY static ./static

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD curl -fs http://localhost:8000/saglik || exit 1
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
