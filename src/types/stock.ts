// ============================================================
// [타입 정의] 주식/지수/테마 인터페이스
// ============================================================

export interface IndexData {
  name: string;       // 예: '코스피', '코스닥'
  value: number;
  change: number;
  changeRate: number;
  isUp: boolean;
}

export interface ExchangeRate {
  currency: string;   // 예: 'USD/KRW'
  rate: number;
  change: number;
  isUp: boolean;
}

export interface StockLeaders {
  lead: string;       // 대장주 (쉼표 구분)
  sub: string;        // 부대주 (쉼표 구분)
}

export interface StockChecklist {
  material?: string;
  leaders?: StockLeaders;
  correlation?: string;
  future_expectation?: string;
  expiration_date?: string;
  chart_phase?: string;
  conditions?: {
    bullish: string;
    bearish: string;
  };
}

export interface TimelineItem {
  date: string;
  stage: string;
  press: string;
  news_title: string;
  news_url?: string;
  key_point?: string;
  channel?: string;
  is_blog?: boolean;
  is_dart?: boolean;
  is_report?: boolean;
  tag?: string;
  tags?: string[];
  fact_badge?: string;
  stockName?: string;
  type?: 'news' | 'dart' | 'report' | 'blog';
  id?: string;
}

export interface Theme {
  theme_id: string;
  theme_name: string;
  sector?: string;
  category?: string;
  pattern_type?: string;
  analysis_date?: string;
  checklist?: StockChecklist;
  timeline?: TimelineItem[];
  _asyncSupplementsLoaded?: boolean;
  _technicals?: StockTechnicals | null;
}

export interface StockTechnicals {
  status: string;
  corp_name: string;
  stock_code: string;
  current_price: string;
  today_change_rate: number;
  today_volume_ratio: string;
  benchmark_shooting_high: string;
  pullback_rate: number;
  pullback_phase_text: string;
  is_5ma_breakout: boolean;
  breakout_badge: string;
  ma: {
    ma5: string;
    ma20: string;
    ma60: string;
    arrangement: string;
    is_golden_cross: boolean;
    is_bullish: boolean;
  };
  shooting_analysis: {
    is_new_theme: boolean;
    shooting_count: number;
    last_shooting_days_ago: number;
    last_shooting_date: string;
    badge_text: string;
  };
  news_continuity: {
    status: string;
    label: string;
    badge_text: string;
  };
  supply: {
    foreign_3d: string;
    institution_3d: string;
    is_dual_buy: boolean;
    summary_text: string;
  };
}

export interface StockReport {
  date: string;
  press: string;
  target_name: string;
  title: string;
  opinion: string;
  target_price: string;
  report_url: string;
  is_strong: boolean;
  stage: string;
  broker?: string;
  stock_name?: string;
}

export interface StockQAResult {
  status: string;
  keyword: string;
  main_reason: string;
  related_stocks: Array<{
    name: string;
    role: string;
    change_rate: string;
    reason_detail: string;
  }>;
  catalyst_news: Array<{
    title: string;
    press: string;
    date: string;
    url: string;
    snippet: string;
  }>;
}

export interface ThemeStock {
  name: string;
  code: string;
}

export interface ThemeSearchResult {
  name: string;
  category: string;
  stocks_count: number;
  lead_stocks: string;
  matched_stock_names?: string[];
}
