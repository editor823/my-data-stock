'use client';

// ============================================================
// [6번 탭] 유튜브 브리핑 클라이언트
// ============================================================

interface YoutubeChannel {
  id: string;
  name: string;
  handle: string;
  description: string;
  searchUrl: string;
  icon: string;
  tag: string;
}

const CHANNELS: YoutubeChannel[] = [
  {
    id: 'ch-miraeasset',
    name: '미래에셋증권',
    handle: '@miraeInvest',
    description: '주요 증권사 공식 시황 브리핑 및 모닝 리포트',
    searchUrl: 'https://www.youtube.com/results?search_query=미래에셋증권+시황+브리핑',
    icon: '🏦',
    tag: '증권사',
  },
  {
    id: 'ch-samsung',
    name: '삼성증권',
    handle: '@SamsungSecurities',
    description: '매일 아침 국내외 증시 핵심 이슈 및 포트폴리오 전략',
    searchUrl: 'https://www.youtube.com/results?search_query=삼성증권+모닝브리핑',
    icon: '📈',
    tag: '증권사',
  },
  {
    id: 'ch-shinhan',
    name: '신한투자증권',
    handle: '@ShinhanInvest',
    description: '경제·시황 분석 및 AI·반도체 섹터 리서치',
    searchUrl: 'https://www.youtube.com/results?search_query=신한투자증권+시황',
    icon: '💡',
    tag: '증권사',
  },
  {
    id: 'ch-mbc',
    name: 'MBC 경제',
    handle: '@MBCeconomy',
    description: '공중파 경제 뉴스 및 증시 시황 데일리 브리핑',
    searchUrl: 'https://www.youtube.com/results?search_query=MBC+증시+오늘',
    icon: '📺',
    tag: '방송',
  },
  {
    id: 'ch-mtn',
    name: 'MTN 머니투데이방송',
    handle: '@MTN_TV',
    description: '실시간 증시 뉴스 및 전문 투자자 인터뷰',
    searchUrl: 'https://www.youtube.com/results?search_query=MTN+머니투데이+증시',
    icon: '💰',
    tag: '경제TV',
  },
  {
    id: 'ch-sedaily',
    name: '서울경제TV',
    handle: '@sedaily',
    description: '국내외 증시 마감 브리핑 및 경제 뉴스',
    searchUrl: 'https://www.youtube.com/results?search_query=서울경제TV+증시+브리핑',
    icon: '🗞️',
    tag: '경제TV',
  },
];

export default function BriefingClient() {
  return (
    <div className="page-container fade-in">
      <header className="page-header">
        <h1 className="page-title">📺 증시 유튜브 브리핑</h1>
        <p className="page-subtitle">
          증권사·경제TV 공식 채널의 최신 시황 브리핑 영상 모음
        </p>
      </header>

      {/* 채널 그리드 */}
      <section aria-label="유튜브 브리핑 채널" className="momentum-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {CHANNELS.map(ch => (
          <a
            key={ch.id}
            id={ch.id}
            href={ch.searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '2rem' }}>{ch.icon}</span>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{ch.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-blue)' }}>{ch.handle}</div>
              </div>
              <span style={{
                marginLeft: 'auto',
                fontSize: '0.68rem',
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(56,189,248,0.1)',
                color: 'var(--accent-blue)',
                border: '1px solid rgba(56,189,248,0.2)',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                {ch.tag}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {ch.description}
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.74rem',
              color: 'var(--accent-green)',
              fontWeight: 700,
              marginTop: 'auto',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: 10,
            }}>
              <span>▶ YouTube에서 최신 영상 보기</span>
              <span style={{ marginLeft: 'auto' }}>↗</span>
            </div>
          </a>
        ))}
      </section>

      {/* 주요 키워드 검색 바로가기 */}
      <section aria-label="브리핑 주제 검색" style={{ marginTop: 32 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, marginBottom: 16, color: 'var(--text-secondary)' }}>
          🔍 오늘의 증시 키워드 브리핑 검색
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {['오늘 증시', '코스피 시황', '테마주 브리핑', '미국 증시 오늘', '반도체 주가', '방산 테마', '바이오 뉴스'].map(keyword => (
            <a
              key={keyword}
              id={`briefing-kw-${keyword}`}
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                background: 'rgba(56,189,248,0.1)',
                border: '1px solid rgba(56,189,248,0.3)',
                color: 'var(--accent-blue)',
                fontSize: '0.82rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.2)')}
              onMouseOut={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.1)')}
            >
              🔍 {keyword}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
