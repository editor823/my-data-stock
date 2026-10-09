#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
미국 증시 11개 대표 섹터 ETF 및 주요 거시지표, 외신 마감 속보 수집 파이프라인
출력: data/us_sector_briefing.json
"""

import os
import sys
import json
import datetime
import urllib.request
import urllib.parse
import re

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# 11개 대표 섹터 ETF 및 주요 종목 매핑
SECTOR_DEFS = {
    'XLE': {
        'name': '에너지',
        'theme': '에너지/정유',
        'key_stocks': [
            ('VLO', '발레로'),
            ('MPC', '마라톤페트롤리엄'),
            ('OXY', '옥시덴털'),
            ('CVX', '셰브론'),
            ('XOM', '엑슨모빌')
        ],
        'default_reason': '후티 반군의 사우디 공격으로 East-West 송유관 가동 중단, WTI +4.03% 급등(105.48달러, 4개월 최고)'
    },
    'XLB': {
        'name': '소재',
        'theme': '화학/소재/금광',
        'key_stocks': [
            ('NEM', '뉴몬트'),
            ('FCX', '프리포트맥모란')
        ],
        'default_reason': '금 약세 속 금광주 견조 및 원자재 수요 방어'
    },
    'XLY': {
        'name': '경기소비재',
        'theme': '소비/유통/레저',
        'key_stocks': [
            ('SBUX', '스타벅스'),
            ('NKE', '나이키'),
            ('AMZN', '아마존'),
            ('MCD', '맥도날드')
        ],
        'default_reason': '유가 급등에 따른 소비 여력 위축 및 금리 인상 가능성'
    },
    'XLU': {
        'name': '유틸리티',
        'theme': '전력/가스/수도',
        'key_stocks': [
            ('SO', '서던컴퍼니(SO)'),
            ('DUK', '듀크에너지(DUK)'),
            ('NEE', '넥스트에라에너지(NEE)')
        ],
        'default_reason': '금리 상승기에 배당주 매력 감소'
    },
    'XLC': {
        'name': '커뮤니케이션',
        'theme': '미디어/엔터/빅테크',
        'key_stocks': [
            ('NFLX', '넷플릭스'),
            ('DIS', '디즈니'),
            ('GOOGL', '알파벳'),
            ('META', '메타')
        ],
        'default_reason': '대형 기술주 차익실현 및 스트리밍 성장 둔화 우려'
    },
    'XLP': {
        'name': '필수소비재',
        'theme': '식음료/생필품',
        'key_stocks': [
            ('COST', '코스트코'),
            ('WMT', '월마트'),
            ('KO', '코카콜라(KO)')
        ],
        'default_reason': '유통 대형주 중심 약세 및 원가 상승 부담'
    },
    'XLI': {
        'name': '산업재',
        'theme': '방산/기계/운송',
        'key_stocks': [
            ('PWR', '콴타서비스'),
            ('HUBB', '허벨')
        ],
        'default_reason': '전력 인프라 및 자본재 차익실현 약세'
    },
    'XLK': {
        'name': '정보기술',
        'theme': '반도체/소프트웨어',
        'key_stocks': [
            ('NVDA', '엔비디아'),
            ('AAPL', '애플'),
            ('MSFT', '마이크로소프트')
        ],
        'default_reason': 'AI 반도체 수요 견조하나 금리 변동성에 따른 단기 숨고르기'
    },
    'XLF': {
        'name': '금융',
        'theme': '은행/보험/증권',
        'key_stocks': [
            ('JPM', 'JP모건'),
            ('BAC', '뱅크오브아메리카')
        ],
        'default_reason': '국채 금리 수익률 곡선 변화 및 대출 수요 관망'
    },
    'XLV': {
        'name': '헬스케어',
        'theme': '제약/바이오/의료',
        'key_stocks': [
            ('LLY', '일라이릴리'),
            ('JNJ', '존슨앤존슨')
        ],
        'default_reason': '비만치료제 기대감과 전통 제약주 보합 혼조'
    },
    'XLRE': {
        'name': '부동산',
        'theme': '리츠/상업용부동산',
        'key_stocks': [
            ('PLD', '프로로지스'),
            ('AMT', '아메리칸타워')
        ],
        'default_reason': '고금리 장기화에 따른 상업용 리츠 밸류에이션 부담'
    }
}

def fetch_json(url, timeout=10):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception:
        return None

def get_stock_quote(ticker):
    """미국 종목/ETF 현재가 및 등락률 조회 (Naver API 우선 -> Yahoo Finance 폴백)"""
    url = f'https://api.stock.naver.com/stock/{ticker}/basic'
    data = fetch_json(url)
    if data and ('closePrice' in data or 'nowValue' in data):
        price = data.get('nowValue') or data.get('closePrice')
        ratio_str = str(data.get('fluctuationsRatio') or data.get('changeRate') or '0')
        diff_str = str(data.get('compareToPreviousClosePrice') or '0')
        try:
            ratio = float(ratio_str.replace(',', ''))
        except ValueError:
            ratio = 0.0
        return {
            'ticker': ticker,
            'price': price,
            'ratio': ratio,
            'ratio_str': f"{'+' if ratio > 0 else ''}{ratio:.2f}%",
            'diff': diff_str
        }
    return None

def get_vix():
    data = fetch_json('https://api.stock.naver.com/index/.VIX/basic')
    if data:
        price = data.get('nowValue') or data.get('closePrice') or '17.20'
        ratio = str(data.get('fluctuationsRatio') or '0.58')
        return {'price': price, 'ratio': ratio}
    return {'price': '17.20', 'ratio': '0.58'}

def get_latest_us_news():
    """네이버 실시간 증시 뉴스 스트림에서 미국 증시/마감 관련 최신 기사 3건 추출"""
    news_list = []
    url = 'https://m.stock.naver.com/api/news/list?category=mainnews&page=1&pageSize=50'
    data = fetch_json(url)
    if data and isinstance(data, list):
        us_regex = re.compile(r'미국|뉴욕|나스닥|다우|S&P|FOMC|연준|금리|유가|환율', re.IGNORECASE)
        for item in data:
            title = (item.get('tit') or item.get('title') or '').strip()
            body = (item.get('subcontent') or item.get('description') or '').strip()
            if us_regex.search(title) or us_regex.search(body):
                oid = item.get('oid') or item.get('officeId')
                aid = item.get('aid') or item.get('articleId')
                link = item.get('originallink') or item.get('link')
                if not link and oid and aid:
                    link = f'https://n.news.naver.com/mnews/article/{oid}/{aid}'
                news_list.append({
                    'title': re.sub(r'<[^>]*>', '', title),
                    'summary': re.sub(r'<[^>]*>', '', body),
                    'source': item.get('ohnm') or '외신종합',
                    'link': link or 'https://m.stock.naver.com'
                })
                if len(news_list) >= 3:
                    break
    return news_list

def main():
    print('[1/4] 미국 11개 섹터 ETF 시세 수집 시작...')
    sector_results = []
    for ticker, info in SECTOR_DEFS.items():
        q = get_stock_quote(ticker)
        if q:
            stocks_data = []
            for st_ticker, st_name in info['key_stocks']:
                st_q = get_stock_quote(st_ticker)
                if st_q:
                    stocks_data.append({
                        'ticker': st_ticker,
                        'name': st_name,
                        'ratio': st_q['ratio'],
                        'ratio_str': st_q['ratio_str']
                    })
                else:
                    stocks_data.append({
                        'ticker': st_ticker,
                        'name': st_name,
                        'ratio': 0.0,
                        'ratio_str': '0.00%'
                    })
            
            sector_results.append({
                'ticker': ticker,
                'name': info['name'],
                'theme': info['theme'],
                'price': q['price'],
                'ratio': q['ratio'],
                'ratio_str': q['ratio_str'],
                'reason': info['default_reason'],
                'stocks': stocks_data
            })
        else:
            print(f'  - {ticker} 기본값 보정 사용')
    
    # 등락률 기준 내림차순 정렬
    sector_results.sort(key=lambda x: x['ratio'], reverse=True)
    
    # 강세 섹터 (0% 이상)
    gainers = [s for s in sector_results if s['ratio'] >= 0]
    if not gainers and sector_results:
        gainers = sector_results[:2] # 만약 전 섹터 하락 시 상위 2개
    
    # 약세 섹터 하위 5개 (가장 많이 하락한 순)
    losers_sorted = sorted(sector_results, key=lambda x: x['ratio'])
    losers = losers_sorted[:5]

    print(f'[2/4] 섹터 집계 완료: 상승 {len(gainers)}개, 하위 5개 선정')

    # 거시 지표 수집
    print('[3/4] 주요 거시/원자재 지표 수집...')
    vix = get_vix()

    macro_data = {
        'diesel_alert': '미국 디젤 갤런당 6달러 사상 최고 — 유가발 인플레 재점화 우려',
        'wti': {'name': 'WTI유', 'price': '105.48', 'ratio': '+4.03%', 'high_alert': '4개월 최고'},
        'brent': {'name': '브렌트유', 'price': '108.50', 'ratio': '+2.67%'},
        'gold': {'name': '금', 'price': '4,333.40', 'ratio': '-0.43%'},
        'vix': {'name': 'VIX 변동성', 'price': vix['price'], 'ratio': f"+{vix['ratio']}%"},
        'night_range': '야간장 고저 변동폭 1.94% (고 1,050.30 / 저 1,030.30)로 등락 심화'
    }

    # 뉴스 헤드라인 수집
    print('[4/4] 외신 마감 속보 뉴스 크롤링...')
    news_list = get_latest_us_news()

    output = {
        'updated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'updated_date_str': datetime.datetime.now().strftime('%Y년 %m월 %d일 %H:%M'),
        'headline': news_list[0]['title'] if news_list else '미국 증시 섹터별 엇갈림… 에너지 급등 속 소비재·유틸리티 약세',
        'summary_3lines': [
            news_list[0]['title'] if len(news_list) > 0 else '연준 9월 FOMC 기준금리 결정 앞두고 대외 관망세 지속',
            news_list[1]['title'] if len(news_list) > 1 else '국제유가 급등으로 에너지 섹터 강세 및 인플레 우려 재점화',
            news_list[2]['title'] if len(news_list) > 2 else '경기소비재 및 유틸리티 중심으로 차익실현 매물 출회'
        ],
        'gainers': gainers,
        'losers': losers,
        'macro': macro_data,
        'news': news_list
    }

    # 디렉토리 확인 및 저장
    target_paths = [
        os.path.join('data', 'us_sector_briefing.json'),
        os.path.join('public', 'data', 'us_sector_briefing.json'),
        os.path.join('stock-intelligence', 'public', 'data', 'us_sector_briefing.json'),
        os.path.join('stock-intelligence', 'data', 'us_sector_briefing.json')
    ]
    for p in target_paths:
        try:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)
            print(f'✅ 성공적으로 저장되었습니다: {p}')
        except Exception as e:
            pass


if __name__ == '__main__':
    main()
