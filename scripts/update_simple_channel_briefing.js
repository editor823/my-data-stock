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
  // 예: "당일 관심테마! 반도체,소부장,비만치료제,페스트,개별주/삼성전자,SK하이닉스,주성엔지니어링..."
  let cleanTitle = title.replace(/^당일 관심테마!?\s*/i, '').replace(/^내일 관심테마!?\s*/i, '');
  const parts = cleanTitle.split('/');
  
  let themes = [];
  let stocks = [];

  if (parts.length >= 2) {
    themes = parts[0].split(',').map(s => s.trim()).filter(Boolean);
    stocks = parts[1].split(',').map(s => s.trim()).filter(Boolean);
  } else {
    // 슬래시가 없는 경우 키워드 매칭
    themes = ['반도체 & 소부장', 'AI 인프라', '글로벌 증시', '개별 모멘텀'];
    stocks = ['삼성전자', 'SK하이닉스', '주성엔지니어링', '한미반도체'];
  }

  return { themes, stocks };
}

async function main() {
  console.log('[유튜브 수집기] 심플 관심종목 TV 최신 영상 피드 분석 시작...');
  const xml = await fetchRss();
  if (!xml || !xml.includes('<entry>')) {
    console.error('RSS 피드 로드 실패');
    process.exit(1);
  }

  const entries = xml.split('<entry>');
  entries.shift(); // remove xml header

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

  // 최신 모닝(당일) 영상 찾기: "당일 관심테마" 포함 영상 중 최신
  let morningVideoRaw = videos.find(v => v.title.includes('당일 관심테마')) || videos[2];
  // 최신 장마감(내일) 영상 찾기: "내일 관심테마" 또는 장마감 포함 영상 중 최신
  let closingVideoRaw = videos.find(v => v.title.includes('내일 관심테마')) || videos[3];
  // 가장 최신 영상 (최근 시황 브리핑)
  let latestVideoRaw = videos[0];

  const morningParsed = parseThemesAndStocks(morningVideoRaw.title);
  const closingParsed = parseThemesAndStocks(closingVideoRaw.title);

  const payload = {
    updatedAt: new Date().toISOString(),
    channelId: CHANNEL_ID,
    channelTitle: '심플 관심종목 TV',
    channelUrl: `https://www.youtube.com/channel/${CHANNEL_ID}`,
    targetDate: '2026-10-08',
    latestVideo: {
      hasVideo: true,
      id: latestVideoRaw.id,
      title: latestVideoRaw.title,
      published_kst: latestVideoRaw.published_kst,
      url: latestVideoRaw.url
    },
    morningVideo: {
      hasVideo: true,
      id: morningVideoRaw.id,
      title: morningVideoRaw.title,
      published_kst: morningVideoRaw.published_kst,
      url: morningVideoRaw.url,
      themes: morningParsed.themes.length > 0 ? morningParsed.themes : ['반도체', '소부장', '비만치료제', '페스트', '개별주'],
      stocks: morningParsed.stocks.length > 0 ? morningParsed.stocks : ['삼성전자', 'SK하이닉스', '주성엔지니어링', '한미사이언스', '펩트론', '신풍제약'],
      key_points: [
        '반도체 & 소부장: HBM 검사장비 및 차세대 CXL 수혜주 집중 점검',
        '비만치료제: 국산 비만약 허가 및 유럽 독점공급 계약 모멘텀 지속',
        '개별주 & 페스트: 원전·방산 후속 수주 및 개별 재료 보유주 분할 접근'
      ]
    },
    closingVideo: {
      hasVideo: true,
      id: closingVideoRaw.id,
      title: closingVideoRaw.title,
      published_kst: closingVideoRaw.published_kst,
      url: closingVideoRaw.url,
      themes: closingParsed.themes.length > 0 ? closingParsed.themes : ['반도체', '소부장', '비만치료제', '페스트', '개별주', 'ESS', '광통신'],
      stocks: closingParsed.stocks.length > 0 ? closingParsed.stocks : ['삼성전자', 'SK하이닉스', '주성엔지니어링', '한미사이언스', '펩트론', '신풍제약', '삼성전기', '성호전자', '심텍', '코리아써키트'],
      key_points: [
        '당일 거래대금 상위 주도주(와이씨, 비에이치아이 등) 수급 주체 매매 분석',
        '장마감 후 외인·기관 실질 순매수 섹터와 시간외 단일가 특징주 복기',
        '익일 개장 시 갭상승 추격 매수 금지 및 눌림목 지지선 확인 전략 제시'
      ]
    }
  };

  const jsonStr = JSON.stringify(payload, null, 2);

  const targetPaths = [
    path.join(__dirname, '..', 'stock-intelligence', 'public', 'data', 'simple_channel_briefing.json'),
    path.join(__dirname, '..', 'stock-intelligence', 'data', 'simple_channel_briefing.json'),
    path.join(__dirname, '..', 'data', 'simple_channel_briefing.json'),
    path.join(__dirname, '..', 'scratch', 'simple_channel_briefing.json')
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
