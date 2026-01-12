# QuickSight Dashboard Embedding

AWS QuickSight 대시보드를 React 웹 애플리케이션에 임베딩하는 프로젝트입니다.

## 프로젝트 구조

```
quicksight-widget-test-cc/
├── backend/           # Node.js Express 백엔드
│   ├── server.js      # API 서버
│   ├── package.json
│   └── .env.example   # 환경 변수 예제
├── frontend/          # React 프론트엔드
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   └── QuickSightDashboard.jsx
│   │   └── ...
│   └── package.json
└── README.md
```

## 사전 요구사항

1. **AWS 계정** 및 QuickSight Enterprise Edition
2. **Node.js** 18+ 설치
3. **AWS CLI** 구성 또는 AWS 자격 증명

## AWS QuickSight 설정

### 1. QuickSight 임베딩 도메인 등록

QuickSight 콘솔에서 임베딩을 허용할 도메인을 등록해야 합니다:

1. QuickSight 콘솔 → 관리 → 도메인 및 임베딩
2. `http://localhost:5173` 추가 (개발용)
3. 프로덕션 도메인 추가

### 2. IAM 권한 설정

백엔드 서버에서 사용하는 IAM 역할/사용자에 다음 권한이 필요합니다:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "quicksight:GenerateEmbedUrlForRegisteredUser",
        "quicksight:GenerateEmbedUrlForAnonymousUser",
        "quicksight:DescribeDashboard"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3. 익명 임베딩 활성화 (선택적)

익명(Public) 임베딩을 사용하려면:

1. QuickSight 콘솔 → 관리 → 계정 설정
2. "Public access" 활성화
3. 대시보드별로 공개 공유 설정

## 설치 및 실행

### 1. 백엔드 설정

```bash
cd backend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 실제 값으로 수정
```

`.env` 파일 설정:

```env
AWS_REGION=ap-northeast-2
AWS_ACCOUNT_ID=123456789012
QUICKSIGHT_NAMESPACE=default
PORT=3001
FRONTEND_URL=http://localhost:5173

# 등록된 사용자 임베딩 시 (선택적)
QUICKSIGHT_USER_ARN=arn:aws:quicksight:ap-northeast-2:123456789012:user/default/username
```

```bash
# 서버 실행
npm run dev
```

### 2. 프론트엔드 설정

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 3. 브라우저에서 확인

`http://localhost:5173` 접속

## 사용 방법

1. Dashboard ID 입력란에 QuickSight 대시보드 ID 입력
2. 임베딩 유형 선택:
   - **등록된 사용자**: QuickSight에 등록된 사용자로 접근
   - **익명 사용자**: 공개 대시보드로 접근 (별도 설정 필요)
3. "대시보드 추가" 버튼 클릭

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/embed/registered` | 등록된 사용자용 임베딩 URL 생성 |
| POST | `/api/embed/anonymous` | 익명 사용자용 임베딩 URL 생성 |
| POST | `/api/embed/visual` | 개별 위젯(Visual) 임베딩 URL 생성 |
| GET | `/api/dashboard/:id` | 대시보드 정보 조회 |
| GET | `/api/health` | 헬스 체크 |

## 인증 흐름 (Authentication Flow)

QuickSight 임베딩은 **백엔드에서 인증을 처리**하고, 프론트엔드는 인증된 URL을 받아서 사용합니다.

### 아키텍처

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│    프론트엔드    │      │     백엔드      │      │   QuickSight    │
│    (브라우저)    │      │   (Node.js)     │      │      API        │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         │  1. 대시보드 요청       │                        │
         │ ────────────────────▶ │                        │
         │                        │                        │
         │                        │  2. 임베딩 URL 요청     │
         │                        │  (AWS 자격증명 +        │
         │                        │   QuickSight User ARN) │
         │                        │ ────────────────────▶  │
         │                        │                        │
         │                        │  3. 임베딩 URL 반환     │
         │                        │  (인증 토큰 포함)       │
         │                        │ ◀────────────────────  │
         │                        │                        │
         │  4. 임베딩 URL 반환     │                        │
         │ ◀──────────────────── │                        │
         │                        │                        │
         │  5. 임베딩 URL로        │                        │
         │     대시보드 로드       │                        │
         │ ─────────────────────────────────────────────▶  │
         │                        │                        │
```

### 핵심 코드

**백엔드 (server.js):**
```javascript
const command = new GenerateEmbedUrlForRegisteredUserCommand({
  AwsAccountId: AWS_ACCOUNT_ID,
  UserArn: process.env.QUICKSIGHT_USER_ARN,  // 이 사용자 권한으로 접근
  SessionLifetimeInMinutes: 600,              // 10시간 유효
  ExperienceConfiguration: {
    Dashboard: {
      InitialDashboardId: dashboardId,
    },
  },
});

const response = await quicksightClient.send(command);
// response.EmbedUrl에 인증 토큰이 포함된 URL 반환
```

### 보안 포인트

| 항목 | 설명 |
|------|------|
| **인증 토큰** | 임베딩 URL에 인증 토큰이 포함되어 있어 별도 로그인 불필요 |
| **세션 유효 시간** | `SessionLifetimeInMinutes`로 설정 (기본 10시간) |
| **사용자 권한** | `UserArn`에 지정된 QuickSight 사용자의 권한으로 대시보드 접근 |
| **도메인 제한** | QuickSight 콘솔에 등록된 도메인에서만 임베딩 가능 |

### 프로덕션 환경 권장사항

```javascript
// 실제 서비스에서는 사용자별 권한 체크 후 URL 발급
app.post('/api/embed/registered', authenticate, async (req, res) => {
  // 1. 현재 로그인한 사용자 확인
  const currentUser = req.user;

  // 2. 해당 사용자가 대시보드 접근 권한이 있는지 확인
  if (!hasAccess(currentUser, req.body.dashboardId)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // 3. 권한이 있으면 임베딩 URL 발급
  const embedUrl = await generateEmbedUrl(req.body.dashboardId);
  res.json({ embedUrl });
});
```

## 개별 위젯 임베딩

전체 대시보드 대신 개별 차트(Visual)만 임베딩할 수 있습니다.

### 필요한 정보

- `dashboardId`: 대시보드 ID
- `sheetId`: 시트 ID
- `visualId`: 개별 차트 ID

### API 요청 예시

```javascript
// 프론트엔드
const response = await fetch('/api/embed/visual', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dashboardId: '455b132a-9856-4bac-9777-c76fef90d10c',
    sheetId: '455b132a-..._969b2ab6-...',
    visualId: '455b132a-..._365537fd-...',
  }),
});
```

### 백엔드 코드

```javascript
const command = new GenerateEmbedUrlForRegisteredUserCommand({
  AwsAccountId: AWS_ACCOUNT_ID,
  UserArn: process.env.QUICKSIGHT_USER_ARN,
  SessionLifetimeInMinutes: 600,
  ExperienceConfiguration: {
    DashboardVisual: {  // Dashboard 대신 DashboardVisual 사용
      InitialDashboardVisualId: {
        DashboardId: dashboardId,
        SheetId: sheetId,
        VisualId: visualId,
      },
    },
  },
});
```

### 프론트엔드 코드

```javascript
import { createEmbeddingContext } from 'amazon-quicksight-embedding-sdk';

// embedDashboard 대신 embedVisual 사용
const embeddingContext = await createEmbeddingContext();
await embeddingContext.embedVisual(frameOptions, contentOptions);
```

## 트러블슈팅

### "Access denied" 오류
- IAM 권한 확인
- QuickSight 도메인 등록 확인

### "Dashboard not found" 오류
- Dashboard ID 확인
- 대시보드 공유 설정 확인

### CORS 오류
- 백엔드 CORS 설정에 프론트엔드 URL 추가
- `.env`의 `FRONTEND_URL` 값 확인

## 프로덕션 배포 시 고려사항

1. HTTPS 필수
2. 환경 변수 보안 관리 (AWS Secrets Manager 등)
3. 프론트엔드 빌드: `npm run build`
4. 백엔드 프로세스 관리: PM2 또는 Docker 사용
5. QuickSight 도메인에 프로덕션 URL 등록
