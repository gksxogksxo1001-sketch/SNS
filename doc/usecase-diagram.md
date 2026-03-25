# SNS 프로젝트 유스케이스 다이어그램

## 👀 다이어그램 보는 방법

### 방법 1: HTML 뷰어 (권장)
[usecase-diagram.html](./usecase-diagram.html) 파일을 **브라우저에서 열면** PlantUML 서버를 통해 자동으로 다이어그램이 렌더링됩니다.

### 방법 2: VS Code 확장 프로그램
1. VS Code에서 `PlantUML` 확장 프로그램 설치 (jebbs.plantuml)
2. [usecase-diagram.puml](./usecase-diagram.puml) 파일을 열기
3. `Alt + D` 를 눌러 미리보기

### 방법 3: PlantUML 온라인 서버
1. [PlantUML Online Server](https://www.plantuml.com/plantuml/uml) 접속
2. 아래 PlantUML 코드를 전체 복사하여 붙여넣기
3. `Submit` 클릭

---

## PlantUML 소스 코드

```plantuml
@startuml SNS_UseCase
skinparam actorStyle awesome
skinparam packageStyle rectangle
skinparam usecase {
  BackgroundColor #E8F5E9
  BorderColor #2A9D8F
  ArrowColor #264653
  FontColor #212529
}
skinparam actor {
  BackgroundColor #2A9D8F
  BorderColor #264653
}
left to right direction

actor "User" as User
actor "Firebase Auth" as FAuth <<System>>
actor "Firestore" as FStore <<System>>
actor "Storage" as FStorage <<System>>
actor "Realtime DB" as FRealtime <<System>>
actor "Google Maps" as GMaps <<System>>

rectangle "SNS Project System" {
  package "Auth and User" {
    usecase "Register" as UC_Reg
    usecase "Login" as UC_Log
    usecase "Logout" as UC_Out
    usecase "Edit Profile" as UC_Prof
    usecase "Follow" as UC_Fol
    usecase "Close Friends" as UC_CF
  }
  package "Feed" {
    usecase "Create Post" as UC_CP
    usecase "View Feed" as UC_VF
    usecase "Edit Post" as UC_EP
    usecase "Delete Post" as UC_DP
    usecase "Like" as UC_Lk
    usecase "Comment" as UC_Cm
    usecase "Bookmark" as UC_Bk
    usecase "Share Post" as UC_SP
    usecase "Add Location" as UC_AL
    usecase "Add Tags" as UC_AT
    usecase "Upload Image" as UC_UI
  }
  package "Stories" {
    usecase "Upload Story" as UC_US
    usecase "View Story" as UC_VS
    usecase "Visibility" as UC_SV
    usecase "Archive" as UC_SA
  }
  package "Messaging" {
    usecase "Direct Chat" as UC_DC
    usecase "Group Chat" as UC_GC
    usecase "Send Image" as UC_SI
    usecase "Share in Chat" as UC_SC
    usecase "Settlement" as UC_ST
    usecase "Manage Settlement" as UC_MS
  }
  package "Discovery Map" {
    usecase "Map View" as UC_MV
    usecase "Search" as UC_MS2
    usecase "My Location" as UC_ML
    usecase "Marker Detail" as UC_MD
  }
  package "Notifications" {
    usecase "View Notifications" as UC_VN
    usecase "Mark Read" as UC_MR
  }
}

User --> UC_Reg
User --> UC_Log
User --> UC_Out
User --> UC_Prof
User --> UC_Fol
User --> UC_CF
User --> UC_CP
User --> UC_VF
User --> UC_EP
User --> UC_DP
User --> UC_Lk
User --> UC_Cm
User --> UC_Bk
User --> UC_SP
User --> UC_US
User --> UC_VS
User --> UC_SA
User --> UC_DC
User --> UC_GC
User --> UC_ST
User --> UC_MS
User --> UC_MV
User --> UC_MS2
User --> UC_ML
User --> UC_VN
User --> UC_MR

UC_CP ..> UC_UI : <<include>>
UC_CP ..> UC_AL : <<extend>>
UC_CP ..> UC_AT : <<extend>>
UC_US ..> UC_SV : <<include>>
UC_US ..> UC_UI : <<include>>
UC_DC ..> UC_SI : <<extend>>
UC_DC ..> UC_SC : <<extend>>
UC_GC ..> UC_SI : <<extend>>
UC_GC ..> UC_ST : <<extend>>
UC_MV ..> UC_MD : <<extend>>
UC_MV ..> UC_ML : <<extend>>
UC_SP ..> UC_SC : <<include>>

UC_Reg --> FAuth
UC_Log --> FAuth
UC_CP --> FStore
UC_VF --> FStore
UC_US --> FStore
UC_VN --> FStore
UC_UI --> FStorage
UC_DC --> FRealtime
UC_GC --> FRealtime
UC_MV --> GMaps
UC_MS2 --> GMaps
UC_ML --> GMaps
@enduml
```

---

## 주요 액터

| 액터 | 설명 |
|---|---|
| **User (일반 사용자)** | SNS 서비스를 이용하는 모든 등록 사용자 |
| **Firebase Auth** | 이메일/구글 기반 인증 처리 |
| **Firestore** | 게시물, 스토리, 알림 등 문서 데이터 저장 |
| **Storage** | 이미지 파일 업로드/다운로드 |
| **Realtime DB** | 실시간 채팅 메시지 처리 |
| **Google Maps** | 지도 렌더링 및 위치 서비스 |

## 패키지 구성

| 패키지 | 유스케이스 수 | 핵심 기능 |
|---|---|---|
| Auth and User | 6 | 회원가입, 로그인, 프로필, 팔로우 |
| Feed | 11 | 게시물 CRUD, 좋아요, 댓글, 북마크, 공유 |
| Stories | 4 | 스토리 업로드, 24시간 만료, 보관함 |
| Messaging | 6 | 1:1 채팅, 그룹 채팅, 정산 |
| Discovery Map | 4 | 지도 탐색, 검색, 현재 위치 |
| Notifications | 2 | 알림 조회, 읽음 처리 |
