//! 正则搜索引擎 - 高性能日志搜索
//!
//! 支持 regex 和字面量搜索，流式搜索大文件

use regex::{Regex, RegexBuilder};
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::Path;

use crate::parser::{FileIndex, SearchOptions, SearchResult};

/// 搜索引擎
pub struct SearchEngine {
    regex: Regex,
}

impl SearchEngine {
    /// 创建搜索引擎
    pub fn new(options: &SearchOptions) -> Result<Self, regex::Error> {
        let regex = if options.use_regex {
            RegexBuilder::new(&options.pattern)
                .case_insensitive(options.case_insensitive)
                .build()?
        } else {
            // 字面量搜索: 转义所有特殊字符
            let escaped = regex::escape(&options.pattern);
            RegexBuilder::new(&escaped)
                .case_insensitive(options.case_insensitive)
                .build()?
        };

        Ok(Self { regex })
    }

    /// 在字符串中搜索所有匹配
    pub fn search_in_string(&self, text: &str, line_number: u64) -> Vec<SearchResult> {
        self.regex
            .find_iter(text)
            .map(|m| SearchResult {
                line_number,
                matched_text: m.as_str().to_string(),
                start: m.start(),
                end: m.end(),
            })
            .collect()
    }

    /// 在文件中搜索 (流式)
    pub fn search_in_file<P: AsRef<Path>>(
        &self,
        path: P,
        index: &FileIndex,
        options: &SearchOptions,
    ) -> std::io::Result<Vec<SearchResult>> {
        let file = File::open(path)?;
        let mut reader = BufReader::new(file);

        let start_line = options.start_line.unwrap_or(1);
        let end_line = options.end_line.unwrap_or(index.total_lines);

        // 计算起始偏移
        let offset_index = ((start_line - 1) / FileIndex::INDEX_INTERVAL) as usize;
        if offset_index < index.line_offsets.len() {
            reader.seek(SeekFrom::Start(index.line_offsets[offset_index]))?;
        }

        let mut results = Vec::new();
        let start_offset = (offset_index as u64) * FileIndex::INDEX_INTERVAL;

        for (i, line_result) in reader.lines().enumerate() {
            let line_number = start_offset + i as u64 + 1;

            if line_number > end_line {
                break;
            }

            if line_number < start_line {
                continue;
            }

            let line = line_result?;
            let matches = self.search_in_string(&line, line_number);
            results.extend(matches);
        }

        Ok(results)
    }

    /// 搜索下一页结果 (用于增量搜索)
    pub fn search_next_page<P: AsRef<Path>>(
        &self,
        path: P,
        index: &FileIndex,
        from_line: u64,
        max_results: usize,
    ) -> std::io::Result<Vec<SearchResult>> {
        let file = File::open(path)?;
        let mut reader = BufReader::new(file);

        let end_line = (from_line + 10000).min(index.total_lines);

        // 计算起始偏移
        let offset_index = ((from_line - 1) / FileIndex::INDEX_INTERVAL) as usize;
        if offset_index < index.line_offsets.len() {
            reader.seek(SeekFrom::Start(index.line_offsets[offset_index]))?;
        }

        let mut results = Vec::new();
        let start_offset = (offset_index as u64) * FileIndex::INDEX_INTERVAL;

        for (i, line_result) in reader.lines().enumerate() {
            let line_number = start_offset + i as u64 + 1;

            if line_number > end_line || results.len() >= max_results {
                break;
            }

            if line_number < from_line {
                continue;
            }

            let line = line_result?;
            let matches = self.search_in_string(&line, line_number);
            results.extend(matches);
        }

        Ok(results)
    }
}

/// 便捷搜索函数
pub fn search<P: AsRef<Path>>(
    path: P,
    index: &FileIndex,
    options: &SearchOptions,
) -> Result<Vec<SearchResult>, Box<dyn std::error::Error>> {
    let engine = SearchEngine::new(options)?;
    Ok(engine.search_in_file(path, index, options)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_regex_search() {
        let options = SearchOptions {
            pattern: r"Error:\s*(\w+)".to_string(),
            use_regex: true,
            case_insensitive: true,
            ..Default::default()
        };

        let engine = SearchEngine::new(&options).unwrap();
        let results = engine.search_in_string("LogWindows: Error: TestMessage", 1);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].matched_text, "Error: TestMessage");
    }

    #[test]
    fn test_literal_search() {
        let options = SearchOptions {
            pattern: "C:\\Path\\File.txt".to_string(),
            use_regex: false,
            case_insensitive: false,
            ..Default::default()
        };

        let engine = SearchEngine::new(&options).unwrap();
        let results = engine.search_in_string("Loading C:\\Path\\File.txt", 1);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].matched_text, "C:\\Path\\File.txt");
    }
}
