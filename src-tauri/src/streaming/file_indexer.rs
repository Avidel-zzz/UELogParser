//! 文件索引器 - 为大文件构建行偏移索引
//!
//! 使用内存映射提高大文件的读取性能

use memmap2::Mmap;
use std::collections::HashMap;
use std::fs::File;
use std::path::Path;

use crate::parser::{FileIndex, LogParser};

/// 文件索引器
pub struct FileIndexer {
    file_path: String,
    file: File,
    mmap: Mmap,
}

impl FileIndexer {
    /// 打开文件并创建索引器
    pub fn open<P: AsRef<Path>>(path: P) -> std::io::Result<Self> {
        let file_path = path.as_ref().to_string_lossy().to_string();
        let file = File::open(&path)?;
        let metadata = file.metadata()?;
        let mmap = unsafe { Mmap::map(&file)? };

        Ok(Self {
            file_path,
            file,
            mmap,
        })
    }

    /// 构建文件索引
    pub fn build_index(&self) -> FileIndex {
        let mut index = FileIndex::new(
            self.file_path.clone(),
            self.mmap.len() as u64,
        );

        let mut line_offsets: Vec<u64> = vec![0]; // 第一行从 0 开始
        let mut current_offset: u64 = 0;
        let mut line_count: u64 = 0;
        let mut categories: HashMap<String, u64> = HashMap::new();
        let mut level_counts: HashMap<String, u64> = HashMap::new();

        let data = &self.mmap;

        // 遍历文件，记录行偏移和统计信息
        for (i, &byte) in data.iter().enumerate() {
            if byte == b'\n' {
                line_count += 1;

                // 提取当前行内容
                let start = current_offset as usize;
                let end = i;
                if start < end {
                    if let Ok(line) = std::str::from_utf8(&data[start..end]) {
                        // 提取类别
                        if let Some(category) = LogParser::extract_category(line) {
                            *categories.entry(category).or_insert(0) += 1;
                        }
                        // 提取级别
                        if let Some(level) = LogParser::extract_level(line) {
                            *level_counts.entry(level.display_name().to_string()).or_insert(0) += 1;
                        }
                    }
                }

                // 每隔 INDEX_INTERVAL 行记录一次偏移
                if line_count % FileIndex::INDEX_INTERVAL == 0 {
                    line_offsets.push((i + 1) as u64);
                }

                current_offset = (i + 1) as u64;
            }
        }

        // 处理最后一行 (如果没有以换行符结尾)
        if current_offset < data.len() as u64 {
            line_count += 1;
        }

        index.total_lines = line_count;
        index.line_offsets = line_offsets;
        index.categories = categories;
        index.level_counts = level_counts;

        index
    }

    /// 获取文件大小
    pub fn file_size(&self) -> u64 {
        self.mmap.len() as u64
    }

    /// 获取内存映射引用
    pub fn mmap(&self) -> &Mmap {
        &self.mmap
    }
}

/// 从文件路径构建索引的便捷函数
pub fn index_file<P: AsRef<Path>>(path: P) -> std::io::Result<FileIndex> {
    let indexer = FileIndexer::open(path)?;
    Ok(indexer.build_index())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_build_index() -> std::io::Result<()> {
        let mut temp_file = NamedTempFile::new()?;
        writeln!(temp_file, "LogInit: Display: Line 1")?;
        writeln!(temp_file, "LogWindows: Error: Line 2")?;
        writeln!(temp_file, "LogCore: Warning: Line 3")?;

        let indexer = FileIndexer::open(temp_file.path())?;
        let index = indexer.build_index();

        assert_eq!(index.total_lines, 3);
        assert!(index.categories.contains_key("LogInit"));
        assert!(index.categories.contains_key("LogWindows"));
        assert!(index.level_counts.contains_key("Error"));
        assert!(index.level_counts.contains_key("Warning"));

        Ok(())
    }
}
