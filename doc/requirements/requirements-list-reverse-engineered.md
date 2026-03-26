# SNS 프로젝트 요구사항 리스트 (Reverse Engineering - 현재 코드 기준)

## 1. 회원/계정
- 이메일/비밀번호 가입
- 이메일 OTP 발송 및 확인(가입/복구 페이지에서 발송 후 화면에서 코드 비교)
- ID(사용자 정의 loginId) 기반 로그인 (Firestore `users.loginId`로 email을 찾아 Firebase Auth로 로그인)
- Google 소셜 로그인(프로토타입 수준)
- 비밀번호 재설정(Find ID/Reset Password 페이지 + 서버 API `/api/auth/reset-password` 사용)
- 최근 로그인 계정 저장/전환(로컬스토리지, 최대 5개)

## 2. 프로필/관계
- 본인 프로필 조회/수정(프로필 이미지)
- 친구 목록(friends) 및 친한친구(closeFriends) 관리(토글)
- 공개 프로필(`/profile/[id]`)에서 친구 요청/수락/거절
- 팔로우 취소(언팔로우)

## 3. 여행 기록(게시물/소셜)
- 게시물 생성(사진 최대 10장, 내용/태그/위치/비용 입력)
- 게시물 공개 범위 설정
  - `public`, `friends`, `close_friends`
- 게시물 편집/삭제(작성자 권한 기준)
- 좋아요/댓글/북마크/공유
- 게시물 댓글 입력/조회(서브컬렉션 `posts/{postId}/comments` 기반)
- 공유: 친구에게 DM 채팅 메시지로 post 공유(type=`postShare`)

## 4. 지도(Discovery)
- 피드에서 위치 정보가 있는 게시물을 구독(`postService.subscribeToPosts`)
- `/map`
  - 실시간으로 마커/이동 경로를 표시(지도 경로는 위치 순서 기반)
  - 모바일: 장소 리스트 패널에서 선택 시 지도 이동
  - 지오로케이션으로 현재 위치 중심 이동
- `/search`
  - 사용자 검색(닉네임 prefix search)
  - 장소 검색(장소명 prefix search: `posts.location.name` 기반)

## 5. 스토리
- 스토리 업로드(친구만/friends, 친한친구/close_friends visibility)
- 24시간 만료(서버 필드 `expiresAt` 기반)
- 스토리 시청/자동 진행(약 5초 단위)
- 좋아요 및 삭제(본인 스토리)
- 스토리 답장: DM 전송(type=`storyReply`)

## 6. 그룹/공동 관리
- 여행 그룹 생성/수정/완료 처리/삭제
- 그룹 멤버 초대(초대 대상 이메일로 알림 생성)
- 그룹 게시물 조회(그룹의 posts 필터링)
- 그룹 채팅방 자동 생성(채팅방 id=groupId로 매핑)
- 그룹 관리자 위임/그룹 나가기(채팅방 UI에서 처리)

## 7. 알림
- Firestore 구독 기반 알림 리스트
- 알림 타입별 처리
  - like/comment 등
  - friend_request / friend_accept
  - group_invite (수락 시 그룹 members 업데이트)
  - settlement_request / settlement_pay
- 알림 읽음 처리/개별 삭제/전체 삭제
- 알림 swipe UI(모바일에서 삭제)

## 8. 메시징/채팅
- 채팅방 목록
  - direct: participants에 사용자 포함
  - group: groupService 기반 + room 조회
- 채팅방 메시지 실시간 구독
- 메시지 기능
  - 전송(type=`text`)
  - 좋아요/삭제(soft delete) / 수정
  - 답글(reply)
  - 메시지 타입별 UI 처리:
    - settlement request(type=`settlement`)
    - settlement summary(type=`settlementSummary`)
    - story reply(type=`storyReply`)
    - post share(type=`postShare`)

## 9. 여행 비용 정산
- `/settlement`:
  - 그룹별 정산 요약(총액, 내 잔액, 진행/완료)
- `/settlement/[id]`:
  - 그룹 정산 상세 계산(잔액/송금 splits)
  - 지출 내역 추가/삭제(expenses)
  - splits 요청/입금 완료/정산 완료 처리
  - 정산 완료 시 balancing expense(`title="정산 완료"`)를 추가
- 그룹의 `splitStates`로 요청/입금 상태 추적

## 10. 알려진 제한/불일치(역설계 기반)
- OTP 인증이 서버에서 검증/저장되기보다는 “클라이언트 코드 비교” 방식으로 구현되어 보안 수준이 낮을 수 있음
- 태그 기반 위치 자동 추출은 현재 lat/lng를 채우지 않는 형태(지도 노출에 영향)
- RightPanel 친구 추천/검색의 경우, empty query로 `userService.searchUsers("")`를 호출하여 추천이 비어 있을 수 있음

