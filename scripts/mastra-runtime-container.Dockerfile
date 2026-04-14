FROM node:22-bookworm-slim

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ENV HOST=0.0.0.0
ENV MASTRA_HOST=0.0.0.0
ENV PORT=4111

EXPOSE 4111

CMD ["pnpm", "mastra:dev"]
