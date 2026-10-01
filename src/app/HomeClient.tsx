'use client';

import { useRadarDetect } from '@/hooks/useRadarDetect';
import { ThemeRadarBox, PullbackTable } from '@/components/themes/ThemeRadarBox';

const MOMENTUM_CARDS = [
  { icon: '🚀', label: '1위 최강 모멘텀', id: 'card-1' },
  { icon: '🔄', label: '순환매 유입 2위', id: 'card-2' },
  { icon: '⚠️', label: '재료 소멸 주의', id: 'card-3' },
  { icon: '✨', label: '신규 부각 기대주', id: 'card-4' },
];

export default function HomeClient() {
  const { themes, activeTheme, radarItems, isLoading } = useRadarDetect();

  return (
    <div className="page-container fade-in">
      <header className="page-header">
        <h1 className="page-title">📊 주식 인텔리전스 분석 센터</h1>
        <p className="page-subtitle">
          실시간 시황 · 테마 레이더 · 뉴스 · 탐정 Q&A — 올인원 주식 분석 플랫폼
        </p>
      </header>

      {/* 모멘텀 요약 카드 4개 */}
      <section aria-label="모멘텀 요약 카드" className="momentum-grid">
        {MOMENTUM_CARDS.map((card, i) => {
          const theme = themes[i];
          return (
            <div key={card.id} id={card.id} className="momentum-card">
              <div className="momentum-card-icon">{card.icon}</div>
              <div className="momentum-card-label">{card.label}</div>
              <div className="momentum-card-value">
                {isLoading ? '수집 중...' : (theme?.theme_name || '—')}
              </div>
              {theme && (
                <div className="momentum-card-sub">
                  대장: {theme.checklist?.leaders?.lead?.split(',')[0] || theme.sector || '—'}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* 테마 레이더 */}
      <section aria-label="테마 레이더" style={{ marginBottom: 28 }}>
        <ThemeRadarBox />
      </section>

      {/* 타임라인 테이블 */}
      <section aria-label="테마 타임라인">
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.05rem',
          fontWeight: 800,
          marginBottom: 14,
          color: 'var(--text-secondary)',
        }}>
          📅 테마 재료 타임라인
          {activeTheme && <span style={{ color: 'var(--accent-blue)', marginLeft: 8 }}>— {activeTheme.theme_name}</span>}
        </h2>
        <PullbackTable items={radarItems} />
      </section>
    </div>
  );
}
