# 의사결정 기록 (ADR): 기술 스택 변경 (Supabase -> Firebase)

## 1. 배경
- 초기 아키텍처로 Supabase를 제안했으나, 사용자 요청에 의해 Firebase로의 변경이 결정됨.
- "배포 비용 제로", "웹 기반 반응형"이라는 핵심 가치는 동일하게 유지.

## 2. 결정 사항
**Next.js (Frontend) + Firebase (Backend/BaaS)** 조합을 메인 기술 스택으로 변경합니다.

## 3. 선정이유 (논리적 근거)

### 3.1 익숙함 및 에코시스템
- Firebase는 전 세계적으로 가장 널리 쓰이는 PaaS/BaaS로 관련 커뮤니티와 라이브러리가 매우 풍부합니다.
- Google 인프라를 기반으로 하여 안정성이 높습니다.

### 3.2 비용 보존 (Spark Plan)
- Firebase의 Spark 요금제는 Firestore, Storage, Auth의 무료 사용량을 넉넉하게 제공하므로 초기 비용 없이 운영 가능합니다.

### 3.3 기능 적합성 (FCM 포함)
- SNS의 핵심인 '알림' 기능을 위해 Firebase Cloud Messaging(FCM)을 별도의 연동 없이 가장 강력하게 사용할 수 있습니다.
- NoSQL(Firestore) 구조는 게시물의 비정형 데이터(다양한 비용 항목 등)를 저장하고 확장하기에 유리합니다.

## 4. 대안 분석 (Trade-offs)
- **Supabase**: PostgreSQL(RDBMS)의 강력한 쿼리와 관계 정합성을 제공하지만, NoSQL 환경을 선호할 경우 Firebase가 좋은 대안이 됩니다.
- **AWS Amplify**: 강력하지만 무료 티어 이후의 비용 예측이 Firebase보다 다소 복잡할 수 있습니다.

## 5. 결과 및 영향
- 데이터 모델링이 RDBMS(테이블/관계)에서 NoSQL(문서/컬렉션) 방식으로 변경되었습니다.
- 실시간 정산 및 멘션 알림 구현 시 Firebase의 SDK를 적극 활용하게 됩니다.
