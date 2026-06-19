# 설정 가이드 — 바이브코딩 연수 대시보드

## 1. Firebase 프로젝트 설정

1. [Firebase 콘솔](https://console.firebase.google.com) 접속
2. **새 프로젝트 만들기** (예: `vibe-training-2026`)
3. **Firestore Database** → 데이터베이스 만들기 → **테스트 모드** 시작
4. **프로젝트 설정** → **내 앱** → **웹 앱 추가** → `firebaseConfig` 복사

## 2. 환경변수 설정

`.env.local.example`을 복사해서 `.env.local` 파일 생성:

```bash
cp .env.local.example .env.local
```

`.env.local` 파일에 Firebase 설정값 입력:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Anthropic API 키 (https://console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-api03-...

# 강사 비밀번호 (본인이 정하는 값)
INSTRUCTOR_PASSWORD=teacher2026!
```

## 3. 의존성 설치 & 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 4. Firestore 보안 규칙 배포 (선택)

Firebase CLI 설치 후:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules
```

## 5. 라우트 안내

| URL | 설명 |
|---|---|
| `/` | 수강생 제출 화면 |
| `/instructor` | 강사 대시보드 (비밀번호 필요) |
| `/instructor/participant/[id]` | 수강생 상세 + AI 피드백 생성 |
| `/instructor/review/[id]` | AI 초안 검토 → 최종 발송 |

## 6. 사용 흐름

### 수강생
1. `/` 접속 → 학교명 + 이름 입력
2. PRD 텍스트 붙여넣기 → 제출
3. 산출물 링크(배포 URL) 입력 → 제출
4. 강사 피드백을 기다림
5. 피드백 도착 시 자동 표시 → 개선 PRD/링크 제출

### 강사
1. `/instructor` 접속 → 비밀번호 입력
2. 방사형 대시보드에서 전체 진행 상황 실시간 확인
3. 🟡 노랑(1차 완료) 수강생 클릭 → 상세 화면에서 **AI 피드백 생성**
4. 생성된 초안을 검토·수정 → **최종 발송**
5. 🟢 초록 수강생에게 3차 심화 피드백 제공
