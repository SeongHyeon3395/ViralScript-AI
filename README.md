# ViralScript AI

TikTok과 YouTube Shorts 영상을 분석하고, Gemini AI로 숏폼 영상 대본과 다국어 콘텐츠를 생성하는 Next.js 애플리케이션입니다.

## 주요 기능

- TikTok 및 YouTube Shorts URL 분석
- Gemini 기반 숏폼 대본·콘텐츠 생성
- 한국어, 영어, 중국어, 일본어 UI 지원
- Supabase Auth 기반 회원가입·로그인
- 사용자별 크레딧, 생성 이력, 일일 보상 룰렛
- Stripe/Toss 결제 연동 준비 구조
- 한국·미국·일본의 TikTok/YouTube Shorts 트렌드 수집
- 트렌드 썸네일, 플랫폼·지역 필터, 인기순·최신순 정렬
- 메인 트렌드 6개 → 12개 → 페이지네이션
- 전체 트렌드 페이지의 24개 단위 페이지네이션
- 관리자 전용 사용자·트렌드·감사 로그 콘솔

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Authentication & Database | Supabase |
| AI | Google Gemini API (`@google/genai`) |
| Video metadata | Apify, YouTube Data API v3 |
| Deployment | Vercel |
| Testing | Vitest |

## 시작하기

### 요구 사항

- Node.js 20 이상 권장
- Supabase 프로젝트
- Google Gemini API 키
- 트렌드 수집을 사용할 경우 YouTube Data API 키와 Apify API 토큰

### 설치

```bash
git clone https://github.com/SeongHyeon3395/ViralScript-AI.git
cd ViralScript-AI
npm install
```

환경변수 파일을 생성합니다.

```bash
cp .env.example .env.local
```

Windows PowerShell에서는 다음을 사용할 수 있습니다.

```powershell
Copy-Item .env.example .env.local
```

`.env.local`에 실제 값을 입력한 후 개발 서버를 실행합니다.

```bash
npm run dev
```

애플리케이션은 [http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 환경변수

### 필수

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_AI_API_KEY=your-gemini-api-key
```

### 트렌드 수집

```env
YOUTUBE_API_KEY=your-youtube-data-api-key
APIFY_API_TOKEN=your-apify-api-token
CRON_SECRET=your-random-cron-secret
```

`CRON_SECRET`이 설정되어 있으면 트렌드 Cron API는 다음 인증 헤더를 요구합니다.

```http
Authorization: Bearer <CRON_SECRET>
```

### 선택 사항

```env
NEXT_PUBLIC_ENABLE_PAYMENT=false
NEXT_PUBLIC_ENABLE_ADS_REWARD=false
NEXT_PUBLIC_ADSENSE_CLIENT_ID=your-adsense-client-id
NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT=your-adsense-display-slot-id
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

`.env.local`, Supabase service role key, API 키, 결제 키는 절대 Git에 커밋하지 마세요.

## Supabase 데이터베이스

마이그레이션 파일은 `supabase/migrations`에 timestamp 형식으로 관리됩니다.

```text
supabase/migrations/
├── 20260701000001_initial_schema.sql
├── ...
└── 20260808000020_trend_feed_thumbnails.sql
```

원격 Supabase 프로젝트에 마이그레이션을 적용하려면 프로젝트 경로를 명시해 실행합니다.

```bash
npx supabase db push
```

Windows에서 CLI가 다른 경로를 프로젝트로 인식하는 경우:

```powershell
npx.cmd supabase --workdir C:\project\video-maker db push
```

적용 전 변경 목록만 확인하려면:

```powershell
npx.cmd supabase --workdir C:\project\video-maker db push --dry-run
```

새 마이그레이션은 직접 숫자를 붙이지 말고 CLI로 생성합니다.

```bash
npx supabase migration new add_feature_name
```

운영 DB를 대상으로 `supabase db reset --linked`를 실행하지 마세요. 원격 데이터가 삭제될 수 있습니다.

## 트렌드 수집

Vercel Cron은 매일 UTC 15:00에 `/api/cron/trend`를 호출합니다. 한국 시간으로는 매일 자정입니다.

```json
{
  "path": "/api/cron/trend",
  "schedule": "0 15 * * *"
}
```

수집 대상은 다음과 같습니다.

- 한국(KR), 미국(US), 일본(JP)
- 국가별 YouTube Shorts 10개
- 국가별 TikTok 10개
- 하루 최대 60개 신규 트렌드

기존 트렌드는 삭제하지 않고 `video_url` 기준 중복을 제외한 신규 영상만 `trend_feed`에 누적합니다. YouTube 썸네일과 TikTok에서 제공하는 커버 이미지도 함께 저장합니다.

수동으로 Cron을 호출할 때는 다음과 같이 실행할 수 있습니다.

```powershell
Invoke-WebRequest `
  -Uri http://localhost:3000/api/cron/trend `
  -Method POST `
  -Headers @{ Authorization = "Bearer $env:CRON_SECRET" }
```

트렌드 수집은 YouTube API quota, Apify actor 응답, 각 플랫폼의 공개 permalink 형식에 영향을 받습니다.

## 주요 경로

| 경로 | 설명 |
| --- | --- |
| `/` | 서비스 메인 화면 및 최신 트렌드 미리보기 |
| `/generator` | 영상 분석 및 대본 생성 |
| `/trends` | 전체 트렌드 페이지 |
| `/history` | 로그인 사용자의 생성 이력 |
| `/settings` | 계정·프로필 설정 |
| `/Master` | 비공개 마스터 운영 콘솔 |
| `/api/v1/analyze` | 영상 분석·대본 생성 API |
| `/api/v1/trends` | 트렌드 조회 API |
| `/api/cron/trend` | 일일 트렌드 수집 Cron API |

## 프로젝트 구조

```text
app/
├── api/                  # API routes와 Cron routes
├── components/           # Navbar, Auth, TrendFeed 등 UI
├── generator/            # 영상 분석·대본 생성 화면
├── trends/               # 전체 트렌드 페이지
└── page.tsx              # 메인 화면
services/                 # Gemini·Apify·결제 서비스
lib/supabase/             # 브라우저·서버 Supabase client
supabase/migrations/      # 데이터베이스 마이그레이션
utils/                    # URL 정규화 및 공통 유틸리티
__tests__/                # Vitest 테스트
```

## 개발 명령어

```bash
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드
npm run start     # 프로덕션 서버
npm run lint      # ESLint
npm test          # Vitest
```

Windows PowerShell에서 실행 정책으로 `npm`이 차단되면 `.cmd` 확장자를 사용하세요.

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd test -- --run
```

## 배포

1. Vercel 프로젝트를 GitHub 저장소에 연결합니다.
2. Vercel Project Settings에 `.env.local`의 환경변수를 등록합니다.
3. Supabase migration을 먼저 적용합니다.
4. `main` 브랜치에 push하면 Vercel이 애플리케이션을 배포합니다.
5. Vercel Cron 설정에서 `/api/cron/trend` 실행 상태를 확인합니다.

## 보안 및 운영 주의사항

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 코드에서만 사용합니다.
- `CRON_SECRET` 없이 Cron endpoint를 운영하지 않는 것을 권장합니다.
- API 키와 사용자 비밀번호를 SQL migration, README, Git 커밋에 기록하지 않습니다.
- 원격 Supabase 스키마는 Dashboard에서 직접 수정하지 말고 migration 파일로 변경합니다.
- 외부 플랫폼의 이용약관과 API quota를 준수해야 합니다.

## 마스터 콘솔 운영

`/Master`는 별도 비밀번호를 소스에 저장하지 않고 Supabase Auth 세션과
`admin_users` 권한을 모두 검증합니다. `20260912000024_master_console.sql` 적용 시
이미 존재하는 `psunghyi@gmail.com` Auth 계정에 최초 `master` 역할을 부여합니다.

운영 순서:

1. Supabase Authentication에 관리자 계정이 존재하고 이메일 인증이 완료되었는지 확인합니다.
2. `npx supabase db push`로 최신 마이그레이션을 적용합니다.
3. `/Master`에서 해당 Supabase Auth 계정으로 로그인합니다.

마이그레이션 이후 계정을 새로 만들었다면 이메일만으로 권한을 자동 부여하지 않습니다.
Supabase SQL Editor에서 실제 Auth 사용자 UUID를 확인한 뒤 다음처럼 명시적으로 등록합니다.

```sql
INSERT INTO public.admin_users (user_id, role, is_active)
VALUES ('실제-auth-user-uuid', 'master', true)
ON CONFLICT (user_id) DO NOTHING;
```

- 비밀번호, service role key, API 키는 소스·마이그레이션·문서에 기록하지 않습니다.
- 트렌드 삭제는 소프트 삭제이므로 콘솔의 삭제 보관함에서 복원할 수 있습니다.
- 사용자/피드 변경은 `admin_audit_logs`에 기록됩니다.
- 결제 키, 사용자 API 키, 비밀번호는 관리자 API에서도 조회하거나 표시하지 않습니다.
