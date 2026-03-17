//! AI 工具执行器

import * as tauriApi from './tauriApi';
import type { LogEntry } from '../types/log';

/// 工具执行结果
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/// 读取指定行范围
export async function executeReadLines(start: number, end: number): Promise<ToolResult> {
  try {
    // 确保行号有效
    const validStart = Math.max(1, start);
    const validEnd = end;

    // 获取文件索引以验证范围
    const fileIndex = await tauriApi.getFileIndex();
    if (!fileIndex) {
      return { success: false, error: 'No file is currently open' };
    }

    if (validStart > fileIndex.total_lines) {
      return { success: false, error: `Start line ${validStart} exceeds total lines ${fileIndex.total_lines}` };
    }

    // 加载指定范围
    await tauriApi.loadChunk(validStart, validEnd);

    const actualEnd = Math.min(validEnd, fileIndex.total_lines);

    return {
      success: true,
      data: {
        start: validStart,
        end: actualEnd,
        totalLines: fileIndex.total_lines,
        message: `Lines ${validStart}-${actualEnd} loaded. Content available in log viewer.`,
      },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/// 搜索日志
export async function executeSearchLogs(
  pattern: string,
  useRegex: boolean = false,
  caseInsensitive: boolean = true
): Promise<ToolResult> {
  try {
    const results = await tauriApi.searchLogs({
      pattern,
      use_regex: useRegex,
      case_insensitive: caseInsensitive,
    });

    return {
      success: true,
      data: {
        pattern,
        matchCount: results.length,
        matches: results.slice(0, 50).map(r => ({
          line: r.line_number,
          matchedText: r.matched_text.slice(0, 200),
        })),
        hasMore: results.length > 50,
        totalMatches: results.length,
      },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/// 获取文件信息
export async function executeGetFileInfo(): Promise<ToolResult> {
  try {
    const fileIndex = await tauriApi.getFileIndex();
    if (!fileIndex) {
      return { success: false, error: 'No file is currently open' };
    }

    return {
      success: true,
      data: {
        filename: fileIndex.file_path.split(/[/\\]/).pop(),
        path: fileIndex.file_path,
        totalLines: fileIndex.total_lines,
        fileSize: fileIndex.file_size,
        categories: Object.entries(fileIndex.categories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([name, count]) => ({ name, count })),
        levelCounts: fileIndex.level_counts,
      },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/// 获取过滤后的行
export async function executeGetFilteredLines(
  levels?: string[],
  categories?: string[]
): Promise<ToolResult> {
  try {
    const result = await tauriApi.getFilteredLines(
      levels as tauriApi.LogLevel[] || [],
      categories || []
    );

    return {
      success: true,
      data: {
        levels: levels || [],
        categories: categories || [],
        matchCount: result.total_count,
        lineNumbers: result.line_numbers.slice(0, 100),
        hasMore: result.line_numbers.length > 100,
      },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/// 执行工具
export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (name) {
    case 'read_lines':
      return executeReadLines(
        args.start as number,
        args.end as number
      );
    case 'search_logs':
      return executeSearchLogs(
        args.pattern as string,
        args.use_regex as boolean | undefined,
        args.case_insensitive as boolean | undefined
      );
    case 'get_file_info':
      return executeGetFileInfo();
    case 'get_filtered_lines':
      return executeGetFilteredLines(
        args.levels as string[] | undefined,
        args.categories as string[] | undefined
      );
    default:
      return { success: false, error: `Unknown tool: ${name}` };
  }
}
