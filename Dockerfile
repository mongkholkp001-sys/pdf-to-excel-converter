FROM nikolaik/python-nodejs:python3.10-nodejs18

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-tha \
    libtesseract-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
