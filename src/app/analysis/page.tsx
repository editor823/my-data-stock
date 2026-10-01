// ============================================================
// [4-5번 탭] 종목 상세정보 & 실시간 주식 탐정 Q&A
// ============================================================
import type { Metadata } from 'next';
import AnalysisClient from './AnalysisClient';

export const metadata: Metadata = {
  title: '종목 분석 & 탐정 Q&A — 주식 인텔리전스',
  description: '종목 상세 기술적 분석, 실시간 주식 탐정 자연어 Q&A, 증권사 리포트 열람',
};

export default function AnalysisPage() {
  return <AnalysisClient />;
}
