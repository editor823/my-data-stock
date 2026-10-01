'use client';

// ============================================================
// [훅] 거래대금/급등 조건 감지 로직 (레이더 탐지)
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { fetchThemeTimeline, fetchRadarTimeline } from '@/services/stockApi';
import type { Theme, TimelineItem } from '@/types/stock';

interface UseRadarDetectReturn {
  themes: Theme[];
  activeTheme: Theme | null;
  radarItems: TimelineItem[];
  isLoading: boolean;
  selectTheme: (themeId: string) => void;
  refresh: () => void;
}

const CACHE_TTL = 30 * 60 * 1000; // 30분 캐시

function getLocalCache(key: string): TimelineItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { items, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL && Array.isArray(items)) return items;
    return null;
  } catch {
    return null;
  }
}

function setLocalCache(key: string, items: TimelineItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify({ items, ts: Date.now() }));
  } catch {/* localStorage 용량 초과 무시 */}
}

export function useRadarDetect(): UseRadarDetectReturn {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null);
  const [radarItems, setRadarItems] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 테마 목록 초기 로드
  const loadThemes = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await fetchThemeTimeline();
      setThemes(loaded);
      if (loaded.length > 0 && !activeTheme) {
        setActiveTheme(loaded[0]);
      }
    } catch {/* silent */} finally {
      setIsLoading(false);
    }
  }, [activeTheme]);

  // 활성 테마 변경 시 레이더 데이터 수집
  useEffect(() => {
    if (!activeTheme) return;

    const key = `cache_timeline_${encodeURIComponent(activeTheme.theme_name)}`;
    const cached = getLocalCache(key);

    if (cached) {
      // 캐시 히트: 즉시 반환 후 백그라운드 갱신 생략
      const merged = mergeTimelines(activeTheme.timeline || [], cached);
      setRadarItems(merged);
      return;
    }

    // 캐시 미스: API 호출
    setIsLoading(true);
    fetchRadarTimeline(activeTheme.theme_name)
      .then(items => {
        const merged = mergeTimelines(activeTheme.timeline || [], items);
        setRadarItems(merged);
        if (items.length > 0) setLocalCache(key, items);
      })
      .catch(() => setRadarItems(activeTheme.timeline || []))
      .finally(() => setIsLoading(false));
  }, [activeTheme]);

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  const selectTheme = useCallback((themeId: string) => {
    const found = themes.find(t => t.theme_id === themeId);
    if (found) setActiveTheme(found);
  }, [themes]);

  return {
    themes,
    activeTheme,
    radarItems,
    isLoading,
    selectTheme,
    refresh: loadThemes,
  };
}

// 중복 제거 병합
function mergeTimelines(base: TimelineItem[], extra: TimelineItem[]): TimelineItem[] {
  const result = [...base];
  extra.forEach(item => {
    const isBlog = item.is_blog || item.channel === 'BLOG';
    if (isBlog) return; // 블로그 항목 제외
    const dup = result.some(
      t => t.news_title === item.news_title || (t.news_url && t.news_url === item.news_url)
    );
    if (!dup) result.push(item);
  });
  return result.sort((a, b) => b.date.localeCompare(a.date));
}
