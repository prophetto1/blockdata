FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

ENV DOCLING_CACHE_DIR=/opt/docling-cache \
    HF_HOME=/opt/hf

COPY requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -U pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Pre-download Docling's PDF pipeline assets into the image.
# Instantiating DocumentConverter() is not sufficient to pull all HF assets
# needed for PDF layout/table/OCR; explicitly download Docling's default model set.
RUN mkdir -p /opt/docling-cache /opt/hf && \
    python -c "from docling.utils.model_downloader import download_models; download_models()"

COPY app /app/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
