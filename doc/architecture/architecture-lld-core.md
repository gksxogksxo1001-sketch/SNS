# 상세 설계 (LLD): 데이터베이스 스키마 (Cloud Firestore)

## 1. 핵심 데이터 모델링 (NoSQL - Collection/Document)

Firestore는 NoSQL 기반이므로 관계형 DB와는 다르게 컬렉션(Collection)과 문서(Document) 구조로 설계합니다.

### 1.1 users (Collection)
- `{user_id}` (Document ID, Firebase Auth ID)
    - `email`: string
    - `nickname`: string
    - `avatarUrl`: string
    - `travelStyleTags`: array (e.g., ["#배낭여행", "#식도락"])
    - `totalDistance`: number
    - `createdAt`: timestamp

### 1.2 groups (Collection)
- `{group_id}` (Document ID)
    - `name`: string
    - `startDate`: timestamp
    - `endDate`: timestamp
    - `createdBy`: string (User ID)
    - `members`: array (User IDs)
    - `createdAt`: timestamp

### 1.3 posts (Collection)
- `{post_id}` (Document ID)
    - `userId`: string (FK)
    - `groupId`: string (Optional, FK)
    - `content`: string
    - `imageUrls`: array
    - `locationTag`: string
    - `lat`: number
    - `lng`: number
    - `expenseData`: map (e.g., { "flight": 350000, "stay": 200000 })
    - `visibility`: string (public/friends/private)
    - `likesCount`: number
    - `createdAt`: timestamp

### 1.4 interactions (Sub-collection of posts)
- `posts/{post_id}/comments` (Collection)
    - `{comment_id}`: document
        - `userId`: string
        - `content`: string
        - `createdAt`: timestamp
- `posts/{post_id}/likes` (Collection)
    - `{user_id}`: document (좋아요 여부 확인용)

### 1.5 expenses (Collection)
- `{expense_id}` (Document ID)
    - `groupId`: string (FK)
    - `postId`: string (FK)
    - `totalAmount`: number
    - `category`: string
    - `isSettled`: boolean
    - `createdAt`: timestamp

## 2. API 엔드포인트 설계 (Next.js API Client)

Next.js에서 Firebase SDK를 사용하여 직접 통신하거나, 보안이 필요한 경우 API Routes를 거칩니다.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/api/auth/signup` | Firebase Auth를 통한 가입 |
| GET | `/api/posts` | Firestore 'posts' 컬렉션 조회 (Pagination) |
| POST | `/api/posts` | 'posts' 컬렉션에 새 문서 생성 및 이미지 Storage 저장 |
| GET | `/api/groups/{id}/route` | 특정 그룹 ID와 연결된 포스트들의 lat/lng 정보 조회 |
| POST | `/api/expenses/settle` | 그룹 내 지출 합산 및 인원별 정산 결과 계산 |
| GET | `/api/users/{id}/profile` | 'users' 컬렉션의 특정 문서 조회 및 통계 시각화 |
