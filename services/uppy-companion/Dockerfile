FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY index.js ./

RUN mkdir -p /tmp/companion-data

EXPOSE 3020

CMD ["node", "index.js"]
