# [PRD] HANS SNS 통합 요구사항 명세 (Reverse Engineering - 현재 코드 기준)

## 1. 프로젝트 개요
HANS SNS는 여행자가 자신의 여행을 사진/텍스트/태그/위치로 빠르게 기록하고, 친구/그룹과 실시간으로 소통하며, 그룹 단위 정산까지 이어지는 올인원 여행 소셜 서비스입니다.

이 문서는 “사용자가 제공한 초기 아이디어”가 아니라, **현재 저장된 레포 코드가 실제로 구현하는 기능/흐름을 기준으로** 요구사항을 역설계하여 정리한 PRD입니다.

## 2. 타겟 사용자
- 20~30대 여행자(친구와 함께 이동/기록하는 사용자)
- 그룹 여행 중 비용 분담/정산이 필요한 사용자
- 지도 기반 경로/장소 탐색에 관심이 있는 사용자

## 3. 핵심 가치(코드 기준 관찰)
- 편의성: `#태그`/`위치 모달` 중심의 빠른 게시물 작성 흐름
- 협업: 그룹 기반 공동 기록(피드 + 그룹 전용 게시물)
- 실시간성: Firestore `onSnapshot` 기반 알림/채팅/피드 일부 갱신
- 투명성: 그룹 정산 알고리즘(게시물 totalExpense + 직접 지출 expenses 기반)

## 4. 사용자 여정(User Flow)
### 4.1 온보딩/인증
1. `/` 접속
2. `useAuth()`가 사용자 상태를 확인하고 `/feed` 또는 `/login`으로 이동
3. 가입/복구는 OTP 발송 API(`/api/auth/send-code`) + 서버 비번 재설정(`/api/auth/reset-password`)를 통해 진행

### 4.2 여행 기록/피드/상호작용
1. `/feed`에서 Stories와 PostCard 기반 피드 표시
2. PostCard에서 좋아요/댓글/북마크/공유(DM 메시지 타입 `postShare`)
3. `/post/create` 또는 그룹 컨텍스트에서 게시물 작성 및 편집

### 4.3 지도 탐색(Discovery)
1. `/map` 진입
2. `postService.subscribeToPosts`로 위치 기반 게시물을 실시간 반영
3. 모바일에서는 리스트에서 장소 선택 시 지도 패닝

### 4.4 채팅/알림
1. `/messages`에서 direct/group 채팅방 목록
2. `/messages/[id]`에서 메시지 실시간 수신/전송 + reply/edit/delete + 메시지 타입별 UI
3. 알림은 `/notifications`에서 Firestore 구독으로 표시 및 swipe 삭제/액션

### 4.5 정산
1. `/settlement`에서 그룹별 정산 요약
2. `/settlement/[id]`에서
   - 정산 계산 결과(잔액/balances, 송금 splits) 확인
   - 지출(expenses) 추가/삭제
   - split 요청/입금확인/정산완료 처리(완료 시 balancing expense title="정산 완료")

## 5. 상세 기능 요구사항
우선순위 기준: `High / Medium / Low`

### 5.1 인증/계정
| 기능명 | 설명 | 우선순위 |
|---|---|---:|
| 이메일/ID 로그인 | Firestore `users.loginId`로 email을 찾아 Firebase Auth 로그인 | High |
| OTP 발송/검증(현재 구현 방식) | 서버는 발송만 수행하고, UI에서 코드 비교 후 진행 | High |
| 비밀번호 재설정 | `/api/auth/reset-password`(Admin SDK)로 update | High |
| 최근 계정 저장/전환 | localStorage로 최대 5개 계정 보관 | Medium |

### 5.2 프로필/관계
| 기능명 | 설명 | 우선순위 |
|---|---|---:|
| 프로필 사진 업데이트 | Storage 업로드 후 `users.avatarUrl` 갱신 | High |
| 친구/친한친구 토글 | `users.friends`, `users.closeFriends` 배열 업데이트 | High |
| 친구 요청/수락/거절 | friendRequests 문서 생성/수락 처리 및 notifications 연계 | High |

### 5.3 여행 기록/소셜
| 기능명 | 설명 | 우선순위 |
|---|---|---:|
| 포스트 CRUD | 생성/수정/삭제(작성자 권한) | High |
| 공개 범위(visibility) | `public/friends/close_friends` 기반 피드 필터링 | High |
| 좋아요/댓글 | posts.likes/likedBy 및 comments 서브컬렉션 기반 | High |
| 북마크 | `bookmarkedBy` 토글 | Medium |
| 공유(DM) | 친구에게 채팅 메시지로 공유(type=`postShare`) | Medium |

### 5.4 스토리
| 기능명 | 설명 | 우선순위 |
|---|---|---:|
| 스토리 업로드 | 24시간 만료 + visibility 선택(friends/close_friends) | High |
| 스토리 시청/진행 | StoryViewer가 5초 단위로 자동 진행 | High |
| 스토리 좋아요/삭제 | 소유자 삭제 + 좋아요 toggle | Medium |
| 스토리 답장 | DM(type=`storyReply`) | Medium |

### 5.5 지도/검색
| 기능명 | 설명 | 우선순위 |
|---|---|---:|
| 지도 경로 시각화 | 위치 기반 post들을 순서대로 polyline/마커 표시 | High |
| 지오로케이션 중심 이동 | 브라우저 geolocation 사용 | Medium |
| 검색 | `/search`에서 사용자(prefix search) & 장소(prefix search) | Medium |

### 5.6 그룹/공동 관리
| 기능명 | 설명 | 우선순위 |
|---|---|---:|
| 그룹 생성/수정/완료/삭제 | `groups` 문서 + group chat room 생성 | High |
| 멤버 초대(이메일) | groupService.inviteMemberByEmail → notifications 생성 | High |
| 그룹 게시물 | postService.getPostsByGroup으로 그룹 posts 조회 | High |
| 그룹 소유권 위임 | 메시지방 UI에서 ownerId 갱신 후 나가기 | Medium |

### 5.7 알림
| 기능명 | 설명 | 우선순위 |
|---|---|---:|
| 알림 실시간 구독 | notifications 컬렉션 where(uid==recipient) 구독 | High |
| 액션 처리 | friend/group/settlement 관련 버튼으로 상태 변경 | High |
| 읽음/삭제 | markAllAsRead / 개별/전체 삭제 | Medium |

### 5.8 채팅/메시징
| 기능명 | 설명 | 우선순위 |
|---|---|---:|
| direct 채팅 | participants 2인 direct room 생성 | High |
| group 채팅 | roomId=groupId로 매핑된 group chat | High |
| 메시지 전송/실시간 수신 | messages 서브컬렉션 onSnapshot | High |
| 메시지 타입별 UI | settlement/storyReply/postShare 등 payload 렌더링 | High |

### 5.9 정산(더치페이)
| 기능명 | 설명 | 우선순위 |
|---|---|---:|
| 정산 계산 | posts.totalExpense + expenses 집계 기반 balances/splits 산출 | High |
| 지출 추가/삭제 | expenses 컬렉션에 저장 및 재계산 | High |
| 정산 요청/상태 | group.splitStates로 requested/paid 추적 | High |
| 정산 완료 처리 | balancing expense(title="정산 완료") 추가 + splitStates clear | High |

## 6. 비기능 요구사항(NFR)
- 실시간성: 알림/채팅/지도 피드는 Firestore 구독 기반으로 지연을 최소화
- 성능: Composite index 요구를 피하기 위해 일부는 client-side 정렬/필터링 사용
- 보안(전제): Firestore Security Rules/Storage Rules는 “인증 사용자 기반 최소 권한”이어야 함
- 개인정보 보호: 프로필에 이메일 등 민감 정보는 노출 범위를 최소화(현재 코드는 public profile에서 email을 표시하는 편)

## 7. 제외/Out of Scope(현재 코드 기준)
- 서버 기반 멘션 자동완성/태깅 알림(코드에는 @멘션 처리 로직이 명시적으로 확인되지 않음)
- Google Places 거리/시간 분석/교통 추천(코드에서 Distance Matrix API 호출 흔적이 뚜렷하지 않음)
- FCM/푸시 인프라(코드상 Cloud Messaging 사용 흔적은 제한적)

## 8. 알려진 한계(Reverse Engineering 결과)
- OTP의 보안 검증이 “서버 저장/검증”이 아닌 UI 비교 중심(서버는 OTP 발송만 수행)
- `postService.extractLocationFromTags`는 lat/lng를 채우지 않는 형태라, 지도 노출에는 lat/lng가 필요
- `RightPanel` 친구 추천에서 `userService.searchUsers("")`를 호출하는데, 서비스는 빈 문자열을 빈 배열로 반환해 추천이 비어 있을 수 있음

---
원하시면 다음 단계로, 이 통합 PRD를 바탕으로 각 영역별(Accounts/Auth, TravelRecording, Messaging, Settlement 등) `doc/requirements/PRD-*-reverse-engineered.md`를 세분화해 더 상세한 “수용 기준(acceptance criteria)/데이터 계약”까지 확장하겠습니다.

