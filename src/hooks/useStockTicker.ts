'use client';

// ============================================================
// [훅] 주기적 지수/환율 갱신 훅 (30초 폴링)
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchMarketIndices, fetchExchangeRate } from '@/services/stockApi';
import type { IndexData, ExchangeRate } from '@/types/stock';

interface UseStockTickerReturn {
  indices: IndexData[];
  exchangeRate: ExchangeRate | null;
  isLoading: boolean;
  lastUpdated: Date | null;
  refresh: () => void;
}

const POLLING_INTERVAL = 30_000; // 30초

export function useStockTicker(): UseStockTickerReturn {
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  const fetchAll = useCallback(async () => {
    try {
      const [idxData, fxData] = await Promise.all([
        fetchMarketIndices(),
        fetchExchangeRate(),
      ]);
      if (!isMounted.current) return;
      setIndices(idxData);
      setExchangeRate(fxData);
      setLastUpdated(new Date());
    } catch {
      // silent: 네트워크 오류 시 기존 상태 유지
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchAll();

    timerRef.current = setInterval(fetchAll, POLLING_INTERVAL);

    return () => {
      isMounted.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchAll]);

  return { indices, exchangeRate, isLoading, lastUpdated, refresh: fetchAll };
}
