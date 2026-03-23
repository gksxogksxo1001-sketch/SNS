# [LLD] 다중 계정 관리 및 세션 전환 (Accounts)

## 1. 데이터 스토리지 구조 (LocalStorage)

### Key: `hans-recent-accounts`
- **Type**: `Array<StoredAccount>`
- **StoredAccount Schema**:
```json
{
  "uid": "String (Required)",
  "email": "String | null",
  "displayName": "String | null",
  "photoURL": "String | null",
  "lastLogin": "Number (Timestamp)"
}
```

## 2. 인터페이스 명세 (accountManager)

### saveAccount(user: User)
- **Input**: Firebase Auth User 객체
- **Behavior**:
  1. 기존 리스트에서 동일 UID 검색
  2. 최신 정보(Profile 이미지 등)로 업데이트 및 최상단 배치
  3. 최대 5개까지 유지 (제한)

### getAccounts()
- **Output**: `StoredAccount[]` (정렬된 계정 리스트)

### switchAccount(targetUid)
- **Flow**:
  1. `AuthService.logOut()` 실행
  2. `/login` 페이지로 이동 (선택된 이메일 자동 입력 처리 - 옵션)

## 3. UI 컴포넌트 구조
- `AccountSwitcher.tsx`: 모달 형태의 계정 리스트 노출 및 선택 시 전환 트리거.
- `ProfilePage`: 설정 메뉴를 통해 `AccountSwitcher` 호출.
