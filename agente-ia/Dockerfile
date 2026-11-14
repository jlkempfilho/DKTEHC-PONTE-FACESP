FROM python:3.12-slim
# poppler-utils: pdftotext do coletor
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY web ./web
COPY db ./db
COPY scripts ./scripts
COPY docs ./docs
COPY carga ./carga
# .env entra por volume somente leitura (nunca na imagem)
CMD ["python", "-m", "uvicorn", "api:app", "--app-dir", "app", "--host", "0.0.0.0", "--port", "8090"]
