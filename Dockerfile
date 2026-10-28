FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

RUN pip install fastapi uvicorn pydantic

COPY . .

EXPOSE 8000

CMD ["python", "main.py"]
