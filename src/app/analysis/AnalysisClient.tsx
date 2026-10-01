'use client';

import { useState } from 'react';
import { fetchStockTechnicals, fetchStockReports } from '@/services/stockApi';
import type { StockTechnicals, StockReport } from '@/types/stock';
import DetectiveChatInput from '@/components/ai-agent/DetectiveChatInput';

type Tab = 'technicals' | 'reports' | 'qa';

export default function AnalysisClient() {
  const [activeTab, setActiveTab] = useState<Tab>('qa');
  const [stockName, setStockName] = useState('');
  const [techData, setTechData] = useState<StockTechnicals | null>(null);
  const [reports, setReports] = useState<StockReport[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!stockName.trim()) return;
    setLoading(true);
    const [tech, rpt] = await Promise.all([
      fetchStockTechnicals(stockName.trim()),
      fetchStockReports(stockName.trim()),
    ]);
    setTechData(tech);
    setReports(rpt);
    setLoading(false);
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'qa', label: '🕵️ 탐정 Q&A' },
    { id: 'technicals', label: '📈 기술적 분석' },
    { id: 'reports', label: '📊 증권사 리포트' },
  ];

  return (
    <div className="page-container fade-in">
      <header className="page-header">
        <h1 className="page-title">🔍 종목 분석 &amp; 탐정 Q&A</h1>
        <p className="page-subtitle">자연어 질문 · 기술적 분석 · 증권사 리포트 통합 분석</p>
      </header>

      {/* 종목 검색 바 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <input
          id="stock-search-input"
          type="text"
          className="filter-input"
          placeholder="종목명 입력 (예: 대한전선, SK하이닉스)"
          value={stockName}
          onChange={e => setStockName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          aria-label="분석할 종목명"
          style={{ flex: 1, fontSize: '0.9rem' }}
        />
        <button
          id="stock-search-btn"
          className="filter-search-btn"
          onClick={handleSearch}
          disabled={loading}
          style={{ padding: '8px 20px', fontSize: '0.84rem', whiteSpace: 'nowrap' }}
        >
          {loading ? '분석 중...' : '🔍 종목 분석'}
        </button>
      </div>

      {/* 탭 전환 */}
      <div className="filter-tabs" style={{ marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            id={`analysis-tab-${t.id}`}
            className={`filter-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'qa' && (
        <section aria-label="주식 탐정 Q&A" className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 16 }}>
            🕵️ 주식 탐정 자연어 Q&A
          </h2>
          <DetectiveChatInput />
        </section>
      )}

      {activeTab === 'technicals' && (
        <section aria-label="기술적 분석" className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 16 }}>
            📈 기술적 분석 결과
            {stockName && <span style={{ color: 'var(--accent-blue)', marginLeft: 8 }}>— {stockName}</span>}
          </h2>
          {loading && <div className="news-loading"><div className="spinner" /></div>}
          {!loading && !techData && <p className="news-empty">위에서 종목명을 검색해주세요.</p>}
          {techData && <TechnicalCard data={techData} />}
        </section>
      )}

      {activeTab === 'reports' && (
        <section aria-label="증권사 리포트">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 16 }}>
            📊 증권사 리포트
            {stockName && <span style={{ color: 'var(--accent-blue)', marginLeft: 8 }}>— {stockName}</span>}
          </h2>
          {loading && <div className="news-loading"><div className="spinner" /></div>}
          {!loading && reports.length === 0 && <p className="news-empty">위에서 종목명을 검색해주세요.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reports.map((r, i) => <ReportCard key={i} report={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}

// 기술적 분석 카드
function TechnicalCard({ data }: { data: StockTechnicals }) {
  const chgColor = data.today_change_rate >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  const chgSign = data.today_change_rate >= 0 ? '+' : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 기본 정보 */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div className="momentum-card" style={{ flex: 1 }}>
          <div className="momentum-card-label">현재가</div>
          <div className="momentum-card-value">{data.current_price}</div>
          <div className="momentum-card-sub" style={{ color: chgColor }}>
            {chgSign}{data.today_change_rate}% · 거래량비율 {data.today_volume_ratio}
          </div>
        </div>
        <div className="momentum-card" style={{ flex: 1 }}>
          <div className="momentum-card-label">기준봉 고가</div>
          <div className="momentum-card-value">{data.benchmark_shooting_high}</div>
          <div className="momentum-card-sub">{data.pullback_phase_text}</div>
        </div>
      </div>

      {/* 이평선 배열 */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 8 }}>📊 이평선 배열</p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>5일선: <strong style={{ color: 'var(--accent-green)' }}>{data.ma.ma5}</strong></span>
          <span>20일선: <strong>{data.ma.ma20}</strong></span>
          <span>60일선: <strong>{data.ma.ma60}</strong></span>
          <span style={{ marginLeft: 'auto', color: 'var(--accent-yellow)', fontWeight: 700 }}>{data.ma.arrangement}</span>
        </div>
      </div>

      {/* 슈팅 분석 */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-purple)', marginBottom: 6 }}>🎯 슈팅 이력</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{data.shooting_analysis.badge_text}</p>
        {data.is_5ma_breakout && (
          <p style={{ marginTop: 6, fontSize: '0.82rem', color: 'var(--accent-green)', fontWeight: 700 }}>{data.breakout_badge}</p>
        )}
      </div>

      {/* 수급 현황 */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: 8 }}>💰 수급 현황</p>
        <div style={{ display: 'flex', gap: 20, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>외국인: <strong style={{ color: data.supply.foreign_3d.startsWith('+') ? 'var(--accent-green)' : 'var(--accent-red)' }}>{data.supply.foreign_3d}</strong></span>
          <span>기관: <strong style={{ color: data.supply.institution_3d.startsWith('+') ? 'var(--accent-green)' : 'var(--accent-red)' }}>{data.supply.institution_3d}</strong></span>
          {data.supply.is_dual_buy && <span style={{ color: 'var(--accent-green)', fontWeight: 800 }}>⚡ 쌍끌이</span>}
        </div>
      </div>
    </div>
  );
}

// 리포트 카드
function ReportCard({ report }: { report: StockReport }) {
  const safeUrl = report.report_url?.startsWith('http') ? report.report_url : `https://www.google.com/search?q=${encodeURIComponent(report.press + ' ' + report.title + ' 리포트')}`;
  return (
    <div className="card" style={{ borderLeft: '3px solid var(--accent-green)', padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-green)', background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: 4 }}>
          📊 {report.press}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{report.date}</span>
      </div>
      <a href={safeUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 6 }}>
        {report.target_name && <span style={{ color: 'var(--accent-blue)' }}>[{report.target_name}] </span>}
        {report.title}
      </a>
      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--accent-yellow)', fontWeight: 700 }}>{report.opinion}</span>
        {' · '}목표가: <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{report.target_price}</span>
      </div>
    </div>
  );
}
