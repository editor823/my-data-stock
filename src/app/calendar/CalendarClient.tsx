'use client';

import { useState, useEffect } from 'react';

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  category: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  description?: string;
}

// 카테고리 색상
const CAT_COLORS: Record<string, string> = {
  'FOMC': '#f59e0b',
  '실적': '#4ade80',
  '경제지표': '#38bdf8',
  '수급': '#a78bfa',
  '기타': '#64748b',
};

const IMPORTANCE_LABEL: Record<string, string> = {
  HIGH: '🔴 중요',
  MEDIUM: '🟡 보통',
  LOW: '🟢 낮음',
};

// 데이터 로컬 상태 (실제로는 /api/calendar 또는 data/calendar_events.json 연동)
const SAMPLE_EVENTS: CalendarEvent[] = [
  { id: '1', date: '2026-10-01', title: '美 FOMC 회의 결과 발표', category: 'FOMC', importance: 'HIGH', description: '금리 결정 및 점도표 발표' },
  { id: '2', date: '2026-10-04', title: '美 9월 고용보고서(NFP)', category: '경제지표', importance: 'HIGH', description: '비농업 일자리 증감 수치' },
  { id: '3', date: '2026-10-10', title: '美 9월 CPI 소비자물가지수', category: '경제지표', importance: 'HIGH', description: '인플레이션 지표' },
  { id: '4', date: '2026-10-15', title: '삼성전자 3Q 잠정실적 발표', category: '실적', importance: 'HIGH', description: '영업이익 컨센서스 대비 확인' },
  { id: '5', date: '2026-10-18', title: 'SK하이닉스 3Q 실적 발표', category: '실적', importance: 'HIGH' },
  { id: '6', date: '2026-10-22', title: '한화에어로스페이스 실적 발표', category: '실적', importance: 'MEDIUM' },
  { id: '7', date: '2026-10-28', title: '美 GDP 속보치 (3Q)', category: '경제지표', importance: 'MEDIUM' },
  { id: '8', date: '2026-10-31', title: '외국인 선물 만기일', category: '수급', importance: 'MEDIUM', description: '만기 충격 주의 구간' },
];

export default function CalendarClient() {
  const [events, setEvents] = useState<CalendarEvent[]>(SAMPLE_EVENTS);
  const [filterCat, setFilterCat] = useState<string>('ALL');
  const [newEvent, setNewEvent] = useState<{ date: string; title: string; category: string; importance: 'HIGH' | 'MEDIUM' | 'LOW' }>({ date: '', title: '', category: '기타', importance: 'MEDIUM' });
  const [showForm, setShowForm] = useState(false);

  const categories = ['ALL', ...Array.from(new Set(events.map(e => e.category)))];

  const filtered = filterCat === 'ALL' ? events : events.filter(e => e.category === filterCat);
  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));

  const addEvent = () => {
    if (!newEvent.date || !newEvent.title) return;
    const id = 'evt_' + Date.now();
    setEvents(prev => [...prev, { ...newEvent, id }]);
    setNewEvent({ date: '', title: '', category: '기타', importance: 'MEDIUM' });
    setShowForm(false);
  };

  const removeEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="page-container fade-in">
      <header className="page-header">
        <h1 className="page-title">📅 일정 관리 &amp; 증시 캘린더</h1>
        <p className="page-subtitle">실적 발표 · FOMC · 경제지표 · 수급 이벤트 전체 일정표</p>
      </header>

      {/* 필터 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="filter-tabs">
          {categories.map(cat => (
            <button
              key={cat}
              className={`filter-tab ${filterCat === cat ? 'active' : ''}`}
              onClick={() => setFilterCat(cat)}
              id={`cal-tab-${cat}`}
            >
              {cat === 'ALL' ? '전체' : cat}
            </button>
          ))}
        </div>
        <button
          id="cal-add-btn"
          onClick={() => setShowForm(!showForm)}
          style={{
            background: 'linear-gradient(135deg, #4ade80, #22c55e)',
            border: 'none', borderRadius: 8, padding: '8px 16px',
            color: '#0d1526', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem'
          }}
        >
          ➕ 일정 추가
        </button>
      </div>

      {/* 신규 일정 입력 폼 */}
      {showForm && (
        <div className="card" id="cal-add-form" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 12 }}>📝 새 일정 등록</h3>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 2fr 1fr 1fr' }}>
            <input type="date" className="filter-input" value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))} />
            <input type="text" className="filter-input" placeholder="일정 제목" value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} />
            <select className="filter-input" value={newEvent.category} onChange={e => setNewEvent(p => ({ ...p, category: e.target.value }))}>
              {['FOMC', '실적', '경제지표', '수급', '기타'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="filter-input" value={newEvent.importance} onChange={e => setNewEvent(p => ({ ...p, importance: e.target.value as 'HIGH'|'MEDIUM'|'LOW' }))}>
              <option value="HIGH">🔴 중요</option>
              <option value="MEDIUM">🟡 보통</option>
              <option value="LOW">🟢 낮음</option>
            </select>
          </div>
          <button onClick={addEvent} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, background: 'var(--accent-blue)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            등록
          </button>
        </div>
      )}

      {/* 이벤트 목록 */}
      <div id="calendar-events-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map(evt => {
          const color = CAT_COLORS[evt.category] || CAT_COLORS['기타'];
          return (
            <div key={evt.id} className="card" style={{ borderLeft: `4px solid ${color}`, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '0.72rem', color, fontWeight: 700, padding: '1px 7px', background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 4 }}>
                      {evt.category}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{IMPORTANCE_LABEL[evt.importance]}</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--accent-blue)', marginLeft: 'auto', fontWeight: 700 }}>{evt.date}</span>
                  </div>
                  <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>{evt.title}</p>
                  {evt.description && <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 4 }}>{evt.description}</p>}
                </div>
                <button
                  onClick={() => removeEvent(evt.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
                  aria-label="일정 삭제"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div className="news-empty">📭 해당 카테고리의 일정이 없습니다.</div>
        )}
      </div>
    </div>
  );
}
