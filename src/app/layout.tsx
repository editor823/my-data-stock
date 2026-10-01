import type { Metadata } from 'next';
import './globals.css';
import { StockStoreProvider } from '@/stores/useStockStore';
import TickerBar from '@/components/common/TickerBar';
import NavBar from '@/components/common/NavBar';

export const metadata: Metadata = {
  title: '주식 인텔리전스 분석 센터',
  description: '실시간 코스피·코스닥 시황, 테마 레이더, 뉴스, 증시 캘린더, 주식 탐정 Q&A — 경량 고성능 주식 분석 플랫폼',
  keywords: ['주식', '코스피', '코스닥', '테마주', '실시간 뉴스', '증시 시황'],
  openGraph: {
    title: '주식 인텔리전스 분석 센터',
    description: '실시간 시황·테마·뉴스 올인원 주식 분석 플랫폼',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <StockStoreProvider>
          {/* 상단 실시간 지수 티커 */}
          <TickerBar />
          {/* 0~6번 내비게이션 */}
          <NavBar />
          {/* 페이지 콘텐츠 */}
          <main id="main-content">
            {children}
          </main>
          {/* 하단 푸터 */}
          <footer className="site-footer">
            <div className="page-container">
              <p>📊 주식 인텔리전스 분석 센터 · 본 서비스는 투자 권유가 아닌 정보 제공 목적입니다.</p>
            </div>
          </footer>
        </StockStoreProvider>
        <style>{`
          .site-footer {
            border-top: 1px solid rgba(255,255,255,0.07);
            padding: 20px 0;
            color: #475569;
            font-size: 0.76rem;
            text-align: center;
          }
          #main-content {
            min-height: calc(100vh - 90px);
          }
        `}</style>
      </body>
    </html>
  );
}
