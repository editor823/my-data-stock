// ============================================================
// [3번 탭] 일정 관리 & 증시 캘린더
// ============================================================
import type { Metadata } from 'next';
import CalendarClient from './CalendarClient';

export const metadata: Metadata = {
  title: '증시 캘린더 — 주식 인텔리전스',
  description: '실적 발표, 연준 FOMC, 경제 지표, IPO 일정 등 증시 핵심 이벤트 캘린더',
};

export default function CalendarPage() {
  return <CalendarClient />;
}
