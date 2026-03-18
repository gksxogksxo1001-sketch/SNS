# 배포 및 테스트 워크플로우 (Deployment & Testing Workflow)

이 워크플로우는 개발된 기능의 품질을 검증하고, 운영 환경에 안전하게 배포하는 과정을 안내합니다.

---

## 1. 테스트 전략 (Testing Strategy)

### 1.1 단위 테스트 (Unit Testing)
- **목표**: 개별 함수, 유틸리티, 서비스 모듈의 로직 검증.
- **도구**: Jest / Vitest
- **절차**: 
    1. `utils`, `services` 폴더 내 로직 변경 시 해당 `.test.ts` 실행.
    2. 에지 케이스(Edge Cases) 및 에러 핸들링 중점 테스트.

### 1.2 통합 및 UI 테스트 (Integration & UI Testing)
- **목표**: 컴포넌트 간 상호작용 및 사용자 시나리오 검증.
- **도구**: React Testing Library / Playwright (브라우저 테스트)
- **절차**:
    1. 주요 사용자 여정(로그인/회원가입, 게시물 작성) 자동화 테스트 수행.
    2. 다양한 해상도(모바일, 태블릿, PC)에서의 반응형 레이아웃 확인.

### 1.3 Firebase 보안 규칙 테스트 (Security Rules Testing)
- **도구**: Firebase Local Emulator Suite
- **절차**:
    1. `firestore.rules` 변경 시 에뮬레이터에서 권한 테스트 코드 수행.
    2. 비인가 사용자의 데이터 접근 차단 여부 확인.

---

## 2. 배포 절차 (Deployment Process)

### 2.1 개발 및 스테이징 배포 (Preview)
- **환경**: Vercel Preview Deployments
- **절차**:
    1. GitHub Pull Request 생성 시 자동으로 프리뷰 링크 생성.
    2. 에이전트 및 사용자가 프리뷰 링크에서 실제 동작 확인.
    3. 모든 테스트 통과 및 코드 리뷰 완료 후 Merge.

### 2.2 운영 배포 (Production)
- **환경**: Vercel Production
- **절차**:
    1. `main` 브랜치에 코드가 병합되면 자동 배포 시작.
    2. Firebase 인덱스 및 환경 변수(`env.production`) 최종 확인.
    3. 배포 성공 후 주요 기능 라이브 체크.

---

## 3. 사후 관리 및 모니터링
- **에러 트래킹**: Sentry 또는 Firebase Crashlytics를 통한 런타임 에러 모니터링.
- **성능 분석**: Vercel Analytics를 통한 페이지 로드 속도 및 Core Web Vitals 체크.
