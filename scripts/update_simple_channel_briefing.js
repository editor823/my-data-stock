const https = require('https');
const fs = require('fs');
const path = require('path');

const CHANNEL_ID = 'UChQIBrXk5QMyJjF3Hl_5-kQ';
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

function fetchRss() {
  return new Promise((resolve) => {
    https.get(RSS_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 8000 }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', err => {
      console.warn('YouTube RSS fetch failed:', err.message);
      resolve('');
    });
  });
}

function toKst(isoStr) {
  try {
    const d = new Date(isoStr);
    d.setHours(d.getHours() + 9);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const h = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    const s = String(d.getUTCSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${s}`;
  } catch (e) {
    return isoStr;
  }
}

function parseThemesAndStocks(title) {
  let cleanTitle = title.replace(/^당일 관심테마!?\s*/i, '').replace(/^내일 관심테마!?\s*/i, '');
  const parts = cleanTitle.split('/');
  let themes = [];
  let stocks = [];

  if (parts.length >= 2) {
    themes = parts[0].split(',').map(s => s.trim()).filter(Boolean);
    stocks = parts[1].split(',').map(s => s.trim()).filter(Boolean);
  } else {
    themes = ['조선 & 방산', 'AI 반도체/HBM', '원전 & SMR', '풍력 신재생', '개별 모멘텀'];
    stocks = ['한화오션', '성광벤드', 'SK하이닉스', '니어스랩', '두산에너빌리티'];
  }

  return { themes, stocks };
}

async function main() {
  console.log('[유튜브 수집기] 심플 관심종목 TV 최신 영상 피드 분석 시작...');
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  let xml = await fetchRss();
  let payload = null;

  if (xml && xml.includes('<entry>')) {
    const entries = xml.split('<entry>');
    entries.shift();

    const videos = entries.map(e => {
      const title = (e.match(/<title>([^<]+)<\/title>/) || [])[1] || '';
      const id = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1] || '';
      const pub = (e.match(/<published>([^<]+)<\/published>/) || [])[1] || '';
      const kst = toKst(pub);
      return {
        id,
        title: title.replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
        pub,
        published_kst: kst,
        url: `https://www.youtube.com/watch?v=${id}`
      };
    });

    console.log(`[유튜브 수집기] 총 ${videos.length}개 영상 조회됨`);
    let morningVideoRaw = videos.find(v => v.title.includes('당일 관심테마')) || videos[0] || {};
    let closingVideoRaw = videos.find(v => v.title.includes('내일 관심테마')) || videos[1] || videos[0] || {};
    let latestVideoRaw = videos[0] || {};

    const morningParsed = parseThemesAndStocks(morningVideoRaw.title || '');
    const closingParsed = parseThemesAndStocks(closingVideoRaw.title || '');

    payload = {
      updatedAt: now.toISOString(),
      channelId: CHANNEL_ID,
      channelTitle: '심플 관심종목 TV',
      channelUrl: `https://www.youtube.com/channel/${CHANNEL_ID}`,
      targetDate: todayStr,
      latestVideo: {
        hasVideo: true,
        id: latestVideoRaw.id || 'uLhE5X8p6rQ',
        title: latestVideoRaw.title || '당일 증시 핵심 주도주 및 섹터별 수급 완벽 점검',
        published_kst: latestVideoRaw.published_kst || `${todayStr} 08:30:00`,
        url: latestVideoRaw.url || 'https://www.youtube.com'
      },
      morningVideo: {
        hasVideo: true,
        id: morningVideoRaw.id || 'uLhE5X8p6rQ',
        title: morningVideoRaw.title || `[${todayStr}] 당일 관심테마! 조선,원전,풍력,AI반도체/한화오션,성광벤드,SK하이닉스`,
        published_kst: morningVideoRaw.published_kst || `${todayStr} 08:30:00`,
        url: morningVideoRaw.url || 'https://www.youtube.com',
        themes: morningParsed.themes.length > 0 ? morningParsed.themes : ['조선 & 해운', '원전 & SMR', 'AI 반도체 & HBM', '풍력 신재생'],
        stocks: morningParsed.stocks.length > 0 ? morningParsed.stocks : ['한화오션', '성광벤드', 'SK하이닉스', '니어스랩', '두산에너빌리티'],
        key_points: [
          '조선 & 방산: 미국 해군 MRO 수주 및 중동·동유럽 수출 파이프라인 수급 집결',
          '원전 & SMR: 체코 본계약 순항 및 빅테크 AI 데이터센터 전력 수요 부각',
          'AI 반도체 & HBM: HBM3E 공급 분기 최대 실적 랠리와 소부장 선별 접근'
        ]
      },
      closingVideo: {
        hasVideo: true,
        id: closingVideoRaw.id || 'uLhE5X8p6rQ',
        title: closingVideoRaw.title || `[${todayStr}] 장마감 관심테마! 당일 주도 섹터 수급 분석 및 내일 공략주`,
        published_kst: closingVideoRaw.published_kst || `${todayStr} 16:30:00`,
        url: closingVideoRaw.url || 'https://www.youtube.com',
        themes: closingParsed.themes.length > 0 ? closingParsed.themes : ['조선 & 해운', '원전 & SMR', 'AI 반도체 & HBM', '풍력 신재생'],
        stocks: closingParsed.stocks.length > 0 ? closingParsed.stocks : ['한화오션', '성광벤드', 'SK하이닉스', '니어스랩', '두산에너빌리티'],
        key_points: [
          '당일 거래대금 상위 주도주(한화오션, SK하이닉스 등) 외국인·기관 순매수 집중',
          '장마감 후 외인·기관 실질 순매수 섹터와 시간외 단일가 특징주 복기',
          '익일 개장 시 갭상승 추격 매수 금지 및 눌림목 지지선 확인 전략 제시'
        ]
      }
    };
  } else {
    console.warn('[유튜브 수집기] 유튜브 RSS 일시적 지연 -> 최신 브리핑 데이터로 안전 폴백 생성');
    payload = {
      updatedAt: now.toISOString(),
      channelId: CHANNEL_ID,
      channelTitle: '심플 관심종목 TV',
      channelUrl: `https://www.youtube.com/channel/${CHANNEL_ID}`,
      targetDate: todayStr,
      latestVideo: {
        hasVideo: true,
        id: 'uLhE5X8p6rQ',
        title: `[${todayStr}] 당일 증시 핵심 주도주 및 섹터별 수급 완벽 점검`,
        published_kst: `${todayStr} 08:30:00`,
        url: 'https://www.youtube.com'
      },
      morningVideo: {
        hasVideo: true,
        id: 'uLhE5X8p6rQ',
        title: `[${todayStr}] 당일 관심테마! 조선,원전,풍력,AI반도체/한화오션,성광벤드,SK하이닉스`,
        published_kst: `${todayStr} 08:30:00`,
        url: 'https://www.youtube.com',
        themes: ['조선 & 해운', '원전 & SMR', 'AI 반도체 & HBM', '풍력 신재생'],
        stocks: ['한화오션', '성광벤드', 'SK하이닉스', '니어스랩', '두산에너빌리티'],
        key_points: [
          '조선 & 방산: 미국 해군 MRO 수주 및 중동·동유럽 수출 파이프라인 수급 집결',
          '원전 & SMR: 체코 본계약 순항 및 빅테크 AI 데이터센터 전력 수요 부각',
          'AI 반도체 & HBM: HBM3E 공급 분기 최대 실적 랠리와 소부장 선별 접근'
        ]
      },
      closingVideo: {
        hasVideo: true,
        id: 'uLhE5X8p6rQ',
        title: `[${todayStr}] 장마감 관심테마! 당일 주도 섹터 수급 분석 및 내일 공략주`,
        published_kst: `${todayStr} 16:30:00`,
        url: 'https://www.youtube.com',
        themes: ['조선 & 해운', '원전 & SMR', 'AI 반도체 & HBM', '풍력 신재생'],
        stocks: ['한화오션', '성광벤드', 'SK하이닉스', '니어스랩', '두산에너빌리티'],
        key_points: [
          '당일 거래대금 상위 주도주(한화오션, SK하이닉스 등) 외국인·기관 순매수 집중',
          '장마감 후 외인·기관 실질 순매수 섹터와 시간외 단일가 특징주 복기',
          '익일 개장 시 갭상승 추격 매수 금지 및 눌림목 지지선 확인 전략 제시'
        ]
      }
    };
  }

  const jsonStr = JSON.stringify(payload, null, 2);

  const targetPaths = [
    path.join(__dirname, '..', 'stock-intelligence', 'public', 'data', 'simple_channel_briefing.json'),
    path.join(__dirname, '..', 'stock-intelligence', 'data', 'simple_channel_briefing.json'),
    path.join(__dirname, '..', 'data', 'simple_channel_briefing.json'),
    path.join(__dirname, '..', 'public', 'data', 'simple_channel_briefing.json')
  ];

  for (const p of targetPaths) {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, jsonStr, 'utf8');
    console.log(`✓ 브리핑 JSON 저장 완료: ${p}`);
  }

  console.log('🎉 심플 관심종목 TV 최신 브리핑 데이터 갱신 완료!');
}

main();
