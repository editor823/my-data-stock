// ============================================================
// [서비스] 네이버/국내 뉴스 API 연동
// ============================================================

import type { NewsItem } from '@/types/news';

const BACKEND_API_BASE =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? ''
    : 'https://my-stock-api.onrender.com';

// 뉴스 검색 API 호출 (/api/news)
export async function fetchNews(query: string = '증시', pageSize = 30): Promise<NewsItem[]> {
  try {
    const url = `${BACKEND_API_BASE}/api/news?query=${encodeURIComponent(query)}&pageSize=${pageSize}`;
    const res = await fetch(url, {
      next: { revalidate: 60 },   // Next.js 캐시 60초
    });
    if (!res.ok) return [];
    const raw = await res.json();

    // 네이버 모바일 증시 API 응답 정규화
    const items: unknown[] = Array.isArray(raw) ? raw : (raw.items || []);
    return items.map((n: unknown) => {
      const item = n as Record<string, unknown>;
      const dt = String(item.dt || '');
      const formattedDate =
        dt.length >= 8
          ? `${dt.substring(0, 4)}-${dt.substring(4, 6)}-${dt.substring(6, 8)}`
          : new Date().toISOString().slice(0, 10);

      const oid = String(item.oid || '');
      const aid = String(item.aid || '');
      const newsUrl =
        oid && aid
          ? `https://n.news.naver.com/mnews/article/${oid}/${aid}`
          : String(item.link || `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(query)}`);

      return {
        date: formattedDate,
        press: String(item.ohnm || '언론 종합'),
        title: String(item.tit || item.title || query),
        news_title: String(item.tit || item.title || query),
        link: newsUrl,
        news_url: newsUrl,
        key_point: String(item.subcontent || '').slice(0, 90) + '...',
        channel: 'NEWS' as const,
        stockName: query,
      } satisfies NewsItem;
    });
  } catch {
    return [];
  }
}

// 실시간 국내 주식 뉴스 (다중 카테고리 병렬 수집)
export async function fetchDomesticStockNews(): Promise<NewsItem[]> {
  const queries = ['증시', '코스피 특징주', '코스닥 급등', '테마주 상승 이유'];
  const results = await Promise.allSettled(queries.map(q => fetchNews(q, 15)));

  const all: NewsItem[] = [];
  const seen = new Set<string>();

  results.forEach(r => {
    if (r.status === 'fulfilled') {
      r.value.forEach(item => {
        const key = (item.title || item.news_title || '').slice(0, 20);
        if (key && !seen.has(key)) {
          seen.add(key);
          all.push(item);
        }
      });
    }
  });

  return all.sort((a, b) => b.date.localeCompare(a.date));
}
