//! UE 日志解析器 - 类型定义
//!
//! 定义日志条目、详细级别、文件信息等核心类型

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 日志详细级别
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Error,
    Warning,
    Display,
    Verbose,
    VeryVerbose,
    Unknown,
}

impl LogLevel {
    /// 从字符串解析日志级别
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "error" => LogLevel::Error,
            "warning" => LogLevel::Warning,
            "display" => LogLevel::Display,
            "verbose" => LogLevel::Verbose,
            "veryverbose" => LogLevel::VeryVerbose,
            _ => LogLevel::Unknown,
        }
    }

    /// 获取显示名称
    pub fn display_name(&self) -> &'static str {
        match self {
            LogLevel::Error => "Error",
            LogLevel::Warning => "Warning",
            LogLevel::Display => "Display",
            LogLevel::Verbose => "Verbose",
            LogLevel::VeryVerbose => "VeryVerbose",
            LogLevel::Unknown => "Unknown",
        }
    }
}

/// 日志条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    /// 行号 (1-based)
    pub line_number: u64,
    /// 原始内容
    pub raw: String,
    /// 时间戳 (可选)
    pub timestamp: Option<String>,
    /// 帧号 (可选)
    pub frame: Option<u64>,
    /// 日志类别
    pub category: Option<String>,
    /// 详细级别
    pub level: LogLevel,
    /// 消息内容
    pub message: Option<String>,
    /// 是否是多行日志的续行
    pub is_continuation: bool,
}

impl LogEntry {
    /// 创建未解析的日志行
    pub fn raw(line_number: u64, content: String) -> Self {
        Self {
            line_number,
            raw: content,
            timestamp: None,
            frame: None,
            category: None,
            level: LogLevel::Unknown,
            message: None,
            is_continuation: false,
        }
    }
}

/// 文件索引信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileIndex {
    /// 文件路径
    pub file_path: String,
    /// 总行数
    pub total_lines: u64,
    /// 文件大小 (字节)
    pub file_size: u64,
    /// 行偏移索引 (每 INDEX_INTERVAL 行记录一次)
    pub line_offsets: Vec<u64>,
    /// 索引间隔
    pub index_interval: u64,
    /// 检测到的日志类别及其数量
    pub categories: HashMap<String, u64>,
    /// 各级别日志数量
    pub level_counts: HashMap<String, u64>,
}

impl FileIndex {
    pub const INDEX_INTERVAL: u64 = 1000;

    pub fn new(file_path: String, file_size: u64) -> Self {
        Self {
            file_path,
            total_lines: 0,
            file_size,
            line_offsets: Vec::new(),
            index_interval: Self::INDEX_INTERVAL,
            categories: HashMap::new(),
            level_counts: HashMap::new(),
        }
    }
}

/// 日志块 (用于流式加载)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogChunk {
    /// 起始行号
    pub start_line: u64,
    /// 结束行号
    pub end_line: u64,
    /// 日志条目
    pub entries: Vec<LogEntry>,
}

/// 搜索结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    /// 匹配的行号
    pub line_number: u64,
    /// 匹配内容
    pub matched_text: String,
    /// 匹配起始位置 (字符偏移)
    pub start: usize,
    /// 匹配结束位置 (字符偏移)
    pub end: usize,
}

/// 搜索选项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchOptions {
    /// 搜索模式 (正则表达式或字面量)
    pub pattern: String,
    /// 是否使用正则表达式
    pub use_regex: bool,
    /// 是否忽略大小写
    pub case_insensitive: bool,
    /// 搜索范围起始行
    pub start_line: Option<u64>,
    /// 搜索范围结束行
    pub end_line: Option<u64>,
}

impl Default for SearchOptions {
    fn default() -> Self {
        Self {
            pattern: String::new(),
            use_regex: true,
            case_insensitive: true,
            start_line: None,
            end_line: None,
        }
    }
}

/// 过滤选项
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FilterOptions {
    /// 要包含的日志类别 (空 = 全部)
    pub categories: Vec<String>,
    /// 要包含的日志级别 (空 = 全部)
    pub levels: Vec<LogLevel>,
    /// 排除的日志类别
    pub exclude_categories: Vec<String>,
}

/// 文件打开结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenFileResult {
    /// 文件索引
    pub index: FileIndex,
    /// 前 N 行预览
    pub preview: Vec<LogEntry>,
}

/// 错误类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogParserError {
    pub message: String,
    pub code: String,
}

impl From<std::io::Error> for LogParserError {
    fn from(e: std::io::Error) -> Self {
        Self {
            message: e.to_string(),
            code: "IO_ERROR".to_string(),
        }
    }
}

impl From<regex::Error> for LogParserError {
    fn from(e: regex::Error) -> Self {
        Self {
            message: e.to_string(),
            code: "REGEX_ERROR".to_string(),
        }
    }
}
