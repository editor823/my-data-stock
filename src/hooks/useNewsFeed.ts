'use client';

// ============================================================
// [훅] 뉴스 피드 및 카테고리 필터링 훅
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchNews } from '@/services/newsApi';
import type { NewsItem, NewsFilter, NewsChannel } from '@/types/news';

interface UseNewsFeedReturn {
  items: NewsItem[];
  filteredItems: NewsItem[];
  isLoading: boolean;
  error: string | null;
  filter: NewsFilter;
  setFilter: (f: Partial<NewsFilter>) => void;
  refresh: () => void;
}

export function useNewsFeed(initialQuery = '증시'): UseNewsFeedReturn {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilterState] = useState<NewsFilter>({
    channel: 'ALL',
    keyword: initialQuery,
  });

  const loadNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchNews(filter.keyword || '증시', 50);
      setItems(data);
    } catch (e) {
      setError('뉴스를 불러오는 중 오류가 발생했습니다.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [filter.keyword]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const filteredItems = useMemo(() => {
    let result = [...items];
    // 채널 필터
    if (filter.channel !== 'ALL') {
      result = result.filter(item => item.channel === filter.channel);
    }
    // 날짜 범위 필터
    if (filter.dateFrom) {
      result = result.filter(item => item.date >= filter.dateFrom!);
    }
    if (filter.dateTo) {
      result = result.filter(item => item.date <= filter.dateTo!);
    }
    return result;
  }, [items, filter]);

  const setFilter = useCallback((partial: Partial<NewsFilter>) => {
    setFilterState(prev => ({ ...prev, ...partial }));
  }, []);

  return { items, filteredItems, isLoading, error, filter, setFilter, refresh: loadNews };
}
