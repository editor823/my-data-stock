'use client';

import { useNewsFeed } from '@/hooks/useNewsFeed';
import NewsFeedList from '@/components/news/NewsFeedList';
import NewsFilterBar from '@/components/news/NewsFilterBar';

export default function NewsPageClient() {
  const { filteredItems, isLoading, error, filter, setFilter, refresh } = useNewsFeed('증시');

  return (
    <div className="page-container fade-in">
      <header className="page-header">
        <h1 className="page-title">📰 실시간 국내 주식 뉴스 센터</h1>
        <p className="page-subtitle">
          네이버 증시 실시간 뉴스 · 전자공시(DART) · 증권사 리포트 통합 피드
        </p>
      </header>

      <NewsFilterBar
        filter={filter}
        onFilterChange={setFilter}
        onSearch={refresh}
      />

      {error && (
        <div className="news-empty" style={{ color: 'var(--accent-red)' }}>
          ⚠️ {error}
          <button onClick={refresh} style={{
            marginTop: 8, padding: '6px 16px', borderRadius: 8,
            background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)',
            color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.82rem'
          }}>재시도</button>
        </div>
      )}

      <NewsFeedList items={filteredItems} isLoading={isLoading} />
    </div>
  );
}
