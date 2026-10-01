'use client';

// ============================================================
// [스토어] 전역 상태 (API 키, 북마크, 활성 설정)
// Zustand 없이 순수 React Context + useReducer 패턴으로 구현
// ============================================================

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { Theme } from '@/types/stock';

// ── 상태 타입
interface StockStore {
  bookmarkedThemes: string[];          // 북마크된 theme_id 목록
  activeThemeId: string | null;
  apiSettings: {
    backendBase: string;
  };
  uiSettings: {
    darkMode: boolean;
    tickerSpeed: number;               // 1~5 (낮을수록 느림)
  };
}

// ── 액션 타입
type Action =
  | { type: 'BOOKMARK_THEME'; themeId: string }
  | { type: 'UNBOOKMARK_THEME'; themeId: string }
  | { type: 'SET_ACTIVE_THEME'; themeId: string | null }
  | { type: 'SET_BACKEND_BASE'; url: string }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'SET_TICKER_SPEED'; speed: number }
  | { type: 'HYDRATE'; state: Partial<StockStore> };

// ── 초기 상태
const initialState: StockStore = {
  bookmarkedThemes: [],
  activeThemeId: null,
  apiSettings: {
    backendBase: 'https://my-stock-api.onrender.com',
  },
  uiSettings: {
    darkMode: true,
    tickerSpeed: 3,
  },
};

// ── 리듀서
function reducer(state: StockStore, action: Action): StockStore {
  switch (action.type) {
    case 'BOOKMARK_THEME':
      if (state.bookmarkedThemes.includes(action.themeId)) return state;
      return { ...state, bookmarkedThemes: [...state.bookmarkedThemes, action.themeId] };
    case 'UNBOOKMARK_THEME':
      return { ...state, bookmarkedThemes: state.bookmarkedThemes.filter(id => id !== action.themeId) };
    case 'SET_ACTIVE_THEME':
      return { ...state, activeThemeId: action.themeId };
    case 'SET_BACKEND_BASE':
      return { ...state, apiSettings: { ...state.apiSettings, backendBase: action.url } };
    case 'TOGGLE_DARK_MODE':
      return { ...state, uiSettings: { ...state.uiSettings, darkMode: !state.uiSettings.darkMode } };
    case 'SET_TICKER_SPEED':
      return { ...state, uiSettings: { ...state.uiSettings, tickerSpeed: action.speed } };
    case 'HYDRATE':
      return { ...state, ...action.state };
    default:
      return state;
  }
}

// ── Context
const StoreCtx = createContext<{
  state: StockStore;
  dispatch: React.Dispatch<Action>;
} | null>(null);

const LS_KEY = 'stock_intelligence_store';

// ── Provider
export function StockStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // localStorage 복원 (클라이언트 전용)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved: Partial<StockStore> = JSON.parse(raw);
        dispatch({ type: 'HYDRATE', state: saved });
      }
    } catch {/* 무시 */}
  }, []);

  // 상태 변경 시 localStorage 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        bookmarkedThemes: state.bookmarkedThemes,
        apiSettings: state.apiSettings,
        uiSettings: state.uiSettings,
      }));
    } catch {/* 무시 */}
  }, [state.bookmarkedThemes, state.apiSettings, state.uiSettings]);

  return (
    <StoreCtx.Provider value={{ state, dispatch }}>
      {children}
    </StoreCtx.Provider>
  );
}

// ── 커스텀 훅
export function useStockStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStockStore must be used inside StockStoreProvider');

  const { state, dispatch } = ctx;

  const bookmarkTheme = useCallback((themeId: string) => dispatch({ type: 'BOOKMARK_THEME', themeId }), [dispatch]);
  const unbookmarkTheme = useCallback((themeId: string) => dispatch({ type: 'UNBOOKMARK_THEME', themeId }), [dispatch]);
  const setActiveTheme = useCallback((themeId: string | null) => dispatch({ type: 'SET_ACTIVE_THEME', themeId }), [dispatch]);
  const toggleDarkMode = useCallback(() => dispatch({ type: 'TOGGLE_DARK_MODE' }), [dispatch]);

  return {
    ...state,
    bookmarkTheme,
    unbookmarkTheme,
    setActiveTheme,
    toggleDarkMode,
    isBookmarked: (id: string) => state.bookmarkedThemes.includes(id),
  };
}
