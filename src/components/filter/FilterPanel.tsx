//! 过滤面板组件 - Apple 风格扁平设计

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLogStore } from '../../stores/logStore';
import { useFilterStore } from '../../stores/filterStore';
import type { LogLevel } from '../../types/log';

const LOG_LEVELS: LogLevel[] = ['error', 'warning', 'display', 'verbose', 'veryverbose', 'unknown'];

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: '#ef4444',
  warning: '#f97316',
  display: '#3b82f6',
  verbose: '#6b7280',
  veryverbose: '#4b5563',
  unknown: '#9ca3af',
};

export function FilterPanel() {
  const {
    fileIndex,
    categorySearch,
    setCategorySearch,
    isLoading,
    filteredLines,
    showFilteredOnly,
    applyLevelCategoryFilter,
    clearFilteredLines,
  } = useLogStore();
  const {
    selectedCategories,
    selectedLevels,
    toggleCategory,
    toggleLevel,
    selectAllCategories,
    deselectAllCategories,
    selectAllLevels,
    deselectAllLevels,
    reset,
  } = useFilterStore();

  const [showLevels, setShowLevels] = useState(true);
  const [showCategories, setShowCategories] = useState(true);

  // Auto-apply filter when levels or categories change
  useEffect(() => {
    if (!fileIndex) return;

    // Debounce to avoid too many calls when clicking rapidly
    const timer = setTimeout(() => {
      const levels = Array.from(selectedLevels);
      const categories = Array.from(selectedCategories);

      if (levels.length > 0 || categories.length > 0) {
        applyLevelCategoryFilter(levels, categories);
      } else if (showFilteredOnly) {
        // Clear filter if nothing selected
        clearFilteredLines();
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedLevels, selectedCategories, fileIndex, applyLevelCategoryFilter, clearFilteredLines, showFilteredOnly]);

  // Clear filter and show all lines
  const handleClearFilter = useCallback(() => {
    clearFilteredLines();
  }, [clearFilteredLines]);

  if (!fileIndex) {
    return (
      <div className="filter-panel">
        <div className="filter-empty">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
          <span>打开日志文件以使用过滤器</span>
        </div>
      </div>
    );
  }

  // 过滤类别
  const filteredCategories = useMemo(() => {
    const cats = Object.keys(fileIndex.categories).sort();
    if (!categorySearch.trim()) return cats;
    const search = categorySearch.toLowerCase();
    return cats.filter(c => c.toLowerCase().includes(search));
  }, [fileIndex.categories, categorySearch]);

  // Check if any filter is active
  const hasActiveFilters = selectedLevels.size > 0 || selectedCategories.size > 0;

  return (
    <div className="filter-panel">
      {/* 标题 */}
      <div className="filter-header">
        <h2>Filters</h2>
        {hasActiveFilters && (
          <button className="filter-reset-btn" onClick={() => { reset(); clearFilteredLines(); }}>
            Reset
          </button>
        )}
      </div>

      {/* 日志级别过滤 */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => setShowLevels(!showLevels)}
        >
          <span>Log Level</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={showLevels ? 'rotate-180' : ''}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {showLevels && (
          <div className="filter-section-content">
            <div className="filter-quick-actions">
              <button onClick={selectAllLevels}>All</button>
              <button onClick={deselectAllLevels}>None</button>
            </div>
            <div className="filter-levels">
              {LOG_LEVELS.map((level) => (
                <button
                  key={level}
                  className={`filter-level-btn ${selectedLevels.has(level) ? 'active' : ''}`}
                  onClick={() => toggleLevel(level)}
                >
                  <span className="filter-level-dot" style={{ backgroundColor: LEVEL_COLORS[level] }} />
                  <span className="filter-level-name">{level}</span>
                  <span className="filter-level-count">{fileIndex.level_counts[level] || 0}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 类别过滤 */}
      <div className="filter-section flex-1">
        <button
          className="filter-section-header"
          onClick={() => setShowCategories(!showCategories)}
        >
          <span>Category ({filteredCategories.length}/{Object.keys(fileIndex.categories).length})</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={showCategories ? 'rotate-180' : ''}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {showCategories && (
          <div className="filter-section-content flex-1">
            {/* 搜索框 */}
            <div className="filter-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
              />
            </div>

            {/* 快捷操作 */}
            <div className="filter-quick-actions">
              <button onClick={() => selectAllCategories(filteredCategories)}>Select All</button>
              <button onClick={deselectAllCategories}>Clear</button>
            </div>

            {/* 类别列表 */}
            <div className="filter-categories">
              {filteredCategories.map((category) => (
                <button
                  key={category}
                  className={`filter-category-btn ${selectedCategories.has(category) ? 'active' : ''}`}
                  onClick={() => toggleCategory(category)}
                  title={category}
                >
                  <span className="filter-category-name">{category}</span>
                </button>
              ))}
              {filteredCategories.length === 0 && (
                <div className="filter-categories-empty">
                  No matching categories
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="filter-status-bar">
        {isLoading ? (
          <div className="filter-loading">
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
            </svg>
            <span>Loading...</span>
          </div>
        ) : showFilteredOnly && filteredLines.length > 0 ? (
          <>
            <span className="filter-status-count">{filteredLines.length.toLocaleString()} matching lines</span>
            <button className="filter-clear-btn" onClick={handleClearFilter} title="Clear filter">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              <span>Clear</span>
            </button>
          </>
        ) : hasActiveFilters ? (
          <span className="filter-status-hint">Select filters to apply</span>
        ) : null}
      </div>

      <style>{`
        .filter-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          background: rgba(30, 30, 30, 0.95);
          backdrop-filter: blur(10px);
        }

        .filter-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: rgba(255, 255, 255, 0.3);
          gap: 12px;
          padding: 20px;
          text-align: center;
          font-size: 13px;
        }

        .filter-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .filter-header h2 {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
        }

        .filter-reset-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.15s;
        }

        .filter-reset-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
        }

        .filter-section {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .filter-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .filter-section-header:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .filter-section-header svg {
          transition: transform 0.2s;
        }

        .filter-section-header svg.rotate-180 {
          transform: rotate(180deg);
        }

        .filter-section-content {
          padding: 0 16px 16px;
        }

        .filter-quick-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .filter-quick-actions button {
          background: transparent;
          border: none;
          color: rgba(59, 130, 246, 0.8);
          font-size: 12px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.15s;
        }

        .filter-quick-actions button:hover {
          background: rgba(59, 130, 246, 0.1);
          color: rgba(59, 130, 246, 1);
        }

        .filter-levels {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .filter-level-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .filter-level-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .filter-level-btn.active {
          background: rgba(59, 130, 246, 0.15);
          border-color: rgba(59, 130, 246, 0.3);
        }

        .filter-level-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .filter-level-name {
          flex: 1;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          text-transform: capitalize;
        }

        .filter-level-count {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          font-variant-numeric: tabular-nums;
        }

        .filter-search {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          margin-bottom: 12px;
        }

        .filter-search svg {
          color: rgba(255, 255, 255, 0.3);
          flex-shrink: 0;
        }

        .filter-search input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
        }

        .filter-search input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .filter-categories {
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-height: 200px;
          overflow-y: auto;
        }

        .filter-category-btn {
          display: flex;
          align-items: center;
          padding: 6px 12px;
          background: transparent;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }

        .filter-category-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .filter-category-btn.active {
          background: rgba(59, 130, 246, 0.15);
        }

        .filter-category-name {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .filter-categories-empty {
          padding: 20px;
          text-align: center;
          color: rgba(255, 255, 255, 0.4);
          font-size: 13px;
        }

        .filter-status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          min-height: 40px;
        }

        .filter-loading {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(59, 130, 246, 0.8);
          font-size: 12px;
        }

        .filter-status-count {
          font-size: 12px;
          color: rgba(59, 130, 246, 0.8);
        }

        .filter-status-hint {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
        }

        .filter-clear-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .filter-clear-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          color: rgba(239, 68, 68, 0.8);
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
