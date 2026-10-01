// ============================================================
// [1번 탭] 미국 증시 총정리 & 시황
// ============================================================
import type { Metadata } from 'next';
import UsMarketClient from './UsMarketClient';

export const metadata: Metadata = {
  title: '미국 증시 — 주식 인텔리전스',
  description: 'S&P500·나스닥·다우 실시간 시황 및 뉴욕 증시 핵심 이슈 브리핑',
};

export default function UsMarketPage() {
  return <UsMarketClient />;
}
