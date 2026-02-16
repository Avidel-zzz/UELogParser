//! 行读取器 - 按需读取指定范围的日志行
//!
//! 使用 Seek 和缓存优化大文件的随机访问

use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::Path;
use std::sync::Arc;
use parking_lot::RwLock;

use crate::parser::{FileIndex, LogChunk, LogEntry, LogParser};

/// LRU 缓存大小
const CACHE_SIZE: usize = 100;

/// 块缓存项
struct CacheItem {
    entries: Vec<LogEntry>,
    access_time: std::time::Instant,
}

/// 行读取器
pub struct LineReader {
    file: File,
    index: FileIndex,
    cache: Arc<RwLock<HashMap<u64, CacheItem>>>,
}

impl LineReader {
    /// 从文件索引创建读取器
    pub fn from_index<P: AsRef<Path>>(path: P, index: FileIndex) -> std::io::Result<Self> {
        let file = File::open(path)?;

        Ok(Self {
            file,
            index,
            cache: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    /// 读取指定范围的行
    pub fn read_range(&mut self, start_line: u64, end_line: u64) -> std::io::Result<LogChunk> {
        // 限制范围
        let start_line = start_line.max(1);
        let end_line = end_line.min(self.index.total_lines);

        if start_line > end_line {
            return Ok(LogChunk {
                start_line,
                end_line: start_line,
                entries: vec![],
            });
        }

        // 计算块索引
        let chunk_index = start_line / FileIndex::INDEX_INTERVAL;

        // 检查缓存
        {
            let cache = self.cache.read();
            if let Some(item) = cache.get(&chunk_index) {
                // 从缓存中提取需要的行
                let entries: Vec<LogEntry> = item
                    .entries
                    .iter()
                    .filter(|e| e.line_number >= start_line && e.line_number <= end_line)
                    .cloned()
                    .collect();

                if !entries.is_empty() {
                    return Ok(LogChunk {
                        start_line,
                        end_line,
                        entries,
                    });
                }
            }
        }

        // 计算文件偏移
        let offset_index = (start_line / FileIndex::INDEX_INTERVAL) as usize;
        let file_offset = if offset_index < self.index.line_offsets.len() {
            self.index.line_offsets[offset_index]
        } else {
            0
        };

        // 定位到起始位置
        self.file.seek(SeekFrom::Start(file_offset))?;

        // 读取行
        let reader = BufReader::new(&self.file);
        let mut entries: Vec<LogEntry> = Vec::new();
        let mut current_line = (offset_index as u64) * FileIndex::INDEX_INTERVAL;
        let mut chunk_entries: Vec<LogEntry> = Vec::new();

        for line_result in reader.lines() {
            current_line += 1;
            let line = line_result?;

            // 解析日志行
            let entry = LogParser::parse_line(current_line, &line);

            // 保存到块缓存
            chunk_entries.push(entry.clone());

            // 如果在请求范围内，添加到结果
            if current_line >= start_line && current_line <= end_line {
                entries.push(entry);
            }

            // 如果已经读取完请求范围，停止
            if current_line >= end_line {
                break;
            }

            // 如果已经读满一个块，缓存它
            if chunk_entries.len() >= FileIndex::INDEX_INTERVAL as usize {
                self.cache_chunk(chunk_index, chunk_entries.clone());
                chunk_entries.clear();
            }
        }

        // 缓存最后一个不完整的块
        if !chunk_entries.is_empty() {
            self.cache_chunk(chunk_index, chunk_entries);
        }

        Ok(LogChunk {
            start_line,
            end_line: current_line.min(end_line),
            entries,
        })
    }

    /// 读取单行
    pub fn read_line(&mut self, line_number: u64) -> std::io::Result<Option<LogEntry>> {
        let chunk = self.read_range(line_number, line_number)?;
        Ok(chunk.entries.into_iter().next())
    }

    /// 读取预览 (前 N 行)
    pub fn read_preview(&mut self, count: u64) -> std::io::Result<Vec<LogEntry>> {
        let end = count.min(self.index.total_lines);
        let chunk = self.read_range(1, end)?;
        Ok(chunk.entries)
    }

    /// 缓存块
    fn cache_chunk(&self, chunk_index: u64, entries: Vec<LogEntry>) {
        let mut cache = self.cache.write();

        // 简单的 LRU: 如果缓存满了，移除最旧的项
        if cache.len() >= CACHE_SIZE {
            let oldest_key = cache
                .iter()
                .min_by_key(|(_, v)| v.access_time)
                .map(|(k, _)| *k);

            if let Some(key) = oldest_key {
                cache.remove(&key);
            }
        }

        cache.insert(
            chunk_index,
            CacheItem {
                entries,
                access_time: std::time::Instant::now(),
            },
        );
    }

    /// 清除缓存
    pub fn clear_cache(&self) {
        let mut cache = self.cache.write();
        cache.clear();
    }

    /// 获取文件索引
    pub fn index(&self) -> &FileIndex {
        &self.index
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::streaming::file_indexer::index_file;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_read_range() -> std::io::Result<()> {
        let mut temp_file = NamedTempFile::new()?;
        for i in 1..=100 {
            writeln!(temp_file, "LogInit: Display: Line {}", i)?;
        }

        let index = index_file(temp_file.path())?;
        let mut reader = LineReader::from_index(temp_file.path(), index)?;

        // 读取前 10 行
        let chunk = reader.read_range(1, 10)?;
        assert_eq!(chunk.entries.len(), 10);
        assert_eq!(chunk.start_line, 1);
        assert_eq!(chunk.end_line, 10);

        // 读取中间的行
        let chunk = reader.read_range(50, 55)?;
        assert_eq!(chunk.entries.len(), 6);

        Ok(())
    }
}
