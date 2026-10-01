import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: '주식 인텔리전스 분석 센터',
  description: '실시간 코스피·코스닥 시황, 테마 레이더, 뉴스, 증시 캘린더, 주식 탐정 Q&A',
};

export default function HomePage() {
  redirect('/stock.html');
}
