# [LLD] HANS SNS 상세 설계서 (DB & API)

## 1. 데이터베이스 스키마 설계 (Firestore)

### 1.1 Users (사용자)
- **Collection**: `users`
- **Fields**:
  - `uid` (string, PK): Firebase Auth UID
  - `nickname` (string): 사용자 닉네임
  - `avatarUrl` (string): 프로필 이미지 경로
  - `travelStyle` (string): 여행 스타일 (배낭여행, 미식 등)
  - `friends` (array<string>): 팔로우/친구 UID 리스트
  - `fcmToken` (string): 푸시 알림용 토큰
  - `updatedAt` (timestamp): 최종 수정 시간

### 1.2 Groups (여행 그룹)
- **Collection**: `groups`
- **Fields**:
  - `id` (string, PK): 자동 생성 ID
  - `name` (string): 여행 팀명
  - `description` (string): 여행 설명
  - `members` (array<string>): 그룹 멤버 UID 리스트
  - `ownerId` (string): 그룹 소유자 UID
  - `createdAt` (timestamp): 생성일

### 1.3 Posts (여행 기록 게시물)
- **Collection**: `posts`
- **Fields**:
  - `id` (string, PK): 자동 생성 ID
  - `groupId` (string, Index): 소속 그룹 ID (개인 게시물인 경우 null)
  - `userId` (string): 작성자 UID
  - `content` (string): 본문 텍스트
  - `images` (array<string>): 이미지 URL 리스트
  - `locationTags` (array<object>): 태그 기반 위치 정보
    - `name` (string): 장소명
    - `address` (string): 주소
    - `geo` (geopoint): 위경도 좌표
  - `expenses` (object): 지출 정보
    - `plane` (number): 항공료
    - `stay` (number): 숙박비
    - `transport` (number): 교통비
    - `extra` (number): 기타 비용
  - `isPublic` (boolean): 공개 여부
  - `likes` (number): 좋아요 수
  - `createdAt` (timestamp): 작성 시간

### 1.4 Settlements (정산 내역)
- **Collection**: `settlements`
- **Fields**:
  - `groupId` (string, PK): 그룹 ID와 1:1 관계 (또는 여행 차수별 생성)
  - `totalAmount` (number): 그룹 총 지출액
  - `perMemberAmount` (number): 1인당 분담 자금
  - `memberStatus` (map<string, boolean>): 멤버별 정산 완료 여부 (uid: boolean)
  - `updatedAt` (timestamp): 최종 업데이트

## 2. 주요 서비스 API (인터페이스) 명세

### 2.1 GroupService
- `createGroup(data: GroupData): Promise<string>`: 그룹 생성 및 생성자 멤버 추가.
- `inviteMember(groupId: string, email: string): Promise<void>`: 이메일을 통한 멤버 초대 알림 발송.
- `getGroupMembers(groupId: string): Promise<UserProfile[]>`: 그룹 멤버 프로필 정보 조회.

### 2.2 PostService (Extended)
- `createGroupPost(groupId: string, postData: PostData): Promise<string>`: 그룹 전용 게시물 작성.
- `updatePostLocationFromTags(content: string): Promise<LocationTag[]>`: 본문 내 `#장소` 태그 분석 및 위치 좌표 추출 (Google Places API 연동).
- `getTravelPath(groupId: string): Promise<PathData>`: 그룹 내 모든 게시물의 위치를 시간순으로 정렬하여 경로 데이터 생성.

### 2.3 SettlementService
- `calculateSettlement(groupId: string): Promise<SettlementResult>`: 그룹 내 모든 게시물의 `expenses` 합산 및 1인당 금액 계산.
- `togglePaymentStatus(groupId: string, userId: string, isPaid: boolean): Promise<void>`: 특정 멤버의 정산 완료 상태 토글.

## 3. 알림 시스템 엔드포인트
- `POST /api/notify`: 특정 사용자 또는 그룹에게 푸시 알림 발송 (Cloud Functions).
  - Body: `{ to: string[], title: string, body: string, data: object }`

---
**이 상세 설계안을 바탕으로 실제 구현을 위한 [Implementation Plan]을 수립하겠습니다.**
