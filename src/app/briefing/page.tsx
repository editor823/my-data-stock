// ============================================================
// [6번 탭] 증시 유튜브 브리핑
// ============================================================
import type { Metadata } from 'next';
import BriefingClient from './BriefingClient';

export const metadata: Metadata = {
  title: '유튜브 브리핑 — 주식 인텔리전스',
  description: '증시 전문 유튜브 채널 최신 브리핑 영상 모음 및 AI 요약',
};

export default function BriefingPage() {
  return <BriefingClient />;
}
