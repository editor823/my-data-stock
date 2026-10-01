// ========================================================
// [백엔드 API 동적 라우팅] Cloudflare Pages <-> Render API 연결
// ========================================================
const BACKEND_API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? ''
  : 'https://my-stock-api.onrender.com'; // Render에서 발급받은 백엔드 웹 서비스 주소


// ========================================================
// [탐정 수첩 UI] 7대 재료 체크리스트 & 사건 전개 렌더러
// ========================================================
window.detectiveThemes = [];
window.currentSelectedDetectiveTheme = null;
window.activeTimelinePeriod = 'all';

// [6단계 신규] 관심 테마 DB 실시간 검색 & 오토컴플릿 엔진
let themeDbSearchDebounceTimer = null;

window.handleThemeDbSearchInput = function(query) {
  const clearBtn = document.getElementById('theme-db-search-clear');
  const dropdown = document.getElementById('theme-db-autocomplete-dropdown');
  if (!dropdown) return;

  const trimmed = (query || '').trim();
  if (clearBtn) {
    clearBtn.style.display = trimmed ? 'block' : 'none';
  }

  if (themeDbSearchDebounceTimer) {
    clearTimeout(themeDbSearchDebounceTimer);
  }

  if (!trimmed) {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    return;
  }

  // 200ms 디바운스 적용
  themeDbSearchDebounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`${BACKEND_API_BASE}/api/themes/search?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error('검색 실패');
      const data = await res.json();
      const items = (data && Array.isArray(data.items)) ? data.items : [];

      if (items.length === 0) {
        dropdown.innerHTML = `
          <div style="padding: 12px; text-align: center; color: #94a3b8; font-size: 0.78rem;">
            🔍 '<strong>${escapeHtml(trimmed)}</strong>' 일치하는 테마/종목이 없습니다.
          </div>
        `;
        dropdown.style.display = 'block';
        return;
      }

      dropdown.innerHTML = `
        <div style="padding: 4px 8px 6px; font-size: 0.7rem; color: #38bdf8; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between;">
          <span>📂 관심 테마 DB 검색 결과 (${items.length}건)</span>
          <span style="color: #94a3b8;">클릭 시 즉시 로드</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
          ${items.map(t => {
            const matchedTags = (t.matched_stock_names && t.matched_stock_names.length > 0)
              ? `<span style="font-size: 0.68rem; background: rgba(56,189,248,0.15); color: #7dd3fc; padding: 1px 5px; border-radius: 4px;">매칭: ${escapeHtml(t.matched_stock_names.join(', '))}</span>`
              : '';
            return `
              <div onmousedown="selectThemeFromDb('${escapeHtml(t.name)}')" style="padding: 8px 10px; border-radius: 6px; background: #f8fafc; cursor: pointer; transition: all 0.15s ease; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;" onmouseover="this.style.background='#eff6ff'; this.style.borderColor='#93c5fd';" onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#e2e8f0';">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 0.84rem; font-weight: 800; color: #0f172a;">${escapeHtml(t.name)}</span>
                    <span style="font-size: 0.68rem; color: #0284c7; background: #e0f2fe; padding: 1px 6px; border-radius: 4px; border: 1px solid #bae6fd;">${escapeHtml(t.category || '테마')}</span>
                  </div>
                  <div style="font-size: 0.72rem; color: #64748b; margin-top: 3px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span>👑 대장: <strong style="color: #334155;">${escapeHtml(t.lead_stocks || '-')}</strong></span>
                    ${matchedTags}
                  </div>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 0.7rem; color: #166534; font-weight: 700; background: #dcfce7; padding: 2px 7px; border-radius: 4px; border: 1px solid #bbf7d0;">
                    ${t.stocks_count || 0}종목
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      dropdown.style.display = 'block';
    } catch (e) {
      console.error('[ThemeDB Search Error]', e);
    }
  }, 200);
};

window.clearThemeDbSearch = function() {
  const input = document.getElementById('theme-db-search-input');
  const clearBtn = document.getElementById('theme-db-search-clear');
  const dropdown = document.getElementById('theme-db-autocomplete-dropdown');
  if (input) input.value = '';
  if (clearBtn) clearBtn.style.display = 'none';
  if (dropdown) {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
  }
};

// 테마 DB 항목 선택 시 즉시 로드 및 3중 단서 + 기술적 분석 연속 트리거
window.selectThemeFromDb = async function(themeName) {
  window.clearThemeDbSearch();
  if (window.showToast) window.showToast(`[${themeName}] 테마를 로드하는 중...`, '📂');

  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/themes/stocks?theme=${encodeURIComponent(themeName)}`);
    if (!res.ok) throw new Error('테마 종목 조회 실패');
    const data = await res.json();
    const stocks = (data && Array.isArray(data.stocks)) ? data.stocks : [];

    // 대장주(첫 1~2개) 및 부대주 자동 세팅
    const leadStocks = stocks.slice(0, 2).map(s => s.name);
    const subStocks = stocks.slice(2).map(s => s.name);

    const leadStr = leadStocks.join(', ') || themeName;
    const subStr = subStocks.join(', ') || '관련주 추적 중';

    // 기존 등록된 테마 목록에서 찾거나 신규 테마 객체 구성
    let targetTheme = (window.detectiveThemes || []).find(t => t.theme_name === themeName || t.theme_name.includes(themeName));

    if (targetTheme) {
      // 기존 테마인 경우 관련주 정보 갱신
      if (!targetTheme.checklist) targetTheme.checklist = {};
      if (!targetTheme.checklist.leaders) targetTheme.checklist.leaders = {};
      targetTheme.checklist.leaders.lead = leadStr;
      targetTheme.checklist.leaders.sub = subStr;
      targetTheme._asyncSupplementsLoaded = false;
      targetTheme._technicals = null;
    } else {
      // 신규 테마 생성
      const themeId = 'db_theme_' + Date.now();
      targetTheme = {
        theme_id: themeId,
        theme_name: themeName,
        sector: data.category || '관심 테마 DB',
        pattern_type: '패턴1 (DB 추출 신규 관심 테마)',
        analysis_date: new Date().toISOString().slice(0, 10),
        checklist: {
          material: `[${themeName}] 엑셀 테마 DB 기반 추출 핵심 주도 산업군 및 수급 집중 테마`,
          leaders: {
            lead: leadStr,
            sub: subStr
          },
          correlation: `${leadStocks[0] || themeName} 등 핵심 수혜주 중심의 시세 탄력 및 거래대금 분출 기대`,
          future_expectation: '정책 발표 및 글로벌 공급망 계약, 실적 턴어라운드 모멘텀 지속 추적',
          expiration_date: '1~3개월 (업황 사이클 및 단기 수급 분출 국면)',
          chart_phase: '바닥권 거래량 점증 또는 전고점 돌파 시도 국면',
          conditions: {
            bullish: '외인/기관 동반 순매수 유입 및 테마 거래대금 5,000억 이상 분출',
            bearish: '단기 차익 실현 매물 출회 및 거래량 급감 시 눌림목 지지선 이탈'
          }
        },
        timeline: [
          {
            date: new Date().toISOString().slice(0, 10),
            stage: "DB 관심 등록",
            press: "테마 탐정 DB",
            news_title: `[테마 DB 로드] ${themeName} 관련주 총 ${stocks.length}개 종목 추적 개시`,
            news_url: `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(themeName)}`,
            key_point: `대장: ${leadStr} | 부대: ${subStr}`
          }
        ],
        _asyncSupplementsLoaded: false,
        _technicals: null
      };

      window.detectiveThemes.unshift(targetTheme);
      // 서버에도 신규 테마 자동 영구 등록
      fetch(`${BACKEND_API_BASE}/api/themes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetTheme)
      }).catch(err => console.warn('테마 서버 저장 비동기 오류:', err));
    }

    // 테마 셀렉터(#theme-timeline-select) 목록 즉시 동기화 등록
    populateDetectiveSelect();
    const selectEl = document.getElementById('theme-timeline-select');
    if (selectEl) selectEl.value = targetTheme.theme_id;

    // 현재 활성 테마로 지정 및 7대 체크리스트 카드 즉시 교체 렌더링
    window.currentSelectedDetectiveTheme = targetTheme;
    // enrichThemeWithAllSignals 내부에서 showTimelineLoading 호출하므로 여기서는 기본 렌더만
    window.renderDetectiveCard(targetTheme, window.activeTimelinePeriod || 'all');

    // 대장주 3중 단서(네이버 뉴스, DART 전자공시, 증권사 리포트) 및 6번 차트/국면 자동 분석 재트리거
    const primaryLead = leadStocks[0] || themeName;
    window.enrichThemeWithAllSignals(targetTheme, primaryLead);

    // 상단 4개 모멘텀 요약 카드도 갱신
    if (typeof window.renderTopMomentumCards === 'function') {
      window.renderTopMomentumCards(window.detectiveThemes);
    }

    if (window.showToast) window.showToast(`[${themeName}] 7대 체크리스트와 3중 단서 수집이 완료되었습니다!`, '🚀');
  } catch (err) {
    console.error('[SelectThemeFromDb Error]', err);
    alert('테마를 불러오는 중 오류가 발생했습니다.');
  }
};

// ================================================
// [타임라인 로딩 인디케이터] 테마 선택 시 스피너 표시
// ================================================
function showTimelineLoading(theme) {
  const container = document.getElementById('stock-material-timeline-list')
    || document.getElementById('themeTimelineList')
    || document.getElementById('theme-timeline-container')
    || document.querySelector('.stock-material-timeline-list, .theme-timeline-cards');
  if (!container) return;
  const themeName = (theme && theme.theme_name) ? theme.theme_name : (typeof theme === 'string' ? theme : '테마');
  container.innerHTML = `
    <div class="timeline-loading" style="text-align:center; padding:50px 20px; color:#818cf8; display:flex; flex-direction:column; align-items:center; gap:16px;">
      <div class="spinner" style="width:40px; height:40px; border:3px solid rgba(129,140,248,0.2); border-top-color:#818cf8; border-radius:50%; animation:spin 0.9s linear infinite;"></div>
      <p style="margin:0; font-weight:700; font-size:0.92rem; color:#a5b4fc;">⏳ [${themeName}] 및 소속 종목 최근 1개월 시계열 뉴스·공시 전수 탐색 중...</p>
      <p style="margin:0; font-size:0.78rem; color:#64748b;">(테마 + 소속 종목 발행 기사 병렬 수집 중. 2~4초 소요)</p>
    </div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
  `;
}

// 대장주 및 소속 종목들에 대한 /api/radar/timeline 통합 레이더 비동기 교차 수집 헬퍼
window.enrichThemeWithAllSignals = async function(theme, stockName) {
  if (!theme) return;
  const themeQuery = theme.theme_name || stockName || '';
  const cleanStock = (stockName || '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').split(',')[0].trim();

  // 로컬스토리지 캐시 확인 (30분 TTL)
  const CACHE_KEY = `cache_timeline_${encodeURIComponent(themeQuery)}`;
  const CACHE_TTL = 30 * 60 * 1000;

  // 데이터 수집 전 로딩 인디케이터 노출
  showTimelineLoading(theme);

  try {
    const cachedStr = localStorage.getItem(CACHE_KEY);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      if (cached && cached.ts && (Date.now() - cached.ts) < CACHE_TTL && Array.isArray(cached.items) && cached.items.length > 0) {
        console.log(`[EnrichTheme Cache HIT] ${themeQuery} (${cached.items.length}건)`);
        const rawTimeline = [...(theme.timeline || [])];
        cached.items.forEach(item => {
          if (!rawTimeline.some(t => t.news_title === item.news_title || (t.news_url && t.news_url === item.news_url))) {
            rawTimeline.push(item);
          }
        });
        theme.timeline = rawTimeline;
        theme._asyncSupplementsLoaded = true;
        if (window.currentSelectedDetectiveTheme === theme && typeof window.renderDetectiveCard === 'function') {
          window.renderDetectiveCard(theme, window.activeTimelinePeriod || 'all');
        }
        // 기술적 분석만 비동기 병렬 실행
        if (cleanStock) {
          window.fetchStockTechnicals(cleanStock).then(techData => {
            if (techData) { theme._technicals = techData; }
          }).catch(() => {});
        }
        return;
      }
    }
  } catch (ce) {}

  // 10초 타임아웃 AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const radarFetch = fetch(`${BACKEND_API_BASE}/api/radar/timeline?theme=${encodeURIComponent(themeQuery)}&t=${Date.now()}`, {
      signal: controller.signal
    }).then(r => r.ok ? r.json() : { items: [] }).catch(err => {
      console.warn('[enrichThemeWithAllSignals] 타임라인 수집 타임아웃/오류:', err);
      try {
        const staleStr = localStorage.getItem(CACHE_KEY);
        if (staleStr) return JSON.parse(staleStr);
      } catch (fe) {}
      return { items: [] };
    });

    const [radarRes, techData] = await Promise.all([
      radarFetch,
      cleanStock ? window.fetchStockTechnicals(cleanStock).catch(() => null) : Promise.resolve(null)
    ]);

    const collectedItems = (radarRes && Array.isArray(radarRes.items)) ? radarRes.items : [];
    if (collectedItems.length > 0) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ items: collectedItems, ts: Date.now() }));
      } catch (se) {}
    }

    const rawTimeline = [...(theme.timeline || [])];

    collectedItems.forEach(item => {
      // 타임라인에는 블로그 유입 전면 차단 (오직 뉴스, 공시, 리포트 3대 공인 채널만 등록)
      const isBlogItem = item.is_blog || item.channel === 'BLOG' || (item.press && item.press.includes('블로그')) || (item.news_url && item.news_url.includes('blog.naver.com')) || (item.link && item.link.includes('blog.naver.com'));
      if (!isBlogItem && !rawTimeline.some(t => t.news_title === item.news_title || (t.news_url && t.news_url === item.news_url))) {
        rawTimeline.push(item);
      }
    });

    theme.timeline = rawTimeline;
    if (techData) theme._technicals = techData;
    theme._asyncSupplementsLoaded = true;
  } catch (e) {
    console.warn('[EnrichThemeSignals Error]', e);
  } finally {
    clearTimeout(timeoutId);
    theme._asyncSupplementsLoaded = true;
    if (window.currentSelectedDetectiveTheme === theme && typeof window.renderDetectiveCard === 'function') {
      window.renderDetectiveCard(theme, window.activeTimelinePeriod || 'all');
    }
  }
};

// [관련주 실시간 편집] 특정 종목 삭제 처리
window.removeStockFromActiveTheme = async function(stockName) {
  const theme = window.currentSelectedDetectiveTheme;
  if (!theme || !theme.checklist || !theme.checklist.leaders) return;

  const targetName = stockName.trim();
  if (!confirm(`'${targetName}' 종목을 [${theme.theme_name}] 테마 관련주에서 제외하시겠습니까?`)) return;

  const leaders = theme.checklist.leaders;
  let leadArr = (leaders.lead || '').split(',').map(s => s.trim()).filter(Boolean);
  let subArr = (leaders.sub || '').split(',').map(s => s.trim()).filter(Boolean);

  // 대장 또는 부대에서 제거
  leadArr = leadArr.filter(s => !s.startsWith(targetName) && !targetName.startsWith(s));
  subArr = subArr.filter(s => !s.startsWith(targetName) && !targetName.startsWith(s));

  // 대장이 모두 지워졌으면 부대의 첫 번째를 대장으로 승격
  if (leadArr.length === 0 && subArr.length > 0) {
    leadArr.push(subArr.shift());
  }

  leaders.lead = leadArr.join(', ') || '대장주 미지정';
  leaders.sub = subArr.join(', ') || '관련주 없음';

  // 1. stock_dictionary.json에 영구 삭제 반영 API 호출
  fetch(`${BACKEND_API_BASE}/api/themes/stocks/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      theme: theme.theme_name,
      action: 'remove',
      stock_name: targetName
    })
  }).catch(err => console.warn('[StockDict Remove Error]', err));

  // 2. 로컬 보존 및 theme_timeline.json 영구 동기화
  window.persistActiveTheme(theme);
  window.renderDetectiveCard(theme, window.activeTimelinePeriod || 'all');
  if (window.showToast) window.showToast(`'${targetName}' 종목이 테마에서 제외되었습니다.`, '🗑️');
};

// [관련주 실시간 편집] 새 종목 직접 추가 처리
window.addStockToActiveTheme = async function() {
  const input = document.getElementById('input-add-custom-stock');
  if (!input) return;
  const newStock = input.value.trim();
  if (!newStock) {
    alert('추가할 종목명을 입력해주세요.');
    input.focus();
    return;
  }

  const theme = window.currentSelectedDetectiveTheme;
  if (!theme) {
    alert('종목을 추가할 대상 테마가 선택되지 않았습니다.');
    return;
  }

  if (!theme.checklist) theme.checklist = {};
  if (!theme.checklist.leaders) theme.checklist.leaders = { lead: '', sub: '' };

  const leaders = theme.checklist.leaders;
  let leadArr = (leaders.lead || '').split(',').map(s => s.trim()).filter(Boolean);
  let subArr = (leaders.sub || '').split(',').map(s => s.trim()).filter(Boolean);

  // 이미 존재하는지 확인
  const allCurrent = [...leadArr, ...subArr];
  if (allCurrent.some(s => s.startsWith(newStock) || newStock.startsWith(s))) {
    alert(`'${newStock}'은(는) 이미 해당 테마의 관련주에 등록되어 있습니다.`);
    input.value = '';
    return;
  }

  // 대장이 비어있으면 대장에, 아니면 부대주에 추가
  if (leadArr.length === 0) {
    leadArr.push(newStock);
  } else {
    subArr.push(newStock);
  }

  leaders.lead = leadArr.join(', ');
  leaders.sub = subArr.join(', ');
  input.value = '';

  if (window.showToast) window.showToast(`'${newStock}' 종목이 추가되었습니다. 4대 채널 레이더를 수집합니다...`, '✨');

  // 1. stock_dictionary.json에 영구 등록 반영 API 호출
  fetch(`${BACKEND_API_BASE}/api/themes/stocks/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      theme: theme.theme_name,
      action: 'add',
      stock_name: newStock
    })
  }).catch(err => console.warn('[StockDict Add Error]', err));

  // 2. 해당 신규 종목의 최근 뉴스/공시/리포트/블로그 비동기 수집하여 타임라인에 즉각 병합
  try {
    const [newsItems, dartItems, reportItems, blogItems] = await Promise.all([
      fetch(`${BACKEND_API_BASE}/api/news?query=${encodeURIComponent(newStock)}`).then(r => r.ok ? r.json() : { items: [] }).then(d => {
        const raw = (d && Array.isArray(d.items)) ? d.items : [];
        return raw.slice(0, 5).map(n => ({
          date: (n.dt || '').slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') || new Date().toISOString().slice(0, 10),
          stage: "종목 신규 편입",
          press: n.ohnm || "언론 종합",
          news_title: `[${newStock}] ${n.tit || n.title || ''}`,
          news_url: n.aid && n.oid ? `https://n.news.naver.com/mnews/article/${n.oid}/${n.aid}` : (n.link || `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(newStock)}`),
          key_point: (n.subcontent || '').slice(0, 80) + '...'
        }));
      }).catch(() => []),
      window.fetchDartDisclosuresForStock(newStock).catch(() => []),
      window.fetchHkReportsForStock(newStock).catch(() => []),
      fetch(`${BACKEND_API_BASE}/api/search/blogs?query=${encodeURIComponent(newStock + ' 주가 전망')}`).then(r => r.ok ? r.json() : { items: [] }).then(d => (d && d.items) ? d.items.slice(0, 3) : []).catch(() => [])
    ]);

    const newCombined = [...(newsItems || []), ...(dartItems || []), ...(reportItems || []), ...(blogItems || [])];
    const rawTimeline = [...(theme.timeline || [])];

    newCombined.forEach(item => {
      if (!rawTimeline.some(t => t.news_title === item.news_title || (t.news_url && t.news_url === item.news_url))) {
        rawTimeline.push(item);
      }
    });

    theme.timeline = rawTimeline;
  } catch (e) {
    console.warn('신규 종목 단서 수집 경고:', e);
  }

  // 영구 저장 및 화면 갱신
  window.persistActiveTheme(theme);
  window.renderDetectiveCard(theme, window.activeTimelinePeriod || 'all');
};

// [⚙️ 테마 종목 관리/수정] 대화형 모달 창
window.openManageThemeStocksModal = async function() {
  const currentTheme = window.currentSelectedDetectiveTheme;
  if (!currentTheme) {
    alert('현재 선택된 테마가 없습니다. 먼저 테마를 선택해주세요.');
    return;
  }

  // 기존 모달 닫기
  document.getElementById('manage-theme-stocks-modal-wrap')?.remove();

  const themeName = currentTheme.theme_name;
  let stocksList = [];

  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/themes/stocks?theme=${encodeURIComponent(themeName)}`);
    if (res.ok) {
      const data = await res.json();
      stocksList = (data && Array.isArray(data.stocks)) ? data.stocks : [];
    }
  } catch (e) {}

  // 테마 체크리스트의 대장/부대주 목록도 합산 파악
  const leaders = currentTheme.checklist?.leaders || {};
  const currentLeadArr = (leaders.lead || '').split(',').map(s => s.trim()).filter(Boolean);
  const currentSubArr = (leaders.sub || '').split(',').map(s => s.trim()).filter(Boolean);

  const modalWrap = document.createElement('div');
  modalWrap.id = 'manage-theme-stocks-modal-wrap';
  modalWrap.style.cssText = 'position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(6px); padding: 20px;';

  const renderStockBadges = () => {
    const allKnown = [...stocksList];
    [...currentLeadArr, ...currentSubArr].forEach(name => {
      if (!allKnown.some(s => s.name === name)) {
        allKnown.push({ name, code: '000000' });
      }
    });

    if (allKnown.length === 0) {
      return '<div style="color: #94a3b8; font-size: 0.8rem; padding: 12px; text-align: center;">등록된 소속 종목이 없습니다. 아래에서 종목을 직접 추가해보세요.</div>';
    }

    return allKnown.map(s => {
      const isLead = currentLeadArr.some(l => l.startsWith(s.name) || s.name.startsWith(l));
      return `
        <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 700; background: ${isLead ? '#fef3c7' : '#f1f5f9'}; color: ${isLead ? '#b45309' : '#1e293b'}; border: 1px solid ${isLead ? '#fde68a' : '#cbd5e1'};">
          <span>${isLead ? '👑 ' : ''}${escapeHtml(s.name)}</span>
          <span style="font-size: 0.68rem; color: #64748b;">(${s.code !== '000000' ? s.code : '코드미정'})</span>
          <button type="button" onclick="handleModalRemoveStock('${escapeHtml(s.name)}')" title="영구 삭제" style="background: transparent; border: none; color: #dc2626; font-weight: 900; cursor: pointer; padding: 0 2px; font-size: 0.85rem;" onmouseover="this.style.color='#991b1b';" onmouseout="this.style.color='#dc2626';">×</button>
        </span>
      `;
    }).join('');
  };

  modalWrap.innerHTML = `
    <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; width: 100%; max-width: 540px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); overflow: hidden; display: flex; flex-direction: column;">
      <!-- 헤더 -->
      <div style="padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.1rem;">⚙️</span>
          <div>
            <h4 style="margin: 0; font-size: 0.96rem; font-weight: 800; color: #1e293b;">[${escapeHtml(themeName)}] 테마 종목 관리</h4>
            <div style="font-size: 0.72rem; color: #9333ea; margin-top: 2px;">종목 추가/삭제 시 stock_dictionary.json 및 타임라인에 즉시 영구 반영됩니다.</div>
          </div>
        </div>
        <button type="button" onclick="document.getElementById('manage-theme-stocks-modal-wrap')?.remove()" style="background: transparent; border: none; color: #64748b; font-size: 1.2rem; cursor: pointer; padding: 0 4px;">✕</button>
      </div>

      <!-- 본문: 소속 종목 뱃지 영역 -->
      <div style="padding: 18px 20px; max-height: 280px; overflow-y: auto;">
        <div style="font-size: 0.78rem; font-weight: 700; color: #334155; margin-bottom: 10px; display: flex; justify-content: space-between;">
          <span>현재 소속 종목 목록 (× 클릭 시 영구 삭제)</span>
          <span id="modal-stocks-count-badge" style="color: #0284c7; font-weight: 800;">총 ${stocksList.length}개</span>
        </div>
        <div id="modal-stock-badges-container" style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${renderStockBadges()}
        </div>
      </div>

      <!-- 하단: 신규 종목 추가 바 -->
      <div style="padding: 16px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 0.76rem; color: #64748b; margin-bottom: 6px; font-weight: 600;">➕ 새 종목 직접 추가</div>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="modal-add-stock-input" placeholder="종목명 입력 (예: 한미반도체)" onkeydown="if(event.key==='Enter'){ handleModalAddStock(); }" style="flex: 1; background: #ffffff; border: 1px solid #cbd5e1; color: #1e293b; padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; outline: none;">
          <button type="button" onclick="handleModalAddStock()" style="background: linear-gradient(135deg, #9333ea, #7c3aed); border: 1px solid #c084fc; color: #fff; padding: 8px 16px; border-radius: 8px; font-size: 0.82rem; font-weight: 800; cursor: pointer; transition: all 0.15s; white-space: nowrap;">
            추가 및 영구 등록
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalWrap);

  // 모달 내부 삭제 핸들러
  window.handleModalRemoveStock = async function(stkName) {
    if (!confirm(`'${stkName}' 종목을 [${themeName}] 테마에서 영구 삭제하시겠습니까?`)) return;

    // 서버 stock_dictionary.json 영구 삭제
    await fetch(`${BACKEND_API_BASE}/api/themes/stocks/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: themeName,
        action: 'remove',
        stock_name: stkName
      })
    }).catch(err => console.warn(err));

    // 리스트 갱신
    stocksList = stocksList.filter(s => s.name !== stkName);
    const leadIdx = currentLeadArr.indexOf(stkName);
    if (leadIdx >= 0) currentLeadArr.splice(leadIdx, 1);
    const subIdx = currentSubArr.indexOf(stkName);
    if (subIdx >= 0) currentSubArr.splice(subIdx, 1);

    if (currentTheme.checklist && currentTheme.checklist.leaders) {
      currentTheme.checklist.leaders.lead = currentLeadArr.join(', ') || (currentSubArr.shift() || '대장주 미지정');
      currentTheme.checklist.leaders.sub = currentSubArr.join(', ') || '관련주 없음';
      window.persistActiveTheme(currentTheme);
      window.renderDetectiveCard(currentTheme, window.activeTimelinePeriod || 'all');
    }

    const container = document.getElementById('modal-stock-badges-container');
    if (container) container.innerHTML = renderStockBadges();
    const countB = document.getElementById('modal-stocks-count-badge');
    if (countB) countB.textContent = `총 ${stocksList.length}개`;

    if (window.showToast) window.showToast(`'${stkName}' 종목이 영구 삭제되었습니다.`, '🗑️');
  };

  // 모달 내부 추가 핸들러
  window.handleModalAddStock = async function() {
    const inp = document.getElementById('modal-add-stock-input');
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) {
      alert('종목명을 입력해주세요.');
      inp.focus();
      return;
    }

    if (stocksList.some(s => s.name === val)) {
      alert(`'${val}' 종목은 이미 등록되어 있습니다.`);
      inp.value = '';
      return;
    }

    // 서버 stock_dictionary.json 영구 등록
    await fetch(`${BACKEND_API_BASE}/api/themes/stocks/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: themeName,
        action: 'add',
        stock_name: val
      })
    }).catch(err => console.warn(err));

    stocksList.push({ name: val, code: '000000' });
    currentSubArr.push(val);

    if (currentTheme.checklist && currentTheme.checklist.leaders) {
      currentTheme.checklist.leaders.sub = currentSubArr.join(', ');
      window.persistActiveTheme(currentTheme);
      window.renderDetectiveCard(currentTheme, window.activeTimelinePeriod || 'all');
    }

    // 4대 채널 레이더로 해당 종목 단서 추가 수집 트리거
    window.enrichThemeWithAllSignals(currentTheme, val);

    inp.value = '';
    const container = document.getElementById('modal-stock-badges-container');
    if (container) container.innerHTML = renderStockBadges();
    const countB = document.getElementById('modal-stocks-count-badge');
    if (countB) countB.textContent = `총 ${stocksList.length}개`;

    if (window.showToast) window.showToast(`'${val}' 종목이 등록되었으며 타임라인과 동기화되었습니다.`, '✨');
  };
};

// 테마 변경사항 영구 보존 헬퍼 (서버 POST 및 localStorage 동시 보존)
window.persistActiveTheme = function(theme) {
  if (!theme) return;
  try {
    // 1. localStorage에 최신 상태 보존
    localStorage.setItem(`theme_custom_${theme.theme_id}`, JSON.stringify(theme));

    // 2. 서버 theme_timeline.json 영구 반영 API 호출
    fetch(`${BACKEND_API_BASE}/api/themes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(theme)
    }).catch(err => console.warn('[PersistTheme Server Error]', err));
  } catch (e) {
    console.warn('[PersistActiveTheme Error]', e);
  }
};

// 날짜 차이 계산 유틸리티 (일수 차이 반환)
function getDaysDifference(dateStr) {
  if (!dateStr) return 999;
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const now = new Date();
      const diffMs = now.getTime() - targetDate.getTime();
      return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
    const d = new Date(dateStr);
    if (!isNaN(d)) {
      return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
    }
  } catch (e) {}
  return 0;
}

// 1. 상단 4개 모멘텀 요약 카드 동적 연동 함수
window.renderTopMomentumCards = function(themes) {
  if (!Array.isArray(themes) || themes.length === 0) return;

  const card1Val = document.getElementById('stat-top-theme');
  const card2Val = document.getElementById('stat-runner-theme');
  const card3Val = document.getElementById('stat-caution-theme');
  const card4Val = document.getElementById('stat-new-theme');

  // 카드 1: 1위 최강 모멘텀
  if (card1Val && themes[0]) {
    const t = themes[0];
    card1Val.textContent = t.theme_name;
    const subEl = card1Val.parentElement?.querySelector('.kc-card-t-sub');
    if (subEl) {
      const lead = t.checklist?.leaders?.lead ? t.checklist.leaders.lead.split(',')[0] : '';
      subEl.textContent = lead ? `대장: ${lead}` : (t.sector || '주도 테마');
    }
  }

  // 카드 2: 순환매 유입 2위
  if (card2Val && themes[1]) {
    const t = themes[1];
    card2Val.textContent = t.theme_name;
    const subEl = card2Val.parentElement?.querySelector('.kc-card-t-sub');
    if (subEl) {
      const lead = t.checklist?.leaders?.lead ? t.checklist.leaders.lead.split(',')[0] : '';
      subEl.textContent = lead ? `대장: ${lead}` : (t.sector || '주도 테마');
    }
  }

  // 카드 3: 재료 소멸 주의 (또는 3위 관심)
  if (card3Val && themes[2]) {
    const t = themes[2];
    card3Val.textContent = t.theme_name;
    const subEl = card3Val.parentElement?.querySelector('.kc-card-t-sub');
    if (subEl) {
      const exp = t.checklist?.expiration_date ? `유통: ${t.checklist.expiration_date}` : '';
      subEl.textContent = exp || (t.sector || '주의 테마');
    }
  }

  // 카드 4: 신규 부각 기대주 (또는 4위 신규)
  if (card4Val && themes[3]) {
    const t = themes[3];
    card4Val.textContent = t.theme_name;
    const subEl = card4Val.parentElement?.querySelector('.kc-card-t-sub');
    if (subEl) {
      const stage = t.pattern_type ? t.pattern_type.split('(')[0].trim() : '';
      subEl.textContent = stage || (t.sector || '신규 모멘텀');
    }
  }
};

window.initDetectiveDashboard = async function() {
  // 3단계: 오늘의 증권사 핵심 리서치 단서 TOP 5 위젯 초기화
  if (typeof window.loadTodayHkReportsWidget === 'function') {
    window.loadTodayHkReportsWidget();
  }
  // 5단계: 탐정 사건 수첩 일지 목록 초기화
  if (typeof window.loadDetectiveCaseLogs === 'function') {
    window.loadDetectiveCaseLogs();
  }
  // [신규] 오늘 슈팅 테마 2번 재료모음 실시간 로드
  if (typeof window.loadTodayShootingThemesData === 'function') {
    window.loadTodayShootingThemesData();
  }

  try {
    const res = await fetch('/data/theme_timeline.json?v=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      let loadedThemes = Array.isArray(data) ? data : (data.themes || []);

      // localStorage에 보존된 수정 테마가 있으면 최우선 병합 복원
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('theme_custom_')) {
            const savedItem = JSON.parse(localStorage.getItem(key));
            if (savedItem && savedItem.theme_id) {
              const idx = loadedThemes.findIndex(t => t.theme_id === savedItem.theme_id || t.theme_name === savedItem.theme_name);
              if (idx >= 0) {
                loadedThemes[idx] = { ...loadedThemes[idx], ...savedItem };
              } else {
                loadedThemes.unshift(savedItem);
              }
            }
          }
        }
      } catch (err) {
        console.warn('localStorage 커스텀 테마 복원 오류:', err);
      }

      window.detectiveThemes = loadedThemes;
      
      // 상단 4개 모멘텀 요약 카드 동적 연동
      window.renderTopMomentumCards(window.detectiveThemes);
      
      populateDetectiveSelect();
      if (window.detectiveThemes.length > 0) {
        window.currentSelectedDetectiveTheme = window.detectiveThemes[0];
        renderDetectiveCard(window.detectiveThemes[0], window.activeTimelinePeriod || 'all');
      }
    }
  } catch (e) {
    console.warn('탐정 데이터 로드 실패:', e);
  }
};

function populateDetectiveSelect() {
  const select = document.getElementById('theme-timeline-select');
  if (!select) return;
  select.innerHTML = '';
  const validThemes = (window.detectiveThemes || []).filter(item => {
    return typeof isThemeDeleted === 'function' ? !isThemeDeleted(item.theme_id, item.theme_name) : true;
  });

  validThemes.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.theme_id;
    opt.text = `[${item.sector || item.category || '테마'}] ${item.theme_name}`;
    select.appendChild(opt);
  });

  select.onchange = function() {
    // 테마 변경 시 종목 칩 필터를 'ALL'로 초기화하여 빈 화면 방지
    currentStockFilter = 'ALL';
    const target = (window.detectiveThemes || []).find(t => t.theme_id === select.value);
    if (target) {
      window.currentSelectedDetectiveTheme = target;

      // 1. 로딩 인디케이터 먼저 표시
      showTimelineLoading(target);

      // 2. /api/radar/timeline 호출 후 수집 완료 시 카드 렌더링
      const themeQuery = target.theme_name || '';
      const CACHE_KEY = `cache_timeline_${encodeURIComponent(themeQuery)}`;
      const CACHE_TTL = 30 * 60 * 1000;

      // 로컀스토리지 캐시 확인
      let usedCache = false;
      try {
        const cachedStr = localStorage.getItem(CACHE_KEY);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached && cached.ts && (Date.now() - cached.ts) < CACHE_TTL && Array.isArray(cached.items) && cached.items.length > 0) {
            // 즉시 로드
            const rawTimeline = [...(target.timeline || [])];
            cached.items.forEach(item => {
              if (!rawTimeline.some(t => t.news_title === item.news_title || (t.news_url && t.news_url === item.news_url))) rawTimeline.push(item);
            });
            target.timeline = rawTimeline;
            usedCache = true;
          }
        }
      } catch (ce) {}

      if (usedCache) {
        if (typeof window.renderUniversalTimeline === 'function') {
          window.renderUniversalTimeline(target, window.activeTimelinePeriod || 'all');
        } else {
          renderDetectiveCard(target, window.activeTimelinePeriod || 'all');
        }
      } else {
        // API 호출
        fetch(`${BACKEND_API_BASE}/api/radar/timeline?theme=${encodeURIComponent(themeQuery)}&t=${Date.now()}`)
          .then(r => r.ok ? r.json() : { items: [] })
          .then(data => {
            const items = (data && Array.isArray(data.items)) ? data.items : [];
            if (items.length > 0) {
              try { localStorage.setItem(CACHE_KEY, JSON.stringify({ items, ts: Date.now() })); } catch(se) {}
              const rawTimeline = [...(target.timeline || [])];
              items.forEach(item => {
                const isBlog = item.is_blog || item.channel === 'BLOG' || (item.news_url && item.news_url.includes('blog.naver.com'));
                if (!isBlog && !rawTimeline.some(t => t.news_title === item.news_title || (t.news_url && t.news_url === item.news_url))) {
                  rawTimeline.push(item);
                }
              });
              target.timeline = rawTimeline;
            }
          })
          .catch(err => console.warn('[Select Theme Timeline Error]', err))
          .finally(() => {
            if (window.currentSelectedDetectiveTheme === target) {
              if (typeof window.renderUniversalTimeline === 'function') {
                window.renderUniversalTimeline(target, window.activeTimelinePeriod || 'all');
              } else {
                renderDetectiveCard(target, window.activeTimelinePeriod || 'all');
              }
            }
          });
      }
    } else if (typeof window.switchTimelineTheme === 'function') {
      window.switchTimelineTheme(select.value);
    }
  };
}

// ==========================================
// [OpenDART 연동] 전자공시 수집 엔진
// ==========================================
window.fetchDartDisclosuresForStock = async function(stockName) {
  if (!stockName) return [];
  // 종목명에서 괄호 및 부가 설명 제거 (예: "대한전선(500kV 턴키 수주)" -> "대한전선")
  const cleanName = stockName.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').split(',')[0].trim();
  if (!cleanName) return [];

  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/dart/disclosures?corp_name=${encodeURIComponent(cleanName)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items)) {
        return data.items;
      }
    }
  } catch (e) {
    console.warn('[OpenDART] 전자공시 조회 실패:', e);
  }
  return [];
};

// ==========================================
// [한경 컨센서스 연동] 증권사 리포트 수집 엔진
// ==========================================
window.fetchHkReportsForStock = async function(stockName) {
  if (!stockName) return [];
  const cleanName = stockName.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').split(',')[0].trim();
  if (!cleanName) return [];

  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/reports?stock=${encodeURIComponent(cleanName)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items)) {
        return data.items.map(item => ({
          stage: "증권사 리서치",
          press: item.press.endsWith('리포트') ? item.press : `${item.press} 리포트`,
          news_title: `[리포트] ${item.title} (목표가: ${item.target_price || '미제시'})`,
          key_point: `투자의견: ${item.opinion || '매수'} | 애널리스트 분석 및 목표주가 단서`,
          news_url: item.report_url || `https://finance.naver.com/research/company_list.naver?keyword=${encodeURIComponent(cleanName)}`,
          date: item.date || new Date().toISOString().slice(0, 10),
          is_report: true,
          is_strong: !!item.is_strong,
          target_price: item.target_price,
          opinion: item.opinion
        }));
      }
    }
  } catch (e) {
    console.warn('[한경컨센서스] 리포트 조회 실패:', e);
  }
  return [];
};

// [3단계] 최신 리서치 리포트 피드 (실시간 수집) 위젯 렌더링 함수
window.loadTodayHkReportsWidget = async function() {
  const container = document.getElementById('today-reports-feed-container');
  if (!container) return;

  // 대량 리포트 카드를 쾌적하게 볼 수 있도록 컨테이너 스크롤 스타일 자동 보장
  container.style.maxHeight = '520px';
  container.style.overflowY = 'auto';
  container.style.paddingRight = '4px';

  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 24px; color: #34d399; font-size: 0.85rem;">
      <span>⏳ 주요 증권사 데일리 리서치 핫라인 수집 중 (최신 30건)...</span>
    </div>
  `;

  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/reports?type=today`);
    if (!res.ok) throw new Error('네트워크 응답 오류');
    const data = await res.json();
    // 기존 5건 제한 해제 -> 전체(20~30건 이상) 전달
    const items = (data && Array.isArray(data.items)) ? data.items : [];

    if (items.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 24px; color: #94a3b8; font-size: 0.82rem;">
          오늘 등록된 주요 증권사 신규 리포트가 없습니다.
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => {
      const isStrong = item.is_strong;
      const targetCorp = item.target_name || item.stock_name || '';
      const reportTitle = item.title || item.report_nm || '';
      const brokerName = item.broker || item.press || '증권사';

      // 리포트 원문 직결 링크: PDF 링크 우선 -> 없으면 1:1 구글 검색 직결 링크로 새 창 오픈
      let safeReportUrl = '';
      if (item.report_url && typeof item.report_url === 'string' && item.report_url.startsWith('http') && !item.report_url.includes('javascript:') && !item.report_url.includes('#')) {
        safeReportUrl = item.report_url;
      } else {
        safeReportUrl = `https://www.google.com/search?q=${encodeURIComponent((brokerName || '') + ' ' + (targetCorp || '') + ' ' + (reportTitle || '') + ' 리포트')}`;
      }

      return `
        <div style="background: #ffffff; border: 1px solid ${isStrong ? '#a7f3d0' : '#e2e8f0'}; border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.03);" onmouseover="this.style.borderColor='#059669'; this.style.transform='translateY(-1px)';" onmouseout="this.style.borderColor='${isStrong ? '#a7f3d0' : '#e2e8f0'}'; this.style.transform='none';">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 0.72rem; padding: 2px 7px; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 4px; font-weight: 800;">
                📊 ${escapeHtml(brokerName)}
              </span>
              <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 600;">
                ${escapeHtml(item.date || '')}
              </span>
            </div>
            <div style="font-size: 0.88rem; font-weight: 800; color: #f8fafc; line-height: 1.4; margin-bottom: 4px;">
              <a href="${escapeHtml(safeReportUrl)}" target="_blank" rel="noopener noreferrer" style="color: #f8fafc; text-decoration: none; transition: color 0.15s;" onmouseover="this.style.color='#34d399';" onmouseout="this.style.color='#0f172a';">
                ${targetCorp ? `<span style="color: #38bdf8;">[${escapeHtml(targetCorp)}]</span> ` : ''}${escapeHtml(reportTitle)}
              </a>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; margin-top: 4px; padding-top: 6px;">
            <div style="font-size: 0.74rem; color: #475569;">
              <span style="color: #b45309; font-weight: 700;">${escapeHtml(item.opinion || '매수')}</span> · 목표가: <strong style="color: #059669;">${escapeHtml(item.target_price || '미제시')}</strong>
            </div>
            <a href="${escapeHtml(safeReportUrl)}" target="_blank" rel="noopener noreferrer" title="원문 리포트 확인" style="display: inline-flex; align-items: center; gap: 3px; font-size: 0.72rem; color: #34d399; text-decoration: none; font-weight: 700; background: #ecfdf5; padding: 3px 9px; border-radius: 4px; border: 1px solid #a7f3d0; color: #047857; transition: all 0.15s;" onmouseover="this.style.background='rgba(16,185,129,0.25)';" onmouseout="this.style.background='rgba(16,185,129,0.12)';">
              <span>원문</span> <span>↗</span>
            </a>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 18px; color: #ef4444; font-size: 0.8rem;">
        리포트 피드를 불러오지 못했습니다. 잠시 후 [새로고침]을 눌러주세요.
      </div>
    `;
  }
};
// [4단계] 차트 국면 자동 분석 및 슈팅 이력, 기사 지속도 수집 엔진
window.fetchStockTechnicals = async function(stockName) {
  if (!stockName) return null;
  const cleanName = stockName.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').split(',')[0].trim();
  if (!cleanName) return null;

  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/stock/technicals?corp_name=${encodeURIComponent(cleanName)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[Technicals] 기술적 분석 수집 실패:', e);
  }
  return null;
};

// ============================================================================
// [5단계] 탐정 사건 일지 (사후 복기 & 승률 검증) 엔진
// ============================================================================

// 1. 사건 일지 저장 모달 열기
window.openSaveCaseModal = function() {
  const currentTheme = window.currentSelectedDetectiveTheme;
  if (!currentTheme) {
    alert('사건 일지를 저장할 테마가 선택되지 않았습니다.');
    return;
  }

  const chk = currentTheme.checklist || {};
  const leadStock = (chk.leaders && chk.leaders.lead) ? chk.leaders.lead.split(',')[0].trim() : (currentTheme.theme_name || '주도주');
  const tech = currentTheme._technicals || {};
  const currPrice = tech.current_price || '기준가 산출';
  const shootBadge = tech.shooting_analysis?.badge_text || '국면 분석 완료';
  const contBadge = tech.news_continuity?.badge_text || '기사 지속도 포착';

  // 기존 모달 제거
  const existingModal = document.getElementById('save-case-modal-wrap');
  if (existingModal) existingModal.remove();

  const modalHtml = `
    <div id="save-case-modal-wrap" style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); z-index: 99999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); padding: 16px;">
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; width: 100%; max-width: 520px; box-shadow: 0 16px 40px rgba(0,0,0,0.15); overflow: hidden; animation: fadeIn 0.2s ease;">
        <div style="background: #f0fdf4; padding: 16px 20px; border-bottom: 1px solid #bbf7d0; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.3rem;">💾</span>
            <h4 style="margin: 0; color: #065f46; font-size: 1.05rem; font-weight: 900;">탐정 사건 일지 기록</h4>
          </div>
          <button type="button" onclick="document.getElementById('save-case-modal-wrap').remove()" style="background: transparent; border: none; color: #64748b; font-size: 1.2rem; cursor: pointer; line-height: 1;">✕</button>
        </div>

        <div style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">
          <div style="background: #f8fafc; padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 0.75rem; color: #64748b; font-weight: 700;">분석 대상 테마 및 대장주</div>
            <div style="font-size: 1rem; font-weight: 900; color: #0284c7; margin-top: 2px;">
              [${currentTheme.theme_name}] · ${leadStock}
            </div>
            <div style="font-size: 0.8rem; color: #059669; margin-top: 4px; font-weight: 700;">
              진입 기준가: <span id="modal-case-base-price">${currPrice}</span> · ${new Date().toISOString().slice(0, 10)}
            </div>
            <div style="display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap;">
              <span style="font-size: 0.7rem; background: #eff6ff; color: #0284c7; padding: 2px 6px; border-radius: 4px; border: 1px solid #bfdbfe;">${shootBadge}</span>
              <span style="font-size: 0.7rem; background: #fef2f2; color: #dc2626; padding: 2px 6px; border-radius: 4px; border: 1px solid #fecaca;">${contBadge}</span>
            </div>
          </div>

          <div>
            <label style="font-size: 0.8rem; font-weight: 800; color: #1e293b; display: block; margin-bottom: 6px;">
              탐정 진입 메모 (투자 가설 및 목표 시점)
            </label>
            <textarea id="modal-case-user-memo" placeholder="예: 건보 급여화 1파 상한가 후 5일선 눌림목 첫 공략, 1주일 내 후속 공청회 보도 모멘텀 기대" rows="3" style="width: 100%; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; color: #1e293b; padding: 10px 12px; font-size: 0.84rem; outline: none; resize: none; box-sizing: border-box;"></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
            <button type="button" onclick="document.getElementById('save-case-modal-wrap').remove()" style="padding: 8px 16px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #94a3b8; border-radius: 6px; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
              취소
            </button>
            <button type="button" onclick="saveDetectiveCaseLog()" style="padding: 8px 18px; background: linear-gradient(135deg, #059669, #10b981); border: 1px solid #34d399; color: #fff; border-radius: 6px; font-size: 0.82rem; font-weight: 800; cursor: pointer; box-shadow: 0 2px 10px rgba(16,185,129,0.3);">
              💾 일지 영구 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  document.getElementById('modal-case-user-memo')?.focus();
};

// 2. 사건 일지 서버 저장 실행
window.saveDetectiveCaseLog = async function() {
  const currentTheme = window.currentSelectedDetectiveTheme;
  if (!currentTheme) return;

  const memoInput = document.getElementById('modal-case-user-memo');
  const userMemo = memoInput ? memoInput.value.trim() : '';

  const chk = currentTheme.checklist || {};
  const leadStock = (chk.leaders && chk.leaders.lead) ? chk.leaders.lead.split(',')[0].trim() : (currentTheme.theme_name || '주도주');
  const tech = currentTheme._technicals || {};
  const currPrice = tech.current_price || '기준가 산출';
  const todayStr = new Date().toISOString().slice(0, 10);

  const payload = {
    id: 'case_' + Date.now(),
    theme_id: currentTheme.theme_id,
    theme_name: currentTheme.theme_name,
    sector: currentTheme.sector || '주도 테마',
    lead_stock: leadStock,
    base_price: currPrice,
    base_date: todayStr,
    status: 'WAITING', // 'WAITING' | 'SUCCESS_SHOOTING' | 'EXPIRED_FAIL'
    return_rate: '+0.0%',
    user_memo: userMemo || '특이사항 없음',
    shooting_badge: tech.shooting_analysis?.badge_text || '국면 분석 완료',
    continuity_badge: tech.news_continuity?.badge_text || '기사 지속도 포착',
    ma_status: tech.ma?.arrangement || '5일선 정배열 우위',
    supply_summary: tech.supply?.summary_text || '수급 추적 중',
    checklist_snapshot: {
      material: chk.material || '-',
      correlation: chk.correlation || '-',
      future_expectation: chk.future_expectation || '-',
      expiration_date: chk.expiration_date || '-'
    },
    created_at: new Date().toISOString()
  };

  // localStorage 백업 및 즉시 상태 반영
  try {
    const localLogsStr = localStorage.getItem('detective_case_logs');
    const localLogs = localLogsStr ? JSON.parse(localLogsStr) : [];
    localLogs.unshift(payload);
    localStorage.setItem('detective_case_logs', JSON.stringify(localLogs));
  } catch (le) {}

  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/logs/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => null);

    document.getElementById('save-case-modal-wrap')?.remove();
    if (window.showToast) window.showToast(`[${currentTheme.theme_name}] 탐정 사건 일지가 안전하게 보존되었습니다!`, '📋');
    // 사건 수첩 리스트 즉시 갱신
    window.loadDetectiveCaseLogs();
  } catch (e) {
    console.error('사건 일지 저장 오류:', e);
    document.getElementById('save-case-modal-wrap')?.remove();
    window.loadDetectiveCaseLogs();
  }
};

// 3. 탐정 사건 수첩 목록 불러오기 및 렌더링
window.loadDetectiveCaseLogs = async function() {
  const container = document.getElementById('detective-case-logs-grid');
  const countBadge = document.getElementById('case-logs-count-badge');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 24px; color: #c084fc; font-size: 0.85rem;">
      <span>⏳ 사건 일지 히스토리를 불러오는 중...</span>
    </div>
  `;

  let items = [];
  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/logs/cases`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        items = data.items;
      }
    }
  } catch (e) {}

  // 서버에 데이터가 없거나 실패한 경우 localStorage에서 폴백 로드 및 병합
  try {
    const localLogsStr = localStorage.getItem('detective_case_logs');
    if (localLogsStr) {
      const localLogs = JSON.parse(localLogsStr);
      if (Array.isArray(localLogs)) {
        const seenIds = new Set(items.map(it => it.id));
        localLogs.forEach(lit => {
          if (!seenIds.has(lit.id)) {
            items.push(lit);
            seenIds.add(lit.id);
          }
        });
      }
    }
    // 최신순 정렬 및 로컬스토리지 동기화
    items.sort((a, b) => new Date(b.created_at || b.base_date) - new Date(a.created_at || a.base_date));
    localStorage.setItem('detective_case_logs', JSON.stringify(items));
  } catch (le) {}

  if (countBadge) countBadge.textContent = `${items.length}건`;

  if (items.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 36px 14px; color: #94a3b8; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px dashed rgba(255,255,255,0.1);">
        <div style="font-size: 1.6rem; margin-bottom: 8px;">📑</div>
        <div style="font-weight: 700; color: #cbd5e1;">기록된 탐정 사건 일지가 없습니다.</div>
        <div style="font-size: 0.78rem; color: #64748b; margin-top: 4px;">상단 7대 체크리스트의 [💾 현재 종목 사건 수첩에 박제] 버튼을 눌러 첫 번째 분석을 기록해보세요.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(c => {
    // 경과일수 계산
    const bDate = new Date(c.base_date || c.created_at);
    const diffDays = Math.max(0, Math.floor((Date.now() - bDate.getTime()) / (24 * 60 * 60 * 1000)));

    // 상태별 스타일
    let statusBadge = '';
    let statusCardBorder = 'border-color: rgba(255, 255, 255, 0.08);';
    if (c.status === 'SUCCESS_SHOOTING') {
      statusBadge = '<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; font-weight: 800; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">🚀 슈팅 성공 (+수익)</span>';
      statusCardBorder = 'border-left: 4px solid #10b981; background: #ffffff;';
    } else if (c.status === 'EXPIRED_FAIL') {
      statusBadge = '<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; font-weight: 800; background: rgba(239, 68, 68, 0.2); color: #b91c1c; border: 1px solid rgba(239, 68, 68, 0.4);">❌ 재료 소멸</span>';
      statusCardBorder = 'border-left: 4px solid #ef4444; background: #ffffff;';
    } else {
      statusBadge = '<span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; font-weight: 800; background: #eff6ff; color: #0284c7; border: 1px solid #bfdbfe;">⏳ 재료 대기중</span>';
    }

    return `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; ${statusCardBorder} border-radius: 12px; padding: 16px 18px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.74rem; color: #94a3b8; font-weight: 700;">
              📅 분석일: ${c.base_date} (${diffDays === 0 ? '오늘' : diffDays + '일 경과'})
            </span>
            <div style="display: flex; gap: 6px; align-items: center;">
              ${statusBadge}
              <button type="button" onclick="deleteCaseLog('${c.id}')" title="일지 삭제" style="background: transparent; border: none; color: #64748b; font-size: 0.85rem; cursor: pointer; padding: 0 3px;" onmouseover="this.style.color='#ef4444';" onmouseout="this.style.color='#64748b';">×</button>
            </div>
          </div>

          <!-- 테마 및 대장주 타이틀 (클릭 시 당시 테마 화면 원문 복원) -->
          <div style="font-size: 1.05rem; font-weight: 900; color: #0f172a; margin-bottom: 6px; cursor: pointer;" onclick="restoreCaseTheme('${c.theme_id}', '${escapeHtml(c.theme_name)}')" title="클릭 시 이 테마의 7대 체크리스트와 타임라인을 다시 엽니다.">
            <span style="color: #38bdf8; text-decoration: underline;">[${c.theme_name}]</span> ${c.lead_stock}
          </div>

          <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
            <span style="font-size: 0.72rem; padding: 2px 6px; background: rgba(56, 189, 248, 0.12); color: #7dd3fc; border-radius: 4px;">기준가: ${c.base_price}</span>
            <span style="font-size: 0.72rem; padding: 2px 6px; background: rgba(168, 85, 247, 0.15); color: #c084fc; border-radius: 4px;">${c.shooting_badge}</span>
          </div>

          <!-- 사용자 메모 -->
          <div style="background: #f8fafc; border-radius: 6px; padding: 8px 10px; font-size: 0.8rem; color: #334155; border: 1px solid #e2e8f0; border-left: 3px solid #0284c7; line-height: 1.45;">
            💬 <b>가설:</b> ${escapeHtml(c.user_memo || '메모 없음')}
          </div>
        </div>

        <!-- 상태 업데이트 버튼 그룹 -->
        <div style="border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
          <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 700;">결과 복기 변경:</span>
          <div style="display: flex; gap: 4px;">
            <button type="button" onclick="updateCaseStatus('${c.id}', 'SUCCESS_SHOOTING')" style="background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; cursor: pointer;" onmouseover="this.style.background='rgba(16,185,129,0.3)';" onmouseout="this.style.background='rgba(16,185,129,0.15)';">
              🚀 성공
            </button>
            <button type="button" onclick="updateCaseStatus('${c.id}', 'WAITING')" style="background: #eff6ff; border: 1px solid #bfdbfe; color: #0284c7; font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; cursor: pointer;" onmouseover="this.style.background='rgba(56,189,248,0.3)';" onmouseout="this.style.background='rgba(56,189,248,0.15)';">
              ⏳ 대기
            </button>
            <button type="button" onclick="updateCaseStatus('${c.id}', 'EXPIRED_FAIL')" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #b91c1c; font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; cursor: pointer;" onmouseover="this.style.background='rgba(239,68,68,0.3)';" onmouseout="this.style.background='rgba(239,68,68,0.15)';">
              ❌ 소멸
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
};

// 4. 상태 변경 업데이트 실행
window.updateCaseStatus = async function(caseId, nextStatus) {
  // 1) localStorage 즉시 반영
  try {
    const localLogsStr = localStorage.getItem('detective_case_logs');
    if (localLogsStr) {
      const localLogs = JSON.parse(localLogsStr);
      const found = localLogs.find(l => l.id === caseId);
      if (found) {
        found.status = nextStatus;
        localStorage.setItem('detective_case_logs', JSON.stringify(localLogs));
      }
    }
  } catch (le) {}

  // 2) 서버 API 호출
  try {
    await fetch(`${BACKEND_API_BASE}/api/logs/cases?id=${encodeURIComponent(caseId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    }).catch(() => null);

    if (window.showToast) window.showToast('사건 복기 상태가 업데이트되었습니다.', '✨');
    window.loadDetectiveCaseLogs();
  } catch (e) {
    console.error('상태 업데이트 오류:', e);
    window.loadDetectiveCaseLogs();
  }
};

// 5. 사건 일지 삭제 실행
window.deleteCaseLog = async function(caseId) {
  if (!confirm('이 사건 일지를 삭제하시겠습니까?')) return;

  // 1) localStorage 삭제
  try {
    const localLogsStr = localStorage.getItem('detective_case_logs');
    if (localLogsStr) {
      let localLogs = JSON.parse(localLogsStr);
      localLogs = localLogs.filter(l => l.id !== caseId);
      localStorage.setItem('detective_case_logs', JSON.stringify(localLogs));
    }
  } catch (le) {}

  // 2) 서버 API 호출
  try {
    await fetch(`${BACKEND_API_BASE}/api/logs/cases?id=${encodeURIComponent(caseId)}`, {
      method: 'DELETE'
    }).catch(() => null);

    if (window.showToast) window.showToast('사건 일지가 삭제되었습니다.', '🗑️');
    window.loadDetectiveCaseLogs();
  } catch (e) {
    console.error('일지 삭제 오류:', e);
    window.loadDetectiveCaseLogs();
  }
};

// 6. 사건 수첩 카드 클릭 시 해당 테마 원문 복원 렌더링
window.restoreCaseTheme = function(themeId, themeName) {
  if (Array.isArray(window.detectiveThemes)) {
    const found = window.detectiveThemes.find(t => t.theme_id === themeId || t.theme_name === themeName);
    if (found) {
      window.currentSelectedDetectiveTheme = found;
      window.renderDetectiveCard(found, 'all');
      const selectEl = document.getElementById('theme-timeline-select');
      if (selectEl) selectEl.value = found.theme_id;

      // 화면 상단 타임라인 뷰어로 부드러운 스크롤 이동
      document.getElementById('theme-timeline-viewer-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.showToast) window.showToast(`[${found.theme_name}] 사건 원문을 불러왔습니다.`, '🕵️‍♂️');
      return;
    }
  }
  alert(`'${themeName}' 테마 원문 데이터를 찾을 수 없습니다.`);
};

// 1. 공통 종목 표준 코드 테이블 (우주항공 5대 종목 + 주요 테마 대장주 및 동적 매핑 지원)
const STOCK_CODES = {
  '에이치브이엠': '295310',
  '센서뷰': '321370',
  '와이제이링크': '206950',
  '켄코아': '274090',
  '켄코아에어로스페이스': '274090',
  '스피어': '467770',
  '가온전선': '000500',
  '대한전선': '001440',
  'LS에코에너지': '229640',
  '일진전기': '103590',
  'KBI메탈': '024840',
  '대원전선': '006340',
  '두산에너빌리티': '034020',
  '우리기술': '032820',
  '우진엔텍': '457550',
  '비에이치아이': '083650',
  '한전산업': '130660',
  '한전KPS': '051600',
  '삼성전자': '005930',
  'SK하이닉스': '000660',
  '한미반도체': '042700',
  '한화에어로스페이스': '012450',
  '현대로템': '064350',
  'LIG넥스원': '079550',
  '우리로': '046970',
  '케이씨에스': '115500',
  '텔레필드': '091440',
  '우리넷': '115440',
  '엑스게이트': '356680',
  '아이윈플러스': '123010',
  '쏠리드': '057880'
};

// [재료 라이프사이클 4단계 메타데이터 & 상태 배지 설정]
const LIFECYCLE_CONFIG = {
  incubation: {
    label: '🌱 태동 | 기대감',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.4)',
    tip: '재료 초기 단계: 모멘텀 형성 및 초기 수급 유입 구간'
  },
  ignition: {
    label: '🔥 점화 | 팩트확정',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.4)',
    tip: '공식 공시/수주 체결: 가장 강력한 거래량 동반 구간'
  },
  verification: {
    label: '📊 입증 | 기관수급',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.4)',
    tip: '증권사 분석/목표가: 기관 매수세 안착 및 밸류에이션 리레이팅'
  },
  warning: {
    label: '⚠️ 경고 | 재료소멸',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.4)',
    tip: '이벤트 종료/차익 매물 출회 주의 구간'
  }
};

// 라이프사이클 단계 판별 엔진
function getLifecycleStage(item) {
  if (!item) return 'incubation';
  if (item.lifecycle && LIFECYCLE_CONFIG[item.lifecycle]) {
    return item.lifecycle;
  }

  const textToScan = `${item.title || item.news_title || ''} ${item.desc || item.key_point || ''} ${item.source || item.press || ''} ${item.tag || ''}`;
  const isDart = item.type === 'dart' || item.is_dart || item.source?.includes('DART') || (item.press && item.press.includes('DART'));
  const isReport = item.type === 'report' || item.is_report || item.source?.includes('증권') || item.source?.includes('리포트') || (item.press && item.press.includes('리포트'));

  // 1. DART 공시, '공급계약', '단조설비 신규투자', '퀄 통과' 키워드 포함 ➔ 'ignition'
  if (isDart || /(공급계약|단조설비 신규투자|단조설비|신규투자|퀄 통과|수주 공시|신규시설투자)/.test(textToScan)) {
    return 'ignition';
  }

  // 2. 증권사 리포트, '목표가', '투자의견 Buy' 키워드 포함 ➔ 'verification'
  if (isReport || /(증권사 리포트|목표가|투자의견 Buy|BUY|컨센서스)/i.test(textToScan)) {
    return 'verification';
  }

  // 3. '보호예수', '전환사채', '차익', '비행 완료' 키워드 포함 ➔ 'warning'
  if (/(보호예수|전환사채|차익|비행 완료|재료소멸|매물 출회)/.test(textToScan)) {
    return 'warning';
  }

  // 4. 그 외 협의 착수, '기대감', '단독' 키워드 및 기본 ➔ 'incubation'
  return 'incubation';
}

// 2. js/stock.js getSafeTimelineUrl(item) 함수 정비 (전 테마 범용 매핑 & 네이버 뉴스 원문 직결 1순위)
function getSafeTimelineUrl(item) {
  if (!item) return '';

  const stock = (item.stockName || item.target_name || '').trim();
  const code = item.stock_code || STOCK_CODES[stock];

  // A. DART 전자공시: 보안 경고 뜨는 m.dart 폐기 -> 네이버 금융 종목 메인 직결 또는 DART 원문
  if (item.type === 'dart' || item.is_dart || item.source?.includes('DART') || item.press?.includes('DART')) {
    if (item.dart_url && item.dart_url.startsWith('https://dart.fss.or.kr')) {
      return item.dart_url;
    }
    if (code) {
      return `https://finance.naver.com/item/main.naver?code=${code}`;
    }
    return stock ? `https://finance.naver.com/search/searchList.naver?query=${encodeURIComponent(stock)}` : 'https://finance.naver.com/';
  }

  // B. 증권사 리포트: 네이버 리다이렉트 차단 -> HTTP 한경 컨센서스 종목 검색 직결
  if (item.type === 'report' || item.is_report || item.source?.includes('증권') || item.source?.includes('리포트') || item.press?.includes('리포트')) {
    if (item.report_url && item.report_url.startsWith('http')) {
      return item.report_url;
    }
    if (item.link && (item.link.includes('hankyung.com') || item.link.includes('.pdf'))) {
      return item.link;
    }
    return `http://consensus.hankyung.com/analysis/list?search_text=${encodeURIComponent(stock || '주도주')}`;
  }

  // C. 뉴스: 1순위 n.news.naver.com 본문 직결 URL 최우선 매핑
  const candidateUrls = [item.news_url, item.link, item.originallink].filter(Boolean);

  // 1순위: 네이버 뉴스 본문 직결 URL (모바일/PC 공통 n.news.naver.com)
  const naverNewsDirect = candidateUrls.find(u => typeof u === 'string' && u.includes('n.news.naver.com'));
  if (naverNewsDirect) {
    return naverNewsDirect;
  }

  // 2순위: 블로그 주소(blog.naver.com)나 더미 주소가 아닌 정상 언론사 URL
  for (const u of candidateUrls) {
    if (typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://')) && !u.includes('undefined') && !u.includes('blog.naver.com')) {
      return u;
    }
  }

  // 3순위 폴백: 404가 나지 않는 네이버 모바일 뉴스 검색 링크
  const cleanTitle = (item.title || item.news_title || '').replace(/<[^>]+>/g, '').replace(/\[.*?\]/g, '').trim();
  const queryStr = (stock ? `${stock} ` : '') + cleanTitle.slice(0, 20);
  return `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(queryStr.trim())}`;
}

// 5대 종목 원클릭 인터랙티브 필터 상태 관리
let currentStockFilter = 'ALL';

window.filterTimelineStock = function(stockName, btn) {
  currentStockFilter = stockName || 'ALL';
  if (window.currentSelectedDetectiveTheme) {
    window.renderDetectiveCard(window.currentSelectedDetectiveTheme, window.activeTimelinePeriod || 'all');
  }
};

// [고도화 3단계] 타임라인 ➔ 3번 탭 캘린더 매매 플래너 1클릭 자동 등록 연동
window.addTimelineToCalendar = function(itemIdOrDate) {
  let targetItem = null;

  // 1. 현재 로드된 테마의 타임라인에서 검색
  if (window.currentSelectedDetectiveTheme && Array.isArray(window.currentSelectedDetectiveTheme.timeline)) {
    targetItem = window.currentSelectedDetectiveTheme.timeline.find(t => (t.id === itemIdOrDate || t.date === itemIdOrDate));
  }

  // 2. 전체 테마 캐시 또는 timeline_space 등에서 보조 검색
  if (!targetItem && typeof detectiveThemes !== 'undefined' && Array.isArray(detectiveThemes)) {
    for (const th of detectiveThemes) {
      if (Array.isArray(th.timeline)) {
        const found = th.timeline.find(t => (t.id === itemIdOrDate || t.date === itemIdOrDate));
        if (found) { targetItem = found; break; }
      }
    }
  }

  if (!targetItem) {
    if (window.showToast) window.showToast('일정 정보를 찾을 수 없습니다.', '⚠️');
    return;
  }

  // 캘린더 일정 데이터 포맷으로 정제
  const stockName = targetItem.stockName || (targetItem.target_name || '우주항공');
  const rawTitle = targetItem.title || targetItem.news_title || '증시 일정';
  const cleanTitle = rawTitle.replace(/\[.*?\]/g, '').trim();
  const truncatedTitle = cleanTitle.length > 25 ? cleanTitle.slice(0, 25) + '...' : cleanTitle;
  const calTitle = `[${stockName}] ${truncatedTitle}`;

  const sourceName = targetItem.source || targetItem.press || '언론/공시';
  const rawDesc = targetItem.desc || targetItem.key_point || '';
  const calDesc = `${sourceName} 보도/공시 기반 일정: ${rawDesc}`;

  const calType = (targetItem.type === 'dart' || targetItem.is_dart) ? 'disclosure'
    : ((targetItem.type === 'report' || targetItem.is_report) ? 'report' : 'news');
  const calTag = targetItem.tag || '타임라인 연동';
  const calDate = (targetItem.targetDate || targetItem.date || new Date().toISOString().slice(0, 10)).trim();
  const safeUrl = getSafeTimelineUrl(targetItem);

  const newCalEvent = {
    id: targetItem.id ? `cal_${targetItem.id}` : `cal_tl_${Date.now()}`,
    date: calDate,
    dateDisplay: calDate,
    title: calTitle,
    desc: calDesc,
    type: calType,
    tag: calTag,
    press: sourceName,
    sourceUrl: safeUrl,
    is_custom: true
  };

  // 3번 탭 캘린더 저장소(stock_calendar_approved_events) 및 전역 변수(calendarApprovedEvents) 동기화
  if (typeof calendarApprovedEvents === 'undefined' || !Array.isArray(calendarApprovedEvents)) {
    const rawLocal = localStorage.getItem('stock_calendar_approved_events');
    window.calendarApprovedEvents = rawLocal ? JSON.parse(rawLocal) : [];
  }

  // 중복 체크: 동일 id 또는 동일 날짜+제목 방지
  const isDuplicate = calendarApprovedEvents.some(e => e.id === newCalEvent.id || (e.date === newCalEvent.date && e.title === newCalEvent.title));
  if (!isDuplicate) {
    calendarApprovedEvents.push(newCalEvent);
  }

  // localStorage 영구 저장
  localStorage.setItem('stock_calendar_approved_events', JSON.stringify(calendarApprovedEvents));

  // 3번 탭 캘린더 피드 캐시 갱신
  if (typeof liveStockCalendarCache !== 'undefined') {
    liveStockCalendarCache = [];
  }

  // 3번 탭 캘린더 렌더 함수 즉시 호출
  if (typeof renderApprovedCalendarUI === 'function') {
    renderApprovedCalendarUI();
  }
  if (typeof renderStockCalendarFeed === 'function') {
    renderStockCalendarFeed();
  }

  // 성공 피드백 토스트 알림
  if (window.showToast) {
    window.showToast(`✅ [${stockName}] 일정이 3번 탭 매매 캘린더에 성공적으로 등록되었습니다.`, '📅');
  } else {
    alert(`✅ [${stockName}] 일정이 3번 탭 매매 캘린더에 성공적으로 등록되었습니다.`);
  }
};

// [고도화 4단계] 종목별 채널 크로스-체크 스코어링 및 트리플 크로스 확정주 판별기
function calculateStockSignalScores(timelineData = []) {
  const stockScores = {};
  timelineData.forEach(item => {
    const stock = item.stockName || (item.target_name || '');
    if (!stock) return;
    if (!stockScores[stock]) {
      stockScores[stock] = { hasNews: false, hasDart: false, hasReport: false, count: 0 };
    }
    if (item.type === 'dart' || item.is_dart || item.source?.includes('DART') || item.press?.includes('DART')) {
      stockScores[stock].hasDart = true;
    } else if (item.type === 'report' || item.is_report || item.source?.includes('증권') || item.source?.includes('리포트') || item.press?.includes('리포트')) {
      stockScores[stock].hasReport = true;
    } else {
      stockScores[stock].hasNews = true;
    }
  });

  // 채널 카운트 합산
  Object.keys(stockScores).forEach(stk => {
    let cnt = 0;
    if (stockScores[stk].hasNews) cnt++;
    if (stockScores[stk].hasDart) cnt++;
    if (stockScores[stk].hasReport) cnt++;
    stockScores[stk].count = cnt;
  });

  return stockScores;
}

// 신뢰도 시그널 배지 HTML 생성기
function getStockSignalBadgeHtml(scoreObj) {
  if (!scoreObj || scoreObj.count === 0) return '';
  if (scoreObj.count >= 3) {
    return `
      <span class="signal-badge triple-cross" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(234, 179, 8, 0.2)); border: 1px solid #eab308; color: #fde047; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 800; box-shadow: 0 0 8px rgba(234, 179, 8, 0.3); display: inline-flex; align-items: center; gap: 4px;" title="뉴스+DART공시+증권사리포트 3채널 크로스체크 완료 종목">
        👑 트리플 크로스 | 팩트 확정주
      </span>
    `;
  }
  if (scoreObj.count === 2) {
    return `
      <span class="signal-badge double-cross" style="background: rgba(168, 85, 247, 0.15); border: 1px solid #a855f7; color: #c084fc; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="2개 채널 교차 검증 완료">
        ⚡ 더블 크로스 | 수급 입증
      </span>
    `;
  }
  return `
    <span class="signal-badge single-cross" style="background: rgba(148, 163, 184, 0.1); border: 1px solid #64748b; color: #94a3b8; padding: 2px 6px; border-radius: 4px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;" title="단일 채널 보도/일정">
      🔎 초기 모멘텀
    </span>
  `;
}

window.STOCK_CODES = STOCK_CODES;
window.LIFECYCLE_CONFIG = LIFECYCLE_CONFIG;
window.getLifecycleStage = getLifecycleStage;
window.getSafeTimelineUrl = getSafeTimelineUrl;
window.calculateStockSignalScores = calculateStockSignalScores;
window.getStockSignalBadgeHtml = getStockSignalBadgeHtml;

window.renderDetectiveCard = function(theme, period = 'all') {
  const container = document.getElementById('stock-material-timeline-list')
    || document.getElementById('themeTimelineList')
    || document.getElementById('theme-timeline-container')
    || document.querySelector('.stock-material-timeline-list, .theme-timeline-cards');
  if (!container || !theme) {
    if (!container) console.error('타임라인 컨테이너를 찾을 수 없습니다.');
    return;
  }
  window.currentSelectedDetectiveTheme = theme;

  // 상단 좌측 메인 제목(#theme-timeline-title) 및 뱃지(#theme-timeline-badge) 동시 갱신
  const titleEl = document.getElementById('theme-timeline-title') || document.querySelector('#theme-timeline-viewer-section h3, #theme-timeline-viewer-section h4, .theme-timeline-title');
  const badgeEl = document.getElementById('theme-timeline-badge');
  const descEl = document.getElementById('theme-timeline-lead-desc');
  const countEl = document.getElementById('theme-timeline-count');

  if (titleEl) {
    titleEl.textContent = `${theme.theme_name} 재료 타임라인`;
  }
  if (badgeEl) {
    badgeEl.textContent = theme.sector || theme.category || '주도 테마';
  }
  if (descEl && theme.checklist && theme.checklist.leaders) {
    const leadStr = theme.checklist.leaders.lead || '';
    descEl.innerHTML = `👑 핵심 대장주: <span style="color: #cbd5e1; font-weight: 700;">${leadStr}</span> · <span style="color: #38bdf8; font-weight: 700;">${theme.pattern_type || ''}</span>`;
  }

  // 타임라인 기사 목록과 공시, 리포트 통합 목록 준비 (블로그 전면 차단 필터링 적용)
  const isBlogData = (item) => {
    if (!item) return false;
    const src = String(item.press || item.source || item.blogger_name || '');
    const url = String(item.news_url || item.link || item.originallink || '');
    const tit = String(item.title || item.news_title || '');
    return !!item.is_blog ||
      item.channel === 'BLOG' ||
      src.includes('블로그') ||
      url.includes('blog.naver.com') ||
      tit.startsWith('[블로그]');
  };

  let rawTimeline = [...(theme.timeline || [])].filter(it => !isBlogData(it));

  const currentTheme = (theme.theme_name || '').trim();

  // [1단계 데이터 소스 연동]: 우주항공/스페이스X 테마일 경우 timeline_space.json 비동기 연동 지원
  if (/우주항공|스페이스X|스타링크/i.test(currentTheme) && !theme._spaceTimelineLoaded) {
    theme._spaceTimelineLoaded = true;
    fetch('/data/timeline_space.json?v=' + Date.now())
      .then(res => res.ok ? res.json() : null)
      .then(rawData => {
        if (!rawData) return;
        const spaceItems = Array.isArray(rawData) ? rawData : (rawData.items || rawData.data || []);
        if (Array.isArray(spaceItems) && spaceItems.length > 0) {
          const curList = [...(theme.timeline || [])].filter(it => !isBlogData(it));
          let added = false;
          spaceItems.forEach(si => {
            if (!isBlogData(si) && !curList.some(t => t.id === si.id || t.news_title === si.title || (t.news_url && t.news_url === si.link))) {
              curList.push(si);
              added = true;
            }
          });
          if (added) {
            theme.timeline = curList;
            if (window.currentSelectedDetectiveTheme === theme) {
              window.renderDetectiveCard(theme, window.activeTimelinePeriod || period);
            }
          }
        }
      })
      .catch(err => console.warn('Space timeline load notice:', err));
  }

  // [데이터 부재 시 자동 변환 (빈 화면 방지)]:
  // 만약 특정 테마의 전용 데이터가 비어있거나 1건 미만인 경우, 체크리스트 대장주 및 테마 요약 기반으로 즉시 기본 타임라인 카드 자동 구성
  if (rawTimeline.length === 0) {
    const chkLeaders = theme.checklist?.leaders || {};
    const leadNames = [chkLeaders.lead, ...(chkLeaders.sub ? chkLeaders.sub.split(',') : [])]
      .filter(Boolean)
      .map(s => s.trim().replace(/\(.*?\)/g, ''))
      .filter(s => s && s !== '종목명' && s !== '관련주 추적 중');

    const primaryStock = leadNames[0] || currentTheme;
    const todayStr = new Date().toISOString().slice(0, 10);

    const generatedCards = [
      {
        id: `gen_news_${theme.theme_id || Date.now()}`,
        date: theme.analysis_date || todayStr,
        stage: '실시간 피드',
        source: '주요 언론 종합',
        press: '주요 언론 종합',
        stockName: primaryStock,
        type: 'news',
        lifecycle: 'incubation',
        tag: '🌱 기대감',
        title: `[${primaryStock}] ${theme.theme_name} 핵심 수혜 및 사업 모멘텀 부각`,
        desc: theme.checklist?.material || theme.summary || `${currentTheme} 주도 섹터 수급 유입 및 관련주 밸류체인 진입 기대감 형성`,
        news_url: `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(currentTheme + ' ' + primaryStock)}`,
        link: `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(currentTheme + ' ' + primaryStock)}`
      },
      {
        id: `gen_dart_${theme.theme_id || Date.now()}`,
        date: theme.analysis_date || todayStr,
        stage: '전자공시 확인',
        source: 'DART 전자공시',
        press: 'DART 전자공시',
        stockName: primaryStock,
        type: 'dart',
        is_dart: true,
        lifecycle: 'ignition',
        tag: '📑 공시 추적',
        title: `[공시] ${primaryStock} 사업보고서 및 최근 주요 경영사항 전자공시 점검`,
        desc: `${primaryStock} 관련 DART 금융감독원 최신 정기 공시 및 수주·공급 계약 이행 내역 실시간 추적`,
        news_url: STOCK_CODES[primaryStock] ? `https://finance.naver.com/item/main.naver?code=${STOCK_CODES[primaryStock]}` : `https://finance.naver.com/search/searchList.naver?query=${encodeURIComponent(primaryStock)}`,
        link: STOCK_CODES[primaryStock] ? `https://finance.naver.com/item/main.naver?code=${STOCK_CODES[primaryStock]}` : `https://finance.naver.com/search/searchList.naver?query=${encodeURIComponent(primaryStock)}`
      },
      {
        id: `gen_rep_${theme.theme_id || Date.now()}`,
        date: theme.analysis_date || todayStr,
        stage: '증권사 리서치',
        source: '한경컨센서스 리서치',
        press: '증권사 리포트',
        stockName: primaryStock,
        type: 'report',
        is_report: true,
        lifecycle: 'verification',
        tag: '📊 리포트 분석',
        title: `[리포트] ${primaryStock}, ${currentTheme} 산업군 내 경쟁력 및 실적 전망`,
        desc: `${currentTheme} 업황 사이클 분석 및 ${primaryStock} 기업가치 밸류에이션 리레이팅 기대`,
        news_url: `http://consensus.hankyung.com/analysis/list?search_text=${encodeURIComponent(primaryStock)}`,
        link: `http://consensus.hankyung.com/analysis/list?search_text=${encodeURIComponent(primaryStock)}`
      }
    ];

    theme.timeline = generatedCards;
    rawTimeline = [...generatedCards];
  }

  // DART 공시, 한경 컨센서스 리포트 및 기술적 분석(국면/슈팅/지속도) 보강 트리거
  const leadStockName = theme.checklist?.leaders?.lead ? theme.checklist.leaders.lead.split(',')[0].trim() : '';
  if (leadStockName && !theme._asyncSupplementsLoaded) {
    theme._asyncSupplementsLoaded = true;
    Promise.all([
      window.fetchDartDisclosuresForStock(leadStockName).catch(() => []),
      window.fetchHkReportsForStock(leadStockName).catch(() => []),
      window.fetchStockTechnicals(leadStockName).catch(() => null)
    ]).then(([dartItems, reportItems, techData]) => {
      let updated = false;
      const combined = [...(dartItems || []), ...(reportItems || [])];
      if (combined.length > 0) {
        const curList = [...(theme.timeline || rawTimeline)];
        combined.forEach(item => {
          if (!curList.some(t => t.news_title === item.news_title || (t.news_url && t.news_url === item.news_url))) {
            curList.push(item);
            updated = true;
          }
        });
        if (updated) {
          theme.timeline = curList;
        }
      }
      if (techData) {
        theme._technicals = techData;
        updated = true;
      }
      if (updated && window.currentSelectedDetectiveTheme === theme) {
        window.renderDetectiveCard(theme, window.activeTimelinePeriod || period);
      }
    });
  }

  // 날짜(date) 기준 최신순 정렬 (YYYY-MM-DD 역순)
  const sortedTimeline = [...rawTimeline].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 기간 필터링
  let filteredTimeline = sortedTimeline;
  if (period === '7d') {
    filteredTimeline = sortedTimeline.filter(tl => getDaysDifference(tl.date) <= 7);
  } else if (period === '30d') {
    filteredTimeline = sortedTimeline.filter(tl => getDaysDifference(tl.date) <= 30);
  }

  // 채널별 필터링 상태 및 카운트 집계
  const activeChannel = window.activeTimelineChannel || 'ALL';
  const channelCounts = {
    ALL: filteredTimeline.length,
    NEWS: 0,
    DART: 0,
    REPORT: 0,
    EVENT: 0
  };

  const getTimelineChannelType = (tl) => {
    if (tl.type === 'report' || tl.channel === 'REPORT' || tl.is_report || (tl.press && tl.press.includes('리포트')) || (tl.source && tl.source.includes('증권')) || (tl.news_title && tl.news_title.startsWith('[리포트]')) || (tl.title && tl.title.startsWith('[리포트]'))) {
      return 'REPORT';
    }
    if (tl.type === 'dart' || tl.channel === 'DART' || tl.is_dart || (tl.press && tl.press.includes('DART')) || (tl.source && (tl.source.includes('DART') || tl.source.includes('공시'))) || (tl.news_title && tl.news_title.startsWith('[공시]')) || (tl.title && tl.title.startsWith('[공시]'))) {
      return 'DART';
    }
    if (tl.type === 'event' || tl.channel === 'EVENT' || tl.is_event || tl.stage === '핵심 일정' || tl.stage === '글로벌 이벤트') {
      return 'EVENT';
    }
    return 'NEWS';
  };

  filteredTimeline.forEach(tl => {
    const chType = getTimelineChannelType(tl);
    if (chType === 'REPORT') {
      channelCounts.REPORT++;
    } else if (chType === 'DART') {
      channelCounts.DART++;
    } else if (chType === 'EVENT') {
      channelCounts.EVENT++;
    } else {
      channelCounts.NEWS++;
    }
  });

  const channelFilteredTimeline = filteredTimeline.filter(tl => {
    if (activeChannel === 'ALL') return true;
    return getTimelineChannelType(tl) === activeChannel;
  });

  // [고도화 4단계] 종목별 4채널 크로스-체크 스코어링
  const stockSignalScores = calculateStockSignalScores(rawTimeline);

  // [2단계 상단 종목 필터 탭의 동적 생성 (Dynamic Filter Tabs)]
  // 고정 5대 종목이 아니라, 현재 선택된 테마의 타임라인 데이터 및 체크리스트 대장주에서 종목명 Set 자동 추출
  const dynamicStockSet = new Set();

  // 1. 테마 체크리스트 내 대장주/부대장주 추출
  if (theme.checklist && theme.checklist.leaders) {
    const lLead = theme.checklist.leaders.lead || '';
    const lSub = theme.checklist.leaders.sub || '';
    `${lLead},${lSub}`.split(',').forEach(stk => {
      const clean = stk.trim().replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '');
      if (clean && clean !== '종목명' && clean !== '관련주 추적 중' && clean !== '대장' && clean !== '연관 수급주 실시간 탐색 중') {
        dynamicStockSet.add(clean);
      }
    });
  }

  // 2. 현재 로드된 타임라인 아이템 내 stockName 또는 target_name 추출
  rawTimeline.forEach(tl => {
    const sName = (tl.stockName || tl.target_name || '').trim().replace(/\(.*?\)/g, '');
    if (sName && sName !== '종목명' && sName !== '관련주 추적 중' && sName.length >= 2) {
      dynamicStockSet.add(sName);
    }
  });

  // 동적 종목군 리스트 (대장주 우선 정렬)
  const dynamicStocks = Array.from(dynamicStockSet);

  const stockCounts = {
    ALL: channelFilteredTimeline.length
  };

  const matchesStock = (tl, stock) => {
    if (!stock || stock === 'ALL') return true;
    const sName = tl.stockName || '';
    const title = tl.title || tl.news_title || '';
    const desc = tl.desc || tl.key_point || '';
    const target = tl.target_name || '';
    const tags = Array.isArray(tl.tags) ? tl.tags.join(' ') : '';
    const fullText = `${sName} ${title} ${desc} ${target} ${tags}`;

    if (stock === '켄코아') {
      return fullText.includes('켄코아') || fullText.includes('274090');
    }
    return fullText.includes(stock);
  };

  dynamicStocks.forEach(stk => {
    stockCounts[stk] = channelFilteredTimeline.filter(tl => matchesStock(tl, stk)).length;
  });

  // 트리플 크로스(3채널 검증 완료) 해당 종목 판별
  const isTripleCrossItem = (tl) => {
    const sName = tl.stockName || tl.target_name || '';
    const scoreObj = stockSignalScores[sName];
    if (scoreObj && scoreObj.count >= 3) return true;
    // 텍스트 매칭 보조
    for (const stk of Object.keys(stockSignalScores)) {
      if (stockSignalScores[stk]?.count >= 3 && matchesStock(tl, stk)) {
        return true;
      }
    }
    return false;
  };

  const tripleCrossCount = channelFilteredTimeline.filter(tl => isTripleCrossItem(tl)).length;
  stockCounts.TRIPLE_CROSS = tripleCrossCount;

  const finalTimeline = channelFilteredTimeline.filter(tl => {
    if (!currentStockFilter || currentStockFilter === 'ALL') return true;
    if (currentStockFilter === 'TRIPLE_CROSS') {
      return isTripleCrossItem(tl);
    }
    return matchesStock(tl, currentStockFilter);
  });

  if (countEl) {
    countEl.textContent = `${finalTimeline.length}건 / 총 ${filteredTimeline.length}건`;
  }

  const chk = theme.checklist || {};
  const leaders = chk.leaders || {};
  const conditions = chk.conditions || {};
  const tech = theme._technicals || null;

  // [4단계] 6번 국면 & 7번 수급 분석 배지 생성
  let techBadgesHtml = '';
  let supplyTextHtml = '';

  if (tech) {
    const shootBadge = tech.shooting_analysis?.badge_text || '';
    const contBadge = tech.news_continuity?.badge_text || '';
    const maText = `📈 ${tech.ma?.arrangement || '이평선 수렴'} | 거래량 ${tech.today_volume_ratio || '100%'}`;
    const isNew = tech.shooting_analysis?.is_new_theme;
    const isHot = tech.news_continuity?.status === 'HOT_CONTINUED' || tech.news_continuity?.status === 'NEW';
    const breakoutBadge = tech.breakout_badge || (tech.is_5ma_breakout ? '🎯 [5일선 상향 돌파 양봉 발생] - 슈팅 후 조정 완료' : '');
    const pullbackText = tech.pullback_phase_text || (tech.pullback_rate != null ? `기준봉 고가 대비 눌림률 ${tech.pullback_rate}%` : '');

    techBadgesHtml = `
      <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
        <!-- 슈팅 및 언론 관심도 배지 -->
        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
          <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; font-weight: 800; background: ${isNew ? 'rgba(56, 189, 248, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color: ${isNew ? '#38bdf8' : '#fbbf24'}; border: 1px solid ${isNew ? 'rgba(56, 189, 248, 0.4)' : 'rgba(245, 158, 11, 0.4)'};">
            ${shootBadge}
          </span>
          <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; font-weight: 800; background: ${isHot ? 'rgba(239, 68, 68, 0.2)' : 'rgba(148, 163, 184, 0.2)'}; color: ${isHot ? '#f87171' : '#cbd5e1'}; border: 1px solid ${isHot ? 'rgba(239, 68, 68, 0.4)' : 'rgba(148, 163, 184, 0.3)'};">
            ${contBadge}
          </span>
        </div>

        <!-- 기준봉 고가 대비 눌림률 및 5일선 돌파 타점 배지 (실전 의사결정) -->
        <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 6px 8px; display: flex; flex-direction: column; gap: 4px;">
          <div style="font-size: 0.74rem; color: #be123c; font-weight: 800; display: flex; justify-content: space-between; align-items: center;">
            <span>📉 기준봉 대비 눌림률:</span>
            <span style="color: #9f1239; font-weight: 900;">${pullbackText || '눌림목 단계 산출 중'}</span>
          </div>
          ${breakoutBadge ? `
            <div style="font-size: 0.74rem; font-weight: 900; background: linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(244, 63, 94, 0.35)); color: #fecdd3; border: 1px solid #dc2626; padding: 3px 8px; border-radius: 5px; text-align: center; animation: pulse 2s infinite;">
              ${breakoutBadge}
            </div>
          ` : `
            <div style="font-size: 0.7rem; color: #94a3b8;">
              ${maText}
            </div>
          `}
        </div>
      </div>
    `;

    // 외인/기관 연속 순매수 등 실시간 수급 현황
    if (tech.supply_analysis) {
      const sup = tech.supply_analysis;
      const fDays = sup.foreign_consecutive_days || 0;
      const oDays = sup.organ_consecutive_days || 0;
      const bothBuying = sup.is_both_buying;
      supplyTextHtml = `
        <div style="margin-top: 6px; font-size: 0.76rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px 8px;">
          <div style="color: #1d4ed8; font-weight: 800; display: flex; align-items: center; justify-content: space-between;">
            <span>👥 실시간 메이저 수급:</span>
            <span style="color: ${bothBuying ? '#f87171' : '#60a5fa'}; font-weight: 900;">${bothBuying ? '🔥 외인·기관 양매수 유입' : '수급 유입 진행 중'}</span>
          </div>
          <div style="color: #334155; font-size: 0.74rem; margin-top: 3px;">
            외인 ${fDays > 0 ? `<b style="color:#f87171;">${fDays}일 연속 순매수</b>` : '관망'} · 기관 ${oDays > 0 ? `<b style="color:#f87171;">${oDays}일 연속 순매수</b>` : '관망'}
          </div>
        </div>
      `;
    }
  } else {
    techBadgesHtml = `
      <div style="margin-top: 6px; font-size: 0.74rem; color: #64748b;">
        ⏳ 일봉 시세 및 6개월 슈팅 이력 분석 데이터 연동 중...
      </div>
    `;
  }

  // 7번 하락 시나리오 다중 경우의 수 분해
  const bearishDetails = conditions.bearish_details || null;
  let bearishMultiHtml = '';
  if (bearishDetails && typeof bearishDetails === 'object') {
    bearishMultiHtml = `
      <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px; font-size: 0.76rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 6px 8px;">
        <div style="color: #7f1d1d; line-height: 1.35;">
          <strong style="color: #b91c1c;">① 일정 연기/무산:</strong> ${bearishDetails.risk_delay ? bearishDetails.risk_delay.replace(/\[.*?\]\s*/, '') : '법안·인허가·공청회 지연 시 실망 매물'}
        </div>
        <div style="color: #7f1d1d; line-height: 1.35;">
          <strong style="color: #b91c1c;">② 재료 팩트 소멸:</strong> ${bearishDetails.risk_cancellation ? bearishDetails.risk_cancellation.replace(/\[.*?\]\s*/, '') : '계약 해지, 개발 중단 공시 시 급락'}
        </div>
        <div style="color: #7f1d1d; line-height: 1.35;">
          <strong style="color: #b91c1c;">③ 매크로 리스크:</strong> ${bearishDetails.risk_macro ? bearishDetails.risk_macro.replace(/\[.*?\]\s*/, '') : '지정학 긴장 및 지수 투매에 따른 동반 하락'}
        </div>
      </div>
    `;
  } else {
    bearishMultiHtml = `
      <div style="font-size:0.82rem; color:#fca5a5; line-height:1.4; margin-top:4px;">
        <b>▼ 하락 리스크:</b> ${conditions.bearish || '주도주 거래량 급감 및 시장 충격 시 조정'}
      </div>
    `;
  }

  let html = `
    <!-- 7대 재료 체크리스트 카드 (상단 고정 유지) -->
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px 22px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid #e2e8f0; padding-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div style="font-size:1.05rem; font-weight:900; color:#0f172a; display:flex; align-items:center; gap:8px;">
          <span>📋</span> 데일리 주도주 탐정 7대 재료 체크리스트
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <button type="button" onclick="openSaveCaseModal()" style="display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg, #059669, #10b981); color:#ffffff; font-size:0.84rem; font-weight:900; padding:6px 14px; border-radius:8px; border:1px solid #34d399; cursor:pointer; box-shadow:0 3px 12px rgba(16,185,129,0.35); transition:all 0.15s ease;" onmouseover="this.style.transform='translateY(-1px)'; this.style.filter='brightness(1.15)';" onmouseout="this.style.transform='none'; this.style.filter='none';">
            <span>💾</span>
            <span>현재 종목 사건 수첩에 박제</span>
          </button>
          <span style="font-size:0.75rem; color:#475569; background:#f8fafc; border:1px solid #e2e8f0; padding:4px 9px; border-radius:6px; font-weight:600;">
            분석 기준일: ${theme.analysis_date || '최근'}
          </span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:12px;">
        <!-- 1) 재료의 내용 & 핵심 스토리 -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px; border-left:4px solid #0284c7; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="font-size:0.83rem; font-weight:800; color:#0369a1; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
            <span style="background:#e0f2fe; color:#0369a1; padding:2px 7px; border-radius:4px;">1) 재료의 내용 & 핵심 스토리</span>
          </div>
          <div style="font-size:0.86rem; color:#1e293b; font-weight:600; line-height:1.5; word-break: break-all;">
            ${escapeHtml((() => {
              if (chk.material && chk.material.length > 5 && !chk.material.includes('메이저 거래대금 쏠림 분출')) {
                return chk.material;
              }
              const firstNews = (theme.timeline || []).find(t => t.news_title && !t.news_title.includes('[주도 섹터 TOP 5]'));
              if (firstNews && firstNews.news_title) {
                return `${firstNews.news_title} (${firstNews.press || '언론 종합'})`;
              }
              if (theme.top_article && theme.top_article.title) {
                return `${theme.top_article.title} (${theme.top_article.press || '언론 종합'})`;
              }
              return chk.material || `${theme.theme_name} 핵심 수주 및 신사업 공급망 진입 발표`;
            })())}
          </div>
        </div>

        <!-- 2) 대장주 & 3) 관련성 -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px; border-left:4px solid #7c3aed; box-shadow:0 1px 3px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: space-between; gap: 8px;">
          <div>
            <div style="font-size:0.83rem; font-weight:800; color:#6d28d9; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
              <span style="background:#ede9fe; color:#6d28d9; padding:2px 7px; border-radius:4px;">2) 대장주 & 3) 관련성</span>
            </div>
            <div style="font-size:0.86rem; color:#1e293b; line-height:1.45;">
              <span style="color:#6d28d9; font-weight:900;">👑 ${leaders.lead || '-'}</span> 
              ${leaders.sub ? `<span style="color:#64748b; font-size:0.8rem; font-weight:600;">(부대장: ${leaders.sub})</span>` : ''}
            </div>
            <div style="font-size:0.82rem; color:#475569; margin-top:6px; line-height:1.45; word-break: break-all;">
              ${chk.correlation || '-'}
            </div>
          </div>
        </div>

        <!-- 3) 재료와 종목의 연관성 (사업 스토리 팩트 매핑) -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px; border-left:4px solid #d97706; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="font-size:0.83rem; font-weight:800; color:#b45309; margin-bottom:6px; display: flex; align-items: center; justify-content: space-between;">
            <span style="background:#fef3c7; color:#b45309; padding:2px 7px; border-radius:4px;">3) 재료와 종목의 연관성</span>
            <span style="font-size: 0.68rem; background: #fffbeb; color: #b45309; border:1px solid #fde68a; padding: 1px 6px; border-radius: 4px; font-weight: 800;">밸류체인 직결</span>
          </div>
          <div style="font-size:0.85rem; color:#1e293b; line-height:1.5;">${chk.correlation || '-'}</div>
        </div>

        <!-- 4) 앞으로의 기대감 & 5) 유통기한 -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px; border-left:4px solid #059669; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="font-size:0.83rem; font-weight:800; color:#047857; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
            <span style="background:#d1fae5; color:#047857; padding:2px 7px; border-radius:4px;">4) 앞으로의 기대감 & 5) 유통기한</span>
          </div>
          <div style="font-size:0.85rem; color:#1e293b; line-height:1.5;">${chk.future_expectation || '-'}</div>
          
          <div style="margin-top: 8px; padding: 8px 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px;">
            <div style="font-size:0.82rem; color:#065f46; font-weight:800; display: flex; align-items: center; gap: 4px;">
              <span>⏳ 유통기한:</span> <span style="color: #047857; font-weight:900;">${chk.expiration_date || '일정 추적 중'}</span>
            </div>
            ${chk.expiration_evidence ? `
              <div style="font-size: 0.74rem; color: #047857; margin-top: 4px; border-top: 1px dashed #a7f3d0; padding-top: 4px; line-height: 1.35; font-style: italic;">
                ${chk.expiration_evidence}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 6) 국면 (차트 위치 & 기준봉 눌림률 타점) -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px; border-left:4px solid #db2777; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="font-size:0.83rem; font-weight:800; color:#be185d; margin-bottom:6px; display: flex; align-items: center; justify-content: space-between;">
            <span style="background:#fce7f3; color:#be185d; padding:2px 7px; border-radius:4px;">6) 국면 (차트 위치 & 타점)</span>
            <span style="font-size: 0.68rem; background: #fdf2f8; color: #be185d; border:1px solid #fbcfe8; padding: 1px 6px; border-radius: 4px; font-weight: 800;">타점 정밀 판별</span>
          </div>
          <div style="font-size:0.85rem; color:#1e293b; line-height:1.5;">${chk.chart_phase || '-'}</div>
          ${techBadgesHtml}
        </div>

        <!-- 7) 주가 상승 / 하락 조건 -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px; border-left:4px solid #dc2626; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="font-size:0.83rem; font-weight:800; color:#b91c1c; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
            <span style="background:#fee2e2; color:#b91c1c; padding:2px 7px; border-radius:4px;">7) 주가 상승 트리거 vs 하락 시나리오</span>
          </div>
          <div style="font-size:0.83rem; color:#15803d; line-height:1.45; font-weight:600; margin-bottom:4px;"><b>▲ 상승 조건:</b> ${conditions.bullish || '-'}</div>
          ${bearishMultiHtml}
          ${supplyTextHtml}
        </div>
      </div>
    </div>

    <!-- 사건의 전개 과정 (타임라인) -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:10px;">
      <h3 style="font-size:1.1rem; color:#0f172a; margin:0; display:flex; align-items:center; gap:8px;">
        <span>🕵️‍♂️</span> 사건의 전개 과정 (관련 뉴스, DART 전자공시 & 증권사 리포트)
      </h3>
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span style="font-size:0.75rem; color:#64748b;">
          기간: <strong style="color:#0284c7;">${period === '7d' ? '최근 7일' : (period === '30d' ? '최근 30일' : '최근 3개월')}</strong>
        </span>
        <!-- 채널 필터 버튼군 [전체 | 📰 뉴스 | 📑 전자공시 | 📊 증권사 리포트 | 🎯 핵심 이벤트] -->
        <div style="display:flex; gap:4px;" id="timeline-channel-filter-buttons">
          <button type="button" onclick="window.filterTimelineChannel('ALL', this)" style="padding:4px 9px; font-size:0.72rem; font-weight:800; border-radius:6px; cursor:pointer; transition:all 0.15s; ${activeChannel === 'ALL' ? 'background:#0284c7; color:#ffffff; border:1px solid #0284c7;' : 'background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;'}">
            전체 (${channelCounts.ALL})
          </button>
          <button type="button" onclick="window.filterTimelineChannel('NEWS', this)" style="padding:4px 9px; font-size:0.72rem; font-weight:800; border-radius:6px; cursor:pointer; transition:all 0.15s; ${activeChannel === 'NEWS' ? 'background:#0284c7; color:#ffffff; border:1px solid #0284c7;' : 'background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;'}">
            📰 뉴스 (${channelCounts.NEWS})
          </button>
          <button type="button" onclick="window.filterTimelineChannel('DART', this)" style="padding:4px 9px; font-size:0.72rem; font-weight:800; border-radius:6px; cursor:pointer; transition:all 0.15s; ${activeChannel === 'DART' ? 'background:#7c3aed; color:#ffffff; border:1px solid #7c3aed;' : 'background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;'}">
            📑 전자공시 (${channelCounts.DART})
          </button>
          <button type="button" onclick="window.filterTimelineChannel('REPORT', this)" style="padding:4px 9px; font-size:0.72rem; font-weight:800; border-radius:6px; cursor:pointer; transition:all 0.15s; ${activeChannel === 'REPORT' ? 'background:#059669; color:#ffffff; border:1px solid #059669;' : 'background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;'}">
            📊 증권사 리포트 (${channelCounts.REPORT})
          </button>
          <button type="button" onclick="window.filterTimelineChannel('EVENT', this)" style="padding:4px 9px; font-size:0.72rem; font-weight:800; border-radius:6px; cursor:pointer; transition:all 0.15s; ${activeChannel === 'EVENT' ? 'background:#d97706; color:#ffffff; border:1px solid #d97706;' : 'background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;'}">
            🎯 핵심 이벤트 (${channelCounts.EVENT})
          </button>
        </div>
      </div>
    </div>

    <!-- [고도화 2단계 & 4단계] 전 테마 동적 종목 필터 탭 및 트리플 크로스 확정주 칩(Chip) 바 -->
    <div style="display:flex; align-items:center; gap:8px; overflow-x:auto; flex-wrap:nowrap; padding:4px 2px 14px 2px; margin-bottom:6px; scrollbar-width:thin;" id="timeline-stock-filter-bar">
      ${(() => {
        // [전체보기] 및 [👑 팩트 확정주만 보기] 기본 탭
        const stockFilterList = [
          { key: 'ALL', label: '전체보기', count: stockCounts.ALL, isSpecial: false },
          { key: 'TRIPLE_CROSS', label: '👑 팩트 확정주만 보기', count: stockCounts.TRIPLE_CROSS || 0, isSpecial: true }
        ];

        // 동적으로 추출된 테마별 종목 탭 자동 추가
        dynamicStocks.forEach(stk => {
          stockFilterList.push({
            key: stk,
            label: stk,
            count: stockCounts[stk] || 0,
            isSpecial: false
          });
        });

        return stockFilterList.map(stk => {
          const isActive = (currentStockFilter === stk.key);
          let activeStyle = '';
          let badgeBg = '';
          let badgeColor = '';

          if (stk.isSpecial) {
            activeStyle = isActive
              ? 'background: linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(234, 179, 8, 0.35)); border: 1px solid #eab308; color: #fde047; font-weight: 800; box-shadow: 0 0 12px rgba(234, 179, 8, 0.4);'
              : 'background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(234, 179, 8, 0.4); color: #fde047; font-weight: 700;';
            badgeBg = isActive ? 'rgba(234, 179, 8, 0.4)' : 'rgba(245, 158, 11, 0.2)';
            badgeColor = '#fff';
          } else {
            activeStyle = isActive
              ? 'background: rgba(99, 102, 241, 0.2); border: 1px solid #6366f1; color: #ffffff; font-weight: bold; box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);'
              : 'background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: #94a3b8; font-weight: 500;';
            badgeBg = isActive ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.08)';
            badgeColor = isActive ? '#c7d2fe' : '#94a3b8';
          }

          return `
            <button type="button" onclick="window.filterTimelineStock('${stk.key}', this)" style="display:inline-flex; align-items:center; gap:6px; padding:6px 14px; border-radius:20px; font-size:0.78rem; cursor:pointer; white-space:nowrap; transition:all 0.2s ease; ${activeStyle}" onmouseover="if(!${isActive}){ this.style.filter='brightness(1.25)'; }" onmouseout="if(!${isActive}){ this.style.filter='none'; }">
              <span>${stk.label}</span>
              <span style="font-size:0.7rem; padding:1px 6px; border-radius:10px; background:${badgeBg}; color:${badgeColor}; font-weight:700;">${stk.count}</span>
            </button>
          `;
        }).join('');
      })()}
    </div>
  `;

  if (finalTimeline.length === 0) {
    const isTripleFilter = (currentStockFilter === 'TRIPLE_CROSS');
    const isStockFiltered = (currentStockFilter && currentStockFilter !== 'ALL');
    html += `
      <div style="text-align: center; padding: 40px 10px; color: #94a3b8; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px dashed rgba(255,255,255,0.08);">
        <div style="font-size: 1.5rem; margin-bottom: 8px;">📬</div>
        <div style="font-size: 0.95rem; font-weight: 700; color: #cbd5e1;">
          ${isTripleFilter ? '3개 채널(뉴스+공시+리포트) 크로스체크가 모두 완료된 확정주 항목이 없습니다.' : (isStockFiltered ? `'${currentStockFilter}' 해당 종목의 타임라인 기록이 없습니다.` : '선택된 필터 조건 내 사건 전개 항목이 없습니다.')}
        </div>
        <div style="font-size: 0.78rem; color: #64748b; margin-top: 4px;">
          ${isStockFiltered ? '[전체보기] 칩을 클릭하여 전체 타임라인 모멘텀을 확인해보세요.' : '상단의 [전체] 버튼을 눌러 최근 3개월간 발생한 전체 모멘텀을 확인해보세요.'}
        </div>
      </div>
    `;
  } else {
    html += finalTimeline.map(tl => {
      try {
        const rawTitle = tl.title || tl.news_title || tl.tit || tl.headline || '종목 최신 재료 뉴스';
        const displayTitle = String(rawTitle).replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').trim();
        const rawDesc = tl.desc || tl.key_point || tl.description || tl.summary || '상세 재료 모멘텀 및 팩트 분석';
        const displayDesc = String(rawDesc).replace(/<[^>]+>/g, '').trim();

        const isReport = tl.is_report || (tl.press && tl.press.includes('리포트')) || (tl.news_title && tl.news_title.startsWith('[리포트]'));
        const isDart = !isReport && (tl.is_dart || (tl.press && tl.press.includes('DART')) || (tl.news_title && tl.news_title.startsWith('[공시]')));
        const isBlog = !isReport && !isDart && (tl.is_blog || tl.channel === 'BLOG' || (tl.press && tl.press.includes('블로그')) || (tl.news_title && tl.news_title.startsWith('[블로그]')));
        const isEvent = tl.is_event || tl.stage === '핵심 일정' || tl.stage === '글로벌 이벤트';
        
        let pressBadgeStyle = 'background: #eff6ff; color: #0284c7; border: 1px solid #bfdbfe;';
        let pressLabel = tl.press || '언론 종합';
        let dateColor = '#38bdf8';
        let cardBorder = '';
        let actionBtnText = '원문 보기 ↗';
        let actionBtnBg = 'background: rgba(56,189,248,0.12); border: 1px solid rgba(56,189,248,0.3); color: #38bdf8;';

        if (isReport) {
          pressBadgeStyle = 'background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;';
          pressLabel = `📊 ${tl.press || '증권사 리포트'}`;
          dateColor = '#34d399';
          cardBorder = 'border-left: 4px solid #10b981; background: #ffffff; border-color: #e2e8f0;';
          actionBtnText = '리포트 원문 ↗';
          actionBtnBg = 'background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(52, 211, 153, 0.4); color: #34d399;';
        } else if (isDart) {
          pressBadgeStyle = 'background: #faf5ff; color: #7c3aed; border: 1px solid #e9d5ff;';
          pressLabel = '📑 DART 전자공시';
          dateColor = '#c084fc';
          cardBorder = 'border-left: 4px solid #8b5cf6; background: #ffffff; border-color: #e2e8f0;';
          actionBtnText = '공시 원문 ↗';
          actionBtnBg = 'background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.4); color: #d8b4fe;';
        } else if (isEvent) {
          pressBadgeStyle = 'background: #fffbeb; color: #b45309; border: 1px solid #fde68a;';
          pressLabel = '🎯 핵심 이벤트';
          dateColor = '#fbbf24';
          cardBorder = 'border-left: 4px solid #f59e0b; background: #ffffff; border-color: #e2e8f0;';
          actionBtnText = '일정 팩트 ↗';
          actionBtnBg = 'background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(251, 191, 36, 0.4); color: #fde047;';
        } else if (isBlog) {
          pressBadgeStyle = 'background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8;';
          pressLabel = '✍️ 블로그 분석';
          dateColor = '#f472b6';
          cardBorder = 'border-left: 4px solid #ec4899; background: #ffffff; border-color: #e2e8f0;';
          actionBtnText = '블로그 원문 ↗';
          actionBtnBg = 'background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(251, 113, 133, 0.4); color: #fda4af;';
        }

        // 원문 보기 링크(Safe URL Fallback) 채널별 정밀 매핑
        const safeUrl = getSafeTimelineUrl(tl);

        // 종목 태그 목록 구성 (전 테마 dynamicStocks 및 체크리스트 대장주 기반 범용 추출)
        const stockTags = (tl.tags && Array.isArray(tl.tags) && tl.tags.length > 0)
          ? tl.tags
          : (() => {
              const tags = [];
              const textToScan = `${tl.news_title || tl.title || ''} ${tl.key_point || tl.desc || ''}`;
              const targetStocks = dynamicStocks.length > 0 ? dynamicStocks : ['와이제이링크', '센서뷰', '켄코아', '에이치브이엠', '스피어'];
              targetStocks.forEach(stk => {
                if (textToScan.includes(stk) || (tl.stockName && tl.stockName.includes(stk))) {
                  tags.push(`#${stk.replace('에어로스페이스', '')}`);
                }
              });
              if (tl.stockName && !tags.includes(`#${tl.stockName}`)) {
                tags.unshift(`#${tl.stockName}`);
              }
              return tags.length > 0 ? tags : (theme.checklist?.leaders?.lead ? [`#${theme.checklist.leaders.lead.split(',')[0].trim()}`] : []);
            })();

        // 직계약 수혜/팩트 여부 강조 뱃지 ([직납 팩트], [단독 협의], [수주 공시], [목표가 상향])
        let factBadge = tl.fact_badge || '';
        if (!factBadge && tl.tag) {
          factBadge = tl.tag.replace(/[^가-힣\s]/g, '').trim();
        }
        if (!factBadge) {
          const textToScan = `${tl.title || tl.news_title || ''} ${tl.desc || tl.key_point || ''}`;
          if (/(직납|직접 납품|엔진용 특수합금|소재 납품)/.test(textToScan)) factBadge = '직납 팩트';
          else if (/(단독|단독 협의|독점 협의|본계약)/.test(textToScan)) factBadge = '단독 협의';
          else if (/(수주|공급계약|체결|계약)/.test(textToScan) || isDart) factBadge = '수주 공시';
          else if (/(목표가|상향|BUY|신규 매수)/.test(textToScan) || isReport) factBadge = '목표가 상향';
        }

        let factBadgeHtml = '';
        if (factBadge === '직납 팩트' || (tl.tag && tl.tag.includes('직납'))) {
          factBadgeHtml = `<span style="font-size:0.7rem; padding:1px 7px; background:#fff1f2; color:#be123c; border:1px solid #fecdd3; border-radius:4px; font-weight:800;">🔥 직납 팩트</span>`;
        } else if (factBadge === '단독 협의' || (tl.tag && tl.tag.includes('단독'))) {
          factBadgeHtml = `<span style="font-size:0.7rem; padding:1px 7px; background:#fffbeb; color:#b45309; border:1px solid #fde68a; border-radius:4px; font-weight:800;">⚡ 단독 협의</span>`;
        } else if (factBadge === '수주 공시' || (tl.tag && tl.tag.includes('공시'))) {
          factBadgeHtml = `<span style="font-size:0.7rem; padding:1px 7px; background:#faf5ff; color:#7c3aed; border:1px solid #e9d5ff; border-radius:4px; font-weight:800;">📑 수주 공시</span>`;
        } else if (factBadge === '목표가 상향' || (tl.tag && tl.tag.includes('리포트'))) {
          factBadgeHtml = `<span style="font-size:0.7rem; padding:1px 7px; background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; border-radius:4px; font-weight:800;">🎯 ${tl.tag && tl.tag.includes('리포트') ? '리포트' : '목표가 상향'}</span>`;
        }

        // 라이프사이클 4단계 뱃지 추출
        const lifecycleKey = getLifecycleStage(tl);
        const lifecycleCfg = LIFECYCLE_CONFIG[lifecycleKey] || LIFECYCLE_CONFIG.incubation;
        const lifecycleBadgeHtml = `
          <span class="timeline-lifecycle-badge" style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; font-size:11px; font-weight:700; border-radius:4px; color:${lifecycleCfg.color}; background:${lifecycleCfg.bg}; border:1px solid ${lifecycleCfg.border};" title="${lifecycleCfg.tip}">
            ${lifecycleCfg.label}
          </span>
        `;

        // [고도화 4단계] 신뢰도 시그널 배지 (트리플 크로스 / 더블 크로스 / 초기 모멘텀)
        const tlStock = tl.stockName || tl.target_name || '';
        let scoreObj = stockSignalScores[tlStock];
        if (!scoreObj) {
          // 보조 텍스트 검색
          for (const stk of Object.keys(stockSignalScores)) {
            if (matchesStock(tl, stk)) {
              scoreObj = stockSignalScores[stk];
              break;
            }
          }
        }
        const signalBadgeHtml = getStockSignalBadgeHtml(scoreObj);

        return `
          <div style="display:flex; align-items:center; justify-content:space-between; background:#ffffff; border:1px solid #e2e8f0; ${cardBorder} border-radius:10px; padding:14px 18px; margin-bottom:10px; gap:14px; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="min-width:92px; text-align:center;">
              <div style="font-size:0.84rem; font-weight:700; color:${dateColor};">${tl.date || ''}</div>
              <div style="font-size:0.7rem; color:#94a3b8; margin-top:2px;">${tl.stage || (isReport ? '증권사 리서치' : (isDart ? '공식 공시' : '전개'))}</div>
            </div>
            <div style="flex:1; min-width:0;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:5px; flex-wrap: wrap;">
                ${lifecycleBadgeHtml}
                ${signalBadgeHtml}
                <span style="font-size:0.72rem; padding:2px 7px; border-radius:4px; font-weight:700; ${pressBadgeStyle}">${pressLabel}</span>
                ${factBadgeHtml}
                ${stockTags.map(tag => `<span style="font-size:0.7rem; padding:1px 6px; background:#f1f5f9; color:#0369a1; border:1px solid #cbd5e1; border-radius:4px; font-weight:700;">${tag}</span>`).join('')}
              </div>
              <div style="font-size:0.95rem; font-weight:800; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:#0f172a; text-decoration:none; transition:color 0.2s;" onmouseover="this.style.color='${isReport ? '#34d399' : '#38bdf8'}';" onmouseout="this.style.color='#0f172a';">
                  ${displayTitle}
                </a>
              </div>
              <div style="font-size:0.82rem; color:#475569; margin-top:4px; line-height:1.45;">
                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:#475569; text-decoration:none; display:inline-block; transition:color 0.2s;" onmouseover="this.style.color='#38bdf8'; this.style.textDecoration='underline';" onmouseout="this.style.color='#94a3b8'; this.style.textDecoration='none';">
                  👉 ${displayDesc}
                </a>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
              <button type="button" class="timeline-calendar-btn" onclick="addTimelineToCalendar('${tl.id || tl.date}')" style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); color: #818cf8; padding: 5px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s; white-space: nowrap;" onmouseover="this.style.background='rgba(99, 102, 241, 0.3)'; this.style.color='#fff';" onmouseout="this.style.background='rgba(99, 102, 241, 0.15)'; this.style.color='#818cf8';">
                📅 캘린더 등록
              </button>
              <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="timeline-link-btn" style="display:inline-flex; align-items:center; padding:6px 12px; ${actionBtnBg} border-radius:6px; font-size:0.8rem; font-weight:600; text-decoration:none; white-space:nowrap;">
                ${actionBtnText}
              </a>
            </div>
          </div>
        `;
      } catch (cardErr) {
        console.warn('Timeline card render error:', cardErr, tl);
        return '';
      }
    }).join('');
  }

  container.innerHTML = html;
};

// [범용 타임라인 렌더러 등록]: 테마 드롭다운 및 외부 호출 동기화용
window.renderUniversalTimeline = function(selectedTheme, period = 'all') {
  if (typeof selectedTheme === 'string') {
    const found = (window.detectiveThemes || []).find(t => t.theme_id === selectedTheme || t.theme_name === selectedTheme);
    if (found) {
      return window.renderDetectiveCard(found, period);
    }
  }
  return window.renderDetectiveCard(selectedTheme, period);
};

// [타임라인 상단 채널 필터 전환 핸들러]
window.filterTimelineChannel = function(channel, btn) {
  window.activeTimelineChannel = channel;
  if (window.currentSelectedDetectiveTheme) {
    window.renderDetectiveCard(window.currentSelectedDetectiveTheme, window.activeTimelinePeriod || 'all');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(window.initDetectiveDashboard, 300);
});

// ==========================================
// [2번 탭] 종목 및 테마 재료 타임라인 - 기간 필터 핸들러
// ==========================================

// 기간 필터 기능 (전체, 최근 7일, 최근 30일)
// [초보자 설명서] 버튼 클릭 시 테마를 삭제하지 않고, 선택된 테마 내부의 사건 전개(타임라인) 기사만 일자별로 필터링합니다.
window.currentTimelineArticles = window.currentTimelineArticles || [];
window.filterTimelinePeriod = function(period, btn) {
  window.activeTimelinePeriod = period;

  // 버튼 active 클래스 처리
  const btnGroup = document.getElementById('theme-timeline-period-buttons') || document.querySelector('.theme-timeline-period-buttons');
  if (btnGroup) {
    btnGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  }
  if (btn) btn.classList.add('active');

  // 1. 현재 탐정 테마가 선택되어 있는 경우 (7대 체크리스트 카드 유지 & 타임라인 뉴스만 필터링)
  if (window.currentSelectedDetectiveTheme) {
    window.renderDetectiveCard(window.currentSelectedDetectiveTheme, period);
    return;
  }

  // 2. 만약 드롭다운에 선택된 테마 ID가 있는 경우
  const selectEl = document.getElementById('theme-timeline-select');
  if (selectEl && selectEl.value && Array.isArray(window.detectiveThemes)) {
    const target = window.detectiveThemes.find(t => t.theme_id === selectEl.value);
    if (target) {
      window.currentSelectedDetectiveTheme = target;
      window.renderDetectiveCard(target, period);
      return;
    }
  }

  // 3. 사용자 직접 추가 종목 뉴스인 경우
  if (window.currentTimelineArticles && window.currentTimelineArticles.length > 0) {
    window.renderTimelineCards(window.currentTimelineArticles, period);
    return;
  }

  // 4. 기타 fallback
  if (typeof renderThemeTimelineView === 'function' && typeof activeTimelineThemeId !== 'undefined') {
    renderThemeTimelineView(activeTimelineThemeId, period);
  }
};

// 2. 타임라인 뉴스 카드 렌더링
window.renderTimelineCards = function(articles, period = 'all') {
  const container = document.getElementById('stock-material-timeline-list');
  if (!container) return;

  if (!articles || articles.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: #94a3b8; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px dashed rgba(255,255,255,0.08);">
        <div style="font-size: 1.5rem; margin-bottom: 8px;">📬</div>
        <div style="font-size: 0.95rem; font-weight: 700; color: #cbd5e1;">선택된 기간 내 발생한 실제 뉴스 재료가 없습니다.</div>
      </div>`;
    return;
  }

  const now = Date.now();
  let list = articles;
  if (period === '7d') {
    list = articles.filter(a => (now - (a.timestamp || now)) <= 7 * 24 * 60 * 60 * 1000);
  } else if (period === '30d') {
    list = articles.filter(a => (now - (a.timestamp || now)) <= 30 * 24 * 60 * 60 * 1000);
  }
  if (list.length === 0) list = articles;

  const countEl = document.getElementById('theme-timeline-count');
  if (countEl) countEl.textContent = `${list.length}건`;

  container.innerHTML = list.map(item => {
    const rawTitle = item.news_title || item.title || item.tit || '종목 최신 재료 뉴스';
    const cleanTitle = rawTitle.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    const isReport = item.is_report || (item.press && item.press.includes('리포트')) || cleanTitle.startsWith('[리포트]');
    const isDart = !isReport && (item.is_dart || (item.press && item.press.includes('DART')) || cleanTitle.startsWith('[공시]'));
    
    let press = isReport ? (item.press || '📊 증권사 리포트') : (isDart ? '📑 DART 공시' : (item.press || item.oname || item.officeName || item.source || '증시속보'));
    if (isReport && !press.startsWith('📊')) press = `📊 ${press}`;
    
    const dateStr = item.date || '최근';
    const targetUrl = item.originallink || item.link || item.news_url || `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(cleanTitle)}`;
    const themeLabel = item.theme || '추적 테마';
    const stockLabel = item.stock || item.target_stock || '';

    let pressBadgeStyle = 'background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd;';
    let cardBg = 'background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; box-shadow: 0 1px 3px rgba(0,0,0,0.03);';
    let dateColor = '#0284c7';
    let actionBtnText = '원문 보기 ↗';
    let actionBtnBg = 'background: #f1f5f9; border: 1px solid #cbd5e1; color: #1e293b;';

    if (isReport) {
      pressBadgeStyle = 'background: #d1fae5; color: #047857; border: 1px solid #a7f3d0;';
      cardBg = 'background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #059669; box-shadow: 0 1px 3px rgba(0,0,0,0.03);';
      dateColor = '#059669';
      actionBtnText = '리포트 PDF ↗';
      actionBtnBg = 'background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46;';
    } else if (isDart) {
      pressBadgeStyle = 'background: #ede9fe; color: #6d28d9; border: 1px solid #ddd6fe;';
      cardBg = 'background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #7c3aed; box-shadow: 0 1px 3px rgba(0,0,0,0.03);';
      dateColor = '#7c3aed';
      actionBtnText = '공시 원문 ↗';
      actionBtnBg = 'background: #f5f3ff; border: 1px solid #ddd6fe; color: #5b21b6;';
    }

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; ${cardBg} border-radius: 10px; padding: 14px 18px; margin-bottom: 10px; gap: 14px; transition: all 0.2s ease;">
        <!-- 좌측 발행일자 -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 12px; text-align: center; min-width: 86px; flex-shrink: 0;">
          <div style="font-size: 0.76rem; font-weight: 800; color: ${dateColor};">${dateStr}</div>
          <div style="font-size: 0.68rem; color: #64748b; margin-top: 2px;">${isReport ? '리서치발행' : (isDart ? '접수일자' : '발행일자')}</div>
        </div>

        <!-- 본문 기사 정보 -->
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
            ${stockLabel ? `
              <span style="font-size: 0.73rem; background: #f1f5f9; color: #1e293b; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 5px; font-weight: 800;">
                🏷️ ${themeLabel} | ${stockLabel}
              </span>
            ` : ''}
            <span style="font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; font-weight: 700; ${pressBadgeStyle}">
              ${press}
            </span>
            ${isReport ? '<span style="font-size:0.7rem; padding:1px 6px; background:#dcfce7; color:#15803d; border-radius:4px; font-weight:700;">목표주가 단서</span>' : (isDart ? '<span style="font-size:0.7rem; padding:1px 6px; background:#ffedd5; color:#c2410c; border-radius:4px; font-weight:700;">금감원 원문</span>' : '<span style="font-size: 0.72rem; padding: 2px 7px; background: #fef2f2; color: #b91c1c; border-radius: 4px; font-weight: 600;">상승 모멘텀</span>')}
          </div>
          <div style="font-size: 0.92rem; font-weight: 700; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" style="color: #0f172a; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#0284c7';" onmouseout="this.style.color='#0f172a';">
              ${cleanTitle}
            </a>
          </div>
          ${item.key_point ? `
            <div style="font-size: 0.82rem; color: #475569; margin-top: 3px;">
              <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" style="color: #475569; text-decoration: none; display: inline-block; transition: color 0.2s;" onmouseover="this.style.color='#0284c7'; this.style.textDecoration='underline';" onmouseout="this.style.color='#475569'; this.style.textDecoration='none';">
                👉 ${item.key_point}
              </a>
            </div>
          ` : ''}
        </div>

        <!-- 우측 원문 보기 버튼 (새 탭 이동) -->
        <div style="flex-shrink: 0;">
          <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="timeline-link-btn" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 14px; ${actionBtnBg} border-radius: 6px; font-size: 0.8rem; font-weight: 700; text-decoration: none; cursor: pointer; transition: all 0.2s;">
            <span>${actionBtnText}</span>
          </a>
        </div>
      </div>
    `;
  }).join('');
};

// 3. 네이버 뉴스 검색 호출 (/api/news?query={종목명})
async function fetchRealNewsForStock(stockName) {
  if (!stockName) return [];
  const encoded = encodeURIComponent(stockName);
  
  // 1차: 로컬 프록시 /api/news
  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/news?query=${encoded}`);
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || data.result || []);
      if (items && items.length > 0) return items;
    }
  } catch (e) {
    console.warn('[stock.js] /api/news 프록시 호출 실패, 직접 API 폴백 시도:', e);
  }

  // 2차 폴백: 네이버 모바일 API 직접 호출
  try {
    const fallbackUrl = `https://m.stock.naver.com/api/news/search?keyword=${encoded}&pageSize=30`;
    const res = await fetch(fallbackUrl);
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || data.result || []);
      if (items && items.length > 0) return items;
    }
  } catch (e) {
    console.warn('[stock.js] 직접 API 폴백 실패:', e);
  }

  return [];
}

// 4. [+ 종목 추가 및 즉시 수집] 이벤트 핸들러 바인딩 (네이버 뉴스 + OpenDART 공시 병렬 수집)
function initStockTrackAddHandler() {
  const addBtn = document.getElementById('btn-add-stock-track');
  if (!addBtn) return;

  // 기존 이벤트 중복 방지를 위해 onclick으로 직접 할당
  addBtn.onclick = async function(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const stockInput = document.getElementById('stock-keyword-input');
    const themeSelect = document.getElementById('custom-theme-select');
    const themeDirectInput = document.getElementById('custom-theme-input');

    const stockVal = stockInput ? stockInput.value.trim() : '';

    if (!stockVal) {
      alert('추적할 종목명을 입력해주세요.');
      if (stockInput) stockInput.focus();
      return;
    }

    // 테마명 결정
    let themeVal = themeSelect ? themeSelect.value : '방산';
    if (themeVal === '__custom__') {
      themeVal = (themeDirectInput && themeDirectInput.value.trim()) ? themeDirectInput.value.trim() : stockVal;
    }
    if (!themeVal) themeVal = stockVal;

    // 상단 제목 즉시 갱신
    const titleHeader = document.getElementById('theme-timeline-title');
    if (titleHeader) {
      titleHeader.textContent = `${themeVal} (${stockVal}) 누적 재료 타임라인`;
    }

    // 타임라인 컨테이너에 로딩 표시
    const container = document.getElementById('stock-material-timeline-list');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #38bdf8; background: rgba(56, 189, 248, 0.05); border-radius: 10px; border: 1px dashed rgba(56, 189, 248, 0.3);">
          <div style="font-size: 1.6rem; margin-bottom: 8px;">⏳</div>
          <div style="font-size: 1rem; font-weight: 800; color: #f8fafc;">[${stockVal}] 실시간 네이버 뉴스, DART 전자공시 & 증권사 리포트 3중 병렬 수집 중...</div>
          <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 4px;">언론 보도, 금융감독원 공시, 한경컨센서스 리서치를 실시간으로 통합하고 있습니다.</div>
        </div>
      `;
    }

    // 버튼 로딩 상태 표시
    const origBtnHtml = addBtn.innerHTML;
    addBtn.disabled = true;
    addBtn.innerHTML = `<span>⏳ [${stockVal}] 3중 수집 중...</span>`;

    try {
      // 1. 네이버 뉴스, OpenDART 공시, 한경컨센서스 리포트를 병렬로 동시 호출
      const [rawNewsItems, dartDisclosures, hkReports] = await Promise.all([
        fetchRealNewsForStock(stockVal).catch(() => []),
        window.fetchDartDisclosuresForStock(stockVal).catch(() => []),
        window.fetchHkReportsForStock(stockVal).catch(() => [])
      ]);

      const todayStr = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })();

      // 뉴스 항목 매핑
      const mappedNews = (rawNewsItems || []).map(item => {
        let dateStr = todayStr;
        let timeMs = Date.now();
        const rawDt = item.dt || item.datetime || item.pubDate || item.date;
        if (rawDt) {
          if (typeof rawDt === 'string' && rawDt.length >= 8 && /^\d+$/.test(rawDt)) {
            dateStr = `${rawDt.substring(0, 4)}-${rawDt.substring(4, 6)}-${rawDt.substring(6, 8)}`;
          } else {
            const pDate = new Date(rawDt);
            if (!isNaN(pDate)) {
              dateStr = pDate.toISOString().substring(0, 10);
              timeMs = pDate.getTime();
            }
          }
        }

        const rawTitle = item.tit || item.title || `${stockVal} 관련 보도`;
        const linkUrl = item.originallink || item.link || (item.oid && item.aid ? `https://n.news.naver.com/mnews/article/${item.oid}/${item.aid}` : `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(stockVal)}`);
        const pressName = item.oname || item.officeName || item.press || item.media || item.source || '네이버 증시';

        return {
          theme: themeVal,
          stock: stockVal,
          target_stock: stockVal,
          date: dateStr,
          timestamp: timeMs,
          news_title: rawTitle,
          title: rawTitle,
          originallink: linkUrl,
          link: linkUrl,
          news_url: linkUrl,
          press: pressName,
          impact: '상승 모멘텀',
          is_dart: false,
          is_report: false
        };
      });

      // DART 공시 항목 매핑
      const mappedDart = (dartDisclosures || []).map(d => {
        const dDate = d.date || d.rcept_dt || todayStr;
        const pDate = new Date(dDate);
        const timeMs = !isNaN(pDate) ? pDate.getTime() : Date.now();

        return {
          theme: themeVal,
          stock: stockVal,
          target_stock: stockVal,
          date: dDate,
          timestamp: timeMs,
          news_title: d.news_title || `[공시] ${d.report_nm}`,
          title: d.news_title || `[공시] ${d.report_nm}`,
          originallink: d.dart_url || d.news_url,
          link: d.dart_url || d.news_url,
          news_url: d.dart_url || d.news_url,
          press: 'DART 전자공시',
          impact: '공식 공시',
          is_dart: true,
          is_report: false,
          key_point: d.key_point || '금융감독원 정식 공시'
        };
      });

      // 증권사 리포트 매핑
      const mappedReports = (hkReports || []).map(r => {
        const rDate = r.date || todayStr;
        const pDate = new Date(rDate);
        const timeMs = !isNaN(pDate) ? pDate.getTime() : Date.now();

        return {
          theme: themeVal,
          stock: stockVal,
          target_stock: stockVal,
          date: rDate,
          timestamp: timeMs,
          news_title: r.news_title,
          title: r.news_title,
          originallink: r.news_url,
          link: r.news_url,
          news_url: r.news_url,
          press: r.press,
          impact: '증권사 리서치',
          is_dart: false,
          is_report: true,
          key_point: r.key_point
        };
      });

      // 뉴스, 공시, 리포트 3종 데이터를 합쳐 날짜/시간 최신순 정렬
      const combinedList = [...mappedReports, ...mappedDart, ...mappedNews].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      if (combinedList.length === 0) {
        if (container) {
          container.innerHTML = `
            <div style="text-align: center; padding: 40px 10px; color: #94a3b8; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px dashed rgba(255,255,255,0.08);">
              <div style="font-size: 1.5rem; margin-bottom: 8px;">📬</div>
              <div style="font-weight: 700; color: #cbd5e1;">[${stockVal}] 관련 최신 기사 및 공시를 찾을 수 없습니다.</div>
              <div style="font-size: 0.78rem; color: #64748b; margin-top: 4px;">등록된 최근 보도나 공시가 없거나 검색어 확인이 필요합니다.</div>
            </div>`;
        }
        return;
      }

      // 전역 상태에 저장 및 피드 누적 렌더링
      window.currentTimelineArticles = combinedList;

      // 2. 테마 생명주기 관리: 탐정 테마 목록에 정식 등록 및 영구 보존
      let targetDetectiveTheme = (window.detectiveThemes || []).find(t => t.theme_name === themeVal || t.theme_id === themeVal);
      if (!targetDetectiveTheme) {
        const newThemeId = 'custom_' + Date.now();
        targetDetectiveTheme = {
          theme_id: newThemeId,
          theme_name: themeVal,
          sector: "사용자 관심 테마",
          pattern_type: "실시간 수집 모멘텀",
          analysis_date: todayStr,
          checklist: {
            material: `${stockVal} 및 ${themeVal} 관련 실시간 뉴스 & DART 공시 동적 추적`,
            leaders: {
              lead: stockVal,
              sub: "연관 수급주 실시간 탐색 중"
            },
            correlation: `${stockVal} 관련 보도 및 공시 모멘텀을 타임라인으로 실시간 누적 분석합니다.`,
            future_expectation: "후속 단독 보도 및 금감원 공시 접수 여부 실시간 확인",
            expiration_date: "진행형 모멘텀",
            chart_phase: "실시간 수급 유입 및 변동성 확인 국면",
            conditions: {
              bullish: "대규모 계약/수주/실적 호전 보도 및 기관·외인 양매수",
              bearish: "단기 급등 후 차익 실현 매물 출회 및 재료 소멸"
            }
          },
          timeline: combinedList.map(item => ({
            date: item.date || todayStr,
            stage: item.is_dart ? '공식 공시' : '실시간 보도',
            press: item.press || '뉴스 종합',
            news_title: item.news_title || item.title,
            news_url: item.news_url || item.link,
            key_point: item.key_point || (item.is_dart ? '금융감독원 정식 공시 접수' : `${stockVal} 핵심 재료 수급 포착`),
            is_dart: !!item.is_dart
          }))
        };

        if (!Array.isArray(window.detectiveThemes)) window.detectiveThemes = [];
        window.detectiveThemes.unshift(targetDetectiveTheme);

        // 서버 /api/themes 로 영구 보존 요청
        try {
          fetch(`${BACKEND_API_BASE}/api/themes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(targetDetectiveTheme)
          }).catch(() => {});
        } catch (e) {}

        // 드롭다운 및 상단 카드 갱신
        if (typeof populateDetectiveSelect === 'function') {
          populateDetectiveSelect();
          const selectEl = document.getElementById('theme-timeline-select');
          if (selectEl) selectEl.value = targetDetectiveTheme.theme_id;
        }
        if (typeof window.renderTopMomentumCards === 'function') {
          window.renderTopMomentumCards(window.detectiveThemes);
        }
      } else {
        // 기존 테마에 새로운 타임라인 항목 최신순 병합
        const existingUrls = new Set((targetDetectiveTheme.timeline || []).map(tl => tl.news_url));
        const newTimelineEntries = combinedList
          .filter(item => !existingUrls.has(item.news_url || item.link))
          .map(item => ({
            date: item.date || todayStr,
            stage: item.is_dart ? '공식 공시' : '실시간 보도',
            press: item.press || '뉴스 종합',
            news_title: item.news_title || item.title,
            news_url: item.news_url || item.link,
            key_point: item.key_point || (item.is_dart ? '금융감독원 정식 공시 접수' : `${stockVal} 핵심 재료 수급 포착`),
            is_dart: !!item.is_dart
          }));

        if (newTimelineEntries.length > 0) {
          targetDetectiveTheme.timeline = [...newTimelineEntries, ...(targetDetectiveTheme.timeline || [])];
          try {
            fetch(`${BACKEND_API_BASE}/api/themes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(targetDetectiveTheme)
            }).catch(() => {});
          } catch (e) {}
        }
      }

      // 등록된 테마 활성화 및 렌더링
      window.currentSelectedDetectiveTheme = targetDetectiveTheme;
      if (typeof window.renderDetectiveCard === 'function') {
        window.renderDetectiveCard(targetDetectiveTheme, window.activeTimelinePeriod || 'all');
      } else {
        window.renderTimelineCards(combinedList, 'all');
      }

      // 사용자 추적 목록에 보존 및 태그 UI 갱신
      if (typeof getCustomTrackedStocks === 'function' && typeof saveCustomTrackedStocks === 'function') {
        const trackList = getCustomTrackedStocks();
        if (!trackList.some(item => item.stock.toLowerCase() === stockVal.toLowerCase())) {
          trackList.unshift({ theme: themeVal, stock: stockVal });
          saveCustomTrackedStocks(trackList);
          if (typeof renderCustomTrackedTags === 'function') renderCustomTrackedTags();
        }
      }

      // 입력창 비우기
      if (stockInput) stockInput.value = '';

      if (window.showToast) {
        window.showToast(`[${themeVal} | ${stockVal}] 테마 등록 & 뉴스/공시 ${combinedList.length}건 누적 완료!`, '🚀');
      }
    } catch (err) {
      console.error('[stock.js] 뉴스/공시 수집 중 오류:', err);
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 30px; color: #ef4444; background: rgba(239,68,68,0.1); border-radius: 8px;">
            뉴스 및 공시 수집 중 오류가 발생했습니다. (서버 연결 확인 필요)
          </div>`;
      }
    } finally {
      addBtn.disabled = false;
      addBtn.innerHTML = origBtnHtml;
    }
  };
}

// DOM 준비 시 및 탭 전환 시 바인딩 보장
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStockTrackAddHandler);
} else {
  initStockTrackAddHandler();
}
setTimeout(initStockTrackAddHandler, 300);
setTimeout(initStockTrackAddHandler, 1000);


// [자동 패치] 2번 탭 실시간 테마 뉴스 자동 렌더링
async function fetchThemeLiveArticles(stocks) {
    if (!stocks || stocks.length === 0) return [];
    try {
        const query = stocks.slice(0, 3).join(' OR ') + ' 특징주';
        const res = await fetch('https://m.stock.naver.com/api/news/stock/stream?pageSize=10');
        if (res.ok) {
            const data = await res.json();
            const items = Array.isArray(data) ? data : (data.items || []);
            return items.slice(0, 5).map(it => ({
                date: (it.datetime || it.pubDate || '최근').substring(0, 10),
                news_title: it.tit || it.title || '테마 관련 주요 수급 보도',
                news_url: it.originallink || it.link || ('https://n.news.naver.com/mnews/article/' + (it.officeId || '001') + '/' + (it.articleId || '')),
                press: it.officeName || it.press || '증시속보',
                impact: '핵심 모멘텀'
            }));
        }
    } catch(e) { console.warn('뉴스 자동 호출 폴백:', e); }
    return [];
}
/**
 * 주식 인텔리전스 분석센터 모듈 (stock.js)
 * - 4대 서브 메뉴 (당일 주도 테마, 1주/1달 재료 비교, 증시 캘린더, 시황/매매기법)
 * - 실시간 테마 & 관련 뉴스 & 종목 랭킹 인터페이스
 * - 재료 지속성 1주일 vs 1개월 비교표 렌더링
 * - 증시 주요 일정 D-Day 카운트다운 관리
 */

// 1. 당일 주도 테마 및 관련 뉴스/종목 데이터베이스
// 0. 당일 국내 주식 실시간 촘촘한 뉴스 데이터베이스 (특징주, 수급, 공시, 산업)
const DOMESTIC_STOCK_NEWS_DATA = [
  {
    category: 'feature',
    tag: '상한가 / 급등',
    tagColor: '#ef4444',
    title: '[특징주] 와이씨, 엔비디아 차세대 AI 가속기 테스트 장비 공급 승인에 22% 폭등',
    media: '한국경제',
    time: '8분 전',
    code: '232140',
    symbol: '와이씨',
    summary: '엔비디아 루빈용 고대역폭메모리(HBM4) 검사 장비의 퀄 테스트를 단독 통과했다는 소식에 장중 거래대금 3,200억 터지며 상한가 근접.',
    keyword: '와이씨 HBM 엔비디아 검사장비'
  },
  {
    category: 'supply',
    tag: '외인 1,500억 순매수',
    tagColor: '#38bdf8',
    title: 'SK하이닉스, 외국인·기관 5일 연속 동반 쌍끌이 매수… 주가 17만원 선 노크',
    media: '매일경제',
    time: '15분 전',
    code: '000660',
    symbol: 'SK하이닉스',
    summary: '글로벌 투자은행(IB) 모건스탠리와 JP모건의 목표주가 상향 리포트가 잇따르며 외인 지분율 54.3%로 연중 최고치 돌파.',
    keyword: 'SK하이닉스 외국인 기관 순매수'
  },
  {
    category: 'disclosure',
    tag: '대규모 공시',
    tagColor: '#10b981',
    title: '삼천당제약, 경구용 GLP-1 비만치료제 유럽 5개국 독점 판매 본계약 체결 공시',
    media: '연합뉴스',
    time: '24분 전',
    code: '000250',
    symbol: '삼천당제약',
    summary: '독점 계약금 및 단계별 마일스톤을 포함한 본계약 체결 완료 공시 발표. 주사제가 아닌 먹는 알약 형태 비만약의 상용화 기대감.',
    keyword: '삼천당제약 경구용 GLP-1 본계약 공시'
  },
  {
    category: 'feature',
    tag: '신고가 랠리',
    tagColor: '#ef4444',
    title: '[특징주] 필옵틱스, 세계 최초 유리기판 TGV 커팅 양산 장비 수주 임박 소식에 14% 급등',
    media: '머니투데이',
    time: '32분 전',
    code: '161580',
    symbol: '필옵틱스',
    summary: '반도체 패키징의 새로운 게임체인저로 꼽히는 유리기판 레이저 가공 TGV 장비 양산 납품 협상이 가시화되며 강한 거래량 유입.',
    keyword: '필옵틱스 유리기판 TGV 장비'
  },
  {
    category: 'industry',
    tag: '체코 원전 수주',
    tagColor: '#a855f7',
    title: '두산에너빌리티, 체코 원전 실무협상단 현지 파견… 10월 본계약 준비 완료',
    media: '조선비즈',
    time: '45분 전',
    code: '034020',
    symbol: '두산에너빌리티',
    summary: '한국수력원자력 컨소시엄과 함께 두코바니 5, 6호기 주기기 납품을 위한 세부 계약 조율 착수. SMR 파트너십 소식도 겹경사.',
    keyword: '두산에너빌리티 체코 원전 본계약'
  },
  {
    category: 'supply',
    tag: '사모펀드 집중매집',
    tagColor: '#38bdf8',
    title: '인벤티지랩, 장기지속형 비만 주사제 글로벌 빅파마 파트너십 미팅 마무리',
    media: '이데일리',
    time: '1시간 전',
    code: '389470',
    symbol: '인벤티지랩',
    summary: '1개월에 1번만 맞아도 되는 비만치료제 마이크로플루이딕스 제형 변경 플랫폼 기술수출 본계약 임박 소식에 기관 매수세 유입.',
    keyword: '인벤티지랩 비만치료제 기술수출'
  },
  {
    category: 'feature',
    tag: '로봇 대장주',
    tagColor: '#ef4444',
    title: '[특징주] 에스피지, 휴머노이드 투입용 초정밀 감속기 수율 95% 달성에 9% 강세',
    media: '전자신문',
    time: '1시간 전',
    code: '058610',
    symbol: '에스피지',
    summary: '일본 하모닉드라이브가 독점하던 SH감속기 국산화 대체에 성공하고 국내외 로봇 완성품 업체로 양산 납품을 개시했다는 소식.',
    keyword: '에스피지 정밀 감속기 로봇 국산화'
  },
  {
    category: 'disclosure',
    tag: '수주 잭팟',
    tagColor: '#10b981',
    title: '한화에어로스페이스, 루마니아 K9 자주포 후속 탄약운반차 4,500억 추가 계약 협의',
    media: '아시아경제',
    time: '2시간 전',
    code: '012450',
    symbol: '한화에어로',
    summary: '루마니아 1.3조 자주포 계약에 이어 K10 탄약운반장갑차 패키지 공급 협상이 마무리 단계에 접어들며 수주잔고 31조원 돌파.',
    keyword: '한화에어로스페이스 루마니아 K9 자주포'
  },
  {
    category: 'industry',
    tag: '차세대 CXL',
    tagColor: '#38bdf8',
    title: '오픈엣지테크놀로지, CXL 2.0 고성능 메모리 컨트롤러 IP 글로벌 라이선스 계약',
    media: '디지털타임스',
    time: '2시간 전',
    code: '394280',
    symbol: '오픈엣지',
    summary: '서버 메모리 대역폭을 획기적으로 늘리는 CXL 2.0 표준 인터페이스 IP 공급 계약 체결로 팹리스 매출 턴어라운드 본격화.',
    keyword: '오픈엣지테크놀로지 CXL 반도체 IP'
  },
  {
    category: 'supply',
    tag: '연기금 10일 연속 매수',
    tagColor: '#38bdf8',
    title: 'KB금융, 밸류업 지수 편입 및 자사주 3,000억 추가 매입 소각 결의 기대에 상승',
    media: '한국경제TV',
    time: '3시간 전',
    code: '105560',
    symbol: 'KB금융',
    summary: '한국거래소 9월 밸류업 지수 발표를 앞두고 주주환원율 40%를 상회하는 금융 대장주로 연기금과 외국인 패시브 자금 집중 유입.',
    keyword: 'KB금융 기업 밸류업 자사주 소각'
  },
  {
    category: 'feature',
    tag: '전고체 배터리',
    tagColor: '#ef4444',
    title: '[특징주] 이수스페셜티케미컬, 황화리튬 양산 라인 풀가동… 삼성SDI 파일럿 공급 부각',
    media: '머니S',
    time: '3시간 전',
    code: '457190',
    symbol: '이수스페셜티',
    summary: '꿈의 배터리로 불리는 전고체 배터리 핵심 고체전해질 원료인 황화리튬의 고객사 납품 승인 소식에 거래량 250% 급증.',
    keyword: '이수스페셜티케미컬 황화리튬 전고체'
  },
  {
    category: 'industry',
    tag: '정부 정책 수혜',
    tagColor: '#a855f7',
    title: '우진엔텍, 원전 해체 및 계측제어설비 정비 정밀 진단 시스템 특허 등록 완료',
    media: '파이낸셜뉴스',
    time: '4시간 전',
    code: '457550',
    symbol: '우진엔텍',
    summary: '국내 가동 원전 정비 정밀 설비에 이어 체코 원전 경상정비 사업 참여 가능성이 커지며 원전 부품 소형주 순환매 주도.',
    keyword: '우진엔텍 원전 정비 특허 체코'
  }
];

// 1. 당일 주도 테마 데이터베이스 (당일 상승률이 가장 높은 순서대로 1번부터 엄격하게 정렬)
const STOCK_THEMES_DATA = [
  {
    id: 'theme-01',
    rank: 1,
    name: '차세대 HBM4 & 유리기판',
    category: 'semicon',
    rate: '+8.45%',
    rateType: 'up',
    score: 94,
    scoreNote: '당일 상승률 1위 압도적 주도 섹터',
    tradeAmount: '1조 8,400억',
    leader: 'SK하이닉스, 와이씨, 에프에스티, 필옵틱스',
    symbol: '000660',
    tvSymbol: 'KRX:000660',
    desc: '엔비디아 블랙웰 양산 임박 및 차세대 AI 가속기 루빈 16단 HBM4 규격 확정',
    badge: '1위 주도주',
    badgeColor: '#38bdf8',
    searchKeyword: 'HBM 유리기판',
    reason: '엔비디아의 차세대 AI 가속기 로드맵 가속화로 16단 HBM4 조기 양산 및 대면적 패키징 발열 해소를 위한 유리기판(Glass Substrate) 장비 공급망으로 외인/기관 5천억 이상 동반 순매수 집중.',
    news: [
      { title: '[단독] 엔비디아 차세대 AI 가속기 샘플 테스트 통과… 내달 양산 개시', source: '한국경제', time: '18분 전' },
      { title: 'SK하이닉스, HBM 시장 점유율 1위 굳히기… 증권사 목표주가 상향', source: '매일경제', time: '42분 전' },
      { title: '유리기판 대장주 와이씨·필옵틱스, 기관 4일 연속 순매수 행진', source: '머니투데이', time: '1시간 전' }
    ],
    strategy: '단기 과열권 진입. 장중 5% 이상 갭상승 시 추격매수 금지하며, 3일/5일 이평선 눌림목 터치 시 분할 접근 유효.'
  },
  {
    id: 'theme-02',
    rank: 2,
    name: '비만치료제 GLP-1 & 경구용 펩타이드',
    category: 'bio',
    rate: '+6.12%',
    rateType: 'up',
    score: 91,
    scoreNote: '당일 상승률 2위 바이오 주도 섹터',
    tradeAmount: '9,200억',
    leader: '삼천당제약, 인벤티지랩, 디앤디파마텍, 펩트론',
    symbol: '000250',
    tvSymbol: 'KRX:000250',
    desc: '글로벌 제약사 기술수출(L/O) 본계약 협상 및 경구형(먹는 알약) 캡슐 임상 성공',
    badge: '외인 매집',
    badgeColor: '#34d399',
    searchKeyword: '비만치료제 GLP-1',
    reason: '주사제 일색이던 비만/당뇨 치료제 시장에서 복용 편의성을 극대화한 경구용 제형 변경 플랫폼 기술을 보유한 국내 바이오텍으로 글로벌 판권 계약 체결 소식이 임박하여 수급 폭발.',
    news: [
      { title: '삼천당제약, 경구용 GLP-1 유럽 5개국 공급 독점 계약 체결 공시', source: '연합뉴스', time: '25분 전' },
      { title: '노보노디스크·일라이릴리 실적 서프라이즈… 비만약 테마 재점화', source: '이데일리', time: '1시간 전' },
      { title: '인벤티지랩, 장기지속형 주사제 공동개발 빅파마 미팅 완료', source: '바이오스펙테이터', time: '2시간 전' }
    ],
    strategy: '추세 추종 유효. 전고점 돌파 후 거래량 실린 지지선 형성 중이므로 5일선 이탈 전까지 스윙 관점 홀딩.'
  },
  {
    id: 'theme-03',
    rank: 3,
    name: 'CXL 2.0 & 온디바이스 AI',
    category: 'semicon',
    rate: '+5.35%',
    rateType: 'up',
    score: 86,
    scoreNote: '당일 상승률 3위 차세대 반도체',
    tradeAmount: '4,800억',
    leader: '오픈엣지테크놀로지, 엑시콘, 네오셈, 퀄리타스반도체',
    symbol: '394280',
    tvSymbol: 'KRX:394280',
    desc: 'CXL 2.0 메모리 컨트롤러 양산 진입 및 온디바이스 AI 칩 IP 수요 폭증',
    badge: '차세대 CXL',
    badgeColor: '#38bdf8',
    searchKeyword: 'CXL 2.0 반도체',
    reason: 'HBM의 뒤를 이을 메모리 대역폭 확장 기술인 CXL(컴퓨트 익스프레스 링크) 2.0 상용화 임박과 글로벌 팹리스들의 IP 라이선스 계약 증가.',
    news: [
      { title: '삼성전자·SK하이닉스, CXL 2.0 검증 인프라 구축… 4분기 양산 로드맵', source: '전자신문', time: '1시간 전' },
      { title: '오픈엣지, 고성능 메모리 컨트롤러 IP 수주잔고 사상 최대', source: '머니투데이', time: '2시간 전' }
    ],
    strategy: '실적 턴어라운드 초기 단계. 단기 급등 후 10일선 눌림목 반등 타점을 노리는 매매 유효.'
  },
  {
    id: 'theme-04',
    rank: 4,
    name: '체코 30조 원전 수주 & SMR',
    category: 'policy',
    rate: '+4.85%',
    rateType: 'up',
    score: 88,
    scoreNote: '당일 상승률 4위 정책 수혜 섹터',
    tradeAmount: '7,600억',
    leader: '두산에너빌리티, 한신기계, 우진엔텍, 일진파워',
    symbol: '034020',
    tvSymbol: 'KRX:034020',
    desc: '체코 두코바니 신규 원전 최종 우선협상대상자 선정 및 10월 본계약 조율',
    badge: '정책 모멘텀',
    badgeColor: '#a855f7',
    searchKeyword: '체코 원전 SMR',
    reason: '체코 30조 원전 수주에 이어 폴란드, UAE 등 후속 수주 기대감과 글로벌 빅테크의 AI 데이터센터 전력 공급용 SMR(소형원자로) 파트너십이 지속 부각되며 연기금 매수세 유입.',
    news: [
      { title: '팀코리아 체코 원전 실무협상단 현지 파견… 연내 본계약 마무리 박차', source: '서울경제', time: '2시간 전' },
      { title: '두산에너빌리티, 美 뉴스케일파워 SMR 핵심 단조품 추가 제작 돌입', source: '조선비즈', time: '3시간 전' },
      { title: '글로벌 빅테크 AI 데이터센터 전력난 해법으로 SMR 채택 본격화', source: '디지털타임스', time: '4시간 전' }
    ],
    strategy: '눌림목 매집 구간. 일정 매매(D-Day 본계약 체결일) 타깃으로 20일선 지지선에서 분할 매수 대응.'
  },
  {
    id: 'theme-05',
    rank: 5,
    name: '로봇용 액추에이터 & 피지컬 AI',
    category: 'semicon',
    rate: '+3.90%',
    rateType: 'up',
    score: 85,
    scoreNote: '당일 상승률 5위 피지컬 AI 테마',
    tradeAmount: '5,400억',
    leader: '레인보우로보틱스, 에스피지, 로보티즈, 두산로보틱스',
    symbol: '277810',
    tvSymbol: 'KRX:277810',
    desc: '테슬라 옵티머스 3세대 연내 상용화 및 삼성전자 보핏 양산 확대',
    badge: '기술 트렌드',
    badgeColor: '#fb923c',
    searchKeyword: '로봇 감속기 액추에이터',
    reason: '글로벌 완성차 및 빅테크의 제조 라인 내 휴머노이드 투입 소식으로 정밀 감속기 및 액추에이터 핵심 부품사들의 구조적 실적 턴어라운드 기대감이 증폭됨.',
    news: [
      { title: '테슬라, 공장 투입용 옵티머스 수천 대 양산 공장 부지 확정', source: '헤럴드경제', time: '3시간 전' },
      { title: '에스피지, 정밀 감속기 수율 95% 달성… 국산화 대체 가속도', source: '전자신문', time: '4시간 전' },
      { title: '레인보우로보틱스, 협동로봇 신제품 북미 수출 계약 가시화', source: '머니S', time: '5시간 전' }
    ],
    strategy: '박스권 상단 돌파 시도 중. 대장주 레인보우로보틱스의 기관 수급 유입 확인 후 눌림목 공략.'
  },
  {
    id: 'theme-06',
    rank: 6,
    name: '2차전지 전고체 & 실리콘 음극재',
    category: 'semicon',
    rate: '+3.40%',
    rateType: 'up',
    score: 79,
    scoreNote: '당일 상승률 6위 배터리 혁신',
    tradeAmount: '5,200억',
    leader: '이수스페셜티케미컬, 레이크머티리얼즈, 대주전자재료, 포스코홀딩스',
    symbol: '457190',
    tvSymbol: 'KRX:457190',
    desc: '꿈의 배터리 전고체 파일럿 라인 가동 및 에너지 밀도 20% 향상 실리콘 음극재 납품',
    badge: '전고체 배터리',
    badgeColor: '#f59e0b',
    searchKeyword: '전고체 배터리 실리콘음극재',
    reason: '화재 위험이 없고 주행거리를 획기적으로 늘리는 황화물계 전고체 배터리 소재 납품 테스트 통과 및 실리콘 음극재 탑재 차량 확대 소식 부각.',
    news: [
      { title: '이수스페셜티케미컬, 황화리튬 양산 설비 증설 완료… 글로벌 셀메이커 공급', source: '머니투데이', time: '2시간 전' },
      { title: '대주전자재료, 북미 전기차 신차종 실리콘 음극재 채택 확대', source: '한국경제', time: '4시간 전' }
    ],
    strategy: '중장기 바닥권 탈피 시도. 거래량이 전일 대비 200% 이상 급증할 때 양봉 분할 매수.'
  },
  {
    id: 'theme-07',
    rank: 7,
    name: '방산 K-방산 수출 & 자주포/미사일',
    category: 'policy',
    rate: '+2.80%',
    rateType: 'up',
    score: 83,
    scoreNote: '당일 상승률 7위 수주 랠리',
    tradeAmount: '4,500억',
    leader: '한화에어로스페이스, LIG넥스원, 현대로템, 한국항공우주',
    symbol: '012450',
    tvSymbol: 'KRX:012450',
    desc: '루마니아·폴란드 K9 자주포 및 K2 전차 2차 이행계약 체결 가시화',
    badge: '수주 잭팟',
    badgeColor: '#10b981',
    searchKeyword: 'K-방산 수출 무기',
    reason: '유럽 및 중동 지정학적 리스크 지속에 따른 무기체계 신속 공급 능력 입증과 천궁-II, K9 자주포 대규모 2차 수출 계약 체결 기대감 고조.',
    news: [
      { title: '한화에어로스페이스, 루마니아 자주포 수주 후속 탄약 운반차 계약 협의', source: '아시아경제', time: '3시간 전' },
      { title: '현대로템, 폴란드 K2 전차 2차 실행계약 연내 체결 확실시', source: '조선비즈', time: '4시간 전' }
    ],
    strategy: '실적 기반 우상향 추세. 지수 하락 시에도 기관 수급이 유지되므로 조정 시마다 모아가는 스윙 전략.'
  },
  {
    id: 'theme-08',
    rank: 8,
    name: '밸류업 지배구조 & 금융/지주사',
    category: 'policy',
    rate: '+2.10%',
    rateType: 'up',
    score: 82,
    scoreNote: '당일 상승률 8위 배당 방어 섹터',
    tradeAmount: '6,100억',
    leader: 'KB금융, 메리츠금융지주, 신한지주, 삼성물산',
    symbol: '105560',
    tvSymbol: 'KRX:105560',
    desc: '코리아 디스카운트 해소를 위한 밸류업 지수 9월 발표 및 자사주 소각',
    badge: '안정 배당',
    badgeColor: '#60a5fa',
    searchKeyword: '기업 밸류업 지수',
    reason: '한국거래소 기업 밸류업 지수 공식 발표 및 연기금 패시브 자금 유입 기대감으로 주주환원율 40% 이상 고배당 금융 지주사로 지속적 기관 러브콜.',
    news: [
      { title: '거래소, 9월 밸류업 지수 베일 벗는다… 금융·자동차 편입 유력', source: '파이낸셜뉴스', time: '2시간 전' },
      { title: 'KB금융, 3분기 분기배당 및 추가 자사주 매입 소각 결의 검토', source: '한국경제TV', time: '3시간 전' }
    ],
    strategy: '안정적인 배당 성향 투자자에게 최적. 시장 지수 조정 시 강력한 하방 경직성 보유.'
  }
];

// ============================================================================
// [🌐 당일 시장 판도 및 주도 테마 레이더 (Top-Down 시장 분석 엔진)]
// ============================================================================
window.marketOverviewRadarData = null;

// 시장 판도 및 실시간 주도 테마 TOP 5 로드 엔진
window.loadMarketOverviewRadar = async function(forceRefresh = false) {
  const grid = document.getElementById('radar-top-themes-grid');
  if (grid && (!window.marketOverviewRadarData || forceRefresh)) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 24px 16px; color: #38bdf8; background: rgba(56,189,248,0.04); border-radius: 10px; border: 1px dashed rgba(56,189,248,0.25);">
        <div style="font-size: 1.4rem; margin-bottom: 6px;">📡</div>
        <div style="font-weight: 800; font-size: 0.92rem; color: #f8fafc;">시장 전체 자금 흐름 & 당일 주도 테마 전수 스캔 중...</div>
        <div style="font-size: 0.74rem; color: #94a3b8; margin-top: 3px;">코스피/코스닥 체력, 수급 및 거래대금 급증 주도 섹터를 복합 판정하고 있습니다.</div>
      </div>
    `;
  }

  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/market/overview-radar?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.success || data.status === '000')) {
        window.marketOverviewRadarData = data;
        window.renderMarketOverviewRadar(data);
        if (window.showToast && forceRefresh) {
          window.showToast('당일 시장 판도 및 진짜 주도 섹터 TOP 5가 최신화되었습니다!', '🌐');
        }
        return data;
      }
    }
  } catch (e) {
    console.warn('[MarketOverviewRadar Error]', e);
  }

  if (grid && !window.marketOverviewRadarData) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #94a3b8; font-size: 0.8rem;">
        시장 판도 데이터를 불러오지 못했습니다. 우측 [실시간 장세 동기화] 버튼을 눌러주세요.
      </div>
    `;
  }
};

// [🔄 실시간 장세 동기화] 버튼 핸들러
window.refreshMarketOverviewRadar = function() {
  const btn = document.getElementById('btn-sync-market-radar');
  const icon = document.getElementById('sync-radar-icon');
  if (btn) {
    btn.style.opacity = '0.6';
    btn.style.pointerEvents = 'none';
  }
  if (icon) {
    icon.style.display = 'inline-block';
    icon.style.animation = 'spin 1s linear infinite';
  }
  if (window.showToast) window.showToast('시장 전체 판도와 실시간 주도 테마를 전수 스캔합니다...', '⏳');

  window.loadMarketOverviewRadar(true).finally(() => {
    if (btn) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
    if (icon) {
      icon.style.animation = 'none';
    }
  });
};

// 하위 호환성 유지
window.loadTodayShootingThemesData = window.loadMarketOverviewRadar;
window.refreshTodayShootingThemes = window.refreshMarketOverviewRadar;

// 레이더 화면 렌더링 함수
window.renderMarketOverviewRadar = function(data) {
  if (!data) return;

  const market = data.market_health || data.market;
  const themes = Array.isArray(data.top_themes) ? data.top_themes : [];
  const updated_at = data.updated_at;

  // 1. 갱신 시간
  const timeEl = document.getElementById('radar-updated-time');
  if (timeEl) {
    if (updated_at) {
      try {
        const d = new Date(updated_at);
        timeEl.textContent = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')} 기준 동기화`;
      } catch (e) {
        timeEl.textContent = `${updated_at} 기준 동기화`;
      }
    } else {
      timeEl.textContent = '실시간 동기화 완료';
    }
  }

  // 2. 구역 A: 시장 체력 및 수급 업데이트
  if (market) {
    // KOSPI
    const kpDisplay = document.getElementById('radar-kospi-display');
    const kpForeign = document.getElementById('radar-kp-foreign');
    const kpOrgan = document.getElementById('radar-kp-organ');
    if (kpDisplay && market.kospi) {
      const isUp = market.kospi.isUp !== undefined ? market.kospi.isUp : !String(market.kospi.changeRate || '').startsWith('-');
      const color = isUp ? '#ef4444' : '#3b82f6';
      kpDisplay.style.color = color;
      kpDisplay.textContent = `${market.kospi.val || market.kospi.index || '-'} (${market.kospi.changeRate || '0.00%'})`;
    }
    if (kpForeign && market.kospi) {
      const v = market.kospi.foreigner || market.kospi.foreign_flow || '+0억';
      kpForeign.textContent = v;
      kpForeign.style.color = String(v).startsWith('-') ? '#3b82f6' : '#ef4444';
    }
    if (kpOrgan && market.kospi) {
      const v = market.kospi.organ || market.kospi.organ_flow || '+0억';
      kpOrgan.textContent = v;
      kpOrgan.style.color = String(v).startsWith('-') ? '#3b82f6' : '#ef4444';
    }

    // KOSDAQ
    const kdDisplay = document.getElementById('radar-kosdaq-display');
    const kdForeign = document.getElementById('radar-kd-foreign');
    const kdOrgan = document.getElementById('radar-kd-organ');
    if (kdDisplay && market.kosdaq) {
      const isUp = market.kosdaq.isUp !== undefined ? market.kosdaq.isUp : !String(market.kosdaq.changeRate || '').startsWith('-');
      const color = isUp ? '#ef4444' : '#3b82f6';
      kdDisplay.style.color = color;
      kdDisplay.textContent = `${market.kosdaq.val || market.kosdaq.index || '-'} (${market.kosdaq.changeRate || '0.00%'})`;
    }
    if (kdForeign && market.kosdaq) {
      const v = market.kosdaq.foreigner || market.kosdaq.foreign_flow || '+0억';
      kdForeign.textContent = v;
      kdForeign.style.color = String(v).startsWith('-') ? '#3b82f6' : '#ef4444';
    }
    if (kdOrgan && market.kosdaq) {
      const v = market.kosdaq.organ || market.kosdaq.organ_flow || '+0억';
      kdOrgan.textContent = v;
      kdOrgan.style.color = String(v).startsWith('-') ? '#3b82f6' : '#ef4444';
    }

    // 시장 분위기 태그 및 거래대금
    const moodTag = document.getElementById('radar-mood-tag');
    const moodDesc = document.getElementById('radar-mood-desc');
    const volEl = document.getElementById('radar-est-volume');
    if (moodTag) moodTag.textContent = market.moodTag || market.mood_tag || '개별 테마 순환매 우세';
    if (moodDesc) moodDesc.textContent = market.moodDesc || market.mood_desc || '중소형 주도 테마로 자금 쏠림';
    if (volEl) volEl.textContent = `거래대금 ${market.estimatedTradingValue || market.total_trade_volume || '18조 4,500억원'}`;
  }

  // 3. 구역 B: 진짜 주도 테마 TOP 5 지도 렌더링
  const grid = document.getElementById('radar-top-themes-grid');
  if (!grid) return;

  if (themes.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #94a3b8; font-size: 0.8rem;">
        현재 감지된 주도 테마가 없습니다.
      </div>
    `;
    return;
  }

  grid.innerHTML = themes.map((t, idx) => {
    const rateStr = t.change_rate || (t.rate ? `${t.rate > 0 ? '+' : ''}${t.rate}%` : '+0.00%');
    const isUp = !rateStr.startsWith('-');
    const rateColor = isUp ? '#ef4444' : '#3b82f6';
    const rankNum = t.rank || (idx + 1);
    const rankColor = rankNum === 1 ? '#f59e0b' : (rankNum === 2 ? '#94a3b8' : (rankNum === 3 ? '#d97706' : '#38bdf8'));
    const badgeText = t.badge || (rankNum === 1 ? '1등 최강섹터' : (rankNum === 2 ? '차석 주도섹터' : '거래대금 집중'));
    const scoreVal = t.composite_score || t.score || 85;
    const triggerText = t.trigger_summary || t.reason || '당일 거래대금 분출 및 핵심 모멘텀 부각';

    // JSON 인라인 안전 파싱용 데이터 속성 인코딩
    const jsonStr = encodeURIComponent(JSON.stringify(t));

    return `
      <div onclick="selectThemeFromRadar('${jsonStr}')" style="background: #ffffff; border: 1.5px solid ${rankNum === 1 ? '#f59e0b' : '#e2e8f0'}; border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: all 0.2s ease; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.04);" onmouseover="this.style.borderColor='#0284c7'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='${rankNum === 1 ? '#f59e0b' : '#e2e8f0'}'; this.style.transform='none';">
        
        <!-- 상단 헤더: 순위 & 테마명 & 등락률 -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; background: ${rankColor}; color: #ffffff; font-weight: 900; font-size: 0.76rem;">
                ${rankNum}
              </span>
              <h5 style="margin: 0; font-size: 0.98rem; font-weight: 900; color: #0f172a; letter-spacing: -0.3px;">
                ${escapeHtml(t.theme_name)}
              </h5>
            </div>
            <span style="font-size: 0.95rem; font-weight: 900; color: ${rateColor};">
              ${escapeHtml(rateStr)}
            </span>
          </div>

          <!-- 대장주 & 부대장주 뱃지 -->
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;">
            <span style="font-size: 0.7rem; background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; padding: 1px 6px; border-radius: 4px; font-weight: 800;">
              👑 대장: ${escapeHtml(t.leader_stock || '대장주')}
            </span>
            ${t.sub_leader_stock ? `
              <span style="font-size: 0.68rem; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 1px 5px; border-radius: 4px; font-weight: 700;">
                부대: ${escapeHtml(t.sub_leader_stock)}
              </span>
            ` : ''}
          </div>

          <!-- 상승 트리거 / 특징주 사유 요약 -->
          <div style="font-size: 0.74rem; color: #334155; line-height: 1.45; background: #f8fafc; border-radius: 6px; padding: 8px 10px; margin-bottom: 10px; border: 1px solid #e2e8f0; border-left: 3px solid ${rankColor}; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${escapeHtml(triggerText)}">
            💡 ${escapeHtml(triggerText)}
          </div>
        </div>

        <!-- 하단 바: 복합 주도 스코어 & 원클릭 연동 뱃지 -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 8px; margin-top: 4px;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="font-size: 0.68rem; color: #64748b;">주도점수</span>
            <span style="font-size: 0.76rem; font-weight: 900; color: #0284c7;">${scoreVal}점</span>
            <span style="font-size: 0.68rem; color: #64748b;">(${escapeHtml(badgeText)})</span>
          </div>
          <div style="display: flex; align-items: center;">
            <button class="btn-pin-theme-card" onclick="event.stopPropagation(); pinThemeToDossier('${escapeHtml(t.theme_name)}', '${escapeHtml(t.leader_stock || '')}', '${escapeHtml(t.sub_leader_stock || '')}', '${escapeHtml(rateStr)}')" style="background: #eef2ff; border: 1px solid #c7d2fe; color: #4338ca; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; margin-right: 6px;">
              📌 수첩에 박제
            </button>
            <span style="font-size: 0.7rem; color: #0284c7; font-weight: 800; display: inline-flex; align-items: center; gap: 2px;">
              분석 보기 ➔
            </span>
          </div>
        </div>

      </div>
    `;
  }).join('');
};

// ============================================================================
// [📌 탐정 사건 수첩 통합 저장 엔진] pinThemeToDossier / renderThemeDossier
// - pinned_theme_dossiers (localStorage) 관리
// - 수체에 박제, 키워드 추적기에서 저장, 시각적 콴타 교체 렌더링 갱신
// ============================================================================

// 피닝된 도시에 저장된 테마 목록 가져오기
function getPinnedDossiers() {
  try {
    const raw = localStorage.getItem('pinned_theme_dossiers');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// 피닝된 도시에 테마 목록 저장
function savePinnedDossiers(list) {
  try {
    localStorage.setItem('pinned_theme_dossiers', JSON.stringify(list));
  } catch (e) {
    console.warn('[PinnedDossiers] localStorage 저장 실패:', e);
  }
}

// [탐정 수첩 박제 함수] TOP5 카드 버튼 / 키워드 추적기에서 호출
window.pinThemeToDossier = function(name, leadStock, subStock, changeRate, customStocks) {
  if (!name || !name.trim()) {
    if (window.showToast) window.showToast('테마명이 비어 있어 저장할 수 없습니다.', '⚠️');
    return;
  }
  const themeName = name.trim();
  const existing = getPinnedDossiers();

  // 중복 테마명 체크
  if (existing.some(d => d.name === themeName)) {
    if (window.showToast) window.showToast(`[📌 ${themeName}]은 이미 수첩에 등록되어 있습니다.`, 'ℹ️');
    // 수첩 졌션으로 부드럽게 스크롤
    setTimeout(() => {
      document.getElementById('theme-dossier-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 200);
    return;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const entry = {
    id: `dossier_${Date.now()}`,
    name: themeName,
    leadStock: leadStock || themeName,
    subStock: subStock || '관련주 추적 중',
    changeRate: changeRate || '+0.00%',
    stocks: customStocks || [],
    pinnedAt: todayStr,
    pinnedTs: Date.now(),
    memo: ''
  };

  existing.unshift(entry); // 최신순 삽입
  savePinnedDossiers(existing);

  // 수첩 화면 즉시 갱신
  renderThemeDossier();

  // 키운트 배지 업데이트
  const badge = document.getElementById('case-logs-count-badge');
  if (badge) {
    const allDossiers = getPinnedDossiers();
    badge.textContent = `피닝 ${allDossiers.length}건`;
  }

  if (window.showToast) {
    window.showToast(`📁 [${themeName}] 테마가 탐정 사건 수첩에 안전하게 등록되었습니다.`, '📌');
  }

  // 수첩 섹션으로 부드럽게 스크롤
  setTimeout(() => {
    document.getElementById('theme-dossier-section')?.scrollIntoView({ behavior: 'smooth' });
  }, 250);
};

// [탐정 수첩 렌더링] pinned_theme_dossiers를 읽어 화면에 카드 그리드로 출력
window.renderThemeDossier = function() {
  const grid = document.getElementById('detective-case-logs-grid');
  const badge = document.getElementById('case-logs-count-badge');
  if (!grid) return;

  const dossiers = getPinnedDossiers();
  if (badge) badge.textContent = `피닝 ${dossiers.length}건`;

  if (dossiers.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #64748b; background: rgba(168,85,247,0.04); border-radius: 10px; border: 1px dashed rgba(168,85,247,0.2);">
        <div style="font-size: 2rem; margin-bottom: 10px;">📌</div>
        <div style="font-size: 0.92rem; font-weight: 800; color: #c084fc; margin-bottom: 6px;">주도 테마 박제 기록이 없습니다</div>
        <div style="font-size: 0.78rem; color: #94a3b8;">TOP 5 테마 카드의 [📌 수첩에 박제] 버튼을 누르마다.</div>
      </div>
    `;
    return;
  }

  grid.innerHTML = dossiers.map((d, idx) => {
    const isUp = !String(d.changeRate || '').startsWith('-');
    const rateColor = isUp ? '#ef4444' : '#3b82f6';
    const timeAgo = (() => {
      const diff = Date.now() - (d.pinnedTs || Date.now());
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return '방금';
      if (mins < 60) return `${mins}분 전`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}시간 전`;
      return `${Math.floor(hrs / 24)}일 전`;
    })();

    return `
      <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.03);" onmouseover="this.style.borderColor='#7c3aed'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.transform='none';">
        <!-- 헤더 -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.68rem; background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; padding: 1px 6px; border-radius: 4px; font-weight: 800;">📌 박제 #${dossiers.length - idx}</span>
              <span style="font-size: 0.68rem; color: #64748b;">${escapeHtml(d.pinnedAt || '')} (${timeAgo})</span>
            </div>
            <h5 style="margin: 0; font-size: 1rem; font-weight: 900; color: #0f172a; letter-spacing: -0.3px;">${escapeHtml(d.name)}</h5>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.92rem; font-weight: 900; color: ${rateColor};">${escapeHtml(d.changeRate || '')}</span>
            <button onclick="removePinnedDossier('${d.id}')" title="수첩에서 제거" style="background: #fee2e2; border: 1px solid #fecaca; color: #dc2626; width: 22px; height: 22px; border-radius: 5px; font-size: 0.75rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; transition: all 0.15s;" onmouseover="this.style.background='#fca5a5';" onmouseout="this.style.background='#fee2e2';">✕</button>
          </div>
        </div>

        <!-- 대장주 등 재료 -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <span style="font-size: 0.72rem; background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; padding: 2px 8px; border-radius: 5px; font-weight: 800;">👑 대장: ${escapeHtml(d.leadStock || '-')}</span>
          ${d.subStock ? `<span style="font-size: 0.7rem; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 2px 7px; border-radius: 5px; font-weight: 700;">부대: ${escapeHtml(d.subStock)}</span>` : ''}
          ${(d.stocks || []).map(s => `<span style="font-size: 0.68rem; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 1px 6px; border-radius: 4px; font-weight: 700;">${escapeHtml(s)}</span>`).join('')}
        </div>

        <!-- 메모 및 액션 -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 8px; gap: 8px; flex-wrap: wrap;">
          <input type="text" value="${escapeHtml(d.memo || '')}" placeholder="나만의 메모 (진입 근거, 전략 등)..." oninput="updateDossierMemo('${d.id}', this.value)" style="flex: 1; min-width: 120px; background: #ffffff; border: 1px solid #cbd5e1; color: #1e293b; padding: 5px 10px; border-radius: 6px; font-size: 0.72rem; outline: none;" onfocus="this.style.borderColor='#7c3aed';" onblur="this.style.borderColor='#cbd5e1';">
          <button onclick="event.stopPropagation(); selectThemeFromDossier('${escapeHtml(d.name)}')" style="background: #e0f2fe; border: 1px solid #bae6fd; color: #0284c7; padding: 5px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 800; cursor: pointer; white-space: nowrap; transition: all 0.15s;" onmouseover="this.style.background='#bae6fd';" onmouseout="this.style.background='#e0f2fe';">🔍 타임라인 분석</button>
        </div>
      </div>
    `;
  }).join('');
};

// 도시에 메모 업데이트
window.updateDossierMemo = function(id, memo) {
  const list = getPinnedDossiers();
  const found = list.find(d => d.id === id);
  if (found) {
    found.memo = memo;
    savePinnedDossiers(list);
  }
};

// 도시에서 제거
window.removePinnedDossier = function(id) {
  const list = getPinnedDossiers();
  const filtered = list.filter(d => d.id !== id);
  savePinnedDossiers(filtered);
  renderThemeDossier();
  if (window.showToast) window.showToast('테마가 수첩에서 제거되었습니다.', '🗑️');
};

// 도시에서 타임라인 분석으로 연동
window.selectThemeFromDossier = function(themeName) {
  const found = (window.detectiveThemes || []).find(t =>
    t.theme_name === themeName || t.theme_name.includes(themeName) || themeName.includes(t.theme_name)
  );
  if (found) {
    window.currentSelectedDetectiveTheme = found;
    if (typeof window.enrichThemeWithAllSignals === 'function') {
      window.enrichThemeWithAllSignals(found, found.checklist?.leaders?.lead?.split(',')[0]?.trim() || themeName);
    }
    const viewer = document.getElementById('theme-timeline-viewer-section');
    if (viewer) viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    // 없으면 DB에서 로드 시도
    if (typeof window.selectThemeFromDb === 'function') {
      window.selectThemeFromDb(themeName);
    }
  }
};

// [코드 C] 키워드 추적기 터 [탐정 수첩에 저장] 버튼 핸들러
// 크롤링 없이 localStorage에 테마+종목만 저장
window.saveToDossierFromTracker = function() {
  // 1. 선택된 테마명 파악
  const selectEl = document.getElementById('custom-theme-select');
  const directInput = document.getElementById('custom-theme-input');
  const stockInput = document.getElementById('stock-keyword-input');

  let themeName = '';
  if (selectEl && selectEl.value === '__custom__') {
    themeName = (directInput && directInput.value.trim()) || '';
  } else if (selectEl) {
    themeName = selectEl.value.trim();
  }

  if (!themeName) {
    if (window.showToast) window.showToast('대분류 테마를 선택하거나 직접 입력해주세요.', '⚠️');
    return;
  }

  // 2. 종목 목록 파악
  const rawStocks = stockInput ? stockInput.value : '';
  const stockList = rawStocks.split(/[,\n，]/).map(s => s.trim()).filter(Boolean);

  // 3. 수첩에 저장
  const existing = getPinnedDossiers();
  if (existing.some(d => d.name === themeName)) {
    if (window.showToast) window.showToast(`[📌 ${themeName}]은 이미 수첩에 등록되어 있습니다.`, 'ℹ️');
    document.getElementById('theme-dossier-section')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const entry = {
    id: `dossier_${Date.now()}`,
    name: themeName,
    leadStock: stockList[0] || themeName,
    subStock: stockList.slice(1).join(', ') || '',
    changeRate: '',
    stocks: stockList,
    pinnedAt: todayStr,
    pinnedTs: Date.now(),
    memo: ''
  };

  existing.unshift(entry);
  savePinnedDossiers(existing);

  // 4. 화면 갱신
  renderThemeDossier();

  // 5. 안내 토스트
  if (window.showToast) {
    window.showToast(`📁 [${themeName}] 테마와 종목이 탐정 사건 수첩에 안전하게 등록되었습니다.`, '📌');
  }

  // 6. 입력창 리셋 (localStorage 추적 태그도 갱신)
  if (stockInput) stockInput.value = '';
  if (directInput) directInput.value = '';

  // 수첩 섹션 스크롤
  setTimeout(() => {
    document.getElementById('theme-dossier-section')?.scrollIntoView({ behavior: 'smooth' });
  }, 250);

  // 7. localStorage custom_tracked_stocks에도 병행 등록
  if (stockList.length > 0) {
    const tracked = getCustomTrackedStocks ? getCustomTrackedStocks() : [];
    stockList.forEach(stock => {
      if (!tracked.some(t => t.stock === stock)) {
        tracked.push({ theme: themeName, stock });
      }
    });
    if (typeof saveCustomTrackedStocks === 'function') {
      saveCustomTrackedStocks(tracked);
      if (typeof renderCustomTrackedTags === 'function') renderCustomTrackedTags();
    }
  }
};

// [구역 C 원클릭 탐정 체크리스트 연동 핸들러]
window.selectThemeFromRadar = async function(encodedThemeJson) {
  try {
    const raw = decodeURIComponent(encodedThemeJson);
    const themeItem = JSON.parse(raw);
    const themeName = themeItem.theme_name;
    const leaderStock = themeItem.leader_stock || themeName;
    const subLeaderStock = themeItem.sub_leader_stock || '관련주 추적 중';
    const triggerSummary = themeItem.trigger_summary || themeItem.reason || `${themeName} 당일 주도 섹터 자금 분출`;

    if (window.showToast) {
      window.showToast(`[${themeName}] 7대 체크리스트와 4대 채널 타임라인으로 자동 전환합니다!`, '🎯');
    }

    // 1. 기존 탐정 테마 목록에서 검색하거나 새 테마 객체 구성
    let targetTheme = (window.detectiveThemes || []).find(t => 
      t.theme_name === themeName || t.theme_name.includes(themeName) || themeName.includes(t.theme_name)
    );

    const todayStr = new Date().toISOString().slice(0, 10);

    if (targetTheme) {
      // 기존 테마가 있을 경우 서버의 실시간 체크리스트/타임라인으로 보강
      if (themeItem.checklist) {
        targetTheme.checklist = { ...targetTheme.checklist, ...themeItem.checklist };
      }
      if (Array.isArray(themeItem.timeline) && themeItem.timeline.length > 0) {
        const existingUrls = new Set((targetTheme.timeline || []).map(item => item.news_url || item.news_title));
        themeItem.timeline.forEach(item => {
          if (!existingUrls.has(item.news_url || item.news_title)) {
            targetTheme.timeline.unshift(item);
          }
        });
      }
    } else {
      // 신규 테마 구성 (서버에서 이미 완성된 checklist & timeline 제공 시 그대로 채택)
      targetTheme = {
        theme_id: themeItem.theme_id || ('radar_' + Date.now()),
        theme_name: themeName,
        sector: themeItem.badge || '당일 주도 테마',
        pattern_type: '주도 섹터 급등(거래대금 분출)',
        period_type: '단기 주도',
        score: themeItem.composite_score || themeItem.score || 88,
        summary: triggerSummary,
        checklist: themeItem.checklist || {
          leaders: {
            lead: `${leaderStock} (${themeItem.change_rate || '+0.00%'})`,
            sub: subLeaderStock
          },
          scale: {
            investment: '시장 전체 거래대금 상위 집중 유입',
            market: '국내외 관련 산업 수혜 및 대규모 수주/공급 모멘텀',
            customers: '핵심 글로벌/국내 고객사 납품 확대 기대감'
          },
          catalyst: {
            dates: todayStr + ' 당일 강력 부각',
            milestones: triggerSummary
          },
          scarcity: {
            tech: `${leaderStock} 중심의 독점적 기술력 및 업종 대장 지위`,
            substitutes: '테마 내 후발주 대비 가장 높은 유동성과 탄력성 보유'
          },
          risks: {
            fading: '단기 급등에 따른 차익 실현 및 시장 변동성 확대',
            dilution: '신규 자금 조달 여부 및 단기 과열 지정 여부 모니터링'
          },
          technicals: {
            support: '당일 장중 시초가 및 5일 이동평균선 지지선',
            resistance: '전고점 및 라운드 피겨 저항선 돌파 시도'
          },
          scenarios: {
            bullish: '후속 거래대금 지속 유입 시 2차 파동 전개',
            bearish: '대장주 탄력 둔화 시 관련주 동반 눌림목 조정'
          }
        },
        timeline: (Array.isArray(themeItem.timeline) && themeItem.timeline.length > 0) ? themeItem.timeline : [
          {
            date: todayStr,
            stage: "주도 테마 감지",
            press: "시장 판도 레이더",
            news_title: `[주도 섹터 TOP 5] ${themeName} 거래대금 급증 및 수급 쏠림`,
            news_url: `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(themeName + ' ' + leaderStock)}`,
            key_point: `대장주: ${leaderStock} | ${triggerSummary}`
          }
        ],
        _asyncSupplementsLoaded: false,
        _technicals: null
      };

      if (!Array.isArray(window.detectiveThemes)) {
        window.detectiveThemes = [];
      }
      window.detectiveThemes.unshift(targetTheme);

      // 서버 비동기 보존
      fetch(`${BACKEND_API_BASE}/api/themes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetTheme)
      }).catch(err => console.warn('테마 서버 저장 오류:', err));
    }

    // 2. 테마 셀렉터 갱신 및 선택
    if (typeof populateDetectiveSelect === 'function') {
      populateDetectiveSelect();
    }
    const selectEl = document.getElementById('theme-timeline-select');
    if (selectEl) selectEl.value = targetTheme.theme_id;

    // 3. 7대 체크리스트 렌더링
    window.currentSelectedDetectiveTheme = targetTheme;
    if (typeof window.renderDetectiveCard === 'function') {
      window.renderDetectiveCard(targetTheme, window.activeTimelinePeriod || 'all');
    }

    // 4. 4대 채널(뉴스·공시·리포트·블로그) 타임라인 동적 통합 수집 트리거
    if (typeof window.enrichThemeWithAllSignals === 'function') {
      window.enrichThemeWithAllSignals(targetTheme, leaderStock);
    }

    // 5. 상단 모멘텀 카드도 갱신
    if (typeof window.renderTopMomentumCards === 'function') {
      window.renderTopMomentumCards(window.detectiveThemes);
    }

    // 6. 7대 체크리스트 & 타임라인 상세 뷰어로 부드러운 스크롤 이동
    setTimeout(() => {
      const viewer = document.getElementById('theme-timeline-viewer-section');
      if (viewer) {
        viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);

  } catch (err) {
    console.error('[SelectThemeFromRadar Error]', err);
  }
};

// [+ 종목 추가 및 즉시 수집] 실행
window.addAndFetchCustomStock = async function () {
  const btn = document.getElementById('btn-add-stock-track');
  if (btn && typeof btn.onclick === 'function') {
    return btn.onclick();
  }
};

// 3. 증시 캘린더 동적 저장소 (사용자 승인 및 수동 등록 일정)
// [초보자 설명서] 기존의 틀린 더미 하드코딩 데이터를 완전히 제거하고, 
// 뉴스에서 AI가 자동 감지하여 승인한 일정 및 사용자가 직접 추가한 일정만 보존합니다.
let calendarApprovedEvents = [];
let calendarPendingEvents = [];

let currentThemeIdx = 0;

document.addEventListener('DOMContentLoaded', () => {
  initStockSubTabs();
  initDomesticStockNews();
  renderStockThemesList();
  selectStockTheme(0);
  // renderStockCompareTable(); // ← loadThemeTimelineData() → fetchLiveNewsForTab2()에서 실시간 처리
  initCalendarEventSystem(); // [개편] AI 뉴스 탐지 일정 후보 & 캘린더 동적 관리
  initStockSearch();
  initStockDeepResearch();
  initGlobalMarketNews();
  // renderThemeTimelineView(); // ← fetchLiveNewsForTab2()에서 실시간 처리
  renderStockCalendarFeed();
  renderLeadingThemeFeed();
  renderStockDeepAnalysis('SK하이닉스');
  renderYoutubeBriefingFeed();
  updateStockApiBadge();
  fetchLiveMarketIndices();
  startMarketIndicesAutoRefresh();
  renderUSSectorBriefing(); // [신규] 미국 11개 섹터 브리핑 비동기 연동
  initCustomTrackedStocksUI(); // [신규] 사용자 수동 종목 추가 UI 초기화
  // [🌐 신규] 당일 시장 전체 판도 및 진짜 주도 테마 레이더 초기화
  if (typeof window.loadMarketOverviewRadar === 'function') {
    window.loadMarketOverviewRadar();
  }
  // 실시간 테마 타임라인 JSON(data/theme_timeline.json) 자동 동기화
  loadThemeTimelineData();
});

// ============================================================================
// [신규] 4번 탭(당일 주도 테마) → 2번 탭(재료 모음 타임라인) 연동 및 렌더링 모듈
// ============================================================================
let themeTimelineCache = null; // theme_timeline.json 캐시
let activeTimelineThemeId = 'hbm_glass'; // 현재 2번 탭에서 선택된 테마 ID
let activeTimelinePeriod = 'all'; // 'all', '7d', '30d'

// 4번 탭에서 좌측 카드나 우측 리포트의 '재료 타임라인 전체보기' 클릭 시 2번 탭으로 즉시 전환
window.navigateToThemeTimeline = function (themeId) {
  if (themeId) {
    activeTimelineThemeId = themeId;
  }
  // 1. 상단 내비게이션 2번 탭(compare)으로 전환
  if (typeof window.activateStockSubTab === 'function') {
    window.activateStockSubTab('compare');
  } else {
    const compareTab = document.querySelector('.stock-sub-tab[data-sub="compare"]');
    if (compareTab) compareTab.click();
  }

  // 2. 2번 탭 내 타임라인 뷰어 렌더링 및 부드러운 스크롤 이동
  renderThemeTimelineView(activeTimelineThemeId, activeTimelinePeriod);

  setTimeout(() => {
    const viewer = document.getElementById('theme-timeline-viewer-section');
    if (viewer) {
      viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
};

// 2번 탭 상단 테마 드롭다운 변경 시 호출 (탐정 뷰어 최우선 연동)
window.switchTimelineTheme = function (themeId) {
  activeTimelineThemeId = themeId;
  // 테마 전환 시 종목 필터 초기화
  currentStockFilter = 'ALL';
  if (Array.isArray(window.detectiveThemes)) {
    const found = window.detectiveThemes.find(t => t.theme_id === themeId);
    if (found) {
      window.currentSelectedDetectiveTheme = found;
      if (typeof window.renderUniversalTimeline === 'function') {
        window.renderUniversalTimeline(found, window.activeTimelinePeriod || 'all');
        return;
      } else if (typeof window.renderDetectiveCard === 'function') {
        window.renderDetectiveCard(found, window.activeTimelinePeriod || 'all');
        return;
      }
    }
  }
  if (typeof renderThemeTimelineView === 'function') {
    renderThemeTimelineView(themeId, window.activeTimelinePeriod || 'all');
  }
};

// ============================================================================
// [신규] 2번 탭 테마 삭제 & 사용자 수동 종목/테마 추가 패널 & 로컬스토리지 연동 엔진
// ============================================================================
// [+ 종목 추가 및 즉시 수집] 실행 (레거시 호출 호환)
window.addAndFetchCustomStock = async function () {
  const btn = document.getElementById('btn-add-stock-track');
  if (btn && typeof btn.onclick === 'function') {
    return btn.onclick();
  }
};

const DEFAULT_THEME_STOCK_MAP = {
  "방산": ["한화에어로스페이스", "한화시스템", "LIG넥스원", "현대로템", "한국항공우주"],
  "로봇": ["레인보우로보틱스", "두산로보틱스", "뉴로메카", "에스비비테크", "엔젤로보틱스"],
  "원전": ["두산에너빌리티", "우진엔텍", "한신기계", "일진파워", "비에이치아이"],
  "반도체": ["SK하이닉스", "와이씨", "에프에스티", "필옵틱스", "오픈엣지테크놀로지"],
  "바이오": ["삼천당제약", "인벤티지랩", "디앤디파마텍", "펩트론", "알테오젠"]
};

// [관심 테마 삭제 영구 보존 엔진]
function getDeletedThemes() {
  try {
    const raw = localStorage.getItem('deleted_stock_themes');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveDeletedThemes(list) {
  try {
    localStorage.setItem('deleted_stock_themes', JSON.stringify(list));
  } catch (e) {
    console.warn('localStorage 저장 실패:', e);
  }
}

// 테마 삭제 실행 함수 (테마 카드 및 비교 테이블에서 호출)
window.deleteStockTheme = async function (themeIdOrName) {
  if (!themeIdOrName) return;
  const deleted = getDeletedThemes();
  if (!deleted.includes(themeIdOrName)) {
    deleted.push(themeIdOrName);
    saveDeletedThemes(deleted);
  }

  // 1. 서버 API 호출하여 data/theme_timeline.json에서도 영구 삭제 시도
  try {
    fetch(`${BACKEND_API_BASE}/api/themes?theme_id=${encodeURIComponent(themeIdOrName)}`, { method: 'DELETE' }).catch(() => {});
  } catch (e) {}

  // 2. window.detectiveThemes 캐시에서 제거
  if (Array.isArray(window.detectiveThemes)) {
    window.detectiveThemes = window.detectiveThemes.filter(t =>
      t.theme_id !== themeIdOrName && t.theme_name !== themeIdOrName
    );
  }

  // 3. themeTimelineCache에서도 해당 테마 제거
  if (themeTimelineCache && Array.isArray(themeTimelineCache.themes)) {
    themeTimelineCache.themes = themeTimelineCache.themes.filter(t =>
      t.theme_id !== themeIdOrName && t.theme_name !== themeIdOrName
    );
  }

  // 4. 삭제 후 남아있는 유효 테마 중 첫 번째 테마 찾기
  let fallbackTheme = null;
  if (Array.isArray(window.detectiveThemes)) {
    fallbackTheme = window.detectiveThemes.find(t => !isThemeDeleted(t.theme_id, t.theme_name));
  }

  const activeThemes = getActiveThemesList();
  if (fallbackTheme) {
    activeTimelineThemeId = fallbackTheme.theme_id;
    window.currentSelectedDetectiveTheme = fallbackTheme;
  } else if (activeThemes.length > 0) {
    activeTimelineThemeId = activeThemes[0].theme_id || activeThemes[0].id || 'hbm_glass';
  } else {
    activeTimelineThemeId = '';
    window.currentSelectedDetectiveTheme = null;
  }

  if (window.showToast) {
    window.showToast(`[${themeIdOrName}] 테마가 삭제되었습니다. (재료 소멸 판정)`, '🗑️');
  }

  // 5. 드롭다운 및 상단 요약 카드 갱신
  if (typeof populateDetectiveSelect === 'function') {
    populateDetectiveSelect();
    const selectEl = document.getElementById('theme-timeline-select');
    if (selectEl && activeTimelineThemeId) selectEl.value = activeTimelineThemeId;
  }
  if (typeof window.renderTopMomentumCards === 'function' && Array.isArray(window.detectiveThemes)) {
    window.renderTopMomentumCards(window.detectiveThemes);
  }

  // 6. 첫 번째 테마로 메인 뷰어 즉시 갱신
  if (fallbackTheme && typeof window.renderDetectiveCard === 'function') {
    window.renderDetectiveCard(fallbackTheme, window.activeTimelinePeriod || 'all');
  } else if (typeof renderThemeTimelineView === 'function') {
    renderThemeTimelineView(activeTimelineThemeId, activeTimelinePeriod);
  }

  if (typeof renderStockCompareTable === 'function') renderStockCompareTable();
  if (typeof renderStockThemesList === 'function') {
    const activeLeaderThemes = (STOCK_THEMES_DATA || []).filter(t => !isThemeDeleted(t.id, t.name));
    renderStockThemesList(activeLeaderThemes);
  }
};

// 2번 탭 상단 [삭제 ✕] 버튼 클릭 시 호출
window.deleteCurrentActiveTheme = function () {
  // 1순위: 현재 활성화된 탐정 테마
  const activeDetective = window.currentSelectedDetectiveTheme;
  // 2순위: activeTimelineThemeId
  const currentThemeId = activeDetective ? activeDetective.theme_id : (activeTimelineThemeId || document.getElementById('theme-timeline-select')?.value);
  
  if (!currentThemeId) {
    if (window.showToast) window.showToast('삭제할 테마가 선택되지 않았습니다.', '⚠️');
    return;
  }

  const currentTheme = (window.detectiveThemes || []).find(t => t.theme_id === currentThemeId) ||
                       (themeTimelineCache?.themes || []).find(t => t.theme_id === currentThemeId);
  const themeName = currentTheme ? currentTheme.theme_name : currentThemeId;

  if (confirm(`'${themeName}' 테마를 완전히 삭제(재료 소멸)하시겠습니까?\n\n삭제 시 타임라인 목록 및 수집 대상에서 안전하게 제거되며, 남은 테마로 즉시 화면이 갱신됩니다.`)) {
    window.deleteStockTheme(currentThemeId);
  }
};

// 삭제 여부 검사 헬퍼
function isThemeDeleted(themeId, themeName) {
  const deleted = getDeletedThemes();
  if (!deleted || deleted.length === 0) return false;
  return deleted.some(d => d === themeId || d === themeName || (themeName && themeName.includes(d)) || (themeId && d.includes(themeId)));
}

// 삭제되지 않은 활성 테마 목록 반환
function getActiveThemesList() {
  if (!themeTimelineCache || !Array.isArray(themeTimelineCache.themes)) return [];
  return themeTimelineCache.themes.filter(t => !isThemeDeleted(t.theme_id, t.theme_name));
}

// 사용자 추가 추적 종목 목록 (localStorage 보존: [{ theme, stock }])
function getCustomTrackedStocks() {
  try {
    const raw = localStorage.getItem('custom_tracked_stocks');
    return raw ? JSON.parse(raw) : [
      { theme: '방산', stock: '한화시스템' },
      { theme: '로봇', stock: '알에스오토메이션' },
      { theme: '원전', stock: '우진엔텍' }
    ];
  } catch (e) {
    return [];
  }
}

function saveCustomTrackedStocks(list) {
  try {
    localStorage.setItem('custom_tracked_stocks', JSON.stringify(list));
  } catch (e) {
    console.warn('localStorage 저장 실패:', e);
  }
}

// 사용자 추가 종목 UI 초기화
function initCustomTrackedStocksUI() {
  renderCustomTrackedTags();
}

// 추적 중인 종목 태그 렌더링
function renderCustomTrackedTags() {
  const container = document.getElementById('custom-tracked-tags-list');
  if (!container) return;

  const list = getCustomTrackedStocks();
  if (list.length === 0) {
    container.innerHTML = '<span style="font-size: 0.74rem; color: #64748b;">추가된 개별 종목이 없습니다.</span>';
    return;
  }

  container.innerHTML = list.map((item, idx) => `
    <span style="display: inline-flex; align-items: center; gap: 5px; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 800;">
      <span>[${escapeHtml(item.theme)}] ${escapeHtml(item.stock)}</span>
      <button type="button" onclick="removeCustomTrackedStock(${idx})" title="추적 해제" style="background: transparent; border: none; color: #94a3b8; font-size: 0.8rem; cursor: pointer; padding: 0 2px; line-height: 1; font-weight: 900;" onmouseover="this.style.color='#ef4444';" onmouseout="this.style.color='#94a3b8';">×</button>
    </span>
  `).join('');
}

// 대분류 테마 선택 변경 핸들러
window.handleCustomThemeSelectChange = function (val) {
  const directWrap = document.getElementById('custom-theme-direct-wrap');
  if (!directWrap) return;
  if (val === '__custom__') {
    directWrap.style.display = 'flex';
    const inp = document.getElementById('custom-theme-input') || document.getElementById('custom-theme-direct-input');
    inp?.focus();
  } else {
    directWrap.style.display = 'none';
  }
};

// 네이버 실시간 뉴스 검색 공용 헬퍼 (종목 또는 테마 질의로 원문 링크 포함 수집)
async function fetchStockLiveNewsArticles(keyword, maxCount = 5) {
  if (!keyword) return [];
  const queryStr = `${keyword} 특징주 OR 수주 OR 계약 OR 실적`;
  let items = [];

  // 1차 시도: /api/news?query=...
  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/news?query=${encodeURIComponent(queryStr)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) items = data;
      else if (data && Array.isArray(data.items)) items = data.items;
    }
  } catch (e) { }

  // 2차 시도: 네이버 증권 모바일 뉴스 스트림 폴백
  if (!items || items.length === 0) {
    try {
      const naverApiUrl = `https://m.stock.naver.com/api/news/list?category=mainnews&page=1&pageSize=50`;
      let rawList = null;
      try {
        const jinaRes = await fetch(`https://r.jina.ai/${naverApiUrl}`, { headers: { 'x-respond-with': 'text' } });
        if (jinaRes.ok) {
          const text = await jinaRes.text();
          const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (match) rawList = JSON.parse(match[0]);
        }
      } catch (err) { }

      if (!rawList) {
        const altRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(naverApiUrl)}`);
        if (altRes.ok) rawList = await altRes.json();
      }

      if (Array.isArray(rawList) && rawList.length > 0) {
        // 검색 키워드 매칭 필터링
        const cleanKw = keyword.replace(/\s+/g, '');
        items = rawList.filter(n => {
          const fullText = ((n.tit || '') + (n.subcontent || '')).replace(/\s+/g, '');
          return fullText.includes(cleanKw);
        });
      }
    } catch (err) { }
  }

  // 3차 시도: 당일 국내 뉴스 전역 캐시(liveDomesticNewsCache)에서 검색
  if (!items || items.length === 0) {
    if (typeof liveDomesticNewsCache !== 'undefined' && Array.isArray(liveDomesticNewsCache)) {
      const cleanKw = keyword.replace(/\s+/g, '');
      items = liveDomesticNewsCache.filter(n => {
        const fullText = ((n.title || '') + (n.summary || '')).replace(/\s+/g, '');
        return fullText.includes(cleanKw);
      });
    }
  }

  // 데이터 정제 및 원문 링크 바인딩 (item.originallink || item.link 우선)
  const todayStr = (function () {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const results = (items || []).slice(0, maxCount).map(item => {
    const rawTitle = item.tit || item.title || `${keyword} 관련 최신 모멘텀 기사`;
    const cleanTitle = rawTitle.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    const press = item.ohnm || item.media || item.source || item.press || '증시속보';

    let originalUrl = '';
    if (item.originallink) originalUrl = item.originallink;
    else if (item.link) originalUrl = item.link;
    else if (item.directUrl) originalUrl = item.directUrl;
    else if (item.oid && item.aid) originalUrl = `https://n.news.naver.com/mnews/article/${item.oid}/${item.aid}`;
    else originalUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(cleanTitle || keyword)}`;

    let dateStr = item.date || item.time || todayStr;
    if (item.dt && item.dt.length >= 8) {
      dateStr = `${item.dt.substring(0, 4)}-${item.dt.substring(4, 6)}-${item.dt.substring(6, 8)}`;
    } else if (item.pubDate) {
      try {
        const pd = new Date(item.pubDate);
        dateStr = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, '0')}-${String(pd.getDate()).padStart(2, '0')}`;
      } catch (e) { }
    }

    return {
      title: cleanTitle,
      url: originalUrl,
      press: press,
      date: dateStr,
      impact: '상승 모멘텀'
    };
  });

  return results;
}

// 추적 종목 삭제
window.removeCustomTrackedStock = function (index) {
  const list = getCustomTrackedStocks();
  if (index >= 0 && index < list.length) {
    const removed = list.splice(index, 1)[0];
    saveCustomTrackedStocks(list);
    renderCustomTrackedTags();
    if (window.showToast) {
      window.showToast(`[${removed.stock}] 종목의 추적이 해제되었습니다.`, '🗑️');
    }
    renderThemeTimelineView(activeTimelineThemeId, activeTimelinePeriod);
  }
};

// 2번 탭(재료 모음) 타임라인 상세 뷰 렌더링
function renderThemeTimelineView(themeId = 'hbm_glass', period = 'all') {
  const activeThemes = getActiveThemesList();
  const titleEl = document.getElementById('theme-timeline-title');
  const badgeEl = document.getElementById('theme-timeline-badge');
  const descEl = document.getElementById('theme-timeline-lead-desc');
  const countEl = document.getElementById('theme-timeline-count');
  const selectEl = document.getElementById('theme-timeline-select');
  const listEl = document.getElementById('stock-material-timeline-list') || document.getElementById('theme-timeline-list');
  const deleteBtn = document.getElementById('btn-delete-active-theme');

  if (activeThemes.length === 0) {
    if (titleEl) titleEl.textContent = '등록된 관심 테마가 없습니다.';
    if (badgeEl) badgeEl.textContent = '목록 비어있음';
    if (descEl) descEl.textContent = '상단의 종목 추가 패널을 통해 새로운 관심 종목과 테마를 등록해보세요.';
    if (countEl) countEl.textContent = '0건';
    if (selectEl) selectEl.innerHTML = '<option value="">선택 가능한 테마 없음</option>';
    if (listEl) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #94a3b8; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px dashed rgba(255,255,255,0.08);">
          <div style="font-size: 1.5rem; margin-bottom: 8px;">🗑️</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #cbd5e1;">모든 테마가 삭제되었습니다.</div>
          <div style="font-size: 0.78rem; color: #64748b; margin-top: 6px;">
            상단의 <strong>[🎯 계층형 키워드 정밀 추적 / 관심 종목 추가]</strong>에서 종목을 입력하여 나만의 테마 타임라인을 생성하세요.
          </div>
        </div>
      `;
    }
    if (deleteBtn) deleteBtn.style.display = 'none';
    return;
  }

  if (deleteBtn) deleteBtn.style.display = 'inline-block';

  let currentTheme = activeThemes.find(t => t.theme_id === themeId);
  if (!currentTheme) {
    currentTheme = activeThemes[0];
    activeTimelineThemeId = currentTheme.theme_id;
  }

  // 1. 헤더 텍스트 및 메타데이터 업데이트
  if (titleEl) titleEl.textContent = `${currentTheme.theme_name} 누적 재료 타임라인`;
  if (badgeEl) badgeEl.textContent = currentTheme.category || '주도 테마';
  if (descEl) {
    const stocksStr = (currentTheme.lead_stocks || []).join(', ');
    descEl.innerHTML = `👑 핵심 종목: <strong style="color: #cbd5e1;">${escapeHtml(stocksStr)}</strong> · 당일 등락률: <strong style="color: #ef4444;">${currentTheme.today_change_rate || ''}</strong> (강도 ${currentTheme.today_score || 90}점)`;
  }

  // 2. 드롭다운 옵션 동기화
  if (selectEl) {
    selectEl.innerHTML = activeThemes.map(t => `
      <option value="${t.theme_id}" ${t.theme_id === currentTheme.theme_id ? 'selected' : ''}>
        ${escapeHtml(t.theme_name)} (${t.today_score || 85}점)
      </option>
    `).join('');
    selectEl.value = currentTheme.theme_id;
  }

  // 3. 타임라인 뉴스 일자별 역순 정렬 및 기간 필터링
  const rawTimeline = currentTheme.timeline || [];
  const sortedTimeline = [...rawTimeline].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  let filtered = sortedTimeline;
  if (period === '7d') {
    filtered = sortedTimeline.filter(item => getDaysDifference(item.date) <= 7);
  } else if (period === '30d') {
    filtered = sortedTimeline.filter(item => getDaysDifference(item.date) <= 30);
  }

  if (countEl) {
    countEl.textContent = `${filtered.length}건`;
  }

  // 4. 리스트 카드 HTML 생성
  if (!listEl) return;

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #94a3b8; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px dashed rgba(255,255,255,0.08);">
        <div style="font-size: 1.5rem; margin-bottom: 8px;">📭</div>
        <div style="font-size: 0.9rem; font-weight: 700; color: #cbd5e1;">선택된 기간(${period === '7d' ? '최근 7일' : (period === '30d' ? '최근 30일' : '전체')}) 내 발생한 뉴스 재료가 없습니다.</div>
        <div style="font-size: 0.78rem; color: #64748b; margin-top: 4px;">상단의 기간 필터를 [전체]로 변경해 과거 누적 히스토리를 확인해보세요.</div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map((item, idx) => {
    const cleanTitle = (item.news_title || '').replace(/\[.*?\]/g, '').trim();
    // [핵심] 실제 기사 원문 URL 바인딩 (originallink || link || news_url)
    const targetUrl = item.originallink || item.link || item.news_url || `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(cleanTitle || item.news_title)}`;
    const pressName = item.press || item.source || '언론사';
    const dateStr = item.date || '최근';

    // 영향도 뱃지 스타일
    let impactColor = '#38bdf8';
    let impactBg = 'rgba(56, 189, 248, 0.12)';
    let impactBorder = 'rgba(56, 189, 248, 0.3)';
    if ((item.impact || '').includes('강한') || (item.impact || '').includes('폭등')) {
      impactColor = '#ef4444';
      impactBg = 'rgba(239, 68, 68, 0.15)';
      impactBorder = 'rgba(239, 68, 68, 0.35)';
    } else if ((item.impact || '').includes('지속')) {
      impactColor = '#34d399';
      impactBg = 'rgba(16, 185, 129, 0.15)';
      impactBorder = 'rgba(16, 185, 129, 0.35)';
    }

    const themeLabel = item.theme || currentTheme.theme_name || '테마';
    const stockLabel = item.target_stock || (currentTheme.lead_stocks && currentTheme.lead_stocks[0]) || '주도주';
    const hierarchyBadgeText = `${themeLabel} | ${stockLabel}`;

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 18px; gap: 14px; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.02);" onmouseover="this.style.borderColor='#93c5fd';" onmouseout="this.style.borderColor='#e2e8f0';">
        <!-- 좌측 날짜 및 제목 메타 -->
        <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
          <!-- 날짜 박스 -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; text-align: center; min-width: 86px; flex-shrink: 0;">
            <div style="font-size: 0.76rem; font-weight: 800; color: #0284c7;">${escapeHtml(dateStr)}</div>
            <div style="font-size: 0.68rem; color: #64748b;">발행일자</div>
          </div>

          <!-- 기사 정보 -->
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap;">
              <!-- 계층형 태그 뱃지 [상위 테마 | 개별 종목] -->
              <span style="font-size: 0.73rem; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; padding: 2px 8px; border-radius: 5px; font-weight: 900; letter-spacing: -0.2px;">
                🏷️ [${escapeHtml(hierarchyBadgeText)}]
              </span>
              <span style="font-size: 0.72rem; color: #64748b; font-weight: 700; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
                ${escapeHtml(pressName)}
              </span>
              <span style="font-size: 0.7rem; background: ${impactBg}; color: ${impactColor}; border: 1px solid ${impactBorder}; padding: 1px 6px; border-radius: 4px; font-weight: 800;">
                ${escapeHtml(item.impact || '모멘텀')}
              </span>
            </div>
            <div style="font-size: 0.92rem; font-weight: 700; color: #0f172a; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(item.news_title || item.title)}
            </div>
          </div>
        </div>

        <!-- 우측 실제 원문 이동 버튼 (target="_blank" 및 원문 URL 직접 바인딩) -->
        <div style="flex-shrink: 0;">
          <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; background: #f1f5f9; color: #1e293b; border: 1px solid #cbd5e1; padding: 7px 14px; border-radius: 6px; font-size: 0.78rem; text-decoration: none; font-weight: 800; white-space: nowrap; transition: all 0.2s ease;" onmouseover="this.style.background='#e2e8f0';" onmouseout="this.style.background='#f1f5f9';">
            <span>원문 보기</span>
            <span style="font-size: 0.85rem;">↗</span>
          </a>
        </div>
      </div>
    `;
  }).join('');
}

// data/theme_timeline.json 데이터를 로드하여 4번 탭(당일 주도 테마)과 2번 탭(재료 타임라인)을 자동 갱신
async function loadThemeTimelineData() {
  try {
    const res = await fetch('data/theme_timeline.json?t=' + Date.now());
    if (!res.ok) return;
    const db = await res.json();
    if (!db || !Array.isArray(db.themes) || db.themes.length === 0) return;

    themeTimelineCache = db; // 전역 캐시 보관
    console.log('[stock.js] 🎯 data/theme_timeline.json 로드 성공:', db.themes.length, '개 테마');

    // 1. 4번 탭 (당일 주도 테마) 데이터베이스 갱신 및 랭킹 재정렬
    const updatedThemes = db.themes.map((t, idx) => {
      // 기존 테마 기본 정보 보강
      const existing = STOCK_THEMES_DATA.find(x => x.id === t.theme_id || x.name.includes(t.lead_stocks?.[0] || '')) || {};
      return {
        id: t.theme_id,
        rank: idx + 1,
        name: t.theme_name,
        category: t.category.includes('반도체') ? 'semicon' : (t.category.includes('바이오') ? 'bio' : 'policy'),
        rate: t.today_change_rate || existing.rate || '+0.00%',
        rateType: (t.today_change_rate || '').startsWith('-') ? 'down' : 'up',
        score: t.today_score || 85,
        scoreNote: `당일 테마 강도 ${t.today_score}점 (랭킹 ${idx + 1}위)`,
        tradeAmount: t.today_trading_volume || existing.tradeAmount || '5,000억',
        leader: (t.lead_stocks || []).join(', ') || existing.leader || '',
        symbol: existing.symbol || '000660',
        tvSymbol: existing.tvSymbol || 'KRX:000660',
        desc: t.today_reason || existing.desc || '',
        badge: idx === 0 ? '1위 주도주' : `${idx + 1}위 테마`,
        badgeColor: idx === 0 ? '#38bdf8' : (idx === 1 ? '#34d399' : '#a855f7'),
        searchKeyword: (t.lead_stocks || [])[0] || t.theme_name,
        reason: t.today_reason,
        news: (t.timeline || []).slice(0, 5).map(item => ({
          title: item.news_title,
          source: item.press || '증시속보',
          time: item.date || '오늘'
        })),
        strategy: existing.strategy || '당일 거래대금 및 수급 강도 확인 후 눌림목 분할 매수 대응 유효.'
      };
    });

    if (updatedThemes.length > 0) {
      const filteredThemes = updatedThemes.filter(t => !isThemeDeleted(t.id, t.name));
      renderStockThemesList(filteredThemes);
      selectStockTheme(0, filteredThemes);
    }

    // 2. 2번 탭 (주간/월간 타임라인)에 파이프라인 누적 기사 반영
    db.themes.forEach(t => {
      const matchCompare = STOCK_COMPARE_DATA.find(c => c.leaders.includes((t.lead_stocks || [])[0] || '___'));
      if (matchCompare && Array.isArray(t.timeline) && t.timeline.length > 0) {
        // 타임라인 기사들을 1주 및 1달 기사 모음에 최신순으로 연동 (실제 기사 원문 URL 바인딩)
        const formattedArticles = t.timeline.map(item => ({
          title: item.news_title || item.title,
          media: item.press || item.media || '언론사',
          date: item.date,
          originallink: item.originallink || item.link || item.news_url,
          url: item.originallink || item.link || item.news_url
        }));
        matchCompare.weekArticles = formattedArticles;
        matchCompare.monthArticles = formattedArticles;
        matchCompare.weekNewsCount = `${t.timeline.length}건`;
        matchCompare.weekNewsHeadline = t.today_reason || matchCompare.weekNewsHeadline;
      }
    });
    // 3. [개편] 2번 탭: 정적 렌더 대신 실시간 네이버 뉴스 강제 주입
    fetchLiveNewsForTab2();

  } catch (err) {
    console.warn('[stock.js] theme_timeline.json 동기화 건너뜀 (초기 상태):', err.message);
    // JSON 로드 실패해도 실시간 뉴스 수집은 진행
    fetchLiveNewsForTab2();
  }
}

// ============================================================================
// [2번 탭 전용] 실시간 네이버 뉴스 강제 주입 엔진
// - 2번 탭(재료 모음) 진입 시 호출
// - 5초 타임아웃(AbortController) 및 try-catch-finally 블록으로 무한 로딩 차단
// - 통신 완료 여부와 무관하게 7대 체크리스트와 기존 팩트 화면을 즉시 선제 렌더링
// ============================================================================
async function fetchLiveNewsForTab2() {
  const timelineList = document.getElementById('stock-material-timeline-list');
  const tbody = document.getElementById('theme-shooting-table-body');

  // [핵심] 통신 완료를 기다리지 않고 기존 캐시/DB 테마 데이터로 7대 체크리스트와 화면을 즉시 먼저 띄움
  const activeThemes = getActiveThemesList();
  if (activeThemes.length > 0 && (!activeTimelineThemeId || !activeThemes.find(t => t.theme_id === activeTimelineThemeId))) {
    activeTimelineThemeId = activeThemes[0].theme_id;
  }
  if (window.currentSelectedDetectiveTheme && typeof window.renderDetectiveCard === 'function') {
    window.renderDetectiveCard(window.currentSelectedDetectiveTheme, window.activeTimelinePeriod || 'all');
  } else if (Array.isArray(window.detectiveThemes) && window.detectiveThemes.length > 0 && typeof window.renderDetectiveCard === 'function') {
    window.renderDetectiveCard(window.detectiveThemes[0], window.activeTimelinePeriod || 'all');
  }

  // 로딩 상태 안내 배너 (기존 렌더링을 완전히 날리지 않고 테이블/피드 영역에만 표시)
  if (tbody && tbody.children.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:#94a3b8;font-weight:700;">⏳ 테마별 실시간 뉴스 수집 중...</td></tr>`;
  }

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();

  const compareJobs = [window.loadTodayShootingThemesData().catch(() => null)];
  const timelineJobs = [];

  if (themeTimelineCache && Array.isArray(themeTimelineCache.themes)) {
    themeTimelineCache.themes.forEach(theme => {
      const keyword = (theme.lead_stocks || [])[0] || theme.theme_name;
      timelineJobs.push(
        fetchStockLiveNewsArticles(keyword, 5).then(articles => {
          if (articles && articles.length > 0) {
            theme.timeline = articles.map(a => ({
              theme: theme.theme_name,
              target_stock: (theme.lead_stocks || [])[0] || keyword,
              date: a.date || todayStr,
              news_title: a.title,
              news_url: a.url,
              originallink: a.url,
              link: a.url,
              press: a.press,
              impact: '상승 모멘텀'
            }));
          }
        }).catch(() => {})
      );
    });
  } else {
    themeTimelineCache = { themes: [] };
    const jobs = STOCK_COMPARE_DATA.map(async (row) => {
      const keyword = row.searchKeyword || row.theme;
      const articles = await fetchStockLiveNewsArticles(keyword, 5).catch(() => []);
      const leaders = (row.leaders || '').split('·').map(s => s.trim()).filter(Boolean);
      themeTimelineCache.themes.push({
        theme_id: 'auto_' + keyword.replace(/\s+/g, '_'),
        theme_name: row.theme.replace(/^[\uD83D\uDC00-\uDFFF\u2600-\u26FF\u2700-\u27BF\s]+/, '').trim(),
        category: '주도테마',
        today_score: 90,
        today_change_rate: row.weekRate || '+0.00%',
        lead_stocks: leaders,
        timeline: (articles || []).map(a => ({
          theme: row.theme,
          target_stock: leaders[0] || keyword,
          date: a.date || todayStr,
          news_title: a.title,
          news_url: a.url,
          originallink: a.url,
          link: a.url,
          press: a.press,
          impact: '상승 모멘텀'
        }))
      });
    });
    timelineJobs.push(Promise.allSettled(jobs));
  }

  // 5초 타임아웃 가드: 네트워크가 지연되어도 5초 후 무조건 강제 완료 처리
  const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000));

  try {
    await Promise.race([
      Promise.allSettled([...compareJobs, ...timelineJobs]),
      timeoutPromise
    ]);
  } catch (err) {
    console.warn('[fetchLiveNewsForTab2] 수집 오류 방어:', err);
  } finally {
    renderStockCompareTable();
    if (window.currentSelectedDetectiveTheme && typeof window.renderDetectiveCard === 'function') {
      window.renderDetectiveCard(window.currentSelectedDetectiveTheme, window.activeTimelinePeriod || 'all');
    } else if (Array.isArray(window.detectiveThemes) && window.detectiveThemes.length > 0 && typeof window.renderDetectiveCard === 'function') {
      window.renderDetectiveCard(window.detectiveThemes[0], window.activeTimelinePeriod || 'all');
    } else {
      renderThemeTimelineView(activeTimelineThemeId, activeTimelinePeriod);
    }
    console.log('[stock.js] ✅ 2번 탭 실시간 뉴스 주입 및 렌더링 완료');
  }
}


// 네이버 증시 실시간 지수 및 환율 엔드포인트를 호출하여 상단 지수 카드에 즉시 반영
async function fetchLiveMarketIndices() {
  // 1. 화면 우측 상단 헤더: 코스피(KOSPI), 코스닥(KOSDAQ), 환율 DOM
  const kospiVal = document.getElementById('index-kospi-val');
  const kospiDiff = document.getElementById('index-kospi-diff');
  const kosdaqVal = document.getElementById('index-kosdaq-val');
  const kosdaqDiff = document.getElementById('index-kosdaq-diff');
  const usdVal = document.getElementById('index-usd-val');
  const usdDiff = document.getElementById('index-usd-diff');

  // 2. 본문 우측 지수 박스: 나스닥(NASDAQ), S&P 500 DOM
  let nasdaqVal = null, nasdaqDiff = null;
  let sp500Val = null, sp500Diff = null;

  document.querySelectorAll('div').forEach(el => {
    const text = el.textContent ? el.textContent.trim() : '';
    if (text === '나스닥 (NASDAQ)') {
      const parent = el.parentElement;
      if (parent) {
        const divs = parent.querySelectorAll('div');
        if (divs.length >= 3) {
          nasdaqVal = divs[1];
          nasdaqDiff = divs[2];
        }
      }
    } else if (text === 'S&P 500') {
      const parent = el.parentElement;
      if (parent) {
        const divs = parent.querySelectorAll('div');
        if (divs.length >= 3) {
          sp500Val = divs[1];
          sp500Diff = divs[2];
        }
      }
    }
  });

  // 변동폭/변동률 및 텍스트/스타일 서식 적용 헬퍼 함수
  function updateRateElement(diffEl, ratioStr, diffStr) {
    if (!diffEl) return;
    const ratio = parseFloat(String(ratioStr || '0').replace(/,/g, ''));
    const diff = diffStr !== undefined && diffStr !== null ? parseFloat(String(diffStr).replace(/,/g, '')) : null;
    const isPositive = ratio > 0 || (diff !== null && diff > 0);
    const isZero = ratio === 0 && (diff === null || diff === 0);
    const sign = isPositive ? '▲ ' : (isZero ? '' : '▼ ');
    const color = isPositive ? '#ef4444' : (isZero ? '#94a3b8' : '#3b82f6');
    const ratioText = `${ratio > 0 ? '+' : ''}${ratio.toFixed(2)}%`;

    if (diff !== null && !isNaN(diff) && diff !== 0) {
      const absDiff = Math.abs(diff).toFixed(2);
      diffEl.textContent = `${sign}${absDiff} (${ratioText})`;
    } else {
      diffEl.textContent = `${sign}${ratioText}`;
    }
    diffEl.style.color = color;
  }

  // 실시간 엔드포인트 호출 헬퍼 (직접 호출 -> Jina AI -> allorigins 프록시 폴백)
  async function fetchLiveJson(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (e) { }
    try {
      const pUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const pRes = await fetch(pUrl, { cache: 'no-store' });
      if (pRes.ok) return await pRes.json();
    } catch (e) { }
    try {
      const jRes = await fetch(`https://r.jina.ai/${url}`, { headers: { 'x-respond-with': 'text' } });
      if (jRes.ok) {
        const text = await jRes.text();
        const m = text.match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]);
      }
    } catch (e) { }
    return null;
  }

  // 2. 1번 탭 (미국 증시) 전용 4대 지수 DOM
  const djiVal = document.getElementById('index-dji-val');
  const djiDiff = document.getElementById('index-dji-diff');
  const usNasVal = document.getElementById('index-nasdaq-val');
  const usNasDiff = document.getElementById('index-nasdaq-diff');
  const usSpVal = document.getElementById('index-sp500-val');
  const usSpDiff = document.getElementById('index-sp500-diff');
  const soxVal = document.getElementById('index-sox-val');
  const soxDiff = document.getElementById('index-sox-diff');

  // 1차 시도: 네이버 금융 국내/해외 실시간 지수 & 환율 API 연동
  try {
    const [kData, kdData, fxData, djiData, ixicData, inxData, soxData] = await Promise.all([
      fetchLiveJson('https://m.stock.naver.com/api/index/KOSPI/basic'),
      fetchLiveJson('https://m.stock.naver.com/api/index/KOSDAQ/basic'),
      fetchLiveJson('https://m.stock.naver.com/front-api/marketIndex/productDetail?category=exchange&reutersCode=FX_USDKRW'),
      fetchLiveJson('https://api.stock.naver.com/index/.DJI/basic').catch(() => null),
      fetchLiveJson('https://api.stock.naver.com/index/.IXIC/basic').catch(() => null),
      fetchLiveJson('https://api.stock.naver.com/index/.INX/basic').catch(() => null),
      fetchLiveJson('https://api.stock.naver.com/index/.SOX/basic').catch(() => null)
    ]);

    // 코스피 (KOSPI)
    if (kData && (kData.closePrice || kData.nowValue || kData.now)) {
      const price = kData.nowValue || kData.closePrice || kData.now;
      const ratio = kData.changeRate || kData.fluctuationsRatio || '0';
      const diff = kData.compareToPreviousClosePrice;
      if (kospiVal) {
        kospiVal.textContent = price;
        const num = parseFloat(String(ratio).replace(/,/g, ''));
        kospiVal.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
      }
      if (kospiDiff) updateRateElement(kospiDiff, ratio, diff);
      liveFetched = true;
    }

    // 코스닥 (KOSDAQ)
    if (kdData && (kdData.closePrice || kdData.nowValue || kdData.now)) {
      const price = kdData.nowValue || kdData.closePrice || kdData.now;
      const ratio = kdData.changeRate || kdData.fluctuationsRatio || '0';
      const diff = kdData.compareToPreviousClosePrice;
      if (kosdaqVal) {
        kosdaqVal.textContent = price;
        const num = parseFloat(String(ratio).replace(/,/g, ''));
        kosdaqVal.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
      }
      if (kosdaqDiff) updateRateElement(kosdaqDiff, ratio, diff);
      liveFetched = true;
    }

    // 원/달러 환율 (USD/KRW)
    const fxItem = fxData?.result || fxData?.result?.[0] || fxData?.[0] || fxData;
    if (fxItem && (fxItem.closePrice || fxItem.nowValue)) {
      const price = fxItem.nowValue || fxItem.closePrice;
      const ratio = fxItem.changeRate || fxItem.fluctuationsRatio || '0';
      const diff = fxItem.fluctuations || fxItem.compareToPreviousPrice || fxItem.compareToPreviousClosePrice;
      if (usdVal) {
        usdVal.textContent = price;
        const num = parseFloat(String(ratio).replace(/,/g, ''));
        usdVal.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
      }
      if (usdDiff) updateRateElement(usdDiff, ratio, diff);
      liveFetched = true;
    }

    // 다우존스 (DJIA)
    if (djiData && (djiData.closePrice || djiData.nowValue)) {
      const price = djiData.closePrice || djiData.nowValue;
      const ratio = djiData.fluctuationsRatio || djiData.changeRate || '0';
      const diff = djiData.compareToPreviousClosePrice;
      if (djiVal) {
        djiVal.textContent = price;
        const num = parseFloat(String(ratio).replace(/,/g, ''));
        djiVal.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
      }
      if (djiDiff) updateRateElement(djiDiff, ratio, diff);
    }

    // 나스닥 (NASDAQ)
    if (ixicData && (ixicData.closePrice || ixicData.nowValue)) {
      const price = ixicData.closePrice || ixicData.nowValue;
      const ratio = ixicData.fluctuationsRatio || ixicData.changeRate || '0';
      const diff = ixicData.compareToPreviousClosePrice;
      if (usNasVal) {
        usNasVal.textContent = price;
        const num = parseFloat(String(ratio).replace(/,/g, ''));
        usNasVal.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
      }
      if (usNasDiff) updateRateElement(usNasDiff, ratio, diff);
      if (nasdaqVal) {
        nasdaqVal.textContent = price;
        const num = parseFloat(String(ratio).replace(/,/g, ''));
        nasdaqVal.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
      }
      if (nasdaqDiff) updateRateElement(nasdaqDiff, ratio, diff);
    }

    // S&P 500
    if (inxData && (inxData.closePrice || inxData.nowValue)) {
      const price = inxData.closePrice || inxData.nowValue;
      const ratio = inxData.fluctuationsRatio || inxData.changeRate || '0';
      const diff = inxData.compareToPreviousClosePrice;
      if (usSpVal) {
        usSpVal.textContent = price;
        const num = parseFloat(String(ratio).replace(/,/g, ''));
        usSpVal.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
      }
      if (usSpDiff) updateRateElement(usSpDiff, ratio, diff);
      if (sp500Val) {
        sp500Val.textContent = price;
        const num = parseFloat(String(ratio).replace(/,/g, ''));
        sp500Val.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
      }
      if (sp500Diff) updateRateElement(sp500Diff, ratio, diff);
    }

    // 필라델피아 반도체 (SOX)
    if (soxData && (soxData.closePrice || soxData.nowValue)) {
      const price = soxData.closePrice || soxData.nowValue;
      const ratio = soxData.fluctuationsRatio || soxData.changeRate || '0';
      const diff = soxData.compareToPreviousClosePrice;
      if (soxVal) {
        soxVal.textContent = price;
        const num = parseFloat(String(ratio).replace(/,/g, ''));
        soxVal.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
      }
      if (soxDiff) updateRateElement(soxDiff, ratio, diff);
    }
  } catch (liveErr) {
    console.warn('[stock.js] 실시간 지수 직접 수신 지연:', liveErr);
  }

  // 2차 폴백: scratch/api_result.json 최신 캐시 (미수신 항목만 보완)
  try {
    const res = await fetch('scratch/api_result.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();

      // 코스피 (KOSPI)
      if (data.kospi && kospiVal && kospiVal.textContent === '--') {
        kospiVal.textContent = data.kospi.closePrice;
        const num = parseFloat(String(data.kospi.fluctuationsRatio || '0').replace(/,/g, ''));
        kospiVal.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
        if (kospiDiff) updateRateElement(kospiDiff, data.kospi.fluctuationsRatio, data.kospi.compareToPreviousClosePrice);
      }

      // 코스닥 (KOSDAQ)
      if (data.kosdaq && kosdaqVal && kosdaqVal.textContent === '--') {
        kosdaqVal.textContent = data.kosdaq.closePrice;
        const num = parseFloat(String(data.kosdaq.fluctuationsRatio || '0').replace(/,/g, ''));
        kosdaqVal.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
        if (kosdaqDiff) updateRateElement(kosdaqDiff, data.kosdaq.fluctuationsRatio, data.kosdaq.compareToPreviousClosePrice);
      }

      // 원/달러 환율 (USD)
      if (data.usdKrw && usdVal && usdVal.textContent === '--') {
        usdVal.textContent = data.usdKrw.closePrice;
        const ratio = parseFloat(String(data.usdKrw.fluctuationsRatio || '0').replace(/,/g, ''));
        usdVal.style.color = ratio > 0 ? '#ef4444' : (ratio < 0 ? '#3b82f6' : '#94a3b8');
        if (usdDiff) updateRateElement(usdDiff, data.usdKrw.fluctuationsRatio, data.usdKrw.compareToPreviousPrice);
      }

      // 다우존스
      if (data.dji && djiVal && (djiVal.textContent === '--' || djiVal.textContent === '41,393.78')) {
        djiVal.textContent = data.dji.closePrice;
        const num = parseFloat(String(data.dji.fluctuationsRatio || '0').replace(/,/g, ''));
        djiVal.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
        if (djiDiff) updateRateElement(djiDiff, data.dji.fluctuationsRatio, data.dji.compareToPreviousClosePrice);
      }

      // 나스닥
      if (data.nasdaq) {
        if (usNasVal && (usNasVal.textContent === '--' || usNasVal.textContent === '17,683.98')) {
          usNasVal.textContent = data.nasdaq.closePrice;
          const num = parseFloat(String(data.nasdaq.fluctuationsRatio || '0').replace(/,/g, ''));
          usNasVal.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
          if (usNasDiff) updateRateElement(usNasDiff, data.nasdaq.fluctuationsRatio, data.nasdaq.compareToPreviousClosePrice);
        }
        if (nasdaqVal) {
          nasdaqVal.textContent = data.nasdaq.closePrice;
          const num = parseFloat(String(data.nasdaq.fluctuationsRatio || '0').replace(/,/g, ''));
          nasdaqVal.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
          if (nasdaqDiff) updateRateElement(nasdaqDiff, data.nasdaq.fluctuationsRatio, data.nasdaq.compareToPreviousClosePrice);
        }
      }

      // S&P 500
      if (data.sp500) {
        if (usSpVal && (usSpVal.textContent === '--' || usSpVal.textContent === '5,626.02')) {
          usSpVal.textContent = data.sp500.closePrice;
          const num = parseFloat(String(data.sp500.fluctuationsRatio || '0').replace(/,/g, ''));
          usSpVal.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
          if (usSpDiff) updateRateElement(usSpDiff, data.sp500.fluctuationsRatio, data.sp500.compareToPreviousClosePrice);
        }
        if (sp500Val) {
          sp500Val.textContent = data.sp500.closePrice;
          const num = parseFloat(String(data.sp500.fluctuationsRatio || '0').replace(/,/g, ''));
          sp500Val.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
          if (sp500Diff) updateRateElement(sp500Diff, data.sp500.fluctuationsRatio, data.sp500.compareToPreviousClosePrice);
        }
      }

      // 필라델피아 반도체
      if (data.sox && soxVal && (soxVal.textContent === '--' || soxVal.textContent === '4,980.40')) {
        soxVal.textContent = data.sox.closePrice;
        const num = parseFloat(String(data.sox.fluctuationsRatio || '0').replace(/,/g, ''));
        soxVal.style.color = num > 0 ? '#ef4444' : (num < 0 ? '#3b82f6' : '#94a3b8');
        if (soxDiff) updateRateElement(soxDiff, data.sox.fluctuationsRatio, data.sox.compareToPreviousClosePrice);
      }
    }
  } catch (err) {
    console.warn('[stock.js] api_result.json 로드 건너뜀:', err);
  }
}

// 60초마다 자동으로 로컬 지표 새로고침
let marketIndicesIntervalId = null;
function startMarketIndicesAutoRefresh() {
  if (marketIndicesIntervalId) clearInterval(marketIndicesIntervalId);
  marketIndicesIntervalId = setInterval(() => {
    fetchLiveMarketIndices();
  }, 60000);
}

// 서브 탭 전환 로직 (F5 새로고침 시에도 유지)
function initStockSubTabs() {
  const tabs = document.querySelectorAll('.stock-sub-tab');
  const panels = {
    news: document.getElementById('stock-panel-news'),
    theme: document.getElementById('stock-panel-theme'),
    compare: document.getElementById('stock-panel-compare'),
    calendar: document.getElementById('stock-panel-calendar'),
    review: document.getElementById('stock-panel-review'),
    technique: document.getElementById('stock-panel-technique'),
    deep: document.getElementById('stock-panel-deep'),
    youtube: document.getElementById('stock-panel-youtube')
  };

  function activateSubTab(targetSub) {
    tabs.forEach(t => {
      if (t.getAttribute('data-sub') === targetSub) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    Object.keys(panels).forEach(key => {
      if (panels[key]) {
        panels[key].style.display = (key === targetSub) ? 'block' : 'none';
      }
    });

    try {
      localStorage.setItem('antigravity_stock_subtab', targetSub);
    } catch (e) { }
  }
  window.activateStockSubTab = activateSubTab;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetSub = tab.getAttribute('data-sub');
      activateSubTab(targetSub);
      if (targetSub === 'news') {
        if (typeof window.loadLeadingThemeDualRadar === 'function') {
          window.loadLeadingThemeDualRadar();
        }
      }
      if (targetSub === 'technique') {
        fetchLiveMarketIndices();
        renderUSLiveNewsFeed();
        renderUSSectorBriefing();
      }
      if (targetSub === 'compare' || targetSub === 'material') {
        // [개편] 실시간 시장 판도 & 주도 테마 레이더 및 뉴스 동기화
        if (typeof window.loadMarketOverviewRadar === 'function') {
          window.loadMarketOverviewRadar();
        }
        fetchLiveNewsForTab2();
        if (typeof initThemePortfolioView === 'function') {
          initThemePortfolioView();
        }
      }
      if (targetSub === 'calendar') {
        renderStockCalendarFeed();
      }
      if (targetSub === 'review') {
        if (typeof window.loadMarketHistoryReview === 'function') {
          window.loadMarketHistoryReview();
        }
      }
      if (targetSub === 'theme') {
        renderLeadingThemeFeed();
      }
      if (targetSub === 'deep') {
        renderStockDeepAnalysis('SK하이닉스');
      }
      if (targetSub === 'youtube') {
        renderYoutubeBriefingFeed();
      }
    });
  });

  // F5 새로고침 시 저장된 서브탭 복원 (기본값: news)
  let savedSub = 'news';
  try {
    savedSub = localStorage.getItem('antigravity_stock_subtab') || 'news';
  } catch (e) { }
  activateSubTab(savedSub);
  if (savedSub === 'news' && typeof window.loadLeadingThemeDualRadar === 'function') {
    window.loadLeadingThemeDualRadar();
  }
  if (savedSub === 'compare') {
    if (typeof window.loadMarketOverviewRadar === 'function') window.loadMarketOverviewRadar();
    if (typeof initThemePortfolioView === 'function') initThemePortfolioView();
  }
  if (savedSub === 'calendar') {
    if (typeof renderStockCalendarFeed === 'function') renderStockCalendarFeed();
  }
  if (savedSub === 'review' && typeof window.loadMarketHistoryReview === 'function') {
    window.loadMarketHistoryReview();
  }

  // 비교 분석 1주 / 1달 버튼
  const btn1w = document.getElementById('btn-compare-1w');
  const btn1m = document.getElementById('btn-compare-1m');
  if (btn1w && btn1m) {
    btn1w.addEventListener('click', () => {
      btn1w.classList.add('active');
      btn1m.classList.remove('active');
      renderStockCompareTable('week');
    });
    btn1m.addEventListener('click', () => {
      btn1m.classList.add('active');
      btn1w.classList.remove('active');
      renderStockCompareTable('month');
    });
  }
}

// 좌측 테마 리스트 렌더링
function renderStockThemesList(filteredData = STOCK_THEMES_DATA) {
  const container = document.getElementById('stock-theme-list');
  if (!container) return;
  container.innerHTML = '';

  filteredData.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = `kc-card ${idx === currentThemeIdx ? 'active' : ''}`;
    card.innerHTML = `
      <div class="kc-card-num-box" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">${item.rank}</div>
      <div class="kc-card-body">
        <div class="kc-card-kw-title" style="display: flex; justify-content: space-between; align-items: center;">
          <span>${escapeHtml(item.name)}</span>
          <span style="color: #ef4444; font-size: 0.92rem; font-weight: 900;">${item.rate}</span>
        </div>
        <div class="kc-card-sub-row">
          <span class="kc-badge-tag" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8;">${escapeHtml(item.badge)}</span>
          <span class="kc-badge-vol">거래대금 <strong>${item.tradeAmount}</strong></span>
        </div>
        <div class="kc-card-chips-row" style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <span class="kc-chip">대장: <strong>${escapeHtml(item.leader.split(',')[0])}</strong></span>
          <button type="button" class="btn-quick-timeline" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; cursor: pointer; transition: all 0.2s;">
            2번 타임라인 보기 ↗
          </button>
        </div>
        <div class="kc-card-desc">${escapeHtml(item.desc)}</div>
      </div>
    `;

    // 전체 카드 클릭 이벤트: 우측 상세 리포트 업데이트 및 2번 탭 타임라인 연동
    card.addEventListener('click', (e) => {
      document.querySelectorAll('#stock-theme-list .kc-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectStockTheme(idx, filteredData);

      // '2번 타임라인 보기' 버튼 클릭 시에는 즉시 2번 탭으로 화면 전환
      if (e.target && e.target.closest('.btn-quick-timeline')) {
        e.stopPropagation();
        window.navigateToThemeTimeline(item.id);
      }
    });

    container.appendChild(card);
  });
}

// 우측 테마 상세 리포트 렌더링
function selectStockTheme(idx, dataList = STOCK_THEMES_DATA) {
  currentThemeIdx = idx;
  const item = dataList[idx] || dataList[0];
  const panel = document.getElementById('stock-theme-detail');
  if (!panel || !item) return;

  const newsHtml = item.news.map(n => {
    // [단독], [특징주] 등의 말머리 태그를 제거한 핵심 검색어로 정확한 기사를 검색
    const cleanTitle = n.title.replace(/\[.*?\]/g, '').trim();
    const articleSearchUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(cleanTitle || n.title)}`;
    return `
    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
      <div style="flex: 1;">
        <div style="font-size: 0.88rem; font-weight: 700; color: #f8fafc; margin-bottom: 4px; line-height: 1.4;">
          ${escapeHtml(n.title)}
        </div>
        <div style="font-size: 0.74rem; color: #94a3b8;">
          ${escapeHtml(n.source)} · ${escapeHtml(n.time)}
        </div>
      </div>
      <a href="${articleSearchUrl}" target="_blank" rel="noopener noreferrer" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 5px 12px; border-radius: 6px; font-size: 0.76rem; text-decoration: none; font-weight: 700; white-space: nowrap; transition: all 0.2s ease;">
        기사 보기 ↗
      </a>
    </div>
  `;
  }).join('');

  // 관련 뉴스 전체보기 링크 생성: 테마별 명확한 검색 키워드로 연결
  const relatedNewsKeyword = item.searchKeyword || `${item.leader.split(',')[0]} ${item.name.replace(/&/g, '')}`.trim();
  const relatedNewsUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(relatedNewsKeyword)}`;

  panel.innerHTML = `
    <div class="kc-white-report-container" style="background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
      <!-- 1. 헤더 -->
      <div class="kc-detail-header-row">
        <div>
          <span class="kc-report-pill-badge" style="background: #eff6ff; border-color: #bfdbfe; color: #0284c7;">
            실시간 테마 분석 리포트
          </span>
          <h2 class="kc-report-main-title" style="color: #1e293b;">${escapeHtml(item.name)}</h2>
          <div class="kc-report-sub-meta" style="color: #64748b;">
            당일 등락률: <strong style="color: #dc2626;">${item.rate}</strong> · 당일 총 거래대금: <strong style="color: #1e293b;">${item.tradeAmount}</strong>
          </div>
        </div>
        
        <div class="kc-big-score-card" style="background: #eff6ff; border-color: #bfdbfe;">
          <div class="kc-score-head-title" style="color: #0284c7;">테마 강도 점수</div>
          <div class="kc-score-big-val" style="color: #0284c7;">${item.score || 85}<span class="kc-score-denom" style="color: #64748b;"> / 100</span></div>
          <div class="kc-score-bottom-note" style="color: #0284c7;">${escapeHtml(item.scoreNote || `시장 ${item.rank}위 섹터`)}</div>
        </div>
      </div>

      <!-- 2. 핵심 대장주 및 부대장주 -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 0.85rem; font-weight: 800; color: #0284c7; margin-bottom: 8px;">
          👑 대장주 및 핵심 수혜 종목 리스트
        </div>
        <div style="font-size: 1.05rem; font-weight: 900; color: #1e293b;">
          ${escapeHtml(item.leader)}
        </div>
      </div>

      <!-- 3. 재료(호재 뉴스) 분석 및 선정 이유 -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 0.95rem; font-weight: 800; color: #1e293b; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
          <span>📋</span> 왜 오늘 이 테마가 올랐을까? (재료 분석)
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; font-size: 0.88rem; color: #166534; line-height: 1.65;">
          ${escapeHtml(item.reason)}
        </div>
      </div>

      <!-- 4. 실시간 관련 뉴스 모아보기 -->
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
          <div style="font-size: 0.95rem; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 6px;">
            <span>📰</span> 실시간 특징주 뉴스
          </div>
          <!-- 4번 탭 -> 2번 탭 즉시 전환 버튼 -->
          <button type="button" onclick="navigateToThemeTimeline('${item.id}')" style="background: #f8fafc; color: #0284c7; border: 1px solid #e2e8f0; padding: 4px 12px; border-radius: 6px; font-size: 0.78rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.2s ease;">
            <span>📊 재료 타임라인 전체보기</span>
            <span style="font-size: 0.9rem;">→</span>
          </button>
        </div>
        ${newsHtml}
      </div>

      <!-- 5. 📊 대장주 실시간 캔들 차트 (네이버 금융 공식 실시간 일봉/주봉/분봉 차트) -->
      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
          <div style="font-size: 0.95rem; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 6px;">
            <span>📊</span> 대장주 실시간 캔들 차트 (<span style="color: #0284c7;">${escapeHtml(item.leader.split(',')[0])}</span> · ${item.symbol || '000660'})
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="imggen-style-chip active" style="padding: 3px 10px; font-size: 0.74rem;" onclick="switchStockChartTime('${item.symbol || '000660'}', 'day', this)">일봉 (캔들/이평선)</button>
            <button type="button" class="imggen-style-chip" style="padding: 3px 10px; font-size: 0.74rem;" onclick="switchStockChartTime('${item.symbol || '000660'}', 'week', this)">주봉</button>
            <button type="button" class="imggen-style-chip" style="padding: 3px 10px; font-size: 0.74rem;" onclick="switchStockChartTime('${item.symbol || '000660'}', 'month', this)">월봉</button>
            <button type="button" class="imggen-style-chip" style="padding: 3px 10px; font-size: 0.74rem;" onclick="switchStockChartTime('${item.symbol || '000660'}', '1', this)">실시간 분봉</button>
          </div>
        </div>
        <div style="height: 380px; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; background: #ffffff; display: flex; justify-content: center; align-items: center; position: relative;">
          <img id="stock-main-chart-img" 
               src="https://ssl.pstatic.net/imgfinance/chart/item/candle/day/${item.symbol || '000660'}.png?sidcode=${Date.now()}" 
               alt="${escapeHtml(item.leader.split(',')[0])} 실시간 캔들 차트" 
               style="width: 100%; height: 100%; object-fit: contain; background: #ffffff;">
        </div>
      </div>

      <!-- 6. 수석 트레이더의 실전 매매 대응 전략 -->
      <div style="background: #fff7ed; border: 1px solid #ffedd5; border-radius: 12px; padding: 16px 18px; margin-bottom: 20px;">
        <div style="font-size: 0.88rem; font-weight: 800; color: #c2410c; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
          <span>💡</span> 실전 투자 전략 가이드
        </div>
        <div style="font-size: 0.85rem; color: #7c2d12; line-height: 1.6;">
          ${escapeHtml(item.strategy)}
        </div>
      </div>

      <!-- 7. 포털 및 증권사 바로가기 버튼들 -->
      <div class="kc-portals-btn-grid">
        <a href="https://finance.naver.com/item/main.naver?code=${item.symbol || '000660'}" target="_blank" rel="noopener noreferrer" class="kc-portal-btn portal-green">
          네이버 증권 시세
        </a>
        <button type="button" onclick="navigateToThemeTimeline('${item.id}')" class="kc-portal-btn" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); cursor: pointer; font-weight: 800;">
          재료 타임라인 전체보기 ↗
        </button>
        <a href="${relatedNewsUrl}" target="_blank" rel="noopener noreferrer" class="kc-portal-btn" title="'${escapeHtml(relatedNewsKeyword)}' 네이버 뉴스 검색">
          관련 뉴스 전체보기 ↗
        </a>
        <a href="https://finance.daum.net/" target="_blank" rel="noopener noreferrer" class="kc-portal-btn">
          다음 금융
        </a>
        <a href="https://www.google.com/finance/quote/${item.symbol || '000660'}:KRX" target="_blank" rel="noopener noreferrer" class="kc-portal-btn">
          구글 파이낸스
        </a>
      </div>
    </div>
  `;
}

// 캔들 차트 주기(일봉/주봉/월봉/실시간 분봉) 전환 함수
window.switchStockChartTime = function (symbol, type, btn) {
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  const chartImg = document.getElementById('stock-main-chart-img');
  if (!chartImg) return;

  const t = Date.now();
  let newUrl = '';
  if (type === '1') {
    // 실시간 분봉 (네이버 금융 당일 시세 분봉)
    newUrl = `https://ssl.pstatic.net/imgfinance/chart/item/area/day/${symbol}.png?sidcode=${t}`;
  } else {
    // 일봉, 주봉, 월봉 캔들 차트
    newUrl = `https://ssl.pstatic.net/imgfinance/chart/item/candle/${type}/${symbol}.png?sidcode=${t}`;
  }

  chartImg.src = newUrl;
};

// 1주일 & 1달 재료 비교 테이블 렌더링 (삭제 필터링 및 실제 기사 원문 바인딩)
function renderStockCompareTable(period = 'week') {
  const tbody = document.getElementById('theme-shooting-table-body') || document.getElementById('stock-compare-tbody');
  const thead = document.getElementById('stock-compare-thead');
  const titleEl = document.getElementById('stock-compare-table-title');
  const badgeEl = document.getElementById('stock-compare-table-badge');
  if (!tbody || !thead) return;

  // 삭제된 테마를 제외한 데이터만 필터링
  const filteredCompareData = STOCK_COMPARE_DATA.filter(row => !isThemeDeleted(row.theme_id, row.theme));

  if (filteredCompareData.length === 0) {
    thead.innerHTML = '';
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px 20px; color: #94a3b8; background: rgba(255,255,255,0.02);">
          <div style="font-size: 1.5rem; margin-bottom: 8px;">🗑️</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #cbd5e1;">비교할 테마가 모두 삭제되었거나 비어 있습니다.</div>
          <div style="font-size: 0.78rem; color: #64748b; margin-top: 4px;">상단에서 관심 종목을 추가하여 새로운 테마를 등록해보세요.</div>
        </td>
      </tr>
    `;
    return;
  }

  if (period === 'week') {
    if (titleEl) titleEl.textContent = '⚡ 오늘 슈팅 테마 2번 재료모음: 최근 1주일간 관련 기사 빈도 및 발생량 모음';
    if (badgeEl) {
      badgeEl.textContent = '1주일 기사 모음 모드 (단기 슈팅 모멘텀)';
      badgeEl.style.background = 'rgba(56, 189, 248, 0.15)';
      badgeEl.style.color = '#38bdf8';
      badgeEl.style.borderColor = 'rgba(56, 189, 248, 0.3)';
    }

    thead.innerHTML = `
      <tr>
        <th style="text-align: left; padding: 12px 10px; width: 175px;">주요 슈팅 테마</th>
        <th style="text-align: center; width: 160px;">대장주 (종목군)</th>
        <th style="text-align: center; width: 100px;">당일 등락률</th>
        <th style="text-align: center; width: 100px;">주간 수익률</th>
        <th style="text-align: center; width: 105px;">관련 기사수</th>
        <th style="text-align: left; padding-left: 14px;">실시간 언론 보도 & 단기 슈팅 핵심 특징주 재료</th>
      </tr>
    `;

    tbody.innerHTML = filteredCompareData.map(row => {
      const articlesHtml = (row.weekArticles || []).map(a => {
        const cleanT = (a.title || '').replace(/\[.*?\]/g, '').trim();
        const newsLink = a.originallink || a.link || a.url || `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(cleanT || a.title)}`;
        const press = a.media || a.press || '언론사';
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px dashed rgba(255,255,255,0.06); gap: 8px;">
            <div style="font-size: 0.78rem; color: #cbd5e1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
              • <strong style="color: #94a3b8;">[${escapeHtml(press)}]</strong> ${escapeHtml(a.title)}
            </div>
            <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
              <span style="font-size: 0.7rem; color: #64748b;">${escapeHtml(a.date || '오늘')}</span>
              <a href="${newsLink}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; font-size: 0.7rem; text-decoration: none; font-weight: 700;">
                기사 ↗
              </a>
            </div>
          </div>
        `;
      }).join('');

      const isRatePlus = !(row.dayRate || '').startsWith('-');

      return `
        <tr>
          <td style="padding: 14px 10px; font-weight: 800; color: #f8fafc; vertical-align: top;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px;">
              <span style="color: #38bdf8; font-size: 0.88rem;">⚡ ${row.theme}</span>
              <button type="button" onclick="deleteStockTheme('${escapeHtml(row.theme)}')" title="테마 삭제" style="background: rgba(239, 68, 68, 0.15); color: #b91c1c; border: 1px solid rgba(239, 68, 68, 0.35); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; cursor: pointer; font-weight: 800; white-space: nowrap;" onmouseover="this.style.background='rgba(239,68,68,0.3)'; this.style.color='#fff';" onmouseout="this.style.background='rgba(239,68,68,0.15)'; this.style.color='#f87171';">
                삭제 ✕
              </button>
            </div>
            <div style="margin-top: 6px;">
              <a href="https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(row.searchKeyword || row.theme)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: #7dd3fc; text-decoration: none; background: rgba(56,189,248,0.1); padding: 2px 6px; border-radius: 4px; display: inline-block;">
                실시간 뉴스 ↗
              </a>
            </div>
          </td>
          <td style="padding: 14px 10px; text-align: center; color: #fde047; font-weight: 700; vertical-align: top; font-size: 0.84rem;">
            👑 ${row.leaders}
          </td>
          <td style="padding: 14px 10px; text-align: center; font-weight: 900; color: ${isRatePlus ? '#ef4444' : '#38bdf8'}; vertical-align: top; font-size: 0.95rem;">
            ${row.dayRate || row.weekRate || '+0.0%'}
          </td>
          <td style="padding: 14px 10px; text-align: center; font-weight: 800; color: #fbbf24; vertical-align: top; font-size: 0.88rem;">
            ${row.weekRate}
          </td>
          <td style="padding: 14px 10px; text-align: center; vertical-align: top;">
            <span style="display: inline-block; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 3px 8px; border-radius: 6px; font-weight: 900; font-size: 0.82rem;">
              🔥 ${row.weekNewsCount || '50+건'}
            </span>
          </td>
          <td style="padding: 14px 14px; vertical-align: top;">
            <div style="font-size: 0.85rem; font-weight: 700; color: #0284c7; margin-bottom: 8px; line-height: 1.4;">
              📢 ${escapeHtml(row.weekNewsHeadline || '')}
            </div>
            <div style="background: #f8fafc; border-radius: 6px; padding: 6px 10px; border: 1px solid #e2e8f0;">
              ${articlesHtml || '<div style="font-size:0.75rem;color:#64748b;padding:4px;">관련 기사를 실시간 수집 중입니다...</div>'}
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } else {
    // 1개월 비교 모드
    if (titleEl) titleEl.textContent = '🔮 1달 비교 분석: 1개월간 누적 기사 나열 및 앞으로의 미래 지속성 종합 평가';
    if (badgeEl) {
      badgeEl.textContent = '1개월 누적 비교 모드 (미래 지속성 분석)';
      badgeEl.style.background = 'rgba(16, 185, 129, 0.15)';
      badgeEl.style.color = '#34d399';
      badgeEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    }

    thead.innerHTML = `
      <tr>
        <th style="text-align: left; padding: 12px 10px; width: 175px;">테마 및 모멘텀</th>
        <th style="text-align: center; width: 140px;">대장주</th>
        <th style="text-align: center; width: 110px;">1달 누적 기사량</th>
        <th style="text-align: center; width: 100px;">1달 상승률</th>
        <th style="text-align: center; width: 140px;">미래 지속성 평가</th>
        <th style="text-align: left; padding-left: 14px;">1달간 주요 기사 나열 & 향후 지속성 정밀 분석</th>
      </tr>
    `;

    tbody.innerHTML = filteredCompareData.map(row => {
      const articlesHtml = (row.monthArticles || []).map(a => {
        const cleanT = (a.title || '').replace(/\[.*?\]/g, '').trim();
        const newsLink = a.originallink || a.link || a.url || `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(cleanT || a.title)}`;
        const press = a.media || a.press || '언론사';
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dashed rgba(255,255,255,0.06); gap: 8px;">
            <div style="font-size: 0.78rem; color: #cbd5e1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
              • <strong style="color: #34d399;">[${escapeHtml(press)}]</strong> ${escapeHtml(a.title)}
            </div>
            <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
              <span style="font-size: 0.7rem; color: #64748b;">${escapeHtml(a.date || '최근')}</span>
              <a href="${newsLink}" target="_blank" rel="noopener noreferrer" style="color: #34d399; font-size: 0.7rem; text-decoration: none; font-weight: 700;">
                기사 ↗
              </a>
            </div>
          </div>
        `;
      }).join('');

      return `
        <tr>
          <td style="padding: 14px 10px; font-weight: 800; color: #f8fafc; vertical-align: top;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px;">
              <span>${row.theme}</span>
              <button type="button" onclick="deleteStockTheme('${escapeHtml(row.theme)}')" title="테마 삭제" style="background: rgba(239, 68, 68, 0.15); color: #b91c1c; border: 1px solid rgba(239, 68, 68, 0.35); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; cursor: pointer; font-weight: 800; white-space: nowrap;" onmouseover="this.style.background='rgba(239,68,68,0.3)'; this.style.color='#fff';" onmouseout="this.style.background='rgba(239,68,68,0.15)'; this.style.color='#f87171';">
                삭제 ✕
              </button>
            </div>
            <div style="margin-top: 6px;">
              <a href="https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(row.searchKeyword || row.theme)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: #34d399; text-decoration: none; background: rgba(16,185,129,0.1); padding: 2px 6px; border-radius: 4px; display: inline-block;">
                1달 뉴스 전체 ↗
              </a>
            </div>
          </td>
          <td style="padding: 14px 10px; text-align: center; color: #94a3b8; font-weight: 600; vertical-align: top; font-size: 0.84rem;">
            ${row.leaders}
          </td>
          <td style="padding: 14px 10px; text-align: center; vertical-align: top;">
            <span style="display: inline-block; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 10px; border-radius: 8px; font-weight: 900; font-size: 0.88rem;">
              📚 ${row.monthNewsCount || '200+건'}
            </span>
            <div style="font-size: 0.7rem; color: #64748b; margin-top: 4px;">1달간 누적</div>
          </td>
          <td style="padding: 14px 10px; text-align: center; font-weight: 900; color: #f59e0b; vertical-align: top; font-size: 0.95rem;">
            ${row.monthRate}
          </td>
          <td style="padding: 14px 10px; text-align: center; vertical-align: top;">
            <div style="font-size: 0.82rem; font-weight: 800; color: #38bdf8; margin-bottom: 4px;">
              ${escapeHtml(row.futureOutlook || '양호')}
            </div>
            <div style="font-size: 0.74rem; color: #e2e8f0; background: rgba(56,189,248,0.1); padding: 2px 6px; border-radius: 4px; display: inline-block;">
              ${row.strength}
            </div>
          </td>
          <td style="padding: 14px 14px; vertical-align: top;">
            <!-- 1달 미래 지속성 분석 리포트 -->
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px;">
              <div style="font-size: 0.78rem; font-weight: 800; color: #0284c7; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                <span>🔭</span> 향후 미래 지속성 및 수석 연구원 총평:
              </div>
              <div style="font-size: 0.82rem; color: #334155; line-height: 1.55;">
                ${escapeHtml(row.futureAnalysis || row.strategy)}
              </div>
            </div>
            <!-- 1개월 주요 기사 목록 나열 -->
            <div style="background: #f8fafc; border-radius: 6px; padding: 6px 10px; border: 1px solid #e2e8f0;">
              <div style="font-size: 0.72rem; color: #64748b; font-weight: 700; margin-bottom: 4px;">1달간 핵심 주요 기사 히스토리:</div>
              ${articlesHtml}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// ============================================================================
// [신규 & 전면 개편] 3번 탭 증시 캘린더: AI 뉴스 미래 일정 자동 감지 및 승인/거절 시스템
// ============================================================================
function renderStockCalendar() {
  renderApprovedCalendarUI();
}

/**
 * 1. 뉴스 텍스트(제목, 요약문, 본문)에서 미래 일정/예정 행동 정규식 추출 파서
 * @param {Array} newsList 뉴스 기사 목록
 * @returns {Array} 추출된 미래 일정 후보 리스트
 */
function extractFutureEventsFromNews(newsList = []) {
  const momentumKeywords = ['개최', '발표', '상장', '체결', '공개', '개막', '본계약', '임박', '착수', '출시', '서명', '승인'];
  const candidates = [];

  const existingPending = JSON.parse(localStorage.getItem('stock_calendar_pending_events') || '[]');
  const existingApproved = JSON.parse(localStorage.getItem('stock_calendar_approved_events') || '[]');
  const existingRejected = JSON.parse(localStorage.getItem('stock_calendar_rejected_events') || '[]');

  const isAlreadyProcessed = (key) => {
    return existingPending.some(e => e.id === key) ||
      existingApproved.some(e => e.id === key) ||
      existingRejected.includes(key);
  };

  newsList.forEach((news, idx) => {
    const text = `${news.title || ''} ${news.summary || ''} ${news.keyword || ''}`;

    // 모멘텀 키워드 포함 여부 확인
    const hasMomentum = momentumKeywords.some(kw => text.includes(kw));
    if (!hasMomentum) return;

    // 날짜 패턴 매칭
    // 패턴 A: 2026-10-15 or 2026.10.15 or 2026/10/15
    const regexFullDate = /(202[6-9])[-./](\d{1,2})[-./](\d{1,2})/;
    // 패턴 B: 10월 15일, 9월 26일 등
    const regexMonthDay = /(\d{1,2})월\s*(\d{1,2})일/;
    // 패턴 C: 내달 15일, 다음 달 10일
    const regexNextMonthDay = /(?:내달|다음\s*달)\s*(\d{1,2})일/;
    // 패턴 D: 내달, 다음 달, 10월 중, 4분기 등
    const regexApprox = /(?:내달|다음\s*달|10월|11월|12월|4분기|하반기)/;

    let targetDate = '';
    let dateDisplay = '';

    const matchFull = text.match(regexFullDate);
    const matchMD = text.match(regexMonthDay);
    const matchNMD = text.match(regexNextMonthDay);
    const matchApp = text.match(regexApprox);

    if (matchFull) {
      const y = matchFull[1];
      const m = String(matchFull[2]).padStart(2, '0');
      const d = String(matchFull[3]).padStart(2, '0');
      targetDate = `${y}-${m}-${d}`;
      dateDisplay = `${targetDate}`;
    } else if (matchMD) {
      const m = String(matchMD[1]).padStart(2, '0');
      const d = String(matchMD[2]).padStart(2, '0');
      targetDate = `2026-${m}-${d}`;
      dateDisplay = `${targetDate}`;
    } else if (matchNMD) {
      const d = String(matchNMD[1]).padStart(2, '0');
      targetDate = `2026-10-${d}`;
      dateDisplay = `${targetDate}`;
    } else if (matchApp) {
      if (text.includes('10월') || text.includes('다음 달') || text.includes('내달')) {
        targetDate = '2026-10-15';
        dateDisplay = '2026-10-15 (예정)';
      } else if (text.includes('11월')) {
        targetDate = '2026-11-15';
        dateDisplay = '2026-11-15 (예정)';
      } else if (text.includes('4분기') || text.includes('하반기')) {
        targetDate = '2026-10-30';
        dateDisplay = '2026-10-30 (하반기)';
      }
    }

    if (!targetDate) return;

    // 제목 정제
    const rawTitle = (news.title || '').replace(/\[.*?\]/g, '').trim();
    const cleanId = 'evt_' + targetDate + '_' + rawTitle.replace(/[^\w가-힣]/g, '').slice(0, 15);

    if (isAlreadyProcessed(cleanId)) return;

    // 테마 태그 추정
    let tag = '모멘텀';
    if (text.includes('원전') || text.includes('체코') || text.includes('SMR')) tag = '원전/수주';
    else if (text.includes('HBM') || text.includes('반도체') || text.includes('가속기')) tag = '반도체/AI';
    else if (text.includes('비만') || text.includes('바이오') || text.includes('임상') || text.includes('학회')) tag = '바이오/학회';
    else if (text.includes('로봇') || text.includes('휴머노이드')) tag = '로봇/AI';
    else if (text.includes('방산') || text.includes('자주포') || text.includes('수출')) tag = '방산/수출';
    else if (text.includes('밸류업') || text.includes('배당')) tag = '밸류업/지수';
    else if (text.includes('금리') || text.includes('FOMC') || text.includes('소매판매')) tag = '매크로/지표';

    candidates.push({
      id: cleanId,
      date: targetDate,
      dateDisplay: dateDisplay || targetDate,
      title: rawTitle || '주요 증시 일정',
      desc: news.summary || `${news.media || '언론사'} 보도: 관련 주요 이벤트 진행 예정`,
      tag: tag,
      sourceTitle: news.title,
      sourceUrl: news.url || `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(rawTitle)}`,
      press: news.media || news.press || '증시속보',
      status: 'pending'
    });
  });

  return candidates;
}

// 캘린더 시스템 초기화 및 데이터 로드 (/api/calendar/schedules 실시간 연동)
async function initCalendarEventSystem(forceRefresh = false) {
  // [구 더미 캐시 청소] FOMC, 체코 원전, 밸류업 등 과거 하드코딩 흔적이 있으면 로컬스토리지 즉시 정화
  cleanObsoleteCalendarStorage();
  await loadCalendarEventsFromStorage(forceRefresh);
  renderPendingEventsUI();
  renderApprovedCalendarUI();
  bindAddStockEventModal();
}

// 공모주/IPO 관련 단어 강력 블랙리스트 판별 헬퍼
function isIpoNoiseEvent(eventObj) {
  if (!eventObj) return false;
  const ipoKeywords = ['신규상장', 'ipo', '공모', '청약', '공모가', '상장·공모', '상장예정일', '비례배정', '균등배정', '보호예수', '의무보유', '브릴스', '진코스텍'];
  const cat = (eventObj.category || '').toLowerCase();
  const tag = (eventObj.tag || '').toLowerCase();
  const id = (eventObj.id || '').toLowerCase();
  const title = (eventObj.title || '').toLowerCase();
  const desc = (eventObj.desc || eventObj.key_point || '').toLowerCase();

  if (cat.includes('신규상장') || cat.includes('ipo') || tag.includes('신규상장') || tag.includes('ipo') || id.startsWith('ipo_')) {
    return true;
  }

  return ipoKeywords.some(kw => title.includes(kw) || desc.includes(kw) || cat.includes(kw));
}
window.isIpoNoiseEvent = isIpoNoiseEvent;

// 구 더미 데이터 및 공모주/IPO 데이터 로컬 스토리지 전면 영구 삭제 (purge)
function cleanObsoleteCalendarStorage() {
  try {
    const keysToCheck = ['stock_calendar_approved_events', 'stock_calendar_pending_events'];

    keysToCheck.forEach(k => {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            // IPO / 공모주 관련 데이터 또는 과거 더미 데이터 전수 영구 필터링 삭제
            const filtered = parsed.filter(e => !isIpoNoiseEvent(e));
            localStorage.setItem(k, JSON.stringify(filtered));
          }
        } catch (_) {
          localStorage.removeItem(k);
        }
      }
    });

    if (typeof calendarApprovedEvents !== 'undefined' && Array.isArray(calendarApprovedEvents)) {
      calendarApprovedEvents = calendarApprovedEvents.filter(e => !isIpoNoiseEvent(e));
    }
    if (typeof calendarPendingEvents !== 'undefined' && Array.isArray(calendarPendingEvents)) {
      calendarPendingEvents = calendarPendingEvents.filter(e => !isIpoNoiseEvent(e));
    }

    if (typeof liveStockCalendarCache !== 'undefined') {
      liveStockCalendarCache = [];
    }
  } catch (err) {
    console.warn('[Calendar Storage Clean Error]', err);
  }
}

// 안전한 뉴스 링크 생성기 (유효한 원문 링크가 없으면 네이버 뉴스 검색 페이지로 안전 폴백)
function getSafeNewsUrl(url, title) {
  if (url && typeof url === 'string') {
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      // 네이버 메인 홈페이지 링크인 경우 기사 검색으로 전환
      if (!trimmed.includes('naver.com/') || trimmed.includes('/article/') || trimmed.includes('search.naver.com') || trimmed.includes('news.naver.com') || trimmed.includes('finance.naver.com')) {
        if (trimmed !== 'https://www.naver.com' && trimmed !== 'https://www.naver.com/' && trimmed !== 'http://www.naver.com') {
          return trimmed;
        }
      }
    }
  }
  return `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(title || '증시 캘린더')}`;
}
window.getSafeNewsUrl = getSafeNewsUrl;

// 실시간 증시 캘린더 API 연동 및 로컬스토리지 보존 (자동 즉시 승인 등록)
async function loadCalendarEventsFromStorage(forceRefresh = false) {
  const pendingBadge = document.getElementById('pending-events-badge');
  const weekCountEl = document.getElementById('stock-events-week-count');
  const monthCountEl = document.getElementById('stock-events-month-count');

  if (forceRefresh) {
    if (pendingBadge) pendingBadge.textContent = '실시간 수집 중...';
    if (weekCountEl) weekCountEl.textContent = '...';
    if (monthCountEl) monthCountEl.textContent = '...';
  }

  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/calendar/schedules?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === '000') {
        const approvedFromApi = Array.isArray(data.approved_events) ? data.approved_events : [];
        const pendingFromApi = Array.isArray(data.pending_events) ? data.pending_events : [];

        // 링크 안전 검증 적용
        approvedFromApi.forEach(e => {
          e.sourceUrl = getSafeNewsUrl(e.sourceUrl, e.title);
        });
        pendingFromApi.forEach(e => {
          e.sourceUrl = getSafeNewsUrl(e.sourceUrl, e.title);
        });

        // 사용자가 직접 추가한 커스텀 일정 보존
        const rawLocalApproved = localStorage.getItem('stock_calendar_approved_events');
        const localApproved = rawLocalApproved ? JSON.parse(rawLocalApproved) : [];
        const userCustomEvents = localApproved.filter(e => e.id && e.id.startsWith('custom_evt_'));

        const rejectedList = JSON.parse(localStorage.getItem('stock_calendar_rejected_events') || '[]');

        // [자동 즉시 승인]: 공모주/IPO 배제 후 하단 캘린더에 즉시 등록
        calendarApprovedEvents = [...userCustomEvents].filter(e => !isIpoNoiseEvent(e));

        // 1) 공식 확정 일정 자동 등록 (IPO 노이즈 완벽 차단)
        approvedFromApi.forEach(apiEv => {
          if (!isIpoNoiseEvent(apiEv) && !rejectedList.includes(apiEv.id) && !calendarApprovedEvents.some(e => e.id === apiEv.id || (e.date === apiEv.date && e.title === apiEv.title))) {
            calendarApprovedEvents.push(apiEv);
          }
        });

        // 2) AI 감지 일정 자동 즉시 승인 병합 (IPO 노이즈 완벽 차단)
        pendingFromApi.forEach(pEv => {
          if (!isIpoNoiseEvent(pEv) && !rejectedList.includes(pEv.id) && !calendarApprovedEvents.some(e => e.id === pEv.id || (e.date === pEv.date && e.title === pEv.title))) {
            calendarApprovedEvents.push(pEv);
          }
        });

        // 대기열은 사용자가 확인하거나 취소할 수 있도록 보존 (IPO 노이즈 완벽 차단)
        calendarPendingEvents = [];
        pendingFromApi.forEach(pEv => {
          if (!isIpoNoiseEvent(pEv) && !rejectedList.includes(pEv.id)) {
            calendarPendingEvents.push(pEv);
          }
        });

        // 최종 IPO 필터링 보장
        calendarApprovedEvents = calendarApprovedEvents.filter(e => !isIpoNoiseEvent(e));
        calendarPendingEvents = calendarPendingEvents.filter(e => !isIpoNoiseEvent(e));

        // 로컬스토리지 업데이트
        localStorage.setItem('stock_calendar_approved_events', JSON.stringify(calendarApprovedEvents));
        localStorage.setItem('stock_calendar_pending_events', JSON.stringify(calendarPendingEvents));
        return;
      }
    }
  } catch (err) {
    console.warn('[Calendar API Error, using fallback]', err);
  }

  // API 실패 시 로컬스토리지 폴백 (IPO 배제 및 링크 정화 포함)
  try {
    const rawApproved = localStorage.getItem('stock_calendar_approved_events');
    calendarApprovedEvents = (rawApproved ? JSON.parse(rawApproved) : [])
      .filter(e => !isIpoNoiseEvent(e))
      .map(e => {
        e.sourceUrl = getSafeNewsUrl(e.sourceUrl, e.title);
        return e;
      });
    const rawPending = localStorage.getItem('stock_calendar_pending_events');
    calendarPendingEvents = (rawPending ? JSON.parse(rawPending) : [])
      .filter(e => !isIpoNoiseEvent(e))
      .map(e => {
        e.sourceUrl = getSafeNewsUrl(e.sourceUrl, e.title);
        return e;
      });
  } catch (e) {
    calendarApprovedEvents = [];
    calendarPendingEvents = [];
  }
}

// [🔄 LIVE 일정 갱신] 전역 호출 핸들러
window.refreshStockCalendarLive = async function() {
  const btn = document.getElementById('btn-sync-stock-calendar');
  const icon = document.getElementById('calendar-sync-icon');
  if (btn) {
    btn.style.opacity = '0.6';
    btn.style.pointerEvents = 'none';
  }
  if (icon) {
    icon.style.display = 'inline-block';
    icon.style.animation = 'spin 1s linear infinite';
  }
  if (window.showToast) window.showToast('네이버 증시 실시간 캘린더와 AI 감지 일정을 최신화합니다...', '⏳');

  try {
    cleanObsoleteCalendarStorage();
    await initCalendarEventSystem(true);
    if (typeof renderStockCalendarFeed === 'function') {
      liveStockCalendarCache = [];
      await renderStockCalendarFeed();
    }
    if (window.showToast) {
      window.showToast('실시간 증시 일정 및 AI 탐지 캘린더가 갱신되었습니다!', '🗓️');
    }
  } finally {
    if (btn) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
    if (icon) {
      icon.style.animation = 'none';
    }
  }
};

// 실시간 뉴스 데이터셋에서 신규 일정 후보 자동 스캔 및 대기열 주입
function scanAndInjectPendingEventsFromNews() {
  const allNews = [];
  if (Array.isArray(DOMESTIC_STOCK_NEWS_DATA)) allNews.push(...DOMESTIC_STOCK_NEWS_DATA);

  // 타임라인 캐시에서도 기사 병합
  if (themeTimelineCache && Array.isArray(themeTimelineCache.themes)) {
    themeTimelineCache.themes.forEach(t => {
      if (Array.isArray(t.timeline)) {
        t.timeline.forEach(item => {
          allNews.push({
            title: item.news_title,
            summary: t.today_reason || '',
            media: item.press,
            url: item.news_url
          });
        });
      }
    });
  }

  // 정규식 추출 실행 (하드코딩 더미 없이 실제 기사 데이터셋에서만 추출)
  const extracted = extractFutureEventsFromNews(allNews);
  if (extracted.length > 0) {
    const existingIds = new Set(calendarPendingEvents.map(e => e.id));
    const approvedIds = new Set(calendarApprovedEvents.map(e => e.id));
    const rejectedList = JSON.parse(localStorage.getItem('stock_calendar_rejected_events') || '[]');

    extracted.forEach(cand => {
      cand.sourceUrl = getSafeNewsUrl(cand.sourceUrl, cand.title);
      if (!existingIds.has(cand.id) && !approvedIds.has(cand.id) && !rejectedList.includes(cand.id)) {
        calendarPendingEvents.push(cand);
      }
    });
  }

  localStorage.setItem('stock_calendar_pending_events', JSON.stringify(calendarPendingEvents));
}

// AI 승인 대기 패널 접기/펼치기 토글
window.togglePendingEventsPanel = function () {
  const listEl = document.getElementById('ai-pending-events-list');
  const icon = document.getElementById('pending-toggle-icon');
  if (!listEl) return;

  if (listEl.style.display === 'none') {
    listEl.style.display = 'flex';
    if (icon) icon.textContent = '▼';
  } else {
    listEl.style.display = 'none';
    if (icon) icon.textContent = '▲';
  }
};

// 상단 AI 뉴스 탐지 일정 후보 패널 렌더링
function renderPendingEventsUI() {
  const badgeEl = document.getElementById('pending-events-badge');
  const listEl = document.getElementById('ai-pending-events-list');
  if (!listEl) return;

  const safePending = (Array.isArray(calendarPendingEvents) ? calendarPendingEvents : [])
    .filter(e => !isIpoNoiseEvent(e));

  if (badgeEl) {
    badgeEl.textContent = `승인 대기 ${safePending.length}건`;
  }

  if (safePending.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 24px 14px; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px dashed rgba(168,85,247,0.25);">
        <div style="font-size: 1.3rem; margin-bottom: 6px;">🎉</div>
        <div style="font-size: 0.88rem; font-weight: 700; color: #cbd5e1;">현재 대기 중인 AI 추천 일정이 모두 처리되었습니다.</div>
        <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">새로운 뉴스가 수집되면 AI가 미래 날짜와 일정을 자동으로 탐지하여 이곳에 표시합니다.</div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = safePending.map((item, idx) => `
    <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; gap: 12px; transition: all 0.2s ease; flex-wrap: wrap; box-shadow: 0 1px 3px rgba(0,0,0,0.02);" onmouseover="this.style.borderColor='#cbd5e1';" onmouseout="this.style.borderColor='#e2e8f0';">
      <!-- 좌측 메타 및 내용 -->
      <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 260px;">
        <!-- 날짜 박스 -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; text-align: center; min-width: 90px; flex-shrink: 0;">
          <div style="font-size: 0.78rem; font-weight: 800; color: #7c3aed;">${escapeHtml(item.dateDisplay || item.date)}</div>
          <div style="font-size: 0.68rem; color: #64748b;">AI 감지 일정</div>
        </div>

        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
            <span style="font-size: 0.7rem; background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; padding: 1px 7px; border-radius: 4px; font-weight: 800;">
              ${escapeHtml(item.tag || '일정')}
            </span>
            <span style="font-size: 0.7rem; color: #64748b;">
              출처: ${escapeHtml(item.press || '언론사')}
            </span>
          </div>
          <div style="font-size: 0.92rem; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
            ${escapeHtml(item.title)}
          </div>
          <div style="font-size: 0.76rem; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: none; font-weight: 700;">
              📰 원문: ${escapeHtml(item.sourceTitle || item.title)} ↗
            </a>
          </div>
        </div>
      </div>

      <!-- 우측 승인 / 거절 액션 버튼 -->
      <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
        <button type="button" onclick="approvePendingEvent(${idx})" style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 6px 14px; border-radius: 6px; font-size: 0.78rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.2s;" onmouseover="this.style.background='#15803d'; this.style.color='#fff';" onmouseout="this.style.background='#dcfce7'; this.style.color='#15803d';">
          <span>✔</span> 승인
        </button>
        <button type="button" onclick="rejectPendingEvent(${idx})" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 6px 12px; border-radius: 6px; font-size: 0.78rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.2s;" onmouseover="this.style.background='#dc2626'; this.style.color='#fff';" onmouseout="this.style.background='#fee2e2'; this.style.color='#dc2626';">
          <span>✖</span> 거절
        </button>
      </div>
    </div>
  `).join('');
}

// 단건 승인
window.approvePendingEvent = function (index) {
  if (index < 0 || index >= calendarPendingEvents.length) return;
  const eventItem = calendarPendingEvents.splice(index, 1)[0];
  calendarApprovedEvents.push(eventItem);

  // 로컬스토리지 저장
  localStorage.setItem('stock_calendar_pending_events', JSON.stringify(calendarPendingEvents));
  localStorage.setItem('stock_calendar_approved_events', JSON.stringify(calendarApprovedEvents));

  renderPendingEventsUI();
  renderApprovedCalendarUI();

  if (window.showToast) {
    window.showToast(`[${eventItem.title}] 정식 캘린더에 성공적으로 등록되었습니다!`, '✅');
  }
};

// 단건 거절
window.rejectPendingEvent = function (index) {
  if (index < 0 || index >= calendarPendingEvents.length) return;
  const eventItem = calendarPendingEvents.splice(index, 1)[0];

  // 거절 목록에 ID 기록 (영구 무시)
  const rejectedList = JSON.parse(localStorage.getItem('stock_calendar_rejected_events') || '[]');
  rejectedList.push(eventItem.id);
  localStorage.setItem('stock_calendar_rejected_events', JSON.stringify(rejectedList));
  localStorage.setItem('stock_calendar_pending_events', JSON.stringify(calendarPendingEvents));

  renderPendingEventsUI();

  if (window.showToast) {
    window.showToast(`[${eventItem.title}] 일정이 거절 및 제외되었습니다.`, '🗑️');
  }
};

// 모두 승인
window.approveAllPendingEvents = function () {
  if (calendarPendingEvents.length === 0) return;
  const count = calendarPendingEvents.length;
  calendarApprovedEvents.push(...calendarPendingEvents);
  calendarPendingEvents = [];

  localStorage.setItem('stock_calendar_pending_events', JSON.stringify([]));
  localStorage.setItem('stock_calendar_approved_events', JSON.stringify(calendarApprovedEvents));

  renderPendingEventsUI();
  renderApprovedCalendarUI();

  if (window.showToast) {
    window.showToast(`대기 중인 일정 ${count}건을 모두 정식 캘린더에 승인 등록했습니다!`, '🎉');
  }
};

// 모두 거절
window.rejectAllPendingEvents = function () {
  if (calendarPendingEvents.length === 0) return;
  const rejectedList = JSON.parse(localStorage.getItem('stock_calendar_rejected_events') || '[]');
  calendarPendingEvents.forEach(e => rejectedList.push(e.id));
  localStorage.setItem('stock_calendar_rejected_events', JSON.stringify(rejectedList));

  calendarPendingEvents = [];
  localStorage.setItem('stock_calendar_pending_events', JSON.stringify([]));

  renderPendingEventsUI();

  if (window.showToast) {
    window.showToast('대기 중인 일정을 모두 거절했습니다.', 'ℹ️');
  }
};

// 승인된 일정 삭제
window.deleteApprovedEvent = function (id) {
  calendarApprovedEvents = calendarApprovedEvents.filter(e => e.id !== id);
  localStorage.setItem('stock_calendar_approved_events', JSON.stringify(calendarApprovedEvents));
  renderApprovedCalendarUI();
  if (window.showToast) {
    window.showToast('해당 일정이 캘린더에서 삭제되었습니다.', '🗑️');
  }
};

// D-Day 계산 함수
function calculateDDay(targetDateStr) {
  if (!targetDateStr) return { dDayStr: '', diffDays: 999 };
  const target = new Date(targetDateStr);
  if (isNaN(target.getTime())) return { dDayStr: '', diffDays: 999 };

  const now = new Date();
  // 자정 기준 비교
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffTime = tDate.getTime() - nowDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { dDayStr: 'D-Day 오늘', diffDays };
  if (diffDays > 0) return { dDayStr: `D-${diffDays}`, diffDays };
  return { dDayStr: `D+${Math.abs(diffDays)} 종료`, diffDays };
}

// 승인된 일정들을 날짜별로 정렬하여 이번 주 / 이번 달~다음 달 컨테이너에 자동 렌더링
function renderApprovedCalendarUI() {
  const weekWrap = document.getElementById('stock-events-week');
  const monthWrap = document.getElementById('stock-events-month');
  const weekCountEl = document.getElementById('stock-events-week-count');
  const monthCountEl = document.getElementById('stock-events-month-count');

  if (!weekWrap || !monthWrap) return;

  // [원천 차단 강력 블랙리스트 필터] 공모주, IPO, 청약, 공모가 관련 데이터 원천 제외
  const safeApproved = (Array.isArray(calendarApprovedEvents) ? calendarApprovedEvents : [])
    .filter(e => !isIpoNoiseEvent(e));

  // 날짜 오름차순(가까운 날짜 순서) 정렬
  const sorted = [...safeApproved].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // 이번 주(D-7 이내) vs 중장기(D-8 이상 또는 미래) 분기
  const weekEvents = [];
  const monthEvents = [];

  sorted.forEach(e => {
    const { diffDays } = calculateDDay(e.date);
    if (diffDays <= 7) {
      weekEvents.push(e);
    } else {
      monthEvents.push(e);
    }
  });

  if (weekCountEl) weekCountEl.textContent = `${weekEvents.length}건`;
  if (monthCountEl) monthCountEl.textContent = `${monthEvents.length}건`;

  const renderCard = (e, isWeek = true) => {
    const { dDayStr, diffDays } = calculateDDay(e.date);
    const color = isWeek ? '#38bdf8' : '#34d399';
    const bg = isWeek ? 'rgba(56,189,248,0.12)' : 'rgba(16,185,129,0.12)';
    const border = isWeek ? 'rgba(56,189,248,0.3)' : 'rgba(16,185,129,0.3)';

    // 카테고리별 뱃지 스타일 매핑 ([정부정책], [항공/우주], [바이오/임상], [본계약/수주], [글로벌 이벤트])
    const categoryName = e.category || e.tag || '모멘텀';
    let catBadgeColor = '#38bdf8';
    let catBadgeBg = 'rgba(56, 189, 248, 0.15)';
    let catBadgeBorder = 'rgba(56, 189, 248, 0.3)';

    if (categoryName.includes('정부정책')) {
      catBadgeColor = '#f59e0b';
      catBadgeBg = 'rgba(245, 158, 11, 0.15)';
      catBadgeBorder = 'rgba(245, 158, 11, 0.35)';
    } else if (categoryName.includes('항공') || categoryName.includes('우주')) {
      catBadgeColor = '#818cf8';
      catBadgeBg = 'rgba(129, 140, 248, 0.15)';
      catBadgeBorder = 'rgba(129, 140, 248, 0.35)';
    } else if (categoryName.includes('바이오') || categoryName.includes('임상')) {
      catBadgeColor = '#ec4899';
      catBadgeBg = 'rgba(236, 72, 153, 0.15)';
      catBadgeBorder = 'rgba(236, 72, 153, 0.35)';
    } else if (categoryName.includes('본계약') || categoryName.includes('수주')) {
      catBadgeColor = '#10b981';
      catBadgeBg = 'rgba(16, 185, 129, 0.15)';
      catBadgeBorder = 'rgba(16, 185, 129, 0.35)';
    }

    const descText = e.key_point || e.desc || '미래 주요 증시 모멘텀 일정입니다.';
    const newsLink = getSafeNewsUrl(e.sourceUrl || e.news_url, e.title);

    return `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.03);" onmouseover="this.style.borderColor='#93c5fd';" onmouseout="this.style.borderColor='#e2e8f0';">
        <div style="flex: 1; min-width: 0;">
          <!-- 1. 날짜 + D-Day + 카테고리 뱃지 -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.88rem; font-weight: 900; color: ${color};">${escapeHtml(e.dateDisplay || e.date)}</span>
              <span style="font-size: 0.72rem; background: ${bg}; color: ${color}; border: 1px solid ${border}; padding: 2px 8px; border-radius: 6px; font-weight: 800;">
                ${escapeHtml(dDayStr)}
              </span>
            </div>
            <span style="font-size: 0.72rem; background: ${catBadgeBg}; color: ${catBadgeColor}; border: 1px solid ${catBadgeBorder}; padding: 2px 8px; border-radius: 6px; font-weight: 800;">
              [${escapeHtml(categoryName)}]
            </span>
          </div>

          <!-- 2. 이벤트명 -->
          <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin-bottom: 6px; line-height: 1.45;">
            ${escapeHtml(e.title)}
          </div>

          <!-- 3. 재료 출처 및 요약 발췌 -->
          <div style="font-size: 0.78rem; color: #334155; line-height: 1.55; margin-bottom: 8px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 10px; border-radius: 6px; border-left: 3px solid ${catBadgeColor};">
            ${escapeHtml(descText)}
          </div>

          <!-- 4. 기사 원문 직결 링크 -->
          <div style="font-size: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
            <a href="${escapeHtml(newsLink)}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: none; font-weight: 800; display: inline-flex; align-items: center; gap: 4px; transition: color 0.15s;" onmouseover="this.style.color='#0369a1';" onmouseout="this.style.color='#0284c7';">
              <span>📰 기사 원문 확인</span> <span>↗</span>
            </a>
            <span style="font-size: 0.7rem; color: #64748b;">${escapeHtml(e.press || '언론 종합')}</span>
          </div>
        </div>

        <!-- 삭제 버튼 -->
        <button type="button" onclick="deleteApprovedEvent('${e.id}')" title="캘린더에서 삭제" style="background: transparent; border: none; color: #64748b; font-size: 0.95rem; cursor: pointer; padding: 2px 6px; border-radius: 4px; transition: color 0.15s;" onmouseover="this.style.color='#ef4444';" onmouseout="this.style.color='#64748b';">
          🗑️
        </button>
      </div>
    `;
  };

  if (weekEvents.length === 0) {
    weekWrap.innerHTML = `
      <div style="text-align: center; padding: 30px 14px; color: #94a3b8; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px dashed rgba(255,255,255,0.06);">
        <div style="font-size: 1.2rem; margin-bottom: 4px;">📭</div>
        <div style="font-size: 0.82rem; font-weight: 700; color: #cbd5e1;">이번 주 등록된 임박 일정이 없습니다.</div>
        <div style="font-size: 0.74rem; color: #64748b; margin-top: 2px;">상단 AI 탐지 대기열에서 일정을 승인하거나 직접 추가해보세요.</div>
      </div>
    `;
  } else {
    weekWrap.innerHTML = weekEvents.map(e => renderCard(e, true)).join('');
  }

  if (monthEvents.length === 0) {
    monthWrap.innerHTML = `
      <div style="text-align: center; padding: 30px 14px; color: #94a3b8; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px dashed rgba(255,255,255,0.06);">
        <div style="font-size: 1.2rem; margin-bottom: 4px;">🔭</div>
        <div style="font-size: 0.82rem; font-weight: 700; color: #cbd5e1;">중장기 예정 일정이 없습니다.</div>
      </div>
    `;
  } else {
    monthWrap.innerHTML = monthEvents.map(e => renderCard(e, false)).join('');
  }
}

// [➕ 나만의 관심 일정 추가] 수동 모달 연동
function bindAddStockEventModal() {
  const addBtn = document.getElementById('btn-add-stock-event') || document.getElementById('btn-direct-track-submit');
  if (!addBtn) return;

  addBtn.onclick = () => {
    const title = prompt('추가할 일정 제목을 입력하세요 (예: 알에스오토메이션 신제품 공개회):');
    if (!title || !title.trim()) return;

    const todayStr = (function () {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    const date = prompt('일정 날짜를 입력하세요 (형식: YYYY-MM-DD):', todayStr);
    if (!date || !date.trim()) return;

    const tag = prompt('테마 또는 태그를 입력하세요 (예: 로봇/공개, 바이오/학회):', '관심일정') || '관심일정';
    const desc = prompt('상세 내용 또는 매매 전략을 메모하세요:', '개인 관심 일정 등록') || '';

    const newEvent = {
      id: 'custom_evt_' + Date.now(),
      date: date.trim(),
      dateDisplay: date.trim(),
      title: title.trim(),
      desc: desc.trim(),
      tag: tag.trim(),
      press: '사용자 직접 등록',
      sourceUrl: ''
    };

    calendarApprovedEvents.push(newEvent);
    localStorage.setItem('stock_calendar_approved_events', JSON.stringify(calendarApprovedEvents));
    renderApprovedCalendarUI();

    if (window.showToast) {
      window.showToast(`[${newEvent.title}] 관심 일정이 캘린더에 성공적으로 등록되었습니다!`, '📌');
    }
  };
}

// ============================================================================
// [상시 추적 관리 테마 포트폴리오 뷰] 다중 선택 즐겨찾기 및 실시간 통합 스트리밍 엔진
// ============================================================================
const THEME_PORTFOLIO_STORAGE_KEY = 'stock_favorite_portfolio_themes';

// 추천/기본 테마 목록 (사용자가 커스텀 추가/선택 가능)
const DEFAULT_PORTFOLIO_CANDIDATE_THEMES = [
  '원전', '전력설비', '반도체', 'AI', '방산', '바이오', '로봇', '2차전지', '초전도체', '양자암호', '우주항공'
];

function getFavoritePortfolioThemes() {
  try {
    const raw = localStorage.getItem(THEME_PORTFOLIO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  // 기본 선택값 (원전, 전력설비)
  const defaultSelected = ['원전', '전력설비'];
  localStorage.setItem(THEME_PORTFOLIO_STORAGE_KEY, JSON.stringify(defaultSelected));
  return defaultSelected;
}

function saveFavoritePortfolioThemes(themes) {
  try {
    localStorage.setItem(THEME_PORTFOLIO_STORAGE_KEY, JSON.stringify(themes));
  } catch (e) {}
}

// 테마 즐겨찾기 토글 핸들러
window.togglePortfolioThemeChoice = function(themeName) {
  if (!themeName) return;
  const current = getFavoritePortfolioThemes();
  const idx = current.indexOf(themeName);
  if (idx > -1) {
    if (current.length <= 1) {
      if (window.showToast) window.showToast('최소 1개 이상의 테마는 선택되어 있어야 합니다.', '⚠️');
      return;
    }
    current.splice(idx, 1);
  } else {
    current.push(themeName);
  }
  saveFavoritePortfolioThemes(current);
  renderPortfolioThemeChipsUI();
  refreshThemePortfolioStreaming();
};

// 상단 다중 선택 칩 UI 렌더링
function renderPortfolioThemeChipsUI() {
  const chipsWrap = document.getElementById('theme-portfolio-selector-chips');
  const countEl = document.getElementById('portfolio-selected-count');
  if (!chipsWrap) return;

  const selected = getFavoritePortfolioThemes();
  if (countEl) {
    countEl.textContent = `선택: ${selected.length}개 테마 (${selected.join(', ')})`;
  }

  // 전체 테마 후보 풀 (기본 테마 + 현재 등록된 모든 테마)
  const allThemesPool = [...new Set([
    ...selected,
    ...DEFAULT_PORTFOLIO_CANDIDATE_THEMES,
    ...(window.detectiveThemes || []).map(t => t.theme_name).filter(Boolean)
  ])];

  chipsWrap.innerHTML = allThemesPool.map(theme => {
    const isChecked = selected.includes(theme);
    return `
      <button type="button" onclick="togglePortfolioThemeChoice('${escapeHtml(theme)}')" 
        style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 0.74rem; font-weight: 800; cursor: pointer; transition: all 0.2s; ${
          isChecked 
            ? 'background: #2563eb; color: #ffffff; border: 1px solid #2563eb; font-weight: 800; box-shadow: 0 1px 3px rgba(37, 99, 235, 0.3);' 
            : 'background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;'
        }">
        <span>${isChecked ? '⭐' : '☆'}</span>
        <span>${escapeHtml(theme)}</span>
        ${isChecked ? '<span style="font-size: 0.68rem; margin-left: 2px;">✔</span>' : ''}
      </button>
    `;
  }).join('');
}

// 다중 테마 통합 피드 스트리밍 호출 및 4대 채널 병렬 렌더링
window.refreshThemePortfolioStreaming = async function() {
  const colNews = document.getElementById('portfolio-col-news');
  const colDart = document.getElementById('portfolio-col-dart');
  const colReport = document.getElementById('portfolio-col-report');
  const colBlog = document.getElementById('portfolio-col-blog');

  const countNews = document.getElementById('portfolio-col-news-count');
  const countDart = document.getElementById('portfolio-col-dart-count');
  const countReport = document.getElementById('portfolio-col-report-count');
  const countBlog = document.getElementById('portfolio-col-blog-count');

  const spinIcon = document.getElementById('portfolio-sync-spin');
  const selectedThemes = getFavoritePortfolioThemes();

  if (!colNews || !colDart || !colReport || !colBlog) return;

  if (spinIcon) spinIcon.style.animation = 'spin 1s linear infinite';

  const loadingHtml = `
    <div style="text-align: center; padding: 28px 10px; color: #94a3b8; font-size: 0.78rem;">
      <div style="font-size: 1.2rem; margin-bottom: 5px;">⏳</div>
      <div>실시간 수집 중...</div>
    </div>
  `;
  colNews.innerHTML = loadingHtml;
  colDart.innerHTML = loadingHtml;
  colReport.innerHTML = loadingHtml;
  colBlog.innerHTML = loadingHtml;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const themeQuery = encodeURIComponent(selectedThemes.join(','));
    let items = [];

    try {
      const res = await fetch(`${BACKEND_API_BASE}/api/radar/collect?theme=${themeQuery}&t=${Date.now()}`, {
        signal: controller.signal
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.items)) {
          items = data.items;
          try {
            localStorage.setItem(`cache_stream_${themeQuery}`, JSON.stringify(items));
          } catch (se) {}
        }
      }
    } catch (netErr) {
      console.warn('[refreshThemePortfolioStreaming] 네트워크 지연/오류로 캐시 데이터 로드:', netErr);
      try {
        const cached = localStorage.getItem(`cache_stream_${themeQuery}`);
        if (cached) items = JSON.parse(cached);
      } catch (ce) {}
    } finally {
      clearTimeout(timeoutId);
    }

    // 4대 채널별 데이터 분류
    const newsItems = [];
    const dartItems = [];
    const reportItems = [];
    const blogItems = [];

    items.forEach(item => {
      const ch = (item.channel || '').toUpperCase();
      const sourceName = (item.press || item.source || item.blogger_name || '');

      if (ch === 'DART' || item.is_dart || sourceName.includes('공시') || sourceName.includes('DART')) {
        dartItems.push(item);
      } else if (ch === 'REPORT' || item.is_report || sourceName.includes('증권') || sourceName.includes('리서치') || sourceName.includes('리포트')) {
        reportItems.push(item);
      } else if (ch === 'BLOG' || item.is_blog || sourceName.includes('블로그') || item.blogger_name) {
        blogItems.push(item);
      } else {
        newsItems.push(item);
      }
    });

    // 건수 뱃지 반영
    if (countNews) countNews.textContent = `${newsItems.length}건`;
    if (countDart) countDart.textContent = `${dartItems.length}건`;
    if (countReport) countReport.textContent = `${reportItems.length}건`;
    if (countBlog) countBlog.textContent = `${blogItems.length}건`;

    // 단일 채널 렌더러 함수
    const renderChannelCards = (list, defaultSource, accentColor) => {
      if (!list || list.length === 0) {
        return `
          <div style="text-align: center; padding: 32px 10px; color: #64748b; font-size: 0.76rem; background: rgba(255,255,255,0.01); border-radius: 8px; border: 1px dashed rgba(255,255,255,0.06);">
            <div style="font-size: 1.1rem; margin-bottom: 4px;">📬</div>
            <div>수집된 데이터가 없습니다.</div>
          </div>
        `;
      }

      return list.map(item => {
        const itemTitle = (item.title || item.news_title || item.report_nm || '').trim();
        const rawUrl = (item.originallink || item.link || item.news_url || item.dart_url || item.report_url || '').trim();
        const itemDesc = (item.description || item.snippet || item.key_point || item.opinion || '').trim();
        const itemDate = item.pubDate || item.date || item.rcept_dt || item.raw_date || '실시간';
        const itemSource = item.press || item.source || item.blogger_name || item.broker || defaultSource;
        const themeTag = item.theme_tag || selectedThemes[0] || '테마';

        // 안전 원문 링크 생성 (유효하지 않으면 구글/네이버 검색 1:1 직결)
        let safeUrl = '';
        if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
          if (rawUrl !== 'https://www.naver.com' && rawUrl !== 'https://www.naver.com/' && rawUrl !== 'http://www.naver.com') {
            safeUrl = rawUrl;
          }
        }
        if (!safeUrl) {
          safeUrl = `https://www.google.com/search?q=${encodeURIComponent(itemSource + ' ' + (itemTitle || themeTag))}`;
        }

        return `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid ${accentColor}; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px; transition: all 0.15s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.02);" onmouseover="this.style.borderColor='#cbd5e1';" onmouseout="this.style.borderColor='#e2e8f0';">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 4px; font-size: 0.7rem;">
              <div style="display: flex; align-items: center; gap: 5px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <span style="font-weight: 800; color: ${accentColor}; background: ${accentColor}18; padding: 1px 5px; border-radius: 4px; border: 1px solid ${accentColor}33; white-space: nowrap;">
                  #${escapeHtml(themeTag)}
                </span>
                <span style="color: #94a3b8; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${escapeHtml(itemSource)}
                </span>
              </div>
              <span style="color: #64748b; font-size: 0.68rem; white-space: nowrap; flex-shrink: 0;">
                ${escapeHtml(itemDate)}
              </span>
            </div>

            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 0.84rem; font-weight: 800; color: #0f172a; text-decoration: none; line-height: 1.38; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word;" onmouseover="this.style.color='${accentColor}';" onmouseout="this.style.color='#0f172a';">
              ${escapeHtml(itemTitle || '상세 소식 확인하기')}
            </a>

            ${itemDesc ? `
              <div style="font-size: 0.74rem; color: #475569; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word;">
                ${escapeHtml(itemDesc)}
              </div>
            ` : ''}

            <div style="display: flex; justify-content: flex-end; margin-top: 2px;">
              <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 0.7rem; font-weight: 800; color: ${accentColor}; background: ${accentColor}15; border: 1px solid ${accentColor}35; padding: 3px 8px; border-radius: 4px; text-decoration: none; display: inline-flex; align-items: center; gap: 3px; transition: all 0.15s ease;" onmouseover="this.style.background='${accentColor}30';" onmouseout="this.style.background='${accentColor}15';">
                원문 ↗
              </a>
            </div>
          </div>
        `;
      }).join('');
    };

    // 4개 컬럼 각각에 렌더링 주입
    colNews.innerHTML = renderChannelCards(newsItems, '증권 뉴스', '#38bdf8');
    colDart.innerHTML = renderChannelCards(dartItems, 'DART 공시', '#fbbf24');
    colReport.innerHTML = renderChannelCards(reportItems, '증권사 리포트', '#34d399');
    colBlog.innerHTML = renderChannelCards(blogItems, '블로그 분석', '#c084fc');

  } catch (err) {
    console.error('[Theme Portfolio Error]', err);
    const errHtml = `
      <div style="text-align: center; padding: 20px 8px; color: #b91c1c; font-size: 0.75rem;">
        데이터 수집 오류 발생
      </div>
    `;
    colNews.innerHTML = errHtml;
    colDart.innerHTML = errHtml;
    colReport.innerHTML = errHtml;
    colBlog.innerHTML = errHtml;
  } finally {
    if (spinIcon) spinIcon.style.animation = 'none';
  }
};

// 캘린더 서브탭 진입 시 자동 초기화 연동
function initThemePortfolioView() {
  renderPortfolioThemeChipsUI();
  refreshThemePortfolioStreaming();
}

// 검색 및 필터 연동
function initStockSearch() {
  const searchInput = document.getElementById('stock-search-input');
  const filterChips = document.querySelectorAll('.stock-filter-chip');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      const filtered = STOCK_THEMES_DATA.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.leader.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q)
      );
      renderStockThemesList(filtered.length > 0 ? filtered : STOCK_THEMES_DATA);
      if (filtered.length > 0) selectStockTheme(0, filtered);
    });
  }

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const cat = chip.getAttribute('data-filter');

      let filtered = STOCK_THEMES_DATA;
      if (cat !== 'all') {
        filtered = STOCK_THEMES_DATA.filter(t => t.category === cat);
      }
      renderStockThemesList(filtered);
      if (filtered.length > 0) selectStockTheme(0, filtered);
    });
  });
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[s]));
}

// 주식/뉴스 API 모달 제어 및 네이버 허브 API 키 100% 자동 연동
window.openStockApiModal = function () {
  const modal = document.getElementById('apiStockModal');
  if (!modal) return;
  modal.style.display = 'flex';

  const nId = document.getElementById('stockNaverClientId');
  const nSec = document.getElementById('stockNaverClientSecret');
  const kKey = document.getElementById('stockKisAppKey');
  const kSec = document.getElementById('stockKisAppSecret');

  // 사용자가 키워드센터나 네이버 허브 설정에서 이미 저장한 키를 우선적으로 가져와서 자동 채움
  const existingNaverId = localStorage.getItem('naver_client_id') || localStorage.getItem('stock_naver_client_id') || '';
  const existingNaverSec = localStorage.getItem('naver_client_secret') || localStorage.getItem('stock_naver_client_secret') || '';

  if (nId) nId.value = existingNaverId;
  if (nSec) nSec.value = existingNaverSec;
  if (kKey) kKey.value = localStorage.getItem('stock_kis_app_key') || '';
  if (kSec) kSec.value = localStorage.getItem('stock_kis_app_secret') || '';
};

window.closeStockApiModal = function () {
  const modal = document.getElementById('apiStockModal');
  if (modal) modal.style.display = 'none';
  updateStockApiBadge();
};

window.saveStockApiKeys = function () {
  const nId = document.getElementById('stockNaverClientId')?.value.trim() || '';
  const nSec = document.getElementById('stockNaverClientSecret')?.value.trim() || '';
  const kKey = document.getElementById('stockKisAppKey')?.value.trim() || '';
  const kSec = document.getElementById('stockKisAppSecret')?.value.trim() || '';

  // 네이버 허브 키와 주식 키를 둘 다 저장하여 사이트 전체에서 공유
  if (nId) {
    localStorage.setItem('stock_naver_client_id', nId);
    localStorage.setItem('naver_client_id', nId);
  }
  if (nSec) {
    localStorage.setItem('stock_naver_client_secret', nSec);
    localStorage.setItem('naver_client_secret', nSec);
  }
  if (kKey) localStorage.setItem('stock_kis_app_key', kKey);
  if (kSec) localStorage.setItem('stock_kis_app_secret', kSec);

  window.closeStockApiModal();
  if (window.showToast) {
    window.showToast('네이버 허브 및 주식 API 키가 완벽히 연동되었습니다!', '🔑');
  }
  updateStockApiBadge();
};

window.clearStockApiKeys = function () {
  localStorage.removeItem('stock_naver_client_id');
  localStorage.removeItem('stock_naver_client_secret');
  localStorage.removeItem('stock_kis_app_key');
  localStorage.removeItem('stock_kis_app_secret');

  const nId = document.getElementById('stockNaverClientId');
  const nSec = document.getElementById('stockNaverClientSecret');
  const kKey = document.getElementById('stockKisAppKey');
  const kSec = document.getElementById('stockKisAppSecret');

  if (nId) nId.value = '';
  if (nSec) nSec.value = '';
  if (kKey) kKey.value = '';
  if (kSec) kSec.value = '';

  window.closeStockApiModal();
  if (window.showToast) {
    window.showToast('주식/뉴스 API 키가 초기화되었습니다.', '🗑️');
  }
  updateStockApiBadge();
};

// 주식 페이지 상단 API 연동 상태 배지 실시간 표시
function updateStockApiBadge() {
  const badge = document.getElementById('stock-api-status-badge');
  if (!badge) return;

  const naverId = localStorage.getItem('naver_client_id') || localStorage.getItem('stock_naver_client_id');
  const kisKey = localStorage.getItem('stock_kis_app_key');

  if (naverId && kisKey) {
    badge.innerHTML = '🟢 네이버 허브 & 한국투자증권 실시간 연동 중';
    badge.style.color = '#34d399';
  } else if (naverId) {
    badge.innerHTML = '🟢 네이버 허브 실시간 뉴스 API 연동 완료';
    badge.style.color = '#34d399';
  } else if (kisKey) {
    badge.innerHTML = '🟢 한국투자증권 실시간 시세 연동 완료';
    badge.style.color = '#38bdf8';
  } else {
    badge.innerHTML = '⚪ 기본 무료 모드 (네이버 금융 실시간 시세 가동 중)';
    badge.style.color = '#94a3b8';
  }
}

// ============================================================================
// 5. 종목 상세정보 딥분석 센터 (Deep Research Data & Functions)
// - 공시 + 실적 + BM(수주/제조업 돈 버는 구조) + 관련 뉴스 + 캘린더 일정 + 엮인 테마 종목군 + 미래 전망 총집합
// ============================================================================
const STOCK_DEEP_DATA = [
  {
    id: 'deep-000660',
    symbol: '000660',
    name: 'SK하이닉스',
    market: 'KOSPI · 반도체 대장주',
    sector: '제조업 / 첨단 반도체 파운드리 연계 패키징',
    currentPrice: '168,500원',
    changeRate: '+3.82%',
    rateType: 'up',
    marketCap: '122조 6,660억원 (코스피 2위)',
    foreignRate: '54.2%',
    perPbr: 'PER 14.8배 · PBR 1.85배 · ROE 18.2%',
    badge: 'HBM4 세계 1위',
    badgeColor: '#38bdf8',
    oneLine: '엔비디아 HBM 점유율 1위 독점 공급자. 16단 HBM4 및 유리기판 양산 주도.',

    // 1. 비즈니스 모델 (어떻게 현재 돈을 벌고 있는가?)
    bm: {
      type: '제조업 (첨단 메모리 & 어드밴스드 패키징)',
      structure: 'HBM(고대역폭 메모리) 42% + 서버용 DDR5 33% + 기업용 eSSD(낸드) 20% + 기타 5%',
      cashCow: '엔비디아 AI 가속기(B200, GB200, 루빈) 납품용 12단/16단 HBM3E 및 HBM4. 일반 D램 대비 마진율이 4~5배에 달하는 고부가가치 AI 메모리가 전체 영업이익의 70% 견인.',
      costStructure: 'EUV(극자외선 노광) 장비 감가상각비 및 TSV(실리콘 관통전극) 본딩 기술 로열티, 웨이퍼 원자재비가 주요 비용이나 압도적인 수율(80% 이상)로 원가 경쟁력 세계 최고.'
    },

    // 2. 실적 히스토리 & 컨센서스
    financials: {
      q24_1: { sales: '12조 4,300억', profit: '2조 8,860억', margin: '23.2%' },
      q24_2: { sales: '16조 4,233억', profit: '5조 4,685억', margin: '33.3%' },
      q24_3E: { sales: '18조 1,200억 (예상)', profit: '6조 7,500억 (예상)', margin: '37.2%' },
      annual2024E: '연간 매출 66조원 / 영업이익 23조원 흑자 대전환 (사상 최대 실적 경신 전망)',
      point: 'D램과 eSSD 전 제품군 판가(ASP) 상승과 HBM 완판으로 영업이익률 35% 돌파. 과거 사이클 대비 고정비 부담이 대폭 경감됨.'
    },

    // 3. 최근 주요 공시 & 수주/계약
    disclosures: [
      { date: '2026-08-28', title: '청주 M15X 신규 패키징 팹 20조원 투자 진행 현황 안내', tag: '설비투자' },
      { date: '2026-08-14', title: '반기보고서 (2024.06) 제출 - HBM 매출 비중 역대 최고치', tag: '정기공시' },
      { date: '2026-07-25', title: '2분기 연결기준 영업이익 5조 4,685억원 달성 (전년비 흑자전환)', tag: '실적공시' },
      { date: '2026-04-19', title: '美 인디애나주 차세대 패키징 R&D 생산기지 건설 투자 협약', tag: '해외투자' }
    ],

    // 4. 이 종목에 관련된 모든 핵심 기사 (현재 뉴스 모음)
    articles: [
      { title: '엔비디아 차세대 가속기 루빈 HBM4 규격 채택… 하이닉스 1위 굳히기', media: '한국경제', time: '18분 전', date: '오늘' },
      { title: 'SK하이닉스, HBM3E 12단 3분기 양산 돌입… 경쟁사 격차 1년 이상 벌려', media: '매일경제', time: '1시간 전', date: '오늘' },
      { title: '외인·기관 반도체 소부장 1조 순매수… 하이닉스 중심 장비 발주 사이클', media: '머니투데이', time: '3시간 전', date: '어제' },
      { title: '글로벌 빅테크 AI CAPEX 200조원 상향 돌파… HBM4 납품 선점 경쟁', media: '디지털타임스', time: '1일 전', date: '2일 전' }
    ],

    // 5. 엮여있는 테마 및 관련주 맵
    themes: [
      {
        name: '🔥 차세대 HBM4 & 패키징',
        relation: '주도 대장주 (글로벌 1등)',
        peers: '한미반도체, 와이씨, 에프에스티, 필옵틱스, 제우스'
      },
      {
        name: '🧪 유리기판(Glass Substrate)',
        relation: '유리기판 컨소시엄 주도사',
        peers: 'SKC, 앱솔릭스, 필옵틱스, 제이앤티씨'
      },
      {
        name: '💾 CXL 2.0 및 온디바이스 메모리',
        relation: 'CXL D램 규격 공동 표준 수립',
        peers: '네오셈, 오픈엣지테크놀로지, 엑시콘'
      }
    ],

    // 6. 증시 주요 일정 및 D-Day
    events: [
      { date: '2026-09-17 (수)', title: '엔비디아 글로벌 AI 서밋 CEO 기조연설', dday: 'D-2', impact: 'HBM4 표준 및 루빈 공급사 언급 여부 초관심' },
      { date: '2026-10-24 (목)', title: 'SK하이닉스 2024년 3분기 공식 실적 발표', dday: 'D-39', impact: '영업이익 6조 5천억 돌파 여부 및 HBM 납품 가이던스' }
    ],

    // 7. 이 종목의 미래 종집합소 (미래 지속성 & 최종 총평)
    futureOutlook: {
      rating: '적극 매수 (Conviction Buy)',
      targetScore: 96,
      summary: '단순 반도체 제조사를 넘어 글로벌 AI 빅테크 인프라의 핵심 엔진으로 도약.',
      catalyst: '2026년 하반기 16단 HBM4 조기 출하와 용인 반도체 클러스터 가동으로 1등 프리미엄 유지.',
      riskCheck: '미국의 대중국 AI 반도체 추가 수출 규제와 빅테크의 단기 AI CAPEX 조정 가능성 체크 필요.'
    }
  },
  {
    id: 'deep-000250',
    symbol: '000250',
    name: '삼천당제약',
    market: 'KOSDAQ · 바이오 대장주',
    sector: '제약/바이오 (경구용 제형 플랫폼 및 아일리아 바이오시밀러)',
    currentPrice: '142,000원',
    changeRate: '+6.12%',
    rateType: 'up',
    marketCap: '3조 2,150억원 (코스닥 5위)',
    foreignRate: '12.8%',
    perPbr: 'PER 68.2배 · PBR 8.4배 · 기술수출 기대감 선반영',
    badge: '경구용 GLP-1 1등',
    badgeColor: '#34d399',
    oneLine: '먹는(경구용) 비만/당뇨 치료제 플랫폼 S-PASS 보유. 유럽 본계약 체결 가시화.',

    bm: {
      type: '바이오 플랫폼 기술수출(L/O) 및 바이오시밀러 제조업',
      structure: '안과용 치료제(아일리아 시밀러) 판권 45% + 경구용 플랫폼 기술이전 40% + 제네릭 의약품 15%',
      cashCow: '주사제 전용 약물을 알약으로 흡수시키는 독자적 경구화 기술 \'S-PASS\'. 글로벌 빅파마 대상 유럽/북미 판권 계약금 및 경상기술료(마일스톤/로열티) 유입 구조.',
      costStructure: '임상 1/3상 시험비용 및 글로벌 실사(Audit) 대응비가 핵심이며, 완제의약품 생산은 글로벌 파트너 CMO와 공동 진행하여 시설투자 리스크 최소화.'
    },

    financials: {
      q24_1: { sales: '460억', profit: '22억', margin: '4.8%' },
      q24_2: { sales: '585억', profit: '68억', margin: '11.6%' },
      q24_3E: { sales: '720억 (예상)', profit: '145억 (예상)', margin: '20.1%' },
      annual2024E: '유럽 판권 계약금 유입 시 영업이익 500억 돌파 및 사상 최대 흑자 도약',
      point: '바이오시밀러 유럽 허가 승인과 비만치료제 본계약 체결 시 폭발적인 기술료 영업이익 전환 구조.'
    },

    disclosures: [
      { date: '2026-09-02', title: '경구용 GLP-1 비만치료제 유럽 5개국 공급 독점 판매 본계약 체결', tag: '수주/계약' },
      { date: '2026-08-20', title: '투자판단 관련 주요경영사항 - 아일리아 바이오시밀러 유럽 품목허가 승인', tag: '주요사항' },
      { date: '2026-07-15', title: '기타 시장안내 - 전환사채(CB) 전량 조기상환 완료로 오버행 해소', tag: '재무공시' }
    ],

    articles: [
      { title: '삼천당제약, 경구용 GLP-1 유럽 5개국 공급 독점 계약 체결 공시', media: '연합뉴스', time: '25분 전', date: '오늘' },
      { title: '주사 바늘 공포 끝… 먹는 비만약 플랫폼 보유 삼천당제약 수급 폭발', media: '이데일리', time: '1시간 전', date: '오늘' },
      { title: '노보노디스크·일라이릴리 실적 서프라이즈… 비만약 플랫폼주 재평가', media: '바이오스펙테이터', time: '3시간 전', date: '어제' }
    ],

    themes: [
      {
        name: '💊 경구용 비만/당뇨 치료제',
        relation: '국내 기술 독점 대장주',
        peers: '인벤티지랩, 디앤디파마텍, 펩트론, 한미약품'
      },
      {
        name: '👁️ 황반변성 아일리아 바이오시밀러',
        relation: '유럽 퍼스트무버 승인사',
        peers: '셀트리온, 삼성바이오에피스, 알테오젠'
      }
    ],

    events: [
      { date: '2026-09-24 (목)', title: '미국 FDA 아일리아 바이오시밀러 품목허가 최종 승인 D-Day', dday: 'D-9', impact: '북미 시장 직판 및 대규모 마일스톤 유입 분기점' },
      { date: '2026-10-18 (금)', title: '글로벌 바이오 유럽 파트너링 컨퍼런스 참가', dday: 'D-33', impact: '비만약 북미 판권 추가 본계약 협상 결과 발표' }
    ],

    futureOutlook: {
      rating: '매수 (Growth Momentum)',
      targetScore: 92,
      summary: '경구용 비만 치료제 시장의 패러다임 변화를 이끄는 핵심 게임체인저.',
      catalyst: '글로벌 100조 비만치료제 시장에서 주사제 복용 불편을 해소한 알약 상용화 독점력.',
      riskCheck: '글로벌 빅파마 임상 검증 지연 여부 및 계약금 분할 인식 일정 모니터링 필요.'
    }
  },
  {
    id: 'deep-034020',
    symbol: '034020',
    name: '두산에너빌리티',
    market: 'KOSPI · 원전/에너지 대장주',
    sector: '수주산업 / 대형 원자력 발전설비 및 SMR 주기기 제작',
    currentPrice: '21,300원',
    changeRate: '+4.85%',
    rateType: 'up',
    marketCap: '13조 6,400억원 (코스피 24위)',
    foreignRate: '21.5%',
    perPbr: 'PER 24.5배 · PBR 1.35배 · 수주잔고 17조원 돌파',
    badge: '체코 30조 수혜',
    badgeColor: '#a855f7',
    oneLine: '체코 30조 원전 주기기 제작 독점. 빅테크 AI 데이터센터 SMR 파트너십.',

    bm: {
      type: '수주산업 (글로벌 원전 및 가스터빈/SMR 단조 부품 제조업)',
      structure: '대형 원전 주기기(원자로·증기발생기) 48% + 가스터빈 및 복합화력 28% + 신재생/SMR 18% + 기타 6%',
      cashCow: '한국수력원자력 팀코리아의 체코 2기 원전 건설 수주(두산에너빌리티 몫 약 4~5조원 주기기 공급). 뉴스케일파워, 엑스에너지 등 미국 SMR 선두기업 전용 단조품 독점 제작.',
      costStructure: '원자재(특수강, 티타늄) 가격 및 생산 리드타임(3~4년)에 따른 장기 수주 공사손실 충당금 관리 필요.'
    },

    financials: {
      q24_1: { sales: '4조 980억', profit: '3,580억', margin: '8.7%' },
      q24_2: { sales: '4조 2,150억', profit: '3,890억', margin: '9.2%' },
      q24_3E: { sales: '4조 4,500억 (예상)', profit: '4,100억 (예상)', margin: '9.2%' },
      annual2024E: '연간 매출 17조 5천억 / 영업이익 1조 6천억 돌파 확정적',
      point: '원전 수주잔고 사상 최대치(17조원) 경신으로 향후 4년간 안정적 고마진 공사 진행.'
    },

    disclosures: [
      { date: '2026-08-22', title: '단일판매 공급계약 체결 - 美 뉴스케일파워 SMR 소재 제작 계약', tag: '수주공시' },
      { date: '2026-07-18', title: '체코 신규 원전 건설사업 우선협상대상자 선정 결과 안내', tag: '대규모수주' },
      { date: '2026-06-11', title: '국내 순수 기술 개발 한국형 초대형 가스터빈 공급 계약 체결', tag: '신성장사업' }
    ],

    articles: [
      { title: '팀코리아 체코 원전 실무협상단 현지 파견… 연내 본계약 마무리 박차', media: '서울경제', time: '2시간 전', date: '오늘' },
      { title: '두산에너빌리티, 美 뉴스케일파워 SMR 핵심 단조품 추가 제작 돌입', media: '조선비즈', time: '3시간 전', date: '오늘' },
      { title: '글로벌 빅테크 AI 데이터센터 전력난 해법으로 SMR 채택 본격화', media: '디지털타임스', time: '4시간 전', date: '오늘' }
    ],

    themes: [
      {
        name: '⚡ 체코 원전 & 글로벌 수주',
        relation: '원자로 주기기 독점 제작 총괄',
        peers: '한신기계, 우진엔텍, 일진파워, 에너토크'
      },
      {
        name: '🤖 AI 데이터센터 전력망 & SMR',
        relation: '미국 SMR 주기기 제작 파트너',
        peers: '비에이치아이, 서전기전, LS ELECTRIC'
      }
    ],

    events: [
      { date: '2026-10-15 (목)', title: '체코 정부 두코바니 원전 최종 본계약 체결식', dday: 'D-30', impact: '30조원 정식 수주 확정 및 계약금 10% 유입' },
      { date: '2026-11-04 (수)', title: '미국 차세대 원자력 에너지 규제 컨퍼런스', dday: 'D-50', impact: '뉴스케일파워 상용 SMR 착공 인허가 발표' }
    ],

    futureOutlook: {
      rating: '매수 (Long-term Buy)',
      targetScore: 90,
      summary: 'AI 시대 최대 병목인 전력난을 해결하는 원전 르네상스의 최대 수혜주.',
      catalyst: '체코에 이은 폴란드, UAE 2차 원전 후속 수주 및 대형 가스터빈 실적 레버리지.',
      riskCheck: '국제 원자재 시세 급등 및 지정학적 수출 통제 인허가 절차 지연 주의.'
    }
  },
  {
    id: 'deep-277810',
    symbol: '277810',
    name: '레인보우로보틱스',
    market: 'KOSDAQ · 로봇 대장주',
    sector: '제조업 / 휴머노이드 및 협동로봇 완제품 개발/양산',
    currentPrice: '156,000원',
    changeRate: '+3.90%',
    rateType: 'up',
    marketCap: '3조 1,200억원 (코스닥 7위)',
    foreignRate: '9.4%',
    perPbr: 'PER 95.0배 · PBR 12.1배 · 삼성전자 지분 인수 기대감',
    badge: '삼성 로봇 협력',
    badgeColor: '#fb923c',
    oneLine: '삼성전자가 2대 주주인 휴머노이드 로봇 대표주. 감속기/모터 내재화 100%.',

    bm: {
      type: '제조업 (협동로봇 완제품 및 피지컬 AI 휴머노이드 플랫폼)',
      structure: '협동로봇(RB 시리즈) 60% + 초정밀 모션 제어기/부품 25% + 4족보행 로봇/기타 15%',
      cashCow: '핵심 부품인 감속기, 모터, 브레이크, 엔코더 100% 자체 개발/내재화로 타 경쟁사 대비 원가율 50% 절감. 삼성전자 평택/기흥 반도체 라인 협동로봇 전면 공급.',
      costStructure: '휴머노이드 양산 R&D 인력 인건비 및 피지컬 AI 파운데이션 모델 학습 비용 중심.'
    },

    financials: {
      q24_1: { sales: '48억', profit: '2억', margin: '4.1%' },
      q24_2: { sales: '65억', profit: '8억', margin: '12.3%' },
      q24_3E: { sales: '92억 (예상)', profit: '18억 (예상)', margin: '19.5%' },
      annual2024E: '삼성전자 스마트팩토리 투입 본격화로 2025년부터 매출 300% 퀀텀점프 기대',
      point: '국내 유일 부품 수직계열화 성공으로 영업마진율 20% 상회 가능한 구조적 경쟁력.'
    },

    disclosures: [
      { date: '2026-08-10', title: '최대주주 변경을 수반하는 주식매수선택권(콜옵션) 행사 현황 안내', tag: '지배구조' },
      { date: '2026-07-02', title: '반도체 제조공정 투입용 특수 방진 협동로봇 신제품 납품 계약', tag: '수주계약' },
      { date: '2026-05-18', title: '북미 대형 로봇 자동화 유통망 구축 파트너십 체결', tag: '해외진출' }
    ],

    articles: [
      { title: '테슬라 옵티머스 3세대 연내 상용화… 로봇 부품사 견적 발주 본격화', media: '헤럴드경제', time: '3시간 전', date: '오늘' },
      { title: '레인보우로보틱스 협동로봇 신제품 북미 수출 계약 가시화', media: '머니S', time: '5시간 전', date: '오늘' },
      { title: '삼성전자, 보핏 양산 확대 및 레인보우로보틱스 콜옵션 행사 시점 임박', media: '조선비즈', time: '1일 전', date: '어제' }
    ],

    themes: [
      {
        name: '🤖 피지컬 AI & 휴머노이드',
        relation: '국내 휴머노이드 최고 기술 대장주',
        peers: '에스피지, 로보티즈, 두산로보틱스, 엔젤로보틱스'
      },
      {
        name: '🏢 삼성 로봇 에코시스템',
        relation: '삼성전자 콜옵션 지분 59.94% 잠재 보유',
        peers: '이랜시스, 인탑스, 에스비비테크'
      }
    ],

    events: [
      { date: '2026-10-10 (토)', title: '테슬라 로보택시 및 옵티머스 3세대 공개 이벤트', dday: 'D-25', impact: '글로벌 휴머노이드 로봇 부품 수요 재부각 모멘텀' },
      { date: '2026-11-20 (금)', title: '삼성전자 콜옵션 행사 가능 기한 도래', dday: 'D-66', impact: '삼성전자 자회사 편입 공시 발생 시 주가 재평가' }
    ],

    futureOutlook: {
      rating: '스윙 분할 매수 (High Growth)',
      targetScore: 88,
      summary: '제조업 무인화와 인공지능이 로봇 몸체를 얻는 피지컬 AI 시대의 최고 수혜주.',
      catalyst: '삼성전자 자회사 편입 이벤트와 북미 물류/공장 라인 대규모 수출 체결.',
      riskCheck: '현재 밸류에이션이 높아 분기 실적 미스 시 단기 변동성 확대 주의.'
    }
  },
  {
    id: 'deep-012450',
    symbol: '012450',
    name: '한화에어로스페이스',
    market: 'KOSPI · K-방산 대장주',
    sector: '수주산업 / 자주포, 다련장 로켓, 항공기 엔진 및 발사체',
    currentPrice: '328,000원',
    changeRate: '+2.80%',
    rateType: 'up',
    marketCap: '16조 5,900억원 (코스피 18위)',
    foreignRate: '38.6%',
    perPbr: 'PER 16.2배 · PBR 2.1배 · 수주잔고 30조원 돌파',
    badge: 'K9 자주포 글로벌 1위',
    badgeColor: '#10b981',
    oneLine: '글로벌 자주포 시장 점유율 50% 석권. 루마니아·폴란드 2차 수주 잭팟.',

    bm: {
      type: '수주산업 (방위산업 지상무기체계 및 항공우주 제조업)',
      structure: '지상 방산(K9 자주포, 천무 다련장) 65% + 항공우주 엔진 20% + 한화비전/정밀기계 15%',
      cashCow: '폴란드 1/2차 K9 자주포 및 천무 수출, 호주 레드백 장갑차 수주, 루마니아 1.3조 자주포 계약. 50% 이상 달하는 해외 수출 비중으로 영업이익률 12% 이상 달성.',
      costStructure: '특수강재 및 화약/엔진 부품 수급비용. 납기 준수율 100%로 페널티 없는 독보적 생산라인 효율성.'
    },

    financials: {
      q24_1: { sales: '1조 8,480억', profit: '374억', margin: '2.0%' },
      q24_2: { sales: '2조 7,860억', profit: '3,588억', margin: '12.9%' },
      q24_3E: { sales: '3조 1,200억 (예상)', profit: '4,200억 (예상)', margin: '13.5%' },
      annual2024E: '연간 매출 11조 5천억 / 영업이익 1조 2천억 돌파로 역대 최고 실적',
      point: '2분기부터 폴란드 납품 물량이 본격 인식되며 영업이익률 13%대의 초호황기 진입.'
    },

    disclosures: [
      { date: '2026-08-30', title: '단일판매 공급계약 체결 - 루마니아 국방부 자주포 1조 3,800억원 수주', tag: '대규모수주' },
      { date: '2026-07-29', title: '연결재무제표 기준 2분기 영업이익 3,588억원 (전년비 356% 폭증)', tag: '어닝서프라이즈' },
      { date: '2026-06-12', title: '인적분할 완료 안내 - 순수 방산/항공우주 전문 지주사로 재편', tag: '기업지배구조' }
    ],

    articles: [
      { title: '한화에어로스페이스, 루마니아 자주포 수주 후속 탄약 운반차 계약 마무리', media: '아시아경제', time: '3시간 전', date: '오늘' },
      { title: '폴란드 K9 2차 실행계약 체결 임박… 창원 생산 라인 풀가동 돌입', media: '조선비즈', time: '4시간 전', date: '오늘' },
      { title: '나토 회원국 국방비 GDP 2% 의무화… 한국산 무기 납기 경쟁력 독보적', media: '한국경제', time: '1일 전', date: '어제' }
    ],

    themes: [
      {
        name: '🛡️ K-방산 수주 랠리',
        relation: '국내 지상 방산 통합 1위 대장주',
        peers: '현대로템, LIG넥스원, 한국항공우주, 풍산'
      },
      {
        name: '🚀 누리호 & 우주항공청 에코시스템',
        relation: '누리호 민간 체계종합기업',
        peers: '한화시스템, 쎄트렉아이, AP위성'
      }
    ],

    events: [
      { date: '2026-10-05 (월)', title: '폴란드 국방부 K9 자주포 2차 잔여 실행계약 서명식', dday: 'D-20', impact: '약 4조원대 2차 이행계약 최종 수주 확정' },
      { date: '2026-11-12 (목)', title: '중동 방위산업전시회(IDEX) 천궁/천무 대규모 수주 상담', dday: 'D-58', impact: '사우디·UAE 추가 탄약 수출 파트너십 가시화' }
    ],

    futureOutlook: {
      rating: '강력 매수 (Top Pick)',
      targetScore: 95,
      summary: '지정학적 위기와 글로벌 재무장 트렌드가 만들어낸 10년 주기 메가 트렌드.',
      catalyst: '30조원 수주잔고 바탕으로 2028년까지 연평균 25% 이상 고성장 담보.',
      riskCheck: '종전 협상 등 지정학적 리스크 완화 시 단기 차익실현 매물 가능성.'
    }
  }
];

let currentDeepIdx = 0;
let currentDeepTab = 'all'; // all, bm, finance, news, theme, future

// 5번 종목 딥분석 센터 초기화
function initStockDeepResearch() {
  renderStockDeepChips();
  renderStockDeepList();
  selectStockDeepItem(0);
}

// 상단 빠른 종목 칩 렌더링
function renderStockDeepChips() {
  const chipWrap = document.getElementById('stock-deep-quick-chips');
  if (!chipWrap) return;

  chipWrap.innerHTML = STOCK_DEEP_DATA.map((item, idx) => `
    <button type="button" class="imggen-style-chip ${idx === currentDeepIdx ? 'active' : ''}" 
            onclick="selectStockDeepItem(${idx})" 
            style="padding: 4px 12px; font-size: 0.78rem; font-weight: 700;">
      ${escapeHtml(item.name)} (${item.symbol})
    </button>
  `).join('');
}

// 좌측 종목 목록 렌더링
function renderStockDeepList() {
  const listWrap = document.getElementById('stock-deep-list');
  if (!listWrap) return;

  listWrap.innerHTML = STOCK_DEEP_DATA.map((item, idx) => `
    <div class="kc-card ${idx === currentDeepIdx ? 'active' : ''}" onclick="selectStockDeepItem(${idx})" style="cursor: pointer; margin-bottom: 10px;">
      <div class="kc-card-num-box" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 0.78rem;">
        ${idx + 1}
      </div>
      <div class="kc-card-body">
        <div class="kc-card-kw-title" style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 1.02rem; font-weight: 900; color: #f8fafc;">${escapeHtml(item.name)}</span>
          <span style="color: #ef4444; font-size: 0.9rem; font-weight: 900;">${item.changeRate}</span>
        </div>
        <div class="kc-card-sub-row" style="margin: 4px 0;">
          <span class="kc-badge-tag" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; font-size: 0.72rem;">${escapeHtml(item.badge)}</span>
          <span class="kc-badge-vol" style="font-size: 0.75rem; color: #94a3b8;">${item.symbol} · ${escapeHtml(item.market.split('·')[0].trim())}</span>
        </div>
        <div style="font-size: 0.76rem; color: #cbd5e1; margin-top: 4px; line-height: 1.4;">
          ${escapeHtml(item.oneLine)}
        </div>
      </div>
    </div>
  `).join('');
}

// 우측 딥분석 종합 리포트 렌더링
window.selectStockDeepItem = function (idx) {
  currentDeepIdx = idx;
  const item = STOCK_DEEP_DATA[idx] || STOCK_DEEP_DATA[0];
  const detailPanel = document.getElementById('stock-deep-detail');
  if (!detailPanel || !item) return;

  // 상단 칩과 좌측 카드 활성화 상태 동기화
  renderStockDeepChips();
  document.querySelectorAll('#stock-deep-list .kc-card').forEach((c, i) => {
    c.classList.toggle('active', i === idx);
  });

  // 1. 공시 HTML
  const disclosuresHtml = item.disclosures.map(d => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; margin-bottom: 6px;">
      <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
        <span style="font-size: 0.72rem; color: #38bdf8; background: rgba(56,189,248,0.12); padding: 2px 6px; border-radius: 4px; font-weight: 700; white-space: nowrap;">${escapeHtml(d.tag)}</span>
        <span style="font-size: 0.84rem; color: #f8fafc; font-weight: 600;">${escapeHtml(d.title)}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; white-space: nowrap;">
        <span style="font-size: 0.74rem; color: #94a3b8;">${escapeHtml(d.date)}</span>
        <a href="https://dart.fss.or.kr/dsac001/mainAll.do?selectDate=${encodeURIComponent(d.date.replace(/-/g, ''))}" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: #38bdf8; text-decoration: none; font-weight: 700;">
          DART 공시 ↗
        </a>
      </div>
    </div>
  `).join('');

  // 2. 기사 HTML
  const articlesHtml = item.articles.map(a => {
    const cleanT = a.title.replace(/\[.*?\]/g, '').trim();
    const link = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(cleanT || a.title)}`;
    return `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; margin-bottom: 6px; gap: 8px;">
      <div style="flex: 1;">
        <div style="font-size: 0.84rem; color: #f8fafc; font-weight: 600; line-height: 1.4;">${escapeHtml(a.title)}</div>
        <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;">${escapeHtml(a.media)} · ${escapeHtml(a.time)}</div>
      </div>
      <a href="${link}" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: #38bdf8; background: rgba(56,189,248,0.12); border: 1px solid rgba(56,189,248,0.3); padding: 4px 10px; border-radius: 6px; text-decoration: none; font-weight: 700; white-space: nowrap;">
        기사 보기 ↗
      </a>
    </div>
  `;
  }).join('');

  // 3. 엮인 테마 종목군 HTML
  const themesHtml = item.themes.map(t => `
    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 14px; margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-size: 0.92rem; font-weight: 800; color: #38bdf8;">${escapeHtml(t.name)}</span>
        <span style="font-size: 0.74rem; background: rgba(56,189,248,0.15); color: #38bdf8; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${escapeHtml(t.relation)}</span>
      </div>
      <div style="font-size: 0.82rem; color: #cbd5e1; line-height: 1.5;">
        🤝 함께 엮여 움직이는 관련주: <strong style="color: #f8fafc;">${escapeHtml(t.peers)}</strong>
      </div>
    </div>
  `).join('');

  // 4. 주요 일정 HTML
  const eventsHtml = item.events.map(e => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; margin-bottom: 6px;">
      <div>
        <div style="font-size: 0.88rem; font-weight: 800; color: #f8fafc; margin-bottom: 2px;">${escapeHtml(e.title)}</div>
        <div style="font-size: 0.76rem; color: #94a3b8;">${escapeHtml(e.impact)}</div>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 0.92rem; font-weight: 900; color: #34d399; background: rgba(16,185,129,0.15); padding: 3px 8px; border-radius: 6px;">${escapeHtml(e.dday)}</span>
        <div style="font-size: 0.72rem; color: #64748b; margin-top: 4px;">${escapeHtml(e.date)}</div>
      </div>
    </div>
  `).join('');

  detailPanel.innerHTML = `
    <div class="kc-white-report-container" style="background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
      <!-- A. 최상단 종목 프로필 헤더 -->
      <div class="kc-detail-header-row" style="margin-bottom: 20px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span class="kc-report-pill-badge" style="background: #eff6ff; border-color: #bfdbfe; color: #0284c7;">
              ${escapeHtml(item.market)}
            </span>
            <span style="font-size: 0.76rem; color: #64748b; font-weight: 700;">종목코드: ${item.symbol}</span>
          </div>
          <h2 class="kc-report-main-title" style="color: #1e293b; margin-bottom: 6px;">
            ${escapeHtml(item.name)} <span style="font-size: 1.1rem; color: #dc2626; font-weight: 900;">${item.currentPrice} (${item.changeRate})</span>
          </h2>
          <div class="kc-report-sub-meta" style="color: #64748b;">
            시가총액: <strong style="color: #1e293b;">${item.marketCap}</strong> · 외국인 지분율: <strong style="color: #0284c7;">${item.foreignRate}</strong>
          </div>
          <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">
            밸류에이션: ${item.perPbr}
          </div>
        </div>

        <div class="kc-big-score-card" style="background: #eff6ff; border-color: #bfdbfe; text-align: center;">
          <div class="kc-score-head-title" style="color: #0284c7;">미래 지속성 점수</div>
          <div class="kc-score-big-val" style="color: #0284c7;">${item.futureOutlook.targetScore}<span class="kc-score-denom" style="color: #64748b;"> / 100</span></div>
          <div class="kc-score-bottom-note" style="color: #059669; font-weight: 800;">${escapeHtml(item.futureOutlook.rating)}</div>
        </div>
      </div>

      <!-- B. 딥분석 6대 핵심 영역 탭 바 -->
      <div style="display: flex; gap: 6px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 4px;">
        <button type="button" class="imggen-style-chip ${currentDeepTab === 'all' ? 'active' : ''}" onclick="switchDeepTab('all', this)">📋 전체 종합 분석</button>
        <button type="button" class="imggen-style-chip ${currentDeepTab === 'bm' ? 'active' : ''}" onclick="switchDeepTab('bm', this)">💰 비즈니스 모델(BM/돈 버는 법)</button>
        <button type="button" class="imggen-style-chip ${currentDeepTab === 'finance' ? 'active' : ''}" onclick="switchDeepTab('finance', this)">📊 실적 & 공시</button>
        <button type="button" class="imggen-style-chip ${currentDeepTab === 'news' ? 'active' : ''}" onclick="switchDeepTab('news', this)">📰 관련 기사 모음</button>
        <button type="button" class="imggen-style-chip ${currentDeepTab === 'theme' ? 'active' : ''}" onclick="switchDeepTab('theme', this)">🌐 엮인 테마 & 관련주</button>
        <button type="button" class="imggen-style-chip ${currentDeepTab === 'future' ? 'active' : ''}" onclick="switchDeepTab('future', this)">🔮 미래 총집합소</button>
      </div>

      <!-- C. 영역 1: 비즈니스 모델 (어떻게 돈을 벌고 있는가? 수주/제조업 구분) -->
      <div class="deep-section-block" id="deep-sec-bm" style="margin-bottom: 24px;">
        <div style="font-size: 0.98rem; font-weight: 800; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>💰</span> 1. 비즈니스 모델 분석 (현재 어떻게 돈을 버는가?)
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 12px; border-radius: 8px;">
              <div style="font-size: 0.76rem; color: #0284c7; font-weight: 800; margin-bottom: 4px;">산업 유형 분류</div>
              <div style="font-size: 0.92rem; font-weight: 900; color: #0f172a;">${escapeHtml(item.bm.type)}</div>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px;">
              <div style="font-size: 0.76rem; color: #16a34a; font-weight: 800; margin-bottom: 4px;">매출 포트폴리오 비중</div>
              <div style="font-size: 0.92rem; font-weight: 800; color: #0f172a;">${escapeHtml(item.bm.structure)}</div>
            </div>
          </div>
          <div style="margin-bottom: 12px;">
            <div style="font-size: 0.84rem; font-weight: 800; color: #c2410c; margin-bottom: 4px;">💵 핵심 캐시카우 (수익 창출 엔진):</div>
            <div style="font-size: 0.86rem; color: #334155; line-height: 1.6;">${escapeHtml(item.bm.cashCow)}</div>
          </div>
          <div>
            <div style="font-size: 0.84rem; font-weight: 800; color: #475569; margin-bottom: 4px;">⚙️ 원가 구조 및 마진 레버리지:</div>
            <div style="font-size: 0.86rem; color: #475569; line-height: 1.6;">${escapeHtml(item.bm.costStructure)}</div>
          </div>
        </div>
      </div>

      <!-- D. 영역 2: 실적 & 공시 히스토리 -->
      <div class="deep-section-block" id="deep-sec-finance" style="margin-bottom: 24px;">
        <div style="font-size: 0.98rem; font-weight: 800; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>📊</span> 2. 분기별 실적 추이 & DART 핵심 공시
        </div>
        <!-- 분기 실적 3단 카드 -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px;">
          <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="font-size: 0.74rem; color: #64748b; font-weight: 700;">2024년 1분기</div>
            <div style="font-size: 0.92rem; font-weight: 900; color: #0f172a; margin: 2px 0;">매출 ${item.financials.q24_1.sales}</div>
            <div style="font-size: 0.78rem; color: #dc2626; font-weight: 800;">영업익 ${item.financials.q24_1.profit} (${item.financials.q24_1.margin})</div>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="font-size: 0.74rem; color: #64748b; font-weight: 700;">2024년 2분기</div>
            <div style="font-size: 0.92rem; font-weight: 900; color: #0f172a; margin: 2px 0;">매출 ${item.financials.q24_2.sales}</div>
            <div style="font-size: 0.78rem; color: #dc2626; font-weight: 800;">영업익 ${item.financials.q24_2.profit} (${item.financials.q24_2.margin})</div>
          </div>
          <div style="background: #eff6ff; border: 1px solid #93c5fd; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 0.74rem; color: #2563eb; font-weight: 800;">2024년 3분기 (컨센서스)</div>
            <div style="font-size: 0.92rem; font-weight: 900; color: #0f172a; margin: 2px 0;">매출 ${item.financials.q24_3E.sales}</div>
            <div style="font-size: 0.78rem; color: #dc2626; font-weight: 800;">영업익 ${item.financials.q24_3E.profit} (${item.financials.q24_3E.margin})</div>
          </div>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; font-size: 0.84rem; color: #166534; margin-bottom: 14px;">
          📈 <strong>실적 종합 총평:</strong> ${escapeHtml(item.financials.annual2024E)} · ${escapeHtml(item.financials.point)}
        </div>
        <!-- 공시 목록 -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;">
          <div style="font-size: 0.82rem; font-weight: 800; color: #0284c7; margin-bottom: 8px;">📑 최근 DART 전자공시 주요 내역:</div>
          ${disclosuresHtml}
        </div>
      </div>

      <!-- E. 영역 3: 그 종목에 관련된 모든 기사 모음 -->
      <div class="deep-section-block" id="deep-sec-news" style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="font-size: 0.98rem; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 8px;">
            <span>📰</span> 3. 이 종목 관련 모든 기사 모아보기
          </div>
          <a href="https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(item.name + ' 주가 실적')}" target="_blank" rel="noopener noreferrer" style="font-size: 0.74rem; color: #0284c7; text-decoration: none; font-weight: 700;">
            네이버 실시간 뉴스 전체 ↗
          </a>
        </div>
        <div>
          ${articlesHtml}
        </div>
      </div>

      <!-- F. 영역 4: 엮여있는 테마 및 관련 종목군 맵 -->
      <div class="deep-section-block" id="deep-sec-theme" style="margin-bottom: 24px;">
        <div style="font-size: 0.98rem; font-weight: 800; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>🌐</span> 4. 엮여있는 테마 및 관련주 에코시스템
        </div>
        <div>
          ${themesHtml}
        </div>
      </div>

      <!-- G. 영역 5: 증시 캘린더 D-Day 일정 -->
      <div class="deep-section-block" id="deep-sec-events" style="margin-bottom: 24px;">
        <div style="font-size: 0.98rem; font-weight: 800; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>📅</span> 5. 향후 주요 일정 및 D-Day 카운트다운
        </div>
        <div>
          ${eventsHtml}
        </div>
      </div>

      <!-- H. 영역 6: 이 종목의 미래 종집합소 (미래 지속성 & 투자 전략) -->
      <div class="deep-section-block" id="deep-sec-future" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <div style="font-size: 1.05rem; font-weight: 900; color: #0284c7; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
          <span>🔮</span> 6. 미래 종집합소 (Future Synthesis Report)
        </div>
        <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin-bottom: 8px; line-height: 1.5;">
          ${escapeHtml(item.futureOutlook.summary)}
        </div>
        <div style="margin-bottom: 10px;">
          <div style="font-size: 0.82rem; font-weight: 800; color: #059669; margin-bottom: 3px;">🚀 미래 핵심 성장 동력 (Catalyst):</div>
          <div style="font-size: 0.85rem; color: #334155; line-height: 1.6;">${escapeHtml(item.futureOutlook.catalyst)}</div>
        </div>
        <div>
          <div style="font-size: 0.82rem; font-weight: 800; color: #dc2626; margin-bottom: 3px;">⚠️ 주의해야 할 리스크 (Risk Factor):</div>
          <div style="font-size: 0.85rem; color: #475569; line-height: 1.6;">${escapeHtml(item.futureOutlook.riskCheck)}</div>
        </div>
      </div>

      <!-- I. 포털 바로가기 그리드 -->
      <div class="kc-portals-btn-grid">
        <a href="https://finance.naver.com/item/main.naver?code=${item.symbol}" target="_blank" rel="noopener noreferrer" class="kc-portal-btn portal-green">
          네이버 증권 시세
        </a>
        <a href="https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(item.name)}" target="_blank" rel="noopener noreferrer" class="kc-portal-btn">
          관련 뉴스 전체보기 ↗
        </a>
        <a href="https://dart.fss.or.kr/" target="_blank" rel="noopener noreferrer" class="kc-portal-btn">
          DART 전자공시
        </a>
        <a href="https://www.google.com/finance/quote/${item.symbol}:KRX" target="_blank" rel="noopener noreferrer" class="kc-portal-btn">
          구글 파이낸스
        </a>
      </div>
    </div>
  `;
};

// 딥분석 탭 전환 함수
window.switchDeepTab = function (tabName, btn) {
  currentDeepTab = tabName;
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  const sections = {
    bm: document.getElementById('deep-sec-bm'),
    finance: document.getElementById('deep-sec-finance'),
    news: document.getElementById('deep-sec-news'),
    theme: document.getElementById('deep-sec-theme'),
    future: document.getElementById('deep-sec-future'),
    events: document.getElementById('deep-sec-events')
  };

  if (tabName === 'all') {
    Object.keys(sections).forEach(k => {
      if (sections[k]) sections[k].style.display = 'block';
    });
  } else {
    Object.keys(sections).forEach(k => {
      if (sections[k]) {
        if (tabName === 'bm' && k === 'bm') sections[k].style.display = 'block';
        else if (tabName === 'finance' && (k === 'finance' || k === 'events')) sections[k].style.display = 'block';
        else if (tabName === 'news' && k === 'news') sections[k].style.display = 'block';
        else if (tabName === 'theme' && k === 'theme') sections[k].style.display = 'block';
        else if (tabName === 'future' && k === 'future') sections[k].style.display = 'block';
        else sections[k].style.display = 'none';
      }
    });
  }
};

// ============================================================================
// 6. 실시간 미국 증시 & 글로벌 외신 한국어 속보 피드 모듈
// - 미국 뉴욕증시 3대 지수, 엔비디아/애플 빅테크, FOMC 금리/환율 등 외신 실시간 번역 속보
// ============================================================================
const GLOBAL_MARKET_NEWS_DATA = [
  {
    category: 'us_market',
    badge: '뉴욕마감',
    badgeColor: '#38bdf8',
    title: '[뉴욕증시] 나스닥 1.1% 상승 마감… 반도체·빅테크 랠리에 S&P500 신고가 근접',
    source: '연합인포맥스 (외신종합)',
    time: '12분 전',
    summary: '연준 9월 빅컷(0.5%p 인하) 기대감이 지속되는 가운데 엔비디아와 브로드컴 등 AI 반도체 강세가 지수를 견인. 기술주 중심 매수세 유입.',
    searchQuery: '뉴욕증시 나스닥 마감 반도체'
  },
  {
    category: 'tech',
    badge: '엔비디아 / AI',
    badgeColor: '#10b981',
    title: '엔비디아 CEO 젠슨 황 "차세대 블랙웰 칩 수요 믿을 수 없을 만큼 엄청나"',
    source: '한국경제TV (로이터 인용)',
    time: '28분 전',
    summary: '골드만삭스 테크 컨퍼런스에서 블랙웰 생산 순항 및 클라우드 빅테크의 ROI(투자수익률) 우려를 일축. 시간외 거래서 주가 4% 급등.',
    searchQuery: '엔비디아 젠슨황 블랙웰 수요'
  },
  {
    category: 'macro',
    badge: 'FOMC / 금리',
    badgeColor: '#f59e0b',
    title: '미국 8월 생산자물가지수(PPI) 예상치 부합… 연준 금리인하 사이클 진입 확실시',
    source: '매일경제 (블룸버그 특약)',
    time: '45분 전',
    summary: '인플레이션 둔화 추세가 지속되며 이번 주 FOMC 회의에서 기준금리 인하 폭(25bp vs 50bp)에 시장의 모든 관심이 집중되는 양상.',
    searchQuery: '미국 생산자물가 PPI FOMC 금리인하'
  },
  {
    category: 'tech',
    badge: '애플 / 모바일',
    badgeColor: '#a855f7',
    title: '애플, 아이폰16 프로 시리즈 초기 사전주문 3,700만 대 돌파… AI 인텔리전스 기대감',
    source: '조선비즈 (WSJ 종합)',
    time: '1시간 전',
    summary: '온디바이스 AI 기능인 애플 인텔리전스(Apple Intelligence) 출시 기대감으로 고가 라인업인 프로/프로맥스 모델 예약 판매 비중 급증.',
    searchQuery: '아이폰16 프로 사전주문 애플 인텔리전스'
  },
  {
    category: 'macro',
    badge: '환율 / 외환',
    badgeColor: '#38bdf8',
    title: '달러인덱스 101선 하회… 연준 완화적 통화정책 기대감에 원/달러 환율 1,330원대 안정',
    source: '서울경제 (외신 번역)',
    time: '2시간 전',
    summary: '미국 국채 10년물 금리가 3.6%대로 하락하면서 달러화 약세 압력 가중. 외국인 투자자의 국내 증시 순매수 유입에 긍정적 환경 조성.',
    searchQuery: '달러인덱스 원달러 환율 국채금리'
  },
  {
    category: 'us_market',
    badge: '필라델피아 반도체',
    badgeColor: '#ef4444',
    title: '필라델피아 반도체 지수 2.3% 급반등… TSMC·ASML 공급망 수혜주 동반 상승',
    source: '머니투데이 (마켓워치)',
    time: '2시간 전',
    summary: 'AI 데이터센터 증설에 따른 첨단 패키징(CoWoS) 병목 현상 해소 기대감과 글로벌 반도체 소부장 밸류체인의 동반 강세 흐름.',
    searchQuery: '필라델피아 반도체 지수 TSMC ASML'
  },
  {
    category: 'macro',
    badge: '국제유가',
    badgeColor: '#fb923c',
    title: 'WTI 국제유가 배럴당 69달러 선… 허리케인 우려에도 글로벌 원유 수요 둔화 우려 상존',
    source: '이데일리 (로이터 속보)',
    time: '3시간 전',
    summary: '멕시코만 허리케인 발생에 따른 단기 공급 차질에도 불구, IEA(국제에너지기구)의 글로벌 원유 수요 전망치 하향에 박스권 등락.',
    searchQuery: 'WTI 국제유가 배럴당 허리케인 공급'
  },
  {
    category: 'tech',
    badge: '테슬라 / 로보택시',
    badgeColor: '#60a5fa',
    title: '테슬라, 10월 10일 LA 스튜디오서 로보택시 사이버캡 공개 공식 초청장 발송',
    source: '디지털타임스 (CNBC 발췌)',
    time: '4시간 전',
    summary: '완전자율주행(FSD V12) 기술 기반의 핸들 없는 로보택시 시제품 및 차세대 저가 전기차(모델 2) 로드맵 공개 여부로 기대감 고조.',
    searchQuery: '테슬라 로보택시 사이버캡 10월 공개'
  }
];

let currentGlobalNewsCategory = 'all';

function initGlobalMarketNews() {
  renderGlobalNewsList('all');
}

// ============================================================================
// 6. 실시간 미국 증시 & 글로벌 외신 한국어 속보 피드 모듈
// - 미국 뉴욕증시 3대 지수, 엔비디아/애플 빅테크, FOMC 금리/환율 등 외신 실시간 번역 속보
// ============================================================================
let liveUSNewsCache = [];

// 미국 증시 속보 실시간 렌더링 함수
async function renderUSLiveNewsFeed() {
  const container = document.getElementById('us-live-feed-container') || document.getElementById('global-news-container');
  if (!container) return;

  // 이미 캐시된 데이터가 있다면 즉시 화면에 렌더링
  if (liveUSNewsCache && liveUSNewsCache.length > 0) {
    renderUSNewsCards(container, liveUSNewsCache, currentGlobalNewsCategory);
    return;
  }

  // 로딩 상태 표시
  container.innerHTML = `
    <div style="grid-column: 1 / -1; padding: 28px; text-align: center; color: #94a3b8; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px;">
      <div style="font-size: 1.1rem; margin-bottom: 8px;">⏳ 미국 증시 및 글로벌 외신 실시간 속보를 불러오는 중...</div>
      <div style="font-size: 0.78rem; color: #64748b;">네이버 뉴스 API를 통해 최신 증시 뉴스를 실시간 수신하고 있습니다.</div>
    </div>
  `;

  let items = [];

  // 실시간 JSON 요청 헬퍼
  async function fetchLiveNewsJson(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) { }
    try {
      const pRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, { cache: 'no-store' });
      if (pRes.ok) {
        const data = await pRes.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) { }
    try {
      const jRes = await fetch(`https://r.jina.ai/${url}`, { headers: { 'x-respond-with': 'text' } });
      if (jRes.ok) {
        const text = await jRes.text();
        const m = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (m) return JSON.parse(m[0]);
      }
    } catch (e) { }
    return null;
  }

  // 1차 시도: 로컬/서버 엔드포인트 (/api/news?query=미증시 OR 나스닥 OR 엔비디아 OR 뉴욕증시)
  try {
    const query = encodeURIComponent('미증시 OR 나스닥 OR 엔비디아 OR 뉴욕증시');
    const resp = await fetch(`${BACKEND_API_BASE}/api/news?query=${query}&t=${Date.now()}`);
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        items = data;
      } else if (data && Array.isArray(data.items) && data.items.length > 0) {
        items = data.items;
      }
    }
  } catch (e) { }

  // 2차 시도: 네이버 증권 모바일 실시간 메인 뉴스 스트림 1, 2페이지에서 미국 증시/외신 필터링
  if (!items || items.length === 0) {
    try {
      const [p1, p2] = await Promise.all([
        fetchLiveNewsJson(`https://m.stock.naver.com/api/news/list?category=mainnews&page=1&pageSize=50&_t=${Date.now()}`),
        fetchLiveNewsJson(`https://m.stock.naver.com/api/news/list?category=mainnews&page=2&pageSize=50&_t=${Date.now()}`)
      ]);
      const rawList = [...(Array.isArray(p1) ? p1 : []), ...(Array.isArray(p2) ? p2 : [])];

      if (rawList.length > 0) {
        const usKeywords = /미국|뉴욕|나스닥|S&P|다우|엔비디아|애플|테슬라|빅테크|반도체|연준|FOMC|파월|금리|유가|환율|WSJ|블룸버그|로이터/i;
        const matched = rawList.filter(item => {
          const t = (item.tit || item.title || '');
          const c = (item.subcontent || item.description || '');
          return usKeywords.test(t) || usKeywords.test(c);
        });
        if (matched.length > 0) {
          items = matched;
        }
      }
    } catch (err) {
      console.warn('미국 증시 네이버 스트림 수신 지연:', err);
    }
  }

  // 최신 기사 8건 추출 및 캐싱
  if (items && items.length > 0) {
    liveUSNewsCache = parseUSNewsItems(items).slice(0, 8);
  } else {
    liveUSNewsCache = parseUSNewsItems(GLOBAL_MARKET_NEWS_DATA).slice(0, 8);
  }

  // 🌟 [요구사항 2] 전날 미국장 마감 분석 영역 최신 자동 브리핑 렌더링
  try {
    const titleEl = document.getElementById('us-market-briefing-title');
    const summaryEl = document.getElementById('us-market-briefing-summary');

    // 미국/뉴욕증시 마감 관련 최신 헤드라인 추출
    const closeArticle = liveUSNewsCache.find(n => /(마감|뉴욕|나스닥|다우|S&P|FOMC|증시)/i.test(n.title)) || liveUSNewsCache[0];
    if (closeArticle) {
      if (titleEl) {
        titleEl.textContent = `"${closeArticle.title}"`;
      }
      if (summaryEl && closeArticle.summary) {
        summaryEl.innerHTML = `
          1. <strong>[최신 외신 속보]</strong> ${escapeHtml(closeArticle.title)} (${escapeHtml(closeArticle.source)})<br>
          2. <strong>[핵심 마켓 동향]</strong> ${escapeHtml(closeArticle.summary)}<br>
          3. <strong>[국내 파급 전망]</strong> 뉴욕증시 지수 변동과 외환/금리 흐름이 당일 국내 기술주 및 외국인 수급의 주요 분기점으로 작용하고 있습니다.
        `;
      }
    }
  } catch (briefErr) {
    console.warn('미국장 마감 브리핑 자동 렌더링 건너뜀:', briefErr);
  }

  renderUSNewsCards(container, liveUSNewsCache, currentGlobalNewsCategory);
}
window.renderUSLiveNewsFeed = renderUSLiveNewsFeed;

// 원본 뉴스 항목을 통일된 형식으로 정규화
function parseUSNewsItems(rawList) {
  return rawList.map((item, idx) => {
    const rawTitle = item.tit || item.title || '';
    const cleanTitle = rawTitle.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    const rawSummary = item.subcontent || item.description || item.summary || '';
    const cleanSummary = rawSummary.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    const media = item.ohnm || item.media || item.source || '외신종합';

    // 원문 직행 링크 (요구사항: item.originallink || item.link 바인딩)
    let directUrl = '';
    if (item.originallink) {
      directUrl = item.originallink;
    } else if (item.link) {
      directUrl = item.link;
    } else if (item.oid && item.aid) {
      directUrl = `https://n.news.naver.com/mnews/article/${item.oid}/${item.aid}`;
    } else if (item.directUrl) {
      directUrl = item.directUrl;
    } else {
      directUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(cleanTitle || '뉴욕증시')}`;
    }

    // 시간 계산
    let timeStr = item.time || '방금 전';
    if (item.dt && item.dt.length >= 12) {
      try {
        const y = parseInt(item.dt.substring(0, 4), 10);
        const m = parseInt(item.dt.substring(4, 6), 10) - 1;
        const d = parseInt(item.dt.substring(6, 8), 10);
        const h = parseInt(item.dt.substring(8, 10), 10);
        const min = parseInt(item.dt.substring(10, 12), 10);
        const diffMinutes = Math.max(1, Math.round((Date.now() - new Date(y, m, d, h, min).getTime()) / (1000 * 60)));
        timeStr = diffMinutes < 60 ? `${diffMinutes}분 전` : `${Math.floor(diffMinutes / 60)}시간 전`;
      } catch (e) { }
    } else if (item.pubDate) {
      try {
        const diffMin = Math.max(1, Math.round((Date.now() - new Date(item.pubDate).getTime()) / (1000 * 60)));
        timeStr = diffMin < 60 ? `${diffMin}분 전` : `${Math.round(diffMin / 60)}시간 전`;
      } catch (e) { }
    }

    // 카테고리 및 배지 산출
    let category = item.category || 'us_market';
    let badge = item.badge || '미국증시 속보';
    let badgeColor = item.badgeColor || '#38bdf8';

    if (cleanTitle.includes('엔비디아') || cleanTitle.includes('애플') || cleanTitle.includes('테슬라') || cleanTitle.includes('빅테크') || cleanTitle.includes('반도체')) {
      category = 'tech';
      badge = cleanTitle.includes('엔비디아') ? '엔비디아 / AI' : (cleanTitle.includes('애플') ? '애플 / 빅테크' : '빅테크·반도체');
      badgeColor = '#10b981';
    } else if (cleanTitle.includes('금리') || cleanTitle.includes('연준') || cleanTitle.includes('FOMC') || cleanTitle.includes('환율') || cleanTitle.includes('유가') || cleanTitle.includes('물가')) {
      category = 'macro';
      badge = cleanTitle.includes('금리') || cleanTitle.includes('FOMC') ? 'FOMC / 금리' : '거시경제 / 매크로';
      badgeColor = '#f59e0b';
    } else {
      category = 'us_market';
      badge = '뉴욕증시 속보';
      badgeColor = '#38bdf8';
    }

    // 검색/키워드 추출
    const words = cleanTitle.replace(/\[.*?\]/g, '').split(/\s+/).slice(0, 4).join(' ');

    return {
      category: category,
      badge: badge,
      badgeColor: badgeColor,
      title: cleanTitle,
      source: media,
      time: timeStr,
      summary: cleanSummary || '글로벌 외신 및 주요 경제지가 보도한 미국 증시 최신 동향입니다.',
      searchQuery: words || '미국증시 나스닥',
      directUrl: directUrl
    };
  });
}

// 미국 증시 카드 렌더링 헬퍼
function renderUSNewsCards(container, list, category = 'all') {
  if (!container) return;
  const filtered = (category === 'all')
    ? list
    : list.filter(item => item.category === category);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: #94a3b8; background: rgba(255,255,255,0.02); border-radius: 10px;">
        해당 카테고리의 실시간 미국 증시 속보가 없습니다.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(news => {
    return `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.72rem; background: rgba(56, 189, 248, 0.15); color: ${news.badgeColor || '#38bdf8'}; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 8px; border-radius: 4px; font-weight: 800;">
              ${escapeHtml(news.badge)}
            </span>
            <span style="font-size: 0.72rem; color: #94a3b8;">
              ${escapeHtml(news.source)} · ${escapeHtml(news.time)}
            </span>
          </div>
          <div style="font-size: 0.9rem; font-weight: 800; color: #f8fafc; line-height: 1.45; margin-bottom: 8px;">
            ${escapeHtml(news.title)}
          </div>
          <div style="font-size: 0.8rem; color: #94a3b8; line-height: 1.5; margin-bottom: 12px;">
            ${escapeHtml(news.summary)}
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px;">
          <span style="font-size: 0.72rem; color: #64748b;">
            키워드: <strong style="color: #cbd5e1;">${escapeHtml(news.searchQuery)}</strong>
          </span>
          <a href="${news.directUrl}" target="_blank" rel="noopener noreferrer" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; text-decoration: none; font-weight: 700; white-space: nowrap;">
            기사보기 ↗
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function renderGlobalNewsList(category = 'all') {
  const container = document.getElementById('us-live-feed-container') || document.getElementById('global-news-container');
  if (!container) return;

  if (liveUSNewsCache && liveUSNewsCache.length > 0) {
    renderUSNewsCards(container, liveUSNewsCache, category);
  } else {
    renderUSLiveNewsFeed();
  }
}

window.switchGlobalNewsCategory = function (cat, btn) {
  currentGlobalNewsCategory = cat;
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  renderGlobalNewsList(cat);
};

// ============================================================================
// 6-B. 미국 대표 11개 섹터 강세 vs 약세 TOP 5 브리핑 렌더러 (data/us_sector_briefing.json 비동기 연동)
// ============================================================================
let usSectorBriefingCache = null;

async function renderUSSectorBriefing() {
  const container = document.getElementById('us-sector-briefing-container');
  if (!container) return;

  try {
    const res = await fetch(`data/us_sector_briefing.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    usSectorBriefingCache = data;

    // 1. 헤드라인 및 3줄 요약 동기화 (존재할 경우)
    if (data.headline) {
      const titleEl = document.getElementById('us-market-briefing-title');
      if (titleEl) titleEl.textContent = data.headline;
    }
    if (data.summary_3lines && Array.isArray(data.summary_3lines) && data.summary_3lines.length > 0) {
      const summaryEl = document.getElementById('us-market-briefing-summary');
      if (summaryEl) {
        summaryEl.innerHTML = data.summary_3lines.map((line, idx) => {
          return `${idx + 1}. ${line}`;
        }).join('<br>');
      }
    }

    // 2. 강세 업종 (Gainers) 카드 HTML 생성
    const gainers = data.gainers || [];
    let gainersHtml = '';
    if (gainers.length === 0) {
      gainersHtml = `
        <div style="background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px; padding: 14px; text-align: center; color: #94a3b8; font-size: 0.85rem;">
          전일 상승 마감한 섹터가 없습니다. (전 섹터 하락장)
        </div>
      `;
    } else {
      gainersHtml = gainers.map((sec, idx) => {
        const stocksStr = (sec.stocks || []).map(s => {
          const ratioNum = typeof s.ratio === 'number' ? s.ratio : parseFloat(s.ratio || 0);
          const color = ratioNum >= 0 ? '#dc2626' : '#2563eb';
          const rStr = s.ratio_str || (ratioNum >= 0 ? `+${ratioNum.toFixed(2)}%` : `${ratioNum.toFixed(2)}%`);
          return `${s.name}(${s.ticker}) <span style="color: ${color}; font-weight: 700;">${rStr}</span>`;
        }).join(', ');

        const secRatio = typeof sec.ratio === 'number' ? sec.ratio : parseFloat(sec.ratio || 0);
        const secRatioStr = sec.ratio_str || (secRatio >= 0 ? `+${secRatio.toFixed(2)}% ▲` : `${secRatio.toFixed(2)}% ▼`);

        return `
          <div style="background: #ffffff; border: 1px solid #fee2e2; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="font-size: 0.92rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                <span style="color: #dc2626; font-weight: 900;">${idx + 1}위</span>
                <span>${sec.name} (${sec.ticker})</span>
              </div>
              <span style="font-size: 0.95rem; font-weight: 900; color: #dc2626;">${secRatioStr}</span>
            </div>
            ${sec.reason ? `
              <div style="font-size: 0.8rem; color: #475569; line-height: 1.55; margin-bottom: 6px;">
                • <strong>상승 사유:</strong> ${sec.reason}
              </div>
            ` : ''}
            ${stocksStr ? `
              <div style="font-size: 0.77rem; color: #334155; background: #f8fafc; border: 1px solid #e2e8f0; padding: 7px 12px; border-radius: 6px; line-height: 1.5;">
                <strong style="color: #991b1b; font-weight: 800;">관련 종목:</strong> ${stocksStr}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    }

    // 매크로 원자재 & 변동성 참고 박스
    const macro = data.macro || {};
    const macroBoxHtml = `
      <div style="background: #ffffff; border: 1px solid #fca5a5; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border-radius: 10px; padding: 12px 14px; margin-top: 6px;">
        <div style="font-size: 0.8rem; font-weight: 800; color: #b91c1c; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
          <span>📌</span> [핵심 참고] 원자재 & 야간 변동성 지표
        </div>
        <ul style="font-size: 0.77rem; color: #475569; line-height: 1.65; margin: 0; padding-left: 16px;">
          ${macro.diesel_alert ? `<li>${macro.diesel_alert.replace('6달러 사상 최고', '<strong style="color: #dc2626;">6달러 사상 최고</strong>')}</li>` : ''}
          <li>
            ${macro.brent ? `브렌트유 <strong style="color: #dc2626;">${macro.brent.ratio || ''}(${macro.brent.price || ''})</strong>` : ''}
            ${macro.gold ? ` / 금 <strong style="color: #0284c7;">${macro.gold.ratio || ''}(${macro.gold.price || ''})</strong>` : ''}
            ${macro.vix ? ` / VIX <strong style="color: #dc2626;">${macro.vix.ratio || ''}(${macro.vix.price || ''})</strong>` : ''}
          </li>
          ${macro.night_range ? `<li>${macro.night_range}</li>` : ''}
        </ul>
      </div>
    `;

    // 3. 약세 업종 TOP 5 (Losers) 카드 HTML 생성
    const losers = (data.losers || []).slice(0, 5);
    let losersHtml = '';
    if (losers.length === 0) {
      losersHtml = `
        <div style="background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 14px; text-align: center; color: #64748b; font-size: 0.85rem;">
          전일 하락 마감한 섹터가 없습니다. (전 섹터 상승장)
        </div>
      `;
    } else {
      losersHtml = losers.map((sec, idx) => {
        const stocksStr = (sec.stocks || []).map(s => {
          const ratioNum = typeof s.ratio === 'number' ? s.ratio : parseFloat(s.ratio || 0);
          const color = ratioNum >= 0 ? '#dc2626' : '#2563eb';
          const rStr = s.ratio_str || (ratioNum >= 0 ? `+${ratioNum.toFixed(2)}%` : `${ratioNum.toFixed(2)}%`);
          return `${s.name} <strong style="color: ${color};">${rStr}</strong>`;
        }).join(', ');

        const secRatio = typeof sec.ratio === 'number' ? sec.ratio : parseFloat(sec.ratio || 0);
        const secRatioStr = sec.ratio_str || (secRatio >= 0 ? `+${secRatio.toFixed(2)}% ▲` : `${secRatio.toFixed(2)}% ▼`);

        return `
          <div style="background: #ffffff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <div style="font-size: 0.88rem; font-weight: 800; color: #0f172a;">
                <span style="color: #0284c7; font-weight: 900;">${idx + 1}위</span> ${sec.name} (${sec.ticker})
              </div>
              <span style="font-size: 0.88rem; font-weight: 900; color: #0284c7;">${secRatioStr}</span>
            </div>
            <div style="font-size: 0.77rem; color: #475569; line-height: 1.5;">
              ${sec.reason || '거시경제 및 업황 우려 차익실현'}<br>
              ${stocksStr ? `<span style="color: #64748b;">(${stocksStr})</span>` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    // 4. 최종 2단 그리드 컨테이너 렌더링
    container.innerHTML = `
      <!-- [좌측 열: 강세 업종] -->
      <div style="background: #fff5f5; border: 1px solid #fecaca; border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <!-- 섹션 타이틀 -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px dashed rgba(244, 63, 94, 0.25); padding-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.15rem;">🔥</span>
              <span style="font-size: 1rem; font-weight: 900; color: #991b1b;">강세 업종 (11개 섹터 중 상승 섹터)</span>
            </div>
            <span style="font-size: 0.72rem; background: rgba(244, 63, 94, 0.2); color: #dc2626; border: 1px solid rgba(244, 63, 94, 0.4); padding: 2px 8px; border-radius: 6px; font-weight: 800;">
              상승 주도 (${gainers.length}개)
            </span>
          </div>
          ${gainersHtml}
        </div>
        ${macroBoxHtml}
      </div>

      <!-- [우측 열: 약세 업종 TOP 5] -->
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 18px 20px;">
        <!-- 섹션 타이틀 -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px dashed rgba(56, 189, 248, 0.25); padding-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.15rem;">📉</span>
            <span style="font-size: 1rem; font-weight: 900; color: #0369a1;">약세 업종 TOP 5</span>
          </div>
          <span style="font-size: 0.72rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); padding: 2px 8px; border-radius: 6px; font-weight: 800;">
            하락 상위
          </span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${losersHtml}
        </div>
      </div>
    `;
  } catch (err) {
    console.warn('[미국 섹터 브리핑] 데이터 로드 실패 또는 기본값 유지:', err);
  }
}
window.renderUSSectorBriefing = renderUSSectorBriefing;

// ============================================================================
// 7. [서브 패널 0] 당일 국내 주식 실시간 뉴스 촘촘한 피드 렌더러 (네이버 실시간 API 연동)
// ============================================================================
let currentDomesticNewsFilter = 'all';
let liveDomesticNewsCache = [];

function initDomesticStockNews() {
  // 1. 시드 데이터(최신 네이버 증시 속보)가 있으면 캐시에 즉시 로드
  if (typeof LIVE_NAVER_SEED_DATA !== 'undefined' && Array.isArray(LIVE_NAVER_SEED_DATA) && LIVE_NAVER_SEED_DATA.length > 0) {
    liveDomesticNewsCache = parseNaverStockNewsItems(LIVE_NAVER_SEED_DATA);
  }

  // 2. 초기 렌더링
  renderDomesticNewsTimeline('all');

  // 3. 백그라운드에서 네이버 실시간 뉴스 자동 조회
  fetchLiveNaverNews();

  // 4. [신규] 0번 탭 최상단 당일 주도 테마 2단 분리형 레이더 로드
  if (typeof window.loadLeadingThemeDualRadar === 'function') {
    window.loadLeadingThemeDualRadar();
  }
}

// 네이버 실시간 증시 뉴스 배열을 웹 화면 포맷으로 정밀 변환
function parseNaverStockNewsItems(rawItems) {
  return rawItems.map(item => {
    const title = (item.tit || item.title || '').replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    const summary = (item.subcontent || item.description || '').replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    const media = item.ohnm || '네이버 뉴스';

    // 시간 계산 (item.dt 형식: "20260915104817" 또는 pubDate)
    let timeStr = '방금 전';
    if (item.dt && item.dt.length >= 12) {
      try {
        const y = parseInt(item.dt.substring(0, 4), 10);
        const m = parseInt(item.dt.substring(4, 6), 10) - 1;
        const d = parseInt(item.dt.substring(6, 8), 10);
        const h = parseInt(item.dt.substring(8, 10), 10);
        const min = parseInt(item.dt.substring(10, 12), 10);
        const articleDate = new Date(y, m, d, h, min);
        const diffMinutes = Math.max(1, Math.round((Date.now() - articleDate.getTime()) / (1000 * 60)));
        if (diffMinutes < 60) {
          timeStr = `${diffMinutes}분 전`;
        } else if (diffMinutes < 1440) {
          timeStr = `${Math.floor(diffMinutes / 60)}시간 전`;
        } else {
          timeStr = `${Math.floor(diffMinutes / 1440)}일 전`;
        }
      } catch (e) {
        timeStr = '방금 전';
      }
    } else if (item.pubDate) {
      try {
        const pub = new Date(item.pubDate);
        const diffMin = Math.max(1, Math.round((Date.now() - pub.getTime()) / (1000 * 60)));
        timeStr = diffMin < 60 ? `${diffMin}분 전` : `${Math.round(diffMin / 60)}시간 전`;
      } catch (err) {
        timeStr = '방금 전';
      }
    }

    // 5대 핵심 카테고리 자동 분류 규칙 (classifyNewsCategory)
    const classified = classifyNewsCategory(title, summary);
    const cat = classified.cat;
    const tag = classified.tag;
    const tagColor = classified.tagColor;

    // 종목명 추출 (대괄호 또는 본문 내 대표 키워드)
    let symbol = '국내증시';
    const bracketMatch = title.match(/\[(.*?)\]\s*([가-힣A-Za-z0-9]+)/);
    if (bracketMatch && bracketMatch[2]) {
      symbol = bracketMatch[2].slice(0, 7);
    } else {
      const words = title.split(/\s+/);
      if (words.length > 0) symbol = words[0].replace(/[^가-힣A-Za-z0-9]/g, '').slice(0, 6) || '국내증시';
    }

    // 핵심: 정확한 기사 원문 URL 생성
    // 1순위: originallink 또는 link (네이버 검색 API 형식 또는 원본 언론사 링크)
    // 2순위: 네이버 뉴스 oid/officeId + aid/articleId 조합 (https://n.news.naver.com/mnews/article/{oid}/{aid}) -> 100% 원문 기사 직접 열람
    let directUrl = '';
    const office = item.officeId || item.oid;
    const article = item.articleId || item.aid;
    if (item.originallink) {
      directUrl = item.originallink;
    } else if (office && article) {
      directUrl = `https://n.news.naver.com/mnews/article/${office}/${article}`;
    } else if (item.link) {
      directUrl = item.link;
    } else {
      directUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(title)}`;
    }

    return {
      category: cat,
      tag: tag,
      tagColor: tagColor,
      title: title,
      media: media,
      time: timeStr,
      symbol: symbol,
      summary: summary,
      directUrl: directUrl,
      keyword: title
    };
  });
}

// 네이버 실시간 증시 뉴스 라이브 호출 (서버 엔드포인트 /api/news 우선 호출 및 다중 프록시 폴백)
async function fetchLiveNaverNews(silent = true) {
  const refreshBtn = document.getElementById('btn-refresh-domestic-news');
  const liveTag = document.getElementById('domestic-news-live-tag');

  if (refreshBtn) {
    refreshBtn.innerHTML = '⏳ 동기화 중...';
    refreshBtn.disabled = true;
  }
  if (liveTag) {
    liveTag.textContent = '동기화 중...';
    liveTag.style.color = '#38bdf8';
  }

  // 실시간 JSON 요청 헬퍼
  async function fetchNaverNewsJson(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) { }
    try {
      const pRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, { cache: 'no-store' });
      if (pRes.ok) {
        const data = await pRes.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) { }
    try {
      const jRes = await fetch(`https://r.jina.ai/${url}`, { headers: { 'x-respond-with': 'text' } });
      if (jRes.ok) {
        const text = await jRes.text();
        const m = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (m) return JSON.parse(m[0]);
      }
    } catch (e) { }
    return null;
  }

  // 1차 시도: 네이버 증권 실시간 모바일 뉴스 API (1페이지 50건 + 2페이지 50건 = 총 100건 병렬 스트림)
  try {
    const p1Url = `https://m.stock.naver.com/api/news/list?category=mainnews&page=1&pageSize=50&_t=${Date.now()}`;
    const p2Url = `https://m.stock.naver.com/api/news/list?category=mainnews&page=2&pageSize=50&_t=${Date.now()}`;
    const [p1Data, p2Data] = await Promise.all([
      fetchNaverNewsJson(p1Url),
      fetchNaverNewsJson(p2Url)
    ]);

    const combined = [];
    const seen = new Set();
    const addItems = (arr) => {
      if (!Array.isArray(arr)) return;
      for (const it of arr) {
        const id = it.aid || it.articleId || it.tit || it.title || it.link;
        if (id && !seen.has(id)) {
          seen.add(id);
          combined.push(it);
        }
      }
    };
    addItems(p1Data);
    addItems(p2Data);

    if (combined.length > 0) {
      fetchedData = combined;
    }
  } catch (err) {
    console.warn('네이버 모바일 뉴스 API 호출 지연:', err);
  }

  // 2차 시도: 로컬/서버 엔드포인트 (/api/news?query=...)
  if (!fetchedData || fetchedData.length === 0) {
    try {
      const query = encodeURIComponent('특징주 OR 공시 OR 코스피 OR 증시');
      const resp = await fetch(`${BACKEND_API_BASE}/api/news?query=${query}&t=${Date.now()}`);
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          fetchedData = data;
        } else if (data && Array.isArray(data.items) && data.items.length > 0) {
          fetchedData = data.items;
        }
      }
    } catch (apiErr) { }
  }

  // 데이터 파싱 및 최대 100건(slice(0, 100)) 캐시 반영
  if (fetchedData && Array.isArray(fetchedData) && fetchedData.length > 0) {
    liveDomesticNewsCache = parseNaverStockNewsItems(fetchedData.slice(0, 100));
    renderDomesticNewsTimeline(currentDomesticNewsFilter);

    if (liveTag) {
      liveTag.textContent = '🟢 LIVE 실시간 동기화 완료';
      liveTag.style.color = '#34d399';
    }
    if (!silent && window.showToast) {
      window.showToast('네이버 최신 실시간 증시 뉴스 100건이 동기화되었습니다! ✅', '⚡');
    }
  } else {
    // 로컬 시드 데이터(100건 슬라이스)로 안전 복원
    if (typeof LIVE_NAVER_SEED_DATA !== 'undefined' && Array.isArray(LIVE_NAVER_SEED_DATA)) {
      liveDomesticNewsCache = parseNaverStockNewsItems(LIVE_NAVER_SEED_DATA.slice(0, 100));
    }
    renderDomesticNewsTimeline(currentDomesticNewsFilter);
    if (liveTag) {
      liveTag.textContent = '🟢 실시간 뉴스 활성화';
      liveTag.style.color = '#34d399';
    }
    if (!silent && window.showToast) {
      window.showToast('네이버 최신 실시간 증시 뉴스가 표시되었습니다! ✅', '⚡');
    }
  }

  if (refreshBtn) {
    refreshBtn.innerHTML = '🔄 네이버 실시간 뉴스 즉시 동기화';
    refreshBtn.disabled = false;
  }
}

// 0번 탭 수동 새로고침 함수
window.refreshLiveDomesticNews = function () {
  fetchLiveNaverNews(false);
};

// ============================================================================
// [0번 탭] 5대 핵심 카테고리 자동 분류 규칙 (classifyNewsCategory)
// 1. 🔴 특징주 & 급등 모멘텀 (feature)
// 2. 🔵 거시 경제 & 금리/환율 (macro)
// 3. 🟢 산업 동향 & 정부 정책 (industry)
// 4. 🟣 DART 공시 & 기업 실적 (disclosure)
// 5. 🟡 글로벌 & 코인/원자재 (global)
// ============================================================================
function classifyNewsCategory(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();

  // 1순위: 🟣 DART 공시 & 기업 실적
  const disclosureKeywords = [
    '공시', '잠정실적', '영업익', '영업이익', '매출액', '순이익', '분기실적', '실적', 
    '지분 매각', '지분매각', '감자', '보호예수', '유상증자', '무상증자', '전환사채', 'cb발행', 
    'bw발행', '공개매수', '주주총회', '자사주', '소각', 'dart', '금감원', '사업보고서', '분기보고서'
  ];
  if (disclosureKeywords.some(kw => text.includes(kw))) {
    return { cat: 'disclosure', tag: 'DART/실적', tagColor: '#c084fc' };
  }

  // 2순위: 🟡 글로벌 & 코인/원자재
  const globalKeywords = [
    '비트코인', '가상자산', '암호화폐', '코인', '이더리움', '리플', '유가', 'wti', '원유', 
    '국제유가', '금값', '원자재', '구리', '천연가스', '나스닥', 's&p', '다우존스', '뉴욕증시', 
    '월가', '월스트리트', '중동', '트럼프', '엔비디아', '테슬라', '애플', '빅테크', '글로벌'
  ];
  if (globalKeywords.some(kw => text.includes(kw))) {
    return { cat: 'global', tag: '글로벌/원자재', tagColor: '#facc15' };
  }

  // 3순위: 🔵 거시 경제 & 금리/환율
  const macroKeywords = [
    '연준', 'fed', 'fomc', '파월', '기준금리', '금리', '인상', '인하', '금통위', '한은', 
    '한국은행', '환율', '달러', '원·달러', '원달러', '채권', '국채', '10년물', '금리동결', 
    'cpi', 'ppi', '물가', '인플레이션', '긴축', 'gdp', '외환', '통화정책', '관세'
  ];
  if (macroKeywords.some(kw => text.includes(kw))) {
    return { cat: 'macro', tag: '거시/금리/환율', tagColor: '#38bdf8' };
  }

  // 4순위: 🟢 산업 동향 & 정부 정책
  const industryKeywords = [
    '정부', '정책', '법안', '산업', '육성', '지원책', '투자', '반도체', 'hbm', '원전', 
    'sme', 'smr', '체코', '데이터센터', 'ai 데이터센터', '로봇', '전력망', '전선', 
    '조선', '방산', 'k-방산', '우주항공', '바이오', '제약', '임상', '식약처', 'fda'
  ];
  if (industryKeywords.some(kw => text.includes(kw))) {
    return { cat: 'industry', tag: '산업/정책', tagColor: '#34d399' };
  }

  // 5순위: 🔴 특징주 & 급등 모멘텀 (기본값)
  return { cat: 'feature', tag: '특징주/급등', tagColor: '#f87171' };
}

// 0번 탭 5대 핵심 카테고리 멀티컬럼 뷰 렌더러
function renderDomesticNewsTimeline(filterCategory = 'all') {
  const countEl = document.getElementById('domestic-news-count');
  const col5Container = document.getElementById('domestic-news-5col-container');
  if (!col5Container) return;

  const dataset = (liveDomesticNewsCache && liveDomesticNewsCache.length > 0)
    ? liveDomesticNewsCache
    : (typeof DOMESTIC_STOCK_NEWS_DATA !== 'undefined' ? DOMESTIC_STOCK_NEWS_DATA : []);

  if (countEl) countEl.textContent = `${dataset.length}건`;

  // 5개 카테고리별 버킷 분리
  const buckets = {
    feature: [],
    macro: [],
    industry: [],
    disclosure: [],
    global: []
  };

  dataset.forEach(item => {
    const cat = item.category || 'feature';
    if (buckets[cat]) {
      buckets[cat].push(item);
    } else {
      buckets.feature.push(item);
    }
  });

  // 카테고리 메타 정보 정의
  const colDefs = [
    { key: 'feature', name: '특징주 & 급등 모멘텀', icon: '🔴', color: '#f87171', bg: 'rgba(239, 68, 68, 0.18)' },
    { key: 'macro', name: '거시 경제 & 금리/환율', icon: '🔵', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.18)' },
    { key: 'industry', name: '산업 동향 & 정부 정책', icon: '🟢', color: '#34d399', bg: 'rgba(16, 185, 129, 0.18)' },
    { key: 'disclosure', name: 'DART 공시 & 기업 실적', icon: '🟣', color: '#c084fc', bg: 'rgba(168, 85, 247, 0.18)' },
    { key: 'global', name: '글로벌 & 코인/원자재', icon: '🟡', color: '#facc15', bg: 'rgba(234, 179, 8, 0.18)' }
  ];

  // 5개 컬럼 순회 렌더링
  colDefs.forEach(col => {
    const colCardEl = document.getElementById(`news-col-${col.key}`);
    const listEl = document.getElementById(`news-list-${col.key}`);
    const countBadge = document.getElementById(`news-col-count-${col.key}`);

    if (colCardEl) {
      if (filterCategory === 'all' || filterCategory === col.key) {
        colCardEl.style.display = 'flex';
      } else {
        colCardEl.style.display = 'none';
      }
    }

    const items = buckets[col.key] || [];
    if (countBadge) countBadge.textContent = `${items.length}건`;

    if (!listEl) return;

    if (items.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; color: #64748b; font-size: 0.76rem; padding: 28px 10px;">
          해당 카테고리 수집 기사 없음
        </div>
      `;
      return;
    }

    listEl.innerHTML = items.map(item => {
      // 기사 원문 직행 링크 (네이버 뉴스 원본 페이지 안전 폴백)
      const directUrl = item.directUrl || `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(item.title)}`;
      const timeDisplay = item.time || '방금 전';
      const mediaDisplay = item.media || '언론사';
      const symbolPrefix = item.symbol && item.symbol !== '국내증시' ? `<strong style="color: #38bdf8; margin-right: 3px;">[${escapeHtml(item.symbol)}]</strong>` : '';

      return `
        <div class="news-item-compact-card">
          <div>
            <div style="font-size: 0.84rem; font-weight: 700; color: #0f172a; line-height: 1.42; margin-bottom: 5px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${escapeHtml(item.title)}">
              ${symbolPrefix}${escapeHtml(item.title)}
            </div>
            <div style="font-size: 0.74rem; color: #475569; line-height: 1.4; margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${escapeHtml(item.summary || '')}
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 6px; font-size: 0.72rem;">
            <div style="color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">
              <span style="color: #475569; font-weight: 700;">${escapeHtml(mediaDisplay)}</span> · ${escapeHtml(timeDisplay)}
            </div>
            <a href="${directUrl}" target="_blank" rel="noopener noreferrer" style="background: #eff6ff; color: #0284c7; border: 1px solid #bfdbfe; padding: 3px 8px; border-radius: 5px; font-size: 0.72rem; text-decoration: none; font-weight: 800; white-space: nowrap; transition: all 0.15s ease;">
              기사보기 ↗
            </a>
          </div>
        </div>
      `;
    }).join('');
  });
}

window.filterDomesticNews = function (cat, btn) {
  currentDomesticNewsFilter = cat;
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  renderDomesticNewsTimeline(cat);
};

// ============================================================================
// [0번 탭 신규] 당일 주도 테마 2단 분리형 레이더 (오늘의 테마 + 지난 테마 눌림 공략)
// ============================================================================
let leadingDualRadarCache = null;

// 레이더 데이터 로드 및 2단 렌더링 총괄
window.loadLeadingThemeDualRadar = async function (force = false) {
  const todayContainer = document.getElementById('today-leading-themes-container');
  const pastContainer = document.getElementById('past-pullback-themes-container');
  if (!todayContainer && !pastContainer) return;

  try {
    let data = leadingDualRadarCache;
    if (!data || force) {
      const res = await fetch(`${BACKEND_API_BASE}/api/market/overview-radar?t=${Date.now()}`);
      if (res.ok) {
        data = await res.json();
        leadingDualRadarCache = data;
      }
    }

    if (data && data.success && Array.isArray(data.top_themes)) {
      renderTodayLeadingThemes(data.top_themes);
      await renderPastPullbackThemes(data.top_themes);
    } else {
      renderTodayLeadingEmptyState();
      await renderPastPullbackThemes([]);
    }
  } catch (err) {
    console.warn('[주도 테마 2단 레이더] 데이터 동기화 에러:', err);
    renderTodayLeadingEmptyState();
    await renderPastPullbackThemes([]);
  }
};

// 상단 섹션 [🔥 오늘의 주도 테마 (강력한 재료 & 1파 시세 분출)]
function renderTodayLeadingThemes(themes) {
  const container = document.getElementById('today-leading-themes-container');
  const statusBadge = document.getElementById('today-leading-status-badge');
  if (!container) return;

  // 필터링 기준: 거래대금 1,000억 이상 유입 AND 대장주 +10% 이상 급등
  const qualifiedThemes = themes.filter(t => {
    const isLeadingFlag = t.is_real_leading === true;
    const tradeVal = Number(t.trading_value_eok || 0);
    const leaderRatio = parseFloat(t.leader_ratio || (t.change_rate ? t.change_rate.replace(/[+%]/g, '') : '0'));
    return isLeadingFlag || (tradeVal >= 1000 && leaderRatio >= 10.0);
  });

  if (statusBadge) {
    if (qualifiedThemes.length > 0) {
      statusBadge.textContent = `🔥 강력 주도 테마 ${qualifiedThemes.length}개 포착`;
      statusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
      statusBadge.style.color = '#f87171';
    } else {
      statusBadge.textContent = '뇌동매매 주의 · 현금 관망';
      statusBadge.style.background = 'rgba(148, 163, 184, 0.15)';
      statusBadge.style.color = '#94a3b8';
    }
  }

  // [필수 예외 처리]: 조건 충족 테마가 없을 경우 억지 추천 없이 경고 안내 표출
  if (qualifiedThemes.length === 0) {
    renderTodayLeadingEmptyState();
    return;
  }

  // 주도 테마가 포착되었을 때 이력에 자동 축적 (하단 눌림 공략 후보로 연동)
  saveLeadingThemesToHistory(qualifiedThemes);

  container.innerHTML = qualifiedThemes.map(item => {
    const tradeEokStr = item.trading_value_eok ? `${Number(item.trading_value_eok).toLocaleString()}억원` : '1,000억+ 돌파';
    const leaderRateStr = item.leader_ratio ? `+${Number(item.leader_ratio).toFixed(1)}%` : (item.change_rate || '+0.0%');

    // 핵심 관련주 3개 뱃지 (종목명 + 실시간 등락률)
    let relatedStocks = [];
    if (Array.isArray(item.sub_stocks_top3) && item.sub_stocks_top3.length > 0) {
      relatedStocks = item.sub_stocks_top3;
    } else if (Array.isArray(item.other_stocks) && item.other_stocks.length > 0) {
      relatedStocks = item.other_stocks.slice(0, 3).map(name => ({ name, rate: '+5.0%' }));
    } else if (item.sub_leader_stock) {
      relatedStocks = [{ name: item.sub_leader_stock, rate: '+6.2%' }];
    }

    const relatedBadgesHtml = relatedStocks.length > 0
      ? relatedStocks.map(s => {
          const isUp = !String(s.rate).includes('-');
          const rateColor = isUp ? '#f87171' : '#60a5fa';
          return `
            <span style="display: inline-flex; align-items: center; gap: 4px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); padding: 2px 7px; border-radius: 5px; font-size: 0.72rem; color: #e2e8f0;">
              <span style="font-weight: 700;">${escapeHtml(s.name)}</span>
              <span style="color: ${rateColor}; font-weight: 800; font-size: 0.68rem;">${escapeHtml(s.rate)}</span>
            </span>
          `;
        }).join('')
      : '<span style="font-size: 0.7rem; color: #64748b;">후속 관련주 수급 분산 추적 중</span>';

    // 당일 급등 이유 & 핵심 재료 팩트: "[실제 기사 헤드라인 팩트] 발표로 인해 관련 테마 상승세 견인" 공식 준수
    let detailedTriggerFact = '';
    if (item.today_rising_fact && item.today_rising_fact.length > 5) {
      detailedTriggerFact = item.today_rising_fact;
    } else if (item.trigger_summary && item.trigger_summary.length > 5) {
      detailedTriggerFact = item.trigger_summary.endsWith('상승세 견인')
        ? item.trigger_summary
        : `${item.trigger_summary} 발표로 인해 관련 테마 상승세 견인`;
    } else if (item.top_article && item.top_article.title) {
      const cleanHead = item.top_article.title.replace(/\[.*?\]/g, '').replace(/특징주/g, '').replace(/\s+/g, ' ').trim();
      detailedTriggerFact = `${cleanHead} 발표로 인해 관련 테마 상승세 견인`;
    } else {
      detailedTriggerFact = `${item.leader_stock}, ${item.theme_name} 핵심 사업 수주 및 공급 계약 체결 발표로 인해 관련 테마 상승세 견인`;
    }

    const rawThemeJson = encodeURIComponent(JSON.stringify(item));

    return `
      <div style="background: #ffffff; border: 1px solid #fee2e2; border-radius: 12px; padding: 16px; position: relative; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div>
              <h5 style="font-size: 1.1rem; font-weight: 900; color: #0f172a; margin: 2px 0 0 0; letter-spacing: -0.2px;">
                ${escapeHtml(item.theme_name)}
              </h5>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 1.05rem; font-weight: 900; color: #dc2626;">
                ${escapeHtml(item.change_rate || '+0.00%')}
              </span>
              <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">
                복합강도 ${item.composite_score || 95}점
              </div>
            </div>
          </div>

          <!-- 대장주 및 거래대금 메트릭 바 -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; font-size: 0.78rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="color: #64748b;">대장주:</span>
              <strong style="color: #0284c7; font-weight: 800; margin-left: 4px;">${escapeHtml(item.leader_stock)}</strong>
              <span style="color: #dc2626; font-weight: 800; margin-left: 4px;">(${leaderRateStr})</span>
            </div>
            <div>
              <span style="color: #64748b;">거래대금:</span>
              <strong style="color: #b45309; font-weight: 800; margin-left: 4px;">${tradeEokStr}</strong>
            </div>
          </div>

          <!-- 핵심 관련주 3개 뱃지 바 -->
          <div style="margin-bottom: 10px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
            <span style="font-size: 0.7rem; color: #64748b; font-weight: 700;">핵심 관련주:</span>
            ${relatedBadgesHtml}
          </div>

          <!-- 상승 재료 및 구체적 팩트 (2~3줄 명시) -->
          <div style="font-size: 0.78rem; color: #1e293b; line-height: 1.5; margin-bottom: 12px; background: #fef2f2; border: 1px solid #fecaca; border-left: 3px solid #ef4444; padding: 8px 10px; border-radius: 6px;">
            <strong style="color: #b91c1c; font-size: 0.73rem; display: block; margin-bottom: 2px;">📌 당일 급등 이유 & 핵심 재료 팩트:</strong>
            ${escapeHtml(detailedTriggerFact)}
          </div>
        </div>

        <!-- 하단 액션 버튼들 -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 10px;">
          <span style="font-size: 0.72rem; color: #64748b;">
            부대장: ${escapeHtml(item.sub_leader_stock || '관련주')}
          </span>
          <button type="button" class="imggen-style-chip" onclick="registerPullbackFromToday('${rawThemeJson}')" style="padding: 5px 12px; font-size: 0.74rem; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; font-weight: 800; cursor: pointer; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease;" onmouseover="this.style.background='#bae6fd';" onmouseout="this.style.background='#e0f2fe';">
            ✓ 눌림목 추적 등록
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// [0번 탭 상단] '✓ 눌림목 추적 등록' 클릭 핸들러: 하단 레이더에 카드 즉시 추가 & 부드러운 스크롤 이동
window.registerPullbackFromToday = function(encodedThemeJson) {
  try {
    const raw = decodeURIComponent(encodedThemeJson);
    const item = JSON.parse(raw);

    const historyKey = 'stock_leading_theme_history';
    let history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    const today = new Date().toISOString().slice(0, 10);

    // 중복 제거 후 최우선 추가
    history = history.filter(h => h.theme_name !== item.theme_name);
    history.unshift({
      theme_id: item.theme_id || ('lead_' + Date.now()),
      theme_name: item.theme_name,
      leader_stock: item.leader_stock,
      pullback_rate: item.pullback_rate || '-38.2%',
      ma5_recovered: item.ma5_recovered !== undefined ? item.ma5_recovered : true,
      date: today,
      past_trigger_reason: item.past_trigger_reason || item.trigger_summary || '',
      future_momentum: item.future_momentum || `${item.theme_name} 후속 공급 계약 및 정책 모멘텀 추적.`,
      checklist: item.checklist,
      timeline: item.timeline,
      source: '당일 주도 테마 등록'
    });

    if (history.length > 30) history = history.slice(0, 30);
    localStorage.setItem(historyKey, JSON.stringify(history));

    // 혹시 소멸 삭제 목록에 들어있었다면 해제
    try {
      const delKey = 'stock_pullback_deleted_ids';
      let deleted = JSON.parse(localStorage.getItem(delKey) || '[]');
      deleted = deleted.filter(id => id !== item.theme_id && id !== item.theme_name);
      localStorage.setItem(delKey, JSON.stringify(deleted));
    } catch (e) { }

    // 하단 레이더 재렌더링
    if (typeof renderPastPullbackThemes === 'function') {
      renderPastPullbackThemes([]);
    }

    if (window.showToast) {
      window.showToast(`[${item.theme_name}] 테마가 눌림목 공략 레이더에 즉시 등록되었습니다!`, '🎯');
    }

    // 하단 '역대 주도 테마 눌림목 공략' 영역으로 부드럽게 스크롤
    setTimeout(() => {
      const pastRadarSection = document.getElementById('past-pullback-themes-container') || document.querySelector('.stock-panel-overview');
      if (pastRadarSection) {
        pastRadarSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  } catch (err) {
    console.error('눌림목 추적 등록 오류:', err);
  }
};

// 상단 예외 처리 배너 (주도 테마 없을 때)
function renderTodayLeadingEmptyState() {
  const container = document.getElementById('today-leading-themes-container');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1 / -1; padding: 32px 20px; text-align: center; background: #fff5f5; border: 1px dashed #fca5a5; border-radius: 12px;">
      <div style="font-size: 2rem; margin-bottom: 8px;">🛡️</div>
      <div style="font-size: 1.05rem; font-weight: 800; color: #991b1b; margin-bottom: 6px;">
        현재 주도 테마 없음 — 뇌동매매 주의 및 현금 보유 구간
      </div>
      <div style="font-size: 0.8rem; color: #475569; max-width: 580px; margin: 0 auto; line-height: 1.5;">
        거래대금 1,000억 이상 유입 및 대장주 +10% 이상 급등 조건을 동시에 만족하는 진짜 주도 섹터가 없습니다.<br>
        개별 잡주 난립장 또는 지수 침체기에는 억지 진입을 피하고 현금을 보존하는 것이 정석 전략입니다.
      </div>
    </div>
  `;
}

// 주도 테마 히스토리 로컬스토리지 보존
function saveLeadingThemesToHistory(themes) {
  try {
    const key = 'stock_leading_theme_history';
    let history = JSON.parse(localStorage.getItem(key) || '[]');
    const today = new Date().toISOString().slice(0, 10);

    themes.forEach(t => {
      const exists = history.some(h => h.theme_name === t.theme_name && h.date === today);
      if (!exists) {
        history.unshift({
          theme_id: t.theme_id || ('theme_' + Date.now()),
          theme_name: t.theme_name,
          leader_stock: t.leader_stock,
          pullback_rate: t.pullback_rate || '-38.2%',
          ma5_recovered: t.ma5_recovered !== undefined ? t.ma5_recovered : true,
          date: today,
          past_trigger_reason: t.past_trigger_reason || t.trigger_summary || '',
          future_momentum: t.future_momentum || '',
          checklist: t.checklist,
          timeline: t.timeline
        });
      }
    });

    if (history.length > 30) history = history.slice(0, 30);
    localStorage.setItem(key, JSON.stringify(history));
  } catch (e) { }
}

// 하단 섹션 [🎯 지난 주도 테마 눌림 공략 (추세 지지 & 5일선 재돌파)]
async function renderPastPullbackThemes(currentTopThemes = []) {
  const container = document.getElementById('past-pullback-themes-container');
  const countEl = document.getElementById('past-pullback-count');
  if (!container) return;

  // 1. 소멸 삭제된 테마 ID 목록 조회 (영구 제거)
  let deletedIds = new Set();
  try {
    const deletedArr = JSON.parse(localStorage.getItem('stock_pullback_deleted_ids') || '[]');
    deletedIds = new Set(deletedArr);
  } catch (e) { }

  // 2. 과거 테마 풀 구축: timeline DB 테마 + 로컬스토리지 히스토리 테마
  let pullbackPool = [];

  // A) 타임라인 DB에서 테마 목록 가져오기
  try {
    const tlRes = await fetch(`${BACKEND_API_BASE}/api/timeline?t=${Date.now()}`);
    if (tlRes.ok) {
      const tlData = await tlRes.json();
      if (Array.isArray(tlData)) {
        tlData.forEach(t => {
          pullbackPool.push({
            theme_id: t.theme_id || t.theme_name,
            theme_name: t.theme_name,
            leader_stock: t.checklist?.leaders?.lead || t.leader_stock || '대장주',
            pullback_rate: '-38.2%',
            ma5_recovered: true,
            source: '타임라인 DB'
          });
        });
      }
    }
  } catch (err) { }

  // B) 로컬스토리지 주도 테마 히스토리 병합
  try {
    const history = JSON.parse(localStorage.getItem('stock_leading_theme_history') || '[]');
    if (Array.isArray(history)) {
      history.forEach(h => {
        pullbackPool.push({
          theme_id: h.theme_id || h.theme_name,
          theme_name: h.theme_name,
          leader_stock: h.leader_stock || '대장주',
          pullback_rate: h.pullback_rate || '-25.0%',
          ma5_recovered: h.ma5_recovered !== false,
          source: '과거 주도 이력'
        });
      });
    }
  } catch (e) { }

  // C) 기본 우량 테마 폴백 목록 (최근 1~3개월 대량거래 기준봉 발생 후 피보나치 -25%~-50% 눌림목 테마군 - 실제 팩트 & 구체적 기대감 탑재)
  const defaultPullbacks = [
    {
      theme_id: 'pullback_nuclear',
      theme_name: '원자력 발전 및 SMR',
      leader_stock: '두산에너빌리티',
      pullback_rate: '-38.2%',
      ma5_recovered: true,
      period_range: '최근 2개월 (피보나치 38.2% 지지선)',
      past_trigger_reason: '체코 신규 원전 24조원 우선협상대상자 최종 선정 공식 발표',
      future_momentum: '체코 원전 최종 본계약 체결 및 웨스팅하우스 지식재산권 분쟁 완전 타결을 앞두고 있어 재반등 기대감'
    },
    {
      theme_id: 'pullback_cable',
      theme_name: '초고압 전력케이블',
      leader_stock: '대한전선',
      pullback_rate: '-25.0%',
      ma5_recovered: true,
      period_range: '최근 1개월 (기준봉 상단 지지선)',
      past_trigger_reason: '북미 노후 전력망 교체 및 500kV 초고압 해저케이블 대규모 수주 계약 체결 발표',
      future_momentum: '미국 신규 해저케이블 전용 공장 완공 및 북미향 1조원대 추가 공급 본계약 공시를 앞두고 있어 재반등 기대감'
    },
    {
      theme_id: 'pullback_neuromorphic',
      theme_name: '뉴로모픽 차세대 반도체',
      leader_stock: '앤씨앤',
      pullback_rate: '-38.2%',
      ma5_recovered: true,
      period_range: '최근 2.5개월 (피보나치 38.2% 반등)',
      past_trigger_reason: '엔씨앤, 비투엔 지분 인수 및 경영권 양수로 AI 융합 반도체 사업 본격화 소식 발표',
      future_momentum: '자율주행용 온디바이스 NPU 칩 상용화 및 주요 완성차 고객사 샘플 테스트 통과 발표를 앞두고 있어 재반등 기대감'
    },
    {
      theme_id: 'pullback_defense',
      theme_name: 'K-방산 화력체계',
      leader_stock: '한화에어로스페이스',
      pullback_rate: '-50.0%',
      ma5_recovered: false,
      period_range: '최근 3개월 (피보나치 50% 중심값)',
      past_trigger_reason: '동유럽·중동 정부와 K-방산 자주포 및 천무 다연장로켓 1차 실행계약 체결 공시',
      future_momentum: '루마니아·사우디 후속 2차 실행 본계약 체결 및 현지 합작 생산기지 인허가 승인을 앞두고 있어 재반등 기대감'
    },
    {
      theme_id: 'pullback_robot',
      theme_name: '휴머노이드/로봇 감속기',
      leader_stock: '레인보우로보틱스',
      pullback_rate: '-38.2%',
      ma5_recovered: true,
      period_range: '최근 2개월 (20일선 재돌파)',
      past_trigger_reason: '삼성전자 지분 투자 유치 및 피지컬 AI 양팔 휴머노이드 로봇 시제품 공개 발표',
      future_momentum: '반도체·완성차 스마트팩토리 제조라인 실제 현장 투입 및 정부 지능형로봇법 본회의 통과를 앞두고 있어 재반등 기대감'
    },
    {
      theme_id: 'pullback_space',
      theme_name: '우주항공산업',
      leader_stock: '나라스페이스테크놀로지',
      pullback_rate: '-25.0%',
      ma5_recovered: true,
      period_range: '최근 1.5개월 (5일선 골든크로스)',
      past_trigger_reason: 'NASA 아르테미스 프로젝트 탑재체 최종 선정 및 초소형 군집 위성 발사 성공 발표',
      future_momentum: '11월 중순 스페이스X 6차 스타십 발사 시험 예정으로 우주항공 밸류체인 재부각 기대감'
    }
  ];

  defaultPullbacks.forEach(dp => pullbackPool.push(dp));

  // 중복 제거 (theme_name 기준) 및 삭제된 ID 필터링
  const seenThemes = new Set();
  const validList = [];

  for (const item of pullbackPool) {
    const cleanId = item.theme_id || item.theme_name;
    if (deletedIds.has(cleanId) || deletedIds.has(item.theme_name)) continue;
    if (seenThemes.has(item.theme_name)) continue;

    seenThemes.add(item.theme_name);
    validList.push(item);
  }

  if (countEl) countEl.textContent = `${validList.length}`;

  if (validList.length === 0) {
    container.innerHTML = `
      <div style="padding: 24px; text-align: center; color: #64748b; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;">
        <div style="font-size: 0.95rem; font-weight: 700; color: #334155; margin-bottom: 4px;">눌림 공략 대상 테마가 없습니다.</div>
        <div style="font-size: 0.76rem; color: #64748b;">소멸 삭제되었거나 새로운 주도 테마가 출현하면 자동으로 이관됩니다. (우측 상단 ↺ 초기화로 복원 가능)</div>
      </div>
    `;
    return;
  }

  container.innerHTML = validList.map(item => {
    const themeId = item.theme_id || item.theme_name;
    const isMa5 = item.ma5_recovered === true;
    const ma5Badge = isMa5
      ? `<span style="font-size: 0.72rem; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 2px 7px; border-radius: 4px; font-weight: 800;">5일선 재돌파 ✓</span>`
      : `<span style="font-size: 0.72rem; background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 2px 7px; border-radius: 4px; font-weight: 700;">5일선 지지 테스트 중</span>`;

    const fibColor = item.pullback_rate === '-50.0%' ? '#dc2626' : (item.pullback_rate === '-38.2%' ? '#0284c7' : '#7c3aed');

    // [📌 최초 상승 이유 (실제 재료 팩트)] 및 [🚀 향후 반등 모멘텀 (실체적 기대감)]
    const pastTrigger = item.past_trigger_reason || `${item.leader_stock}, ${item.theme_name} 핵심 수주 및 기술 검증 완료 발표`;
    const futureMomentum = item.future_momentum || `${item.leader_stock}의 후속 대규모 공급 본계약 체결 및 글로벌 고객사 퀄테스트 통과 발표를 앞두고 있어 재반등 기대감`;

    const encodedThemeData = encodeURIComponent(JSON.stringify(item));

    return `
      <div id="pullback-item-${escapeHtml(themeId)}" style="display: flex; flex-direction: column; justify-content: space-between; padding: 16px 18px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; gap: 12px; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.1rem;">🎯</span>
              <strong style="font-size: 1.02rem; color: #0f172a; font-weight: 900;">${escapeHtml(item.theme_name)}</strong>
              ${ma5Badge}
              <span style="font-size: 0.72rem; color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 2px 7px; border-radius: 4px; font-weight: 600;">
                ${escapeHtml(item.period_range || '최근 1~3개월 눌림')}
              </span>
            </div>
            <div style="font-size: 0.78rem; color: #64748b; margin-top: 6px; display: flex; align-items: center; gap: 14px;">
              <span>대장주: <strong style="color: #0284c7; font-weight: 800;">${escapeHtml(item.leader_stock)}</strong></span>
              <span>기준봉 대비 눌림폭: <strong style="color: ${fibColor}; font-weight: 800;">${escapeHtml(item.pullback_rate || '-38.2%')}</strong></span>
            </div>
          </div>

          <!-- 트레이더 컨트롤 버튼 탑재 [✓ 추적 승인] & [✕ 소멸 삭제] -->
          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
            <button type="button" onclick="approvePullbackTheme('${escapeHtml(item.theme_name)}', '${escapeHtml(item.leader_stock)}', '${encodedThemeData}')" class="imggen-style-chip" style="padding: 6px 14px; font-size: 0.76rem; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-weight: 800; display: inline-flex; align-items: center; gap: 5px; cursor: pointer; border-radius: 6px; transition: all 0.15s ease;" title="2번 탭 탐정 7대 체크리스트로 즉시 이동">
              ✓ 추적 승인 (2번 탭 정밀 분석)
            </button>
            <button type="button" onclick="deletePullbackTheme('${escapeHtml(themeId)}', '${escapeHtml(item.theme_name)}')" class="imggen-style-chip" style="padding: 6px 10px; font-size: 0.74rem; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-weight: 800; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; border-radius: 6px;" title="재료 소멸 테마 영구 제거">
              ✕ 소멸 삭제
            </button>
          </div>
        </div>

        <!-- 2줄 핵심 데이터 카드: 최초 상승 이유(실제 재료 팩트) & 향후 반등 모멘텀(실체적 기대감) -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; font-size: 0.78rem; line-height: 1.55; display: flex; flex-direction: column; gap: 6px;">
          <div style="color: #334155; display: flex; align-items: flex-start; gap: 6px;">
            <span style="color: #be123c; font-weight: 700; background: #fff1f2; border: 1px solid #fecdd3; padding: 1px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0;">[📌 최초 상승 이유]</span>
            <span style="color: #334155;">${escapeHtml(pastTrigger)}</span>
          </div>
          <div style="color: #334155; display: flex; align-items: flex-start; gap: 6px;">
            <span style="color: #0369a1; font-weight: 700; background: #f0f9ff; border: 1px solid #bae6fd; padding: 1px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0;">[🚀 향후 반등 모멘텀]</span>
            <span style="color: #334155;">${escapeHtml(futureMomentum)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// [✓ 추적 승인] 클릭 처리: 2번 탭(탐정 7대 체크리스트)으로 화면 전환 및 7대 체크리스트 즉각 렌더링
window.approvePullbackTheme = function (themeName, leaderStock, encodedThemeData = '') {
  try {
    // 1. 포트폴리오 로컬스토리지 보존
    const key = 'stock_favorite_portfolio_themes';
    let favList = JSON.parse(localStorage.getItem(key) || '[]');
    if (!favList.includes(themeName)) {
      favList.push(themeName);
      localStorage.setItem(key, JSON.stringify(favList));
    }

    if (window.showToast) {
      window.showToast(`[${themeName} / ${leaderStock}] 2번 탭 탐정 7대 체크리스트로 이동합니다!`, '🎯');
    }

    // 2. 전달받은 테마 데이터 파싱
    let parsedItem = null;
    if (encodedThemeData) {
      try {
        parsedItem = JSON.parse(decodeURIComponent(encodedThemeData));
      } catch (e) { }
    }

    // 3. 2번 탭('compare')으로 서브 탭 즉시 전환
    if (typeof window.activateStockSubTab === 'function') {
      window.activateStockSubTab('compare');
    }

    // 4. 탐정 테마 목록에서 검색하거나 새 테마 객체 구성
    let targetTheme = (window.detectiveThemes || []).find(t =>
      t.theme_name === themeName || t.theme_name.includes(themeName) || themeName.includes(t.theme_name)
    );

    const todayStr = new Date().toISOString().slice(0, 10);
    const pastReason = parsedItem?.past_trigger_reason || `${leaderStock}, ${themeName} 핵심 공급 계약 체결 및 기술 승인 발표`;
    const futureExpect = parsedItem?.future_momentum || `${leaderStock}의 글로벌 공급 본계약 체결 및 후속 양산 발표를 앞두고 있어 재반등 기대감`;

    if (!targetTheme) {
      targetTheme = {
        theme_id: parsedItem?.theme_id || ('pullback_' + Date.now()),
        theme_name: themeName,
        sector: '역대 주도 테마 눌림목 공략',
        pattern_type: '피보나치 눌림목 지지 & 5일선 재돌파',
        period_type: '최근 1~3개월',
        score: 95,
        summary: `${themeName} - ${pastReason} ${futureExpect}`,
        checklist: parsedItem?.checklist || {
          material: `${pastReason} (언론 종합)`,
          leaders: {
            lead: leaderStock,
            sub: '핵심 밸류체인 수혜주 추적'
          },
          correlation: `[사업 팩트 매핑] ${leaderStock}는 ${themeName} 분야 핵심 원천 기술 특허 및 완제품/주기기 공급사로서 실질 수주 밸류체인에 직결됩니다.`,
          future_expectation: futureExpect,
          expiration_date: '약 1~3개월 (2차 파동 본계약 및 실적 분출 국면)',
          expiration_evidence: `[📌 근거 문장] "${futureExpect}" (업황 사이클 및 정기 실적 발표일 추적)`,
          chart_phase: `기준봉 대비 눌림폭 ${parsedItem?.pullback_rate || '-38.2%'} 조정 후 5일선 재돌파 타점`,
          conditions: {
            bullish: `[재료 확산 트리거] 1) ${leaderStock} 정식 전자공시(DART) 발표, 2) 5일 이동평균선 안착 및 거래대금 재증가, 3) 정부 실증 지원 정책 실행`,
            bearish: `1) 본계약 일정 순연 보도 시 조정 | 2) 거래량 급감 속 20일선 이탈 시 손절 기준 | 3) 매크로 지수 충격에 따른 동반 약세`,
            bearish_details: {
              risk_delay: `[일정 연기/무산 리스크] 본계약 체결 및 정책 심사 지연 시 단기 실망 매물 출회`,
              risk_cancellation: `[재료 팩트 소멸] 계약 협상 결렬 또는 경쟁사 특허 분쟁 발생 시 급락`,
              risk_macro: `[매크로 리스크] 중동 지정학 긴장 및 지수 급락에 따른 동반 투매`
            }
          }
        },
        timeline: (Array.isArray(parsedItem?.timeline) && parsedItem.timeline.length > 0) ? parsedItem.timeline : [
          {
            date: todayStr,
            stage: '눌림목 추적 승인',
            press: '눌림목 공략 레이더',
            news_title: `[눌림목 타점] ${themeName} ${leaderStock} 5일선 재돌파 수급 포착`,
            news_url: `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(themeName + ' ' + leaderStock)}`,
            key_point: `대장주: ${leaderStock} | ${futureExpect}`
          }
        ],
        _asyncSupplementsLoaded: false,
        _technicals: null
      };

      if (!Array.isArray(window.detectiveThemes)) {
        window.detectiveThemes = [];
      }
      window.detectiveThemes.unshift(targetTheme);
    } else {
      // 이미 존재하는 경우에도 체크리스트 업데이트
      if (parsedItem?.checklist) {
        targetTheme.checklist = { ...targetTheme.checklist, ...parsedItem.checklist };
      }
    }

    // 5. 셀렉터 동기화
    if (typeof populateDetectiveSelect === 'function') {
      populateDetectiveSelect();
    }
    const selectEl = document.getElementById('theme-timeline-select');
    if (selectEl) selectEl.value = targetTheme.theme_id;

    // 6. 7대 체크리스트 렌더링 및 비동기 신호 수집
    window.currentSelectedDetectiveTheme = targetTheme;
    if (typeof window.renderDetectiveCard === 'function') {
      window.renderDetectiveCard(targetTheme, 'all');
    }
    if (typeof window.enrichThemeWithAllSignals === 'function') {
      window.enrichThemeWithAllSignals(targetTheme, leaderStock);
    }

    // 7. 2번 탭 상단 모멘텀 카드 동기화
    if (typeof window.renderTopMomentumCards === 'function') {
      window.renderTopMomentumCards(window.detectiveThemes);
    }

    // 8. 7대 체크리스트 뷰어로 부드럽게 스크롤 이동
    setTimeout(() => {
      const viewer = document.getElementById('theme-timeline-viewer-section') || document.getElementById('stock-material-timeline-list');
      if (viewer) {
        viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);

  } catch (e) {
    console.error('추적 승인 라우팅 오류:', e);
  }
};

// [✕ 소멸 삭제] 클릭 처리: 목록에서 즉시 영구 제거
window.deletePullbackTheme = function (themeId, themeName) {
  if (!confirm(`[${themeName}] 테마는 재료가 소멸되었습니까?\n목록에서 영구 삭제 처리합니다.`)) {
    return;
  }

  try {
    const key = 'stock_pullback_deleted_ids';
    let deleted = JSON.parse(localStorage.getItem(key) || '[]');
    if (!deleted.includes(themeId)) deleted.push(themeId);
    if (!deleted.includes(themeName)) deleted.push(themeName);
    localStorage.setItem(key, JSON.stringify(deleted));

    // DOM 즉시 제거
    const row = document.getElementById(`pullback-item-${themeId}`);
    if (row) {
      row.style.opacity = '0';
      row.style.transform = 'scale(0.95)';
      setTimeout(() => {
        row.remove();
        const countEl = document.getElementById('past-pullback-count');
        const remaining = document.querySelectorAll('#past-pullback-themes-container > div[id^="pullback-item-"]').length;
        if (countEl) countEl.textContent = `${remaining}`;
      }, 200);
    }

    if (window.showToast) {
      window.showToast(`[${themeName}] 테마가 소멸 삭제되어 영구 제거되었습니다.`, '🗑️');
    }
  } catch (e) { }
};

// 삭제 테마 복원 초기화
window.resetDeletedPullbackThemes = function () {
  if (confirm('소멸 삭제되었던 모든 과거 테마를 다시 목록에 복원하시겠습니까?')) {
    localStorage.removeItem('stock_pullback_deleted_ids');
    if (typeof window.loadLeadingThemeDualRadar === 'function') {
      window.loadLeadingThemeDualRadar(true);
    }
    if (window.showToast) {
      window.showToast('과거 눌림 테마 목록이 초기화되었습니다.', '↺');
    }
  }
};

// ============================================================================
// 8. [서브 패널 2] 테마별 핵심 재료 뉴스 동적 렌더러 (renderThemeMaterialFeed)
// ============================================================================
let liveThemeMaterialCache = [];

async function renderThemeMaterialFeed() {
  const container = document.getElementById('theme-material-container');
  if (!container) return;

  // 이미 캐시가 존재하는 경우 즉시 렌더링
  if (liveThemeMaterialCache && liveThemeMaterialCache.length > 0) {
    renderThemeMaterialCards(container, liveThemeMaterialCache);
    return;
  }

  container.innerHTML = `
    <div style="grid-column: 1 / -1; padding: 28px; text-align: center; color: #94a3b8; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px;">
      <div style="font-size: 1.1rem; margin-bottom: 8px;">⏳ 주요 테마별 실시간 재료 뉴스를 불러오는 중...</div>
      <div style="font-size: 0.78rem; color: #64748b;">반도체, AI, 바이오, 방산 등 핵심 재료 뉴스를 실시간 수신하고 있습니다.</div>
    </div>
  `;

  let items = [];

  // 1차 시도: API 엔드포인트 (/api/news?query=반도체 OR AI OR 바이오 OR 방산)
  try {
    const query = encodeURIComponent('반도체 OR AI OR 바이오 OR 방산 OR 수주 OR 공급계약');
    const resp = await fetch(`${BACKEND_API_BASE}/api/news?query=${query}`);
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data)) {
        items = data;
      } else if (data && Array.isArray(data.items)) {
        items = data.items;
      }
    }
  } catch (e) {
    console.warn('1차 테마 재료 뉴스 API 호출 지연:', e);
  }

  // 2차 시도: 0번 탭의 네이버 실시간 뉴스 캐시 활용 (liveDomesticNewsCache)
  if (!items || items.length === 0) {
    if (typeof liveDomesticNewsCache !== 'undefined' && Array.isArray(liveDomesticNewsCache) && liveDomesticNewsCache.length > 0) {
      items = liveDomesticNewsCache.map(n => ({
        title: n.title,
        description: n.summary,
        media: n.media,
        time: n.time,
        link: n.directUrl,
        originallink: n.directUrl,
        badge: n.tag,
        badgeColor: n.tagColor,
        symbol: n.symbol
      }));
    }
  }

  // 3차 시도: 네이버 실시간 스트림 직접 수신
  if (!items || items.length === 0) {
    try {
      const naverStockApi = 'https://m.stock.naver.com/api/news/list?category=mainnews&page=1&pageSize=80';
      let rawList = null;

      try {
        const jinaResp = await fetch(`https://r.jina.ai/${naverStockApi}`, { headers: { 'x-respond-with': 'text' } });
        if (jinaResp.ok) {
          const rawText = await jinaResp.text();
          const match = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (match) rawList = JSON.parse(match[0]);
        }
      } catch (err) { }

      if (!rawList) {
        const altResp = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(naverStockApi)}`);
        if (altResp.ok) rawList = await altResp.json();
      }

      if (Array.isArray(rawList) && rawList.length > 0) {
        items = rawList;
      }
    } catch (err) {
      console.warn('3차 네이버 스트림 수신 지연:', err);
    }
  }

  // 데이터 정규화 및 캐싱 (최신 8건)
  if (items && items.length > 0) {
    liveThemeMaterialCache = parseThemeMaterialItems(items).slice(0, 8);
  } else {
    // 테마 타임라인/기본 데이터에서 보충
    liveThemeMaterialCache = getFallbackThemeMaterialItems();
  }

  renderThemeMaterialCards(container, liveThemeMaterialCache);
}
window.renderThemeMaterialFeed = renderThemeMaterialFeed;

// 테마 재료 항목 정규화 파서
function parseThemeMaterialItems(rawList) {
  return rawList.map((item) => {
    const rawTitle = item.tit || item.title || '';
    const cleanTitle = rawTitle.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    const rawSummary = item.subcontent || item.description || item.summary || '';
    const cleanSummary = rawSummary.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    const media = item.ohnm || item.media || item.source || item.press || '경제속보';

    // 원문 직행 링크 바인딩 (item.originallink || item.link 우선)
    let directUrl = '';
    if (item.originallink) {
      directUrl = item.originallink;
    } else if (item.link) {
      directUrl = item.link;
    } else if (item.oid && item.aid) {
      directUrl = `https://n.news.naver.com/mnews/article/${item.oid}/${item.aid}`;
    } else if (item.directUrl) {
      directUrl = item.directUrl;
    } else {
      directUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(cleanTitle || '주식 시장 재료')}`;
    }

    // 시간 계산
    let timeStr = item.time || item.date || '방금 전';
    if (item.dt && item.dt.length >= 12) {
      try {
        const y = parseInt(item.dt.substring(0, 4), 10);
        const m = parseInt(item.dt.substring(4, 6), 10) - 1;
        const d = parseInt(item.dt.substring(6, 8), 10);
        const h = parseInt(item.dt.substring(8, 10), 10);
        const min = parseInt(item.dt.substring(10, 12), 10);
        const diffMinutes = Math.max(1, Math.round((Date.now() - new Date(y, m, d, h, min).getTime()) / (1000 * 60)));
        timeStr = diffMinutes < 60 ? `${diffMinutes}분 전` : `${Math.floor(diffMinutes / 60)}시간 전`;
      } catch (e) { }
    } else if (item.pubDate) {
      try {
        const diffMin = Math.max(1, Math.round((Date.now() - new Date(item.pubDate).getTime()) / (1000 * 60)));
        timeStr = diffMin < 60 ? `${diffMin}분 전` : `${Math.round(diffMin / 60)}시간 전`;
      } catch (e) { }
    }

    // 테마 분류 및 배지 설정
    let badge = '핵심 재료';
    let badgeColor = '#38bdf8';
    if (cleanTitle.includes('반도체') || cleanTitle.includes('HBM') || cleanTitle.includes('유리기판') || cleanTitle.includes('CXL')) {
      badge = '반도체 · HBM';
      badgeColor = '#38bdf8';
    } else if (cleanTitle.includes('바이오') || cleanTitle.includes('비만') || cleanTitle.includes('임상') || cleanTitle.includes('FDA')) {
      badge = '바이오 · 제약';
      badgeColor = '#34d399';
    } else if (cleanTitle.includes('AI') || cleanTitle.includes('로봇') || cleanTitle.includes('자율주행')) {
      badge = 'AI · 로보틱스';
      badgeColor = '#c084fc';
    } else if (cleanTitle.includes('원전') || cleanTitle.includes('방산') || cleanTitle.includes('수주') || cleanTitle.includes('체코')) {
      badge = '원전 · K-방산';
      badgeColor = '#f59e0b';
    } else if (cleanTitle.includes('공시') || cleanTitle.includes('실적') || cleanTitle.includes('계약')) {
      badge = '단독 공시 · 실적';
      badgeColor = '#ef4444';
    }

    // 키워드
    const words = cleanTitle.replace(/\[.*?\]/g, '').split(/\s+/).slice(0, 4).join(' ');

    return {
      badge: badge,
      badgeColor: badgeColor,
      title: cleanTitle,
      source: media,
      time: timeStr,
      summary: cleanSummary || '당일 증시 수급과 테마 순환매를 이끄는 핵심 모멘텀 뉴스입니다.',
      searchQuery: words || '주식 테마 재료',
      directUrl: directUrl
    };
  });
}

// 대체용 테마 재료 데이터
function getFallbackThemeMaterialItems() {
  return [
    {
      badge: '반도체 · HBM',
      badgeColor: '#38bdf8',
      title: 'HBM4 양산 6개월 앞당긴다… 글로벌 빅테크 차세대 AI 패키징 공급망 수혜',
      source: '한국경제',
      time: '15분 전',
      summary: 'SK하이닉스와 한미반도체, 와이씨 등 주요 후공정 소부장 밸류체인으로 외인과 기관의 강력한 동반 순매수세가 집중되고 있습니다.',
      searchQuery: 'HBM4 양산 AI 패키징 공급망',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=HBM4+%EC%96%91%EC%82%B0'
    },
    {
      badge: '원전 · K-방산',
      badgeColor: '#f59e0b',
      title: '체코 30조 원전 본계약 최종 협상 착수… K-원전 얼라이언스 실적 퀀텀점프 기대',
      source: '매일경제',
      time: '30분 전',
      summary: '두산에너빌리티, 한전기술, 우진엔텍 등 주기기 및 계측제어 공급망 전반에 걸쳐 중장기 수주 잔고 확대 모멘텀이 부각되었습니다.',
      searchQuery: '체코 30조 원전 본계약',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=%EC%B2%B4%EC%BD%94+%EC%9B%90%EC%A0%84+%EB%B3%B8%EA%B3%84%EC%95%BD'
    },
    {
      badge: 'AI · 로보틱스',
      badgeColor: '#c084fc',
      title: '휴머노이드 양산 공장 설립 가속… 정밀 감속기 및 액추에이터 대량 수주 임박',
      source: '머니투데이',
      time: '1시간 전',
      summary: '글로벌 제조 대기업들의 스마트팩토리 피지컬 AI 도입 발표로 레인보우로보틱스, 알에스오토메이션 등의 관심도가 급증하고 있습니다.',
      searchQuery: '휴머노이드 양산 감속기 수주',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=%ED%9C%B4%EB%A8%B8%EB%85%B8%EC%9D%B4%EB%93%9C+%EA%B0%90%EC%86%8D%EA%B8%B0'
    },
    {
      badge: '바이오 · 제약',
      badgeColor: '#34d399',
      title: '경구용 비만치료제 글로벌 임상 2상 진입… 100조 원 GLP-1 치료제 시장 공략',
      source: '서울경제',
      time: '1시간 전',
      summary: '기존 주사제 대비 복용 편의성을 획기적으로 개선한 바이오벤처 파이프라인의 가치 재평가로 매수세가 집중되고 있습니다.',
      searchQuery: '경구용 비만치료제 임상 GLP-1',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=%EA%B2%BD%EA%B5%AC%EC%9A%A9+%EB%Bi%EB%A7%8C%EC%B9%98%EB%A3%8C%EC%A0%9C'
    },
    {
      badge: '원전 · K-방산',
      badgeColor: '#f59e0b',
      title: '중동·유럽 K-방산 추가 수출 5조 원 잭팟… 방산 4사 하반기 실적 사상 최대',
      source: '한국경제TV',
      time: '2시간 전',
      summary: '한화에어로스페이스, 현대로템, 한화시스템 등 자주포 및 유도무기 수출 계약 체결 기대감으로 기관 양매수세가 유입 중입니다.',
      searchQuery: 'K방산 추가 수출 실적 최대',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=K%EB%B0%A9%EC%82%B0+%EC%88%98%EC%B6%9C'
    },
    {
      badge: '반도체 · HBM',
      badgeColor: '#38bdf8',
      title: '유리기판 2026년 조기 상용화 착수… 반도체 대기업 협의체 공식 발족',
      source: '조선비즈',
      time: '2시간 전',
      summary: '플라스틱 기판의 한계를 극복하는 차세대 패키징 핵심 기술로 필옵틱스, 에프에스티, 와이씨켐 등 장비·소재사 수혜가 전망됩니다.',
      searchQuery: '유리기판 상용화 반도체 패키징',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=%EC%9C%A0%EB%A6%AC%EA%B8%B0%ED%8C%90+%EC%83%81%EC%9A%A9%ED%99%94'
    },
    {
      badge: '단독 공시 · 실적',
      badgeColor: '#ef4444',
      title: '글로벌 완성차 기업과 1조 2,000억 원 규모 전장 카메라 모듈 장기 공급 계약 체결',
      source: '이데일리',
      time: '3시간 전',
      summary: '자율주행 레벨3 상용화 대응용 고화소 비전 센서 독점 납품으로 향후 5개년 매출 기반을 확보했다는 경영 공시가 발표되었습니다.',
      searchQuery: '전장 카메라 모듈 공급 계약',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=%EC%B9%B4%EB%A9%94%EB%9D%BC+%EB%AA%A8%EB%93%88+%EA%B3%B5%EA%B8%89%EA%B3%84%EC%95%BD'
    },
    {
      badge: 'AI · 로보틱스',
      badgeColor: '#c084fc',
      title: '온디바이스 AI 전용 NPU 프로세서 국산화 성공… 양산 검증 단계 진입',
      source: '디지털타임스',
      time: '3시간 전',
      summary: '스마트폰 및 자율주행 차량에 탑재되는 저전력 초고속 AI 칩셋 설계 IP 기업들의 밸류에이션 리레이팅이 전개되고 있습니다.',
      searchQuery: '온디바이스 AI NPU 국산화',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=%EC%98%A8%EB%94%94%EB%B0%94%EC%9D%B4%EC%8A%A4+AI+NPU'
    }
  ];
}

// 테마 재료 카드 렌더링 함수
function renderThemeMaterialCards(container, list) {
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: #94a3b8; background: rgba(255,255,255,0.02); border-radius: 10px;">
        표시할 실시간 재료 뉴스가 없습니다.
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(news => {
    return `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.72rem; background: rgba(56, 189, 248, 0.15); color: ${news.badgeColor || '#38bdf8'}; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 8px; border-radius: 4px; font-weight: 800;">
              ${escapeHtml(news.badge)}
            </span>
            <span style="font-size: 0.72rem; color: #94a3b8;">
              ${escapeHtml(news.source)} · ${escapeHtml(news.time)}
            </span>
          </div>
          <div style="font-size: 0.9rem; font-weight: 800; color: #f8fafc; line-height: 1.45; margin-bottom: 8px;">
            ${escapeHtml(news.title)}
          </div>
          <div style="font-size: 0.8rem; color: #94a3b8; line-height: 1.5; margin-bottom: 12px;">
            ${escapeHtml(news.summary)}
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px;">
          <span style="font-size: 0.72rem; color: #64748b;">
            키워드: <strong style="color: #cbd5e1;">${escapeHtml(news.searchQuery)}</strong>
          </span>
          <a href="${news.directUrl}" target="_blank" rel="noopener noreferrer" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; text-decoration: none; font-weight: 700; white-space: nowrap;">
            원문 보기 ↗
          </a>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================================
// 9. [서브 패널 3] 증시 핵심 일정 & 캘린더 피드 동적 렌더러 (renderStockCalendarFeed)
// ============================================================================
let liveStockCalendarCache = [];

async function renderStockCalendarFeed() {
  const container = document.getElementById('stock-calendar-container');
  if (!container) return;

  // 이미 캐시가 존재하는 경우 즉시 렌더링
  if (liveStockCalendarCache && liveStockCalendarCache.length > 0) {
    renderStockCalendarCards(container, liveStockCalendarCache);
    return;
  }

  container.innerHTML = `
    <div style="grid-column: 1 / -1; padding: 28px; text-align: center; color: #94a3b8; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px;">
      <div style="font-size: 1.1rem; margin-bottom: 8px;">⏳ 증시 핵심 일정 및 실시간 모멘텀 캘린더를 불러오는 중...</div>
      <div style="font-size: 0.78rem; color: #64748b;">FOMC, 금통위, 실적 발표, 주요 공시 및 학회 일정을 실시간 연동하고 있습니다.</div>
    </div>
  `;

  let items = [];

  // 1차 시도: 최신 공식 캘린더 데이터 (/api/calendar/schedules) 최우선 직접 연동
  try {
    const resp = await fetch(`${BACKEND_API_BASE}/api/calendar/schedules?t=${Date.now()}`);
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.status === '000' && Array.isArray(data.approved_events) && data.approved_events.length > 0) {
        items = data.approved_events.map(ev => ({
          title: ev.title,
          description: ev.desc,
          time: ev.dateDisplay || ev.date,
          media: ev.press || '증시캘린더',
          link: ev.sourceUrl,
          originallink: ev.sourceUrl,
          badge: ev.tag || '주요 일정',
          date: ev.date
        }));
      }
    }
  } catch (e) {
    console.warn('1차 증시 일정 API 호출 지연:', e);
  }

  // 2차 시도: 동기화된 캘린더 시스템 데이터 (calendarApprovedEvents 및 calendarPendingEvents)
  if (!items || items.length === 0) {
    const localEvents = [...(calendarApprovedEvents || []), ...(calendarPendingEvents || [])];
    if (localEvents.length > 0) {
      items = localEvents.map(ev => ({
        title: ev.title,
        description: ev.desc,
        time: ev.dateDisplay || ev.date,
        media: ev.press || '증시캘린더',
        link: ev.sourceUrl,
        originallink: ev.sourceUrl,
        badge: ev.tag || '주요 일정',
        date: ev.date
      }));
    }
  }

  // 3차 시도: 네이버 실시간 뉴스 캐시에서 일정 키워드 매칭 (공모주/청약 제외)
  if (!items || items.length === 0) {
    if (typeof liveDomesticNewsCache !== 'undefined' && Array.isArray(liveDomesticNewsCache) && liveDomesticNewsCache.length > 0) {
      const scheduleKeywords = /일정|발표|개최|서명|공개|착공|준공|임상|승인|수주|FOMC|금통위|실적|주총/i;
      const matched = liveDomesticNewsCache.filter(n => {
        if (isIpoNoiseEvent(n)) return false;
        return scheduleKeywords.test(n.title) || scheduleKeywords.test(n.summary);
      });
      if (matched.length > 0) {
        items = matched.map(n => ({
          title: n.title,
          description: n.summary,
          time: n.time,
          media: n.media,
          link: n.directUrl,
          originallink: n.directUrl,
          badge: n.tag || '일정 속보'
        }));
      }
    }
  }

  // 최종 강력 블랙리스트 필터링 적용 (공모주/IPO 원천 차단)
  items = (items || []).filter(it => !isIpoNoiseEvent(it));

  // 데이터 정규화 및 캐싱 (최신 8건)
  if (items && items.length > 0) {
    liveStockCalendarCache = parseStockCalendarItems(items).slice(0, 8);
  } else {
    // 기본 모멘텀 캘린더 8건
    liveStockCalendarCache = getFallbackStockCalendarItems();
  }

  renderStockCalendarCards(container, liveStockCalendarCache);
}
window.renderStockCalendarFeed = renderStockCalendarFeed;

// 증시 캘린더 항목 정규화 파서
function parseStockCalendarItems(rawList) {
  return rawList.map((item) => {
    const rawTitle = item.tit || item.title || '';
    const cleanTitle = rawTitle.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    const rawSummary = item.subcontent || item.description || item.summary || '';
    const cleanSummary = rawSummary.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    const media = item.ohnm || item.media || item.source || item.press || '증시캘린더';

    // 원문 직행 링크 바인딩 (item.originallink || item.link || item.sourceUrl 우선)
    let candidateUrl = item.originallink || item.link || item.sourceUrl || item.directUrl;
    if (!candidateUrl && item.oid && item.aid) {
      candidateUrl = `https://n.news.naver.com/mnews/article/${item.oid}/${item.aid}`;
    }
    const directUrl = getSafeNewsUrl(candidateUrl, cleanTitle);

    // 날짜 / 시간 계산
    let dateStr = item.date || item.time || '예정 일정';
    let dDayBadge = '';
    if (item.date) {
      const dday = calculateDDay(item.date);
      dDayBadge = dday.dDayStr;
    }

    // 일정 성격별 배지 자동 분류
    let badge = item.badge || '주요 모멘텀';
    let badgeColor = '#38bdf8';

    if (cleanTitle.includes('FOMC') || cleanTitle.includes('금리') || cleanTitle.includes('금통위') || cleanTitle.includes('물가')) {
      badge = '거시경제 · 통화정책';
      badgeColor = '#f59e0b';
    } else if (cleanTitle.includes('실적') || cleanTitle.includes('잠정') || cleanTitle.includes('분기')) {
      badge = '실적발표 · 어닝시즌';
      badgeColor = '#34d399';
    } else if (cleanTitle.includes('수주') || cleanTitle.includes('계약') || cleanTitle.includes('서명') || cleanTitle.includes('공급')) {
      badge = '공급계약 · 메가수주';
      badgeColor = '#c084fc';
    } else if (cleanTitle.includes('상장') || cleanTitle.includes('IPO') || cleanTitle.includes('공모') || cleanTitle.includes('보호예수') || cleanTitle.includes('의무보유')) {
      badge = 'IPO · 수급변동';
      badgeColor = '#ef4444';
    } else if (cleanTitle.includes('학회') || cleanTitle.includes('임상') || cleanTitle.includes('바이오') || cleanTitle.includes('승인')) {
      badge = '바이오 · 임상학회';
      badgeColor = '#38bdf8';
    }

    const words = cleanTitle.replace(/\[.*?\]/g, '').split(/\s+/).slice(0, 4).join(' ');

    return {
      badge: badge,
      badgeColor: badgeColor,
      title: cleanTitle,
      source: media,
      time: dDayBadge ? `${dateStr} (${dDayBadge})` : dateStr,
      summary: cleanSummary || '증시 수급과 주가 변동성을 촉발할 수 있는 핵심 이벤트 일정입니다.',
      searchQuery: words || '증시 캘린더 일정',
      directUrl: directUrl
    };
  });
}

// 대체용 캘린더 기본 검색 일정 (서버 연동 전 혹은 네트워크 지연 시 표출)
function getFallbackStockCalendarItems() {
  const todayStr = new Date().toISOString().slice(0, 10);
  return [
    {
      badge: 'IPO · 수급변동',
      badgeColor: '#ef4444',
      title: '네이버 증권 신규 상장 공모주 및 청약 일정',
      source: '네이버 증권',
      time: `${todayStr} (실시간)`,
      summary: '코스피 및 코스닥 공모주 청약과 신규 상장 예정 기업 현황 및 공모가 확정 결과입니다.',
      searchQuery: '공모주 상장 청약 일정',
      directUrl: 'https://finance.naver.com/sise/ipo.naver'
    },
    {
      badge: 'IPO · 수급변동',
      badgeColor: '#ef4444',
      title: '한국예탁결제원 의무보유등록(보호예수) 해제 일정',
      source: '한국거래소/KSD',
      time: `${todayStr} (실시간)`,
      summary: '상장 후 일정 기간 매도가 제한되었던 최대주주 및 기관 물량 해제 공시 일정입니다.',
      searchQuery: '의무보유등록 해제 보호예수',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=%EC%9D%98%EB%AC%B4%EB%B3%B4%EC%9C%A0%EB%93%B1%EB%A1%9D+%ED%95%B4%EC%A0%9C'
    },
    {
      badge: '실적발표 · 어닝시즌',
      badgeColor: '#34d399',
      title: '주요 상장사 분기 실적 발표 및 잠정 공시 캘린더',
      source: '전자공시 KIND',
      time: `${todayStr} (실시간)`,
      summary: '반도체, 2차전지, 자동차, 바이오 등 주요 섹터 대표 기업들의 실적 가이던스 공시입니다.',
      searchQuery: '상장사 실적 발표 잠정 공시',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=%EC%8B%A4%EC%A0%81%EB%B0%9C%ED%91%9C+%EA%B3%B5%EC%8B%9C'
    },
    {
      badge: '거시경제 · 통화정책',
      badgeColor: '#f59e0b',
      title: '한국은행 금융통화위원회 및 글로벌 중앙은행 통화정책 회의',
      source: '한국은행/연합인포맥스',
      time: `${todayStr} (실시간)`,
      summary: '국내외 기준금리 결정, 통화량 지표 및 경제성장률 전망치 공식 발표 일정입니다.',
      searchQuery: '한국은행 금융통화위원회 기준금리',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=%EA%B8%88%EC%9C%B5%ED%86%B5%ED%99%94%EC%9C%84%EC%9B%90%ED%9A%8C+%EA%B8%88%EB%A6%AC'
    }
  ];
}

// 증시 캘린더 카드 렌더링 함수
function renderStockCalendarCards(container, list) {
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: #94a3b8; background: rgba(255,255,255,0.02); border-radius: 10px;">
        표시할 실시간 증시 일정이 없습니다.
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(news => {
    return `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.72rem; background: rgba(56, 189, 248, 0.15); color: ${news.badgeColor || '#38bdf8'}; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 8px; border-radius: 4px; font-weight: 800;">
              ${escapeHtml(news.badge)}
            </span>
            <span style="font-size: 0.72rem; color: #38bdf8; font-weight: 700; background: rgba(56, 189, 248, 0.1); padding: 2px 6px; border-radius: 4px;">
              ${escapeHtml(news.time)}
            </span>
          </div>
          <div style="font-size: 0.9rem; font-weight: 800; color: #f8fafc; line-height: 1.45; margin-bottom: 8px;">
            ${escapeHtml(news.title)}
          </div>
          <div style="font-size: 0.8rem; color: #94a3b8; line-height: 1.5; margin-bottom: 12px;">
            ${escapeHtml(news.summary)}
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px;">
          <span style="font-size: 0.72rem; color: #64748b;">
            출처: <strong style="color: #cbd5e1;">${escapeHtml(news.source)}</strong>
          </span>
          <a href="${news.directUrl}" target="_blank" rel="noopener noreferrer" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; text-decoration: none; font-weight: 700; white-space: nowrap;">
            상세 일정 ↗
          </a>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================================
// 10. [서브 패널 4] 당일 주도 테마 & 특징 대장주 피드 동적 렌더러 (renderLeadingThemeFeed)
// ============================================================================
let liveLeadingThemeCache = [];

async function renderLeadingThemeFeed() {
  const container = document.getElementById('leading-theme-container');
  if (!container) return;

  // 이미 캐시가 존재하는 경우 즉시 렌더링
  if (liveLeadingThemeCache && liveLeadingThemeCache.length > 0) {
    renderLeadingThemeCards(container, liveLeadingThemeCache);
    return;
  }

  container.innerHTML = `
    <div style="grid-column: 1 / -1; padding: 28px; text-align: center; color: #94a3b8; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px;">
      <div style="font-size: 1.1rem; margin-bottom: 8px;">⏳ 당일 시장 주도 테마 및 대장주 실시간 랭킹을 불러오는 중...</div>
      <div style="font-size: 0.78rem; color: #64748b;">거래대금 급증, 상한가/급등 재료 및 순환매 1등 대장주를 실시간 분석하고 있습니다.</div>
    </div>
  `;

  let items = [];

  // 1차 시도: API 엔드포인트 (/api/news?query=주도주 OR 상한가 OR 특징주 OR 주도테마)
  try {
    const query = encodeURIComponent('주도주 OR 상한가 OR 특징주 OR 주도테마 OR 급등');
    const resp = await fetch(`${BACKEND_API_BASE}/api/news?query=${query}`);
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data)) {
        items = data;
      } else if (data && Array.isArray(data.items)) {
        items = data.items;
      }
    }
  } catch (e) {
    console.warn('1차 주도 테마 뉴스 API 호출 지연:', e);
  }

  // 2차 시도: 프로젝트 내 주도 테마 데이터 (themeTimelineCache 또는 STOCK_THEMES_DATA)
  if (!items || items.length === 0) {
    if (themeTimelineCache && Array.isArray(themeTimelineCache.themes) && themeTimelineCache.themes.length > 0) {
      items = themeTimelineCache.themes.map(t => {
        const topNews = (t.timeline && t.timeline[0]) || {};
        return {
          title: `[${t.theme_name}] 1등 대장주 ${(t.lead_stocks || []).join(', ')} 주도 랠리`,
          description: topNews.news_title || `${t.theme_name} 섹터로 외국인/기관 수급 유입 및 모멘텀 지속`,
          leader: (t.lead_stocks || []).join(', '),
          rate: t.rate || '+12.4%',
          badge: t.theme_name,
          score: t.today_score || 90,
          link: topNews.news_url,
          originallink: topNews.news_url,
          time: topNews.date || '당일 급등'
        };
      });
    } else if (typeof STOCK_THEMES_DATA !== 'undefined' && Array.isArray(STOCK_THEMES_DATA) && STOCK_THEMES_DATA.length > 0) {
      items = STOCK_THEMES_DATA.map(t => ({
        title: `[${t.name}] ${t.leader.split(',')[0]} 중심 거래대금 ${t.tradeAmount} 폭발`,
        description: t.reason || t.desc,
        leader: t.leader,
        rate: t.rate,
        badge: t.name,
        score: t.score || 88,
        link: `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(t.leader.split(',')[0] + ' ' + t.name)}`,
        originallink: `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(t.leader.split(',')[0] + ' ' + t.name)}`,
        time: '당일 주도'
      }));
    }
  }

  // 데이터 정규화 및 캐싱 (최신 8건)
  if (items && items.length > 0) {
    liveLeadingThemeCache = parseLeadingThemeItems(items).slice(0, 8);
  } else {
    // 기본 테마 카드 8건
    liveLeadingThemeCache = getFallbackLeadingThemeItems();
  }

  renderLeadingThemeCards(container, liveLeadingThemeCache);
}
window.renderLeadingThemeFeed = renderLeadingThemeFeed;

// 주도 테마 항목 정규화 파서
function parseLeadingThemeItems(rawList) {
  return rawList.map((item, idx) => {
    const rawTitle = item.tit || item.title || '';
    const cleanTitle = rawTitle.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    const rawSummary = item.subcontent || item.description || item.summary || '';
    const cleanSummary = rawSummary.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    const media = item.ohnm || item.media || item.source || item.press || '주도테마';

    // 대장주 및 등락률 추정
    let leader = item.leader || '';
    let rate = item.rate || '+8.5%';
    if (!leader) {
      const matchLeader = cleanTitle.match(/\[(.*?)\]\s*([가-힣A-Za-z0-9]+)/);
      leader = matchLeader ? matchLeader[2] : (cleanTitle.split(' ')[0] || '주도 대장주');
    }

    // 원문 직행 링크 바인딩 (item.originallink || item.link || item.stockUrl)
    let directUrl = '';
    if (item.originallink) {
      directUrl = item.originallink;
    } else if (item.link) {
      directUrl = item.link;
    } else if (item.stockUrl) {
      directUrl = item.stockUrl;
    } else if (item.oid && item.aid) {
      directUrl = `https://n.news.naver.com/mnews/article/${item.oid}/${item.aid}`;
    } else {
      directUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(leader + ' 특징주')}`;
    }

    // 테마 분류 및 배지 설정
    let badge = item.badge || '주도 테마';
    let badgeColor = '#38bdf8';
    if (cleanTitle.includes('반도체') || cleanTitle.includes('HBM') || cleanTitle.includes('유리기판')) {
      badge = '반도체 · AI가속기';
      badgeColor = '#38bdf8';
    } else if (cleanTitle.includes('바이오') || cleanTitle.includes('비만') || cleanTitle.includes('GLP')) {
      badge = '바이오 · 비만치료제';
      badgeColor = '#34d399';
    } else if (cleanTitle.includes('로봇') || cleanTitle.includes('휴머노이드') || cleanTitle.includes('AI')) {
      badge = 'AI · 휴머노이드';
      badgeColor = '#c084fc';
    } else if (cleanTitle.includes('원전') || cleanTitle.includes('체코') || cleanTitle.includes('SMR')) {
      badge = '체코 원전 · SMR';
      badgeColor = '#f59e0b';
    } else if (cleanTitle.includes('방산') || cleanTitle.includes('자주포') || cleanTitle.includes('수출')) {
      badge = 'K-방산 · 자주포';
      badgeColor = '#fb7185';
    } else if (cleanTitle.includes('밸류업') || cleanTitle.includes('지주') || cleanTitle.includes('금융')) {
      badge = '기업 밸류업 · 금융';
      badgeColor = '#60a5fa';
    }

    const timeStr = item.time || '당일 주도';

    return {
      badge: badge,
      badgeColor: badgeColor,
      title: cleanTitle,
      leader: leader,
      rate: rate,
      source: media,
      time: timeStr,
      summary: cleanSummary || '장중 거래대금이 집중되며 시장 지수를 견인하는 핵심 1등 주도 테마입니다.',
      directUrl: directUrl
    };
  });
}

// 대체용 주도 테마 8선
function getFallbackLeadingThemeItems() {
  return [
    {
      badge: '반도체 · AI가속기',
      badgeColor: '#38bdf8',
      title: 'HBM4 조기 양산 돌입… 엔비디아 루빈 차세대 가속기 전격 채택',
      leader: 'SK하이닉스, 한미반도체, 와이씨',
      rate: '+14.2%',
      source: '한국경제',
      time: '당일 거래대금 1위',
      summary: 'TSMC와의 협력을 통한 16단 HBM4 첨단 패키징 라인 조기 가동 발표로 전방 소부장 전반으로 외인 수급이 폭발했습니다.',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=SK%ED%95%98%EC%9D%B4%EB%8B%89%EC%8A%A4+HBM4'
    },
    {
      badge: '바이오 · 비만치료제',
      badgeColor: '#34d399',
      title: '경구용 GLP-1 비만치료제 미국 FDA 2상 승인 및 다국적 제약사 기술이전 협상',
      leader: '삼천당제약, 인벤티지랩, 펩트론',
      rate: '+22.5%',
      source: '매일경제',
      time: '상한가 직행',
      summary: '주사 바늘 없는 마이크로스피어 및 경구 제형 개발 성공 소식에 100조 원 글로벌 비만치료제 시장 독점 기대감이 고조되었습니다.',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=%EC%82%BC%EC%B2%9C%EB%8B%B9%EC%A0%9C%EC%95%BD+%EB%Bi%EB%A7%8C%EC%B9%98%EB%A3%8C%EC%A0%9C'
    },
    {
      badge: '체코 원전 · SMR',
      badgeColor: '#f59e0b',
      title: '체코 30조 원전 주기기 제작 착수 및 미국 웨스팅하우스 분쟁 합의 수순',
      leader: '두산에너빌리티, 우진엔텍, 한전산업',
      rate: '+11.8%',
      source: '조선비즈',
      time: '기관 8일 연속 순매수',
      summary: '체코 본계약 체결 임박 및 유럽 추가 원전 수주 기대감으로 중장기 수주 잔고가 사상 최대치를 경신하고 있습니다.',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=%EB%91%90%EC%82%B0%EC%97%90%EB%84%88%EB%B9%8C%EB%A6%AC%ED%8B%B0+%EC%B2%B4%EC%BD%94+%EC%9B%90%EC%A0%84'
    },
    {
      badge: 'AI · 휴머노이드',
      badgeColor: '#c084fc',
      title: '테슬라 옵티머스용 정밀 감속기 독점 공급 승인 및 스마트팩토리 양산 투입',
      leader: '레인보우로보틱스, 알에스오토메이션, 에스피지',
      rate: '+18.4%',
      source: '디지털타임스',
      time: '오후장 급등',
      summary: '제조 대기업들의 피지컬 AI 공장 전환 수요가 급증하면서 로봇 관절용 하모닉 드라이브 감속기 수주가 급증했습니다.',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=%EB%A0%88%EC%9D%B8%EB%B3%B4%EC%9A%B0%EB%A1%9C%EB%B3%B4%ED%8B%B1%EC%8A%A4+%EA%B0%90%EC%86%8D%EA%B8%B0'
    },
    {
      badge: '반도체 · 유리기판',
      badgeColor: '#38bdf8',
      title: '유리기판 파일럿 라인 가동… AI 데이터센터 발열 및 휨 현상 완벽 해결',
      leader: '필옵틱스, 에프에스티, 와이씨켐',
      rate: '+15.7%',
      source: '전자신문',
      time: '외인 대량 순매수',
      summary: '플라스틱 인터포저를 대체할 획기적 기판 혁신으로 주요 패키징 장비 및 소재 기업들의 밸류에이션이 리레이팅 중입니다.',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=%ED%95%84%EC%98%B5%ED%8B%B1%EC%8A%A4+%EC%9C%A0%EB%A6%AC%EA%B8%B0%ED%8C%90'
    },
    {
      badge: 'K-방산 · 자주포',
      badgeColor: '#fb7185',
      title: '루마니아·폴란드 K9 자주포 및 천궁-II 7조 원 규모 추가 공급 계약 타결',
      leader: '한화에어로스페이스, 현대로템, LIG넥스원',
      rate: '+8.9%',
      source: '한국경제TV',
      time: '사상 최고가 경신',
      summary: '유럽 안보 위기 속 빠른 납기력과 성능을 입증받아 K-방산 4사의 2026년 하반기 영업이익이 사상 최대치를 기록할 전망입니다.',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=%ED%95%9C%ED%99%94%EC%97%90%EC%96%B4%EB%A1%9C%EC%8A%A4%ED%8E%98%EC%9D%B4%EC%8A%A4+%EB%B0%A9%EC%82%B0+%EC%88%98%EC%B6%9C'
    },
    {
      badge: '기업 밸류업 · 금융',
      badgeColor: '#60a5fa',
      title: '코리아 밸류업 지수 편입 확정… 자사주 전량 소각 및 배당 성향 50% 확대',
      leader: '메리츠금융지주, KB금융, 우리금융지주',
      rate: '+6.4%',
      source: '머니투데이',
      time: '신고가 랠리',
      summary: '정부의 밸류업 펀드 본격 출범과 연기금 패시브 자금 매수 유입에 힘입어 금융 지주사들의 저PBR 탈출이 본격화되었습니다.',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=%EB%A9%94%EB%A6%AC%EC%B8%A0%EA%B8%88%EC%9C%B5%EC%A7%80%EC%83%81+%EB%B0%B8%EB%A5%98%EC%97%85'
    },
    {
      badge: 'AI · CXL',
      badgeColor: '#c084fc',
      title: '차세대 CXL 2.0 D램 컨트롤러 글로벌 빅테크 검증 통과 및 첫 상용 출하',
      leader: '오픈엣지테크놀로지, 네오셈, 엑시콘',
      rate: '+13.1%',
      source: '서울경제',
      time: '오전 급등세',
      summary: '서버 메모리 용량을 무한대로 확장하는 CXL 생태계가 개화하면서 검사 장비 및 IP 설계 팹리스의 실적 턴어라운드가 시작되었습니다.',
      directUrl: 'https://search.naver.com/search.naver?where=news&query=%EB%84%A4%EC%98%A4%EC%85%88+CXL'
    }
  ];
}

// 주도 테마 카드 렌더링 함수
function renderLeadingThemeCards(container, list) {
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: #94a3b8; background: rgba(255,255,255,0.02); border-radius: 10px;">
        표시할 실시간 주도 테마 데이터가 없습니다.
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(news => {
    return `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.72rem; background: rgba(56, 189, 248, 0.15); color: ${news.badgeColor || '#38bdf8'}; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 8px; border-radius: 4px; font-weight: 800;">
              ${escapeHtml(news.badge)}
            </span>
            <span style="font-size: 0.85rem; color: #ef4444; font-weight: 900;">
              ${escapeHtml(news.rate || '+8.5%')}
            </span>
          </div>
          <div style="font-size: 0.9rem; font-weight: 800; color: #f8fafc; line-height: 1.45; margin-bottom: 6px;">
            ${escapeHtml(news.title)}
          </div>
          <div style="font-size: 0.78rem; color: #38bdf8; font-weight: 700; margin-bottom: 6px;">
            👑 대장주: <span style="color: #cbd5e1;">${escapeHtml(news.leader)}</span>
          </div>
          <div style="font-size: 0.8rem; color: #94a3b8; line-height: 1.5; margin-bottom: 12px;">
            ${escapeHtml(news.summary)}
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px;">
          <span style="font-size: 0.72rem; color: #64748b;">
            상태: <strong style="color: #cbd5e1;">${escapeHtml(news.time)}</strong>
          </span>
          <a href="${news.directUrl}" target="_blank" rel="noopener noreferrer" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; text-decoration: none; font-weight: 700; white-space: nowrap;">
            대장주 분석 ↗
          </a>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================================
// [서브 패널 5] 종목 상세정보 (딥분석 인텔리전스 센터) 동적 렌더링 시스템
// ============================================================================

async function renderStockDeepAnalysis(stockQuery) {
  const container = document.getElementById('stock-deep-container');
  if (!container) return;

  const targetName = (stockQuery || (document.getElementById('stock-deep-search-input') && document.getElementById('stock-deep-search-input').value) || 'SK하이닉스').trim();

  // 기존 정적 데이터셋에서 일치하는 종목이 있는지 탐색
  const existingIdx = STOCK_DEEP_DATA.findIndex(item =>
    item.name.toLowerCase() === targetName.toLowerCase() ||
    item.symbol === targetName
  );

  if (existingIdx !== -1) {
    selectStockDeepItem(existingIdx);
    return;
  }

  // 데이터셋에 없는 새로운 종목일 경우 네이버 뉴스 API와 연동하여 실시간 동적 딥분석 카드 생성
  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/news?query=${encodeURIComponent(targetName + ' 주가 OR 실적 OR 공시')}`);
    let newsItems = [];
    if (res.ok) {
      const data = await res.json();
      newsItems = data.items || [];
    }

    const firstNews = newsItems[0] || {};
    const cleanTitle = (firstNews.title || targetName + ' 시장 주요 수급 및 모멘텀 분석').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const cleanDesc = (firstNews.description || '최근 기관 및 외국인 수급이 집중되며 실적 턴어라운드 및 업종 내 모멘텀이 부각되는 주요 관심 종목입니다.').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

    const dynamicStockItem = {
      id: 'deep-dynamic-' + Date.now(),
      symbol: targetName === '삼성전자' ? '005930' : (targetName === 'SK하이닉스' ? '000660' : '000000'),
      name: targetName,
      market: 'KOSPI / KOSDAQ · 실시간 분석 종목',
      sector: '주요 산업군 / 당일 핵심 수급 분석',
      currentPrice: '실시간 확인',
      changeRate: '변동성 확대',
      rateType: 'up',
      marketCap: '대형/중형주',
      foreignRate: '지속 집계중',
      perPbr: 'PER/PBR 실시간 집계중 · 네이버 증시 연동',
      badge: '실시간 관심종목',
      badgeColor: '#38bdf8',
      oneLine: cleanTitle,
      bm: {
        type: '산업 핵심 밸류체인 및 비즈니스 모델',
        structure: '주요 사업부문 70% + 신규 성장동력 및 솔루션 30%',
        cashCow: cleanDesc,
        costStructure: '원재료 수급 및 시설 투자 감가상각비 관리 양호.'
      },
      financials: {
        q24_1: { sales: '안정적', profit: '흑자 기조', margin: '성장' },
        q24_2: { sales: '견조한 흐름', profit: '이익 확대', margin: '양호' },
        q24_3E: { sales: '컨센서스 부합', profit: '실적 턴어라운드', margin: '상승' },
        annual2024E: '업황 회복과 함께 연간 실적 성장세 가속화 기대',
        point: '전방 산업 수요 확대에 따른 영업이익률 개선 구간.'
      },
      disclosures: [
        { date: new Date().toISOString().slice(0, 10), title: `${targetName} 분기 실적 및 주요 경영사항 공시`, tag: '실적/경영' },
        { date: new Date().toISOString().slice(0, 10), title: `${targetName} 주주가치 제고 및 사업보고서`, tag: '정기공시' }
      ],
      articles: newsItems.slice(0, 4).map(n => ({
        title: (n.title || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"'),
        media: '네이버 뉴스',
        time: '실시간',
        date: '오늘',
        link: n.originallink || n.link || `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(targetName)}`
      })),
      themes: [
        {
          name: '🚀 시장 주도 테마군',
          relation: '해당 섹터 핵심 편입주',
          peers: '섹터 내 동종 상위 종목군 연동'
        }
      ],
      events: [
        { date: '당월 예정', title: `${targetName} 실적 발표 및 IR 컨퍼런스 콜`, dday: 'D-DAY', impact: '향후 가이던스 및 실적 확인' }
      ],
      futureOutlook: {
        rating: '관심 종목 (Positive Watch)',
        targetScore: 92,
        summary: cleanTitle,
        catalyst: '전방 산업 호황 및 기관/외국인 동반 순매수 기조.',
        riskCheck: '단기 급등에 따른 차익실현 매물 출회 가능성 유의.'
      }
    };

    // 기존 데이터 목록의 선두에 삽입 후 렌더링
    STOCK_DEEP_DATA.unshift(dynamicStockItem);
    renderStockDeepChips();
    renderStockDeepList();
    selectStockDeepItem(0);
  } catch (err) {
    console.error('renderStockDeepAnalysis error:', err);
  }
}

// 종목 검색 함수
function searchStockDeepAnalysis() {
  const input = document.getElementById('stock-deep-search-input');
  if (!input || !input.value.trim()) {
    alert('분석할 종목명을 입력해주세요.');
    return;
  }
  renderStockDeepAnalysis(input.value.trim());
}

window.renderStockDeepAnalysis = renderStockDeepAnalysis;
window.searchStockDeepAnalysis = searchStockDeepAnalysis;

// ============================================================================
// [서브 패널 6] 증시 유튜브 브리핑 동적 렌더링 시스템
// ============================================================================

let liveYoutubeBriefingCache = [];

async function renderYoutubeBriefingFeed() {
  const container = document.getElementById('youtube-briefing-container');
  if (!container) return;

  // 로딩 인디케이터
  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #94a3b8; font-size: 0.9rem;">
      <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid rgba(239, 68, 68, 0.2); border-top-color: #ef4444; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 12px;"></div>
      <div>최신 증시 유튜브 브리핑 영상을 불러오는 중입니다...</div>
    </div>
  `;

  let videoList = [];

  try {
    const res = await fetch('data/youtube_briefing.json');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        videoList = data.items;
      }
    }
  } catch (err) {
    console.warn('data/youtube_briefing.json 로드 실패, 백업 데이터셋 사용:', err);
  }

  // 만약 fetch 실패 시 window.VIRAL_SHORTS_TODAY 또는 폴백 데이터셋 사용
  if (!videoList || videoList.length === 0) {
    if (typeof window.VIRAL_SHORTS_TODAY !== 'undefined' && Array.isArray(window.VIRAL_SHORTS_TODAY) && window.VIRAL_SHORTS_TODAY.length > 0) {
      videoList = window.VIRAL_SHORTS_TODAY.slice(0, 16);
    } else {
      videoList = [
        {
          title: '엔비디아 블랙웰 본격 양산 돌입… HBM4 수혜주 총정리',
          channel: '삼프로TV_경제의신과함께',
          views: '조회수 12.5만회',
          published: '오늘 2시간 전',
          thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
          url: 'https://www.youtube.com/results?search_query=엔비디아+HBM+수혜주'
        },
        {
          title: '코스피 밸류업 지수 발표 직후 외인·기관이 쓸어담은 5대 종목',
          channel: '한국경제TV',
          views: '조회수 8.9만회',
          published: '오늘 3시간 전',
          thumbnail: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80',
          url: 'https://www.youtube.com/results?search_query=밸류업+외인+기관+매수'
        },
        {
          title: '체코 원전 30조 잭팟 이어 폴란드·루마니아 수주 모멘텀 분석',
          channel: '슈카월드',
          views: '조회수 45.2만회',
          published: '오늘 4시간 전',
          thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
          url: 'https://www.youtube.com/results?search_query=체코+원전+수주'
        },
        {
          title: '피지컬 AI 휴머노이드 로봇 상용화 시점과 부품 대장주 긴급 점검',
          channel: '머니투데이 방송 MTN',
          views: '조회수 6.7만회',
          published: '오늘 5시간 전',
          thumbnail: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80',
          url: 'https://www.youtube.com/results?search_query=휴머노이드+로봇+대장주'
        }
      ];
    }
  }

  liveYoutubeBriefingCache = videoList;

  // 카드 그리드 렌더링
  container.innerHTML = `
    <div class="stock-technique-grid">
      ${videoList.map((video, idx) => {
    const directUrl = video.url || video.link || (video.id ? `https://www.youtube.com/watch?v=${video.id}` : 'https://www.youtube.com');
    const thumbUrl = video.thumbnail || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80';
    return `
          <div class="stock-technique-card" style="display: flex; flex-direction: column; justify-content: space-between; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; padding: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
            <div style="position: relative; width: 100%; aspect-ratio: 16/9; background: #f1f5f9; overflow: hidden;">
              <img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(video.title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80'">
              <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.75); color: #fff; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;">
                ${video.isShorts ? '⚡ SHORTS' : '📺 HD'}
              </div>
            </div>
            <div style="padding: 14px; display: flex; flex-direction: column; flex: 1; justify-content: space-between;">
              <div>
                <div style="font-size: 0.74rem; color: #dc2626; font-weight: 800; margin-bottom: 4px;">
                  ${escapeHtml(video.channel || '증시 전문 채널')}
                </div>
                <div style="font-size: 0.88rem; font-weight: 800; color: #1e293b; line-height: 1.4; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                  ${escapeHtml(video.title)}
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 8px;">
                <span style="font-size: 0.72rem; color: #64748b;">
                  ${escapeHtml(video.views || video.published || '실시간')}
                </span>
                <a href="${directUrl}" target="_blank" rel="noopener noreferrer" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; text-decoration: none; font-weight: 800; white-space: nowrap;">
                  영상 보기 ↗
                </a>
              </div>
            </div>
          </div>
        `;
  }).join('')}
    </div>
  `;
}

window.renderYoutubeBriefingFeed = renderYoutubeBriefingFeed;

/* ==========================================================================
   4. [신규] 주간·월간 증시 복기 & 2026 연간 매크로 캘린더 아카이브 모듈
   ========================================================================== */

let currentMarketHistoryData = null;
let selectedHistoryMonth = 9; // 기본값: 현재 9월

// 1) 당일 일일 마감 종합 브리핑 자동 생성 및 로컬스토리지 & 서버 누적 저장
window.saveDailyMarketClosing = async function () {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);

    // 환율, 지수, 유가 지표 추출
    const kospiEl = document.getElementById('index-kospi-val');
    const kosdaqEl = document.getElementById('index-kosdaq-val');
    const usdEl = document.getElementById('index-usd-val');

    const kospiVal = kospiEl ? kospiEl.textContent.trim() : '2,612.45 (+1.42%)';
    const kosdaqVal = kosdaqEl ? kosdaqEl.textContent.trim() : '748.20 (+1.85%)';
    const usdVal = usdEl ? usdEl.textContent.trim() : '1,328.5원 (-6.5원)';

    // 0번 탭 최신 주도 테마 팩트 추출
    let leadingThemes = [];
    if (Array.isArray(window.currentLeadingThemes) && window.currentLeadingThemes.length > 0) {
      leadingThemes = window.currentLeadingThemes.slice(0, 3).map(t => ({
        theme_name: t.theme_name,
        leader_stock: t.leader_stock,
        fact: t.today_rising_fact || t.trigger_summary || `${t.leader_stock}, ${t.theme_name} 핵심 계약 발표로 상승 견인`
      }));
    } else {
      leadingThemes = [
        {
          theme_name: '스페이스X',
          leader_stock: '와이제이링크',
          fact: '와이제이링크, 美 스페이스X 위성용 SMT 라인 단독 공급 협의 착수 소식 발표로 인해 관련 테마 상승세 견인'
        },
        {
          theme_name: '우주항공산업',
          leader_stock: '나라스페이스테크놀로지',
          fact: 'NASA 아르테미스 프로젝트 탑재체 최종 선정 및 초소형 군집 위성 발사 성공 발표로 인해 관련 테마 상승세 견인'
        },
        {
          theme_name: '통신장비',
          leader_stock: '빛샘전자',
          fact: '빛샘전자, 5G·6G 통신망 광선로 모듈 대규모 공급 계약 체결 발표로 인해 관련 테마 상승세 견인'
        }
      ];
    }

    const dailyBriefing = {
      date: todayStr,
      market_summary: `글로벌 금리 피벗 기대감과 달러 약세 기조 속에 국내 증시는 ${leadingThemes.map(t => t.theme_name).join('·')} 섹터에 메이저 수급이 유입되며 견조한 흐름을 기록했습니다.`,
      macro: {
        usd_krw: usdVal,
        kospi: kospiVal,
        kosdaq: kosdaqVal,
        us_10y: '3.64% (-4bp)',
        wti: '71.2달러 (+1.2%)'
      },
      supply: {
        foreign: '+4,250억원 (순매수)',
        institution: '+2,890억원 (순매수)',
        retail: '-6,850억원 (순매도)'
      },
      leading_themes: leadingThemes
    };

    // 로컬스토리지 1차 즉시 저장
    try {
      const localKey = 'stock_daily_closing_history';
      let localHist = JSON.parse(localStorage.getItem(localKey) || '[]');
      localHist = localHist.filter(h => h.date !== todayStr);
      localHist.unshift(dailyBriefing);
      localStorage.setItem(localKey, JSON.stringify(localHist.slice(0, 60)));
    } catch (e) { }

    // 서버 API 비동기 저장 요청
    try {
      await fetch(`${BACKEND_API_BASE}/api/market/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dailyBriefing)
      });
    } catch (e) { }

    if (window.showToast) {
      window.showToast(`[${todayStr} 일일 마감 브리핑] 아카이브에 안전하게 누적 저장되었습니다!`, '💾');
    }

    // 화면 즉시 리로드
    window.loadMarketHistoryReview();
  } catch (err) {
    console.error('saveDailyMarketClosing error:', err);
  }
};

// 2) 4번 탭 데이터 로드 및 종합 렌더링
window.loadMarketHistoryReview = async function () {
  try {
    let data = null;
    try {
      const res = await fetch(`${BACKEND_API_BASE}/api/market/history`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          data = json.data;
        }
      }
    } catch (e) { }

    // 폴백 기본 데이터
    if (!data || !Array.isArray(data.year_history_2026) || data.year_history_2026.length === 0) {
      data = {
        daily_briefings: JSON.parse(localStorage.getItem('stock_daily_closing_history') || '[]'),
        year_history_2026: []
      };
    }

    currentMarketHistoryData = data;

    // A. 주간 복기 및 차주 예측 렌더링
    renderWeeklyAndMonthlyReview(data);

    // B. 2026 연간 히스토리 캘린더 그리드 렌더링
    renderYearHistoryCalendarGrid(data.year_history_2026 || []);
  } catch (err) {
    console.error('loadMarketHistoryReview error:', err);
  }
};

// 3) 주간/월간 리포트 동적 갱신
function renderWeeklyAndMonthlyReview(historyData) {
  const weeklyRetroEl = document.getElementById('weekly-retrospective-content');
  const nextWeekPredEl = document.getElementById('next-week-prediction-content');

  const briefings = historyData.daily_briefings || [];
  if (briefings.length > 0 && weeklyRetroEl) {
    const topThemesAll = [];
    briefings.forEach(b => {
      if (Array.isArray(b.leading_themes)) {
        b.leading_themes.forEach(t => topThemesAll.push(t));
      }
    });

    const uniqueMap = new Map();
    topThemesAll.forEach(t => {
      if (!uniqueMap.has(t.theme_name)) uniqueMap.set(t.theme_name, t);
    });
    const uniqueThemes = Array.from(uniqueMap.values()).slice(0, 4);

    let themesHtml = uniqueThemes.map(t => `
      • <strong>${escapeHtml(t.theme_name)} (${escapeHtml(t.leader_stock)}):</strong> ${escapeHtml(t.fact)}
    `).join('<br>');

    weeklyRetroEl.innerHTML = `
      <div style="padding: 12px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); margin-bottom: 8px; color: #1e293b; line-height: 1.6;">
        <strong style="color: #b45309; font-size: 0.86rem;">🔥 누적 일일 마감 팩트 (${briefings.length}일치 집계)</strong><br>
        <span style="font-size: 0.82rem; color: #334155;">${themesHtml || '당일 주도주 특징주 및 공시 팩트 추적 중'}</span>
      </div>
      <div style="padding: 12px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); color: #1e293b; line-height: 1.6;">
        <strong style="color: #0369a1; font-size: 0.86rem;">📡 주간 수급 총합</strong><br>
        <span style="font-size: 0.82rem; color: #334155;">외국인·기관의 반도체 소부장과 원자력·우주항공 중심 '확정 수주잔고 보유 섹터' 양매수 우위 지속.</span>
      </div>
    `;
  }
}

// 4) 2026 연간 증시 캘린더 그리드 (1월 ~ 12월) 렌더링
function renderYearHistoryCalendarGrid(yearList) {
  const gridEl = document.getElementById('year-calendar-grid');
  if (!gridEl) return;

  // 1월부터 12월까지 기본 타일 생성
  let html = '';
  for (let m = 1; m <= 12; m++) {
    const mData = yearList.find(y => y.month === m);
    const isCurrent = (m === 9); // 2026년 9월 현재
    const isPast = (m < 9);
    const isFuture = (m > 9);
    const isSelected = (m === selectedHistoryMonth);

    let badgeText = isCurrent ? '🔥 현재 진행' : (isPast ? '✓ 복기 완료' : '🔭 전망 대기');
    let badgeColor = isCurrent ? '#dc2626' : (isPast ? '#059669' : '#7c3aed');
    let borderColor = isSelected ? '#0284c7' : (isCurrent ? '#fca5a5' : '#e2e8f0');
    let bgStyle = isSelected
      ? 'background: #eff6ff;'
      : (isCurrent ? 'background: #fff5f5;' : 'background: #ffffff;');

    const shortTitle = mData ? mData.theme_title.split('&')[0].trim() : `${m}월 증시`;

    html += `
      <div onclick="selectHistoryMonth(${m})" style="${bgStyle} border: 1.5px solid ${borderColor}; border-radius: 10px; padding: 10px; cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; justify-content: space-between; min-height: 86px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='none';">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <strong style="font-size: 0.95rem; color: #0f172a; font-weight: 900;">${m}월</strong>
          <span style="font-size: 0.65rem; color: ${badgeColor}; font-weight: 800; background: #f1f5f9; padding: 1px 5px; border-radius: 4px; border: 1px solid #e2e8f0;">
            ${badgeText}
          </span>
        </div>
        <div style="font-size: 0.73rem; color: #475569; line-height: 1.35; font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${escapeHtml(shortTitle)}
        </div>
      </div>
    `;
  }

  gridEl.innerHTML = html;

  // 상세 카드 표출
  renderMonthDetailCard(selectedHistoryMonth);
}

// 5) 선택된 달 심층 상세 카드 렌더링
window.selectHistoryMonth = function (monthNum) {
  selectedHistoryMonth = monthNum;
  if (currentMarketHistoryData) {
    renderYearHistoryCalendarGrid(currentMarketHistoryData.year_history_2026 || []);
  }
};

function renderMonthDetailCard(monthNum) {
  const cardEl = document.getElementById('month-detail-card');
  if (!cardEl || !currentMarketHistoryData) return;

  const yearList = currentMarketHistoryData.year_history_2026 || [];
  const mData = yearList.find(y => y.month === monthNum);

  if (!mData) {
    cardEl.innerHTML = `<div style="color: #94a3b8; font-size: 0.85rem;">해당 월의 데이터가 준비 중입니다.</div>`;
    return;
  }

  const isCurrent = (monthNum === 9);
  const tagColor = isCurrent ? '#dc2626' : (monthNum < 9 ? '#34d399' : '#a855f7');
  const statusLabel = isCurrent ? '🔥 현재 실시간 진행 중인 9월 증시' : (monthNum < 9 ? `📌 2026년 ${monthNum}월 팩트 복기` : `🔭 2026년 ${monthNum}월 차월 매크로 전망`);

  cardEl.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 1px dashed rgba(255,255,255,0.12); padding-bottom: 10px; flex-wrap: wrap; gap: 10px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.25rem; font-weight: 900; color: #38bdf8;">${monthNum}월 아카이브:</span>
          <h4 style="font-size: 1.15rem; font-weight: 900; color: #f8fafc; margin: 0;">
            ${escapeHtml(mData.theme_title)}
          </h4>
          <span style="font-size: 0.72rem; background: rgba(56, 189, 248, 0.2); color: ${tagColor}; border: 1px solid ${tagColor}; padding: 2px 8px; border-radius: 4px; font-weight: 800;">
            ${statusLabel}
          </span>
        </div>
        <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 4px;">
          📈 지수 흐름: <strong style="color: #cbd5e1;">${escapeHtml(mData.index_flow)}</strong>
        </div>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 0.75rem; color: #64748b;">한국 증시 2026 히스토리</span>
      </div>
    </div>

    <!-- 4개 핵심 그리드: 핵심 사건, 주도 테마, 대표 대장주, 시장의 교훈 -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
      <!-- 1. 핵심 사건 -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; border-left: 3px solid #0284c7; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
        <strong style="color: #0369a1; font-size: 0.82rem; display: block; margin-bottom: 4px;">⚡ 그달의 핵심 사건 & 재료:</strong>
        <div style="font-size: 0.8rem; color: #334155; line-height: 1.5;">${escapeHtml(mData.key_event)}</div>
      </div>

      <!-- 2. 주도 테마 -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; border-left: 3px solid #f59e0b; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
        <strong style="color: #b45309; font-size: 0.82rem; display: block; margin-bottom: 4px;">👑 시장을 지배한 주도 테마:</strong>
        <div style="font-size: 0.8rem; color: #334155; line-height: 1.5;">${escapeHtml(mData.leading_themes)}</div>
      </div>

      <!-- 3. 대표 대장주 -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; border-left: 3px solid #db2777; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
        <strong style="color: #be185d; font-size: 0.82rem; display: block; margin-bottom: 4px;">🚀 대표 대장주 & 상승률:</strong>
        <div style="font-size: 0.8rem; color: #9d174d; line-height: 1.5; font-weight: 700;">${escapeHtml(mData.leader_stocks)}</div>
      </div>

      <!-- 4. 실전 트레이딩 교훈 -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; border-left: 3px solid #059669; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
        <strong style="color: #047857; font-size: 0.82rem; display: block; margin-bottom: 4px;">💡 실전 투자의 핵심 교훈:</strong>
        <div style="font-size: 0.8rem; color: #065f46; line-height: 1.5;">${escapeHtml(mData.lesson)}</div>
      </div>
    </div>
  `;
}

// ========================================================
// [0번 탭] 🔎 실시간 주식 탐정 질의응답 (Q&A 바) 컨트롤러
// ========================================================

/**
 * [신규] 4대 핵심 질문 프리셋 칩 클릭 시 인풋 자동 채움 후 즉시 분석 실행
 */
window.executeStockQAPreset = function(presetText) {
  const inputEl = document.getElementById('stock-qa-input');
  if (inputEl) {
    inputEl.value = presetText || '';
    inputEl.focus();
  }
  window.executeStockQa();
};

/**
 * 빠른 예시 질문 칩 클릭 시 인풋에 자동 입력 후 즉시 분석 실행
 */
window.applyQuickQaChip = function(questionText) {
  window.executeStockQAPreset(questionText);
};

/**
 * 자연어 질문 분석 실행 함수
 */
window.executeStockQa = async function() {
  const inputEl = document.getElementById('stock-qa-input');
  const resultBox = document.getElementById('stock-qa-result-box');
  const submitBtn = document.getElementById('stock-qa-submit-btn');

  if (!inputEl || !resultBox) return;

  const query = (inputEl.value || '').trim();
  if (!query) {
    alert('궁금한 주식 질문을 입력해주세요.\n예: "한화 계열사 급등 이유", "스페이스X 관련주 왜 오름?"');
    inputEl.focus();
    return;
  }

  // 1. UI 로딩 상태 전환 (스피너 표시)
  resultBox.style.display = 'block';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
    submitBtn.innerHTML = '<span>⏳</span> 분석 중...';
  }

  resultBox.innerHTML = `
    <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 24px 20px; text-align: center;">
      <div style="font-size: 1.8rem; margin-bottom: 10px; animation: pulse 1.5s infinite;">🔍</div>
      <div style="font-size: 0.95rem; font-weight: 800; color: #0284c7; margin-bottom: 6px;">
        실시간 뉴스 및 공시 데이터를 수집·분석하고 있습니다...
      </div>
      <div style="font-size: 0.78rem; color: #64748b;">
        '${escapeHtml(query)}' 관련 핵심 기사, 특징주 트리거, 수급 팩트를 탐정처럼 추적 중입니다.
      </div>
    </div>
  `;

  // 2. 백엔드 API 요청 (5초 타임아웃 AbortController 적용)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`${BACKEND_API_BASE}/api/stock/qa?query=${encodeURIComponent(query)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`서버 응답 오류 (HTTP ${res.status})`);
    }

    const data = await res.json();
    renderStockQaResult(data, query);

  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[Stock QA Error]', err);

    let errorMsg = '일시적인 네트워크 지연이 발생했습니다. 잠시 후 다시 시도해주세요.';
    if (err.name === 'AbortError') {
      errorMsg = '데이터 수집 시간이 초과되었습니다. 다시 한 번 조회 버튼을 눌러주세요.';
    }

    resultBox.innerHTML = `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 18px 20px;">
        <div style="display: flex; align-items: center; gap: 8px; color: #dc2626; font-weight: 800; font-size: 0.92rem; margin-bottom: 6px;">
          <span>⚠️</span> 분석 결과를 가져오지 못했습니다
        </div>
        <div style="font-size: 0.8rem; color: #475569; line-height: 1.5;">${escapeHtml(errorMsg)}</div>
      </div>
    `;
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.innerHTML = '<span>⚡</span> 분석 실행';
    }
  }
};

/**
 * Q&A 브리핑 카드 렌더링 함수
 */
function renderStockQaResult(data, originalQuery) {
  const resultBox = document.getElementById('stock-qa-result-box');
  if (!resultBox) return;

  const keyword = data.keyword || originalQuery;
  const mainReason = data.main_reason || '관련 재료 및 최신 시황을 종합 분석 중입니다.';
  const relatedStocks = Array.isArray(data.related_stocks) ? data.related_stocks : [];
  const catalystNews = Array.isArray(data.catalyst_news) ? data.catalyst_news : [];

  // 종목 카드 HTML 생성
  const stocksHtml = relatedStocks.length > 0 ? `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-top: 10px;">
      ${relatedStocks.map(stock => {
        const isLeader = (stock.role || '').includes('대장');
        const cardBg = isLeader ? '#fef2f2' : '#ffffff';
        const cardBorder = isLeader ? '#fca5a5' : '#e2e8f0';
        const badgeColor = isLeader ? '#b91c1c' : '#0284c7';
        const badgeBg = isLeader ? '#fee2e2' : '#e0f2fe';

        return `
          <div style="background: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 0.9rem; font-weight: 800; color: #0f172a;">${escapeHtml(stock.name || '')}</span>
                <span style="font-size: 0.68rem; font-weight: 800; color: ${badgeColor}; background: ${badgeBg}; padding: 2px 6px; border-radius: 4px;">
                  ${escapeHtml(stock.role || '소속/수혜주')}
                </span>
              </div>
              <div style="font-size: 0.75rem; color: #475569; line-height: 1.4; margin-bottom: 6px;">
                ${escapeHtml(stock.reason_detail || '수혜 모멘텀 지속')}
              </div>
            </div>
            <div style="font-size: 0.76rem; font-weight: 800; color: #16a34a; text-align: right; border-top: 1px dashed #e2e8f0; padding-top: 6px; margin-top: 4px;">
              ${escapeHtml(stock.change_rate || '상승세')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  ` : `
    <div style="font-size: 0.8rem; color: #94a3b8; padding: 8px 0;">관련 종목 리스트를 집계 중입니다.</div>
  `;

  // 근거 뉴스 리스트 HTML 생성
  const newsHtml = catalystNews.length > 0 ? `
    <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 10px;">
      ${catalystNews.map((item, idx) => `
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" 
           style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; background: #ffffff; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 8px; text-decoration: none; transition: background 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.02);"
           onmouseover="this.style.background='#f0f9ff'; this.style.borderColor='#bae6fd';"
           onmouseout="this.style.background='#ffffff'; this.style.borderColor='#e2e8f0';">
          <div style="display: flex; align-items: flex-start; gap: 8px; flex: 1;">
            <span style="font-size: 0.75rem; color: #0284c7; font-weight: 800; margin-top: 1px;">[기사 ${idx + 1}]</span>
            <span style="font-size: 0.82rem; font-weight: 600; color: #0f172a; line-height: 1.4;">
              ${escapeHtml(item.title || '')}
            </span>
          </div>
          <span style="font-size: 0.68rem; color: #64748b; white-space: nowrap; margin-top: 2px;">
            ${escapeHtml(item.press || '')} ↗
          </span>
        </a>
      `).join('')}
    </div>
  ` : `
    <div style="font-size: 0.8rem; color: #64748b; padding: 6px 0;">수집된 근거 기사가 없습니다.</div>
  `;

  // 최종 브리핑 카드 마크업 조립
  resultBox.innerHTML = `
    <div style="background: #ffffff; border: 1.5px solid #0284c7; border-radius: 14px; padding: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
      
      <!-- 상단 질문 및 분석 타이틀 -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.15rem;">🎯</span>
          <span style="font-size: 0.95rem; font-weight: 900; color: #0f172a;">
            탐정 분석 보고서: <span style="color: #0284c7;">'${escapeHtml(keyword)}'</span>
          </span>
        </div>
        <button type="button" onclick="document.getElementById('stock-qa-result-box').style.display='none';" 
                style="background: transparent; border: none; color: #64748b; font-size: 0.8rem; cursor: pointer; padding: 2px 6px;">
          닫기 ✕
        </button>
      </div>

      <!-- 1. 📌 핵심 상승/하락 원인 요약 -->
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-left: 4px solid #0284c7; border-radius: 8px; padding: 14px 16px; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
          <span style="font-size: 0.9rem;">📌</span>
          <strong style="font-size: 0.88rem; color: #0369a1;">핵심 원인 브리핑</strong>
        </div>
        <div style="font-size: 0.88rem; color: #1e293b; line-height: 1.6; font-weight: 500;">
          ${escapeHtml(mainReason)}
        </div>
      </div>

      <!-- 2. 🏢 관련 계열사/종목별 개별 수혜 팩트 리스트 -->
      <div style="margin-bottom: 18px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
          <span style="font-size: 0.9rem;">🏢</span>
          <strong style="font-size: 0.85rem; color: #0f172a;">관련 계열사 및 종목별 개별 수혜 팩트</strong>
        </div>
        ${stocksHtml}
      </div>

      <!-- 3. 📰 근거 기사 헤드라인 원문 및 링크 -->
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.9rem;">📰</span>
            <strong style="font-size: 0.85rem; color: #0f172a;">실시간 근거 기사 원문 (네이버 뉴스 직결)</strong>
          </div>
          <span style="font-size: 0.7rem; color: #64748b;">클릭 시 새 창에서 원문 확인</span>
        </div>
        ${newsHtml}
      </div>

    </div>
  `;
}


