'use client';

// ============================================================
// [컴포넌트] 뉴스 카드 목록
// ============================================================

import type { NewsItem } from '@/types/news';

interface Props {
  items: NewsItem[];
  isLoading?: boolean;
}

function NewsCard({ item }: { item: NewsItem }) {
  const url = item.news_url || item.link || '#';
  const channelBadge: Record<string, { label: string; color: string }> = {
    DART: { label: '📑 공시', color: '#f59e0b' },
    REPORT: { label: '📊 리포트', color: '#34d399' },
    BLOG: { label: '✏️ 블로그', color: '#818cf8' },
    NEWS: { label: '📰 뉴스', color: '#38bdf8' },
  };
  const badge = item.channel ? channelBadge[item.channel] : channelBadge['NEWS'];

  return (
    <article className="news-card" id={`news-${encodeURIComponent(item.title?.slice(0, 10) || 'item')}`}>
      <div className="news-card-header">
        <span className="news-badge" style={{ color: badge?.color }}>
          {badge?.label ?? '📰 뉴스'}
        </span>
        <span className="news-press">{item.press}</span>
        <span className="news-date">{item.date}</span>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="news-title-link">
        <h3 className="news-title">{item.title || item.news_title}</h3>
      </a>
      {item.key_point && (
        <p className="news-snippet">{item.key_point}</p>
      )}
    </article>
  );
}

export default function NewsFeedList({ items, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="news-loading">
        <div className="spinner" />
        <p>뉴스를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="news-empty">
        <p>📭 표시할 뉴스가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="news-feed-list" role="feed" aria-label="뉴스 목록">
      {items.map((item, i) => (
        <NewsCard key={`${item.news_url}-${i}`} item={item} />
      ))}
    </div>
  );
}
