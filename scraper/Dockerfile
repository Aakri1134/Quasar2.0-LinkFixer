FROM ghcr.io/puppeteer/puppeteer:latest

USER root
WORKDIR /app

COPY package* ./

RUN npm ci

COPY . .

RUN npm run build

CMD ["npm", "run", "start"]