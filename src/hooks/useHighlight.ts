//! 高亮 Hook

import { useMemo } from 'react';
import type { SearchResult } from '../types/log';
import type { HighlightRule } from '../stores/logStore';

interface HighlightSegment {
  text: string;
  isHighlight: boolean;
  type?: 'search' | 'path' | 'uuid' | 'number' | 'custom';
  color?: string;
}

/// 使用高亮功能
export function useHighlight(
  text: string,
  searchResults: SearchResult[] = [],
  lineNumber: number,
  customRules: HighlightRule[] = []
): HighlightSegment[] {
  return useMemo(() => {
    // 首先处理搜索高亮
    const lineSearchResults = searchResults.filter((r) => r.line_number === lineNumber);

    // 收集所有需要高亮的范围
    interface HighlightRange {
      start: number;
      end: number;
      type: 'search' | 'path' | 'uuid' | 'number' | 'custom';
      color?: string;
    }

    const ranges: HighlightRange[] = [];

    // 添加搜索结果
    for (const result of lineSearchResults) {
      ranges.push({
        start: result.start,
        end: result.end,
        type: 'search',
      });
    }

    // 如果没有搜索结果，添加自动高亮
    if (lineSearchResults.length === 0) {
      // 自动高亮模式 (路径、UUID、数字)
      const autoPatterns = [
        { regex: /[A-Za-z]:\\[^\s:]*/g, type: 'path' as const },
        { regex: /\\\\[^\s:]+/g, type: 'path' as const },
        { regex: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, type: 'uuid' as const },
        { regex: /\b\d+\.?\d*\b/g, type: 'number' as const },
      ];

      for (const { regex, type } of autoPatterns) {
        let match;
        const re = new RegExp(regex.source, regex.flags);
        while ((match = re.exec(text)) !== null) {
          ranges.push({
            start: match.index,
            end: match.index + match[0].length,
            type,
          });
        }
      }
    }

    // 添加自定义高亮规则
    for (const rule of customRules) {
      if (!rule.enabled) continue;

      try {
        const regex = new RegExp(rule.pattern, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          ranges.push({
            start: match.index,
            end: match.index + match[0].length,
            type: 'custom',
            color: rule.color,
          });
        }
      } catch (e) {
        // 无效的正则表达式，跳过
      }
    }

    // 按起始位置排序
    ranges.sort((a, b) => a.start - b.start);

    // 移除重叠的匹配（保留优先级高的）
    const nonOverlapping: HighlightRange[] = [];
    for (const range of ranges) {
      // 检查是否与现有范围重叠
      let canAdd = true;
      for (const existing of nonOverlapping) {
        if (range.start < existing.end && range.end > existing.start) {
          // 重叠，检查优先级
          // 搜索结果 > 自定义规则 > 自动高亮
          const priority: Record<string, number> = {
            'search': 3,
            'custom': 2,
            'path': 1,
            'uuid': 1,
            'number': 1,
          };
          if (priority[range.type] > priority[existing.type]) {
            // 新范围优先级更高，移除旧的
            const idx = nonOverlapping.indexOf(existing);
            nonOverlapping.splice(idx, 1);
          } else {
            canAdd = false;
          }
          break;
        }
      }
      if (canAdd) {
        nonOverlapping.push(range);
      }
    }

    if (nonOverlapping.length === 0) {
      return [{ text, isHighlight: false }];
    }

    // 重新排序（因为可能删除了一些元素）
    nonOverlapping.sort((a, b) => a.start - b.start);

    const segments: HighlightSegment[] = [];
    let lastEnd = 0;

    for (const range of nonOverlapping) {
      if (range.start > lastEnd) {
        segments.push({ text: text.slice(lastEnd, range.start), isHighlight: false });
      }
      segments.push({
        text: text.slice(range.start, range.end),
        isHighlight: true,
        type: range.type,
        color: range.color,
      });
      lastEnd = range.end;
    }

    if (lastEnd < text.length) {
      segments.push({ text: text.slice(lastEnd), isHighlight: false });
    }

    return segments;
  }, [text, searchResults, lineNumber, customRules]);
}
