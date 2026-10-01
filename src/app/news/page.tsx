// ============================================================
// [0번 탭] 실시간 국내 주식 뉴스 센터
// ============================================================
import type { Metadata } from 'next';
import NewsPageClient from './NewsClient';

export const metadata: Metadata = {
  title: '실시간 뉴스 — 주식 인텔리전스',
  description: '코스피·코스닥 실시간 국내 주식 뉴스. 뉴스/공시/리포트 채널별 필터링',
};

export default function NewsPage() {
  return <NewsPageClient />;
}
