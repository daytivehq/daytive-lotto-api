# Lotto API

동행복권 로또 당첨번호 조회 API (Cloudflare Worker)

## 엔드포인트

| 경로 | 설명 |
|------|------|
| `/lotto?round=회차` | 특정 회차 조회 |
| `/lotto/latest` | 최신 회차 조회 |

## 응답 예시

```json
{
  "round": 1100,
  "date": "2023-12-30",
  "numbers": [17, 26, 29, 30, 31, 43],
  "bonusNumber": 12,
  "totalSales": 116187023000,
  "firstPrize": 2207575472,
  "firstWinners": 13
}
```

## 개발

```bash
npm install
npm run dev
```

## 배포

```bash
npm run deploy
```
