//! 日志流 Hook

import { useCallback, useEffect, useRef } from 'react';
import { useLogStore } from '../stores/logStore';

const CHUNK_SIZE = 200;
const PRELOAD_THRESHOLD = 50;

/// 使用日志流
export function useLogStream() {
  const {
    fileIndex,
    loadChunk,
    ensureRangeLoaded,
    loadedRanges,
  } = useLogStore();

  const loadingRef = useRef(false);

  /// 检查范围是否已加载
  const isRangeLoaded = useCallback((start: number, end: number) => {
    return loadedRanges.some(
      range => range.start <= start && range.end >= end
    );
  }, [loadedRanges]);

  /// 请求加载指定范围的日志
  const requestLoad = useCallback(
    async (start: number, end: number) => {
      if (!fileIndex) return;

      // 限制范围
      start = Math.max(1, start);
      end = Math.min(fileIndex.total_lines, end);

      // 检查是否已加载
      if (isRangeLoaded(start, end)) return;

      // 避免并发加载冲突
      if (loadingRef.current) return;
      loadingRef.current = true;

      try {
        await loadChunk(start, end);
      } finally {
        loadingRef.current = false;
      }
    },
    [fileIndex, loadChunk, isRangeLoaded]
  );

  /// 处理滚动 - 确保可见范围已加载
  const handleVisibleRangeChange = useCallback(
    async (startIndex: number, endIndex: number) => {
      if (!fileIndex) return;

      // 扩展范围以预加载
      const start = Math.max(1, startIndex + 1 - PRELOAD_THRESHOLD);
      const end = Math.min(fileIndex.total_lines, endIndex + 1 + PRELOAD_THRESHOLD);

      // 确保范围已加载
      await ensureRangeLoaded(start, end);
    },
    [fileIndex, ensureRangeLoaded]
  );

  /// 跳转到指定行
  const scrollToLine = useCallback(
    async (lineNumber: number) => {
      if (!fileIndex) return;

      const start = Math.max(1, lineNumber - CHUNK_SIZE / 2);
      const end = Math.min(fileIndex.total_lines, lineNumber + CHUNK_SIZE / 2);

      await ensureRangeLoaded(start, end);
    },
    [fileIndex, ensureRangeLoaded]
  );

  /// 初始加载
  useEffect(() => {
    if (fileIndex && loadedRanges.length === 0) {
      loadChunk(1, CHUNK_SIZE);
    }
  }, [fileIndex, loadedRanges.length, loadChunk]);

  return {
    handleVisibleRangeChange,
    scrollToLine,
    requestLoad,
    totalLines: fileIndex?.total_lines ?? 0,
    isRangeLoaded,
  };
}
