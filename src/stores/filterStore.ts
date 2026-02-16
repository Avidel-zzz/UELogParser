//! 过滤状态管理

import { create } from 'zustand';
import type { LogLevel } from '../types/log';

interface FilterState {
  // 选中的类别
  selectedCategories: Set<string>;
  // 选中的级别
  selectedLevels: Set<LogLevel>;
  // 排除的类别
  excludedCategories: Set<string>;

  // Actions
  toggleCategory: (category: string) => void;
  toggleLevel: (level: LogLevel) => void;
  toggleExcludeCategory: (category: string) => void;
  selectAllCategories: (categories: string[]) => void;
  deselectAllCategories: () => void;
  selectAllLevels: () => void;
  deselectAllLevels: () => void;
  reset: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedCategories: new Set(),
  selectedLevels: new Set(),
  excludedCategories: new Set(),

  toggleCategory: (category: string) => {
    set((state) => {
      const newSet = new Set(state.selectedCategories);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return { selectedCategories: newSet };
    });
  },

  toggleLevel: (level: LogLevel) => {
    set((state) => {
      const newSet = new Set(state.selectedLevels);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }
      return { selectedLevels: newSet };
    });
  },

  toggleExcludeCategory: (category: string) => {
    set((state) => {
      const newSet = new Set(state.excludedCategories);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return { excludedCategories: newSet };
    });
  },

  selectAllCategories: (categories: string[]) => {
    set({ selectedCategories: new Set(categories) });
  },

  deselectAllCategories: () => {
    set({ selectedCategories: new Set() });
  },

  selectAllLevels: () => {
    set({
      selectedLevels: new Set(['error', 'warning', 'display', 'verbose', 'veryverbose', 'unknown']),
    });
  },

  deselectAllLevels: () => {
    set({ selectedLevels: new Set() });
  },

  reset: () => {
    set({
      selectedCategories: new Set(),
      selectedLevels: new Set(),
      excludedCategories: new Set(),
    });
  },
}));

/// 检查日志条目是否通过过滤器
export function passesFilter(
  entry: { category?: string; level: LogLevel },
  filterState: FilterState
): boolean {
  // 检查级别
  if (filterState.selectedLevels.size > 0) {
    if (!filterState.selectedLevels.has(entry.level)) {
      return false;
    }
  }

  // 检查类别
  if (filterState.selectedCategories.size > 0) {
    if (!entry.category || !filterState.selectedCategories.has(entry.category)) {
      return false;
    }
  }

  // 检查排除的类别
  if (entry.category && filterState.excludedCategories.has(entry.category)) {
    return false;
  }

  return true;
}
