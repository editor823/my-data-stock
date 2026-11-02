const https = require('https');
const fs = require('fs');
const path = require('path');

// 11개 대표 섹터 ETF 및 주요 종목 매핑
const SECTOR_CONFIG = [
  {
    ticker: 'XLE',
    name: '에너지',
    theme: '정유/원유/가스',
    stocks: [
      { ticker: 'XOM', name: '엑슨모빌' },
      { ticker: 'CVX', name: '셰브론' },
      { ticker: 'VLO', name: '발레로' },
      { ticker: 'OXY', name: '옥시덴털' }
    ],
    getReason: (ratio, leadStock) => ratio >= 0 
      ? `국제유가 및 정유·원유 밸류체인 실적 개선과 현금흐름 부각으로 매수세 유입`
      : `국제유가 차익실현 및 원자재 수요 둔화 우려로 인한 숨고르기`
  },
  {
    ticker: 'XLK',
    name: '정보기술',
    theme: 'AI반도체/빅테크/소프트웨어',
    stocks: [
      { ticker: 'NVDA', name: '엔비디아' },
      { ticker: 'AAPL', name: '애플' },
      { ticker: 'MSFT', name: '마이크로소프트' }
    ],
    getReason: (ratio, leadStock) => ratio >= 0 
      ? `AI 데이터센터 설비투자 확대 및 빅테크 호실적 기대감에 힘입은 기술주 반등`
      : `단기 급등에 따른 차익실현 매물 출회 및 국채금리 변동성에 따른 밸류에이션 부담`
  },
  {
    ticker: 'XLF',
    name: '금융',
    theme: '투자은행/상업은행/카드',
    stocks: [
      { ticker: 'JPM', name: 'JP모건' },
      { ticker: 'BAC', name: '뱅크오브아메리카' },
      { ticker: 'GS', name: '골드만삭스' }
    ],
    getReason: (ratio, leadStock) => ratio >= 0 
      ? `순이자마진(NIM) 방어 및 견조한 IB 수수료 수익 바탕 금융주 강세`
      : `장단기 금리차 축소 및 대출 부실 우려에 따른 보수적 관망세`
  },
  {
    ticker: 'XLV',
    name: '헬스케어',
    theme: '제약/바이오/의료기기',
    stocks: [
      { ticker: 'LLY', name: '일라이릴리' },
      { ticker: 'JNJ', name: '존슨앤존슨' },
      { ticker: 'ABBV', name: '애브비' }
    ],
    getReason: (ratio, leadStock) => ratio >= 0 
      ? `차세대 비만치료제 및 항암제 임상 호조와 경기방어적 매력 부각`
      : `약가 인하 정책 부담 및 전통 제약주 파이프라인 지연 우려`
  },
  {
    ticker: 'XLI',
    name: '산업재',
    theme: '방산/항공우주/전력기계',
    stocks: [
      { ticker: 'GE', name: 'GE에어로스페이스' },
      { ticker: 'CAT', name: '캐터필러' },
      { ticker: 'LMT', name: '록히드마틴' }
    ],
    getReason: (ratio, leadStock) => ratio >= 0 
      ? `글로벌 방산 수주 확대 및 AI 데이터센터 전력 인프라 투자 지속`
      : `제조업 지표 둔화 및 설비투자 관망세로 인한 기간조정`
  },
  {
    ticker: 'XLY',
    name: '경기소비재',
    theme: '전기차/이커머스/유통',
    stocks: [
      { ticker: 'AMZN', name: '아마존' },
      { ticker: 'TSLA', name: '테슬라' },
      { ticker: 'HD', name: '홈디포' }
    ],
    getReason: (ratio, leadStock) => ratio >= 0 
      ? `소비 심리 회복 및 연말 쇼핑 시즌 전자상거래 매출 호조 기대`
      : `고물가·고금리 장기화에 따른 가계 소비 여력 위축 우려`
  },
  {
    ticker: 'XLP',
    name: '필수소비재',
    theme: '식음료/대형마트/생필품',
    stocks: [
      { ticker: 'WMT', name: '월마트' },
      { ticker: 'COST', name: '코스트코' },
      { ticker: 'PG', name: '프록터앤갬블' }
    ],
    getReason: (ratio, leadStock) => ratio >= 0 
      ? `시장 불확실성 속 안정적인 배당 수익률과 방어적 실적 돋보여`
      : `필수소비재 원가 상승 부담 및 소비재 가격 전가력 둔화`
  },
  {
    ticker: 'XLU',
    name: '유틸리티',
    theme: '원자력발전/전력망/신재생',
    stocks: [
      { ticker: 'NEE', name: '넥스트에라' },
      { ticker: 'SO', name: '서던컴퍼니' },
      { ticker: 'CEG', name: '콘스텔레이션에너지' }
    ],
    getReason: (ratio, leadStock) => ratio >= 0 
      ? `빅테크 AI 데이터센터 전력 수요 폭증 및 원전 장기 PPA 계약 체결 모멘텀`
      : `국채금리 반등에 따른 고배당 유틸리티 매력 상대적 약화`
  },
  {
    ticker: 'XLC',
    name: '커뮤니케이션',
    theme: '검색엔진/SNS/스트리밍',
    stocks: [
      { ticker: 'GOOGL', name: '알파벳' },
      { ticker: 'META', name: '메타' },
      { ticker: 'NFLX', name: '넷플릭스' }
    ],
    getReason: (ratio, leadStock) => ratio >= 0 
      ? `디지털 광고 매출 성장세 지속 및 생성형 AI 검색 점유율 방어`
      : `콘텐츠 제작비 증가 및 온라인 광고 성장률 둔화 우려`
  },
  {
    ticker: 'XLB',
    name: '소재',
    theme: '광물/화학/귀금속',
    stocks: [
      { ticker: 'LIN', name: '린데' },
      { ticker: 'FCX', name: '프리포트맥모란' },
      { ticker: 'NEM', name: '뉴몬트' }
    ],
    getReason: (ratio, leadStock) => ratio >= 0 
      ? `금·구리 등 산업용 금속 가격 견조 및 친환경 소재 수요 지속`
      : `글로벌 경기 둔화 우려에 따른 원자재 재고 축적 지연`
  },
  {
    ticker: 'XLRE',
    name: '부동산',
    theme: '데이터센터리츠/상업용부동산',
    stocks: [
      { ticker: 'PLD', name: '프로로지스' },
      { ticker: 'AMT', name: '아메리칸타워' },
      { ticker: 'EQIX', name: '에퀴닉스' }
    ],
    getReason: (ratio, leadStock) => ratio >= 0 
      ? `AI 데이터센터 전용 리츠 수요 급증 및 물류 인프라 임대율 방어`
      : `상업용 오피스 공실률 및 고금리 리파이낸싱 비용 부담`
  }
];

function fetchYahooQuote(ticker) {
  return new Promise((resolve) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const meta = parsed?.chart?.result?.[0]?.meta;
          if (!meta) return resolve(null);
          const price = meta.regularMarketPrice;
          const prev = meta.chartPreviousClose || meta.previousClose;
          const diff = price - prev;
          const ratio = prev ? (diff / prev * 100) : 0;
          resolve({
            ticker,
            price: price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            rawPrice: price,
            ratio: parseFloat(ratio.toFixed(2)),
            ratio_str: `${ratio >= 0 ? '+' : ''}${ratio.toFixed(2)}%`,
            diff: diff.toFixed(2)
          });
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
  });
}

function searchRealNews(query) {
  return new Promise((resolve) => {
    const url = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(query)}&sm=tab_opt&sort=1`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        const results = [];
        const regex = /<a[^>]*class="[^"]*news_tit[^"]*"[^>]*title="([^"]+)"[^>]*href="([^"]+)"/g;
        let m;
        while ((m = regex.exec(html)) !== null && results.length < 5) {
          const title = m[1]
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .trim();
          results.push({ title, link: m[2] });
        }
        resolve(results);
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(8000, () => { req.destroy(); resolve([]); });
  });
}

async function main() {
  console.log('📡 [1/4] 미국 11개 섹터 ETF 및 주요 대표 종목 시세 수집 중...');

  const sectorResults = [];
  for (const cfg of SECTOR_CONFIG) {
    const etfQuote = await fetchYahooQuote(cfg.ticker);
    const stocksData = [];

    for (const st of cfg.stocks) {
      const stQuote = await fetchYahooQuote(st.ticker);
      stocksData.push({
        ticker: st.ticker,
        name: st.name,
        ratio: stQuote ? stQuote.ratio : 0.0,
        ratio_str: stQuote ? stQuote.ratio_str : '+0.00%',
        price: stQuote ? stQuote.price : '0.00'
      });
    }

    const ratio = etfQuote ? etfQuote.ratio : 0.0;
    const ratio_str = etfQuote ? etfQuote.ratio_str : '+0.00%';
    const price = etfQuote ? etfQuote.price : '100.00';
    const reason = cfg.getReason(ratio, stocksData[0]?.name || cfg.name);

    sectorResults.push({
      ticker: cfg.ticker,
      name: cfg.name,
      theme: cfg.theme,
      price: price,
      ratio: ratio,
      ratio_str: ratio_str,
      reason: reason,
      stocks: stocksData
    });
  }

  // 등락률 기준 내림차순 정렬
  sectorResults.sort((a, b) => b.ratio - a.ratio);

  // 강세 섹터 (상승 섹터)
  const gainers = sectorResults.filter(s => s.ratio >= 0);
  // 만약 전 섹터 하락장일 경우 상위 2개
  const finalGainers = gainers.length > 0 ? gainers : sectorResults.slice(0, 2);

  // 약세 섹터 (하위 5개)
  const losersSorted = [...sectorResults].sort((a, b) => a.ratio - b.ratio);
  const finalLosers = losersSorted.slice(0, 5);

  console.log(`✅ 섹터 집계 완료: 강세 ${finalGainers.length}개 / 약세 TOP 5`);

  console.log('📊 [2/4] 원자재(원유, 금) 및 VIX 변동성 지표 실시간 수집 중...');
  const [wti, brent, gold, vix] = await Promise.all([
    fetchYahooQuote('CL=F'),
    fetchYahooQuote('BZ=F'),
    fetchYahooQuote('GC=F'),
    fetchYahooQuote('^VIX')
  ]);

  const macroData = {
    diesel_alert: `글로벌 에너지 시장 동향: WTI ${wti?.price || '70.50'}달러 선 안착 및 인플레이션 지표 모니터링`,
    wti: {
      name: 'WTI유',
      price: wti ? wti.price : '70.80',
      ratio: wti ? wti.ratio_str : '+0.00%'
    },
    brent: {
      name: '브렌트유',
      price: brent ? brent.price : '74.20',
      ratio: brent ? brent.ratio_str : '+0.00%'
    },
    gold: {
      name: '금',
      price: gold ? gold.price : '2,740.50',
      ratio: gold ? gold.ratio_str : '+0.00%'
    },
    vix: {
      name: 'VIX 변동성',
      price: vix ? vix.price : '17.20',
      ratio: vix ? vix.ratio_str : '+0.00%'
    },
    night_range: `뉴욕 증시 정규장 마감 기준 S&P500·나스닥 변동성 지수(${vix ? vix.price : '17.20'}) 유지`
  };

  console.log('📰 [3/4] 최신 뉴욕증시 마감 헤드라인 속보 크롤링 중...');
  const newsList = await searchRealNews('뉴욕증시 마감');
  
  let headline = '미국 증시 주요 지수 혼조 마감… AI 빅테크 및 금리 지표 관망';
  let summary3Lines = [
    '미 연준 통화정책 및 주요 경제지표 발표를 앞두고 증시 변동성 지속',
    'AI 데이터센터 및 반도체 밸류체인 수급 분산 속 섹터별 차별화 장세',
    '국제유가 및 국채금리 등락에 따른 방어주와 성장주 간 손바뀜 전개'
  ];

  if (newsList.length >= 3) {
    headline = newsList[0].title;
    summary3Lines = [newsList[0].title, newsList[1].title, newsList[2].title];
  } else if (newsList.length > 0) {
    headline = newsList[0].title;
    summary3Lines[0] = newsList[0].title;
  }

  const now = new Date();
  const kstDateStr = `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const output = {
    updated_at: now.toISOString(),
    updated_date_str: kstDateStr,
    headline: headline,
    summary_3lines: summary3Lines,
    gainers: finalGainers,
    losers: finalLosers,
    macro: macroData,
    news: newsList
  };

  console.log('💾 [4/4] 수집된 데이터 배포 파일로 저장 중...');
  const targetPaths = [
    path.join(__dirname, '..', 'data', 'us_sector_briefing.json'),
    path.join(__dirname, '..', 'public', 'data', 'us_sector_briefing.json'),
    path.join(__dirname, '..', 'stock-intelligence', 'public', 'data', 'us_sector_briefing.json'),
    path.join(__dirname, '..', 'stock-intelligence', 'data', 'us_sector_briefing.json')
  ];

  const jsonStr = JSON.stringify(output, null, 2);
  for (const p of targetPaths) {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, jsonStr, 'utf8');
    console.log(`✅ 저장 완료: ${p}`);
  }

  console.log('🎉 미국 증시 11개 섹터 및 최신 시황 데이터 갱신 완료!');
}

main();
