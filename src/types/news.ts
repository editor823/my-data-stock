// ============================================================
// [타입 정의] 뉴스 피드 인터페이스
// ============================================================

export type NewsChannel = 'NEWS' | 'DART' | 'REPORT' | 'BLOG' | 'ALL';

export interface NewsItem {
  date: string;
  stage?: string;
  press: string;
  title: string;
  news_title?: string;
  link?: string;
  news_url?: string;
  originallink?: string;
  key_point?: string;
  snippet?: string;
  channel?: NewsChannel;
  is_blog?: boolean;
  is_dart?: boolean;
  is_report?: boolean;
  stockName?: string;
  // 네이버 원본 필드
  tit?: string;
  ohnm?: string;
  dt?: string;
  oid?: string;
  aid?: string;
  subcontent?: string;
}

export interface NewsApiResponse {
  items?: NewsItem[];
  total?: number;
  query?: string;
  status?: string;
}

export interface NewsFilter {
  channel: NewsChannel;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface LiveNewsItem {
  id: string;
  title: string;
  press: string;
  link: string;
  date: string;
  snippet?: string;
  category?: string;
}
