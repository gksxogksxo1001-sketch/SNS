# 시스템 아키텍처 설계 워킹플로우 (System Architecture Workflow)

이 워크플로우는 요구사항 명세서(PRD)를 바탕으로 확장 가능하고 안전한 시스템 구조를 설계하는 과정을 안내합니다.

## 진행 단계 (Step-by-Step Process)

### 1단계: 컨텍스트 수집 및 검증 (Context Gathering)
완벽한 설계를 위해 누락된 기술적 맥락을 파악합니다.
- **활동**: 기존 기술 스택, 비즈니스 목표(MVP), 예상 트래픽, 데이터 특성, 연동 시스템에 대해 인터뷰 진행
- **종료 조건**: 설계에 필요한 기술적/비즈니스적 제약사항이 모두 파악되었을 때

### 2단계: 하이레벨 아키텍처 설계 (HLD: High-Level Design)
전체 시스템의 큰 그림을 그립니다.
- **활동**: Client, API Gateway, DB, Cache 등 주요 구성 요소 정의 및 기술 스택 선정 근거(Trade-off) 설명
- **출력물**: `doc/architecture/architecture-hld.md` (Mermaid 다이어그램 포함)

### 3단계: 상세 설계 (LLD: Low-Level Design)
데이터베이스와 API의 구체적인 구조를 설계합니다.
- **활동**: 핵심 도메인의 ERD 모델링(텍스트) 및 RESTful/GraphQL API 엔드포인트 정의
- **출력물**: `doc/architecture/architecture-lld-[domain].md`

### 4단계: 비기능적 요구사항 및 인프라 설계 (NFR & Infra)
보안, 성능, 배포 전략을 수립합니다.
- **활동**: 인증/인가, TLS, 캐싱, CI/CD, 컨테이너화 전략 제안
- **출력물**: `doc/architecture/architecture-hld.md` (업데이트)

### 5단계: 구현 로드맵 및 모듈화 전략 (Roadmap)
개발팀이 코딩을 시작할 수 있는 가이드를 작성합니다.
- **활동**: 모듈별 우선순위 및 인터페이스 정의
- **출력물**: 별도의 Roadmap 섹션 또는 문서

## 출력 파일 경로 규칙
- 하이레벨 설계서: `doc/architecture/architecture-hld.md`
- 상세 설계서(DB/API): `doc/architecture/architecture-lld-[domain].md`
- 의사결정 기록: `doc/architecture/adr-[topic].md` (선택 사항)
