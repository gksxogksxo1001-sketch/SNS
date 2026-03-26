# ER Diagram (Mermaid) - Reverse Engineering (Firestore)

> 아래 다이어그램은 Firestore Security Rules/콘솔 스키마를 직접 읽은 것이 아니라,
> 레포 코드에서 실제로 참조하는 컬렉션/필드/서브컬렉션(`src/core/firebase/*Service.ts`)을 기준으로 역추적해 작성한 논리 ERD입니다.

```mermaid
erDiagram
  USERS {
    string uid PK
    string email
    string loginId
    string nickname
    string avatarUrl
    boolean identityVerified
    map stats
    array friends
    array closeFriends
    array visitedCountries
    timestamp createdAt
    timestamp updatedAt
    string travelStyle
  }

  GROUPS {
    string id PK
    string name
    string description
    string ownerId
    array members
    string status
    string settlementStatus
    map splitStates "fromUserId_toUserId -> requested|paid"
    string startDate
    string endDate
    timestamp createdAt
    timestamp updatedAt
  }

  POSTS {
    string id PK
    string user.uid
    string user.name
    string user.image
    string? groupId
    string content
    array tags
    array images
    map? location "{name,address,lat,lng}"
    map? expenses "{plane,stay,transport,food,other}"
    number totalExpense
    string visibility "public|friends|close_friends"
    number likes
    array likedBy
    array? bookmarkedBy
    number comments
    timestamp createdAt
  }

  COMMENTS {
    string id PK
    string postId FK
    map user "{uid,name,image,group?}"
    string content
    timestamp createdAt
  }

  STORIES {
    string id PK
    string userId FK
    map user "{uid,name,image}"
    string mediaUrl
    string type "image|video"
    timestamp createdAt
    timestamp expiresAt
    string visibility "public|friends|close_friends"
    array viewedBy
    number likesCount
    array likedBy
  }

  CHATROOMS {
    string id PK
    string type "direct|group"
    array participants "user UIDs"
    string? name "group name"
    string? groupImage
    map? lastMessage "{text,createdAt,senderId}"
    map? unreadCount "{[userId]: number}"
    timestamp updatedAt
  }

  MESSAGES {
    string id PK
    string roomId FK
    string senderId FK
    string text
    string type "text|settlement|storyReply|postShare|settlementSummary"
    timestamp createdAt
    boolean isRead
    array likes
    boolean isEdited
    boolean isDeleted
    map? settlementData "{title,amountToPay,bankAccount,isSettled}"
    map? storyData "{mediaUrl,storyId}"
    map? postShareData "{postId,postImage,postTitle?,authorName}"
    map? replyTo "{id,text,senderId,senderName?}"
    map? settlementSummaryData "{groupId,groupName,totalAmount,splitCount}"
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
    string status "pending|accepted|declined"
    timestamp createdAt
  }

  EXPENSES {
    string id PK
    string groupId FK
    string title
    number amount
    string paidBy
    array participants
    string category "숙박|교통|식비|액티비티|기타"
    date date
  }

  USERS ||--o{ POSTS : author_of
  GROUPS ||--o{ POSTS : includes (groupId)
  POSTS ||--o{ COMMENTS : includes

  USERS ||--o{ STORIES : owns

  USERS ||--o{ CHATROOMS : participates
  GROUPS ||--o{ CHATROOMS : group_chat_room (roomId == groupId)

  CHATROOMS ||--o{ MESSAGES : contains
  USERS ||--o{ MESSAGES : sends

  USERS ||--o{ NOTIFICATIONS : receives
  USERS ||--o{ FRIENDREQUESTS : initiates/receives

  GROUPS ||--o{ EXPENSES : records
```

