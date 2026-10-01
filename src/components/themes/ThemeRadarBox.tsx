'use client';

// ============================================================
// [컴포넌트] 테마 레이더 카드 & 눌림목 테이블
// ============================================================

import { useRadarDetect } from '@/hooks/useRadarDetect';
import type { Theme, TimelineItem } from '@/types/stock';

// 테마 셀렉터
export function ThemeRadarBox() {
  const { themes, activeTheme, isLoading, selectTheme } = useRadarDetect();

  return (
    <div className="theme-radar-box" id="theme-radar-section">
      <div className="radar-header">
        <h2 className="radar-title">🎯 실시간 주도 테마 레이더</h2>
        <select
          id="theme-select"
          className="theme-select"
          value={activeTheme?.theme_id || ''}
          onChange={e => selectTheme(e.target.value)}
          aria-label="테마 선택"
        >
          {themes.map(t => (
            <option key={t.theme_id} value={t.theme_id}>
              [{t.sector || t.category || '테마'}] {t.theme_name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="radar-loading"><div className="spinner" /></div>
      ) : activeTheme ? (
        <ThemeCard theme={activeTheme} />
      ) : (
        <p className="radar-empty">테마를 선택해주세요</p>
      )}
    </div>
  );
}

function ThemeCard({ theme }: { theme: Theme }) {
  const cl = theme.checklist;
  return (
    <div className="theme-card">
      <div className="theme-card-title">
        <span className="theme-sector">{theme.sector || theme.category}</span>
        <h3>{theme.theme_name}</h3>
      </div>
      {cl && (
        <div className="theme-checklist">
          {cl.material && (
            <div className="check-row">
              <span className="check-label">📌 핵심 재료</span>
              <span className="check-value">{cl.material}</span>
            </div>
          )}
          {cl.leaders && (
            <div className="check-row">
              <span className="check-label">👑 대장주</span>
              <span className="check-value">{cl.leaders.lead}</span>
            </div>
          )}
          {cl.leaders?.sub && (
            <div className="check-row">
              <span className="check-label">🔗 관련주</span>
              <span className="check-value">{cl.leaders.sub}</span>
            </div>
          )}
          {cl.chart_phase && (
            <div className="check-row">
              <span className="check-label">📈 차트 국면</span>
              <span className="check-value">{cl.chart_phase}</span>
            </div>
          )}
          {cl.expiration_date && (
            <div className="check-row">
              <span className="check-label">⏳ 유통 기간</span>
              <span className="check-value">{cl.expiration_date}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 눌림목 타임라인 테이블
export function PullbackTable({ items }: { items: TimelineItem[] }) {
  const filtered = items.filter(i => !i.is_blog).slice(0, 30);

  if (filtered.length === 0) {
    return <p className="pullback-empty">📭 수집된 타임라인 데이터가 없습니다.</p>;
  }

  return (
    <div className="pullback-table-wrap" id="pullback-table">
      <table className="pullback-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th>구분</th>
            <th>출처</th>
            <th>제목</th>
            <th>팩트 단서</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item, i) => (
            <tr key={i} className={item.is_dart ? 'row-dart' : item.is_report ? 'row-report' : 'row-news'}>
              <td className="cell-date">{item.date}</td>
              <td className="cell-stage">
                <span className="stage-badge">{item.stage || '뉴스'}</span>
              </td>
              <td className="cell-press">{item.press}</td>
              <td className="cell-title">
                {item.news_url ? (
                  <a href={item.news_url} target="_blank" rel="noopener noreferrer">
                    {item.news_title}
                  </a>
                ) : item.news_title}
              </td>
              <td className="cell-key">{item.key_point}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
