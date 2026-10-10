/**
 * 검수봇 관리자 잠금 (inspector_admin_gate.js)
 *
 * - 일반 방문자에게는 검수봇 버튼이 보이지 않습니다. ([data-admin-only] 표시가 붙은 요소를 숨김 처리)
 * - 관리자는 단축키 Alt + Shift + I 를 누르고 비밀번호를 입력하면 버튼이 나타납니다.
 * - 비밀번호는 코드에 '그대로' 적지 않고, 암호화(SHA-256 해시)한 값만 적어 둡니다.
 * - 한 번 로그인하면 이 탭을 닫기 전까지 유지됩니다. (sessionStorage)
 *
 * ⚠️ 정적 사이트(서버 없는 사이트)의 한계:
 *   이 잠금은 '일반 방문자 눈에 안 보이게' 막는 용도입니다. 개발자 도구를 쓸 줄 아는 사람이
 *   화면 코드를 뜯어 보는 것까지 완전히 막을 수는 없습니다. 검수봇은 '읽기만 하는' 진단 도구이고
 *   비밀 키는 들어 있지 않으니 이 정도 잠금으로 충분하지만, 비밀 키나 개인정보는 절대 여기 두지 마세요.
 *
 * 비밀번호 바꾸는 법: 터미널에서  node scripts/make_admin_hash.js 새비밀번호
 *   → 출력된 긴 영문/숫자 값을 아래 ADMIN_HASH 에 붙여넣기 (블로그·주식센터 파일 모두)
 */
(function () {
  const ADMIN_HASH = '1d913a35e66ff2c6bc4d6c7c4eec8d7f744138d5ed917531162b1e854be8e291';
  const SESSION_KEY = 'inspector_admin_ok';
  const MAX_TRIES = 5;
  let tries = 0;

  async function sha256Hex(text) {
    if (!window.crypto || !window.crypto.subtle) return null; // https 가 아니면 사용 불가
    const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function isAdmin() {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  function reveal() {
    document.querySelectorAll('[data-admin-only]').forEach((el) => { el.style.display = ''; });
  }

  async function askPassword() {
    if (tries >= MAX_TRIES) {
      alert('비밀번호를 너무 많이 틀렸습니다. 페이지를 새로고침한 뒤 다시 시도하세요.');
      return false;
    }
    const pw = prompt('🔒 관리자 비밀번호를 입력하세요');
    if (pw === null) return false; // 취소
    const hash = await sha256Hex(pw);
    if (hash === null) {
      alert('이 주소(비 https)에서는 관리자 확인을 할 수 없습니다. https 주소로 접속해 주세요.');
      return false;
    }
    if (hash === ADMIN_HASH) {
      sessionStorage.setItem(SESSION_KEY, '1');
      reveal();
      return true;
    }
    tries++;
    alert('비밀번호가 맞지 않습니다.');
    return false;
  }

  // 다른 코드에서도 쓸 수 있게 공개
  window.requireInspectorAdmin = async function () {
    return isAdmin() || (await askPassword());
  };

  // 검수봇을 여는 함수들을 '관리자만' 열 수 있게 감싸기 (버튼이 보이지 않아도, 콘솔 호출까지 막음)
  ['openBlogInspectorBot', 'openSystemInspectorBot'].forEach((name) => {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = async function (...args) {
      if (await window.requireInspectorAdmin()) return original.apply(this, args);
    };
  });

  // 비밀 단축키: Alt + Shift + I
  window.addEventListener('keydown', async (e) => {
    if (e.altKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
      e.preventDefault();
      if (await window.requireInspectorAdmin()) {
        if (window.showToast) window.showToast('검수봇 관리자 모드가 켜졌습니다 🔓');
      }
    }
  });

  // 이미 로그인한 탭이면 새로고침해도 버튼 유지
  if (isAdmin()) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal);
    else reveal();
  }
})();
