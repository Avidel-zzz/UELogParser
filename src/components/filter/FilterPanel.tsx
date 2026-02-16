//! 过滤面板组件

import { useState, useMemo } from 'react';
import { useLogStore } from '../../stores/logStore';
import { useFilterStore } from '../../stores/filterStore';
import type { LogLevel } from '../../types/log';

const LOG_LEVELS: LogLevel[] = ['error', 'warning', 'display', 'verbose', 'veryverbose', 'unknown'];

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: 'bg-red-500',
  warning: 'bg-orange-500',
  display: 'bg-blue-500',
  verbose: 'bg-gray-500',
  veryverbose: 'bg-gray-600',
  unknown: 'bg-gray-700',
};

export function FilterPanel() {
  const { fileIndex, categorySearch, setCategorySearch } = useLogStore();
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

  if (!fileIndex) {
    return (
      <div className="filter-panel w-64 p-4 text-gray-500 text-sm">
        Open a log file to see filters
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

  const levelCounts = fileIndex.level_counts;

  return (
    <div className="filter-panel w-64 flex flex-col h-full overflow-hidden">
      {/* 标题 */}
      <div className="p-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300">Filters</h2>
      </div>

      {/* 日志级别过滤 */}
      <div className="border-b border-gray-700">
        <button
          className="w-full p-3 flex items-center justify-between hover:bg-gray-800"
          onClick={() => setShowLevels(!showLevels)}
        >
          <h3 className="text-xs font-medium text-gray-400 uppercase">Log Level</h3>
          <span className="text-gray-500">{showLevels ? '▼' : '▶'}</span>
        </button>

        {showLevels && (
          <div className="px-3 pb-3">
            <div className="flex gap-2 mb-2">
              <button
                className="text-xs text-blue-400 hover:text-blue-300"
                onClick={selectAllLevels}
              >
                All
              </button>
              <span className="text-gray-600">|</span>
              <button
                className="text-xs text-blue-400 hover:text-blue-300"
                onClick={deselectAllLevels}
              >
                None
              </button>
            </div>
            <div className="space-y-1">
              {LOG_LEVELS.map((level) => (
                <label key={level} className="filter-item">
                  <input
                    type="checkbox"
                    className="filter-checkbox"
                    checked={selectedLevels.has(level)}
                    onChange={() => toggleLevel(level)}
                  />
                  <span className={`w-2 h-2 rounded-full ${LEVEL_COLORS[level]}`} />
                  <span className="text-sm capitalize flex-1">{level}</span>
                  <span className="text-xs text-gray-500">
                    {levelCounts[level] || 0}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 类别过滤 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <button
          className="w-full p-3 flex items-center justify-between hover:bg-gray-800"
          onClick={() => setShowCategories(!showCategories)}
        >
          <h3 className="text-xs font-medium text-gray-400 uppercase">
            Category ({filteredCategories.length}/{Object.keys(fileIndex.categories).length})
          </h3>
          <span className="text-gray-500">{showCategories ? '▼' : '▶'}</span>
        </button>

        {showCategories && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* 搜索框 */}
            <div className="px-3 py-2">
              <input
                type="text"
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
              />
            </div>

            {/* 快捷操作 */}
            <div className="px-3 pb-2 flex gap-2">
              <button
                className="text-xs text-blue-400 hover:text-blue-300"
                onClick={() => selectAllCategories(filteredCategories)}
              >
                Select All
              </button>
              <span className="text-gray-600">|</span>
              <button
                className="text-xs text-blue-400 hover:text-blue-300"
                onClick={deselectAllCategories}
              >
                Clear
              </button>
            </div>

            {/* 类别列表 */}
            <div className="flex-1 overflow-auto px-3 pb-3">
              <div className="space-y-1">
                {filteredCategories.map((category) => (
                  <label key={category} className="filter-item">
                    <input
                      type="checkbox"
                      className="filter-checkbox"
                      checked={selectedCategories.has(category)}
                      onChange={() => toggleCategory(category)}
                    />
                    <span className="text-sm flex-1 truncate" title={category}>
                      {category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {fileIndex.categories[category]}
                    </span>
                  </label>
                ))}
                {filteredCategories.length === 0 && (
                  <div className="text-sm text-gray-500 py-2 text-center">
                    No matching categories
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 重置按钮 */}
      <div className="p-3 border-t border-gray-700">
        <button
          className="w-full px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          onClick={reset}
        >
          Reset All Filters
        </button>
      </div>
    </div>
  );
}
