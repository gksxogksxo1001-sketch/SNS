# [LLD] 여행 비용 정산 시스템 (Settlement)

## 1. 데이터베이스 ERD (Firestore)

### [Collection] settlements
각 그룹의 정산 배치 요약 정보를 저장합니다.
- `id`: {String} (GroupId와 동일 권장)
- `groupId`: {String}
- `totalAmount`: {Number} (전체 지출 합계)
- `lastCalculatedAt`: {Timestamp}
- `status`: {String} ("ongoing", "completed")

### [Linked Data Structure] Posts
정산은 `posts` 컬렉션의 데이터를 참조하여 실시간 계산됩니다.
- `post.totalExpense`: {Number} (해당 항목 지출액)
- `post.user.uid`: {String} (결제자)
- `group.members`: {Array<String>} (분담 대상자)

## 2. API / Interface 명세

### calculateGroupSettlement(groupId: string)
- **Description**: 특정 그룹의 모든 게시물을 조회하여 멤버별 잔액 및 송금 관계를 계산합니다.
- **Output JSON**:
```json
{
  "totalAmount": 250000,
  "balances": {
    "user1_uid": 50000,
    "user2_uid": -25000,
    "user3_uid": -25000
  },
  "splits": [
    { "fromUserId": "user2_uid", "toUserId": "user1_uid", "amount": 25000 },
    { "fromUserId": "user3_uid", "toUserId": "user1_uid", "amount": 25000 }
  ]
}
```

### sendSettlementNotifications(recipients, fromUser, groupName, groupId)
- **Description**: 정산 대상자들에게 푸시 알림을 일괄 발송합니다.
- **Protocol**: Firebase Batch Write
