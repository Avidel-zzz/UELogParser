//! 日志类型定义 (前端)

/// 日志级别
export type LogLevel = 'error' | 'warning' | 'display' | 'verbose' | 'veryverbose' | 'unknown';

/// 日志条目
export interface LogEntry {
  line_number: number;
  raw: string;
  timestamp?: string;
  frame?: number;
  category?: string;
  level: LogLevel;
  message?: string;
  is_continuation: boolean;
}

/// 文件索引
export interface FileIndex {
  file_path: string;
  total_lines: number;
  file_size: number;
  line_offsets: number[];
  index_interval: number;
  categories: Record<string, number>;
  level_counts: Record<string, number>;
}

/// 日志块
export interface LogChunk {
  start_line: number;
  end_line: number;
  entries: LogEntry[];
}

/// 搜索结果
export interface SearchResult {
  line_number: number;
  matched_text: string;
  start: number;
  end: number;
}

/// 搜索选项
export interface SearchOptions {
  pattern: string;
  use_regex: boolean;
  case_insensitive: boolean;
  start_line?: number;
  end_line?: number;
}

/// 过滤选项
export interface FilterOptions {
  categories: string[];
  levels: LogLevel[];
  exclude_categories: string[];
}

/// 文件打开结果
export interface OpenFileResult {
  index: FileIndex;
  preview: LogEntry[];
}

/// 错误
export interface LogParserError {
  message: string;
  code: string;
}
