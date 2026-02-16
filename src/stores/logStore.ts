//! 日志状态管理 (Zustand)

import { create } from 'zustand';
import type { LogEntry, FileIndex, SearchResult, SearchOptions, FilterOptions } from '../types/log';
import * as api from '../services/tauriApi';

/// 自定义高亮规则
export interface HighlightRule {
  id: string;
  pattern: string;
  color: string;
  enabled: boolean;
}

interface LogState {
  // 文件状态
  fileIndex: FileIndex | null;
  isLoading: boolean;
  error: string | null;

  // 日志数据 - 使用对象存储已加载的行（更容易序列化）
  entriesMap: Record<number, LogEntry>;
  loadedRanges: Array<{ start: number; end: number }>;

  // 搜索
  searchOptions: SearchOptions;
  searchResults: SearchResult[];
  currentSearchIndex: number;

  // 过滤
  filterOptions: FilterOptions;

  // UI 设置
  fontSize: number;
  highlightColor: string;
  categorySearch: string;

  // 自定义高亮规则
  highlightRules: HighlightRule[];

  // 显示模式
  showFilteredOnly: boolean;

  // Actions
  openFile: (path: string) => Promise<void>;
  closeFile: () => Promise<void>;
  loadChunk: (start: number, end: number) => Promise<boolean>;
  ensureRangeLoaded: (start: number, end: number) => Promise<void>;
  search: (options: SearchOptions) => Promise<void>;
  setSearchOptions: (options: Partial<SearchOptions>) => void;
  nextSearchResult: () => void;
  prevSearchResult: () => void;
  setFilterOptions: (options: Partial<FilterOptions>) => void;
  setFontSize: (size: number) => void;
  setHighlightColor: (color: string) => void;
  setCategorySearch: (search: string) => void;
  clearError: () => void;
  getEntry: (lineNumber: number) => LogEntry | undefined;

  // 高亮规则
  addHighlightRule: (pattern: string, color: string) => void;
  removeHighlightRule: (id: string) => void;
  toggleHighlightRule: (id: string) => void;
  updateHighlightRule: (id: string, updates: Partial<HighlightRule>) => void;

  // 显示模式
  setShowFilteredOnly: (show: boolean) => void;
}

export const useLogStore = create<LogState>((set, get) => ({
  // 初始状态
  fileIndex: null,
  isLoading: false,
  error: null,
  entriesMap: {},
  loadedRanges: [],
  searchOptions: {
    pattern: '',
    use_regex: true,
    case_insensitive: true,
  },
  searchResults: [],
  currentSearchIndex: -1,
  filterOptions: {
    categories: [],
    levels: [],
    exclude_categories: [],
  },
  fontSize: 13,
  highlightColor: '#fbbf24',
  categorySearch: '',
  highlightRules: [],
  showFilteredOnly: false,

  // 打开文件
  openFile: async (path: string) => {
    set({ isLoading: true, error: null, entriesMap: {}, loadedRanges: [] });
    try {
      const result = await api.openLogFile(path);

      // 将预览数据存入对象
      const newMap: Record<number, LogEntry> = {};
      result.preview.forEach(entry => {
        newMap[entry.line_number] = entry;
      });

      set({
        fileIndex: result.index,
        entriesMap: newMap,
        loadedRanges: [{ start: 1, end: result.preview.length }],
        searchResults: [],
        currentSearchIndex: -1,
      });
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ isLoading: false });
    }
  },

  // 关闭文件
  closeFile: async () => {
    try {
      await api.closeFile();
      set({
        fileIndex: null,
        entriesMap: {},
        loadedRanges: [],
        searchResults: [],
        currentSearchIndex: -1,
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  // 检查范围是否已加载
  isRangeLoaded: (start: number, end: number) => {
    const { loadedRanges } = get();
    return loadedRanges.some(
      range => range.start <= start && range.end >= end
    );
  },

  // 加载块 - 返回是否实际加载了数据
  loadChunk: async (start: number, end: number): Promise<boolean> => {
    const { loadedRanges, entriesMap, fileIndex } = get();

    if (!fileIndex) return false;

    // 限制范围
    start = Math.max(1, start);
    end = Math.min(fileIndex.total_lines, end);

    // 检查是否已经完全加载了这个范围
    const isFullyLoaded = loadedRanges.some(
      range => range.start <= start && range.end >= end
    );
    if (isFullyLoaded) return false;

    try {
      const chunk = await api.loadChunk(start, end);

      // 合并新数据
      const newMap = { ...entriesMap };
      chunk.entries.forEach(entry => {
        newMap[entry.line_number] = entry;
      });

      // 更新已加载范围
      const newRanges = [...loadedRanges, { start: chunk.start_line, end: chunk.end_line }];
      newRanges.sort((a, b) => a.start - b.start);

      const mergedRanges: Array<{ start: number; end: number }> = [];
      for (const range of newRanges) {
        if (mergedRanges.length === 0 || mergedRanges[mergedRanges.length - 1].end < range.start - 1) {
          mergedRanges.push({ ...range });
        } else {
          mergedRanges[mergedRanges.length - 1].end = Math.max(
            mergedRanges[mergedRanges.length - 1].end,
            range.end
          );
        }
      }

      set({ entriesMap: newMap, loadedRanges: mergedRanges });
      return true;
    } catch (e) {
      set({ error: String(e) });
      return false;
    }
  },

  // 确保范围已加载
  ensureRangeLoaded: async (start: number, end: number) => {
    const { loadChunk, loadedRanges, fileIndex } = get();
    if (!fileIndex) return;

    // 找出需要加载的缺口
    const gaps: Array<{ start: number; end: number }> = [];
    let current = start;

    // 按起始位置排序
    const sortedRanges = [...loadedRanges].sort((a, b) => a.start - b.start);

    for (const range of sortedRanges) {
      if (range.end < current) continue;
      if (range.start > current) {
        gaps.push({ start: current, end: Math.min(range.start - 1, end) });
      }
      current = Math.max(current, range.end + 1);
      if (current > end) break;
    }

    if (current <= end) {
      gaps.push({ start: current, end });
    }

    // 加载所有缺口
    for (const gap of gaps) {
      await loadChunk(gap.start, gap.end);
    }
  },

  // 获取指定行的数据
  getEntry: (lineNumber: number) => {
    return get().entriesMap[lineNumber];
  },

  // 搜索
  search: async (options: SearchOptions) => {
    set({ isLoading: true, searchOptions: options });
    try {
      const results = await api.searchLogs(options);
      set({
        searchResults: results,
        currentSearchIndex: results.length > 0 ? 0 : -1,
      });
    } catch (e) {
      set({ error: String(e), searchResults: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  // 设置搜索选项
  setSearchOptions: (options: Partial<SearchOptions>) => {
    set((state) => ({
      searchOptions: { ...state.searchOptions, ...options },
    }));
  },

  // 下一个搜索结果
  nextSearchResult: () => {
    const { searchResults, currentSearchIndex } = get();
    if (searchResults.length === 0) return;
    const next = (currentSearchIndex + 1) % searchResults.length;
    set({ currentSearchIndex: next });
  },

  // 上一个搜索结果
  prevSearchResult: () => {
    const { searchResults, currentSearchIndex } = get();
    if (searchResults.length === 0) return;
    const prev = currentSearchIndex <= 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    set({ currentSearchIndex: prev });
  },

  // 设置过滤选项
  setFilterOptions: (options: Partial<FilterOptions>) => {
    set((state) => ({
      filterOptions: { ...state.filterOptions, ...options },
    }));
  },

  // 设置字体大小
  setFontSize: (size: number) => {
    set({ fontSize: Math.max(8, Math.min(24, size)) });
  },

  // 设置高亮颜色
  setHighlightColor: (color: string) => {
    set({ highlightColor: color });
  },

  // 设置分类搜索
  setCategorySearch: (search: string) => {
    set({ categorySearch: search });
  },

  // 添加高亮规则
  addHighlightRule: (pattern: string, color: string) => {
    const rule: HighlightRule = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      pattern,
      color,
      enabled: true,
    };
    set((state) => ({
      highlightRules: [...state.highlightRules, rule],
    }));
  },

  // 删除高亮规则
  removeHighlightRule: (id: string) => {
    set((state) => ({
      highlightRules: state.highlightRules.filter(r => r.id !== id),
    }));
  },

  // 切换高亮规则
  toggleHighlightRule: (id: string) => {
    set((state) => ({
      highlightRules: state.highlightRules.map(r =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      ),
    }));
  },

  // 更新高亮规则
  updateHighlightRule: (id: string, updates: Partial<HighlightRule>) => {
    set((state) => ({
      highlightRules: state.highlightRules.map(r =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  },

  // 设置只显示过滤后的行
  setShowFilteredOnly: (show: boolean) => {
    set({ showFilteredOnly: show });
  },

  // 清除错误
  clearError: () => set({ error: null }),
}));
