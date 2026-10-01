// ============================================================
// [서비스] 코스피/코스닥/환율 등 시황 API 핸들러
// 기존 server.js의 /api/news, /api/stock/technicals 를 연동
// ============================================================

import type { IndexData, ExchangeRate, StockTechnicals, StockReport, StockQAResult, ThemeSearchResult, Theme } from '@/types/stock';

// 백엔드 API 기본 URL (로컬: 빈 문자열, 배포: Render 주소)
const BACKEND_API_BASE =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? ''
    : 'https://my-stock-api.onrender.com';

// 기본 fetch 헬퍼 (타임아웃 + 에러 처리)
async function apiFetch<T>(url: string, options?: RequestInit, timeoutMs = 10000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── 코스피/코스닥 지수 조회 (네이버 증시 API)
export async function fetchMarketIndices(): Promise<IndexData[]> {
  try {
    const [kospiRes, kosdaqRes] = await Promise.all([
      apiFetch<Record<string, unknown>>('https://m.stock.naver.com/api/index/KOSPI/basic'),
      apiFetch<Record<string, unknown>>('https://m.stock.naver.com/api/index/KOSDAQ/basic'),
    ]);

    const result: IndexData[] = [];

    if (kospiRes) {
      const val = parseFloat(String(kospiRes.closePrice || 0).replace(/,/g, ''));
      const chg = parseFloat(String(kospiRes.compareToPreviousClosePrice || 0).replace(/,/g, ''));
      const chgRate = parseFloat(String(kospiRes.fluctuationsRatio || 0));
      result.push({ name: '코스피', value: val, change: chg, changeRate: chgRate, isUp: chg >= 0 });
    }
    if (kosdaqRes) {
      const val = parseFloat(String(kosdaqRes.closePrice || 0).replace(/,/g, ''));
      const chg = parseFloat(String(kosdaqRes.compareToPreviousClosePrice || 0).replace(/,/g, ''));
      const chgRate = parseFloat(String(kosdaqRes.fluctuationsRatio || 0));
      result.push({ name: '코스닥', value: val, change: chg, changeRate: chgRate, isUp: chg >= 0 });
    }

    // 데이터가 없으면 폴백
    if (result.length === 0) {
      return getFallbackIndices();
    }

    return result;
  } catch {
    return getFallbackIndices();
  }
}

// ── 원/달러 환율 조회
export async function fetchExchangeRate(): Promise<ExchangeRate> {
  try {
    const data = await apiFetch<Record<string, unknown>>(
      'https://m.stock.naver.com/api/index/FX_USDKRW/basic'
    );
    if (data) {
      const rate = parseFloat(String(data.closePrice || 1300).replace(/,/g, ''));
      const chg = parseFloat(String(data.compareToPreviousClosePrice || 0).replace(/,/g, ''));
      return { currency: 'USD/KRW', rate, change: chg, isUp: chg >= 0 };
    }
  } catch {/* fall through */}
  return { currency: 'USD/KRW', rate: 1380.5, change: 2.3, isUp: false };
}

// ── 폴백 지수 (API 불가 시)
function getFallbackIndices(): IndexData[] {
  return [
    { name: '코스피', value: 2780.12, change: 12.34, changeRate: 0.45, isUp: true },
    { name: '코스닥', value: 832.45, change: -3.21, changeRate: -0.38, isUp: false },
  ];
}

// ── 종목 기술적 분석 조회 (/api/stock/technicals)
export async function fetchStockTechnicals(stockName: string): Promise<StockTechnicals | null> {
  return apiFetch<StockTechnicals>(
    `${BACKEND_API_BASE}/api/stock/technicals?corp_name=${encodeURIComponent(stockName)}`
  );
}

// ── 증권사 리포트 조회 (/api/reports)
export async function fetchStockReports(stockName?: string): Promise<StockReport[]> {
  const url = stockName
    ? `${BACKEND_API_BASE}/api/reports?stock=${encodeURIComponent(stockName)}`
    : `${BACKEND_API_BASE}/api/reports?type=today`;

  const data = await apiFetch<{ items: StockReport[] }>(url);
  return data?.items ?? [];
}

// ── 주식 탐정 Q&A (/api/stock/qa)
export async function fetchStockQA(query: string): Promise<StockQAResult | null> {
  return apiFetch<StockQAResult>(
    `${BACKEND_API_BASE}/api/stock/qa?query=${encodeURIComponent(query)}`,
    undefined,
    15000
  );
}

// ── 테마 DB 검색 (/api/themes/search)
export async function searchThemes(q: string): Promise<ThemeSearchResult[]> {
  const data = await apiFetch<{ items: ThemeSearchResult[] }>(
    `${BACKEND_API_BASE}/api/themes/search?q=${encodeURIComponent(q)}`
  );
  return data?.items ?? [];
}

// ── theme_timeline.json 로드
export async function fetchThemeTimeline(): Promise<Theme[]> {
  try {
    const res = await fetch(`/data/theme_timeline.json?v=${Date.now()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.themes ?? []);
  } catch {
    return [];
  }
}

// ── 레이더 타임라인 수집 (/api/radar/timeline)
export async function fetchRadarTimeline(theme: string): Promise<import('@/types/stock').TimelineItem[]> {
  const data = await apiFetch<{ items: import('@/types/stock').TimelineItem[] }>(
    `${BACKEND_API_BASE}/api/radar/timeline?theme=${encodeURIComponent(theme)}&t=${Date.now()}`,
    undefined,
    12000
  );
  return data?.items ?? [];
}
