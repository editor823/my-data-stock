const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'telegram_config.json');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://m.stock.naver.com/',
  'Accept': 'application/json, text/plain, */*'
};

function loadConfig() {
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  const envChatId = process.env.TELEGRAM_CHAT_ID;
  if (envToken && envChatId) {
    return { botToken: envToken, chatId: envChatId };
  }

  const candidatePaths = [
    path.join(__dirname, '..', 'data', 'telegram_config.json'),
    path.join(__dirname, '..', '..', 'data', 'telegram_config.json'),
    path.join(__dirname, '..', 'stock-intelligence', 'data', 'telegram_config.json')
  ];
  for (const cp of candidatePaths) {
    if (fs.existsSync(cp)) {
      return JSON.parse(fs.readFileSync(cp, 'utf-8'));
    }
  }
  throw new Error('Telegram bot credentials not found in env or config file.');
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: HEADERS, timeout: 6000 }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function sendTelegramMessage(text, parseMode = 'HTML') {
  return new Promise((resolve, reject) => {
    const config = loadConfig();
    const payload = JSON.stringify({
      chat_id: config.chatId,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: true
    });

    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${config.botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.ok) {
            resolve(parsed.result);
          } else {
            reject(new Error(parsed.description || 'Unknown Telegram API error'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

// 1. 국내 시장 실시간 지수 수집 (코스피, 코스닥, 원/달러 환율)
async function getLiveIndices() {
  try {
    const [kData, kdData, fxRaw] = await Promise.all([
      fetchJson('https://m.stock.naver.com/api/index/KOSPI/basic'),
      fetchJson('https://m.stock.naver.com/api/index/KOSDAQ/basic'),
      fetchJson('https://m.stock.naver.com/front-api/marketIndex/prices?category=exchange&reutersCode=FX_USDKRW&page=1')
    ]);
    const fxData = fxRaw?.result?.[0] || {};
    const result = {
      updatedAt: new Date().toISOString(),
      kospi: {
        name: '코스피',
        closePrice: kData?.closePrice || kData?.now || '-',
        fluctuationsRatio: kData?.fluctuationsRatio || '0'
      },
      kosdaq: {
        name: '코스닥',
        closePrice: kdData?.closePrice || kdData?.now || '-',
        fluctuationsRatio: kdData?.fluctuationsRatio || '0'
      },
      usdKrw: {
        name: '원/달러 환율',
        closePrice: fxData?.closePrice || '-',
        fluctuationsRatio: fxData?.fluctuationsRatio || '0'
      }
    };

    const cachePath = path.join(__dirname, '..', 'scratch', 'api_result.json');
    try {
      fs.writeFileSync(cachePath, JSON.stringify(result, null, 2), 'utf8');
    } catch (e) {}

    return result;
  } catch (err) {
    console.warn('국내 지수 API 호출 실패, 캐시 조회:', err.message);
    const paths = [
      path.join(__dirname, '..', 'scratch', 'api_result.json'),
      path.join(__dirname, '..', 'data', 'api_result.json')
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        try {
          return JSON.parse(fs.readFileSync(p, 'utf-8'));
        } catch (e) {}
      }
    }
  }
  return null;
}

// 2. 밤사이 미국 및 글로벌 증시 실시간 4대 지표 수집 (장전 모닝 브리핑용)
async function getLiveUsIndices() {
  try {
    const [ixic, dji, inx, sox, fxRaw] = await Promise.all([
      fetchJson('https://api.stock.naver.com/index/.IXIC/basic'),
      fetchJson('https://api.stock.naver.com/index/.DJI/basic'),
      fetchJson('https://api.stock.naver.com/index/.INX/basic'),
      fetchJson('https://api.stock.naver.com/index/.SOX/basic'),
      fetchJson('https://m.stock.naver.com/front-api/marketIndex/prices?category=exchange&reutersCode=FX_USDKRW&page=1')
    ]);
    const fxData = fxRaw?.result?.[0] || {};

    return {
      nasdaq: {
        name: '나스닥',
        closePrice: ixic?.closePrice || ixic?.nowValue || '-',
        fluctuationsRatio: ixic?.fluctuationsRatio || '0'
      },
      dji: {
        name: '다우존스',
        closePrice: dji?.closePrice || dji?.nowValue || '-',
        fluctuationsRatio: dji?.fluctuationsRatio || '0'
      },
      sp500: {
        name: 'S&P 500',
        closePrice: inx?.closePrice || inx?.nowValue || '-',
        fluctuationsRatio: inx?.fluctuationsRatio || '0'
      },
      sox: {
        name: '필라델피아 반도체',
        closePrice: sox?.closePrice || sox?.nowValue || '-',
        fluctuationsRatio: sox?.fluctuationsRatio || '0'
      },
      usdKrw: {
        name: '원/달러 환율',
        closePrice: fxData?.closePrice || '-',
        fluctuationsRatio: fxData?.fluctuationsRatio || '0'
      }
    };
  } catch (err) {
    console.warn('미국 지수 수집 실패:', err.message);
    return null;
  }
}

// 3. 오늘의 실시간 1위 테마 그룹 수집 (네이버 테마 API)
async function getTodayTopTheme() {
  try {
    const listRes = await fetchJson('https://m.stock.naver.com/api/stocks/theme?page=1&pageSize=5');
    if (!listRes || !Array.isArray(listRes.groups) || listRes.groups.length === 0) return null;

    const top = listRes.groups[0];
    let stockItems = [];
    if (top.no) {
      const detailRes = await fetchJson(`https://m.stock.naver.com/api/stocks/theme/${top.no}?page=1&pageSize=8`);
      if (detailRes && Array.isArray(detailRes.stocks)) {
        stockItems = detailRes.stocks.map(s => `<b>${escapeHtml(s.stockName)}</b> (+${s.fluctuationsRatio}%)`);
      }
    }

    return {
      name: top.name,
      changeRate: top.changeRate,
      stocks: stockItems.slice(0, 5)
    };
  } catch (err) {
    console.warn('테마 수집 실패:', err.message);
    return null;
  }
}

// 4. 오늘의 상한가 및 20% 이상 급등 개별주 & 근거 분석
function getTodaySurgeStocks() {
  const candidatePaths = [
    path.join(__dirname, '..', 'public', 'data', 'live_domestic_news.json'),
    path.join(__dirname, '..', 'data', 'live_domestic_news.json'),
    path.join(__dirname, '..', 'stock-intelligence', 'public', 'data', 'live_domestic_news.json'),
    path.join(__dirname, '..', '..', 'data', 'live_domestic_news.json')
  ];
  let rawList = [];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const d = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (Array.isArray(d) && d.length > 0) {
          rawList = d;
          break;
        }
      } catch (e) {}
    }
  }
  if (rawList.length === 0) return [];

  const surgeKeywords = ['상한가', '24%', '20%', '25%', '28%', '29%', '30%', '급등'];
  const candidates = rawList.filter(item => {
    const tit = item.tit || '';
    return surgeKeywords.some(k => tit.includes(k));
  });

  const results = [];
  const seenStocks = new Set();

  candidates.forEach(item => {
    const tit = item.tit || '';
    if (tit.includes('한화M&S') && !seenStocks.has('한화M&S')) {
      seenStocks.add('한화M&S');
      results.push({
        stock: '한화M&S (+24% 급등)',
        reason: '김동선 미래전략총괄 사장의 1,285억원 규모 공개매수(주당 8,000원) 첫날 소식',
        url: (item.oid && item.aid) ? `https://n.news.naver.com/mnews/article/${item.oid}/${item.aid}` : null
      });
    } else if ((tit.includes('최태원') || tit.includes('호남 반도체') || tit.includes('금호전기')) && !seenStocks.has('호남반도체')) {
      seenStocks.add('호남반도체');
      results.push({
        stock: '금호전기, 금호건설 등 (상한가·급등)',
        reason: '최태원 SK 회장의 400조원 규모 호남 반도체 클러스터 예정지 방문 및 속도전 주문 발표',
        url: (item.oid && item.aid) ? `https://n.news.naver.com/mnews/article/${item.oid}/${item.aid}` : null
      });
    } else if (tit.includes('상폐 유예') && !seenStocks.has('상폐유예')) {
      seenStocks.add('상폐유예');
      results.push({
        stock: '시총 미달 코스닥 관리종목군 (동반 급등)',
        reason: '거래소의 시가총액 미달 기업 상장폐지 절차 유예 조치 발표에 따른 안도 매수세 유입',
        url: (item.oid && item.aid) ? `https://n.news.naver.com/mnews/article/${item.oid}/${item.aid}` : null
      });
    }
  });

  return results;
}

// 5. 실시간 증시 뉴스 선별 (진짜 기사 원문 링크 연동)
function getCuratedMarketNews(isMorning = false) {
  const paths = [
    path.join(__dirname, '..', 'public', 'data', 'live_domestic_news.json'),
    path.join(__dirname, '..', 'data', 'live_domestic_news.json'),
    path.join(__dirname, '..', 'stock-intelligence', 'public', 'data', 'live_domestic_news.json')
  ];

  let rawList = [];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (Array.isArray(data) && data.length > 0) {
          rawList = data;
          break;
        }
      } catch (e) {}
    }
  }

  if (rawList.length === 0) return [];

  const excludeKeywords = ['식대', '축의금', '결혼식', '월세', '아파트 월세', '빌라', '전월세', '청첩장'];
  const stockNews = rawList.filter(item => {
    const text = (item.tit || '') + ' ' + (item.subcontent || '');
    return !excludeKeywords.some(k => text.includes(k));
  });

  const domesticKeywords = ['코스피', '코스닥', '급락', '마감', '외인', '외국인', '투매', '반도체', '삼성전자', '환율'];
  const globalKeywords = ['트럼프', '우크라', '휴전', '미국', '나스닥', '금리', 'CPI', '유가', '전쟁', '엔비디아', '뉴욕증시'];

  const domesticList = [];
  const globalList = [];

  stockNews.forEach(item => {
    let dScore = 0;
    domesticKeywords.forEach(k => {
      if ((item.tit || '').includes(k)) dScore += 5;
      else if ((item.subcontent || '').includes(k)) dScore += 2;
    });

    let gScore = 0;
    globalKeywords.forEach(k => {
      if ((item.tit || '').includes(k)) gScore += 5;
      else if ((item.subcontent || '').includes(k)) gScore += 2;
    });

    if (dScore > 0) domesticList.push({ ...item, score: dScore });
    if (gScore > 0) globalList.push({ ...item, score: gScore });
  });

  domesticList.sort((a, b) => b.score - a.score);
  globalList.sort((a, b) => b.score - a.score);

  const selected = [];
  const selectedAids = new Set();

  function addArticle(art, categoryTag) {
    const key = art.aid || art.tit;
    if (key && !selectedAids.has(key)) {
      selectedAids.add(key);
      selected.push({ ...art, categoryTag });
    }
  }

  if (isMorning) {
    // 장전 모닝 브리핑: 글로벌/밤사이 변수 우선
    globalList.slice(0, 2).forEach(a => addArticle(a, '글로벌 변수'));
    domesticList.slice(0, 2).forEach(a => addArticle(a, '국내 개장전'));
  } else {
    // 장마감 종합 리포트: 국내 마감 시황 우선
    domesticList.slice(0, 2).forEach(a => addArticle(a, '국내 시황'));
    globalList.slice(0, 1).forEach(a => addArticle(a, '글로벌 변수'));
    domesticList.slice(2, 4).forEach(a => {
      if (selected.length < 3) addArticle(a, '주요 특징');
    });
  }

  return selected.slice(0, 3);
}

// 6. 심플 관심종목 TV 당일 아침 브리핑 데이터 추출 (장전 모닝 브리핑용)
function getMorningBriefingData() {
  const candidatePaths = [
    path.join(__dirname, '..', 'data', 'simple_channel_briefing.json'),
    path.join(__dirname, '..', 'public', 'data', 'simple_channel_briefing.json'),
    path.join(__dirname, '..', 'stock-intelligence', 'data', 'simple_channel_briefing.json'),
    path.join(__dirname, '..', '..', 'data', 'simple_channel_briefing.json')
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        const morning = data.timeline?.find(t => t.categoryCode === 'morning') || data.timeline?.[0];
        if (!morning) continue;

        const themeNames = morning.themes ? morning.themes.map(t => t.name).slice(0, 4) : [];
        const stockNames = morning.targetStocks ? morning.targetStocks.map(s => s.name).slice(0, 5) : [];

        return {
          title: morning.title || '',
          summary: morning.executiveSummary || '',
          themes: themeNames,
          stocks: stockNames,
          url: morning.url || ''
        };
      } catch (e) {}
    }
  }
  return null;
}

// 7. 매크로 흔들릴 때 볼 EPS 지속성 탑픽 섹터 공통 템플릿
const EPS_PICK_SECTION = `💎 <b>[매크로 흔들릴 때 볼 EPS 지속성 탑픽 섹터]</b>\n` +
  `⚡ <b>AI 전력망/변압기:</b>\n` +
  `   👉 <b>HD현대일렉트릭, 효성중공업, LS ELECTRIC, 일진전기, 제룡전기, 산일전기</b>\n` +
  `   ↳ <i>EPS 지속성: AI 데이터센터 전력 쇼티지 & 4~5년치 일감 완판, 20%대 고마진 유지</i>\n\n` +
  `💾 <b>AI 반도체 HBM/장비:</b>\n` +
  `   👉 <b>SK하이닉스, 한미반도체, 테크윙, 한솔케미칼, 디아이, 와이씨</b>\n` +
  `   ↳ <i>EPS 지속성: 엔비디아향 HBM3E/HBM4 독점 완판, 분기 영업익 7조원대 실적 폭발</i>\n\n` +
  `🚢 <b>K-조선/친환경선:</b>\n` +
  `   👉 <b>HD한국조선해양, HD현대중공업, 삼성중공업, 한화오션, HD현대마린엔진, 동성화인텍</b>\n` +
  `   ↳ <i>EPS 지속성: 3년치 고선가 도크 풀가동, 헐값 물량 해소 후 분기별 순이익 급증</i>\n\n` +
  `🧬 <b>K-바이오 CDMO/신약:</b>\n` +
  `   👉 <b>삼성바이오로직스, 알테오젠, 에스티팜, 리가켐바이오, 유한양행</b>\n` +
  `   ↳ <i>EPS 지속성: 美 생물보안법 수혜 + 비만치료제 위탁생산 폭증, 30~40% 마진 지속</i>\n\n`;

// 🌅 [개장전 모닝 브리핑] 빌더
async function buildMorningReport(dateStr, timeStr) {
  const us = await getLiveUsIndices();
  let indexSection = '';
  let soxNum = 0;
  let nasdaqNum = 0;

  if (us) {
    soxNum = parseFloat(us.sox.fluctuationsRatio || 0);
    nasdaqNum = parseFloat(us.nasdaq.fluctuationsRatio || 0);

    const fmtRate = (r) => (parseFloat(r) >= 0 ? `+${r}%` : `${r}%`);
    indexSection = `🌐 <b>[1. 밤사이 뉴욕 증시 & 글로벌 핵심 지표]</b>\n` +
      `• 다우존스: <b>${us.dji.closePrice}</b> (${fmtRate(us.dji.fluctuationsRatio)})\n` +
      `• 나스닥: <b>${us.nasdaq.closePrice}</b> (${fmtRate(us.nasdaq.fluctuationsRatio)})\n` +
      `• S&P 500: <b>${us.sp500.closePrice}</b> (${fmtRate(us.sp500.fluctuationsRatio)})\n` +
      `• 필라델피아 반도체: <b>${us.sox.closePrice}</b> (${fmtRate(us.sox.fluctuationsRatio)})\n` +
      `• 원/달러 환율: <b>${us.usdKrw.closePrice}원</b> (${fmtRate(us.usdKrw.fluctuationsRatio)})\n\n`;
  }

  // 글로벌 시황 심층 진단
  let globalDiagnosis = '';
  if (soxNum <= -2.0) {
    globalDiagnosis = `🚨 <b>[2. 밤사이 글로벌 증시 심층 진단: 반도체 급락 주의]</b>\n` +
      `🔥 <b>글로벌 동향:</b> 필라델피아 반도체 지수(${soxNum}%) 급락 및 기술주 차익 실현\n` +
      `💡 <b>핵심 변수:</b> AI 대형주 수익화 우려 및 국채 금리·CPI 발표 앞둔 관망세\n` +
      `📊 <b>국내 영향:</b> 삼성전자·SK하이닉스 등 국내 반도체주 장 초반 경계 매물 유입 가능성\n` +
      `🔴 <b>주의 리스크:</b> 섣부른 시초가 추격 매수 자제 및 9시 30분 수급 확인 필수\n\n`;
  } else if (nasdaqNum <= -1.0) {
    globalDiagnosis = `📉 <b>[2. 밤사이 글로벌 증시 심층 진단: 기술주 약세 조정]</b>\n` +
      `🔥 <b>글로벌 동향:</b> 나스닥(${nasdaqNum}%) 차익 매물 출회 및 혼조세 마감\n` +
      `💡 <b>핵심 변수:</b> 글로벌 매크로 불확실성 속 방어주 및 실적주 선별 장세\n` +
      `📊 <b>국내 영향:</b> 개장 초반 지수 보합권 등락 속 개별 실적 호전주 중심 차별화\n\n`;
  } else if (nasdaqNum >= 1.0 || soxNum >= 1.5) {
    globalDiagnosis = `🚀 <b>[2. 밤사이 글로벌 증시 심층 진단: 미 증시 훈풍 랠리]</b>\n` +
      `🔥 <b>글로벌 동향:</b> 나스닥(${nasdaqNum}%) 및 반도체(${soxNum}%) 동반 강세\n` +
      `💡 <b>핵심 재료:</b> 빅테크 호실적 기대감 및 금리 안정에 따른 투자심리 개선\n` +
      `🟢 <b>국내 영향:</b> 국내 대표 기술주 및 성장주 시초가 갭상승 출발 기대\n\n`;
  } else {
    globalDiagnosis = `⚖️ <b>[2. 밤사이 글로벌 증시 심층 진단: 보합 혼조 장세]</b>\n` +
      `🔥 <b>글로벌 동향:</b> 뉴욕 3대 지수 뚜렷한 방향성 없이 관망세 마감\n` +
      `💡 <b>핵심 변수:</b> 주요 경제지표 대기 속 종목별 실적에 따른 개별 장세 전개\n\n`;
  }

  // 당일 아침 핵심 관심 테마 & 추천 종목
  const morningBrief = getMorningBriefingData();
  let morningThemeSection = '';
  if (morningBrief && morningBrief.themes.length > 0) {
    const tStr = morningBrief.themes.join(', ');
    const sStr = morningBrief.stocks.length > 0 ? morningBrief.stocks.join(', ') : '대표 대장주';
    const sumLine = morningBrief.summary ? `   ↳ <i>체크: ${escapeHtml(morningBrief.summary.slice(0, 75))}...</i>\n` : '';
    morningThemeSection = `📺 <b>[4. 당일 아침 핵심 관심 테마 & 추천 종목 (심플 관심종목 TV)]</b>\n` +
      `• 💡 <b>관심 테마군:</b> <b>${escapeHtml(tStr)}</b>\n` +
      `• 🎯 <b>집중 추적 종목:</b> <b>${escapeHtml(sStr)}</b>\n` +
      sumLine +
      `• ⚡ <b>핵심 체크포인트:</b> 8:40~9:00 동시호가 예상체결가 점검 및 1등 대장주 압축 대응\n\n`;
  }

  // 장전 핵심 글로벌·국내 속보
  const newsList = getCuratedMarketNews(true);
  let newsSection = '';
  if (newsList.length > 0) {
    const newsLines = newsList.map((n, i) => {
      const press = n.ohnm ? `[${escapeHtml(n.ohnm)}] ` : '';
      const tag = n.categoryTag ? `[${escapeHtml(n.categoryTag)}] ` : '';
      const title = escapeHtml(n.tit || n.title || '속보');
      const newsUrl = (n.oid && n.aid) 
        ? `https://n.news.naver.com/mnews/article/${n.oid}/${n.aid}`
        : `https://finance.naver.com/news/`;
      const sub = n.subcontent ? `\n   ↳ <i>${escapeHtml(n.subcontent.trim().slice(0, 75))}...</i>` : '';
      return `<b>${i + 1}.</b> ${tag}${press}<a href="${newsUrl}"><b>${title}</b></a>${sub}\n   🔗 <a href="${newsUrl}">👉 [기사 원문 바로가기]</a>`;
    }).join('\n\n');
    newsSection = `📰 <b>[5. 장전 핵심 글로벌·국내 속보 (클릭시 기사 원문)]</b>\n${newsLines}\n\n`;
  }

  // 개장전 실전 가이드
  const strategySection = `🧭 <b>[6. 개장전 실전 투자 대응 전략 (모닝 실전 가이드)]</b>\n` +
    `• <b>뇌동 시초가 추격 절대 금지:</b> 8:40~9:00 사이 5% 이상 갭이 크게 뜨는 종목은 시초가 추격매수 절대 지양\n` +
    `• <b>장 초반(09:00~09:30) 수급 확인:</b> 장 개시 30분 후 외인·기관 실질 순매수 유입 여부 확인 후 눌림목 접근\n` +
    `• <b>거래대금 1등 대장주 압축:</b> 관심 섹터 내에서 거래량과 호가 잔량이 가장 탄탄한 1등주로만 압축 매매\n\n`;

  const footer = `🌐 <a href="https://my-data-stock.pages.dev">주식센터 실시간 대시보드 바로가기</a>`;

  return `📊 <b>[주식 인텔리전스 센터 - 🌅 개장전 모닝 브리핑]</b>\n\n` +
    `📅 <b>기준일시:</b> ${dateStr} ${timeStr}\n\n` +
    indexSection +
    globalDiagnosis +
    EPS_PICK_SECTION +
    morningThemeSection +
    newsSection +
    strategySection +
    footer;
}

// 🌆 [장마감 심층 종합 리포트] 빌더
async function buildClosingReport(dateStr, timeStr) {
  const indices = await getLiveIndices();
  let marketSection = '';
  let kospiNum = 0;
  let kosdaqNum = 0;

  if (indices) {
    kospiNum = parseFloat(indices.kospi?.fluctuationsRatio || 0);
    kosdaqNum = parseFloat(indices.kosdaq?.fluctuationsRatio || 0);

    const kospiRate = kospiNum >= 0 ? `+${indices.kospi.fluctuationsRatio}%` : `${indices.kospi.fluctuationsRatio}%`;
    const kosdaqRate = kosdaqNum >= 0 ? `+${indices.kosdaq.fluctuationsRatio}%` : `${indices.kosdaq.fluctuationsRatio}%`;
    const usd = indices.usdKrw ? `${indices.usdKrw.closePrice}원` : '-';

    marketSection = `📈 <b>[1. 시장 핵심 지표]</b>\n` +
      `• 코스피: <b>${indices.kospi?.closePrice || '-'}</b> (${kospiRate})\n` +
      `• 코스닥: <b>${indices.kosdaq?.closePrice || '-'}</b> (${kosdaqRate})\n` +
      `• 원/달러 환율: <b>${usd}</b>\n\n`;
  }

  // 시장 국면 심층 진단
  let diagnosisSection = '';
  const isMarketCrash = (kospiNum <= -2.0 || kosdaqNum <= -3.0);
  const isMarketDrop = (kospiNum <= -1.0 || kosdaqNum <= -1.5);
  const isMarketSurge = (kospiNum >= 1.5 || kosdaqNum >= 2.0);

  if (isMarketCrash) {
    diagnosisSection = `🚨 <b>[2. 시장 긴급 심층 진단: 대형주 투매 및 지수 급락]</b>\n` +
      `🔥 <b>시장 상태:</b> 급락 패닉셀 (코스피 ${kospiNum}%, 코스닥 ${kosdaqNum}%)\n` +
      `💡 <b>핵심 원인:</b> 외국인/기관 대규모 순매도 폭탄 및 지지선 이탈\n` +
      `📊 <b>기술적 위치:</b> 주요 지지 라인 붕괴에 따른 실망 매물 출회 및 투매 국면\n` +
      `🔴 <b>주의 리스크:</b> 반도체 등 주도 업종 차익 실현 및 추가 변동성 확대\n\n`;
  } else if (isMarketDrop) {
    diagnosisSection = `📉 <b>[2. 오늘의 시장 국면 심층 진단: 약세 조정]</b>\n` +
      `🔥 <b>시장 상태:</b> 외인 매도세 우위 및 차익 실현 장세\n` +
      `💡 <b>핵심 원인:</b> 글로벌 대외 변수 불안 및 수급 분산\n` +
      `📊 <b>기술적 위치:</b> 단기 이평선 지지력 테스트 국면\n` +
      `🔴 <b>주의 리스크:</b> 무리한 추격 매수 자제 및 지지선 확인 필요\n\n`;
  } else if (isMarketSurge) {
    diagnosisSection = `🚀 <b>[2. 오늘의 시장 국면 심층 진단: 강력한 반등 랠리]</b>\n` +
      `🔥 <b>시장 상태:</b> 기관·외인 쌍끌이 매수 유입\n` +
      `💡 <b>핵심 재료:</b> 대외 악재 완화 및 주도 섹터 수급 집중\n` +
      `📊 <b>기술적 위치:</b> 저항선 돌파 시도 및 안착 국면\n` +
      `🟢 <b>상승 촉매:</b> 실적 호전주 및 모멘텀 보유주 중심 탄력\n\n`;
  } else {
    diagnosisSection = `⚖️ <b>[2. 오늘의 시장 국면 심층 진단: 혼조/눈치보기]</b>\n` +
      `🔥 <b>시장 상태:</b> 지수 보합권 등락 및 종목별 차별화\n` +
      `💡 <b>핵심 원인:</b> 주요 경제지표 발표 앞둔 관망세\n` +
      `📊 <b>기술적 위치:</b> 박스권 내 수급 공방 국면\n\n`;
  }

  // 오늘의 실시간 주도 테마 그룹 & 급등/상한가 집중 분석
  const topTheme = await getTodayTopTheme();
  const surgeStocks = getTodaySurgeStocks();

  let themeAndSurgeSection = '';
  let themeContent = '';
  if (topTheme) {
    const stockStr = topTheme.stocks.length > 0 ? topTheme.stocks.join(', ') : '주요 관련주 상승';
    themeContent = `🔥 <b>오늘의 주도 테마군:</b> <b>${escapeHtml(topTheme.name)} (+${topTheme.changeRate}%)</b>\n` +
      `   • <b>핵심 상승 종목:</b> ${stockStr}\n` +
      `   • <b>상승 근거:</b> 글로벌 수급 집중 및 정책·실적 모멘텀으로 전 종목 동반 강세\n\n`;
  }

  let surgeContent = '';
  if (surgeStocks.length > 0) {
    const lines = surgeStocks.map(s => {
      const link = s.url ? ` <a href="${s.url}">[기사보기]</a>` : '';
      return `🚀 <b>${escapeHtml(s.stock)}</b>${link}\n   ↳ <i>상승 근거: ${escapeHtml(s.reason)}</i>`;
    }).join('\n');
    surgeContent = `🎯 <b>오늘의 급등(+20%↑) & 상한가 개별주:</b>\n${lines}\n\n`;
  }

  if (themeContent || surgeContent) {
    themeAndSurgeSection = `🏆 <b>[4. 오늘의 주도 테마군 & 상한가/급등주 분석]</b>\n` +
      themeContent +
      surgeContent;
  }

  // 증시 핵심 속보 & 시황 헤드라인
  const newsList = getCuratedMarketNews(false);
  let newsSection = '';
  if (newsList.length > 0) {
    const newsLines = newsList.map((n, i) => {
      const press = n.ohnm ? `[${escapeHtml(n.ohnm)}] ` : '';
      const tag = n.categoryTag ? `[${escapeHtml(n.categoryTag)}] ` : '';
      const title = escapeHtml(n.tit || n.title || '속보');
      const newsUrl = (n.oid && n.aid) 
        ? `https://n.news.naver.com/mnews/article/${n.oid}/${n.aid}`
        : `https://finance.naver.com/news/`;
      const sub = n.subcontent ? `\n   ↳ <i>${escapeHtml(n.subcontent.trim().slice(0, 75))}...</i>` : '';
      return `<b>${i + 1}.</b> ${tag}${press}<a href="${newsUrl}"><b>${title}</b></a>${sub}\n   🔗 <a href="${newsUrl}">👉 [기사 원문 바로가기]</a>`;
    }).join('\n\n');
    newsSection = `📰 <b>[5. 증시 핵심 속보 & 시황 헤드라인 (클릭시 기사 원문)]</b>\n${newsLines}\n\n`;
  }

  // 실전 투자 대응 전략
  let strategySection = '';
  if (isMarketCrash) {
    strategySection = `💡 <b>[6. 실전 투자 대응 전략 (급락장 긴급 가이드)]</b>\n` +
      `• <b>무리한 물타기·추격 매수 절대 금지:</b> 지지선 안착 확인 전까지 현금 비중 유지\n` +
      `• <b>실망 매물 진정 확인:</b> 반도체 등 핵심 대형주 외국인 매도세 둔화 시점 주시\n` +
      `• <b>손절 기준 엄수:</b> 지지선 이탈 종목 리스크 관리 및 방어적 포트폴리오 운용\n\n`;
  } else {
    strategySection = `💡 <b>[6. 실전 투자 대응 전략]</b>\n` +
      `• 주도 테마 대장주 위주의 <b>눌림목 분할 접근</b> 원칙 준수\n` +
      `• 급등 추격 매수 지양 및 거래대금 실린 종목 선별 대응\n` +
      `• 장 초반 외인·기관 실시간 수급 방향 확인 필수\n\n`;
  }

  const footer = `🌐 <a href="https://my-data-stock.pages.dev">주식센터 실시간 대시보드 바로가기</a>`;

  return `📊 <b>[주식 인텔리전스 센터 - 🌆 장마감 심층 종합 리포트]</b>\n\n` +
    `📅 <b>기준일시:</b> ${dateStr} ${timeStr}\n\n` +
    marketSection +
    diagnosisSection +
    EPS_PICK_SECTION +
    themeAndSurgeSection +
    newsSection +
    strategySection +
    footer;
}

async function run() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ko-KR', { 
    timeZone: 'Asia/Seoul', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    weekday: 'short' 
  });
  const timeStr = now.toLocaleTimeString('ko-KR', { 
    timeZone: 'Asia/Seoul', 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const kstHour = parseInt(now.toLocaleTimeString('en-US', { timeZone: 'Asia/Seoul', hour12: false, hour: '2-digit' }), 10);
  const arg = (process.argv[2] || '').toLowerCase();

  let isMorning = false;
  if (arg === 'morning') {
    isMorning = true;
  } else if (arg === 'close' || arg === 'closing') {
    isMorning = false;
  } else {
    // 기본 시간대 자동 판별: 06시~11시는 개장전 모닝 브리핑, 그 외는 장마감 종합 리포트
    if (kstHour >= 6 && kstHour < 11) {
      isMorning = true;
    } else {
      isMorning = false;
    }
  }

  let fullReport = '';
  if (isMorning) {
    fullReport = await buildMorningReport(dateStr, timeStr);
  } else {
    fullReport = await buildClosingReport(dateStr, timeStr);
  }

  try {
    await sendTelegramMessage(fullReport);
    console.log(`✅ [${isMorning ? '개장전 모닝 브리핑' : '장마감 심층 종합 리포트'}] 텔레그램 발송 성공!`);
  } catch (err) {
    console.error('❌ 발송 실패:', err.message);
  }
}

if (require.main === module) {
  run();
}

module.exports = { sendTelegramMessage, buildMorningReport, buildClosingReport };
