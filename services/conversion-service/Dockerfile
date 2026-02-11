FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DOCLING_ARTIFACTS_PATH=/root/.cache/docling/models

RUN apt-get update && apt-get install -y --no-install-recommends \
    libxcb1 \
    libx11-6 \
    libxext6 \
    libxrender1 \
    libsm6 \
    libglib2.0-0 \
    libgl1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -U pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# 1. Download docling model artifacts (layout, tableformer, OCR, etc.)
#    into $DOCLING_ARTIFACTS_PATH.  This is the reliable, documented CLI.
RUN docling-tools models download

# 2. Warm up the full PDF pipeline to also pull any HuggingFace Hub
#    snapshots that docling-tools doesn't cover.  Non-fatal: the build
#    still succeeds if warmup fails (models from step 1 may suffice).
COPY warmup.py /tmp/warmup.py
RUN python /tmp/warmup.py ; rm /tmp/warmup.py

COPY app /app/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
