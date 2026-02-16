//! UE 日志解析器 - 正则表达式模式
//!
//! 定义用于解析 UE 日志的各种正则表达式模式

use regex::Regex;
use once_cell::sync::Lazy;

/// 标准日志格式: [2026.02.14-03.33.56:070][  0]LogCategory: Verbosity: Message
pub static PATTERN_STANDARD: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"^\[(\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2}\.\d{2}:\d{3})\]\[\s*(\d+)\](\w+):\s*(\w+):\s*(.*)$"
    ).expect("Invalid standard pattern")
});

/// 简单日志格式: LogCategory: Display: Message
pub static PATTERN_SIMPLE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^(\w+):\s*(\w+):\s*(.*)$").expect("Invalid simple pattern")
});

/// 文件头格式: Log file open, 02/14/26 11:33:35
pub static PATTERN_HEADER: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^Log file open,\s*(\d{2}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2})").expect("Invalid header pattern")
});

/// 续行模式 (以空格或 > 开头)
pub static PATTERN_CONTINUATION: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^(\s|>).*$").expect("Invalid continuation pattern")
});

/// 高亮模式

/// Windows 路径: C:\xxx 或 \\xxx
pub static HIGHLIGHT_PATH: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"[A-Za-z]:\\[^\s:]*|\\\\[^\s:]+").expect("Invalid path pattern")
});

/// UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
pub static HIGHLIGHT_UUID: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
        .expect("Invalid UUID pattern")
});

/// 数字 (整数和小数)
pub static HIGHLIGHT_NUMBER: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\b\d+\.?\d*\b").expect("Invalid number pattern")
});

/// 日志类别提取
pub static EXTRACT_CATEGORY: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^\[.*?\]\[\s*\d+\](\w+):|^(\w+):").expect("Invalid category extract pattern")
});

/// 详细级别提取
pub static EXTRACT_LEVEL: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r":(Error|Warning|Display|Verbose|VeryVerbose):")
        .expect("Invalid level extract pattern")
});

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_standard_pattern() {
        let line = "[2026.02.14-03.33.56:070][  0]LogWindows: Display: Test message";
        let caps = PATTERN_STANDARD.captures(line).unwrap();
        assert_eq!(&caps[1], "2026.02.14-03.33.56:070");
        assert_eq!(&caps[2], "0");
        assert_eq!(&caps[3], "LogWindows");
        assert_eq!(&caps[4], "Display");
        assert_eq!(&caps[5], "Test message");
    }

    #[test]
    fn test_simple_pattern() {
        let line = "LogInit: Display: Starting game...";
        let caps = PATTERN_SIMPLE.captures(line).unwrap();
        assert_eq!(&caps[1], "LogInit");
        assert_eq!(&caps[2], "Display");
        assert_eq!(&caps[3], "Starting game...");
    }

    #[test]
    fn test_path_highlight() {
        let text = "Loading file C:\\Project\\Content\\Asset.uasset";
        let matches: Vec<_> = HIGHLIGHT_PATH.find_iter(text).collect();
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].as_str(), "C:\\Project\\Content\\Asset.uasset");
    }

    #[test]
    fn test_uuid_highlight() {
        let text = "Object GUID: 12345678-1234-1234-1234-123456789012";
        let matches: Vec<_> = HIGHLIGHT_UUID.find_iter(text).collect();
        assert_eq!(matches.len(), 1);
    }
}
