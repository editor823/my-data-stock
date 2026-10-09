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

function getLatestNewsSummary() {
  try {
    const filePath = path.join(__dirname, '..', 'public', 'data', 'live_domestic_news.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        return data.slice(0, 3).map(n => `• 📰 ${n.title}`).join('\n');
      }
    }
  } catch (e) {}
  return '';
}

function getLatestSimpleBriefing() {
  try {
    const paths = [
      path.join(__dirname, '..', 'public', 'data', 'simple_channel_briefing.json'),
      path.join(__dirname, '..', 'data', 'simple_channel_briefing.json')
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
      }
    }
  } catch (e) {}
  return null;
}

async function run() {
  const args = process.argv.slice(2);
  const type = args[0] || 'report';
  const now = new Date();
  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  const newsSummary = getLatestNewsSummary();
  const simple = getLatestSimpleBriefing();

  let simpleText = '';
  if (simple && simple.latestVideo) {
    simpleText = `\n\n📺 <b>[심플 관심종목 TV 최신 브리핑]</b>\n` +
      `• <b>영상:</b> ${simple.latestVideo.title || '최신 분석 영상'}\n` +
      `• <b>업로드:</b> ${simple.latestVideo.date || '최신'}\n` +
      `• <b>핵심 요약:</b> ${simple.latestVideo.summary || '주요 수급 및 테마 동향'}`;
  }

  let newsText = '';
  if (newsSummary) {
    newsText = `\n\n🔥 <b>[증시 실시간 속보 TOP 3]</b>\n${newsSummary}`;
  }

  const msg = `📊 <b>[주식 인텔리전스 센터 - 실시간 브리핑 리포트]</b>\n\n` +
    `📅 <b>기준일시:</b> ${dateStr} ${timeStr}\n` +
    `⚡ <b>상태:</b> 깃허브 액션(GitHub Actions) 자동 분석 완료${newsText}${simpleText}\n\n` +
    `🌐 <a href="https://stock-intelligence.pages.dev">주식센터 실시간 대시보드 바로가기</a>`;

  try {
    await sendTelegramMessage(msg);
    console.log('✅ 텔레그램 주식 브리핑 발송 성공!');
  } catch (err) {
    console.error('❌ 발송 실패:', err.message);
  }
}

if (require.main === module) {
  run();
}

module.exports = { sendTelegramMessage };
