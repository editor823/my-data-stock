'use client';

// ============================================================
// [컴포넌트] 상단 글로벌 지수 티커 바
// 코스피/코스닥/원달러 환율을 흐르는 배너로 표시
// ============================================================

import { useStockTicker } from '@/hooks/useStockTicker';
import type { IndexData, ExchangeRate } from '@/types/stock';

function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function IndexChip({ data }: { data: IndexData }) {
  const color = data.isUp ? '#4ade80' : '#f87171';
  const arrow = data.isUp ? '▲' : '▼';
  return (
    <span className="ticker-chip">
      <span className="ticker-name">{data.name}</span>
      <span className="ticker-val">{formatNumber(data.value)}</span>
      <span className="ticker-change" style={{ color }}>
        {arrow} {Math.abs(data.change).toFixed(2)} ({data.isUp ? '+' : ''}{data.changeRate.toFixed(2)}%)
      </span>
    </span>
  );
}

function ExRateChip({ data }: { data: ExchangeRate }) {
  const color = data.isUp ? '#f87171' : '#4ade80'; // 환율 상승 = 원화 약세 = 주의
  const arrow = data.isUp ? '▲' : '▼';
  return (
    <span className="ticker-chip">
      <span className="ticker-name">{data.currency}</span>
      <span className="ticker-val">{data.rate.toLocaleString('ko-KR', { minimumFractionDigits: 1 })}원</span>
      <span className="ticker-change" style={{ color }}>
        {arrow} {Math.abs(data.change).toFixed(1)}
      </span>
    </span>
  );
}

export default function TickerBar() {
  const { indices, exchangeRate, isLoading } = useStockTicker();

  if (isLoading && indices.length === 0) {
    return (
      <div className="ticker-bar">
        <div className="ticker-loading">📡 시황 데이터 수신 중...</div>
      </div>
    );
  }

  return (
    <div className="ticker-bar" role="marquee" aria-label="실시간 시황 티커">
      <div className="ticker-track">
        {/* 두 번 반복해서 끊김 없는 루프 효과 */}
        {[0, 1].map(i => (
          <span key={i} className="ticker-set" aria-hidden={i === 1}>
            {indices.map(idx => <IndexChip key={`${i}-${idx.name}`} data={idx} />)}
            {exchangeRate && <ExRateChip key={`${i}-fx`} data={exchangeRate} />}
            <span className="ticker-divider">│</span>
          </span>
        ))}
      </div>
    </div>
  );
}
