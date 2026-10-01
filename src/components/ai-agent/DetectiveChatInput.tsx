'use client';

// ============================================================
// [컴포넌트] 주식 탐정 Q&A 입력 + 결과 표시
// ============================================================

import { useState } from 'react';
import { analyzeStockQuestion } from '@/services/aiService';
import type { StockQAResult } from '@/types/stock';

export default function DetectiveChatInput() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<StockQAResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setResult(null);
    try {
      const data = await analyzeStockQuestion(query.trim());
      setResult(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="detective-chat" id="detective-chat-section">
      <div className="detective-input-wrap">
        <textarea
          id="detective-query-input"
          className="detective-input"
          rows={3}
          placeholder="📝 예: 한화에어로스페이스가 오늘 왜 급등했나요?"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          aria-label="주식 탐정 질문 입력"
        />
        <button
          id="detective-submit-btn"
          className="detective-submit-btn"
          onClick={handleSubmit}
          disabled={isLoading || !query.trim()}
          aria-label="탐정 분석 실행"
        >
          {isLoading ? '🔍 분석 중...' : '🕵️ 탐정 분석'}
        </button>
      </div>

      {isLoading && (
        <div className="detective-loading">
          <div className="spinner" />
          <p>실시간 뉴스·공시·수급 데이터 교차 분석 중...</p>
        </div>
      )}

      {result && <BriefingResult result={result} />}
    </div>
  );
}

function BriefingResult({ result }: { result: StockQAResult }) {
  return (
    <div className="briefing-result" id="briefing-result-box">
      {/* 핵심 원인 */}
      <div className="result-main-reason">
        <h3>🎯 핵심 원인 분석</h3>
        <p>{result.main_reason}</p>
      </div>

      {/* 관련 종목 */}
      {result.related_stocks.length > 0 && (
        <div className="result-stocks">
          <h4>📈 관련 종목</h4>
          <div className="stock-chips">
            {result.related_stocks.map((s, i) => (
              <div key={i} className="stock-chip">
                <div className="stock-chip-header">
                  <span className="stock-role">{s.role}</span>
                  <span className="stock-name">{s.name}</span>
                  <span className={`stock-rate ${s.change_rate.startsWith('+') ? 'up' : 'down'}`}>
                    {s.change_rate}
                  </span>
                </div>
                <p className="stock-reason">{s.reason_detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 촉매 뉴스 */}
      {result.catalyst_news.length > 0 && (
        <div className="result-news">
          <h4>📰 촉매 뉴스</h4>
          <ul className="catalyst-news-list">
            {result.catalyst_news.map((n, i) => (
              <li key={i} className="catalyst-news-item">
                <a href={n.url} target="_blank" rel="noopener noreferrer">
                  {n.title}
                </a>
                <span className="news-meta">{n.press} · {n.date}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
