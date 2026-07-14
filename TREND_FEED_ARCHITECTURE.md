# 🚀 Trend Feed Architecture - 인프라 비용 0원 실시간 피드 시스템

## 📋 개요

**Vercel Cron + Gemini Flash AI + Supabase** 조합으로 구현한 **인프라 비용 0원** 실시간 트렌드 피드 자동 갱신 시스템입니다.

### 핵심 아키텍처

```
┌─────────────────┐      6시간마다      ┌──────────────────┐
│  Vercel Cron    │ ──────────────────> │   /api/cron/     │
│  Scheduler      │   Bearer Token 인증  │   trend/route.ts │
└─────────────────┘                     └──────────────────┘
                                               │
                                               ▼
                                        ┌──────────────────┐
                                        │  Gemini 2.5      │
                                        │  Flash AI        │
                                        │  (무료 tier)     │
                                        └──────────────────┘
                                               │
                                               ▼ JSON Schema 강제
                                        ┌──────────────────┐
                                        │  6개 트렌드      │
                                        │  데이터 생성     │
                                        └──────────────────┘
                                               │
                                               ▼
                                        ┌──────────────────┐
                                        │  Supabase DB     │
                                        │  (무료 tier)     │
                                        │  DELETE + INSERT │
                                        └──────────────────┘
                                               │
                                               ▼
                                        ┌──────────────────┐
                                        │  TrendFeed.tsx   │
                                        │  (SSR + SWR)     │
                                        └──────────────────┘
```

---

## 📂 1단계: Supabase DB 테이블 스키마

### 파일 위치
`supabase/migrations/005_trend_feed.sql`

### 스키마 구조

```sql
CREATE TABLE public.trend_feed (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform   TEXT NOT NULL CHECK (platform IN ('TikTok', 'YouTube Shorts', 'Instagram Reels')),
    region     TEXT NOT NULL CHECK (region IN ('US', 'KR', 'JP')),
    title      TEXT NOT NULL,
    subtitle   TEXT,
    views      TEXT,
    likes      TEXT,
    tags       TEXT,
    thumb_url  TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### RLS 정책
- **SELECT**: 모두 허용 (public read)
- **INSERT/DELETE**: Service Role만 허용 (Cron API 전용)

---

## 🔧 2단계: Vercel Cron API 라우트

### 파일 위치
`app/api/cron/trend/route.ts`

### 주요 기능

#### 1. **보안 인증**
```typescript
const auth = req.headers.get('authorization');
const expected = process.env.CRON_SECRET;
if (expected && auth !== `Bearer ${expected}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

#### 2. **Gemini AI 호출**
- 모델: `gemini-2.5-flash` (무료 tier)
- Temperature: 0.9 (다양성 확보)
- Response Schema 강제로 파싱 오류 방지

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT }] }],
  config: {
    responseMimeType: 'application/json',
    responseSchema: trendItemSchema,
    temperature: 0.9,
  },
});
```

#### 3. **프롬프트 전략**
```typescript
const SYSTEM_PROMPT = `You are a 2026 Global Short-Form Trend Analyst.
Your job is to produce a JSON array of exactly 6 fictitious but realistic 
trending short-form video summaries across US TikTok, KR YouTube Shorts, 
and JP Instagram Reels.

Ensure diversity:
- At least 2 from each region (US, KR, JP)
- At least 1 from each platform
- Topics: AI tech, food, beauty, dance, comedy, marketing tips`;
```

#### 4. **DB 동기화 (DELETE + INSERT)**
```typescript
// 기존 데이터 삭제
await supabase.from('trend_feed').delete().neq('id', '00000000-0000-0000-0000-000000000000');

// 새 데이터 삽입
const { error: insertErr } = await supabase.from('trend_feed').insert(rows);
```

---

## ⏰ 3단계: Vercel Cron 스케줄러

### 파일 위치
`vercel.json`

### 설정
```json
{
  "crons": [
    {
      "path": "/api/cron/trend",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

- **스케줄**: 6시간마다 실행 (`0 */6 * * *`)
- **경로**: `/api/cron/trend`
- **인증**: Vercel이 자동으로 `Authorization: Bearer ${CRON_SECRET}` 헤더 추가

---

## 🎨 4단계: 프론트엔드 UI 컴포넌트

### 파일 위치
`app/components/TrendFeed.tsx`

### 주요 개선사항

#### 1. **하드코딩 제거 + Fallback**
```typescript
// DB 조회 실패 시에만 사용하는 fallback 데이터
const FALLBACK_DEMO_DATA: TrendItem[] = [...];

if (dbErr || !data?.length) {
  console.warn('[TrendFeed] DB 조회 실패, fallback 사용');
  setTrends(FALLBACK_DEMO_DATA);
  setError(true);
  return;
}
```

#### 2. **Skeleton UI (로딩 상태)**
```typescript
{loading && (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
  </div>
)}
```

#### 3. **실시간 데이터 페칭**
```typescript
useEffect(() => {
  async function fetchTrends() {
    const supabase = getSupabaseBrowserClient();
    const { data, error: dbErr } = await supabase
      .from('trend_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6);
    
    if (!dbErr && data?.length) {
      setTrends(data);
      setError(false);
    }
  }
  fetchTrends();
}, []);
```

#### 4. **플랫폼별 필터링**
```typescript
const filtered = activeFilter === 'all' 
  ? trends 
  : trends.filter((t) => toFilterKey(t.platform) === activeFilter);
```

---

## 🔐 환경 변수 설정

`.env.local` 파일에 다음 값을 설정하세요:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google AI (Gemini)
GOOGLE_AI_API_KEY=your-gemini-api-key

# Vercel Cron Secret
CRON_SECRET=your-random-secret-token
```

### CRON_SECRET 생성 방법
```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

---

## 🚀 배포 및 테스트

### 1. Supabase 마이그레이션 실행
```bash
# Supabase CLI 설치
npm install -g supabase

# 마이그레이션 실행
supabase db push
```

### 2. Vercel 배포
```bash
vercel --prod
```

### 3. 환경 변수 설정 (Vercel Dashboard)
1. Project Settings → Environment Variables
2. `CRON_SECRET`, `GOOGLE_AI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 추가
3. Redeploy

### 4. 수동 Cron 테스트 (로컬)
```bash
# PowerShell
Invoke-WebRequest -Uri http://localhost:3000/api/cron/trend -Method POST -Headers @{"Content-Type"="application/json"}

# curl
curl -X POST http://localhost:3000/api/cron/trend
```

### 5. 수동 Cron 테스트 (프로덕션)
```bash
curl -X POST https://your-app.vercel.app/api/cron/trend \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 📊 비용 분석

| 서비스 | 사용량 | 비용 |
|--------|--------|------|
| **Vercel Cron** | 6시간마다 (월 120회) | 무료 |
| **Gemini 2.5 Flash** | 월 120회 API 호출 | 무료 tier |
| **Supabase DB** | 500MB 미만 | 무료 tier |
| **총계** | - | **₩0** |

---

## 🔍 트러블슈팅

### 1. Cron이 실행되지 않을 때
- Vercel Dashboard → Deployments → Logs 확인
- `CRON_SECRET` 환경 변수 확인
- Vercel Cron 할당량 확인 (무료 플랜: 월 1,000회)

### 2. DB 조회 실패 시
- Supabase RLS 정책 확인
- `SUPABASE_SERVICE_ROLE_KEY` 확인
- Supabase Dashboard → Table Editor에서 직접 데이터 확인

### 3. AI 응답 오류 시
- `GOOGLE_AI_API_KEY` 확인
- Gemini API 할당량 확인
- Response Schema 형식 확인

---

## 📝 추가 개선 아이디어

1. **SWR/React Query 도입**: 자동 revalidation
2. **Real-time Subscription**: Supabase Realtime으로 즉시 반영
3. **지역별 AI 프롬프트 튜닝**: 각 지역 문화 특성 강화
4. **썸네일 자동 생성**: DALL-E 3 통합
5. **트렌드 아카이빙**: 시계열 분석용 히스토리 테이블

---

## ✅ 체크리스트

- [x] Supabase 테이블 생성
- [x] Vercel Cron API 구현
- [x] Gemini AI 통합
- [x] 프론트엔드 Skeleton UI
- [x] Fallback 데이터 처리
- [x] 환경 변수 설정
- [x] 6시간 스케줄링
- [x] 보안 인증 구현
- [x] 반응형 디자인

---

**🎉 완성! 이제 인프라 비용 0원으로 실시간 트렌드 피드가 자동으로 갱신됩니다.**
