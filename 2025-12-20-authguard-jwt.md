---
date: 2025-12-20
tags:
  - ️/Dev_Log
  - Project/Onix
  - Tech/NestJS
  - Tech/JWT
  - Tech/Auth
---

# AuthGuard를 이용한 인증 파이프라인 기초 구축

##  오늘의 성과 (Achievements)
> **Commit:** `feat: implement AuthGuard for JWT authentication`

- `AuthGuard`를 구현하여 NestJS 애플리케이션의 인증 레이어 기초를 마련했습니다.
- `AuthGuard('jwt')` 상속을 통해 JWT 기반 인증을 적용할 준비를 완료했습니다.

##  기술적 의사결정 (Technical Decisions)
> **Why?** (면접 대비용 핵심 로직)

1.  **`AuthGuard` 도입:**
    - **이유:** API 엔드포인트를 보호하고, 인증된 사용자만 특정 리소스에 접근하도록 제어하기 위함입니다. NestJS의 표준적인 인증 메커니즘이며, `@UseGuards()` 데코레이터를 통해 선언적으로 가드를 적용할 수 있어 코드 중복을 줄이고 가독성을 높입니다.

2.  **`handleRequest` 메소드 오버라이딩:**
    - **이유:** `AuthGuard('jwt')`의 기본 동작은 토큰이 유효하지 않을 때 `401 Unauthorized` 에러를 반환합니다. `handleRequest`를 오버라이드하여, 인증 실패 시 "토큰 정보가 유효하지 않습니다."와 같이 프로젝트 표준에 맞는 명확한 에러 메시지를 담은 `UnauthorizedException`을 발생시키도록 커스터마이징했습니다. 이는 디버깅 효율을 높여줍니다.

##  핵심 구현 로직 (Implementation Flow)
1.  **`auth.guard.ts` 생성:** `CanActivate` 인터페이스를 구현하고 `AuthGuard('jwt')`를 상속받는 `AuthGuard` 클래스를 정의했습니다.
2.  **`handleRequest` 오버라이드:** `super.handleRequest()`를 호출하여 기본적인 검증을 수행하고, 인증 실패 시 커스텀 예외를 던지도록 로직을 작성했습니다.
3.  **`AuthModule` 등록:** `AuthModule`의 `providers` 배열에 `AuthGuard`를 등록하고, `exports` 배열에 추가하여 프로젝트 전역에서 `AuthGuard`를 사용할 수 있도록 설정했습니다.

## ⚠️ 트러블 슈팅 & 메모
- **중요:** 현재 `AuthGuard('jwt')`가 실제로 동작하려면, HTTP 요청에서 JWT를 추출하고 검증하는 로직을 담은 `JwtStrategy` 클래스가 반드시 필요합니다. 일반적으로 `src/auth/jwt.strategy.ts`와 같은 별도 파일로 만들어 `AuthModule`의 `providers`에 등록해야 합니다. 이 부분이 누락되면 `AuthGuard`가 사용된 API를 호출했을 때 NestJS가 내부적으로 에러를 발생시킵니다.
- `Guard`는 요청의 유효성을 검사하는 역할을 하며, `true`를 반환하면 요청을 통과시키고 `false`를 반환하면 차단합니다.
- `JwtStrategy`의 `validate` 메소드가 성공적으로 user 객체를 반환하면, `AuthGuard`는 이 객체를 `request.user`에 담아주므로, 이후 컨트롤러에서 `@Request()` 데코레이터를 통해 인증된 사용자 정보에 접근할 수 있습니다.

##  관련 파일
- `src/auth/auth.guard.ts`
- `src/auth/auth.module.ts`
