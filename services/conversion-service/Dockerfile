FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    libxcb1 \
    libx11-6 \
    libxext6 \
    libxrender1 \
    libsm6 \
    libglib2.0-0 \
    libgl1 \
    libgomp1 \
    pandoc \
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

# 3. Bake RapidOCR assets into Docling's expected artifacts tree.
RUN mkdir -p /root/.cache/docling/models/RapidOcr/torch/PP-OCRv4/det \
    /root/.cache/docling/models/RapidOcr/torch/PP-OCRv4/cls \
    /root/.cache/docling/models/RapidOcr/torch/PP-OCRv4/rec \
    /root/.cache/docling/models/RapidOcr/paddle/PP-OCRv4/rec/ch_PP-OCRv4_rec_infer \
    /root/.cache/docling/models/RapidOcr/fonts && \
    cp /usr/local/lib/python3.11/site-packages/rapidocr/models/ch_PP-OCRv4_det_infer.pth \
      /root/.cache/docling/models/RapidOcr/torch/PP-OCRv4/det/ && \
    cp /usr/local/lib/python3.11/site-packages/rapidocr/models/ch_ptocr_mobile_v2.0_cls_infer.pth \
      /root/.cache/docling/models/RapidOcr/torch/PP-OCRv4/cls/ && \
    cp /usr/local/lib/python3.11/site-packages/rapidocr/models/ch_PP-OCRv4_rec_infer.pth \
      /root/.cache/docling/models/RapidOcr/torch/PP-OCRv4/rec/ && \
    cp /usr/local/lib/python3.11/site-packages/rapidocr/models/ppocr_keys_v1.txt \
      /root/.cache/docling/models/RapidOcr/paddle/PP-OCRv4/rec/ch_PP-OCRv4_rec_infer/ && \
    (cp /usr/local/lib/python3.11/site-packages/rapidocr/fonts/FZYTK.TTF \
      /root/.cache/docling/models/RapidOcr/fonts/ || \
     cp /usr/local/lib/python3.11/site-packages/rapidocr/models/FZYTK.TTF \
      /root/.cache/docling/models/RapidOcr/fonts/ || true)

COPY app /app/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
