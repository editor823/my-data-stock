'use client';

import { useRadarDetect } from '@/hooks/useRadarDetect';
import { ThemeRadarBox, PullbackTable } from '@/components/themes/ThemeRadarBox';
import { useState } from 'react';
import { searchThemes } from '@/services/stockApi';
import type { ThemeSearchResult } from '@/types/stock';

export default function ThemesClient() {
  const { activeTheme, radarItems, isLoading } = useRadarDetect();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ThemeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchThemes(searchQuery.trim());
    setSearchResults(results);
    setSearching(false);
  };

  return (
    <div className="page-container fade-in">
      <header className="page-header">
        <h1 className="page-title">🎯 재료 모음 &amp; 눌림목 공략</h1>
        <p className="page-subtitle">거래대금 1,000억+ 주도 테마 · 7대 체크리스트 · 3중 단서 타임라인</p>
      </header>

      {/* 테마 DB 검색 */}
      <section aria-label="테마 검색" className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 800, marginBottom: 12, color: 'var(--text-secondary)' }}>
          🔍 관심 테마 DB 검색
        </h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            id="theme-db-search"
            type="text"
            className="filter-input"
            placeholder="테마명 또는 종목명 검색 (예: 스페이스X, 대한전선)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            aria-label="테마 검색 입력"
            style={{ flex: 1 }}
          />
          <button
            id="theme-db-search-btn"
            className="filter-search-btn"
            onClick={handleSearch}
            disabled={searching}
            aria-label="테마 검색"
            style={{ padding: '8px 18px', fontSize: '0.84rem' }}
          >
            {searching ? '검색 중...' : '🔍 검색'}
          </button>
        </div>

        {/* 검색 결과 */}
        {searchResults.length > 0 && (
          <div id="theme-search-results" style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {searchResults.map((t, i) => (
              <div key={i} className="card" style={{ padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{t.name}</span>
                    <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--accent-blue)', background: 'rgba(56,189,248,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                      {t.category}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 700 }}>{t.stocks_count}종목</span>
                </div>
                {t.lead_stocks && (
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    👑 대장: {t.lead_stocks}
                    {t.matched_stock_names && t.matched_stock_names.length > 0 && (
                      <span style={{ marginLeft: 8, color: 'var(--accent-purple)' }}>
                        매칭: {t.matched_stock_names.join(', ')}
                      </span>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 메인 테마 레이더 */}
      <section aria-label="테마 레이더" style={{ marginBottom: 24 }}>
        <ThemeRadarBox />
      </section>

      {/* 타임라인 테이블 */}
      <section aria-label="눌림목 타임라인">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, marginBottom: 14, color: 'var(--text-secondary)' }}>
          📋 테마 재료 타임라인
          {activeTheme && <span style={{ color: 'var(--accent-blue)', marginLeft: 8 }}>— {activeTheme.theme_name}</span>}
        </h2>
        {isLoading ? (
          <div className="news-loading"><div className="spinner" /></div>
        ) : (
          <PullbackTable items={radarItems} />
        )}
      </section>
    </div>
  );
}
