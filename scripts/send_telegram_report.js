const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'telegram_config.json');

function loadConfig() {
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  const envChatId = process.env.TELEGRAM_CHAT_ID;
  if (envToken && envChatId) {
    return { botToken: envToken, chatId: envChatId };
  }

  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
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

function getLatestNewsItems() {
  const paths = [
    path.join(__dirname, '..', 'public', 'data', 'live_domestic_news.json'),
    path.join(__dirname, '..', 'data', 'live_domestic_news.json')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (Array.isArray(data) && data.length > 0) {
          return data.slice(0, 3);
        }
      } catch (e) {}
    }
  }
  return [];
}

function getLatestThemeTimeline() {
  const paths = [
    path.join(__dirname, '..', 'public', 'data', 'theme_timeline.json'),
    path.join(__dirname, '..', 'data', 'theme_timeline.json')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (Array.isArray(data) && data.length > 0) {
          // 가장 상세한 분석이 들어있는 최근 테마 선정
          return data[data.length - 1];
        }
      } catch (e) {}
    }
  }
  return null;
}

function getMarketIndices() {
  const paths = [
    path.join(__dirname, '..', 'scratch', 'api_result.json'),
    path.join(__dirname, '..', '..', 'scratch', 'api_result.json')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
      } catch (e) {}
    }
  }
  return null;
}

async function run() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  // 1. 시장 지표
  const indices = getMarketIndices();
  let marketSection = '';
  if (indices) {
    const kospiRate = indices.kospi ? (indices.kospi.fluctuationsRatio >= 0 ? `+${indices.kospi.fluctuationsRatio}%` : `${indices.kospi.fluctuationsRatio}%`) : '-';
    const kosdaqRate = indices.kosdaq ? (indices.kosdaq.fluctuationsRatio >= 0 ? `+${indices.kosdaq.fluctuationsRatio}%` : `${indices.kosdaq.fluctuationsRatio}%`) : '-';
    const usd = indices.usdKrw ? `${indices.usdKrw.closePrice}원` : '-';

    marketSection = `📈 <b>[1. 시장 핵심 지표 요약]</b>\n` +
      `• 코스피: <b>${indices.kospi?.closePrice || '-'}</b> (${kospiRate})\n` +
      `• 코스닥: <b>${indices.kosdaq?.closePrice || '-'}</b> (${kosdaqRate})\n` +
      `• 원/달러 환율: <b>${usd}</b>\n\n`;
  }

  // 2. 주도 테마 심층 분석 (심플관심종목TV 제거 및 테마 분석 대폭 강화)
  const theme = getLatestThemeTimeline();
  let themeSection = '';
  if (theme) {
    const cl = theme.checklist || {};
    const themeName = escapeHtml(theme.theme_name || '주도 테마');
    const sector = escapeHtml(theme.sector || '주요 섹터');
    const material = escapeHtml(cl.material || '수급 집중 및 정책 모멘텀 발생');
    const leadStocks = escapeHtml(cl.leaders?.lead || '주요 대장주 추적 중');
    const subStocks = escapeHtml(cl.leaders?.sub || '후발주 탐색 중');
    const chartPhase = escapeHtml(cl.chart_phase || '수급 유입 및 기술적 반등 시도 국면');
    const bullish = escapeHtml(cl.conditions?.bullish || '기관/외인 순매수 유입 및 추가 수주');
    const bearish = escapeHtml(cl.conditions?.bearish || '단기 차익 실현 및 시장 변동성');

    themeSection = `🎯 <b>[2. 오늘의 핵심 주도 테마 심층 분석]</b>\n` +
      `🔥 <b>테마:</b> ${themeName} (${sector})\n` +
      `📰 <b>핵심 재료:</b> ${material}\n\n` +
      `👑 <b>대장주:</b> <code>${leadStocks}</code>\n` +
      `🏃 <b>부대장/후발주:</b> ${subStocks}\n\n` +
      `📊 <b>기술적 위치:</b> ${chartPhase}\n` +
      `🟢 <b>상승 촉매:</b> ${bullish}\n` +
      `🔴 <b>주의 리스크:</b> ${bearish}\n\n`;
  }

  // 3. 증시 실시간 속보 TOP 3
  const newsList = getLatestNewsItems();
  let newsSection = '';
  if (newsList.length > 0) {
    const newsLines = newsList.map((n, i) => {
      const press = n.ohnm ? `[${escapeHtml(n.ohnm)}] ` : '';
      const title = escapeHtml(n.tit || n.title || '속보');
      const sub = n.subcontent ? `\n   ↳ <i>${escapeHtml(n.subcontent.trim().slice(0, 60))}...</i>` : '';
      return `<b>${i + 1}.</b> ${press}${title}${sub}`;
    }).join('\n\n');

    newsSection = `📰 <b>[3. 증시 핵심 속보 & 특징주 헤드라인]</b>\n${newsLines}\n\n`;
  }

  // 4. 투자 대응 전략
  const strategySection = `💡 <b>[4. 실전 투자 대응 전략]</b>\n` +
    `• 주도 테마 대장주 위주의 <b>눌림목 분할 접근</b> 원칙 준수\n` +
    `• 급등 추격 매수 지양 및 거래대금 실린 종목 선별 대응\n` +
    `• 장 초반(09:00~09:30) 외인·기관 실시간 수급 방향 확인 필수\n\n`;

  const footer = `🌐 <a href="https://my-data-stock.pages.dev">주식센터 실시간 대시보드 바로가기</a>`;

  const fullReport = `📊 <b>[주식 인텔리전스 센터 - 심층 브리핑 리포트]</b>\n\n` +
    `📅 <b>기준일시:</b> ${dateStr} ${timeStr}\n\n` +
    marketSection +
    themeSection +
    newsSection +
    strategySection +
    footer;

  try {
    await sendTelegramMessage(fullReport);
    console.log('✅ 심층 분석 주식 보고서 발송 성공!');
  } catch (err) {
    console.error('❌ 발송 실패:', err.message);
  }
}

if (require.main === module) {
  run();
}

module.exports = { sendTelegramMessage };
