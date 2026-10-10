/**
 * 검수봇 관리자 잠금 (inspector_admin_gate.js)
 *
 * - 일반 방문자에게는 검수봇 버튼이 보이지 않습니다. ([data-admin-only] 표시가 붙은 요소를 숨김 처리)
 * - 관리자는 단축키 Alt + Shift + I 를 누르고 비밀번호를 입력하면 버튼이 나타납니다.
 * - 비밀번호 입력 시 기본적으로 * 로 마스킹되며, 우측 눈 아이콘(👁️) 클릭 시 보였다/숨겼다 토글됩니다.
 * - 비밀번호는 SHA-256 해시로 안전하게 대조합니다.
 * - 한 번 로그인하면 이 탭을 닫기 전까지 유지됩니다. (sessionStorage)
 */
(function () {
  const ADMIN_HASH = '1d913a35e66ff2c6bc4d6c7c4eec8d7f744138d5ed917531162b1e854be8e291';
  const SESSION_KEY = 'inspector_admin_ok';
  const MAX_TRIES = 5;
  let tries = 0;

  async function sha256Hex(text) {
    if (!window.crypto || !window.crypto.subtle) return null;
    const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function isAdmin() {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  function reveal() {
    document.querySelectorAll('[data-admin-only]').forEach((el) => { el.style.display = ''; });
  }

  // 커스텀 모달 생성 및 비밀번호 입력 프롬프트
  function showPasswordModal() {
    return new Promise((resolve) => {
      // 기존 모달 제거
      const existing = document.getElementById('inspector-admin-gate-modal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'inspector-admin-gate-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, system-ui, Roboto, "Segoe UI", sans-serif;
      `;

      modal.innerHTML = `
        <div style="
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 26px 28px;
          width: 100%;
          max-width: 380px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          text-align: center;
          color: #0f172a;
          animation: adminModalFadeIn 0.2s ease-out;
        ">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">🔒</div>
          <h3 style="font-size: 1.18rem; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">검수봇 관리자 로그인</h3>
          <p style="font-size: 0.82rem; color: #64748b; margin: 0 0 20px 0; line-height: 1.45;">
            관리자 전용 기능 활성화를 위해 비밀번호를 입력해 주세요.
          </p>

          <div style="position: relative; display: flex; align-items: center; margin-bottom: 18px;">
            <input type="password" id="inspectorGateInput" placeholder="관리자 비밀번호 입력" style="
              width: 100%;
              padding: 11px 44px 11px 14px;
              border: 1.5px solid #cbd5e1;
              border-radius: 10px;
              font-size: 0.92rem;
              outline: none;
              color: #0f172a;
              background: #f8fafc;
              box-sizing: border-box;
              transition: all 0.2s;
            ">
            <button type="button" id="inspectorGateEyeBtn" title="비밀번호 보기/숨기기" aria-label="비밀번호 표시 토글" style="
              position: absolute;
              right: 10px;
              background: none;
              border: none;
              cursor: pointer;
              font-size: 1.18rem;
              color: #64748b;
              padding: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              user-select: none;
            ">👁️</button>
          </div>

          <div style="display: flex; gap: 10px;">
            <button type="button" id="inspectorGateCancelBtn" style="
              flex: 1;
              padding: 10px;
              background: #f1f5f9;
              border: 1px solid #e2e8f0;
              color: #475569;
              font-weight: 700;
              border-radius: 10px;
              font-size: 0.88rem;
              cursor: pointer;
              transition: background 0.15s;
            ">취소</button>
            <button type="button" id="inspectorGateConfirmBtn" style="
              flex: 1;
              padding: 10px;
              background: linear-gradient(135deg, #059669, #10b981);
              border: none;
              color: #ffffff;
              font-weight: 800;
              border-radius: 10px;
              font-size: 0.88rem;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
              transition: opacity 0.15s;
            ">확인</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const input = document.getElementById('inspectorGateInput');
      const eyeBtn = document.getElementById('inspectorGateEyeBtn');
      const cancelBtn = document.getElementById('inspectorGateCancelBtn');
      const confirmBtn = document.getElementById('inspectorGateConfirmBtn');

      input.focus();

      // 인풋 포커스 효과
      input.addEventListener('focus', () => {
        input.style.borderColor = '#10b981';
        input.style.background = '#ffffff';
      });
      input.addEventListener('blur', () => {
        input.style.borderColor = '#cbd5e1';
        input.style.background = '#f8fafc';
      });

      // 눈 아이콘 토글 (비밀번호 보이기/숨기기)
      eyeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (input.type === 'password') {
          input.type = 'text';
          eyeBtn.textContent = '🙈';
        } else {
          input.type = 'password';
          eyeBtn.textContent = '👁️';
        }
        input.focus();
      });

      function cleanup(val) {
        modal.remove();
        resolve(val);
      }

      confirmBtn.addEventListener('click', () => cleanup(input.value.trim()));
      cancelBtn.addEventListener('click', () => cleanup(null));

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') cleanup(input.value.trim());
        else if (e.key === 'Escape') cleanup(null);
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) cleanup(null);
      });
    });
  }

  async function askPassword() {
    if (tries >= MAX_TRIES) {
      alert('비밀번호를 너무 많이 틀렸습니다. 페이지를 새로고침한 뒤 다시 시도하세요.');
      return false;
    }

    const pw = await showPasswordModal();
    if (pw === null || pw === '') return false;

    const hash = await sha256Hex(pw);
    if (hash === null) {
      alert('이 주소(비 https)에서는 암호화 인증을 진행할 수 없습니다. https 환경에서 실행해 주세요.');
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

  // 검수봇을 여는 함수들을 관리자만 열 수 있게 감싸기
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
