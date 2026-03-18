//! 搜索栏组件 - Apple 风格扁平设计

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLogStore } from '../../stores/logStore';

export function SearchBar() {
  const {
    searchOptions,
    searchResults,
    currentSearchIndex,
    showSearchOnly,
    search,
    setSearchOptions,
    nextSearchResult,
    prevSearchResult,
    setShowSearchOnly,
  } = useLogStore();

  const [localPattern, setLocalPattern] = useState(searchOptions.pattern);
  const [showOptions, setShowOptions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 执行搜索
  const handleSearch = useCallback(() => {
    if (!localPattern.trim()) return;
    search({ ...searchOptions, pattern: localPattern });
  }, [localPattern, searchOptions, search]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F3 / Shift+F3 导航搜索结果
      if (e.key === 'F3') {
        if (e.shiftKey) {
          prevSearchResult();
        } else {
          nextSearchResult();
        }
        e.preventDefault();
      }
      // Escape 清空搜索
      if (e.key === 'Escape') {
        setLocalPattern('');
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSearchResult, prevSearchResult]);

  const resultCount = searchResults.length;
  const currentPos = currentSearchIndex >= 0 ? currentSearchIndex + 1 : 0;

  // Toggle regex mode
  const toggleRegex = useCallback(() => {
    setSearchOptions({ use_regex: !searchOptions.use_regex });
  }, [searchOptions.use_regex, setSearchOptions]);

  // Toggle case sensitivity
  const toggleCaseSensitive = useCallback(() => {
    setSearchOptions({ case_insensitive: !searchOptions.case_insensitive });
  }, [searchOptions.case_insensitive, setSearchOptions]);

  return (
    <div className="search-bar">
      {/* 主搜索区域 */}
      <div className="search-main">
        {/* 搜索图标 */}
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>

        {/* 搜索输入 */}
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="搜索... (Enter 执行搜索)"
          value={localPattern}
          onChange={(e) => setLocalPattern(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />

        {/* 结果计数 */}
        {resultCount > 0 && (
          <span className="search-count">
            {currentPos}/{resultCount}
          </span>
        )}

        {/* 导航按钮 */}
        {resultCount > 0 && (
          <div className="search-nav">
            <button onClick={prevSearchResult} title="上一个 (Shift+F3)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </button>
            <button onClick={nextSearchResult} title="下一个 (F3)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        )}

        {/* 分隔线 */}
        <div className="search-divider" />

        {/* 模式切换按钮 */}
        <button
          className={`search-mode-btn ${searchOptions.use_regex ? 'active' : ''}`}
          onClick={toggleRegex}
          title={searchOptions.use_regex ? '正则模式' : '文本模式'}
        >
          {searchOptions.use_regex ? '.*' : 'Aa'}
        </button>

        {/* 大小写切换 */}
        <button
          className={`search-mode-btn ${!searchOptions.case_insensitive ? 'active' : ''}`}
          onClick={toggleCaseSensitive}
          title={searchOptions.case_insensitive ? '忽略大小写' : '区分大小写'}
        >
          <span style={{ textDecoration: !searchOptions.case_insensitive ? 'underline' : 'none' }}>Aa</span>
        </button>

        {/* 过滤切换 */}
        <button
          className={`search-mode-btn ${showSearchOnly ? 'active' : ''}`}
          onClick={() => setShowSearchOnly(!showSearchOnly)}
          disabled={resultCount === 0}
          title={showSearchOnly ? '显示全部' : '仅显示匹配'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        </button>

        {/* 选项按钮 */}
        <button
          className="search-mode-btn"
          onClick={() => setShowOptions(!showOptions)}
          title="更多选项"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>

      {/* 展开选项面板 */}
      {showOptions && (
        <div className="search-options">
          <label className="search-option-item">
            <input
              type="checkbox"
              checked={searchOptions.use_regex}
              onChange={(e) => setSearchOptions({ use_regex: e.target.checked })}
            />
            <span>正则表达式</span>
          </label>
          <label className="search-option-item">
            <input
              type="checkbox"
              checked={searchOptions.case_insensitive}
              onChange={(e) => setSearchOptions({ case_insensitive: e.target.checked })}
            />
            <span>忽略大小写</span>
          </label>
        </div>
      )}

      <style>{`
        .search-bar {
          background: rgba(30, 30, 30, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 8px 12px;
        }

        .search-main {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(60, 60, 60, 0.6);
          border-radius: 8px;
          padding: 6px 10px;
          transition: background 0.2s, box-shadow 0.2s;
        }

        .search-main:focus-within {
          background: rgba(70, 70, 70, 0.8);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
        }

        .search-icon {
          color: rgba(255, 255, 255, 0.4);
          flex-shrink: 0;
        }

        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #e5e7eb;
          font-size: 13px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-width: 0;
        }

        .search-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .search-count {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          padding: 2px 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          white-space: nowrap;
        }

        .search-nav {
          display: flex;
          gap: 2px;
        }

        .search-nav button {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          padding: 4px 6px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
        }

        .search-nav button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .search-divider {
          width: 1px;
          height: 18px;
          background: rgba(255, 255, 255, 0.15);
          margin: 0 4px;
        }

        .search-mode-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          transition: background 0.15s, color 0.15s;
        }

        .search-mode-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
        }

        .search-mode-btn.active {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }

        .search-mode-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .search-options {
          display: flex;
          gap: 16px;
          padding: 8px 12px 4px;
        }

        .search-option-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
        }

        .search-option-item input[type="checkbox"] {
          width: 14px;
          height: 14px;
          accent-color: #3b82f6;
        }
      `}</style>
    </div>
  );
}
