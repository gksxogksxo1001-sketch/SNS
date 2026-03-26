# [HLD] HANS SNS 하이레벨 아키텍처 설계서 (Reverse Engineering)

## 1. 시스템 아키텍처 개요
이 프로젝트는 **Next.js (App Router)** 기반의 웹 클라이언트가 **Firebase SDK(클라이언트 측)** 를 직접 호출하는 구조입니다.  
서버 사이드 API Route는 주로 **이메일 OTP 발송** 및 **비밀번호 재설정(Admin SDK)** 용으로만 제한적으로 사용됩니다.

핵심 특징은 다음과 같습니다.
- 인증/데이터 접근: `firebase/auth`, `firebase/firestore`, `firebase/storage` 를 **브라우저에서 직접 사용**
- 실시간성: Firestore `onSnapshot` 구독으로 **알림/채팅/피드 일부** 가 실시간 반영
- 외부 연동: Google Maps/Places는 지도 렌더링과 장소 검색/자동완성에 사용

## 2. 시스템 구성요소

### Mermaid (대략적 구성요소/흐름)
```mermaid
graph LR
  U((User))
  Next[Next.js App Router<br/>Client Components]
  Zustand[Zustand Stores]

  subgraph Firebase[Firebase]
    Auth[Firebase Auth]
    Firestore[(Firestore)]
    Storage[Storage]
  end

  subgraph ServerAPI[Next.js API Routes]
    OTP[/api/auth/send-code<br/>(Nodemailer SMTP)]
    Reset[/api/auth/reset-password<br/>(Admin SDK)]
  end

  subgraph External[External APIs]
    GMaps[Google Maps SDK]
    Places[Google Places Autocomplete/Details]
  end

  U --> Next
  Next --> Zustand
  Next --> Auth
  Next --> Firestore
  Next --> Storage

  Next --> GMaps
  Next --> Places

  Next --> OTP
  Next --> Reset

  Firestore -- onSnapshot --> Next
  Firestore -- documents --> Next
```

## 3. 레이어별 책임 (Responsibility Map)
- **Presentation Layer (Next.js Client Components)**  
  - 페이지/레이아웃: `src/app/**/page.tsx`, `src/app/**/layout.tsx`
  - 공통 UI: `src/components/common/*`, `src/components/layout/*`
  - 기능별 UI: `src/components/features/**`
- **Business Logic Layer (Firebase 기반 서비스/유틸)**  
  - `src/core/services/AuthService.ts`: 가입/로그인/비밀번호 재설정(사용자 정의 ID 기반)
  - `src/core/firebase/*Service.ts`: Firestore/Storage CRUD 및 도메인 로직
  - `src/core/hooks/useAuth.ts`: `onAuthStateChanged`로 사용자 상태 반영
- **Data Access Layer (Firebase SDK 직접 호출)**  
  - `src/core/firebase/config.ts`: Firebase App 초기화, `auth/db/storage` export

## 4. 대표 데이터 흐름

### 4.1 인증 흐름
1. `src/app/page.tsx`에서 `useAuth()` 로딩 완료 후 로그인 여부에 따라 `/feed` 또는 `/login`으로 라우팅
2. `useAuth()`는 `onAuthStateChanged(auth, ...)`를 등록하고 `users` 도큐먼트 기반 UI를 구성
3. 이메일 인증(회원가입/복구)은 `POST /api/auth/send-code` 호출 후 코드 입력 검증
4. 비밀번호 재설정은 `POST /api/auth/reset-password` 로 Admin SDK를 통해 업데이트

### 4.2 실시간 알림 흐름
1. `notificationService.subscribeToNotifications(user.uid, cb)`에서 Firestore 쿼리 구독
2. UI는 구독 결과를 렌더링하고, 필요 시 `markAllAsRead`로 `isRead` 업데이트

### 4.3 실시간 채팅/메시지 흐름
1. 채팅 목록: `messageService.subscribeToUserRooms(user.uid, cb)`  
2. 채팅방: `messageService.subscribeToMessages(roomId, cb)`로 메시지 실시간 반영
3. 방에 진입 시 `messageService.markRoomAsRead(roomId, user.uid)` 호출

### 4.4 피드/지도 연동
- 피드: `postService.getPosts(user?.uid)`로 가시성(visibility) 필터링
- 지도: `postService.subscribeToPosts(cb)` 구독 후 `post.location` 좌표가 있는 문서만 지도 마커로 렌더링

## 5. 기술 스택 요약
- Framework: Next.js (App Router)
- UI: React + Tailwind CSS (Tailwind v4 + CSS variables 기반)
- State: Zustand (`useAuthStore`, `useSettlementStore`)
- Backend/Realtime: Firebase Auth + Firestore + Storage
- Maps/Places: `@vis.gl/react-google-maps` (AdvancedMarker, Places Autocomplete/Details)
- Email OTP/비번재설정: Next.js API Route + Nodemailer / Firebase Admin SDK

## 6. Reverse Engineering 결과 요약 (중요한 구현 관찰)
- 미들웨어(`src/middleware.ts`)는 현재 **실질적인 Firebase 세션 검증을 수행하지 않으며**, 클라이언트 훅/페이지에서 라우팅 보호를 주로 수행합니다.
- 푸시는 Firestore 기반 UI 갱신(구독) 중심이며, **FCM(푸시 알림 인프라)은 코드에서 직접 사용 흔적이 제한적**입니다.
- “태그 기반 위치 자동 추출”(`postService.extractLocationFromTags`)은 현재 **lat/lng를 채우지 않는 형태**이며, 지도 노출 로직은 `lat/lng` 존재를 요구합니다.

---
다음 단계로, `doc/architecture/architecture-lld-data-reverse-engineered.md`에서 **Firestore 컬렉션/필드/관계를 코드 기준으로 정리**하고,  
`doc/architecture/architecture-lld-main-reverse-engineered.md`에서 **라우팅/서비스 호출 구조**를 문서화하겠습니다.

