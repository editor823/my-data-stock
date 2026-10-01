'use client';

import { useNewsFeed } from '@/hooks/useNewsFeed';
import NewsFeedList from '@/components/news/NewsFeedList';
import NewsFilterBar from '@/components/news/NewsFilterBar';

const US_INDICES = [
  { name: 'S&P 500', symbol: 'SPX', region: '뉴욕', link: 'https://m.stock.naver.com/worldstock/index/SPI@SPX/total' },
  { name: '나스닥',  symbol: 'IXIC', region: '나스닥', link: 'https://m.stock.naver.com/worldstock/index/NAS@IXIC/total' },
  { name: '다우존스', symbol: 'DJI', region: '뉴욕', link: 'https://m.stock.naver.com/worldstock/index/NYS@DJI/total' },
  { name: '공포·탐욕 지수', symbol: 'VIX', region: 'CBOE', link: 'https://m.stock.naver.com/worldstock/index/SPI@VIX/total' },
];

export default function UsMarketClient() {
  const { filteredItems, isLoading, filter, setFilter, refresh } = useNewsFeed('미국 증시');

  return (
    <div className="page-container fade-in">
      <header className="page-header">
        <h1 className="page-title">🇺🇸 미국 증시 총정리 &amp; 시황</h1>
        <p className="page-subtitle">뉴욕 3대 지수 · 공포탐욕 지수 · 실시간 월가 뉴스</p>
      </header>

      {/* 미국 지수 바로가기 카드 */}
      <section aria-label="미국 주요 지수" className="momentum-grid" style={{ marginBottom: 28 }}>
        {US_INDICES.map(idx => (
          <a
            key={idx.symbol}
            href={idx.link}
            target="_blank"
            rel="noopener noreferrer"
            id={`us-index-${idx.symbol}`}
            className="momentum-card"
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <div className="momentum-card-icon">📈</div>
            <div className="momentum-card-label">{idx.region}</div>
            <div className="momentum-card-value">{idx.name}</div>
            <div className="momentum-card-sub">↗ 네이버 증시 연결</div>
          </a>
        ))}
      </section>

      {/* 미국 증시 관련 뉴스 */}
      <section aria-label="미국 증시 뉴스">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, marginBottom: 16, color: 'var(--text-secondary)' }}>
          📰 미국 증시 관련 국내 뉴스
        </h2>
        <NewsFilterBar filter={filter} onFilterChange={setFilter} onSearch={refresh} />
        <NewsFeedList items={filteredItems} isLoading={isLoading} />
      </section>
    </div>
  );
}
