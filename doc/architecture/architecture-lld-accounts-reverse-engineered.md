# [LLD] HANS SNS 계정/인증 상세 설계 (Reverse Engineering)

## 1. 인증 아키텍처 요약
- 인증은 **Firebase Auth**를 사용하며, 로그인 상태 반영은 클라이언트에서 `onAuthStateChanged`로 수행합니다.
- `src/middleware.ts`는 현재 **세션 쿠키 기반 보호 로직이 없고** 단순 통과(`NextResponse.next()`)입니다. 따라서 “권한 보호”는 각 페이지 컴포넌트의 클라이언트 라우팅 로직에 의존합니다.

## 2. 핵심 코드 경로
### 2.1 사용자 상태 훅/스토어
- `src/core/hooks/useAuth.ts`
  - `onAuthStateChanged(auth, ...)` 등록
  - `useAuthStore`에 `user`, `isLoading` 갱신
  - 로그인 성공 시 `accountManager.saveAccount(user)`를 비동기로 저장
- `src/store/useAuthStore.ts`
  - `user: User | null`, `isLoading`만 보관

### 2.2 계정 전환(LocalStorage)
- `src/core/auth/accountManager.ts`
  - LocalStorage key: `hans-recent-accounts`
  - `saveAccount`, `getAccounts`, `removeAccount` 제공
  - 최근 계정 최대 5개 유지
- `src/components/features/auth/AccountSwitcher.tsx`
  - 모달에서 localStorage 목록 노출
  - 전환 버튼은 현재 구현상 `AuthService.logOut()` 후 `/login`으로 이동

## 3. AuthService(가입/로그인/복구)
### 3.1 이메일/비밀번호 가입
- `AuthService.signUp(email, password, nickname, loginId)`
  - Firebase Auth 사용자 생성
  - Firebase Auth 프로필 `displayName` 갱신
  - Firestore `users/{uid}` 문서 생성
    - `loginId` 저장
    - `identityVerified: false`
    - `stats` 초기값

### 3.2 아이디/비밀번호 로그인(서비스 레이어에서 ID->Email 매핑)
- `AuthService.signInWithId(loginId, password)`
  - Firestore `users`에서 `loginId`로 사용자 문서를 조회
  - 매칭된 `email`을 얻은 뒤 Firebase Auth `signIn(email,password)`

### 3.3 소셜 로그인
- `AuthService.signInWithGoogle()`
  - `signInWithPopup`으로 Google Auth 수행
  - Firestore `users/{uid}`가 없으면 생성(닉네임/프로필 사진 기본값)

### 3.4 비밀번호 재설정(서버 API + Admin SDK)
- UI: `/recovery` 페이지에서 OTP 확인 후 `POST /api/auth/reset-password`
- 서버: `src/app/api/auth/reset-password/route.ts`
  - Admin SDK 초기화(환경변수 기반)
  - Firestore에서 `users`를 `loginId` + `email` 조건으로 조회
  - `admin.auth().updateUser(uid, { password: newPassword })` 수행

## 4. OTP(이메일 인증/복구) 플로우
### 4.1 코드 발송
- UI: `/signup` 및 `/recovery`에서 OTP 발송
- 서버 API: `POST /api/auth/send-code`
  - `src/app/api/auth/send-code/route.ts`
  - Nodemailer로 Gmail SMTP 전송(`EMAIL_USER`, `EMAIL_PASS` 기대)

### 4.2 코드 검증
- 현재 코드는 “서버가 OTP를 검증/저장하는 구조”가 아니라,
  - 클라이언트에서 OTP를 생성(`Math.random`), 화면에 표시되는 코드와 입력 값을 **대조**하는 형태입니다.
  - 서버는 “메일 전송 결과만 success/fail”로 반환합니다.
  - 따라서 실서비스 보안 관점에서는 추가 개선이 필요합니다(문서 내 Limitations 참조).

## 5. 라우트 보호(현 구현)
- `src/app/(auth)/*` 페이지는 공개
- 메인 페이지들은 클라이언트에서:
  - `useAuth()`로 `user`가 없으면 `/login`으로 `router.push`
- 결과적으로 “완전한 서버 단 인증 보장”은 없고, 클라이언트 보호가 주 역할입니다.

## 6. Reverse Engineering 관찰 포인트(주의/개선 대상)
- OTP는 서버 저장/검증 없이 클라이언트 비교로 동작 -> 실제 보안 수준이 낮을 수 있음
- `src/middleware.ts`는 실제 보호 로직이 없으므로 URL 직접 접근 시 UI 단계에서만 대응

---
다음 단계로 `doc/architecture/architecture-lld-settlement-reverse-engineered.md`에서
정산 계산 알고리즘과 group split 상태 전이를 정리하겠습니다.

