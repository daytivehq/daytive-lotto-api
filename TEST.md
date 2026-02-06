# API 테스트 가이드

베이스 URL: `https://daytive-lotto-api.daytive.workers.dev`

---

## 1. URL 구조 테스트

### 1-1. 특정 회차 조회

**목적:** `/round/{회차}` 경로가 정상 동작하는지 확인

```
https://daytive-lotto-api.daytive.workers.dev/round/1111
```

**정상 결과:** 1111회차 당첨 정보가 JSON으로 반환됨
```json
{
  "round": 1111,
  "date": "...",
  "numbers": [...],
  "bonusNumber": ...,
  "totalSales": ...,
  "firstPrize": ...,
  "firstWinners": ...
}
```

### 1-2. 최신 회차 조회

**목적:** `/round/latest` 경로가 정상 동작하는지 확인

```
https://daytive-lotto-api.daytive.workers.dev/round/latest
```

**정상 결과:** 가장 최근 회차 정보가 반환됨. `round` 값이 현재 최신 회차 번호인지 확인

---

## 2. 입력값 검증 테스트

### 2-1. 범위 밖 숫자 (0, 10000 이상)

**목적:** 허용 범위(1~9999) 밖의 숫자가 차단되는지 확인

```
https://daytive-lotto-api.daytive.workers.dev/round/0
https://daytive-lotto-api.daytive.workers.dev/round/10000
```

**정상 결과:** 400 응답
```json
{
  "error": "Invalid round number. Must be an integer between 1 and 9999."
}
```

### 2-2. 숫자가 아닌 값 (문자, 소수점, 지수)

**목적:** 정수가 아닌 값이 차단되는지 확인

```
https://daytive-lotto-api.daytive.workers.dev/round/abc
https://daytive-lotto-api.daytive.workers.dev/round/1.5
https://daytive-lotto-api.daytive.workers.dev/round/1e3
```

**정상 결과:** 셋 다 동일한 400 응답

### 2-3. 경계값 (1, 9999)

**목적:** 최소/최대 경계가 정상 통과되는지 확인

```
https://daytive-lotto-api.daytive.workers.dev/round/1
https://daytive-lotto-api.daytive.workers.dev/round/9999
```

**정상 결과:**
- `/round/1` → 1회차 데이터 정상 반환
- `/round/9999` → 아직 없는 회차이므로 404 (`Round not found`)

---

## 3. 캐싱 테스트

> 캐시는 배포된 환경에서만 동작합니다. 로컬(`wrangler dev`)에서는 확인 불가.
> PowerShell에서 `curl`은 `Invoke-WebRequest` 별칭이므로 반드시 `curl.exe`를 사용하세요.

### 3-1. 과거 회차 Cache-Control 확인

**목적:** 과거 회차의 캐시 TTL이 7일(604800초)로 설정되는지 확인

```powershell
curl.exe -s -D - -o NUL https://daytive-lotto-api.daytive.workers.dev/round/1111
```

**확인 포인트:**
- `Cache-Control: public, max-age=604800` → 7일 캐싱
- `CF-Cache-Status: HIT` → 캐시에서 반환됨 (첫 요청은 `MISS`일 수 있음)

### 3-2. 최신 회차 Cache-Control 확인

**목적:** latest의 캐시 TTL이 10분(600초)으로 설정되는지 확인

```powershell
curl.exe -s -D - -o NUL https://daytive-lotto-api.daytive.workers.dev/round/latest
```

**확인 포인트:**
- `Cache-Control: public, max-age=600` → 10분 캐싱

### 3-3. 캐시 히트 확인

**목적:** 같은 요청을 두 번 보내서 캐시가 동작하는지 확인

```powershell
curl.exe -s -D - -o NUL https://daytive-lotto-api.daytive.workers.dev/round/1111
curl.exe -s -D - -o NUL https://daytive-lotto-api.daytive.workers.dev/round/1111
```

**확인 포인트:** 두 번째 응답 헤더에서 `CF-Cache-Status: HIT`, `Age` 값이 0보다 크면 캐시 정상 동작
