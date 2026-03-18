# 프로젝트 디렉터리 구조 및 모듈 설계

## 1. 개요
본 문서는 Next.js와 Firebase를 사용한 여행 SNS 서비스의 코드 유지보수성과 확장성을 높이기 위한 디렉터리 구조 및 모듈화 전략을 정의합니다. **Atomic Design**과 **Feature-based Architecture**의 장점을 혼합하여 설계되었습니다.

## 2. 프로젝트 디렉터리 구조 (Project Structure)

```text
/
├── .agent/                 # 에이전트 규칙 및 워크플로우
├── doc/                    # 각종 기획 및 설계 문서
│   ├── requirements/       # 요구사항 명세서 (PRD)
│   ├── architecture/       # 아키텍처, 데이터, 보안 설계
│   └── ui-ux/              # 화면 설계 및 디자인 시스템
├── public/                 # 정적 자원 (이미지, 아이콘, 폰트)
├── src/
│   ├── app/                # Next.js App Router (Layouts, Pages)
│   │   ├── (auth)/         # 인증 관련 그룹 (login, signup)
│   │   ├── (main)/         # 메인 서비스 그룹 (feed, groups)
│   │   ├── profile/        # 프로필 페이지
│   │   └── api/            # Serverless API Routes
│   ├── components/         # 재사용 가능한 UI 컴포넌트
│   │   ├── common/         # Button, Input, Modal 등 기초 컴포넌트
│   │   ├── layout/         # Header, Navbar, Sidebar
│   │   └── features/       # 도메인 특정 컴포넌트 (PostCard, GroupList)
│   ├── core/               # 비즈니스 로직 및 핵심 엔진
│   │   ├── firebase/       # Firebase 초기화 및 SDK 설정
│   │   ├── services/       # 데이터 가공 및 비즈니스 로직 (AuthService, PostService)
│   │   └── hooks/          # 커스텀 React Hooks (useAuth, usePosts)
│   ├── lib/                # 외부 라이브러리 설정 (Mapbox, Date-fns)
│   ├── store/              # 상태 관리 (Zustand 등)
│   ├── types/              # TypeScript 타입 정의
│   └── utils/              # 유틸리티 함수 (Formatters, Validators)
├── tailwind.config.js      # 스타일 설정 (디자인 시스템 반영)
└── next.config.js          # Next.js 환경 설정
```

## 3. 핵심 모듈 설계 전략

### 3.1 레이어드 아키텍처 (Layered Architecture)
1. **Presentation Layer (app/components)**: UI 렌더링 및 사용자 인터랙션 담당.
2. **Business Logic Layer (core/services)**: 데이터의 유효성 검사, 복잡한 비즈니스 규칙 처리.
3. **Data Access Layer (core/firebase)**: Firestore, Storage에 직접 접근하여 CRUD 수행.

### 3.2 분리 및 추상화
- **Firebase 추상화**: Firestore의 SDK를 직접 컴포넌트에서 호출하지 않고, `core/services` 내의 서비스 객체를 통해 접근합니다. 이는 추후 다른 백엔드로의 전환이나 테스트 코드 작성을 용이하게 합니다.
- **관심사 분리 (SoC)**: UI 스타일링은 `components`, 상태 관리는 `store`, 비즈니스 로직은 `hooks`와 `services`로 명확히 분리합니다.

## 4. 컴포넌트 설계 (Atomic Design 기반)
- **Atoms (common)**: 더 이상 쪼갤 수 없는 가장 기본 단위 (Button, Label, Badge)
- **Molecules (features)**: 여러 Atom이 결합된 단위 (SearchInput, UserProfileSummary)
- **Organisms (features)**: 복잡한 섹션 단위 (FeedPostCard, GroupJoinCard)

## 5. 명명 규칙 (Naming Convention)
- **파일/폴더**: 케밥 케이스(kebab-case) 사용 (예: `post-card.tsx`)
- **컴포넌트/클래스**: 파스칼 케이스(PascalCase) 사용 (예: `PostCard`)
- **함수/변수**: 카멜 케이스(camelCase) 사용 (예: `getPostList`)
