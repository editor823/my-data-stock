// ============================================================
// [서비스] 자연어 원인 분석 LLM 프록시 API 호출
// 기존 /api/stock/qa 엔드포인트를 감싸는 래퍼
// ============================================================

import type { StockQAResult } from '@/types/stock';

const BACKEND_API_BASE =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? ''
    : 'https://my-stock-api.onrender.com';

// ── 주식 탐정 Q&A: 자연어 질문 → 원인 분석 결과 반환
export async function analyzeStockQuestion(query: string): Promise<StockQAResult> {
  const fallback: StockQAResult = {
    status: '500',
    keyword: query,
    main_reason: `[${query}] 관련 뉴스 및 수급 팩트를 탐색 중입니다.`,
    related_stocks: [{ name: query, role: '분석 대상', change_rate: '집계중', reason_detail: '실시간 시황 모니터링 진행 중' }],
    catalyst_news: [],
  };

  if (!query.trim()) return fallback;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(
      `${BACKEND_API_BASE}/api/stock/qa?query=${encodeURIComponent(query)}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (!res.ok) return fallback;
    const data: StockQAResult = await res.json();
    return data;
  } catch {
    return fallback;
  }
}

// ── DART 전자공시 원인 분석 (공시 기반 자동 해석)
export async function analyzeDartDisclosure(corpName: string): Promise<string> {
  try {
    const res = await fetch(
      `${BACKEND_API_BASE}/api/dart/disclosures?corp_name=${encodeURIComponent(corpName)}`
    );
    if (!res.ok) return '공시 조회 실패';
    const data = await res.json();
    const items: Array<{ report_nm: string; date: string }> = data.items || [];
    if (items.length === 0) return '최근 공시 없음';
    return items[0]
      ? `최근 공시: [${items[0].report_nm}] (${items[0].date})`
      : '공시 정보 없음';
  } catch {
    return '공시 서비스 연결 불가';
  }
}
