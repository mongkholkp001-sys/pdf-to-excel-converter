FROM nikolaik/python-nodejs:python3.10-nodejs18

WORKDIR /usr/src/app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
