//! 文件操作命令

use std::path::PathBuf;
use std::sync::Mutex;

use crate::parser::{FileIndex, LogChunk, OpenFileResult};
use crate::streaming::{index_file, LineReader};

/// 全局状态
pub struct AppState {
    pub current_file: Option<PathBuf>,
    pub current_index: Option<FileIndex>,
    pub line_reader: Option<LineReader>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            current_file: None,
            current_index: None,
            line_reader: None,
        }
    }
}

/// 打开日志文件
#[tauri::command]
pub fn open_log_file(
    path: String,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<OpenFileResult, String> {
    let file_path = PathBuf::from(&path);

    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    // 构建索引
    let index = index_file(&file_path)
        .map_err(|e| format!("Failed to index file: {}", e))?;

    // 创建行读取器
    let mut reader = LineReader::from_index(&file_path, index.clone())
        .map_err(|e| format!("Failed to create reader: {}", e))?;

    // 读取预览
    let preview = reader
        .read_preview(100)
        .map_err(|e| format!("Failed to read preview: {}", e))?;

    // 更新状态
    let mut state = state.lock().map_err(|e| e.to_string())?;
    state.current_file = Some(file_path);
    state.current_index = Some(index.clone());
    state.line_reader = Some(reader);

    Ok(OpenFileResult {
        index,
        preview,
    })
}

/// 加载日志块
#[tauri::command]
pub fn load_chunk(
    start_line: u64,
    end_line: u64,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<LogChunk, String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;

    let reader = state
        .line_reader
        .as_mut()
        .ok_or("No file opened")?;

    reader
        .read_range(start_line, end_line)
        .map_err(|e| e.to_string())
}

/// 获取当前文件索引
#[tauri::command]
pub fn get_file_index(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<Option<FileIndex>, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    Ok(state.current_index.clone())
}

/// 关闭当前文件
#[tauri::command]
pub fn close_file(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;
    state.current_file = None;
    state.current_index = None;
    state.line_reader = None;
    Ok(())
}
