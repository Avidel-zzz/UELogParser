//! 流式加载模块

pub mod file_indexer;
pub mod line_reader;

pub use file_indexer::{index_file, FileIndexer};
pub use line_reader::LineReader;
