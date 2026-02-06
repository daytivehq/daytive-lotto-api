# Lotto API

동행복권 로또 당첨번호 조회 API (Cloudflare Worker)

## 엔드포인트

| 경로 | 설명 |
|------|------|
| `/round/{회차}` | 특정 회차 조회 (예: `/round/1111`) |
| `/round/latest` | 최신 회차 조회 |

## 응답 예시

```json
{
  "round": 1209,
  "date": "2026-01-31",
  "numbers": [2, 17, 20, 35, 37, 39],
  "bonusNumber": 24,
  "totalSales": 124040394000,
  "firstPrize": 1371910466,
  "firstWinners": 22
}
```

## 개발

```bash
npm install
npm run dev
```

## 배포

Cloudflare 대시보드에서 GitHub 레포지토리(`main` 브랜치)를 연결하여 배포

수동 배포:
```bash
npm run deploy
```
