# [LLD] HANS SNS 메인 클라이언트 설계 (Reverse Engineering)

## 1. 앱 라우팅 구조 (Next.js App Router)
이 프로젝트는 `src/app/**/page.tsx` 기준으로 도메인 화면을 구성합니다.

### 1.1 핵심 경로 매핑
- `/` : `src/app/page.tsx`  
  - `useAuth()` 상태에 따라 `/feed` 또는 `/login`으로 라우팅(로딩 스피너 표시)
- Auth
  - `/login` : `src/app/(auth)/login/page.tsx` (`AuthService.signInWithId`, Google 로그인)
  - `/signup` : `src/app/(auth)/signup/page.tsx` (OTP 발송 후 Firebase Auth 가입)
  - `/recovery` : `src/app/(auth)/recovery/page.tsx` (Find ID / Reset Password)
- Main Layout
  - `src/app/(main)/layout.tsx`  
    - PC: `SideNav`(왼쪽 고정) + `RightPanel`(우측 고정)
    - 모바일: `BottomNav`
    - 맵/채팅방에서는 우측 패널/하단 탭 숨김 처리
- Main Domain
  - Feed: `/feed` (`src/app/(main)/feed/page.tsx`)
  - Stories: Feed 페이지 내부 `Stories` 컴포넌트로 노출
  - Posts
    - 상세: `/post/[id]` (PostCard 재사용)
    - 작성: `/post/create` (포스트 작성 + 이미지/태그/위치/비용)
    - 수정: `/post/edit/[id]`
  - Map(Discovery): `/map` (Places/Geolocation + `postService.subscribeToPosts`)
  - Groups: `/groups` (GroupList/GroupCreate/GroupInvite + 그룹 게시물)
  - Notifications: `/notifications` (notificationService 구독 + swipe/delete + 요청 수락/거절)
  - Messaging: `/messages` (채팅방 목록)
  - ChatRoom: `/messages/[id]` (실시간 메시지 + reply/edit/delete + settlement 요청 모달)
  - Settlement
    - 리스트: `/settlement` (정산 그룹 overview)
    - 상세: `/settlement/[id]` (정산 계산/요청/입금확인/지출 추가/삭제)
  - Profile
    - 내 프로필: `/profile` (자기 게시물/좋아요/북마크 + 설정/스토리 보관함)
    - 공개 프로필: `/profile/[id]` (친구 신청/수락/거절 + 공개 정보/게시물)
  - Search: `/search` (사용자 검색/장소 검색)

## 2. Presentation 구성요소 (UI 레이어)
### 2.1 네비게이션/레이아웃 컴포넌트
- `src/components/layout/SideNav.tsx`
  - notification/message unread badge는 Firestore 구독 결과를 사용
- `src/components/layout/RightPanel.tsx`
  - 친구 추천/사람 검색 UI
  - (코드 기준) 검색 로직은 `userService.searchUsers("")` 호출이지만, 서비스에서 빈 문자열은 빈 배열을 반환하므로 추천 로직이 제한적일 수 있음
- `src/components/common/BottomNav.tsx`
  - 모바일 하단 탭

### 2.2 공통 모달
- `src/components/common/UIModals.tsx`
  - `ConfirmModal`, `AlertModal`
- `src/components/common/PowerPopup.tsx`
  - 하단 시트(모바일) + 오버레이 팝업(상대적으로 큰 UI)

## 3. Business Logic/서비스 호출 패턴
### 3.1 클라이언트에서 직접 Firebase SDK 호출
- 대부분의 CRUD/도메인 로직은 다음 서비스 레이어를 통해 처리됩니다.
  - `src/core/firebase/postService.ts`
  - `src/core/firebase/userService.ts`
  - `src/core/firebase/groupService.ts`
  - `src/core/firebase/storyService.ts`
  - `src/core/firebase/messageService.ts`
  - `src/core/firebase/notificationService.ts`
  - `src/core/firebase/settlementService.ts`

### 3.2 실시간 처리(onSnapshot)
- `postService.subscribeToPosts(cb)`
  - 지도/필터에 사용
- `notificationService.subscribeToNotifications(uid, cb)`
  - 알림 리스트 실시간 반영 + 읽음 처리
- `messageService.subscribeToUserRooms(uid, cb)`
  - 메시지방 목록 갱신
- `messageService.subscribeToMessages(roomId, cb)`
  - 채팅방의 메시지 실시간 갱신

## 4. 서버 사이드(API Routes) 역할
- `src/app/api/auth/send-code/route.ts`
  - Nodemailer로 OTP 코드 이메일 발송
- `src/app/api/auth/reset-password/route.ts`
  - Firebase Admin SDK로 비밀번호 업데이트

## 5. 상태 관리 (Zustand)
- `src/core/hooks/useAuth.ts`
  - Firebase Auth `onAuthStateChanged`로 `useAuthStore` 상태 업데이트
- `src/store/useAuthStore.ts`
  - `user`, `isLoading`만 보관
- `src/store/useSettlementStore.ts`
  - 현재 정산 생성 UI 일부에서 사용되지만, 실제 정산 계산/저장은 `settlementService` 중심입니다.

---
다음 단계로 `doc/architecture/architecture-lld-accounts-reverse-engineered.md`에서
인증/계정 전환/복구 플로우(OTP/비밀번호 재설정)를 코드 기준으로 정리하겠습니다.

