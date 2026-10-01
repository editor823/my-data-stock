// ============================================================
// [2번 탭] 재료 모음 & 눌림목 공략
// ============================================================
import type { Metadata } from 'next';
import ThemesClient from './ThemesClient';

export const metadata: Metadata = {
  title: '테마·재료 — 주식 인텔리전스',
  description: '거래대금 1,000억+ 테마 필터링, 눌림목 공략, 7대 체크리스트 탐정 수첩',
};

export default function ThemesPage() {
  return <ThemesClient />;
}
