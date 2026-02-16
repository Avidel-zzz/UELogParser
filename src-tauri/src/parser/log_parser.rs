//! UE 日志解析器 - 核心解析逻辑
//!
//! 负责解析单个日志行，提取时间戳、类别、级别等信息

use super::patterns::*;
use super::types::{LogEntry, LogLevel};

/// 日志解析器
pub struct LogParser;

impl LogParser {
    /// 解析单行日志
    pub fn parse_line(line_number: u64, content: &str) -> LogEntry {
        let trimmed = content.trim_end();

        // 检查是否是续行
        if Self::is_continuation(trimmed) {
            return LogEntry {
                line_number,
                raw: trimmed.to_string(),
                timestamp: None,
                frame: None,
                category: None,
                level: LogLevel::Unknown,
                message: Some(trimmed.to_string()),
                is_continuation: true,
            };
        }

        // 尝试匹配标准格式
        if let Some(caps) = PATTERN_STANDARD.captures(trimmed) {
            return LogEntry {
                line_number,
                raw: trimmed.to_string(),
                timestamp: Some(caps[1].to_string()),
                frame: caps[2].parse().ok(),
                category: Some(caps[3].to_string()),
                level: LogLevel::from_str(&caps[4]),
                message: Some(caps[5].to_string()),
                is_continuation: false,
            };
        }

        // 尝试匹配简单格式
        if let Some(caps) = PATTERN_SIMPLE.captures(trimmed) {
            return LogEntry {
                line_number,
                raw: trimmed.to_string(),
                timestamp: None,
                frame: None,
                category: Some(caps[1].to_string()),
                level: LogLevel::from_str(&caps[2]),
                message: Some(caps[3].to_string()),
                is_continuation: false,
            };
        }

        // 检查是否是文件头
        if PATTERN_HEADER.is_match(trimmed) {
            return LogEntry {
                line_number,
                raw: trimmed.to_string(),
                timestamp: Some(trimmed.replace("Log file open, ", "")),
                frame: None,
                category: Some("LogFile".to_string()),
                level: LogLevel::Display,
                message: Some("Log file opened".to_string()),
                is_continuation: false,
            };
        }

        // 无法解析的行，作为原始内容返回
        LogEntry::raw(line_number, trimmed.to_string())
    }

    /// 检查是否是续行
    fn is_continuation(line: &str) -> bool {
        line.starts_with(' ') || line.starts_with('>') || line.is_empty()
    }

    /// 从行中提取日志级别
    pub fn extract_level(line: &str) -> Option<LogLevel> {
        EXTRACT_LEVEL
            .captures(line)
            .map(|caps| LogLevel::from_str(&caps[1]))
    }

    /// 从行中提取日志类别
    pub fn extract_category(line: &str) -> Option<String> {
        let caps = EXTRACT_CATEGORY.captures(line)?;
        caps.get(1)
            .or_else(|| caps.get(2))
            .map(|m| m.as_str().to_string())
    }

    /// 批量解析日志行
    pub fn parse_lines(lines: &[(&u64, &str)]) -> Vec<LogEntry> {
        lines
            .iter()
            .map(|(line_num, content)| Self::parse_line(**line_num, content))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_standard_format() {
        let line = "[2026.02.14-03.33.56:070][  0]LogWindows: Error: Test error message";
        let entry = LogParser::parse_line(1, line);

        assert_eq!(entry.line_number, 1);
        assert_eq!(entry.timestamp, Some("2026.02.14-03.33.56:070".to_string()));
        assert_eq!(entry.frame, Some(0));
        assert_eq!(entry.category, Some("LogWindows".to_string()));
        assert_eq!(entry.level, LogLevel::Error);
        assert_eq!(entry.message, Some("Test error message".to_string()));
        assert!(!entry.is_continuation);
    }

    #[test]
    fn test_parse_simple_format() {
        let line = "LogInit: Warning: Initialization issue";
        let entry = LogParser::parse_line(1, line);

        assert_eq!(entry.category, Some("LogInit".to_string()));
        assert_eq!(entry.level, LogLevel::Warning);
        assert_eq!(entry.message, Some("Initialization issue".to_string()));
    }

    #[test]
    fn test_parse_continuation() {
        let line = "  continued message here";
        let entry = LogParser::parse_line(1, line);

        assert!(entry.is_continuation);
        assert_eq!(entry.level, LogLevel::Unknown);
    }

    #[test]
    fn test_parse_header() {
        let line = "Log file open, 02/14/26 11:33:35";
        let entry = LogParser::parse_line(1, line);

        assert_eq!(entry.category, Some("LogFile".to_string()));
        assert_eq!(entry.level, LogLevel::Display);
    }
}
