/**
 * Cloudflare Worker - 동행복권 API 프록시
 * 신규 API (2024~) 사용: lt645/selectPstLt645Info.do
 */

export interface Env {
  ALLOWED_ORIGIN: string;
}

// 신규 API 응답 타입
interface LottoNewAPIResponse {
  resultCode: string | null;
  resultMessage: string | null;
  data: {
    list: Array<{
      ltEpsd: number;           // 회차
      ltRflYmd: string;         // 추첨일 (yyyyMMdd)
      tm1WnNo: number;          // 번호1
      tm2WnNo: number;          // 번호2
      tm3WnNo: number;          // 번호3
      tm4WnNo: number;          // 번호4
      tm5WnNo: number;          // 번호5
      tm6WnNo: number;          // 번호6
      bnsWnNo: number;          // 보너스 번호
      rnk1WnNope: number;       // 1등 당첨자 수
      rnk1WnAmt: number;        // 1등 당첨금
      wholEpsdSumNtslAmt: number; // 총 판매액
    }>;
  };
}

// CORS 헤더 생성
function getCorsHeaders(origin: string, allowedOrigin: string): HeadersInit {
  const isAllowed = origin === allowedOrigin || allowedOrigin === '*' || origin?.includes('localhost');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// JSON 응답 헬퍼
function jsonResponse(data: unknown, status: number, corsHeaders: HeadersInit, cacheControl?: string): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...(cacheControl ? { 'Cache-Control': cacheControl } : {}),
    },
  });
}

// 날짜 포맷 변환 (yyyyMMdd → yyyy-MM-dd)
function formatDate(dateStr: string): string {
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}

// 동행복권 신규 API 호출
async function fetchLottoData(round?: number): Promise<LottoNewAPIResponse> {
  // GET 방식, srchLtEpsd 파라미터 사용
  const params = new URLSearchParams();
  if (round) {
    params.append('srchLtEpsd', round.toString());
  }

  const apiUrl = `https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?${params.toString()}`;

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const text = await response.text();
  console.log('API Response:', text);
  return JSON.parse(text);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = getCorsHeaders(origin, env.ALLOWED_ORIGIN);

    // CORS Preflight 처리
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // GET만 허용
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    // 라우팅: /round/{회차번호 또는 latest}
    const match = url.pathname.match(/^\/round\/(.+)$/);
    if (match) {
      const param = match[1];

      let round: number | undefined;
      if (param === 'latest') {
        round = undefined;
      } else if (!isNaN(Number(param))) {
        round = Number(param);
      } else {
        return jsonResponse({ error: 'Invalid round number' }, 400, corsHeaders);
      }

      // 캐시 확인 (캐시 키는 Origin 무관하게 경로 기준)
      const cache = caches.default;
      const cacheKey = new Request(url.toString(), { method: 'GET' });
      const cached = await cache.match(cacheKey);
      if (cached) {
        const response = new Response(cached.body, cached);
        // 캐시된 응답에 요청별 CORS 헤더 덮어쓰기
        Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
        return response;
      }

      try {
        const data = await fetchLottoData(round);

        if (!data.data?.list?.length) {
          return jsonResponse({ error: round ? 'Round not found' : 'Could not find latest round' }, 404, corsHeaders);
        }

        const item = data.data.list[0];
        const result = {
          round: item.ltEpsd,
          date: formatDate(item.ltRflYmd),
          numbers: [
            item.tm1WnNo,
            item.tm2WnNo,
            item.tm3WnNo,
            item.tm4WnNo,
            item.tm5WnNo,
            item.tm6WnNo,
          ],
          bonusNumber: item.bnsWnNo,
          totalSales: item.wholEpsdSumNtslAmt,
          firstPrize: item.rnk1WnAmt,
          firstWinners: item.rnk1WnNope,
        };

        // 과거 회차: 7일 캐싱 / latest: 10분 캐싱
        const maxAge = round ? 604800 : 600;
        const cacheControl = `public, max-age=${maxAge}`;
        const response = jsonResponse(result, 200, corsHeaders, cacheControl);

        // 캐시에 저장 (waitUntil 없이 await로 처리)
        await cache.put(cacheKey, response.clone());

        return response;
      } catch (error) {
        console.error('Error:', error);
        return jsonResponse({ error: 'Failed to fetch data', detail: String(error) }, 500, corsHeaders);
      }
    }

    // 404
    return jsonResponse({ error: 'Not found', endpoints: ['/round/{회차}', '/round/latest'] }, 404, corsHeaders);
  },
};
