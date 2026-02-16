//! Tauri API 封装

import { invoke } from '@tauri-apps/api/core';
import type {
  LogChunk,
  FileIndex,
  SearchResult,
  SearchOptions,
  OpenFileResult,
} from '../types/log';

/// 打开日志文件
export async function openLogFile(path: string): Promise<OpenFileResult> {
  return invoke<OpenFileResult>('open_log_file', { path });
}

/// 加载日志块
export async function loadChunk(startLine: number, endLine: number): Promise<LogChunk> {
  return invoke<LogChunk>('load_chunk', { startLine, endLine });
}

/// 获取文件索引
export async function getFileIndex(): Promise<FileIndex | null> {
  return invoke<FileIndex | null>('get_file_index');
}

/// 关闭文件
export async function closeFile(): Promise<void> {
  return invoke('close_file');
}

/// 搜索日志
export async function searchLogs(options: SearchOptions): Promise<SearchResult[]> {
  return invoke<SearchResult[]>('search_logs', { options });
}

/// 搜索下一页
export async function searchNext(
  fromLine: number,
  maxResults: number,
  options: SearchOptions
): Promise<SearchResult[]> {
  return invoke<SearchResult[]>('search_next', { fromLine, maxResults, options });
}

/// 测试正则表达式
export async function testRegex(
  pattern: string,
  text: string,
  caseInsensitive: boolean
): Promise<SearchResult[]> {
  return invoke<SearchResult[]>('test_regex', { pattern, text, caseInsensitive });
}
