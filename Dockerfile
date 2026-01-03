# 1단계 빌드 (Dependencies & Build)
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# 의존성 설치를 위해 package 파일들 먼저 복사 (캐싱 활용)
COPY package*.json ./

# 빌드에 필요한 모든 의존성 설치
RUN npm install

# 소스 코드 복사 및 빌드
COPY . .
RUN npm run build

# 2단계: 실행 (Production Run)
FROM node:20-alpine

WORKDIR /usr/src/app

# 환경 변수 설정
ENV NODE_ENV=production

# 실행에 필요한 package 파일 복사
COPY package*.json ./

# 프로덕션용 의존성만 설치 (devDependencies 제외)
RUN npm install --only=production

# 빌드 단계에서 생성된 dist 폴더만 복사
COPY --from=builder /usr/src/app/dist ./dist

# 애플리케이션 실행
EXPOSE 3000
CMD ["node", "dist/main"]