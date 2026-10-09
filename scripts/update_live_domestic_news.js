const https = require('https');
const fs = require('fs');
const path = require('path');

async function fetchPage(p) {
  return new Promise((resolve) => {
    const url = `https://m.stock.naver.com/api/news/list?category=mainnews&page=${p}&pageSize=50`;
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        'Referer': 'https://m.stock.naver.com/'
      },
      timeout: 8000
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(d);
          resolve(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.warn(`Page ${p} fetch failed:`, err.message);
      resolve([]);
    });
  });
}

async function main() {
  console.log('[뉴스 수집기] 네이버 증권 최신 실시간 증시 뉴스 100건 수집 시작...');
  const [p1, p2] = await Promise.all([fetchPage(1), fetchPage(2)]);
  const combined = [...p1, ...p2];

  if (!combined || combined.length === 0) {
    console.error('뉴스 수집 실패: 수집된 항목이 0건입니다.');
    process.exit(1);
  }

  // 중복 제거
  const seen = new Set();
  const uniqueItems = [];
  for (const item of combined) {
    const key = item.aid || item.tit;
    if (key && !seen.has(key)) {
      seen.add(key);
      uniqueItems.push(item);
    }
  }

  console.log(`[뉴스 수집기] 총 ${uniqueItems.length}건 수집 완료 (최신 기사: ${uniqueItems[0].dt} - ${uniqueItems[0].tit})`);

  const jsContent = `// [자동 생성] 네이버 실시간 증시 뉴스 최신 100건 시드 데이터 (수집 시각: ${new Date().toISOString()})
const LIVE_NAVER_SEED_DATA = ${JSON.stringify(uniqueItems, null, 2)};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LIVE_NAVER_SEED_DATA;
}
`;

  const targetFiles = [
    path.join(__dirname, '..', 'public', 'js', 'live_domestic_news_seed.js'),
    path.join(__dirname, '..', 'js', 'live_domestic_news_seed.js')
  ];

  for (const f of targetFiles) {
    const dir = path.dirname(f);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(f, jsContent, 'utf8');
    console.log(`✓ 파일 저장 완료: ${f}`);
  }

  // 정적 JSON으로도 저장
  const jsonContent = JSON.stringify(uniqueItems, null, 2);
  const jsonTargets = [
    path.join(__dirname, '..', 'public', 'data', 'live_domestic_news.json')
  ];
  for (const f of jsonTargets) {
    const dir = path.dirname(f);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(f, jsonContent, 'utf8');
    console.log(`✓ JSON 저장 완료: ${f}`);
  }

  console.log('🎉 주식센터 뉴스 파일 최신화 성공!');
}

main();
