# [LLD] HANS SNS 데이터/보안 상세 설계 (Reverse Engineering)

## 1. Firestore 컬렉션/도큐먼트 스키마 (코드 기준)

본 문서는 **현재 코드가 읽고 쓰는 Firestore 컬렉션과 필드**를 도메인 단위로 정리합니다.  
Fire­s­tore Security Rules 자체는 레포에 포함되어 있지 않으므로, 아래 보안은 “서비스 호출 패턴을 기준으로 예상되는 규칙” 형태로 기술합니다.

### Mermaid (논리 관계)
```mermaid
erDiagram
  USERS {
    string uid PK
    string email
    string nickname
    string avatarUrl
    string loginId
    boolean identityVerified
    map stats
    array friends
    array closeFriends
    array visitedCountries
    timestamp createdAt
    timestamp updatedAt
  }

  GROUPS {
    string id PK
    string name
    string description
    string ownerId
    array members
    string status "ongoing|completed"
    string settlementStatus "ongoing|completed"
    map splitStates "from_to -> requested|paid"
    timestamp createdAt
    timestamp updatedAt
    string startDate
    string endDate
  }

  POSTS {
    string id PK
    string user.uid
    string user.name
    string? groupId
    string content
    array tags
    array images
    map? location {name,address,lat,lng}
    map? expenses {plane,stay,transport,food,other}
    number totalExpense
    string visibility "public|friends|close_friends"
    number likes
    array likedBy
    array? bookmarkedBy
    number comments
    timestamp createdAt
  }

  STORIES {
    string id PK
    string userId
    map user {uid,name,image}
    string mediaUrl
    string type "image|video"
    string visibility
    timestamp createdAt
    timestamp expiresAt
    array viewedBy
    number likesCount
    array likedBy
  }

  CHATROOMS {
    string id PK
    string type "direct|group"
    array participants
    string? name
    string? groupImage
    map? lastMessage {text,createdAt,senderId}
    map unreadCount "{[userId]: number}"
    timestamp updatedAt
  }

  MESSAGES {
    string id PK
    string roomId
    string senderId
    string text
    string type "text|settlement|storyReply|postShare|settlementSummary"
    timestamp createdAt
    boolean isRead
    array likes
    boolean isEdited
    boolean isDeleted
    map? settlementData {title,amountToPay,bankAccount,isSettled}
    map? storyData {mediaUrl,storyId}
    map? postShareData {postId,postImage,postTitle,authorName}
    map? replyTo {id,text,senderId,senderName}
    map? settlementSummaryData {groupId,groupName,totalAmount,splitCount}
  }

  NOTIFICATIONS {
    string id PK
    string uid "recipient"
    string type
    string fromUid
    string fromNickname
    string fromAvatarUrl
    string? postId
    string? groupId
    string? postImage
    string? content
    boolean isRead
    timestamp createdAt
  }

  FRIENDREQUESTS {
    string id PK
    string fromUid
    string toUid
    string status "pending|accepted|declined"(코드에서는 pending 중심)
    timestamp createdAt
  }

  EXPENSES {
    string id PK
    string groupId
    string title
    number amount
    string paidBy
    array participants
    string category (숙박/교통/식비/액티비티/기타)
    timestamp/date/string date
  }
```

## 2. 컬렉션별 필드/용도 (코드 맵)

### 2.1 `users`
- Document ID: `uid` (Firebase Auth UID)
- 핵심 필드
  - `email`, `loginId`, `nickname`, `avatarUrl`
  - `identityVerified` (signup 시 false로 생성)
  - `stats`: `totalPosts`, `totalCountries`, `totalDistance` (signup 시 초기값 존재)
  - 관계/프로필
    - `friends: string[]`
    - `closeFriends: string[]`
    - `visitedCountries: string[]`
    - `travelStyle?: string`
  - `createdAt`, `updatedAt`

### 2.2 `posts`
- Document ID: `postId`
- 핵심 필드
  - `user`: `{ uid, name, image, group? }` (코드에서 posts.user에 해당 구조를 넣고 읽음)
  - `groupId?: string | null` (close_friends 그룹 공유일 때 사용)
  - `content`, `tags: string[]`, `images: string[]`
  - `location?: { name, address, lat, lng } | null`
  - `expenses?: { plane, stay, transport, food, other }`
  - `totalExpense: number`
  - `visibility: "public" | "friends" | "close_friends"`
  - 소셜
    - `likes: number`, `likedBy: string[]`
    - `bookmarkedBy?: string[]`
    - `comments: number`
  - `createdAt: serverTimestamp`

#### comments 서브컬렉션
- `posts/{postId}/comments`
  - `user`, `content`, `createdAt`

### 2.3 `stories`
- Document ID: `storyId`
- 핵심 필드
  - `userId`
  - `user`: `{ uid, name, image }`
  - `mediaUrl`, `type`, `visibility`
  - `createdAt`, `expiresAt`
  - `viewedBy: string[]`
  - `likesCount: number`, `likedBy: string[]`

### 2.4 `chatRooms`
- Document ID: `roomId`
- 핵심 필드
  - `type: "direct" | "group"`
  - `participants: string[]`
  - `name?: string`, `groupImage?: string`
  - `lastMessage?: { text, createdAt, senderId }`
  - `unreadCount?: Record<string, number>`
  - `updatedAt: serverTimestamp`

#### messages 서브컬렉션
- `chatRooms/{roomId}/messages`
  - `senderId`, `text`, `type`
  - `createdAt`, `isRead`
  - likes 및 편집/삭제 상태: `likes`, `isEdited`, `isDeleted`
  - 메시지 타입별 payload
    - `settlementData?: { title, amountToPay, bankAccount, isSettled? }`
    - `storyData?: { mediaUrl, storyId }`
    - `postShareData?: { postId, postImage, postTitle?, authorName }`
    - `settlementSummaryData?: { groupId, groupName, totalAmount, splitCount }`
    - `replyTo?: { id, text, senderId, senderName? }`

### 2.5 `notifications`
- Document ID: `notificationId`
- 핵심 필드
  - `uid`: recipient
  - `type`: 예) like/comment/friend_request/group_invite/settlement_request/settlement_pay 등
  - `fromUid`, `fromNickname`, `fromAvatarUrl`
  - `postId?`, `groupId?`, `postImage?`, `content?`
  - `isRead`, `createdAt`

### 2.6 `friendRequests`
- Document ID: `requestId`
- 핵심 필드
  - `fromUid`, `toUid`, `status`, `createdAt`

### 2.7 `groups`
- Document ID: `groupId` (코드에서는 travel group과 chat room을 같은 ID로 매핑하는 경향)
- 핵심 필드
  - `name`, `description`
  - `ownerId`
  - `members: string[]`
  - `status?: "ongoing" | "completed"`
  - `settlementStatus?: "ongoing" | "completed"`
  - `startDate?`, `endDate?`
  - `splitStates?: Record<string, "requested" | "paid">`  
    - key: `${fromUserId}_${toUserId}`
  - `createdAt`, `updatedAt`

### 2.8 `expenses`
- Document ID: `expenseId`
- 핵심 필드
  - `groupId`, `title`, `amount`, `paidBy`
  - `participants: string[]`
  - `category` (ExpenseCategory: 숙박/교통/식비/액티비티/기타)
  - `date` (Timestamp | Date | string)

## 3. 인덱싱/쿼리 패턴 (코드 관찰 기반)
- `posts`:
  - `orderBy("createdAt", "desc")`
  - visibility 필터링은 일부 코드에서 “클라이언트 단”으로 처리
  - `getPostsByGroup`: `where("groupId","==",groupId)` + 별도 orderBy 제거(복합 인덱스 회피)
- `chatRooms`:
  - `where("participants","array-contains", userId)` 형태로 구독
  - 정렬은 client-side로 처리하는 로직이 존재
- `notifications`, `friendRequests`, `stories`, `expenses` 역시 복합 인덱스 요구를 피하기 위한 단순 where + client sort 패턴을 사용

## 4. 보안 규칙(예상) 요약
- Security Rules 파일은 레포에 없어 “서비스 호출 패턴”을 기반으로만 정리합니다.
  - `users`: `{uid}` 본인만 read/write (또는 프로필 공개 범위)
  - `posts`: `visibility`에 따라 read 범위를 분기(특히 close_friends 는 `groupId` 또는 author의 closeFriends로 처리)
  - `chatRooms`: participants만 read/write
  - `notifications`: `uid`=recipient 본인만 read/write
  - `expenses`/`groups`: group 멤버만 read/write + 민감 데이터는 최소 노출

---
다음 단계로, `doc/architecture/architecture-lld-main-reverse-engineered.md`에  
“앱 라우팅/레이아웃/서비스 호출”을 코드 기준으로 정리하겠습니다.

