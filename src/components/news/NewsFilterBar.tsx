'use client';

// ============================================================
// [컴포넌트] 뉴스 필터 바 (채널/키워드 필터)
// ============================================================

import type { NewsFilter, NewsChannel } from '@/types/news';

const CHANNELS: { value: NewsChannel; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'NEWS', label: '📰 뉴스' },
  { value: 'DART', label: '📑 공시' },
  { value: 'REPORT', label: '📊 리포트' },
];

interface Props {
  filter: NewsFilter;
  onFilterChange: (partial: Partial<NewsFilter>) => void;
  onSearch: () => void;
}

export default function NewsFilterBar({ filter, onFilterChange, onSearch }: Props) {
  return (
    <div className="news-filter-bar" role="search" aria-label="뉴스 필터">
      {/* 채널 탭 */}
      <div className="filter-tabs" role="tablist">
        {CHANNELS.map(ch => (
          <button
            key={ch.value}
            role="tab"
            aria-selected={filter.channel === ch.value}
            className={`filter-tab ${filter.channel === ch.value ? 'active' : ''}`}
            onClick={() => onFilterChange({ channel: ch.value })}
          >
            {ch.label}
          </button>
        ))}
      </div>

      {/* 키워드 검색 */}
      <div className="filter-search">
        <input
          id="news-keyword-input"
          type="text"
          className="filter-input"
          placeholder="종목명/키워드 검색 (예: 대한전선)"
          value={filter.keyword || ''}
          onChange={e => onFilterChange({ keyword: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && onSearch()}
          aria-label="뉴스 키워드 검색"
        />
        <button
          id="news-search-btn"
          className="filter-search-btn"
          onClick={onSearch}
          aria-label="검색 실행"
        >
          🔍
        </button>
      </div>
    </div>
  );
}
