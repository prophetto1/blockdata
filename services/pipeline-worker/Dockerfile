# DEPRECATED: Use services/platform-api/Dockerfile instead.
# See docs/platform-api/2026-03-10-platform-api-merge.md
FROM python:3.11-slim

WORKDIR /app

# System deps for script plugins
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
