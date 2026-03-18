# 프로젝트 보안 설계서 (Security Design)

## 1. 개요
본 문서는 2030 여행자 SNS 서비스의 사용자 데이터와 시스템 자원을 보호하기 위한 보안 전략 및 설계 내용을 정의합니다. Firebase와 Vercel 인프라의 보안 기능을 최대한 활용하며, 국내 개인정보 보호법(PIPA) 준수를 목표로 합니다.

## 2. 인증 및 인가 (Authentication & Authorization)

### 2.1 인증 (Authentication) - Firebase Auth
- **다중 인증 방식**: 이메일/비밀번호 및 주요 소셜 로그인(Google, Kakao, Naver) 지원.
- **세션 관리**: JWT(JSON Web Token) 아키텍처를 통한 상태 비저장(Stateless) 인증.
- **본인 확인**: 가입 단계에서 휴대폰 본인 확인 절차를 도입하여 계정 대여 및 어뷰징 방지.

### 2.2 인가 (Authorization) - Firestore Security Rules
- **최소 권한 원칙**: 모든 데이터 접근은 Firebase 보안 규칙을 통해 제어.
- **동적 제어**: 
    - 자신의 프로필: 본인만 수정 가능 (`request.auth.uid == userId`)
    - 그룹 게시물: 해당 그룹 멤버(`memberUids` 포함 여부)만 읽기/쓰기 가능.
    - 공개 게시물: 모든 가입 사용자 읽기 가능.

## 3. 데이터 보호 (Data Protection)

### 3.1 암호화 전략
- **전송 중 암호화 (In-Transit)**: 모든 통신은 TLS 1.3(HTTPS)을 의무화.
- **저장 중 암호화 (At-Rest)**: Firebase 및 Storage 데이터는 Google의 기본 하드웨어 암호화(AES-256) 적용.
- **민감 정보 처리**: 비밀번호는 Firebase Auth 내에서 안전한 알고리즘으로 해싱 처리됨. 시스템 로그에 개인정보(전화번호 등) 노출 금지.

### 3.2 개인정보 보호 준수 (PIPA)
- **수집 제한**: 서비스 제공에 반드시 필요한 최소한의 정보만 수집.
- **파기 전략**: 회원 탈퇴 시 관련 모든 Firestore 문서 및 Storage 파일 즉시 파기(Hard Delete).
- **접근 통제**: 데이터베이스 관리 콘솔 접근은 2FA(2단계 인증)가 설정된 관리자 계정으로만 제한.

## 4. 인프라 및 애플리케이션 보안

### 4.1 입력 데이터 검증 (Sanitization)
- **프론트엔드**: 모든 폼 입력에 대해 정규식을 통한 1차 검증.
- **백엔드(Serverless)**: NoSQL Injection 및 XSS 방지를 위한 데이터 정제 처리.

### 4.2 API 보안
- **CORS 설정**: Vercel 배포 도메인 이외의 도처에서 발생하는 API 요청 차단.
- **Rate Limiting**: 특정 IP에서의 과도한 요청(Dos 방지)을 위해 Vercel Edge Middleware를 통한 트래픽 제어.

## 5. 보안 운영 계획
- **로그 및 모니터링**: Firebase Analytics 및 Cloud Logging을 통해 비정상적인 로그인 시도 및 대량 데이터 접근 모니터링.
- **정기 백업**: Firestore 및 Storage 데이터의 정기적인 스냅샷 관리.
