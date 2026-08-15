# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────
# deps — 의존성 설치 + prisma client 생성
#   node:24-slim(Debian glibc)을 쓴다. alpine(musl)은 bcrypt prebuilt가
#   없어 매번 컴파일해야 하고 실패도 잦다.
# ─────────────────────────────────────────────────────────────
FROM node:24-slim AS deps
WORKDIR /app

# bcrypt는 네이티브 애드온이라 prebuilt를 못 받으면 직접 컴파일한다.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# postinstall이 `prisma generate`를 실행하므로 스키마와 설정이 먼저 있어야 한다.
COPY package.json yarn.lock ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# prisma.config.ts가 PRISMA_URL을 읽는다. generate는 DB에 접속하지 않지만
# 값이 비어 있으면 datasource 해석에서 막히므로 빌드용 더미를 넣는다.
# 실행 시점에는 .env의 실제 값으로 덮인다.
ENV PRISMA_URL=mysql://build:build@127.0.0.1:3306/build

RUN yarn install --frozen-lockfile

# ─────────────────────────────────────────────────────────────
# build — nest build
# ─────────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app
COPY . .
RUN yarn build

# ─────────────────────────────────────────────────────────────
# runtime
# ─────────────────────────────────────────────────────────────
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# prisma CLI로 마이그레이션을 돌릴 때 필요하다(`prisma migrate deploy`).
COPY package.json yarn.lock ./
COPY prisma ./prisma
COPY prisma.config.ts ./

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000

# 주의: dist/main 이 아니라 dist/src/main 이다.
# prisma.config.ts가 컴파일 대상에 포함돼 rootDir이 저장소 루트로 잡히는 탓에
# 산출물이 dist/src/ 아래에 생긴다. tsconfig.build.json에서 제외하면
# dist/main 으로 바뀌므로 그때 이 줄도 함께 고쳐야 한다.
CMD ["node", "dist/src/main"]
